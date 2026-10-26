"""Generate the PatrolEye voiceover with Kokoro and write the timing the Remotion project reads.

Usage (from the project root):
    python3 tts/make_vo.py            # all lines
    python3 tts/make_vo.py --only a2  # re-voice a single line after editing its text

Edit tts/script.json, then re-run. Outputs:
    public/audio/<line>.wav      one file per line (Remotion places each one)
    src/timing.json              scene durations and line start times (seconds)
    out/voiceover_full.wav       the whole voiceover on one track, for your video editor
    out/captions.srt             English subtitles matching the voiceover

Line timing rules
    normal scenes: lines run one after another (lead, then gap or pauseBefore between lines, then tail)
    demo scenes:   a line starts at its "at" second (or later, if the previous line is still talking);
                   the scene lasts at least "minDuration" seconds so your footage has room
"""
import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
TTS = ROOT / "tts"
AUDIO = ROOT / "public" / "audio"
OUT = ROOT / "out"
SR = 24000


def synth(kokoro, text, voice, speed):
    samples, sr = kokoro.create(text, voice=voice, speed=speed, lang="en-us")
    assert sr == SR
    # trim leading/trailing near-silence so timing is tight
    idx = np.where(np.abs(samples) > 0.01)[0]
    if len(idx):
        samples = samples[max(idx[0] - int(0.03 * SR), 0): idx[-1] + int(0.12 * SR)]
    return samples.astype(np.float32)


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="line ids to re-generate (others reuse existing wavs)")
    args = ap.parse_args()

    script = json.loads((TTS / "script.json").read_text())
    AUDIO.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)

    kokoro = None
    def engine():
        nonlocal kokoro
        if kokoro is None:
            from kokoro_onnx import Kokoro
            kokoro = Kokoro(str(TTS / "models" / "kokoro-v1.0.onnx"), str(TTS / "models" / "voices-v1.0.bin"))
        return kokoro

    voice, speed = script["voice"], script.get("speed", 1.0)
    lead, gap, tail_default = script["lead"], script["gap"], script["tail"]

    scenes_out, srt, full = [], [], []
    t_global = 0.0
    for sc in script["scenes"]:
        t = lead
        lines_out = []
        for i, ln in enumerate(sc["lines"]):
            wav = AUDIO / f"{ln['id']}.wav"
            if not wav.exists() or args.only is None or ln["id"] in (args.only or []):
                audio = synth(engine(), ln.get("say", ln["text"]), ln.get("voice", voice), ln.get("speed", speed))
                sf.write(wav, audio, SR)
            dur = sf.info(wav).duration
            if "at" in ln:
                start = max(ln["at"], t)
            else:
                start = t if i == 0 else t + ln.get("pauseBefore", gap)
                if i == 0:
                    start += ln.get("pauseBefore", 0)
            lines_out.append({"id": ln["id"], "text": ln["text"], "start": round(start, 3),
                              "duration": round(dur, 3), "file": f"audio/{ln['id']}.wav"})
            srt.append((t_global + start, t_global + start + dur, ln["text"]))
            t = start + dur
        duration = max(t + sc.get("tail", tail_default), sc.get("minDuration", 0))
        scenes_out.append({"id": sc["id"], "start": round(t_global, 3), "duration": round(duration, 3),
                           "lines": lines_out})
        t_global += duration

    timing = {"fps": 30, "total": round(t_global, 3), "scenes": scenes_out}
    (ROOT / "src" / "timing.json").write_text(json.dumps(timing, indent=2))

    # one continuous voiceover track
    track = np.zeros(int(np.ceil(t_global * SR)) + SR, np.float32)
    for sc in scenes_out:
        for ln in sc["lines"]:
            a, _ = sf.read(AUDIO / f"{ln['id']}.wav", dtype="float32")
            s = int((sc["start"] + ln["start"]) * SR)
            track[s:s + len(a)] += a
    sf.write(OUT / "voiceover_full.wav", track, SR)

    with open(OUT / "captions.srt", "w") as f:
        for n, (a, b, text) in enumerate(srt, 1):
            f.write(f"{n}\n{srt_time(a)} --> {srt_time(b)}\n{text}\n\n")

    for sc in scenes_out:
        print(f"{sc['id']:<8} {sc['start']:7.2f}s  +{sc['duration']:6.2f}s")
    print(f"total {t_global:.1f}s ({int(t_global // 60)}:{t_global % 60:04.1f})")


if __name__ == "__main__":
    main()
