from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

audio = decode_audio("telugu.aac")

model = WhisperModel("tiny", device="cpu", compute_type="int8")

segments, info = model.transcribe(
    audio,          # pass the decoded NumPy array directly
    language="te",
    vad_filter=False
)

segments = list(segments)

print(info.language)
print(len(segments))

for s in segments:
    print(s.text)