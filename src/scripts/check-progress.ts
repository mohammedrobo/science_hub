import { createClient } from '@/lib/supabase/server';

export async function checkUserProgress(username: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('user_progress').select('*').eq('username', username);
    console.log("User Progress:", JSON.stringify(data, null, 2));
}

// Manually run if needed
// checkUserProgress('satoru');
