// THE PARTY LOOKS: the heroes' basics and casts (ally_basic, ally_cast,
// skill_cast), ground zones, dashes and parries, the 2026-10-08 class skills,
// the template layer (tplFx) and the party's hits.
// A part of the signature director (render/vfx/signature.js): its state is
// `sv`, its functions `SF`. Render only; randomness from the COSMETIC stream.
import { PALETTE } from '../../../data/palette.js';
import { createTideFx } from '../tidefx.js';
import { createBellFx } from '../bellfx.js';
import { createDuskFx } from '../duskfx.js';
import { createTonicFx } from '../tonicfx.js';
import { createShrineFx } from '../shrinefx.js';
import { createSecretFx } from '../secretfx.js';
import { createRelic6Fx } from '../relic6fx.js';
import { createTemplateFx } from '../templates.js';
import { heroRigCenter, heroRigMoving, heroRigPoint } from '../../critters/rigs.js';
import { createFoeFx } from '../foefx.js';
import { BOLT_Y, BONE, ELEMENT_AIR, HEAL, HEAL_SKILLS, INK, PARCH, SKILL_AREA, TAU } from './common.js';
import { createBoltFx } from '../boltfx.js';
import { isVfxBoss, vfxClassStyle, vfxEnemyStyle, vfxMatterColor, vfxSkillClass } from '../../../data/vfx.js';
import { SHARD_TILE } from '../particles.js';
import { CHEST_BEAT } from '../../interactables/chestbeat.js';

export function createSigParty(ctx) {
  const { sv, SF, ANTICIP, BOSS_HIT, CAM_PUNCH, CRIT_BOOK, FINISHERS, N, after, animeFx, animeTick, bus, camfx, flareKind, flipbook, kit, mark, player, rnd, spray, stage, tk, world } = ctx;

  // ----------------------------------------------------------- party wiring --
  bus.on('ally_basic', (ev) => {
    const st = vfxClassStyle(ev.classId);
    const a = SF.byId(ev.id);
    const x = ev.x ?? a?.x;
    const z = ev.z ?? a?.z;
    if (x == null) return;
    if (ev.shape === 'melee_arc') SF.swing(st, ev.id, x, z, Math.atan2(ev.dz, ev.dx), ev.reach ?? 0.9, ((ev.halfAngle ?? 50) * Math.PI) / 180);
    else SF.release(st, x, z, ev.dx ?? 0, ev.dz ?? 1);
  });

  bus.on('ally_cast', (ev) => {
    const st = vfxClassStyle(ev.classId);
    const x = ev.x;
    const z = ev.z;
    const angle = Math.atan2(ev.dz ?? 0, ev.dx ?? 1);
    if (ev.shape === 'melee_arc') {
      SF.swing(st, ev.id, x, z, angle, ev.reach ?? 1, ((ev.halfAngle ?? 50) * Math.PI) / 180, { big: true, skill: ev.skill, combo: ev.combo || 0 });
    } else if (ev.shape === 'nova') {
      SF.nova(st, x, z, ev.radius ?? 1.2, { skill: ev.skill });
    } else if (ev.shape === 'projectile') {
      SF.release(st, x, z, ev.dx ?? 0, ev.dz ?? 1, { count: ev.count ?? 1 });
    } else if (ev.shape === 'ground_aoe') {
      placeZone(st, ev.skill, ev.zx ?? x, ev.zz ?? z, ev.radius ?? 1, x, z);
    } else if (ev.shape === 'direct' && Array.isArray(ev.targets)) {
      // Shield Wall: a steel flare on each recipient (the plate glyph flight
      // is the class layer's).
      for (const id of ev.targets) {
        const t = SF.byId(id);
        if (!t) continue;
        kit.flash({ x: t.x, y: 0.6, z: t.z, color: st.glow, size: 0.6, life: 0.3, delay: 0.24 });
        kit.ring({ x: t.x, z: t.z, r0: 0.6, r1: 0.35, width: 0.08, life: 0.3, core: st.core, glow: st.glow, soft: 0.3, y: 0.05, delay: 0.24 });
      }
      kit.flash({ x, y: 0.6, z, color: st.glow, size: 0.5, life: 0.2 });
    }
  });

  // Ground-placed class skills: the moment of placement.
  function placeZone(st, skill, x, z, radius, cx, cz) {
    SF.anticipate(x, z, radius * 0.8, st.glow, { y: 0.15, lines: 8 });
    after(ANTICIP, () => {
      placeZoneLand(st, skill, x, z, radius, cx, cz);
      SF.flare(x, 0.35, z, st.glow, 1.0 + radius * 0.3, { kind: flareKind(st), life: 0.22 });
      SF.classMark(st, x, z, radius * 0.8);
    });
  }
  function placeZoneLand(st, skill, x, z, radius, cx, cz) {
    if (skill === 'rain_of_arrows' || (st.shape === 'line' && skill !== 'detonating_charge')) {
      // Arrows rain down into the ring over half a second.
      kit.ring({ x, z, r0: radius * 0.4, r1: radius, width: 0.08, life: 0.5, core: PARCH, glow: st.glow, soft: 0.3, y: 0.05 });
      for (let i = 0; i < N(10); i++) {
        const a = rnd(0, TAU);
        const r = rnd(0, radius * 0.9);
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        kit.streak({ a: { x: px, y: 3.2, z: pz }, b: { x: px, y: 2.4, z: pz }, width: 0.05, tailW: 0.2, core: PARCH, glow: st.glow, life: 0.28, delay: i * 0.045, travel: { x: 0, y: -8.5, z: 0 }, fall: 1.2 });
      }
    } else if (st.shape === 'line') {
      // Detonating Charge: a planted point that pulses.
      kit.flash({ x, y: 0.3, z, color: st.glow, size: 0.6, life: 0.3 });
      kit.ring({ x, z, r0: 0.1, r1: radius, width: 0.06, life: 0.35, core: PARCH, glow: st.glow, soft: 0.3, y: 0.05 });
      kit.streak({ a: { x: cx, y: 0.6, z: cz }, b: { x, y: 0.35, z }, width: 0.04, tailW: 0.1, core: PARCH, glow: st.glow, life: 0.2, fall: 1.5 });
    } else if (st.shape === 'blunt') {
      // Ground Crack: the ground splits where the Tank points.
      kit.crack({ x, z, radius: radius * 1.35, glow: st.glow, life: 2.2, cool: 0.6 });
      kit.ring({ x, z, r0: 0.2, r1: radius * 1.1, width: st.ring.width, life: 0.45, core: st.core, glow: st.glow, soft: st.ring.soft, jag: st.ring.jag, y: 0.05 });
      spray('chunk', x, 0.2, z, st.debris.chunk + 3, { color: st.debrisColor, speed: [0.6, 1.8], up: [2.2, 3.8], size: [0.07, 0.16], life: [0.6, 1.0], jitter: radius * 0.6 });
      spray('smoke', x, 0.15, z, st.debris.dust + 2, { color: st.second, speed: [0.6, 1.4], up: [0.2, 0.5], size: [0.38, 0.55], grow: 1.3, life: [0.7, 1.1], opacity: 0.32, gravity: -0.2, drag: 2.6, jitter: radius * 0.4 });
      kit.light({ x, z, radius: radius * 1.4, color: st.glow, opacity: st.light.opacity, life: 0.4 });
      camfx.dolly(x, z, st.camera.dolly, 0.22);
    } else if (st.shape === 'sharp') {
      // Caltrops: a scatter of silver blades flicked into the ring.
      kit.ring({ x, z, r0: radius * 0.3, r1: radius, width: st.ring.width, life: 0.35, core: st.second, glow: st.glow, soft: 0.2, y: 0.05 });
      spray('shard', x, 0.5, z, 10, { color: st.second, tile: SHARD_TILE.needle, speed: [0.6, 1.4], up: [1.0, 1.8], size: [0.12, 0.16], life: [0.6, 0.9], gravity: 5, drag: 0.8, spin: [-10, 10], jitter: radius * 0.3, floor: 0.04 });
      kit.streak({ a: { x: cx, y: 0.6, z: cz }, b: { x, y: 0.4, z }, width: 0.05, tailW: 0.1, core: st.second, glow: st.glow, life: 0.2, fall: 1.5 });
    } else {
      kit.ring({ x, z, r0: 0.2, r1: radius, width: st.ring.width, life: 0.5, core: st.core, glow: st.glow, soft: 0.9, y: 0.05 });
      kit.light({ x, z, radius: radius * 1.3, color: st.glow, opacity: st.light.opacity * 0.6, life: 0.5 });
    }
  }

  // Ally zone ticks: each class pulses its zone its own way.
  bus.on('zone_tick', (ev) => {
    if (!ev.classId) return; // a hero kit's zone (the Healer's carries no classId)
    const zEnt = SF.byId(ev.id);
    if (!zEnt) return;
    const st = vfxClassStyle(zEnt.classId ?? vfxSkillClass(ev.skill));
    const { x, z } = zEnt;
    const r = zEnt.radius ?? 0.9;
    if (st.shape === 'blunt') {
      kit.crack({ x: x + rnd(-r, r) * 0.4, z: z + rnd(-r, r) * 0.4, radius: r * 0.7, glow: st.glow, life: 0.9, cool: 0.25, opacity: 0.6 });
      spray('smoke', x, 0.15, z, 2, { color: st.second, speed: [0.3, 0.8], up: [0.2, 0.5], size: [0.3, 0.42], grow: 1.1, life: [0.5, 0.8], opacity: 0.25, gravity: -0.2, drag: 2.4, jitter: r * 0.5 });
      spray('chunk', x, 0.15, z, 3, { color: st.debrisColor, speed: [0.3, 0.9], up: [1.4, 2.4], size: [0.05, 0.1], life: [0.4, 0.7], jitter: r * 0.6 });
    } else if (st.shape === 'sharp') {
      for (let i = 0; i < 2; i++) {
        const a = rnd(0, TAU);
        const rr = rnd(0, r * 0.8);
        kit.flash({ x: x + Math.cos(a) * rr, y: 0.12, z: z + Math.sin(a) * rr, color: st.second, size: 0.28, life: 0.14, delay: i * 0.05 });
      }
      spray('spark', x, 0.1, z, 3, { color: st.glow, speed: [0.3, 0.8], up: [0.6, 1.2], size: [0.04, 0.08], life: [0.2, 0.35], jitter: r * 0.6 });
    } else if (st.shape === 'line') {
      if (ev.skill === 'rain_of_arrows') {
        for (let i = 0; i < N(3); i++) {
          const a = rnd(0, TAU);
          const rr = rnd(0, r * 0.9);
          const px = x + Math.cos(a) * rr;
          const pz = z + Math.sin(a) * rr;
          kit.streak({ a: { x: px, y: 3.0, z: pz }, b: { x: px, y: 2.3, z: pz }, width: 0.05, tailW: 0.2, core: PARCH, glow: st.glow, life: 0.26, delay: i * 0.06, travel: { x: 0, y: -8.5, z: 0 }, fall: 1.2 });
        }
      } else {
        // Detonating Charge: a star of short lines bursts off the point.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + rnd(-0.2, 0.2);
          kit.streak({ a: { x, y: 0.3, z }, b: { x: x + Math.cos(a) * r, y: 0.3, z: z + Math.sin(a) * r }, width: 0.06, tailW: 0.1, core: PARCH, glow: st.glow, life: 0.22, fall: 2 });
        }
        kit.flash({ x, y: 0.35, z, color: st.glow, size: 0.6, life: 0.18 });
        kit.light({ x, z, radius: r * 1.2, color: st.glow, opacity: st.light.opacity, life: 0.25 });
      }
    }
  });

  bus.on('ally_dash', (ev) => {
    const a = SF.byId(ev.id);
    const st = vfxClassStyle(SF.classOf(a) ?? vfxSkillClass(ev.skill));
    const { x0, z0, x1, z1 } = ev;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const L = Math.hypot(dx, dz) || 1;
    // Take-off and arrival frames.
    SF.flare(x0, 0.45, z0, st.glow, 0.6, { kind: flareKind(st), life: 0.14 });
    SF.flare(x1, 0.45, z1, st.glow, 0.8, { kind: flareKind(st), life: 0.2, core: st.shape === 'sharp' ? st.second : PARCH });
    if (st.shape === 'blunt' || st.shape === 'sharp') kit.mark({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, radius: Math.min(2.4, L) * 0.9, kind: 'gouge', angle: Math.atan2(dz, dx), stretch: 1.8, stain: st.shape === 'blunt' ? st.debrisColor : INK, glow: st.glow, cool: 0.5, life: 1.8, opacity: 0.35 });
    if (st.shape === 'blunt') {
      // Shoulder Charge: a wide steel wake and dust boiling off the path.
      kit.streak({ a: { x: x0, y: 0.3, z: z0 }, b: { x: x1, y: 0.35, z: z1 }, width: 0.34, tailW: 0.3, core: st.core, glow: st.glow, life: 0.3, fall: 1.2, opacity: 0.7 });
      for (let i = 0; i < N(5); i++) {
        const k = i / 5;
        spray('smoke', x0 + dx * k, 0.12, z0 + dz * k, 1, { color: st.second, speed: [0.2, 0.6], up: [0.2, 0.5], size: [0.3, 0.45], grow: 1.2, life: [0.5, 0.85], opacity: 0.3, gravity: -0.2, drag: 2.4 });
      }
      spray('chunk', x1, 0.2, z1, 4, { color: st.debrisColor, speed: [1.0, 2.2], up: [1.5, 2.6], size: [0.06, 0.12], life: [0.4, 0.7], dir: { x: dx / L, z: dz / L }, dirBias: 0.6 });
      camfx.kick(dx / L, dz / L, st.camera.kick, 0.14);
    } else if (st.shape === 'sharp') {
      // Fox Step / Lunge: one silver line and a crimson afterimage beside it.
      kit.streak({ a: { x: x0, y: 0.5, z: z0 }, b: { x: x1, y: 0.5, z: z1 }, width: 0.08, tailW: 0.05, core: st.second, glow: st.glow, life: 0.24, fall: 0.8 });
      kit.streak({ a: { x: x0, y: 0.32, z: z0 }, b: { x: x1, y: 0.32, z: z1 }, width: 0.24, tailW: 0.2, core: st.glow, glow: st.glow, life: 0.3, fall: 1.4, opacity: 0.5 });
      kit.flash({ x: x0, y: 0.5, z: z0, color: st.second, size: 0.4, life: 0.14 });
      kit.flash({ x: x1, y: 0.5, z: z1, color: st.second, size: 0.32, life: 0.14, delay: 0.08 });
      spray('spark', x1, 0.45, z1, 4, { color: st.second, speed: [1.2, 2.4], up: [0.3, 1.0], size: [0.04, 0.08], life: [0.15, 0.28], dir: { x: dx / L, z: dz / L }, dirBias: 0.7 });
    } else if (st.shape === 'line') {
      // Vault: wind lines streaming off the take-off point, feathers left behind.
      for (let i = 0; i < 3; i++) {
        const o = (i - 1) * 0.16;
        kit.streak({ a: { x: x0 - dz / L * o, y: 0.25 + i * 0.1, z: z0 + dx / L * o }, b: { x: x1 - dz / L * o, y: 0.35 + i * 0.1, z: z1 + dx / L * o }, width: 0.045, tailW: 0, core: PARCH, glow: st.glow, life: 0.26, delay: i * 0.03, fall: 1.4 });
      }
      spray('shard', x0, 0.5, z0, 4, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.3, 0.8], up: [0.6, 1.2], size: [0.11, 0.16], life: [0.8, 1.2], gravity: 0.9, drag: 1.8, spin: [-3, 3], flutter: 0.5 });
    } else {
      kit.streak({ a: { x: x0, y: 0.35, z: z0 }, b: { x: x1, y: 0.35, z: z1 }, width: 0.2, tailW: 0.3, core: st.core, glow: st.glow, life: 0.3, fall: 1.2, opacity: 0.6 });
    }
  });

  bus.on('parry_counter', (ev) => {
    const a = SF.byId(ev.id);
    const st = vfxClassStyle(SF.classOf(a) ?? 'swordsman');
    const t = SF.byId(ev.attackerId);
    const x = t ? t.x : ev.x + (ev.dx ?? 0) * 0.6;
    const z = t ? t.z : ev.z + (ev.dz ?? 0) * 0.6;
    // An X cut across the attacker.
    for (const s of [-1, 1]) {
      const a0 = Math.PI / 4 * s + Math.atan2(ev.dz ?? 0, ev.dx ?? 1);
      kit.streak({ a: { x: x - Math.cos(a0) * 0.45, y: 0.4, z: z - Math.sin(a0) * 0.45 }, b: { x: x + Math.cos(a0) * 0.45, y: 0.65, z: z + Math.sin(a0) * 0.45 }, width: 0.09, tailW: 0.1, core: st.second, glow: st.glow, life: 0.24, delay: s > 0 ? 0.05 : 0, fall: 0.7 });
    }
    kit.flash({ x, y: 0.55, z, color: st.second, size: 0.6, life: 0.18 });
    SF.flare(x, 0.55, z, st.glow, 1.4, { life: 0.26, core: st.second, spin: 2 });
    SF.shock(x, z, 1.2, st.glow, { life: 0.28 });
    kit.light({ x, z, radius: 0.8, color: st.glow, opacity: 0.4, life: 0.22 });
    camfx.kick(ev.dx ?? 0, ev.dz ?? 0, st.camera.kick, 0.09);
  });

  bus.on('scatter_burst', (ev) => {
    const st = vfxClassStyle(vfxSkillClass(ev.skill) ?? 'archer');
    for (let i = 0; i < 5; i++) {
      const a = rnd(0, TAU);
      kit.streak({ a: { x: ev.x, y: BOLT_Y, z: ev.z }, b: { x: ev.x + Math.cos(a) * 0.6, y: BOLT_Y, z: ev.z + Math.sin(a) * 0.6 }, width: 0.04, tailW: 0.1, core: PARCH, glow: st.glow, life: 0.18, fall: 1.5 });
    }
    kit.flash({ x: ev.x, y: BOLT_Y, z: ev.z, color: st.glow, size: 0.45, life: 0.16 });
  });

  bus.on('aura_pulse', (ev) => {
    if (ev.seat === undefined) return; // the Healer's auras: skillfx / content
    const body = SF.byId(ev.id) ?? null;
    const st = vfxClassStyle(SF.classOf(body) ?? vfxSkillClass(ev.skill));
    const x = ev.x ?? body?.x;
    const z = ev.z ?? body?.z;
    if (ev.skill === 'iron_stance' && x != null) {
      kit.ring({ x, z, r0: 1.3, r1: 1.0, width: 0.1, life: 0.35, core: st.core, glow: st.glow, soft: 0.3, y: 0.05, opacity: 0.7 });
    } else if (ev.skill === 'razor_wake') {
      for (const id of ev.hit || []) {
        const e = SF.byId(id);
        if (e) kit.slash({ x: e.x, z: e.z, angle: rnd(0, TAU), radius: 0.35, width: 0.08, span: 1.6, sweep: 0.05, life: 0.18, core: st.second, glow: st.glow, soft: 0.1, lift: 0.1, y: 0.5, gain: 1.2 });
      }
    } else if (ev.skill === 'kestrel_watch' && x != null) {
      for (const id of ev.hit || []) {
        const e = SF.byId(id);
        if (!e) continue;
        kit.streak({ a: { x, y: 1.4, z }, b: { x: e.x, y: 0.5, z: e.z }, width: 0.05, tailW: 0.05, core: PARCH, glow: st.glow, life: 0.22, fall: 1.2 });
        spray('shard', e.x, 0.6, e.z, 1, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.3, 0.6], up: [0.4, 0.8], size: [0.1, 0.14], life: [0.7, 1.0], gravity: 0.9, drag: 1.8, spin: [-3, 3], flutter: 0.5 });
      }
    }
  });

  // The Healer (seat 0) casts through skill_cast; its own heal grammar stays
  // in skillfx / content — this adds the lantern light and the petals.
  bus.on('skill_cast', (ev) => {
    const p = player();
    if (!p) return;
    const st = vfxClassStyle(SF.classOf(p));
    const heal = HEAL_SKILLS.has(ev.skill);
    if (ev.shape === 'projectile') {
      const d = p.lastAimDir ?? { x: 1, z: 0 };
      SF.release(st, p.x, p.z, d.x ?? 1, d.z ?? 0, { count: ev.count ?? 1 });
    } else if (ev.shape === 'nova') {
      const r = SKILL_AREA.get(ev.skill) ?? 1.4;
      if (heal) {
        SF.healBloom(p.x, p.z, r, true);
        camfx.dolly(p.x, p.z, st.camera.dolly, 0.3);
      } else SF.nova(st, p.x, p.z, r, { skill: ev.skill });
    } else if (ev.shape === 'melee_arc' && heal) {
      const d = p.lastAimDir ?? { x: 1, z: 0 };
      SF.healBloom(p.x + (d.x ?? 0) * 0.8, p.z + (d.z ?? 0) * 0.8, 0.9, true);
    } else if (ev.shape === 'direct' && Array.isArray(ev.targets)) {
      for (const id of ev.targets) {
        const t = SF.byId(id);
        if (t) SF.healBloom(t.x, t.z, 0.5, false);
      }
    } else if (ev.shape === 'ground_aoe' && ev.x != null) {
      kit.light({ x: ev.x, z: ev.z, radius: 1.6, color: heal ? HEAL : st.glow, opacity: 0.35, life: 0.6, attack: 0.08 });
    }
  });

  // ------------------------------------------- MORE CLASS SKILLS (2026-10-08) --
  // docs/CLASS_SKILLS.md: each new skill's signature beat, layered over the
  // class's generic shape recipe above (which already plays its swing, burst,
  // release or placement). Anticipation, a white-hot impact, then something
  // left behind: the same three movements as every other class beat.
  const AMBER = PALETTE.hearthAmber;
  const lineAt = (x0, z0, dx, dz, k) => ({ x: x0 + dx * k, z: z0 + dz * k });
  const SKILL_SIG = {
    // Tank — a fault runs out along the line, earth heaving up segment by
    // segment, the far end bursting.
    earthshatter(st, ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const reach = (ev.reach ?? 1.8) + 0.4;
      const ang = Math.atan2(dz, dx);
      SF.anticipate(ev.x + dx * 0.4, ev.z + dz * 0.4, 0.6, st.glow, { lines: 8 });
      const n = 5;
      for (let i = 1; i <= n; i++) {
        const k = (i / n) * reach;
        const p = lineAt(ev.x, ev.z, dx, dz, k);
        after(ANTICIP + i * 0.045, () => {
          kit.crack({ x: p.x, z: p.z, radius: 0.45 + i * 0.06, glow: st.glow, life: 1.6, cool: 0.45 });
          spray('chunk', p.x, 0.2, p.z, 4, { color: st.debrisColor, speed: [0.4, 1.4], up: [2.6, 4.2], size: [0.07, 0.16], life: [0.6, 1.0], jitter: 0.25 });
          spray('smoke', p.x, 0.15, p.z, 2, { color: st.second, speed: [0.3, 0.9], up: [0.3, 0.7], size: [0.34, 0.5], grow: 1.3, life: [0.6, 1.0], opacity: 0.3, gravity: -0.2, drag: 2.4, jitter: 0.2 });
          kit.flash({ x: p.x, y: 0.3, z: p.z, color: st.glow, size: 0.45, life: 0.14 });
        });
      }
      const end = lineAt(ev.x, ev.z, dx, dz, reach);
      after(ANTICIP + (n + 1) * 0.045, () => {
        SF.flare(end.x, 0.5, end.z, st.glow, 1.5, { kind: 'burst', life: 0.28 });
        SF.shock(end.x, end.z, 1.3, st.glow, { jag: 0.7, width: 0.12 });
        kit.mark({ x: (ev.x + end.x) / 2, z: (ev.z + end.z) / 2, radius: reach * 0.6, kind: 'gouge', angle: ang, stretch: 2.6, stain: st.debrisColor, glow: st.glow, cool: 1.0, life: 3.4, opacity: 0.55 });
        kit.light({ x: end.x, z: end.z, radius: 1.6, color: st.glow, opacity: st.light.opacity * 1.2, life: 0.4 });
        camfx.kick(dx, dz, st.camera.kick * 1.6, 0.16);
        camfx.dolly(end.x, end.z, st.camera.dolly, 0.22);
      });
    },
    // Tank — a war cry: a tall steel ring rolls out, amber chevrons rise
    // over every member it reaches.
    rallying_cry(st, ev) {
      const R = 3.5;
      SF.anticipate(ev.x, ev.z, 0.8, AMBER, { core: PARCH });
      after(ANTICIP, () => {
        kit.ring({ x: ev.x, z: ev.z, r0: 0.4, r1: R, width: 0.16, life: 0.55, core: PARCH, glow: st.glow, soft: 0.3, jag: 0.4, y: 0.06, gain: 1.2 });
        kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: R * 0.85, width: 0.08, life: 0.6, core: AMBER, glow: AMBER, soft: 0.5, y: 0.9, delay: 0.05, opacity: 0.6 });
        SF.flare(ev.x, 1.0, ev.z, AMBER, 1.6, { kind: 'burst', life: 0.3 });
        kit.light({ x: ev.x, z: ev.z, radius: R * 0.8, color: AMBER, opacity: 0.4, life: 0.5 });
        camfx.dolly(ev.x, ev.z, st.camera.dolly, 0.24);
        for (const id of ev.targets || []) {
          const t = SF.byId(id);
          if (!t) continue;
          kit.streak({ a: { x: ev.x, y: 0.8, z: ev.z }, b: { x: t.x, y: 0.9, z: t.z }, width: 0.06, tailW: 0.1, core: PARCH, glow: AMBER, life: 0.24, fall: 1.2 });
          SF.embersUp(t.x, t.z, AMBER, 8, { radius: 0.3, life: [0.7, 1.1] });
          kit.flash({ x: t.x, y: 1.2, z: t.z, color: AMBER, size: 0.5, life: 0.22, delay: 0.08 });
        }
      });
    },
    // Tank — the ground grabs: a ring collapses inward, earth streaks drag
    // toward the badger, every caught enemy is hauled in on a line.
    earthen_grasp(st, ev) {
      const R = ev.radius ?? 2.3;
      kit.ring({ x: ev.x, z: ev.z, r0: R * 1.1, r1: 0.4, width: 0.18, life: 0.32, core: st.core, glow: st.glow, soft: 0.35, jag: 0.8, y: 0.06, gain: 1.2 });
      for (let i = 0; i < N(10); i++) {
        const a = (i / 10) * TAU + rnd(-0.2, 0.2);
        const r = R * rnd(0.8, 1.05);
        kit.streak({ a: { x: ev.x + Math.cos(a) * r, y: 0.12, z: ev.z + Math.sin(a) * r }, b: { x: ev.x + Math.cos(a) * (r - 0.5), y: 0.12, z: ev.z + Math.sin(a) * (r - 0.5) }, width: 0.14, tailW: 0.2, core: st.second, glow: st.glow, life: 0.3, travel: { x: -Math.cos(a) * r * 2.4, y: 0, z: -Math.sin(a) * r * 2.4 }, fall: 1.2 });
      }
      kit.crack({ x: ev.x, z: ev.z, radius: R * 0.7, glow: st.glow, life: 1.4, cool: 0.4 });
      for (const id of ev.targets || []) {
        const t = SF.byId(id);
        if (!t) continue;
        kit.streak({ a: { x: t.x, y: 0.3, z: t.z }, b: { x: ev.x, y: 0.3, z: ev.z }, width: 0.1, tailW: 0.05, core: st.second, glow: st.glow, life: 0.3, fall: 1.4, opacity: 0.8 });
        spray('chunk', t.x, 0.15, t.z, 3, { color: st.debrisColor, speed: [0.6, 1.4], up: [0.8, 1.6], size: [0.05, 0.1], life: [0.4, 0.7], dir: { x: ev.x - t.x, z: ev.z - t.z }, dirBias: 0.8 });
      }
      camfx.kick(rnd(-1, 1), rnd(-1, 1), st.camera.kick, 0.12);
    },
    // Swordsman — the moon's fang: one huge silver crescent over the swing
    // and a scatter of moon motes hanging after it.
    moonfang(st, ev) {
      const ang = Math.atan2(ev.dz ?? 0, ev.dx ?? 1);
      const tip = lineAt(ev.x, ev.z, ev.dx ?? 1, ev.dz ?? 0, 0.8);
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 1.25, width: 0.26, span: 2.2, sweep: 0.06, life: 0.34, core: PARCH, glow: st.second, soft: 0.1, lift: 0.3, y: 0.55, gain: 1.4, tail: 0.9 });
      kit.slash({ x: ev.x, z: ev.z, angle: ang, radius: 1.0, width: 0.12, span: 1.9, sweep: 0.07, life: 0.3, delay: 0.03, core: st.second, glow: st.glow, soft: 0.2, lift: 0.2, y: 0.5, gain: 1.1, reverse: true });
      SF.flare(tip.x, 0.6, tip.z, st.second, 1.3, { life: 0.24, core: PARCH });
      for (let i = 0; i < N(10); i++) {
        const a = ang + rnd(-1, 1);
        const r = rnd(0.4, 1.3);
        spray('spark', ev.x + Math.cos(a) * r, 0.6, ev.z + Math.sin(a) * r, 1, { color: st.second, speed: [0.05, 0.2], up: [0.2, 0.5], size: [0.05, 0.09], life: [0.7, 1.2], gravity: -0.15, drag: 2, opacity: 0.9 });
      }
      kit.light({ x: tip.x, z: tip.z, radius: 1.2, color: st.second, opacity: 0.35, life: 0.3 });
    },
    // Swordsman — a dance of six cuts spiralling out, then wind at the heels.
    blade_dance(st, ev) {
      const R = ev.radius ?? 1.3;
      const a0 = rnd(0, TAU);
      for (let i = 0; i < 6; i++) {
        kit.slash({ x: ev.x, z: ev.z, angle: a0 + i * 1.15, radius: R * (0.55 + i * 0.09), width: st.slash.width * 1.3, span: 1.5, sweep: 0.05, life: 0.24, delay: i * 0.04, core: i % 2 ? st.second : PARCH, glow: st.glow, soft: 0.15, lift: 0.16, y: 0.42 + i * 0.03, gain: 1.2, reverse: i % 2 === 0 });
      }
      after(0.26, () => {
        kit.ring({ x: ev.x, z: ev.z, r0: 0.3, r1: R * 1.2, width: 0.06, life: 0.3, core: st.second, glow: st.glow, soft: 0.2, y: 0.07 });
        for (let i = 0; i < 4; i++) {
          const a = rnd(0, TAU);
          kit.streak({ a: { x: ev.x, y: 0.3, z: ev.z }, b: { x: ev.x + Math.cos(a) * 0.8, y: 0.35, z: ev.z + Math.sin(a) * 0.8 }, width: 0.04, tailW: 0, core: PARCH, glow: st.glow, life: 0.22, fall: 1.4 });
        }
      });
    },
    // Archer — a long marking arrow: a jade rune where it leaves the bow.
    hunters_mark(st, ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const p = lineAt(ev.x, ev.z, dx, dz, 0.5);
      kit.ring({ x: p.x, z: p.z, r0: 0.5, r1: 0.15, width: 0.05, life: 0.2, core: PARCH, glow: st.glow, soft: 0.2, y: 0.6 });
      kit.streak({ a: { x: p.x, y: BOLT_Y, z: p.z }, b: { x: p.x + dx * 1.6, y: BOLT_Y, z: p.z + dz * 1.6 }, width: 0.04, tailW: 0, core: PARCH, glow: st.glow, life: 0.18, fall: 1.2 });
    },
    // Archer — a spray of five: a jade fan of wind and a burst of feathers.
    feather_fan(st, ev) {
      const dx = ev.dx ?? 1;
      const dz = ev.dz ?? 0;
      const base = Math.atan2(dz, dx);
      for (let i = -2; i <= 2; i++) {
        const a = base + (i * 12 * Math.PI) / 180;
        kit.streak({ a: { x: ev.x + Math.cos(a) * 0.3, y: 0.55, z: ev.z + Math.sin(a) * 0.3 }, b: { x: ev.x + Math.cos(a) * 1.6, y: 0.55, z: ev.z + Math.sin(a) * 1.6 }, width: 0.05, tailW: 0.12, core: PARCH, glow: st.glow, life: 0.2, delay: Math.abs(i) * 0.015, fall: 1.4 });
      }
      kit.slash({ x: ev.x, z: ev.z, angle: base, radius: 0.9, width: 0.08, span: 1.0, sweep: 0.05, life: 0.2, core: PARCH, glow: st.glow, soft: 0.3, y: 0.55, gain: 1 });
      spray('shard', ev.x, 0.6, ev.z, 8, { color: st.debrisColor, tile: SHARD_TILE.feather, speed: [0.8, 1.8], up: [0.6, 1.4], size: [0.11, 0.17], life: [0.8, 1.3], gravity: 0.9, drag: 1.8, spin: [-4, 4], flutter: 0.5, dir: { x: -dx, z: -dz }, dirBias: 0.5 });
      camfx.kick(-dx, -dz, st.camera.kick, 0.08);
    },
  };
  // Placement beats (ground_aoe) and the class passive pulse.
  const ZONE_SIG = {
    // Archer — iron jaws bloom open in jade, teeth pointing in.
    barbed_trap(st, x, z, r) {
      kit.ring({ x, z, r0: 0.15, r1: r, width: 0.07, life: 0.4, core: PARCH, glow: st.glow, soft: 0.25, y: 0.05 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        kit.streak({ a: { x: x + Math.cos(a) * r, y: 0.12, z: z + Math.sin(a) * r }, b: { x: x + Math.cos(a) * r * 0.55, y: 0.18, z: z + Math.sin(a) * r * 0.55 }, width: 0.05, tailW: 0, core: BONE, glow: st.glow, life: 0.9, fall: 0.6, opacity: 0.85 });
      }
      kit.mark({ x, z, radius: r * 1.3, kind: 'sigil', stain: INK, glow: st.glow, cool: 1.6, life: 3.2, opacity: 0.3 });
    },
  };
  // THE TIDECALLER's own beats (slice 3) live in tidefx.js; it borrows these
  // helpers and rides the per-frame loop below for trails, zones and bubbles.
  const tide = createTideFx({ kit, bus, byId: SF.byId, spray, flare: SF.flare, shock: SF.shock, after, anticipate: SF.anticipate, camfx, N, rnd, mark });
  // THE BELLWRIGHT (docs/BELLWRIGHT.md): her hung bells, the Peal and the
  // Clapper's ring hit live in bellfx.js.
  const bellFx = createBellFx({ kit, bus, byId: SF.byId, spray, flare: SF.flare, shock: SF.shock, after, anticipate: SF.anticipate, camfx, N, rnd, mark, stage });
  // THE DUSKWING (docs/DUSKWING.md): his dive, his bite, the dark of
  // Nightfall and the blind over each enemy live in duskfx.js.
  const duskFx = createDuskFx({ kit, bus, byId: SF.byId, spray, flare: SF.flare, shock: SF.shock, after, camfx, N, rnd, mark, world });
  // TONICS AND BOMBS (docs/CONSUMABLES.md): the carry slot's beats.
  // D3 (VFX_HIT_RULES §6.2 m): an element leaves its air behind. About 100
  // tiny twinkles and a faint mist hold the place 1 to 2 s after the Frost
  // Bomb and the Frozen elite's burst, so the cold stays where it landed.
  function elementAir(x, z, radius, color, core, n = ELEMENT_AIR.twinkles) {
    tk.dust(x, 0.45, z, n, { tex: 'star', color, color2: core, radius, speed: [0, 0.12], up: [0.02, 0.22], size: ELEMENT_AIR.size, life: ELEMENT_AIR.sec, gravity: 0, drag: 1.2, twinkle: 18, stagger: 0.25 });
    spray('smoke', x, 0.3, z, N(ELEMENT_AIR.mist), { color: core, speed: [0.02, 0.1], up: [0, 0.06], size: [radius * 0.7, radius * 1.0], grow: 1.25, life: ELEMENT_AIR.sec, opacity: ELEMENT_AIR.mistOpacity, gravity: 0, drag: 2, jitter: radius * 0.4 });
    mark('element_air');
  }
  // i (C2): the 2% zoom punch of a chest's snap, peaking inside the hold at
  // the top of the hop (S+5 on, easing out by about S+25). snapIn: seconds
  // from now to the snap.
  function chestPunch(snapIn = CHEST_BEAT.snap) {
    after(snapIn + 5 / 30, () => camfx.punch(CAM_PUNCH.chest, 0.6));
  }
  const tonicFx = createTonicFx({ kit, bus, byId: SF.byId, spray, flare: SF.flare, shock: SF.shock, after, anticipate: SF.anticipate, embersUp: SF.embersUp, camfx, N, rnd, mark, world, elementAir });
  // HAZARDS AND SHRINES (docs/SHRINES.md): crystal spurs, shrines, blessings.
  const shrineFx = createShrineFx({ kit, bus, byId: SF.byId, spray, flare: SF.flare, shock: SF.shock, after, anticipate: SF.anticipate, embersUp: SF.embersUp, camfx, N, rnd, mark, world });
  // SECRET ROOMS (docs/SECRET_ROOMS.md): the cracked wall and the chamber.
  createSecretFx({ kit, bus, byId: SF.byId, spray, flare: SF.flare, shock: SF.shock, after, anticipate: SF.anticipate, embersUp: SF.embersUp, camfx, rnd, mark, player, chestPunch });
  // RELICS batch 6 (docs/RELICS.md "Batch 6"): the lantern, the burning,
  // the dive, the crown, the lens, the veil, the heart, and the three
  // curses (the seal, the dark, the crowns).
  const relic6Fx = createRelic6Fx({ kit, bus, byId: SF.byId, spray, flare: SF.flare, shock: SF.shock, after, anticipate: SF.anticipate, embersUp: SF.embersUp, camfx, N, rnd, mark, player, world, stage });
  // THE VFX TEMPLATES (design-VFX.md §11): magic, blade and sci-fi, played
  // over every hero beat above (registered last, so they draw on top).
  bus.on('champion_chest', () => chestPunch(0));
  const tplFx = createTemplateFx({ kit, tk, bus, byId: SF.byId, spray, after, camfx, rnd, mark, player, classOf: SF.classOf, area: (id) => SKILL_AREA.get(id) ?? null, rigPoint: heroRigPoint, rigCenter: heroRigCenter, rigMoving: heroRigMoving });
  // The same templates on the enemies, champions and bosses (foefx.js).
  const foeFx = createFoeFx({ kit, tk, bus, byId: SF.byId, spray, after, camfx, rnd, mark, ink: INK, player });
  // Every projectile in flight, party and foe, in its template (boltfx.js).
  const boltFx = createBoltFx({ kit, tk, bus, byId: SF.byId, after, rnd, mark, world, player, heroTone: tplFx.boltTone });
  bus.on('ally_cast', (ev) => {
    const fn = SKILL_SIG[ev.skill];
    if (!fn || ev.x == null) return;
    mark(`skill:${ev.skill}`);
    fn(vfxClassStyle(ev.classId), ev);
  });
  bus.on('zone_spawn', (ev) => {
    const fn = ev.classId ? ZONE_SIG[ev.skill] : null; // a hero kit's zone
    if (!fn) return;
    mark(`zone:${ev.skill}`);
    const st = vfxClassStyle(ev.classId ?? vfxSkillClass(ev.skill));
    after(ANTICIP, () => fn(st, ev.x, ev.z, ev.radius ?? 0.75));
  });
  bus.on('zone_tick', (ev) => {
    if (ev.skill !== 'barbed_trap') return;
    const zEnt = SF.byId(ev.id);
    if (!zEnt) return;
    const st = vfxClassStyle('archer');
    const { x, z } = zEnt;
    const r = zEnt.radius ?? 0.75;
    // The jaws snap shut: teeth slam to the centre, sparks and a bone flash.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + rnd(-0.1, 0.1);
      kit.streak({ a: { x: x + Math.cos(a) * r, y: 0.2, z: z + Math.sin(a) * r }, b: { x: x + Math.cos(a) * r * 0.7, y: 0.25, z: z + Math.sin(a) * r * 0.7 }, width: 0.06, tailW: 0.06, core: BONE, glow: st.glow, life: 0.12, travel: { x: -Math.cos(a) * r * 6, y: 0, z: -Math.sin(a) * r * 6 }, fall: 1.5 });
    }
    kit.flash({ x, y: 0.3, z, color: BONE, size: 0.55, life: 0.12, delay: 0.08 });
    spray('spark', x, 0.3, z, 7, { color: st.glow, speed: [1.4, 2.6], up: [0.6, 1.4], size: [0.04, 0.08], life: [0.18, 0.3] });
    camfx.kick(rnd(-1, 1), rnd(-1, 1), 0.02, 0.06);
  });
  bus.on('aura_pulse', (ev) => {
    if (ev.skill !== 'crimson_edge') return;
    if ((ev.hit || []).length) mark('skill:crimson_edge');
    const st = vfxClassStyle('swordsman');
    for (const id of ev.hit || []) {
      const e = SF.byId(id);
      if (!e) continue;
      // A single crimson flick with a silver edge, and a drop of light.
      const a = rnd(0, TAU);
      kit.slash({ x: e.x, z: e.z, angle: a, radius: 0.45, width: 0.1, span: 2.0, sweep: 0.04, life: 0.2, core: st.second, glow: st.glow, soft: 0.1, lift: 0.12, y: 0.55, gain: 1.4, tail: 0.8 });
      kit.flash({ x: e.x, y: 0.55, z: e.z, color: st.glow, size: 0.32, life: 0.12 });
      spray('spark', e.x, 0.55, e.z, 3, { color: st.second, speed: [1.2, 2.2], up: [0.3, 0.9], size: [0.03, 0.06], life: [0.14, 0.24] });
    }
  });
  // A Hunter's Mark arrow lands: a jade target rune locks onto the enemy.
  bus.on('hit', (ev) => {
    if (ev.source !== 'hunters_mark') return;
    const st = vfxClassStyle('archer');
    const t = SF.byId(ev.target);
    const x = t?.x ?? ev.x;
    const z = t?.z ?? ev.z;
    if (x == null) return;
    mark('skill:hunters_mark:hit');
    kit.ring({ x, z, r0: 1.0, r1: 0.42, width: 0.06, life: 0.3, core: PARCH, glow: st.glow, soft: 0.2, y: 0.06 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      kit.streak({ a: { x: x + Math.cos(a) * 0.75, y: 0.08, z: z + Math.sin(a) * 0.75 }, b: { x: x + Math.cos(a) * 0.45, y: 0.08, z: z + Math.sin(a) * 0.45 }, width: 0.06, tailW: 0, core: PARCH, glow: st.glow, life: 0.6, fall: 0.6 });
    }
    SF.flare(x, 0.6, z, st.glow, 1.0, { life: 0.2 });
  });
  // The Healer's two: Lantern Ward lights a lantern over each ward; Dawn
  // Brand burns a sun sigil into the floor that flares on every tick.
  bus.on('skill_cast', (ev) => {
    if (ev.skill === 'lantern_ward' && Array.isArray(ev.targets)) {
      const st = vfxClassStyle('healer');
      mark('skill:lantern_ward');
      const p = player();
      if (p) {
        kit.ring({ x: p.x, z: p.z, r0: 0.3, r1: 3.8, width: 0.08, life: 0.5, core: PARCH, glow: st.glow, soft: 0.8, y: 0.05, opacity: 0.6 });
        SF.flare(p.x, 0.9, p.z, st.glow, 1.2, { kind: 'burst', life: 0.28 });
      }
      for (const id of ev.targets) {
        const t = SF.byId(id);
        if (!t) continue;
        if (p) kit.streak({ a: { x: p.x, y: 0.9, z: p.z }, b: { x: t.x, y: 1.0, z: t.z }, width: 0.05, tailW: 0.08, core: PARCH, glow: st.glow, life: 0.26, fall: 1.2 });
        kit.ring({ x: t.x, z: t.z, r0: 0.2, r1: 0.65, width: 0.07, life: 0.55, core: PARCH, glow: st.glow, soft: 0.6, y: 1.25, delay: 0.1 });
        kit.flash({ x: t.x, y: 1.25, z: t.z, color: st.glow, size: 0.5, life: 0.3, delay: 0.1 });
        SF.embersUp(t.x, t.z, st.glow, 5, { radius: 0.3, life: [0.8, 1.3] });
      }
    }
  });
  const dawnZones = new Set();
  bus.on('zone_spawn', (ev) => {
    if (ev.skill !== 'dawn_brand') return;
    dawnZones.add(ev.id);
    mark('zone:dawn_brand');
    const st = vfxClassStyle('healer');
    const { x, z } = ev;
    const r = ev.radius ?? 1.2;
    SF.anticipate(x, z, r * 0.8, st.glow, { y: 0.15, lines: 8 });
    after(ANTICIP, () => {
      kit.ring({ x, z, r0: 0.2, r1: r, width: 0.1, life: 0.5, core: PARCH, glow: st.glow, soft: 0.4, y: 0.05 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        kit.streak({ a: { x: x + Math.cos(a) * r * 0.25, y: 0.06, z: z + Math.sin(a) * r * 0.25 }, b: { x: x + Math.cos(a) * r * 0.95, y: 0.06, z: z + Math.sin(a) * r * 0.95 }, width: 0.07, tailW: 0, core: PARCH, glow: st.glow, life: 0.8, fall: 0.6, opacity: 0.8 });
      }
      kit.mark({ x, z, radius: r * 1.4, kind: 'sigil', stain: INK, glow: st.glow, cool: 2.4, life: 4.4, opacity: 0.35 });
      SF.flare(x, 0.4, z, st.glow, 1.3, { kind: 'burst', life: 0.26 });
      kit.light({ x, z, radius: r * 1.6, color: st.glow, opacity: 0.45, life: 0.6 });
    });
  });
  bus.on('zone_tick', (ev) => {
    if (ev.skill !== 'dawn_brand' || !dawnZones.has(ev.id)) return;
    const zEnt = SF.byId(ev.id);
    if (!zEnt) return;
    const st = vfxClassStyle('healer');
    const r = zEnt.radius ?? 1.2;
    kit.ring({ x: zEnt.x, z: zEnt.z, r0: r * 0.3, r1: r, width: 0.06, life: 0.35, core: PARCH, glow: st.glow, soft: 0.4, y: 0.06 });
    SF.embersUp(zEnt.x, zEnt.z, st.glow, 6, { radius: r * 0.7, life: [0.6, 1.0] });
    kit.light({ x: zEnt.x, z: zEnt.z, radius: r * 1.3, color: st.glow, opacity: 0.3, life: 0.35 });
  });
  bus.on('zone_expire', (ev) => dawnZones.delete(ev.id));

  // ------------------------------------------------------------ hits --
  const lastClassHit = new Map(); // victim id -> class id of the last party hit
  // victim id -> { tick, x, z }: the direction it was last hit (unit), read by
  // its death on the same tick (the kill burst's lean; `death` carries none).
  const lastHitDir = new Map();
  bus.on('hit', (ev) => {
    const atk = SF.byId(ev.attacker);
    {
      let dx = ev.dirX || 0;
      let dz = ev.dirZ || 0;
      if (Math.hypot(dx, dz) < 1e-4 && atk && ev.x != null) {
        dx = ev.x - atk.x;
        dz = ev.z - atk.z;
      }
      const l = Math.hypot(dx, dz);
      if (l > 1e-4) {
        if (lastHitDir.size > 256) lastHitDir.clear();
        lastHitDir.set(ev.target, { tick: ev.tick, x: dx / l, z: dz / l });
      } else lastHitDir.delete(ev.target);
    }
    const victimParty = ev.kind === 'player' || ev.kind === 'ally' || atk?.faction === 'hostile';
    if (victimParty) {
      if (!atk) {
        SF.enemyImpact(vfxEnemyStyle(null), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0);
        return;
      }
      if (atk.kind === 'stag') SF.enemyImpact(vfxEnemyStyle('stag', 'brute'), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { boss: true });
      else if (BOSS_HIT[atk.kind]) SF.enemyImpact(BOSS_HIT[atk.kind], ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { boss: true, bossKind: atk.kind });
      else SF.enemyImpact(vfxEnemyStyle(atk.kind), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0);
      return;
    }
    const cls = SF.classOf(atk) ?? vfxSkillClass(ev.source) ?? 'healer';
    lastClassHit.set(ev.target, cls);
    // k: a combo finisher's contact plays the local anime frame (one a cast).
    if (FINISHERS.has(ev.source) && animeTick.get(ev.attacker) !== ev.tick && sv.intensity.camera > 0) {
      animeTick.set(ev.attacker, ev.tick);
      animeFx.play(ev.x, ev.z);
    }
    SF.classImpact(vfxClassStyle(cls), ev.x, ev.z, ev.dirX || 0, ev.dirZ || 0, { crit: !!ev.crit, big: ev.delivery !== 'basic' });
    if (ev.crit) flipbook.play(ev.x, 0.8, ev.z, CRIT_BOOK, ev.kind === 'boss' || ev.kind === 'stag' ? 1.4 : 1);
    spatter(ev, atk);
  });

  // D2 (VFX_HIT_RULES §6.2 m): a hit leaves a mess, in the body's own matter
  // colour (never red: Ember and the crimsons are taken). A splash on the
  // floor behind the body 2 frames on, then droplets back toward the hitter
  // from +3 frames, landing short of the body on its side. The splash stays
  // a few seconds; one per body every SPATTER.every s keeps the marks pool
  // for the skills.
  const SPATTER = Object.freeze({ drops: [8, 14], splash: 0.34, life: 3.5, every: 0.45, behind: 0.35 });
  const spatterAt = new Map(); // body id -> the time of its last splash
  const SPATTER_SOFT = new Set(['aura', 'burn', 'molten', 'thorns', 'kindle', 'sear', 'hazard']); // ticks, not blows
  sv.fxClock = 0; // s since boot (update)
  function spatter(ev, atk) {
    if (SPATTER_SOFT.has(ev.shape) || !(ev.amount > 0)) return;
    let dx = ev.dirX || 0;
    let dz = ev.dirZ || 0;
    if (Math.hypot(dx, dz) < 1e-4 && atk) {
      dx = ev.x - atk.x;
      dz = ev.z - atk.z;
    }
    const l = Math.hypot(dx, dz);
    if (l < 1e-4) return;
    dx /= l;
    dz /= l;
    const matter = vfxMatterColor(vfxEnemyStyle(ev.kind).matter);
    const now = sv.fxClock;
    if (now - (spatterAt.get(ev.target) ?? -9) >= SPATTER.every) {
      spatterAt.set(ev.target, now);
      if (spatterAt.size > 128) spatterAt.clear();
      kit.mark({ x: ev.x + dx * SPATTER.behind, z: ev.z + dz * SPATTER.behind, radius: SPATTER.splash, kind: 'splash', angle: Math.atan2(dz, dx), stretch: 1.3, stain: matter, glow: null, life: SPATTER.life, opacity: 0.45, delay: 2 / 60 });
    }
    const x = ev.x;
    const z = ev.z;
    const n = Math.round(rnd(...SPATTER.drops));
    after(3 / 60, () => spray('shard', x, 0.5, z, n, { color: matter, tile: SHARD_TILE.drop, dir: { x: -dx, z: -dz }, dirBias: 0.85, speed: [1.6, 2.6], up: [0.6, 1.2], size: [0.04, 0.07], life: [0.35, 0.55], gravity: 7 }));
  }
  bus.on('death', (ev) => {
    if (ev.kind === 'player' || ev.kind === 'ally') return;
    // k and o: an elite, champion or boss kill plays the local anime frame
    // and punches the camera in up to 6% (C2), sprung back in 4 frames.
    const dead = SF.byId(ev.id);
    if (dead && (dead.elite || dead.champion || ev.kind === 'stag' || isVfxBoss(ev.kind)) && sv.intensity.camera > 0) {
      animeFx.play(ev.x, ev.z);
      camfx.punch(CAM_PUNCH.bigKill, CAM_PUNCH.sec);
    }
    const killer = lastClassHit.get(ev.id) ?? null;
    lastClassHit.delete(ev.id);
    const lh = lastHitDir.get(ev.id);
    lastHitDir.delete(ev.id);
    const dir = lh && lh.tick === ev.tick ? { x: lh.x, z: lh.z } : null;
    if (ev.kind === 'stag') SF.bossDeath(ev.x, ev.z);
    else if (isVfxBoss(ev.kind)) SF.KIT_BOSS_DEATH[ev.kind](ev.x, ev.z);
    else SF.enemyDeath(ev.kind, ev.x, ev.z, killer, dir);
  });

  return { placeZone, placeZoneLand, AMBER, lineAt, SKILL_SIG, ZONE_SIG, tide, bellFx, duskFx, elementAir, chestPunch, tonicFx, shrineFx, relic6Fx, tplFx, foeFx, boltFx, dawnZones, lastClassHit, lastHitDir, SPATTER, spatterAt, SPATTER_SOFT, spatter };
}
