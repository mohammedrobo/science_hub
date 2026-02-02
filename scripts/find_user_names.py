
import json
import sys

# Search Terms
target_1 = "محمد توفيق جمال عبدالحكيم"
target_2 = "محمد السيد زكي"

try:
    with open('secure_data/students.json', 'r', encoding='utf-8') as f:
        students = json.load(f)
        
    print(f"Loaded {len(students)} students.")
    
    found = []
    
    for student in students:
        name = student.get('full_name', '')
        # Simple containment check, normalize spaces if needed
        if target_1 in name or target_2 in name:
            print(f"MATCH FOUND: {student['username']} - {name}")
            found.append(student)
            
    if not found:
        print("No exact matches found. Trying partials...")
        for student in students:
            name = student.get('full_name', '')
            if "توفيق" in name and "جمال" in name:
                 print(f"PARTIAL 1: {student['username']} - {name}")
            if "السيد" in name and "زكي" in name:
                 print(f"PARTIAL 2: {student['username']} - {name}")

except Exception as e:
    print(f"Error: {e}")
