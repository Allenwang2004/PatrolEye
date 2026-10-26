import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {ease, rise, sceneFade} from '../anim';
import {lineStart, scene, sec} from '../timing';
import {C, UI} from '../theme';

const S = 'editions';
const GRADE = 'brightness(1.1) contrast(1.06) saturate(0.95)';

const Panel: React.FC<{x: number; src: string; from: number; kicker: string; title: string; sub: string; inAt: number; hot: number; dim: number}> = ({x, src, from, kicker, title, sub, inAt, hot, dim}) => {
  const f = useCurrentFrame();
  const o = ease(f, inAt, 16);
  return (
    <div style={{position: 'absolute', left: x, top: 200, width: 820, opacity: o * (1 - 0.45 * dim), transform: `translateY(${(1 - o) * 30}px) scale(${1 + 0.025 * hot})`, transformOrigin: '50% 40%'}}>
      <div style={{width: 820, height: 461, borderRadius: 18, overflow: 'hidden', background: C.ink, border: `5px solid ${hot > 0.5 ? C.signal : 'transparent'}`, boxShadow: '0 20px 60px rgba(15,26,34,0.22)', position: 'relative'}}>
        <OffthreadVideo src={staticFile(src)} startFrom={sec(from)} muted style={{width: '100%', height: '100%', objectFit: 'cover', filter: GRADE}} />
        <div style={{position: 'absolute', left: 18, top: 16, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(15,26,34,0.72)', borderRadius: 999, padding: '7px 16px'}}>
          <span style={{width: 10, height: 10, borderRadius: 5, background: C.signal}} />
          <span style={{fontFamily: UI, fontWeight: 600, fontSize: 18, letterSpacing: 2, color: '#fff'}}>REAL FOOTAGE</span>
        </div>
      </div>
      <div style={{marginTop: 26, fontFamily: UI, fontWeight: 600, fontSize: 24, letterSpacing: 4, color: hot > 0.5 ? C.signal : C.muted}}>{kicker}</div>
      <div style={{fontFamily: UI, fontWeight: 600, fontSize: 44, color: C.ink, marginTop: 6}}>{title}</div>
      <div style={{fontFamily: UI, fontSize: 28, color: C.muted, marginTop: 6, lineHeight: 1.3}}>{sub}</div>
    </div>
  );
};

/** One product, two editions: the plant edition with a depth camera, the home edition with a webcam. */
export const Editions: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const e = lineStart(S, 'e1');
  const plantHot = ease(f, e + sec(1.88), 8); // "for plants"
  const homeHot = ease(f, e + sec(3.66), 8); // "and for homes, with a webcam"
  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur)}}>
      <div style={{position: 'absolute', left: 90, top: 60, ...rise(f, 0, 16, 14)}}>
        <div style={{fontFamily: UI, fontWeight: 600, fontSize: 30, letterSpacing: 4, color: C.signal}}>TWO EDITIONS</div>
        <div style={{fontFamily: UI, fontSize: 28, color: C.muted, marginTop: 4}}>Same software, same AI module</div>
      </div>
      <Panel x={90} src="real/realsense.mp4" from={1.0} kicker="FOR PLANTS" title="Depth camera"
        sub="Measures size and distance, even in the dark" inAt={sec(0.4)} hot={plantHot * (1 - homeHot)} dim={homeHot} />
      <Panel x={1010} src="real/a1_2.mp4" from={27} kicker="FOR HOMES" title="Webcam, voice, phone app"
        sub="Ask out loud, or from the caregiver's phone" inAt={sec(0.7)} hot={homeHot} dim={plantHot * (1 - homeHot)} />
    </AbsoluteFill>
  );
};
