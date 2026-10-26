import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, Sequence, staticFile} from 'remotion';
import {Captions} from './components/Captions';
import {Final} from './scenes/Final';
import {Bench} from './scenes/Bench';
import {Editions} from './scenes/Editions';
import {Hook} from './scenes/Hook';
import {HomeAsk} from './scenes/HomeAsk';
import {HomeProblem} from './scenes/HomeProblem';
import {HomeRounds} from './scenes/HomeRounds';
import {OPEN_SEC, Opening} from './scenes/Opening';
import {HowProduct} from './scenes/HowProduct';
import {Plant} from './scenes/Plant';
import {Options} from './scenes/Problem';
import {Proto} from './scenes/Proto';
import {scenes, sec} from './timing';
import {C, fontCss, waitForFonts} from './theme';

export type VideoProps = {
  showCaptions: boolean;
  showFootageGuide: boolean;
  showSteps: boolean;
  voiceover: boolean;
  demoA: string; // e.g. "footage/demoA.mp4" (inside public/); empty = shot guide
  demoB: string;
  githubUrl: string;
};

export const defaultProps: VideoProps = {
  showCaptions: true,
  showFootageGuide: true,
  showSteps: true,
  voiceover: true,
  demoA: '',
  demoB: '',
  githubUrl: 'github.com/Allenwang2004/PatrolEye',
};

export const PatrolEyeVideo: React.FC<VideoProps> = (p) => {
  const [handle] = useState(() => delayRender('fonts', {timeoutInMilliseconds: 60000}));
  useEffect(() => {
    waitForFonts().then(() => continueRender(handle));
  }, [handle]);

  const render = (id: string) => {
    switch (id) {
      case 'hook':
        return <Hook />;
      case 'homeProblem':
        return <HomeProblem />;
      case 'options':
        return <Options />;
      case 'editions':
        return <Editions />;
      case 'bench':
        return <Bench />;
      case 'homeRounds':
        return <HomeRounds />;
      case 'homeAsk':
        return <HomeAsk />;
      case 'proto':
        return <Proto />;
      case 'plant':
        return <Plant />;
      case 'how':
        return <HowProduct />;
      case 'close':
        return <Final githubUrl={p.githubUrl} />;
      default:
        return null;
    }
  };

  return (
    <AbsoluteFill style={{background: C.bg}}>
      <style>{fontCss}</style>
      <Sequence name="open" durationInFrames={sec(OPEN_SEC)}>
        <Opening />
      </Sequence>
      <Sequence name="main" from={sec(OPEN_SEC)}>
      {scenes.map((s) => (
        <Sequence key={s.id} name={s.id} from={sec(s.start)} durationInFrames={sec(s.duration)}>
          {render(s.id)}
          {p.voiceover &&
            s.lines.map((l) => (
              <Sequence key={l.id} name={`vo ${l.id}`} from={sec(l.start)} layout="none">
                <Audio src={staticFile(l.file)} />
              </Sequence>
            ))}
        </Sequence>
      ))}
      {p.showCaptions && <Captions />}
      </Sequence>
    </AbsoluteFill>
  );
};
