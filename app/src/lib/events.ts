import { supabase } from '@/lib/supabase';
import type { PatrolEvent } from '@/lib/types';

export const EVENT_PAGE = 20;
const SIGNED_URL_SECONDS = 3600;

export type EventRow = PatrolEvent & { devices: { name: string | null; room: string | null } | null };

export const EVENT_SELECT = '*, devices(name, room)';

/** Newest first; pass the oldest loaded `ts` to get the next page. */
export async function fetchEvents(before?: string) {
  let q = supabase.from('events').select(EVENT_SELECT).order('ts', { ascending: false }).limit(EVENT_PAGE);
  if (before) q = q.lt('ts', before);
  const { data, error } = await q.returns<EventRow[]>();
  if (error) throw error;
  return data;
}

/** Signed thumbnail URLs keyed by thumb_path. */
export async function signThumbs(paths: string[]) {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from('clips').createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

export async function signClip(path: string) {
  const { data, error } = await supabase.storage.from('clips').createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

/** Merge rows into a newest-first list, replacing rows with the same id. */
export function mergeEvents(list: EventRow[], rows: EventRow[]) {
  const byId = new Map(list.map((e) => [e.id, e]));
  for (const r of rows) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => b.ts.localeCompare(a.ts));
}
