import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const param = await params
        const taskId = param.id

        const doc = await prisma.documents.findUnique({
            where: { document_id: taskId },
            select: { status: true },
        })

        if (!doc) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ output: doc.status })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}
