# PatrolEye

An AI camera that spots danger early.

A two-axis pan-tilt head, a Raspberry Pi 5 and an ASUS UGen300 M.2 (Hailo-10H). The camera patrols a room on its own, remembers what normal looks like, and only when something changes does it run a vision-language model on the device to judge it: a pressure past its limit, a slow leak, a stove left on, someone who has fallen.

## Layout

| Folder | Contents |
|---|---|
| `device/` | Code that runs on the camera (Pi): `live.py` (server, camera, pan-tilt), `patrol.py` (patrol), `ask.py` (one-sentence questions), `scan.py` / `panorama.py` (global scan and panorama), `vlm.py`, `voice.py`, `web/`, `viewer/`, `start.sh`. See `device/README.md` |
| `bench/` | Test bench: three screens play the pump room, a scoreboard and a remote. `python3 bench/server.py`; the walkthrough is in `docs/DEMO.md` |
| `hardware/` | Mechanical design and Fusion 360 scripts |
| `video/` | Competition video (Remotion). Footage, renders and old versions are not in git; see `video/README.md` |
| `docs/` | `DEMO.md`: the test bench demo; `v2/`: the new version (app, Supabase, QR pairing, privacy masks, event clips) |

## Running on the Pi

```bash
cd device
./start.sh            # start; also stop / restart / status / log
```

Runtime data (`device/scans`, `models`, `certs`, `logs`, `asks`, `patrol`) is not tracked in git. **On a Pi upgrading from the old layout (code in the repo root), back up first by following the steps in `device/README.md`, then `git pull`.**

## v2 (due before the final round)

The overall plan and the contract shared by the app, the backend and the camera: `docs/v2/ARCHITECTURE.md`.

| Branch | Contents | Todo |
|---|---|---|
| `feature/app-supabase` | Expo app and Supabase backend | `docs/v2/APP_BACKEND_TODO.md` |
| `feature/camera-v2` | Camera side: QR pairing, global scan and privacy masks, event clip upload | `docs/v2/CAMERA_TODO.md` |
