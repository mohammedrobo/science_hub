import asyncio, os
from telethon import TelegramClient
from dotenv import load_dotenv

load_dotenv('automation/.env')
API_ID = int(os.getenv('TELEGRAM_API_ID'))
API_HASH = os.getenv('TELEGRAM_API_HASH')
PHONE = os.getenv('TELEGRAM_PHONE').strip()

async def main():
    client = TelegramClient('automation/telegram/session', API_ID, API_HASH)
    await client.start(phone=PHONE)
    group = await client.get_entity('science2025batch')
    msg = await client.get_messages(group, ids=174)
    if getattr(msg, 'entities', None):
        text_utf16 = msg.text.encode('utf-16-le')
        for ent in msg.entities:
            if hasattr(ent, 'url'):
                try:
                    raw_text = text_utf16[ent.offset*2:(ent.offset+ent.length)*2].decode('utf-16-le')
                    print(f"URL: {ent.url} | TEXT: {repr(raw_text)}")
                except:
                    pass
    await client.disconnect()

asyncio.run(main())
