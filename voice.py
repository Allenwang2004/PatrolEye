"""語音轉文字:瀏覽器錄音上傳 → Pi 本機 Whisper 辨識(聲音不出家門)。比賽用英文,LANGUAGE 改 "zh" 就是中文。

實測 Pi 5 CPU 2 執行緒:small 載入約 34 秒、4 秒語音辨識約 5.6 秒;base 約 1.9 秒但中文較不準。
注意:Whisper 遇到靜音會把 initial_prompt 當成聽到的話吐回來,所以一定要開 vad_filter 濾掉靜音。
"""
import subprocess
import threading
import time

import numpy as np
from opencc import OpenCC

MODEL_SIZE = "small"
LANGUAGE = "en"
_model = None
_ready = threading.Event()
_s2t = OpenCC("s2twp")          # 中文時 Whisper 常輸出簡體,關鍵字比對要用繁體(英文不受影響)


def preload():
    """伺服器啟動時在背景載入(要 30 秒左右),不擋住網頁。"""
    def load():
        global _model
        from faster_whisper import WhisperModel
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8", cpu_threads=2)
        _ready.set()
    threading.Thread(target=load, daemon=True).start()


def decode(data: bytes):
    """用系統的 ffmpeg 轉成 16 kHz 單聲道(faster-whisper 內建的 PyAV 解碼跟目前裝的 av 版本不相容)。"""
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", "16000",
                        "pipe:1"], input=data, capture_output=True, timeout=30)
    if r.returncode != 0 or not r.stdout:
        raise RuntimeError(f"Could not decode the recording: {r.stderr.decode(errors='ignore')[-200:]}")
    return np.frombuffer(r.stdout, np.float32)


def transcribe(data: bytes, hint=""):
    """data 是瀏覽器錄的音檔(webm/ogg/mp4 都可以)。回傳 (文字, 秒數)。"""
    if not _ready.wait(timeout=90):
        raise RuntimeError("The speech model is still loading. Try again in a moment.")
    t0 = time.time()
    segs, _ = _model.transcribe(decode(data), language=LANGUAGE, beam_size=1, vad_filter=True,
                                initial_prompt=(f"Questions about a room: {hint}" if LANGUAGE == "en"
                                                else f"以下是繁體中文的問句。{hint}"))
    text = _s2t.convert("".join(s.text for s in segs).strip())
    return text, time.time() - t0


def ready():
    return _ready.is_set()
