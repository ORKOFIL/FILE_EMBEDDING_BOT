import { prisma } from '@/lib/prisma';

export async function updateResearchStatus(status: string, docId: string) {
    try {
        await prisma.documents.update({
            where: { document_id: docId },
            data: { status },
        });
    } catch (error) {
        console.error('Error updating research status:', error);
        throw error;
    }
}
