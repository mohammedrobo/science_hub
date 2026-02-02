import * as fs from 'fs';
import * as path from 'path';

// 1. تحديد مسار الملفات
const INPUT_FILE = path.join(process.cwd(), 'src', 'data', 'students_raw.txt');
const OUTPUT_DIR = path.join(process.cwd(), 'secure_data');
const SEED_JSON_FILE = path.join(OUTPUT_DIR, 'seed.json');
const SEED_SQL_FILE = path.join(OUTPUT_DIR, 'seed.sql');

// دالة لتوليد حروف عشوائية (3 حروف)
function generateRandomSuffix(length: number = 3): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // استبعدنا الحروف المتشابهة مثل I, 1, O, 0
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// دالة لتوليد باسورد أرقام (6 أرقام)
function generateNumericPassword(length: number = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

async function main() {
  console.log("🦅 STARTING PROTOCOL: GENERATING USERS...");

  // التأكد من وجود الملف
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Error: Input file not found at: ${INPUT_FILE}`);
    process.exit(1);
  }

  // قراءة الملف
  const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = rawData.split('\n').filter(line => line.trim() !== '');

  const users = [];
  const sqlStatements: string[] = [];

  console.log(`📊 Found ${lines.length} students. Processing...`);

  // إنشاء فولدر المخرجات
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const line of lines) {
    // تنظيف السطر وتقسيمه
    // المتوقع: "1 اسم الطالب A 1"
    const parts = line.trim().split(/\s+/); // التقسيم بالمسافات

    if (parts.length < 4) {
      console.warn(`⚠️ Skipping invalid line: ${line}`);
      continue;
    }

    // استخراج البيانات
    const serial = parts[0]; // الرقم المسلسل (أول كلمة)
    const section = parts[parts.length - 1]; // السكشن (آخر كلمة)
    const group = parts[parts.length - 2];   // المجموعة (قبل الأخيرة)

    // الاسم هو كل ما بين الرقم والجروب
    const nameParts = parts.slice(1, parts.length - 2);
    const fullName = nameParts.join(' ');

    // توليد اليوزرنيم: Group+Section + Serial + Random
    // مثال: A1-43-XYZ
    const randomSuffix = generateRandomSuffix();
    const username = `${group}${section}-${serial}-${randomSuffix}`;

    // توليد الباسورد
    const tempPassword = generateNumericPassword();

    // تجهيز كائن الطالب
    const userObj = {
      id: crypto.randomUUID(), // يحتاج Node.js v19+ أو يمكن استبداله برقم عشوائي
      serial,
      name: fullName,
      username,
      tempPassword,
      group,
      section,
      mustChangePassword: true
    };

    users.push(userObj);

    // تجهيز أمر SQL
    // ملاحظة: تأكد أن اسم الجدول في Supabase هو 'allowed_users'
    const sql = `INSERT INTO allowed_users (username, full_name, group_name, section, temp_password_hash, is_first_login) VALUES ('${username}', '${fullName}', '${group}', '${section}', '${tempPassword}', true);`;
    sqlStatements.push(sql);
  }

  // حفظ ملف JSON (للاستخدام المحلي)
  fs.writeFileSync(SEED_JSON_FILE, JSON.stringify(users, null, 2));
  console.log(`✅ JSON Data saved to: ${SEED_JSON_FILE}`);

  // حفظ ملف SQL (للحقن في Supabase)
  fs.writeFileSync(SEED_SQL_FILE, sqlStatements.join('\n'));
  console.log(`✅ SQL Script saved to: ${SEED_SQL_FILE}`);

  console.log("\n🚀 MISSION ACCOMPLISHED.");
  console.log(`👉 Total Users Generated: ${users.length}`);
  console.log("👉 Next Step: Copy the content of 'secure_data/seed.sql' and run it in Supabase SQL Editor.");
}

main().catch(console.error);