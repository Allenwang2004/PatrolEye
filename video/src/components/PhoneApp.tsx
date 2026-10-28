import React from 'react';
import {Img, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {ease} from '../anim';

/** Screens of the PatrolEye Expo app (app/), rendered from its web build at 390 x 797 CSS px, 2x (public/app/*.png).
 *  A phone status bar (47 CSS px) is drawn above them. */
const CSS_W = 390;
const STATUS_H = 47;
const APP_H = 797;
export const SCREEN_H = 960;
export const K = SCREEN_H / (STATUS_H + APP_H); // screen px per CSS px
export const SCREEN_W = CSS_W * K;
const APP_FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';

const StatusBar: React.FC<{time: string}> = ({time}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: STATUS_H * K, background: '#FFFFFF'}}>
    <div style={{position: 'absolute', left: 34 * K, top: 15 * K, fontFamily: APP_FONT, fontWeight: 600, fontSize: 16.5 * K, color: '#11181C', letterSpacing: -0.2}}>{time}</div>
    <div style={{position: 'absolute', left: (CSS_W - 122) / 2 * K, top: 10 * K, width: 122 * K, height: 34 * K, borderRadius: 17 * K, background: '#000'}} />
    <svg width={74 * K} height={14 * K} viewBox="0 0 74 14" style={{position: 'absolute', right: 26 * K, top: 18 * K}}>
      {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 5} y={10 - i * 3} width={3.4} height={4 + i * 3} rx={0.8} fill="#11181C" />)}
      <path d="M27 5.2a10 10 0 0 1 13 0M29.4 7.6a6.5 6.5 0 0 1 8.2 0M31.8 10a3 3 0 0 1 3.4 0" stroke="#11181C" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <rect x={47} y={1.5} width={23} height={11} rx={3.2} stroke="#11181C" strokeOpacity={0.4} strokeWidth={1.2} fill="none" />
      <rect x={49} y={3.5} width={16} height={7} rx={1.6} fill="#11181C" />
      <rect x={71.2} y={5} width={1.6} height={4} rx={0.8} fill="#11181C" fillOpacity={0.4} />
    </svg>
  </div>
);

export const PhoneFrame: React.FC<{time: string; children: React.ReactNode}> = ({time, children}) => (
  <div style={{width: SCREEN_W + 28, height: SCREEN_H + 28, borderRadius: 64, background: '#0F1A22', padding: 14, boxShadow: '0 30px 80px rgba(15,26,34,0.28)'}}>
    <div style={{position: 'relative', width: SCREEN_W, height: SCREEN_H, borderRadius: 52, overflow: 'hidden', background: '#F5F6F8'}}>
      <div style={{position: 'absolute', left: 0, top: STATUS_H * K, width: SCREEN_W, height: APP_H * K, overflow: 'hidden'}}>{children}</div>
      <StatusBar time={time} />
      <div style={{position: 'absolute', left: (SCREEN_W - 140) / 2, bottom: 8, width: 140, height: 5, borderRadius: 3, background: '#11181C'}} />
    </div>
  </div>
);

/** One app screen filling the app area. */
export const Screen: React.FC<{name: string; style?: React.CSSProperties}> = ({name, style}) => (
  <Img src={staticFile(`app/${name}.png`)} style={{position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: APP_H * K, ...style}} />
);

/** A finger tap at (x, y) in CSS px of the app. */
export const Tap: React.FC<{x: number; y: number; at: number}> = ({x, y, at}) => {
  const f = useCurrentFrame();
  const o = ease(f, at - 4, 4) * (1 - ease(f, at + 6, 6));
  if (o <= 0) return null;
  const r = 22 * K * (1 - 0.15 * ease(f, at, 5));
  return <div style={{position: 'absolute', left: x * K - r, top: y * K - r, width: 2 * r, height: 2 * r, borderRadius: r, background: 'rgba(17,24,28,0.22)', border: '2px solid rgba(255,255,255,0.7)', opacity: o}} />;
};

/** iOS-style push from screen `from` to screen `to`: k goes 0 → 1. */
export const Push: React.FC<{k: number; from: React.ReactNode; to: React.ReactNode}> = ({k, from, to}) => (
  <>
    <div style={{position: 'absolute', inset: 0, transform: `translateX(${-0.3 * SCREEN_W * k}px)`}}>
      {from}
      <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.08 * k})`}} />
    </div>
    {k > 0 && (
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - k) * SCREEN_W}px)`, boxShadow: '-8px 0 24px rgba(0,0,0,0.12)'}}>{to}</div>
    )}
  </>
);

/** The event's clip, in the event page's video box (16, 80, 358 x 201 CSS px, rounded 14). */
export const ClipInApp: React.FC<{src: string; from: number}> = ({src, from}) => (
  <div style={{position: 'absolute', left: 16 * K, top: 80 * K, width: 358 * K, height: (358 * 9) / 16 * K, borderRadius: 14 * K, overflow: 'hidden', background: '#000'}}>
    <OffthreadVideo src={staticFile(src)} startFrom={from} muted style={{width: '100%', height: '100%', objectFit: 'contain'}} />
  </div>
);
