#!/usr/bin/env node
// Small fixes 9 probe (v0.5.304), headless:
//
//   node tools/small-fixes-9-probe.mjs [--root <checkout>]
//
//   soles    Pumice Soles' text says both things it does (floor patches never
//            slow the party, slick floors never make it slide), and so does
//            its heirloom unlock; all ten languages carry both lines
//   journal  the twelve elite powers have Journal rows (data/journal.js
//            AFFIX_JOURNAL, in AFFIX_IDS order) with the affix's own name and
//            a one-line description; the profile keeps an `affix` journal
//            block; every new line is translated in all ten languages
//   record   a sim run's `elite_affixes` and `death` events feed the
//            journal's affix kind the way save/index.js reads them (met on
//            arrival, counted on the fall)
//   deed     Signbreaker counts all twelve: eight is not enough, twelve is,
//            a profile that already holds the deed keeps it (never paid
//            twice), and earlier lifetime marks of the late four count
//   version  v0.5.304
// The Tempered calm is render-only: tools/small-fixes-9-shots.mjs checks it
// in the real game (__echoes.content.vfx().tempered).
// --root runs the same checks against another checkout (a `git archive` of
// gauntlet before this round: soles, journal and deed fail there).
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const ri = argv.indexOf('--root');
const here = ri >= 0 ? resolve(argv[ri + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
globalThis.performance ??= { now: () => Date.now() };
const { RELICS } = await import(u('src/sim/relics.js'));
const { AFFIXES, AFFIX_IDS, LATE_AFFIX_IDS } = await import(u('src/sim/affixes.js'));
const J = await import(u('src/data/journal.js'));
const { DEEDS, UNLOCKS, awardFor } = await import(u('src/data/unlocks.js'));
const { JOURNAL_KINDS, saneJournal } = await import(u('src/save/profile.js'));
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const { emptySnapshot } = await import(u('src/core/intents.js'));
const { VERSION } = await import(u('src/version.js'));

let failed = 0;
let passed = 0;
function check(leg, name, ok, detail = null) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}
const LANGS = ['de', 'es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-Hans', 'zh-Hant'];
const tables = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'))]));
const untranslated = (key) => LANGS.filter((l) => typeof tables[l][key] !== 'string' || !tables[l][key].trim() || tables[l][key] === key);

// --------------------------------------------------------------- soles --
{
  const text = RELICS.pumice_soles.text;
  check('soles', 'the text keeps the floor-patch line', /Floor patches never slow the party/.test(text), text);
  check('soles', 'the text says slick floors never make the party slide', /slick floors never make it slide/.test(text), text);
  check('soles', 'about the length of the other relic lines (at most 170 characters)', text.length <= 170, text.length);
  const heir = Object.values(UNLOCKS).find((x) => x.relic === 'pumice_soles');
  check('soles', 'the heirloom unlock carries the same text', !!heir && heir.text.endsWith(text), heir && heir.text);
  check('soles', 'both lines are translated in all nine other languages', untranslated(text).length === 0 && (!heir || untranslated(heir.text).length === 0), [...untranslated(text), ...(heir ? untranslated(heir.text) : [])]);
}

// ------------------------------------------------------------- journal --
const AJ = J.AFFIX_JOURNAL ?? [];
{
  check('journal', 'twelve elite powers have Journal rows, in affix order', AJ.length === 12 && AJ.map((a) => a.id).join() === AFFIX_IDS.join(), AJ.map((a) => a.id));
  check('journal', "each row's name is the affix's own (its name plate)", AJ.length > 0 && AJ.every((a) => a.name === AFFIXES[a.id].name));
  check('journal', 'each row has a one-line description, longer than the plate line', AJ.length > 0 && AJ.every((a) => typeof a.text === 'string' && a.text.length > AFFIXES[a.id].text.length && a.text.length <= 170 && !a.text.includes('\n')), AJ.map((a) => a.text.length));
  check('journal', 'the four late powers are marked late (from room 4 on) and say so', AJ.length > 0 && AJ.every((a) => a.late === LATE_AFFIX_IDS.includes(a.id) && (!a.late || /^From room 4/.test(a.text))));
  check('journal', 'the profile keeps an affix journal block', JOURNAL_KINDS.includes('affix') && saneJournal({ seen: { affix: { molten: 2, nope: 1 } } }).seen.affix.molten === 2);
  const keys = [...AJ.map((a) => a.text), ...AJ.map((a) => a.name), 'Elite powers', 'ELITE POWER', 'Not met yet. Elites carry it from room 4 of a level on.', 'Not met yet. Elites carry it in the campaign.'];
  const miss = keys.flatMap((k) => untranslated(k).map((l) => `${l}: ${k.slice(0, 30)}`));
  check('journal', `every new line is translated in all nine other languages (${keys.length} lines)`, AJ.length > 0 && miss.length === 0, miss.slice(0, 6));
  // A journal row's numbers match the rule table they describe.
  const nums = { molten: ['14', '4 s'], frozen: ['6', '45%'], warded: ['7.5 s', '2.5 s'], blinking: ['0.7 s'], thorned: ['2.6 u', '20%', '8'], gusting: ['0.9 s', '5', '2.4 u'], crystal: ['8', '30%'], tolling: ['40%', '2 s'], hasted: ['40%'], vampiric: ['40%'] };
  const off = AJ.filter((a) => (nums[a.id] ?? []).some((n) => !a.text.includes(n))).map((a) => a.id);
  check('journal', 'the descriptions quote the rule numbers', AJ.length > 0 && off.length === 0, off);
}

// -------------------------------------------------------------- record --
// The same reading save/index.js does: met on elite_affixes, +1 per power
// worn when that elite dies.
{
  const reg = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const rng = createGameplayRng(5);
  const world = createWorld({ rng, registry: reg, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ids = new Set(J.AFFIX_JOURNAL_IDS ?? []);
  const seen = {};
  const wore = new Map();
  bus.on('elite_affixes', (ev) => {
    for (const a of ev.affixes || []) if (ids.has(a)) seen[a] = seen[a] ?? 0;
    wore.set(ev.id, (ev.affixes || []).slice());
  });
  bus.on('death', (ev) => {
    for (const a of wore.get(ev.id) || []) if (ids.has(a)) seen[a] = (seen[a] ?? 0) + 1;
    wore.delete(ev.id);
  });
  const run = world.runSystem();
  run.cmd?.('startCampaign', { level: 6, seed: 5, depart: false });
  const step = () => clock.stepOnce((t) => world.step(t, emptySnapshot()));
  for (let i = 0; i < 30; i++) step();
  const late = ['gusting', 'cinder'];
  let eid = null;
  try {
    eid = world.cmd('spawn', 'boar', 0, -3, { elite: true, affixes: late });
  } catch {
    eid = null;
  }
  for (let i = 0; i < 4; i++) step();
  const metOk = late.every((a) => a in seen && seen[a] === 0);
  check('record', `an arriving elite's late powers are met (${late.join(', ')})`, eid !== null && metOk, seen);
  try {
    world.cmd('killAllEnemies');
  } catch {
    /* older builds */
  }
  for (let i = 0; i < 6; i++) step();
  check('record', 'its fall counts once for each power it wore', late.every((a) => seen[a] >= 1), seen);
}

// ---------------------------------------------------------------- deed --
{
  const D = DEEDS.signbreaker;
  const first = AFFIX_IDS.filter((a) => !LATE_AFFIX_IDS.includes(a));
  const life = (affix) => ({ affix, event: [], champion: [], arena: [], bosses: [] });
  check('deed', 'the deed text names all twelve', /twelve affixes/.test(D.text), D.text);
  check('deed', 'the deed text is translated in all nine other languages', untranslated(D.text).length === 0, untranslated(D.text));
  check('deed', 'the first eight alone no longer complete it', !D.test({}, life(first)));
  check('deed', 'all twelve complete it', D.test({}, life(AFFIX_IDS.slice())));
  check('deed', 'progress shows out of twelve, earlier late marks included', JSON.stringify(D.goal(life([...first, 'gusting']))) === JSON.stringify([9, 12]));
  // awardFor over a profile: one with the deed keeps it and is not paid
  // again; one with eleven marks finishes it on the twelfth.
  const facts = (affixes) => ({ rooms: 0, cleared: [], deep: [], complete: false, challenge: 'standard', vows: [], relics: [], bosses: [], curses: 0, runs: 1, depth: 0, party: [], objectives: [], champions: [], events: [], arenas: [], affixes });
  const meta = (deeds, affix) => ({ deeds, bosses: {}, marks: { event: [], affix, champion: [], arena: [], daily: { last: null, streak: 0, best: 0 } } });
  let a = null;
  try {
    a = awardFor(facts(['molten']), meta(['signbreaker'], first));
  } catch (err) {
    a = { error: String(err) };
  }
  check('deed', 'a profile that already holds Signbreaker keeps it and is not paid again', !!a && Array.isArray(a.deeds) && !a.deeds.includes('signbreaker'), a && (a.deeds ?? a.error));
  try {
    a = awardFor(facts(['cinder']), meta([], AFFIX_IDS.filter((x) => x !== 'cinder')));
  } catch (err) {
    a = { error: String(err) };
  }
  check('deed', 'eleven powers felled before plus the twelfth this run completes it', !!a && Array.isArray(a.deeds) && a.deeds.includes('signbreaker'), a && (a.deeds ?? a.error));
}

check('version', `the game shows v${VERSION} (v0.5.304 or later)`, VERSION.split('.').map(Number).reduce((a, n) => a * 1000 + n, 0) >= 5304, VERSION);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
