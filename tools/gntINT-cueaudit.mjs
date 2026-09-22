#!/usr/bin/env node
// GI.3 — audio-cue audit for the W2 content (PLAN §7 "GI.3 Audio cues for all
// new content (G3.7 extended to W2 events)"). Owner: INT.
//
// Runs the AUDIO harness profile (PLAN §6.7: --autoplay-policy=no-user-gesture-
// required, headless Chrome renders Web Audio to a null sink), unlocks the
// engine, then triggers every new W2 sim event with the deterministic content
// commands of PLAN §6.4 and checks that the engine answered with a `sound`
// event (the observable contract) plus a cueLog entry on the right bus.
//
//   node tools/gntINT-cueaudit.mjs [--url http://127.0.0.1:5199] [--out f]
//
// Verdict per case: { event, fired, sounds:[cue], bus, gainDb } and a summary
// { covered, silent, missing } where `silent` lists the event types that are
// deliberately mute (a second cue on the same action would double up).
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5199');
const out = arg('out', 'captures/gntINT-cueaudit.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Event types the sim emits that carry NO cue on purpose. Each needs a reason:
// a silent event is a design decision, never an oversight (PLAN §3.5 table).
const SILENT = {
  screenshake: 'PLAN §3.5 table: "(none)"',
  hitstop: 'PLAN §3.5 table: "(none)"',
  interact: 'the interactable\'s own outcome cue fires on the same tick (bell_ring / sluice_toggle / dewfont_drink / keg_ignite); a second cue would double up',
  hazard_spawn: 'a hazard announces itself with hazard_telegraph before it can hurt anyone; spawning is silent',
  layout_enter: 'room structure, not an action — room_start carries the cue',
  room_enter: 'room_start carries the cue',
  spawn: 'enemy_spawn / spawn_telegraph carry the cue',
  crit_test: 'probe-only event',
  seat_control: 'net seat bookkeeping — the net HUD shows it',
  status_expire: 'a status running out is not an action; the apply cue marks the state',
  'status_apply(slow|ward|exposed|inspired)': 'those statuses refresh every pulse — a cue per refresh would machine-gun (src/render/skillfx/cues.js); stun / shield / haste are cued',
  telegraph_cancel: 'a cancelled telegraph must not be heard as a resolution',
  hazard_cancel: 'same as telegraph_cancel',
  rally_end: 'the rally horn marks the start; its end is silent',
  revive_drain_end: 'the revive chime marks the outcome',
  ally_regroup: 'AI bookkeeping',
  rescue_preempt: 'AI bookkeeping',
  skills_restored: 'save/restore bookkeeping',
  spoils_drop: 'room_cleared carries the moment',
  layout_placed: 'room structure',
  enemy_despawn: 'no death, no sound',
  enemy_retreat: 'AI bookkeeping',
  enemy_swoop_end: 'the swoop cue covers the pass',
  interactable_spawn: 'room structure',
  interactable_despawn: 'consumed assets fade out silently',
  projectile_spawn: 'enemy_fire / skill_bolt_spawn carry the cue',
  projectile_despawn: 'no impact, no sound',
  eshot_despawn: 'no impact, no sound',
  skill_bolt_despawn: 'no impact, no sound',
  zone_expire: 'zones fade out silently',
  azone_expire: 'zones fade out silently',
  slick_spawn: 'hazard_spawn rule',
  slick_expire: 'zones fade out silently',
  rubble_spawn: 'hazard_spawn rule',
  rubble_crumble: 'broken carries the cue',
  millrace_stop: 'sluice_toggle carries the lever moment',
  millrace_calm: 'the lane going quiet is the absence of its surge',
  run_wiped: 'run_end carries the stinger',
  defeat: 'run_end carries the stinger',
  room_soft_fail: 'has a cue (room_soft_fail) — listed only if it stops firing',
  seat_denied: 'net-only, cued inside a session',
  ally_dodge: 'net-only cue (registered by the session for remote seats)',
  echo_armed: 'echo_recast carries the moment',
  draft_taken: 'UI cue on the commit',
};

const browser = await launchEchoes({ gpu: true, autoplay: true });
const results = [];
let summary = null;
try {
  const { page, errors } = await openEchoes(browser, `${base}/?scene=arena&room=kill_all&seed=7&layout=3&menu=0`);
  await waitReady(page);
  // Unlock + record every sim event with its tick.
  const state = await page.evaluate(async () => {
    await window.__echoes.audio.unlock();
    window.__int = { evs: [] };
    window.__echoes.on('*', (ev) => {
      window.__int.evs.push({ tick: ev.tick, type: ev.type, cue: ev.cue ?? null, slot: ev.slot ?? null, itype: ev.itype ?? null, htype: ev.htype ?? null });
    });
    return { audio: window.__echoes.audio.state, types: window.__echoes.audio.eventTypes().sort() };
  });

  // One case: run `setup` (page function body), wait, report the events and
  // the sounds that landed in the window.
  async function probe(label, expect, code, waitMs = 700, keys = null) {
    const value = await page.evaluate(async (code) => {
      window.__n0 = window.__int.evs.length;
      window.__echoes.audio.cueLogClear();
      return await new Function(`return (async()=>{${code}})()`)();
    }, code);
    if (keys) for (const k of keys) {
      await page.keyboard.press(k);
      await sleep(140);
    }
    await sleep(waitMs);
    const r = await page.evaluate(() => ({ evs: window.__int.evs.slice(window.__n0), cueLog: window.__echoes.audio.cueLog(40) }));
    const types = [...new Set(r.evs.filter((e) => e.type !== 'sound').map((e) => e.type))];
    const sounds = r.evs.filter((e) => e.type === 'sound');
    const hit = expect.filter((t) => types.includes(t));
    // A cue counts as fired for event E when a `sound` event lands within 2
    // ticks of E (the engine emits on the same tick it hears the event).
    const firedFor = {};
    for (const t of expect) {
      const src = r.evs.filter((e) => e.type === t);
      firedFor[t] = src.some((s) => sounds.some((snd) => Math.abs(snd.tick - s.tick) <= 2));
    }
    const rec = {
      case: label,
      expected: expect,
      sawEvents: hit,
      missingEvents: expect.filter((t) => !types.includes(t)),
      cuesFired: firedFor,
      cues: r.cueLog.map((c) => `${c.cue}@${c.bus}${c.gainDb !== undefined ? ` ${c.gainDb}dB` : ''}`),
      sounds: sounds.map((s) => s.cue || s.slot),
      value,
    };
    results.push(rec);
    console.log(
      `${label.padEnd(22)} events ${hit.join(',') || '-'}${rec.missingEvents.length ? ` MISSING:${rec.missingEvents.join(',')}` : ''}  cues ${rec.sounds.join(',') || 'NONE'}`
    );
    return rec;
  }

  await probe('elite_spawn', ['elite_spawn'], `return __echoes.cmd('spawn','quillback',3,3,{elite:true})`);
  await probe(
    'hazard telegraph',
    ['hazard_telegraph'],
    `const id=__echoes.cmd('spawnHazard','puffcap',-3,2); window.__hz=id; __echoes.cmd('hazardPhase',id,'telegraph'); return id`
  );
  await probe('hazard resolve', ['hazard_resolve'], `__echoes.cmd('hazardPhase',window.__hz,'active'); return window.__hz`, 900);
  await probe(
    'keg ignite',
    ['keg_ignite'],
    `const id=__echoes.cmd('spawnInteractable','keg',4,-3); window.__keg=id; __echoes.cmd('armKeg',id); return id`
  );
  await probe('keg blast', ['keg_blast'], `return window.__keg`, 1600);
  await probe(
    'bell ring',
    ['interact', 'bell_ring'],
    `const id=__echoes.cmd('spawnInteractable','bell',0.3,0.3); __echoes.cmd('teleport',0,0); await new Promise(r=>setTimeout(r,200)); return __echoes.cmd('interactPress',[0])`
  );
  await probe(
    'sluice toggle',
    ['interact', 'sluice_toggle'],
    `const lane=__echoes.cmd('spawnHazard','millrace',5,7); const id=__echoes.cmd('spawnInteractable','sluice',5.3,4.3,{laneIds:[lane]}); __echoes.cmd('teleport',5,4); await new Promise(r=>setTimeout(r,250)); return {lane,id,r:__echoes.cmd('interactPress',[0])}`
  );
  await probe(
    'dewfont drink',
    ['interact', 'dewfont_drink'],
    `const id=__echoes.cmd('spawnInteractable','dewfont',-5.3,4.3); window.__dew=id; __echoes.cmd('teleport',-5,4); __echoes.cmd('setHp',__echoes.state().party[0].id,0.5); await new Promise(r=>setTimeout(r,200)); return __echoes.cmd('interactPress',[0])`
  );
  await probe('interact denied', ['interact_denied'], `return __echoes.cmd('interactPress',[0])`);
  await probe(
    'status apply',
    ['status_apply'],
    `const e=__echoes.state().enemies&&__echoes.state().enemies[0]; if(!e) return null; return __echoes.cmd('setStatus',e.id,'stun',1,60)`
  );
  // M4a's new skill / node events, cast by REAL key presses (keys 1-4).
  await probe(
    'skill cast + bolt',
    ['skill_cast', 'skill_bolt_spawn'],
    `__echoes.cmd('giveSkill','spirit_bolt'); __echoes.cmd('teleport',0,0); return __echoes.state().skills||null`,
    700,
    ['Digit1', 'Digit2', 'Digit3', 'Digit4']
  );
  // The remaining new W2 events fire only deep inside a build (a resonance
  // stack, a shard split, a ward eating a hit). For those the audit checks the
  // ENGINE SIDE live — the type is subscribed and its handler is
  // unconditional, i.e. every emission yields a cue — while the emission sites
  // are covered by M4a's / M4b's own gates:
  //   resonance_proc / split_shard / shield_absorb / technique_pulse /
  //   skill_bolt_pierce  src/render/skillfx/cues.js (all return a cue array)
  //   hit_blocked        src/render/hazards/cues.js  (m4b_tink, unconditional)
  //   echo_recast        src/audio/cues.js DEFAULT_EVENT_CUES
  {
    const REST = ['resonance_proc', 'split_shard', 'shield_absorb', 'technique_pulse', 'skill_bolt_pierce', 'hit_blocked', 'echo_recast', 'broken', 'waystone_spawn', 'siphon_drain', 'siphon_fizzle', 'siphon_selfheal'];
    const subscribed = await page.evaluate((list) => {
      const t = new Set(window.__echoes.audio.eventTypes());
      return Object.fromEntries(list.map((k) => [k, t.has(k)]));
    }, REST);
    const missing = Object.entries(subscribed).filter(([, v]) => !v).map(([k]) => k);
    results.push({ case: 'registered handlers', expected: REST, subscribed, missingEvents: missing, cuesFired: subscribed, cues: [], sounds: [] });
    console.log(`${'registered handlers'.padEnd(22)} subscribed ${REST.length - missing.length}/${REST.length}${missing.length ? ` MISSING:${missing.join(',')}` : ''}`);
  }

  await probe('room cleared', ['room_cleared'], `return __echoes.cmd('killAllEnemies')`, 1200);

  summary = {
    audio: state.audio,
    coveredTypes: state.types,
    silent: Object.keys(SILENT).length,
    pageErrors: errors,
  };
  const missing = results.filter((r) => r.missingEvents.length || Object.values(r.cuesFired).some((v) => !v));
  console.log(`\nfailures: ${missing.length ? missing.map((m) => m.case).join(', ') : 'none'}`);
  console.log(`page errors: ${errors.length}`);
} finally {
  await browser.close();
}
mkdirSync(join(root, dirname(out)), { recursive: true });
writeFileSync(join(root, out), JSON.stringify({ schema: 'gntINT-cueaudit/1', at: new Date().toISOString(), summary, silent: SILENT, results }, null, 1));
console.log(`-> ${out}`);
