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

export function vfxClassStyle(classId) {
  return CLASS_VFX[classId] ?? CLASS_DEFAULT;
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
});

const FAMILY_DEFAULT = Object.freeze({
  charger: Object.freeze({ matter: 'dirt', family: 'charger', shard: null, chunk: 5, dust: 3 }),
  shooter: Object.freeze({ matter: 'chitin', family: 'shooter', shard: 'needle', chunk: 3, dust: 0, shot: Object.freeze({ look: 'sickle', trail: 0.22 }) }),
  lobber: Object.freeze({ matter: 'slime', family: 'lobber', shard: 'drop', chunk: 3, dust: 0, shot: Object.freeze({ look: 'glob', trail: 0.3 }) }),
  flyer: Object.freeze({ matter: 'dust', family: 'flyer', shard: null, chunk: 0, dust: 4 }),
  burrower: Object.freeze({ matter: 'earth', family: 'burrower', shard: null, chunk: 7, dust: 4 }),
  brute: Object.freeze({ matter: 'stone', family: 'brute', shard: null, chunk: 6, dust: 3 }),
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
export const BOSS_VFX = Object.freeze({
  stag: Object.freeze({
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'stone',
    quake: Object.freeze({ cracks: 9, chunk: 16, dust: 8, embers: 18, pillarH: 3.2, life: 0.9 }),
    trample: Object.freeze({ chunk: 8, dust: 4 }),
    camera: Object.freeze({ dolly: 0.08 }),
  }),
});
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
