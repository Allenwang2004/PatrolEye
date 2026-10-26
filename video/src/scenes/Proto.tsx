import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, rise, sceneFade} from '../anim';
import {scene, sec} from '../timing';
import {C, UI} from '../theme';

const S = 'proto';
const GRADE = 'brightness(1.12) contrast(1.06) saturate(0.92)';

/** One clip from public/real/, trimmed: `src` seconds [from, from + len·rate), shown for `len` seconds. */
const Clip: React.FC<{file: string; from: number; rate?: number; volume?: number; style?: React.CSSProperties}> = ({file, from, rate = 1, volume = 0, style}) => (
  <OffthreadVideo
    src={staticFile(`real/${file}`)}
    startFrom={sec(from)}
    playbackRate={rate}
    volume={volume}
    muted={volume === 0}
    style={{width: '100%', height: '100%', objectFit: 'cover', filter: GRADE, ...style}}
  />
);

const Quote: React.FC<{text: string; who: string; at: number}> = ({text, who, at}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'flex-start', paddingBottom: 64, paddingLeft: 72}}>
      <div style={{background: 'rgba(15,26,34,0.82)', color: '#fff', borderRadius: 12, padding: '14px 28px', maxWidth: 1020, textAlign: 'left', ...rise(f, at, 12, 10)}}>
        <span style={{fontFamily: UI, fontWeight: 600, fontSize: 22, letterSpacing: 2, color: C.signal, marginRight: 16}}>{who}</span>
        <span style={{fontFamily: UI, fontSize: 40, fontWeight: 500}}>{text}</span>
      </div>
    </AbsoluteFill>
  );
};

const Phone: React.FC<{children: React.ReactNode; height: number}> = ({children, height}) => {
  const w = height * (1206 / 2622);
  return (
    <div style={{width: w + 28, height: height + 28, borderRadius: 64, background: '#0F1A22', padding: 14, boxShadow: '0 30px 80px rgba(0,0,0,0.35)'}}>
      <div style={{width: w, height, borderRadius: 52, overflow: 'hidden', background: '#fff'}}>{children}</div>
    </div>
  );
};

export const Proto: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  // cut list (scene seconds)
  const cut = {lens: 0, rig: 5.65}; // the lens close-up holds through p1; the rig turns under p2
  return (
    <AbsoluteFill style={{background: '#0F1A22', opacity: sceneFade(f, dur, 10, 6)}}>
      <Sequence from={sec(cut.lens)} durationInFrames={sec(cut.rig - cut.lens)}>
        <Clip file="c3.mp4" from={0.2} />
      </Sequence>
      {/* one continuous take of the rig turning (no second clip, so no jump) */}
      <Sequence from={sec(cut.rig)}>
        <Clip file="a1_2.mp4" from={0.4} />
      </Sequence>
      {/* label: this part is real */}
      <AbsoluteFill style={{padding: '60px 72px', pointerEvents: 'none'}}>
        <div style={{alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(15,26,34,0.75)', borderRadius: 999, padding: '10px 22px', opacity: ease(f, sec(0.3), 10)}}>
          <span style={{width: 12, height: 12, borderRadius: 6, background: C.signal}} />
          <span style={{fontFamily: UI, fontWeight: 600, fontSize: 24, letterSpacing: 2, color: '#fff'}}>WORKING PROTOTYPE · REAL FOOTAGE</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
