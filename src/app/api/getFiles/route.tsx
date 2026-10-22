import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request){
    try {
        const data = await prisma.documents.findMany({
            orderBy: { created_at: 'desc' },
        });

        return NextResponse.json({ output: data })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}
