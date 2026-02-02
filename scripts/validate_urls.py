import re
import requests
import sys

CONSTANTS_PATH = 'src/lib/constants.ts'

# Regex for finding URLs in the TS file text
# video_url: 'https://...'
# url: 'https://...' (inside video_parts)
URL_PATTERN = re.compile(r"url:\s*'([^']+)'")

def check_video(video_id):
    try:
        # oEmbed is reliable for checking if ID exists and is public
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return True, "OK"
        elif response.status_code == 401:
            return False, "Private/Unauthorized"
        elif response.status_code == 404:
            return False, "Video Not Found"
        else:
            return False, f"Status {response.status_code}"
    except Exception as e:
        return False, str(e)

def extract_id(url):
    # Regex designed to match YouTube IDs (standard, shorts, embed)
    # Matching 11 char ID
    match = re.search(r"(?:youtu\.be/|youtube\.com/(?:embed/|v/|watch\?v=|user/\S+|shorts/|live/))([\w\-]{10,12})", url)
    if match:
        return match.group(1)
    
    # Handle playlist
    match_list = re.search(r"[?&]list=([^#&?]+)", url)
    if match_list:
        return None # Skip playlist validation for now
    
    return None

def main():
    print("--- Scanning src/lib/constants.ts for URLs ---")
    
    urls = []
    
    try:
        with open(CONSTANTS_PATH, 'r') as f:
            for line in f:
                matches = URL_PATTERN.findall(line)
                for url in matches:
                    if 'youtube' in url or 'youtu.be' in url:
                        urls.append(url)
    except FileNotFoundError:
        print(f"Error: Could not find {CONSTANTS_PATH}")
        sys.exit(1)

    print(f"Found {len(urls)} YouTube URLs.")
    
    errors = 0
    checked = 0
    
    for url in urls:
        video_id = extract_id(url)
        
        if not video_id:
            if 'list=' in url:
                # print(f"[INFO] Skipping Playlist: {url}")
                continue
                
            print(f"[FAIL REGEX] Invalid Format: {url}")
            errors += 1
            continue
            
        checked += 1
        is_valid, msg = check_video(video_id)
        
        if not is_valid:
            print(f"[FAIL API] {msg}: {url} (ID: {video_id})")
            errors += 1
        else:
            pass
            # print(f"[OK] {video_id}")

    print("-" * 30)
    print(f"Checked {checked} videos.")
    print(f"Found {errors} errors.")

if __name__ == "__main__":
    main()
