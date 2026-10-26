// Check RLS, RPC and Storage rules with real accounts on the LOCAL stack.
// Creates throwaway users and devices, then deletes them.
//
//   npx supabase start && npm run test:rls

import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = process.env;
if (!url?.startsWith('http://127.0.0.1')) {
  console.error('Refusing to run against a non-local project:', url);
  process.exit(1);
}

const opts = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(url, serviceKey, opts);
const createdUsers = [];

let failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
}

async function signedIn(email, password) {
  const c = createClient(url, anonKey, opts);
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

async function newUser(prefix) {
  const email = `${prefix}-${randomUUID()}@test.local`;
  const password = randomBytes(12).toString('hex');
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  return { id: data.user.id, client: await signedIn(email, password) };
}

async function newDevice() {
  const id = randomUUID();
  const email = `device-${id}@devices.patroleye.local`;
  const password = randomBytes(16).toString('hex');
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUsers.push(data.user.id);
  await admin.from('devices').insert({ id, device_user_id: data.user.id }).throwOnError();
  await admin.from('device_state').insert({ device_id: id }).throwOnError();
  return { id, userId: data.user.id, client: await signedIn(email, password) };
}

try {
  const a = await newUser('a');
  const b = await newUser('b');
  const d1 = await newDevice();
  const d2 = await newDevice();
  const anon = createClient(url, anonKey, opts);

  // Claiming
  let r = await d1.client.rpc('device_set_claim_code', { p_code: 'BAD0CODE' });
  check('claim code with 0 is rejected', !!r.error);
  r = await d1.client.rpc('device_set_claim_code', { p_code: 'abcd2345' });
  check('device sets its claim code', !r.error, r.error?.message);
  r = await d1.client.from('devices').update({ claim_code: 'ZZZZZZZZ' }).eq('id', d1.id).select();
  check('device cannot write devices directly', !!r.error || r.data.length === 0);

  r = await anon.rpc('claim_device', { p_device_id: d1.id, p_code: 'ABCD2345' });
  check('anon cannot claim', !!r.error);
  r = await b.client.rpc('claim_device', { p_device_id: d1.id, p_code: 'WRONGCOD' });
  check('wrong code fails with invalid_claim', r.error?.message === 'invalid_claim', r.error?.message);
  r = await a.client.rpc('claim_device', { p_device_id: d1.id, p_code: 'abcd2345' });
  check('A claims d1 (lowercase code ok)', !r.error && r.data?.owner_id === a.id, r.error?.message);
  r = await b.client.rpc('claim_device', { p_device_id: d1.id, p_code: 'ABCD2345' });
  check('d1 cannot be claimed twice', r.error?.message === 'invalid_claim');

  // Devices
  r = await a.client.from('devices').select('id');
  check('A sees exactly d1', r.data?.length === 1 && r.data[0].id === d1.id);
  r = await b.client.from('devices').select('id');
  check('B sees no devices', r.data?.length === 0);
  r = await anon.from('devices').select('id');
  check('anon sees no devices', !!r.error || r.data.length === 0);
  r = await a.client.from('devices').update({ name: 'Living room cam', room: 'Living room' }).eq('id', d1.id).select();
  check('A renames d1', !r.error && r.data[0]?.name === 'Living room cam', r.error?.message);
  r = await a.client.from('devices').update({ device_user_id: a.id }).eq('id', d1.id);
  check('A cannot change device_user_id', !!r.error);
  r = await a.client.from('devices').update({ owner_id: b.id }).eq('id', d1.id);
  check('A cannot change owner_id', !!r.error);
  r = await b.client.from('devices').update({ name: 'hijack' }).eq('id', d1.id).select();
  check('B cannot rename d1', !!r.error || r.data.length === 0);

  // State
  r = await d1.client.from('device_state').update({ last_seen: new Date().toISOString(), status: 'patrolling' }).eq('device_id', d1.id).select();
  check('d1 updates its state', !r.error && r.data.length === 1, r.error?.message);
  r = await d2.client.from('device_state').update({ status: 'error' }).eq('device_id', d1.id).select();
  check('d2 cannot update d1 state', !!r.error || r.data.length === 0);
  r = await a.client.from('device_state').select('status').eq('device_id', d1.id);
  check('A reads d1 state', r.data?.[0]?.status === 'patrolling');
  r = await a.client.from('device_state').update({ masks_version: 99 }).eq('device_id', d1.id).select();
  check('A cannot write d1 state', !!r.error || r.data.length === 0);

  // Commands
  r = await a.client.from('device_commands').insert({ device_id: d1.id, type: 'scan' }).select().single();
  check('A sends scan to d1', !r.error && r.data.status === 'pending', r.error?.message);
  const cmd = r.data;
  r = await a.client.from('device_commands').insert({ device_id: d1.id, type: 'scan', status: 'done' });
  check('A cannot set command status on insert', !!r.error);
  r = await b.client.from('device_commands').insert({ device_id: d1.id, type: 'scan' });
  check('B cannot command d1', !!r.error);
  r = await d1.client.from('device_commands').update({ type: 'apply_masks' }).eq('id', cmd.id);
  check('device cannot change command type', !!r.error);
  r = await d1.client.from('device_commands').update({ status: 'done', result: { scan_id: 'x' } }).eq('id', cmd.id).select().single();
  check('device completes command, updated_at moves', !r.error && r.data.updated_at > cmd.updated_at, r.error?.message);
  r = await a.client.from('device_commands').update({ status: 'pending' }).eq('id', cmd.id).select();
  check('A cannot change command status', !!r.error || r.data.length === 0);

  // Storage and scans
  const scanId = randomUUID();
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  r = await d1.client.storage.from('panoramas').upload(`${d1.id}/${scanId}.jpg`, jpg, { contentType: 'image/jpeg' });
  check('d1 uploads to its panoramas folder', !r.error, r.error?.message);
  r = await d1.client.storage.from('panoramas').upload(`${d1.id}/${scanId}.jpg`, jpg, { contentType: 'image/jpeg', upsert: true });
  check('d1 can overwrite its file (upsert)', !r.error, r.error?.message);
  r = await d2.client.storage.from('panoramas').upload(`${d1.id}/evil.jpg`, jpg, { contentType: 'image/jpeg' });
  check('d2 cannot upload into d1 folder', !!r.error);
  r = await d1.client.storage.from('panoramas').upload(`not-a-uuid/x.jpg`, jpg, { contentType: 'image/jpeg' });
  check('non-uuid folder is denied', !!r.error);
  r = await a.client.storage.from('panoramas').upload(`${d1.id}/owner.jpg`, jpg, { contentType: 'image/jpeg' });
  check('owner cannot upload', !!r.error);

  r = await d1.client.from('scans').insert({
    id: scanId, device_id: d1.id, pano_path: `${d1.id}/${scanId}.jpg`,
    width: 2899, height: 892, pan0: -113.4, pan1: 128.3, tilt0: -43.8, tilt1: 28.5, px_per_deg: 12,
  });
  check('d1 inserts scan', !r.error, r.error?.message);
  r = await d2.client.from('scans').insert({
    device_id: d1.id, pano_path: 'x', width: 1, height: 1, pan0: 0, pan1: 1, tilt0: 0, tilt1: 1, px_per_deg: 1,
  });
  check('d2 cannot insert scan for d1', !!r.error);

  r = await a.client.storage.from('panoramas').createSignedUrl(`${d1.id}/${scanId}.jpg`, 60);
  check('A gets signed url for d1 pano', !r.error && !!r.data?.signedUrl, r.error?.message);
  if (r.data?.signedUrl) {
    const res = await fetch(r.data.signedUrl);
    check('signed url downloads', res.ok);
  }
  r = await b.client.storage.from('panoramas').createSignedUrl(`${d1.id}/${scanId}.jpg`, 60);
  check('B cannot get signed url for d1 pano', !!r.error);

  // Masks
  r = await a.client.from('masks').insert({ device_id: d1.id, scan_id: scanId, version: 50, rects: [] }).select().single();
  check('A saves masks, version assigned = 1', !r.error && r.data.version === 1, r.error?.message ?? `v${r.data?.version}`);
  const saves = await Promise.all([1, 2, 3].map(() =>
    a.client.from('masks').insert({ device_id: d1.id, scan_id: scanId, rects: [] }).select('version').single()));
  const versions = saves.map((s) => s.data?.version).sort();
  check('concurrent saves get 2, 3, 4', versions.join() === '2,3,4', saves.map((s) => s.error?.message).join());
  r = await b.client.from('masks').insert({ device_id: d1.id, rects: [] });
  check('B cannot save masks for d1', !!r.error);
  r = await d1.client.from('masks').select('version').eq('device_id', d1.id);
  check('d1 reads its masks', r.data?.length === 4);

  // Events
  const eventId = randomUUID();
  r = await d1.client.from('events').insert({
    id: eventId, device_id: d1.id, type: 'stove_on', severity: 'critical', title: 'Stove on',
  });
  check('d1 inserts event', !r.error, r.error?.message);
  r = await d1.client.from('events').insert({
    id: randomUUID(), device_id: d1.id, type: 'stove_on', severity: 'critical', title: 'x', acked_at: new Date().toISOString(),
  });
  check('device cannot pre-ack an event', !!r.error);
  r = await d2.client.from('events').insert({
    id: randomUUID(), device_id: d1.id, type: 'other', severity: 'info', title: 'spoof',
  });
  check('d2 cannot insert event for d1', !!r.error);
  r = await a.client.from('events').select('id').eq('device_id', d1.id);
  check('A sees d1 event', r.data?.length === 1);
  r = await b.client.from('events').select('id');
  check('B sees no events', r.data?.length === 0);
  r = await a.client.from('events').update({ title: 'edited' }).eq('id', eventId);
  check('A cannot edit event title', !!r.error);
  r = await a.client.from('events').update({ acked_by: b.id, acked_at: new Date().toISOString() }).eq('id', eventId);
  check('A cannot ack as someone else', !!r.error);
  r = await a.client.from('events').update({ acked_by: a.id, acked_at: new Date().toISOString() }).eq('id', eventId).select();
  check('A acks event', !r.error && r.data.length === 1, r.error?.message);
  r = await b.client.from('events').update({ acked_by: b.id, acked_at: new Date().toISOString() }).eq('id', eventId).select();
  check('B cannot ack d1 event', !!r.error || r.data.length === 0);
} finally {
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
