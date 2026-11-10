// THE SIGNATURE DIRECTOR'S SHARED VALUES (render/vfx/signature.js and its
// parts under render/vfx/sig/): the reserved colours it reads, the shot and
// trail heights, and the contact, kill and element-air numbers.
import { PALETTE } from '../../../data/palette.js';

export const EMBER = PALETTE.emberDanger;
export const PARCH = PALETTE.parchment;
export const BONE = PALETTE.bone;
export const HEAL = PALETTE.brightHeal;
export const INK = PALETTE.voidCharcoal;
export const TAU = Math.PI * 2;
export const BOLT_Y = 0.55;
export const ESHOT_Y = 0.5;

// Families whose bodies kick dust while they move fast (chargers, brutes) and
// the flyer's scale-dust wake. Speed in u/tick of sim travel.
export const TRAIL_SPEED = 0.045;

// Enemy shots with their own trail shape (kind -> trail spec); the rest use
// the mantis's sickle. Every glow is the shooter's template hue, set per
// shot (vfxFoeShotColor). The Barrow Crow's darts: thin, bone-cored, short.
export const ENEMY_SHOT_TRAIL = Object.freeze({
  crow: Object.freeze({ y: ESHOT_Y, len: 0.55, width: 0.07, core: BONE, tailW: 0.05 }),
  // The Millwheel's cog shards: a hot iron splinter, short and bright.
  millwheel: Object.freeze({ y: ESHOT_Y, len: 0.6, width: 0.09, core: PARCH, tailW: 0.1 }),
  // Act IV: the Cantor's echo and the Colossus' burst throw crystal shards.
  cantor: Object.freeze({ y: ESHOT_Y, len: 0.7, width: 0.1, core: PARCH, tailW: 0.1 }),
  colossus: Object.freeze({ y: ESHOT_Y, len: 0.6, width: 0.1, core: '#DCD6F2', tailW: 0.1 }),
  // Act V: the Vane Cock's gust darts — long thin streaks of cold air.
  vane: Object.freeze({ y: ESHOT_Y, len: 0.95, width: 0.07, core: '#DCE6EE', tailW: 0.04 }),
});

// THE HIT AND THE KILL (docs/HIT_FEEDBACK.md, VFX_HIT_RULES P3, L5, K1, K2,
// P1). The contact: a near-white bloom about 2 body widths across (P3) and the
// class flare and flash held at full strength 100 ms (L5), the bloom dimmed in
// a crowd and under Effects: Reduced. The kill: the bone flare held 117 ms
// (5 frames with the kill freeze the render hold adds), a white bloom twice
// a hit's area (K1: 1.41 x its width), the ground ring gone within 0.22 s and drawn under
// any Ember ring, and the debris burst waiting for the body's swell (K2),
// leaning slightly along the killing hit (P1).
export const CONTACT_FX = Object.freeze({ hold: 0.1, life: 0.22, critLife: 0.26, bloom: 1.4, bloomSkill: 1.7, bloomCrit: 1.2, bloomOpacity: 0.3, bloomGrow: 0.1, crowd: 0.12 });
export const KILL_FX = Object.freeze({ flareHold: 0.117, flareLife: 0.3, bloom: 2.0, bloomOpacity: 0.35, ringLife: 0.22, ringOrder: 0, burstAt: 0.1, lean: 0.25 });

// D3: the air an element leaves (§6.2 m).
// size: a twinkle's size range (u); the extras (v0.5.348) made them bigger,
// Kesh's open choice from Part 2 (were 0.05 to 0.09).
export const ELEMENT_AIR = Object.freeze({ twinkles: 100, sec: [1.0, 1.9], mist: 3, mistOpacity: 0.16, size: [0.09, 0.16] });

// Healer skills that restore (their casts get petals + light, never damage FX).
export const HEAL_SKILLS = new Set(['mending_bolt', 'swift_mend', 'nova_bloom', 'sanctuary', 'guardian_bond', 'restorative_wave', 'dewfall', 'kindred_shield', 'mending_tide', 'hearthsong']);
// Nova radii by skill for skill_cast (the Healer's cast payload carries no
// radius); filled from sim/skills.js at module load by the main wiring.
export const SKILL_AREA = new Map();
export function registerSkillAreas(skills) {
  for (const id of Object.keys(skills)) if (skills[id].shape === 'nova') SKILL_AREA.set(id, skills[id].area);
}

// THE ONE VFX DIRECTOR (AUDIT D5): the class layer (signature.js and its
// parts) and the template layer (templates.js) used to subscribe to the sim
// bus each on their own, so one cast reached two directors. Now every VFX
// handler registers here, and the director holds ONE bus subscription per
// event type that runs that type's handlers in registration order (the
// order the bus itself kept, so what plays and in what order is unchanged).
export function createVfxDispatch(eventBus) {
  const lists = new Map(); // event type -> handlers, in registration order
  function on(type, fn) {
    let list = lists.get(type);
    if (!list) {
      list = [];
      lists.set(type, list);
      eventBus.on(type, (ev) => {
        for (const h of list) h(ev);
      });
    }
    list.push(fn);
  }
  return { on, types: () => lists.size, handlers: () => [...lists.values()].reduce((n, l) => n + l.length, 0) };
}
