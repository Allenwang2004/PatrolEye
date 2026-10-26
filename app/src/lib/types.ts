// Row types for the tables in docs/v2/ARCHITECTURE.md

export type Device = {
  id: string;
  owner_id: string | null;
  name: string | null;
  room: string | null;
  created_at: string;
  claimed_at: string | null;
};

export type DeviceStatus = 'idle' | 'patrolling' | 'scanning' | 'error';

export type DeviceState = {
  device_id: string;
  last_seen: string | null;
  status: DeviceStatus;
  masks_version: number;
  app_version: string | null;
};

export type CommandStatus = 'pending' | 'running' | 'done' | 'error';

export type DeviceCommand = {
  id: string;
  device_id: string;
  type: 'scan' | 'apply_masks';
  payload: Record<string, unknown>;
  status: CommandStatus;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type Scan = {
  id: string;
  device_id: string;
  pano_path: string;
  width: number;
  height: number;
  pan0: number;
  pan1: number;
  tilt0: number;
  tilt1: number;
  px_per_deg: number;
  created_at: string;
};

export type MaskRect = { pan0: number; pan1: number; tilt0: number; tilt1: number };

export type Masks = {
  id: string;
  device_id: string;
  scan_id: string | null;
  version: number;
  rects: MaskRect[];
  created_at: string;
};

export type Severity = 'info' | 'warning' | 'critical';

export type PatrolEvent = {
  id: string;
  device_id: string;
  ts: string;
  type: string;
  severity: Severity;
  title: string;
  detail: string | null;
  checkpoint: string | null;
  clip_path: string | null;
  thumb_path: string | null;
  meta: Record<string, unknown>;
  acked_at: string | null;
  acked_by: string | null;
};
