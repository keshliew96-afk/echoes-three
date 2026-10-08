// HIT FEEDBACK (docs/HIT_FEEDBACK.md) — the player knows when they are hit.
//
// Render, HUD and audio only: it listens to the sim's `hit` / `downed`
// events and reads entities, and never writes sim state, so the goldens
// cannot move. Settings ▸ Gameplay ▸ Hit feedback (on by default) turns all
// of it off at once.
//
// What a hit on the character YOU play does (the viewer's seat):
//   vignette   a crimson pulse at the screen edge, scaled by how much of the
//              health bar the hit took; heavier on the side the blow came
//              from (a soft edge blob slid onto the window edge toward the
//              attacker)
//   arc        a short crimson arc around your character on screen, pointing
//              at the attacker (fades in 0.6 s)
//   kick       heavy hits and the hit that downs you push the camera along
//              the blow (the VFX camera kick: Screen shake and Effects scale it)
//   sound      a heavier thud for heavy hits and a distinct fall for the hit
//              that downs you (src/audio/hitcues.js)
// Every party member (yours, the AI's, a co-op partner's) flashes crimson on
// its rig when struck, so you also see an ally being hit.
//
// Tiers (hitTier): `soft` is damage over time and the floor (hazards, Molten
// burn, Thorned recoil): a low, slow vignette that merges instead of
// re-triggering, no arc, no kick, a faint rig flash at most every 0.35 s.
// `heavy` is a hit that takes HEAVY_FRAC of the health bar or more; `down`
// is the hit that leaves the body at 0.
//
// COST. Two full-window layers that only ever change opacity and transform
// (compositor work, no repaint), four pooled arcs, and the critters' own
// emissive uniforms. Nothing is allocated per frame.
import { Vector3 } from 'three';
import { viewerSeat } from '../../app/viewerseat.js';

export const HIT_FEEDBACK_KEY = 'gameplay.hitFeedback';
export const HEAVY_FRAC = 0.15; // of max HP
const BOSS_HEAVY_FRAC = 0.1; // a boss blow reads heavy a little sooner
// Pain crimson: deeper and bluer than Ember Danger (the telegraph orange), so
// "you were hit" never reads as "something is about to hit you".
const HURT_RGB = '194, 22, 40';
const FLASH_HEX = 0xff4a4a;
const SOFT_SHAPES = new Set(['molten', 'hazard', 'thorns']);
const BOSS_KINDS = new Set(['stag', 'thornmother', 'heron', 'millwheel', 'wyrm', 'lichram', 'cantor', 'colossus']);

// Vignette peak per tier, before the share-of-bar scaling.
const PEAK = { soft: 0.22, light: 0.42, heavy: 0.78, down: 0.95 };
const ARC_LIFE = 0.6; // s
const FLASH = { soft: [0.28, 0.12], light: [0.62, 0.16], heavy: [0.82, 0.22], down: [0.9, 0.3] }; // [strength, s]
const KICK = { heavy: [0.045, 0.16], down: [0.065, 0.22] }; // [u, s]
const SOFT_FLASH_GAP = 0.35; // s between soft flashes on one body

const isBossKind = (e) => !!e && (e.boss === true || BOSS_KINDS.has(e.kind));

// The tier of one `hit` event on a party body, or null when nothing should
// show (an enemy was hit, the shield took it all). `target` is the struck
// entity after the hit (hp already reduced), `attacker` its attacker or null.
export function hitTier(ev, target, attacker = null) {
  if (!ev || (ev.kind !== 'player' && ev.kind !== 'ally')) return null;
  const amount = Number(ev.amount) || 0;
  if (!(amount > 0)) return null;
  if (target && target.hp <= 0) return 'down';
  if (ev.delivery === 'hazard' || SOFT_SHAPES.has(ev.shape) || ev.source === 'molten') return 'soft';
  const max = target && target.maxHp > 0 ? target.maxHp : 100;
  const frac = amount / max;
  if (frac >= HEAVY_FRAC || (isBossKind(attacker) && frac >= BOSS_HEAVY_FRAC)) return 'heavy';
  return 'light';
}

// Is this hit on the character the local player controls?
export function isOwnBody(target, seat = viewerSeat()) {
  return !!target && target.partyIndex === seat;
}

const CSS = `
#hit-fx { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 9; }
#hit-fx .hf-vig {
  position: absolute; inset: 0; opacity: 0; will-change: opacity;
  background: radial-gradient(ellipse 62% 60% at 50% 50%, rgba(${HURT_RGB}, 0) 48%, rgba(${HURT_RGB}, 0.42) 72%, rgba(${HURT_RGB}, 0.92) 100%);
}
#hit-fx .hf-side {
  position: absolute; left: 0; top: 0; width: 64vmax; height: 30vmax; margin: -15vmax 0 0 -32vmax;
  opacity: 0; will-change: transform, opacity;
  background: radial-gradient(closest-side, rgba(${HURT_RGB}, 0.9), rgba(${HURT_RGB}, 0.45) 45%, rgba(${HURT_RGB}, 0) 100%);
}
#hit-fx .hf-arc {
  position: absolute; left: 0; top: 0; width: 132px; height: 132px; margin: -66px 0 0 -66px;
  opacity: 0; will-change: transform, opacity; overflow: visible;
}
#hit-fx .hf-arc path { fill: none; stroke-linecap: round; }
`;

function makeArc() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'hf-arc');
  svg.setAttribute('viewBox', '-66 -66 132 132');
  // A 70-degree arc on the right (+x) side, rotated toward the attacker: a
  // dark under-stroke so it reads on bright floors, the crimson body, and a
  // hot inner core.
  const d = 'M 47.5 -33.3 A 58 58 0 0 1 47.5 33.3';
  const ink = document.createElementNS(NS, 'path');
  ink.setAttribute('d', d);
  ink.setAttribute('stroke', 'rgba(34,31,27,0.75)');
  ink.setAttribute('stroke-width', '11');
  const body = document.createElementNS(NS, 'path');
  body.setAttribute('d', d);
  body.setAttribute('stroke', `rgb(${HURT_RGB})`);
  body.setAttribute('stroke-width', '7');
  const core = document.createElementNS(NS, 'path');
  core.setAttribute('d', 'M 52.4 -20.3 A 56 56 0 0 1 52.4 20.3');
  core.setAttribute('stroke', '#FFB3A8');
  core.setAttribute('stroke-width', '2.5');
  svg.append(ink, body, core);
  return { el: svg, age: Infinity, ang: 0, peak: 0, w: 1, targetId: null };
}

export function createHitFeedback({ stage, world, bus, settings = null, scene = null, camfx = null, audio = () => null }) {
  let on = true;
  const readSetting = () => {
    const v = settings?.get?.(HIT_FEEDBACK_KEY);
    on = v !== false;
    if (!on) clear();
  };

  const style = document.createElement('style');
  style.id = 'hit-fx-style';
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'hit-fx';
  const vig = document.createElement('div');
  vig.className = 'hf-vig';
  const side = document.createElement('div');
  side.className = 'hf-side';
  root.append(vig, side);
  const arcs = [];
  for (let i = 0; i < 4; i++) {
    const a = makeArc();
    arcs.push(a);
    root.appendChild(a.el);
  }
  document.body.appendChild(root);

  // Vignette state: `level` follows `target` (fast attack, slow release);
  // the directional blob follows its own level at the last blow's angle.
  let level = 0;
  let pulse = 0; // impulse added by the last hit, decays
  let soft = 0; // sustained damage-over-time level
  let sideLevel = 0;
  let sideAng = 0;
  let shownVig = -1;
  let shownSide = -1;
  let last = 0;
  let lastNow = 0;
  const counts = { light: 0, heavy: 0, soft: 0, down: 0, flashes: 0, kicks: 0, arcs: 0, allyHits: 0, ignored: 0 };

  // ---- rigs: the arena's party critters, by body ------------------------
  const flashes = new Map(); // critter -> { k, life, t, peak }
  const softAt = new Map(); // body id -> last soft flash (s)
  function critterFor(ent) {
    if (!ent || !scene) return null;
    if (ent.kind === 'player') return scene.healer ?? null;
    const list = scene.allies;
    if (!Array.isArray(list)) return null;
    for (const c of list) if (c.classId === ent.classId) return c;
    return null;
  }
  function flashRig(ent, tier) {
    const c = critterFor(ent);
    if (!c || typeof c.hitFlash !== 'function') return;
    const [k, life] = FLASH[tier];
    if (tier === 'soft') {
      const prev = softAt.get(ent.id) ?? -1e9;
      if (lastNow - prev < SOFT_FLASH_GAP) return;
      softAt.set(ent.id, lastNow);
    }
    const cur = flashes.get(c);
    if (cur && cur.t < cur.life && cur.peak > k) return; // a bigger flash is still playing
    flashes.set(c, { t: 0, life, peak: k });
    counts.flashes += 1;
  }

  // ---- screen helpers --------------------------------------------------
  const v = new Vector3();
  function toScreen(x, z, y = 0.6) {
    v.set(x, y, z).project(stage.camera);
    return { sx: (v.x * 0.5 + 0.5) * window.innerWidth, sy: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }

  const byId = (id) => {
    if (id == null) return null;
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };

  // No feedback outside a room: the camp, the menus and the between-room
  // pages show nothing (a stray hit there is not the player's business).
  function live() {
    if (!on) return false;
    if (scene && typeof scene.isCamp === 'function' && scene.isCamp()) return false;
    const rs = world.runSystem?.();
    if (rs && typeof rs.isActive === 'function' && !rs.isActive()) return false;
    return true;
  }

  // Screen angle (radians, 0 = right, y down) from the body to its attacker.
  function blowAngle(target, ev, atk) {
    const me = toScreen(target.x, target.z);
    let ax, az;
    if (atk && Number.isFinite(atk.x)) {
      ax = atk.x;
      az = atk.z;
    } else {
      // No attacker body (a bolt, a hazard): the blow travelled along
      // (dirX, dirZ), so it came from behind that direction.
      const dx = ev.dirX || 0;
      const dz = ev.dirZ || 0;
      if (Math.hypot(dx, dz) < 1e-5) return null;
      ax = target.x - dx * 1.5;
      az = target.z - dz * 1.5;
    }
    const them = toScreen(ax, az);
    const sx = them.sx - me.sx;
    const sy = them.sy - me.sy;
    if (Math.hypot(sx, sy) < 2) return null;
    return Math.atan2(sy, sx);
  }

  function fire(tier, { ang = null, share = 0, target = null, dirX = 0, dirZ = 0 } = {}) {
    counts[tier] += 1;
    // Share of the bar this hit took scales the pulse: a scratch is a hint,
    // a third of the bar is a slam.
    const scale = tier === 'soft' ? 1 : Math.min(1, 0.55 + share * 2.2);
    const peak = PEAK[tier] * scale;
    if (tier === 'soft') soft = Math.min(PEAK.soft, soft + 0.09);
    else pulse = Math.max(pulse, peak);
    if (ang !== null && tier !== 'soft') {
      sideAng = ang;
      sideLevel = Math.max(sideLevel, Math.min(1, peak + 0.15));
      // The arc: reuse the oldest.
      let a = arcs[0];
      for (const x of arcs) if (x.age > a.age) a = x;
      a.age = 0;
      a.ang = ang;
      a.peak = tier === 'light' ? 0.8 : 1;
      a.w = tier === 'light' ? 0.85 : 1.15;
      a.targetId = target ? target.id : null;
      counts.arcs += 1;
    }
    if ((tier === 'heavy' || tier === 'down') && camfx && Math.hypot(dirX, dirZ) > 1e-5) {
      const [amp, dur] = KICK[tier];
      camfx.kick(dirX, dirZ, amp, dur);
      counts.kicks += 1;
    }
  }

  bus.on('hit', (ev) => {
    if (!ev || (ev.kind !== 'player' && ev.kind !== 'ally')) return;
    if (!live()) {
      counts.ignored += 1;
      return;
    }
    const target = byId(ev.target);
    const atk = byId(ev.attacker);
    const tier = hitTier(ev, target, atk);
    if (!tier) return;
    flashRig(target, tier);
    if (!isOwnBody(target)) {
      counts.allyHits += 1; // an ally's hit: its rig flashes, your screen stays clear
      return;
    }
    const max = target && target.maxHp > 0 ? target.maxHp : 100;
    fire(tier, {
      ang: target ? blowAngle(target, ev, atk) : null,
      share: (Number(ev.amount) || 0) / max,
      target,
      dirX: ev.dirX || 0,
      dirZ: ev.dirZ || 0,
    });
  });

  function clear() {
    level = pulse = soft = sideLevel = 0;
    for (const a of arcs) {
      a.age = Infinity;
      a.el.style.opacity = '0';
    }
    for (const c of flashes.keys()) c.hitFlash?.(0);
    flashes.clear();
    vig.style.opacity = '0';
    side.style.opacity = '0';
    shownVig = shownSide = 0;
  }
  for (const evName of ['run_end', 'return_to_camp', 'room_enter', 'run_start']) bus.on(evName, clear);

  readSetting();
  settings?.subscribe?.(HIT_FEEDBACK_KEY, readSetting);

  function update(nowSec) {
    const dt = last === 0 ? 1 / 60 : Math.min(0.1, Math.max(0, nowSec - last));
    last = nowSec;
    lastNow = nowSec;

    // Rig flashes: a sharp attack then an ease-out, per critter.
    for (const [c, f] of flashes) {
      f.t += dt;
      const u = f.t / f.life;
      if (u >= 1) {
        c.hitFlash(0);
        flashes.delete(c);
        continue;
      }
      const k = u < 0.12 ? u / 0.12 : Math.pow(1 - (u - 0.12) / 0.88, 2);
      c.hitFlash(k * f.peak, FLASH_HEX);
    }

    if (!on) return;
    // Vignette: the impulse decays in ~0.45 s, the soft level in ~0.9 s.
    pulse *= Math.exp(-dt / 0.16);
    soft *= Math.exp(-dt / 0.45);
    sideLevel *= Math.exp(-dt / 0.2);
    const want = Math.min(1, pulse + soft);
    // Attack quickly (two frames), release on the decays above.
    level = want > level ? level + (want - level) * Math.min(1, dt / 0.03) : want;
    const q = Math.round(level * 100) / 100;
    if (q !== shownVig) {
      shownVig = q;
      vig.style.opacity = String(q);
    }

    // The directional blob sits on the window edge where a ray from the
    // centre at sideAng leaves the screen, long side along that edge.
    const qs = Math.round(sideLevel * 100) / 100;
    if (qs > 0 || shownSide !== 0) {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cx = Math.cos(sideAng);
      const cy = Math.sin(sideAng);
      const tx = Math.abs(cx) > 1e-4 ? W / 2 / Math.abs(cx) : Infinity;
      const ty = Math.abs(cy) > 1e-4 ? H / 2 / Math.abs(cy) : Infinity;
      const t = Math.min(tx, ty);
      const ex = W / 2 + cx * t;
      const ey = H / 2 + cy * t;
      const rot = tx < ty ? 90 : 0; // a left/right edge stands the blob upright
      side.style.transform = `translate(${ex.toFixed(1)}px, ${ey.toFixed(1)}px) rotate(${rot}deg)`;
      side.style.opacity = String(qs);
      shownSide = qs;
    }

    // Arcs ride your character (the body moves; the arc stays on it).
    for (const a of arcs) {
      if (a.age === Infinity) continue;
      a.age += dt;
      if (a.age >= ARC_LIFE) {
        a.age = Infinity;
        a.el.style.opacity = '0';
        continue;
      }
      const u = a.age / ARC_LIFE;
      const op = (u < 0.08 ? u / 0.08 : 1 - Math.pow((u - 0.08) / 0.92, 1.6)) * a.peak;
      const grow = 0.86 + 0.14 * Math.min(1, u * 5); // a small outward pop
      const tg = a.targetId != null ? byId(a.targetId) : null;
      const p = tg ? toScreen(tg.x, tg.z, 0.45) : { sx: window.innerWidth / 2, sy: window.innerHeight / 2 };
      a.el.style.transform = `translate(${p.sx.toFixed(1)}px, ${p.sy.toFixed(1)}px) rotate(${((a.ang * 180) / Math.PI).toFixed(1)}deg) scale(${(grow * a.w).toFixed(3)})`;
      a.el.style.opacity = op.toFixed(2);
    }
  }
  // ---- lab / probe preview ---------------------------------------------
  // preview('light' | 'heavy' | 'soft' | 'down'): plays a hit on your own
  // character from the upper left, exactly as a live one plays (visuals,
  // rig flash, kick, sound), without touching the sim.
  function preview(tier = 'light') {
    if (!PEAK[tier]) return false;
    const seat = viewerSeat();
    const target = world.entities().find((e) => e.partyIndex === seat && (e.kind === 'player' || e.kind === 'ally')) ?? world.player ?? null;
    if (!on) return false;
    const dirX = 0.7;
    const dirZ = 0.7;
    const ang = target ? blowAngle(target, { dirX, dirZ }, null) : -2.4;
    fire(tier, { ang, share: tier === 'heavy' ? 0.22 : tier === 'down' ? 0.3 : 0.06, target, dirX, dirZ });
    if (target) flashRig(target, tier);
    const eng = audio();
    const cue = HIT_CUE[tier];
    if (eng && typeof eng.play === 'function' && cue) for (const c of cue) eng.play(c);
    return true;
  }

  const debug = () => ({
    on,
    ...counts,
    vignette: shownVig < 0 ? 0 : shownVig,
    side: shownSide < 0 ? 0 : shownSide,
    arcsLive: arcs.filter((a) => a.age !== Infinity).length,
    flashing: flashes.size,
  });

  return { update, clear, preview, debug, el: root };
}

// The cue each tier plays on your own character (src/audio/hitcues.js).
export const HIT_CUE = Object.freeze({
  soft: ['hurt_soft'],
  light: ['hurt'],
  heavy: ['hurt_heavy'],
  down: ['hurt_heavy', 'hurt_down'],
});
