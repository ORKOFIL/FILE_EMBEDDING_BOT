import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request){
    try {
        const { data, error } = await supabaseAdmin
            .from('documents')
            .select()

        if (error || !data) {
            return NextResponse.json(
                { error: `Failed to process request: ${error}` },
                { status: 500 }
            )
        }
        
        return NextResponse.json({ output: data! })
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to process request: ${error}` },
            { status: 500 }
        );
    }
}