import os
import json
import random
import re
import uuid
import sys
import string

# Try importing pdfplumber, if not available, fall back or warn
try:
    import pdfplumber
except ImportError:
    print("Installing pdfplumber...")
    os.system("pip install pdfplumber")
    import pdfplumber

# Configuration
PDF_FILE = "students.pdf"
SECURE_DIR = "secure_data"
SEED_FILE = "secure_data/seed.json"

def generate_random_string(length=8):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def clean_text(text):
    return text.strip()

def main():
    print(f"📂 Processing PDF: {PDF_FILE}")
    
    if not os.path.exists(PDF_FILE):
        print(f"❌ Error: {PDF_FILE} not found.")
        return

    users = []
    
    # State
    current_group = "Unknown"
    current_section = "0"
    
    # Keep track of counts
    section_counts = {}

    with pdfplumber.open(PDF_FILE) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text: 
                print(f"⚠️ Page {page_num} empty.")
                continue
            
            # DEBUG: Print first page content to debug formatting
            if page_num == 0:
                print("--- RAW TEXT SAMPLE (First 500 chars) ---")
                print(text[:500])
                print("-----------------------------------------")
            
            lines = text.split('\n')
            
            for line in lines:
                line = line.strip()
                if not line: continue
                
                # Detect Group (A, B, C, D) inside text like "المجموعة A"
                # Looking for English letter A-D alone or with Arabic
                group_match = re.search(r'(?:part|group|المجموعة)\s*([A-Da-d])', line, re.IGNORECASE)
                if group_match:
                    current_group = group_match.group(1).upper()
                    # Reset section if group changes? usually sections are numbered 1-4 per group
                
                # Detect Section (1, 2, 3...)
                # "السكشن 1" or "Section 1"
                section_match = re.search(r'(?:section|sec|السكشن)\s*(\d+)', line, re.IGNORECASE)
                if section_match:
                    current_section = section_match.group(1)

                # Heuristic for Student Row:
                # Starts with a number? Or ends with a number?
                # Line: "1  Mohammed Ali  ..." or "Mohammed Ali 1"
                # Let's assume any line that starts with a digit 1-3 digits long is a student row
                # regex: ^\d+\s+ or \s+\d+$
                
                # Check for leading number
                row_match = re.match(r'^(\d+)\s+(.+)', line)
                # Check for trailing number (common in RTL pdf extraction)
                if not row_match:
                     row_match = re.match(r'(.+)\s+(\d+)$', line)

                if row_match:
                    # It's a row!
                    if row_match.group(1).isdigit():
                        serial = row_match.group(1)
                        raw_name = row_match.group(2)
                    else:
                        serial = row_match.group(2)
                        raw_name = row_match.group(1)

                    if len(serial) > 4: continue # Ignore page numbers or years
                    
                    # Generate Random Credentials
                    # Username: Random alphanumeric OR GroupSection-Serial (User asked for random?)
                    # "make the username and passowrds randomly"
                    # Let's make username: {Group}{Section}-{Random} to ensure uniqueness but keep organization
                    # Or just purely random:
                    
                    rand_user_suffix = generate_random_string(5)
                    username = f"{current_group}{current_section}-{rand_user_suffix}"
                    password = str(random.randint(100000, 999999)) # 6 digit pin as before, or random string
                    
                    # Construct User Object
                    user = {
                        "id": str(uuid.uuid4()),
                        "serial": serial,
                        "name": raw_name.strip(), # We keep the parsed name for reference
                        "username": username,
                        "tempPassword": password,
                        "group": current_group,
                        "section": current_section,
                        "mustChangePassword": True
                    }
                    
                    users.append(user)
                    
                    # Track counts
                    key = f"{current_group}{current_section}"
                    section_counts[key] = section_counts.get(key, 0) + 1
                    
                    # File Output: secure_data/{Group}{Section}/{username}.json
                    folder = os.path.join(SECURE_DIR, key)
                    os.makedirs(folder, exist_ok=True)
                    
                    with open(os.path.join(folder, f"{username}.json"), "w", encoding="utf-8") as f:
                        json.dump(user, f, indent=2, ensure_ascii=False)

    # Save Seed
    os.makedirs(SECURE_DIR, exist_ok=True)
    with open(SEED_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

    print("-" * 30)
    print("✅ GENERATION COMPLETE")
    print(f"Total Users: {len(users)}")
    print("Breakdown by Section:")
    for key, count in section_counts.items():
        print(f"  - {key}: {count} students")
    print(f"📂 Seed file: {SEED_FILE}")

if __name__ == "__main__":
    main()
