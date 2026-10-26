// Shared by the home and factory editions: live view, panorama map (camera field of view follows the mount),
// text and voice questions, and the "last checked" record.
// Both pages use the same element ids; they differ only in <body data-mode> and their own CSS.
const MODE = document.body.dataset.mode;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Keyed by the memory's object name (Chinese); the UI shows item.label (English)
const QUESTION_FOR = {
  home: { 時鐘: "What time is it?", 水龍頭: "Is the faucet off?", 門: "Is the door closed?", 瓦斯爐: "Is the stove off?",
          冰箱: "Is the fridge door closed?", 窗戶: "Is the window closed?" },
  factory: { 平板儀表: "What does the gauge read?", 儀表: "What does the gauge read?", 閥門: "Is the valve open?",
             指示燈: "What color is the indicator?", 時鐘: "What time is it?", 門: "Is the door closed?" },
};
const questionFor = (it) => QUESTION_FOR[MODE][it.name] || `How does the ${it.label.toLowerCase()} look right now?`;

let map = null;          // result of /api/map
let lastLog = { last: {}, recent: [] };
let asking = false;

// ---------- helpers ----------
async function api(url, body) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Server responded ${r.status}`);
  return j;
}
function ago(t) {
  const s = (Date.now() - new Date(t.replace(" ", "T")).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return t.slice(5, 16);
}
function setLiveTag(text) {
  const el = $("liveTag");
  if (!el) return;
  el.textContent = text || "";
  el.hidden = !text;
}

// ---------- panorama map ----------
function panoPos(pan, tilt) {
  const p = map.pano;
  return { x: ((pan - p.pan0) / (p.pan1 - p.pan0)) * 100, y: ((p.tilt1 - tilt) / (p.tilt1 - p.tilt0)) * 100 };
}
function renderMap() {
  if (!map.pano) {
    $("mapScroll").hidden = true;
    $("mapScroll").insertAdjacentHTML("afterend",
      `<p class="empty">No panorama yet. Run a panorama scan in <a href="/dev">developer tools</a>, then build the room memory.</p>`);
    return;
  }
  $("panoImg").src = map.pano.url;
  // Labels that sit too close would overlap: flip the later one to the other side of its dot
  const placed = [];
  $("pins").innerHTML = map.items.map((it, i) => {
    const { x, y } = panoPos(it.pan, it.tilt);
    const up = placed.some((p) => Math.abs(p.x - x) < 7 && Math.abs(p.y - y) < 14 && !p.up);
    placed.push({ x, y, up });
    return `<button class="pin${up ? " up" : ""}" style="left:${x}%;top:${y}%" data-i="${i}" aria-label="Point the camera at the ${esc(it.label)}">
      <span class="pin-dot"></span><span class="pin-label">${esc(it.label)}</span></button>`;
  }).join("");
  $("pins").querySelectorAll(".pin").forEach((b) => b.addEventListener("click", () => lookAt(map.items[+b.dataset.i])));
}
function updateBeam(pan, tilt) {
  const beam = $("beam");
  if (!beam) return;
  if (!map || !map.pano || pan == null) { beam.hidden = true; return; }
  const [hw, hv] = map.half_fov;
  const a = panoPos(pan - hw, tilt + hv), b = panoPos(pan + hw, tilt - hv);
  Object.assign(beam.style, { left: `${a.x}%`, top: `${a.y}%`, width: `${b.x - a.x}%`, height: `${b.y - a.y}%` });
  beam.hidden = false;
  // On phones the panorama scrolls sideways: keep the camera's view on screen
  const sc = $("mapScroll");
  if (sc && sc.scrollWidth > sc.clientWidth && !sc.matches(":hover")) {
    const cx = ((a.x + b.x) / 200) * sc.scrollWidth;
    if (cx < sc.scrollLeft + 40 || cx > sc.scrollLeft + sc.clientWidth - 40)
      sc.scrollTo({ left: cx - sc.clientWidth / 2, behavior: "smooth" });
  }
}
async function lookAt(it) {
  setLiveTag(`Turning to the ${it.label.toLowerCase()}…`);
  try {
    await api("/move", { pan: it.pan, tilt: it.tilt });
    setLiveTag(`Looking at: ${it.label}`);
  } catch (e) {
    setLiveTag(e.message);
  }
  pollState();
}

// ---------- status polling (mount angle, speech model loaded) ----------
let stateTimer = null;
async function pollState() {
  clearTimeout(stateTimer);
  try {
    const s = await api("/state");
    if (s.pt) updateBeam(s.pt.pan, s.pt.tilt);
    const st = $("status");
    if (st) {
      st.dataset.ok = s.pt ? "1" : "0";
      st.textContent = s.pt ? (s.scan.running ? "Scanning the room" : "Camera online") : "Camera mount offline";
    }
    const mic = $("mic");
    if (mic) mic.dataset.ready = s.voice_ready ? "1" : "0";
  } catch (e) { /* network blip: try again next round */ }
  stateTimer = setTimeout(pollState, asking ? 600 : 1500);
}

// ---------- last-checked record ----------
async function loadLog() {
  lastLog = await api(`/api/log?mode=${MODE}`);
  renderChecks();
  if ($("recent")) renderRecent();
}
function renderChecks() {
  const el = $("checks");
  if (!el || !map) return;
  if (!map.items.length) {
    el.innerHTML = MODE === "factory"
      ? `<p class="empty">No checkpoints registered yet. Set up the gauges and valves, then rescan the room in <a href="/dev">developer tools</a>.</p>`
      : `<p class="empty">Nothing to watch yet. Put the clock and other items in place, then rescan the room in <a href="/dev">developer tools</a>.</p>`;
    return;
  }
  el.innerHTML = map.items.map((it, i) => {
    const r = lastLog.last[it.name];
    const state = r ? (r.found === false ? "alert" : r.confidence === "low" ? "unsure" : "ok") : "none";
    return `<li class="check" data-state="${state}">
      <div class="check-main">
        <span class="check-name">${esc(it.label)}</span>
        <span class="check-ans">${r ? esc(r.answer) : "Not checked yet"}</span>
      </div>
      <div class="check-side">
        <span class="check-time">${r ? ago(r.t) : ""}</span>
        <button class="check-go" data-i="${i}">${MODE === "factory" ? "Inspect" : "Check"}</button>
      </div></li>`;
  }).join("") + (map.missing.length
    ? `<li class="check-missing">Not in the room memory yet: ${map.missing.map(esc).join(", ")}</li>` : "");
  el.querySelectorAll(".check-go").forEach((b) => b.addEventListener("click", () => ask(questionFor(map.items[+b.dataset.i]))));
}
function renderRecent() {
  $("recent").innerHTML = lastLog.recent.length
    ? lastLog.recent.map((r) => `<tr><td>${esc(r.t.slice(11, 16))}</td><td>${esc(r.label || "—")}</td>
        <td>${esc(r.answer)}</td><td>${r.sec ?? ""} s</td></tr>`).join("")
    : `<tr><td colspan="4" class="empty">No records yet. Inspect a checkpoint, or ask a question.</td></tr>`;
}

// ---------- questions ----------
async function ask(q, via = "text") {
  q = (q || "").trim();
  if (!q || asking) return;
  $("q").value = "";
  asking = true;
  document.body.classList.add("is-asking");
  $("thread").hidden = false;
  $("question").textContent = q;
  $("viaVoice").hidden = via !== "voice";
  $("steps").innerHTML = "";
  $("answer").innerHTML = "";
  $("shots").innerHTML = "";
  try {
    await api("/ask", { q, mode: MODE, via });
  } catch (e) {
    showAnswer({ answer: e.message, found: false }, null);
    asking = false;
    document.body.classList.remove("is-asking");
    return;
  }
  pollState();
  pollAsk();
}
async function pollAsk() {
  let s;
  try { s = await api("/ask/status"); } catch (e) { setTimeout(pollAsk, 1000); return; }
  $("steps").innerHTML = s.steps.map((x, i) =>
    `<li class="${s.running && i === s.steps.length - 1 ? "now" : ""}"><span class="step-t">${esc(x.t)}</span>${esc(x.text)}</li>`).join("");
  if (s.target_en) setLiveTag(`Looking at: ${s.target_en}`);
  if (s.running) { setTimeout(pollAsk, 700); return; }
  asking = false;
  document.body.classList.remove("is-asking");
  showAnswer(s.result || { answer: "No answer came back." }, s.sec);
  loadLog();
}
function showAnswer(a, sec) {
  const meta = [a.confidence && `Confidence: ${a.confidence}`, sec && `took ${sec} s`].filter(Boolean).join(", ");
  $("answer").innerHTML = `<p class="answer-text" data-found="${a.found === false ? 0 : 1}">${esc(a.answer)}</p>
    <p class="answer-meta">${meta}</p>`;
  $("shots").innerHTML = [a.crop && ["Zoomed view the AI read", a.crop], a.full && ["Full camera frame", a.full]].filter(Boolean)
    .map(([alt, f]) => `<a href="/asks/${f}" target="_blank"><img src="/asks/${f}" alt="${alt}"></a>`).join("");
  speak(a.answer);
}

// ---------- read answers aloud (browser speech synthesis, can be turned off) ----------
function speakOn() { try { return localStorage.getItem(`speak-${MODE}`) === "1"; } catch (e) { return false; } }
function speak(text) {
  if (!speakOn() || !("speechSynthesis" in window) || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
function initSpeak() {
  const b = $("speak");
  if (!b) return;
  const sync = () => { b.setAttribute("aria-pressed", speakOn() ? "true" : "false"); b.textContent = speakOn() ? "Read answers aloud: on" : "Read answers aloud: off"; };
  b.addEventListener("click", () => { try { localStorage.setItem(`speak-${MODE}`, speakOn() ? "0" : "1"); } catch (e) {} sync(); });
  sync();
}

// ---------- voice: record in the browser → upload to the Pi → Whisper on the Pi → ask ----------
let rec = null, chunks = [], recTimer = null, recStart = 0;
async function toggleMic() {
  const mic = $("mic");
  if (rec && rec.state === "recording") { rec.stop(); return; }
  if (asking) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    micHint("Browsers only allow the microphone on https pages. Open this page with https://.");
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    micHint("No microphone permission. Allow the microphone next to the address bar.");
    return;
  }
  chunks = [];
  rec = new MediaRecorder(stream);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(recTimer);
    mic.classList.remove("recording");
    micHint("The Pi is transcribing what you said…");
    const blob = new Blob(chunks, { type: rec.mimeType });
    try {
      const r = await fetch(`/api/voice?mode=${MODE}`, { method: "POST", body: blob });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (!j.text) { micHint("Didn't catch that. Try again."); return; }
      micHint(`Heard you (transcribed on the Pi in ${j.sec} s)`);
      ask(j.text, "voice");
    } catch (e) {
      micHint(e.message);
    }
  };
  rec.start();
  recStart = Date.now();
  mic.classList.add("recording");
  micHint("Listening… tap again when you're done");
  recTimer = setInterval(() => {
    const s = (Date.now() - recStart) / 1000;
    micHint(`Listening… ${s.toFixed(0)} s, tap again when you're done`);
    if (s >= 12) rec.stop();       // a question never takes 12 s; stop on our own if they forget
  }, 250);
}
function micHint(t) { const el = $("micHint"); if (el) { el.textContent = t; el.hidden = !t; } }

// ---------- start ----------
async function init() {
  // ?still: use a single photo instead of the stream (the stream keeps headless screenshots "loading" forever)
  $("live").src = new URLSearchParams(location.search).has("still") ? "/snap" : "/stream";
  map = await api(`/api/map?mode=${MODE}`);
  renderMap();
  $("quick").innerHTML = map.mode.quick.map((q) => `<button type="button" class="chip">${esc(q)}</button>`).join("");
  $("quick").querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => ask(b.textContent)));
  $("askForm").addEventListener("submit", (e) => { e.preventDefault(); ask($("q").value); });
  $("mic").addEventListener("click", toggleMic);
  initSpeak();
  await loadLog();
  pollState();
  // If a question is already running (asked from another tab), keep showing it
  const s = await api("/ask/status");
  if (s.running) { asking = true; $("thread").hidden = false; $("question").textContent = s.q; pollAsk(); }
}
init();
