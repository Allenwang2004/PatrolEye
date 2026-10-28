import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, sceneFade} from '../anim';
import {ClipInApp, PhoneFrame, Push, Screen, Tap} from '../components/PhoneApp';
import {lineStart, scene, sec} from '../timing';
import {C, UI} from '../theme';

const S = 'homeAsk';
const GRADE = 'brightness(1.12) contrast(1.06) saturate(0.92)';

/** One clip from public/real/, trimmed: `src` seconds [from, from + len·rate), shown for `len` seconds. */
const Clip: React.FC<{file: string; from: number; rate?: number; style?: React.CSSProperties}> = ({file, from, rate = 1, style}) => (
  <OffthreadVideo
    src={staticFile(`real/${file}`)}
    startFrom={sec(from)}
    playbackRate={rate}
    muted
    style={{width: '100%', height: '100%', objectFit: 'cover', filter: GRADE, ...style}}
  />
);

/** The round's report: the rig checks each spot (real footage); the PatrolEye app gets the report,
 *  and its clip shows the stove is off. The clip is the camera's own view of the stove from the prototype run
 *  (a3.mp4, cropped to the camera image); the app screens are its web build with that report as sample data. */
export const HomeAsk: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const a = lineStart(S, 'ha1'); // "On every round, it checks each spot and reports to the app. | Open a report, and the clip shows the stove really is off."
  const splitAt = sec(3.0);
  const split = ease(f, splitAt, 12);
  const reportAt = a + sec(3.0);
  const tapAt = a + sec(4.05);
  const banner = ease(f, reportAt, 6);
  const push = ease(f, tapAt + 3, 10);
  const clipAt = tapAt + 3; // the clip is already playing as the event page slides in
  const phoneIn = ease(f, splitAt + 4, 14);
  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur, 10, 6)}}>
      {/* the camera on its round (real footage): full frame, then on the left */}
      <AbsoluteFill style={{opacity: 1 - split}}>
        <Clip file="a1_2.mp4" from={14.5} />
      </AbsoluteFill>
      {split > 0 && (
        <AbsoluteFill style={{opacity: split}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1160, height: 1080, overflow: 'hidden'}}>
            <Sequence from={splitAt} layout="none">
              <Clip file="a1_2.mp4" from={17.5} style={{objectPosition: '40% 50%'}} />
            </Sequence>
          </div>
        </AbsoluteFill>
      )}

      {/* the caregiver's PatrolEye app */}
      {phoneIn > 0 && (
        <div style={{position: 'absolute', left: 1160 + (760 - 471.6) / 2, top: 46, opacity: phoneIn, transform: `translateY(${(1 - phoneIn) * 30}px)`}}>
          <PhoneFrame time="9:31">
            <Push
              k={push}
              from={<>
                <Screen name="a0_cameras" />
                {banner > 0 && <Screen name="a1_report" style={{opacity: banner}} />}
              </>}
              to={<>
                <Screen name="a2_detail" />
                <Sequence from={clipAt} layout="none">
                  <ClipInApp src="app/stove_clip.mp4" from={sec(2.0)} />
                </Sequence>
              </>}
            />
            <Tap x={195} y={36} at={tapAt} />
          </PhoneFrame>
        </div>
      )}

      {/* label: the camera footage is real */}
      <AbsoluteFill style={{padding: '60px 72px', pointerEvents: 'none'}}>
        <div style={{alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(15,26,34,0.75)', borderRadius: 999, padding: '10px 22px', opacity: ease(f, sec(0.3), 10)}}>
          <span style={{width: 12, height: 12, borderRadius: 6, background: C.signal}} />
          <span style={{fontFamily: UI, fontWeight: 600, fontSize: 24, letterSpacing: 2, color: '#fff'}}>WORKING PROTOTYPE · REAL FOOTAGE</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
