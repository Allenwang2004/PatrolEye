#!/usr/bin/env python3
"""PatrolEye demo bench: a pump room on screens that a judge can break on purpose.

    python3 bench/server.py            (port 8100; no packages to install)

Open these in any browser on the same network (the start-up message prints the addresses):
    /station/1   gauges PT-101, PT-102          ┐
    /station/2   valve V-12, breaker panel DB-1 ├ the "equipment wall" PatrolEye patrols
    /station/3   pump P-3 status light + floor  ┘
    /board       control room scoreboard (ground truth vs. what PatrolEye reported)
    /monitor     plant-edition control room: only what PatrolEye reported (alerts, patrol log)
    /remote      judge's remote, for a phone

PatrolEye sends small JSON text reports to POST /api/report. The bench refuses anything else
(no images, nothing over 4 KB), and the board counts every byte it received.
Each run is logged to bench/runs/<start time>.jsonl for the results table.
"""
import json
import random
import socket
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8100
HERE = Path(__file__).resolve().parent
STATIC = HERE / "static"
RUNS = HERE / "runs"
GAUGE_RATE = 0.5          # bar per second: the needle climbs visibly instead of jumping
LEAK_GROW = 12.0          # seconds for a puddle to reach full size
MAX_REPORT = 4096         # bytes; a text report is ~300 B

# Every instrument on the wall. "normal" is what a healthy plant looks like.
EQUIPMENT = {
    "PT-101": {"station": 1, "kind": "gauge", "label": "Header pressure", "normal": 4.2, "unit": "bar", "max": 10.0, "limit": 6.0},
    "PT-102": {"station": 1, "kind": "gauge", "label": "Pump discharge", "normal": 5.2, "unit": "bar", "max": 10.0, "limit": 6.0},
    "V-12": {"station": 2, "kind": "valve", "label": "Cooling water inlet", "normal": "open"},
    "DB-1": {"station": 2, "kind": "breaker", "label": "Pump room panel", "normal": "on"},
    "P-3": {"station": 3, "kind": "light", "label": "Cooling water pump", "normal": "run"},
    "FLOOR-3": {"station": 3, "kind": "leak", "label": "Floor under P-3", "normal": "dry"},
}
ABNORMAL = {"valve": "closed", "breaker": "tripped", "light": "fault", "leak": "leak"}
DESCRIBE = {
    "valve": "V-12 closed (should be open)",
    "breaker": "Breaker CB-3 tripped on DB-1",
    "light": "P-3 fault light on",
    "leak": "Water leaking under P-3",
}

lock = threading.Lock()
S = {}


def now():
    return time.time()


def new_run():
    t = now()
    S.clear()
    S.update(run=time.strftime("%Y%m%d_%H%M%S"), t0=t, faults=[], reports=[], bytes=0, n_reports=0,
             false_alarms=0, missed_looks=0, gauge_errors=[], looking=None, looking_t=None)
    S["eq"] = {}
    for tag, e in EQUIPMENT.items():
        if e["kind"] == "gauge":
            S["eq"][tag] = {"v0": e["normal"], "target": e["normal"], "t": t}
        else:
            S["eq"][tag] = {"state": e["normal"], "t": t}
    log({"event": "reset"})


def log(rec):
    RUNS.mkdir(exist_ok=True)
    rec = {"t": round(now(), 3), **rec}
    with open(RUNS / f"{S['run']}.jsonl", "a") as fh:
        fh.write(json.dumps(rec) + "\n")


def gauge_value(tag, t=None):
    g = S["eq"][tag]
    t = now() if t is None else t
    d = g["target"] - g["v0"]
    step = GAUGE_RATE * max(0.0, t - g["t"])
    return g["target"] if abs(d) <= step else g["v0"] + (step if d > 0 else -step)


def is_abnormal(tag, t=None):
    e = EQUIPMENT[tag]
    if e["kind"] == "gauge":
        return gauge_value(tag, t) > e["limit"]
    return S["eq"][tag]["state"] != e["normal"]


def open_fault(tag):
    for f in S["faults"]:
        if f["tag"] == tag and f["end"] is None:
            return f
    return None


def set_equipment(tag, value, hidden=False, source="remote"):
    """Change one instrument. Opens a fault when it leaves normal, closes it when it comes back."""
    e = EQUIPMENT[tag]
    t = now()
    was = is_abnormal(tag, t)
    if e["kind"] == "gauge":
        v = max(0.0, min(e["max"], float(value)))
        S["eq"][tag] = {"v0": gauge_value(tag, t), "target": v, "t": t}
        will = v > e["limit"]
        start = t + max(0.0, (e["limit"] - S["eq"][tag]["v0"]) / GAUGE_RATE) if will and not was else t
        desc = f"{tag} pressure rising to {v:.1f} bar (limit {e['limit']:.1f})"
    else:
        v = str(value)
        if S["eq"][tag]["state"] != v:                 # pressing the same button twice changes nothing
            S["eq"][tag] = {"state": v, "t": t}
        will = v != e["normal"]
        start = t
        desc = DESCRIBE[e["kind"]]
    log({"event": "set", "tag": tag, "value": v, "hidden": hidden, "source": source})
    f = open_fault(tag)
    if will and not f:
        f = {"id": len(S["faults"]) + 1, "tag": tag, "kind": e["kind"], "desc": desc, "start": start,
             "hidden": hidden, "found": None, "found_text": None, "end": None}
        S["faults"].append(f)
        log({"event": "fault", **f})
    elif will and f:
        f["desc"] = desc
    elif not will and f:
        f["end"] = t
        log({"event": "cleared", "id": f["id"], "found": f["found"] is not None})


def random_fault():
    calm = [tag for tag in EQUIPMENT if not is_abnormal(tag) and not open_fault(tag)]
    if not calm:
        return None
    tag = random.choice(calm)
    e = EQUIPMENT[tag]
    value = round(random.uniform(7.2, 8.6), 1) if e["kind"] == "gauge" else ABNORMAL[e["kind"]]
    set_equipment(tag, value, hidden=True, source="random")
    return tag


def take_report(d, nbytes):
    """A text report from PatrolEye. Match it against the ground truth at the moment it arrives."""
    t = now()
    tag = str(d.get("tag", ""))[:32]
    status = d.get("status")
    S["bytes"] += nbytes
    if status == "looking":
        S["looking"], S["looking_t"] = tag, t
        return {"ok": True}
    S["n_reports"] += 1
    r = {"t": t, "tag": tag, "status": status, "text": str(d.get("text", ""))[:400],
         "reading": d.get("reading"), "unit": d.get("unit"), "confidence": d.get("confidence"),
         "looked_closer": bool(d.get("looked_closer")), "verdict": None, "error": None, "bytes": nbytes}
    e = EQUIPMENT.get(tag)
    if e:
        truth_bad = is_abnormal(tag, t)
        if e["kind"] == "gauge" and isinstance(r["reading"], (int, float)):
            err = abs(r["reading"] - gauge_value(tag, t)) / e["max"] * 100
            r["error"] = round(err, 2)
            r["truth"] = round(gauge_value(tag, t), 2)
            S["gauge_errors"].append(err)
        if status == "abnormal":
            f = open_fault(tag)
            if f and f["found"] is None and t >= f["start"]:
                f["found"], f["found_text"] = t, r["text"]
                r["verdict"] = "found"
                log({"event": "found", "id": f["id"], "delay": round(t - f["start"], 1)})
            elif truth_bad:
                r["verdict"] = "repeat"
            else:
                r["verdict"] = "false alarm"
                S["false_alarms"] += 1
        elif status == "unclear":
            r["verdict"] = "unclear"
        elif status == "normal":
            if truth_bad:
                r["verdict"] = "missed"
                S["missed_looks"] += 1
            else:
                r["verdict"] = "correct"
    else:
        r["verdict"] = "unknown tag"
    S["reports"].append(r)
    if S["looking"] == tag:
        S["looking"] = None
    log({"event": "report", **{k: v for k, v in r.items() if k != "t"}, "bytes": nbytes})
    return {"ok": True, "verdict": r["verdict"]}


def snapshot(view):
    t = now()
    eq = {}
    for tag, e in EQUIPMENT.items():
        x = {"kind": e["kind"], "label": e["label"], "station": e["station"]}
        if e["kind"] == "gauge":
            x.update(value=round(gauge_value(tag, t), 3), target=S["eq"][tag]["target"], max=e["max"],
                     limit=e["limit"], unit=e["unit"])
        else:
            x.update(state=S["eq"][tag]["state"], since=round(t - S["eq"][tag]["t"], 2))
            if e["kind"] == "leak":
                x["size"] = round(min(1.0, (t - S["eq"][tag]["t"]) / LEAK_GROW), 3) if x["state"] == "leak" else 0
        x["abnormal"] = is_abnormal(tag, t)
        eq[tag] = x
    out = {"run": S["run"], "elapsed": round(t - S["t0"], 1), "now": t}
    if view == "station":
        out["eq"] = eq
        return out
    if view == "monitor":
        # The plant control room sees only what PatrolEye said: no ground truth, no verdicts, no live values.
        keep = ("t", "tag", "status", "text", "reading", "unit", "confidence", "looked_closer", "bytes")
        out.update(reports=[{k: r.get(k) for k in keep} for r in S["reports"][-40:]], looking=S["looking"],
                   eq=[{"tag": tag, "kind": e["kind"], "label": e["label"], "unit": e.get("unit"), "limit": e.get("limit")}
                       for tag, e in EQUIPMENT.items()])
        return out
    faults = []
    for f in S["faults"]:
        g = dict(f)
        g["age"] = round((f["found"] or f["end"] or t) - f["start"], 1)
        g["active"] = t >= f["start"]
        if f["hidden"] and f["found"] is None and f["end"] is None:
            g.update(tag="?", desc="Hidden fault", kind="?")
        faults.append(g)
    found = [f for f in S["faults"] if f["found"] is not None]
    active = [f for f in S["faults"] if t >= f["start"]]
    errs = S["gauge_errors"]
    out.update(faults=faults, reports=S["reports"][-40:], looking=S["looking"],
               stats={"injected": len(active), "found": len(found),
                      "ttd": round(sum(f["found"] - f["start"] for f in found) / len(found), 1) if found else None,
                      "gauge_err": round(sum(errs) / len(errs), 2) if errs else None, "gauge_n": len(errs),
                      "false_alarms": S["false_alarms"], "missed_looks": S["missed_looks"],
                      "reports": S["n_reports"], "bytes": S["bytes"], "images": 0})
    if view == "remote":
        hidden = {f["tag"] for f in S["faults"] if f["hidden"] and f["found"] is None and f["end"] is None}
        out["eq"] = {tag: ({"hidden": True, "kind": x["kind"]} if tag in hidden else x) for tag, x in eq.items()}
    return out


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(STATIC), **kw)

    def log_message(self, *a):
        pass

    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/state":
            view = (self.path.split("view=")[1].split("&")[0] if "view=" in self.path else "board")
            with lock:
                return self.send_json(snapshot(view))
        pages = {"/": "index.html", "/board": "board.html", "/monitor": "monitor.html", "/remote": "remote.html"}
        if path.startswith("/station/"):
            self.path = "/station.html"
        elif path in pages:
            self.path = "/" + pages[path]
        return super().do_GET()

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_REPORT:
            return self.send_json({"error": "Too large: the bench only takes short text reports."}, 413)
        if "json" not in (self.headers.get("Content-Type") or ""):
            return self.send_json({"error": "Only JSON text is accepted."}, 415)
        try:
            d = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return self.send_json({"error": "Not valid JSON."}, 400)
        path = self.path.split("?")[0]
        with lock:
            if path == "/api/report":
                return self.send_json(take_report(d, n))
            if path == "/api/set":
                if d.get("tag") not in EQUIPMENT:
                    return self.send_json({"error": "unknown tag"}, 400)
                set_equipment(d["tag"], d.get("value"))
            elif path == "/api/random":
                tag = random_fault()
                if not tag:
                    return self.send_json({"error": "Everything is already broken."}, 409)
            elif path == "/api/normal":
                for tag, e in EQUIPMENT.items():
                    if is_abnormal(tag) or open_fault(tag):
                        set_equipment(tag, e["normal"])
            elif path == "/api/reveal":
                for f in S["faults"]:
                    f["hidden"] = False
            elif path == "/api/reset":
                new_run()
            else:
                return self.send_json({"error": "unknown"}, 404)
            return self.send_json(snapshot("remote"))


class Server(ThreadingHTTPServer):
    address_family = socket.AF_INET6
    daemon_threads = True

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)   # IPv4 and IPv6 on one port
        except (AttributeError, OSError):
            pass
        super().server_bind()


def addresses():
    out = []
    for fam, probe in ((socket.AF_INET, ("8.8.8.8", 80)), (socket.AF_INET6, ("2001:4860:4860::8888", 80))):
        try:
            s = socket.socket(fam, socket.SOCK_DGRAM)
            s.connect(probe)
            ip = s.getsockname()[0]
            s.close()
            out.append(f"[{ip}]" if fam == socket.AF_INET6 else ip)
        except OSError:
            pass
    try:
        name = subprocess.run(["scutil", "--get", "LocalHostName"], capture_output=True, text=True).stdout.strip()
        if name:
            out.append(f"{name}.local")
    except OSError:
        pass
    return out or ["localhost"]


if __name__ == "__main__":
    new_run()
    try:
        srv = Server(("::", PORT), Handler)
    except OSError:                       # no IPv6 on this machine: IPv4 only
        Server.address_family = socket.AF_INET
        srv = Server(("0.0.0.0", PORT), Handler)
    print(f"PatrolEye bench running on port {PORT}. Open on any device on this network:")
    for a in addresses():
        print(f"  http://{a}:{PORT}/      (links to stations 1–3, board, monitor, remote)")
    print("PatrolEye reports to:  http://<one of the addresses above>:%d/api/report" % PORT)
    print("Ctrl+C to stop.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
