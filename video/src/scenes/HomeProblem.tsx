import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, rise, sceneFade} from '../anim';
import {HomeRoom} from '../components/HomeRoom';
import {lineStart, scene, sec} from '../timing';
import {C, NUM, UI} from '../theme';

const S = 'homeProblem';
const ZH = '"Noto Sans CJK TC", "PingFang TC", "Microsoft JhengHei", sans-serif';

type Row = {d: string; t: string; at: number; tone: 'ok' | 'alert' | 'ink'};

/** A real headline, quoted as text: outlet and date, the original Chinese headline, and what it says in English. */
const News: React.FC<{meta: string; zh: string; en: string; at: number; style?: React.CSSProperties}> = ({meta, zh, en, at, style}) => {
  const f = useCurrentFrame();
  return (
    <div style={{background: '#fff', borderRadius: 16, padding: '16px 22px 18px', boxShadow: '0 10px 30px rgba(15,26,34,0.10)', borderLeft: `6px solid ${C.alert}`, ...rise(f, at, 18), ...style}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <span style={{fontFamily: UI, fontWeight: 700, fontSize: 17, letterSpacing: 2, color: '#fff', background: C.alert, borderRadius: 6, padding: '2px 9px'}}>NEWS</span>
        <span style={{fontFamily: UI, fontWeight: 600, fontSize: 20, color: C.muted}}>{meta}</span>
      </div>
      {/* a space in the headline is where the outlet broke it; keep each part on its own line */}
      <div style={{fontFamily: ZH, fontWeight: 700, fontSize: 30, color: C.ink, marginTop: 8, lineHeight: 1.25}}>
        {zh.split(' ').map((part) => (
          <div key={part}>{part}</div>
        ))}
      </div>
      <div style={{fontFamily: UI, fontSize: 22, color: C.muted, marginTop: 6, lineHeight: 1.3}}>{en}</div>
    </div>
  );
};

/** Older people living alone: a pot left burning while the smoke alarm goes unheard,
 *  then a fall that nobody sees until the next visit. */
export const HomeProblem: React.FC = () => {
  const f = useCurrentFrame();
  const dur = sec(scene(S).duration);
  const p1 = lineStart(S, 'hp1');
  const p2 = lineStart(S, 'hp2');
  const p3 = lineStart(S, 'hp3');
  const T2 = (o: number) => p2 + sec(o);
  const T = (o: number) => p3 + sec(o);

  // beat 1 (hp2): an evening, a pot left on the stove, the smoke alarm goes off and she does not hear it
  const beat1 = ease(f, p2 - sec(0.3), 10) * (1 - ease(f, p3 - sec(0.35), 8));
  const stoveOn = ease(f, T2(1.6), 8) * beat1; // "pots are left burning on the stove"
  const smoke = ease(f, T2(2.4), sec(1.4)) * beat1;
  const alarm = ease(f, T2(3.9), 6) * beat1; // "and smoke alarms go unheard"

  // beat 2 (hp3): the next morning she falls; the daily call goes unanswered. hp3's phrases:
  // "Caregivers can't watch a camera all day," 0–2.3 s | "so by the time anyone notices," 2.9–4.5 s | "it's often too late." 5.0–6.2 s
  const standAt = T(0.9);
  const fallAt = T(1.7);
  const call1 = T(2.9);
  const eve = T(3.8);
  const call2 = T(4.6);
  const fall = f < fallAt ? 0 : Math.min(1, (f - fallAt) / sec(0.55));
  const ring = (f >= call1 && f < eve ? 1 : 0) + (f >= call2 ? 1 : 0);
  const dim = Math.max(0.55 * beat1, ease(f, eve, 8) * (1 - ease(f, call2 - 6, 8)));
  const badge =
    f < p2 - sec(0.3) ? 'Tue 17:50' : f < p3 - sec(0.35) ? 'Tue 18:20' : f < standAt ? 'Wed 09:40' : f < call1 ? 'Wed 09:58' : f < eve ? 'Wed 10:00' : f < call2 ? 'Wed 21:00' : 'Thu 10:00';

  const rows: Row[] = [
    {d: 'Mon', t: 'Caregiver visit', at: T(0.3), tone: 'ok'},
    {d: 'Tue', t: 'Daily call · answered', at: T(0.9), tone: 'ok'},
    {d: 'Wed', t: 'Daily call · no answer', at: call1 + 4, tone: 'alert'},
    {d: 'Thu', t: 'Daily call · no answer', at: call2 + 4, tone: 'alert'},
    {d: 'Fri', t: 'Next visit', at: T(5.1), tone: 'ink'},
  ];
  const newsOut = 1 - ease(f, p3 - sec(0.35), 8);

  return (
    <AbsoluteFill style={{background: C.bg, opacity: sceneFade(f, dur)}}>
      <div style={{position: 'absolute', left: 80, top: 132, transform: 'scale(0.94)', transformOrigin: '0 0'}}>
        <HomeRoom
          draw={ease(f, 0, sec(2.0))}
          pose={f < standAt ? 'sit' : 'stand'}
          fall={fall}
          stove={stoveOn}
          smoke={smoke}
          alarm={alarm}
          ring={ring}
          pulse={f / 30}
          badge={badge}
          dim={dim}
          calDay={f < p3 - sec(0.35) ? 1 : f < call2 ? 2 : 3}
        />
      </div>

      <div style={{position: 'absolute', left: 1250, top: 132, width: 610}}>
        <div style={{fontFamily: UI, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: C.signal, ...rise(f, p1 + sec(0.2))}}>LIVING ALONE</div>
        <div style={{fontFamily: UI, fontWeight: 600, fontSize: 52, color: C.ink, lineHeight: 1.12, marginTop: 10, ...rise(f, p1 + sec(1.1))}}>
          <span style={{fontFamily: NUM, fontWeight: 700, color: C.signal}}>713,600</span> people over 65 in Taiwan live alone.
        </div>
        <div style={{fontFamily: UI, fontSize: 22, color: C.muted, marginTop: 10, ...rise(f, p1 + sec(2.2), 12)}}>Ministry of the Interior, Q1 2026 · a record high</div>

        <div style={{position: 'relative', marginTop: 30, height: 440}}>
          {/* beat 1: two real 2026 headlines (a stove forgotten, a fatal fire) */}
          {newsOut > 0.001 && (
            <div style={{position: 'absolute', left: 0, top: 0, width: 610, opacity: newsOut}}>
              <News at={T2(1.8)} meta="TVBS News · 17 Sep 2026" zh="8旬嬤燉肉「跑去看醫生」半小時返家 鍋燒黑濃煙密布"
                en="Woman in her 80s left a stew on and went to the doctor. Half an hour later, her home was full of smoke." />
              <News at={T2(3.9)} style={{marginTop: 16}} meta="SETN · 16 Oct 2026" zh="獨居老人慘死火場！防高齡悲劇 政府砸60億欲擋全台70萬獨老死劫"
                en="Man, 69, living alone, died in a house fire. The government now plans NT$6.25 billion to prevent such deaths." />
            </div>
          )}
          {/* beat 2: her week */}
          {f >= p3 - sec(0.1) && (
            <div style={{position: 'absolute', left: 0, top: 0, width: 610}}>
              <div style={{background: '#fff', borderRadius: 16, padding: '20px 26px 16px', boxShadow: '0 10px 30px rgba(15,26,34,0.08)', ...rise(f, p3, 20)}}>
                <div style={{fontFamily: UI, fontWeight: 600, fontSize: 30, color: C.ink}}>Her week</div>
                {rows.map((r) => {
                  const o = ease(f, r.at, 10);
                  const col = r.tone === 'alert' ? C.alert : r.tone === 'ok' ? C.ok : C.ink;
                  return (
                    <div key={r.d} style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: 14, opacity: o, transform: `translateY(${(1 - o) * 10}px)`}}>
                      <span style={{fontFamily: NUM, fontWeight: 600, fontSize: 28, color: C.muted, width: 60}}>{r.d}</span>
                      <span style={{width: 14, height: 14, borderRadius: 7, background: col, flexShrink: 0}} />
                      <span style={{fontFamily: UI, fontSize: 30, color: r.tone === 'alert' ? C.alert : C.ink, fontWeight: r.tone === 'ink' ? 600 : 400}}>{r.t}</span>
                      {r.d === 'Fri' && <span style={{marginLeft: 'auto', fontFamily: UI, fontWeight: 600, fontSize: 22, color: '#fff', background: C.ink, borderRadius: 999, padding: '4px 14px'}}>2 days away</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{fontFamily: UI, fontSize: 24, color: C.muted, marginTop: 22, ...rise(f, T(2.2), 12)}}>
                1 in 6 people over 65 fall each year · Health Promotion Administration
              </div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
