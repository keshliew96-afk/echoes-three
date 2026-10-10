// Cross-run unlocks (docs/UNLOCKS.md): the catalogue, the Ember award and the
// run boons a loadout turns into. Pure data + pure helpers: no DOM, no
// storage, no RNG. The profile (src/save/profile.js) owns the balance, what is
// owned and what is equipped; the run (src/sim/run.js) only ever sees the
// sanitised `boons` object a campaign is started with.
//
// THE RULE: an unlock changes a run only when the player has equipped it
// (picked it on the Unlocks screen). With nothing equipped `loadoutBoons()`
// returns null, startCampaign gets no boons, and the run is exactly the run
// it was before this file existed (same events, same draws, same goldens).
//
// Kinds:
//   kit      a class's alternative starting skills (skills outside its
//            starting pool), one per class at a time
//   heirloom start every run holding this relic (found in a run first)
//   purse    start every run with extra Glint (three tiers)
//   vow      a run-long curse on every combat room; each raises Embers +25%
//   tint     a class's VFX colours (cosmetic, local to this player's screen)
import { RELICS, RELIC_IDS, CURSES } from '../sim/relics.js';
import { SKILLS } from '../sim/skills.js';
import { CLASS_NAME } from './classes.js';
import { LINEUP_CLASSES } from './lineup.js';
import { LEVELS, ACT_IDS, bossFor } from './levels.js';
import { endlessBossIndex, CYCLE } from './endless.js';
import { RUSH_RULES } from './rush.js';
import { ENCOUNTER_IDS } from '../sim/encounters.js';
import { AFFIX_IDS } from '../sim/affixes.js';
import { CHAMPION_IDS } from '../sim/champions.js';
import { LAYOUTS, LAYOUT_IDS } from './layouts.js';
import { dayDiff, isDailyKey } from './daily.js';

export const META_VERSION = 1;
export const CURRENCY = 'Embers';

// Every class a loadout can dress (kits, tints): the Healer and every class
// that may join the team (data/lineup.js), the Tidecaller included.
export const LOADOUT_CLASSES = Object.freeze(['healer', ...LINEUP_CLASSES]);

// FEATS (docs/TIDECALLER.md): one-off facts a profile keeps in meta.feats
// that are not deeds and pay nothing themselves.
//   tidecaller   Rill has joined: the Verse of Water is free (the first
//                Level II clear, or a Level II boss felled)
//   rill_heron   the Drowned Heron felled with the Tidecaller in the party
export const FEATS = Object.freeze({
  tidecaller: { text: 'Free the Verse of Water: fell the Level II boss' },
  rill_heron: { text: 'Fell the Drowned Heron with the Tidecaller in the party' },
});
// The Level II bosses: felling any of them frees the Verse of Water (and Rill).
export const WATER_BOSSES = Object.freeze(['heron', 'millwheel', 'mireking']);
// A profile's feats as they stand: the stored list plus any the records
// already prove (a save from before feats existed, a Level II clear recorded
// before this build).
export function featsOf(meta, records = {}) {
  const out = new Set(Array.isArray(meta && meta.feats) ? meta.feats.filter((f) => FEATS[f]) : []);
  const bosses = (meta && meta.bosses) || {};
  const clears = (records && records.levelClears) || {};
  if ((clears[2] ?? 0) > 0 || WATER_BOSSES.some((k) => (bosses[k] ?? 0) > 0)) out.add('tidecaller');
  return [...out];
}
export const tidecallerFreed = (meta, records) => featsOf(meta, records).includes('tidecaller');

// -------------------------------------------------------------- earning --
export const EMBER_RULES = Object.freeze({
  perRoom: 3, // every room left behind (combat + shop)
  perLevelClear: Object.freeze({ 1: 20, 2: 40, 3: 60, 4: 80 }), // the level's boss killed
  campaignComplete: 50,
  // The Endless Descent (docs/ENDLESS.md): a depth past the first cycle (4)
  // cleared pays the Act IV clear plus this much per depth beyond 4.
  perDeepDepth: 20,
  challengeMul: Object.freeze({ relaxed: 0.75, standard: 1, harrowing: 1.5 }),
  perVow: 0.25, // +25% of the run's Embers for each vow worn
  // BOSS RUSH (docs/BOSS_RUSH.md): each boss a rush fells, and a rush won.
  perRushBoss: 15,
  rushWon: 60,
});

// Every boss of every level, in level order ({ kind, name, level }).
// (Each boss is listed once, at the first level it belongs to.)
export const BOSSES = Object.freeze(
  ACT_IDS.flatMap((a) => (LEVELS[a].bosses ?? []).map((b) => Object.freeze({ kind: b.kind, name: b.name, level: a }))).filter(
    (b, i, all) => all.findIndex((o) => o.kind === b.kind) === i
  )
);

// ROUND TWO (docs/UNLOCKS.md "Round two"): the lifetime marks some deeds
// count across runs, kept in meta.marks (a profile from before them loads
// with empty ones):
//   event     every kind of event room entered
//   affix     every elite affix felled (an elite counts for each it wore)
//   champion  every champion felled
//   arena     every act's arena fought in (the layouts flagged `arena`)
//   daily     { last: 'YYYY-MM-DD' | null, streak, best }: Daily Descent days in a row
export const ARENA_IDS = Object.freeze(LAYOUT_IDS.filter((id) => LAYOUTS[id] && LAYOUTS[id].arena));
export const MARK_KINDS = Object.freeze({ event: ENCOUNTER_IDS, affix: AFFIX_IDS, champion: CHAMPION_IDS, arena: ARENA_IDS });
export const OBJECTIVE_DEED_MODES = Object.freeze(['hunt', 'purge', 'escort', 'hold']);
export function freshMarks() {
  return { event: [], affix: [], champion: [], arena: [], daily: { last: null, streak: 0, best: 0 } };
}
export function saneMarks(m) {
  const out = freshMarks();
  if (!m || typeof m !== 'object') return out;
  for (const [k, ids] of Object.entries(MARK_KINDS)) if (Array.isArray(m[k])) out[k] = [...new Set(m[k].filter((v) => ids.includes(v)))];
  const d = m.daily && typeof m.daily === 'object' ? m.daily : {};
  out.daily.last = isDailyKey(d.last) ? d.last : null;
  out.daily.streak = out.daily.last ? Math.max(0, Math.round(num(d.streak))) : 0;
  out.daily.best = Math.max(out.daily.streak, Math.round(num(d.best)));
  return out;
}
// The marks after this run's facts (a pure copy; awardRun stores it). A Daily
// played the day after the last one adds a day to the streak; the same day
// again changes nothing; a gap starts a new streak of one.
export function marksAfter(marks, facts) {
  const m = saneMarks(marks);
  const f = facts || {};
  for (const [k, key] of Object.entries(MARK_FACT)) for (const v of Array.isArray(f[key]) ? f[key] : []) if (MARK_KINDS[k].includes(v) && !m[k].includes(v)) m[k].push(v);
  if (isDailyKey(f.daily)) {
    const gap = m.daily.last ? dayDiff(m.daily.last, f.daily) : NaN;
    if (!(gap <= 0)) {
      m.daily.streak = gap === 1 ? m.daily.streak + 1 : 1;
      m.daily.last = f.daily;
    }
    m.daily.best = Math.max(m.daily.best, m.daily.streak);
  }
  return m;
}
// Which list of a run's facts feeds each mark.
const MARK_FACT = Object.freeze({ event: 'events', affix: 'affixes', champion: 'champions', arena: 'arenas' });
// The lifetime view the deeds test: the marks after this run plus every boss
// kind ever felled.
export function lifeAfter(meta, facts) {
  const bosses = new Set(Object.keys((meta && meta.bosses) || {}));
  for (const k of (facts && facts.bosses) || []) bosses.add(k);
  return { ...marksAfter(meta && meta.marks, facts), bosses: [...bosses] };
}
const markCount = (life, k) => ((life && life[k]) || []).length;
const allFelled = (life) => BOSSES.every((b) => ((life && life.bosses) || []).includes(b.kind));

// One-off deeds: paid once, on the run that first meets them (not multiplied).
// test(facts, life): `life` is the profile's lifetime marks after this run
// (marksAfter, plus `bosses`: every boss kind ever felled). A deed with
// `goal(life)` -> [have, need] shows how far along the player is.
const bossDeeds = BOSSES.map((b) => [
  `boss_${b.kind}`,
  { name: `Fell ${b.name.replace(/^The /, 'the ')}`, text: `Defeat ${b.name.replace(/^The /, 'the ')}.`, embers: 25, test: (r) => r.bosses.includes(b.kind) },
]);
export const DEEDS = Object.freeze(
  Object.fromEntries([
    ['first_light', { name: 'First Light', text: 'Clear Level I.', embers: 20, test: (r) => r.cleared.includes(1) }],
    ...bossDeeds,
    ['long_road', { name: 'The Long Road', text: ACT_IDS.length === 4 ? 'Complete a campaign (Levels I to IV).' : 'Complete a campaign (Levels I to III).', embers: 60, test: (r) => r.complete }],
    // Act IV (docs/ACT_IV.md): the first clear of the Hollow Heart.
    ...(ACT_IDS.includes(4) ? [['heart_cleared', { name: 'Heartbreaker', text: 'Clear Level IV, the Hollow Heart.', embers: 50, test: (r) => r.cleared.includes(4) }]] : []),
    ['harrowed', { name: 'Harrowed', text: 'Clear a level on the Harrowing challenge.', embers: 40, test: (r) => r.cleared.length > 0 && r.challenge === 'harrowing' }],
    ['cursebearer', { name: 'Cursebearer', text: 'Walk through 3 cursed doors in one run.', embers: 25, test: (r) => r.curses >= 3 }],
    ['magpie', { name: 'Magpie', text: 'Hold 5 relics at once.', embers: 25, test: (r) => r.relics.length >= 5 }],
    ['oathbound', { name: 'Oathbound', text: 'Clear a level wearing 2 vows.', embers: 40, test: (r) => r.cleared.length > 0 && r.vows.length >= 2 }],
    ['veteran', { name: 'Veteran', text: 'Finish 10 runs.', embers: 30, test: (r) => r.runs >= 10 }],
    ['deep_five', { name: 'Into the Deep', text: 'Reach Depth 5 of the Endless Descent.', embers: 50, test: (r) => r.depth >= 5 }],
    ['deep_eight', { name: 'Abyss Walker', text: 'Reach Depth 8 of the Endless Descent.', embers: 100, test: (r) => r.depth >= 8 }],
    // THE TIDECALLER (docs/TIDECALLER.md).
    ['rills_return', { name: "Rill's Return", text: 'Clear a level with the Tidecaller in the party.', embers: 25, test: (r) => r.cleared.length + (r.deep || []).length > 0 && (r.party || []).includes('tidecaller') }],
    ['high_water', { name: 'High Water', text: 'Crash 5 soaked enemies with one cast.', embers: 30, test: (r) => (r.crashBest || 0) >= 5 }],
    // BOSS RUSH (docs/BOSS_RUSH.md).
    ['rush_lap', { name: 'Once Around', text: 'Fell the first four bosses of a Boss Rush.', embers: 30, test: (r) => !!r.rush && r.rush.felled >= 4 }],
    ['rush_won', { name: 'Back to Back', text: 'Win a Boss Rush: all eight bosses.', embers: 60, test: (r) => !!r.rush && r.rush.won }],
    ['rush_swift', { name: 'Against the Clock', text: 'Win a Boss Rush in under 10 minutes.', embers: 80, test: (r) => !!r.rush && r.rush.won && r.rush.sec > 0 && r.rush.sec < RUSH_RULES.swiftSec }],
    // ROUND TWO (docs/UNLOCKS.md): the event rooms, affixes, objectives,
    // champions, vaults, arenas, relics, bosses, Rill and the Daily.
    ['wayfarer', { name: 'Wayfarer', text: 'Enter every kind of event room.', embers: 60, test: (r, l) => markCount(l, 'event') >= ENCOUNTER_IDS.length, goal: (l) => [markCount(l, 'event'), ENCOUNTER_IDS.length] }],
    ['signbreaker', { name: 'Signbreaker', text: 'Fell an elite with each of the eight affixes.', embers: 60, test: (r, l) => markCount(l, 'affix') >= AFFIX_IDS.length, goal: (l) => [markCount(l, 'affix'), AFFIX_IDS.length] }],
    ['run_to_ground', { name: 'Run to Ground', text: 'Win a Hunt room: catch the quarry before it escapes.', embers: 20, test: (r) => (r.objectives || []).includes('hunt') }],
    ['scorched_nests', { name: 'Scorched Nests', text: 'Win a Purge room: break every nest in time.', embers: 20, test: (r) => (r.objectives || []).includes('purge') }],
    ['safe_home', { name: 'Safe Home', text: 'Win an Escort room: bring the pilgrim home.', embers: 20, test: (r) => (r.objectives || []).includes('escort') }],
    ['holdfast', { name: 'Holdfast', text: 'Win a Hold room: keep the sigil to the end.', embers: 20, test: (r) => (r.objectives || []).includes('hold') }],
    ['four_trials', { name: 'Four Trials', text: 'Win a Hunt, a Purge, an Escort and a Hold room in one run.', embers: 50, test: (r) => OBJECTIVE_DEED_MODES.every((m) => (r.objectives || []).includes(m)) }],
    ['crownbreaker', { name: 'Crownbreaker', text: 'Fell a champion.', embers: 20, test: (r) => (r.champions || []).length > 0 }],
    ['four_crowns', { name: 'Four Crowns', text: 'Fell all four champions: the Briar Knight, the Sluice Warden, the Bone Reeve and the Hollow Choir.', embers: 60, test: (r, l) => markCount(l, 'champion') >= CHAMPION_IDS.length, goal: (l) => [markCount(l, 'champion'), CHAMPION_IDS.length] }],
    ['keyholder', { name: 'Keyholder', text: 'Open a vault.', embers: 20, test: (r) => (r.vaults || 0) >= 1 }],
    ['treasure_seeker', { name: 'Treasure Seeker', text: 'Open 3 vaults in one run.', embers: 50, test: (r) => (r.vaults || 0) >= 3 }],
    ['ringwalker', { name: 'Ringwalker', text: 'Fight in every arena: the Thornwood Ring, the Millrace Basin, the Ash Amphitheatre and the Hollow Nave.', embers: 40, test: (r, l) => markCount(l, 'arena') >= ARENA_IDS.length, goal: (l) => [markCount(l, 'arena'), ARENA_IDS.length] }],
    ['hoarder', { name: 'Hoarder', text: 'Hold 8 relics at once.', embers: 40, test: (r) => r.relics.length >= 8 }],
    ['kingslayer', { name: 'Kingslayer', text: 'Fell every boss at least once, the Vein Weaver included.', embers: 120, test: (r, l) => allFelled(l), goal: (l) => [BOSSES.filter((b) => ((l && l.bosses) || []).includes(b.kind)).length, BOSSES.length] }],
    ['down_the_river', { name: 'Down the River', text: 'Complete a campaign with the Tidecaller in the party.', embers: 60, test: (r) => r.complete && (r.party || []).includes('tidecaller') }],
    ['three_dawns', { name: 'Three Dawns', text: 'Play the Daily Descent three days in a row.', embers: 30, test: (r, l) => !!(l && l.daily) && l.daily.best >= 3, goal: (l) => [Math.min(3, (l && l.daily && l.daily.best) || 0), 3] }],
    ['seven_dawns', { name: 'Seven Dawns', text: 'Play the Daily Descent seven days in a row.', embers: 80, test: (r, l) => !!(l && l.daily) && l.daily.best >= 7, goal: (l) => [Math.min(7, (l && l.daily && l.daily.best) || 0), 7] }],
  ])
);
export const DEED_IDS = Object.freeze(Object.keys(DEEDS));

// ------------------------------------------------------------ catalogue --
// req: what must be true before the unlock can be bought (or, with cost 0,
// what unlocks it outright):
//   { level: N }    Level N cleared once     { campaign: true } a campaign completed
//   { boss: kind }  that boss defeated once  { relic: id }      that relic taken in a run
//   { unlock: id }  another unlock owned     { runs: N }        N runs finished
//   { depth: N }    Depth N reached in the Endless Descent (records.endlessBestDepth)
//   { feat: id }    that feat is on the profile (FEATS above: Rill has joined, ...)
//   { deed: id }    that deed is done (DEEDS above)
const KIT_ROWS = [
  ['kit_lanternbearer', 'healer', 'Lanternbearer', ['mending_bolt', 'lantern_flurry'], 60, null, 'Begin with Mending Bolt and Lantern Flurry: three lantern darts that hit back.'],
  ['kit_grovekeeper', 'healer', 'Grovekeeper', ['dewfall', 'mending_tide'], 90, { level: 1 }, 'Begin with Dewfall and Mending Tide: healing pools and a sweeping mend.'],
  ['kit_bulwark', 'tank', 'Bulwark', ['heavy_slam', 'shield_wall', 'taunting_roar', 'iron_stance'], 80, null, 'The Tank begins with Heavy Slam, Shield Wall, Taunting Roar and Iron Stance.'],
  ['kit_duelist', 'swordsman', 'Duelist', ['flurry', 'fox_step', 'riposte', 'crescent_finisher'], 80, { level: 1 }, 'The Swordsman begins with Flurry, Fox Step, Riposte and Crescent Finisher.'],
  ['kit_warden', 'archer', 'Warden', ['piercing_shot', 'pinning_arrow', 'rain_of_arrows', 'kestrel_watch'], 80, { level: 2 }, 'The Archer begins with Piercing Shot, Pinning Arrow, Rain of Arrows and Kestrel Watch.'],
  // THE TIDECALLER: Torrent and Bubble Ward arrive with the rest of her kit
  // (the plan's slice 3); a kit only ever carries skills that exist.
  ['kit_millrace', 'tidecaller', 'Millrace', ['riverbolt', 'undertow', 'torrent', 'bubble_ward'], 80, { feat: 'tidecaller' }, 'The Tidecaller begins with Riverbolt, Undertow, Torrent and Bubble Ward.'],
  // ROUND TWO: a second kit per class from the newest skills of its pool.
  ['kit_dawnwatch', 'healer', 'Dawnwatch', ['lantern_ward', 'dawn_brand'], 100, { level: 3 }, 'Begin with Lantern Ward and Dawn Brand: a guarding lantern and a burning mark.'],
  ['kit_earthwarden', 'tank', 'Earthwarden', ['earthshatter', 'rallying_cry', 'earthen_grasp', 'shield_wall'], 100, { level: 3 }, 'The Tank begins with Earthshatter, Rallying Cry, Earthen Grasp and Shield Wall.'],
  ['kit_moonblade', 'swordsman', 'Moonblade', ['moonfang', 'blade_dance', 'crimson_edge', 'razor_wake'], 100, { level: 3 }, 'The Swordsman begins with Moonfang, Blade Dance, Crimson Edge and Razor Wake.'],
  ['kit_huntmaster', 'archer', 'Huntmaster', ['hunters_mark', 'barbed_trap', 'feather_fan', 'vault_shot'], 100, { level: 3 }, "The Archer begins with Hunter's Mark, Barbed Trap, Feather Fan and Vault Shot."],
  ['kit_stormwater', 'tidecaller', 'Stormwater', ['crashing_wave', 'rain_squall', 'maelstrom', 'whirlpool'], 100, { level: 4 }, 'The Tidecaller begins with Crashing Wave, Rain Squall, Maelstrom and Whirlpool.'],
];
const HEIRLOOM_COST = Object.freeze({ common: 40, rare: 90, legendary: 160 });
const PURSE_ROWS = [
  ['purse_1', 1, 15, 50, null],
  ['purse_2', 2, 30, 100, { unlock: 'purse_1' }],
  ['purse_3', 3, 45, 150, { unlock: 'purse_2' }],
];
// Vows reuse the four room curses that reshape a room's numbers; each is
// earned (free) by a milestone.
const VOW_ROWS = [
  ['vow_elite_tide', 'elite_tide', { level: 1 }],
  ['vow_crowded', 'crowded', { level: 2 }],
  ['vow_iron_hide', 'iron_hide', { level: 3 }],
  ['vow_sharp_fangs', 'sharp_fangs', { campaign: true }],
  // ROUND TWO: waves that come sooner, and warnings that run shorter
  // (Short Fuse has no wave numbers; the run shortens every telegraph).
  ['vow_restless', 'restless', { level: 4 }],
  ['vow_short_fuse', 'short_fuse', { deed: 'rush_lap' }],
];
const TINT_ROWS = [
  ['tint_moonlit', 'healer', 'Moonlit', { glow: '#9FB8FF', second: '#E4EAFF', debris: '#E4EAFF' }, 30, null],
  ['tint_emberforge', 'tank', 'Emberforge', { glow: '#FF8A3D', second: '#FFD08A', debris: '#6A3A1E' }, 30, null],
  ['tint_gravefrost', 'swordsman', 'Gravefrost', { glow: '#7FE0FF', second: '#E0F7FF', debris: '#E0F7FF' }, 30, null],
  ['tint_thornbloom', 'archer', 'Thornbloom', { glow: '#B8E05E', second: '#F0E6A0', debris: '#C9C2B3' }, 30, null],
  ['tint_wyrmfire', 'healer', 'Wyrmfire', { glow: '#FF5A3C', second: '#FFC27A', debris: '#FFE2C0' }, 0, { boss: 'wyrm' }],
  ['tint_heronmist', 'archer', 'Heron Mist', { glow: '#A9C6D8', second: '#EEF4F8', debris: '#EEF4F8' }, 0, { boss: 'heron' }],
  ['tint_abyssal', 'swordsman', 'Abyssal', { glow: '#7A5CFF', second: '#D8CCFF', debris: '#D8CCFF' }, 0, { depth: 6 }],
  // Act IV's bosses (docs/ACT_IV_BOSSES.md).
  ['tint_hollowsong', 'tank', 'Hollow Song', { glow: '#B565F5', second: '#F4E8FF', debris: '#E3D2FF' }, 0, { boss: 'cantor' }],
  ['tint_geodeglass', 'archer', 'Geode Glass', { glow: '#C9B8FF', second: '#F2F4FF', debris: '#8C8794' }, 0, { boss: 'colossus' }],
  // Third bosses (docs/THIRD_BOSSES.md).
  ['tint_gloamfang', 'swordsman', 'Gloamfang', { glow: '#C8D2E8', second: '#B79CF0', debris: '#5A6070' }, 0, { boss: 'gloamwolf' }],
  ['tint_millpond', 'healer', 'Millpond', { glow: '#5FC2B0', second: '#E2F2EC', debris: '#3D4840' }, 0, { boss: 'mireking' }],
  ['tint_ashfeather', 'tank', 'Ashfeather', { glow: '#9AA0AE', second: '#C79BFF', debris: '#2E2C34' }, 0, { boss: 'ashraven' }],
  ['tint_veinsilk', 'swordsman', 'Veinsilk', { glow: '#D06BFF', second: '#F6E6FF', debris: '#6A4A86' }, 0, { boss: 'veinweaver' }],
  // THE TIDECALLER (docs/TIDECALLER.md).
  ['tint_brine', 'tidecaller', 'Brine', { glow: '#3FC9A8', second: '#F2EEE2', debris: '#9FB8AE' }, 30, { feat: 'tidecaller' }],
  ['tint_heronrain', 'tidecaller', 'Heron Rain', { glow: '#8FB4D9', second: '#F4F8FC', debris: '#C7D3DD' }, 0, { feat: 'rill_heron' }],
  // ROUND TWO: Act IV's colours, and one for the four champions.
  ['tint_heartlight', 'healer', 'Heartlight', { glow: '#FF6F93', second: '#FFE1EA', debris: '#7A3048' }, 40, { level: 4 }],
  ['tint_censersmoke', 'tank', 'Censer Smoke', { glow: '#E8A858', second: '#F6E4C4', debris: '#4E4236' }, 40, { level: 4 }],
  ['tint_hollowtide', 'tidecaller', 'Hollow Tide', { glow: '#8C6CFF', second: '#DDD3FF', debris: '#3C3858' }, 40, { level: 4 }],
  ['tint_crowned', 'archer', 'Crowned', { glow: '#FFCF4A', second: '#FFF3C4', debris: '#8A6A2A' }, 0, { deed: 'four_crowns' }],
];

function build() {
  const out = {};
  for (const [id, cls, name, skills, cost, req, text] of KIT_ROWS) {
    out[id] = Object.freeze({ id, kind: 'kit', cls, name, skills: Object.freeze(skills.filter((s) => SKILLS[s])), cost, req, text });
  }
  for (const rid of RELIC_IDS) {
    const r = RELICS[rid];
    const id = `heirloom_${rid}`;
    out[id] = Object.freeze({ id, kind: 'heirloom', relic: rid, name: r.name, rarity: r.rarity, cost: HEIRLOOM_COST[r.rarity] ?? 90, req: { relic: rid }, text: `Begin every run holding ${r.name}. ${r.text}` });
  }
  for (const [id, tier, glint, cost, req] of PURSE_ROWS) {
    out[id] = Object.freeze({ id, kind: 'purse', tier, glint, name: `Pilgrim's Purse ${'I'.repeat(tier)}`, cost, req, text: `Begin every run with ${glint} extra Glint.` });
  }
  for (const [id, curse, req] of VOW_ROWS) {
    const c = CURSES[curse];
    out[id] = Object.freeze({ id, kind: 'vow', curse, name: `Vow: ${c.name}`, cost: 0, req, text: `${c.text.replace('in this room', 'in every combat room').replace('this room', 'every combat room')} Embers +${Math.round(EMBER_RULES.perVow * 100)}%.` });
  }
  for (const [id, cls, name, colors, cost, req] of TINT_ROWS) {
    out[id] = Object.freeze({ id, kind: 'tint', cls, name: `${name} tint`, colors: Object.freeze(colors), cost, req, text: `${CLASS_NAME[cls]} effects burn in ${name} colours. Cosmetic.` });
  }
  return Object.freeze(out);
}
export const UNLOCKS = build();
export const UNLOCK_IDS = Object.freeze(Object.keys(UNLOCKS));
export const UNLOCK_KINDS = Object.freeze(['kit', 'heirloom', 'purse', 'vow', 'tint']);
export const KIND_LABEL = Object.freeze({ kit: 'Kits', heirloom: 'Heirlooms', purse: 'Purse', vow: 'Vows', tint: 'Tints' });

// ------------------------------------------------------------ the meta --
export function freshLoadout() {
  return {
    kits: Object.fromEntries(LOADOUT_CLASSES.map((c) => [c, null])),
    heirloom: null,
    purse: 0,
    vows: [],
    tints: Object.fromEntries(LOADOUT_CLASSES.map((c) => [c, null])),
  };
}
export function freshMeta() {
  return { mv: META_VERSION, embers: 0, earned: 0, owned: {}, deeds: [], bosses: {}, relicsSeen: [], feats: [], marks: freshMarks(), loadout: freshLoadout(), lastAward: null };
}

const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
// A stored meta of any version -> the current shape. Unknown keys are kept
// out; an owned unlock this build no longer has is dropped and what was paid
// for it goes back on the balance (so content removed in a later version never
// eats Embers); a loadout only ever holds what is owned.
export function saneMeta(m) {
  const f = freshMeta();
  if (!m || typeof m !== 'object') return f;
  const out = f;
  out.embers = Math.max(0, Math.round(num(m.embers)));
  const owned = m.owned && typeof m.owned === 'object' ? m.owned : {};
  for (const [id, paid] of Object.entries(owned)) {
    if (UNLOCKS[id]) out.owned[id] = Math.max(0, Math.round(num(paid)));
    else out.embers += Math.max(0, Math.round(num(paid)));
  }
  out.earned = Math.max(out.embers, Math.round(num(m.earned)));
  out.deeds = Array.isArray(m.deeds) ? [...new Set(m.deeds.filter((d) => DEEDS[d]))] : [];
  if (m.bosses && typeof m.bosses === 'object') for (const [k, n] of Object.entries(m.bosses)) if (Number.isFinite(n) && n > 0) out.bosses[k] = Math.round(n);
  out.relicsSeen = Array.isArray(m.relicsSeen) ? [...new Set(m.relicsSeen.filter((r) => RELICS[r]))] : [];
  out.feats = Array.isArray(m.feats) ? [...new Set(m.feats.filter((f) => FEATS[f]))] : [];
  out.marks = saneMarks(m.marks);
  const l = m.loadout && typeof m.loadout === 'object' ? m.loadout : {};
  const has = (id, kind) => !!(id && out.owned[id] !== undefined && UNLOCKS[id] && UNLOCKS[id].kind === kind);
  for (const c of LOADOUT_CLASSES) {
    const k = l.kits && l.kits[c];
    if (has(k, 'kit') && UNLOCKS[k].cls === c) out.loadout.kits[c] = k;
    const t = l.tints && l.tints[c];
    if (has(t, 'tint') && UNLOCKS[t].cls === c) out.loadout.tints[c] = t;
  }
  if (has(l.heirloom, 'heirloom')) out.loadout.heirloom = l.heirloom;
  const tier = Math.round(num(l.purse));
  out.loadout.purse = tier > 0 && has(`purse_${tier}`, 'purse') ? tier : 0;
  out.loadout.vows = Array.isArray(l.vows) ? [...new Set(l.vows.filter((v) => has(v, 'vow')))] : [];
  out.lastAward = m.lastAward && typeof m.lastAward === 'object' && Number.isFinite(m.lastAward.embers) ? m.lastAward : null;
  return out;
}

// --------------------------------------------------------- requirements --
// ctx = { meta, records } (records: the profile's records).
export function reqMet(req, { meta, records }) {
  if (!req) return true;
  const rec = records || {};
  if (req.level) return ((rec.levelClears && rec.levelClears[req.level]) || 0) > 0;
  if (req.campaign) return (rec.campaignsCompleted || 0) > 0;
  if (req.boss) return ((meta.bosses && meta.bosses[req.boss]) || 0) > 0;
  if (req.relic) return Array.isArray(meta.relicsSeen) && meta.relicsSeen.includes(req.relic);
  if (req.unlock) return meta.owned && meta.owned[req.unlock] !== undefined;
  if (req.runs) return (rec.runs || 0) >= req.runs;
  if (req.depth) return (rec.endlessBestDepth || 0) >= req.depth;
  if (req.feat) return featsOf(meta, rec).includes(req.feat);
  if (req.deed) return Array.isArray(meta.deeds) && meta.deeds.includes(req.deed);
  return false;
}
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
export function reqText(req) {
  if (!req) return '';
  if (req.level) return `Clear Level ${ROMAN[req.level] ?? req.level}`;
  if (req.campaign) return 'Complete a campaign';
  if (req.boss) return `Defeat ${((BOSSES.find((b) => b.kind === req.boss) || {}).name ?? req.boss).replace(/^The /, 'the ')}`;
  if (req.relic) return `Find ${RELICS[req.relic] ? RELICS[req.relic].name : req.relic} in a run`;
  if (req.unlock) return `Own ${UNLOCKS[req.unlock] ? UNLOCKS[req.unlock].name : req.unlock}`;
  if (req.runs) return `Finish ${req.runs} runs`;
  if (req.depth) return `Reach Depth ${req.depth} of the Endless Descent`;
  if (req.feat) return FEATS[req.feat] ? FEATS[req.feat].text : req.feat;
  if (req.deed) return `Earn the deed ${DEEDS[req.deed] ? DEEDS[req.deed].name : req.deed}`;
  return '';
}

// One unlock's standing for this profile:
//   'owned' | 'buy' (requirement met, affordable) | 'poor' (met, not enough
//   Embers) | 'locked' (requirement not met). Free unlocks whose requirement
//   is met are granted by grantFree() at the run's award, so they read owned.
export function unlockState(id, ctx) {
  const u = UNLOCKS[id];
  if (!u) return 'locked';
  if (ctx.meta.owned[id] !== undefined) return 'owned';
  if (!reqMet(u.req, ctx)) return 'locked';
  return ctx.meta.embers >= u.cost ? 'buy' : 'poor';
}

// Free unlocks (cost 0) whose requirement is met -> owned (mutates meta).
export function grantFree(meta, records) {
  const got = [];
  for (const id of UNLOCK_IDS) {
    const u = UNLOCKS[id];
    if (u.cost === 0 && meta.owned[id] === undefined && reqMet(u.req, { meta, records })) {
      meta.owned[id] = 0;
      got.push(id);
    }
  }
  return got;
}

// ---------------------------------------------------------------- award --
// The facts of a finished run, from the run summary (sim/run.js buildSummary)
// and the profile's records AFTER this run was recorded.
export function runFacts(summary, records = {}) {
  const s = summary || {};
  const camp = s.campaign && Array.isArray(s.campaign.levels) ? s.campaign : null;
  const clearedRows = camp ? camp.levels.filter((l) => l.cleared) : s.result === 'victory' ? [{ level: s.act ?? 1, index: 1 }] : [];
  // BOSS RUSH: a fight won fells its boss but clears no level.
  const rush = camp && camp.rush ? camp.rush : null;
  const cleared = rush ? [] : clearedRows.map((l) => l.level);
  // ENDLESS (docs/ENDLESS.md): levels past the first cycle (Depth 4) carry
  // their depth as `index`; the boss each one met is the run's own record.
  const isDeep = (l) => !!(camp && camp.endless) && num(l.index) > CYCLE;
  const deep = clearedRows.filter(isDeep).map((l) => l.index);
  // (past the first cycle the boss alternates by depth: endlessBossIndex; within the
  // campaign the seed decides: bossFor)
  const deepBoss = (l) => {
    const list = LEVELS[l.level] && LEVELS[l.level].bosses;
    const b = list ? list[endlessBossIndex(l.index, s.seed ?? null)] : null;
    return b ? b.kind : null;
  };
  const bosses = clearedRows
    .map((l) => (typeof l.boss === 'string' ? l.boss : isDeep(l) ? deepBoss(l) : bossFor(l.level, s.seed ?? null).kind))
    .filter(Boolean);
  const boons = s.boons || null;
  const depth = camp && camp.endless ? Math.max(num(camp.depth), num(camp.index), ...camp.levels.map((l) => num(l.index))) : 0;
  // THE TIDECALLER: who stood in the party (the run's four builds), and the
  // most soaked enemies one cast crashed (save/index.js counts it).
  const dr = s.deedRun && typeof s.deedRun === 'object' ? s.deedRun : {};
  const party = Array.isArray(s.builds) ? s.builds.map((b) => b && b.classId).filter((c) => typeof c === 'string') : [];
  return {
    result: s.result ?? (s.victory ? 'victory' : 'defeat'),
    rooms: rush ? 0 : Math.max(0, num(s.roomsCleared ?? s.rooms)),
    cleared: rush ? [] : cleared.filter((_, i) => !isDeep(clearedRows[i])),
    ...(rush ? { rush: { felled: Math.max(0, num(rush.felled)), won: !!rush.won, sec: Math.round(num(s.timeSec ?? (num(s.ticks) / 60))) } } : {}),
    deep,
    depth,
    bosses,
    complete: !!(camp ? camp.complete : false),
    challenge: s.challenge ?? 'standard',
    vows: boons && Array.isArray(boons.vows) ? boons.vows : [],
    relics: Array.isArray(s.relics) ? s.relics : [],
    curses: Math.max(0, num(s.curses)),
    runs: num(records.runs),
    party,
    crashBest: Math.max(0, num(s.crashBest)),
    // ROUND TWO: what the save service saw this run (save/index.js deedRun).
    events: list(dr.events),
    affixes: list(dr.affixes),
    objectives: list(dr.objectives),
    champions: list(dr.champions),
    arenas: Array.isArray(dr.arenas) ? [...new Set(dr.arenas.filter((v) => ARENA_IDS.includes(v)))] : [],
    vaults: Math.max(0, Math.round(num(dr.vaults))),
    daily: camp && camp.daily && isDailyKey(camp.daily.key) ? camp.daily.key : null,
  };
}
const list = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string'))] : []);

// -> { embers, lines: [{ label, embers }], deeds: [id], bosses: [kind] }.
// `meta` is read (for deeds already done), never written.
export function awardFor(facts, meta) {
  const R = EMBER_RULES;
  const lines = [];
  if (facts.rooms > 0) lines.push({ label: `${facts.rooms} room${facts.rooms === 1 ? '' : 's'} cleared`, embers: facts.rooms * R.perRoom });
  for (const lv of facts.cleared) lines.push({ label: `Level ${ROMAN[lv] ?? lv} cleared`, embers: R.perLevelClear[lv] ?? 20 });
  for (const d of facts.deep || []) lines.push({ label: `Depth ${d} cleared`, embers: R.perLevelClear[CYCLE] + R.perDeepDepth * (d - CYCLE) });
  if (facts.complete) lines.push({ label: 'Campaign complete', embers: R.campaignComplete });
  if (facts.rush && facts.rush.felled > 0) lines.push({ label: `${facts.rush.felled} boss${facts.rush.felled === 1 ? '' : 'es'} felled in the rush`, embers: facts.rush.felled * R.perRushBoss });
  if (facts.rush && facts.rush.won) lines.push({ label: 'Boss Rush won', embers: R.rushWon });
  let base = lines.reduce((n, l) => n + l.embers, 0);
  const chMul = R.challengeMul[facts.challenge] ?? 1;
  const vowMul = 1 + R.perVow * facts.vows.length;
  let embers = Math.round(base * chMul * vowMul);
  if (base > 0 && chMul !== 1) lines.push({ label: `${facts.challenge[0].toUpperCase()}${facts.challenge.slice(1)} ×${chMul}`, embers: Math.round(base * chMul) - base });
  if (base > 0 && facts.vows.length) lines.push({ label: `${facts.vows.length} vow${facts.vows.length === 1 ? '' : 's'} +${Math.round(R.perVow * 100 * facts.vows.length)}%`, embers: embers - Math.round(base * chMul) });
  const done = new Set(meta && Array.isArray(meta.deeds) ? meta.deeds : []);
  const deeds = [];
  const life = lifeAfter(meta, facts);
  for (const id of DEED_IDS) {
    if (done.has(id)) continue;
    if (DEEDS[id].test(facts, life)) {
      deeds.push(id);
      lines.push({ label: `Deed: ${DEEDS[id].name}`, embers: DEEDS[id].embers });
      embers += DEEDS[id].embers;
    }
  }
  // Feats this run earned (pay nothing; they open unlocks).
  const feats = [];
  const rill = (facts.party || []).includes('tidecaller');
  if (rill && facts.bosses.includes('heron')) feats.push('rill_heron');
  if (facts.cleared.includes(2) || facts.bosses.some((k) => WATER_BOSSES.includes(k))) feats.push('tidecaller');
  return { embers, lines, deeds, bosses: facts.bosses.slice(), feats };
}

// ------------------------------------------------------------ the boons --
// The equipped loadout -> the plain `boons` object a campaign starts with,
// or null when nothing that touches the sim is equipped (tints never do).
export function loadoutBoons(meta) {
  if (!meta || !meta.loadout) return null;
  const l = meta.loadout;
  const own = (id) => !!id && meta.owned && meta.owned[id] !== undefined && !!UNLOCKS[id];
  const b = {};
  const kits = {};
  for (const c of LOADOUT_CLASSES) if (own(l.kits && l.kits[c]) && UNLOCKS[l.kits[c]].cls === c && UNLOCKS[l.kits[c]].skills.length) kits[c] = UNLOCKS[l.kits[c]].skills.slice();
  if (Object.keys(kits).length) b.kits = kits;
  if (own(l.heirloom)) b.relic = UNLOCKS[l.heirloom].relic;
  const purse = l.purse > 0 && own(`purse_${l.purse}`) ? UNLOCKS[`purse_${l.purse}`].glint : 0;
  if (purse > 0) b.glint = purse;
  const vows = (Array.isArray(l.vows) ? l.vows : []).filter(own).map((id) => UNLOCKS[id].curse);
  if (vows.length) b.vows = vows;
  return Object.keys(b).length ? b : null;
}

// The run's own check of what it is handed (a save file or a probe may carry
// anything): only real skills of the right class, a real relic, real curses.
export function sanitizeBoons(b) {
  if (!b || typeof b !== 'object') return null;
  const out = {};
  if (b.kits && typeof b.kits === 'object') {
    const kits = {};
    for (const c of LOADOUT_CLASSES) {
      const ids = b.kits[c];
      if (!Array.isArray(ids)) continue;
      const max = c === 'healer' ? 4 : 4;
      const ok = [...new Set(ids)].filter((id) => SKILLS[id] && (SKILLS[id].cls || 'healer') === c).slice(0, max);
      if (ok.length) kits[c] = ok;
    }
    if (Object.keys(kits).length) out.kits = kits;
  }
  if (typeof b.relic === 'string' && RELICS[b.relic]) out.relic = b.relic;
  const g = Math.round(Number(b.glint));
  if (g > 0) out.glint = Math.min(200, g);
  if (Array.isArray(b.vows)) {
    const v = [...new Set(b.vows)].filter((c) => CURSES[c] && (CURSES[c].diff || CURSES[c].fuse));
    if (v.length) out.vows = v;
  }
  return Object.keys(out).length ? out : null;
}

// The equipped tints -> { classId: { glow, second, debris } } (render only).
export function loadoutTints(meta) {
  const out = {};
  if (!meta || !meta.loadout) return out;
  for (const c of LOADOUT_CLASSES) {
    const id = meta.loadout.tints && meta.loadout.tints[c];
    if (id && meta.owned[id] !== undefined && UNLOCKS[id]) out[c] = { ...UNLOCKS[id].colors };
  }
  return out;
}

// "What comes next": up to `n` unlocks the player can work toward, cheapest
// reachable first, then the nearest locked ones with their requirement.
export function nextGoals(ctx, n = 3) {
  const rows = UNLOCK_IDS.map((id) => ({ id, u: UNLOCKS[id], st: unlockState(id, ctx) })).filter((r) => r.st !== 'owned');
  // One goal per kind first (the cheapest of each), so the list shows the
  // range of what is on offer rather than three of a kind.
  const byCost = (a, b) => a.u.cost - b.u.cost;
  const spread = (list) => {
    const seen = new Set();
    const first = [];
    const rest = [];
    for (const r of list) (seen.has(r.u.kind) ? rest : (seen.add(r.u.kind), first)).push(r);
    return [...first, ...rest];
  };
  const buyable = spread(rows.filter((r) => r.st === 'buy' || r.st === 'poor').sort(byCost));
  const locked = spread(rows.filter((r) => r.st === 'locked' && !(r.u.req && r.u.req.relic)));
  const goals = [];
  for (const r of buyable) {
    if (goals.length >= n) break;
    goals.push({ id: r.id, name: r.u.name, how: r.st === 'buy' ? `Ready: ${r.u.cost} ${CURRENCY}` : `${r.u.cost - ctx.meta.embers} more ${CURRENCY}` });
  }
  for (const r of locked) {
    if (goals.length >= n) break;
    goals.push({ id: r.id, name: r.u.name, how: reqText(r.u.req) + (r.u.cost ? `, then ${r.u.cost} ${CURRENCY}` : '') });
  }
  return goals;
}
