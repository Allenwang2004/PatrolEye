"""The prototype's spoken answer, re-voiced: the phone recording (A3) ends 1.3 s into it.
Text is exactly what the app answered on screen. Output: public/audio/device_answer.wav"""
from pathlib import Path
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
ROOT = Path(__file__).resolve().parent.parent
k = Kokoro(str(ROOT / 'tts/models/kokoro-v1.0.onnx'), str(ROOT / 'tts/models/voices-v1.0.bin'))
a, sr = k.create("Yeah, it looks off to me. I don't see any flames on the burners.", voice='af_heart', speed=1.05, lang='en-us')
i = np.where(np.abs(a) > 0.01)[0]
a = a[max(i[0] - 700, 0): i[-1] + 2800]
sf.write(ROOT / 'public/audio/device_answer.wav', a * 0.9, sr)
print(len(a) / sr, 's')
