#!/usr/bin/env node
// `npm test` — the headless safety net (code review finding 12, docs/TESTING.md
// "npm test"). Runs a curated set of browser-free probes one after another and
// exits 1 if any fails. CI (.github/workflows/test.yml) runs it with
// `vite build` on every push to gauntlet and every pull request.
//
//   npm test                       the whole suite (about 5 minutes)
//   npm test -- --only goldens     probes whose file name holds "goldens"
//   npm test -- --list             print the suite and stop
//
// A probe joins the suite when it opens no browser, needs no dev server, and
// finishes in a few minutes on one core. Browser probes stay manual.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SUITE = [
  // The net itself, the goldens, the languages and the data tables.
  { file: 'tools/test-safety-net-probe.mjs', args: [], what: 'the safety net checks itself' },
  { file: 'tools/gntM2-goldens.mjs', args: [], what: 'the nine goldens against tools/goldens.json' },
  { file: 'tools/i18n-extract.mjs', args: ['--check'], what: 'every language has every key' },
  { file: 'tools/prune-strings-probe.mjs', args: [], what: 'no unused translations, and the check fails on one' },
  { file: 'tools/data-xcheck-probe.mjs', args: [], what: 'every id a data table names exists' },
  { file: 'tools/gntM4b-layoutcheck.mjs', args: [], what: 'layout placements clear the spawn ring and entries' },
  // Saves.
  { file: 'tools/save-determinism-probe.mjs', args: [], what: 'a captured run plays on hash for hash' },
  { file: 'tools/gntM2-nodetrip.mjs', args: [], what: 'save round trips at several moments' },
  { file: 'tools/save-safety-probe.mjs', args: [], what: 'cloud loads, newer profiles, deed facts' },
  // Server and co-op.
  { file: 'tools/server-hardening-probe.mjs', args: [], what: 'server limits and backpressure' },
  { file: 'tools/gntfixM5a1-unit.mjs', args: [], what: 'link quality meter and snapshot header' },
  { file: 'tools/gntfixM5a4-unit.mjs', args: [], what: 'protocol v3 forms' },
  { file: 'tools/team-lobbyunit.mjs', args: [], what: 'co-op team pick in the lobby' },
  { file: 'tools/player-build-gating-probe.mjs', args: [], what: 'harness params and debug API gating' },
  // The run.
  { file: 'tools/gameplay-bugs-probe.mjs', args: [], what: 'Daily boss credit, room leftovers, shrine curses' },
  { file: 'tools/gameplay-fixes-probe.mjs', args: [], what: 'Famine, Endless on a Spire clear, fonts, guest Level Select, records restore' },
  { file: 'tools/polish-probe.mjs', args: [], what: 'Short Fuse in its room, Records dates, Level Select rows, Hourwarden weights' },
  { file: 'tools/code-health-probe.mjs', args: [], what: 'per-world colliders, the bundle split, dead code, audit pins' },
  { file: 'tools/lineup-probe.mjs', args: [], what: 'the party lineup' },
  { file: 'tools/healer-restore-probe.mjs', args: [], what: 'the original healer, the mouse model removed' },
  { file: 'tools/model-standard-probe.mjs', args: [], what: 'the model standard pilot: faceted Wyrm and Tank, timelines, locked feet' },
  { file: 'tools/model-standard-heroes-probe.mjs', args: [], what: 'the model standard heroes: combo, holds, recoil, spawn, points, locked feet, colours' },
  { file: 'tools/model-standard-level1-probe.mjs', args: [], what: 'the model standard on the Level I bosses: Stag, Thornmother, Gloam Wolf, the Wyrm re-measured' },
  { file: 'tools/model-standard-champions-probe.mjs', args: [], what: 'the model standard on the Level I champions: Briar Knight, Moss Hart' },
  { file: 'tools/model-standard-foes-probe.mjs', args: [], what: 'the model standard on the Level I foes: crowd budget, locked feet, strikes on the sim tick' },
  { file: 'tools/model-standard-level2-probe.mjs', args: [], what: 'the model standard on the Level II bosses: Drowned Heron, Millwheel (rolled on its paddles), Mire King' },
  { file: 'tools/model-standard-level4-champions-probe.mjs', args: [], what: 'the model standard on the Level IV champions: the Hollow Choir (a floater) and the Vein Matron (on her roots)' },
  { file: 'tools/model-standard-level2-champions-probe.mjs', args: [], what: 'the model standard on the Level II champions: Sluice Warden, Lockkeeper' },
  { file: 'tools/model-standard-level2-foes-probe.mjs', args: [], what: 'the model standard on the Level II foes: crowd budget, crown, locked feet, strikes on the sim tick' },
  { file: 'tools/model-standard-level3-probe.mjs', args: [], what: 'the model standard on the Level III bosses: Lich Ram (trot, rush, call read ahead), Ash Raven (hop, dive, gust, omen)' },
  { file: 'tools/model-standard-level3-champions-probe.mjs', args: [], what: 'the model standard on the Level III champions: Bone Reeve (scythe in both hands), Gravebell Ringer (bell pendulum, rope, mallet)' },
  { file: 'tools/model-standard-level4-probe.mjs', args: [], what: 'the model standard on the Level IV bosses: Hollow Cantor (a floater), Geode Colossus (on its fists), Vein Weaver (eight legs)' },
  { file: 'tools/model-standard-level3-foes-probe.mjs', args: [], what: 'the model standard on the Level III foes: crowd budget, crown, locked feet, strikes on the sim tick, the Barrow cues' },
  { file: 'tools/model-standard-level4-foes-probe.mjs', args: [], what: 'the model standard on the Level IV foes: husk, lancer, geode, censer, bloom, siphon' },
  { file: 'tools/vfx-hit-feedback-probe.mjs', args: [], what: 'the hit and the kill: render hold, hit reaction, kill pop, contact bloom, numbers, kill rumble' },
  { file: 'tools/vfx-hit-feedback2-probe.mjs', args: [], what: 'the cast, the shot, the reward and the aftermath: near light, stuck arrows, crit flipbook, frost air, the chest beat and its sounds' },
  { file: 'tools/vfx-extras-probe.mjs', args: [], what: 'the traced blade slash, the bigger stuck arrows and frost twinkles' },
  { file: 'tools/seat-focus-probe.mjs', args: [], what: 'seat focus: your hits stand out (party hits quieter and smaller, no party camera kicks, party kills shake at a third), the laptop render scale' },
  { file: 'tools/class-skills-probe.mjs', args: [], what: 'class skills' },
  { file: 'tools/one-cast-path-probe.mjs', args: [], what: 'one cast path: one zone system, one cast event (AUDIT D2)' },
  { file: 'tools/one-vfx-director-probe.mjs', args: [], what: 'one VFX director: one bus subscription per event (AUDIT D5)' },
  { file: 'tools/champions-probe.mjs', args: [], what: 'champion rooms' },
  { file: 'tools/vaults-probe.mjs', args: [], what: 'keys and vaults' },
  { file: 'tools/hazards-shrines-probe.mjs', args: [], what: 'hazards and shrines' },
  { file: 'tools/relics6-probe.mjs', args: [], what: 'relics batch six' },
  { file: 'tools/vow-ranks-probe.mjs', args: [], what: 'vow ranks' },
  { file: 'tools/act6-probe.mjs', args: [], what: 'the Ember Kiln' },
  { file: 'tools/kiln-bosses-probe.mjs', args: [], what: "the Kiln's bosses and the Level V fork" },
  // Modes.
  { file: 'tools/endless-probe.mjs', args: [], what: 'Endless' },
  { file: 'tools/daily-probe.mjs', args: [], what: 'the Daily Descent' },
  { file: 'tools/server-hardening-2-probe.mjs', args: [], what: 'daily tickets and the co-op input cap' },
];

const PER_PROBE_MS = 10 * 60 * 1000;
const root = fileURLToPath(new URL('..', import.meta.url));

function run(p) {
  return new Promise((done) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [p.file, ...p.args], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), PER_PROBE_MS);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      done({ ok: code === 0, code, signal, out, s: (Date.now() - t0) / 1000 });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
  const suite = only ? SUITE.filter((p) => p.file.includes(only)) : SUITE;
  if (argv.includes('--list')) {
    for (const p of suite) console.log(`${[p.file, ...p.args].join(' ')}  — ${p.what}`);
    process.exit(0);
  }
  const failed = [];
  const t0 = Date.now();
  for (const p of suite) {
    const r = await run(p);
    const name = [p.file.replace(/^tools\//, ''), ...p.args].join(' ');
    console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${name} (${r.s.toFixed(1)} s) — ${p.what}`);
    if (!r.ok) {
      failed.push(name);
      const tail = r.out.trimEnd().split('\n').slice(-25).join('\n');
      console.log(`${r.signal ? `  killed after ${PER_PROBE_MS / 60000} min\n` : ''}${tail.replace(/^/gm, '  | ')}`);
    }
  }
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(failed.length ? `\n${failed.length} of ${suite.length} probes failed in ${mins} min: ${failed.join(', ')}` : `\nall ${suite.length} probes passed in ${mins} min`);
  process.exit(failed.length ? 1 : 0);
}
