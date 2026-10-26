"""巡檢模式(比賽 demo):依序轉到每個檢查點 → 跟「正常的樣子」比對 → 有變化(或是儀表)才請視覺模型判讀
→ 看不清楚就再靠近看一次 → 只把一小段文字報告送出去(中控室計分板 bench/server.py)。

live.py 裡這樣接(已經加好了):
    from patrol import Patroller, register as register_patrol
    patroller = Patroller(pt, ptlock, fresh_frame, SETTLE, busy=...) if pt else None
    register_patrol(app, patroller)

網頁:https://<Pi>:8000/patrol   教檢查點、記住正常的樣子、開始 / 停止巡檢。
資料:patrol/checkpoints.json(檢查點)、patrol/baseline/(正常的樣子)、patrol/shots/(每次看到的)、patrol/log.jsonl
"""
import json
import math
import threading
import time
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from flask import jsonify, request, send_from_directory

import vlm

DIR = Path("patrol")
CP_FILE = DIR / "checkpoints.json"
CFG_FILE = DIR / "config.json"
LOG_FILE = DIR / "log.jsonl"
BASE = DIR / "baseline"
SHOTS = DIR / "shots"
WEB = Path(__file__).parent / "web"

F_PX = 1410            # C270 焦距(1280 寬)
ZOOM = 3               # 預設裁中間 1/3 給模型看(跟 ask.py 一樣)
CLOSER = 1.6           # 看不清楚時,再放大這麼多倍重看一次
DIFF_LEVEL = 35        # 任一色版差超過這個才算「這個像素變了」
CHANGE_PIX = 0.01      # 變了的像素超過 1% 才算「跟正常不一樣」,才需要叫模型(寧可多問,不要漏看)
ROUND_PAUSE = 2.0      # 每一輪之間休息幾秒
KINDS = ["gauge", "valve", "breaker", "light", "leak", "general"]

CONF = {"type": "string", "enum": ["high", "medium", "low"]}
NOTE = {"type": "string", "description": "One short English sentence about what you see"}


def schema(props):
    props = {**props, "confidence": CONF, "note": NOTE}
    return {"type": "object", "properties": props, "required": list(props)}


# 每種檢查點:問模型什麼、要它回什麼格式
ASK = {
    "gauge": (lambda cp: f"This is a zoomed-in view of pressure gauge {cp['tag']} (it may be shown on a screen). "
                         f"Read where the needle points on the scale and give the value to one decimal place. "
                         f"If the needle or the numbers are not clear enough to read, set readable to false and "
                         f"confidence to low.",
              schema({"readable": {"type": "boolean"}, "value": {"type": "number"}, "unit": {"type": "string"}})),
    "valve": (lambda cp: f"This is a zoomed-in view of quarter-turn valve {cp['tag']} (it may be shown on a screen). "
                         f"A lever lying along the pipe means open; a lever across the pipe means closed. Some valves "
                         f"also have an OPEN / SHUT indicator. Is the valve open or closed?",
              schema({"position": {"type": "string", "enum": ["open", "closed", "unclear"]}})),
    "breaker": (lambda cp: f"This is a zoomed-in view of breaker panel {cp['tag']} (it may be shown on a screen). "
                           f"Are all the breakers ON? List any breaker that is tripped or off, by its label.",
                schema({"all_on": {"type": "boolean"}, "tripped": {"type": "array", "items": {"type": "string"}}})),
    "light": (lambda cp: f"This is a zoomed-in view of the status lamps for {cp['tag']} (it may be shown on a screen). "
                         f"Which lamps are lit? Is the green RUN lamp lit, and is the red FAULT lamp lit?",
              schema({"run_lit": {"type": "boolean"}, "fault_lit": {"type": "boolean"}})),
    "leak": (lambda cp: f"This is a zoomed-in view of the floor around {cp['tag'].replace('FLOOR-', 'pump P-')} "
                        f"(it may be shown on a screen). Is there water or another liquid on the floor, such as a "
                        f"puddle or drips?",
             schema({"liquid": {"type": "boolean"}, "size": {"type": "string", "enum": ["none", "small", "large"]}})),
    "general": (lambda cp: f"This is a zoomed-in view of {cp['tag']} in a plant room (it may be shown on a screen). "
                           f"Does anything look abnormal or unsafe?",
                schema({"abnormal": {"type": "boolean"}})),
}


def judge(cp, a):
    """模型的回答 → (狀態 normal/abnormal/unclear, 讀數, 單位, 一句英文報告)。規則在這裡,不交給模型決定。"""
    tag, k = cp["tag"], cp["kind"]
    if k == "gauge":
        if not a.get("readable"):
            return "unclear", None, None, f"{tag}: can't read the needle clearly."
        v, unit, lim = round(float(a["value"]), 1), a.get("unit") or "bar", cp.get("limit")
        if lim is not None and v > lim:
            return "abnormal", v, unit, f"{tag} reads {v} {unit}, above the {lim} {unit} limit."
        return "normal", v, unit, f"{tag} reads {v} {unit}" + (f", within the {lim} {unit} limit." if lim is not None else ".")
    if k == "valve":
        pos, want = a.get("position"), cp.get("expect", "open")
        if pos == "unclear":
            return "unclear", None, None, f"{tag}: can't tell if the valve is open or closed."
        if pos != want:
            return "abnormal", None, None, f"{tag} is {pos}; it should be {want}."
        return "normal", None, None, f"{tag} is {pos}, as expected."
    if k == "breaker":
        if not a.get("all_on"):
            which = ", ".join(a.get("tripped") or []) or "a breaker"
            return "abnormal", None, None, f"{tag}: {which} tripped or off."
        return "normal", None, None, f"{tag}: all breakers on."
    if k == "light":
        if a.get("fault_lit") or not a.get("run_lit"):
            return "abnormal", None, None, f"{tag}: " + ("fault lamp on" if a.get("fault_lit") else "run lamp off") + "."
        return "normal", None, None, f"{tag}: running, no fault lamp."
    if k == "leak":
        if a.get("liquid"):
            return "abnormal", None, None, f"Liquid on the floor at {tag} ({a.get('size', 'some')} puddle)."
        return "normal", None, None, f"{tag}: floor is dry."
    if a.get("abnormal"):
        return "abnormal", None, None, f"{tag}: {a.get('note', 'looks abnormal')}"
    return "normal", None, None, f"{tag}: looks normal."


def center_crop(img, zoom):
    h, w = img.shape[:2]
    cw, ch = int(w / zoom), int(h / zoom)
    x0, y0 = (w - cw) // 2, (h - ch) // 2
    return img[y0:y0 + ch, x0:x0 + cw].copy()


def change_score(now, base):
    """跟正常的樣子比:先對齊(雲台回到同一角度仍可能差幾個像素),再看有多少比例的像素明顯不同。
    用彩色比(三個色版取最大差):紅燈和綠燈、黃把手和灰牆在灰階裡亮度差不多,只看灰階會漏掉。"""
    b = cv2.resize(base, (now.shape[1], now.shape[0]))
    a_s, b_s = cv2.GaussianBlur(now, (0, 0), 2.5), cv2.GaussianBlur(b, (0, 0), 2.5)
    ga, gb = cv2.cvtColor(a_s, cv2.COLOR_BGR2GRAY), cv2.cvtColor(b_s, cv2.COLOR_BGR2GRAY)
    (dx, dy), _ = cv2.phaseCorrelate(np.float32(gb), np.float32(ga))
    if abs(dx) < 40 and abs(dy) < 40:
        b_s = cv2.warpAffine(b_s, np.float32([[1, 0, dx], [0, 1, dy]]), (a_s.shape[1], a_s.shape[0]),
                             borderMode=cv2.BORDER_REPLICATE)
    m = 12                                                     # 邊緣對齊後會有空白,不算
    d = cv2.absdiff(a_s, b_s).max(axis=2)[m:-m, m:-m]
    return float((d > DIFF_LEVEL).mean())


def load_json(p, default):
    try:
        return json.loads(p.read_text())
    except (OSError, ValueError):
        return default


class Patroller:
    def __init__(self, pt, ptlock, fresh_frame, settle, busy=lambda: False):
        self.pt, self.ptlock, self.fresh_frame, self.settle, self.busy = pt, ptlock, fresh_frame, settle, busy
        for d in (DIR, BASE, SHOTS):
            d.mkdir(parents=True, exist_ok=True)
        self.running = False
        self.stop_flag = False
        self.learning = False
        self.status = {"running": False, "round": 0, "current": None, "step": "", "last": {}, "sent": 0,
                       "sent_bytes": 0, "send_error": None, "error": None}

    # ---- 設定 ----
    def cps(self):
        return load_json(CP_FILE, [])

    def save_cps(self, cps):
        CP_FILE.write_text(json.dumps(cps, indent=1, ensure_ascii=False))

    def cfg(self):
        return load_json(CFG_FILE, {"report_url": ""})

    # ---- 動作 ----
    def shoot(self, pan, tilt):
        with self.ptlock:
            self.pt.move(pan=pan, tilt=tilt)
            time.sleep(self.settle)
            real = self.pt.position()
        return self.fresh_frame(time.time()), real

    def here(self):
        with self.ptlock:
            return self.pt.position()

    def teach(self, d):
        """把雲台現在的角度存成一個檢查點,同時把現在看到的當成「正常的樣子」。"""
        tag = "".join(c for c in str(d.get("tag", "")).strip().upper() if c.isalnum() or c in "-_")[:24]
        if not tag:
            raise ValueError("Give the checkpoint a tag, e.g. PT-102.")
        kind = d.get("kind") if d.get("kind") in KINDS else "general"
        pan, tilt = self.here()
        cp = {"tag": tag, "kind": kind, "pan": round(pan, 1), "tilt": round(tilt, 1),
              "zoom": float(d.get("zoom") or ZOOM)}
        if kind == "gauge" and d.get("limit") not in (None, ""):
            cp["limit"] = float(d["limit"])
        if kind == "valve":
            cp["expect"] = d.get("expect") if d.get("expect") in ("open", "closed") else "open"
        img = self.fresh_frame(time.time())
        cv2.imwrite(str(BASE / f"{tag}.jpg"), center_crop(img, cp["zoom"]), [cv2.IMWRITE_JPEG_QUALITY, 92])
        cps = [c for c in self.cps() if c["tag"] != tag] + [cp]
        self.save_cps(cps)
        return cp

    def learn(self):
        """每個檢查點重拍一次「正常的樣子」(先確認螢幕上一切正常再按)。"""
        if self.running or self.learning:
            return False
        self.learning = True

        def run():
            try:
                for cp in self.cps():
                    self.status["step"] = f"Learning normal: {cp['tag']}"
                    img, _ = self.shoot(cp["pan"], cp["tilt"])
                    cv2.imwrite(str(BASE / f"{cp['tag']}.jpg"), center_crop(img, cp.get("zoom", ZOOM)),
                                [cv2.IMWRITE_JPEG_QUALITY, 92])
                self.status["step"] = "Normal views saved."
            except Exception as e:
                self.status["error"] = f"Learning failed: {e}"
            finally:
                self.learning = False
        threading.Thread(target=run, daemon=True).start()
        return True

    def start(self):
        if self.running or self.learning or self.busy():
            return False
        if not self.cps():
            self.status["error"] = "No checkpoints yet. Teach at least one first."
            return False
        self.running, self.stop_flag = True, False
        self.status.update(running=True, error=None, round=0)
        threading.Thread(target=self.loop, daemon=True).start()
        return True

    def stop(self):
        self.stop_flag = True

    # ---- 送出文字報告(唯一的出口) ----
    def send(self, rec):
        url = self.cfg().get("report_url", "").strip()
        if not url:
            return
        body = json.dumps(rec).encode()

        def go():
            try:
                req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
                urllib.request.urlopen(req, timeout=3).read()
                self.status["sent"] += 1
                self.status["sent_bytes"] += len(body)
                self.status["send_error"] = None
            except Exception as e:
                self.status["send_error"] = f"{type(e).__name__}: {e}"
        threading.Thread(target=go, daemon=True).start()

    # ---- 巡檢 ----
    def hailo_wait(self, t0):
        """模擬 Hailo-10H:每次判讀至少 HAILO_SEC 秒(跟 ask.py 一樣)。"""
        cloud = time.time() - t0
        if cloud < vlm.HAILO_SEC:
            time.sleep(vlm.HAILO_SEC - cloud)
        return cloud

    def read(self, cp, crop):
        prompt, sch = ASK[cp["kind"]]
        t0 = time.time()
        try:
            ans, _ = vlm.ask(crop, prompt(cp), sch)
        except Exception as e:
            ans = {"confidence": "low", "note": f"model error: {e}", "readable": False, "position": "unclear"}
        self.hailo_wait(t0)
        return ans

    def loop(self):
        try:
            while not self.stop_flag:
                cps = self.cps()
                self.status["round"] += 1
                for cp in cps:
                    if self.stop_flag:
                        break
                    self.visit(cp)
                end = time.time() + ROUND_PAUSE
                while time.time() < end and not self.stop_flag:
                    time.sleep(0.1)
        except Exception as e:
            self.status["error"] = f"Patrol stopped: {e}"
        finally:
            self.running = False
            self.status.update(running=False, current=None, step="Stopped.")

    def visit(self, cp):
        tag, zoom = cp["tag"], cp.get("zoom", ZOOM)
        self.status.update(current=tag, step=f"Turning to {tag}…")
        self.send({"tag": tag, "status": "looking"})
        t_start = time.time()
        img, real = self.shoot(cp["pan"], cp["tilt"])
        crop = center_crop(img, zoom)
        base_path = BASE / f"{tag}.jpg"
        base = cv2.imread(str(base_path)) if base_path.exists() else None
        score = change_score(crop, base) if base is not None else None
        was_bad = self.status["last"].get(tag, {}).get("status") == "abnormal"
        need_model = cp["kind"] == "gauge" or score is None or score > CHANGE_PIX or was_bad
        stamp = time.strftime("%H%M%S")
        cv2.imwrite(str(SHOTS / f"{tag}_{stamp}.jpg"), crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
        res = {"tag": tag, "kind": cp["kind"], "t": time.strftime("%H:%M:%S"), "pan": real[0], "tilt": real[1],
               "change": None if score is None else round(score * 100, 1), "model": need_model,
               "looked_closer": False, "shot": f"{tag}_{stamp}.jpg"}
        if not need_model:
            res.update(status="normal", reading=None, unit=None, confidence="high",
                       text=f"{tag}: same as normal ({score * 100:.1f}% changed), no model needed.")
        else:
            why = "gauge" if cp["kind"] == "gauge" else (f"{score * 100:.1f}% changed" if score is not None else "no normal view saved")
            self.status["step"] = f"{tag}: {why}, asking the model…"
            ans = self.read(cp, crop)
            status, reading, unit, text = judge(cp, ans)
            if status == "unclear" or ans.get("confidence") == "low":
                # 主動視覺:看不清楚就再靠近看一次(重拍一張,裁更小再放大)
                self.status["step"] = f"{tag}: not sure, looking closer…"
                img2 = self.fresh_frame(time.time())
                crop2 = center_crop(img2, zoom * CLOSER)
                cv2.imwrite(str(SHOTS / f"{tag}_{stamp}_closer.jpg"), crop2, [cv2.IMWRITE_JPEG_QUALITY, 85])
                ans = self.read(cp, crop2)
                status, reading, unit, text = judge(cp, ans)
                res.update(looked_closer=True, shot=f"{tag}_{stamp}_closer.jpg")
            res.update(status=status, reading=reading, unit=unit, confidence=ans.get("confidence"),
                       text=text, note=ans.get("note"))
        res["sec"] = round(time.time() - t_start, 1)
        self.status["last"][tag] = res
        self.status["step"] = res["text"]
        with open(LOG_FILE, "a") as fh:
            fh.write(json.dumps(res, ensure_ascii=False) + "\n")
        # 只送文字:標籤、狀態、讀數、一句話。照片留在 Pi 上。
        self.send({k: res.get(k) for k in ("tag", "status", "reading", "unit", "text", "confidence", "looked_closer")})


def register(app, patroller):
    """把 /patrol 相關的網址掛到 live.py 的 Flask app 上。"""
    def need():
        return None if patroller else (jsonify(error="The camera mount is offline."), 503)

    @app.route("/patrol")
    def patrol_page():
        return send_from_directory(WEB, "patrol.html")

    @app.route("/patrol/status")
    def patrol_status():
        if not patroller:
            return jsonify(error="offline"), 503
        return jsonify({**patroller.status, "running": patroller.running, "learning": patroller.learning,
                        "checkpoints": patroller.cps(), "config": patroller.cfg(), "f_px": F_PX})

    @app.route("/patrol/teach", methods=["POST"])
    def patrol_teach():
        if need():
            return need()
        if patroller.running:
            return jsonify(error="Stop the patrol before teaching."), 409
        try:
            return jsonify(patroller.teach(request.json or {}))
        except ValueError as e:
            return jsonify(error=str(e)), 400

    @app.route("/patrol/delete", methods=["POST"])
    def patrol_delete():
        if need():
            return need()
        tag = (request.json or {}).get("tag")
        patroller.save_cps([c for c in patroller.cps() if c["tag"] != tag])
        return jsonify(ok=True)

    @app.route("/patrol/goto", methods=["POST"])
    def patrol_goto():
        if need():
            return need()
        if patroller.running:
            return jsonify(error="Stop the patrol first."), 409
        cp = next((c for c in patroller.cps() if c["tag"] == (request.json or {}).get("tag")), None)
        if not cp:
            return jsonify(error="No such checkpoint."), 404
        with patroller.ptlock:
            patroller.pt.move(pan=cp["pan"], tilt=cp["tilt"])
        return jsonify(ok=True)

    @app.route("/patrol/learn", methods=["POST"])
    def patrol_learn():
        if need():
            return need()
        return jsonify(ok=patroller.learn())

    @app.route("/patrol/start", methods=["POST"])
    def patrol_start():
        if need():
            return need()
        ok = patroller.start()
        return jsonify(ok=ok, error=None if ok else (patroller.status.get("error") or "Busy (a scan or a question is running)."))

    @app.route("/patrol/stop", methods=["POST"])
    def patrol_stop():
        if patroller:
            patroller.stop()
        return jsonify(ok=True)

    @app.route("/patrol/config", methods=["POST"])
    def patrol_config():
        url = str((request.json or {}).get("report_url", "")).strip()
        CFG_FILE.parent.mkdir(exist_ok=True)
        CFG_FILE.write_text(json.dumps({"report_url": url}))
        if url and request.json.get("test") and patroller:
            patroller.send({"tag": "TEST", "status": "looking"})
        return jsonify(ok=True, report_url=url)

    @app.route("/patrol/img/<path:name>")
    def patrol_img(name):
        folder = BASE if name.startswith("base/") else SHOTS
        return send_from_directory(folder, name.split("/", 1)[1] if name.startswith("base/") else name)
