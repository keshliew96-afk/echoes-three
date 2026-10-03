#!/usr/bin/env node
// PARTY GP.4 probe — every class skill produces its sim effect, its VFX and
// its audio cue in the running game.
//
//   node tools/gntPARTY-casts.mjs [--url http://127.0.0.1:4400/] [--only tank,swordsman,archer]
//
// Single-player leg (this tool): the arena harness scene (?scene=arena: no
// waves, no run — combat inactive, so the loadout can be changed between
// casts), a pinned dummy near the caster; for each of the 24 class skills:
// partySwap it into slot 0, partyCast it, then
//   - SIM:   the ally_cast (or aura_pulse for a passive) event names the skill;
//   - VFX:   with the realtime loop frozen and the camera settled, a 240×240
//            screenshot box around the caster changes ≥ 1.5 points more of its
//            pixels across the K stepped cast ticks than across a K-tick
//            no-cast control window — or, for a small class glyph (the
//            parry blades), its class-VFX rig counter changes AND the box
//            changes ≥ 0.5 points more than the control; a PASSIVE (its idle
//            glints / hex / kestrel animate in both windows) passes on a new
//            live pulse rig + ≥ 1.5% of the box changed;
//   - AUDIO: the skill's cue in __echoes.audio.cueLog() after the cast.
// The network leg (a guest pressing 1-4 on its own seat) is gntPARTY-net.mjs.
import sharp from 'sharp';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const BASE = opt('url', 'http://127.0.0.1:4400/');
const ONLY = opt('only') ? opt('only').split(',') : ['tank', 'swordsman', 'archer'];
const SEAT = { tank: 1, swordsman: 2, archer: 3 };
const SKILLS = {
  tank: ['heavy_slam', 'brutal_cleave', 'ground_crack', 'whirling_guard', 'taunting_roar', 'shield_wall', 'shoulder_charge', 'iron_stance'],
  swordsman: ['flurry', 'lunge_strike', 'blade_storm', 'caltrops', 'fox_step', 'crescent_finisher', 'riposte', 'razor_wake'],
  archer: ['piercing_shot', 'volley', 'detonating_charge', 'sundering_nova', 'vault_shot', 'pinning_arrow', 'rain_of_arrows', 'kestrel_watch'],
};
const CUE = {
  tank: 'ally_cast_tank',
  swordsman: 'ally_cast_sword',
  archer: 'ally_cast_archer',
  taunting_roar: 'tank_roar',
  shield_wall: 'tank_shield',
  shoulder_charge: 'tank_charge',
  iron_stance: 'tank_stance',
  fox_step: 'sword_step',
  crescent_finisher: 'sword_finisher',
  riposte: 'sword_parry',
  razor_wake: 'sword_wake',
  vault_shot: 'archer_vault',
  pinning_arrow: 'archer_pin',
  rain_of_arrows: 'archer_rain',
  kestrel_watch: 'archer_kestrel',
  ground_crack: 'azone_spawn',
  caltrops: 'azone_spawn',
  detonating_charge: 'azone_spawn',
};

async function diffPct(a, b) {
  const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).raw().toBuffer({ resolveWithObject: true });
  const n = A.info.width * A.info.height;
  const ch = A.info.channels;
  let changed = 0;
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d += Math.abs(A.data[i * ch + c] - B.data[i * ch + c]);
    if (d > 30) changed += 1;
  }
  return (100 * changed) / n;
}

const browser = await launchEchoes({ gpu: true, autoplay: true });
const rows = [];
let errors = [];
try {
  const { page, errors: errs } = await openEchoes(browser, `${BASE}?menu=0&seed=7&scene=arena`);
  errors = errs;
  await waitReady(page, { minTick: 200 });
  async function probeOnce(cls, seat, skill) {
    // Set-up: the caster near the centre, the other allies parked, a pinned
    // tough dummy 1.6 u ahead (projectiles / zones / arcs all reach it).
    const setup = await page.evaluate(
      (seat, skill) => {
        const E = window.__echoes;
        E.sim.freeze();
        for (const e of E.state().enemies || []) E.cmd('setHp', e.id, 0);
        E.cmd('teleport', 0, 2.8);
        [1, 2, 3].forEach((s) => {
          if (s !== seat) E.cmd('placeAlly', s, -3.2 + s * 0.4, 3.1);
        });
        E.cmd('placeAlly', seat, 0, 0);
        // No leftover shields / statuses from the previous cast.
        for (const m of E.state().party) E.cmd('clearStatus', m.id);
        // Isolation: the other two allies Downed (they neither act nor draw
        // VFX in the box) and the caster at 25% HP (not an eligible reviver,
        // so it stays on its target).
        for (const m of E.state().party) {
          if (m.partyIndex === 0) continue;
          if (m.partyIndex === seat) E.cmd('setHp', m.id, 0.25);
          else E.cmd('setHp', m.id, 0);
        }
        const cur = E.cmd('partyView', seat).slots;
        if (!cur.includes(skill)) E.cmd('partySwap', seat, skill, 0);
        const slot = E.cmd('partyView', seat).slots.indexOf(skill);
        const d = E.cmd('spawn', 'dummy', 1.3, 0);
        const ent = E.state().enemies.find((x) => x.id === d);
        return { slot, dummy: d, ent: !!ent };
      },
      seat,
      skill
    );
    await page.evaluate((id) => {
      const w = window.__echoes;
      const e = w.content && w.content.world ? w.content.world().entities().find((x) => x.id === id) : null;
      if (e) {
        e.maxHp = 5000;
        e.hp = 5000;
        e.knockbackable = false;
      }
    }, setup.dummy);
    // Deterministic window: the realtime loop FROZEN (render keeps running),
    // the caster's own AI cooldowns parked, the camera settled; then a
    // control window and the cast window step the SAME number of ticks.
    const K = ['shoulder_charge', 'fox_step', 'vault_shot', 'lunge_strike'].includes(skill) ? 14 : 8;
    await page.evaluate((seat) => {
      const w = window.__echoes;
      w.sim.freeze();
      const a = w.content.world().entities().find((x) => x.faction === 'party' && x.partyIndex === seat);
      if (a && Array.isArray(a.cds)) a.cds = a.cds.map(() => 1e9);
      if (a) a.nextBasicTick = 1e9;
      // Let the previous cast's zones / shields expire (they age in sim
      // ticks), with the caster unable to swing or cast.
      w.sim.stepN(480);
      for (const m of w.state().party) if (m.partyIndex === seat) w.cmd('clearStatus', m.id);
    }, seat);
    // Then the realtime loop runs ~1.3 s: the renderer sees every tick (the
    // dummy's spawn-in, the fades), the caster walks to its stand range and
    // stops, the camera settles. Frozen again for the two windows.
    await page.evaluate(() => window.__echoes.sim.thaw());
    await new Promise((r) => setTimeout(r, 1600));
    await page.evaluate(() => window.__echoes.sim.freeze());
    await new Promise((r) => setTimeout(r, 400));
    const p = await page.evaluate((seat) => {
      const w = window.__echoes;
      const a = w.state().party.find((m) => m.partyIndex === seat);
      return w.content.project(a.x, a.z, 0.5);
    }, seat);
    const clip = { x: Math.max(0, p.x - 120), y: Math.max(0, p.y - 120), width: 240, height: 240 };
    const raf = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    // Control: the same box across K stepped ticks with NO cast.
    const c0 = await page.screenshot({ clip });
    await page.evaluate((k) => window.__echoes.sim.stepN(k), K);
    await raf();
    const c1 = await page.screenshot({ clip });
    const control = await diffPct(c0, c1);
    if (opt('debug')) {
      const fs = await import('node:fs');
      fs.writeFileSync(`captures/gntPARTY-casts-${skill}-c0.png`, c0);
      fs.writeFileSync(`captures/gntPARTY-casts-${skill}-c1.png`, c1);
    }
    const pre = await page.screenshot({ clip });
    const cast = await page.evaluate(
      (seat, slot, k) => {
        const w = window.__echoes;
        window.__gntCueMark = w.audio && w.audio.cueLog ? w.audio.cueLog(600).slice(-1)[0] : null;
        const fx0 = w.content.classFx ? w.content.classFx() : null;
        const r = w.cmd('partyCast', seat, slot, { x: 1.3, z: 0 });
        w.sim.stepN(k);
        return { r, fx0 };
      },
      seat,
      setup.slot,
      K
    );
    await raf();
    const fx1 = await page.evaluate(() => (window.__echoes.content.classFx ? window.__echoes.content.classFx() : null));
    const post = await page.screenshot({ clip });
    if (opt('debug')) {
      const fs = await import('node:fs');
      fs.writeFileSync(`captures/gntPARTY-casts-${skill}-post.png`, post);
    }
    const vfx = await diffPct(pre, post);
    const passive = ['iron_stance', 'razor_wake', 'kestrel_watch'].includes(skill);
    await page.evaluate(() => window.__echoes.sim.thaw());
    await new Promise((r) => setTimeout(r, passive ? 1300 : 350));
    const out = await page.evaluate(
      (seat, skill, cue) => {
        const w = window.__echoes;
        const all = typeof w.events === 'function' ? w.events() : Array.isArray(w.events) ? w.events : [];
        const evs = all.slice(-200);
        const casts = evs.filter((e) => (e.type === 'ally_cast' && e.skill === skill) || (e.type === 'aura_pulse' && e.skill === skill) || (e.type === 'parry_open' && e.skill === skill));
        const log = w.audio && w.audio.cueLog ? w.audio.cueLog(600) : [];
        const mark = window.__gntCueMark;
        const at = mark ? log.lastIndexOf(mark) : -1;
        const after = log.slice(at + 1);
        return { casts: casts.length, cue: after.some((e) => e.cue === cue), cues: [...new Set(after.map((e) => e.cue))].slice(0, 8) };
      },
      seat,
      skill,
      CUE[skill] ?? CUE[cls]
    );
    const fxLive = !!(cast.fx0 && fx1 && fx1.live > cast.fx0.live);
    const fxd = cast.fx0 && fx1 ? Object.keys(fx1).filter((k2) => fx1[k2] !== cast.fx0[k2]).map((k2) => `${k2}:${cast.fx0[k2]}→${fx1[k2]}`) : [];
    const row = { cls, skill, sim: out.casts > 0, vfxPct: +vfx.toFixed(2), controlPct: +control.toFixed(2), vfx: (vfx >= 1.5 && vfx >= control + 1.5) || (fxd.length > 0 && vfx >= control + 0.5) || (passive && fxLive && vfx >= 1.5), audio: out.cue, cues: out.cues, classFx: fxd, cast: cast.r && cast.r.ok !== undefined ? cast.r.ok : !!cast.r };
    return row;
  }
  for (const cls of ONLY) {
    const seat = SEAT[cls];
    for (const skill of SKILLS[cls]) {
      // The ambient (fireflies, idle glints) occasionally lands a noisy
      // control; a VFX-only miss is re-measured up to twice.
      let row = await probeOnce(cls, seat, skill);
      for (let k = 0; k < 2 && row.sim && row.audio && !row.vfx; k++) row = await probeOnce(cls, seat, skill);
      rows.push(row);
      console.log(`${row.sim && row.vfx && row.audio ? 'PASS' : 'FAIL'} ${cls}.${skill} sim=${row.sim} vfx=${row.vfxPct}% (control ${row.controlPct}%) audio=${row.audio} ${row.audio ? '' : JSON.stringify(row.cues)} ${row.classFx.join(' ')}`);
    }
  }
} finally {
  await browser.close();
}
const fails = rows.filter((r) => !(r.sim && r.vfx && r.audio));
console.log(JSON.stringify({ tool: 'gntPARTY-casts', skills: rows.length, passed: rows.length - fails.length, pageErrors: errors.length, fails: fails.map((f) => `${f.cls}.${f.skill}`) }, null, 1));
process.exit(fails.length || errors.length ? 1 : 0);
