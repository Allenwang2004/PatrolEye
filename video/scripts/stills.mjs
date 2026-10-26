// Render several stills with one bundle: node scripts/stills.mjs out/chk 12.5 30 ... (seconds, global)
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [outDir, ...secs] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const inputProps = {showCaptions: process.env.CAPTIONS === '1'};
const composition = await selectComposition({serveUrl, id: 'PatrolEye', inputProps, browserExecutable});
for (const s of secs) {
  const frame = Math.round(parseFloat(s) * 30);
  const output = path.join(outDir, `s_${String(s).replace('.', '_')}.png`);
  await renderStill({composition, serveUrl, output, frame, inputProps, browserExecutable, timeoutInMilliseconds: 90000});
  console.log('wrote', output);
}
