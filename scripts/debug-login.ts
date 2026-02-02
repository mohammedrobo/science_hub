
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

// Setup Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to see passwords
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUser(usernameTarget: string) {
    console.log(`--- Debugging User: ${usernameTarget} ---`);

    // 1. Check DB
    const { data: user, error } = await supabase
        .from('allowed_users')
        .select('*')
        .eq('username', usernameTarget)
        .single();

    if (error || !user) {
        console.error("❌ User NOT found in DB!");
        return;
    }
    console.log(`✅ User found in DB. ID: ${user.id}`);
    console.log(`   Stored Password Hash: ${user.password.substring(0, 10)}... (Length: ${user.password.length})`);

    // 2. Check JSON File
    try {
        const jsonPath = path.join(process.cwd(), 'secure_data', 'access_keys.json');
        if (!fs.existsSync(jsonPath)) {
            console.error(`❌ JSON File not found at: ${jsonPath}`);
            return;
        }
        const fileContent = fs.readFileSync(jsonPath, 'utf-8');
        const users = JSON.parse(fileContent);

        // Find user case-insensitive
        const jsonUser = users.find((u: any) => u.username.trim().toLowerCase() === usernameTarget.trim().toLowerCase());

        if (!jsonUser) {
            console.error("❌ User NOT found in access_keys.json!");
        } else {
            console.log(`✅ User found in access_keys.json.`);
            console.log(`   JSON Password: ${jsonUser.password}`);

            // 3. Test Compare
            const isMatch = await bcrypt.compare(jsonUser.password, user.password);
            console.log(`   bcrypt.compare(jsonPassword, dbHash) = ${isMatch ? "MATCH ✅" : "FAIL ❌"}`);

            if (!isMatch) {
                console.log("   Trying 'student123'...");
                const isDefault = await bcrypt.compare('student123', user.password);
                console.log(`   bcrypt.compare('student123', dbHash) = ${isDefault ? "MATCH (It's default!)" : "FAIL (Unknown password)"}`);
            }
        }

    } catch (e) {
        console.error("File error:", e);
    }
}

// Check the first user from the list I saw earlier or a common one
const target = "A_A1-1-0444";
debugUser(target);
