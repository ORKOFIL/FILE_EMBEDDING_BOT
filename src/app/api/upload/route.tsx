import { NextResponse } from 'next/server';
import { researchQueue, RESEARCH_QUEUE_NAME } from '@/lib/queue';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    let documentId: string | null = null;
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Файл не надано' }, { status: 400 });
        }

        console.log('Отримано файл:', file.name, 'Тип:', file.type, 'Розмір:', file.size);

        documentId = crypto.randomUUID()
        await prisma.documents.create({
            data: {
                document_id: documentId,
                file_name: file.name,
                size: file.size,
                status: '[1/6] Uploading file',
                file: {
                    create: {
                        mime_type: file.type,
                        data: Buffer.from(await file.arrayBuffer()),
                    },
                },
            },
        })

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
            await prisma.documents.updateMany({
                where: { document_id: documentId },
                data: { status: 'ERROR', error_message: String(errorMessage) },
            });
        }
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        )
    }
}