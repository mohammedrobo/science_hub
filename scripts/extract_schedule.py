#!/usr/bin/env python3
"""
Extract schedule data from PDF and convert to JSON.
Usage: python3 scripts/extract_schedule.py
"""

import json
import sys

try:
    import pdfplumber
except ImportError:
    print("Installing pdfplumber...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber"])
    import pdfplumber

PDF_PATH = "جداول A.B.C.D (M.A)_20260201_224336_٠٠٠٠.pdf"
OUTPUT_PATH = "secure_data/schedules.json"

def extract_tables_from_pdf(pdf_path):
    """Extract all tables from PDF pages."""
    all_tables = []
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"PDF has {len(pdf.pages)} pages")
        
        for i, page in enumerate(pdf.pages):
            print(f"\n--- Page {i+1} ---")
            
            # Extract text to understand structure
            text = page.extract_text()
            if text:
                print(f"Text preview: {text[:200]}...")
            
            # Extract tables
            tables = page.extract_tables()
            if tables:
                print(f"Found {len(tables)} table(s)")
                for j, table in enumerate(tables):
                    print(f"Table {j+1}: {len(table)} rows")
                    all_tables.append({
                        "page": i + 1,
                        "table_index": j,
                        "data": table
                    })
            else:
                print("No tables found on this page")
    
    return all_tables

def parse_schedule(tables):
    """Parse extracted tables into structured schedule format."""
    schedules = {}
    
    # This will need to be customized based on the actual PDF structure
    # For now, we'll save raw data for inspection
    
    for table_info in tables:
        page = table_info["page"]
        data = table_info["data"]
        
        if data and len(data) > 0:
            # First row is usually the header (days of week)
            header = data[0] if data[0] else []
            
            # Subsequent rows are time slots
            for row_idx, row in enumerate(data[1:], 1):
                if row:
                    print(f"Row {row_idx}: {row}")
    
    return tables  # Return raw for now

def main():
    print(f"Extracting schedules from: {PDF_PATH}")
    
    try:
        tables = extract_tables_from_pdf(PDF_PATH)
        
        # Save raw extracted data
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(tables, f, ensure_ascii=False, indent=2)
        
        print(f"\nSchedule data saved to: {OUTPUT_PATH}")
        print(f"Total tables extracted: {len(tables)}")
        
    except Exception as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    main()
