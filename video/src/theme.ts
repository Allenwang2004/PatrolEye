import {staticFile} from 'remotion';

// Same palette as web/factory.html, so the recorded app footage and the graphics match.
export const C = {
  bg: '#E4E7E9', // concrete floor
  panel: '#F7F8F9',
  ink: '#0F1A22',
  muted: '#5B6770',
  line: '#C5CCD1',
  signal: '#FF6B1A', // safety orange: where the camera looks, actions in progress
  ok: '#1E8E5A',
  alert: '#D12F2F',
  pcb: '#2F8F5B',
  dark: '#23282D',
  metal: '#C9CCD1',
};

export const UI = 'Barlow, system-ui, sans-serif';
export const NUM = '"Barlow Condensed", Barlow, sans-serif';

const faces: [string, string, string][] = [
  ['Barlow', '400', 'barlow-latin-400-normal.woff2'],
  ['Barlow', '500', 'barlow-latin-500-normal.woff2'],
  ['Barlow', '600', 'barlow-latin-600-normal.woff2'],
  ['Barlow', '700', 'barlow-latin-700-normal.woff2'],
  ['Barlow Condensed', '500', 'barlow-condensed-latin-500-normal.woff2'],
  ['Barlow Condensed', '600', 'barlow-condensed-latin-600-normal.woff2'],
  ['Barlow Condensed', '700', 'barlow-condensed-latin-700-normal.woff2'],
];

/** @font-face rules for the local Barlow files (rendered once in Video.tsx). */
export const fontCss = faces
  .map(([family, weight, file]) => `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:block;src:url("${staticFile(`fonts/${file}`)}") format("woff2");}`)
  .join('\n');

/** Resolves when the faces are usable, or after 8 s at the latest (never blocks a render). */
export const waitForFonts = () =>
  Promise.race([
    Promise.all(faces.map(([family, weight]) => document.fonts.load(`${weight} 40px "${family}"`))),
    new Promise((r) => setTimeout(r, 8000)),
  ]);
