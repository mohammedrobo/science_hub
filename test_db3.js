const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('questions')
        .select('id, text, options')
        .ilike('text', '%explicit%')
        .limit(5);
    
    console.log("Data length:", data?.length);
    if (data && data.length > 0) {
        data.forEach(q => {
            console.log("\nQ:", q.text);
            q.options.forEach((opt, idx) => {
                console.log(`Option ${idx}:`, JSON.stringify(opt));
            });
        });
    } else {
        const { data: d2 } = await supabase.from('questions').select('id, text, options').limit(2);
        console.log("Any data:", d2);
    }
}
check();
