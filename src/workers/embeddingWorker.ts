import { Worker } from 'bullmq';
import { redisConnection, RESEARCH_QUEUE_NAME } from '@/lib/queue';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { prisma } from '@/lib/prisma';
import { updateResearchStatus } from '@/services/db/updateStatus'
import OpenAI from "openai";

console.log('🚀 Скрипт воркера запущено, підключаємося до Redis...');
const worker = new Worker(RESEARCH_QUEUE_NAME, async (job) => {
    console.log('[WORKER] started job')

    const { fileName, documentId } = job.data;

    const stored = await prisma.document_files.findUnique({
        where: { document_id: documentId },
    });
    if (!stored) {
        throw new Error('Файл не знайдено в базі даних');
    }
    const file = new Blob([new Uint8Array(stored.data)], { type: stored.mime_type });

    await updateResearchStatus('[2/6] Extracting text', documentId)
    let allText = '';
    if (file?.type.trim() == 'application/pdf') {
        const loader = new PDFLoader(file, {
            splitPages: true,
        });
        const docs: Document[] = await loader.load();
        console.log(`Завантажено сторінок: ${docs.length}`);
        allText = docs.map((doc) => doc.pageContent).join('\n\n');
    } else if (file?.type.trim() == 'text/plain') {
        allText = await file.text();
    }

    if (!allText.trim()) {
        throw new Error('Не вдалося витягти текст з документа');
    }

    await updateResearchStatus('[3/6] Splitting text', documentId)
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 250,
    });
    const stringChunks = await textSplitter.splitText(allText);

    if (stringChunks.length === 0) {
        throw new Error('Отримано 0 чанків після розділення тексту');
    }

    await updateResearchStatus('[4/6] Making embedding', documentId)
    const client = new OpenAI();

    const summaryResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
            {
                role: "system",
                content: 'Зроби структуроване резюме документа (200-300 слів) тією ж мовою, що й документ: тема, ключові поняття, основні факти, висновки, учасники/терміни. Не вигадуй нічого поза текстом.',
            },
            { role: "user", content: allText.slice(0, 40000) },
        ],
    });
    const summary = summaryResponse.choices[0].message.content?.trim() || '';

    const entries = stringChunks.map((content, index) => ({ content, index, isSummary: false }));
    if (summary) entries.push({ content: summary, index: -1, isSummary: true });

    const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: entries.map((e) => `Документ: ${fileName}\n${e.content}`),
    });

    await updateResearchStatus('[5/6] Pushing embeddings into database', documentId)
    await prisma.$transaction(
        entries.map((entry, i) => {
            const vector = `[${response.data[i].embedding.join(',')}]`;
            return prisma.$executeRaw`
                INSERT INTO document_chunks (document_id, file_name, chunk_index, content, embedding, is_summary)
                VALUES (${documentId}::uuid, ${fileName}, ${entry.index}, ${entry.content}, ${vector}::vector, ${entry.isSummary})`;
        })
    );
    await updateResearchStatus('[6/6] Finished', documentId)
}, { connection: redisConnection })

worker.on('ready', () => {
    console.log('✅ Воркер успішно підключився до Redis і чекає на завдання!');
});

worker.on('failed', async (job, err) => {
    await updateResearchStatus('ERROR', job?.data.documentId)
    try {
        await prisma.documents.update({
            where: { document_id: job?.data.documentId },
            data: { error_message: err.message },
        });
    } catch (error) {
        console.error(`Оброблення файлу перервано: ${error}`);
    }
})