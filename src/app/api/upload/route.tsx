import { NextResponse } from 'next/server';
import { researchQueue, RESEARCH_QUEUE_NAME } from '@/lib/queue';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    let documentId: string | null = null;
    let isFileUploaded = false;
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Файл не надано' }, { status: 400 });
        }

        console.log('Отримано файл:', file.name, 'Тип:', file.type, 'Розмір:', file.size);

        documentId = crypto.randomUUID()
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

        const { error: uploadFileError } = await supabaseAdmin
            .storage
            .from('documents')
            .upload(`public/${documentId}`, file)
        if (uploadFileError) {
            console.error("❌ Помилка збереження файлу в Supabase:", uploadFileError);
            throw uploadFileError;
        }

        isFileUploaded = true;

        await researchQueue.add(RESEARCH_QUEUE_NAME, {
            fileName: file.name,
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
        const errorMessage = error || 'помилка при обробці запиту';

        if (documentId) {
            await supabaseAdmin
                .from('documents')
                .update({
                    status: 'ERROR',
                    error_message: errorMessage
                })
                .eq('document_id', documentId);

            if (isFileUploaded) {
                await supabaseAdmin
                    .storage
                    .from('documents')
                    .remove([`public/${documentId}`]);
            }
        }
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        )
    }
}