import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { prisma } from '@/lib/prisma';

type HistoryItem = { role: 'user' | 'assistant'; content: string };
type Chunk = { id: number; content: string };

const QUERIES_COUNT = 3;
const PER_QUERY_LIMIT = 6;
const FINAL_CHUNKS = 8;
const MIN_SIMILARITY = 0.1;

function toPlainText(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ''))
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/^\s*[-*+•]\s+/gm, '')
        .replace(/^\s*\d+[.)]\s+/gm, '')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .trim();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, content } = body;
        const history: HistoryItem[] = (Array.isArray(body.history) ? body.history : [])
            .filter((m: HistoryItem) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
            .slice(-6);

        console.log('id: ' + id)
        console.log(`user: ${content}`)

        const client = new OpenAI();

        // 1. Переписуємо питання з урахуванням історії у кілька пошукових запитів
        let queries: string[] = [content];
        try {
            const rewrite = await client.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: `Ти формуєш пошукові запити до бази фрагментів документа.
З урахуванням історії діалогу перетвори останнє питання на ${QUERIES_COUNT} різні самостійні пошукові запити:
сутність питання, суміжні поняття та можливі формулювання в самому документі.
Відповідь — JSON: {"queries": ["...", "...", "..."]}`,
                    },
                    ...history.map((m) => ({ role: m.role, content: m.content })),
                    { role: "user", content },
                ],
            });
            const parsed = JSON.parse(rewrite.choices[0].message.content ?? '{}');
            if (Array.isArray(parsed.queries)) {
                queries = [content, ...parsed.queries.filter((q: unknown) => typeof q === 'string' && q.trim())];
            }
        } catch (error) {
            console.error('Не вдалося переписати запит, шукаємо за оригіналом:', error);
        }

        // 2. Гібридний пошук: вектори + повнотекстовий, злиття через RRF
        const embeddingResponse = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: queries,
        });

        const scores = new Map<number, { chunk: Chunk; score: number }>();
        const addRanked = (rows: Chunk[]) => {
            rows.forEach((chunk, rank) => {
                const prev = scores.get(chunk.id);
                const score = 1 / (60 + rank);
                scores.set(chunk.id, { chunk, score: (prev?.score ?? 0) + score });
            });
        };

        for (const item of embeddingResponse.data) {
            const vector = `[${item.embedding.join(',')}]`;
            const rows = await prisma.$queryRaw<Chunk[]>`
                SELECT id, content
                FROM document_chunks
                WHERE document_id = ${id}::uuid
                  AND is_summary = false
                  AND embedding IS NOT NULL
                  AND 1 - (embedding <=> ${vector}::vector) > ${MIN_SIMILARITY}
                ORDER BY embedding <=> ${vector}::vector
                LIMIT ${PER_QUERY_LIMIT}`;
            addRanked(rows);
        }

        for (const query of queries) {
            // слова з'єднуємо через OR, інакше розмовні питання майже не матимуть збігів
            const tsQuery = (query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).join(' | ');
            if (!tsQuery) continue;
            const rows = await prisma.$queryRaw<Chunk[]>`
                SELECT id, content
                FROM document_chunks
                WHERE document_id = ${id}::uuid
                  AND is_summary = false
                  AND search_vector @@ to_tsquery('simple', ${tsQuery})
                ORDER BY ts_rank(search_vector, to_tsquery('simple', ${tsQuery})) DESC
                LIMIT ${PER_QUERY_LIMIT}`;
            addRanked(rows);
        }

        const matchedChunks = [...scores.values()]
            .sort((a, b) => b.score - a.score)
            .slice(0, FINAL_CHUNKS)
            .map((s) => s.chunk);

        const summaryRows = await prisma.$queryRaw<Chunk[]>`
            SELECT id, content FROM document_chunks
            WHERE document_id = ${id}::uuid AND is_summary = true
            LIMIT 1`;

        let contextText = '';
        if (summaryRows.length > 0) {
            contextText += `--- Загальне резюме документа ---\n${summaryRows[0].content}\n\n`;
        }
        if (matchedChunks.length > 0) {
            contextText += matchedChunks
                .map((chunk, index) => `--- Фрагмент №${index + 1} ---\n${chunk.content}`)
                .join("\n\n");
        }
        if (!contextText) {
            contextText = "У документі не знайдено фрагментів за цим запитом.";
        }

        // 3. Генерація відповіді
        const chatCompletion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.4,
            messages: [
                {
                    role: "system",
                    content: `Ти — аналітик документів. Відповідай на основі наданого контексту.
Правила:
1. Якщо відповідь прямо є в контексті — наведи її.
2. Якщо прямої відповіді немає, але її можна обґрунтовано вивести, зіставити або узагальнити з фрагментів — зроби це і чітко познач: "У документі це прямо не сказано, але з нього випливає, що…" та поясни, на чому ґрунтується висновок.
3. Якщо контекст лише частково стосується питання — дай те, що є, і скажи, чого бракує.
4. Лише якщо контекст зовсім не стосується теми — скажи: "У завантажених документах немає цієї інформації."
5. Не вигадуй фактів, яких немає в контексті; висновки відділяй від цитат.
6. Враховуй історію діалогу для уточнювальних питань. Відповідай мовою користувача.
7. Пиши ЧИСТИМ ТЕКСТОМ: без Markdown, без зірочок, решіток, зворотних лапок, таблиць, маркованих і нумерованих списків. Використовуй лише звичайні речення й абзаци, розділені порожнім рядком.

КОНТЕКСТ З ДОКУМЕНТІВ:
${contextText}`,
                },
                ...history.map((m) => ({ role: m.role, content: m.content })),
                {
                    role: "user",
                    content: content,
                },
            ],
        });

        const answer = toPlainText(chatCompletion.choices[0].message.content ?? '');
        console.log(answer)

        return NextResponse.json(
            { success: true, data: { answer } },
            { status: 201 }
        );
    } catch (error) {
        console.log(error)
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}
