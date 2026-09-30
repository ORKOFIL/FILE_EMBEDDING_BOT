import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const param = await params
        const taskId = param.id

        
        const { data, error } = await supabaseAdmin
            .from('documents')
            .delete()
            .eq('document_id', taskId)
            .select()

        if (error || !data) {
            return NextResponse.json(
                { error: `Failed to process request: ${error}` },
                { status: 500 }
            )
        }
        
        return NextResponse.json({ status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}