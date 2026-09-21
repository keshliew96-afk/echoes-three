// Level configurations — the three EXPEDITIONS (docs/gauntlet/PLAN.md §4.1,
// docs/BUILD_BRIEF.md §23.1). Owner: M4a (numbers, rosters, wiring into
// sim/run.js + sim/waves.js). Readers: M4b (biome dressing, hazards,
// interactables, boss adds), M3/INT (music theme), M2 (save meta: act name).
//
// Each expedition is a full 8-room run on the unchanged §2 skeleton (rooms
// 1-6 combat with exactly 2 defend, 7 shop, 8 boss) in its own biome, with
// its own room table (layout pool), enemy roster, hazards, interactables and
// difficulty tier. Act I is the certified v0.4.63 woodland; Acts II and III
// unlock by winning the previous act (profile, M2) — `?act=` and
// cmd('startRun', { act }) bypass the lock for harness/critics.
//
// Pure data (sim-importable): no DOM, no three.
//
// Field reference:
//   id, act, name, blurb       identity (UI: expedition picker, save slot meta)
//   tier                       -> data/difficulty.js ACT_TIER
//   biome                      -> src/env/biomes/<biome>.js (M4b)
//   layouts                    room table: layout ids (data/layouts.js, M4b);
//                              the run frame rolls one per combat room, never
//                              the same layout twice in a row
//   bossLayout                 boss-room dressing
//   music                      audio theme id (M3 registerMusicTheme)
//   roster                     etype -> spawn weight for budget draws
//   introduce                  etype -> earliest room it may appear
//   hazards / interactables    type ids allowed in this act (placements live in
//                              data/layouts.js per layout)
//   bossAdds                   [[etype, count], ...] per Stag add phase (§11: 3 phases)
//   unlock                     null | { afterVictory: act }
export const LEVELS = Object.freeze({
  1: Object.freeze({
    id: 'hollow_wood',
    act: 1,
    name: 'The Hollow Wood',
    blurb: 'Night-dark woodland where the beasts first turned.',
    tier: 1,
    biome: 'wood',
    layouts: Object.freeze([1, 2, 3]),
    bossLayout: 3,
    music: 'wood',
    roster: Object.freeze({ boar: 0.45, mantis: 0.3, quillback: 0.25 }),
    introduce: Object.freeze({ boar: 1, mantis: 1, quillback: 2 }),
    hazards: Object.freeze(['bramble', 'puffcap']),
    interactables: Object.freeze(['dewfont', 'barricade', 'keg']),
    bossAdds: Object.freeze([
      ['boar', 2],
      ['mantis', 1],
    ]),
    unlock: null,
  }),
  2: Object.freeze({
    id: 'sunken_mill',
    act: 2,
    name: 'The Sunken Mill',
    blurb: 'Flooded millrace and rotting weirs; the water runs wrong.',
    tier: 2,
    biome: 'mill',
    layouts: Object.freeze([4, 5, 6]),
    bossLayout: 6,
    music: 'mill',
    roster: Object.freeze({ boar: 0.15, mantis: 0.2, quillback: 0.15, toad: 0.25, moth: 0.25 }),
    introduce: Object.freeze({ boar: 1, mantis: 1, quillback: 1, toad: 1, moth: 2 }),
    hazards: Object.freeze(['millrace', 'puffcap']),
    interactables: Object.freeze(['dewfont', 'barricade', 'keg', 'sluice']),
    bossAdds: Object.freeze([
      ['toad', 1],
      ['moth', 2],
    ]),
    unlock: Object.freeze({ afterVictory: 1 }),
  }),
  3: Object.freeze({
    id: 'ashen_barrow',
    act: 3,
    name: 'The Ashen Barrow',
    blurb: 'Burial mounds under a cold moon, where the corruption is oldest.',
    tier: 3,
    biome: 'barrow',
    layouts: Object.freeze([7, 8, 9]),
    bossLayout: 9,
    music: 'barrow',
    roster: Object.freeze({ mantis: 0.15, quillback: 0.15, moth: 0.2, ram: 0.2, mole: 0.3 }),
    introduce: Object.freeze({ mantis: 1, quillback: 1, moth: 1, mole: 1, ram: 2 }),
    hazards: Object.freeze(['rockfall', 'gravefire']),
    interactables: Object.freeze(['dewfont', 'barricade', 'keg', 'bell']),
    bossAdds: Object.freeze([
      ['ram', 1],
      ['mole', 2],
    ]),
    unlock: Object.freeze({ afterVictory: 2 }),
  }),
});

export const ACT_IDS = Object.freeze([1, 2, 3]);

export function levelFor(act) {
  return LEVELS[act] ?? LEVELS[1];
}
