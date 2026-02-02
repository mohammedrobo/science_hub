/**
 * Password Migration Script
 * 
 * Migrates all plaintext passwords to bcrypt hashes.
 * Run this BEFORE deploying the security update that removes plaintext support.
 * 
 * Usage: npx tsx scripts/migrate-passwords.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SALT_ROUNDS = 12;

async function migratePasswords() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔐 Password Migration Script');
    console.log('=' .repeat(50));

    // Fetch all users
    const { data: users, error } = await supabase
        .from('allowed_users')
        .select('username, password');

    if (error) {
        console.error('❌ Failed to fetch users:', error.message);
        process.exit(1);
    }

    if (!users || users.length === 0) {
        console.log('ℹ️  No users found.');
        return;
    }

    console.log(`📊 Found ${users.length} users\n`);

    let migrated = 0;
    let alreadyHashed = 0;
    let failed = 0;

    for (const user of users) {
        const isHashed = user.password.startsWith('$2');

        if (isHashed) {
            alreadyHashed++;
            console.log(`✓ ${user.username}: Already hashed`);
            continue;
        }

        // Hash the plaintext password
        try {
            const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

            const { error: updateError } = await supabase
                .from('allowed_users')
                .update({ password: hashedPassword })
                .eq('username', user.username);

            if (updateError) {
                console.error(`✗ ${user.username}: Failed - ${updateError.message}`);
                failed++;
            } else {
                console.log(`✓ ${user.username}: Migrated to bcrypt`);
                migrated++;
            }
        } catch (err: any) {
            console.error(`✗ ${user.username}: Error - ${err.message}`);
            failed++;
        }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('📊 Migration Summary');
    console.log('=' .repeat(50));
    console.log(`✅ Already hashed: ${alreadyHashed}`);
    console.log(`🔄 Migrated:       ${migrated}`);
    console.log(`❌ Failed:         ${failed}`);
    console.log(`📊 Total:          ${users.length}`);

    if (failed > 0) {
        console.log('\n⚠️  Some passwords failed to migrate. Please investigate.');
        process.exit(1);
    }

    if (migrated > 0) {
        console.log('\n✅ Migration complete! All passwords are now bcrypt hashed.');
    } else if (alreadyHashed === users.length) {
        console.log('\n✅ All passwords were already hashed. No migration needed.');
    }
}

migratePasswords().catch(console.error);
