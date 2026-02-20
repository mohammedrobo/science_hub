'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function completeLeaderOnboarding() {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  if (!['leader', 'admin', 'super_admin'].includes(session.role)) {
    return { error: 'Not authorized' };
  }

  const supabase = await createServiceRoleClient();

  // Try RPC first, fallback to direct update
  const { error: rpcError } = await supabase.rpc('complete_leader_onboarding_rpc', {
    p_username: session.username,
  });

  if (rpcError) {
    console.error('Leader Onboarding RPC Error:', rpcError);
    const { error: updateError } = await supabase
      .from('allowed_users')
      .update({ has_leader_onboarded: true })
      .eq('username', session.username);

    if (updateError) {
      console.error('Leader Onboarding Update Error:', updateError);
      return { error: `Database Error: ${updateError.message}` };
    }
  }

  // Verify the update actually persisted
  const { data: verify } = await supabase
    .from('allowed_users')
    .select('has_leader_onboarded')
    .eq('username', session.username)
    .single();

  if (!verify?.has_leader_onboarded) {
    console.error('Leader onboarding verification failed — value not persisted');
    return { error: 'Failed to persist onboarding status' };
  }

  revalidatePath('/leader', 'layout');
  return { success: true };
}

export async function resetLeaderOnboarding() {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  if (!['leader', 'admin', 'super_admin'].includes(session.role)) {
    return { error: 'Not authorized' };
  }

  const supabase = await createServiceRoleClient();

  const { error: rpcError } = await supabase.rpc('reset_leader_onboarding_rpc', {
    p_username: session.username,
  });

  if (rpcError) {
    const { error: updateError } = await supabase
      .from('allowed_users')
      .update({ has_leader_onboarded: false })
      .eq('username', session.username);

    if (updateError) {
      return { error: `Database Error: ${updateError.message}` };
    }
  }

  revalidatePath('/leader', 'layout');
  return { success: true };
}

export async function checkLeaderOnboardingStatus(): Promise<boolean> {
  const session = await getSession();
  if (!session) return true;

  if (!['leader', 'admin', 'super_admin'].includes(session.role)) {
    return true;
  }

  const supabase = await createServiceRoleClient();

  const { data } = await supabase
    .from('allowed_users')
    .select('has_leader_onboarded')
    .eq('username', session.username)
    .single();

  return data?.has_leader_onboarded ?? false;
}
