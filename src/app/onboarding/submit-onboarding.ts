'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession, updateSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function completeOnboarding() {
    const session = await getSession();
    if (!session) return { error: 'Not authenticated' };

    // Use Service Role to bypass RLS since we verified session
    const supabase = await createServiceRoleClient();

    // Use RPC to bypass potential schema cache issues with new columns
    // Passing 0.0 for p_gpa as feature is removed
    const { error: rpcError } = await supabase.rpc('complete_onboarding_rpc', {
        p_username: session.username,
        p_gpa: 0.0
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError);
        return { error: `Database Error: ${rpcError.message}` };
    }

    /* 
       Direct updates removed in favor of atomic RPC.
       This avoids "column not found" errors if the API schema cache is stale.
    */

    // Update session cookie to reflect new state
    // Explicitly set isFirstLogin to false just in case it wasn't
    await updateSession({
        hasOnboarded: true,
        isFirstLogin: false
    });

    revalidatePath('/', 'layout');
    return { success: true };
}
