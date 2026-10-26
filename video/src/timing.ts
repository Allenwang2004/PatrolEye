import timing from './timing.json';

export const FPS = timing.fps;

export type Line = {id: string; text: string; start: number; duration: number; file: string};
export type Scene = {id: string; start: number; duration: number; lines: Line[]};

export const scenes = timing.scenes as Scene[];
export const totalFrames = Math.ceil(timing.total * FPS);

export const sec = (s: number) => Math.round(s * FPS);

export const scene = (id: string): Scene => {
  const s = scenes.find((x) => x.id === id);
  if (!s) throw new Error(`scene ${id} missing from timing.json`);
  return s;
};

/** Frame (relative to its scene) at which a voiceover line starts. */
export const lineStart = (sceneId: string, lineId: string, offsetSec = 0) => {
  const l = scene(sceneId).lines.find((x) => x.id === lineId);
  if (!l) throw new Error(`line ${lineId} missing in ${sceneId}`);
  return sec(l.start + offsetSec);
};

export const lineEnd = (sceneId: string, lineId: string) => {
  const l = scene(sceneId).lines.find((x) => x.id === lineId)!;
  return sec(l.start + l.duration);
};
