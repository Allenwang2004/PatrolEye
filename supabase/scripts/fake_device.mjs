// Pretend to be a camera so the App can be tested end to end without one.
//
//   npm run fake-device -- [--config device.json] [--pano <scan dir>] [--event-every 120]
//
// Signs in with the device account from device.json, prints the claim QR while
// unclaimed, sends a heartbeat every 30 s, answers scan / apply_masks commands
// and uploads a fake event every --event-every seconds (0 = never).
// Press Enter to send an event right away.

import { execFileSync } from 'node:child_process';
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import qrcode from 'qrcode-terminal';

const here = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

const configPath = arg('config', 'device.json');
const panoDir = resolve(arg('pano', join(here, '../../device/scans/20261011_031345_normal')));
const eventEvery = Number(arg('event-every', '120'));

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const deviceId = config.device_id;
const sb = createClient(config.supabase_url, config.supabase_anon_key, {
  auth: { persistSession: false },
});

const CLAIM_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const HEARTBEAT_MS = 30_000;
const POLL_MS = 10_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

let status = 'idle';

// Sign in

const { error: authErr } = await sb.auth.signInWithPassword({
  email: config.email,
  password: config.password,
});
if (authErr) {
  console.error('Sign-in failed:', authErr.message);
  process.exit(1);
}
log(`Signed in as device ${deviceId}`);

// Heartbeat

async function heartbeat() {
  const { error } = await sb
    .from('device_state')
    .update({ last_seen: new Date().toISOString(), status, app_version: 'fake-device' })
    .eq('device_id', deviceId);
  if (error) log('heartbeat failed:', error.message);
}

async function setStatus(s) {
  status = s;
  await heartbeat();
}

await heartbeat();
setInterval(heartbeat, HEARTBEAT_MS);

// Claim

async function loadDevice() {
  const { data, error } = await sb.from('devices').select('*').eq('id', deviceId).single();
  if (error) throw new Error(`read devices: ${error.message}`);
  return data;
}

let device = await loadDevice();
if (!device.owner_id) {
  let code = '';
  for (let i = 0; i < 8; i++) code += CLAIM_CHARS[randomInt(CLAIM_CHARS.length)];
  const { error } = await sb.rpc('device_set_claim_code', { p_code: code });
  if (error) {
    console.error('device_set_claim_code failed:', error.message);
    process.exit(1);
  }
  const uri = `patroleye://claim?d=${deviceId}&c=${code}`;
  console.log('\nNot claimed yet. Scan this with the App:\n');
  qrcode.generate(uri, { small: true });
  console.log(`\n${uri}\n`);
  while (!device.owner_id) {
    await sleep(3000);
    device = await loadDevice();
  }
}
log(`Claimed by ${device.owner_id}${device.name ? ` as "${device.name}"` : ''}`);

// Commands

const handled = new Set();

async function finish(cmd, cmdStatus, result) {
  const { error } = await sb
    .from('device_commands')
    .update({ status: cmdStatus, result })
    .eq('id', cmd.id);
  if (error) log(`command ${cmd.id} update failed:`, error.message);
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error('not a JPEG');
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error('JPEG size not found');
}

async function doScan() {
  await setStatus('scanning');
  await sleep(4000); // a real scan takes a while
  const jpg = readFileSync(join(panoDir, 'pano.jpg'));
  const meta = JSON.parse(readFileSync(join(panoDir, 'pano.json'), 'utf8'));
  const { width, height } = jpegSize(jpg);
  const scanId = randomUUID();
  const panoPath = `${deviceId}/${scanId}.jpg`;
  const up = await sb.storage
    .from('panoramas')
    .upload(panoPath, jpg, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw new Error(`upload pano: ${up.error.message}`);
  const { error } = await sb.from('scans').insert({
    id: scanId,
    device_id: deviceId,
    pano_path: panoPath,
    width,
    height,
    pan0: meta.pan0,
    pan1: meta.pan1,
    tilt0: meta.tilt0,
    tilt1: meta.tilt1,
    px_per_deg: meta.px_per_deg,
  });
  if (error) throw new Error(`insert scans: ${error.message}`);
  return { scan_id: scanId };
}

async function doApplyMasks(payload) {
  const { data: mask, error } = await sb
    .from('masks')
    .select('id, version, rects')
    .eq('id', payload.mask_id)
    .eq('device_id', deviceId)
    .single();
  if (error) throw new Error(`read mask: ${error.message}`);
  log(`Applying masks v${mask.version}: ${mask.rects.length} rect(s)`);
  const { error: stErr } = await sb
    .from('device_state')
    .update({ masks_version: mask.version })
    .eq('device_id', deviceId);
  if (stErr) throw new Error(`update masks_version: ${stErr.message}`);
  return { version: mask.version };
}

async function handle(cmd) {
  if (handled.has(cmd.id) || cmd.status !== 'pending') return;
  handled.add(cmd.id);
  // Take the command only if it is still pending
  const { data: taken } = await sb
    .from('device_commands')
    .update({ status: 'running' })
    .eq('id', cmd.id)
    .eq('status', 'pending')
    .select('id');
  if (!taken?.length) return;
  log(`Command ${cmd.type} ${cmd.id}`);
  try {
    const result = cmd.type === 'scan' ? await doScan() : await doApplyMasks(cmd.payload);
    await finish(cmd, 'done', result);
    log(`Command ${cmd.type} done`, JSON.stringify(result));
  } catch (e) {
    await finish(cmd, 'error', { message: e.message });
    log(`Command ${cmd.type} error:`, e.message);
  } finally {
    await setStatus('patrolling');
  }
}

async function pollCommands() {
  const { data, error } = await sb
    .from('device_commands')
    .select('*')
    .eq('device_id', deviceId)
    .eq('status', 'pending')
    .order('created_at');
  if (error) return log('poll commands failed:', error.message);
  for (const cmd of data) await handle(cmd);
}

sb.channel(`device-${deviceId}`)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'device_commands', filter: `device_id=eq.${deviceId}` },
    (msg) => handle(msg.new),
  )
  .subscribe((s) => log(`Realtime: ${s}`));

await pollCommands();
setInterval(pollCommands, POLL_MS);
await setStatus('patrolling');

// Fake events

const EVENTS = [
  { type: 'stove_on', severity: 'critical', checkpoint: 'STOVE', title: 'Stove left on with nobody in the kitchen',
    detail: 'Burner flame visible for over 5 minutes and no person detected nearby.', meta: { confidence: 'high', looked_closer: true } },
  { type: 'person_down', severity: 'critical', checkpoint: 'FLOOR', title: 'Person lying on the floor',
    detail: 'A person has been lying still on the living room floor for 40 seconds.', meta: { confidence: 'medium', looked_closer: true } },
  { type: 'gauge_high', severity: 'warning', checkpoint: 'PT-101', title: 'Pressure gauge above limit',
    detail: 'PT-101 reads 7.8 bar, above the 6.0 bar limit.', meta: { reading: 7.8, unit: 'bar', confidence: 'high', looked_closer: true } },
  { type: 'light_fault', severity: 'info', checkpoint: 'LAMP', title: 'Indicator light is off',
    detail: 'The status lamp expected to be green is not lit.', meta: { confidence: 'medium' } },
];

const cacheDir = join(here, '../.cache');

function testMedia() {
  const clip = join(cacheDir, 'clip.mp4');
  const thumb = join(cacheDir, 'thumb.jpg');
  if (!existsSync(clip) || !existsSync(thumb)) {
    mkdirSync(cacheDir, { recursive: true });
    log('Generating test clip with ffmpeg...');
    // 25 s, 1280x720, 10 fps, H.264, like the real clips
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=10',
      '-t', '25', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', clip]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '10', '-i', clip, '-frames:v', '1',
      '-vf', 'scale=480:-2', thumb]);
  }
  return { clip: readFileSync(clip), thumb: readFileSync(thumb) };
}

async function sendEvent() {
  const tpl = EVENTS[randomInt(EVENTS.length)];
  const eventId = randomUUID();
  const { clip, thumb } = testMedia();
  const clipPath = `${deviceId}/${eventId}.mp4`;
  const thumbPath = `${deviceId}/${eventId}.jpg`;
  const clips = sb.storage.from('clips');
  const a = await clips.upload(clipPath, clip, { contentType: 'video/mp4', upsert: true });
  if (a.error) return log('upload clip failed:', a.error.message);
  const b = await clips.upload(thumbPath, thumb, { contentType: 'image/jpeg', upsert: true });
  if (b.error) return log('upload thumb failed:', b.error.message);
  const { error } = await sb.from('events').insert({
    id: eventId,
    device_id: deviceId,
    type: tpl.type,
    severity: tpl.severity,
    title: tpl.title,
    detail: tpl.detail,
    checkpoint: tpl.checkpoint,
    clip_path: clipPath,
    thumb_path: thumbPath,
    meta: tpl.meta,
  });
  if (error) return log('insert event failed:', error.message);
  log(`Event ${tpl.type} (${tpl.severity}) ${eventId}`);
}

if (eventEvery > 0) setInterval(sendEvent, eventEvery * 1000);
process.stdin.on('data', () => sendEvent());
log(`Running. Events every ${eventEvery || 'never'} s; press Enter to send one now.`);

async function shutdown() {
  await setStatus('idle');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
