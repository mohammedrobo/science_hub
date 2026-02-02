#!/usr/bin/env python3
"""
Parse extracted schedule data into structured format.
Maps pages 1-16 to sections A1-A4, B1-B4, C1-C4, D1-D4
"""

import json

INPUT_PATH = "secure_data/schedules.json"
OUTPUT_PATH = "secure_data/structured_schedules.json"

# Section mapping: page number -> section name
SECTION_MAP = {
    1: "A1", 2: "A2", 3: "A3", 4: "A4",
    5: "B1", 6: "B2", 7: "B3", 8: "B4",
    9: "C1", 10: "C2", 11: "C3", 12: "C4",
    13: "D1", 14: "D2", 15: "D3", 16: "D4"
}

# Arabic day names mapping
DAY_MAP = {
    "ﺪﺣﻻا": "sunday",
    "ﻦﻴﻨﺛﻻا": "monday",
    "ءﺎﺛﻼﺜﻟا": "tuesday",
    "ءﺎﻌﺑرﻷا": "wednesday",
    "ءﺎﻌﺑرﻻا": "wednesday",
    "ﺲﻴﻤﺨﻟا": "thursday"
}

# Subject translations (rough)
SUBJECT_HINTS = {
    "ءﺎﻳﺰﻴﻓ": "Physics",
    "ءﺎﻴﻤﻴﻛ": "Chemistry",
    "ﻲﺟﻮﻟوز": "Zoology",
    "ﻲﻧﺎﺗﻮﺑ": "Botany",
    "ﺔﺿﺎﻳر": "Math",
    "ﺔﻴﺿﺎﻳر": "Math",
    "ﺐﺳﺎﺣ": "Computer",
    "ﻮﻴﺟ": "Geology"
}

TYPE_HINTS = {
    "ةﺮﺿﺎﺤﻣ": "Lecture",
    "ﻲﻠﻤﻋ": "Practical",
    "ﻦﻳرﺎﻤﺗ": "Tutorial"
}

def parse_cell(cell_text):
    """Parse a schedule cell into subject, room, and time."""
    if not cell_text or cell_text.strip() == "":
        return None
    
    lines = cell_text.strip().split('\n')
    
    # Detect subject
    subject = "Unknown"
    class_type = "Class"
    room = ""
    time = ""
    
    for word, subj in SUBJECT_HINTS.items():
        if word in cell_text:
            subject = subj
            break
    
    for word, t in TYPE_HINTS.items():
        if word in cell_text:
            class_type = t
            break
    
    # Extract room code (usually like C104, P102, Z102, etc.)
    for line in lines:
        line_clean = line.strip()
        # Check for room patterns
        if any(c.isdigit() for c in line_clean) and len(line_clean) < 15:
            if 'م' in line_clean or ':' in line_clean:
                # This is likely a time
                if ':' in line_clean:
                    time = line_clean
            else:
                room = line_clean
    
    return {
        "subject": subject,
        "type": class_type,
        "room": room,
        "time": time,
        "raw": cell_text
    }

def process_schedule(raw_data):
    """Process raw extracted data into structured format."""
    schedules = {}
    
    for table_info in raw_data:
        page = table_info["page"]
        section = SECTION_MAP.get(page, f"Unknown_{page}")
        data = table_info["data"]
        
        if not data or len(data) < 2:
            continue
        
        # First row is header (days)
        header = data[0]
        days = []
        for h in header:
            for ar, en in DAY_MAP.items():
                if ar in (h or ""):
                    days.append(en)
                    break
            else:
                days.append("unknown")
        
        # Build schedule
        section_schedule = {day: [] for day in ["sunday", "monday", "tuesday", "wednesday", "thursday"]}
        
        for row_idx, row in enumerate(data[1:], 1):
            for col_idx, cell in enumerate(row):
                if col_idx < len(days):
                    day = days[col_idx]
                    parsed = parse_cell(cell)
                    if parsed and day in section_schedule:
                        parsed["slot"] = row_idx
                        section_schedule[day].append(parsed)
        
        schedules[section] = section_schedule
    
    return schedules

def main():
    print(f"Reading from: {INPUT_PATH}")
    
    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    schedules = process_schedule(raw_data)
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(schedules, f, ensure_ascii=False, indent=2)
    
    print(f"Processed {len(schedules)} section schedules")
    print(f"Sections: {list(schedules.keys())}")
    print(f"Output saved to: {OUTPUT_PATH}")
    
    # Print sample
    print("\nSample (A1 Sunday):")
    if "A1" in schedules:
        for item in schedules["A1"].get("sunday", [])[:2]:
            print(f"  - {item['subject']} ({item['type']}) @ {item['time']}")

if __name__ == "__main__":
    main()
