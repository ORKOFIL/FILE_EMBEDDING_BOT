import { NextResponse } from 'next/server';
import { researchQueue, RESEARCH_QUEUE_NAME } from '@/app/lib/queue';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Файл не надано' }, { status: 400 });
        }

        console.log('Отримано файл:', file.name, 'Тип:', file.type, 'Розмір:', file.size);

        const arrayBuffer = await file.arrayBuffer();
        const base64File = Buffer.from(arrayBuffer).toString('base64');

        const documentId = crypto.randomUUID()
        const { error: mainerror } = await supabaseAdmin
            .from('documents')
            .insert({
                document_id: documentId,
                file_name: file.name,
                size: file.size,
                status: '[1/6] Uploading file'
            })
        if (mainerror) {
            console.error("❌ Помилка збереження в Supabase:", mainerror);
            throw mainerror;
        }

        console.log(`BEFORE WORKER ${documentId}`)
        const job = await researchQueue.add(RESEARCH_QUEUE_NAME, {
            fileName: file.name,
            fileType: file.type,
            fileBase64: base64File,
            documentId: documentId
        }, {
            attempts: 3,
            backoff: { type: 'fixed', delay: 5000 }
        })
        return NextResponse.json(
            { success: true, data: { docId: documentId } },
            { status: 201 }
        )
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        )
    }
}