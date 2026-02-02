
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose(username: string) {
    console.log(`Diagnosing for user: ${username}`);

    // 1. Check allowed_users
    const { data: user, error: userError } = await supabase
        .from('allowed_users')
        .select('*')
        .eq('username', username)
        .single();

    if (userError) {
        console.error('Error fetching user:', userError);
    } else {
        console.log('User found:', {
            username: user.username,
            has_onboarded: user.has_onboarded,
            role: user.access_role
        });
    }

    // 2. Check user_stats
    const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('username', username)
        .single();

    if (statsError) {
        console.error('Error fetching user_stats:', statsError);
        console.log('!!! CRITICAL: User likely has no stats row. Upsert logic needed.');
    } else {
        console.log('User Stats found:', stats);
        if (stats.gpa_term_1 === undefined) {
            console.log('!!! CRITICAL: gpa_term_1 column appears missing from result.');
        }
    }

    // 3. Test Update
    console.log('Attempting test update on user_stats...');
    const { error: updateError } = await supabase
        .from('user_stats')
        .update({ gpa_term_1: 3.5 })
        .eq('username', username);

    if (updateError) {
        console.error('Test update failed:', updateError);
    } else {
        console.log('Test update successful.');
    }
}

// Replace with a known username if available, or just log
diagnose('2024001'); // Assuming a standard ID format, or I'll check the users list first
