#!/bin/bash
set -e

SOURCE_IMG="main.png"

if [ ! -f "$SOURCE_IMG" ]; then
    echo "Error: Source image '$SOURCE_IMG' not found."
    exit 1
fi

echo "Generating icons from '$SOURCE_IMG'..."

# Create a temporary trimmed version
TRIMMED_IMG="public/temp_trimmed_source.png"
magick "$SOURCE_IMG" -trim +repage "$TRIMMED_IMG"

# Function to generate square icon with crop-to-fill
generate_square_icon() {
    local size=$1
    local output=$2
    # Resize to FILL the box (using ^), then crop from center
    # This ensures no whitespace/bars.
    magick "$TRIMMED_IMG" -resize "${size}x${size}^" -gravity center -extent "${size}x${size}" "$output"
}

# Generate standard icons
generate_square_icon 512 public/android-chrome-512x512.png
generate_square_icon 192 public/android-chrome-192x192.png

# Generate maskable icons (full bleed for now as requested)
generate_square_icon 512 public/android-chrome-maskable-512x512.png
generate_square_icon 192 public/android-chrome-maskable-192x192.png

# Apple Touch Icon
generate_square_icon 180 public/apple-touch-icon.png

# Generic Icon (for shortcuts)
generate_square_icon 96 public/icon.png

# Favicons
generate_square_icon 32 public/favicon-32x32.png
generate_square_icon 16 public/favicon-16x16.png
magick "$TRIMMED_IMG" -resize 48x48 -background none -gravity center -extent 48x48 -define icon:auto-resize=48,32,16 public/favicon.ico

# Cleanup
rm "$TRIMMED_IMG"

echo "Icon generation complete."
