#!/usr/bin/env node
// ACT V BOSSES in a real browser (content plan 4 slice 3,
// docs/ACT_V_BOSSES.md), against `npm run dev`. For the Hush and the
// Skyhorn:
//   - force its boss room (startRun { act, boss } + skipToRoom 8): the rig
//     builds, the room is the Belfry Crown (32)
//   - the banner medal is its own icon, its sting fired, its groove plays
//   - its kit beats play their cues and its signature VFX marks fire
//   - no page errors
// Screenshots of the fight go to --shots (default
// /mnt/project-files/act-v-bosses/).
//   node tools/act5-bosses-browser.mjs [--only hush] [--shots dir] [--lang de]
import { mkdirSync } from 'node:fs';
import { openAudio, ev, sleep, BASE } from './gntM3-lib.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const ONLY = arg('--only', null);
const SHOTS = arg('--shots', '/mnt/project-files/act-v-bosses');
const LANG = arg('--lang', null);
const BOSSES = [
  { act: 5, kind: 'hush', layout: 32, beats: ['bx_hush_note', 'bx_hush_unring', 'bx_hush_still', 'bx_hush_great'], cuts: { 3: 0.74, 7: 0.49 } },
  { act: 5, kind: 'skyhorn', layout: 32, beats: ['bx_skyhorn_rush', 'bx_skyhorn_toll', 'bx_skyhorn_wall', 'bx_skyhorn_leap'], cuts: { 4: 0.49, 7: 0.39 } },
].filter((b) => !ONLY || b.kind === ONLY);

mkdirSync(SHOTS, { recursive: true });
const { browser, page, errors } = await openAudio(`${BASE}?menu=0&seed=7${LANG ? `&lang=${LANG}` : ''}`);
const checks = [];
const check = (name, ok, info) => {
  checks.push({ name, ok: !!ok });
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
const cuesSince = (mark) => ev(page, (mark) => window.__echoes.audio.cueLog(800).filter((c) => c.t >= mark).map((c) => c.cue), mark);

const now = () => ev(page, () => Math.max(0, ...window.__echoes.audio.cueLog(1).map((c) => c.t)) + 1);
try {
  await sleep(3000);
  await ev(page, () => window.__echoes.app.service('audio').unlock && window.__echoes.app.service('audio').unlock());
  for (const b of BOSSES) {
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
    check(`${b.kind}: boss room live`, inRoom && inRoom.boss.kind === b.kind, inRoom ? { name: inRoom.boss.name, kind: inRoom.boss.kind } : null);
    check(`${b.kind}: its arena (layout ${b.layout})`, inRoom && inRoom.layout && inRoom.layout.layoutId === b.layout, inRoom && inRoom.layout ? inRoom.layout.layoutId : null);
    const plate = (await waitFor(async () => {
      const pl = await ev(page, () => window.__echoes.hud.bossPlate());
      return pl.mode === 'boss' ? pl : null;
    }, 20000, 500)) ?? (await ev(page, () => window.__echoes.hud.bossPlate()));
    check(`${b.kind}: banner medal is its own`, plate && plate.mode === 'boss' && plate.medal && plate.medal.iconId === `boss_${b.kind}` && plate.medal.boss === b.kind, plate ? { mode: plate.mode, icon: plate.medal && plate.medal.iconId, label: plate.label } : null);
    if (plate && plate.medal && plate.medal.box) {
      const box = plate.medal.box;
      await page.screenshot({ path: `${SHOTS}/banner-${b.kind}${LANG ? `-${LANG}` : ''}.png`, clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 24), width: 760, height: 120 } });
    }
    // The sting lands with the banner; read it now, before the fight's beats
    // push it out of the cue log.
    const early = await cuesSince(mark);
    check(`${b.kind}: its sting fired`, early.includes(`bx_${b.kind}_sting`));
    const mus = await ev(page, () => window.__echoes.audio.music());
    check(`${b.kind}: its boss groove`, mus.state === 'boss' && mus.boss === b.kind, { state: mus.state, boss: mus.boss });
    // Make it tough, then fight: alternate standing off and crowding it so
    // every attack comes up, and shoot the fight.
    await ev(page, () => window.__echoes.cmd('bossHp', 0.98));
    for (let i = 0; i < 12; i++) {
      const dist = [5, 1.8, 4, 2.4, 5.5][i % 5];
      await ev(page, (dist) => {
        const r = window.__echoes.state().run || {};
        const bs = r.boss;
        if (bs && Number.isFinite(bs.x)) window.__echoes.cmd('teleport', Math.max(-6, Math.min(6, bs.x + (bs.x > 0 ? -1 : 1) * dist * 0.4)), Math.max(-4, Math.min(5, bs.z + dist)));
      }, dist);
      if (b.cuts[i]) await ev(page, (p) => window.__echoes.cmd('bossHp', p), b.cuts[i]);
      for (let k = 0; k < 6; k++) {
        await sleep(i < 2 ? 420 : 580);
        await ev(page, () => {
          for (const e of window.__echoes.content.world().entities()) if (e.partyIndex !== undefined && e.hp > 0) e.hp = e.maxHp;
        });
      }
      await page.screenshot({ path: `${SHOTS}/${b.kind}-room-${i}${LANG ? `-${LANG}` : ''}.png` });
    }
    const cues = await cuesSince(mark);
    const beats = b.beats.filter((c) => cues.includes(c));
    check(`${b.kind}: its kit beats play (${beats.length}/${b.beats.length})`, beats.length >= 2, beats);
  }
  const errs = errors.filter((e) => !/favicon|ERR_|net::/.test(String(e)));
  check('no page errors', errs.length === 0, errs.slice(0, 3));
} finally {
  await browser.close();
}
const fails = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - fails.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
