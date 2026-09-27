import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function updateResearchStatus(status: string, docId: string) {
    try {
        const { error, data } = await supabaseAdmin
            .from('documents')
            .update({ status: status })
            .eq('document_id', docId)
            .select()

        if (error) throw error;

        if (!data) {
            throw new Error('Failed to create research task: empty response');
        }
    } catch (error) {
        console.error('Error updating research status:', error);
        throw error;
    }
}