#!/usr/bin/env node
// POLISH probe (v0.5.327) — headless Node, no browser.
//
//   node tools/polish-probe.mjs
//
// Checks:
//   1. Short Fuse (the room curse) shortens enemy warnings only in its own
//      room, like Famine: taken at the door, the room the party still stands
//      in keeps its warnings whole; in the cursed room they are 20% shorter.
//      The Short Fuse vow still shortens them in every room.
//   2. Records dates: the high-score day reads in the game's language (the
//      records screen formats with getLanguage(), not the browser's). So do
//      every score (Records, the end card) and the Saves screen's slot times.
//   3. Level Select: past one row's room the cards stand in two rows
//      (fitRows), the blurb moves under them, and the screen says so in its
//      debug view. The look itself is tools/polish-browser.mjs.
//   4. The Hourwarden's clock weights: a weight's lob plays the template's
//      hang and drop beats (foefx weightHang / weightDrop), not a muzzle shot,
//      and its landing blow is the template tone, not Ember.
// Exit code 1 on any failure.
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const src = (p) => readFileSync(join(here, p), 'utf8');

const fails = [];
const check = (ok, what) => {
  if (!ok) fails.push(what);
  console.log(ok ? 'ok  ' : 'FAIL', what);
  return ok;
};

// 1 --------------------------------------------------------- Short Fuse --
{
  // The relic system on its own (stub world): the door's curse is taken in
  // the room before (its path screen), then the party walks into its room.
  const { createRelicSystem, CURSES } = await import(u('src/sim/relics.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const make = () => {
    const sys = createRelicSystem({ registry: { all: () => [], get: () => null }, events: createEventBus(), getTick: () => 0, combat: {}, skillSys: {}, player: { x: 0, z: 0 } });
    sys.reset(17, true);
    return sys;
  };
  const rule = CURSES.short_fuse.fuse;
  const r = make();
  r.onRoomEnter(2, 'combat');
  r.takeCurse('short_fuse', 3);
  const before = r.fuse();
  r.onRoomEnter(3, 'combat');
  const inside = r.fuse();
  r.onRoomEnter(4, 'combat');
  const after = r.fuse();
  check(before === null, `taken at the door: the room the party stands in keeps its warnings whole (${JSON.stringify(before)})`);
  check(!!inside && inside.mul === rule.mul && inside.minTicks === rule.minTicks, `its own room shortens them (${JSON.stringify(inside)})`);
  check(after === null, 'the next room is whole again (unchanged)');
  const run = src('src/sim/run.js');
  check(/relics\.fuse\(\) \?\? vowFuse\(\)/.test(run), 'the Short Fuse vow still shortens warnings in every room (run.js falls back to vowFuse)');
  const rel = src('src/sim/relics.js');
  const fuseFn = rel.slice(rel.indexOf('function fuse()'), rel.indexOf('function fuse()') + 200);
  check(/cursedHere\(\)/.test(fuseFn), 'fuse() gates on cursedHere(), as Famine\'s heal cut does');
}

// 2 ------------------------------------------------------- Records dates --
{
  const rec = src('src/ui/menu/records.js');
  const day = rec.slice(rec.indexOf('const day = '), rec.indexOf('const keptDay'));
  check(/fmtDate\(d, sameYear/.test(day), "a high score's day formats in the game's language");
  check(!/toLocaleDateString\(undefined, sameYear/.test(rec), "no high-score date reads the browser's language first");
  // Every score, date and time on screen (his "Local numbers and times
  // first" pick): only the i18n helpers' fallbacks may use the browser's.
  const { readdirSync, statSync } = await import('node:fs');
  const walk = (d) => readdirSync(join(here, d)).flatMap((f) => (statSync(join(here, d, f)).isDirectory() ? walk(`${d}/${f}`) : f.endsWith('.js') ? [`${d}/${f}`] : []));
  const loose = walk('src/ui').concat(walk('src/app')).flatMap((f) =>
    src(f).split('\n').map((l, i) => [f, i + 1, l]).filter(([, , l]) => /toLocale(Date|Time)?String\((undefined|\))/.test(l) && !/fallback/.test(l))
  );
  const allowed = loose.filter(([f, , l]) => f === 'src/ui/menu/cloud.js' && /return d\.toLocaleString\(\);/.test(l)); // its own fallback in a catch
  const bad = loose.filter((x) => !allowed.includes(x));
  check(bad.length === 0, `no score, date or time on screen reads the browser's language${bad.length ? `: ${bad.map(([f, n]) => `${f}:${n}`).join(', ')}` : ''}`);
  const i18n = await import(u('src/i18n/index.js'));
  check(typeof i18n.fmtNumber === 'function' && typeof i18n.fmtDate === 'function' && typeof i18n.fmtDateTime === 'function', 'i18n has fmtNumber, fmtDate and fmtDateTime');
  check(/fmtNumber\(h\.score\)/.test(rec) && /fmtNumber\(r\.bestScore\)/.test(rec), 'the Records scores and best score use fmtNumber');
  check(/fmtNumber\(rec\.score\)/.test(src('src/ui/run/endscreens.js')), "the end card's SCORE uses fmtNumber");
  check(/return fmtDateTime\(ms,/.test(src('src/ui/menu/saves.js')), "the Saves screen's slot times use fmtDateTime");
  console.log('     3960 reads:', ['en', 'de', 'fr', 'ru', 'pt-BR'].map((c) => `${c} "${(3960).toLocaleString(c)}"`).join(', '));
  // What that means for each of the ten languages (Node's ICU).
  const { LANGUAGES } = await import(u('src/i18n/index.js')).catch(() => ({}));
  const codes = Array.isArray(LANGUAGES) ? LANGUAGES.map((l) => (typeof l === 'string' ? l : l.code)) : ['en', 'de', 'es', 'fr', 'pt-BR', 'ru', 'ja', 'ko', 'zh-Hans', 'zh-Hant'];
  const d = new Date(Date.UTC(new Date().getUTCFullYear(), 9, 21, 12));
  const seen = codes.map((c) => d.toLocaleDateString(c, { day: 'numeric', month: 'short' }));
  console.log('     21 Oct reads:', codes.map((c, i) => `${c} "${seen[i]}"`).join(', '));
  check(codes.length === 10 && new Set(seen).size >= 8, `the ten languages read the day their own way (${new Set(seen).size} forms)`);
}

// 3 -------------------------------------------------------- Level Select --
{
  const lv = src('src/ui/run/levels.js');
  check(/\.cg-cards\.cg-rows \{ display: grid/.test(lv) && /\.cg-cards\.cg-rows \.cg-blurb \{ display: none/.test(lv), 'two rows: a grid, the blurb off the cards');
  check(/function fitRows\(\)/.test(lv) && /scrollHeight > wrapEl\.clientHeight/.test(lv), 'fitRows measures the window, not a language list');
  check(/window\.addEventListener\('resize', onResize\)/.test(lv) && /removeEventListener\('resize', onResize\)/.test(lv), 'fitRows runs again on resize and lets go on close');
  check(/rows: cardsEl\.classList\.contains\('cg-rows'\)/.test(lv), 'the debug view says rows, detail and fits');
}

// 4 ------------------------------------------------- Hourwarden weights --
{
  const tones = await import(u('src/data/vfx.js'));
  const { PALETTE } = await import(u('src/data/palette.js'));
  const tp = tones.vfxFoeTone('hourwarden');
  check(tones.FOE_TEMPLATE.hourwarden === 'scifi' && tp.id === 'scifi', 'the Hourwarden plays the sci-fi template');
  // foefx in a stub world: record the kit calls a weight lob makes.
  const { createFoeFx } = await import(u('src/render/vfx/foefx.js'));
  const calls = [];
  const rec = (name) => (o) => calls.push({ name, o });
  const handlers = new Map();
  const bus = { on: (type, fn) => handlers.set(type, [...(handlers.get(type) ?? []), fn]) };
  const emit = (type, ev) => (handlers.get(type) ?? []).forEach((fn) => fn({ type, ...ev }));
  const timers = [];
  const marks = [];
  const boss = { id: 1, kind: 'hourwarden', x: 0, z: 0, faction: 'hostile' };
  const glob = { id: 7, kind: 'eglob', weight: true, ownerId: 1 };
  const byId = (id) => (id === 1 ? boss : id === 7 ? glob : null);
  const tk = new Proxy({}, { get: (_, k) => (...a) => calls.push({ name: `tk.${String(k)}`, o: a[0] }) });
  const kit = new Proxy({}, { get: (_, k) => rec(`kit.${String(k)}`) });
  const fx = createFoeFx({ kit, tk, bus, byId, spray: () => {}, after: (s, fn) => timers.push({ s, fn }), camfx: { kick() {} }, rnd: (a, b) => (a + b) / 2, mark: (m) => marks.push(m), ink: 0, player: () => null });
  emit('enemy_lob', { tick: 100, id: 1, glob: 7, x: 0, z: 0, tx: 3, tz: 2, landTick: 100 + 90, weight: true });
  check(marks.includes('tpl:foe_scifi_weight') && !marks.includes('tpl:foe_scifi_shot'), `a weight's lob plays the hang beat, not a muzzle shot (${marks.join(', ')})`);
  const thread = calls.find((c) => c.name === 'kit.streak' && c.o.a.y > 5 && c.o.b.y < 0.5);
  check(!!thread && thread.o.a.x === 3 && thread.o.a.z === 2, 'a thread of light hangs from the weight to its hour mark');
  check(timers.length === 1 && Math.abs(timers[0].s - (90 - 18) / 60) < 1e-9, `the drop is timed to the weight's own fall (${timers[0] && timers[0].s.toFixed(2)} s)`);
  timers[0].fn();
  check(marks.includes('tpl:foe_scifi_drop'), 'the drop beat plays when it lets go');
  const colours = calls.flatMap((c) => [c.o?.core, c.o?.glow, c.o?.a, c.o?.b, c.o?.color, c.o?.color2]).filter((x) => x != null);
  const ember = PALETTE.emberDanger;
  check(colours.length > 0 && !colours.includes(ember), 'no Ember in the weight beats');
  check(fx.counts().hourwarden && fx.counts().hourwarden.weight === 1 && fx.counts().hourwarden.drop === 1, `the foe tally counts them (${JSON.stringify(fx.counts().hourwarden)})`);
  // A weight whose room is gone before it lets go (glob 8 is not in the
  // world any more when the timer fires): no drop.
  timers.length = 0;
  emit('enemy_lob', { tick: 100, id: 1, glob: 8, x: 0, z: 0, tx: 1, tz: 1, landTick: 190, weight: true });
  const before = marks.filter((m) => m === 'tpl:foe_scifi_drop').length;
  timers[0].fn();
  check(marks.filter((m) => m === 'tpl:foe_scifi_drop').length === before, 'a weight gone with its room drops nothing');
  // An ordinary lob still flashes its muzzle.
  emit('enemy_lob', { tick: 100, id: 1, glob: 9, x: 0, z: 0, tx: 1, tz: 1, landTick: 150 });
  check(marks.includes('tpl:foe_scifi_shot'), 'any other lob still plays its muzzle shot');
  // The landing blow (signature.js weightLand) in the template tone.
  const sig = src('src/render/vfx/signature.js');
  const land = sig.slice(sig.indexOf('function weightLand('), sig.indexOf('function weightLand(') + 900);
  check(/vfxFoeShotColor\('hourwarden'\)/.test(land) && !/EMBER/.test(land), "the landing flare and shock wear the Hourwarden's tone, not Ember");
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
process.exit(fails.length ? 1 : 0);
