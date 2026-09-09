// certB1-fl — offline console digest for the certified full-loop capture. Judges ONLY what the capture logged
// (captures/<name>.console.txt): console hygiene (B6), B1 walk/prompt/run_start, per-room wall time + screens
// (B2), defeat loop + leak audit (B3), third-run freshness (B4), event-order integrity (B5).
// usage: node tools/certB1-fl-report.mjs captures/certB1-fl-main.console.txt
import { readFileSync } from 'fs';

const file = process.argv[2];
const lines = readFileSync(file, 'utf8').split(/\r?\n/);
const evals = [];
for (const ln of lines) {
  if (!ln.startsWith('[EVAL] ')) continue;
  try { evals.push(JSON.parse(ln.slice(7))); } catch { evals.push(ln.slice(7)); }
}
const objs = evals.filter((e) => e && typeof e === 'object');
const parse = (s) => { const m = /^([a-z_]+)(?:\(([^)]*)\))?@(\d+)$/.exec(s); return m ? { T: m[1], x: m[2] || '', tk: +m[3] } : null; };
const J = (o, n = 600) => JSON.stringify(o).slice(0, n);

console.log('== B6 console hygiene ==');
const pageErr = lines.filter((l) => l.startsWith('[PAGEERROR]'));
const errs = lines.filter((l) => l.startsWith('[error]'));
const harness = lines.filter((l) => l.startsWith('[HARNESS-ERROR]'));
const warns = lines.filter((l) => l.startsWith('[warn]'));
const reqfail = lines.filter((l) => l.startsWith('[REQFAIL]'));
const warnKinds = {};
for (const w of warns) { const k = w.replace(/^\[warn\] /, '').slice(0, 90); warnKinds[k] = (warnKinds[k] || 0) + 1; }
const fallbacks = evals.filter((e) => typeof e === 'string' && e.includes('[FALLBACK]'));
const notOk = objs.filter((e) => e.ok === false);
const loops = lines.filter((l) => l.startsWith('[LOOP]'));
const shots = lines.filter((l) => l.startsWith('[SHOT]')).map((l) => l.slice(7));
console.log(`PAGEERROR ${pageErr.length} | [error] ${errs.length} | HARNESS-ERROR ${harness.length} | REQFAIL ${reqfail.length} | [warn] ${warns.length} | shots ${shots.length} | loops ${loops.length} | evals ${evals.length}`);
for (const [k, n] of Object.entries(warnKinds)) console.log(`  warn x${n}: ${k}`);
for (const e of errs) console.log('  ERROR:', e.slice(0, 300));
for (const e of pageErr) console.log('  PAGEERROR:', e.slice(0, 300));
for (const e of harness) console.log('  HARNESS:', e.slice(0, 300));
for (const e of reqfail) console.log('  REQFAIL:', e.slice(0, 300));
console.log(`fallbacks ${fallbacks.length}`); for (const f of fallbacks) console.log('  ', f);
console.log(`waitFor ok:false ${notOk.length}`); for (const f of notOk) console.log('  ', J(f, 500));
console.log(lines.find((l) => l.startsWith('[GOTO]')));
console.log(lines.find((l) => l.startsWith('[DEBUG-API]')));
for (const l of loops) console.log(' ', l);
console.log('shots:', shots.join(' '));

console.log('\n== B1 camp -> portal by WASD (per run) ==');
for (const e of objs) {
  if (e.tag && e.portal && e.player && e.promptKeyChip !== undefined) console.log(`walk start ${e.tag}: tick ${e.tick} scene ${e.scene} mode ${e.mode} player ${J(e.player)} portal ${J(e.portal)} inPortal ${e.inPortal} promptVisible ${e.promptVisible} chip ${J(e.promptKeyChip)} display ${e.promptDisplay} runPhase ${e.runPhase}`);
  if (e.walkSamples != null) console.log(`  walk: samples ${e.walkSamples} first ${J(e.first)} mid ${J(e.mid)} last ${J(e.last)} dist ${e.dist} u over ${e.ticks} ticks`);
  if (e.camp && e.camp.promptVisible !== undefined) console.log(`  prompt wait: ok ${e.ok} waited ${e.waitedTicks} ticks; camp ${J(e.camp, 400)}`);
  if (e.promptText !== undefined) console.log(`  prompt DOM: text ${J(e.promptText)} keyChip ${J(e.keyChip)} display ${e.display} opacity ${e.opacity} box ${J(e.box)}`);
  if (e.runsBefore != null) console.log(`  press: runsBefore ${e.runsBefore} seedBefore ${e.seedBefore} bootSeed ${e.bootSeed} pressTick ${e.pressTick}`);
  if (e.runState && e.startEvents) console.log(`  run_start wait: ok ${e.ok} waited ${e.waitedTicks} ticks (${e.ms} ms); seed ${e.seed} (before ${e.seedBefore}, boot ${e.bootSeed}) runState ${J(e.runState)} lastBegin ${J(e.lastBegin)} scene ${e.scene} vfx ${e.vfx} events ${J(e.startEvents)}`);
  if (e.projTest !== undefined) console.log(`  proj: ${J(e.projTest)} player ${J(e.projPlayer)} arenaProbe ${e.arenaProbe}`);
}

console.log('\n== B2 rooms (real-play loop) ==');
for (const e of objs) {
  if (e.roomLoopStart != null) console.log(`room ${e.roomLoopStart} loop start: tick ${e.tick} w ${e.w} phase ${e.phase} mode ${e.mode} wallet ${e.wallet} roomState ${J(e.roomState, 300)} party ${J(e.party)}`);
  if (e.roomDone != null) {
    console.log(`room ${e.roomDone} DONE: loop wall ${e.wallSec}s, enter->clear ${e.enterToClearSec}s (${e.ticksToClear} ticks), iters ${e.iters}, hp ${J(e.hp)}, fpsMin ${e.fpsMin}, end ${e.phase}/${e.ui}`);
    console.log(`   counts ${J(e.counts)}`);
    console.log(`   dodgeTest ${J(e.dodgeTest)}`);
    const s = e.samples || [];
    console.log(`   samples ${s.length}: ${s.map((x) => `t${x.t}:${x.mode}/en${x.en}/hp${x.hp.join(',')}/dn${x.dn}${x.boss ? '/boss' + x.boss.join(':') : ''}${x.ws != null ? '/ws' + x.ws : ''}${x.dleft != null ? '/dl' + x.dleft : ''}`).join(' ')}`);
  }
}

console.log('\n== B2 screens ==');
for (const e of objs) {
  if (e.take !== undefined) console.log(`DRAFT room ${e.room}: screen ${e.screen} text ${J(e.text, 160)} cards ${J(e.cards, 300)} take ${J(e.take)} reward ${J(e.reward, 200)} freeSlots ${e.freeSlots} wallet ${e.wallet} held ${J(e.held)}`);
  if (e.btn) console.log(`  pick ${e.btn}: rect ${J(e.rect)} row ${e.row} clickAt ${J(e.clickAt)}`);
  if (e.afterDraft !== undefined) console.log(`  after draft: ${e.afterDraft} events ${J(e.draftEvents)} skills ${J(e.skills)} bench ${J(e.bench)} socketOpen ${e.socketOpen}`);
  if (e.socketOpen === true) console.log(`  SOCKET open: bench ${J(e.bench)} sockets ${e.sockets}`);
  if (e.pick) console.log(`  socket pick ${e.pick}: rect ${J(e.rect)} idx ${e.idx} clickAt ${J(e.clickAt)}`);
  if (e.socketResult) console.log(`  socket result: ${e.socketResult} before ${e.before} after ${e.after} bench ${J(e.bench)} toast ${J(e.toast)}`);
  if (e.socketOpenAfterEsc !== undefined) console.log(`  socket after Esc: open ${e.socketOpenAfterEsc} screen ${e.screen}`);
  if (e.doors && e.options) console.log(`PATH: doors ${J(e.doors, 400)} options ${J(e.options)} freeSlots ${e.freeSlots} nextRoom ${e.nextRoom} choose ${e.choose} clickAt ${J(e.clickAt)} doorOk ${e.doorOk}`);
  if (e.afterPath !== undefined) console.log(`  after path: ${e.afterPath} phase ${e.phase} events ${J(e.pathEvents)}`);
  if (e.stock && e.advance !== undefined) console.log(`SHOP: wallet ${e.wallet} stock ${J(e.stock, 400)} cards ${J(e.cards, 300)} advance ${J(e.advance)} buy ${e.buy} clickAt ${J(e.clickAt)} buyOk ${e.buyOk}`);
  if (e.walletBefore !== undefined) console.log(`  after buy: wallet ${e.walletBefore} -> ${e.walletAfter} (run.wallet ${e.runWallet}) stock ${J(e.stock)} bench ${J(e.bench)} plaques ${J(e.plaques, 200)} events ${J(e.shopEvents)}`);
  if (e.afterShop !== undefined) console.log(`  after shop: ${e.afterShop} phase ${e.phase} room ${e.room} events ${J(e.shopEvents)}`);
  if (e.screen === 'end' && e.text !== undefined && e.camp !== undefined) console.log(`END screen: phase ${e.phase} text ${J(e.text, 300)} buttons ${J(e.buttons, 200)} camp btn ${J(e.camp)} summary ${J(e.summary, 400)} pages ${J(e.pages)}`);
  if (e.retEvents !== undefined) console.log(`  return wait: ok ${e.ok} waited ${e.waitedTicks} ticks scene ${e.scene} mode ${e.mode} phase ${e.phase} screen ${e.screen} vfx ${e.vfx} events ${J(e.retEvents)}`);
}

console.log('\n== snapshots (boundaries) ==');
for (const e of objs) if (e.tag && e.leaks === undefined && e.scene !== undefined && e.phase !== undefined && e.party && e.hud) {
  console.log(`snap ${e.tag}: tick ${e.tick} w ${e.w} fps ${e.fps} seed ${e.seed}/${e.bootSeed} scene ${e.scene} vfx ${e.vfx} active ${e.active} phase ${e.phase} room ${e.room} mode ${e.mode} combat ${e.combat} wallet ${e.wallet} freeSlots ${e.freeSlots} cleared ${e.cleared} | en ${e.enemies} eshots ${e.eshots} zones ${e.zones} azones ${e.azones} bolts ${e.bolts} proj ${e.projectiles} numerals ${e.numerals} | party ${J(e.party)} skills ${J(e.skills)} bench ${J(e.bench)} sockets ${J(e.sockets)} boss ${J(e.boss)} | ui ${e.ui}/${e.uiPhase} banner ${J(e.banner)} ${e.bannerMode}/${e.bannerShow} hud ${J(e.hud)} threat ${J(e.threat)} ent ${e.entities}`);
}

console.log('\n== B3/B4 camp-after leak audit + third run ==');
for (const e of objs) {
  if (e.downAll !== undefined) console.log(`downAll: ${J(e.downAll)} tick ${e.tick} enemies ${e.enemies} pending ${e.pending} eshots ${e.eshots}`);
  if (e.ev && e.phase !== undefined && e.screen !== undefined && e.ok !== undefined) console.log(`defeat wait: ok ${e.ok} waited ${e.waitedTicks} phase ${e.phase} screen ${e.screen} events ${J(e.ev)}`);
  if (e.leaks !== undefined) console.log(`CAMP AFTER: mode ${e.campMode} inPortal ${e.inPortal} promptVisible ${e.promptVisible} player ${J(e.player)} seatDrift ${J(e.seatDrift)} rigs ${J(e.rigs, 300)} healerAnim ${J(e.healerAnim)} runs ${J(e.runs)}\n   leaks ${J(e.leaks, 700)}\n   party ${J(e.party)} skills ${J(e.skills)} bench ${J(e.bench)} wallet ${e.wallet} freeSlots ${e.freeSlots}\n   banner ${J(e.banner)} threat ${J(e.threat)} hud ${J(e.hud)} busSinceReturn ${J(e.busEventsSinceReturn)} (${e.busSinceReturnCount})`);
  if (e.seedRun3 !== undefined) console.log(`THIRD RUN: seed ${e.seedRun3} vs run2 ${e.seedRun2} boot ${e.bootSeed} seedsAll ${J(e.seedsAll)} party ${J(e.party)} skills ${J(e.skills)} freeSlots ${e.freeSlots} wallet ${e.wallet} (cmd ${J(e.walletCmd)}) bench ${J(e.bench)} room ${e.room} roomState ${J(e.roomState, 300)} enemies ${J(e.enemies)} cleared ${e.cleared}`);
}

console.log('\n== dodge presses ==');
for (const e of objs) if (e.dodgePress) console.log(' ', J(e));
console.log('== revive holds ==');
for (const e of objs) if (e.reviveHold) console.log(' ', J(e, 500));

console.log('\n== B5 event integrity ==');
const runs = objs.filter((e) => e.label && Array.isArray(e.order));
for (const run of runs) {
  const evs = run.order.map(parse).filter(Boolean);
  const problems = [];
  const idx = (T) => evs.findIndex((e) => e.T === T);
  if (!evs.length || evs[0].T !== 'run_start') problems.push(`first event is ${evs[0] && evs[0].T}, not run_start`);
  for (let i = 1; i < evs.length; i++) if (evs[i].tk < evs[i - 1].tk) problems.push(`tick goes backwards at ${evs[i - 1].T}@${evs[i - 1].tk} -> ${evs[i].T}@${evs[i].tk}`);
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
    if (rc >= 0 && rs >= 0 && seg[rc].tk < seg[rs].tk) problems.push(`${room}: room_cleared before room_start`);
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
  const iRe = idx('run_end'), iRw = idx('run_wiped'), iRtc = idx('return_to_camp'), iDef = idx('defeat'), iVic = idx('victory');
  if (iRe >= 0 && iRw >= 0 && evs[iRw].tk < evs[iRe].tk) problems.push('run_wiped before run_end');
  if (iRe >= 0 && iRtc >= 0 && evs[iRtc].tk < evs[iRe].tk) problems.push('return_to_camp before run_end');
  if (iRe >= 0 && iRw < 0) problems.push('run_end without run_wiped');
  if (iRe >= 0 && evs[iRe].x === 'defeat' && iDef < 0) problems.push('run_end(defeat) without a defeat event');
  const rooms = evs.filter((e) => e.T === 'room_enter').map((e) => e.x);
  console.log(`run ${run.label} seed ${run.seed} seeds ${J(run.seeds)}: ${evs.length} events, rooms [${rooms.join(', ')}], run_start ${nRs} run_end ${nRe}(${iRe >= 0 ? evs[iRe].x : '-'}) boss_spawn ${nBs} boss_death ${nBd} victory-evt ${iVic >= 0 ? 'yes' : 'no'} defeat-evt ${iDef >= 0 ? 'yes' : 'no'} run_wiped ${nRw} return_to_camp ${nRtc}`);
  console.log('  order:', run.order.join(' '));
  console.log('  counts:', J(run.counts), 'hm:', J(run.hm));
  if (run.rooms) for (const [k, v] of Object.entries(run.rooms)) console.log(`  room ${k} ${v.mode} reward ${v.reward} wallet ${v.wallet}: enter t${v.enterTick} clear t${v.clearTick} (${v.clearTick != null ? v.clearTick - v.enterTick : '-'} ticks, ${v.clearW != null ? Math.round((v.clearW - v.enterW) / 100) / 10 : '-'} s wall)`);
  if (run.fpsMin) console.log('  fpsMin:', J(run.fpsMin));
  if (run.dodge) console.log('  dodge:', J(run.dodge));
  console.log(problems.length ? `  PROBLEMS (${problems.length}):\n    ${problems.join('\n    ')}` : '  integrity: OK (no ordering violations)');
}
