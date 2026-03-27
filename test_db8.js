const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data } = await supabase.from('questions').select('text').ilike('text', '%Evaluate lim x→∞ (3x%');
    console.log(JSON.stringify(data, null, 2));
}
check();
