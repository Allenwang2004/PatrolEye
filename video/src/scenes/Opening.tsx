import React from 'react';
import {AbsoluteFill, Audio, interpolate, interpolateColors, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, rise} from '../anim';
import {Wordmark} from '../components/Logo';
import {sec} from '../timing';
import {C, UI} from '../theme';

/** Length of the cold open, in seconds. Everything else in the video starts after it. */
export const OPEN_SEC = 6.0;
/** Spoken over the logo (tts/script.json "opening"): op0 "PatrolEye." 1.1 s, op1 "An AI camera that spots danger early." 2.7 s. */
const NAME_AT = 1.4;
const SAY_AT = 2.6;
const DANGER_AT = SAY_AT + 1.7; // "…danger early."

const GRADE = 'brightness(1.12) contrast(1.06) saturate(0.92)';
const CLIP_FROM = 34.6; // a1_1.mp4: the head swings round to face the lens

/** Cold open: the real prototype turns to face us, the logo draws itself, and the promise is spoken:
 *  an AI camera that spots danger early. */
export const Opening: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(OPEN_SEC);
  const dim = ease(f, sec(1.2), sec(0.6));
  const push = interpolate(f, [0, dur], [1, 1.08]);
  const out = interpolate(f, [dur - sec(0.35), dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hot = interpolateColors(ease(f, sec(DANGER_AT), 8), [0, 1], ['#D5DCE1', '#FF8A45']);
  return (
    <AbsoluteFill style={{background: '#0F1A22'}}>
      <AbsoluteFill style={{transform: `scale(${push})`, filter: `blur(${dim * 6}px)`}}>
        <OffthreadVideo src={staticFile('real/a1_1.mp4')} startFrom={sec(CLIP_FROM)} muted style={{width: '100%', height: '100%', objectFit: 'cover', filter: GRADE}} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#0F1A22', opacity: dim * 0.7}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30}}>
        <div style={{opacity: ease(f, sec(1.3), 8), marginBottom: 10}}>
          <Wordmark size={130} light sweep={ease(f, sec(1.3), sec(0.9))} />
        </div>
        <div style={{fontFamily: UI, fontWeight: 500, fontSize: 54, color: '#D5DCE1', ...rise(f, sec(SAY_AT), 18, 14)}}>
          An AI camera that spots <span style={{fontWeight: 600, color: hot}}>danger early</span>
        </div>
      </AbsoluteFill>
      <Sequence from={sec(NAME_AT)} layout="none">
        <Audio src={staticFile('audio/op0.wav')} />
      </Sequence>
      <Sequence from={sec(SAY_AT)} layout="none">
        <Audio src={staticFile('audio/op1.wav')} />
      </Sequence>
      {/* hand-off to the hook's light background */}
      <AbsoluteFill style={{background: C.bg, opacity: out}} />
    </AbsoluteFill>
  );
};
