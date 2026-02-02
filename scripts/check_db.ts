
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkSchema() {
    console.log("Checking DB schema...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if table exists by selecting 1 row
    const { data, error } = await supabase
        .from('schedule_entries')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error accessing table:", error);
    } else {
        console.log("Table 'schedule_entries' exists. Rows found:", data?.length ?? 0);
    }

    // Attempt to notify reload again
    const { error: notifyError } = await supabase.rpc('pg_notify', {
        channel: 'pgrst',
        payload: 'reload schema'
    });

    // Fallback: raw query if RPC unavailable? 
    // Usually rpc('pg_notify') works if exposed, but we can't always rely on it.
    // The previous psql command was better for reload.
}

checkSchema().catch(console.error);
