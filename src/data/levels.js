// Level configurations — the four EXPEDITIONS (three until Act IV) (docs/gauntlet/PLAN.md §4.1,
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
//   legacyLayouts              the pre-slice-2 table the legacy single-level
//                              run keeps (Node goldens, act runner)
//   bossLayout                 boss-room dressing
//   music                      audio theme id (M3 registerMusicTheme)
//   roster                     etype -> spawn weight for budget draws
//   introduce                  etype -> earliest room it may appear
//   campaignRoster /           extra etype -> weight / earliest room that join
//   campaignIntroduce          roster / introduce in CAMPAIGN play only (the
//                              campaign, Endless and the Daily; never the
//                              tutorial, the legacy single-level run or the
//                              ?room= harness): campaignLevel() merges them,
//                              so the golden traces never draw them
//   hazards / interactables    type ids allowed in this act (placements live in
//                              data/layouts.js per layout)
//   bossName                   display name of the room-8 boss (UI copy)
//   boss                       boss kind for room 8 (sim/boss.js BOSS_KINDS:
//                              'stag' | 'heron' | 'wyrm', docs/CONTENT_PLAN.md §2)
//   bossAdds                   [[etype, count], ...] per boss add phase (§11: 3 phases)
//   bosses                     every boss this act can end on: [{ kind, name,
//                              adds, layout?, gated? }] (layout: the boss's own room
//                              dressing, else bossLayout; gated: met only once
//                              the save has felled the act's other bosses, the
//                              run's `thirdBosses` acts). The first is the act's original boss
//                              (= boss / bossName / bossAdds). Which one a run
//                              meets is bossFor(act, seed): a pure function of
//                              the run seed — no RNG draw, nothing saved, so
//                              a seed always meets the same boss and a replay
//                              on another seed can end differently.
//   unlock                     null | { afterVictory: act }
export const LEVELS = Object.freeze({
  1: Object.freeze({
    id: 'hollow_wood',
    act: 1,
    name: 'The Hollow Wood',
    blurb: 'Night-dark woodland where the beasts first turned.',
    tier: 1,
    biome: 'wood',
    layouts: Object.freeze([1, 2, 3, 10, 11, 21, 22]),
    legacyLayouts: Object.freeze([1, 2, 3]),
    bossLayout: 3,
    music: 'wood',
    // Slice 2 (Act I balance pass): the Rotcap, the Briar Wasp and the
    // Thornling join from room 4, so rooms 1-3 roll exactly the v0.4.63 waves
    // (the certified Act I traces) and the new bodies add to the late rooms.
    roster: Object.freeze({ boar: 0.45, mantis: 0.3, quillback: 0.25, rotcap: 0.14, wasp: 0.1, thornling: 0.1 }),
    introduce: Object.freeze({ boar: 1, mantis: 1, quillback: 2, rotcap: 4, wasp: 4, thornling: 5 }),
    // NEW ENEMIES (content plan 3 slice 3, docs/WOOD_MILL_ENEMIES.md): the
    // Shriek Owl and the Vine Lasher, campaign-only, from room 3.
    campaignRoster: Object.freeze({ owl: 0.11, lasher: 0.1 }),
    campaignIntroduce: Object.freeze({ owl: 3, lasher: 3 }),
    hazards: Object.freeze(['bramble', 'puffcap']),
    interactables: Object.freeze(['dewfont', 'barricade', 'keg']),
    boss: 'stag',
    bossName: 'The Hollow Stag',
    bossAdds: Object.freeze([
      ['boar', 2],
      ['mantis', 1],
    ]),
    bosses: Object.freeze([
      Object.freeze({ kind: 'stag', name: 'The Hollow Stag', adds: Object.freeze([Object.freeze(['boar', 2]), Object.freeze(['mantis', 1])]) }),
      Object.freeze({ kind: 'thornmother', name: 'The Thornmother', adds: Object.freeze([Object.freeze(['boar', 2]), Object.freeze(['mantis', 1])]) }),
      // THIRD BOSSES (content plan 3 slice 10, docs/THIRD_BOSSES.md): the
      // wood's old hunter, met in the Thornwood Ring with its night hunters.
      Object.freeze({ kind: 'gloamwolf', name: 'The Gloam Wolf', layout: 21, gated: true, adds: Object.freeze([Object.freeze(['boar', 2]), Object.freeze(['owl', 1])]) }),
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
    layouts: Object.freeze([4, 5, 6, 12, 13, 23, 24]),
    legacyLayouts: Object.freeze([4, 5, 6]),
    bossLayout: 6,
    music: 'mill',
    roster: Object.freeze({ boar: 0.1, mantis: 0.17, quillback: 0.12, toad: 0.2, moth: 0.2, rotcap: 0.11, snail: 0.1, crab: 0.12, lamprey: 0.1 }),
    introduce: Object.freeze({ boar: 1, mantis: 1, quillback: 1, toad: 1, moth: 2, rotcap: 1, snail: 2, crab: 2, lamprey: 3 }),
    // NEW ENEMIES (content plan 3 slice 3): the Mire Leech and the Drowned
    // Miller, campaign-only, from room 3.
    campaignRoster: Object.freeze({ leech: 0.11, miller: 0.09 }),
    campaignIntroduce: Object.freeze({ leech: 3, miller: 3 }),
    hazards: Object.freeze(['millrace', 'puffcap', 'slip']),
    interactables: Object.freeze(['dewfont', 'barricade', 'keg', 'sluice']),
    boss: 'heron',
    bossName: 'The Drowned Heron',
    bossAdds: Object.freeze([
      ['toad', 1],
      ['moth', 2],
    ]),
    bosses: Object.freeze([
      Object.freeze({ kind: 'heron', name: 'The Drowned Heron', adds: Object.freeze([Object.freeze(['toad', 1]), Object.freeze(['moth', 2])]) }),
      Object.freeze({ kind: 'millwheel', name: 'The Millwheel', adds: Object.freeze([Object.freeze(['crab', 1]), Object.freeze(['moth', 1])]) }),
      // THIRD BOSSES: the millpond's crowned toad in the Millrace Basin, with
      // its toads and a Mire Leech.
      Object.freeze({ kind: 'mireking', name: 'The Mire King', layout: 23, gated: true, adds: Object.freeze([Object.freeze(['toad', 2]), Object.freeze(['leech', 1])]) }),
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
    layouts: Object.freeze([7, 8, 9, 14, 15, 25, 26]),
    legacyLayouts: Object.freeze([7, 8, 9]),
    bossLayout: 9,
    music: 'barrow',
    // New enemies (docs/NEW_ENEMIES_BARROW_HEART.md): the Ash Keener and the
    // Barrow Sexton join from room 3, in campaign rooms only (CAMPAIGN_ONLY_ENEMIES).
    roster: Object.freeze({ mantis: 0.1, quillback: 0.1, moth: 0.14, ram: 0.16, mole: 0.22, crow: 0.14, brood: 0.14, gravewisp: 0.1, knight: 0.06, keener: 0.11, sexton: 0.09 }),
    introduce: Object.freeze({ mantis: 1, quillback: 1, moth: 1, mole: 1, ram: 2, crow: 1, brood: 2, gravewisp: 3, knight: 4, keener: 3, sexton: 3 }),
    hazards: Object.freeze(['rockfall', 'gravefire', 'slip']),
    interactables: Object.freeze(['dewfont', 'barricade', 'keg', 'bell']),
    boss: 'wyrm',
    bossName: 'The Barrow Wyrm',
    bossAdds: Object.freeze([
      ['ram', 1],
      ['mole', 2],
    ]),
    bosses: Object.freeze([
      Object.freeze({ kind: 'wyrm', name: 'The Barrow Wyrm', adds: Object.freeze([Object.freeze(['ram', 1]), Object.freeze(['mole', 2])]) }),
      // It raises moles itself (Grave Call), so its phases bring a crow.
      Object.freeze({ kind: 'lichram', name: 'The Lich Ram', adds: Object.freeze([Object.freeze(['ram', 1]), Object.freeze(['crow', 1])]) }),
    ]),
    unlock: Object.freeze({ afterVictory: 2 }),
  }),
  // Act IV (docs/ACT_IV.md, content plan 2 slice 4): under the Barrow, where
  // the violet corruption begins. Its bosses (slice 5, docs/ACT_IV_BOSSES.md):
  // the Hollow Cantor, the campaign's final boss, whose three verses call the
  // three lands' beasts in turn, or the Geode Colossus the Heart grows when
  // the singer will not come out, rolled by seed like every act.
  4: Object.freeze({
    id: 'hollow_heart',
    act: 4,
    name: 'The Hollow Heart',
    blurb: 'Beneath the Barrow, where the corruption first took root and still beats.',
    tier: 4,
    biome: 'heart',
    layouts: Object.freeze([16, 17, 18, 19, 20, 27, 28]),
    legacyLayouts: Object.freeze([16, 17, 18]),
    bossLayout: 18,
    music: 'heart',
    // New enemies (docs/NEW_ENEMIES_BARROW_HEART.md): the Heart Bloom and
    // the Vein Siphon join from room 3, in campaign rooms only, so the Heart
    // has six beasts of its own.
    roster: Object.freeze({ husk: 0.26, lancer: 0.14, geode: 0.12, censer: 0.08, moth: 0.08, brood: 0.08, gravewisp: 0.06, knight: 0.05, crow: 0.09, bloom: 0.1, siphon: 0.11 }),
    introduce: Object.freeze({ husk: 1, lancer: 1, crow: 1, moth: 1, geode: 2, brood: 2, censer: 3, gravewisp: 3, knight: 4, bloom: 3, siphon: 3 }),
    hazards: Object.freeze(['rockfall', 'gravefire', 'slip']),
    interactables: Object.freeze(['dewfont', 'barricade', 'keg']),
    boss: 'cantor',
    bossName: 'The Hollow Cantor',
    bossAdds: Object.freeze([
      ['boar', 2],
      ['mantis', 1],
    ]),
    bosses: Object.freeze([
      Object.freeze({
        kind: 'cantor',
        name: 'The Hollow Cantor',
        adds: Object.freeze([Object.freeze(['boar', 2]), Object.freeze(['mantis', 1])]),
        // One verse a phase, each land's beasts: the Wood's, the Mill's, the Barrow's.
        addsByPhase: Object.freeze([
          Object.freeze([Object.freeze(['boar', 2]), Object.freeze(['mantis', 1])]),
          Object.freeze([Object.freeze(['toad', 1]), Object.freeze(['moth', 2])]),
          Object.freeze([Object.freeze(['ram', 1]), Object.freeze(['mole', 1]), Object.freeze(['crow', 1])]),
        ]),
      }),
      // The Heart's own beasts: husks and a censer that mends them.
      Object.freeze({ kind: 'colossus', name: 'The Geode Colossus', adds: Object.freeze([Object.freeze(['husk', 2]), Object.freeze(['censer', 1])]) }),
    ]),
    unlock: Object.freeze({ afterVictory: 3 }),
  }),
});

// NEW ENEMIES (docs/NEW_ENEMIES_BARROW_HEART.md): kinds that roll only in a
// campaign's rooms (Endless and the Daily included), never the legacy
// single-level run, the tutorial or the ?room= harness, so the golden traces
// and the act runner's benches keep their draws. waves.js planRoom drops
// them unless the run plan says `campaignKinds`.
export const CAMPAIGN_ONLY_ENEMIES = Object.freeze(['keener', 'sexton', 'bloom', 'siphon']);

// The campaign's levels, in order. CAMPAIGN_ACTS decides how many of them a
// campaign plays: four since Act IV (docs/ACT_IV.md). Setting it to 3 keeps
// the campaign at three levels and leaves Act IV to the Endless Descent only
// (data/endless.js reads ENDLESS_ACTS).
export const CAMPAIGN_ACTS = 4;
export const ENDLESS_ACTS = Object.freeze([1, 2, 3, 4]);
export const ACT_IDS = Object.freeze([1, 2, 3, 4].slice(0, CAMPAIGN_ACTS));

export function levelFor(act) {
  return LEVELS[act] ?? LEVELS[1];
}

// A level row with its campaign-only creatures merged into roster and
// introduce (the row itself when it has none). Campaign play rolls its waves
// from this; the legacy run and the harness keep the bare row. Cached per
// row, so the result is one frozen object per level.
const campaignRows = new WeakMap();
export function campaignLevel(lv) {
  if (!lv || !lv.campaignRoster) return lv;
  let row = campaignRows.get(lv);
  if (!row) {
    row = Object.freeze({
      ...lv,
      roster: Object.freeze({ ...lv.roster, ...lv.campaignRoster }),
      introduce: Object.freeze({ ...lv.introduce, ...(lv.campaignIntroduce ?? {}) }),
      campaignRoster: null,
    });
    campaignRows.set(lv, row);
  }
  return row;
}

// Which of the act's bosses a run meets: a pure hash of (seed, act), so it
// costs no RNG draw and needs no saved field — every seed meets the same boss
// on every replay, and a campaign rolls each level on its own.
export function bossIndexFor(act, seed, open = null) {
  const lv = levelFor(Number(act) || 1);
  const pool = bossPool(lv, act, open);
  const n = pool.length;
  if (n <= 1 || seed === null || seed === undefined || !Number.isFinite(Number(seed))) return pool[0] ?? 0;
  let h = (Number(seed) >>> 0) ^ Math.imul((Number(act) || 1) >>> 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return pool[(h >>> 0) % n];
}

// THIRD BOSSES (docs/THIRD_BOSSES.md): the indices into the act's bosses a
// run can meet. A `gated` boss joins only when `open` (the run's
// thirdBosses: the acts whose other bosses the save has felled) names the
// act; until then a seed rolls between the others exactly as before.
export function bossPool(lv, act, open = null) {
  const list = lv.bosses ?? [];
  const on = Array.isArray(open) && open.includes(Number(act));
  const pool = [];
  for (let i = 0; i < list.length; i++) if (on || !list[i].gated) pool.push(i);
  return pool.length ? pool : [0];
}

// The act's gated boss is open once every other boss of the act is felled
// (`felled`: kind -> count, the profile's meta.bosses). -> [act]
export function thirdBossActs(felled) {
  const f = felled && typeof felled === 'object' ? felled : {};
  const out = [];
  for (const a of Object.keys(LEVELS).map(Number)) {
    const list = LEVELS[a].bosses ?? [];
    if (!list.some((b) => b.gated)) continue;
    if (list.every((b) => b.gated || (f[b.kind] ?? 0) > 0)) out.push(a);
  }
  return out;
}

// { kind, name, adds } of the boss a run on `seed` meets in `act`. With no
// seed (menus before a run), the act's original boss.
export function bossFor(act, seed = null, forceKind = null, open = null) {
  const lv = levelFor(Number(act) || 1);
  const list = lv.bosses ?? [{ kind: lv.boss ?? 'stag', name: lv.bossName ?? 'The Hollow Stag', adds: lv.bossAdds }];
  if (forceKind) {
    const f = list.find((b) => b.kind === forceKind);
    if (f) return f;
  }
  return list[bossIndexFor(act, seed, open)] ?? list[0];
}

// The boss name a UI shows for a run view: the run's own roll when it has one.
export function bossNameOfRun(view) {
  if (!view) return bossNameFor(1);
  if (view.actBoss && view.actBoss.name) return view.actBoss.name;
  return bossFor(view.act, view.frame ? view.frame.seed : null, null, view.thirdBosses ?? null).name ?? 'The Hollow Stag';
}

// The room-8 boss's display name for an act ('The Hollow Stag' by default);
// pass the run seed for the boss this run actually meets.
export function bossNameFor(act, seed = null, forceKind = null, open = null) {
  return bossFor(act, seed, forceKind, open).name ?? 'The Hollow Stag';
}
