import { supabase } from '@/lib/supabase';
import type { DeviceCommand } from '@/lib/types';

const POLL_MS = 2000;

export async function sendCommand(
  deviceId: string,
  type: DeviceCommand['type'],
  payload: Record<string, unknown> = {},
) {
  const { data, error } = await supabase
    .from('device_commands')
    .insert({ device_id: deviceId, type, payload })
    .select()
    .single<DeviceCommand>();
  if (error) throw error;
  return data;
}

/** Poll until `check` returns a value, the timeout passes or the signal aborts. */
export async function pollUntil<T>(
  check: () => Promise<T | null | undefined>,
  { timeoutMs, signal }: { timeoutMs: number; signal?: AbortSignal },
): Promise<T> {
  const end = Date.now() + timeoutMs;
  while (true) {
    if (signal?.aborted) throw new Error('cancelled');
    const value = await check();
    if (value != null) return value;
    if (Date.now() > end) throw new Error('The camera did not respond in time. Check that it is online.');
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

/** Wait for a command to finish. Resolves with it when done, throws on error. */
export async function waitForCommand(
  id: string,
  opts: { timeoutMs: number; signal?: AbortSignal; onStatus?: (s: DeviceCommand['status']) => void },
) {
  const cmd = await pollUntil(async () => {
    const { data, error } = await supabase.from('device_commands').select('*').eq('id', id).single<DeviceCommand>();
    if (error) throw error;
    opts.onStatus?.(data.status);
    return data.status === 'done' || data.status === 'error' ? data : null;
  }, opts);
  if (cmd.status === 'error') {
    throw new Error(String(cmd.result?.message ?? 'The camera reported an error.'));
  }
  return cmd;
}
