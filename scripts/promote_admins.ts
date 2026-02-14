
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const targetNames = [
    'محمد توفيق جمال عبدالحكيم',
    'محمد السيد زكي'
];

async function promoteAdmins() {
    console.log("Initializing Admin Promotion...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    for (const name of targetNames) {
        console.log(`Searching for: ${name}`);

        // Find user
        const { data: users, error: searchError } = await supabase
            .from('allowed_users')
            .select('username, full_name, access_role')
            .ilike('full_name', `%${name}%`); // ilike for case-insensitive (though arabic is usually consistent)

        if (searchError) {
            console.error(`Error searching for ${name}:`, searchError);
            continue;
        }

        if (!users || users.length === 0) {
            console.warn(`No user found matching: ${name}`);
            continue;
        }

        if (users.length > 1) {
            console.warn(`Multiple users found for ${name}. Skipping safe update. Found: ${users.map((u: { username: string }) => u.username).join(', ')}`);
            continue;
        }

        const user = users[0];
        console.log(`Found User: ${user.full_name} (@${user.username}) - Role: ${user.access_role}`);

        if (user.access_role === 'super_admin') {
            console.log("User is already Super Admin.");
            continue;
        }

        // Update
        const { error: updateError } = await supabase
            .from('allowed_users')
            .update({ access_role: 'super_admin' })
            .eq('username', user.username);

        if (updateError) {
            console.error("Failed to update role:", updateError);
        } else {
            console.log(`SUCCESS: Promoted @${user.username} to Admin.`);
        }
    }
}

promoteAdmins().catch(console.error);
