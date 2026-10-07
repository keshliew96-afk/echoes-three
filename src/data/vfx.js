// VFX style table (docs/gauntlet/design-VFX.md). The ONE place that says how
// each class, enemy and the boss looks when it acts: colours (from
// palette.js), shape language, light, debris, pacing and camera. The render
// director (src/render/vfx/signature.js) only reads these rows, so a new
// enemy type gets its own look by adding a row to ENEMY_VFX — no render file
// changes — and an enemy with no row falls back to a sensible default.
//
// Render-only data: nothing in the sim reads this file.
import { PALETTE, VFX_SIGNATURE, VFX_MATTER } from './palette.js';
import { CLASS_SKILLS } from './classes.js';

// --------------------------------------------------------------- classes --
// shape: the class's energy language, read by the director's recipes —
//   'round'  soft circles, blooms, rising spirals (Healer)
//   'blunt'  thick short arcs, jagged rings, cracks (Tank)
//   'sharp'  thin long crescents, crosses, dash lines (Swordsman)
//   'line'   straight darts, streaks, points (Archer)
// slash:  arc ribbon look for melee arcs { width (u), sweep (s), life (s), arcs }
// ring:   shockwave look for novas { width, life, jag (0 smooth .. 1 jagged) }
// light:  ground light pool { scale (x radius), opacity, life }
// debris: counts per impact { chunk, dust, spark, shard } and shard kind
// camera: { kick (u, along the hit), dolly (u, toward the impact on big casts) }
export const CLASS_VFX = Object.freeze({
  healer: Object.freeze({
    id: 'healer',
    shape: 'round',
    core: PALETTE.parchment,
    glow: VFX_SIGNATURE.healer.glow,
    second: VFX_SIGNATURE.healer.second,
    heal: PALETTE.brightHeal,
    debrisColor: VFX_SIGNATURE.healer.debris,
    slash: Object.freeze({ width: 0.26, sweep: 0.14, life: 0.42, arcs: 1, soft: 0.9 }),
    ring: Object.freeze({ width: 0.22, life: 0.55, jag: 0, soft: 0.85 }),
    light: Object.freeze({ scale: 1.6, opacity: 0.55, life: 0.6 }),
    debris: Object.freeze({ chunk: 0, dust: 0, spark: 4, shard: 5, shardKind: 'petal', rise: true }),
    bolt: Object.freeze({ look: 'orb', trail: 0.3, width: 0.16 }),
    camera: Object.freeze({ kick: 0, dolly: 0.04 }),
  }),
  tank: Object.freeze({
    id: 'tank',
    shape: 'blunt',
    core: PALETTE.parchment,
    glow: VFX_SIGNATURE.tank.glow,
    second: VFX_SIGNATURE.tank.second,
    debrisColor: VFX_SIGNATURE.tank.debris,
    slash: Object.freeze({ width: 0.42, sweep: 0.11, life: 0.4, arcs: 1, soft: 0.35 }),
    ring: Object.freeze({ width: 0.3, life: 0.5, jag: 0.85, soft: 0.3 }),
    light: Object.freeze({ scale: 0.9, opacity: 0.32, life: 0.22 }),
    debris: Object.freeze({ chunk: 9, dust: 4, spark: 5, shard: 0, shardKind: null, rise: false }),
    bolt: Object.freeze({ look: 'slug', trail: 0.2, width: 0.2 }),
    cracks: true,
    camera: Object.freeze({ kick: 0.05, dolly: 0.05 }),
  }),
  swordsman: Object.freeze({
    id: 'swordsman',
    shape: 'sharp',
    core: PALETTE.parchment,
    glow: VFX_SIGNATURE.swordsman.glow,
    second: VFX_SIGNATURE.swordsman.second,
    debrisColor: VFX_SIGNATURE.swordsman.debris,
    slash: Object.freeze({ width: 0.13, sweep: 0.07, life: 0.26, arcs: 2, soft: 0.15 }),
    ring: Object.freeze({ width: 0.12, life: 0.34, jag: 0, soft: 0.15 }),
    light: Object.freeze({ scale: 0.75, opacity: 0.3, life: 0.18 }),
    debris: Object.freeze({ chunk: 0, dust: 0, spark: 7, shard: 3, shardKind: 'glint', rise: false }),
    bolt: Object.freeze({ look: 'blade', trail: 0.22, width: 0.1 }),
    camera: Object.freeze({ kick: 0.03, dolly: 0 }),
  }),
  archer: Object.freeze({
    id: 'archer',
    shape: 'line',
    core: PALETTE.parchment,
    glow: VFX_SIGNATURE.archer.glow,
    second: VFX_SIGNATURE.archer.second,
    debrisColor: VFX_SIGNATURE.archer.debris,
    slash: Object.freeze({ width: 0.12, sweep: 0.09, life: 0.3, arcs: 1, soft: 0.4 }),
    ring: Object.freeze({ width: 0.1, life: 0.42, jag: 0, soft: 0.3 }),
    light: Object.freeze({ scale: 0.7, opacity: 0.38, life: 0.24 }),
    debris: Object.freeze({ chunk: 0, dust: 0, spark: 4, shard: 3, shardKind: 'feather', rise: false }),
    bolt: Object.freeze({ look: 'arrow', trail: 0.42, width: 0.07 }),
    camera: Object.freeze({ kick: 0.03, dolly: 0 }),
  }),
});

// Unknown class ids (a future fifth character) borrow the Healer's soft look
// but in plain Parchment, so they are never mistaken for an existing class.
const CLASS_DEFAULT = Object.freeze({ ...CLASS_VFX.healer, id: 'default', glow: PALETTE.parchment, second: PALETTE.bone, camera: Object.freeze({ kick: 0, dolly: 0 }) });

// UNLOCKS (docs/UNLOCKS.md): a tint the local player equipped recolours a
// class's glow / second / debris on THIS screen only (render data; the sim
// never reads it). setClassTints({ classId: { glow, second, debris } }).
const tinted = new Map(); // classId -> frozen style with the tint applied
export function setClassTints(tints = {}) {
  tinted.clear();
  for (const [cls, c] of Object.entries(tints || {})) {
    const st = CLASS_VFX[cls];
    if (!st || !c) continue;
    tinted.set(cls, Object.freeze({ ...st, glow: c.glow ?? st.glow, second: c.second ?? st.second, debrisColor: c.debris ?? st.debrisColor, tint: true }));
  }
  return [...tinted.keys()];
}

export function vfxClassStyle(classId) {
  return tinted.get(classId) ?? CLASS_VFX[classId] ?? CLASS_DEFAULT;
}

// Which class owns a skill id, for events that carry only the skill
// ('archer_basic', 'heavy_slam', ...). Anything not in a class pool is the
// Healer's (the Healer's skills are the shared draft pool).
const SKILL_OWNER = new Map();
for (const cls of Object.keys(CLASS_SKILLS)) for (const id of CLASS_SKILLS[cls]) SKILL_OWNER.set(id, cls);
export function vfxSkillClass(skillId) {
  if (!skillId) return null;
  const m = /^(tank|swordsman|archer|healer)_basic$/.exec(skillId);
  if (m) return m[1];
  return SKILL_OWNER.get(skillId) ?? 'healer';
}

// --------------------------------------------------------------- enemies --
// matter: what the body and its attack are made of (VFX_MATTER key).
// family: the attack family that picks the recipe for an event the enemy
//   has no own row for — charger | shooter | lobber | flyer | burrower | brute.
// shard: the shard particle shape its hits and death throw (null = none).
// shot: enemy-shot look { look, trail } (shooters / lobbers).
export const ENEMY_VFX = Object.freeze({
  boar: Object.freeze({ matter: 'dirt', family: 'charger', shard: null, chunk: 6, dust: 3 }),
  mantis: Object.freeze({ matter: 'chitin', family: 'shooter', shard: 'needle', chunk: 4, dust: 0, shot: Object.freeze({ look: 'sickle', trail: 0.22 }) }),
  quillback: Object.freeze({ matter: 'quill', family: 'charger', shard: 'needle', chunk: 2, dust: 2 }),
  toad: Object.freeze({ matter: 'slime', family: 'lobber', shard: 'drop', chunk: 3, dust: 0, shot: Object.freeze({ look: 'glob', trail: 0.3 }) }),
  moth: Object.freeze({ matter: 'dust', family: 'flyer', shard: null, chunk: 0, dust: 5 }),
  ram: Object.freeze({ matter: 'stone', family: 'brute', shard: null, chunk: 7, dust: 3 }),
  mole: Object.freeze({ matter: 'earth', family: 'burrower', shard: null, chunk: 8, dust: 4 }),
  // Content slice 1 (docs/CONTENT_PLAN.md §3). Their signature beats (spore
  // burst, lantern mend, feather fan, brood split) are recipes in the
  // director keyed by the sim event; these rows give their hits and deaths
  // the right material.
  rotcap: Object.freeze({ matter: 'spore', family: 'brute', shard: null, chunk: 3, dust: 5, spores: true }),
  snail: Object.freeze({ matter: 'shell', family: 'support', shard: null, chunk: 6, dust: 0, lantern: true }),
  crow: Object.freeze({ matter: 'feather', family: 'shooter', shard: 'feather', chunk: 0, dust: 1, shot: Object.freeze({ look: 'dart', trail: 0.18 }), feathers: 9 }),
  brood: Object.freeze({ matter: 'ichor', family: 'charger', shard: 'drop', chunk: 4, dust: 0, legs: 8 }),
  broodling: Object.freeze({ matter: 'ichor', family: 'charger', shard: 'drop', chunk: 1, dust: 0, legs: 3 }),
  // Content slice 2 (docs/CONTENT_PLAN.md §3; design-VFX.md §5c). Their
  // signature beats (dart, planting, snap, lunge, ward, overhead slam) are
  // director recipes keyed by the sim event; these rows give hits, deaths
  // and movement wakes the right material.
  wasp: Object.freeze({ matter: 'wasp', family: 'flyer', shard: 'needle', chunk: 0, dust: 1 }),
  thornling: Object.freeze({ matter: 'bramble', family: 'support', shard: 'needle', chunk: 3, dust: 1 }),
  crab: Object.freeze({ matter: 'carapace', family: 'brute', shard: 'drop', chunk: 6, dust: 0 }),
  lamprey: Object.freeze({ matter: 'eel', family: 'burrower', shard: 'drop', chunk: 2, dust: 0 }),
  gravewisp: Object.freeze({ matter: 'wisp', family: 'flyer', shard: null, chunk: 0, dust: 3 }),
  knight: Object.freeze({ matter: 'boneplate', family: 'brute', shard: 'needle', chunk: 8, dust: 3 }),
  // Act IV, the Hollow Heart (docs/ACT_IV.md). `heart` marks a body made of
  // the Heart's violet: its kill motes leave violet, not the indigo tell.
  // Their beats (the heartbeat surge, the lance, the crystal slam and its
  // shards, the censer's gather / mend / spill) are director recipes.
  husk: Object.freeze({ matter: 'heartflesh', family: 'charger', shard: null, chunk: 3, dust: 1, heart: true, wakeEvery: 0.3 }), // they surge in packs: a sparse wake
  lancer: Object.freeze({ matter: 'heartflesh', family: 'shooter', shard: 'needle', chunk: 2, dust: 0, heart: true }),
  geode: Object.freeze({ matter: 'heartcrystal', family: 'brute', shard: 'needle', chunk: 8, dust: 3, heart: true }),
  censer: Object.freeze({ matter: 'heartbone', family: 'flyer', shard: null, chunk: 3, dust: 2, heart: true }),
});

const FAMILY_DEFAULT = Object.freeze({
  charger: Object.freeze({ matter: 'dirt', family: 'charger', shard: null, chunk: 5, dust: 3 }),
  shooter: Object.freeze({ matter: 'chitin', family: 'shooter', shard: 'needle', chunk: 3, dust: 0, shot: Object.freeze({ look: 'sickle', trail: 0.22 }) }),
  lobber: Object.freeze({ matter: 'slime', family: 'lobber', shard: 'drop', chunk: 3, dust: 0, shot: Object.freeze({ look: 'glob', trail: 0.3 }) }),
  flyer: Object.freeze({ matter: 'dust', family: 'flyer', shard: null, chunk: 0, dust: 4 }),
  burrower: Object.freeze({ matter: 'earth', family: 'burrower', shard: null, chunk: 7, dust: 4 }),
  brute: Object.freeze({ matter: 'stone', family: 'brute', shard: null, chunk: 6, dust: 3 }),
  support: Object.freeze({ matter: 'shell', family: 'support', shard: null, chunk: 4, dust: 0 }),
});
const ENEMY_DEFAULT = Object.freeze({ matter: 'ash', family: 'brute', shard: null, chunk: 4, dust: 2, shot: Object.freeze({ look: 'sickle', trail: 0.2 }) });

// Never throws: a known kind gets its row, an unknown kind with a known
// family hint gets that family's row, anything else gets the generic row.
export function vfxEnemyStyle(kind, familyHint = null) {
  const row = ENEMY_VFX[kind] ?? (familyHint && FAMILY_DEFAULT[familyHint]) ?? ENEMY_DEFAULT;
  return row;
}
export function vfxMatterColor(matter) {
  return VFX_MATTER[matter] ?? VFX_MATTER.ash;
}

// ------------------------------------------------------------------ boss --
// Every boss shares the God-stuff Violet corruption (its identity tell, §11)
// and Ember for the threat itself; what tells them apart is matter and shape.
//   stag   stone, antler forks and fracturing rings
//   heron  water and silt: spear wakes, foam rings, a geyser (Act II, the mill)
//   wyrm   ash and cinders: a breath of streaking cinders, earth eruptions
//          (Act III, the barrow)
export const BOSS_VFX = Object.freeze({
  stag: Object.freeze({
    id: 'stag',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'stone',
    quake: Object.freeze({ cracks: 9, chunk: 16, dust: 8, embers: 18, pillarH: 3.2, life: 0.9 }),
    trample: Object.freeze({ chunk: 8, dust: 4 }),
    camera: Object.freeze({ dolly: 0.08 }),
  }),
  heron: Object.freeze({
    id: 'heron',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'water',
    second: 'silt',
    // Bill Spear: the foam wake down the lane, droplets every `every` s of the drive.
    spear: Object.freeze({ wakeW: 0.5, drops: 3, every: 0.05 }),
    // Wingbeat: gust lines + feathers + spray thrown off the ring edge.
    wing: Object.freeze({ gusts: 12, feathers: 10, spray: 12 }),
    // Surfacing: a geyser of foam with a violet core.
    geyser: Object.freeze({ height: 3.4, drops: 22, ripples: 3 }),
    camera: Object.freeze({ dolly: 0.07, kick: 0.05 }),
  }),
  wyrm: Object.freeze({
    id: 'wyrm',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'cinder',
    second: 'earth',
    // Ash Breath: cinder streaks + rolling ash down the cone.
    breath: Object.freeze({ streaks: 14, smoke: 9, cinders: 22 }),
    // Burrow Strike: the eruption where it surfaces.
    erupt: Object.freeze({ chunk: 18, dust: 8, cinders: 20, pillarH: 3.0 }),
    // The tunnel trail it leaves while underground (s between puffs).
    tunnel: Object.freeze({ every: 0.12 }),
    camera: Object.freeze({ dolly: 0.08, kick: 0.05 }),
  }),
  // Content slice 2: each act's second boss (design-VFX.md §6c).
  //   thornmother  bramble and torn earth: seed pods that root into thorn
  //                patches, a charge that rips them up (Act I, the wood)
  //   millwheel    oak, iron and millrace water: a fan of cog shards, a
  //                rim of sparks, a crosscut that gouges the floor (Act II)
  //   lichram      bone and grave earth: a horns-down rush, graves that
  //                crack open under the party (Act III)
  thornmother: Object.freeze({
    id: 'thornmother',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'bramble',
    second: 'dirt',
    volley: Object.freeze({ seeds: 10 }),
    root: Object.freeze({ spikes: 9, needles: 10 }),
    charge: Object.freeze({ every: 0.05, wakeW: 0.6 }),
    burst: Object.freeze({ spikes: 12, needles: 14 }),
    camera: Object.freeze({ dolly: 0.07, kick: 0.06 }),
  }),
  millwheel: Object.freeze({
    id: 'millwheel',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'oak',
    second: 'iron',
    shards: Object.freeze({ sparks: 18, splinters: 8 }),
    cut: Object.freeze({ every: 0.06, sparks: 3 }),
    roll: Object.freeze({ every: 0.22 }),
    camera: Object.freeze({ dolly: 0.08, kick: 0.06 }),
  }),
  lichram: Object.freeze({
    id: 'lichram',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'boneplate',
    second: 'earth',
    rush: Object.freeze({ every: 0.05, wakeW: 0.5 }),
    grave: Object.freeze({ chunk: 10, bones: 6 }),
    camera: Object.freeze({ dolly: 0.08, kick: 0.06 }),
  }),
  // Act IV's two bosses (docs/ACT_IV_BOSSES.md).
  //   cantor    God-stuff violet and the heart's light: notes that ring out
  //             in Ember and echo as crystal, a sung lance, verses that open
  //             the three lands' doors, an echo that folds away (the final boss)
  //   colossus  slate rock and pale glass over the heart's purple: a fissure
  //             torn down the floor, geodes from the ceiling, a chest that
  //             bursts (the Heart's own body)
  cantor: Object.freeze({
    id: 'cantor',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'heartcrystal',
    second: 'heartvein',
    note: Object.freeze({ rings: 3, motes: 14 }),
    verse: Object.freeze({ pillar: 4.2, motes: 26 }),
    camera: Object.freeze({ dolly: 0.09, kick: 0.07 }),
  }),
  colossus: Object.freeze({
    id: 'colossus',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'stone',
    second: 'heartcrystal',
    fissure: Object.freeze({ speed: 16, spikes: 3 }),
    burst: Object.freeze({ spikes: 14, shards: 18 }),
    camera: Object.freeze({ dolly: 0.1, kick: 0.08 }),
  }),
});
export function isVfxBoss(kind) {
  return Object.prototype.hasOwnProperty.call(BOSS_VFX, kind);
}
export function vfxBossStyle(kind) {
  return BOSS_VFX[kind] ?? BOSS_VFX.stag;
}

// ------------------------------------------------------------ intensity --
// Settings ▸ Gameplay ▸ Effects (gameplay.effects). Reduced halves particle
// counts and drops the camera kick / dolly and the light-pool flash; every
// gameplay-relevant shape stays.
export const VFX_INTENSITY = Object.freeze({
  full: Object.freeze({ particles: 1, camera: 1, light: 1 }),
  reduced: Object.freeze({ particles: 0.5, camera: 0, light: 0.45 }),
});
