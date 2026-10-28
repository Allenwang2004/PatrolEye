# PatrolEye competition video (Remotion)

v12, 178.9 s (under 3 minutes), 1920x1080 at 30 fps, with English narration and captions (burned into the picture).

The theme is danger prevention: a pressure past its limit, a slow leak, a stove left on. None of these dangers move, so ordinary AI cameras miss them; PatrolEye goes and looks, and only sends text out. v11 cut the opening down to one line, "An AI camera that spots danger early.", and replaced the two news stories in the home problem section with ones from 2026; v12 changed the narration about today's AI cameras (GPU) and the caregiver line (can't watch a screen all day).

## Structure

| Time | Section | Contents |
|---|---|---|
| 0:00 | Opening | Real footage of the prototype turning its head, then the logo with the narration "PatrolEye.", then the tagline with "An AI camera that spots danger early." ("danger early" turns orange as it is spoken) |
| 0:06 | Factory problem | Pump Room floor plan and patrol checklist: missed readings, wrong readings, found too late; narration "So a pressure past its limit, or a slow leak, gets noticed hours too late." |
| 0:22 | Current options | A sensor on every gauge, patrol robots, AI cameras. The third card is AI cameras / People and pets only, narration "Today's AI cameras spot people and pets, but judging danger needs a GPU-class model." |
| 0:37 | Home problem | "At the same time, another problem is growing." Then 713,600 people aged 65+ live alone in Taiwan; hearing and memory decline: a pot left smoking on the stove in the evening and a smoke alarm she can't hear, next to two real 2026 news headlines (TVBS 2026/9/17, SETN 2026/10/16); the next morning she falls, the phone goes unanswered and the next visit is two days away. Narration "Caregivers can't watch a camera all day, so by the time anyone notices, it's often too late." |
| 1:00 | Real prototype | "So we built PatrolEye to check where danger starts, and warn you in words." Close-up from C3, then the pan-tilt turning from A1_2 |
| 1:13 | Two editions | Factory edition: depth camera / home edition: webcam |
| 1:20 | Factory scenario | Pump room animation: 22 points patrolled every hour; "When a pressure creeps past its limit, it zooms in, reads the dial, and warns the shift lead." Then a new puddle on the floor, then a question at shift change |
| 1:37 | Bench test (real footage) | A pump room built from three screens: a PT-101 fault is injected, PatrolEye turns to read the gauge, FOUND, 3/3, about 1% error, text only |
| 1:53 | Home rounds | Patrolling for the caregiver: is she up? Is the stove off? Then it finds her on the floor and the caregiver's phone gets a text alert |
| 2:07 | Home question | "Besides waiting for its reports, her caregiver can just ask the camera to check." The question, then the wait sped up 8x (labelled on screen), then the answer. The suggested questions on the phone are replaced with "Is she up and moving? / Is the stove off? / Anyone on the floor?" and the address bar is covered |
| 2:18 | Hardware to deployment | Fusion exploded view, UGen300 M.2 / Hailo-10H, 40 TOPS / 8 GB, the compact version, the ceiling version with a room cross-section, images stay on the device and only text goes out |
| 2:48 | Ending | "One camera that catches danger early, so nobody has to watch." Three cards are checked off in turn: A pressure past its limit / A slow leak / A stove left on, then the logo with the narration and tagline "Private at home. Confidential at work." and the GitHub URL |

## Getting started

```bash
cd ~/PatrolEye/video
npm install
npm run studio      # preview in the browser
npm run render      # writes out/PatrolEye.mp4
CAPTIONS=1 node scripts/stills.mjs out/chk 40 130   # a few still frames (seconds, including the 6.0 s opening); leave out CAPTIONS=1 for no captions
```

## Real footage

`public/real/` holds the originals converted to H.264 at 30 fps:

| File | Source | Used in |
|---|---|---|
| `a1_1.mp4` | A1_1 | Opening (from 34.6 s) |
| `c3.mp4` | C3.MP4 | Start of the prototype section, close-up |
| `a1_2.mp4` | A1_2 | Pan-tilt turning in the prototype section (from 0.4 s), the home edition in Two editions, the home question (from 17.5 s, the pan-tilt turning around) |
| `realsense.mp4` | Realsense.MP4 | The factory edition in Two editions |
| `a4.mp4` | A4.MP4 | Home question: saying "Hey, is the stove closed?" to the phone |
| `a3.mp4`, `a3_last.png` | A3.MOV | Home question: the phone app (7.5-31.5 s played at 8x, followed by the answer at 31.5 s) |
| `bench_*.mp4` | camera, board and machine in shoot/ | Bench test section, see `shoot/bench_cut/cut.sh` |

Cut points: `cut` in `src/scenes/Proto.tsx` for the prototype section; `SHOTS` in `src/scenes/Bench.tsx` for the bench test; `cut`, `A3_RUN_FROM` and `A3_ANSWER` in `src/scenes/HomeAsk.tsx` for the home question, where `AppOverlay` in the same file covers the suggested questions on the phone.

## News headlines

The two news stories quoted in the home problem section (`News` in `src/scenes/HomeProblem.tsx`) are shown as the original Chinese headline plus an English summary; spaces in the headlines mark the line breaks:

- TVBS News, 2026/9/17, "獨家／8旬嬤燉肉「跑去看醫生」半小時返家 鍋燒黑濃煙密布" (an 80-year-old left a stew on the stove for half an hour; the pot burned black and the home filled with smoke) https://news.tvbs.com.tw/local/4023727
- SETN, 2026/10/16, "獨居老人慘死火場！防高齡悲劇 政府砸60億欲擋全台70萬獨老死劫" (an elderly person living alone died in a fire; the government plans NT$6 billion to protect Taiwan's 700,000 seniors living alone) https://www.setn.com/news/1923662

## Changing the narration

1. Edit `tts/script.json` (`text` is the caption, `say` is the pronunciation; `at` fixes the second a line starts, `minDuration` is the minimum section length; the two opening lines are in `opening`)
2. The first time, run `bash tts/get_models.sh` and `pip install kokoro-onnx soundfile`
3. `python3 tts/make_vo.py --only hp2` (re-records only the changed lines; without `--only` it re-records everything)

This updates `public/audio/`, `src/timing.json`, `out/voiceover_full.wav` and `out/captions.srt` (times exclude the 6.0 s opening). The two opening lines, `op0.wav` and `op1.wav` (under `opening` in script.json), are not part of the make_vo.py flow and have to be regenerated separately.

## Files

```
src/Video.tsx                 Main video and props (captions toggle, GitHub URL)
src/scenes/Opening.tsx        Opening (real footage + logo + two narration lines, OPEN_SEC = 6.0 s)
src/scenes/Hook.tsx           Factory problem
src/scenes/Problem.tsx        Current options (Options)
src/scenes/HomeProblem.tsx    Home problem (living alone, forgotten stove and smoke alarm, news headlines, the fall, her week)
src/scenes/Proto.tsx          Real prototype
src/scenes/Editions.tsx       Two editions
src/scenes/Plant.tsx          Factory scenario animation
src/scenes/Bench.tsx          Bench test
src/scenes/HomeRounds.tsx     Home rounds + fall alert
src/scenes/HomeAsk.tsx        Home question (real footage with the phone screen covered)
src/scenes/HowProduct.tsx     Hardware to deployment
src/scenes/Final.tsx          Ending (three dangers + check marks, privacy tagline)
src/components/HomeRoom.tsx   Cross-section of Grandma Lin's home (stove fire, smoke, smoke alarm, phone, ceiling PatrolEye)
src/components/PumpRoom.tsx   Pump room floor plan
src/components/Icons.tsx      Icons (Drop and Flame added in v10)
src/components/Captions.tsx   Caption style
```

## Fusion renders

`public/render/` holds images exported by the Fusion script (`~/PatrolEye/hardware/v3/rig_concept_v3.py`) with the transparent margins trimmed; `vc_*` is the ceiling version.

## Old versions

`_old_v1` ... `_old_v10` hold the files replaced at each update; `_old_v10` holds the v11 files replaced by v12.
