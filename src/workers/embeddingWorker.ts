import { Worker } from 'bullmq';
import { redisConnection, RESEARCH_QUEUE_NAME } from '@/lib/queue';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { updateResearchStatus } from '@/services/supabase/updateStatus'
import OpenAI from "openai";

console.log('🚀 Скрипт воркера запущено, підключаємося до Redis...');
const worker = new Worker(RESEARCH_QUEUE_NAME, async (job) => {
    console.log('[WORKER] started job')

    const { fileName, documentId } = job.data;

    const { data: file, error } = await supabaseAdmin
        .storage
        .from('documents')
        .download(`public/${documentId}`)
    if (error) {
        console.error("❌ Помилка збереження файлу в Supabase:", error);
        throw error;
    }

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
        chunkSize: 1200,
        chunkOverlap: 250,
    });
    const stringChunks = await textSplitter.splitText(allText);

    if (stringChunks.length === 0) {
        throw new Error('Отримано 0 чанків після розділення тексту');
    }

    await updateResearchStatus('[4/6] Making embedding', documentId)
    const client = new OpenAI();
    const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: stringChunks,
    });

    await updateResearchStatus('[5/6] Pushing embeddings into database', documentId)
    const infoToInsert = stringChunks.map((chunkText, index) => ({
        document_id: documentId,
        file_name: fileName,
        chunk_index: index,
        content: chunkText,
        embedding: response.data[index].embedding
    }))

    const { error: embeddingerror } = await supabaseAdmin
        .from('document_chunks')
        .insert(infoToInsert)

    if (embeddingerror) {
        console.error("❌ Помилка збереження в Supabase:", embeddingerror);
        throw embeddingerror;
    }
    await updateResearchStatus('[6/6] Finished', documentId)
}, { connection: redisConnection })

worker.on('ready', () => {
    console.log('✅ Воркер успішно підключився до Redis і чекає на завдання!');
});

worker.on('failed', async (job, err) => {
    await updateResearchStatus('ERROR', job?.data.documentId)
    try {
        const { error: updateError } = await supabaseAdmin
            .from('documents')
            .update({ error_message: err.message })
            .eq('document_id', job?.data.documentId)
        if (updateError) {
            console.error(`Не вдалося оновити error_message у БД: ${updateError.message}`);
        }
    } catch (error) {
        console.error(`Оброблення файлу перервано: ${error}`);
    }
})