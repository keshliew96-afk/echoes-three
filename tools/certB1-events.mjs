// certB1 — offline console analyzer: event-order integrity (B5), per-room wall time (B2),
// harness fallbacks, and console hygiene (B6). Judges only what the capture logged.
// usage: node tools/certB1-events.mjs captures/certB1-full.console.txt
import { readFileSync } from 'fs';

const file = process.argv[2];
const lines = readFileSync(file, 'utf8').split(/\r?\n/);
const evals = [];
for (const ln of lines) {
  if (!ln.startsWith('[EVAL] ')) continue;
  try { evals.push(JSON.parse(ln.slice(7))); } catch { evals.push(ln.slice(7)); }
}
const parse = (s) => { const m = /^([a-z_]+)(?:\(([^)]*)\))?@(\d+)$/.exec(s); return m ? { T: m[1], x: m[2] || '', tk: +m[3] } : null; };

// ---- console hygiene
const pageErr = lines.filter((l) => l.startsWith('[PAGEERROR]'));
const errs = lines.filter((l) => l.startsWith('[error]'));
const harness = lines.filter((l) => l.startsWith('[HARNESS-ERROR]'));
const warns = lines.filter((l) => l.startsWith('[warn]'));
const warnKinds = {};
for (const w of warns) { const k = w.replace(/^\[warn\] /, '').slice(0, 90); warnKinds[k] = (warnKinds[k] || 0) + 1; }
const fallbacks = evals.filter((e) => typeof e === 'string' && e.includes('[FALLBACK]'));
const notOk = evals.filter((e) => e && typeof e === 'object' && e.ok === false);
const loops = lines.filter((l) => l.startsWith('[LOOP]'));
const shots = lines.filter((l) => l.startsWith('[SHOT]')).length;
const goto = lines.find((l) => l.startsWith('[GOTO]'));
const dbg = lines.find((l) => l.startsWith('[DEBUG-API]'));
console.log('== console hygiene ==');
console.log(`PAGEERROR ${pageErr.length} | [error] ${errs.length} | HARNESS-ERROR ${harness.length} | [warn] ${warns.length} | shots ${shots} | loops ${loops.length}`);
for (const [k, n] of Object.entries(warnKinds)) console.log(`  warn x${n}: ${k}`);
for (const e of errs) console.log('  ERROR:', e.slice(0, 300));
for (const e of pageErr) console.log('  PAGEERROR:', e.slice(0, 300));
console.log(`fallbacks ${fallbacks.length}`); for (const f of fallbacks) console.log('  ', f);
console.log(`waitFor ok:false ${notOk.length}`); for (const f of notOk) console.log('  ', JSON.stringify(f).slice(0, 300));
console.log(goto); console.log(dbg);

// ---- per-room wall time
console.log('\n== rooms ==');
for (const e of evals) {
  if (e && typeof e === 'object' && e.roomDone != null) {
    console.log(`room ${e.roomDone}: wall ${e.wallSec}s clear ${e.clearSec}s ticks ${e.ticksToClear} iters ${e.iters} hp ${JSON.stringify(e.hp)} counts ${JSON.stringify(e.counts)} dodgeTest ${JSON.stringify(e.dodgeTest)} dodgeEv ${JSON.stringify(e.dodgeEvents)} fpsMin ${e.fpsMin}`);
  }
}

// ---- event integrity per run
console.log('\n== event integrity ==');
const runs = evals.filter((e) => e && typeof e === 'object' && e.label && Array.isArray(e.order));
for (const run of runs) {
  const evs = run.order.map(parse).filter(Boolean);
  const problems = [];
  const idx = (T, from = 0) => evs.findIndex((e, i) => i >= from && e.T === T);
  if (!evs.length || evs[0].T !== 'run_start') problems.push(`first event is ${evs[0] && evs[0].T}, not run_start`);
  for (let i = 1; i < evs.length; i++) if (evs[i].tk < evs[i - 1].tk) problems.push(`tick goes backwards at ${evs[i - 1].T}@${evs[i - 1].tk} -> ${evs[i].T}@${evs[i].tk}`);
  // segment by room_enter
  const segs = [];
  for (let i = 0; i < evs.length; i++) if (evs[i].T === 'room_enter') segs.push({ start: i, room: evs[i].x });
  for (let s = 0; s < segs.length; s++) {
    const a = segs[s].start, b = s + 1 < segs.length ? segs[s + 1].start : evs.length;
    const seg = evs.slice(a, b);
    const has = (T) => seg.findIndex((e) => e.T === T);
    const rs = has('room_start'), rc = has('room_cleared'), ro = has('reward_offer'), dt = has('draft_taken'), dd = has('draft_declined'), po = has('path_offer'), pc = has('path_chosen');
    const bs = has('boss_spawn'), bd = has('boss_death'), so = has('shop_open'), sc = has('shop_close'), re = has('run_end');
    const room = segs[s].room;
    if (rc >= 0 && rs < 0) problems.push(`${room}: room_cleared without room_start`);
    if (rc >= 0 && rs >= 0 && rc < rs) problems.push(`${room}: room_cleared before room_start`);
    if (ro >= 0 && rc >= 0 && seg[ro].tk < seg[rc].tk) problems.push(`${room}: reward_offer before room_cleared`);
    if (dt >= 0 && ro >= 0 && seg[dt].tk < seg[ro].tk) problems.push(`${room}: draft_taken before reward_offer`);
    if (dt >= 0 && ro < 0) problems.push(`${room}: draft_taken without reward_offer`);
    if (pc >= 0 && po < 0) problems.push(`${room}: path_chosen without path_offer`);
    if (pc >= 0 && po >= 0 && seg[pc].tk < seg[po].tk) problems.push(`${room}: path_chosen before path_offer`);
    if (po >= 0 && dt < 0 && dd < 0) problems.push(`${room}: path_offer without a draft decision`);
    if (so >= 0 && !room.includes('shop')) problems.push(`${room}: shop_open outside the shop room`);
    if (sc >= 0 && so >= 0 && seg[sc].tk < seg[so].tk) problems.push(`${room}: shop_close before shop_open`);
    if (bs >= 0 && !room.includes('r8')) problems.push(`${room}: boss_spawn outside room 8`);
    if (bd >= 0 && bs >= 0 && seg[bd].tk < seg[bs].tk) problems.push(`${room}: boss_death before boss_spawn`);
    if (bd >= 0 && bs < 0) problems.push(`${room}: boss_death without boss_spawn`);
    if (re >= 0 && seg[re].x === 'victory' && bd < 0) problems.push(`${room}: run_end(victory) without boss_death`);
    if (re >= 0 && seg[re].x === 'victory' && bd >= 0 && seg[re].tk < seg[bd].tk) problems.push(`${room}: run_end(victory) before boss_death`);
    if (rs >= 0 && seg[rs].tk < evs[a].tk) problems.push(`${room}: room_start before room_enter`);
  }
  const count = (T) => evs.filter((e) => e.T === T).length;
  const nRe = count('run_end'), nRs = count('run_start'), nBs = count('boss_spawn'), nBd = count('boss_death'), nRw = count('run_wiped'), nRtc = count('return_to_camp');
  if (nRs !== 1) problems.push(`run_start x${nRs}`);
  if (nRe > 1) problems.push(`run_end x${nRe}`);
  if (nBs > 1) problems.push(`boss_spawn x${nBs}`);
  const iRe = idx('run_end'), iRw = idx('run_wiped'), iRtc = idx('return_to_camp'), iDef = idx('defeat');
  if (iRe >= 0 && iRw >= 0 && evs[iRw].tk < evs[iRe].tk) problems.push('run_wiped before run_end');
  if (iRe >= 0 && iRtc >= 0 && evs[iRtc].tk < evs[iRe].tk) problems.push('return_to_camp before run_end');
  if (iRe >= 0 && iRw < 0) problems.push('run_end without run_wiped');
  if (iRe >= 0 && evs[iRe].x === 'defeat' && iDef < 0) problems.push('run_end(defeat) without a defeat event');
  if (iRe >= 0 && evs[iRe].x === 'victory' && count('victory') === 0) problems.push('NOTE: no distinct victory event on the bus (run_end carries result=victory)');
  const rooms = evs.filter((e) => e.T === 'room_enter').map((e) => e.x);
  console.log(`run ${run.label} seed ${run.seed}: ${evs.length} events, rooms [${rooms.join(', ')}], run_start ${nRs} run_end ${nRe}(${iRe >= 0 ? evs[iRe].x : '-'}) boss_spawn ${nBs} boss_death ${nBd} run_wiped ${nRw} return_to_camp ${nRtc}`);
  console.log('  order:', run.order.join(' '));
  console.log('  counts:', JSON.stringify(run.counts), 'hm:', JSON.stringify(run.hm));
  if (run.rooms) for (const [k, v] of Object.entries(run.rooms)) console.log(`  room ${k} ${v.mode} reward ${v.reward} wallet ${v.wallet}: enter ${v.enterTick} clear ${v.clearTick} (${v.clearTick != null ? v.clearTick - v.enterTick : '-'} ticks, ${v.clearW != null ? Math.round((v.clearW - v.enterW) / 100) / 10 : '-'} s)`);
  if (run.fpsMin) console.log('  fpsMin:', JSON.stringify(run.fpsMin));
  console.log(problems.length ? `  PROBLEMS (${problems.length}):\n    ${problems.join('\n    ')}` : '  integrity: OK (no ordering violations)');
}
