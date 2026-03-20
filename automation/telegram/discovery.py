"""
Telegram Discovery Script
Reads @science2025batch without downloading files.
Dumps raw messages, detects structure, and builds an upload plan for user review.
"""

import asyncio, json, os, re
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.tl.types import MessageMediaDocument, MessageMediaPhoto
from telethon.errors import FloodWaitError

load_dotenv('automation/.env')

API_ID   = int(os.getenv('TELEGRAM_API_ID'))
API_HASH = os.getenv('TELEGRAM_API_HASH')
PHONE    = os.getenv('TELEGRAM_PHONE')
GROUP    = os.getenv('TELEGRAM_GROUP', 'science2025batch')

ROOT          = Path('.')
DISCOVERY_DIR = ROOT / 'automation' / 'discovery'
DISCOVERY_DIR.mkdir(parents=True, exist_ok=True)

RAW_FILE      = DISCOVERY_DIR / 'raw_messages.json'
REPORT_FILE   = DISCOVERY_DIR / 'structure_report.json'
PLAN_FILE     = DISCOVERY_DIR / 'upload_plan.json'
EXAMS_FILE    = DISCOVERY_DIR / 'exam_resources_plan.json'
SESSION_FILE  = str(ROOT / 'automation' / 'telegram' / 'session')

# ── Shared Regex & Matching Rules ──────────────────────────
YOUTUBE_RE = re.compile(
    r'https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([\w\-_]+)'
)
ORDINALS = {
    'اولي':1,'أولي':1,'اولى':1,'الاولي':1,'الأولي':1,
    'تانية':2,'ثانية':2,'التانية':2,'الثانية':2,'تانيه':2,
    'تالتة':3,'ثالثة':3,'التالتة':3,'الثالثة':3,'تالته':3,
    'رابعة':4,'الرابعة':4,'رابعه':4,
    'خامسة':5,'الخامسة':5,'خامسه':5,
    'سادسة':6,'السادسة':6,
    'سابعة':7,'السابعة':7,
    'ثامنة':8,'الثامنة':8,
    'تاسعة':9,'التاسعة':9,
    'عاشرة':10,'العاشرة':10,
    '١':1,'٢':2,'٣':3,'٤':4,'٥':5,
    '٦':6,'٧':7,'٨':8,'٩':9,'١٠':10,
}
EXAM_KEYWORDS = [
    'امتحان','اسئلة','أسئلة','حل اسئلة','حل أسئلة',
    'اسئله','اختبار','امتحانات','حل اسئلة الكتاب',
]
RESOURCE_KEYWORDS = {
    'كتاب':'textbook',
    'قوانين كاملة':'equations',
    'قوانين د':'equations',
    'صور منهج':'images',
    'صور المنهج':'images',
    'ملخص قوانين':'summary',
    'ملخص فوانين':'summary',
}
SUBJECT_RANGES = {
    'chemistry_physical': {'start': 174, 'course': 'C102_PHY', 'name': 'Physical Chemistry'},
    'chemistry_organic':  {'start': 177, 'course': 'C102_ORG', 'name': 'Organic Chemistry'},
    'physics':            {'start': 175, 'course': 'P102', 'name': 'Physics'},
    'botany':             {'start': 175, 'course': 'B102', 'name': 'Botany'},
    'zoology':            {'start': 176, 'course': 'Z102', 'name': 'Zoology'},
    'math':               {'start': 178, 'course': 'M102', 'name': 'Mathematics'},
    'geology':            {'start': 179, 'course': 'G102', 'name': 'Geology'},
    'computer':           {'start': 180, 'course': 'CS102', 'name': 'Computer Science'},
    'lab':                {'start': 181, 'course': 'LAB', 'name': 'Practical Lab'},
}

DOCTOR_MAP = {
    'أ)':'Dr. Essam',   'أ )':'Dr. Essam',
    'ب)':'Dr. Wagida',  'ب )':'Dr. Wagida',
    'ج)':'Dr. Abdulrahman', 'ج )':'Dr. Abdulrahman',
}

def classify(text: str) -> dict:
    out = {'category': 'skip', 'subtype': None, 'lecture_num': None, 'youtube_url': None}
    
    m = YOUTUBE_RE.search(text)
    if m: out['youtube_url'] = f"https://www.youtube.com/watch?v={m.group(1)}"
    
    if any(k in text for k in EXAM_KEYWORDS):
        out['category'] = 'exam'
        return out
        
    for kw, rtype in RESOURCE_KEYWORDS.items():
        if kw in text:
            out['category'] = 'resource'
            out['subtype'] = rtype
            return out
            
    for word, num in ORDINALS.items():
        if word in text:
            out['lecture_num'] = num
            break
    if not out['lecture_num']:
        m2 = re.search(r'\b(\d{1,2})\b', text)
        if m2: out['lecture_num'] = int(m2.group(1))

    if 'تابع' in text:
        out['category'] = 'secondary'
        out['subtype'] = 'continuation'
        return out

    sec_map = {
        'خرائط ذهنية':'mindmap', 'خرائط':'mindmap',
        'تبسيط اسلايد':'simplified_slides',
        'تبسيط آخر':'simplified_alt',
        'اسلايد تاني':'slides_p2', 'اسلايد ثاني':'slides_p2',
        'ملاحظات':'notes',
    }
    for kw, st in sec_map.items():
        if kw in text:
            out['category'] = 'secondary'
            out['subtype'] = st
            return out

    if 'تبسيط' in text:
        out['category'] = 'primary'
        out['subtype'] = 'simplified'
        return out
    if 'اسلايد اول' in text or ('اسلايد' in text and 'تاني' not in text):
        out['category'] = 'primary'
        out['subtype'] = 'slides'
        return out
    if 'محاضرة' in text or 'مترجم' in text:
        out['category'] = 'primary'
        out['subtype'] = 'lecture'
        return out

    if out['youtube_url']:
        out['category'] = 'youtube_only'

    if not out['category'] and out['lecture_num']:
        out['category'] = 'primary'
        out['subtype'] = 'unknown_doc'

    return out

async def step_1_dump_raw(client, group):
    print("⏳ Step 1: Fetching messages 172 to 300...")
    msgs = await client.get_messages(group, min_id=171, max_id=301, limit=500)
    msgs = sorted(msgs, key=lambda m: m.id)
    raw = []
    
    for msg in msgs:
        obj = {
            'id': msg.id,
            'date': msg.date.isoformat(),
            'text': (msg.text or msg.message or '').strip(),
            'has_media': False,
            'file_name': None,
            'mime_type': None,
            'size_mb': 0,
            'has_youtube': bool(YOUTUBE_RE.search(msg.text or '')),
        }
        
        if isinstance(msg.media, MessageMediaDocument):
            obj['has_media'] = True
            obj['mime_type'] = msg.media.document.mime_type
            obj['size_mb'] = msg.media.document.size / (1024 * 1024)
            for attr in msg.media.document.attributes:
                if hasattr(attr, 'file_name') and attr.file_name:
                    obj['file_name'] = attr.file_name
                    break
            if not obj['file_name']: obj['file_name'] = f"doc_{msg.id}.pdf"
        elif isinstance(msg.media, MessageMediaPhoto):
            obj['has_media'] = True
            obj['mime_type'] = 'image/jpeg'
            obj['file_name'] = f"photo_{msg.id}.jpg"
            
        raw.append(obj)
        
    RAW_FILE.write_text(json.dumps(raw, ensure_ascii=False, indent=2), 'utf-8')
    print(f"✅ Downloaded {len(raw)} messages into raw_messages.json")
    return raw

def step_2_3_4_analyze(raw):
    print("⏳ Step 2, 3 & 4: Analyzing structure & building upload plan...")
    
    upload_plan = []
    exam_plan = []
    report = {
        'subjects': {},
        'unclassified': [],
        'oversized_files': [],
    }
    
    current_doctor = None
    last_lecture = None
    last_subject = 'unknown'
    
    # Pre-sort subjects by start ID for fallback chronological grouping
    sorted_subs = sorted(SUBJECT_RANGES.items(), key=lambda x: x[1]['start'], reverse=True)

    def resolve_subject(msg, c_dict):
        # 1. Check if it's a direct reply or topic thread
        reply_to = msg.get('reply_to_msg_id') or msg.get('reply_to_top_id')
        if reply_to:
            for k, v in SUBJECT_RANGES.items():
                if v['start'] == reply_to:
                    return k
                    
        text = str(msg.get('text', '')).lower()
        arabic_keywords = {
            'chemistry_physical': ['فيزيائية', 'بدنية'],
            'chemistry_organic': ['عضوية'],
            'physics': ['فيزياء'],
            'botany': ['نبات'],
            'zoology': ['حيوان'],
            'math': ['رياضة', 'رياضيات'],
            'geology': ['جيولوجيا'],
            'computer': ['حاسب'],
            'lab': ['عملي', 'معمل']
        }
        
        # 2. Check keywords
        for k, v in SUBJECT_RANGES.items():
            if v['name'].lower() in text or v['course'].lower() in text:
                return k
        for k, words in arabic_keywords.items():
            if any(w in text for w in words):
                return k
                
        # 3. Fallback to chronological boundaries if no other way
        for k, v in sorted_subs:
            if msg['id'] >= v['start']:
                return k
                
        return 'unknown'

    for msg in raw:
        text = msg['text']
        combined = (text + ' ' + str(msg['file_name'])).strip()
        c = classify(combined)
        
        # Doctor check
        for prefix, doc_name in DOCTOR_MAP.items():
            if text.startswith(prefix):
                current_doctor = doc_name
                break
        
        # Resolve subject dynamically
        sub_key = resolve_subject(msg, c)
        
        # If no subject could be determined, inherit the last one (for orphan images/PDFs in albums)
        if sub_key == 'unknown' and last_subject != 'unknown':
            sub_key = last_subject
        last_subject = sub_key

        if sub_key not in report['subjects']:
            report['subjects'][sub_key] = {
                'msg_range': [msg['id'], msg['id']],
                'sections_found': set(),
                'lectures_found': set(),
                'pdfs_count': 0,
                'youtube_links': 0,
                'exam_files': 0,
                'resources': 0,
            }
        
        report['subjects'][sub_key]['msg_range'][1] = msg['id']
        if current_doctor: report['subjects'][sub_key]['sections_found'].add(current_doctor)
        if c['youtube_url']: report['subjects'][sub_key]['youtube_links'] += 1
        if msg['mime_type'] == 'application/pdf': report['subjects'][sub_key]['pdfs_count'] += 1
        
        if c['category'] == 'exam':
            report['subjects'][sub_key]['exam_files'] += 1
            exam_plan.append({'msg_id': msg['id'], 'type': 'exam', 'label': combined[:100]})
            continue
        elif c['category'] == 'resource':
            report['subjects'][sub_key]['resources'] += 1
            exam_plan.append({'msg_id': msg['id'], 'type': c['subtype'], 'label': combined[:100]})
            continue
            
        lec_num = c['lecture_num'] or last_lecture
        if lec_num is None:
            if msg['has_media']: report['unclassified'].append(msg['id'])
            continue
            
        last_lecture = lec_num
        report['subjects'][sub_key]['lectures_found'].add(lec_num)
        
        # Build Upload Plan Entry
        uid = f"{sub_key}_{current_doctor}_{lec_num}"
        existing = next((p for p in upload_plan if p['_uid'] == uid), None)
        
        if not existing:
            existing = {
                '_uid': uid,
                'subject': sub_key,
                'course_code': 'UNKNOWN',
                'instructor': current_doctor,
                'lecture_number': lec_num,
                'lecture_title': f"{sub_key} — {current_doctor or ''} Lecture {lec_num}",
                'primary_pdf': None,
                'secondary_pdfs': [],
                'youtube_url': c['youtube_url'],
                'youtube_from_telegram': bool(c['youtube_url']),
                'warnings': [],
            }
            upload_plan.append(existing)
            
        if not existing['youtube_url'] and c['youtube_url']:
            existing['youtube_url'] = c['youtube_url']
            existing['youtube_from_telegram'] = True
            
        if msg['has_media']:
            f_data = {
                'msg_id': msg['id'],
                'file_name': msg['file_name'],
                'type': c['subtype'] or 'unknown',
                'size_mb': round(msg['size_mb'], 2),
                'can_use_gemini': msg['size_mb'] <= 50.0
            }
            if msg['size_mb'] > 50.0:
                report['oversized_files'].append(f_data)
                
            if c['category'] == 'primary':
                if not existing['primary_pdf']: existing['primary_pdf'] = f_data
                else: existing['secondary_pdfs'].append(f_data)
            elif c['category'] == 'secondary':
                existing['secondary_pdfs'].append(f_data)
                
    # Cleanup dummy IDs and add warnings
    for p in upload_plan:
        del p['_uid']
        if not p['primary_pdf'] and not p['youtube_url']:
            p['warnings'].append("No PDF and no YouTube link found for this lecture.")
        if p['primary_pdf'] and p['primary_pdf']['size_mb'] > 50.0:
            p['warnings'].append(f"Primary file {p['primary_pdf']['file_name']} exceeds 50.0MB limitation.")

    # Convert sets to lists for JSON
    for skey, sdata in report['subjects'].items():
        sdata['sections_found'] = list(sdata['sections_found'])
        sdata['lectures_found'] = len(sdata['lectures_found'])
        
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
    PLAN_FILE.write_text(json.dumps(upload_plan, ensure_ascii=False, indent=2), 'utf-8')
    EXAMS_FILE.write_text(json.dumps(exam_plan, ensure_ascii=False, indent=2), 'utf-8')

    # ── Console Summary ──
    print("\n" + "="*60)
    print("✅ DISCOVERY COMPLETE\n")
    print(f"Upload plan saved to: {PLAN_FILE}")
    print(f"Exam resources saved to: {EXAMS_FILE}\n")
    print("SUMMARY:")
    print(f"  Total lectures planned: {len(upload_plan)}")
    print(f"  Lectures with PDF: {sum(1 for p in upload_plan if p['primary_pdf'])}")
    print(f"  Lectures with YouTube: {sum(1 for p in upload_plan if p['youtube_url'])}")
    print(f"  Lectures with both: {sum(1 for p in upload_plan if p['primary_pdf'] and p['youtube_url'])}")
    print(f"  Lectures with neither (warnings): {sum(1 for p in upload_plan if not p['primary_pdf'] and not p['youtube_url'])}")
    print(f"  Exam/resource files: {len(exam_plan)}")
    print(f"  Files too large for Gemini quiz: {len(report['oversized_files'])}")
    print("\n⚠️  PLEASE REVIEW upload_plan.json before proceeding.")
    print("Check that lecture numbers, titles, instructors, and file")
    print("assignments look correct for every subject.")
    print("\nWhen you are happy with the plan, run the main automation.")
    print("="*60)

async def main():
    print("🚀 Connecting to Telegram Discovery...")
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.start(phone=PHONE)
    group = await client.get_entity(GROUP)
    print(f"✅ Connected to @{GROUP}")
    
    raw = await step_1_dump_raw(client, group)
    step_2_3_4_analyze(raw)
    
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
