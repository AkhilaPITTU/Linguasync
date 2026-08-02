import asyncio
import edge_tts

async def main():
    communicate = edge_tts.Communicate(
        "Hello from Edge TTS",
        "en-US-AriaNeural"
    )
    await communicate.save("test.mp3")

asyncio.run(main())