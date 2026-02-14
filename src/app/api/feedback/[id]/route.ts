import { NextRequest, NextResponse } from 'next/server';
import { readSession, type SessionData } from '@/lib/auth/session-read';
import { verifySessionWithDB } from '@/lib/auth/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH - Update feedback status (admin only)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await readSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Verify super_admin role with DB check
        const verified = await verifySessionWithDB();
        if (!verified || verified.role !== 'super_admin') {
            return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, adminNotes } = body;

        // Validate status
        const validStatuses = ['new', 'reviewing', 'in-progress', 'resolved', 'wont-fix'];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // Update feedback
        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
        };

        if (status) updateData.status = status;
        if (adminNotes !== undefined) updateData.admin_notes = adminNotes;

        const { error } = await supabase
            .from('feedback')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('[Feedback] Update error:', error);
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Feedback] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

// DELETE - Delete feedback (admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await readSession();
        if (!session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const verified = await verifySessionWithDB();
        if (!verified || verified.role !== 'super_admin') {
            return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
        }

        const { id } = await params;

        const { error } = await supabase
            .from('feedback')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Feedback] Delete error:', error);
            return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Feedback] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
