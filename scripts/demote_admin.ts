
import { createServiceRoleClient } from '@/lib/supabase/server';

const targetName = 'محمد السيد زكي';

async function demoteAdmin() {
    console.log(`Demoting Admin: ${targetName}`);
    const supabase = await createServiceRoleClient();

    // Find user
    const { data: users, error: searchError } = await supabase
        .from('allowed_users')
        .select('username, full_name, access_role')
        .ilike('full_name', `%${targetName}%`);

    if (searchError || !users?.length) {
        console.error("User not found or error:", searchError);
        return;
    }

    const user = users[0];
    console.log(`Found User: ${user.full_name} (@${user.username}) - Role: ${user.access_role}`);

    if (user.access_role !== 'admin') {
        console.log("User is not an Admin.");
        return;
    }

    // Update
    const { error: updateError } = await supabase
        .from('allowed_users')
        .update({ access_role: 'student' }) // Back to student
        .eq('username', user.username);

    if (updateError) {
        console.error("Failed to update role:", updateError);
    } else {
        console.log(`SUCCESS: Demoted @${user.username} to Student.`);
    }
}

demoteAdmin().catch(console.error);
