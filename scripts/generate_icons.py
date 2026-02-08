#!/usr/bin/env python3
"""Generate all required icon sizes from main.png"""
from PIL import Image
import os

# Input file
INPUT = "main.png"
OUTPUT_DIR = "public"

# Icon sizes needed
ICONS = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "apple-touch-icon.png": 180,
    "android-chrome-192x192.png": 192,
    "android-chrome-512x512.png": 512,
    "android-chrome-maskable-192x192.png": 192,
    "android-chrome-maskable-512x512.png": 512,
    "icon.png": 512,
}

def main():
    print(f"Loading {INPUT}...")
    img = Image.open(INPUT)
    
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    for filename, size in ICONS.items():
        output_path = os.path.join(OUTPUT_DIR, filename)
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(output_path, "PNG")
        print(f"✓ {filename} ({size}x{size})")
    
    # Also create favicon.ico (multi-size)
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = [img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    ico_path = os.path.join(OUTPUT_DIR, "favicon.ico")
    ico_images[0].save(ico_path, format='ICO', sizes=ico_sizes)
    print(f"✓ favicon.ico (multi-size)")
    
    print("\n✅ All icons generated!")

if __name__ == "__main__":
    main()
