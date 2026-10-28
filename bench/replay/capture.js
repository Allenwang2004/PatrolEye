// Replay a logged bench run through the bench's own pages and save one PNG per video frame (30 fps).
//   node replay/capture.js <run.jsonl> <out_dir>
// Every value on screen comes from the run log: PatrolEye's text reports (time, tag, status, text, reading,
// bytes) and the remote's set events (for the gauge needles). The only thing the log lacks is the
// "checking <tag>…" ping, which is not logged; it is shown from 0.6 s after one report until the next one.
const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const [, , LOG_PATH, OUT] = process.argv;
const STATIC = path.resolve(__dirname, '../static');
const L = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n').map((x) => JSON.parse(x));
const T0 = L[0].t; // the reset that started the run
const RUN = path.basename(LOG_PATH, '.jsonl');

// same table as server.py
const EQUIPMENT = {
  'PT-101': {kind: 'gauge', label: 'Header pressure', normal: 4.2, unit: 'bar', max: 10.0, limit: 6.0},
  'PT-102': {kind: 'gauge', label: 'Pump discharge', normal: 5.2, unit: 'bar', max: 10.0, limit: 6.0},
  'V-12': {kind: 'valve', label: 'Cooling water inlet'},
  'DB-1': {kind: 'breaker', label: 'Pump room panel'},
  'P-3': {kind: 'light', label: 'Cooling water pump'},
  'FLOOR-3': {kind: 'leak', label: 'Floor under P-3'},
};
const GAUGE_RATE = 0.5;
const EQ_META = Object.entries(EQUIPMENT).map(([tag, e]) => ({tag, kind: e.kind, label: e.label, unit: e.unit ?? null, limit: e.limit ?? null}));
const REPORTS = L.filter((r) => r.event === 'report').map((r) => ({
  t: r.t, tag: r.tag, status: r.status, text: r.text, reading: r.reading, unit: r.unit,
  confidence: r.confidence, looked_closer: r.looked_closer, bytes: r.bytes,
}));

function looking(t) {
  const next = REPORTS.find((r) => r.t > t);
  if (!next) return null;
  const prev = [...REPORTS].reverse().find((r) => r.t <= t);
  return t >= (prev ? prev.t + 0.6 : T0) ? next.tag : null;
}
const monitorState = (t) => ({run: RUN, elapsed: +(t - T0).toFixed(1), now: t, reports: REPORTS.filter((r) => r.t <= t), looking: looking(t), eq: EQ_META});

// gauge value as server.py computes it: the needle moves at 0.5 bar/s toward the last value the remote set
const valAt = (v0, target, ts, t) => { const d = target - v0, step = GAUGE_RATE * Math.max(0, t - ts); return Math.abs(d) <= step ? target : v0 + (d > 0 ? step : -step); };
function gauge(tag, t) {
  let v0 = EQUIPMENT[tag].normal, target = v0, ts = T0;
  for (const r of L) {
    if (r.t > t) break;
    if (r.event === 'set' && r.tag === tag) { v0 = valAt(v0, target, ts, r.t); target = Math.max(0, Math.min(EQUIPMENT[tag].max, +r.value)); ts = r.t; }
  }
  return {value: valAt(v0, target, ts, t), target};
}
function stationState(t) {
  const eq = {};
  for (const tag of ['PT-101', 'PT-102']) {
    const e = EQUIPMENT[tag], g = gauge(tag, t);
    eq[tag] = {kind: 'gauge', label: e.label, station: 1, value: g.value, target: g.target, max: e.max, limit: e.limit, unit: e.unit, abnormal: g.value > e.limit};
  }
  return {run: RUN, elapsed: +(t - T0).toFixed(1), now: t, eq};
}

async function openPage(browser, pagePath, stateAt) {
  const ctx = await browser.newContext({viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1, timezoneId: 'Asia/Taipei'});
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', String(e)));
  await page.route('http://bench.test/**', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/state') {
      const view = u.searchParams.get('view');
      return route.fulfill({contentType: 'application/json', body: JSON.stringify(view === 'station' ? stationState(stateAt) : monitorState(stateAt))});
    }
    let p = u.pathname;
    if (p.startsWith('/station/')) p = '/station.html';
    else if (p === '/monitor') p = '/monitor.html';
    const file = path.join(STATIC, p);
    const type = p.endsWith('.css') ? 'text/css' : p.endsWith('.woff2') ? 'font/woff2' : 'text/html';
    return route.fulfill({path: file, contentType: type});
  });
  await page.goto('http://bench.test' + pagePath);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  // stop the page's own poll and animation loops; from here on only the replay draws
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; window.setTimeout = () => 0; const h = document.getElementById('hint'); if (h) h.style.display = 'none'; });
  await page.waitForTimeout(1200);
  return {ctx, page};
}

async function shoot(page, dir, n, drawAt) {
  fs.mkdirSync(dir, {recursive: true});
  for (let i = 0; i < n; i++) {
    await drawAt(i);
    await page.screenshot({path: path.join(dir, `f${String(i).padStart(3, '0')}.png`)});
  }
}

(async () => {
  const shots = JSON.parse(process.env.SHOTS);
  const browser = await chromium.launch();
  const boxes = {};
  for (const s of shots) {
    const tStart = T0 + s.from;
    if (s.page === 'station') {
      const {ctx, page} = await openPage(browser, '/station/1', tStart);
      await shoot(page, path.join(OUT, s.name), s.frames, async (i) => {
        const t = tStart + i / 30;
        const st = stationState(t);
        await page.evaluate(([eq, tt]) => {
          for (const [tag, ph] of [['PT-101', 0], ['PT-102', 2]]) setNeedle(tag, Math.max(0, eq[tag].value + 0.015 * Math.sin(tt * 7.3 + ph)));
        }, [st.eq, t - T0]);
      });
      await ctx.close();
    } else {
      const {ctx, page} = await openPage(browser, '/monitor', tStart);
      await shoot(page, path.join(OUT, s.name), s.frames, async (i) => {
        const t = tStart + i / 30;
        await page.evaluate(([d, tt]) => draw(d, tt), [monitorState(t), t]);
      });
      boxes[s.name] = await page.evaluate(() => Object.fromEntries(['tOpen', 'tPT-101', 'tPT-102', 'tChecked', 'tSent', 'alertsCol', 'logCol', 'toast'].map((id) => {
        const el = document.getElementById(id); if (!el) return [id, null];
        const r = el.getBoundingClientRect(); return [id, {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}];
      })));
      await ctx.close();
    }
    console.log('shot', s.name, s.frames, 'frames from', s.from, 's');
  }
  fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(boxes, null, 1));
  await browser.close();
})();
