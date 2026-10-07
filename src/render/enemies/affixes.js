// ELITE AFFIXES render (docs/ELITE_AFFIXES.md): what lives ON an affixed
// elite while it stands —
//   - a NAME PLATE over its crown: one chip per power in the power's colour
//     (DOM, translated with t(); the ward chip lights while the ward holds)
//   - a ground aura: a soft lit disc and one turning rune ring per power
//   - each power's own dressing: Molten embers and a lava glow, Frozen ice
//     shards circling (they pull in while the nova charges), a Vampiric
//     heartbeat, the Warded rune shell (flickers, then holds), Blinking
//     cobalt motes, the Splitting seam, Hasted chevrons and spark wake,
//     Thorned thorns (they flare when they sting)
//   - the Blinking destination's Ember ring, the Molten core on the ground,
//     and the swell of a Molten / Frozen burst under its Ember ring
// The one-shot beats (reveal, bursts, blink, split, leech, thorns) are the
// VFX director's (render/vfx/signature.js). Render-only: reads sim entities
// and bus events, never mutates sim state.
import {
  AdditiveBlending,
  ConeGeometry,
  CircleGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  RingGeometry,
  Vector3,
} from 'three';
import { AFFIX_COLORS, PALETTE } from '../../data/palette.js';
import { AFFIXES } from '../../sim/affixes.js';
import { sharedGeo } from '../geocache.js';
import { getRadialTexture, makeGlowSprite } from '../glow.js';
import { impactFx } from '../vfx/hub.js';
import { CROWN_Y } from './archetypes.js';
import { t } from '../../i18n/index.js';

const TAU = Math.PI * 2;
const PLATE_CSS_ID = 'ea-plate-css';

function addMat(color, opacity = 0.8) {
  return new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: AdditiveBlending, side: DoubleSide });
}

function ensureCss() {
  if (document.getElementById(PLATE_CSS_ID)) return;
  const st = document.createElement('style');
  st.id = PLATE_CSS_ID;
  st.textContent = `
.ea-plate{position:fixed;left:0;top:0;pointer-events:none;z-index:40;display:flex;gap:4px;transform:translate(-50%,-100%);opacity:0;transition:opacity .25s;will-change:transform,opacity;white-space:nowrap}
.ea-chip{font:800 11px/1 system-ui,"Segoe UI",var(--i18n-font,sans-serif);letter-spacing:.07em;text-transform:uppercase;color:${PALETTE.parchment};padding:3px 6px 3px 5px;border-radius:3px;background:rgba(20,18,16,.82);border:1px solid var(--c);box-shadow:0 0 6px -1px var(--c),inset 0 0 0 1px rgba(0,0,0,.4);text-shadow:0 1px 0 ${PALETTE.voidCharcoal}}
.ea-chip::before{content:'';display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:var(--c);box-shadow:0 0 5px var(--c);vertical-align:1px}
.ea-chip.ea-hot{background:var(--c);color:${PALETTE.voidCharcoal};text-shadow:none}
`;
  document.head.appendChild(st);
}

export function createAffixLayer({ root, stage, world, bus, shapes }) {
  const recs = new Map(); // elite id -> record
  const cores = new Map(); // affix_core id -> { g, glow, orb }
  const swells = new Map(); // affix eglob id -> { g, glow, shards }
  const marks = new Map(); // elite id -> { shape, glow } (blink destination)
  const thornFlash = new Map(); // elite id -> seconds left
  const counters = { plates: 0, reveals: 0 };
  let emberClock = 0;

  bus.on('affix_thorns', (ev) => thornFlash.set(ev.id, 0.22));

  const pv = new Vector3();
  function toScreen(x, y, z) {
    pv.set(x, y, z).project(stage.camera);
    return { x: (pv.x + 1) * 0.5 * window.innerWidth, y: (1 - pv.y) * 0.5 * window.innerHeight, vis: pv.z < 1 && pv.z > -1 };
  }

  function makePlate(list) {
    ensureCss();
    const el = document.createElement('div');
    el.className = 'ea-plate';
    el.dataset.affixes = list.join(',');
    for (const id of list) {
      const chip = document.createElement('span');
      chip.className = 'ea-chip';
      chip.dataset.affix = id;
      chip.style.setProperty('--c', AFFIX_COLORS[id] ?? PALETTE.bone);
      chip.textContent = t(AFFIXES[id]?.name ?? id);
      el.appendChild(chip);
    }
    document.body.appendChild(el);
    counters.plates += 1;
    return el;
  }

  // ------------------------------------------------------------ builders --
  function build(e) {
    const list = e.affixes;
    const g = new Group();
    g.name = 'affix-aura';
    const R = (e.radius ?? 0.4) + 0.3;
    const parts = {};
    // Lit floor: a soft disc in the first power's colour.
    const floor = new Mesh(sharedGeo('ea-floor', () => new CircleGeometry(1, 32)), addMat(AFFIX_COLORS[list[0]], 0.32));
    floor.material.map = getRadialTexture();
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.02;
    floor.scale.setScalar(R * 2.2);
    floor.renderOrder = -2;
    g.add(floor);
    parts.floor = floor;
    // One turning rune ring per power.
    parts.rings = list.map((id, i) => {
      const rr = R + i * 0.16;
      const m = new Mesh(sharedGeo(`ea-ring:${rr.toFixed(2)}`, () => new RingGeometry(rr - 0.035, rr, 48, 1, 0, TAU * 0.86)), addMat(AFFIX_COLORS[id], 0.85));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.04 + i * 0.01;
      g.add(m);
      return m;
    });
    const H = (CROWN_Y[e.kind] ?? 1.0) * (e.scale ?? 1.2);
    for (const id of list) {
      const c = AFFIX_COLORS[id];
      if (id === 'molten') {
        const glow = makeGlowSprite({ color: c, size: R * 2.4, opacity: 0.5 });
        glow.position.y = 0.35;
        g.add(glow);
        const orbs = [0, 1, 2].map(() => {
          const s = makeGlowSprite({ color: c, size: 0.22, opacity: 0.95 });
          g.add(s);
          return s;
        });
        parts.molten = { glow, orbs };
      } else if (id === 'frozen') {
        const shards = [];
        for (let i = 0; i < 6; i++) {
          const m = new Mesh(sharedGeo('ea-shard', () => new OctahedronGeometry(0.09, 0)), new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, toneMapped: false }));
          m.scale.set(0.7, 1.9, 0.7);
          g.add(m);
          shards.push(m);
        }
        const glow = makeGlowSprite({ color: c, size: 0.6, opacity: 0 });
        glow.position.y = H * 0.55;
        g.add(glow);
        parts.frozen = { shards, glow, R: R + 0.15, H };
      } else if (id === 'vampiric') {
        const glow = makeGlowSprite({ color: c, size: 0.9, opacity: 0.5 });
        glow.position.y = H * 0.55;
        g.add(glow);
        parts.vampiric = { glow, mote: 0 };
      } else if (id === 'warded') {
        const r = R + 0.1;
        const wire = new Mesh(sharedGeo('ea-shell-wire', () => new IcosahedronGeometry(1, 1)), new MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: AdditiveBlending }));
        const skin = new Mesh(sharedGeo('ea-shell-skin', () => new IcosahedronGeometry(1, 2)), addMat(c, 0));
        for (const m of [wire, skin]) {
          m.scale.set(r, Math.max(r, H * 0.62), r);
          m.position.y = H * 0.45;
          m.visible = false;
          g.add(m);
        }
        parts.warded = { wire, skin };
      } else if (id === 'blinking') {
        const motes = [0, 1].map(() => {
          const s = makeGlowSprite({ color: c, size: 0.26, opacity: 0.95 });
          g.add(s);
          return s;
        });
        parts.blinking = { motes, H };
      } else if (id === 'splitting') {
        const halves = [0, 1].map((k) => {
          const m = new Mesh(sharedGeo(`ea-half:${R.toFixed(2)}`, () => new RingGeometry(R * 0.55, R * 0.62, 24, 1, 0.15, Math.PI - 0.3)), addMat(c, 0.8));
          m.rotation.x = -Math.PI / 2;
          m.rotation.z = k * Math.PI;
          m.position.y = 0.05;
          g.add(m);
          return m;
        });
        parts.splitting = { halves };
      } else if (id === 'hasted') {
        const chev = [0, 1, 2].map(() => {
          const m = new Mesh(sharedGeo('ea-chevron', () => new ConeGeometry(0.16, 0.22, 3)), addMat(c, 0.7));
          m.rotation.x = -Math.PI / 2;
          g.add(m);
          return m;
        });
        parts.hasted = { chev, R, spark: 0 };
      } else if (id === 'thorned') {
        const thorns = [];
        for (let i = 0; i < 9; i++) {
          const m = new Mesh(sharedGeo('ea-thorn', () => new ConeGeometry(0.045, 0.3, 5)), new MeshBasicMaterial({ color: PALETTE.bone, toneMapped: false }));
          const a = (i / 9) * TAU;
          m.position.set(Math.cos(a) * (R - 0.08), 0.3 + (i % 3) * 0.12, Math.sin(a) * (R - 0.08));
          m.rotation.set(0, -a, -Math.PI / 2 + 0.35);
          g.add(m);
          thorns.push(m);
        }
        const tint = makeGlowSprite({ color: c, size: R * 2, opacity: 0.25 });
        tint.position.y = 0.4;
        g.add(tint);
        parts.thorned = { thorns, tint };
      }
    }
    root.add(g);
    counters.reveals += 1;
    return { g, parts, plate: makePlate(list), H, list: [...list], R };
  }

  function dispose(rec) {
    root.remove(rec.g);
    rec.g.traverse((o) => {
      if (o.material && o.material.dispose) o.material.dispose();
    });
    if (rec.plate) rec.plate.remove();
  }

  // ------------------------------------------------------------- update --
  function update(tSec, dt, alpha, rigs, liveTelegraphs) {
    const tick = world.tick;
    const seen = new Set();
    const seenCores = new Set();
    const seenSwells = new Set();
    const seenMarks = new Set();
    emberClock += dt;
    const emberBeat = emberClock >= 0.16;
    if (emberBeat) emberClock = 0;
    for (const e of world.entities()) {
      if (e.kind === 'affix_core') {
        seenCores.add(e.id);
        let c = cores.get(e.id);
        if (!c) {
          const g = new Group();
          const glow = makeGlowSprite({ color: AFFIX_COLORS.molten, size: 1.2, opacity: 0.8 });
          glow.position.y = 0.25;
          const orb = new Mesh(sharedGeo('ea-core', () => new IcosahedronGeometry(0.16, 1)), new MeshBasicMaterial({ color: '#FFD08A', toneMapped: false }));
          orb.position.y = 0.2;
          g.add(glow, orb);
          g.position.set(e.x, 0, e.z);
          root.add(g);
          c = { g, glow, orb };
          cores.set(e.id, c);
        }
        const k = 0.5 + 0.5 * Math.sin(tSec * 14);
        c.glow.scale.setScalar(1.0 + 0.35 * k);
        c.orb.scale.setScalar(1 + 0.2 * k);
        if (emberBeat) impactFx.embers(e.x, e.z, { n: 1, radius: 0.2, tall: 1.0 });
        continue;
      }
      if (e.kind === 'eglob' && e.affix) {
        seenSwells.add(e.id);
        let s = swells.get(e.id);
        if (!s) {
          const g = new Group();
          const c = AFFIX_COLORS[e.affix] ?? PALETTE.bone;
          const glow = makeGlowSprite({ color: c, size: 0.5, opacity: 0.9 });
          glow.position.y = 0.35;
          g.add(glow);
          const shards = [];
          if (e.affix === 'frozen') {
            for (let i = 0; i < 10; i++) {
              const m = new Mesh(sharedGeo('ea-shard', () => new OctahedronGeometry(0.09, 0)), new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, toneMapped: false }));
              const a = (i / 10) * TAU;
              m.position.set(Math.cos(a) * e.blastRadius * 0.92, 0, Math.sin(a) * e.blastRadius * 0.92);
              m.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
              g.add(m);
              shards.push(m);
            }
          }
          g.position.set(e.tx, 0, e.tz);
          root.add(g);
          s = { g, glow, shards, affix: e.affix };
          swells.set(e.id, s);
        }
        const span = Math.max(1, e.landTick - e.startTick);
        const u = Math.min(1, Math.max(0, (tick - 1 + alpha - e.startTick) / span));
        s.glow.scale.setScalar(0.5 + (e.blastRadius ?? 1.5) * 1.6 * u * u + 0.1 * Math.sin(tSec * 30) * u);
        s.glow.material.opacity = 0.5 + 0.45 * u;
        for (const m of s.shards) {
          m.scale.set(0.8, 0.4 + 2.6 * u, 0.8);
          m.position.y = 0.05 + 0.12 * u;
        }
        if (emberBeat && s.affix === 'molten') impactFx.embers(e.tx, e.tz, { n: 2, radius: (e.blastRadius ?? 1.5) * 0.5, tall: 1.4 });
        continue;
      }
      if (!Array.isArray(e.affixes) || !e.affixes.length) continue;
      const rig = rigs.get(e.id);
      if (!rig) continue;
      seen.add(e.id);
      let rec = recs.get(e.id);
      if (!rec) {
        rec = build(e);
        recs.set(e.id, rec);
      }
      const P = rec.parts;
      const pos = rig.build.group.position;
      rec.g.position.set(pos.x, 0, pos.z);
      const alive = e.state === 'active';
      rec.g.visible = alive;
      // Ground aura.
      P.floor.material.opacity = 0.26 + 0.08 * Math.sin(tSec * 3 + e.id);
      P.rings.forEach((m, i) => (m.rotation.z = tSec * (i % 2 ? -0.9 : 0.7)));
      const yaw = Math.atan2(e.faceX ?? 0, e.faceZ ?? 1);
      if (P.molten) {
        P.molten.glow.material.opacity = 0.38 + 0.14 * Math.sin(tSec * 5.3 + e.id);
        P.molten.orbs.forEach((s, i) => {
          const a = tSec * 2.2 + (i * TAU) / 3;
          s.position.set(Math.cos(a) * rec.R, 0.25 + 0.15 * Math.sin(tSec * 4 + i), Math.sin(a) * rec.R);
        });
        if (emberBeat && alive) impactFx.embers(pos.x, pos.z, { n: 1, radius: rec.R * 0.6, tall: 1.3 });
      }
      if (P.frozen) {
        const F = P.frozen;
        const charging = e.frostUntil > tick;
        const pull = charging ? 1 - Math.max(0, e.frostUntil - tick) / 60 : 0;
        F.shards.forEach((m, i) => {
          const a = tSec * (charging ? 5 : 1.1) + (i * TAU) / 6;
          const rr = F.R * (1 - 0.55 * pull);
          m.position.set(Math.cos(a) * rr, F.H * (0.35 + 0.1 * Math.sin(tSec * 2 + i)) + pull * 0.3, Math.sin(a) * rr);
          m.rotation.y = a;
        });
        F.glow.material.opacity = charging ? 0.4 + 0.5 * pull : 0.12;
        F.glow.scale.setScalar(0.6 + 1.2 * pull);
      }
      if (P.vampiric) {
        // A double heartbeat: lub-dub, rest.
        const ph = (tSec * 1.15) % 1;
        const beat = Math.max(0, 1 - Math.abs(ph - 0.08) / 0.07) + 0.7 * Math.max(0, 1 - Math.abs(ph - 0.26) / 0.07);
        P.vampiric.glow.material.opacity = 0.3 + 0.5 * beat;
        P.vampiric.glow.scale.setScalar(0.8 + 0.5 * beat);
        P.rings[rec.list.indexOf('vampiric')].scale.setScalar(1 + 0.1 * beat);
        P.vampiric.mote += dt;
        if (P.vampiric.mote > 0.35 && alive) {
          P.vampiric.mote = 0;
          impactFx.spray('spark', pos.x, 0.3, pos.z, 1, { color: AFFIX_COLORS.vampiric, speed: [0.02, 0.1], up: [0.5, 0.9], size: [0.04, 0.07], life: [0.7, 1.1], gravity: -0.2, drag: 1.4, jitter: rec.R * 0.7, opacity: 0.9 });
        }
      }
      if (P.warded) {
        const W = P.warded;
        const stage = e.affixWard;
        const on = stage === 'on';
        const warn = stage === 'warn';
        W.wire.visible = W.skin.visible = on || warn;
        if (warn) {
          const f = Math.sin(tSec * 40) > 0 ? 1 : 0.25;
          W.wire.material.opacity = 0.45 * f;
          W.skin.material.opacity = 0.06 * f;
        } else if (on) {
          W.wire.material.opacity = 0.55 + 0.15 * Math.sin(tSec * 8);
          W.skin.material.opacity = 0.14;
        }
        W.wire.rotation.y = tSec * 0.8;
        W.skin.rotation.y = -tSec * 0.4;
      }
      if (P.blinking) {
        P.blinking.motes.forEach((s, i) => {
          const a = tSec * 6.5 + i * Math.PI;
          s.position.set(Math.cos(a) * rec.R * 0.9, P.blinking.H * 0.8 + 0.12 * Math.sin(a * 2), Math.sin(a) * rec.R * 0.9);
          s.material.opacity = 0.6 + 0.4 * Math.sin(tSec * 23 + i);
        });
      }
      if (P.splitting) {
        const k = 0.06 + 0.06 * Math.sin(tSec * 3.2);
        P.splitting.halves.forEach((m, i) => {
          const s = i ? -1 : 1;
          m.position.x = Math.cos(yaw) * k * s;
          m.position.z = -Math.sin(yaw) * k * s;
          m.rotation.z = -yaw + Math.PI / 2 + i * Math.PI;
        });
      }
      if (P.hasted) {
        const H = P.hasted;
        const moving = rig.moveK > 0.3;
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        H.chev.forEach((m, i) => {
          const d = ((tSec * 2.2 + i / 3) % 1) * 1.2 - 0.5;
          m.position.set(fx * d * H.R, 0.05, fz * d * H.R);
          m.rotation.z = -yaw + Math.PI;
          m.material.opacity = 0.7 * Math.sin(((tSec * 2.2 + i / 3) % 1) * Math.PI);
        });
        H.spark += dt;
        if (moving && alive && H.spark > 0.06) {
          H.spark = 0;
          impactFx.spray('spark', pos.x - fx * 0.3, 0.35, pos.z - fz * 0.3, 1, { color: AFFIX_COLORS.hasted, speed: [0.6, 1.2], up: [0.1, 0.4], size: [0.03, 0.06], life: [0.2, 0.35], dir: { x: -fx, z: -fz }, dirBias: 0.8, drag: 1.0, opacity: 0.9 });
        }
      }
      if (P.thorned) {
        const fl = thornFlash.get(e.id) ?? 0;
        if (fl > 0) thornFlash.set(e.id, fl - dt);
        const s = 1 + (fl > 0 ? 0.6 * (fl / 0.22) : 0);
        for (const m of P.thorned.thorns) m.scale.set(1, s, 1);
        P.thorned.tint.material.opacity = 0.2 + (fl > 0 ? 0.5 : 0);
        P.thorned.thorns.forEach((m, i) => {
          const a = (i / 9) * TAU + tSec * 0.25;
          m.position.x = Math.cos(a) * (rec.R - 0.08);
          m.position.z = Math.sin(a) * (rec.R - 0.08);
          m.rotation.y = -a;
        });
      }
      // Blinking destination: an Ember ring where it will appear.
      if (e.blink && alive) {
        seenMarks.add(e.id);
        let mk = marks.get(e.id);
        if (!mk) {
          const glow = makeGlowSprite({ color: AFFIX_COLORS.blinking, size: 1.0, opacity: 0.7 });
          glow.position.y = 0.4;
          root.add(glow);
          mk = { shape: shapes.acquire('ring'), glow };
          marks.set(e.id, mk);
        }
        const tel = { kind: 'ring', x: e.blink.x, z: e.blink.z, radius: (e.radius ?? 0.4) + 0.35, startTick: e.blink.startTick ?? tick, resolveTick: e.blink.at, dirX: 0, dirZ: 1, playerTargeted: false };
        const span = Math.max(1, tel.resolveTick - tel.startTick);
        const prog = Math.min(1, Math.max(0, (tick - tel.startTick) / span));
        mk.shape.set(tel, tSec, prog);
        mk.glow.position.set(e.blink.x, 0.4, e.blink.z);
        mk.glow.scale.setScalar(0.6 + 0.8 * prog);
        liveTelegraphs.push(tel);
      }
      // Name plate over the crown.
      if (rec.plate) {
        const p = toScreen(pos.x, rec.H + 0.55, pos.z);
        const show = alive && p.vis;
        rec.plate.style.opacity = show ? '1' : '0';
        if (show) {
          const sc = Math.min(1.25, Math.max(0.85, Math.min(window.innerWidth / 1600, window.innerHeight / 900) * 1.05));
          rec.plate.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%,-100%) scale(${sc.toFixed(3)})`;
          const w = rec.plate.querySelector('[data-affix="warded"]');
          if (w) w.classList.toggle('ea-hot', e.affixWard === 'on');
        }
      }
    }
    for (const [id, rec] of recs) {
      if (seen.has(id)) continue;
      dispose(rec);
      recs.delete(id);
      thornFlash.delete(id);
    }
    for (const [id, c] of cores) {
      if (seenCores.has(id)) continue;
      root.remove(c.g);
      c.glow.material.dispose();
      c.orb.material.dispose();
      cores.delete(id);
    }
    for (const [id, s] of swells) {
      if (seenSwells.has(id)) continue;
      root.remove(s.g);
      s.g.traverse((o) => o.material && o.material.dispose && o.material.dispose());
      swells.delete(id);
    }
    for (const [id, mk] of marks) {
      if (seenMarks.has(id)) continue;
      shapes.release(mk.shape);
      root.remove(mk.glow);
      mk.glow.material.dispose();
      marks.delete(id);
    }
  }

  function debugState() {
    return {
      affixElites: recs.size,
      affixPlates: [...recs.values()].filter((r) => r.plate && r.plate.style.opacity === '1').length,
      affixCores: cores.size,
      affixSwells: swells.size,
      affixMarks: marks.size,
      affixCounters: { ...counters },
    };
  }

  return { update, debugState };
}
