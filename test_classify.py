import re
ORDINALS = {
    'اولي': 1, 'أولى': 1, 'اول': 1, 'أول': 1, '1': 1, '١': 1,
    'تانية': 2, 'ثانية': 2, 'تاني': 2, 'ثاني': 2, '2': 2, '٢': 2,
    'تالتة': 3, 'ثالثة': 3, 'تالت': 3, 'ثالث': 3, '3': 3, '٣': 3,
    'رابعة': 4, 'رابع': 4, '4': 4, '٤': 4,
    'خامسة': 5, 'خامس': 5, '5': 5, '٥': 5,
    'سادسة': 6, 'سادس': 6, '6': 6, '٦': 6,
    'سابعة': 7, 'سابع': 7, '7': 7, '٧': 7,
    'ثامنة': 8, 'ثامنة': 8, 'ثامن': 8, '8': 8, '٨': 8,
    'تاسعة': 9, 'تاسع': 9, '9': 9, '٩': 9,
    'عاشرة': 10, 'عاشر': 10, '10': 10, '١٠': 10
}

def classify(text: str) -> dict:
    out = {'category': 'skip', 'subtype': None, 'lecture_num': None}
    
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
    return out

links = [
    "تبسيط محاضرة اولي 🪶تبسيط محاضرة اولي",
    "تبسيط محاضرة تانية 🪶تبسيط محاضرة تانية",
    "محاضرة تالتة من صفحة رقم ١٦ ل ٢٢ و فيه معلومتين تبع المحاضرة ملهاش اسلايد هنلاقيها في اخر التبسيط و هي طرق تحضير الكانات 🪶تبسيط محاضرة تالتة",
    "https://t.me/science2025batch/543",
    "P102"
]
for l in links:
    print(l)
    print(" ->", classify(l)['lecture_num'])
