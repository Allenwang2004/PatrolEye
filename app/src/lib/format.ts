import type { DeviceState, DeviceStatus } from '@/lib/types';

/** ARCHITECTURE.md: a camera is online if it reported within the last 90 s. */
export const ONLINE_WINDOW_MS = 90_000;

export function isOnline(state: DeviceState | null | undefined, now = Date.now()) {
  if (!state?.last_seen) return false;
  return now - new Date(state.last_seen).getTime() < ONLINE_WINDOW_MS;
}

const STATUS_LABEL: Record<DeviceStatus, string> = {
  idle: 'Idle',
  patrolling: 'Patrolling',
  scanning: 'Scanning',
  error: 'Error',
};

export function statusLabel(status: DeviceStatus) {
  return STATUS_LABEL[status] ?? status;
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString();
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function deviceTitle(d: { name: string | null; id: string }) {
  return d.name?.trim() || `Camera ${d.id.slice(0, 4).toUpperCase()}`;
}
