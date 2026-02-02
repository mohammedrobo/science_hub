
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function forceReload() {
    console.log("Forcing schema reload...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Force reload by commenting
    const { error } = await supabase.rpc('pg_notify', {
        channel: 'pgrst',
        payload: 'reload schema'
    });

    console.log("Notify sent:", error || "Success");

    // Also try to query to wake it up
    await supabase.from('schedule_entries').select('count').limit(1);
    console.log("Query attempted.");
}

forceReload().catch(console.error);
