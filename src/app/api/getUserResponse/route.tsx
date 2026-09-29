import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, content } = body;

        console.log('id: ' + id)
        console.log(`user: ${content}`)

        const client = new OpenAI();
        const embeddingResponse = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: content,
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;


        const { data: matchedChunks, error } = await supabaseAdmin.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_threshold: 0.3,
            match_count: 3,
            target_table: "document_chunks",
            target_document_id: id
        });
        if (error) {
            console.error("Помилка векторного пошуку:", error);
            throw new Error("Не вдалося виконати пошук у базі.");
        }
        let contextText = '';
        if (!matchedChunks || matchedChunks.length === 0) {
            contextText = "На жаль, у завантажених документах не знайдено інформації за вашим запитом."
        } else {
            contextText = matchedChunks
                .map((chunk: { content: number }, index: string) => `--- Фрагмент №${index + 1} ---\n${chunk.content}`)
                .join("\n\n");
        }

        const chatCompletion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content: `Ти — помічник-аналітик документів.
Дай точну та вичерпну відповідь на питання користувача, використовуючи ТІЛЬКИ наданий контекст нижче.
Якщо відповіді немає в контексті, чесно дай відповідь: "У завантажених документах немає цієї інформації."

КОНТЕКСТ З ДОКУМЕНТІВ:
${contextText}`,
                },
                {
                    role: "user",
                    content: content,
                },
            ],
        });

        console.log(chatCompletion.choices[0].message.content)

        return NextResponse.json(
            { success: true, data: { answer: chatCompletion.choices[0].message.content } },
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