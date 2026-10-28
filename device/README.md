# device: code for the camera (Raspberry Pi 5)

## Files

| File | What it does |
|---|---|
| `live.py` | Flask server (`/home`, `/factory`, `/dev`, `/patrol`), camera loop, pan-tilt control, scanning, questions |
| `patrol.py` | Patrol: teach checkpoints, remember normal, detect changes, hand them to the model, look closer when unsure, send a report |
| `ask.py` | One-sentence questions (turn to find the target, judge, answer) |
| `scan.py` | Walk a pan/tilt grid taking photos, saved to `scans/<timestamp>/` |
| `panorama.py` | Stitch a scan into an equirectangular panorama `pano.jpg` and its angle range `pano.json` |
| `build_memory.py`, `build.py`, `detect3d.py`, `merge.py` | Scan post-processing: object positions, depth, merging several scans |
| `vlm.py`, `voice.py`, `modes.py` | Vision-language model, speech to text, home / factory mode settings |
| `panilt.py` | Feetech STS3215 two-axis pan-tilt |
| `export_depth_onnx.py` | Export the depth model to `models/` |
| `test_servo.py`, `test_range.py`, `find_limit.py`, `query_test.py` | Test tools |
| `web/` | Pages for `/home`, `/factory`, `/patrol` |
| `viewer/` | 3D viewer for scan results (static page) |
| `start.sh` | Start / stop the server |

All code assumes the working directory is `device/` (`start.sh` `cd`s there itself). When running a tool by hand, `cd device` first, e.g. `python scan.py`.

## Runtime data (not in git)

| Path | Contents | How to create it if missing |
|---|---|---|
| `scans/` | Scan images, `pano.jpg`, `pano.json`, `memory.json` | `python scan.py`, then `python panorama.py scans/<folder>` and `python build_memory.py ...` |
| `models/` | `depth_metric_indoor.onnx`, `yolov8s-seg.onnx`, `yolov8s-seg.pt` | `python export_depth_onnx.py`; download yolov8s-seg from Ultralytics and export it to ONNX |
| `certs/` | Self-signed HTTPS certificate | `mkdir -p certs && openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=patroleye"` |
| `logs/`, `asks/`, `patrol/` | Logs, question results, patrol settings and photos | Created automatically at run time |
| `config/`, `outbox/` | v2: device account, masks, events and clips waiting to upload | See `docs/v2/CAMERA_TODO.md` |

`certs/key.pem` was committed in the past; regenerate it on the Pi.

## Upgrading from the old layout (once, on the Pi)

The old code lived in the repo root; this version moves it to `device/` and runtime data is no longer tracked. A plain `git pull` would delete the previously tracked `scans/`, `models/`, `certs/`, `logs/` and `asks/` in the root, so back them up first:

```bash
cd ~/PatrolEye                     # wherever the repo is on the Pi
git status                         # make sure there are no uncommitted changes
./start.sh stop
mkdir -p ~/patroleye_backup
for d in scans models certs logs asks patrol; do [ -e "$d" ] && cp -a "$d" ~/patroleye_backup/; done
git pull                           # if it says untracked files would be overwritten, move them aside and pull again
cp -a ~/patroleye_backup/. device/
rm -rf patrol                      # the old untracked folder has already been copied into device/
cd device && ./start.sh
```
