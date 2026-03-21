import asyncio, os
from telethon import TelegramClient
from dotenv import load_dotenv

load_dotenv('automation/.env')

SESSION_FILE = 'automation/telegram/session'

async def main():
    client = TelegramClient(SESSION_FILE, int(os.getenv('TELEGRAM_API_ID', 0)), os.getenv('TELEGRAM_API_HASH'))
    await client.start(phone=os.getenv('TELEGRAM_PHONE'))
    group = await client.get_entity(os.getenv('TELEGRAM_GROUP'))
    
    # Try fetching msg 2369
    msg = await client.get_messages(group, ids=2369)
    print(f"Message 2369 retrieved: {msg is not None}")
    if msg:
        print(f"Has media: {msg.media is not None}")
        
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
