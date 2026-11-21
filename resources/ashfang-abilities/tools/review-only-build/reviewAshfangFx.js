// REVIEW-ONLY (never committed, never pushed): stand-in looks for Ashfang's
// kit 1.4 on his ability review page. Dim on purpose: the real VFX are made at
// the freeze lift with the VFX templates. His colours only (kit S9): Fox
// Crimson #E8577A and Moon Silver #E7E3F0 for plain cuts and the count; fire
// gold #FFB43C on a Hearth Amber #E8A23D body; earth Ochre #8F6B45 with debris
// #5A4632; water pale aqua #7FE0F2; wind Moon Silver. No Ember, no Violet; the
// dummy's shot is Foe Crimson #B8141F.
import { AdditiveBlending, BoxGeometry, Matrix4, BufferGeometry, Float32BufferAttribute, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RingGeometry, Shape, ShapeGeometry, SphereGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
import { getRadialTexture } from '../glow.js';

const CRIMSON = '#E8577A', SILVER = '#E7E3F0', GOLD = '#FFB43C', AMBER = '#FFB43C', OCHRE = '#B08A5E', DEBRIS = '#5A4632', AQUA = '#7FE0F2', FOE = '#B8141F', SMOKE = '#5B5650', STEAM = '#DDE3E6', CRUST = '#2E2622', STONE = '#8E8B85';
const EC = { fire: GOLD, earth: '#B08A5E', water: AQUA, wind: SILVER };
// 2.0 (kit 2.0 K1): the four families are wills; the old element ids stay inside, the words go
const WILL = { fire: 'Intent', earth: 'Unbowed', water: 'Still Water', wind: 'Fervour' };
const sm = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
let rs = 12345;
const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);

export function createReviewAshfangFx({ bus, root, world, stage }) {
  const focus = { x: null, z: null };
  window.__afFocus = (x, z) => { focus.x = x; focus.z = z; };
  // kit 2.1 (K26): a replayed event (echo) moves the silver ghost of him, not him
  let echoG = null;
  const echoCue = (k, ev) => {
    if (!echoG || echoG.dead) return;
    if (k === 'play') echoG.play(ev.clip, { from: ev.from || 0, speed: ev.speed || 1 });
    else if (k === 'dash') echoG.play(!ev.el ? 'dash20' : 'dash', { from: ev.from || 0, speed: ev.speed || 1 });
  };
  const cue = (k, ev) => { if (ev && ev.echo) return echoCue(k, ev); return window.__tripoFoxCue && window.__tripoFoxCue(k, ev); };
  // the rig that is drawn (two rig instances exist; the effects take the one updated last)
  const liveRig = () => (window.__tripoFoxSts || []).filter((r) => r.model && r.lastUp && r.ghostSword).sort((p, q) => q.lastUp - p.lastUp)[0] || null;
  const byId = (id) => {
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };
  const fox = () => world.entities().find((e) => e.kind === 'ally' && e.partyIndex === 2) || null;
  let items = [];
  const add = (obj, life, update, key = null) => {
    root.add(obj);
    const it = { obj, t: 0, life, update, key };
    items.push(it);
    // 2.1: place it before its first draw (a new strip showed for one frame as a 1 u square)
    if (update) { try { update(0, 0, 0); } catch (e) { /* an update that reads its own item waits for the loop */ } }
    return it;
  };
  const kill = (it) => { if (it) it.t = it.life; };
  const later2 = (secs, fn) => { let done = false; add(new Group(), secs + 0.05, (u, t) => { if (!done && t >= secs) { done = true; fn(); } }); };
  const keyed = new Map(); // persistent per-foe looks: `${kind}:${id}` -> item
  // additive looks run at about half strength (dim stand-ins; bloom lifts them)
  const basic = (color, op = 1, additive = false) => new MeshBasicMaterial({ color, transparent: true, opacity: additive ? op * 0.5 : op, depthWrite: false, side: DoubleSide, ...(additive ? { blending: AdditiveBlending } : {}) });
  const ringGeo = new RingGeometry(0.9, 1, 72);
  const discGeo = new CircleGeometry(1, 48);
  function ring(x, z, r, color, { life = 0.5, from = 0.3, op = 0.7, y = 0.05, inward = false, geo = ringGeo } = {}) {
    const m = new Mesh(geo, basic(color, op));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    return add(m, life, (u) => {
      const k = inward ? 1 - 0.7 * (1 - (1 - u) ** 2) : from + (1 - from) * (1 - (1 - u) ** 3);
      m.scale.setScalar(r * k);
      m.material.opacity = op * (1 - u * u);
    });
  }
  function disc(x, z, r, color, op, life, { y = 0.03, pulse = 0 } = {}) {
    const m = new Mesh(discGeo, basic(color, op));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.scale.setScalar(r);
    return add(m, life, (u, t) => { m.material.opacity = op * Math.min(1, u * 12) * (1 - sm(0.85, 1, u)) * (1 - pulse + pulse * (0.5 + 0.5 * Math.sin(t * 9))); });
  }
  function sprite(color, op = 0.6, additive = false) {
    return new Sprite(new SpriteMaterial({ map: getRadialTexture(), color, transparent: true, depthWrite: false, opacity: op, ...(additive ? { blending: AdditiveBlending } : {}) }));
  }
  // 2.0 (kit 2.0 K5, no elements): no smoke or steam; a puff in a will's colour is a few small
  // motes of light (gold, bronze, pale aqua); grey floor dust stays dust
  const MOTE = { [GOLD]: GOLD, [DEBRIS]: '#B08A5E', [OCHRE]: '#B08A5E', [AQUA]: AQUA, '#C9F4FB': AQUA };
  function puff(x, z, { n = 8, r = 0.5, color = DEBRIS, life = 0.7, h = 0.5, size = 0.35, y = 0.1, op = 0.5, dust = false } = {}) {
    if (!dust && (color === SMOKE || color === STEAM)) return;
    if (!dust && MOTE[color]) { color = MOTE[color]; size *= 0.4; n = Math.ceil(n * 0.7); op = Math.min(0.8, op * 1.3); }
    for (let i = 0; i < n; i++) {
      const s = sprite(color, 0, !dust && !!MOTE[color]);
      const a = rnd() * Math.PI * 2, rr = r * (0.3 + rnd() * 0.7);
      const vx = Math.cos(a) * rr * 1.4, vz = Math.sin(a) * rr * 1.4, vy = h * (0.6 + rnd() * 0.6);
      s.position.set(x, y, z);
      add(s, life * (0.7 + rnd() * 0.5), (u, t, dt) => {
        s.position.x += vx * dt * (1 - u);
        s.position.z += vz * dt * (1 - u);
        s.position.y += vy * dt * (1 - u);
        s.scale.setScalar(size * (0.6 + u));
        s.material.opacity = op * Math.min(1, u * 6) * (1 - u);
      });
    }
  }
  const rockGeo = new DodecahedronGeometry(0.08, 0);
  const debMat = new MeshStandardMaterial({ color: DEBRIS, roughness: 1, flatShading: true });
  const ochMat = new MeshStandardMaterial({ color: OCHRE, roughness: 1, flatShading: true });
  // 2.0 (K5): no rocks; what flew as stone flies as thin slivers of bronze and silver light
  const sliverGeo = new BoxGeometry(0.018, 0.018, 0.16);
  const sliverMats = ['#B08A5E', SILVER].map((c) => new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }));
  function chunks(x, z, { n = 8, r = 0.6, up = 2.2, mat = debMat, size = 1, life = 0.9 } = {}) {
    void mat;
    for (let i = 0; i < n; i++) {
      const m = new Mesh(sliverGeo, sliverMats[i % 2]);
      const a = rnd() * Math.PI * 2, sp = r * (0.8 + rnd());
      const vx = Math.cos(a) * sp, vz = Math.sin(a) * sp;
      let vy = up * (0.6 + rnd() * 0.6);
      m.scale.setScalar(size * (0.5 + rnd() * 0.7));
      m.position.set(x, 0.1, z);
      m.lookAt(x + vx, 0.1 + vy * 0.3, z + vz);
      add(m, life * 0.6, (u, t, dt) => {
        vy -= 9 * dt;
        m.position.x += vx * dt;
        m.position.z += vz * dt;
        m.position.y = Math.max(0.04, m.position.y + vy * dt);
        m.material.opacity = 0.85;
        m.scale.set(1, 1, 1 - 0.7 * u);
      });
    }
  }
  function textSprite(text, color, size = 0.42) {
    const c = document.createElement('canvas');
    const font = '700 40px system-ui, sans-serif';
    const m = c.getContext('2d');
    m.font = font;
    c.width = Math.max(128, Math.ceil(m.measureText(text).width) + 24);
    c.height = 64;
    const g = c.getContext('2d');
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 7;
    g.strokeStyle = 'rgba(14,16,12,0.9)';
    g.strokeText(text, c.width / 2, 32);
    g.fillStyle = color;
    g.fillText(text, c.width / 2, 32);
    const s = new Sprite(new SpriteMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false, depthTest: false }));
    s.renderOrder = 999;
    s.scale.set((size * c.width) / 64, size, 1);
    return s;
  }
  function label(text, color, x, y, z, { life = 1.2, rise = 0.5, size = 0.4 } = {}) {
    const s = textSprite(text, color, size);
    s.position.set(x, y, z);
    return add(s, life, (u, t, dt) => {
      s.position.y += rise * dt * (1 - u);
      s.material.opacity = Math.min(1, u * 8) * (1 - sm(0.7, 1, u));
    });
  }
  // a flat strip on the floor from A to B
  function strip(ax, az, bx, bz, color, { life = 0.4, op = 0.7, w = 0.1, y = 0.06, grow = 0 } = {}) {
    const m = new Mesh(new PlaneGeometry(1, 1), basic(color, op));
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 0.01;
    m.rotation.set(-Math.PI / 2, 0, -Math.atan2(dz, dx));
    return add(m, life, (u) => {
      const k = grow ? Math.min(1, u / grow) : 1;
      m.position.set(ax + (dx * k) / 2, y, az + (dz * k) / 2);
      m.scale.set(L * k, w, 1);
      m.material.opacity = op * (1 - sm(0.5, 1, u));
    });
  }
  // a cut arc in front of him
  function arc(x, z, dx, dz, r, half, color, { life = 0.22, y = 0.5, side = 1, w = 0.32, op = 0.6, spin = false } = {}) {
    op *= 0.6;
    const th = Math.min(Math.PI, (Math.max(20, half) * Math.PI) / 180);
    const g = new RingGeometry(Math.max(0.05, r - w), r, 40, 1, -th, 2 * th);
    const m = new Mesh(g, basic(color, op, true));
    const yaw = Math.atan2(dx, dz);
    m.rotation.set(-Math.PI / 2, 0, yaw - Math.PI / 2 + (side < 0 ? 0 : 0));
    m.position.set(x, y, z);
    return add(m, life, (u) => {
      m.material.opacity = op * (1 - u) * Math.min(1, u * 10);
      if (spin) m.rotation.z += 0.4;
      m.scale.setScalar(0.85 + 0.15 * u);
    });
  }
  // a sword wave: a crescent standing up a little off the floor, facing its flight
  function crescentGeo(w, thick) {
    const s = new Shape();
    const R = w / 2;
    s.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
    s.absarc(-thick * 0.2, 0, R * 0.92, Math.PI / 2, -Math.PI / 2, true);
    const g = new ShapeGeometry(s, 24);
    // lay it on the floor: x along the flight, y across
    return g;
  }

  // ---- 1.5 restyles: a cut drawn as a swept band in its own tilted plane ----
  // the band lies in his floor plane, centred on his aim, then rolls about the
  // aim by `tilt` degrees (0 flat sweep, 85 a near-vertical chop). `prof`
  // shapes the width along the sweep: 'taper' thin at both ends, 'brush' a fat
  // head and a dry tail (the ink strokes of the 2SnjhTKLD ref).
  function bandGeo(r, w, th, n, prof, side) {
    const pos = [];
    const P = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const a = side < 0 ? th - 2 * th * s : -th + 2 * th * s;
      const k = prof === 'brush' ? Math.pow(Math.max(0, 1 - s), 0.55) * sm(0, 0.08, s) : Math.pow(Math.sin(Math.PI * s), 0.6);
      const r0 = r - w * k, r1 = r;
      P.push([Math.sin(a) * r0, Math.cos(a) * r0, Math.sin(a) * r1, Math.cos(a) * r1]);
    }
    for (let i = 0; i < n; i++) {
      const [ax, az, bx, bz] = P[i], [cx, cz, dx2, dz2] = P[i + 1];
      pos.push(ax, 0, az, bx, 0, bz, dx2, 0, dz2, ax, 0, az, dx2, 0, dz2, cx, 0, cz);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return g;
  }
  const INK = '#7A2338';
  function slash3d(x, z, dx, dz, r, half, color, { tilt = 0, y = 0.5, life = 0.3, side = 1, w = 0.34, op = 0.6, ink = false } = {}) {
    const th = Math.min(Math.PI * 0.95, (Math.max(25, half * 1.1) * Math.PI) / 180);
    const n = 32;
    const g = new Group();
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(dx, dz);
    const roll = new Group();
    roll.rotation.z = (tilt * Math.PI) / 180;
    g.add(roll);
    const parts = [];
    const mk = (geo, c, o, additive) => { const m = new Mesh(geo, basic(c, o, additive)); roll.add(m); parts.push([m, o, additive ? o * 0.5 : o]); return m; };
    if (ink) {
      mk(bandGeo(r, w * 1.2, th, n, 'brush', side), color, op * 0.9, false);
      mk(bandGeo(r - w * 0.35, w * 0.25, th * 0.75, n, 'brush', side), INK, op * 0.8, false);
      mk(bandGeo(r + 0.04, w * 0.12, th * 0.9, n, 'brush', side), INK, op * 0.6, false);
    } else {
      mk(bandGeo(r, w, th, n, 'taper', side), color, op, true);
      mk(bandGeo(r, 0.05, th, n, 'taper', side), SILVER, op * 1.2, true);
      mk(bandGeo(r - w * 0.55, 0.04, th * 0.7, n, 'taper', side), color, op * 0.7, true);
    }
    const tris = n * 6;
    return add(g, life, (u) => {
      const k = Math.min(1, u / 0.35);
      for (const [m, , o] of parts) {
        m.geometry.setDrawRange(0, Math.ceil((tris * sm(0, 1, k)) / 3) * 3);
        m.material.opacity = o * (1 - sm(0.55, 1, u));
      }
      roll.scale.setScalar(0.92 + 0.08 * k);
    });
  }
  const waves = new Map();
  function waveLook(ev) {
    const g = new Group();
    const col = ev.kind === 'strong' ? SILVER : ev.kind === 'sentback' ? EC.earth : EC[ev.el] || CRIMSON;
    const w = ev.w;
    const op = ev.half ? 0.38 : 0.62;
    const mk = (geo, c, o, y, add_ = true) => {
      const m = new Mesh(geo, basic(c, o, add_));
      m.rotation.x = -Math.PI / 2;
      m.position.y = y;
      g.add(m);
      return m;
    };
    if (ev.kind === 'throw') {
      const c = ev.el ? EC[ev.el] : SILVER;
      const m = new Mesh(new RingGeometry(0.22, 0.42, 32), basic(c, 0.5, true));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.55;
      g.add(m);
      const h = sprite(ev.el ? c : CRIMSON, 0.35, true);
      h.scale.setScalar(0.6);
      h.position.y = 0.55;
      g.add(h);
    } else if (ev.kind === 'blaze' || ev.kind === 'flood') {
      // a rolling wall
      const wall = new Mesh(new PlaneGeometry(w, 0.9), basic(ev.kind === 'blaze' ? AMBER : AQUA, 0.45, true));
      wall.position.y = 0.45;
      wall.rotation.y = Math.PI / 2;
      g.add(wall);
      const top = new Mesh(new PlaneGeometry(w, 0.3), basic(ev.kind === 'blaze' ? GOLD : '#C9F4FB', 0.5, true));
      top.position.y = 0.9;
      top.rotation.y = Math.PI / 2;
      g.add(top);
      g.userData.wall = [wall, top];
    } else if (ev.kind === 'flare') {
      const b = new Mesh(new SphereGeometry(0.16, 12, 8), basic(GOLD, 0.8, true));
      b.position.y = 0.55;
      g.add(b);
      const h = sprite(AMBER, 0.6, true);
      h.scale.setScalar(0.7);
      h.position.y = 0.55;
      g.add(h);
    } else if (ev.kind === 'skim') {
      // Skyblade Waltz's opener (Pi4PRflgB): a crescent that skims the floor
      const wide = true;
      const vw = wide ? w : w * 1.6;
      const c1 = mk(crescentGeo(vw, wide ? 0.35 : 0.6), col, op * 0.9, wide ? 0.12 : 0.35);
      const c2 = mk(crescentGeo(vw * 0.85, 0.2), '#FFFFFF', op * 0.6, wide ? 0.13 : 0.36);
      c2.position.x = 0.06;
      void c1;
      g.userData.skim = wide;
    } else {
      const thick = ev.kind === 'great' ? 0.5 : ev.kind === 'thin' ? 0.16 : ev.kind === 'stone' ? 0.4 : 0.3;
      const c1 = mk(crescentGeo(w, thick), col, op, 0.5);
      c1.scale.set(1, 1, 1);
      const c2 = mk(crescentGeo(w * 0.8, thick), ev.kind === 'strong' ? CRIMSON : col, op * 0.6, 0.48);
      c2.position.x = -0.18;
      // 2.0: a great wave stands at its cut's tilt (flat, slanted, tall); a keen one has a hot edge
      if (ev.tilt) {
        const roll = new Group();
        while (g.children.length) roll.add(g.children[0]);
        roll.position.y = 0.5;
        roll.children.forEach((m) => { m.position.y -= 0.5; });
        roll.rotation.x = (ev.tilt * Math.PI) / 180;
        g.add(roll);
      }
      if (ev.kind === 'keen' || ev.kind === 'great') {
        const hot = mk(crescentGeo(w * 1.02, 0.06), '#FFFFFF', op * 0.7, 0.505);
        hot.position.x = 0.02;
        if (ev.tilt) { g.remove(hot); g.children[0].add(hot); hot.position.y = 0.005; }
      }
    }
    g.rotation.y = Math.atan2(ev.dx, ev.dz) - Math.PI / 2;
    g.position.set(ev.x, 0, ev.z);
    root.add(g);
    if (ev.kind === 'throw') g.visible = false;
    const it = { g, ev, t: 0, last: { x: ev.x, z: ev.z } };
    waves.set(ev.id, it);
    return it;
  }

  // ---- bus: rig cues ----
  bus.on('review_af_play', (ev) => cue('play', ev));
  bus.on('review_af_face', (ev) => cue('face', ev));
  bus.on('review_af_hop', (ev) => cue('hop', ev));
  bus.on('review_af_orbs', (ev) => {
    cue('orbs', ev);
    const f = fox();
    if (f && ev.added) puff(f.x, f.z, { n: 4, r: 0.15, color: EC[ev.added], h: 0.6, y: 0.6, size: 0.18, op: 0.6, life: 0.5 });
  });
  bus.on('review_af_edge', (ev) => cue('edge', ev));
  bus.on('review_af_trail', (ev) => cue('trail', ev));
  bus.on('review_af_dash', (ev) => {
    cue('dash', { ...ev, len: ev.len });
    if (ev.el) cue('trail', { color: EC[ev.el] });
    else cue('trail', { color: CRIMSON });
    const f = fox();
    if (f && !ev.el && ev.dist) {
      // 2.0 (MOTIONS M7b): flat and low, a thin Fox Crimson streak with a Moon Silver edge along
      // the dash, a short spray of sparks where he stops
      const x1 = f.x + ev.dx * ev.dist, z1 = f.z + ev.dz * ev.dist;
      later2(0.1, () => {
        strip(f.x, f.z, x1, z1, CRIMSON, { life: 0.45, op: 0.6, w: 0.1, y: 0.42, grow: 0.5 });
        strip(f.x, f.z, x1, z1, SILVER, { life: 0.38, op: 0.75, w: 0.025, y: 0.47, grow: 0.5 });
        strip(f.x, f.z, x1, z1, SILVER, { life: 0.38, op: 0.5, w: 0.02, y: 0.37, grow: 0.5 });
      });
      later2(0.4, () => { const t = fox(); if (t) sparkSpray(new Vector3(t.x + ev.dx * 0.3, 0.08, t.z + ev.dz * 0.3), { n: 10, dir: new Vector3(ev.dx, 0.5, ev.dz), col: CRIMSON }); });
    } else if (f) for (let i = 0; i < 3; i++) setTimeout(() => { const t = fox(); if (t) puff(t.x, t.z, { n: 3, r: 0.25, h: 0.25, life: 0.5, color: '#9C978E', op: 0.3, dust: true }); }, 100 + i * 90);
  });
  bus.on('review_af_blur', (ev) => cue('blur', ev));
  bus.on('review_af_blink', (ev) => {
    const st = window.__tripoFox;
    strip(ev.x0, ev.z0, ev.x1, ev.z1, SILVER, { life: 0.25, op: 0.45, w: 0.08, y: 0.5 });
    if (st && st.snapshot) {
      const g = st.snapshot(basic(SILVER, 0.22));
      if (g) add(g, 0.25, (u) => g.traverse((o) => { if (o.material) o.material.opacity = 0.22 * (1 - u); }));
    }
  });

  // ---- the count by him ----
  let countSpr = null, countN = -1;
  bus.on('review_af_count', (ev) => {
    if (ev.n === countN) return;
    countN = ev.n;
    if (countSpr) { root.remove(countSpr); countSpr = null; }
    if (ev.n > 0) {
      countSpr = textSprite(String(ev.n), ev.n >= 30 ? CRIMSON : SILVER, ev.n >= 20 ? 0.46 : ev.n >= 10 ? 0.42 : 0.38);
      root.add(countSpr);
      countSpr.userData.pop = 1;
    } else if (ev.fell) {
      const f = fox();
      if (f) label('0', '#9A968E', f.x + 0.55, 1.45, f.z, { life: 0.6, rise: -0.3, size: 0.34 });
    }
    if (ev.ring) {
      const f = fox();
      if (f) ring(f.x, f.z, 1.1, SILVER, { life: 0.5, op: 0.55 });
    }
  });

  // ---- 1.8: the basic cuts (Kesh 23:26: audit the basic attack, much more detail) ----
  // the slash is the blade's own path from the clip (st.sweeps: guard and tip in model space, 120 a
  // second): a ribbon over the outer blade from the wind-down to the follow-through, thickest at
  // the blade and thinning to a point toward its start (VFX_TEMPLATES "A stroke tapers"), shown as
  // far as the blade has gone, a hot line along the tip, a 4-point glint on its first frame
  let starTex = null;
  const star = () => {
    if (starTex) return starTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, r = i % 2 ? 5 : 31;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    starTex = new CanvasTexture(c);
    return starTex;
  };
  const tv3 = new Vector3();
  function sweepPts(ev) {
    const st = window.__tripoFox, sw = st && st.sweeps && st.sweeps[ev.clip];
    if (!sw || !st.model) return null;
    st.model.updateMatrixWorld(true);
    const M = st.restMatrix ? st.restMatrix() : st.model.matrixWorld;
    const k0 = Math.max(0, Math.round((ev.at - 0.05) / sw.dt)), kc = Math.round(ev.at / sw.dt), k1 = Math.min(sw.pts.length - 1, Math.round((ev.at + 0.06) / sw.dt));
    const P = [];
    for (let k = k0; k <= k1; k++) {
      const p = sw.pts[k];
      P.push([new Vector3(p[0], p[1], p[2]).applyMatrix4(M), new Vector3(p[3], p[4], p[5]).applyMatrix4(M)]);
    }
    return { P, kc: kc - k0, dt: sw.dt, piv: new Vector3(0, 0.5, 0.04).applyMatrix4(M) };
  }
  // the blade's path carried out from his chest to the cut's reach: the swing's own tilt and arc,
  // as wide as the hit; r0 to r1 is the band across it, thinning to a point toward its start
  function ribbon(P, piv, r0, r1, taper) {
    const n = P.length, pos = new Float32Array(n * 6), al = new Float32Array(n * 2), idx = [];
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1), d = P[i][1].clone().sub(piv);
      // scaled out from his chest so the band reaches the hit's reach on the floor plan; the swing's
      // heights scale with it (capped), so a diagonal stays diagonal and a chop stays upright
      const k = Math.min(1.9, 1 / Math.max(0.05, Math.hypot(d.x, d.z)));
      const w = taper ? Math.pow(s, 0.8) : 1;
      const o = piv.clone().addScaledVector(d, r1 * k), inn = piv.clone().addScaledVector(d, (r1 - (r1 - r0) * w) * k);
      o.y = Math.max(0.05, o.y);
      inn.y = Math.max(0.05, inn.y);
      pos.set([inn.x, inn.y, inn.z, o.x, o.y, o.z], i * 6);
    }
    for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('alpha', new Float32BufferAttribute(al, 1));
    geo.setIndex(idx);
    return geo;
  }
  const alphaMat = (color, op, additive = true) => {
    const m = basic(color, op, additive);
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace('void main() {', 'attribute float alpha; varying float vA; void main() { vA = alpha;');
      s.fragmentShader = s.fragmentShader.replace('void main() {', 'varying float vA; void main() {').replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity * vA );');
    };
    return m;
  };
  function sweepSlash(ev) {
    const S = sweepPts(ev);
    if (!S) return null;
    const { P, kc, dt, piv } = S, n = P.length;
    const strong = !!ev.strong, col = CRIMSON, R1 = (ev.r || 1) + 0.12;
    const g = new Group();
    const layers = [
      [ribbon(P, piv, R1 - 0.34, R1, true), col, strong ? 0.6 : 0.5, 1, false],
      [ribbon(P, piv, R1 - 0.16, R1, true), '#F6B3C4', strong ? 0.7 : 0.55, 0.85, true],
      [ribbon(P, piv, R1 - 0.035, R1 + 0.01, false), '#FFFFFF', 0.85, 0.7, true],
    ];
    const ms = layers.map(([geo, c, op, , ad]) => { const m = new Mesh(geo, alphaMat(c, op, ad)); m.frustumCulled = false; m.renderOrder = 6; g.add(m); return m; });
    // the blade reaches sample kc at the cut and sample n - 1 about 60 ms later; the ribbon then
    // drains from its start toward the blade
    const reveal = (n - 1 - kc) * dt, life = reveal + 0.2;
    add(g, life, (u, t) => {
      const head = Math.min(n - 1, kc + (t / Math.max(1e-3, reveal)) * (n - 1 - kc));
      const drain = Math.max(0, (t - reveal * 0.4) / (life - reveal * 0.4));
      const tail = drain * (n - 1);
      layers.forEach(([geo, , , len], j) => {
        const A = geo.attributes.alpha.array;
        for (let i = 0; i < n; i++) {
          const ahead = i <= head ? 1 : 0;
          // fresh near the blade, older toward the start; the inner layers go out first
          const age = (head - i) / (n - 1);
          const fade = Math.max(0, Math.min(1, (i - tail * (1.15 - 0.15 * len)) / 3));
          const a = ahead * fade * (1 - 0.55 * Math.min(1, age / len)) * (1 - 0.6 * drain);
          A[i * 2] = a * (j === 2 ? 1 : 0.15);
          A[i * 2 + 1] = a;
        }
        geo.attributes.alpha.needsUpdate = true;
        geo.setDrawRange(0, Math.max(0, Math.ceil(head)) * 6);
      });
      void ms;
    });
    // the glint at the tip on the cut's first frame
    const tip = piv.clone().addScaledVector(P[kc][1].clone().sub(piv).normalize(), R1);
    tip.y = Math.max(0.06, tip.y);
    const s = new Sprite(new SpriteMaterial({ map: star(), color: '#FFFFFF', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.9 }));
    s.position.copy(tip);
    s.material.rotation = rnd() * Math.PI;
    add(s, 0.12, (u) => { s.scale.setScalar((strong ? 0.5 : 0.36) * (1 - 0.5 * u)); s.material.opacity = 0.9 * (1 - u); });
    return S;
  }
  // a blade hit on a dummy: where the blade's path passes it, along the swing
  function bladeHit(ev, S, e) {
    const { P, kc, dt } = S;
    let best = 0, bd = Infinity, bp = null;
    P.forEach(([b, t], i) => {
      // the blade's segment against the dummy's upright line
      const ab = t.clone().sub(b);
      const ap = new Vector3(e.x - b.x, 0, e.z - b.z);
      const L2 = ab.x * ab.x + ab.z * ab.z || 1e-6;
      const u = Math.max(0.3, Math.min(1, (ap.x * ab.x + ap.z * ab.z) / L2));
      const q = b.clone().addScaledVector(ab, u);
      const d = Math.hypot(q.x - e.x, q.z - e.z) + Math.abs(i - kc) * 0.004;
      if (d < bd) { bd = d; best = i; bp = q; }
    });
    const i0 = Math.max(0, best - 1), i1 = Math.min(P.length - 1, best + 1);
    const sw = P[i1][1].clone().sub(P[i0][1]);
    if (sw.lengthSq() < 1e-8) sw.set(ev.dx, 0, ev.dz);
    sw.normalize();
    // onto the dummy's skin, on the side he cuts from
    const f = fox();
    const fx = f ? f.x : e.x - ev.dx, fz = f ? f.z : e.z - ev.dz;
    const to = new Vector3(fx - e.x, 0, fz - e.z).normalize();
    const R = 0.19;
    const y = Math.max(0.24, Math.min(0.78, bp ? bp.y : 0.5));
    const at = new Vector3(e.x + to.x * R, y, e.z + to.z * R);
    window.__afHit = { t: performance.now() / 1000, id: e.id, dx: -to.x, dz: -to.z, sx: sw.x, sz: sw.z, sy: sw.y, strong: !!ev.strong };
    const strong = !!ev.strong;
    // the flash at the contact
    const HC = ev.col || CRIMSON;
    const fc = sprite(HC, 0.55, true);
    fc.position.copy(at);
    add(fc, 0.14, (u) => { fc.scale.setScalar((strong ? 0.45 : 0.32) * (0.6 + u)); fc.material.opacity = 0.55 * (1 - u) * (1 - u); });
    // the cut mark across the dummy, along the swing, facing out of the dummy
    const mk = new Mesh(new PlaneGeometry(1, 1), basic('#FFFFFF', 0.95, true));
    mk.position.copy(at).addScaledVector(to, 0.02);
    const nrm = to.clone();
    const xa = sw.clone().addScaledVector(nrm, -sw.dot(nrm)).normalize(), ya = new Vector3().crossVectors(nrm, xa);
    mk.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(xa, ya, nrm));
    add(mk, 0.26, (u) => { mk.scale.set((strong ? 0.5 : 0.38) * (0.6 + 0.4 * Math.min(1, u * 8)), 0.03 * (1 - u) + 0.008, 1); mk.material.color.set(u < 0.25 ? '#FFFFFF' : HC); mk.material.opacity = 0.95 * (1 - u); });
    // sparks thrown along the swing, off the dummy's face
    const nS = strong ? 12 : 8;
    for (let k = 0; k < nS; k++) {
      const m = new Mesh(sparkGeo, basic(k % 3 === 0 ? HC : k % 3 === 1 ? '#FFFFFF' : SILVER, 0.95, true));
      const v = sw.clone().multiplyScalar(0.75).add(to.clone().multiplyScalar(0.45)).add(new Vector3(rnd() - 0.5, rnd() * 0.8, rnd() - 0.5).multiplyScalar(0.9)).normalize().multiplyScalar(2.4 + rnd() * 2.4);
      const p = at.clone();
      const life = 0.16 + rnd() * 0.14;
      add(m, life, (u, t, dt2) => {
        v.y -= 9 * dt2;
        p.addScaledVector(v, dt2);
        m.position.copy(p);
        m.lookAt(p.x + v.x, p.y + v.y, p.z + v.z);
        m.scale.set(1, 1, 0.4 + Math.min(1.6, v.length() * 0.35));
        m.material.opacity = 0.95 * (1 - u);
      });
    }
    // canvas and straw flecks, falling to the floor
    for (let k = 0; k < (strong ? 6 : 4); k++) {
      const m = new Mesh(fleckGeo, new MeshStandardMaterial({ color: k % 2 ? '#A39C8E' : '#C9B98F', roughness: 1 }));
      const v = to.clone().multiplyScalar(0.6 + rnd() * 0.6).add(sw.clone().multiplyScalar(0.5)).add(new Vector3((rnd() - 0.5) * 0.8, 0.6 + rnd() * 0.9, (rnd() - 0.5) * 0.8));
      const p = at.clone(), sp = new Vector3(rnd() * 12, rnd() * 12, rnd() * 12);
      add(m, 0.75, (u, t, dt2) => {
        if (p.y > 0.012) {
          v.y -= 6 * dt2;
          v.multiplyScalar(1 - 2.5 * dt2);
          p.addScaledVector(v, dt2);
          m.rotation.x += sp.x * dt2;
          m.rotation.y += sp.y * dt2;
          m.rotation.z += sp.z * dt2;
        }
        p.y = Math.max(0.012, p.y);
        m.position.copy(p);
        m.scale.setScalar(1 - sm(0.7, 1, u));
      });
    }
  }
  const sparkGeo = new BoxGeometry(0.012, 0.012, 0.09);
  const fleckGeo = new BoxGeometry(0.035, 0.006, 0.02);
  // dust where a foot lands on a hit (the right foot on hits 1 and 5, the left on hit 6)
  function footDust(ev) {
    const st = window.__tripoFox;
    const which = { af1: 'footR', af5: 'footR', af6: 'footL', af3: 'footL' }[ev.clip];
    if (!which || !st || !st.model) return;
    const fb = st.model.getObjectByName(which);
    if (!fb) return;
    const p = new Vector3().setFromMatrixPosition(fb.matrixWorld);
    puff(p.x, p.z, { n: ev.clip === 'af5' ? 7 : 4, r: 0.22, color: '#B9B2A6', h: 0.12, y: 0.03, size: 0.16, op: 0.32, life: 0.45 });
  }

  // ---- cuts, thrusts, strong cut ----
  bus.on('review_af_cut', (ev) => {
    if (ev.quiet && rnd() < 0.3) return;
    // 1.8: a basic cut (it names its clip) draws from the blade's path; every hit sparks
    if (ev.clip) {
      const S = ev.style === 'thrust' ? sweepPts(ev) : sweepSlash(ev);
      if (S && ev.style === 'thrust') {
        const L = ev.r + 0.5;
        strip(ev.x, ev.z, ev.x + ev.dx * L, ev.z + ev.dz * L, CRIMSON, { life: 0.28, op: 0.75, w: 0.14, y: 0.42, grow: 0.3 });
        strip(ev.x, ev.z, ev.x + ev.dx * L, ev.z + ev.dz * L, SILVER, { life: 0.2, op: 0.7, w: 0.04, y: 0.43, grow: 0.3 });
      }
      if (S) {
        for (const id of ev.hits || []) { const e = byId(id); if (e) bladeHit(ev, S, e); }
        footDust(ev);
        return;
      }
    }
    const col = ev.style === 'ink' ? CRIMSON : ev.el ? EC[ev.el] : CRIMSON;
    if (ev.spin) ring(ev.x, ev.z, ev.r, col, { life: 0.25, op: 0.5, y: 0.45, from: 0.8 });
    else if (ev.style === 'thrust') {
      const L = ev.r + 0.5;
      strip(ev.x, ev.z, ev.x + ev.dx * L, ev.z + ev.dz * L, col, { life: 0.28, op: 0.75, w: 0.14, y: 0.55, grow: 0.3 });
      strip(ev.x, ev.z, ev.x + ev.dx * L, ev.z + ev.dz * L, SILVER, { life: 0.2, op: 0.7, w: 0.04, y: 0.56, grow: 0.3 });
      const s = sprite(SILVER, 0.7, true);
      s.position.set(ev.x + ev.dx * L, 0.56, ev.z + ev.dz * L);
      add(s, 0.2, (u) => { s.scale.setScalar(0.25 + 0.5 * u); s.material.opacity = 0.7 * (1 - u); });
    } else if (ev.style === 'ink' || ev.style === 'sweep') {
      const t = ev.tilt || 0;
      const y = ev.low ? 0.22 : Math.abs(t) > 60 ? 0.75 : 0.55;
      slash3d(ev.x, ev.z, ev.dx, ev.dz, ev.r + 0.15, ev.half, col, { tilt: t, y, side: ev.side || (t < 0 ? -1 : 1), ink: ev.style === 'ink', op: ev.strong ? 0.8 : 0.62, life: ev.style === 'ink' ? 0.42 : 0.32, w: ev.style === 'ink' ? 0.3 : 0.36 });
    } else arc(ev.x, ev.z, ev.dx, ev.dz, ev.r, ev.half, col, { side: ev.side || 1, y: ev.rising ? 0.65 : 0.5, op: ev.strong ? 0.8 : 0.55 });
  });
  bus.on('review_af_strong', (ev) => {
    const f = fox();
    if (f) {
      // a small spark at the blade's reach, clear of his body (Kesh 20:13: the old flash sat on him)
      const s = sprite(CRIMSON, 0.5, true);
      s.scale.setScalar(0.3);
      s.position.set(f.x + ev.dx * 1.2, 0.6, f.z + ev.dz * 1.2);
      add(s, 0.15, (u) => { s.material.opacity = 0.5 * (1 - u); s.scale.setScalar(0.3 + u * 0.25); });
    }
  });
  bus.on('review_af_thrust', (ev) => {
    strip(ev.x, ev.z, ev.x + ev.dx * ev.len, ev.z + ev.dz * ev.len, EC.earth, { life: 0.3, op: 0.6, w: 0.16, y: 0.5 });
    if (ev.dashed) label('dash strike', EC.earth, ev.x, 1.6, ev.z, { life: 0.9, size: 0.3 });
  });
  bus.on('review_af_bash', (ev) => {
    ring(ev.x, ev.z, 0.5, EC.earth, { life: 0.3, y: 0.5 });
    chunks(ev.x, ev.z, { n: 4, r: 0.4, up: 1.2, size: 0.6 });
    if (ev.dashed) label('dash strike', EC.earth, ev.x, 1.6, ev.z, { life: 0.9, size: 0.3 });
  });
  bus.on('review_af_slash', (ev) => {
    const e = byId(ev.id);
    const x = e ? e.x : ev.x, z = e ? e.z : ev.z;
    const a = rnd() * Math.PI;
    strip(x - Math.cos(a) * 0.4, z - Math.sin(a) * 0.4, x + Math.cos(a) * 0.4, z + Math.sin(a) * 0.4, ev.el ? EC[ev.el] : CRIMSON, { life: 0.22, w: 0.07, y: 0.7, op: 0.8 });
  });
  bus.on('review_af_finisher', (ev) => {
    const f = fox();
    if (f) label(`${ev.count} count → ${ev.dmg}`, GOLD, f.x, 1.75, f.z, { life: 1.1, size: 0.3 });
  });
  bus.on('review_af_queued', () => {
    const f = fox();
    if (f) label('Lunge on the way', EC.earth, f.x, 1.7, f.z, { life: 0.6, size: 0.28 });
  });

  // ---- sword waves ----
  bus.on('review_af_wave', (ev) => waveLook(ev));
  bus.on('review_af_wavepos', (ev) => {
    const it = waves.get(ev.id);
    if (!it) return;
    it.g.position.set(ev.x, 0, ev.z);
    // the thrown sword's glow shows only once it is clear of his body (Kesh 20:13)
    if (it.ev.kind === 'throw') it.g.visible = Math.hypot(ev.x - it.ev.x, ev.z - it.ev.z) > 0.9;
    if (it.ev.el === 'fire' && rnd() < 0.5) puff(ev.x, ev.z, { n: 1, r: 0.1, color: SMOKE, h: 0.5, y: 0.5, size: 0.3, op: 0.3, life: 0.6 });
    if (it.ev.kind === 'blaze') puff(ev.x + (rnd() - 0.5) * 0.3, ev.z + (rnd() - 0.5) * it.ev.w, { n: 1, r: 0.1, color: AMBER, h: 0.8, y: 0.2, size: 0.35, op: 0.5, life: 0.4 });
    if (it.g.userData.skim && rnd() < 0.7) puff(ev.x - it.ev.dx * 0.2 + (rnd() - 0.5) * it.ev.dz * it.ev.w, ev.z - it.ev.dz * 0.2 + (rnd() - 0.5) * it.ev.dx * it.ev.w, { n: 1, r: 0.05, color: EC[it.ev.el] || AQUA, h: 0.35, y: 0.05, size: 0.22, op: 0.4, life: 0.4 });
    if (it.ev.kind === 'flood') puff(ev.x, ev.z + (rnd() - 0.5) * it.ev.w, { n: 1, r: 0.1, color: AQUA, h: 0.5, y: 0.3, size: 0.3, op: 0.4, life: 0.4 });
  });
  bus.on('review_af_wave_end', (ev) => {
    const it = waves.get(ev.id);
    if (!it) return;
    waves.delete(ev.id);
    const g = it.g;
    add(g, 0.18, (u) => g.traverse((o) => { if (o.material) o.material.opacity *= 0.7; }));
    if (it.ev.kind === 'stone') chunks(ev.x, ev.z, { n: 6, r: 0.6 });
  });

  // ---- effects on foes ----
  const HEAD = 1.0;
  function onFoe(kind, id, life, build) {
    const k = kind + ':' + id;
    const old = keyed.get(k);
    if (old) kill(old);
    const g = new Group();
    const upd = build(g);
    const it = add(g, life, (u, t, dt) => {
      const e = byId(id);
      if (!e || !(e.hp > 0)) { it.t = it.life; return; }
      g.position.set(e.x, e.reviewY || 0, e.z);
      upd(u, t, dt, e);
    }, k);
    keyed.set(k, it);
    return it;
  }
  bus.on('review_af_burn', (ev) => {
    if (!ev.on) {
      const it = keyed.get('burn:' + ev.id);
      if (it) kill(it);
      return;
    }
    if (keyed.get('burn:' + ev.id) && keyed.get('burn:' + ev.id).t < keyed.get('burn:' + ev.id).life) return;
    // 2.0 (kit 2.0 K2): the scar 剑痕, a gold line on the foe; each tick a small ghost blade
    // flashes in and cuts along it (no flames, no smoke)
    onFoe('burn', ev.id, 99, (g) => {
      const a = rnd() * Math.PI, tilt = 0.5 + rnd() * 0.6;
      const line = new Group();
      line.position.y = 0.62;
      line.rotation.set(0, a, tilt);
      const core = new Mesh(new PlaneGeometry(0.62, 0.035), basic('#FFFFFF', 0.8, true));
      const glow = new Mesh(new PlaneGeometry(0.66, 0.11), basic(GOLD, 0.55, true));
      line.add(glow, core);
      const ghost = new Mesh(new BoxGeometry(0.42, 0.02, 0.06), basic(GOLD, 0.0, true));
      line.add(ghost);
      g.add(line);
      let tick = 0.25;
      return (u, t, dt) => {
        line.rotation.y = a + Math.sin(t * 1.3) * 0.08;
        glow.material.opacity = 0.28 + 0.1 * Math.sin(t * 7);
        tick += dt;
        const k = (tick % 0.5) / 0.5;
        // the ghost blade sweeps the line's length in the first fifth of each tick
        const sw = Math.min(1, k / 0.2);
        ghost.position.x = -0.4 + 0.8 * sw;
        ghost.material.opacity = k < 0.2 ? 0.5 * Math.sin(Math.PI * sw) : 0;
        core.material.opacity = 0.4 + 0.4 * (k < 0.25 ? 1 - k / 0.25 : 0);
      };
    });
    const e = byId(ev.id);

  });
  const fanLbl = new Map();
  bus.on('review_af_fan', (ev) => {
    const src = byId(ev.id);
    for (const id of ev.to) {
      const e = byId(id);
      if (!e || !src) continue;
      strip(src.x, src.z, e.x, e.z, GOLD, { life: 0.35, op: 0.65, w: 0.14, y: 0.7, grow: 0.5 });
      puff(e.x, e.z, { n: 3, r: 0.2, color: AMBER, h: 0.6, y: 0.6, size: 0.3, op: 0.5, life: 0.4 });
    }
    // one label for each foe once a second (the wheel spreads on every tick)
    const now = performance.now();
    if (src && now - (fanLbl.get(src.id) || -1e9) > 1000) { fanLbl.set(src.id, now); label('scar spread', GOLD, src.x, 1.7, src.z, { life: 0.8, size: 0.28 }); }
  });
  bus.on('review_af_quench', (ev) => {
    ring(ev.x, ev.z, 0.7, AQUA, { life: 0.5, op: 0.6, y: 0.6 });
    ring(ev.x, ev.z, 0.4, GOLD, { life: 0.3, op: 0.6, y: 0.6, inward: true });
    label('settled', '#C9F4FB', ev.x, 1.75, ev.z, { life: 0.9, size: 0.28 });
  });
  bus.on('review_af_stun', (ev) => {
    onFoe('stun', ev.id, ev.secs, (g) => {
      const pips = [];
      // 2.0: the daunt 震慑, three small bronze blades pointing in at the head, turning
      for (let i = 0; i < 3; i++) {
        const m = new Mesh(new BoxGeometry(0.02, 0.02, 0.16), basic('#D9B98A', 0.9, true));
        g.add(m);
        pips.push(m);
      }
      const halo = new Mesh(new RingGeometry(0.26, 0.29, 32), basic('#B08A5E', 0.6, true));
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = HEAD + 0.1;
      g.add(halo);
      return (u, t) => pips.forEach((m, i) => {
        const a = t * 4 + (i * Math.PI * 2) / 3;
        m.position.set(Math.cos(a) * 0.3, HEAD + 0.1, Math.sin(a) * 0.3);
        m.lookAt(g.position.x, g.position.y + HEAD + 0.1, g.position.z);
        m.visible = u < 0.98;
        halo.material.opacity = 0.3 * (1 - sm(0.85, 1, u));
      });
    });
  });
  bus.on('review_af_slow', (ev) => {
    // 2.0: stillness 凝滞, a still pale ring at the feet and one slow ripple out of it
    onFoe('slow', ev.id, ev.secs, (g) => {
      const still = new Mesh(new RingGeometry(0.42, 0.46, 48), basic(AQUA, 0.6));
      still.rotation.x = -Math.PI / 2;
      still.position.y = 0.04;
      const rip = new Mesh(new RingGeometry(0.95, 1, 48), basic(AQUA, 0.4));
      rip.rotation.x = -Math.PI / 2;
      rip.position.y = 0.035;
      g.add(still, rip);
      return (u, t) => {
        const k = (t % 1.2) / 1.2;
        rip.scale.setScalar(0.45 + 0.4 * k);
        rip.material.opacity = 0.4 * (1 - k) * (1 - sm(0.85, 1, u));
        still.material.opacity = 0.6 * (1 - sm(0.85, 1, u));
      };
    });
  });
  bus.on('review_af_blind', (ev) => {
    onFoe('blind', ev.id, ev.secs, (g) => {
      const band = new Mesh(new CylinderGeometry(0.2, 0.2, 0.09, 16, 1, true), basic('#2A2826', 0.8));
      band.position.y = 0.85;
      g.add(band);
      return (u) => { band.material.opacity = 0.8 * (1 - sm(0.8, 1, u)); };
    });
  });
  bus.on('review_af_mark', (ev) => {
    onFoe('mark', ev.id, ev.secs, (g) => {
      const m = new Mesh(crescentGeo(0.36, 0.12), basic(AQUA, 0.8));
      m.position.y = HEAD + 0.28;
      g.add(m);
      return (u, t) => { m.rotation.y = t * 2; m.material.opacity = 0.8 * (1 - sm(0.85, 1, u)); };
    });
  });
  bus.on('review_af_frozen', (ev) => {
    onFoe('frozen', ev.id, ev.secs, (g) => {
      const m = new Mesh(new CylinderGeometry(0.26, 0.3, 1.0, 8), basic('#C9F4FB', 0.35));
      m.position.y = 0.5;
      g.add(m);
      return (u) => { m.material.opacity = 0.35 * (1 - sm(0.8, 1, u)); };
    });
  });
  bus.on('review_af_stuck', (ev) => {
    onFoe('stuck', ev.id, ev.secs, (g) => {
      const m = new Mesh(ringGeo, basic('#6B5236', 0.8));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.04;
      m.scale.setScalar(0.4);
      g.add(m);
      return () => {};
    });
  });
  bus.on('review_af_coldedge', (ev) => {
    const e = byId(ev.id);
    if (e) { ring(e.x, e.z, 0.5, AQUA, { life: 0.3, y: 0.6 }); }
  });
  bus.on('review_af_lift', (ev) => {
    const e = byId(ev.id);
    if (e) puff(e.x, e.z, { n: 5, r: 0.35, color: '#9C978E', h: 0.3, life: 0.5, op: 0.4 });
  });
  bus.on('review_af_spike', (ev) => {
    ring(ev.x, ev.z, ev.r, GOLD, { life: 0.4, op: 0.6 });
    chunks(ev.x, ev.z, { n: 6, r: 0.6 });
    label('spike', GOLD, ev.x, 1.7, ev.z, { life: 0.8, size: 0.3 });
  });
  bus.on('review_af_bat', (ev) => {
    const e = byId(ev.id);
    if (e) label('batted', EC.earth, e.x, 1.7, e.z, { life: 0.8, size: 0.3 });
  });
  bus.on('review_af_shards', (ev) => chunks(ev.x, ev.z, { n: 7, r: ev.r * 0.9, up: 1.4 }));
  bus.on('review_af_razor', (ev) => {
    for (const id of ev.ids) {
      const e = byId(id);
      if (!e) continue;
      const a = rnd() * Math.PI;
      strip(e.x - Math.cos(a) * 0.3, e.z - Math.sin(a) * 0.3, e.x + Math.cos(a) * 0.3, e.z + Math.sin(a) * 0.3, SILVER, { life: 0.18, w: 0.05, y: 0.6, op: 0.7 });
    }
  });

  // ---- rings, bursts, areas ----
  bus.on('review_af_ring', (ev) => {
    const col = ev.kind === 'steam' ? STEAM : EC[ev.el];
    if (ev.kind === 'pull') { ring(ev.x, ev.z, ev.r, SILVER, { life: 0.35, op: 0.5, inward: true }); return; }
    ring(ev.x, ev.z, ev.r, col, { life: ev.kind === 'flash' || ev.kind === 'firestorm' ? 0.55 : 0.45, op: 0.6 });
    if (ev.kind === 'quake') { chunks(ev.x, ev.z, { n: 12, r: ev.r * 0.8, up: 1.4 }); puff(ev.x, ev.z, { n: 10, r: ev.r, color: DEBRIS, h: 0.3 }); }
    if (ev.kind === 'steam') puff(ev.x, ev.z, { n: 16, r: ev.r, color: STEAM, h: 0.8, y: 0.4, size: 0.7, op: 0.45, life: 1.1 });
    if (ev.kind === 'firestorm') { puff(ev.x, ev.z, { n: 14, r: ev.r, color: AMBER, h: 0.5, y: 0.4, size: 0.45, op: 0.45, life: 0.6 }); ring(ev.x, ev.z, ev.r * 0.8, SILVER, { life: 0.5, op: 0.35 }); }
    if (ev.kind === 'flash') puff(ev.x, ev.z, { n: 10, r: ev.r * 0.8, color: AMBER, h: 0.4, y: 0.2, size: 0.3, op: 0.4, life: 0.5 });
    if (ev.kind === 'burst') puff(ev.x, ev.z, { n: 8, r: ev.r, color: SILVER, h: 0.5, y: 0.3, size: 0.25, op: 0.35, life: 0.5 });
  });
  bus.on('review_af_burst', (ev) => {
    ring(ev.x, ev.z, ev.r, EC[ev.el], { life: 0.4, op: 0.65 });
    if (ev.el === 'fire') puff(ev.x, ev.z, { n: ev.small ? 5 : 9, r: ev.r * 0.7, color: AMBER, h: 0.7, y: 0.4, size: 0.4, op: 0.5, life: 0.5 });
    if (ev.el === 'earth') { chunks(ev.x, ev.z, { n: ev.sand ? 10 : 5, r: ev.r * 0.7 }); puff(ev.x, ev.z, { n: 8, r: ev.r, color: OCHRE, h: 0.4, op: 0.4 }); }
  });
  bus.on('review_af_crack', (ev) => {
    if (ev.look === 'rift') { rift20(ev); return; }
    const n = 10;
    for (let i = 0; i < n; i++) {
      const u = (i + 1) / n;
      setTimeout(() => {
        const x = ev.x + ev.dx * ev.len * u, z = ev.z + ev.dz * ev.len * u;
        const j = (rnd() - 0.5) * 0.2;
        const px = ev.x + ev.dx * ev.len * (u - 1 / n) - ev.dz * j, pz = ev.z + ev.dz * ev.len * (u - 1 / n) + ev.dx * j;
        strip(px, pz, x, z, '#2B241E', { life: 1.4, op: 0.85, w: 0.1, y: 0.02 });
        strip(px, pz, x, z, OCHRE, { life: 0.5, op: 0.6, w: 0.05, y: 0.025 });
        chunks(x, z, { n: 2, r: 0.3, up: 1.4, size: 0.7 });
      }, ev.secs * 1000 * u);
    }
  });
  const zones = new Map();
  bus.on('review_af_zone', (ev) => {
    const old = zones.get(ev.id);
    if (old) { old.r = ev.r; old.g.scale.setScalar(ev.r); if (ev.kicked) { chunks(ev.x, ev.z, { n: 8, r: ev.r, up: 1 }); label('kicked', EC.earth, ev.x, 1.4, ev.z, { life: 0.8, size: 0.3 }); } return; }
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(ev.r);
    if (ev.kind === 'caltrops') {
      // 2.0: iron caltrops, small blades standing in the floor (no stone)
      const d = new Mesh(new RingGeometry(0.92, 1, 48), basic('#B08A5E', 0.35));
      d.rotation.x = -Math.PI / 2;
      d.position.y = 0.02;
      g.add(d);
      for (let i = 0; i < 14; i++) {
        const c = new Mesh(new ConeGeometry(0.035, 0.16, 3), new MeshStandardMaterial({ color: i % 3 ? '#5E6068' : '#8C8F99', flatShading: true, roughness: 0.4, metalness: 0.6 }));
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.9;
        c.position.set(Math.cos(a) * r, 0.07, Math.sin(a) * r);
        c.rotation.set((rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5);
        g.add(c);
      }
    } else if (ev.kind === 'magma') {
      const d = new Mesh(discGeo, basic('#4A2E1C', 0.7));
      d.rotation.x = -Math.PI / 2;
      d.position.y = 0.02;
      g.add(d);
      const glow = new Mesh(discGeo, basic(AMBER, 0.16, true));
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.025;
      glow.scale.setScalar(0.8);
      g.add(glow);
      for (let i = 0; i < 7; i++) {
        const a = rnd() * Math.PI * 2;
        const s = new Mesh(new PlaneGeometry(0.7, 0.035), basic(GOLD, 0.55, true));
        s.rotation.set(-Math.PI / 2, 0, a);
        s.position.set(Math.cos(a) * 0.4, 0.03, Math.sin(a) * 0.4);
        g.add(s);
      }
    } else if (ev.kind === 'mud') {
      const d = new Mesh(discGeo, basic('#4E3B28', 0.8));
      d.rotation.x = -Math.PI / 2;
      d.position.y = 0.02;
      g.add(d);
      for (let i = 0; i < 6; i++) {
        const b = new Mesh(new CircleGeometry(0.08, 10), basic('#6B5236', 0.9));
        b.rotation.x = -Math.PI / 2;
        b.position.set((rnd() - 0.5) * 1.4, 0.03, (rnd() - 0.5) * 1.4);
        g.add(b);
      }
    }
    root.add(g);
    const z = { g, r: ev.r, t: 0 };
    zones.set(ev.id, z);
    g.traverse((o) => { if (o.material) o.userData.op = o.material.opacity; });
    z.it = add(new Group(), 99, (u, t) => {
      if (ev.kind === 'magma') g.traverse((o) => { if (o.material && o.material.blending === AdditiveBlending) o.material.opacity = o.userData.op * (0.6 + 0.4 * Math.sin(t * 5 + o.position.x * 9)); });
    });
  });
  bus.on('review_af_zone_end', (ev) => {
    const z = zones.get(ev.id);
    if (!z) return;
    zones.delete(ev.id);
    kill(z.it);
    add(z.g, 0.3, (u) => z.g.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ?? 1) * (1 - u); }));
  });
  bus.on('review_af_rain', (ev) => ring(ev.x, ev.z, ev.r, AQUA, { life: ev.secs + 0.3, from: 1, op: 0.35 }));
  bus.on('review_af_blade', (ev) => {
    const g = new Group();
    const b = new Mesh(new BoxGeometry(0.04, 0.6, 0.1), basic(AQUA, 0.75, true));
    g.add(b);
    g.position.set(ev.x, 2.2, ev.z);
    add(g, 0.2, (u) => { g.position.y = 2.2 - 1.8 * u; });
    setTimeout(() => { ring(ev.x, ev.z, 0.35, AQUA, { life: 0.3 }); puff(ev.x, ev.z, { n: 3, r: 0.2, color: AQUA, h: 0.4, op: 0.5, size: 0.18, life: 0.4 }); }, 200);
  });
  bus.on('review_af_cone', (ev) => {
    const th = (ev.half * Math.PI) / 180;
    const g = new RingGeometry(0.2, ev.len, 32, 1, -th, 2 * th);
    const m = new Mesh(g, basic('#C9F4FB', 0.45, true));
    m.rotation.set(-Math.PI / 2, 0, Math.atan2(ev.dx, ev.dz) - Math.PI / 2);
    m.position.set(ev.x, 0.06, ev.z);
    add(m, 0.7, (u) => { m.material.opacity = 0.45 * (1 - u); m.scale.setScalar(0.4 + 0.6 * Math.min(1, u * 4)); });
    puff(ev.x + ev.dx * 2, ev.z + ev.dz * 2, { n: 10, r: 1.4, color: '#C9F4FB', h: 0.3, y: 0.3, size: 0.4, op: 0.4 });
  });
  bus.on('review_af_sand', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    for (let i = 0; i < 3; i++) {
      const m = new Mesh(new RingGeometry(0.75, 1, 48, 1, 0, Math.PI * 1.2), basic(OCHRE, 0.5));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.1 + i * 0.25;
      g.add(m);
    }
    add(g, ev.secs, (u, t) => {
      g.children.forEach((m, i) => { m.rotation.z = t * (6 + i * 2); m.scale.setScalar(ev.r * (1 - 0.6 * u) * (1 - i * 0.12)); });
      if (rnd() < 0.5) puff(ev.x + (rnd() - 0.5) * ev.r * 1.5 * (1 - u), ev.z + (rnd() - 0.5) * ev.r * 1.5 * (1 - u), { n: 1, r: 0.3, color: OCHRE, h: 0.4, op: 0.4, size: 0.4, life: 0.5 });
    });
  });
  const whirls = new Map();
  bus.on('review_af_whirl', (ev) => {
    let w = whirls.get(ev.id);
    if (ev.on === false) {
      if (w) { whirls.delete(ev.id); kill(w.it); root.remove(w.g); puff(ev.x, ev.z, { n: 8, r: 0.8, color: w.col, h: 0.5, op: 0.35 }); }
      return;
    }
    if (!w) {
      const g = new Group();
      g.position.set(ev.x, 0, ev.z);
      const n = ev.wheel ? 0 : ev.tornado ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const m = new Mesh(new RingGeometry(0.7, 1, 40, 1, 0, Math.PI * 1.3), basic(SILVER, ev.tornado ? 0.2 : 0.45, true));
        m.rotation.x = -Math.PI / 2;
        m.position.y = 0.15 + i * (ev.tornado ? 0.35 : 0.25);
        g.add(m);
      }
      // 2.0 Blade Wheel (M23): a wheel of ghost blades turning flat, its blades circling
      if (ev.wheel) g.add(bladeWheel(SILVER, 6, 0.85));
      root.add(g);
      w = { g, r: ev.r, col: SILVER, tornado: !!ev.tornado };
      w.it = add(new Group(), 99, (u, t) => {
        if (ev.wheel) { const W = w.g.children[0]; W.rotation.y = -t * 11; W.scale.setScalar(w.r); return; }
        w.g.children.forEach((m, i) => { m.rotation.z = -t * (9 + i * 2); m.scale.setScalar(w.r * (w.tornado ? 0.6 + i * 0.13 : 1 - i * 0.12)); });
      });
      whirls.set(ev.id, w);
    }
    if (ev.el) {
      w.col = EC[ev.el];
      w.g.traverse((o) => { if (o.material) o.material.color.set(w.col); });
      label(WILL[ev.el] || ev.el, w.col, w.g.position.x, 1.6, w.g.position.z, { life: 0.8, size: 0.3 });
    }
  });
  bus.on('review_af_whirlpos', (ev) => { const w = whirls.get(ev.id); if (w) w.g.position.set(ev.x, 0, ev.z); });
  // Blade Storm: blades whirl round him while he spins
  bus.on('review_af_storm', (ev) => {
    const g = new Group();
    for (let i = 0; i < 3; i++) {
      const m = new Mesh(new RingGeometry(0.85, 1.0, 40, 1, 0, Math.PI * 0.5), basic(SILVER, 0.45, true));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.4 + i * 0.12;
      g.add(m);
    }
    let fire = false;
    const off = bus.on && null;
    void off;
    g.userData.setFire = () => { fire = true; g.traverse((o) => { if (o.material) o.material.color.set(GOLD); }); };
    window.__afStorm = g;
    add(g, ev.secs, (u, t) => {
      const f = fox();
      if (f) g.position.set(f.x, 0, f.z);
      g.children.forEach((m, i) => { m.rotation.z = -t * 22 - i * 2; });
      g.traverse((o) => { if (o.material) o.material.opacity = 0.22 * (1 - sm(0.8, 1, u)); });
      if (fire && f && rnd() < 0.6) puff(f.x, f.z, { n: 1, r: 1.0, color: AMBER, h: 0.5, y: 0.5, size: 0.3, op: 0.45, life: 0.4 });
    });
  });
  bus.on('review_af_firespin', () => { if (window.__afStorm) window.__afStorm.userData.setFire(); });

  // ---- Mirror Image ----
  let image = null;
  bus.on('review_af_image', (ev) => {
    if (ev.on) {
      const st = window.__tripoFox;
      const g = st && st.snapshot ? st.snapshot(basic(AQUA, 0.5)) : null;
      if (!g) return;
      g.position.x = ev.x;
      g.position.z = ev.z;
      const wheel = ev.v20 ? ghostSword(AQUA, 0.55) : null;
      image = add(g, 99, (u, t) => {
        g.traverse((o) => { if (o.material) o.material.opacity = 0.42 + 0.08 * Math.sin(t * 3); });
        if (wheel) {
          // 剑花: a slow wheel of the sword in front of the image
          const fd = new Vector3(0, 0, 1).applyQuaternion(g.quaternion);
          wheel.position.set(g.position.x + fd.x * 0.28 + fd.z * 0.12, 0.55, g.position.z + fd.z * 0.28 - fd.x * 0.12);
          wheel.rotation.set(0, Math.atan2(fd.x, fd.z), t * 4.5);
        }
      });
      if (wheel) { const me = image; const wi = add(wheel, 99, () => { if (image !== me || me.t >= me.life) wi.t = wi.life; }); }
      ring(ev.x, ev.z, 0.7, AQUA, { life: 0.4 });
    } else {
      if (image) kill(image);
      image = null;
      ring(ev.x, ev.z, ev.r || 2, AQUA, { life: 0.45, op: 0.7 });
      // 2.0: a ring of mirror shards
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rnd() * 0.3;
        const m = new Mesh(new PlaneGeometry(0.12, 0.2), basic(i % 2 ? '#FFFFFF' : AQUA, 0.8, true));
        const v = new Vector3(Math.cos(a), 0.25 + rnd() * 0.3, Math.sin(a)).multiplyScalar(3 + rnd());
        const p = new Vector3(ev.x, 0.6, ev.z);
        add(m, 0.45, (u, t, dt) => { p.addScaledVector(v, dt); v.multiplyScalar(1 - 3 * dt); m.position.copy(p); m.rotation.set(t * 9, t * 7 + a, 0); m.material.opacity = 0.8 * (1 - u); });
      }
      label('burst', AQUA, ev.x, 1.6, ev.z, { life: 0.8, size: 0.3 });
    }
  });
  bus.on('review_af_imagetaunt', (ev) => {
    for (const id of ev.ids) {
      const e = byId(id);
      if (e) strip(e.x, e.z, ev.x, ev.z, AQUA, { life: 0.8, op: 0.35, w: 0.05, y: 0.08 });
    }
  });
  bus.on('review_af_imagecast', (ev) => ring(ev.x, ev.z, 0.6, AQUA, { life: 0.3, y: 0.5 }));

  // ---- Riposte and the shot ----
  let parryRing = null;
  bus.on('review_af_parry', (ev) => {
    if (ev.on) {
      const m = new Mesh(new RingGeometry(0.5, 0.58, 40), basic(EC.earth, 0.7));
      m.rotation.x = -Math.PI / 2;
      parryRing = add(m, ev.secs, (u) => { const f = fox(); if (f) m.position.set(f.x, 0.5, f.z); m.material.opacity = 0.7 * (1 - sm(0.8, 1, u)); });
    } else {
      if (parryRing) kill(parryRing);
      if (ev.caught) { ring(ev.x, ev.z, 0.9, EC.earth, { life: 0.3, y: 0.6, op: 0.8 }); ring(ev.x, ev.z, 0.6, '#FFFFFF', { life: 0.15, y: 0.6, op: 0.7 }); label('parried', EC.earth, ev.x, 1.7, ev.z, { life: 0.8, size: 0.3 }); }
    }
  });
  const shots = new Map();
  bus.on('review_af_shot', (ev) => {
    const s = new Mesh(new SphereGeometry(0.1, 10, 8), basic(FOE, 0.9));
    const h = sprite(FOE, 0.5, true);
    h.scale.setScalar(0.4);
    s.add(h);
    s.position.set(ev.x, 0.7, ev.z);
    root.add(s);
    shots.set(ev.id, s);
  });
  bus.on('review_af_shotpos', (ev) => { const s = shots.get(ev.id); if (s) s.position.set(ev.x, 0.7, ev.z); });
  bus.on('review_af_shot_end', (ev) => { const s = shots.get(ev.id); if (s) { root.remove(s); shots.delete(ev.id); } });

  // ---- walls ----
  const walls = [];
  bus.on('review_af_wall', (ev) => {
    const m = new Mesh(new BoxGeometry(ev.w, 1.1, ev.d), new MeshStandardMaterial({ color: '#7E7A72', roughness: 1, flatShading: true }));
    m.position.set(ev.x, 0.55, ev.z);
    root.add(m);
    walls.push(m);
  });
  bus.on('review_af_wallslam', (ev) => {
    puff(ev.x, ev.z, { n: 10, r: 0.6, color: '#9C978E', h: 0.6, y: 0.4, op: 0.5 });
    chunks(ev.x, ev.z, { n: 6, r: 0.5, up: 1.6 });
    label('wall slam', SILVER, ev.x, 1.7, ev.z, { life: 0.9, size: 0.3 });
  });

  // ---- mixes and passives ----
  const MIXC = { Blaze: GOLD, Quake: EC.earth, Flood: AQUA, Tornado: SILVER, Firestorm: GOLD, Magma: GOLD, Steam: STEAM, Mud: EC.earth, Sandstorm: EC.earth, Frost: '#C9F4FB' };
  bus.on('review_af_mix', (ev) => {
    label(ev.name, MIXC[ev.name] || SILVER, ev.x, 1.9, ev.z, { life: 1.4, size: 0.42, rise: 0.3 });
    ring(ev.x, ev.z, 0.6, MIXC[ev.name] || SILVER, { life: 0.3, y: 0.6 });
  });
  bus.on('review_af_passive', () => {});

  // ---- 1.5: the sword throw on the last basic hit (S11) ----
  bus.on('review_af_throw', (ev) => {
    cue('throwOut', ev);
    const c = ev.el ? EC[ev.el] : SILVER;
    const ex = ev.x + ev.dx * ev.len, ez = ev.z + ev.dz * ev.len;
    // it whirls on the spot: two spinning arcs and a small vortex on the floor
    const g = new Group();
    g.position.set(ex, 0, ez);
    for (let i = 0; i < 2; i++) {
      const m = new Mesh(new RingGeometry(0.45 + i * 0.25, 0.55 + i * 0.25, 40, 1, 0, Math.PI * 1.2), basic(i ? c : SILVER, 0.5, true));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.1 + i * 0.35;
      g.add(m);
    }
    g.visible = false;
    add(g, ev.out + ev.hold + 0.05, (u, t) => {
      g.visible = t >= ev.out;
      g.children.forEach((m, i) => { m.rotation.z = -t * (14 + i * 4); m.scale.setScalar(0.8 + 0.4 * Math.min(1, (t - ev.out) / ev.hold)); });
    });
  });
  bus.on('review_af_throwburst', (ev) => {
    const c = ev.el ? EC[ev.el] : SILVER;
    ring(ev.x, ev.z, ev.r, c, { life: 0.5, op: 0.75 });
    ring(ev.x, ev.z, ev.r * 0.6, SILVER, { life: 0.35, op: 0.5, y: 0.5 });
    const fl = sprite(c, 0.6, true);
    fl.position.set(ev.x, 0.55, ev.z);
    add(fl, 0.3, (u) => { fl.scale.setScalar(0.6 + 1.6 * u); fl.material.opacity = 0.6 * (1 - u); });
    puff(ev.x, ev.z, { n: 10, r: ev.r * 0.8, color: ev.el === 'earth' ? DEBRIS : c, h: 0.5, y: 0.4, size: 0.25, op: 0.45, life: 0.5 });
    if (ev.el === 'earth') chunks(ev.x, ev.z, { n: 5, r: 0.8 });
    if (ev.el) label(WILL[ev.el], c, ev.x, 1.5, ev.z, { life: 0.9, size: 0.28 });
  });

  // ---- 1.5: Earthsplitter (S23) ----
  let chargeIt = null;
  bus.on('review_af_charge', (ev) => {
    cue('play', { clip: 'chargeHold', from: 0 });
    cue('swordScale', { to: 1.8, secs: ev.full });
    cue('edge', { el: 'earth', secs: ev.full + 0.6 });
    const m = new Mesh(new RingGeometry(0.94, 1, 64), basic(EC.earth, 0.45));
    m.rotation.x = -Math.PI / 2;
    m.position.set(ev.x, 0.04, ev.z);
    let last = 0;
    chargeIt = add(m, ev.full + 0.6, (u, t) => {
      const k = Math.min(1, t / ev.full);
      m.scale.setScalar(ev.r0 + (ev.r1 - ev.r0) * k);
      m.material.opacity = 0.25 + 0.25 * k;
      const f = fox();
      if (f && t - last > 0.12) { last = t; puff(f.x, f.z, { n: 2, r: 0.5, color: DEBRIS, h: 0.7, y: 0.05, size: 0.14, op: 0.5, life: 0.6 }); }
    });
  });
  bus.on('review_af_slam', (ev) => {
    if (ev.phase === 'swing') { cue('play', { clip: 'slam', from: 0 }); return; }
    if (chargeIt) kill(chargeIt);
    chargeIt = null;
    cue('swordScale', { to: 1, secs: 0.45 });
    const r = ev.r;
    ring(ev.x, ev.z, r, EC.earth, { life: 0.55, op: 0.8 });
    disc(ev.x, ev.z, r, EC.earth, 0.16, 0.6);
    ring(ev.x, ev.z, r * 0.55, '#FFFFFF', { life: 0.25, op: 0.6 });
    chunks(ev.x, ev.z, { n: 8 + Math.round(8 * ev.f), r: r * 0.6, up: 2.6 });
    puff(ev.x, ev.z, { n: 14, r: r * 0.9, color: DEBRIS, h: 0.5, y: 0.1, size: 0.4, op: 0.45, life: 0.8 });
    // cracks run out from the blow, and a fissure runs ahead along his aim
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd() * 0.5;
      strip(ev.x, ev.z, ev.x + Math.cos(a) * r, ev.z + Math.sin(a) * r, '#3A2C20', { life: 1.1, op: 0.8, w: 0.06, y: 0.045, grow: 0.15 });
    }
    strip(ev.x, ev.z, ev.x + ev.dx * r * 1.6, ev.z + ev.dz * r * 1.6, '#3A2C20', { life: 1.3, op: 0.85, w: 0.22, y: 0.046, grow: 0.2 });
    strip(ev.x, ev.z, ev.x + ev.dx * r * 1.6, ev.z + ev.dz * r * 1.6, EC.earth, { life: 1.0, op: 0.5, w: 0.07, y: 0.05, grow: 0.2 });
    label(ev.f > 0.95 ? 'full charge' : ev.f < 0.1 ? 'quick slam' : Math.round(ev.f * 100) + '% charge', EC.earth, ev.x, 1.7, ev.z, { life: 1.0, size: 0.3 });
  });
  bus.on('review_af_smash', (ev) => { ring(ev.x, ev.z, 1, EC.earth, { life: 0.4 }); label('smash', EC.earth, ev.x, 1.5, ev.z, { life: 0.8, size: 0.3 }); });

  // ---- 1.5: Tide Ring (S30) ----
  let tide = null;
  bus.on('review_af_tidering', (ev) => {
    if (ev.on) {
      const g = new Group();
      g.position.set(ev.x, 0, ev.z);
      const edgeM = new Mesh(new RingGeometry(ev.r - 0.06, ev.r, 96), basic(AQUA, 0.7));
      edgeM.rotation.x = -Math.PI / 2;
      edgeM.position.y = 0.04;
      g.add(edgeM);
      const fill = new Mesh(discGeo, basic(AQUA, 0.1));
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = 0.035;
      fill.scale.setScalar(ev.r);
      g.add(fill);
      root.add(g);
      const st = window.__tripoFox;
      const imgs = ev.pts.map(([x, z]) => {
        const im = st && st.snapshot ? st.snapshot(basic(AQUA, 0.45)) : null;
        if (!im) return null;
        im.position.x = x;
        im.position.z = z;
        im.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(ev.x - x, ev.z - z));
        root.add(im);
        ring(x, z, 0.4, AQUA, { life: 0.35 });
        return im;
      });
      tide = { g, imgs, it: add(new Group(), 99, (u, t) => { edgeM.material.opacity = Math.min(0.7, t * 3); }) };
    } else if (tide) {
      const T = tide;
      tide = null;
      kill(T.it);
      add(T.g, 0.3, (u) => T.g.traverse((o) => { if (o.material) o.material.opacity *= 0.8; }));
      for (const im of T.imgs) if (im) root.remove(im);
    }
  });
  bus.on('review_af_ringthrust', (ev) => {
    if (!tide) return;
    const im = tide.imgs[ev.k - 1];
    strip(ev.x0, ev.z0, ev.x1, ev.z1, AQUA, { life: 0.5, op: 0.6, w: 0.12, y: 0.5, grow: 0.5 });
    strip(ev.x0, ev.z0, ev.x1, ev.z1, '#C9F4FB', { life: 0.35, op: 0.5, w: 0.04, y: 0.52, grow: 0.5 });
    if (!im) return;
    tide.imgs[ev.k - 1] = null;
    const yaw = Math.atan2(ev.x1 - ev.x0, ev.z1 - ev.z0);
    im.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    add(im, 0.45, (u) => {
      const k = Math.min(1, u / 0.55);
      im.position.x = ev.x0 + (ev.x1 - ev.x0) * k;
      im.position.z = ev.z0 + (ev.z1 - ev.z0) * k;
      im.traverse((o) => { if (o.material) o.material.opacity = 0.45 * (1 - sm(0.6, 1, u)); });
    });
    later2(0.25, () => puff(ev.x1, ev.z1, { n: 6, r: 0.3, color: AQUA, h: 0.5, y: 0.3, size: 0.22, op: 0.5, life: 0.5 }));
  });
  const swordStand = (col) => {
    const g = new Group();
    const blade = new Mesh(new BoxGeometry(0.03, 0.55, 0.08), basic('#FFFFFF', 0.55, true));
    blade.position.y = 0.2;
    const guard = new Mesh(new BoxGeometry(0.03, 0.03, 0.22), basic(col, 0.6, true));
    guard.position.y = 0.48;
    const grip = new Mesh(new BoxGeometry(0.03, 0.14, 0.03), basic(col, 0.5, true));
    grip.position.y = 0.56;
    g.add(blade, guard, grip);
    return g;
  };
  bus.on('review_af_ringburst', (ev) => {
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2, rr = 0.6 + rnd() * (ev.r - 0.9);
      const x = ev.x + Math.cos(a) * rr * 0.5, z = ev.z + Math.sin(a) * rr * 0.5;
      arc(x, z, Math.cos(a + 1.6), Math.sin(a + 1.6), 0.9 + rnd() * 0.6, 70, i ? AQUA : '#C9F4FB', { life: 0.3, y: 0.4 + rnd() * 0.3, op: 0.8 });
    }
    ring(ev.x, ev.z, ev.r * (0.5 + 0.15 * ev.i), AQUA, { life: 0.3, op: 0.45, y: 0.3 });
  });
  bus.on('review_af_flower', (ev) => cue('flower', ev));

  // ---- 1.5 restyles from the copy-all refs ----
  // Crescent Finisher (5bsoG8vEr): a gold star on the floor where the rising cut lands
  bus.on('review_af_starburst', (ev) => {
    const c = EC[ev.el] || GOLD;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const L = i % 2 ? 0.7 : 1.2;
      strip(ev.x, ev.z, ev.x + Math.cos(a) * L, ev.z + Math.sin(a) * L, c, { life: 0.5, op: 0.65, w: i % 2 ? 0.05 : 0.09, y: 0.04, grow: 0.25 });
    }
    disc(ev.x, ev.z, 0.45, AMBER, 0.3, 0.45);
    const fl = sprite(c, 0.5, true);
    fl.position.set(ev.x, 0.3, ev.z);
    add(fl, 0.35, (u) => { fl.scale.setScalar(0.5 + 1.2 * u); fl.material.opacity = 0.5 * (1 - u); });
    puff(ev.x, ev.z, { n: 6, r: 0.4, color: AMBER, h: 0.9, y: 0.2, size: 0.18, op: 0.5, life: 0.6 });
  });
  // Blade Dance (Pi4PRflgB): wind blades rise round him and circle up
  const bladeGeo = new BoxGeometry(0.03, 0.45, 0.09);
  bus.on('review_af_bladesrise', (ev) => {
    const g = new Group();
    for (let i = 0; i < 6; i++) {
      const b = new Mesh(bladeGeo, basic(SILVER, 0.7, true));
      b.userData.a = (i / 6) * Math.PI * 2;
      g.add(b);
    }
    add(g, 0.8, (u, t) => {
      const f = fox();
      if (f) g.position.set(f.x, 0, f.z);
      g.children.forEach((b) => {
        const a = b.userData.a + t * 6;
        b.position.set(Math.cos(a) * ev.r, 0.1 + 1.3 * sm(0, 0.7, u), Math.sin(a) * ev.r);
        b.rotation.set(0, -a, 0.3);
        b.material.opacity = 0.35 * (1 - sm(0.6, 1, u));
      });
    });
    ring(ev.x, ev.z, ev.r, SILVER, { life: 0.5, op: 0.45, y: 0.04 });
  });
  // ---- 1.6: the four skills from the copy-all videos ----
  // the dash streak (Blazing Cascade's last dash, Skyblade Waltz's flash dash)
  bus.on('review_af_streak', (ev) => {
    if (ev.x1 !== undefined) { streak20(ev); return; }
    const c = EC[ev.el] || SILVER, flash = !!ev.flash;
    const x1 = ev.x + ev.dx * ev.dist, z1 = ev.z + ev.dz * ev.dist;
    strip(ev.x, ev.z, x1, z1, c, { life: flash ? 0.35 : 0.6, op: 0.55, w: flash ? 0.25 : 0.55, y: 0.45, grow: flash ? 0.2 : 0.35 });
    strip(ev.x, ev.z, x1, z1, '#FFFFFF', { life: flash ? 0.3 : 0.45, op: 0.6, w: 0.05, y: 0.46, grow: flash ? 0.2 : 0.35 });
    strip(ev.x, ev.z, x1, z1, c, { life: 0.7, op: 0.25, w: 0.14, y: 0.03, grow: 0.35 });
    if (flash) {
      const s = sprite('#FFFFFF', 0.7, true);
      s.position.set(x1, 0.5, z1);
      add(s, 0.25, (u) => { s.scale.set(1.6 * (1 - u) + 0.2, 0.25, 1); s.material.opacity = 0.7 * (1 - u); });
    } else {
      for (let i = 0; i < 5; i++) later2(0.04 * i, () => puff(ev.x + ev.dx * ev.dist * (i / 5), ev.z + ev.dz * ev.dist * (i / 5), { n: 2, r: 0.3, color: AMBER, h: 0.5, y: 0.4, size: 0.25, op: 0.45, life: 0.45 }));
      later2(0.18, () => slash3d(x1, z1, ev.dx, ev.dz, 1.0, 60, c, { tilt: 15, y: 0.5, life: 0.3, op: 0.7 }));
    }
    const st = window.__tripoFox;
    for (let i = 1; i <= 3; i++) later2(i * 0.05, () => {
      if (!st || !st.snapshot) return;
      const im = st.snapshot(basic(c, 0.22));
      if (im) add(im, 0.3, (u) => im.traverse((o) => { if (o.material) o.material.opacity = 0.22 * (1 - u); }));
    });
  });
  // Blazing Cascade's fire swirl (5bsoG8vEr 3.0 to 4.5 s): spinning arcs, a ring on the floor and spikes
  bus.on('review_af_swirl', (ev) => {
    const c = EC[ev.el] || GOLD;
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const arcs = [];
    for (let i = 0; i < 3; i++) {
      const m = new Mesh(new RingGeometry(0.7, 1, 40, 1, 0, Math.PI * 1.2), basic(c, 0.25, true));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.15 + i * 0.25;
      g.add(m);
      arcs.push(m);
    }
    const floor = new Group();
    const fr = new Mesh(new RingGeometry(0.94, 1, 64), basic(SILVER, 0.35));
    fr.rotation.x = -Math.PI / 2;
    fr.position.y = 0.03;
    floor.add(fr);
    for (let i = 0; i < 10; i++) {
      const sp = new Mesh(new BoxGeometry(0.015, 0.4, 0.07), basic(i % 2 ? c : '#FFFFFF', 0.4, true));
      const a = (i / 10) * Math.PI * 2;
      sp.position.set(Math.cos(a), 0.15, Math.sin(a));
      sp.rotation.set(0, -a, -Math.PI / 2 + 0.5);
      floor.add(sp);
    }
    g.add(floor);
    add(g, ev.secs + 0.15, (u, t) => {
      const k = sm(0, 0.25, u) * (1 - sm(0.85, 1, u));
      arcs.forEach((m, i) => { m.rotation.z = -t * (10 + i * 2); m.scale.setScalar(ev.r * (1 - i * 0.12) * (0.6 + 0.4 * k)); });
      floor.rotation.y = t * 5;
      floor.scale.setScalar(ev.r * (0.7 + 0.3 * k));
      g.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * k; });
      if (rnd() < 0.5) puff(ev.x + (rnd() - 0.5) * ev.r, ev.z + (rnd() - 0.5) * ev.r, { n: 1, r: 0.1, color: AMBER, h: 0.9, y: 0.2, size: 0.16, op: 0.5, life: 0.5 });
    });
  });
  // the flame gathered over the open left paw before the dash (5bsoG8vEr 4.75 s)
  bus.on('review_af_gather', (ev) => {
    const f = fox();
    if (!f) return;
    const c = EC[ev.el] || GOLD;
    const lx = (f.faceZ ?? 1) * 0.3, lz = -(f.faceX ?? 0) * 0.3;
    const s = sprite(c, 0.8, true);
    s.position.set(f.x + lx, 0.75, f.z + lz);
    add(s, ev.secs + 0.1, (u) => { s.scale.setScalar(0.15 + 0.35 * u); s.material.opacity = 0.8 * (u < 0.8 ? 1 : 1 - sm(0.8, 1, u)); });
    ring(f.x + lx, f.z + lz, 0.35, c, { life: ev.secs, inward: true, y: 0.75, op: 0.5 });
  });
  // Skyblade Waltz's spin ring (Pi4PRflgB 3.0 s): a full ring of wind round him
  bus.on('review_af_spinring', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const band = new Mesh(new CylinderGeometry(ev.r, ev.r * 1.08, 0.4, 48, 1, true), basic(SILVER, 0.35, true));
    band.position.y = 0.45;
    g.add(band);
    const flat = new Mesh(new RingGeometry(ev.r * 0.6, ev.r, 64), basic(SILVER, 0.4, true));
    flat.rotation.x = -Math.PI / 2;
    flat.position.y = 0.45;
    g.add(flat);
    add(g, 0.35, (u) => { g.rotation.y = -u * 9; g.scale.setScalar(0.7 + 0.3 * sm(0, 0.3, u)); band.material.opacity = 0.18 * (1 - u); flat.material.opacity = 0.2 * (1 - u); });
  });
  // Skyblade Waltz's last beats (Pi4PRflgB 6.75 to 7.25 s): a beam falls and leaves a sword standing
  bus.on('review_af_beam', (ev) => {
    const beam = new Mesh(new CylinderGeometry(0.12, 0.18, 3.2, 12, 1, true), basic('#FFFFFF', 0.6, true));
    beam.position.set(ev.x, 1.6, ev.z);
    add(beam, 0.3, (u) => { beam.material.opacity = 0.3 * (1 - u); beam.scale.set(1 - 0.6 * u, 1, 1 - 0.6 * u); });
    ring(ev.x, ev.z, ev.r, SILVER, { life: 0.35, op: 0.6 });
    puff(ev.x, ev.z, { n: 6, r: 0.5, color: SILVER, h: 0.5, y: 0.1, size: 0.2, op: 0.45, life: 0.5 });
    const sw = swordStand(SILVER);
    sw.position.set(ev.x, 0, ev.z);
    sw.rotation.set((rnd() - 0.5) * 0.3, rnd() * 3, (rnd() - 0.5) * 0.3);
    add(sw, ev.stay, (u) => { sw.position.y = 0.3 * (1 - sm(0, 0.08, u)); sw.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * (1 - sm(0.75, 1, u)); }); });
  });
  // Inkstone Dive (2SnjhTKLD): spikes after the X cut, strokes in the air, the air burst, the landing
  bus.on('review_af_xspikes', (ev) => {
    for (let i = 0; i < 6; i++) {
      const sp = new Mesh(new BoxGeometry(0.02, 0.5, 0.08), basic(i % 2 ? CRIMSON : EC.earth, 0.75, true));
      const a = Math.atan2(ev.dz, ev.dx) + (i - 2.5) * 0.35;
      const x = ev.x + Math.cos(a) * (0.2 + 0.1 * (i % 3)), z = ev.z + Math.sin(a) * (0.2 + 0.1 * (i % 3));
      sp.position.set(x, 0, z);
      sp.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      add(sp, 0.5, (u) => { sp.position.y = 0.25 * sm(0, 0.2, u) - 0.3 * sm(0.6, 1, u); });
    }
    chunks(ev.x, ev.z, { n: 4, r: 0.4, up: 1.2, size: 0.6 });
  });
  bus.on('review_af_airink', (ev) => {
    const a = ev.i * 2.1 + 0.4;
    slash3d(ev.x, ev.z, Math.cos(a), Math.sin(a), 1.2, 55, CRIMSON, { tilt: [35, -50, 70][ev.i % 3], y: 1.2, life: 0.4, ink: true, op: 0.7 });
  });
  bus.on('review_af_airburst', (ev) => {
    const s = sprite(CRIMSON, 0.7, true);
    s.position.set(ev.x, 1.3, ev.z);
    add(s, 0.3, (u) => { s.scale.setScalar(0.3 + 1.4 * u); s.material.opacity = 0.7 * (1 - u); });
    ring(ev.x, ev.z, ev.r, CRIMSON, { life: 0.35, op: 0.55, y: 1.2 });
    puff(ev.x, ev.z, { n: 8, r: 0.6, color: CRIMSON, h: 0.4, y: 1.2, size: 0.18, op: 0.6, life: 0.45 });
  });
  bus.on('review_af_inkland', (ev) => {
    const { x, z } = ev;
    // the ink arc of the dive (2.0 s in the ref), then the floor bursts in dust
    slash3d(x - ev.dx * 0.5, z - ev.dz * 0.5, ev.dx, ev.dz, 1.1, 40, CRIMSON, { tilt: 88, y: 0.8, life: 0.45, ink: true, op: 0.8 });
    ring(x, z, ev.r, EC.earth, { life: 0.5, op: 0.75 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rnd() * 0.4, L = 0.8 + rnd() * 0.9;
      strip(x, z, x + Math.cos(a) * L, z + Math.sin(a) * L, i % 3 ? CRIMSON : INK, { life: 0.9, op: 0.75, w: 0.14 * (1 - rnd() * 0.5), y: 0.035 + i * 0.001, grow: 0.15 });
    }
    disc(x, z, 0.6, INK, 0.5, 0.8);
    chunks(x, z, { n: 10, r: 1.0, up: 2.0 });
    puff(x, z, { n: 14, r: 1.4, color: DEBRIS, h: 0.4, y: 0.1, size: 0.45, op: 0.4, life: 0.8 });
  });
  // Riptide Form's stab landing
  bus.on('review_af_splash', (ev) => {
    ring(ev.x, ev.z, ev.r, AQUA, { life: 0.4, op: 0.7 });
    disc(ev.x, ev.z, ev.r * 0.7, AQUA, 0.2, 0.5);
    puff(ev.x, ev.z, { n: 10, r: ev.r * 0.6, color: AQUA, h: 0.8, y: 0.1, size: 0.22, op: 0.5, life: 0.55 });
  });

  // ================= 2.0: the kit 2.0 skill looks (MOTIONS M8 to M24, no elements) =================
  // gold 剑意 lines, strokes, stars; bronze 不屈 heavy strokes, shock rings, cracks; pale aqua 止水 still
  // rings, a ripple, moons, mirrors; silver 狂热 after-images, fast strokes, spirals, wheels of blades
  const BRONZE = EC.earth;
  const restM = () => { const st = window.__tripoFox; return st && st.restMatrix ? st.restMatrix() : null; };
  // the blade's base and tip at a clip time, in the world (where he stands now)
  function swAt(clip, t, M = restM()) {
    const st = window.__tripoFox, sw = st && st.sweeps && st.sweeps[clip];
    if (!sw || !M) return null;
    const k = Math.max(0, Math.min(sw.pts.length - 1, Math.round(t / sw.dt))), p = sw.pts[k];
    return [new Vector3(p[0], p[1], p[2]).applyMatrix4(M), new Vector3(p[3], p[4], p[5]).applyMatrix4(M)];
  }
  // a brush stroke of light along the blade's path between two clip times: it hangs in the air for
  // `hold`, then fades; flare() brightens it and draws it in to its middle
  function bladeStroke(clip, t0, t1, { color = GOLD, w = 0.55, ext = 1.25, hold = 0.25, fade = 0.25, op = 0.7, brush = true, M = restM() } = {}) {
    const st = window.__tripoFox, sw = st && st.sweeps && st.sweeps[clip];
    if (!sw || !M) return null;
    const k0 = Math.max(0, Math.round(t0 / sw.dt)), k1 = Math.min(sw.pts.length - 1, Math.round(t1 / sw.dt));
    const n = k1 - k0 + 1;
    if (n < 2) return null;
    const mkGeo = (wf, prof) => {
      const pos = new Float32Array(n * 6), al = new Float32Array(n * 2), idx = [];
      for (let i = 0; i < n; i++) {
        const p = sw.pts[k0 + i], s = i / (n - 1);
        const b = new Vector3(p[0], p[1], p[2]).applyMatrix4(M), tp = new Vector3(p[3], p[4], p[5]).applyMatrix4(M);
        const out = b.clone().lerp(tp, ext), kw = prof ? Math.pow(Math.sin(Math.PI * Math.min(1, s * 2.2 + 0.08)), 0.5) * Math.pow(1 - s * 0.85, 0.7) : 1;
        const inn = out.clone().lerp(b, wf * kw);
        out.y = Math.max(0.04, out.y);
        inn.y = Math.max(0.04, inn.y);
        pos.set([inn.x, inn.y, inn.z, out.x, out.y, out.z], i * 6);
        al[i * 2] = 0.25;
        al[i * 2 + 1] = 1;
      }
      for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
      geo.setAttribute('alpha', new Float32BufferAttribute(al, 1));
      geo.setIndex(idx);
      return geo;
    };
    const g = new Group();
    const body = new Mesh(mkGeo(w, brush), alphaMat(color, op, false));
    const glow = new Mesh(mkGeo(w * 0.6, brush), alphaMat(color, op * 0.9, true));
    const core = new Mesh(mkGeo(0.06, false), alphaMat('#FFFFFF', 0.8, true));
    for (const m of [body, glow, core]) { m.frustumCulled = false; m.renderOrder = 6; g.add(m); }
    const mats = [[body, op], [glow, op * 0.45], [core, 0.4]];
    let flare = -1;
    const it = add(g, hold + fade + 0.06, (u, t) => {
      const rev = Math.min(1, t / 0.05);
      for (const [m] of mats) m.geometry.setDrawRange(0, Math.ceil(rev * (n - 1)) * 6);
      let a = t < hold + 0.06 ? 1 : 1 - (t - hold - 0.06) / fade;
      if (flare >= 0) { const f = (t - flare) / 0.18; a = Math.max(0, 1 - f); g.scale.setScalar(1 - 0.5 * Math.min(1, f)); }
      for (const [m, o] of mats) m.material.opacity = (m === core && flare >= 0 ? 1.6 : 1) * o * Math.max(0, a);
    });
    // flare: brighten, then draw in toward its middle
    it.flare = () => {
      if (flare >= 0) return;
      const mid = new Vector3();
      const pa = body.geometry.attributes.position.array;
      for (let i = 0; i < pa.length; i += 3) mid.add(new Vector3(pa[i], pa[i + 1], pa[i + 2]));
      mid.multiplyScalar(3 / pa.length);
      for (const [m] of mats) { m.position.copy(mid).negate(); }
      g.position.copy(mid);
      flare = it.t;
      it.life = it.t + 0.2;
      it.mid = mid;
    };
    return it;
  }
  // a crescent moon of light standing at a spot: its flat side faces `yaw` (or lies on the floor)
  function moonAt(x, y, z, yaw, { w = 1.2, thick = 0.3, color = GOLD, op = 0.7, life = 0.6, grow = 0.08, flat = false, roll = 0 } = {}) {
    const g = new Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw - Math.PI / 2;
    const r = new Group();
    r.rotation.x = flat ? -Math.PI / 2 : 0;
    r.rotation.z = roll;
    g.add(r);
    const a = new Mesh(crescentGeo(w, thick), basic(color, op, false));
    const b = new Mesh(crescentGeo(w * 0.96, thick * 0.35), basic('#FFFFFF', op * 0.9, true));
    b.position.x = 0.01;
    r.add(a, b);
    return add(g, life, (u, t) => {
      const k = Math.min(1, t / grow);
      r.scale.set(0.4 + 0.6 * k, k, 1);
      a.material.opacity = op * (1 - sm(0.6, 1, u));
      b.material.opacity = op * 0.45 * (1 - sm(0.4, 1, u));
    });
  }
  // a spray of sparks from a point along a direction
  function sparkSpray(p0, { n = 10, dir = new Vector3(0, 1, 0), col = GOLD, speed = 3, spread = 0.9, life = 0.3 } = {}) {
    for (let k = 0; k < n; k++) {
      const m = new Mesh(sparkGeo, basic(k % 3 === 0 ? col : k % 3 === 1 ? '#FFFFFF' : col, 0.95, true));
      const v = dir.clone().normalize().add(new Vector3(rnd() - 0.5, rnd() * 0.6, rnd() - 0.5).multiplyScalar(spread)).normalize().multiplyScalar(speed * (0.6 + rnd() * 0.8));
      const p = p0.clone();
      const L = life * (0.6 + rnd() * 0.7);
      add(m, L, (u, t, dt) => {
        v.y -= 7 * dt;
        p.addScaledVector(v, dt);
        p.y = Math.max(0.02, p.y);
        m.position.copy(p);
        m.lookAt(p.x + v.x, p.y + v.y, p.z + v.z);
        m.scale.set(1, 1, 0.5 + Math.min(1.6, v.length() * 0.3));
        m.material.opacity = 0.95 * (1 - u);
      });
    }
  }
  // a ghost sword (a blade of light with a guard) and a wheel of them
  function ghostSword(col, op = 0.6, len = 0.62) {
    const g = new Group();
    const blade = new Mesh(new BoxGeometry(0.025, len, 0.075), basic('#FFFFFF', op, true));
    blade.position.y = len / 2;
    const edge = new Mesh(new BoxGeometry(0.05, len * 1.04, 0.12), basic(col, op * 0.6, true));
    edge.position.y = len / 2;
    const guard = new Mesh(new BoxGeometry(0.03, 0.03, 0.2), basic(col, op, true));
    const grip = new Mesh(new BoxGeometry(0.03, 0.13, 0.03), basic(col, op * 0.8, true));
    grip.position.y = -0.07;
    g.add(edge, blade, guard, grip);
    return g;
  }
  function bladeWheel(col, n = 6, r = 0.8) {
    const g = new Group();
    g.position.y = 0.5;
    for (let i = 0; i < n; i++) {
      const s = ghostSword(col, 0.55, 0.5);
      const a = (i / n) * Math.PI * 2;
      // each blade lies flat, its point leading round the wheel
      s.position.set(Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55);
      s.rotation.set(Math.PI / 2, 0, 0);
      s.rotateOnWorldAxis(new Vector3(0, 1, 0), -a);
      g.add(s);
    }
    const rim = new Mesh(new RingGeometry(r * 0.95, r, 48), basic(col, 0.35, true));
    rim.rotation.x = -Math.PI / 2;
    g.add(rim);
    return g;
  }
  // after-images of him: still copies in this frame's pose, fading
  function afterImage(col, op = 0.3, life = 0.3, off = null) {
    const st = window.__tripoFox;
    if (!st || !st.snapshot) return null;
    const im = st.snapshot(basic(col, op));
    if (!im) return null;
    if (off) im.position.add(off);
    return add(im, life, (u) => im.traverse((o) => { if (o.material) o.material.opacity = op * (1 - u); }));
  }
  // a line drawn on the floor by the blade's tip while it is low (for the drags and the rings)
  function tipFloor(clip, t0, t1, { color = BRONZE, life = 1.0, w = 0.05, below = 0.25, op = 0.7 } = {}) {
    const M = restM();
    let last = null;
    const step = 0.02;
    for (let t = t0; t <= t1 + 1e-6; t += step) later2(t - t0, () => {
      const P = swAt(clip, t, M);
      if (!P) return;
      const tp = P[1];
      if (tp.y > below) { last = null; return; }
      if (last) strip(last.x, last.z, tp.x, tp.z, color, { life, op, w, y: 0.035 });
      last = tp;
    });
  }
  const facing = (f) => { const l = Math.hypot(f.faceX ?? 0, f.faceZ ?? 1) || 1; return { x: (f.faceX ?? 0) / l, z: (f.faceZ ?? 1) / l }; };
  const SFX = {
    // M8 Flurry: four strokes hang in the air, then flare into one small star as he flicks the blade
    flurry20: (f) => {
      const strokes = [];
      [0.14, 0.23, 0.33, 0.42].forEach((T) => later2(T + 0.035, () => { const s = bladeStroke('flurry20', T - 0.045, T + 0.035, { color: GOLD, hold: 0.5, op: 0.75 }); if (s) strokes.push(s); }));
      later2(0.55, () => {
        const mid = new Vector3();
        strokes.forEach((s) => { s.flare(); mid.add(s.mid || new Vector3()); });
        if (!strokes.length) return;
        mid.multiplyScalar(1 / strokes.length);
        const st2 = new Sprite(new SpriteMaterial({ map: star(), color: '#FFF2C8', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.95 }));
        st2.position.copy(mid);
        add(st2, 0.3, (u) => { st2.scale.setScalar(0.25 + 0.55 * sm(0, 0.3, u) * (1 - 0.5 * u)); st2.material.opacity = 0.95 * (1 - sm(0.5, 1, u)); st2.material.rotation = u * 1.2; });
        sparkSpray(mid, { n: 8, col: GOLD, dir: new Vector3(0, 0.3, 0), speed: 2, spread: 2 });
      });
    },
    // M9 Crescent Finisher: sparks dragged behind, a tall gold moon standing up, broken into sparks
    finisher20: (f) => {
      const d = facing(f);
      for (let t = 0.06; t < 0.26; t += 0.04) later2(t, () => { const P = swAt('finisher20', t); if (P && P[1].y < 0.16) sparkSpray(P[1], { n: 3, col: GOLD, dir: new Vector3(-d.x, 0.6, -d.z), speed: 2, life: 0.25 }); });
      let moon = null, mp = null;
      later2(0.3, () => {
        const g = fox() || f;
        mp = new Vector3(g.x + d.x * 0.85, 0.75, g.z + d.z * 0.85);
        moon = moonAt(g.x + d.x * 0.85, 0.75, g.z + d.z * 0.85, Math.atan2(d.x, d.z), { w: 1.5, thick: 0.4, color: GOLD, op: 0.75, life: 0.55, grow: 0.07 });
        bladeStroke('finisher20', 0.26, 0.42, { color: GOLD, hold: 0.25, op: 0.6 });
      });
      later2(0.8, () => {
        if (moon) kill(moon);
        if (!mp) return;
        const c = mp;
        for (let i = 0; i < 4; i++) sparkSpray(c.clone().add(new Vector3(0, (i - 1.5) * 0.3, 0)), { n: 6, col: GOLD, dir: new Vector3(0, 0.2, 0), speed: 2.4, spread: 2.2, life: 0.4 });
      });
    },
    // M10 Keen Crescent: a ring of gold light round him as he turns, unrolled into the crescent;
    // a glowing cut line stays in the floor
    keen20: (f) => {
      const M = restM();
      const ringM = new Mesh(new RingGeometry(0.78, 0.9, 64, 1, 0, 0.01), basic(GOLD, 0.6, true));
      ringM.rotation.x = -Math.PI / 2;
      const g0 = new Group();
      g0.add(ringM);
      const it = add(g0, 0.42, (u, t) => {
        const g = fox() || f;
        g0.position.set(g.x, 0.42, g.z);
        const k = Math.min(1, t / 0.3);
        ringM.geometry.dispose();
        ringM.geometry = new RingGeometry(0.8, 0.92, 64, 1, -Math.PI / 2 - k * Math.PI * 2, k * Math.PI * 2);
        ringM.rotation.z = Math.atan2(f.faceX ?? 0, f.faceZ ?? 1);
        ringM.material.opacity = (t < 0.33 ? 0.55 : 0.55 * (1 - (t - 0.33) / 0.09));
      });
      void it;
      void M;
      later2(0.36, () => {
        const g = fox() || f, d = facing(g);
        bladeStroke('keen20', 0.3, 0.44, { color: GOLD, hold: 0.12, op: 0.6 });
        strip(g.x + d.x * 0.5, g.z + d.z * 0.5, g.x + d.x * 4.5, g.z + d.z * 4.5, GOLD, { life: 0.9, op: 0.55, w: 0.05, y: 0.03, grow: 0.3 });
        strip(g.x + d.x * 0.5, g.z + d.z * 0.5, g.x + d.x * 4.5, g.z + d.z * 4.5, '#FFFFFF', { life: 0.6, op: 0.45, w: 0.015, y: 0.032, grow: 0.3 });
      });
    },
    // M11 Sword Bloom: a gold flash at the snapped paw, the scars open; the catch glints; the cut down
    bloom20: (f) => {
      later2(0.4, () => {
        const st = window.__tripoFox;
        if (!st || !st.handL) return;
        const p = new Vector3().setFromMatrixPosition(st.handL.matrixWorld);
        const s = new Sprite(new SpriteMaterial({ map: star(), color: '#FFE3A0', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.9 }));
        s.position.copy(p);
        add(s, 0.22, (u) => { s.scale.setScalar(0.2 + 0.5 * u); s.material.opacity = 0.9 * (1 - u); });
        ring(p.x, p.z, 0.5, GOLD, { life: 0.3, y: p.y, op: 0.6 });
      });
      later2(0.72, () => {
        const st = window.__tripoFox;
        if (!st || !st.handR) return;
        const p = new Vector3().setFromMatrixPosition(st.handR.matrixWorld);
        const s = new Sprite(new SpriteMaterial({ map: star(), color: '#FFFFFF', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.9 }));
        s.position.copy(p);
        add(s, 0.12, (u) => { s.scale.setScalar(0.3 * (1 - 0.5 * u)); s.material.opacity = 0.9 * (1 - u); });
      });
      later2(0.84, () => bladeStroke('bloom20', 0.74, 0.86, { color: GOLD, hold: 0.15, op: 0.65 }));
    },
    // M12 Triple Crescent: three ghost blades fanned out behind him like wings, three great cuts,
    // the wings fold as he sheathes
    triple20: (f) => {
      const wings = new Group();
      const blades = [-1, 0, 1].map((i) => { const b = ghostSword(GOLD, 0.5, 0.75); b.userData.i = i; wings.add(b); return b; });
      add(wings, 1.45, (u, t) => {
        const g = fox() || f, d = facing(g);
        wings.position.set(g.x - d.x * 0.25, 0.55, g.z - d.z * 0.25);
        wings.rotation.y = Math.atan2(d.x, d.z);
        const open = sm(0.05, 0.35, t) * (1 - sm(1.15, 1.35, t));
        blades.forEach((b) => { b.rotation.set(-0.35 * open, 0, -b.userData.i * 0.9 * open); b.position.set(-b.userData.i * 0.12 * open, 0.05, -0.05); b.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * Math.min(1, t / 0.15) * (1 - sm(1.2, 1.4, t)); }); });
      });
      [0.4, 0.65, 0.9].forEach((T) => later2(T + 0.06, () => bladeStroke('triple20', T - 0.06, T + 0.06, { color: GOLD, hold: 0.1, op: 0.7, w: 0.7 })));
    },
    // M13 Lunge Strike: a thin bronze aim line, the thrust's streak, a shock cone behind the foe
    lunge20: (f) => {
      const d = facing(f);
      strip(f.x, f.z, f.x + d.x * 1.8, f.z + d.z * 1.8, BRONZE, { life: 0.3, op: 0.55, w: 0.025, y: 0.62, grow: 0.6 });
      later2(0.3, () => { const g = fox() || f; strip(g.x - d.x * 0.3, g.z - d.z * 0.3, g.x + d.x * 1.4, g.z + d.z * 1.4, BRONZE, { life: 0.22, op: 0.7, w: 0.12, y: 0.5, grow: 0.3 }); strip(g.x - d.x * 0.3, g.z - d.z * 0.3, g.x + d.x * 1.4, g.z + d.z * 1.4, '#FFFFFF', { life: 0.16, op: 0.6, w: 0.03, y: 0.51, grow: 0.3 }); });
    },
    // M14 Rift Cut: the stab's shock ring, a glowing line carved round his feet (the rift is rift20)
    rift20: (f) => {
      later2(0.2, () => { const P = swAt('rift20', 0.2); if (P) { ring(P[1].x, P[1].z, 0.45, BRONZE, { life: 0.35, op: 0.75 }); sparkSpray(P[1], { n: 8, col: BRONZE, speed: 2.5 }); } });
      later2(0.2, () => tipFloor('rift20', 0.2, 0.52, { color: BRONZE, life: 0.9, w: 0.06, op: 0.75 }));
      later2(0.62, () => bladeStroke('rift20', 0.55, 0.68, { color: BRONZE, hold: 0.15, op: 0.7, w: 0.8 }));
    },
    // M15 Caltrops: a faint bronze ring under the spin, a heavy stroke across the floor
    caltrops20: (f) => {
      tipFloor('caltrops20', 0.04, 0.3, { color: BRONZE, life: 0.4, w: 0.04, below: 0.3, op: 0.5 });
      later2(0.44, () => bladeStroke('caltrops20', 0.3, 0.44, { color: BRONZE, hold: 0.12, op: 0.7, w: 0.8 }));
    },
    // M16 Riposte: the answer draws a full moon round him
    riposteHit20: () => later2(0.42, () => bladeStroke('riposteHit20', 0.12, 0.42, { color: BRONZE, hold: 0.15, op: 0.65, w: 0.6, brush: false })),
    // M17 Moonfang: (its aim line, streak and moon are the sim's events)
    moonfang20: () => {},
    // M18 Calm Crescent: the full pale circle of the roll, one thin ripple where he was
    calm20: (f) => {
      later2(0.42, () => bladeStroke('calm20', 0.1, 0.42, { color: AQUA, hold: 0.12, op: 0.5, w: 0.3, brush: false }));
      later2(0.45, () => { const g = fox() || f; ring(g.x, g.z, 1.6, AQUA, { life: 1.1, op: 0.45, from: 0.15, geo: thinRing }); });
    },
    // M19 Mirror Image: the point draws a mirror of pale light in front of him
    mirror20: (f) => {
      const d = facing(f);
      const g = new Group();
      const rim = new Mesh(new RingGeometry(0.3, 0.33, 48), basic(AQUA, 0.7, true));
      const fill = new Mesh(new CircleGeometry(0.3, 48), basic('#DDF7FB', 0.18, true));
      g.add(fill, rim);
      g.position.set(f.x + d.x * 0.75, 0.58, f.z + d.z * 0.75);
      g.rotation.y = Math.atan2(d.x, d.z);
      add(g, 0.55, (u, t) => { const k = Math.min(1, t / 0.33); rim.geometry.dispose(); rim.geometry = new RingGeometry(0.3, 0.33, 48, 1, Math.PI / 2, k * Math.PI * 2); fill.material.opacity = 0.18 * k * (1 - sm(0.75, 1, u)); rim.material.opacity = 0.35 * (1 - sm(0.75, 1, u)); });
    },
    // M20 Fox Step: (the spiral streak is the sim's event); dust and sparks at the knee slide
    foxstep20: (f) => {
      later2(0.36, () => { const g = fox() || f, d = facing(g); puff(g.x, g.z, { n: 6, r: 0.4, h: 0.2, life: 0.5, color: '#9C978E', op: 0.35, dust: true }); sparkSpray(new Vector3(g.x - d.x * 0.3, 0.05, g.z - d.z * 0.3), { n: 8, col: SILVER, dir: new Vector3(-d.x, 0.3, -d.z), speed: 2.2 }); });
    },
    // M21 Blade Storm: a wider silver ring on each turn (the beats), the blade's strokes round him
    storm20: () => {
      [0.3, 0.6, 0.9].forEach((T) => later2(T + 0.05, () => bladeStroke('storm20', T - 0.12, T + 0.05, { color: SILVER, hold: 0.06, fade: 0.15, op: 0.55, w: 0.5, brush: false })));
    },
    // M22 Blade Dance: two tilted rings crossing like an X, after-images from his feet on landing
    dance20: () => {
      later2(0.3, () => bladeStroke('dance20', 0.08, 0.3, { color: SILVER, hold: 0.35, op: 0.55, w: 0.45, brush: false }));
      later2(0.5, () => bladeStroke('dance20', 0.3, 0.5, { color: SILVER, hold: 0.2, op: 0.6, w: 0.45, brush: false }));
      for (let i = 0; i < 3; i++) later2(0.52 + i * 0.05, () => afterImage(SILVER, 0.22, 0.28));
    },
    // M23 Blade Wheel: a wheel of ghost blades turns on the blade and grows; the throw sends it off
    wheel20: () => {
      const W = bladeWheel(SILVER, 6, 0.55);
      add(W, 0.6, (u, t) => {
        const st = window.__tripoFox;
        if (!st || !st.weapon) return;
        const p = new Vector3().copy(st.tipL).multiplyScalar(0.7).applyMatrix4(st.weapon.matrixWorld);
        W.position.copy(p);
        W.rotation.set(Math.PI / 2 * 0.6, 0, 0);
        W.children.forEach((c) => c.rotation.y !== undefined);
        W.rotateY(-t * 12);
        W.scale.setScalar(0.4 + 0.6 * sm(0, 0.5, t));
      });
    },
    // M24 Thousand Cuts: he splits into silver after-images and is gone
    thousand20: (f) => {
      const d = facing(f);
      later2(0.16, () => { for (const s of [-1, 1, 0]) afterImage(SILVER, 0.3, 0.35, new Vector3(-d.z * 0.22 * s, 0, d.x * 0.22 * s)); });
    },
  };
  const thinRing = new RingGeometry(0.97, 1, 72);
  bus.on('review_af_play', (ev) => { const f = fox(); if (f && SFX[ev.clip]) SFX[ev.clip](f, ev); });
  // the beats of the 2.0 skills: an impact on each foe the beat landed on, along the blade's path
  const BEATC = { flurry20: GOLD, finisher20: GOLD, keen20: GOLD, bloom20: GOLD, triple20: GOLD, lunge20: BRONZE, rift20: BRONZE, caltrops20: BRONZE, riposteHit20: BRONZE, moonfang20: AQUA, calm20: AQUA, mirror20: AQUA, foxstep20: SILVER, storm20: SILVER, dance20: SILVER, wheel20: SILVER, thousand20: SILVER };
  const BEATT = { flurry20: [0.14, 0.23, 0.33, 0.42], finisher20: [0.3], lunge20: [0.3, 0.5], foxstep20: [0.2], storm20: [0.3, 0.6, 0.9, 1.1], dance20: [0.2, 0.45], bloom20: [0.4, 0.8] };
  bus.on('review_af_beat', (ev) => {
    const col = BEATC[ev.clip] || CRIMSON, at = (BEATT[ev.clip] || [])[ev.i];
    const S = at !== undefined ? sweepPts({ clip: ev.clip, at }) : null;
    for (const id of ev.ids || []) {
      const e = byId(id);
      if (!e) continue;
      if (S && !(ev.clip === 'bloom20' && ev.i === 0) && !(ev.clip === 'lunge20' && ev.i === 1)) bladeHit({ dx: ev.dx, dz: ev.dz, col, strong: ev.clip === 'finisher20' }, S, e);
      else { const s = sprite(col, 0.6, true); s.position.set(e.x, 0.6, e.z); add(s, 0.18, (u) => { s.scale.setScalar(0.3 + 0.4 * u); s.material.opacity = 0.6 * (1 - u); }); }
    }
    const f = fox();
    if (ev.clip === 'lunge20' && ev.i === 0) for (const id of ev.ids) {
      // a shock cone bursts out behind the foe
      const e = byId(id);
      if (!e || !f) continue;
      const d = new Vector3(e.x - f.x, 0, e.z - f.z).normalize();
      const cone = new Mesh(new ConeGeometry(0.45, 0.9, 24, 1, true), basic(BRONZE, 0.5, true));
      const g = new Group();
      g.add(cone);
      cone.rotation.x = -Math.PI / 2;
      cone.position.z = 0.55;
      g.position.set(e.x, 0.55, e.z);
      g.rotation.y = Math.atan2(d.x, d.z);
      add(g, 0.3, (u) => { g.scale.set(0.5 + u, 0.5 + u, 0.6 + 0.8 * u); cone.material.opacity = 0.5 * (1 - u); });
      sparkSpray(new Vector3(e.x + d.x * 0.25, 0.55, e.z + d.z * 0.25), { n: 10, col: BRONZE, dir: d, speed: 3.5, spread: 0.6 });
    }
    if (ev.clip === 'lunge20' && ev.i === 1) for (const id of ev.ids) { const e = byId(id); if (e) { ring(e.x, e.z, 0.6, BRONZE, { life: 0.3, y: 0.55, op: 0.7 }); chunks(e.x, e.z, { n: 4, r: 0.4, up: 1.2 }); } }
    if (ev.clip === 'bloom20' && ev.i === 0) for (const id of ev.ids) { const e = byId(id); if (e && f) strip(f.x, f.z, e.x, e.z, GOLD, { life: 0.18, op: 0.5, w: 0.02, y: 0.6, grow: 0.5 }); }
    if (ev.clip === 'bloom20' && ev.i === 1) for (const id of ev.ids) {
      // a scarred foe bursts open as a star
      const e = byId(id);
      if (!e) continue;
      const s = new Sprite(new SpriteMaterial({ map: star(), color: '#FFE3A0', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.95 }));
      s.position.set(e.x, 0.6, e.z);
      add(s, 0.35, (u) => { s.scale.setScalar(0.4 + 1.0 * sm(0, 0.4, u)); s.material.opacity = 0.95 * (1 - u); s.material.rotation = u; });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; strip(e.x, e.z, e.x + Math.cos(a) * (i % 2 ? 0.6 : 1.0), e.z + Math.sin(a) * (i % 2 ? 0.6 : 1.0), GOLD, { life: 0.35, op: 0.65, w: 0.04, y: 0.04, grow: 0.25 }); }
      ring(e.x, e.z, 1.5, GOLD, { life: 0.4, op: 0.5 });
    }
    if (ev.clip === 'storm20') {
      const g = f || ev;
      ring(g.x, g.z, ev.r || 1.5, ev.i === 3 ? '#FFFFFF' : SILVER, { life: 0.35, op: 0.6, y: ev.i === 3 ? 0.05 : 0.45, from: 0.5 });
      if (ev.i < 3) ring(g.x, g.z, (ev.r || 1.5) * 1.15, SILVER, { life: 0.3, op: 0.3, y: 0.45, inward: true });
      else { ring(g.x, g.z, 1.3, SILVER, { life: 0.5, op: 0.7 }); chunks(g.x, g.z, { n: 8, r: 0.8, up: 1.4 }); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; strip(g.x, g.z, g.x + Math.cos(a) * 0.9, g.z + Math.sin(a) * 0.9, SILVER, { life: 0.6, op: 0.6, w: 0.04, y: 0.035, grow: 0.15 }); } }
    }
    if (ev.clip === 'moonfang20') {
      // a pale crescent moon opens along the whole path
      const x0 = ev.x0, z0 = ev.z0, x1 = ev.x1, z1 = ev.z1, L = Math.hypot(x1 - x0, z1 - z0);
      moonAt((x0 + x1) / 2, 0.08, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0) + Math.PI / 2, { w: L, thick: 0.45, color: AQUA, op: 0.7, life: 0.7, grow: 0.12, flat: true });
      strip(x0, z0, x1, z1, AQUA, { life: 0.5, op: 0.35, w: 0.3, y: 0.03 });
    }
    if (ev.clip === 'caltrops20' && f) {
      // a fan of iron spikes flies out and lands standing where the patch will be
      const from = ev.drop ? { x: ev.x, z: ev.z } : f, R0 = ev.wide ? 1.15 : ev.drop ? 0.45 : 0.65;
      for (let i = 0; i < (ev.wide ? 16 : 9); i++) {
        const m = new Mesh(new ConeGeometry(0.035, 0.16, 3), new MeshStandardMaterial({ color: '#8C8F99', flatShading: true, roughness: 0.4, metalness: 0.6 }));
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * R0;
        const tx = ev.tx + Math.cos(a) * r, tz = ev.tz + Math.sin(a) * r;
        const p0 = new Vector3(from.x, 0.3, from.z), p1 = new Vector3(tx, 0.07, tz);
        add(m, ev.wide ? 0.4 : 0.26, (u) => { m.position.lerpVectors(p0, p1, u); m.position.y += 0.6 * 4 * u * (1 - u); m.rotation.set(u * 9, 0, u * 6); });
      }
    }
    if (ev.clip === 'dance20' && ev.i === 1 && f) ring(f.x, f.z, 1.3, SILVER, { life: 0.3, op: 0.5, y: 0.3 });
  });
  // the 2.0 streaks: Moonfang's pale streak, Fox Step's spiral of silver strokes
  function streak20(ev) {
    const c = ev.el ? EC[ev.el] || SILVER : CRIMSON;
    const L = Math.hypot(ev.x1 - ev.x0, ev.z1 - ev.z0) || 1, dx = (ev.x1 - ev.x0) / L, dz = (ev.z1 - ev.z0) / L;
    if (ev.spiral) {
      // two turns of a thin spiral round the path, drawn as he goes
      const N = 48, secs = ev.secs || 0.28;
      for (let i = 0; i < N; i++) later2((i / N) * secs, () => {
        const sg = ev.flip ? -1 : 1, rr = ev.ghost ? 0.3 : 0.38, yy = ev.ghost ? 0.32 : 0.45;
        const pt = (k) => { const a = k * Math.PI * 4 * sg, along = k * L; return new Vector3(ev.x0 + dx * along + -dz * Math.cos(a) * rr, yy + Math.sin(a) * rr, ev.z0 + dz * along + dx * Math.cos(a) * rr); };
        const a0 = pt(i / N), a1 = pt((i + 1) / N);
        const m = new Mesh(new BoxGeometry(0.03, 0.03, a0.distanceTo(a1) * 1.1), basic(i % 4 ? c : '#FFFFFF', 0.85, true));
        m.position.lerpVectors(a0, a1, 0.5);
        m.lookAt(a1);
        add(m, 0.45, (u) => { m.material.opacity = 0.85 * (1 - u); });
      });
      if (!ev.ghost) for (let i = 0; i < 3; i++) later2(0.06 + i * 0.07, () => afterImage(c, 0.22, 0.25));
      return;
    }
    if (ev.thrust) {
      // 2.1: a thrust: a streak in the will colour with a white core, after-images, sparks where it stops
      const short = !!ev.short;
      strip(ev.x0, ev.z0, ev.x1, ev.z1, c, { life: short ? 0.25 : 0.4, op: 0.6, w: short ? 0.08 : 0.12, y: 0.45, grow: 0.3 });
      strip(ev.x0, ev.z0, ev.x1, ev.z1, '#FFFFFF', { life: short ? 0.18 : 0.3, op: 0.6, w: 0.025, y: 0.46, grow: 0.3 });
      if (!short) for (let i = 0; i < 2; i++) later2(0.03 + i * 0.05, () => afterImage(c, 0.22, 0.22));
      later2(short ? 0.08 : 0.2, () => sparkSpray(new Vector3(ev.x1, 0.1, ev.z1), { n: short ? 4 : 8, col: c, dir: new Vector3(dx, 0.5, dz), speed: 2.2 }));
      return;
    }
    strip(ev.x0, ev.z0, ev.x1, ev.z1, c, { life: 0.4, op: 0.55, w: 0.14, y: 0.45, grow: 0.25 });
    strip(ev.x0, ev.z0, ev.x1, ev.z1, '#FFFFFF', { life: 0.3, op: 0.6, w: 0.03, y: 0.46, grow: 0.25 });
    for (let i = 0; i < 3; i++) later2(0.03 + i * 0.04, () => afterImage(c, 0.25, 0.25));
  }

  // 2.1: a 剑风: a ring (or a fan) of light that spreads, with small blades of light riding its edge
  bus.on('review_af_qiring', (ev) => {
    const c = EC[ev.el] || CRIMSON, fan = ev.half < 180;
    const arc = fan ? (ev.half * 2 * Math.PI) / 180 : Math.PI * 2;
    const g = new Group();
    g.position.set(ev.x, 0.3, ev.z);
    const a0 = fan ? Math.atan2(ev.dz, ev.dx) : 0;
    const band = new Mesh(new RingGeometry(0.86, 1, 72, 1, fan ? -arc / 2 : 0, arc), basic(c, 0.55, true));
    const core = new Mesh(new RingGeometry(0.97, 1, 72, 1, fan ? -arc / 2 : 0, arc), basic('#FFFFFF', 0.7, true));
    for (const m of [band, core]) { m.rotation.x = -Math.PI / 2; m.rotation.z = a0; g.add(m); }
    const n = fan ? 7 : 12, blades = [];
    for (let i = 0; i < n; i++) {
      const t = fan ? -arc / 2 + (arc * (i + 0.5)) / n : (i / n) * Math.PI * 2;
      const b = new Mesh(crescentGeo(0.32, 0.1), basic(i % 2 ? c : '#FFFFFF', 0.75, true));
      b.userData.t = t + (fan ? 0 : 0) - a0 * 0;
      g.add(b);
      blades.push(b);
    }
    add(g, ev.secs + 0.25, (u, t) => {
      const k = Math.min(1, t / ev.secs), r = 0.3 + (ev.r - 0.3) * (1 - (1 - k) * (1 - k));
      band.scale.setScalar(r);
      core.scale.setScalar(r);
      const fade = t < ev.secs ? 1 : 1 - (t - ev.secs) / 0.25;
      band.material.opacity = 0.28 * fade;
      core.material.opacity = 0.35 * fade;
      blades.forEach((b) => {
        const th = a0 + b.userData.t;
        b.position.set(Math.cos(th) * r, 0, -Math.sin(th) * r);
        b.rotation.set(-Math.PI / 2, 0, th);
        b.material.opacity = 0.38 * fade;
      });
    });
    ring(ev.x, ev.z, 0.5, c, { life: 0.25, op: 0.6 });
  });
  // 2.1 Thousand Cuts, Crescent form: an image of him does the cut and fades
  bus.on('review_af_ghostcut', (ev) => {
    const st = window.__tripoFox;
    if (!st || !st.snapshot) return;
    const im = st.snapshot(basic(SILVER, 0.4));
    if (!im) return;
    im.position.x = ev.x;
    im.position.z = ev.z;
    im.rotation.y = Math.atan2(ev.dx, ev.dz);
    add(im, 0.45, (u) => im.traverse((o) => { if (o.material) o.material.opacity = 0.4 * (1 - u); }));
  });
  bus.on('review_af_aimline', (ev) => strip(ev.x, ev.z, ev.x + ev.dx * ev.len, ev.z + ev.dz * ev.len, EC[ev.el] || SILVER, { life: ev.secs + 0.2, op: 0.55, w: 0.02, y: 0.05, grow: 0.7 }));
  // Rift Cut's rift: a glowing line races out and blade fins of bronze light rise along it
  function rift20(ev) {
    const n = 9, fins = [];
    for (let i = 0; i < n; i++) later2((ev.secs * (i + 1)) / n, () => {
      const u = (i + 1) / n, x = ev.x + ev.dx * ev.len * u, z = ev.z + ev.dz * ev.len * u;
      const px = ev.x + ev.dx * ev.len * (u - 1 / n), pz = ev.z + ev.dz * ev.len * (u - 1 / n);
      strip(px, pz, x, z, '#2B241E', { life: 1.0, op: 0.7, w: 0.08, y: 0.02 });
      strip(px, pz, x, z, BRONZE, { life: 0.8, op: 0.75, w: 0.04, y: 0.025 });
      // a fin: a flat blade of light standing in the line, rising then fading
      const sh = new Shape();
      sh.moveTo(-0.22, 0);
      sh.lineTo(0.12, 0);
      sh.lineTo(-0.04, 0.55);
      sh.closePath();
      const fin = new Mesh(new ShapeGeometry(sh), basic(BRONZE, 0.6, true));
      const core = new Mesh(new ShapeGeometry(sh), basic('#FFFFFF', 0.4, true));
      core.scale.set(0.5, 0.85, 1);
      const g = new Group();
      g.add(fin, core);
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(ev.dx, ev.dz) - Math.PI / 2;
      add(g, 0.5, (k) => { g.scale.set(1, sm(0, 0.25, k) * (1 - 0.3 * k), 1); fin.material.opacity = 0.6 * (1 - sm(0.6, 1, k)); core.material.opacity = 0.4 * (1 - sm(0.3, 0.8, k)); });
      sparkSpray(new Vector3(x, 0.05, z), { n: 2, col: BRONZE, speed: 1.6, life: 0.25 });
      void fins;
    });
  }
  // Thousand Cuts: a long silver brush stroke through the foe from a new side; all flash at the click
  const tcuts = [];
  bus.on('review_af_tcut', (ev) => {
    const a = ev.i * 2.4 + 0.3, tl = [-0.5, 0.35, -0.15, 0.6, -0.35, 0.2, 0.5, -0.6][ev.i % 8];
    const g = new Group();
    const glow = new Mesh(new PlaneGeometry(1.6, 0.1), basic(SILVER, 0.55, true));
    const core = new Mesh(new PlaneGeometry(1.6, 0.025), basic('#FFFFFF', 0.85, true));
    g.add(glow, core);
    g.position.set(ev.x, 0.6, ev.z);
    g.rotation.set(0, a, tl);
    const it = add(g, 2.0, (u, t) => {
      g.scale.set(Math.min(1, t / 0.05), 1, 1);
      if (it.flash >= 0) { const k = (t - it.flash) / 0.25; glow.material.opacity = 0.9 * Math.max(0, 1 - k); core.material.opacity = Math.max(0, 1 - k); glow.scale.y = 1 + 2 * Math.min(1, k * 3); if (k >= 1) it.t = it.life; }
      else { glow.material.opacity = 0.35; core.material.opacity = 0.6; }
    });
    it.flash = -1;
    tcuts.push(it);
  });
  bus.on('review_af_tclick', (ev) => {
    for (const it of tcuts.splice(0)) it.flash = it.t;
    const e = ev.id != null ? byId(ev.id) : null;
    if (e) { ring(e.x, e.z, 1.0, SILVER, { life: 0.35, op: 0.7, y: 0.5 }); sparkSpray(new Vector3(e.x, 0.6, e.z), { n: 12, col: SILVER, speed: 3, spread: 2 }); }
    const f = fox();
    if (f) label('click', SILVER, f.x, 1.5, f.z, { life: 0.6, size: 0.26 });
  });

  bus.on('review_af_cast', () => {});

  bus.on('review_af_reset', () => {
    for (const it of items) root.remove(it.obj);
    items = [];
    keyed.clear();
    for (const [, w] of waves) root.remove(w.g);
    waves.clear();
    for (const [, z] of zones) root.remove(z.g);
    zones.clear();
    for (const [, w] of whirls) root.remove(w.g);
    whirls.clear();
    for (const [, s] of shots) root.remove(s);
    shots.clear();
    for (const m of walls) root.remove(m);
    walls.length = 0;
    image = null;
    parryRing = null;
    if (tide) { for (const im of tide.imgs) if (im) root.remove(im); root.remove(tide.g); tide = null; }
    chargeIt = null;
    cue('swordScale', { to: 1, secs: 0.01 });
    cue('flower', { on: false });
    if (countSpr) { root.remove(countSpr); countSpr = null; }
    countN = -1;
    rs = 12345;
    cue('blur', { on: false });
  });


  // ---- 2.1 the ten specials (MOTIONS M26 to M36, talents T12): each is done by a sword spirit, a large
  // image of him in the colours of its two wills (body in the first, edge in the second), while he
  // keeps moving and cutting under it
  const SPC = { fire: GOLD, earth: '#B08A5E', water: AQUA, wind: SILVER };
  function spirit(x, z, dx, dz, wills, { life = 1.4, scale = 1.5, op = 0.62, fadeIn = 0.14, fadeOut = 0.35, y = 0, clip = null, speed = 1, from = 0, onT = null } = {}) {
    const st = window.__tripoFox;
    if (!st || !st.spirit) return null;
    const [w1, w2] = wills;
    const cA = SPC[w1], cB = w1 === w2 ? '#FFFFFF' : SPC[w2];
    const takes = spTake;
    spTake = false;
    const S = st.spirit({ colA: cA, colB: cB, scale, op, swordA: takes ? SPC[w1] : '#FFFFFF', swordB: cA, swordL: takes ? SPC[w2] : null });
    if (!S) return null;
    // K23: the two ghost swords fly from his shoulders into the spirit's paws
    if (takes) cue('ghostsTo', { x, z, y: y + 0.5 * scale, secs: Math.max(0.12, fadeIn) });
    S.root.position.set(x, y, z);
    S.root.rotation.y = Math.atan2(dx, dz);
    S.opacity(0);
    add(S.root, life, (u, t, dt) => {
      S.tick(dt || 0);
      S.opacity(Math.max(0, Math.min(1, t / fadeIn, (life - t) / fadeOut)));
      if (onT) onT(t, dt, S);
    });
    if (clip) S.play(clip, { speed, from });
    return S;
  }
  const tipPos = () => {
    const st = window.__tripoFox;
    if (!st || !st.weapon || !st.tipL) return null;
    st.weapon.updateMatrixWorld(true);
    return st.tipL.clone().applyMatrix4(st.weapon.matrixWorld);
  };
  // the floor seal under a spirit: two thin rings in its two colours
  function seal(x, z, r, wills, life) {
    ring(x, z, r, SPC[wills[0]], { life, from: 0.6, op: 0.45 });
    ring(x, z, r * 0.8, wills[0] === wills[1] ? '#FFFFFF' : SPC[wills[1]], { life, from: 0.6, op: 0.35 });
  }
  // a planted great sword (Unmoved): point down, standing
  function plantedSword(x, z, yaw, col, len, life, onEnd) {
    const g = new Group();
    const sw = ghostSword(col, 0.8, len);
    sw.rotation.x = Math.PI;
    sw.position.y = len;
    g.add(sw);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    g.scale.set(2.2, 1, 2.2);
    let ended = false;
    return add(g, life, (u, t) => {
      const drop = Math.min(1, t / 0.12);
      g.position.y = (1 - drop) * 2.5;
      sw.children.forEach((m) => { if (m.material) m.material.opacity = (m.userData.op ??= m.material.opacity) * (1 - sm(0.9, 1, u)); });
      if (!ended && u > 0.97) { ended = true; if (onEnd) onEnd(); }
    });
  }
  const SPECIAL_FX = {
    // M27 One Thought: a spirit sword three times his height rises behind him and falls along the aim
    one_thought: (ev) => {
      const { x, z, dx, dz } = ev, sx = x - dx * 0.9, sz = z - dz * 0.9;
      seal(sx, sz, 1.0, ev.wills, 1.3);
      const S = spirit(sx, sz, dx, dz, ev.wills, { life: 1.35, clip: 'chargeHold' });
      if (S) { S.sword(3.4, 0.3); later2(0.27, () => S.play('slam', { speed: 1.25 })); }
      later2(0.45, () => {
        const ex = x + dx * 7, ez = z + dz * 7;
        strip(x, z, ex, ez, '#FFF6DE', { life: 0.45, op: 0.95, w: 0.16, y: 0.07, grow: 0.12 });
        strip(x, z, ex, ez, GOLD, { life: 3.4, op: 0.36, w: 1.5, y: 0.05 });
        strip(x, z, ex, ez, GOLD, { life: 3.4, op: 0.75, w: 0.08, y: 0.08 });
        ring(x + dx * 2.6, z + dz * 2.6, 1.6, GOLD, { life: 0.45, op: 0.7 });
        for (let k = 0; k < 7; k++) {
          const px = x + dx * (0.6 + k), pz = z + dz * (0.6 + k);
          later2(k * 0.02, () => { sparkSpray(new Vector3(px, 0.1, pz), { n: 6, col: GOLD, dir: new Vector3(0, 1, 0), speed: 3.2, spread: 1.4, life: 0.4 }); chunks(px, pz, { n: 3, r: 0.8, up: 2.6 }); });
        }
      });
    },
    // M28 Unmoved: the spirit comes down with a great bronze sword and plants it before him; it stands 3 s
    unmoved: (ev) => {
      const { x, z, dx, dz } = ev, px = x + dx * 0.7, pz = z + dz * 0.7, yaw = Math.atan2(dx, dz);
      const S = spirit(x - dx * 0.2, z - dz * 0.2, dx, dz, ev.wills, { life: 1.0, clip: 'castPlant', speed: 1.1, y: 1.6,
        onT: (t, dt, S2) => { S2.root.position.y = 1.6 * Math.max(0, 1 - t / 0.28); } });
      if (S) S.sword(2.2, 0.15);
      later2(0.3, () => {
        ring(px, pz, 2.5, BRONZE, { life: 0.5, op: 0.85 });
        ring(px, pz, 1.4, '#FFFFFF', { life: 0.3, op: 0.6 });
        sparkSpray(new Vector3(px, 0.15, pz), { n: 16, col: BRONZE, dir: new Vector3(0, 1, 0), speed: 4, spread: 1.6, life: 0.45 });
        chunks(px, pz, { n: 10, r: 1.4, up: 2.6 });
        plantedSword(px, pz, yaw, BRONZE, 1.05, 3.0, () => { chunks(px, pz, { n: 14, r: 1.0, up: 3 }); sparkSpray(new Vector3(px, 0.8, pz), { n: 12, col: BRONZE, speed: 3, spread: 2, life: 0.5 }); });
        for (let k = 0; k < 6; k++) later2(0.2 + k * 0.45, () => ring(px, pz, 0.55, BRONZE, { life: 1.0, op: 0.5, y: 0.1 + k * 0 }));
        // his own still guard: a bronze ring at his feet while it stands
        const f = fox();
        if (f) { const g = new Mesh(ringGeo, basic(BRONZE, 0.55)); g.rotation.x = -Math.PI / 2; add(g, 3.0, (u) => { const b = fox(); if (b) g.position.set(b.x, 0.06, b.z); g.scale.setScalar(0.62); g.material.opacity = 0.55 * (1 - sm(0.85, 1, u)); }); }
      });
    },
    // M29 Clear Mirror: the floor round him turns to a mirror; his reflection rises out of it and sheathes
    clear_mirror: (ev) => {
      const { x, z, dx, dz } = ev;
      const m = new Mesh(discGeo, basic('#BFEFF7', 0.13));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.035, z);
      add(m, 1.6, (u, t) => { m.scale.setScalar(3 * Math.min(1, t / 0.3) * (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3)); m.material.opacity = 0.13; });
      ring(x, z, 3, '#FFFFFF', { life: 1.6, from: 0.05, op: 0.45 });
      const S = spirit(x - dx * 0.5, z - dz * 0.5, dx, dz, ev.wills, { life: 1.3, clip: 'castBloom', y: -2.2,
        onT: (t, dt, S2) => { S2.root.position.y = -2.2 * Math.max(0, 1 - t / 0.42) ** 2; } });
      void S;
      later2(0.5, () => {
        ring(x, z, 3, '#FFFFFF', { life: 0.6, from: 0.1, op: 0.4 });
        ring(x, z, 2.2, AQUA, { life: 0.7, from: 0.1, op: 0.4 });
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; sparkSpray(new Vector3(x + Math.cos(a) * 2.2, 0.08, z + Math.sin(a) * 2.2), { n: 3, col: AQUA, speed: 2, spread: 1, life: 0.35 }); }
        const f = fox();
        if (f) { label('cleansed', AQUA, f.x, 1.6, f.z, { life: 0.9, size: 0.26 }); puff(f.x, f.z, { n: 10, r: 0.5, color: AQUA, h: 1.2 }); }
      });
    },
    // M30 Frenzy: four silver spirits burst out to four sides and cut back across him, a cross, then a second
    frenzy: (ev) => {
      const { x, z, dx, dz } = ev, yaw0 = Math.atan2(dz, dx);
      for (let k = 0; k < 4; k++) {
        const a0 = yaw0 + Math.PI / 4 + (k * Math.PI) / 2, a1 = a0 + Math.PI + 0.5, R = 1.9;
        const p0 = { x: x + Math.cos(a0) * R, z: z + Math.sin(a0) * R }, p1 = { x: x - Math.cos(a0) * R, z: z - Math.sin(a0) * R };
        const p2 = { x: x + Math.cos(a1) * R, z: z + Math.sin(a1) * R }, p3 = { x: x - Math.cos(a1) * R, z: z - Math.sin(a1) * R };
        const S = spirit(x, z, Math.cos(a0 + Math.PI), Math.sin(a0 + Math.PI), ev.wills, { life: 1.25, scale: 1.4, fadeIn: 0.08, op: 0.5,
          onT: (t, dt, S2) => {
            let P;
            if (t < 0.12) { const u = t / 0.12; P = { x: x + (p0.x - x) * u, z: z + (p0.z - z) * u }; }
            else if (t < 0.22 + k * 0.1) P = p0;
            else if (t < 0.32 + k * 0.1) { const u = (t - 0.22 - k * 0.1) / 0.1; P = { x: p0.x + (p1.x - p0.x) * u, z: p0.z + (p1.z - p0.z) * u }; }
            else if (t < 0.62 + k * 0.1) { const u = Math.min(1, (t - 0.32 - k * 0.1) / 0.2); P = { x: p1.x + (p2.x - p1.x) * u, z: p1.z + (p2.z - p1.z) * u }; }
            else if (t < 0.72 + k * 0.1) { const u = (t - 0.62 - k * 0.1) / 0.1; P = { x: p2.x + (p3.x - p2.x) * u, z: p2.z + (p3.z - p2.z) * u }; }
            else P = p3;
            S2.root.position.x = P.x;
            S2.root.position.z = P.z;
          } });
        if (!S) continue;
        S.root.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
        later2(0.2 + k * 0.1, () => { S.play('blurA', { speed: 1.2 }); });
        later2(0.24 + k * 0.1, () => { strip(p0.x, p0.z, p1.x, p1.z, '#FFFFFF', { life: 0.22, op: 0.55, w: 0.035, y: 0.55 }); strip(p0.x, p0.z, p1.x, p1.z, SILVER, { life: 0.35, op: 0.22, w: 0.22, y: 0.5 }); });
        later2(0.6 + k * 0.1, () => { S.root.rotation.y = Math.atan2(p3.x - p2.x, p3.z - p2.z); S.play('blurB', { speed: 1.2 }); });
        later2(0.64 + k * 0.1, () => { strip(p2.x, p2.z, p3.x, p3.z, '#FFFFFF', { life: 0.22, op: 0.55, w: 0.035, y: 0.55 }); strip(p2.x, p2.z, p3.x, p3.z, SILVER, { life: 0.35, op: 0.22, w: 0.22, y: 0.5 }); sparkSpray(new Vector3(x, 0.6, z), { n: 5, col: SILVER, speed: 3, spread: 1.5, life: 0.3 }); });
      }
      // his blade trails silver for the 4 s after
      for (let k = 0; k < 30; k++) later2(1.0 + k * 0.13, () => { const p = tipPos(); if (p) sparkSpray(p, { n: 2, col: SILVER, dir: new Vector3(0, 0.3, 0), speed: 0.6, spread: 0.6, life: 0.35 }); });
      later2(1.0, () => { const f = fox(); if (f) label('attack speed +30%', SILVER, f.x, 1.6, f.z, { life: 1.1, size: 0.24 }); });
    },
    // M31 Counterblow: a spirit stands before him with its blade crossed; a blow on it rings and is answered
    counterblow: (ev) => {
      const { x, z, dx, dz } = ev;
      seal(x + dx * 0.55, z + dz * 0.55, 0.8, ev.wills, 1.1);
      const S = spirit(x + dx * 0.55, z + dz * 0.55, dx, dz, ev.wills, { life: 1.7, clip: 'riposteGuard20' });
      if (S) { cb.S = S; cb.until = performance.now() + 1500; }
    },
    // M32 See Through: one slow frame; a thin gold line on every foe where the cut will come; all flash
    see_through: (ev) => {
      const { x, z, dx, dz } = ev;
      const dim = new Mesh(discGeo, basic('#0B0D10', 0.0));
      dim.rotation.x = -Math.PI / 2;
      dim.position.set(x, 0.09, z);
      dim.scale.setScalar(4.3);
      add(dim, 0.4, (u, t) => { dim.material.opacity = 0.28 * Math.min(1, t / 0.04) * (1 - sm(0.18, 0.32, t)); });
      ring(x, z, 4, GOLD, { life: 0.9, from: 0.95, op: 0.28 });
      const S = spirit(x - dx * 0.8, z - dz * 0.8, dx, dz, ev.wills, { life: 1.25, clip: 'castBloom', speed: 0.6 });
      const lines = [];
      later2(0.2, () => {
        for (const id of ev.ids || []) {
          const e = byId(id);
          if (!e) continue;
          const a = rnd() * Math.PI;
          const L = new Mesh(new PlaneGeometry(1.0, 0.035), basic('#FFE6A8', 0.95, true));
          L.position.set(e.x, 0.6, e.z);
          L.rotation.set(0, a, 0.5);
          lines.push(add(L, 0.55, (u) => { L.material.opacity = 0.95 * (0.6 + 0.4 * Math.sin(u * 30)); }));
          ring(e.x, e.z, 0.5, AQUA, { life: 4.0, from: 1, op: 0.45 });
        }
      });
      later2(0.68, () => { if (S) S.play('blurA', { speed: 1.4 }); });
      later2(0.7, () => {
        for (const id of ev.ids || []) {
          const e = byId(id);
          if (!e) continue;
          slash3d(e.x - dx * 0.4, e.z - dz * 0.4, dx, dz, 0.7, 70, GOLD, { y: 0.6, life: 0.25, op: 0.6 });
          sparkSpray(new Vector3(e.x, 0.6, e.z), { n: 8, col: GOLD, speed: 3, spread: 1.4, life: 0.35 });
          label('+20%', GOLD, e.x, 1.3, e.z, { life: 1.2, size: 0.24 });
        }
      });
    },
    // M33 Wild Dance: the spirit flickers round one foe; ten strokes draw a five-point star; it folds in
    wild_dance: (ev) => {
      if (ev.tid == null) return;
      const cx = ev.tx, cz = ev.tz, R = 1.15, a0 = Math.atan2(ev.dx, ev.dz);
      const P = [0, 1, 2, 3, 4].map((k) => ({ x: cx + Math.sin(a0 + Math.PI + (k * 2 * Math.PI) / 5) * R, z: cz + Math.cos(a0 + Math.PI + (k * 2 * Math.PI) / 5) * R }));
      const order = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];
      const S = spirit(P[0].x, P[0].z, cx - P[0].x, cz - P[0].z, ev.wills, { life: 1.25, scale: 1.4, fadeIn: 0.06 });
      const segs = [];
      order.forEach(([i, j], n) => later2(0.1 + n * 0.085, () => {
        const A = P[i], B = P[j], col = n < 5 ? GOLD : SILVER;
        if (S) {
          S.root.position.set(A.x, 0, A.z);
          S.root.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
          S.play(n % 2 ? 'blurB' : 'blurA', { speed: 1.6 });
          add(new Group(), 0.085, (u) => { S.root.position.set(A.x + (B.x - A.x) * u, 0, A.z + (B.z - A.z) * u); });
        }
        segs.push(strip(A.x, A.z, B.x, B.z, col, { life: 1.0 - n * 0.06, op: 0.8, w: 0.06, y: 0.07, grow: 0.08 }));
        strip(A.x, A.z, B.x, B.z, '#FFFFFF', { life: 0.18, op: 0.9, w: 0.04, y: 0.6 });
        sparkSpray(new Vector3(cx, 0.6, cz), { n: 3, col, speed: 2.4, spread: 1.6, life: 0.25 });
      }));
      later2(1.0, () => {
        ring(cx, cz, 1.2, GOLD, { life: 0.3, inward: true, op: 0.8 });
        ring(cx, cz, 1.0, SILVER, { life: 0.3, inward: true, op: 0.7 });
        later2(0.25, () => { sparkSpray(new Vector3(cx, 0.6, cz), { n: 18, col: GOLD, speed: 4, spread: 2, life: 0.45 }); ring(cx, cz, 0.6, '#FFFFFF', { life: 0.25, op: 0.8, y: 0.6 }); });
      });
    },
    // M34 Still Mountain: a huge seated spirit behind him for 3 s, a still pale ring under him; it rises, a ring goes out
    still_mountain: (ev) => {
      const { x, z, dx, dz } = ev;
      const S = spirit(x - dx * 1.0, z - dz * 1.0, dx, dz, ev.wills, { life: 3.6, scale: 2.0, clip: 'castPlant', speed: 1, op: 0.62,
        onT: (t, dt, S2) => { if (t > 0.28 && t < 2.95 && S2.act && S2.act.timeScale) S2.freeze(); } });
      void S;
      seal(x - dx * 1.0, z - dz * 1.0, 1.2, ev.wills, 3.3);
      const g = new Mesh(ringGeo, basic(AQUA, 0.55)), g2 = new Mesh(ringGeo, basic(BRONZE, 0.45));
      [g, g2].forEach((m) => { m.rotation.x = -Math.PI / 2; });
      add(g, 3.0, (u, t) => { const b = fox(); if (b) { g.position.set(b.x, 0.06, b.z); g2.position.set(b.x, 0.065, b.z); } g.scale.setScalar(0.85 + 0.04 * Math.sin(t * 2)); g2.scale.setScalar(0.62); g.material.opacity = 0.55 * (1 - sm(0.9, 1, u)); g2.material.opacity = 0.45 * (1 - sm(0.9, 1, u)); });
      add(g2, 3.0, null);
      later2(2.95, () => { if (S) S.play('rising', { speed: 1.2 }); });
      later2(3.05, () => {
        ring(x, z, 3, AQUA, { life: 0.9, from: 0.1, op: 0.7 });
        ring(x, z, 2.6, BRONZE, { life: 1.0, from: 0.1, op: 0.55 });
        sparkSpray(new Vector3(x, 0.2, z), { n: 12, col: AQUA, speed: 3, spread: 2, life: 0.5 });
      });
    },
    // M35 Last Stand: the spirit drives the pommel into the floor: a bronze and silver pillar, a shock ring
    last_stand: (ev) => {
      const { x, z, dx, dz } = ev;
      const S = spirit(x - dx * 0.5, z - dz * 0.5, dx, dz, ev.wills, { life: 1.2, clip: 'chargeHold' });
      if (S) { S.flipped = true; S.sword(1.5, 0.15); later2(0.13, () => S.play('slam', { speed: 1.3 })); }
      later2(0.3, () => {
        for (const [col, r, h, op] of [[BRONZE, 0.5, 2.6, 0.16], [SILVER, 0.24, 3.2, 0.14]]) {
          const c = new Mesh(new CylinderGeometry(r, r * 1.2, h, 24, 1, true), basic(col, op, true));
          c.position.set(x, h / 2, z);
          add(c, 0.7, (u) => { c.scale.set(1 + u * 0.6, Math.min(1, u * 6), 1 + u * 0.6); c.material.opacity = op * (1 - u); });
        }
        ring(x, z, 2.5, BRONZE, { life: 0.5, op: 0.7 });
        ring(x, z, 2.1, SILVER, { life: 0.45, op: 0.45 });
        chunks(x, z, { n: 14, r: 1.8, up: 3 });
        sparkSpray(new Vector3(x, 0.2, z), { n: 16, col: SILVER, speed: 4, spread: 1.8, life: 0.45 });
        const f = fox();
        if (f) label('unstoppable', BRONZE, f.x, 1.7, f.z, { life: 1.2, size: 0.26 });
      });
      // thin silver strokes stream off him for 4 s
      for (let k = 0; k < 26; k++) later2(0.4 + k * 0.15, () => { const f = fox(); if (!f) return; const a = rnd() * Math.PI * 2; const px = f.x + Math.cos(a) * 0.3, pz = f.z + Math.sin(a) * 0.3; const L = new Mesh(new PlaneGeometry(0.03, 0.45), basic(SILVER, 0.7, true)); L.position.set(px, 0.5, pz); L.rotation.y = a; add(L, 0.4, (u, t, dt) => { L.position.y += dt * 2.2; L.material.opacity = 0.7 * (1 - u); }); });
    },
    // M36 Flow: a ribbon of pale light with six small spirit swords flies out in an S, 6 u, and comes back
    flow: (ev) => {
      const { x, z, dx, dz } = ev, nx = -dz, nz = dx;
      const at = (u) => { const out = u < 0.5, v = out ? u * 2 : (1 - u) * 2, lat = (out ? 1 : -1) * 0.9 * Math.sin(Math.PI * 2 * v); return new Vector3(x + dx * 6 * v + nx * lat, 0.55, z + dz * 6 * v + nz * lat); };
      const S = spirit(x - dx * 0.8, z - dz * 0.8, dx, dz, ev.wills, { life: 1.3, clip: 'waveThrow', speed: 1.1 });
      void S;
      const swords = [];
      for (let k = 0; k < 6; k++) { const s2 = ghostSword(k % 2 ? SILVER : AQUA, 0.55, 0.5); s2.scale.setScalar(1.2); swords.push(s2); }
      const g = new Group();
      swords.forEach((s2) => g.add(s2));
      let last = null;
      add(g, 0.9, (u, t) => {
        const T = Math.max(0, Math.min(1, (t - 0.2) / 0.7));
        g.visible = t >= 0.2;
        swords.forEach((s2, k) => {
          const uu = Math.max(0, T - k * 0.035), p = at(uu), q = at(Math.min(1, uu + 0.01));
          s2.position.copy(p);
          s2.lookAt(q);
          s2.rotateX(Math.PI / 2);
        });
        const head = at(T);
        if (t >= 0.2 && last) { strip(last.x, last.z, head.x, head.z, AQUA, { life: 0.5, op: 0.32, w: 0.3, y: 0.5 }); strip(last.x, last.z, head.x, head.z, '#FFFFFF', { life: 0.3, op: 0.4, w: 0.04, y: 0.52 }); }
        last = t >= 0.2 ? head : null;
      });
      later2(0.92, () => { const f = fox(); if (f) { label('dash ready', SILVER, f.x, 1.7, f.z, { life: 1.0, size: 0.24 }); label('cooldowns -2 s', AQUA, f.x, 1.4, f.z, { life: 1.0, size: 0.22 }); ring(f.x, f.z, 0.7, SILVER, { life: 0.35, op: 0.7 }); } });
    },
  };
  const cb = { S: null, until: 0 };
  let spTake = false;
  bus.on('review_af_special', (ev) => { spTake = true; if (SPECIAL_FX[ev.name]) SPECIAL_FX[ev.name](ev); spTake = false; });

  // ---- kit 2.1 (K20): the ghost swords copy the last hit of each skill ----
  const tipDirOf = (R) => R.tipL.clone().normalize();
  function flyer(R, el) {
    const gs = R.ghostSword(el, 1);
    gs.pivot.parent?.remove(gs.pivot);
    gs.pivot.scale.setScalar(0.8);
    return gs;
  }
  const point = (R, P, d) => P.quaternion.setFromUnitVectors(tipDirOf(R), d.clone().normalize());
  bus.on('review_af_copy', (ev) => {
    const R = liveRig();
    if (!R) return;
    const slots = ev.swords.map((s) => s.slot);
    if (ev.mode === 'crescent') { cue('ghostFlick', { slots }); return; }
    const secs = ev.mode === 'base' ? ev.out + ev.stay + ev.back + 0.05 : 0.06 + ev.secs + ev.back + 0.05;
    cue('ghostAway', { slots, secs });
    ev.swords.forEach((sw, k) => {
      const c = EC[sw.el] || SILVER, gs = flyer(R, sw.el), P = gs.pivot;
      const p0 = R.slotPos(sw.slot, new Vector3());
      const side = k === 0 && ev.swords.length > 1 ? -1 : 1;
      if (ev.mode === 'base') {
        // out to the foe, a stab, back to the shoulder
        const f = byId(ev.id);
        const T = new Vector3(f ? f.x : ev.tx, 0.5, f ? f.z : ev.tz);
        const toT = T.clone().sub(p0), n = new Vector3(-toT.z, 0, toT.x).normalize();
        const A = T.clone().addScaledVector(n, 0.12 * side).addScaledVector(toT.clone().normalize(), -0.28);
        let sparked = false;
        strip(p0.x, p0.z, A.x, A.z, c, { life: 0.3, op: 0.4, w: 0.06, y: 0.55, grow: ev.out });
        add(P, secs, (u, t) => {
          const home = R.slotPos(sw.slot, new Vector3());
          if (t < ev.out) { const v = sm(0, 1, t / ev.out); P.position.copy(p0).lerp(A, v); point(R, P, A.clone().sub(p0)); }
          else if (t < ev.out + ev.stay) {
            const v = (t - ev.out) / ev.stay;
            P.position.copy(A).addScaledVector(toT.clone().normalize(), 0.18 * Math.sin(Math.PI * Math.min(1, v * 1.6)));
            if (!sparked) { sparked = true; const sp = sprite(c, 0.7, true); sp.position.copy(T); add(sp, 0.18, (w) => { sp.scale.setScalar(0.25 + 0.4 * w); sp.material.opacity = 0.7 * (1 - w); }); ring(T.x, T.z, 0.35, c, { life: 0.3, y: 0.5, op: 0.6 }); }
          } else { const v = sm(0, 1, Math.min(1, (t - ev.out - ev.stay) / ev.back)); P.position.copy(A).lerp(home, v); }
          gs.mat.uniforms.op.value = gs.op * (1 - sm(0.85, 1, u));
        });
      } else {
        // Swift: beside him along his thrust, cutting every foe on it, then home
        const a0 = new Vector3(ev.x0, 0.5, ev.z0), a1 = new Vector3(ev.x1, 0.5, ev.z1);
        const d = a1.clone().sub(a0).normalize(), n = new Vector3(-d.z, 0, d.x).multiplyScalar(0.38 * side);
        const s0 = a0.clone().add(n), s1 = a1.clone().add(n).addScaledVector(d, 0.4);
        strip(s0.x, s0.z, s1.x, s1.z, c, { life: 0.45, op: 0.35, w: 0.08, y: 0.5, grow: ev.secs });
        add(P, secs, (u, t) => {
          const home = R.slotPos(sw.slot, new Vector3());
          if (t < 0.06) { P.position.copy(p0).lerp(s0, t / 0.06); point(R, P, d); }
          else if (t < 0.06 + ev.secs) { P.position.copy(s0).lerp(s1, sm(0, 1, (t - 0.06) / ev.secs)); point(R, P, d); }
          else { const v = sm(0, 1, Math.min(1, (t - 0.06 - ev.secs) / ev.back)); P.position.copy(s1).lerp(home, v); }
          gs.mat.uniforms.op.value = gs.op * (1 - sm(0.85, 1, u));
        });
      }
    });
  });

  // ---- kit 2.1 (K26, trial): the echo, a silver ghost of him that does the fourth skill again for half ----
  bus.on('review_af_echon', (ev) => {
    const f = fox();
    if (!f) return;
    label(String(ev.n), ev.n === 4 ? '#FFFFFF' : SILVER, f.x, 1.75, f.z, { life: 0.8, size: ev.n === 4 ? 0.42 : 0.34, rise: 0.25 });
  });
  bus.on('review_af_echo', (ev) => {
    const st = window.__tripoFox;
    if (!st || !st.spirit || !ev.path.length) return;
    const S = st.spirit({ colA: SILVER, colB: '#FFFFFF', scale: 1, op: 0.5, swordA: SILVER, swordB: '#FFFFFF' });
    if (!S) return;
    if (echoG && !echoG.dead) echoG.dispose();
    echoG = S;
    S.opacity(0);
    S.play('idle', { hold: true });
    const path = ev.path, life = ev.delay + path.length / 60 + 0.6;
    const p0 = path[0];
    S.root.position.set(p0[0], 0, p0[1]);
    S.root.rotation.y = Math.atan2(p0[2], p0[3]);
    let said = false;
    add(S.root, life, (u, t, dt) => {
      S.tick(dt || 0);
      const tt = t - ev.delay;
      const p = path[Math.max(0, Math.min(path.length - 1, Math.floor(tt * 60)))];
      S.root.position.set(p[0], 0, p[1]);
      // he turns as his path turned
      const want = Math.atan2(p[2], p[3]);
      let dy = want - S.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      S.root.rotation.y += dy * Math.min(1, (dt || 0) * 14);
      // it steps out of where he stood: fades in over 0.15 s, fades out at the end
      S.opacity(Math.max(0, Math.min(1, (t - ev.delay + 0.1) / 0.15, (life - t) / 0.4)));
      if (!said && tt >= 0) { said = true; label('echo', SILVER, p[0], 1.75, p[1], { life: 0.9, size: 0.3, rise: 0.25 }); ring(p[0], p[1], 0.6, SILVER, { life: 0.4, op: 0.5 }); }
    });
  });
  // Counterblow: the blow rings like a bell on the spirit, which answers with a rising cut
  bus.on('review_af_sp_block', (ev) => {
    const S = cb.S;
    const px = ev.x + ev.dx * 0.55, pz = ev.z + ev.dz * 0.55;
    ring(px, pz, 0.9, GOLD, { life: 0.5, op: 0.9, y: 0.7 });
    ring(px, pz, 1.3, BRONZE, { life: 0.7, op: 0.6, y: 0.7 });
    ring(px, pz, 1.8, '#FFFFFF', { life: 0.9, op: 0.35, y: 0.7 });
    sparkSpray(new Vector3(px, 0.8, pz), { n: 14, col: GOLD, speed: 3.5, spread: 1.6, life: 0.4 });
    label('blocked', BRONZE, px, 1.9, pz, { life: 0.9, size: 0.26 });
    if (S) { S.root.rotation.y = Math.atan2(ev.dx, ev.dz); S.play('rising', { speed: 1.3 }); }
    later2(0.12, () => {
      strip(ev.x, ev.z, ev.x + ev.dx * 3, ev.z + ev.dz * 3, GOLD, { life: 0.5, op: 0.6, w: 1.0, y: 0.06, grow: 0.08 });
      strip(ev.x, ev.z, ev.x + ev.dx * 3, ev.z + ev.dz * 3, '#FFFFFF', { life: 0.3, op: 0.9, w: 0.07, y: 0.08, grow: 0.08 });
      slash3d(px, pz, ev.dx, ev.dz, 1.6, 60, GOLD, { y: 0.8, life: 0.3, op: 0.55, tilt: 70 });
    });
  });
  bus.on('review_af_sp_cut', (ev) => {
    const S = cb.S;
    const px = ev.x + ev.dx * 0.55, pz = ev.z + ev.dz * 0.55;
    if (S) S.play('rising', { speed: 1.1 });
    later2(0.12, () => {
      strip(ev.x, ev.z, ev.x + ev.dx * 3, ev.z + ev.dz * 3, GOLD, { life: 0.4, op: 0.45, w: 1.0, y: 0.06, grow: 0.08 });
      slash3d(px, pz, ev.dx, ev.dz, 1.4, 55, GOLD, { y: 0.8, life: 0.3, op: 0.7, tilt: 70 });
    });
  });
  bus.on('review_af_sp_guard', (ev) => label(ev.pct + '% less', ev.kind === 'still' ? AQUA : BRONZE, ev.x, 1.9, ev.z, { life: 0.9, size: 0.26 }));
  bus.on('review_af_sp_still', (ev) => { ring(ev.x, ev.z, 0.7, AQUA, { life: 2.0, from: 1, op: 0.55 }); label('stilled', AQUA, ev.x, 1.4, ev.z, { life: 0.9, size: 0.24 }); });

  function update(dt) {
    // the camera looks at the clip's focus (or follows him), keeping the game's angle
    if (stage && stage.camera) {
      const c = stage.camera, f0 = fox();
      const tx = focus.x ?? (f0 ? f0.x : 0), tz = focus.z ?? (f0 ? f0.z : 0);
      const d = new Vector3();
      c.getWorldDirection(d);
      if (d.y < -0.05) {
        const k = -c.position.y / d.y;
        const gx = c.position.x + d.x * k, gz = c.position.z + d.z * k;
        c.position.x += tx - gx;
        c.position.z += tz - gz;
        c.updateMatrixWorld();
      }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      const u = Math.min(1, it.t / it.life);
      if (it.update) it.update(u, it.t, dt);
      if (it.t >= it.life) {
        root.remove(it.obj);
        items.splice(i, 1);
        if (it.key && keyed.get(it.key) === it) keyed.delete(it.key);
      }
    }
    const f = fox();
    if (countSpr && f) {
      countSpr.position.set(f.x + 0.5, 1.45, f.z);
      const p = countSpr.userData.pop || 0;
      countSpr.userData.pop = Math.max(0, p - dt * 5);
      const base = countSpr.userData.base || (countSpr.userData.base = countSpr.scale.clone());
      countSpr.scale.copy(base).multiplyScalar(1 + 0.35 * p);
    }
  }
  return { update };
}
