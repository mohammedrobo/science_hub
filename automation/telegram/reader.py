"""
Science Hub — Telegram Reader
Reads @science2025batch, downloads PDFs, extracts YouTube links,
builds pending_lectures.json queue with full deduplication.

First run:  python automation/telegram/reader.py
Update:     python automation/telegram/reader.py --update
One subject: python automation/telegram/reader.py --subject physics
"""

import asyncio, json, os, re, hashlib, argparse
import urllib.request, urllib.error
import urllib.parse
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.tl.types import MessageMediaDocument, MessageMediaPhoto
from telethon.errors import FloodWaitError

load_dotenv('automation/.env')
load_dotenv('.env.local')

API_ID   = int(os.getenv('TELEGRAM_API_ID', '0').strip())
API_HASH = os.getenv('TELEGRAM_API_HASH', '').strip()
PHONE    = os.getenv('TELEGRAM_PHONE', '').strip()
GROUP    = os.getenv('TELEGRAM_GROUP')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

ROOT          = Path(__file__).resolve().parent.parent.parent
DOWNLOADS_DIR = ROOT / 'automation' / 'downloads'

# Replaced QUEUE_FILE with Supabase
EXAM_FILE     = ROOT / 'automation' / 'queue' / 'exam_resources.json'
HASHES_FILE   = ROOT / 'automation' / 'queue' / 'file_hashes.json'
STATE_FILE    = ROOT / 'automation' / 'telegram' / 'state.json'
SESSION_FILE  = str(ROOT / 'automation' / 'telegram' / 'session')

for d in [DOWNLOADS_DIR, EXAM_FILE.parent,
          ROOT / 'automation' / 'telegram']:
    d.mkdir(parents=True, exist_ok=True)

# ── Arabic ordinals → lecture number ──────────────────────────
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

YOUTUBE_RE = re.compile(
    r'https?://(?:www\.)?(?:youtube\.com/(?:watch\?v=|shorts/)|youtu\.be/)([\w\-_]+)'
)

# ── Subject configuration ──────────────────────────────────────
SUBJECTS = {
    'chemistry_physical': {
        'topic_id': 174,
        'course_code': 'C102',
        'course_name': 'General Chemistry 2 (Physical)',
        'course_name_ar': 'كيمياء',
        'download_dir': 'chemistry/physical',
        'doctor_map': {},
        'single_doctor': None,
        'offset_limit': 'عضوية',
    },
    'chemistry_organic': {
        'topic_id': 174,
        'course_code': 'C102',
        'course_name': 'General Chemistry 2 (Organic)',
        'course_name_ar': 'كيمياء عضوية',
        'download_dir': 'chemistry/organic',
        'doctor_map': {},
        'single_doctor': None,
        'offset_start': 'عضوية',
    },
    'physics': {
        'topic_id': 177,
        'course_code': 'P102',
        'course_name': 'General Physics 2',
        'course_name_ar': 'فيزياء 2',
        'download_dir': 'physics',
        'doctor_map': {},
        'single_doctor': None,
    },
    'math': {
        'topic_id': 178,
        'course_code': 'M102',
        'course_name': 'Mathematics 2',
        'course_name_ar': 'رياضيات 2',
        'download_dir': 'math',
        'doctor_map': {},
        'single_doctor': None,
    },
    'geology': {
        'topic_id': 179,
        'course_code': 'G102',
        'course_name': 'Historical Geology',
        'course_name_ar': 'جيولوجيا تاريخية',
        'download_dir': 'geology',
        'doctor_map': {},
        'single_doctor': None,
    },
    'botany': {
        'topic_id': 175,
        'course_code': 'B101',
        'course_name': 'General Botany',
        'course_name_ar': 'نبات عام',
        'download_dir': 'botany',
        'doctor_map': {},
        'single_doctor': None,
    },
    'zoology': {
        'topic_id': 176,
        'course_code': 'Z102',
        'course_name': 'General Zoology',
        'course_name_ar': 'حيوان عام',
        'download_dir': 'zoology',
        'doctor_map': {},
        'single_doctor': None,
    },
    'computer': {
        'topic_id': 180,
        'course_code': 'COMP101',
        'course_name': 'Introduction to Computer',
        'course_name_ar': 'مقدمة حاسب',
        'download_dir': 'computer_science',
        'doctor_map': {},
        'single_doctor': None,
    },
    'practical_physics': {
        'topic_id': 181,
        'course_code': 'P104',
        'course_name': 'Practical Physics (Electricity & Optics)',
        'course_name_ar': 'فيزياء عملي',
        'download_dir': 'physics_practical',
        'doctor_map': {},
        'single_doctor': None,
        'include_any': ['فيزياء', 'physics', 'كهرباء', 'بصريات'],
        'exclude_any': ['كيمياء', 'chem'],
    },
    'practical_chemistry': {
        'topic_id': 181,
        'course_code': 'C104',
        'course_name': 'Practical Chemistry',
        'course_name_ar': 'كيمياء عملي',
        'download_dir': 'chemistry_practical',
        'doctor_map': {},
        'single_doctor': None,
        'include_any': ['كيمياء', 'chem'],
        'exclude_any': ['فيزياء', 'physics'],
    },
}

# ── File type scoring ──────────────────────────────────────────
PRIMARY_SCORE = {
    'simplified': 100,
    'slides':      60,
    'lecture':     40,
    'simplified_slides': 30,
    'mindmap':     10,
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

def classify(text: str) -> dict:
    """Full classification of a message label."""
    out: dict[str, str | int | bool | None] = {
        'category': 'skip',
        'subtype': None,
        'lecture_num': None,
        'is_continuation': False,
        'youtube_url': None,
    }

    # YouTube
    m = YOUTUBE_RE.search(text)
    if m:
        out['youtube_url'] = f"https://www.youtube.com/watch?v={m.group(1)}"

    # Exam
    if any(k in text for k in EXAM_KEYWORDS):
        out['category'] = 'exam'
        return out

    # Resource
    for kw, rtype in RESOURCE_KEYWORDS.items():
        if kw in text:
            out['category'] = 'resource'
            out['subtype'] = rtype
            return out

    # Lecture number
    found_ordinals = []
    for word, num in ORDINALS.items():
        idx = text.find(word)
        if idx != -1:
            found_ordinals.append((idx, num))
            
    if found_ordinals:
        found_ordinals.sort(key=lambda x: x[0])
        out['lecture_num'] = found_ordinals[0][1]
    if not out.get('lecture_num'):
        text_clean = re.sub(r'https?://[^\s]+', '', text).strip()
        m2 = re.search(r'(?<!\d)(\d{1,2})(?!\d)', text_clean)
        if m2:
            out['lecture_num'] = int(m2.group(1))
        else:
            m3 = re.search(r'(?<![٠١٢٣٤٥٦٧٨٩])([٠١٢٣٤٥٦٧٨٩]{1,2})(?![٠١٢٣٤٥٦٧٨٩])', text_clean)
            if m3:
                out['lecture_num'] = int(m3.group(1).translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')))

    # Continuation
    if 'تابع' in text:
        out['category'] = 'secondary'
        out['subtype'] = 'continuation'
        out['is_continuation'] = True
        return out

    # Secondary
    sec_map = {
        'خرائط ذهنية':'mindmap', 'خرائط':'mindmap',
        'تبسيط اسلايد':'simplified_slides',
        'تبسيط آخر':'simplified_alt',
        'اسلايد تاني':'slides_p2', 'اسلايد ثاني':'slides_p2',
        'اسلايد تالت':'slides_p3',
        'ملاحظات':'notes',
    }
    for kw, st in sec_map.items():
        if kw in text:
            out['category'] = 'secondary'
            out['subtype'] = st
            return out

    # Primary
    if 'تبسيط' in text:
        out['category'] = 'primary'
        out['subtype'] = 'simplified'
        return out
    if any(k in text for k in ['سكشن', 'عملي', 'معمل', 'لاب', 'lab', 'section']):
        out['category'] = 'primary'
        out['subtype'] = 'section'
        return out
    if 'اسلايد اول' in text or ('اسلايد' in text and 'تاني' not in text and 'تبسيط' not in text):
        out['category'] = 'primary'
        out['subtype'] = 'slides'
        return out
    if any(k in text for k in ['جزء', 'part']):
        out['category'] = 'primary'
        out['subtype'] = 'part'
        return out
    if 'محاضرة' in text:
        out['category'] = 'primary'
        out['subtype'] = 'lecture'
        return out

    # Has YouTube at least
    if out['youtube_url']:
        out['category'] = 'youtube_only'

    return out

def load_hashes():
    if HASHES_FILE.exists():
        return json.loads(HASHES_FILE.read_text('utf-8'))
    return {}

def save_hashes(h):
    HASHES_FILE.write_text(json.dumps(h, ensure_ascii=False, indent=2), 'utf-8')

def file_hash(path: str) -> str:
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def lecture_id(course_code, doctor, lec_num):
    key = f"{course_code}|{doctor or 'none'}|{lec_num}"
    return hashlib.md5(key.encode()).hexdigest()

# ── Queue Supabase helpers ─────────────────────────────────────
def api_request(method, endpoint, data=None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing Supabase keys")
        return []
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY or "",
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    req = urllib.request.Request(url, method=method, headers=headers)
    if data:
        req.data = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req) as response:
            if response.status in (200, 201, 204):
                body = response.read()
                return json.loads(body) if body else []
    except urllib.error.HTTPError as e:
        print(f"Supabase HTTP error {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Supabase error: {e}")
    return None

def get_course_id(course_code: str):
    if not course_code:
        return None
    code = urllib.parse.quote(course_code)
    res = api_request('GET', f'courses?select=id&code=eq.{code}&limit=1')
    if res and isinstance(res, list) and len(res) > 0:
        return res[0].get('id')
    return None

def lesson_exists(course_id: str, title: str, lecture_num: int | None):
    if not course_id:
        return False
    # Check by title
    if title:
        title_q = urllib.parse.quote(title)
        res = api_request('GET', f'lessons?select=id&course_id=eq.{course_id}&title=eq.{title_q}&limit=1')
        if res and isinstance(res, list) and len(res) > 0:
            return True
    # Check by order index (lecture number)
    if lecture_num is not None:
        res2 = api_request('GET', f'lessons?select=id&course_id=eq.{course_id}&order_index=eq.{lecture_num}&limit=1')
        if res2 and isinstance(res2, list) and len(res2) > 0:
            return True
    return False

def load_queue():
    queue = []
    offset = 0
    limit = 1000
    while True:
        res = api_request('GET', f'automation_queue?select=id,status&limit={limit}&offset={offset}')
        if not res: break
        queue.extend(res)
        if len(res) < limit: break
        offset += limit
    return queue

def save_queue(q):
    pass # No longer needed, inserted individually

def load_exams():
    if EXAM_FILE.exists():
        return json.loads(EXAM_FILE.read_text('utf-8'))
    return []

def save_exams(e):
    EXAM_FILE.write_text(json.dumps(e, ensure_ascii=False, indent=2), 'utf-8')

# ── Downloader ─────────────────────────────────────────────────
async def download_pdf(client, group, tgt: dict, dest_dir: Path, hashes: dict):
    target_entity = group
    if tgt.get('entity_str'):
        try:
            val = tgt['entity_str']
            if val.isdigit():
                target_entity = await client.get_entity(int("-100" + val))
            else:
                target_entity = await client.get_entity(val)
        except Exception as e:
            print(f"    ❌ Failed to resolve subgroup {tgt.get('entity_str')}: {e}")

    msg = await client.get_messages(target_entity, ids=tgt['msg_id'])
    if not msg or not msg.media:
        return None

    is_photo = isinstance(msg.media, MessageMediaPhoto)
    is_doc = isinstance(msg.media, MessageMediaDocument)
    if not (is_photo or is_doc):
        return None

    fname = None
    doc = None
    mime = None
    if is_doc:
        doc = msg.media.document
        mime = getattr(doc, 'mime_type', None)
        for attr in doc.attributes:
            if hasattr(attr, 'file_name') and attr.file_name:
                fname = attr.file_name
                break

    if is_photo:
        fname = fname or f"photo_{tgt['msg_id']}.jpg"
    else:
        if not fname:
            fname = f"doc_{tgt['msg_id']}.pdf"

    fname = re.sub(r'[^\w\u0600-\u06FF.\-_ ]', '', fname).strip() or f"doc_{tgt['msg_id']}.pdf"

    ext = Path(fname).suffix.lower()
    is_pdf = (ext == '.pdf') or (mime == 'application/pdf')
    is_img = ext in ('.jpg', '.jpeg', '.png', '.webp') or (mime and mime.startswith('image/')) or is_photo
    if not (is_pdf or is_img):
        return None

    # Dedup by Telegram file ID
    if is_doc and doc:
        tg_key = f"tg_{doc.id}"
    else:
        tg_key = f"tg_photo_{msg.photo.id if msg.photo else tgt['msg_id']}"
    if tg_key in hashes and Path(hashes[tg_key]).exists():
        print(f"    ⏭️  Duplicate (tg_id): {fname}")
        return hashes[tg_key]

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / fname
    if dest.exists():
        dest = dest_dir / f"{dest.stem}_{tgt['msg_id']}.pdf"

    print(f"    ⬇️  {fname}")
    try:
        await client.download_media(msg, file=str(dest))
        size_mb = dest.stat().st_size / 1024 / 1024
        print(f"    ✅ {size_mb:.1f} MB")

        # Dedup by content hash
        chash = file_hash(str(dest))
        chash_key = f"hash_{chash}"
        if chash_key in hashes and Path(hashes[chash_key]).exists():
            print(f"    ⚠️  Identical content exists — reusing")
            dest.unlink()
            return hashes[chash_key]

        hashes[tg_key]    = str(dest)
        hashes[chash_key] = str(dest)
        save_hashes(hashes)
        return str(dest)
    except Exception as e:
        print(f"    ❌ {e}")
        if dest.exists():
            dest.unlink()
        return None

async def process_subject(client, group, subject_key, cfg, update_mode):
    print(f"\n{'='*60}")
    print(f"📚 {cfg['course_name']} | Index ID={cfg['topic_id']}")
    print(f"{'='*60}")

    idx_msg = await client.get_messages(group, ids=cfg['topic_id'])
    if not idx_msg or not idx_msg.text:
        print("  ❌ Index message not found")
        return 0

    hashes      = load_hashes()
    queue       = load_queue()
    existing    = {q['id'] for q in queue}
    course_id   = get_course_id(cfg['course_code'])

    # Extract all hyperlinks via Telethon's pure entity mapper
    links = []
    if getattr(idx_msg, 'entities', None):
        start_offset = 0
        limit_offset = float('inf')
        
        # We calculate offset bounds exactly in UTF-16 code units 
        # because Telegram's Entity offsets are encoded as UTF-16 lengths
        text_utf16 = idx_msg.text.encode('utf-16-le')
        if 'offset_limit' in cfg:
            idx = text_utf16.find(cfg['offset_limit'].encode('utf-16-le'))
            if idx != -1: limit_offset = idx // 2
            
        if 'offset_start' in cfg:
            idx = text_utf16.find(cfg['offset_start'].encode('utf-16-le'))
            if idx != -1: start_offset = idx // 2

        for ent, ent_text in idx_msg.get_entities_text():
            if hasattr(ent, 'url'):
                if not (start_offset <= ent.offset < limit_offset):
                    continue
                links.append((ent.url, ent_text.strip()))
    print(f"  📖 {len(links)} curated links extracted from Index")

    groups = {}

    for url, text in links:
        # Subject-level include/exclude filters (helps split mixed topics)
        inc = cfg.get('include_any')
        exc = cfg.get('exclude_any')
        text_l = text.lower()
        if inc and not any(k.lower() in text_l for k in inc):
            continue
        if exc and any(k.lower() in text_l for k in exc):
            continue

        c = classify(text)
        lec_num = c['lecture_num']
        if lec_num is None: 
            # If the hyperlink text itself doesn't contain the lecture number, 
            # we try to see if the URL is valid, but without a lecture num we drop it safely
            continue

        doctor = cfg.get('single_doctor')
        gkey = (doctor, lec_num)

        if gkey not in groups:
            groups[gkey] = {
                'doctor': doctor,
                'lec_num': lec_num,
                'target_msg_ids': [],
                'youtube_url': None,
                'youtube_from_tg': False,
            }

        if 'youtu' in url.lower():
            if not groups[gkey]['youtube_url']:
                groups[gkey]['youtube_url'] = url
                groups[gkey]['youtube_from_tg'] = True
        else:
            match = re.search(r't(?:elegram)?\.me/(?:c/(\d+)/|([\w-]+)/)?(\d+)$', url)
            if match:
                groups[gkey]['target_msg_ids'].append({
                    'entity_str': match.group(1) or match.group(2),
                    'msg_id': int(match.group(3))
                })

    print(f"  📊 {len(groups)} logical lectures mapped")

    dest_dir = DOWNLOADS_DIR / cfg['download_dir']
    new_count = 0

    for (doctor, lec_num), g in sorted(groups.items(), key=lambda x: x[0][1]):
        raw_hex = lecture_id(cfg['course_code'], doctor, lec_num)
        lid = f"{raw_hex[:8]}-{raw_hex[8:12]}-{raw_hex[12:16]}-{raw_hex[16:20]}-{raw_hex[20:32]}"

        if lid in existing:
            ex = next((q for q in queue if q['id'] == lid), None)
            if not update_mode or (ex and ex['status'] in ('done','pending','processing')):
                continue

        doctor_str = f"{doctor} — " if doctor else ""
        title = f"{cfg['course_name']} — {doctor_str}Lecture {lec_num}"
        print(f"\n  📎 {title}")

        # Skip if this lecture already exists in lessons table (manual uploads)
        if lesson_exists(course_id, title, lec_num):
            print("    ⏭️  Already uploaded — skipping")
            continue

        primary_path = None

        # Download the first target ID that evaluates to a valid PDF
        for tgt in g['target_msg_ids']:
            dl = await download_pdf(client, group, tgt, dest_dir, hashes)
            if dl:
                primary_path = dl
                break # We found the slide!

        # Even if NO PDF was found (it was video-only), we can still queue it 
        # so Gemini logic is simply bypassed but N8N creates a DB entry.
        can_gemini = False
        if primary_path and Path(primary_path).exists():
            size_mb = Path(primary_path).stat().st_size / 1024 / 1024
            is_pdf = str(primary_path).lower().endswith('.pdf')
            can_gemini = is_pdf and size_mb <= 50.0
            if not can_gemini:
                print(f"    ⚠️  {size_mb:.1f}MB or non-PDF — skipping quiz generation")

        primary_type = 'lecture'
        if primary_path and not str(primary_path).lower().endswith('.pdf'):
            primary_type = 'image'

        entry = {
            'id': lid,
            'status': 'pending',
            'source': 'telegram',
            'course_code': cfg['course_code'],
            'course_name': cfg['course_name'],
            'course_name_ar': cfg['course_name_ar'],
            'instructor': list(cfg.get('doctor_map', {}).values())[0] if cfg.get('doctor_map') else doctor,
            'lecture_number': lec_num,
            'lecture_title': title,
            'primary_pdf_path': str(primary_path) if primary_path else None,
            'primary_pdf_type': primary_type,
            'can_use_gemini': can_gemini,
            'youtube_url': g['youtube_url'],
            'youtube_from_telegram': g['youtube_from_tg'],
            'telegram_msg_ids': [t['msg_id'] for t in g['target_msg_ids']],
            'added_at': datetime.now().isoformat()
        }

        res = api_request('POST', 'automation_queue', data=entry)
        if res is not None:
            existing.add(lid)
            new_count += 1
        else:
            print("    ❌ Failed to insert into Supabase")
        await asyncio.sleep(0.2)

    print(f"\n  ✅ {new_count} new lectures added")
    return new_count

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--update', action='store_true')
    parser.add_argument('--subject', type=str, default=None)
    args = parser.parse_args()

    print("🚀 Science Hub — Telegram Reader")
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.start(phone=PHONE)
    group = await client.get_entity(GROUP)
    print(f"✅ Connected: {group.title}\n")

    targets = (
        {args.subject: SUBJECTS[args.subject]}
        if args.subject and args.subject in SUBJECTS
        else SUBJECTS
    )

    total = 0
    for key, cfg in targets.items():
        try:
            n = await process_subject(client, group, key, cfg, args.update)
            total += n
            await asyncio.sleep(3)
        except FloodWaitError as e:
            print(f"⏳ Rate limit — waiting {e.seconds}s")
            await asyncio.sleep(e.seconds)
        except Exception as e:
            print(f"❌ {key}: {e}")
            import traceback; traceback.print_exc()

    await client.disconnect()
    queue = load_queue()
    pending = sum(1 for q in queue if q.get('status') == 'pending')
    print(f"\n{'='*60}")
    print(f"📊 DONE — {total} new | {pending} pending | ~{pending*15} min total")
    print(f"{'='*60}")

if __name__ == '__main__':
    asyncio.run(main())
