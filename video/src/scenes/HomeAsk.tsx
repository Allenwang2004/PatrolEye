import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, rise, sceneFade} from '../anim';
import {scene, sec} from '../timing';
import {C, UI} from '../theme';

const S = 'homeAsk';
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

/** `bottom`: raise it above the narration caption when both are on screen. */
const Quote: React.FC<{text: string; who: string; at: number; bottom?: number}> = ({text, who, at, bottom = 64}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'flex-start', paddingBottom: bottom, paddingLeft: 72}}>
      <div style={{background: 'rgba(15,26,34,0.82)', color: '#fff', borderRadius: 12, padding: '14px 28px', maxWidth: 1020, textAlign: 'left', ...rise(f, at, 12, 10)}}>
        <span style={{fontFamily: UI, fontWeight: 600, fontSize: 22, letterSpacing: 2, color: C.signal, marginRight: 16}}>{who}</span>
        <span style={{fontFamily: UI, fontSize: 40, fontWeight: 500}}>{text}</span>
      </div>
    </AbsoluteFill>
  );
};

const PHONE_H = 960;
const PHONE_W = PHONE_H * (1206 / 2622);
/** a3.mp4 is a 720 x 1566 screen recording; one of its pixels is K px on the phone screen. */
const K = PHONE_H / 1566;
const APP_FONT = '-apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const Phone: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{width: PHONE_W + 28, height: PHONE_H + 28, borderRadius: 64, background: '#0F1A22', padding: 14, boxShadow: '0 30px 80px rgba(0,0,0,0.35)'}}>
    <div style={{position: 'relative', width: PHONE_W, height: PHONE_H, borderRadius: 52, overflow: 'hidden', background: '#fff'}}>{children}</div>
  </div>
);

/** Painted over the recording: suggestion chips that fit a home check, and no browser bar or address at the bottom. */
const AppOverlay: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 0, top: 1132 * K, width: PHONE_W, height: (1216 - 1132) * K, background: 'rgb(237,239,234)'}} />
    <div style={{position: 'absolute', left: 30 * K, top: 1146 * K, display: 'flex', gap: 16 * K, whiteSpace: 'nowrap'}}>
      {['Is she up and moving?', 'Is the stove off?', 'Anyone on the floor?'].map((t) => (
        <div key={t} style={{height: 60 * K, borderRadius: 30 * K, padding: `0 ${26 * K}px`, display: 'flex', alignItems: 'center', background: '#FBFDFA',
          border: '1px solid #D7DBD4', fontFamily: APP_FONT, fontSize: 28 * K, color: '#2B302C'}}>{t}</div>
      ))}
    </div>
    <div style={{position: 'absolute', left: 0, top: 1392 * K, width: PHONE_W, height: PHONE_H - 1392 * K, background: 'rgb(237,239,236)'}} />
    <div style={{position: 'absolute', left: (PHONE_W - 150) / 2, bottom: 9, width: 150, height: 5, borderRadius: 3, background: '#1A1C1A'}} />
  </>
);

/** At home: instead of waiting for a report, the caregiver asks it to check (real footage). */
export const HomeAsk: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  // cut list (scene seconds)
  const cut = {ask: 0, run: 3.4, answer: 6.4, end: 10.7};
  const runLen = cut.answer - cut.run;
  const A3_RUN_FROM = 7.5; // the question card has just appeared in the app
  const A3_ANSWER = 31.5; // the answer appears at ~31.7 s; the recording ends at 33.0 s
  const rate = (A3_ANSWER - A3_RUN_FROM) / runLen; // the ~26 s wait, sped up
  const local = f - sec(cut.run);
  const fast = local >= 0 && local < sec(runLen) ? ease(local, 0, 6) * (1 - ease(local, sec(runLen) - 6, 6)) : 0;
  return (
    <AbsoluteFill style={{background: '#0F1A22', opacity: sceneFade(f, dur, 10, 6)}}>
      <Sequence from={sec(cut.ask)} durationInFrames={sec(cut.run - cut.ask)}>
        <Clip file="a4.mp4" from={7.4} />
        {/* the ha1 caption (two lines) sits underneath, so this goes above it */}
        <Quote who="ASKED ALOUD" text="“Hey, is the stove closed?”" at={6} bottom={212} />
      </Sequence>
      {/* the question running: rig on the left, the phone app on the right */}
      <Sequence from={sec(cut.run)} durationInFrames={sec(cut.end - cut.run)}>
        <AbsoluteFill style={{background: C.bg}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1160, height: 1080, overflow: 'hidden'}}>
            <Clip file="a1_2.mp4" from={17.5} style={{objectPosition: '40% 50%'}} />
          </div>
          <div style={{position: 'absolute', left: 1160, top: 0, width: 760, height: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Phone>
              <Sequence durationInFrames={sec(runLen)} layout="none">
                <Clip file="a3.mp4" from={A3_RUN_FROM} rate={rate} style={{filter: 'none'}} />
              </Sequence>
              <Sequence from={sec(runLen)} durationInFrames={sec(1.4)} layout="none">
                <Clip file="a3.mp4" from={A3_ANSWER} style={{filter: 'none'}} />
              </Sequence>
              <Sequence from={sec(runLen + 1.4)} layout="none">
                <Img src={staticFile('real/a3_last.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </Sequence>
              <AppOverlay />
              {fast > 0 && (
                <div style={{position: 'absolute', left: 0, top: 330 * K, width: PHONE_W - 30 * K, display: 'flex', justifyContent: 'flex-end', opacity: fast}}>
                  <div style={{fontFamily: UI, fontWeight: 600, fontSize: 18, letterSpacing: 2, color: '#fff', background: 'rgba(15,26,34,0.85)', borderRadius: 999, padding: '6px 16px'}}>
                    SPED UP {Math.round(rate)}×
                  </div>
                </div>
              )}
            </Phone>
          </div>
        </AbsoluteFill>
        <Sequence from={sec(runLen + 0.25)}>
          {/* the phone recording stops 1.3 s into the spoken answer, so the answer is re-voiced from its on-screen text */}
          <Audio src={staticFile('audio/device_answer.wav')} />
          <Quote who="PATROLEYE" text="“Yeah, it looks off to me. I don't see any flames on the burners.”" at={0} />
        </Sequence>
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
