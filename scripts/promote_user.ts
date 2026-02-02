
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteUser(username: string) {
    console.log(`Promoting ${username} to admin...`);

    const { data, error } = await supabase
        .from('allowed_users')
        .update({ access_role: 'admin' })
        .eq('username', username)
        .select();

    if (error) {
        console.error('Error promoting user:', error);
    } else {
        console.log('Success! User promoted:', data);
    }
}

promoteUser('C_C2-36-4da3');
