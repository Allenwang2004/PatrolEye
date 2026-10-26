import React from 'react';
import {Composition} from 'remotion';
import {FPS, sec, totalFrames} from './timing';
import {OPEN_SEC} from './scenes/Opening';
import {defaultProps, PatrolEyeVideo} from './Video';

export const Root: React.FC = () => (
  <Composition
    id="PatrolEye"
    component={PatrolEyeVideo}
    durationInFrames={totalFrames + sec(OPEN_SEC)}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={defaultProps}
  />
);
