import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const param = await params
        const taskId = param.id
        console.log(taskId)
        const { data, error } = await supabaseAdmin
            .from('documents')
            .select('status')
            .eq('document_id', taskId)
            .select()

        if (error || !data) {
            return NextResponse.json(
                { error: `Failed to process request: ${error}` },
                { status: 501 }
            )
        }
        
        return NextResponse.json({ output: data![0].status })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 502 }
        );
    }
}