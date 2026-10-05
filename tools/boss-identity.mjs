#!/usr/bin/env node
// Boss identity probe (docs/CONTENT_PLAN.md slice 3). For each of the six
// bosses, in a real browser against `npm run dev`:
//   - force its boss room (startRun { act, boss } + skipToRoom 8)
//   - the banner medal is that boss's own icon (hud.bossPlate)
//   - its signature sting fired on boss_spawn, and the boss groove is its
//     own (the act's second boss) or the act groove (the first)
//   - one of its kit beats played its own cue (kit bosses: a bx_* beat or
//     tell; the Stag: its existing quake / trample / telegraph cues)
//   - the add phase plays its phase sting, its death plays boss_death + fall
// Screenshots of each banner go to --shots (default
// /mnt/project-files/boss-identity/).
//   node tools/boss-identity.mjs [--only heron] [--shots dir] [--beat-ms 45000]
import { mkdirSync } from 'node:fs';
import { openAudio, ev, sleep, BASE } from './gntM3-lib.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const ONLY = arg('--only', null);
const SHOTS = arg('--shots', '/mnt/project-files/boss-identity');
const BEAT_MS = Number(arg('--beat-ms', 45000));
const BOSSES = [
  { act: 1, kind: 'stag', icon: 'stag', groove: null, beats: ['quake_warn', 'trample', 'telegraph'] },
  { act: 1, kind: 'thornmother', icon: 'boss_thornmother', groove: 'thornmother' },
  { act: 2, kind: 'heron', icon: 'boss_heron', groove: null },
  { act: 2, kind: 'millwheel', icon: 'boss_millwheel', groove: 'millwheel' },
  { act: 3, kind: 'wyrm', icon: 'boss_wyrm', groove: null },
  { act: 3, kind: 'lichram', icon: 'boss_lichram', groove: 'lichram' },
].filter((b) => !ONLY || b.kind === ONLY);

mkdirSync(SHOTS, { recursive: true });
const { browser, page, errors } = await openAudio(`${BASE}?menu=0&seed=7`);
const checks = [];
const check = (name, ok, info) => {
  checks.push({ name, ok: !!ok, ...(info !== undefined ? { info } : {}) });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
};
const run = () => ev(page, () => window.__echoes.state().run || {});
async function waitFor(fn, ms, step = 400) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) return null;
    await sleep(step);
  }
}
const cuesSince = (mark) =>
  ev(page, (mark) => window.__echoes.audio.cueLog(600).filter((c) => c.t >= mark).map((c) => ({ cue: c.cue, event: c.event ?? null, dropped: c.dropped ?? null })), mark);
const now = () => ev(page, () => Math.max(0, ...window.__echoes.audio.cueLog(1).map((c) => c.t)) + 1);

try {
  await sleep(3000);
  // Wake the AudioContext (autoplay flag) so the music driver runs.
  await ev(page, () => window.__echoes.app.service('audio').unlock && window.__echoes.app.service('audio').unlock());
  for (const b of BOSSES) {
    const tag = b.kind;
    await ev(page, () => {
      const r = window.__echoes.state().run || {};
      if (r.active) window.__echoes.cmd('abandonRun', 'quit');
    });
    await sleep(600);
    const mark = await now();
    await ev(page, (b) => window.__echoes.cmd('startRun', { act: b.act, boss: b.kind }), b);
    await waitFor(async () => (await run()).phase === 'combat', 60000);
    await ev(page, (b) => window.__echoes.cmd('skipToRoom', 8, { act: b.act }), b);
    const inRoom = await waitFor(async () => {
      const r = await run();
      return r.phase === 'combat' && r.room === 8 && r.boss && r.boss.active ? r : null;
    }, 90000);
    check(`${tag}: boss room live`, inRoom, inRoom ? { name: inRoom.boss.name, kind: inRoom.boss.kind ?? 'stag' } : null);
    const plate = (await waitFor(async () => {
      const pl = await ev(page, () => window.__echoes.hud.bossPlate());
      return pl.mode === 'boss' ? pl : null;
    }, 20000, 500)) ?? (await ev(page, () => window.__echoes.hud.bossPlate()));
    await sleep(1500);
    check(`${tag}: banner wears its own medal`, plate.mode === 'boss' && plate.medal.visible && plate.medal.iconId === b.icon && plate.medal.boss === b.kind, { mode: plate.mode, icon: plate.medal.iconId, label: plate.label });
    const box = plate.medal.box;
    await page.screenshot({ path: `${SHOTS}/boss-${tag}.png`, clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 24), width: 760, height: 120 } });
    await page.screenshot({ path: `${SHOTS}/boss-${tag}-room.png` });
    let cues = await cuesSince(mark);
    const spawn = cues.filter((c) => c.event === 'boss_spawn').map((c) => c.cue);
    check(`${tag}: signature sting on spawn`, spawn.includes(`bx_${tag}_sting`), spawn);
    const mus = await ev(page, () => window.__echoes.audio.music());
    check(`${tag}: boss groove`, mus.state === 'boss' && (mus.boss ?? null) === b.groove, { state: mus.state, boss: mus.boss, theme: mus.theme });
    // One of its own beats (the fight runs on its own; party AI fights it).
    const beatMark = await now();
    const want = b.beats ?? null;
    const beat = await waitFor(async () => {
      const cs = await cuesSince(beatMark);
      const hit = cs.find((c) => (want ? want.includes(c.cue) && c.event !== 'boss_spawn' : c.cue.startsWith(`bx_${tag}_`) && !/_(sting|phase|fall)$/.test(c.cue)));
      return hit || null;
    }, BEAT_MS, 1000);
    check(`${tag}: a kit beat plays its own cue`, beat, beat);
    if (!want) {
      const cs = (await waitFor(async () => {
        const c = await cuesSince(beatMark);
        return c.some((x) => x.event === 'boss_telegraph_start') ? c : null;
      }, BEAT_MS, 1000)) ?? (await cuesSince(beatMark));
      // The boss's own telegraphs speak its tell; the generic tick that
      // still plays belongs to adds (the Lich Ram raises telegraphing dead),
      // so it may be no more than the tells' absence explains: every
      // boss_telegraph_start cue must be the tell.
      const own = cs.filter((c) => c.event === 'boss_telegraph_start').map((c) => c.cue);
      const generic = cs.filter((c) => c.cue === 'telegraph' && c.event === 'telegraph_start').length;
      check(`${tag}: its telegraphs speak its own tell`, own.length > 0 && own.every((c) => c === `bx_${tag}_tell`), { own: own.length, genericFromAdds: generic });
    }
    const phMark = await now();
    await ev(page, () => window.__echoes.cmd('bossHp', 0.45));
    const ph = await waitFor(async () => (await cuesSince(phMark)).find((c) => c.cue === `bx_${tag}_phase`), 20000, 500);
    check(`${tag}: phase sting`, ph, ph);
    const dMark = await now();
    await ev(page, () => window.__echoes.cmd('killBoss'));
    const fall = await waitFor(async () => {
      const cs = await cuesSince(dMark);
      return cs.some((c) => c.cue === `bx_${tag}_fall`) && cs.some((c) => c.cue === 'boss_death') ? cs.filter((c) => c.event === 'death').map((c) => c.cue) : null;
    }, 20000, 500);
    check(`${tag}: death plays boss_death + fall`, fall, fall);
  }
  const bad = checks.filter((c) => !c.ok);
  check('no page errors', errors.length === 0, errors.slice(0, 5));
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks passed${bad.length ? '; failed: ' + bad.map((c) => c.name).join(', ') : ''}`);
  process.exitCode = checks.every((c) => c.ok) ? 0 : 1;
} finally {
  await browser.close();
}
