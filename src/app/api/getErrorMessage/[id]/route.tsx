import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const param = await params
        const taskId = param.id
        console.log(taskId)
        const { data, error } = await supabaseAdmin
            .from('documents')
            .select('error_message')
            .eq('document_id', taskId)
            .select()

        if (error || !data) {
            return NextResponse.json(
                { error: `Failed to process request: ${error}` },
                { status: 500 }
            )
        }
        
        return NextResponse.json({ output: data![0].error_message })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}