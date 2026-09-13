import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("DEEPGRAM_API_KEY")

headers = {
    "Authorization": f"Token {API_KEY}"
}

with open("telugu.aac", "rb") as f:
    audio = f.read()

response = requests.post(
    "https://api.deepgram.com/v1/listen?model=nova-3&language=te",
    headers={
        "Authorization": f"Token {API_KEY}",
        "Content-Type": "audio/aac"
    },
    data=audio
)

print("Status:", response.status_code)
print(response.json())