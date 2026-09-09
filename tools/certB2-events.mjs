// certB2 offline digest — parses captures/certB2-fl-main.console.txt, pulls the three
// __dumpRun payloads and CHECKS the ordered event list against the B5 coherence rules.
//   node tools/certB2-events.mjs
import { readFileSync } from 'fs';

const raw = readFileSync('captures/certB2-fl-main.console.txt', 'latin1').split('\n');
const dumps = [];
for (const ln of raw) {
  if (!ln.startsWith('[EVAL] ')) continue;
  let o; try { o = JSON.parse(ln.slice(7)); } catch { continue; }
  if (o && o.order && o.counts) dumps.push(o);
}
// keep the last dump per label
const byLabel = new Map();
for (const d of dumps) byLabel.set(d.label, d);

const parse = (s) => {
  const m = /^([a-z_]+)(?:\(([^)]*)\))?@(\d+)$/.exec(s);
  return m ? { t: m[1], arg: m[2] || null, tk: +m[3] } : { t: s, arg: null, tk: -1 };
};

let fails = 0;
for (const [label, d] of byLabel) {
  const ev = d.order.map(parse);
  const V = [];
  const idx = (t) => ev.findIndex((e) => e.t === t);
  const all = (t) => ev.filter((e) => e.t === t);
  const chk = (ok, msg) => { if (!ok) { V.push(msg); fails++; } };

  // 1. run_start is first
  chk(ev[0] && ev[0].t === 'run_start', 'first event is not run_start');
  // 2. every room_cleared is preceded by a room_start at <= its tick
  for (const c of all('room_cleared')) {
    const st = all('room_start').filter((s) => s.tk <= c.tk);
    chk(st.length > 0, `room_cleared@${c.tk} with no preceding room_start`);
  }
  // 3. every room_start preceded by a room_enter on the same or earlier tick
  for (const s of all('room_start')) {
    chk(all('room_enter').some((e) => e.tk <= s.tk), `room_start@${s.tk} with no room_enter`);
  }
  // 4. every draft_taken preceded by a reward_offer
  for (const t of all('draft_taken')) {
    chk(all('reward_offer').some((r) => r.tk <= t.tk), `draft_taken@${t.tk} with no reward_offer`);
  }
  // 5. every path_chosen preceded by a path_offer
  for (const p of all('path_chosen')) {
    chk(all('path_offer').some((o) => o.tk <= p.tk), `path_chosen@${p.tk} with no path_offer`);
  }
  // 6. shop: open < purchase < close
  const so = all('shop_open'), sp = all('shop_purchase'), sc = all('shop_close');
  if (so.length) {
    chk(sp.every((x) => x.tk >= so[0].tk), 'shop_purchase before shop_open');
    chk(sc.every((x) => x.tk >= so[0].tk), 'shop_close before shop_open');
    chk(sc.every((x) => sp.every((y) => y.tk <= x.tk)), 'shop_close before shop_purchase');
  }
  // 7. boss: at most one boss_spawn; if the run reached room 8 there is exactly one
  const bs = all('boss_spawn'), bd = all('boss_death');
  const reachedBoss = ev.some((e) => e.t === 'room_enter' && /r8/.test(e.arg || ''));
  chk(bs.length <= 1, `boss_spawn fired ${bs.length} times`);
  if (reachedBoss) chk(bs.length === 1, 'reached room 8 but boss_spawn count != 1');
  if (bs.length) chk(/r8/.test((ev.find((e) => e.t === 'room_enter' && e.tk === bs[0].tk) || {}).arg || 'r8'), 'boss_spawn outside room 8');
  // 8. boss_adds only after boss_spawn, boss_death after boss_spawn
  for (const a of all('boss_adds')) chk(bs.length && a.tk >= bs[0].tk, `boss_adds@${a.tk} before boss_spawn`);
  for (const x of bd) chk(bs.length && x.tk > bs[0].tk, `boss_death@${x.tk} not after boss_spawn`);
  // 9. run_end: exactly one, last-ish; victory requires a preceding boss_death
  const re = all('run_end');
  chk(re.length === 1, `run_end count ${re.length}`);
  if (re.length && /victory/.test(re[0].arg || '')) chk(bd.length === 1 && bd[0].tk < re[0].tk, 'victory without a preceding boss_death');
  // 10. run_wiped never before run_end; director_stop with run_end
  for (const w of all('run_wiped')) chk(!re.length || w.tk >= re[0].tk, `run_wiped@${w.tk} before run_end`);
  // 11. nothing after run_end except run_wiped/director_stop/room_cleared/defeat/victory/return_to_camp
  if (re.length) {
    const tail = ev.filter((e) => e.tk > re[0].tk).map((e) => e.t);
    const okTail = ['run_wiped', 'director_stop', 'room_cleared', 'defeat', 'victory', 'return_to_camp'];
    chk(tail.every((t) => okTail.includes(t)), `unexpected events after run_end: ${tail.join(',')}`);
  }
  // 12. monotonic ticks
  for (let i = 1; i < ev.length; i++) chk(ev[i].tk >= ev[i - 1].tk, `tick goes backwards at ${ev[i].t}@${ev[i].tk}`);

  const c = d.counts;
  console.log(`\n=== run "${label}"  seed ${d.seed}  events ${ev.length}`);
  console.log(`    counts: room_enter ${c.room_enter || 0}, room_start ${c.room_start || 0}, room_cleared ${c.room_cleared || 0}, reward_offer ${c.reward_offer || 0}, draft_taken ${c.draft_taken || 0}, path_offer ${c.path_offer || 0} = path_chosen ${c.path_chosen || 0}, shop ${c.shop_open || 0}/${c.shop_purchase || 0}/${c.shop_close || 0}, boss_spawn ${c.boss_spawn || 0}, boss_adds ${c.boss_adds || 0}, run_end ${c.run_end || 0}, run_wiped ${c.run_wiped || 0}`);
  console.log(`    violations: ${V.length ? V.join(' | ') : 'NONE'}`);
}
console.log(`\nTOTAL VIOLATIONS: ${fails}`);
console.log('seeds:', JSON.stringify([...byLabel.values()].map((d) => [d.label, d.seed])));
