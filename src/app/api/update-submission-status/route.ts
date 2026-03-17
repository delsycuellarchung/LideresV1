import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { token, status, completedAt, responses } = await req.json();

    if (!supabase || !token || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Actualizar el registro en form_submissions
    const { error } = await supabase
      .from('form_submissions')
      .update({
        status,
        completed_at: completedAt,
        responses: JSON.stringify(responses)
      })
      .eq('token', token);

    if (error) {
      console.error('Error updating submission:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Submission status updated: token=${token}, status=${status}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in update-submission-status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
