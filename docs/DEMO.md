# New demo: "break the pump room and let it find out"

Three screens play the pump room's equipment wall. A judge breaks things with a phone, PatrolEye patrols and finds them,
and the control room scoreboard on a tablet checks the answers automatically: how many were caught, how many seconds it took, how far off the readings were, and how many bytes were received (text only).

```
              Screen 1                Screen 2                 Screen 3
       Pressure gauges PT-101/102  Valve V-12 + breaker DB-1  Pump P-3 light + floor
                 \                     |                     /
          about -60 deg \              | 0 deg              /  about +60 deg
                         \             |             /
                           \       1.0-1.5 m       /
                                [ PatrolEye ]
                                      |
                           [ Tablet: scoreboard ]   <- facing the filming camera
                       In the judge's hand: phone remote
```

## Files

| File | Where it runs | What it does |
|---|---|---|
| `bench/server.py` + `bench/static/` | The computer driving the three screens | Simulates the equipment, the scoreboard and the remote. Needs only Python 3, no packages |
| `device/patrol.py`, `device/web/patrol.html` | Pi | Patrol mode: teach checkpoints, remember normal, detect changes, hand them to the model, look closer when unsure, send text-only reports |
| `device/live.py` (3 changes) | Pi | Mounts the `/patrol` page and API; refuses questions and panorama scans during a patrol so they don't fight over the pan-tilt |

## Setup (about 20 minutes)

1. **Bench**: on the computer driving the three screens
   ```
   cd PatrolEye
   python3 bench/server.py
   ```
   It prints a URL, e.g. `http://192.168.1.23:8100/` (IPv6 is `http://[2001:...]:8100/`).
   - Open three browser windows: `/station/1`, `/station/2`, `/station/3`, drag each to a screen and **double-click** for full screen.
   - Open `/board` on the tablet and `/remote` on the phone.
   - If a Mac asks to allow Python to accept incoming connections, allow it; on Windows allow it through the firewall on private networks.
   - Screen brightness 50-70%; turn off auto-dimming, sleep and night shift. Don't point lights straight at the screens (glare).
2. **Placement**: put the three screens 1.0-1.5 m from PatrolEye at roughly -60, 0 and +60 deg, facing it.
   If the screens can't be spread out that far on one table, move PatrolEye forward so the screens are at least one field of view (about 50 deg) apart.
   Put the tablet behind PatrolEye, facing the filming camera (so PatrolEye doesn't patrol it).
3. **Pi**: sync `device/` to the Pi (git or scp, whichever you normally use), then
   ```
   cd device && ./start.sh restart
   ```
   Open `https://[Pi address]:8000/patrol`.
4. **Teach the checkpoints** (six): **click the instrument** in the live view, the camera turns to centre on it,
   press the matching button at the top right (PT-101, PT-102, V-12, DB-1, P-3, FLOOR-3), then **Teach this view**.
   The orange box is what the model will see: 3x for gauges, valves, the breaker panel and lights, 2x for the floor; fit the whole thing in the box.
5. **Report to**: paste the bench's `...:8100/api/report` and press **Save + test**. When the scoreboard shows
   "PatrolEye is looking at TEST...", the connection works.
6. On the remote press **All back to normal**, then on the Pi page **Learn normal again**, then **Start patrol**.
7. Before the real take, press **New run (clear scores)** on the remote to reset the scores.

## Filming (a section of about 25-30 seconds)

| # | Shot | Length |
|---|---|---|
| 1 | Wide: PatrolEye in the middle, the three screens in an arc, the tablet in the foreground | 4 s |
| 2 | Phone close-up: pressing **Break something at random** | 2 s |
| 3 | Screen close-up: the needle climbing into the red / the valve handle turning 90 deg / the puddle on the floor growing | 3 s |
| 4 | Side view: PatrolEye turning to that station and stopping (can be sped up, labelled 4x) | 4 s |
| 5 | Over PatrolEye onto the tablet: a green **FOUND** pops up with the seconds it took | 4 s |
| 6 | Scoreboard close-up: Faults found, Reading error, 0 images | 3 s |

Also screen-record the Pi's `/patrol` page; it shows what the model saw at each station and its one-line verdict, which cuts in well.

## Getting real numbers

The bench logs every fault and every report to `bench/runs/<timestamp>.jsonl`.
Run it for 20-30 minutes and break things 15-20 times with random faults to get the catch rate, mean response time and reading error,
which can go straight onto the "expected results" slide.

## Live version for judges (5 minutes)

1. Everything is normal; PatrolEye does a round and the scoreboard is all green. Stations with no change just say "no model needed" (saves power).
2. Ask a judge to press "random fault" on the phone; not even we know what broke.
3. PatrolEye patrols, looks closer when unsure and reports; the scoreboard shows FOUND and the seconds.
4. The judge pulls the pressure slider to 6.5, closes the valve and presses leak, and watches it find each one.
5. Finally point at the scoreboard: everything received is text, a few KB, 0 images.

## Notes

- `vlm.py` currently uses a cloud model in place of the Hailo, so the photos used for judging still go to the cloud for now. The scoreboard's "text only" refers to
  the channel PatrolEye reports to the control room on, and that is true. Once the UGen300 arrives and a local model is swapped in, images will never leave the device.
- The round time is mostly the model: each judgement takes at least 6.5 s (simulating the Hailo). Both pressure gauges are read every round;
  other stations only call the model when the picture has changed. A round of six stations takes about 30-60 s.
- The red FAULT light blinks; it doesn't matter if PatrolEye catches it dark, because the green RUN light goes out at the same time and it is still judged abnormal.
