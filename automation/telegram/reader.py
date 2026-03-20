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
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.tl.types import MessageMediaDocument
from telethon.errors import FloodWaitError

load_dotenv('automation/.env')
load_dotenv('.env.local')

API_ID   = int(os.getenv('TELEGRAM_API_ID', '0'))
API_HASH = os.getenv('TELEGRAM_API_HASH')
PHONE    = os.getenv('TELEGRAM_PHONE')
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
        'start_msg_id': 174,   # ⚠️ VERIFY
        'scan_range': 100,
        'course_code': 'C102_PHY',
        'course_name': 'Physical Chemistry',
        'course_name_ar': 'الكيمياء الفيزيائية',
        'download_dir': 'chemistry/physical',
        'doctor_map': {},
        'single_doctor': None,
    },
    'chemistry_organic': {
        'start_msg_id': 177,   # ⚠️ VERIFY
        'scan_range': 100,
        'course_code': 'C102_ORG',
        'course_name': 'Organic Chemistry',
        'course_name_ar': 'الكيمياء العضوية',
        'download_dir': 'chemistry/organic',
        'doctor_map': {},
        'single_doctor': None,
    },
    'physics': {
        'start_msg_id': 175,   # ⚠️ VERIFY
        'scan_range': 180,
        'course_code': 'P102',
        'course_name': 'Physics',
        'course_name_ar': 'الفيزياء',
        'download_dir': 'physics',
        'doctor_map': {
            'أ)':'Dr. Essam',   'أ )':'Dr. Essam',
            'ب)':'Dr. Wagida',  'ب )':'Dr. Wagida',
            'ج)':'Dr. Abdulrahman', 'ج )':'Dr. Abdulrahman',
        },
        'single_doctor': None,
    },
    'botany': {
        'start_msg_id': 182,   # FIXED: Separated from Physics (was 175)
        'scan_range': 120,
        'course_code': 'B102',
        'course_name': 'Botany',
        'course_name_ar': 'علم النبات',
        'download_dir': 'botany',
        'doctor_map': {},
        'single_doctor': None,
    },
    'zoology': {
        'start_msg_id': 176,
        'scan_range': 120,
        'course_code': 'Z102',
        'course_name': 'Zoology',
        'course_name_ar': 'علم الحيوان',
        'download_dir': 'zoology',
        'doctor_map': {},
        'single_doctor': None,
    },
    'math': {
        'start_msg_id': 178,
        'scan_range': 150,
        'course_code': 'M102',
        'course_name': 'Mathematics',
        'course_name_ar': 'الرياضيات',
        'download_dir': 'math',
        'doctor_map': {},
        'single_doctor': None,
    },
    'geology': {
        'start_msg_id': 179,
        'scan_range': 80,
        'course_code': 'G102',
        'course_name': 'Geology',
        'course_name_ar': 'الجيولوجيا',
        'download_dir': 'geology',
        'doctor_map': {},
        'single_doctor': None,
    },
    'computer': {
        'start_msg_id': 180,
        'scan_range': 120,
        'course_code': 'CS102',
        'course_name': 'Computer Science',
        'course_name_ar': 'علم الحاسب',
        'download_dir': 'computer',
        'doctor_map': {},
        'single_doctor': None,
    },
    'lab': {
        'start_msg_id': 181,
        'scan_range': 100,
        'course_code': 'LAB',
        'course_name': 'Practical Lab',
        'course_name_ar': 'المواد العملية',
        'download_dir': 'lab',
        'doctor_map': {},
        'single_doctor': None,
        'is_lab': True,
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
        m2 = re.search(r'(?<!\d)(\d{1,2})(?!\d)', text)
        if m2:
            out['lecture_num'] = int(m2.group(1))
        else:
            m3 = re.search(r'(?<![٠١٢٣٤٥٦٧٨٩])([٠١٢٣٤٥٦٧٨٩]{1,2})(?![٠١٢٣٤٥٦٧٨٩])', text)
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
    if 'اسلايد اول' in text or ('اسلايد' in text and 'تاني' not in text and 'تبسيط' not in text):
        out['category'] = 'primary'
        out['subtype'] = 'slides'
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
async def download_pdf(client, group, msg_id: int, dest_dir: Path, hashes: dict):
    msg = await client.get_messages(group, ids=msg_id)
    if not msg or not isinstance(msg.media, MessageMediaDocument):
        return None

    doc = msg.media.document
    fname = None
    for attr in doc.attributes:
        if hasattr(attr, 'file_name') and attr.file_name:
            fname = attr.file_name
            break

    is_pdf = (fname and fname.lower().endswith('.pdf')) \
             or doc.mime_type == 'application/pdf'
    if not is_pdf:
        return None

    if not fname:
        fname = f"doc_{msg_id}.pdf"

    fname = re.sub(r'[^\w\u0600-\u06FF.\-_ ]', '', fname).strip() or f"doc_{msg_id}.pdf"

    # Dedup by Telegram file ID
    tg_key = f"tg_{doc.id}"
    if tg_key in hashes and Path(hashes[tg_key]).exists():
        print(f"    ⏭️  Duplicate (tg_id): {fname}")
        return hashes[tg_key]

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / fname
    if dest.exists():
        dest = dest_dir / f"{dest.stem}_{msg_id}.pdf"

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

# ── Per-subject processor ──────────────────────────────────────
def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text('utf-8'))
    return {}

def save_state(st):
    STATE_FILE.write_text(json.dumps(st, ensure_ascii=False, indent=2), 'utf-8')

async def process_subject(client, group, subject_key, cfg, update_mode):
    state = load_state()
    start_id = int(state.get(subject_key, cfg['start_msg_id']))
    scan_limit = cfg['scan_range'] + 50

    print(f"\n{'='*60}")
    print(f"📚 {cfg['course_name']} | start_id={start_id}")
    print(f"{'='*60}")

    msgs = await client.get_messages(
        group,
        min_id=start_id - 1,
        max_id=start_id + cfg['scan_range'],
        limit=scan_limit,
    )
    msgs = sorted(msgs, key=lambda m: m.id)
    print(f"  📖 {len(msgs)} messages to analyze")

    hashes      = load_hashes()
    queue       = load_queue()
    existing    = {q['id'] for q in queue}
    exams       = load_exams()
    current_doc = cfg.get('single_doctor')

    # Groups: {(doctor, lec_num): {...}}
    groups = {}

    for msg in msgs:
        if not msg:
            continue
        text = (msg.text or msg.message or '').strip()
        has_file = isinstance(msg.media, MessageMediaDocument)

        file_label = ''
        if has_file:
            for attr in msg.media.document.attributes:
                if hasattr(attr, 'file_name') and attr.file_name:
                    file_label = attr.file_name
                    break

        combined = (text + ' ' + file_label).strip()

        # ── Doctor section detection ──
        for prefix, dname in cfg.get('doctor_map', {}).items():
            if text.strip().startswith(prefix):
                if prefix in ('د)','د )','هـ)'):
                    current_doc = None
                else:
                    current_doc = dname
                break

        c = classify(combined)

        # ── Exam / resource → separate storage ──
        if c['category'] == 'exam':
            exams.append({
                'course_code': cfg['course_code'],
                'msg_id': msg.id,
                'label': combined[:120],
                'type': 'exam',
            })
            continue

        if c['category'] == 'resource':
            exams.append({
                'course_code': cfg['course_code'],
                'msg_id': msg.id,
                'label': combined[:120],
                'type': c['subtype'],
            })
            continue

        lec_num = c['lecture_num']

        # ── YouTube with no lecture context → attach to last group ──
        if c['youtube_url'] and lec_num is None and groups:
            last_key = list(groups.keys())[-1]
            if not groups[last_key]['youtube_url']:
                groups[last_key]['youtube_url'] = c['youtube_url']
                groups[last_key]['youtube_from_tg'] = True
            continue

        if lec_num is None:
            continue

        gkey = (current_doc, lec_num)
        if gkey not in groups:
            groups[gkey] = {
                'doctor': current_doc,
                'lec_num': lec_num,
                'primary_candidates': [],
                'secondary_msg_ids': [],
                'youtube_url': c['youtube_url'],
                'youtube_from_tg': bool(c['youtube_url']),
                'all_msg_ids': [],
            }
        else:
            if c['youtube_url'] and not groups[gkey]['youtube_url']:
                groups[gkey]['youtube_url'] = c['youtube_url']
                groups[gkey]['youtube_from_tg'] = True

        if msg.id not in groups[gkey]['all_msg_ids']:
            groups[gkey]['all_msg_ids'].append(msg.id)

        if has_file:
            if c['category'] == 'primary':
                groups[gkey]['primary_candidates'].append({
                    'msg_id': msg.id,
                    'subtype': c['subtype'],
                    'score': PRIMARY_SCORE.get(c['subtype'], 0),
                })
            elif c['category'] == 'secondary':
                groups[gkey]['secondary_msg_ids'].append(msg.id)

    save_exams(exams)
    print(f"  📊 {len(groups)} lectures found | {len(exams)} exam/resource items")

    # ── Download + build queue ──
    dest_dir = DOWNLOADS_DIR / cfg['download_dir']
    new_count = 0

    for (doctor, lec_num), g in sorted(groups.items(), key=lambda x: x[0][1]):
        raw_hex = lecture_id(cfg['course_code'], doctor, lec_num)
        lid = f"{raw_hex[:8]}-{raw_hex[8:12]}-{raw_hex[12:16]}-{raw_hex[16:20]}-{raw_hex[20:32]}"

        # Dedup check
        if lid in existing:
            ex = next((q for q in queue if q['id'] == lid), None)
            if not update_mode or (ex and ex['status'] in ('done','pending','processing')):
                continue

        # Sort candidates → pick best primary PDF
        candidates = sorted(g['primary_candidates'], key=lambda x: x['score'], reverse=True)
        best = candidates[0] if candidates else None

        doctor_str = f"{doctor} — " if doctor else ""
        title = f"{cfg['course_name']} — {doctor_str}Lecture {lec_num}"

        print(f"\n  📎 {title}")

        # Download primary
        primary_path = None
        primary_type = None
        if best:
            primary_path = await download_pdf(client, group, best['msg_id'], dest_dir, hashes)
            primary_type = best['subtype']

        # Download up to 2 secondary PDFs
        sec_paths = []
        for smid in g['secondary_msg_ids'][:2]:
            sp = await download_pdf(client, group, smid, dest_dir, hashes)
            if sp:
                sec_paths.append(sp)
            await asyncio.sleep(0.5)

        # Gemini size check
        can_gemini = False
        if primary_path and Path(primary_path).exists():
            size_mb = Path(primary_path).stat().st_size / 1024 / 1024
            can_gemini = size_mb <= 50.0
            if not can_gemini:
                print(f"    ⚠️  {size_mb:.1f}MB — too large for Gemini, quiz will be skipped")

        entry = {
            'id': lid,
            'status': 'pending',
            'source': 'telegram',
            'course_code': cfg['course_code'],
            'course_name': cfg['course_name'],
            'course_name_ar': cfg['course_name_ar'],
            'instructor': doctor,
            'lecture_number': lec_num,
            'lecture_title': title,
            'primary_pdf_path': str(primary_path) if primary_path else None,
            'primary_pdf_type': primary_type,
            'can_use_gemini': can_gemini,
            'youtube_url': g['youtube_url'],
            'youtube_from_telegram': g['youtube_from_tg'],
            'telegram_msg_ids': g['all_msg_ids'],
            'added_at': datetime.now().isoformat()
        }

        res = api_request('POST', 'automation_queue', data=entry)
        if res is not None:
            existing.add(lid)
            new_count += 1
        else:
            print("    ❌ Failed to insert into Supabase")
        await asyncio.sleep(0.2)

    if msgs:
        max_id_seen = max(m.id for m in msgs)
        if max_id_seen > start_id:
            state[subject_key] = max_id_seen
            save_state(state)

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
