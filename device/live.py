"""網頁伺服器:居家版 /home、工廠巡檢版 /factory(使用者 App),開發工具 /dev(畫面、雲台、曝光、掃描)。

用法: ~/servo/bin/python live.py   然後在別台電腦開 https://[Pi 的 IPv6]:8000(自簽憑證,第一次要按繼續)
"""
import json
import math
import os
import subprocess
import threading
import time

import cv2
from pathlib import Path

from flask import Flask, Response, jsonify, redirect, request, send_from_directory

import voice
from ask import Asker
from modes import MODES, en
from panilt import PanTilt

DEV = "/dev/video0"
WIDTH, HEIGHT = 1280, 720
STREAM_W = 960            # 串流縮小傳,省頻寬和 CPU;「存一張」仍存原尺寸
STREAM_FPS = 8
# 掃描時亮度顏色不能飄,但 C270 手動曝光不可靠(自動時讀回的是舊值;寫入和現值相同的數字不會生效)。
# 實測可靠的做法:先開自動等它調好,再切成手動 → 相機會凍結在自動選好的曝光/增益/白平衡。
FREEZE_WAIT = 3.0

# ---- 全景掃描格點(度),tilt + = 往上 ------------------------------------
SCAN_PAN = list(range(-90, 106, 15))      # -90 ~ +105,14 格
SCAN_TILT = [-30, -15, 0, 15]             # 4 列 → 共 56 個位置
SETTLE = 0.8                              # 到位後等多久再拍(秒)

app = Flask(__name__)
lock = threading.Lock()
ptlock = threading.Lock()   # 序列埠一次只能一個請求用
latest = {"raw": None, "jpg": None, "t": 0}

try:
    pt = PanTilt(speed=300)
except Exception as e:      # 雲台沒接也能只看畫面
    print("雲台無法連線:", e)
    pt = None


def camera_loop():
    cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    threading.Thread(target=freeze_auto, daemon=True).start()   # 開機就自動調好再鎖定
    last = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            time.sleep(0.2)
            continue
        now = time.time()
        if now - last < 1 / STREAM_FPS:
            continue
        last = now
        small = cv2.resize(frame, (STREAM_W, STREAM_W * HEIGHT // WIDTH), interpolation=cv2.INTER_AREA)
        jpg = cv2.imencode(".jpg", small, [cv2.IMWRITE_JPEG_QUALITY, 75])[1].tobytes()
        with lock:
            latest.update(raw=frame, jpg=jpg, t=now)


def mjpeg():
    sent = 0
    while True:
        with lock:
            jpg, t = latest["jpg"], latest["t"]
        if jpg is None or t == sent:
            time.sleep(0.03)
            continue
        sent = t
        yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n"


# ---- 相機參數(用 v4l2-ctl,串流進行中也能改) ----------------------------
CTRLS = ["auto_exposure", "exposure_time_absolute", "gain", "white_balance_automatic",
         "white_balance_temperature", "brightness", "backlight_compensation",
         "exposure_dynamic_framerate"]


def get_ctrls():
    out = subprocess.run(["v4l2-ctl", "-d", DEV, "-C", ",".join(CTRLS)],
                         capture_output=True, text=True).stdout
    return {k.strip(): int(v.split()[0]) for k, v in (l.split(":", 1) for l in out.splitlines() if ":" in l)}


def set_ctrls(**kv):
    arg = ",".join(f"{k}={int(v)}" for k, v in kv.items())
    subprocess.run(["v4l2-ctl", "-d", DEV, "-c", arg], check=False)


frozen = {"on": False}


def freeze_auto():
    frozen["on"] = False
    set_ctrls(auto_exposure=3, white_balance_automatic=1)
    time.sleep(FREEZE_WAIT)
    set_ctrls(auto_exposure=1, white_balance_automatic=0)
    frozen["on"] = True


def set_manual(exposure, gain):
    """先寫一組不同的值再寫目標值,確保相機真的套用。"""
    set_ctrls(auto_exposure=1, exposure_dynamic_framerate=0,
              exposure_time_absolute=156 if exposure != 156 else 312, gain=1 if gain != 1 else 2)
    time.sleep(0.3)
    set_ctrls(exposure_time_absolute=exposure, gain=gain)
    frozen["on"] = False


# ---- 全景掃描 ---------------------------------------------------------------
scan = {"running": False, "stop": False, "i": 0, "n": 0, "dir": ""}


def save(path, data):
    """每拍一張就寫一次並 fsync,當機也不會整批遺失。"""
    with open(path, "wb") as fh:
        fh.write(data)
        fh.flush()
        os.fsync(fh.fileno())


def fresh_frame(after):
    """等一張在 after 之後才拍到的畫面(避免拿到移動中的舊畫面)。"""
    while True:
        with lock:
            if latest["t"] > after:
                return latest["raw"].copy()
        time.sleep(0.02)


def run_scan(label, shots):
    out = Path("scans") / f"{time.strftime('%Y%m%d_%H%M%S')}_{label}"
    out.mkdir(parents=True)
    grid = [(p, t) for r, t in enumerate(SCAN_TILT) for p in (SCAN_PAN if r % 2 == 0 else SCAN_PAN[::-1])]
    scan.update(running=True, stop=False, i=0, n=len(grid), dir=str(out))
    meta = {"label": label, "start": time.strftime("%Y-%m-%d %H:%M:%S"), "ctrls": get_ctrls(),
            "width": WIDTH, "height": HEIGHT, "tilt_up_positive": True, "frames": []}
    try:
        for k, (p, t) in enumerate(grid):
            if scan["stop"]:
                break
            with ptlock:
                pt.move(pan=p, tilt=t)
                time.sleep(SETTLE)
                real_p, real_t = pt.position()
            for j in range(shots):
                img = fresh_frame(time.time())
                name = f"{k:03d}_{j}.jpg"
                save(out / name, cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])[1].tobytes())
                meta["frames"].append({"file": name, "pos": k, "shot": j, "pan": real_p, "tilt": real_t,
                                       "pan_cmd": p, "tilt_cmd": t, "t": time.strftime("%H:%M:%S")})
            save(out / "scan.json", json.dumps(meta, indent=1, ensure_ascii=False).encode())
            scan["i"] = k + 1
        with ptlock:
            pt.move(0, 0)
    finally:
        scan["running"] = False


@app.route("/scan", methods=["POST"])
def start_scan():
    d = request.json
    if d.get("stop"):
        scan["stop"] = True
    elif pt and not scan["running"] and not (patroller and patroller.running):
        label = "".join(c for c in d.get("label", "scan") if c.isalnum() or c in "-_") or "scan"
        threading.Thread(target=run_scan, args=(label, int(d.get("shots", 1))), daemon=True).start()
        time.sleep(0.2)
    return state()


# ---- 一句話查詢 ---------------------------------------------------------------
asker = Asker(pt, ptlock, fresh_frame, SETTLE) if pt else None

# ---- 巡檢模式(比賽 demo,見 patrol.py / DEMO.md):網頁 /patrol ----------------------------
from patrol import Patroller, register as register_patrol
patroller = Patroller(pt, ptlock, fresh_frame, SETTLE,
                      busy=lambda: scan["running"] or bool(asker and asker.status["running"])) if pt else None
register_patrol(app, patroller)


@app.route("/ask", methods=["POST"])
def ask_start():
    if not asker or scan["running"] or (patroller and patroller.running):
        return jsonify(error="The camera mount is offline, or a scan or patrol is running."), 503
    d = request.json
    q = d.get("q", "").strip()
    if not q or not asker.start(q, d.get("mode", "home"), d.get("via", "text")):
        return jsonify(error="Still working on the previous question."), 409
    return jsonify(asker.status)


@app.route("/ask/status")
def ask_status():
    return jsonify(asker.status if asker else {})


@app.route("/asks/<path:name>")
def ask_file(name):
    return send_from_directory("asks", name)


@app.route("/dev")
def dev():
    return PAGE


# ---- 使用者 App(居家 / 工廠) ------------------------------------------------
WEB = Path(__file__).parent / "web"
F_PX = 1410
HALF_FOV = (round(math.degrees(math.atan(WIDTH / 2 / F_PX)), 1), round(math.degrees(math.atan(HEIGHT / 2 / F_PX)), 1))


@app.route("/")
def root():
    return redirect("/home")


@app.route("/home")
@app.route("/factory")
def app_page():
    return send_from_directory(WEB, request.path.strip("/") + ".html")


@app.route("/web/<path:name>")
def web_file(name):
    return send_from_directory(WEB, name)


def map_dir():
    """最新一個同時有全景圖和空間記憶的掃描。"""
    dirs = [p.parent for p in sorted(Path("scans").glob("*/memory.json")) if (p.parent / "pano.json").exists()]
    return dirs[-1] if dirs else None


@app.route("/api/map")
def api_map():
    mode = MODES.get(request.args.get("mode"), MODES["home"])
    d = map_dir()
    out = {"mode": mode, "half_fov": HALF_FOV, "pano": None, "items": [], "missing": []}
    if not d:
        return jsonify(out)
    info = json.loads((d / "pano.json").read_text())
    mem = json.loads((d / "memory.json").read_text())
    for name in mode["watch"]:
        hits = [m for m in mem if m["name"] == name]
        if not hits:
            if en(name) not in out["missing"]:
                out["missing"].append(en(name))
            continue
        m = max(hits, key=lambda m: (m["seen"], -m["off_center"]))
        out["items"].append({**{k: m[k] for k in ("name", "pan", "tilt", "state", "seen")}, "label": en(name)})
    out["pano"] = {"url": f"/scanfile/{d.name}/pano.jpg", **info, "scan": d.name}
    return jsonify(out)


@app.route("/scanfile/<scan_name>/<path:name>")
def scan_file(scan_name, name):
    return send_from_directory(Path("scans") / scan_name, name)


@app.route("/api/log")
def api_log():
    """每個物品最後一次確認的結果 + 最近幾題。"""
    mode = request.args.get("mode", "home")
    recs = []
    if (Path("asks") / "log.jsonl").exists():
        for line in (Path("asks") / "log.jsonl").read_text().splitlines():
            try:
                r = json.loads(line)
            except ValueError:
                continue
            if r.get("mode") == mode:
                r["label"] = en(r["target"]) if r.get("target") else None
                recs.append(r)
    last = {}
    for r in recs:
        if r.get("target"):
            last[r["target"]] = r
    return jsonify({"last": last, "recent": recs[-8:][::-1]})


@app.route("/api/voice", methods=["POST"])
def api_voice():
    mode = MODES.get(request.args.get("mode"), MODES["home"])
    try:
        text, sec = voice.transcribe(request.get_data(), hint=" ".join(mode["quick"]))
    except Exception as e:
        return jsonify(error=str(e)), 503
    return jsonify(text=text, sec=round(sec, 1))


@app.route("/stream")
def stream():
    return Response(mjpeg(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/snap")
def snap():
    """原尺寸存一張下載,方便在遠端電腦仔細看。"""
    with lock:
        frame = latest["raw"]
    jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])[1].tobytes()
    name = time.strftime("snap_%H%M%S.jpg")
    return Response(jpg, mimetype="image/jpeg",
                    headers={"Content-Disposition": f"attachment; filename={name}"})


@app.route("/crop")
def crop():
    """數位放大:從原尺寸畫面裁一塊再放大顯示。C270 沒有光學變焦,超過原始像素的放大只是插值。"""
    cx, cy, z = float(request.args["x"]), float(request.args["y"]), float(request.args["z"])
    with lock:
        frame = latest["raw"]
    h, w = frame.shape[:2]
    cw, ch = int(w / z), int(h / z)
    x0 = int(min(max(cx * w - cw / 2, 0), w - cw))
    y0 = int(min(max(cy * h - ch / 2, 0), h - ch))
    roi = cv2.resize(frame[y0:y0 + ch, x0:x0 + cw], (w, h), interpolation=cv2.INTER_CUBIC)
    return Response(cv2.imencode(".jpg", roi, [cv2.IMWRITE_JPEG_QUALITY, 90])[1].tobytes(),
                    mimetype="image/jpeg", headers={"Cache-Control": "no-store"})


@app.route("/state")
def state():
    s = {"ctrls": get_ctrls(), "frozen": frozen["on"], "scan": scan, "pt": None, "voice_ready": voice.ready(),
         "asking": bool(asker and asker.status["running"])}
    if pt and not scan["running"]:
        with ptlock:
            p, t = pt.position()
        s["pt"] = {"pan": p, "tilt": t, "pan_range": pt.pan.range_deg(), "tilt_range": pt.tilt.range_deg()}
    return jsonify(s)


@app.route("/move", methods=["POST"])
def move():
    if not pt or scan["running"]:
        return jsonify(error="The camera mount is offline or a scan is running."), 503
    d = request.json
    with ptlock:
        p, t = pt.position()
        if "dpan" in d or "dtilt" in d:
            p, t = p + d.get("dpan", 0), t + d.get("dtilt", 0)
        else:
            p, t = d.get("pan", p), d.get("tilt", t)
        pt.move(pan=p, tilt=t)
    return state()


@app.route("/release", methods=["POST"])
def release():
    if pt:
        with ptlock:
            pt.release()
    return jsonify(ok=True)


@app.route("/ctrl", methods=["POST"])
def ctrl():
    d = request.json
    if d["mode"] == "freeze":
        freeze_auto()
    elif d["mode"] == "auto":
        frozen["on"] = False
        set_ctrls(auto_exposure=3, white_balance_automatic=1)
    else:
        set_manual(int(d["exposure"]), int(d["gain"]))
    time.sleep(0.1)
    return state()


PAGE = """<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>雲台即時畫面</title>
<style>
:root{--bg:#111;--fg:#eee;--mut:#999;--card:#1c1c1c;--acc:#4da3ff}
body{margin:0;background:var(--bg);color:var(--fg);font:14px system-ui,sans-serif}
main{display:grid;grid-template-columns:1fr 320px;gap:12px;padding:12px}
@media(max-width:900px){main{grid-template-columns:1fr}}
.view{position:relative}.view img{width:100%;display:block;background:#000}
.cross{position:absolute;inset:0;pointer-events:none;display:none}
.cross:before,.cross:after{content:"";position:absolute;background:#0f08}
.cross:before{left:50%;top:0;bottom:0;width:1px}.cross:after{top:50%;left:0;right:0;height:1px}
.card{background:var(--card);border-radius:8px;padding:12px;margin-bottom:12px}
h3{margin:0 0 8px;font-size:14px;color:var(--mut);font-weight:600}
button{background:#2a2a2a;color:var(--fg);border:1px solid #444;border-radius:6px;padding:8px 10px;cursor:pointer;font:inherit}
button:hover{border-color:var(--acc)}
.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.pos{font:20px ui-monospace,monospace;margin:6px 0}
label{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0}
input[type=range]{flex:1}input[type=number]{width:70px;background:#222;color:var(--fg);border:1px solid #444;border-radius:4px;padding:4px}
.mut{color:var(--mut);font-size:12px;line-height:1.5}
.row{display:flex;gap:6px;flex-wrap:wrap}
</style></head><body><main>
<div><div class="view"><img src="/stream" id="live" onclick="zoomAt(event)" style="cursor:crosshair"><div class="cross" id="cross"></div></div>
<div class="row" style="margin-top:8px"><button onclick="cross.style.display=cross.style.display=='block'?'none':'block'">十字線</button>
<a href="/snap"><button>存一張原尺寸</button></a>
<span class="mut" style="align-self:center">點畫面任一處 → 下方放大</span>
<select id="zoom" onchange="zoomUpd()"><option value="0">放大關</option><option value="2" selected>2×</option><option value="3">3×</option><option value="4">4×</option></select></div>
<img id="zimg" style="width:100%;display:none;margin-top:8px;background:#000">
<div class="card" style="margin-top:12px"><h3>問一句話</h3>
<div class="row"><input id="q" placeholder="例如:時鐘在哪裡?現在幾點?" style="flex:1;min-width:200px;background:#222;color:var(--fg);border:1px solid #444;border-radius:6px;padding:8px;font:inherit" onkeydown="if(event.key=='Enter')ask()">
<button onclick="ask()">問</button></div>
<div id="asklog" class="mut" style="margin-top:8px"></div>
<div id="askans" style="font-size:18px;margin-top:8px;line-height:1.5"></div>
<div class="row" id="askimg" style="margin-top:8px"></div></div></div>
<div>
<div class="card"><h3>雲台</h3>
<div class="pos" id="pos">—</div><div class="mut" id="rng"></div>
<label>步距 <select id="step"><option>1</option><option>5</option><option selected>15</option><option>30</option></select></label>
<div class="pad">
<span></span><button onclick="mv(0,1)">tilt +</button><span></span>
<button onclick="mv(-1,0)">pan −</button><button onclick="go(0,0)">歸零</button><button onclick="mv(1,0)">pan +</button>
<span></span><button onclick="mv(0,-1)">tilt −</button><span></span></div>
<div class="row" style="margin-top:8px">pan <input type="number" id="ap" value="0"> tilt <input type="number" id="at" value="0">
<button onclick="go(+ap.value,+at.value)">前往</button></div>
<p class="mut">pan + = 往右轉,tilt + = 往上看。</p>
<button onclick="post('/release',{})">放鬆馬達</button></div>
<div class="card"><h3>全景掃描</h3>
<label>名稱 <input id="slabel" value="normal" style="width:140px;background:#222;color:var(--fg);border:1px solid #444;border-radius:4px;padding:4px"></label>
<label>每格拍幾張 <select id="shots"><option>1</option><option selected>2</option><option>3</option></select></label>
<div class="row"><button onclick="post('/scan',{label:slabel.value,shots:shots.value})">開始掃描</button><button onclick="post('/scan',{stop:1})">停止</button></div>
<div class="mut" id="sstat"></div></div>
<div class="card"><h3>曝光 / 白平衡</h3>
<div class="row"><button onclick="setc({mode:'freeze'})">自動調好後鎖定</button><button onclick="setc({mode:'auto'})">恢復自動</button></div>
<label>目前狀態 <span id="ae"></span></label>
<p class="mut">用「自動調好後鎖定」:先讓自動調 3 秒,再把那組亮度和顏色固定住。按的時候,鏡頭要對著亮度普通的地方,不要對著窗戶或燈。程式啟動時也會自動鎖一次。</p>
<p class="mut">手動微調(會取代鎖定的值;C270 曝光只有這幾檔正常,625 + 增益 64 跟自動差不多亮):</p>
<label>曝光 <select id="exp"><option>156</option><option>312</option><option selected>625</option><option>1250</option></select></label>
<label>增益 <input type="range" min="0" max="255" value="64" id="gain" oninput="gainv.textContent=this.value"><span id="gainv">64</span></label>
<button onclick="setc({mode:'manual',exposure:exp.value,gain:gain.value})">套用手動</button></div>
</div></main>
<script>
const $=id=>document.getElementById(id);
async function post(u,b){const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});if(r.ok&&u!='/release')show(await r.json())}
function mv(dp,dt){const s=+$('step').value;post('/move',{dpan:dp*s,dtilt:dt*s})}
function go(p,t){post('/move',{pan:p,tilt:t})}
function setc(o){post('/ctrl',o)}
function show(s){
 const sc=s.scan;$('sstat').textContent=sc.running?`掃描中 ${sc.i}/${sc.n} → ${sc.dir}`:sc.dir?`上次:${sc.dir}(${sc.i}/${sc.n})`:'';
 if(sc.running){clearTimeout(window.st);window.st=setTimeout(()=>fetch('/state').then(r=>r.json()).then(show),1000)}
 if(s.pt){$('pos').textContent=`pan ${s.pt.pan.toFixed(1)}°  tilt ${s.pt.tilt.toFixed(1)}°`;
  $('rng').textContent=`範圍 pan ${s.pt.pan_range.map(Math.round).join('~')}°, tilt ${s.pt.tilt_range.map(Math.round).join('~')}°`}
 else $('pos').textContent='雲台未連線';
 const c=s.ctrls;$('ae').textContent=c.auto_exposure!=1?'自動(會飄,掃描前要鎖)':s.frozen?'已鎖定(沿用自動的亮度)':`手動 曝光 ${c.exposure_time_absolute} 增益 ${c.gain}`}
let zx=.5,zy=.5,ztimer=null;
function zoomAt(e){const r=e.target.getBoundingClientRect();zx=(e.clientX-r.left)/r.width;zy=(e.clientY-r.top)/r.height;zoomUpd()}
function zoomUpd(){const z=+$('zoom').value,im=$('zimg');clearInterval(ztimer);
 if(!z){im.style.display='none';return}im.style.display='block';
 const f=()=>{im.src=`/crop?x=${zx}&y=${zy}&z=${z}&t=${Date.now()}`};f();ztimer=setInterval(f,700)}
async function ask(){const q=$('q').value.trim();if(!q)return;
 const r=await fetch('/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q})});
 if(!r.ok){$('asklog').textContent=(await r.json()).error;return}
 $('askans').textContent='';$('askimg').innerHTML='';pollAsk()}
async function pollAsk(){const s=await (await fetch('/ask/status')).json();
 $('asklog').innerHTML=`<b style="color:var(--fg)">問:${s.q}</b><br>`+s.steps.map(x=>`${x.t}  ${x.text}`).join('<br>');
 if(s.running){fetch('/state').then(r=>r.json()).then(show);setTimeout(pollAsk,700);return}
 const a=s.result;if(!a)return;
 $('askans').innerHTML=`${a.answer}<span class="mut">  (${a.found?'有看到'+(a.target||''):'沒看到目標'},信心 ${a.confidence||'—'})</span>`;
 if(a.crop)$('askimg').innerHTML=`<a href="/asks/${a.crop}" target="_blank"><img src="/asks/${a.crop}" style="height:180px;border-radius:6px"></a><a href="/asks/${a.full}" target="_blank"><img src="/asks/${a.full}" style="height:180px;border-radius:6px"></a>`;
 fetch('/state').then(r=>r.json()).then(show)}
fetch('/state').then(r=>r.json()).then(show);
</script></body></html>"""


if __name__ == "__main__":
    threading.Thread(target=camera_loop, daemon=True).start()
    voice.preload()
    # 自簽憑證:瀏覽器只有在 https 下才給開麥克風(語音問答要用)。
    # Flask 內建的 app.run(ssl_context=...) 在主執行緒做 TLS 握手:瀏覽器停在憑證警告頁時,
    # 那條連線握手卡住,整個伺服器就不再接新連線。改成握手延到各自的處理執行緒才做。
    import ssl
    from werkzeug.serving import make_server
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain("certs/cert.pem", "certs/key.pem")
    srv = make_server("::", 8000, app, threaded=True)
    srv.socket = ctx.wrap_socket(srv.socket, server_side=True, do_handshake_on_connect=False)
    srv.ssl_context = ctx
    print("serving https on port 8000: /home /factory /dev", flush=True)
    srv.serve_forever()
