// Create one camera: its device account, a devices row and a device_state row.
// Writes device.json for device/config/device.json on the camera.
//
//   npm run provision                 # cloud project, reads supabase/.env
//   npm run provision:local           # local stack, reads supabase/.env.local
//   npm run provision -- --out path   # default: ./device.json
//
// Needs SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const outIdx = process.argv.indexOf('--out');
const out = outIdx > 0 ? process.argv[outIdx + 1] : 'device.json';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const deviceId = randomUUID();
const email = `device-${deviceId}@devices.patroleye.local`;
const password = randomBytes(24).toString('base64url'); // 32 characters

const { data: created, error: userErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: 'device', device_id: deviceId },
});
if (userErr) {
  console.error('createUser failed:', userErr.message);
  process.exit(1);
}

async function fail(step, err) {
  console.error(`${step} failed:`, err.message);
  await admin.auth.admin.deleteUser(created.user.id); // cascades to devices
  process.exit(1);
}

const { error: devErr } = await admin
  .from('devices')
  .insert({ id: deviceId, device_user_id: created.user.id });
if (devErr) await fail('insert devices', devErr);

const { error: stateErr } = await admin.from('device_state').insert({ device_id: deviceId });
if (stateErr) await fail('insert device_state', stateErr);

const config = {
  supabase_url: SUPABASE_URL,
  supabase_anon_key: SUPABASE_ANON_KEY,
  device_id: deviceId,
  email,
  password,
};
writeFileSync(out, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });

console.log(`Device ${deviceId} created`);
console.log(`Wrote ${out}; copy it to device/config/device.json on the camera`);
