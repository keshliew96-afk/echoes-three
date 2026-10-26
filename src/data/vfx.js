// VFX style table (docs/gauntlet/design-VFX.md). The ONE place that says how
// each class, enemy and the boss looks when it acts: colours (from
// palette.js), shape language, light, debris, pacing and camera. The render
// director (src/render/vfx/signature.js) only reads these rows, so a new
// enemy type gets its own look by adding a row to ENEMY_VFX — no render file
// changes — and an enemy with no row falls back to a sensible default.
//
// Render-only data: nothing in the sim reads this file.
import { PALETTE, VFX_SIGNATURE, VFX_MATTER, VFX_TEMPLATE, VFX_FOE } from './palette.js';
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
  // THE TIDECALLER (docs/TIDECALLER.md): water. Round, flowing shapes in
  // Deep Cobalt with Sea Foam, River Pebble grit. Her own per-skill beats
  // come with the rest of her kit; this row gives every cast her colours.
  tidecaller: Object.freeze({
    id: 'tidecaller',
    shape: 'round',
    core: PALETTE.parchment,
    glow: VFX_SIGNATURE.tidecaller.glow,
    second: VFX_SIGNATURE.tidecaller.second,
    debrisColor: VFX_SIGNATURE.tidecaller.second,
    slash: Object.freeze({ width: 0.3, sweep: 0.12, life: 0.4, arcs: 1, soft: 0.7 }),
    ring: Object.freeze({ width: 0.24, life: 0.5, jag: 0.15, soft: 0.6 }),
    light: Object.freeze({ scale: 1.2, opacity: 0.42, life: 0.4 }),
    debris: Object.freeze({ chunk: 0, dust: 0, spark: 5, shard: 4, shardKind: 'drop', rise: false }),
    bolt: Object.freeze({ look: 'orb', trail: 0.36, width: 0.12 }),
    camera: Object.freeze({ kick: 0.02, dolly: 0.02 }),
  }),
  // THE BELLWRIGHT (docs/BELLWRIGHT.md): sound made visible. Round rings in
  // Bell Brass with a Verdigris edge, Old Bronze grit; her bells and the
  // Peal's waves are render/vfx/bellfx.js.
  bellwright: Object.freeze({
    id: 'bellwright',
    shape: 'round',
    core: PALETTE.parchment,
    glow: VFX_SIGNATURE.bellwright.glow,
    second: VFX_SIGNATURE.bellwright.second,
    debrisColor: VFX_SIGNATURE.bellwright.debris,
    slash: Object.freeze({ width: 0.2, sweep: 0.1, life: 0.34, arcs: 1, soft: 0.4 }),
    ring: Object.freeze({ width: 0.14, life: 0.5, jag: 0, soft: 0.35 }),
    light: Object.freeze({ scale: 1.0, opacity: 0.4, life: 0.3 }),
    debris: Object.freeze({ chunk: 0, dust: 0, spark: 6, shard: 2, shardKind: 'needle', rise: true }),
    bolt: Object.freeze({ look: 'orb', trail: 0.3, width: 0.1 }),
    camera: Object.freeze({ kick: 0.025, dolly: 0.01 }),
  }),
  // THE DUSKWING (docs/DUSKWING.md): a bat in the dark. Sharp, quick cuts in
  // Dusk Rose with a Pale Moon edge, Wing Leather grit; his dive, his bite
  // and the dark of Nightfall are render/vfx/duskfx.js.
  duskwing: Object.freeze({
    id: 'duskwing',
    shape: 'sharp',
    core: PALETTE.parchment,
    glow: VFX_SIGNATURE.duskwing.glow,
    second: VFX_SIGNATURE.duskwing.second,
    debrisColor: VFX_SIGNATURE.duskwing.debris,
    slash: Object.freeze({ width: 0.15, sweep: 0.08, life: 0.24, arcs: 2, soft: 0.25 }),
    ring: Object.freeze({ width: 0.12, life: 0.36, jag: 0.1, soft: 0.25 }),
    light: Object.freeze({ scale: 0.8, opacity: 0.32, life: 0.2 }),
    debris: Object.freeze({ chunk: 0, dust: 0, spark: 6, shard: 3, shardKind: 'glint', rise: true }),
    bolt: Object.freeze({ look: 'blade', trail: 0.22, width: 0.1 }),
    camera: Object.freeze({ kick: 0.035, dolly: 0.01 }),
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
  const m = /^(tank|swordsman|archer|healer|tidecaller|bellwright|duskwing)_basic$/.exec(skillId);
  if (m) return m[1];
  return SKILL_OWNER.get(skillId) ?? 'healer';
}

// ------------------------------------------------------------- templates --
// Kesh's three VFX templates (docs/gauntlet/design-VFX.md §11). Every hero
// effect plays one of them on top of its class look (render/vfx/templates.js):
//   magic  spells and magical attacks
//   blade  blades, claws, bites and other melee, and the closest fit for
//          physical shots (arrows) and blows (a swung bell)
//   scifi  technological weapons (no hero carries one; it waits for the
//          enemy pass and plays in the VFX lab)
// A class's basic attack and any skill not listed take the class default.
export const CLASS_TEMPLATE = Object.freeze({
  healer: 'magic',
  tank: 'blade',
  swordsman: 'blade',
  archer: 'blade',
  tidecaller: 'magic',
  bellwright: 'magic',
  duskwing: 'blade',
});
export const SKILL_TEMPLATE = Object.freeze({
  // The Bellwright swings her bell like a mace.
  bell_swing: 'blade',
  // The Duskwing's night magic: the dark, the screech, the swarm, the veil,
  // the blink, the moon and the wings he wears.
  nightfall: 'magic',
  echo_screech: 'magic',
  bat_swarm: 'magic',
  shadow_veil: 'magic',
  flit: 'magic',
  blood_moon: 'magic',
  night_wings: 'magic',
});
// The look of each template: colours (palette.js) and how hard it plays.
//   rune   the arcane circle's kind and spin (rad/s)
//   dust   stardust / matrix particles per beat { cast, hit, trail (per s) }
export const VFX_TEMPLATES = Object.freeze({
  magic: Object.freeze({
    id: 'magic',
    a: VFX_TEMPLATE.magic.purple,
    b: VFX_TEMPLATE.magic.gold,
    core: VFX_TEMPLATE.magic.star,
    deep: VFX_TEMPLATE.magic.deep,
    rune: Object.freeze({ kind: 'arcane', spin: 1.4 }),
    dust: Object.freeze({ cast: 26, hit: 7, trail: 38, tex: 'star' }),
  }),
  blade: Object.freeze({
    id: 'blade',
    a: VFX_TEMPLATE.blade.fire,
    b: VFX_TEMPLATE.blade.wave,
    core: VFX_TEMPLATE.blade.core,
    deep: VFX_TEMPLATE.blade.flame,
    smoke: VFX_TEMPLATE.blade.smoke,
    rune: Object.freeze({ kind: 'sun', spin: 2.2 }),
    dust: Object.freeze({ cast: 14, hit: 6, trail: 30, tex: 'spark' }),
  }),
  scifi: Object.freeze({
    id: 'scifi',
    a: VFX_TEMPLATE.scifi.cyan,
    b: VFX_TEMPLATE.scifi.magenta,
    core: VFX_TEMPLATE.scifi.white,
    deep: VFX_TEMPLATE.scifi.grid,
    rune: Object.freeze({ kind: 'hex', spin: 0.9 }),
    dust: Object.freeze({ cast: 22, hit: 8, trail: 34, tex: 'square' }),
  }),
});
// The lab's switch for the purple clash (palette.js VFX_TEMPLATE note):
// 'vivid' is Kesh's purple, 'safe' the magenta that sits further from Violet.
let arcaneVariant = 'vivid';
let magicSafe = null;
export function setArcaneVariant(v) {
  arcaneVariant = v === 'safe' ? 'safe' : 'vivid';
  return arcaneVariant;
}
export const arcaneVariantNow = () => arcaneVariant;
export function vfxTemplate(id) {
  if (id === 'magic' && arcaneVariant === 'safe') {
    magicSafe ??= Object.freeze({ ...VFX_TEMPLATES.magic, a: VFX_TEMPLATE.magic.arcaneSafe, deep: '#7A2A9A' });
    return magicSafe;
  }
  return VFX_TEMPLATES[id] ?? VFX_TEMPLATES.magic;
}
// Which template one effect plays: the skill's own row, else its class's
// default (a basic attack id like 'archer_basic' reads its class).
export function vfxTemplateFor(classId, skillId = null) {
  if (skillId && SKILL_TEMPLATE[skillId]) return SKILL_TEMPLATE[skillId];
  const cls = classId ?? (skillId ? vfxSkillClass(skillId) : null);
  return CLASS_TEMPLATE[cls] ?? 'magic';
}
// Hero skills that restore (their magic plays green and gold, and never
// plays a hit's impact: render/vfx/templates.js).
export const VFX_HEAL_SKILLS = new Set(['mending_bolt', 'swift_mend', 'nova_bloom', 'sanctuary', 'guardian_bond', 'restorative_wave', 'dewfall', 'kindred_shield', 'mending_tide', 'hearthsong', 'lantern_ward']);

// A spell's hit flash (VFX_HIT_RULES R1, docs/HIT_FEEDBACK.md): the foe holds
// its near-white flash for `holdTicks`, then fades back over `fadeTicks`
// (half way about 10 ticks after the hit, v3's +6 frames). A melee hit keeps
// the 3-tick latch (HITFLASH). Ticks, so it holds through hitstop.
export const SPELL_FLASH = Object.freeze({ holdTicks: 5, fadeTicks: 27, curve: 3.4 });
// The flash level (0..1 of the body's own flash) `age` ticks after a spell
// hit; 0 once it has faded.
export function spellFlashLevel(age) {
  if (!(age >= 0)) return 0;
  if (age < SPELL_FLASH.holdTicks) return 1;
  const u = (age - SPELL_FLASH.holdTicks) / SPELL_FLASH.fadeTicks;
  return u >= 1 ? 0 : Math.pow(1 - u, SPELL_FLASH.curve);
}
// Is this `hit` a spell landing on a foe: a party hit on which the templates
// play the magic impact (render/vfx/templates.js), heals and relic procs
// left out? `atk` is the attacker's body, or null when it has none (the
// Healer's basic bolt).
export function vfxSpellHit(ev, atk = null) {
  if (!ev || ev.kind === 'player' || ev.kind === 'ally') return false;
  if (ev.delivery !== 'basic' && ev.delivery !== 'skill') return false; // items, hazards, contact, techniques
  if (atk && atk.faction === 'hostile') return false;
  if (ev.attacker == null && ev.source != null) return false; // relic procs
  const cls = (atk && (atk.classId || (atk.kind === 'player' ? 'healer' : null))) ?? vfxSkillClass(ev.source) ?? 'healer';
  const skill = ev.source && !/_basic$/.test(ev.source) ? ev.source : `${cls}_basic`;
  return !VFX_HEAL_SKILLS.has(skill) && vfxTemplateFor(cls, skill) === 'magic';
}

// ----------------------------------------------------------- foe templates --
// VFX rework PR 2: which of Kesh's templates each enemy, champion and boss
// plays when its attack lands, when its shot leaves, when it hits the party.
// The pick follows the brief: claws, bites, slams, stings, spears, darts and
// thrown things are the knife-and-sword template; spells, songs, spores,
// spirit light and wards are magic; machines are sci-fi. A magic foe of the
// Hollow Heart, and every boss's magic, casts in the corrupted tone.
export const FOE_TEMPLATE = Object.freeze({
  // Act I and II and the slices' beasts.
  boar: 'blade', mantis: 'blade', quillback: 'blade', toad: 'magic', moth: 'magic', ram: 'blade', mole: 'blade',
  rotcap: 'magic', snail: 'magic', crow: 'blade', brood: 'blade', broodling: 'blade',
  wasp: 'blade', thornling: 'blade', crab: 'blade', lamprey: 'blade', gravewisp: 'magic', knight: 'blade',
  // The Hollow Heart (corrupted).
  husk: 'blade', lancer: 'magic', geode: 'blade', censer: 'magic', bloom: 'magic', siphon: 'magic',
  // Wood and Mill, Barrow and Heart.
  owl: 'magic', lasher: 'blade', leech: 'blade', miller: 'blade', keener: 'magic', sexton: 'magic',
  // The Still Spire: the bronze volley and the bell are machines.
  kite: 'blade', chime: 'scifi', gargoyle: 'blade', hanger: 'blade', vane: 'scifi', sacristan: 'magic',
  // The Ember Kiln: the bellows is a machine.
  newt: 'blade', slag: 'blade', bellows: 'scifi', cindermoth: 'magic', hurler: 'blade', ashwraith: 'magic',
  // Champions.
  briar_knight: 'blade', sluice_warden: 'blade', bone_reeve: 'blade', hollow_choir: 'magic', gale_herald: 'blade',
  moss_hart: 'blade', lockkeeper: 'scifi', gravebell_ringer: 'magic', vein_matron: 'magic', bell_abbess: 'magic',
  furnace_knight: 'blade', glassblower: 'scifi',
  // Bosses.
  stag: 'blade', heron: 'blade', wyrm: 'blade', thornmother: 'magic', millwheel: 'scifi', lichram: 'magic',
  cantor: 'magic', colossus: 'blade', gloamwolf: 'blade', mireking: 'magic', ashraven: 'blade', veinweaver: 'magic',
  hush: 'magic', skyhorn: 'blade', hourwarden: 'scifi', founder: 'scifi', cinderback: 'blade',
});
// Who weighs how much: a champion plays half again as big, a boss twice.
export const FOE_CHAMPIONS = Object.freeze(new Set(['briar_knight', 'sluice_warden', 'bone_reeve', 'hollow_choir', 'gale_herald', 'moss_hart', 'lockkeeper', 'gravebell_ringer', 'vein_matron', 'bell_abbess', 'furnace_knight', 'glassblower']));
export const FOE_BOSSES = Object.freeze(new Set(['stag', 'heron', 'wyrm', 'thornmother', 'millwheel', 'lichram', 'cantor', 'colossus', 'gloamwolf', 'mireking', 'ashraven', 'veinweaver', 'hush', 'skyhorn', 'hourwarden', 'founder', 'cinderback']));
const FOE_TONES = Object.freeze({
  blade: Object.freeze({ id: 'blade', foe: true, a: VFX_FOE.blade.fire, b: VFX_FOE.blade.wave, core: VFX_FOE.blade.core, deep: VFX_FOE.blade.flame, smoke: VFX_FOE.blade.smoke }),
  magic: Object.freeze({ id: 'magic', foe: true, a: VFX_FOE.magic.a, b: VFX_FOE.magic.b, core: VFX_FOE.magic.star, deep: VFX_FOE.magic.deep }),
  corrupt: Object.freeze({ id: 'magic', foe: true, corrupt: true, a: VFX_FOE.corrupt.a, b: VFX_FOE.corrupt.b, core: VFX_FOE.corrupt.star, deep: VFX_FOE.corrupt.deep }),
  scifi: Object.freeze({ id: 'scifi', foe: true, a: VFX_FOE.scifi.a, b: VFX_FOE.scifi.b, core: VFX_FOE.scifi.white, deep: VFX_FOE.scifi.grid }),
});
// The tone one foe plays: its template, corrupted when it is a boss or a
// Heart body casting magic. Unknown kinds fall back to the blade.
export function vfxFoeTone(kind) {
  const id = FOE_TEMPLATE[kind] ?? 'blade';
  if (id === 'magic' && (FOE_BOSSES.has(kind) || ENEMY_VFX[kind]?.heart)) return FOE_TONES.corrupt;
  return FOE_TONES[id];
}
// An enemy shot's own colour: its shooter's template hue (Foe Crimson,
// Violet or neon magenta), never Ember, which is left to the floor warnings
// (Kesh's "Crimson cores" pick, VFX rework PR 3).
export const vfxFoeShotColor = (kind) => vfxFoeTone(kind).a;
export const vfxFoeWeight = (kind) => (FOE_BOSSES.has(kind) ? 2 : FOE_CHAMPIONS.has(kind) ? 1.5 : 1);

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
  // New enemies, Wood and Mill (docs/WOOD_MILL_ENEMIES.md). Their beats (the
  // shriek, the lash and yank, the leap / latch / drain / shed, the sweep and
  // the sack) are director recipes keyed by the sim event.
  owl: Object.freeze({ matter: 'owlfeather', family: 'flyer', shard: 'feather', chunk: 0, dust: 2, feathers: 8 }),
  lasher: Object.freeze({ matter: 'bramble', family: 'support', shard: 'needle', chunk: 4, dust: 2 }),
  leech: Object.freeze({ matter: 'leech', family: 'charger', shard: 'drop', chunk: 3, dust: 0 }),
  miller: Object.freeze({ matter: 'stone', family: 'brute', shard: null, chunk: 6, dust: 3 }),
  // New enemies, Barrow and Heart (docs/NEW_ENEMIES_BARROW_HEART.md). Their
  // beats (the keen, the snare's bury / spring / snap / crumble, the bloom's
  // rooting and pulse, the siphon's lash / latch / drink / snap) are director
  // recipes keyed by the sim event.
  keener: Object.freeze({ matter: 'ash', family: 'support', shard: null, chunk: 2, dust: 4 }),
  sexton: Object.freeze({ matter: 'earth', family: 'support', shard: null, chunk: 5, dust: 4 }),
  bloom: Object.freeze({ matter: 'heartcrystal', family: 'brute', shard: 'needle', chunk: 4, dust: 1, heart: true }),
  siphon: Object.freeze({ matter: 'heartflesh', family: 'flyer', shard: 'drop', chunk: 2, dust: 0, heart: true }),
  // Act V, the Still Spire (docs/ACT_V.md). Their beats (the dive, landing
  // and climb; the toll and the choke; the crack, wake, slam and settle; the
  // swing and the landing) are director recipes keyed by the sim event.
  kite: Object.freeze({ matter: 'kitecloth', family: 'flyer', shard: 'feather', chunk: 0, dust: 2, feathers: 6 }),
  chime: Object.freeze({ matter: 'bellbronze', family: 'flyer', shard: null, chunk: 4, dust: 2 }),
  gargoyle: Object.freeze({ matter: 'spirestone', family: 'brute', shard: null, chunk: 8, dust: 4 }),
  hanger: Object.freeze({ matter: 'hemp', family: 'charger', shard: null, chunk: 2, dust: 3 }),
  // Plan 4 slice 7: the volley and the warder (their beats — the volley,
  // the hush, the rap and the choke — are director recipes; the hush veil
  // on what it wards is render/enemies/spire.js).
  vane: Object.freeze({ matter: 'bellbronze', family: 'shooter', shard: 'needle', chunk: 4, dust: 1, shot: Object.freeze({ look: 'dart', trail: 0.22 }) }),
  sacristan: Object.freeze({ matter: 'spirestone', family: 'support', shard: null, chunk: 6, dust: 3 }),
  // The Ember Kiln (docs/KILN.md). Their beats (the lunge and the skid; the
  // slam, its slag splash and the crust knitting; the fan and the choke; the
  // flare, the snuff and the relight) are director recipes keyed by the sim
  // event. Their own heat is Kiln Gold, never Ember (render/enemies/kiln.js).
  newt: Object.freeze({ matter: 'newthide', family: 'charger', shard: null, chunk: 3, dust: 2, wakeEvery: 0.14 }),
  slag: Object.freeze({ matter: 'slag', family: 'brute', shard: null, chunk: 8, dust: 3 }),
  bellows: Object.freeze({ matter: 'bellows', family: 'support', shard: null, chunk: 4, dust: 2 }),
  cindermoth: Object.freeze({ matter: 'mothash', family: 'flyer', shard: 'petal', chunk: 0, dust: 3 }),
  // ... and its two more (content plan 5 slice 9): the coal and its cinder
  // bed, the fumble; the fade, the rise and the rake.
  hurler: Object.freeze({ matter: 'coalsack', family: 'shooter', shard: null, chunk: 4, dust: 3 }),
  ashwraith: Object.freeze({ matter: 'ashgrey', family: 'charger', shard: null, chunk: 0, dust: 4 }),
  // CHAMPIONS (docs/CHAMPIONS.md): the four lords. Their move beats and
  // deaths are director recipes keyed by champion_* events.
  briar_knight: Object.freeze({ matter: 'bramble', family: 'brute', shard: 'needle', chunk: 8, dust: 3 }),
  sluice_warden: Object.freeze({ matter: 'stone', family: 'brute', shard: 'drop', chunk: 8, dust: 2 }),
  bone_reeve: Object.freeze({ matter: 'boneplate', family: 'brute', shard: 'needle', chunk: 8, dust: 3 }),
  hollow_choir: Object.freeze({ matter: 'heartcrystal', family: 'flyer', shard: 'needle', chunk: 4, dust: 1, heart: true, shot: Object.freeze({ look: 'dart', trail: 0.2 }) }),
  gale_herald: Object.freeze({ matter: 'spirestone', family: 'brute', shard: 'feather', chunk: 8, dust: 4, feathers: 6 }),
  // Second champions (plan 4 slice 8): their beats and deaths are director
  // recipes keyed by champion_* events too.
  moss_hart: Object.freeze({ matter: 'moss', family: 'brute', shard: 'petal', chunk: 8, dust: 3 }),
  lockkeeper: Object.freeze({ matter: 'rust', family: 'brute', shard: 'drop', chunk: 8, dust: 2 }),
  gravebell_ringer: Object.freeze({ matter: 'boneplate', family: 'brute', shard: 'needle', chunk: 8, dust: 3 }),
  vein_matron: Object.freeze({ matter: 'heartcrystal', family: 'brute', shard: 'needle', chunk: 6, dust: 1, heart: true, shot: Object.freeze({ look: 'dart', trail: 0.2 }) }),
  // The Still Spire's second (content plan 5 slice 2).
  bell_abbess: Object.freeze({ matter: 'habit', family: 'brute', shard: 'feather', chunk: 6, dust: 3 }),
  // The Ember Kiln's two (content plan 5 slice 9).
  furnace_knight: Object.freeze({ matter: 'kilniron', family: 'brute', shard: null, chunk: 8, dust: 4 }),
  glassblower: Object.freeze({ matter: 'moltenglass', family: 'brute', shard: 'needle', chunk: 6, dust: 2 }),
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
  // Third bosses (docs/THIRD_BOSSES.md).
  //   gloamwolf  grey fur, torn earth and moonlight: a pounce that craters
  //              and claws the floor, a three-claw rend, a howl of rings
  //   mireking   millpond water, silt and slime: a tongue down the lane, a
  //              belly flop that throws a crown of water, a violet gulp
  gloamwolf: Object.freeze({
    id: 'gloamwolf',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'owlfeather',
    second: 'dirt',
    pounce: Object.freeze({ chunk: 14, dust: 6, fur: 12 }),
    howl: Object.freeze({ rings: 4, leaves: 18 }),
    camera: Object.freeze({ dolly: 0.08, kick: 0.06 }),
  }),
  mireking: Object.freeze({
    id: 'mireking',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'slime',
    second: 'water',
    lash: Object.freeze({ speed: 26 }),
    flop: Object.freeze({ ripples: 3, drops: 30, silt: 12 }),
    camera: Object.freeze({ dolly: 0.1, kick: 0.07 }),
  }),
  // Slice 11 (docs/THIRD_BOSSES.md).
  //   ashraven    black feathers, pyre ash and cinders: a dive that tears a
  //               furrow of embers down the lane, a gust of ash and feathers,
  //               an omen of crows coming down on one spot
  //   veinweaver  violet vein and crystal: a lit thread, a heartbeat slam
  //               that cracks the floor into veins, egg sacs that burst
  ashraven: Object.freeze({
    id: 'ashraven',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'feather',
    second: 'cinder',
    dive: Object.freeze({ feathers: 18, cinders: 16 }),
    gust: Object.freeze({ feathers: 22, ash: 8 }),
    omen: Object.freeze({ crows: 7, feathers: 16 }),
    camera: Object.freeze({ dolly: 0.09, kick: 0.07 }),
  }),
  veinweaver: Object.freeze({
    id: 'veinweaver',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'heartcrystal',
    second: 'heartflesh',
    slam: Object.freeze({ veins: 8, shards: 16 }),
    bind: Object.freeze({ beads: 8 }),
    camera: Object.freeze({ dolly: 0.1, kick: 0.07 }),
  }),
  // Act V's two bosses (docs/ACT_V_BOSSES.md).
  //   hush     the silence itself: colour drains out of what it touches, so
  //            its light is a cold lavender-white over grey, with the
  //            God-stuff violet only at the rim; the Great Hush pulls sound
  //            (motes, dust, light) inward before it lands (the final boss)
  //   skyhorn  bell bronze and pale limestone over the hollow song's violet:
  //            a rush that throws grit and sparks off its horns, a toll of
  //            bronze rings, a leap that cracks the floor
  hush: Object.freeze({
    id: 'hush',
    corruption: VFX_MATTER.hushpale,
    peak: '#F6F7FF',
    rim: PALETTE.godstuffViolet,
    threat: PALETTE.emberDanger,
    matter: 'hushveil',
    second: 'hushpale',
    note: Object.freeze({ rings: 3, motes: 16 }),
    great: Object.freeze({ motes: 40, rings: 4 }),
    camera: Object.freeze({ dolly: 0.1, kick: 0.07 }),
  }),
  skyhorn: Object.freeze({
    id: 'skyhorn',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'bellbronze',
    second: 'spirestone',
    rush: Object.freeze({ grit: 3, sparks: 4 }),
    toll: Object.freeze({ rings: 4 }),
    leap: Object.freeze({ chunk: 16, dust: 6 }),
    camera: Object.freeze({ dolly: 0.1, kick: 0.08 }),
  }),
  // Content plan 5 slice 1 (docs/THIRD_BOSSES.md): the Spire's third.
  //   hourwarden  the gods' clock: bell bronze, pale dial-light and the
  //               hollow song's violet in its works. The Pendulum carves a
  //               bronze arc down its lane and back; the Hand Sweep throws
  //               two blade-arcs; the Toll of the Hours draws a dial of
  //               light on the floor and each weight lands on its hour mark
  //               with a ring of bronze; run down, cogs and springs spill.
  hourwarden: Object.freeze({
    id: 'hourwarden',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'bellbronze',
    second: 'spirestone',
    dial: '#E8DFC8',
    pendulum: Object.freeze({ sparks: 14, marks: 4 }),
    sweep: Object.freeze({ arcs: 2, sparks: 12 }),
    hours: Object.freeze({ chunk: 8, rings: 2 }),
    camera: Object.freeze({ dolly: 0.1, kick: 0.07 }),
  }),
  // Content plan 5 slice 8 (docs/KILN_BOSSES.md): the Ember Kiln's two. The
  // Kiln's light rule holds: their fire is KILN GOLD over COAL crimson, and
  // Ember is only ever the frame that hurts.
  //   founder     the gods' bell-founder: fire brick, bell bronze, kiln gold.
  //               The Molten Pour runs a river of white-gold bronze down its
  //               lane that cools to slag; the Bell Drop is a bronze bell
  //               falling out of the dark with a ring of sound off it; a
  //               Casting cracks a mould and spills gold; the Firing throws a
  //               dome of heat off its open chest; quenched, it steams grey.
  //   cinderback  the Kiln's warden salamander: soot hide over live coals.
  //               It sinks into a ring of molten floor (gold seams racing in)
  //               and bursts up through it in a crown of magma; its tail
  //               whips a gold arc; its spit lobs three white-hot gobbets.
  founder: Object.freeze({
    id: 'founder',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'bellbronze',
    second: 'kilnbrick',
    pour: Object.freeze({ drops: 6, sparks: 16 }),
    bell: Object.freeze({ chunk: 10, rings: 3 }),
    firing: Object.freeze({ rays: 14, sparks: 40 }),
    camera: Object.freeze({ dolly: 0.12, kick: 0.08 }),
  }),
  cinderback: Object.freeze({
    id: 'cinderback',
    corruption: PALETTE.godstuffViolet,
    peak: PALETTE.godstuffVioletPeak,
    threat: PALETTE.emberDanger,
    matter: 'salamander',
    second: 'slag',
    dive: Object.freeze({ seams: 10, chunk: 14, sparks: 30 }),
    lash: Object.freeze({ sparks: 14 }),
    spit: Object.freeze({ sparks: 6 }),
    camera: Object.freeze({ dolly: 0.1, kick: 0.09 }),
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
