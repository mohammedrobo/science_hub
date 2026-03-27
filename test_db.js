const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .ilike('options::text', '%sin(x + y)%')
        .limit(5);
    
    console.log("Error:", error);
    if (data) {
        data.forEach(q => {
            console.log("\nQ:", q.text);
            q.options.forEach((opt, idx) => {
                console.log(`Option ${idx} (len=${opt.length}):`, JSON.stringify(opt));
            });
        });
    }
}
check();
