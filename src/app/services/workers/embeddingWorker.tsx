import { Worker } from 'bullmq';
import { redisConnection, RESEARCH_QUEUE_NAME } from '@/app/lib/queue';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { updateResearchStatus } from '@/app/services/supabase/updateStatus'
import OpenAI from "openai";

console.log('🚀 Скрипт воркера запущено, підключаємося до Redis...');
const worker = new Worker(RESEARCH_QUEUE_NAME, async (job) => {
    console.log('[WORKER] started job')
    const { fileBase64, fileType, fileName, documentId } = job.data;
    const buffer = Buffer.from(fileBase64, 'base64');
    console.log(`AFTER WORKER ${documentId}`)
    updateResearchStatus('[2/6] Extracting text', documentId)
    let allText = '';
    if (fileType.trim() == 'application/pdf') {
        const blob = new Blob([buffer], { type: fileType || 'application/pdf' });
        const loader = new PDFLoader(blob);
        const docs: Document[] = await loader.load();
        console.log(`Завантажено сторінок: ${docs.length}`);

        if (docs.length > 0) {
            for (let i = 0; i < docs.length; i++) {
                allText = allText + docs[i].pageContent;
            }
        }
    } else if (fileType.trim() == 'text/plain') {
        const text = buffer.toString('utf-8');
        allText = text
    }

    updateResearchStatus('[3/6] Splitting text', documentId)
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const stringChunks = await textSplitter.splitText(allText);

    updateResearchStatus('[4/6] Making embedding', documentId)
    const client = new OpenAI();
    const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: stringChunks,
    });

    updateResearchStatus('[5/6] Pushing embeddings into database', documentId)
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
    updateResearchStatus('[6/6] Finished', documentId)
}, { connection: redisConnection })

worker.on('ready', () => {
    console.log('✅ Воркер успішно підключився до Redis і чекає на завдання!');
});