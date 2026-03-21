import re
urls = ["https://t.me/science2025batch/500", "https://t.me/c/18318239/2369"\]
for url in urls:
    match = re.search(r't\.me/(?:c/(\d+)/|([\w-]+)/)?(\d+)$', url)
    if match:
        print(f"URL: {url} -> Entity: {match.group(1) or match.group(2)}, Msg: {match.group(3)}")
