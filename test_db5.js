const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('questions')
        .select('id, text, options')
        .ilike('text', '%Evaluate%\\lim%\\frac%')
        .limit(2);
    
    if (data) {
        data.forEach(q => {
            console.log("\nQ:", q.text);
        });
    }
}
check();
