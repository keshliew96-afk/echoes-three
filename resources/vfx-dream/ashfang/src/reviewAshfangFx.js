// REVIEW-ONLY (never committed, never pushed): stand-in looks for Ashfang's
// kit 1.4 on his ability review page. Dim on purpose: the real VFX are made at
// the freeze lift with the VFX templates. His colours only (kit S9): Fox
// Crimson #E8577A and Moon Silver #E7E3F0 for plain cuts and the count; fire
// gold #FFB43C on a Hearth Amber #E8A23D body; earth Ochre #8F6B45 with debris
// #5A4632; water pale aqua #7FE0F2; wind Moon Silver. No Ember, no Violet; the
// dummy's shot is Foe Crimson #B8141F.
import { AdditiveBlending, BackSide, Color, BoxGeometry, Matrix4, BufferGeometry, Float32BufferAttribute, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RingGeometry, Shape, ShapeGeometry, SphereGeometry, Sprite, SpriteMaterial, Vector3, Quaternion } from 'three';
import { getRadialTexture } from '../glow.js';

// kit 2.2 (K35): every skill, form, 剑气, 剑风 and combo is Fox Crimson with a Moon Silver edge; the old will
// colours all read Fox Crimson, their pale highlights Moon Silver
const CRIMSON = '#E8577A', SILVER = '#E7E3F0', GOLD = CRIMSON, AMBER = CRIMSON, OCHRE = CRIMSON, DEBRIS = '#77726B', AQUA = CRIMSON, FOE = '#B8141F', SMOKE = '#5B5650', STEAM = '#DDE3E6', CRUST = '#2E2622', STONE = '#8E8B85';
const EC = { fire: CRIMSON, earth: CRIMSON, water: CRIMSON, wind: CRIMSON };
// 2.0 (kit 2.0 K1): the four families are wills; the old element ids stay inside, the words go
const WILL = { fire: 'Intent', earth: 'Unbowed', water: 'Still Water', wind: 'Fervour' };
const sm = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
let rs = 12345;
const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);

export function createReviewAshfangFx({ bus, root, world, stage }) {
  globalThis.__reviewAfQuietHits = true; // VFX dream loop: the game's fire hit template is off for his hits
  // round 2: a crit on his hit in the passed burst look (a bigger pink needle star), not the game's gold lightning
  globalThis.__reviewAfCrit = (x, z) => pinkStar(x, 0.75, z, { n: 14, L0: 0.34, L1: 0.6, w0: 0.024, life: 0.3, knot: 0.14 });
  const focus = { x: null, z: null };
  window.__afFocus = (x, z) => { focus.x = x; focus.z = z; };
  // kit 2.1 (K26): a replayed event (echo) moves the silver ghost of him, not him
  let echoG = null;
  // Kesh 20 Nov 16:34 SGT (Echo, Crescent card): an echo's looks came out of him, not out of the ghost. While a
  // replayed event is drawn, and in every look it starts (they keep the context they were made in), fox() and
  // restM() answer with the ghost's pose, so anything placed on him or on his blade's path goes to the ghost
  // Kesh 20 Nov 16:57 SGT (Blade Dance · Swift): the mirror he leaves where he dashed out bursts with him; its
  // events (ev.mirror) draw at the mirror's pose the same way
  let mirrorG = null;
  let fxCtx = null;
  bus = ((on) => ({ on: (type, fn) => on(type, (ev) => {
    const G = ev && (ev.echo ? echoG : ev.mirror ? mirrorG : null);
    if (!G || G.dead) return fn(ev);
    const prev = fxCtx;
    fxCtx = { G };
    try { return fn(ev); } finally { fxCtx = prev; }
  }) }))(bus.on.bind(bus));
  const ghostEnt = (G) => {
    const r = G.root;
    return { get x() { return r.position.x; }, get z() { return r.position.z; }, get faceX() { return Math.sin(r.rotation.y); }, get faceZ() { return Math.cos(r.rotation.y); }, kind: 'ally', partyIndex: 2, id: -2, echo: true };
  };
  const echoCue = (k, ev) => {
    if (!echoG || echoG.dead) return;
    if (k === 'play') echoG.play(ev.clip, { from: ev.from || 0, speed: ev.speed || 1 });
    else if (k === 'dash') echoG.play(!ev.el ? 'dash20' : 'dash', { from: ev.from || 0, speed: ev.speed || 1 });
  };
  const cue = (k, ev) => { if (ev && ev.echo) return echoCue(k, ev); if (ev && ev.mirror) return; return window.__tripoFoxCue && window.__tripoFoxCue(k, ev); };
  // the rig that is drawn (two rig instances exist; the effects take the one updated last)
  const liveRig = () => (window.__tripoFoxSts || []).filter((r) => r.model && r.lastUp && r.ghostSword).sort((p, q) => q.lastUp - p.lastUp)[0] || null;
  const byId = (id) => {
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };
  const fox = () => (fxCtx ? (fxCtx.ent ??= ghostEnt(fxCtx.G)) : world.entities().find((e) => e.kind === 'ally' && e.partyIndex === 2) || null);
  let items = [];
  const add = (obj, life, update, key = null) => {
    root.add(obj);
    const it = { obj, t: 0, life, update, key, ctx: fxCtx };
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
  function ring(x, z, r, color, { life = 0.5, from = 0.3, op = 0.7, y = 0.05, inward = false, geo = ringGeo, keep = false } = {}) {
    // Kesh 20 Nov 06:41 UTC: every pink or silver ring is Blade Storm's passed sword ring; the passed four keep theirs (keep)
    if (!keep && geo === ringGeo && (color === CRIMSON || color === SILVER || color === '#FFFFFF')) {
      return swordRing(x, y, z, r, { tone: color === CRIMSON ? 'pink' : 'silver', life, from, inward, op: Math.min(1, op * 1.15), w: 0.12, n: r < 0.7 ? 4 : 7 });
    }
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
    if (color === CRIMSON && !pulse) return fieldDisc(x, z, r, Math.min(1, op * 2.5), life);
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
  const MOTE = { [CRIMSON]: CRIMSON };
  function puff(x, z, { n = 8, r = 0.5, color = CRIMSON, life = 0.7, h = 0.5, size = 0.35, y = 0.1, op = 0.5, dust = false } = {}) {
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
  const sliverMats = [CRIMSON, SILVER].map((c) => new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }));
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
  // round 2 (Kesh 19 Nov 14:50 UTC): the passed band look (Lunge's spear): hot-pink band, white-pink core, white glare
  function band(ax, az, bx, bz, { life = 0.4, op = 0.7, w = 0.14, y = 0.45, grow = 0 } = {}) {
    strip(ax, az, bx, bz, '#FF6FA6', { life, op, w, y, grow });
    strip(ax, az, bx, bz, '#FFD0E2', { life: life * 0.85, op: op * 0.9, w: w * 0.36, y: y + 0.004, grow });
    strip(ax, az, bx, bz, '#FFFFFF', { life: life * 0.7, op: op * 0.6, w: w * 0.18, y: y + 0.008, grow });
  }
  // round 2: a hit or flash spot in the passed burst look (pink white-tipped needles round a hot-pink knot)
  const flashStar = (x, y, z, k = 1, life = 0.28) => pinkStar(x, y, z, { n: 10, L0: 0.22 * k, L1: 0.42 * k, w0: 0.018, life, knot: 0.1 * k });
  // a cut arc in front of him
  function arc(x, z, dx, dz, r, half, color, { life = 0.22, y = 0.5, side = 1, w = 0.32, op = 0.6, spin = false } = {}) {
    op *= 0.6;
    const th = Math.min(Math.PI, (Math.max(20, half) * Math.PI) / 180);
    const g = new RingGeometry(Math.max(0.05, r - w), r, 40, 1, -th, 2 * th);
    const m = new Mesh(g, basic(color === CRIMSON ? '#FF6FA6' : color, op, true));
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

  // ---- VFX dream loop (19 Nov, Kesh's GPT repaints): 剑光 as layered strands ----
  // one painted texture for every sword light: u runs along the stroke, v across it (0 the trailing
  // side, 1 the leading edge). Thin crimson strands at many heights, a hot silver-white edge line near
  // the leading edge, the body fading toward the trailing side. 'tips' tapers at both ends (a wave);
  // 'trail' has a sharp head at u = 1 and a long fading tail toward u = 0 (a stroke behind the blade).
  const strandTexs = {};
  function strandTex(mode = 'tips', seed = 7) {
    const key = mode + seed;
    if (strandTexs[key]) return strandTexs[key];
    let r = seed * 7919 + 13;
    const R = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const W = 512, H = 128;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (mode === 'blade' || mode === 'bladeS' || mode === 'edge' || mode === 'sheen') {
      // judge round 1: one solid blade-shaped crescent (the geometry tapers it), a saturated crimson
      // body with 3-4 broad uneven darker streaks; 'edge' is the crisp white rim, brightest mid-arc
      const tip = (u) => Math.pow(Math.sin(Math.PI * u), 0.5);
      if (mode === 'sheen') {
        // Kesh 19 Nov 16:01 SGT: more 反光 — a soft white sheen hugging the outer edge, hottest a third along
        for (let x = 0; x < W; x += 2) {
          const u = x / W, e = tip(u) * (0.45 + 0.55 * Math.exp(-Math.pow((u - 0.4) / 0.18, 2)));
          const gr = g.createLinearGradient(0, H, 0, 0);
          gr.addColorStop(0, 'rgba(255,240,244,0)');
          gr.addColorStop(0.55, `rgba(255,240,244,${0.25 * e})`);
          gr.addColorStop(0.88, `rgba(255,250,252,${0.9 * e})`);
          gr.addColorStop(1, `rgba(255,255,255,${e})`);
          g.fillStyle = gr;
          g.fillRect(x, 0, 2, H);
        }
      } else if (mode === 'edge') {
        // a hard silver-white line, fading only in the last fifth before each tip
        for (let x = 0; x < W; x += 2) {
          const u = x / W, e = sm(0, 0.2, u) * (1 - sm(0.8, 1, u));
          g.fillStyle = `rgba(255,255,255,${e})`;
          g.fillRect(x, H * 0.15, 2, H * 0.7);
        }
      } else {
        for (let x = 0; x < W; x += 2) {
          const e = tip(x / W);
          const gr = g.createLinearGradient(0, H, 0, 0);
          const so = mode === 'bladeS' ? 1.35 : 1; // Kesh 19 Nov 16:01 SGT: Triple's body more solid
          gr.addColorStop(0, `rgba(214,86,120,${Math.min(1, 0.6 * so) * e})`);
          gr.addColorStop(0.15, `rgba(214,86,120,${Math.min(1, 0.65 * so) * e})`);
          gr.addColorStop(0.5, `rgba(232,110,142,${Math.min(1, 0.85 * so) * e})`);
          gr.addColorStop(0.85, `rgba(244,150,175,${0.95 * e})`);
          gr.addColorStop(1, `rgba(250,190,206,${e})`);
          g.fillStyle = gr;
          g.fillRect(x, 0, 2, H);
        }
        for (let k = 0; k < 4; k++) {
          const v = 0.2 + R() * 0.6, lw = 6 + R() * 10, a0 = R() * 0.25, a1 = 0.7 + R() * 0.3, dark = k % 2 === 0;
          for (let x = a0 * W; x < a1 * W; x += 2) {
            const u = x / W, e = tip(u) * Math.sin(Math.PI * (u - a0) / (a1 - a0));
            g.fillStyle = dark ? `rgba(196,60,96,${0.5 * e})` : `rgba(255,200,215,${0.45 * e})`;
            g.fillRect(x, H * (1 - v) - lw / 2 + Math.sin(u * 9 + k) * 2, 2, lw);
          }
        }
      }
      const t = new CanvasTexture(c);
      t.colorSpace = 'srgb';
      strandTexs[key] = t;
      return t;
    }
    const env = (u) => (mode === 'tips' ? Math.pow(Math.sin(Math.PI * u), 0.7) : Math.pow(u, 0.7) * (1 - sm(0.96, 1, u)));
    // the body: a faint crimson wash rising to the leading edge
    for (let x = 0; x < W; x += 2) {
      const e = env(x / W);
      const gr = g.createLinearGradient(0, H, 0, 0);
      gr.addColorStop(0, `rgba(232,87,122,0)`);
      gr.addColorStop(0.55, `rgba(232,87,122,${0.12 * e})`);
      gr.addColorStop(0.85, `rgba(240,100,135,${0.35 * e})`);
      gr.addColorStop(1, `rgba(240,100,135,0)`);
      g.fillStyle = gr;
      g.fillRect(x, 0, 2, H);
    }
    // strands: distinct lines with gaps between them, denser and brighter toward the leading edge
    for (let k = 0; k < 18; k++) {
      const v = 0.12 + Math.pow(R(), 0.6) * 0.78, y = H * (1 - v);
      const a0 = mode === 'tips' ? R() * 0.3 : R() * 0.5, a1 = mode === 'tips' ? 0.7 + R() * 0.3 : 0.85 + R() * 0.15;
      const white = R() < 0.15 + 0.35 * v;
      const lw = 1.2 + R() * (white ? 1.5 : 3.5);
      for (let x = a0 * W; x < a1 * W; x += 3) {
        const u = x / W, e = env(u) * Math.pow(Math.sin(Math.PI * (u - a0) / (a1 - a0)), 0.6);
        g.fillStyle = white ? `rgba(255,228,236,${0.8 * e})` : `rgba(236,82,118,${0.85 * e})`;
        g.fillRect(x, y - lw / 2, 3, lw);
      }
    }
    // the hot edge: a white line with a pink halo just inside the leading edge
    for (let x = 0; x < W; x += 2) {
      const e = env(x / W);
      g.fillStyle = `rgba(255,150,180,${0.5 * e})`;
      g.fillRect(x, H * 0.03, 2, 9);
      g.fillStyle = `rgba(255,255,255,${0.95 * e})`;
      g.fillRect(x, H * 0.05, 2, 3.5);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = 'srgb';
    strandTexs[key] = t;
    return t;
  }
  const strandMat = (tex, op, additive = true, color = '#FFFFFF') => new MeshBasicMaterial({ map: tex, color, transparent: true, opacity: op, depthWrite: false, side: DoubleSide, ...(additive ? { blending: AdditiveBlending } : {}) });
  // a crescent band with uvs, in the floor-plan xy of crescentGeo: it bulges toward +x; R the outer
  // radius, `thick` the widest band, `arc` the half angle
  function strandCrescentGeo(R, thick, arc = Math.PI / 2, n = 40, { pw = 0.8, s0 = 0, s1 = 1, f0 = 0, f1 = 1 } = {}) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const s = s0 + (s1 - s0) * (i / n), a = -arc + 2 * arc * s, k = Math.pow(Math.sin(Math.PI * (i / n)), pw);
      const r0 = R - thick * k * f1, r1 = R - thick * k * f0;
      pos.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
      uv.push(i / n, 0, i / n, 1);
    }
    for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
  }
  // a sword wave as the repaint draws it: a deep crimson crescent of strands with a hot white edge and
  // two fainter after-crescents trailing behind it (the motion blur)
  // Kesh 19 Nov 16:21 SGT: the wave is several stacked layers, outer edge in: the edge 反光 and the
  // second layer at medium opacity, the third high, the fourth medium; inside each layer the opacity runs
  // high, medium and low along the arc as the light (光追) catches it. 'lit' bakes that light into alpha.
  // c0 the colour on the layer's inner side, c1 its outer side; the lit spot also warms toward white (渐变)
  function litTex(seed, peak, lo, hi, c0 = [255, 255, 255], c1 = [255, 255, 255]) {
    const key = 'lit' + seed + peak + lo + hi + c0 + c1;
    if (strandTexs[key]) return strandTexs[key];
    const W = 512, H = 64, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const mix = (p, q, k) => p.map((v, i) => Math.round(v + (q[i] - v) * k));
    for (let x = 0; x < W; x += 2) {
      const u = x / W, tip = Math.pow(Math.sin(Math.PI * u), 0.45);
      // a key light: a hot spot at `peak`, a broad lit shoulder, and the far end in shade
      const L = Math.min(1, 0.85 * Math.exp(-Math.pow((u - peak) / 0.12, 2)) + 0.5 * Math.exp(-Math.pow((u - peak) / 0.38, 2)) + 0.15);
      const a = tip * (lo + (hi - lo) * L), wk = (seed < 2 || seed === 20 ? 0.75 : 0.2) * Math.exp(-Math.pow((u - peak) / 0.14, 2));
      const ci = mix(mix(c0, [255, 255, 255], wk), c1, 0), co = mix(c1, [255, 255, 255], wk), cm = mix(ci, co, 0.5);
      const gr = g.createLinearGradient(0, H, 0, 0);
      gr.addColorStop(0, `rgba(${ci},${a * 0.6})`);
      gr.addColorStop(0.5, `rgba(${cm},${a})`);
      gr.addColorStop(1, `rgba(${co},${a * 0.85})`);
      g.fillStyle = gr;
      g.fillRect(x, 0, 2, H);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = 'srgb';
    strandTexs[key] = t;
    return t;
  }
  // Kesh 19 Nov 16:41 SGT (Triple Crescent): additive, HDR, a white-hot core fading to deep rose-magenta and
  // crimson edges; thin needle-tipped arcs; feathered streaky trails with broken speed lines and noisy fade
  function blazeTex(mode, seed = 1) {
    const key = 'blz' + mode + seed;
    if (strandTexs[key]) return strandTexs[key];
    let r = seed * 7919 + 13;
    const R = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const W = 512, H = 128, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (mode === 'body') {
      for (let x = 0; x < W; x += 2) {
        const u = x / W, L = 0.35 + 0.65 * Math.exp(-Math.pow((u - 0.45) / 0.3, 2));
        const gr = g.createLinearGradient(0, H, 0, 0); // v=0 inner (concave) side, v=1 the leading edge
        // Kesh 16:59 SGT: no white blowout; the core is hot pink over deep magenta and crimson
        gr.addColorStop(0, 'rgba(140,10,60,0)');
        gr.addColorStop(0.18, `rgba(150,16,80,${0.6 * L})`);
        gr.addColorStop(0.4, `rgba(200,30,110,${0.9 * L})`);
        gr.addColorStop(0.62, `rgba(255,96,160,${L})`);
        gr.addColorStop(0.8, `rgba(220,40,100,${0.9 * L})`);
        gr.addColorStop(0.94, `rgba(170,20,64,${0.55 * L})`);
        gr.addColorStop(1, 'rgba(140,10,60,0)');
        g.fillStyle = gr;
        g.fillRect(x, 0, 2, H);
      }
    } else if (mode === 'core') {
      for (let x = 0; x < W; x += 2) {
        const u = x / W, L = Math.exp(-Math.pow((u - 0.45) / 0.22, 2));
        const gr = g.createLinearGradient(0, H, 0, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, `rgba(255,255,255,${L})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(x, 0, 2, H);
      }
    } else if (mode === 'ribbon') {
      // Kesh 16:59 SGT: distinct sharp ribbons with dark red separation lines inside the arc, dense.
      // Ribbons of uneven width and length with clear gaps; each has a dark red edge line, a crimson body
      // and a hot-pink lit stripe that is brightest where the light catches the arc
      let v = 0.02;
      for (let k = 0; v < 0.98; k++) {
        const wv = 0.05 + R() * 0.11, gap = 0.015 + R() * 0.05, outer = v + wv;
        const lead = Math.min(1, outer + 0.15); // ribbons nearer the leading edge are longer and brighter
        const a0 = 0.02 + (1 - lead) * 0.3 * R() + R() * 0.08, a1 = 1 - (0.02 + (1 - lead) * 0.35 * R() + R() * 0.06);
        for (let x = a0 * W; x < a1 * W; x += 2) {
          const u = x / W, f = (u - a0) / (a1 - a0), e = Math.pow(Math.sin(Math.PI * f), 0.55) * (0.35 + 0.65 * lead);
          const L = Math.exp(-Math.pow((u - 0.42) / 0.2, 2));
          const y0 = H * (1 - Math.min(1, outer)), hh = H * wv;
          const gr = g.createLinearGradient(0, y0 + hh, 0, y0);
          gr.addColorStop(0, `rgba(110,6,34,${0.95 * e})`);
          gr.addColorStop(0.12, `rgba(176,18,66,${0.9 * e})`);
          gr.addColorStop(0.55, `rgba(${Math.round(214 + 40 * L)},${Math.round(40 + 70 * L)},${Math.round(100 + 60 * L)},${0.92 * e})`);
          gr.addColorStop(0.85, `rgba(${Math.round(232 + 23 * L)},${Math.round(70 + 90 * L)},${Math.round(128 + 70 * L)},${e})`);
          gr.addColorStop(1, `rgba(110,6,34,${0.95 * e})`);
          g.fillStyle = gr;
          g.fillRect(x, y0, 2, hh);
        }
        v = outer + gap;
      }
    } else {
      // feather: many thin streaks, each broken into dashes, alpha fading with noise toward the tail (v=0)
      for (let k = 0; k < 34; k++) {
        const v = Math.pow(R(), 0.8), y = H * (1 - v), lw = 0.8 + R() * 2.2, base = 0.25 + 0.75 * v;
        let x = R() * W * 0.3;
        const end = W * (0.65 + R() * 0.35);
        while (x < end) {
          const len = 12 + R() * 70;
          for (let xx = x; xx < Math.min(end, x + len); xx += 2) {
            const u = xx / W, e = Math.pow(Math.sin(Math.PI * u), 0.6) * base * (0.5 + 0.5 * R()) * Math.sin(Math.PI * (xx - x) / len);
            g.fillStyle = `rgba(255,255,255,${0.9 * e})`;
            g.fillRect(xx, y + Math.sin(u * 7 + k) * 1.5, 2, lw);
          }
          x += len + 4 + R() * 30;
        }
      }
    }
    const t = new CanvasTexture(c);
    t.colorSpace = 'srgb';
    strandTexs[key] = t;
    return t;
  }
  function blazeCrescent(R, thick, arc, op, put, fk = 1) {
    const add = (geo, tex, o, col, hdr = 1, ro = 6) => {
      const m = put(geo, strandMat(tex, o, true, col), o);
      if (hdr !== 1) m.material.color.multiplyScalar(hdr);
      m.renderOrder = ro;
      return m;
    };
    // the feathered trail behind the blade (toward the concave side), then a faint glow, the body and the hot core
    // the ribbons: normal blending so the dark separation lines really darken
    // Kesh 17:15 SGT: v7's ribbon layer had too many lines; back to v6's lines (the ribbon texture stays unused)
    add(strandCrescentGeo(R - thick * 0.35, thick * 2.6, arc * 0.96, 64, { pw: 1.2 }), blazeTex('feather', 3), op * 0.9 * fk, '#D8306A', 1, 5);
    add(strandCrescentGeo(R - thick * 0.2, thick * 1.6, arc * 0.9, 48, { pw: 1.2 }), blazeTex('feather', 5), op * 0.7 * fk, '#C02458', 1, 5);
    add(strandCrescentGeo(R + thick * 0.05, thick * 0.9, arc * 1.02, 64, { pw: 1.8 }), blazeTex('feather', 9), op * 0.8 * Math.min(1, fk * 1.4), '#E8577A', 1, 6);
    add(strandCrescentGeo(R + thick * 0.15, thick * 1.5, arc, 64, { pw: 2.2 }), strandTex('trail', 4), op * 0.15, '#C8306A', 1, 6);
    add(strandCrescentGeo(R, thick, arc, 64, { pw: 2.2 }), blazeTex('body'), op * 0.8, '#FFFFFF', 1, 7);
    // nested echo blades inside the main one (the repaint's stacked arcs), dimmer and redder going in
    add(strandCrescentGeo(R - thick * 0.85, thick * 0.7, arc * 0.9, 64, { pw: 2.2 }), blazeTex('body'), op * 0.5, '#F07090', 1, 6);
    add(strandCrescentGeo(R - thick * 1.6, thick * 0.5, arc * 0.8, 64, { pw: 2.2 }), blazeTex('body'), op * 0.32, '#D84070', 1, 6);
    const core = add(strandCrescentGeo(R, thick, arc * 0.92, 64, { pw: 2.6, f0: 0.3, f1: 0.48 }), blazeTex('core'), op * 0.55, '#FF70B0', 1, 8);
    core.userData.glint = 0; // static
    // Kesh 17:11 SGT: the edge back to silver-white, without white blowout: a crisp normal-blended hairline
    // under the bloom threshold, lit brighter mid-arc, and a silver glint sliding along it
    { const e = put(strandCrescentGeo(R + 0.004, Math.max(thick * 0.12, 0.022), arc * 0.97, 64, { pw: 0.6 }), strandMat(litTex(30, 0.42, 0.35, 1, [200, 192, 198], [222, 216, 220]), op * 0.95, false, '#FFFFFF'), op * 0.95); e.renderOrder = 10; e.position.z = 0.004; }
    const gl = add(strandCrescentGeo(R + 0.002, Math.max(thick * 0.14, 0.026), arc * 0.18, 16, { pw: 0.8 }), strandTex('edge', 3), op * 0.5, '#B8B0B6', 1, 11);
    gl.userData.glint = arc;
  }
  function strandCrescent(w, thick, op, { rim = 1, inner = true, arcK = 1, wisps = true, rimW = 1, rimCol = '#D9CDD4', solid = false, sheen = 0, layered = false, blaze = false, featherK = 1 } = {}) {
    const grp = new Group();
    const R = w / 2, arc = Math.PI * 0.6 * arcK;
    const put = (geo, mat, o, dx = 0) => { const m = new Mesh(geo, mat); m.position.x = dx; m.renderOrder = 6; m.userData.op = o; grp.add(m); return m; };
    if (blaze) { blazeCrescent(R, thick, Math.PI * 0.68 * arcK, op, put, featherK); return grp; }
    if (layered) {
      // Kesh 19 Nov 16:33 SGT: more transparent, more detail layers, 渐变 colour. Six layers, outer edge in:
      // [from, to (share of the width), inner colour, outer colour, opacity, light peak, low, high]
      const H = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const LAY = [
        [0, 0.07, '#F48AA8', '#FFFFFF', 0.9, 0.36, 0.06, 1],
        [0.07, 0.18, '#E04E78', '#EE7698', 0.55, 0.4, 0.08, 1],
        [0.18, 0.38, '#DE4470', '#EA6088', 0.22, 0.44, 0.08, 1],
        [0.38, 0.6, '#D43662', '#E04C76', 0.4, 0.48, 0.08, 1],
        [0.6, 0.82, '#C8325F', '#D8446F', 0.42, 0.52, 0.08, 1],
        [0.82, 1, '#B02A52', '#C2365F', 0.2, 0.56, 0.05, 1],
      ];
      LAY.forEach(([f0, f1, c0, c1, o, pk, lo, hi], i) => {
        const m = put(strandCrescentGeo(R, thick, arc, 64, { pw: 1.6, f0, f1 }), strandMat(litTex(i, pk, lo, hi, H(c0), H(c1)), op * o, false, '#FFFFFF'), op * o);
        m.renderOrder = 12 - i; // outer layers over inner ones
      });
      // a white specular streak where the key light hits, just inside the edge
      { const m = put(strandCrescentGeo(R, thick, arc * 0.5, 32, { pw: 1.4, f0: 0.07, f1: 0.12, s0: 0.05, s1: 0.75 }), strandMat(litTex(20, 0.45, 0, 1, [255, 225, 235], [255, 255, 255]), op * 0.8, false, '#FFFFFF'), op * 0.8); m.renderOrder = 13; }
      // fine detail: thin light lines running along the layers, each lit in its own place
      [[0.1, 0.3, 0.4], [0.2, 0.38, 0.3], [0.3, 0.46, 0.3], [0.44, 0.5, 0.25], [0.55, 0.56, 0.25], [0.68, 0.6, 0.2], [0.8, 0.64, 0.18]].forEach(([f, pk, o], i) => {
        const m = put(strandCrescentGeo(R, thick, arc * (0.95 - 0.04 * i), 48, { pw: 1.6, f0: f, f1: f + 0.015 }), strandMat(litTex(10 + i, pk, 0.04, 1, [226, 80, 120], [246, 140, 172]), op * o, false, '#FFFFFF'), op * o);
        m.renderOrder = 13;
      });
      // the hot glint that slides along the edge as the light moves, and a dark hairline so the edge reads cut
      const gl = put(strandCrescentGeo(R + 0.002, Math.max(thick * 0.1, 0.03), arc * 0.2, 16, { pw: 0.8 }), strandMat(strandTex('edge', 3), op * 0.85, false, '#FFFFFF'), op * 0.85);
      gl.renderOrder = 10; gl.position.z = 0.006; gl.userData.glint = arc;
      const hl = put(strandCrescentGeo(R + 0.02, 0.014, arc, 48, { pw: 0.4 }), strandMat(strandTex('edge', 1), op * 0.7, false, '#9E2A4C'), op * 0.7);
      hl.renderOrder = 7;
      for (let k = 0; k < (wisps ? 4 : 0); k++) {
        const end = k % 2, rr = R - thick * (0.2 + 0.12 * k);
        const g2 = strandCrescentGeo(rr, 0.03, arc, 14, { pw: 0.7, s0: end ? 0.8 + 0.02 * k : -0.1 - 0.02 * k, s1: end ? 1.1 + 0.02 * k : 0.2 - 0.02 * k });
        put(g2, strandMat(strandTex('edge', 2), op * 0.5, false, '#E8577A'), op * 0.5);
      }
      return grp;
    }
    // the body (normal blending, so it stays crimson), the white rim (the only additive layer)
    put(strandCrescentGeo(R, thick, arc, 48, { pw: 1.7 }), strandMat(strandTex(solid ? 'bladeS' : 'blade', 3), op, false), op);
    // a second, thinner and darker crescent tucked inside the concave side
    if (inner) put(strandCrescentGeo(R - thick * 0.62, thick * 0.33, arc * 0.85, 40, { pw: 1.3 }), strandMat(strandTex('blade', 6), op * 0.7, false, '#D27890'), op * 0.8);
    const rimM = put(strandCrescentGeo(R + 0.005, Math.max(thick * 0.09, 0.035) * rimW, arc, 48, { pw: 0.5 }), strandMat(strandTex('edge', 1), Math.min(1, op * rim * 1.05), false, rimCol), Math.min(1, op * rim * 1.05));
    rimM.renderOrder = 7;
    rimM.position.z = 0.004;
    if (sheen > 0) {
      // the sheen band on the outer third, and one hot glint that slides along the edge (strandSwirl runs it)
      const sh = put(strandCrescentGeo(R, thick * 0.38, arc, 48, { pw: 1 }), strandMat(strandTex('sheen', 1), op * sheen * 0.85, false, '#E9C3CF'), op * sheen * 0.7);
      sh.renderOrder = 7; sh.position.z = 0.002;
      const gl = put(strandCrescentGeo(R + 0.004, Math.max(thick * 0.14, 0.04), arc * 0.22, 16, { pw: 0.8 }), strandMat(strandTex('edge', 3), op * sheen, false, '#FFFFFF'), op * sheen);
      gl.renderOrder = 8; gl.position.z = 0.006; gl.userData.glint = arc;
      // a hairline of deep crimson just outside the rim, so the edge reads cut, not glowing
      const hl = put(strandCrescentGeo(R + 0.022, 0.016, arc, 48, { pw: 0.4 }), strandMat(strandTex('edge', 1), op * 0.8, false, '#9E2A4C'), op * 0.8);
      hl.renderOrder = 7;
    }
    // short wisps that start on the body at each tip and trail off past it, carrying the curve on
    for (let k = 0; k < (wisps ? 4 : 0); k++) {
      const end = k % 2, rr = R - thick * (0.2 + 0.12 * k);
      const g2 = strandCrescentGeo(rr, 0.03, arc, 14, { pw: 0.7, s0: end ? 0.8 + 0.02 * k : -0.1 - 0.02 * k, s1: end ? 1.1 + 0.02 * k : 0.2 - 0.02 * k });
      put(g2, strandMat(strandTex('edge', 2), op * 0.55, true, '#E8577A'), op * 0.55);
    }
    return grp;
  }
  // a swirl of strands round him for a great cut: three nested crescents lying round his body, opening
  // toward his aim, spun in fast and faded (the repaint's wrap of sword light round the fox)
  function strandSwirl(f, tilt = 0, side = 1, { r = 0.85, op = 0.85, life = 0.38, thick = 0.55, inner = true, arcK = 1, rim = 0.5, yawOff = 0, wisps = true, rimW = 1, rimCol, solid = false, sheen = 0, layered = false, blaze = false } = {}) {
    if (!f) return null;
    const d = facing(f);
    const g = new Group();
    g.position.set(f.x, 0.5, f.z);
    g.rotation.y = Math.atan2(d.x, d.z) - Math.PI / 2 + yawOff;
    const roll = new Group();
    roll.rotation.x = (tilt * Math.PI) / 180;
    g.add(roll);
    const sc = strandCrescent(r * 2, thick, op, { rim, inner, arcK, wisps, rimW, solid, sheen, layered, blaze, ...(rimCol ? { rimCol } : {}) });
    sc.rotation.x = -Math.PI / 2;
    sc.scale.y = side;
    const spin = new Group();
    spin.add(sc);
    roll.add(spin);
    const ms = [];
    sc.traverse((o) => { if (o.material) ms.push(o); });
    return add(g, life, (u, t) => {
      const k = sm(0, 0.12, t);
      spin.rotation.y = side * (1 - k) * 1.2;
      spin.scale.setScalar(0.8 + 0.2 * k + 0.08 * u);
      for (const m of ms) {
        m.material.opacity = m.userData.op * Math.min(1, t / 0.04) * (1 - sm(0.45, 1, u));
        if (m.userData.glint) m.rotation.z = m.userData.glint * (-0.55 + 1.3 * sm(0, 0.7, u)); // the glint runs tip to tip
      }
    });
  }
  // a standing crescent of strands at a spot (moonAt drawn as the repaint): bulges toward `yaw`
  function strandMoon(x, y, z, yaw, { w = 1.4, thick = 0.4, op = 0.85, life = 0.6, grow = 0.08, roll = 0, inner = true, arcK = 1, wisps = true, rimW = 1, rimCol, solid = false, sheen = 0 } = {}) {
    const g = new Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw - Math.PI / 2;
    const r = new Group();
    r.rotation.z = roll;
    g.add(r);
    const sc = strandCrescent(w, thick, op, { inner, arcK, wisps, rimW, solid, sheen, ...(rimCol ? { rimCol } : {}) });
    r.add(sc);
    const ms = [];
    sc.traverse((o) => { if (o.material) ms.push(o); });
    return add(g, life, (u, t) => {
      const k = Math.min(1, t / grow);
      r.scale.set(0.5 + 0.5 * k, 0.3 + 0.7 * k, 1);
      for (const m of ms) m.material.opacity = m.userData.op * (1 - sm(0.55, 1, u));
    });
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
    if (color === CRIMSON || color === SILVER) {
      // round 2: the passed blade look (hot-pink body, white-pink core, silver hairline on the edge)
      const pr = ink ? 'brush' : 'taper';
      mk(bandGeo(r, w, th, n, pr, side), '#FF6FA6', op, true);
      mk(bandGeo(r - w * 0.12, w * 0.3, th * 0.92, n, pr, side), '#FFD0E2', op * 0.9, true);
      mk(bandGeo(r + 0.006, 0.022, th * 0.95, n, pr, side), '#E4DCE2', Math.min(1, op * 1.2), false);
    } else if (ink) {
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
      const top = new Mesh(new PlaneGeometry(w, 0.3), basic(ev.kind === 'blaze' ? GOLD : SILVER, 0.5, true));
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
      if (ev.kind === 'great') {
        // VFX dream loop: the repaint's wave (Triple Crescent and the great waves)
        const sc = strandCrescent(w * 1.1, 0.3, ev.half ? 0.7 : 1, { blaze: true }); // Kesh 16:41 SGT // Kesh 16:01 SGT: more solid, more 反光
        const roll = new Group();
        sc.rotation.x = -Math.PI / 2;
        roll.add(sc);
        const tl = ((ev.tilt || 0) * Math.PI) / 180;
        roll.position.y = Math.max(0.5, (w * 0.55) * Math.sin(tl) * 0.95 + 0.06);
        roll.rotation.x = tl;
        g.add(roll);
        g.userData.strand = sc;
        g.userData.sparked = new Set();
        g.rotation.y = Math.atan2(ev.dx, ev.dz) - Math.PI / 2;
        g.position.set(ev.x, 0, ev.z);
        root.add(g);
        const it = { g, ev, t: 0, last: { x: ev.x, z: ev.z } };
        waves.set(ev.id, it);
        return it;
      }
      // round 2 (Kesh 19 Nov 14:50 UTC): every flying 剑气 in the passed blade-crescent look (Triple Crescent's
      // blazeCrescent), at its own size; the shape and flight stay the original's
      const blz = ev.kind !== 'stone' && ev.kind !== 'sentback';
      if (blz) {
        const sc = strandCrescent(w, ev.kind === 'thin' ? 0.13 : 0.2, ev.half ? 0.6 : 0.9, { blaze: true });
        sc.rotation.x = -Math.PI / 2;
        sc.position.y = 0.5;
        g.add(sc);
      } else {
      const c1 = mk(crescentGeo(w, thick), col, op, 0.5);
      c1.scale.set(1, 1, 1);
      const c2 = mk(crescentGeo(w * 0.8, thick), ev.kind === 'strong' ? CRIMSON : col, op * 0.6, 0.48);
      c2.position.x = -0.18;
      }
      // 2.0: a great wave stands at its cut's tilt (flat, slanted, tall); a keen one has a hot edge
      if (ev.tilt) {
        const roll = new Group();
        while (g.children.length) roll.add(g.children[0]);
        roll.position.y = 0.5;
        roll.children.forEach((m) => { m.position.y -= 0.5; });
        roll.rotation.x = (ev.tilt * Math.PI) / 180;
        g.add(roll);
      }
      if (!blz && (ev.kind === 'keen' || ev.kind === 'great')) {
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
        band(f.x, f.z, x1, z1, { life: 0.45, op: 0.65, w: 0.12, y: 0.42, grow: 0.5 }); // round 2: the passed band look
      });
      later2(0.4, () => { const t = fox(); if (t) sparkSpray(new Vector3(t.x + ev.dx * 0.3, 0.08, t.z + ev.dz * 0.3), { n: 10, dir: new Vector3(ev.dx, 0.5, ev.dz), col: CRIMSON }); });
    }
  });
  bus.on('review_af_blur', (ev) => cue('blur', ev));
  bus.on('review_af_blink', (ev) => {
    const st = window.__tripoFox;
    band(ev.x0, ev.z0, ev.x1, ev.z1, { life: 0.25, op: 0.5, w: 0.08, y: 0.5 }); // round 2: the passed band look
    if (st && st.snapshot) {
      const g = pinkShade();
      if (g) add(g, 0.25, (u) => setShade(g, 0.22 * (1 - u)));
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
    // the whole cut (Kesh 19 Nov 09:31 SGT: too short, not complete): the strike stretch that holds the
    // cut's time, from where the blade speeds up to where it slows (st.strikes); else 50 ms before to 60 after
    const Wn = (st.strikes && st.strikes[ev.clip]) || [];
    const w = Wn.find(([a, b]) => ev.at >= a - 0.03 && ev.at <= b + 0.03);
    const kc = Math.round(ev.at / sw.dt);
    const k0 = Math.max(0, Math.min(kc, Math.round((w ? w[0] : ev.at - 0.05) / sw.dt)));
    const k1 = Math.min(sw.pts.length - 1, Math.max(kc, Math.round((w ? w[1] : ev.at + 0.06) / sw.dt)));
    const P = [];
    for (let k = k0; k <= k1; k++) {
      const p = sw.pts[k];
      P.push([new Vector3(p[0], p[1], p[2]).applyMatrix4(M), new Vector3(p[3], p[4], p[5]).applyMatrix4(M)]);
    }
    return { P, kc: kc - k0, dt: sw.dt, piv: new Vector3(0, 0.5, 0.04).applyMatrix4(M) };
  }
  // the band along the blade itself (Kesh 19 Nov 09:31 SGT: the 剑光 sat out at the hit's reach, away
  // from the sword): a0 to a1 is the band across the blade, from its guard (0) to its tip (1), past the
  // tip a little; it thins to the tip line toward its start (VFX_TEMPLATES "A stroke tapers")
  function ribbon(P, piv, a0, a1, taper) {
    const n = P.length, pos = new Float32Array(n * 6), al = new Float32Array(n * 2), idx = [];
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1), [b, t] = P[i];
      const w = taper ? Math.pow(s, 0.8) : 1;
      const o = b.clone().lerp(t, a1), inn = b.clone().lerp(t, a1 - (a1 - a0) * w);
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
    const strong = !!ev.strong, col = CRIMSON, E1 = strong ? 1.2 : 1.12;
    const g = new Group();
    const layers = [
      // round 2 (Kesh 19 Nov 14:50 UTC): the passed blade look: hot-pink body, white-pink core, silver hairline
      [ribbon(P, piv, 0.35, E1, true), '#FF6FA6', strong ? 0.6 : 0.5, 1, true],
      [ribbon(P, piv, 0.75, E1 - 0.03, true), '#FFD0E2', strong ? 0.7 : 0.55, 0.85, true],
      [ribbon(P, piv, E1 - 0.035, E1 + 0.005, false), '#E4DCE2', 0.8, 0.7, false],
    ];
    void col;
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
    const tip = P[kc][0].clone().lerp(P[kc][1], E1);
    tip.y = Math.max(0.06, tip.y);
    const s = new Sprite(new SpriteMaterial({ map: star(), color: '#FFB8D2', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.9 }));
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
    // round 2: the passed burst look (pink white-tipped needles round a hot-pink knot), no flash
    const kS = strong ? 1.3 : 1;
    pinkStar(at.x, at.y, at.z, { n: strong ? 10 : 8, L0: 0.13 * kS, L1: 0.26 * kS, w0: 0.016, life: 0.24, knot: 0.08 * kS });
    // the cut mark across the dummy, along the swing, facing out of the dummy
    const mk = new Mesh(new PlaneGeometry(1, 1), basic('#FFD0E2', 0.95, true));
    mk.position.copy(at).addScaledVector(to, 0.02);
    const nrm = to.clone();
    const xa = sw.clone().addScaledVector(nrm, -sw.dot(nrm)).normalize(), ya = new Vector3().crossVectors(nrm, xa);
    mk.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(xa, ya, nrm));
    add(mk, 0.26, (u) => { mk.scale.set((strong ? 0.5 : 0.38) * (0.6 + 0.4 * Math.min(1, u * 8)), 0.03 * (1 - u) + 0.008, 1); mk.material.color.set(u < 0.25 ? '#FFD0E2' : '#FF6FA6'); mk.material.opacity = 0.95 * (1 - u); });
    // sparks thrown along the swing, off the dummy's face
    const nS = strong ? 12 : 8;
    for (let k = 0; k < nS; k++) {
      const m = new Mesh(needleGeo, needleMat());
      const v = sw.clone().multiplyScalar(0.75).add(to.clone().multiplyScalar(0.45)).add(new Vector3(rnd() - 0.5, rnd() * 0.8, rnd() - 0.5).multiplyScalar(0.9)).normalize().multiplyScalar(2.4 + rnd() * 2.4);
      const p = at.clone();
      const life = 0.16 + rnd() * 0.14;
      add(m, life, (u, t, dt2) => {
        v.y -= 9 * dt2;
        p.addScaledVector(v, dt2);
        m.position.copy(p);
        m.lookAt(p.x + v.x, p.y + v.y, p.z + v.z);
        m.scale.set(0.6, 0.6, 0.4 + Math.min(1.6, v.length() * 0.35));
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
  const needleGeo = (() => {
    const g = new ConeGeometry(0.018, 0.18, 4).rotateX(Math.PI / 2);
    const P = g.attributes.position, col = [], cw = new Color('#FFFFFF'), cc = new Color(CRIMSON);
    for (let i = 0; i < P.count; i++) { const k = (P.getZ(i) + 0.09) / 0.18; const c = cc.clone().lerp(cw, sm(0.75, 1, k)); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    return g;
  })();
  const needleMat = () => new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
  const fleckGeo = new BoxGeometry(0.035, 0.006, 0.02);
  // dust where a foot lands on a hit (the right foot on hits 1 and 5, the left on hit 6)
  function footDust(ev) {
    const st = window.__tripoFox;
    const which = { af1: 'footR', af5: 'footR', af6: 'footL', af3: 'footL' }[ev.clip];
    if (!which || !st || !st.model) return;
    const fb = st.model.getObjectByName(which);
    if (!fb) return;
    const p = new Vector3().setFromMatrixPosition(fb.matrixWorld);
  }

  // ---- cuts, thrusts, strong cut ----
  bus.on('review_af_cut', (ev) => {
    if (ev.quiet && rnd() < 0.3) return;
    // 1.8: a basic cut (it names its clip) draws from the blade's path; every hit sparks
    if (ev.clip) {
      const S = ev.style === 'thrust' ? sweepPts(ev) : sweepSlash(ev);
      if (S && ev.style === 'thrust') {
        const L = ev.r + 0.5;
        band(ev.x, ev.z, ev.x + ev.dx * L, ev.z + ev.dz * L, { life: 0.28, op: 0.75, w: 0.14, y: 0.42, grow: 0.3 });
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
      band(ev.x, ev.z, ev.x + ev.dx * L, ev.z + ev.dz * L, { life: 0.28, op: 0.75, w: 0.14, y: 0.55, grow: 0.3 });
      flashStar(ev.x + ev.dx * L, 0.56, ev.z + ev.dz * L, 0.6, 0.2);
    } else if (ev.style === 'ink' || ev.style === 'sweep') {
      const t = ev.tilt || 0;
      const y = ev.low ? 0.22 : Math.abs(t) > 60 ? 0.75 : 0.55;
      slash3d(ev.x, ev.z, ev.dx, ev.dz, ev.r + 0.15, ev.half, col, { tilt: t, y, side: ev.side || (t < 0 ? -1 : 1), ink: ev.style === 'ink', op: ev.strong ? 0.8 : 0.62, life: ev.style === 'ink' ? 0.42 : 0.32, w: ev.style === 'ink' ? 0.3 : 0.36 });
    } else if (!ev.rising) arc(ev.x, ev.z, ev.dx, ev.dz, ev.r, ev.half, col, { side: ev.side || 1, y: 0.5, op: ev.strong ? 0.8 : 0.55 });
  });
  bus.on('review_af_strong', (ev) => {
    const f = fox();
    if (f) {
      // a small spark at the blade's reach, clear of his body (Kesh 20:13: the old flash sat on him)
      flashStar(f.x + ev.dx * 1.2, 0.6, f.z + ev.dz * 1.2, 0.5, 0.18);
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
    band(x - Math.cos(a) * 0.4, z - Math.sin(a) * 0.4, x + Math.cos(a) * 0.4, z + Math.sin(a) * 0.4, { life: 0.22, w: 0.07, y: 0.7, op: 0.8 });
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
    if (it.g.userData.strand) {
      const done = it.g.userData.sparked;
      for (const e of world.entities()) {
        if (e.faction !== 'hostile' || done.has(e.id)) continue;
        const rx = e.x - ev.x, rz = e.z - ev.z, along = rx * it.ev.dx + rz * it.ev.dz, across = -rx * it.ev.dz + rz * it.ev.dx;
        if (Math.abs(along) < 0.45 && Math.abs(across) < it.ev.w * 0.6) {
          done.add(e.id);
          const p0 = new Vector3(e.x + it.ev.dx * 0.15, 0.5, e.z + it.ev.dz * 0.15);
          // Kesh 16:41 SGT: a white-hot core flash, sharp radiating streaks, a subtle white ring round the dummy
          sparkSpray(p0, { n: 16, dir: new Vector3(it.ev.dx, 0.35, it.ev.dz), col: CRIMSON, speed: 3.6, spread: 2.4, life: 0.24, needle: true, white: true, nl: 1.6 });
          const fc = sprite('#FFF3DA', 0.9, true);
          fc.position.copy(p0);
          add(fc, 0.16, (u) => { fc.scale.setScalar(0.55 * (0.5 + u)); fc.material.opacity = 0.9 * (1 - u) * (1 - u); });
          const fc2 = sprite(CRIMSON, 0.5, true);
          fc2.position.copy(p0);
          add(fc2, 0.22, (u) => { fc2.scale.setScalar(0.9 * (0.6 + u)); fc2.material.opacity = 0.5 * (1 - u) * (1 - u); });
          ring(e.x, e.z, 0.32, '#FFFFFF', { life: 0.2, op: 0.22, y: 0.06, keep: true }); // passed (Triple Crescent)
        }
      }
    }
    if (it.g.userData.strand) { if (false) { const sd = (rnd() - 0.5) * it.ev.w * 0.6; sparkSpray(new Vector3(ev.x - it.ev.dx * 0.3 + it.ev.dz * sd, 0.3 + rnd() * 0.5, ev.z - it.ev.dz * 0.3 - it.ev.dx * sd), { n: 2, dir: new Vector3(it.ev.dx, 0.2, it.ev.dz), col: CRIMSON, speed: 2.5, spread: 0.6, life: 0.2, white: false }); } }
    else if (it.ev.el === 'fire' && rnd() < 0.5) puff(ev.x, ev.z, { n: 1, r: 0.1, color: SMOKE, h: 0.5, y: 0.5, size: 0.3, op: 0.3, life: 0.6 });
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
    label('settled', SILVER, ev.x, 1.75, ev.z, { life: 0.9, size: 0.28 });
  });
  bus.on('review_af_stun', (ev) => {
    onFoe('stun', ev.id, ev.secs, (g) => {
      const pips = [];
      // 2.0: the daunt 震慑, three small bronze blades pointing in at the head, turning
      for (let i = 0; i < 3; i++) {
        const m = new Mesh(new BoxGeometry(0.02, 0.02, 0.16), basic(SILVER, 0.9, true));
        g.add(m);
        pips.push(m);
      }
      const halo = new Mesh(new RingGeometry(0.26, 0.29, 32), basic(CRIMSON, 0.6, true));
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
      const m = new Mesh(new CylinderGeometry(0.26, 0.3, 1.0, 8), basic(SILVER, 0.35));
      m.position.y = 0.5;
      g.add(m);
      return (u) => { m.material.opacity = 0.35 * (1 - sm(0.8, 1, u)); };
    });
  });
  bus.on('review_af_stuck', (ev) => {
    onFoe('stuck', ev.id, ev.secs, (g) => {
      const m = new Mesh(ringGeo, basic('#6E6A64', 0.8));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.04;
      m.scale.setScalar(0.4);
      g.add(m);
      return () => {};
    });
  });
  // kit 2.2 (K31): Crimson Edge, a crit calls a small ghost blade that cuts the foe again
  bus.on('review_af_ghostcut', (ev) => {
    const e = byId(ev.id), x = e ? e.x : ev.x, z = e ? e.z : ev.z;
    const R = liveRig();
    if (R) {
      const gs = R.ghostSword('plain', 1);
      gs.pivot.parent?.remove(gs.pivot);
      gs.pivot.scale.setScalar(0.75);
      const a0 = new Vector3(x - 0.55, 1.1, z - 0.2), a1 = new Vector3(x + 0.45, 0.35, z + 0.15), d = a1.clone().sub(a0).normalize();
      gs.pivot.quaternion.setFromUnitVectors(R.tipL.clone().normalize(), d);
      add(gs.pivot, 0.32, (u) => { gs.pivot.position.copy(a0).lerp(a1, sm(0, 0.55, u)); gs.mat.uniforms.op.value = (u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4); });
      strip(a0.x, a0.z, a1.x, a1.z, CRIMSON, { life: 0.25, op: 0.6, w: 0.05, y: 0.7, grow: 0.15 });
    }
    label('ghost blade', CRIMSON, x, 1.55, z, { life: 0.7, size: 0.24 });
  });
  // kit 2.2 (K31): Calm Edge, a thin silver ring at his feet while he has taken no hit for 3 s
  let calmIt = null;
  bus.on('review_af_calm', (ev) => {
    if (calmIt) { kill(calmIt); calmIt = null; }
    const f = fox();
    if (!ev.on) { if (f) label('calm broken', SILVER, f.x, 1.7, f.z, { life: 0.8, size: 0.26 }); return; }
    if (f) label('calm +15%', SILVER, f.x, 1.7, f.z, { life: 0.9, size: 0.28 });
    const m = new Mesh(new RingGeometry(0.62, 0.66, 48), basic(SILVER, 0.55));
    m.rotation.x = -Math.PI / 2;
    calmIt = add(m, 999, (u, t) => { const g = fox(); if (g) m.position.set(g.x, 0.04, g.z); m.material.opacity = 0.4 + 0.15 * Math.sin(t * 3); });
  });
  bus.on('review_af_coldedge', (ev) => {
    const e = byId(ev.id);
    if (e) { ring(e.x, e.z, 0.5, AQUA, { life: 0.3, y: 0.6 }); }
  });
  bus.on('review_af_lift', (ev) => {
    const e = byId(ev.id);
  });
  bus.on('review_af_spike', (ev) => {
    ring(ev.x, ev.z, ev.r, GOLD, { life: 0.4, op: 0.6, keep: true }); // passed (Crescent Finisher)
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
    if (ev.kind === 'quake') { chunks(ev.x, ev.z, { n: 12, r: ev.r * 0.8, up: 1.4 }); }
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
    // round 3: the floor crack look (Kesh's crack repaint), run out along the wave as it travels
    taperCrack(ev.x, ev.z, Math.atan2(ev.dz, ev.dx), ev.len, 0.2, { life: 1.4, grow: ev.secs });
    const n = 10;
    for (let i = 0; i < n; i++) {
      const u = (i + 1) / n;
      setTimeout(() => chunks(ev.x + ev.dx * ev.len * u, ev.z + ev.dz * ev.len * u, { n: 2, r: 0.3, up: 1.4, size: 0.7 }), ev.secs * 1000 * u);
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
      const d = new Mesh(new RingGeometry(0.92, 1, 48), basic(CRIMSON, 0.35));
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
      const d = new Mesh(discGeo, basic('#3E3B39', 0.7));
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
      const d = new Mesh(discGeo, basic('#4A4744', 0.8));
      d.rotation.x = -Math.PI / 2;
      d.position.y = 0.02;
      g.add(d);
      for (let i = 0; i < 6; i++) {
        const b = new Mesh(new CircleGeometry(0.08, 10), basic('#6E6A64', 0.9));
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
    const m = new Mesh(g, basic(SILVER, 0.45, true));
    m.rotation.set(-Math.PI / 2, 0, Math.atan2(ev.dx, ev.dz) - Math.PI / 2);
    m.position.set(ev.x, 0.06, ev.z);
    add(m, 0.7, (u) => { m.material.opacity = 0.45 * (1 - u); m.scale.setScalar(0.4 + 0.6 * Math.min(1, u * 4)); });
    puff(ev.x + ev.dx * 2, ev.z + ev.dz * 2, { n: 10, r: 1.4, color: SILVER, h: 0.3, y: 0.3, size: 0.4, op: 0.4 });
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
        const m = new Mesh(new RingGeometry(0.7, 1, 40, 1, 0, Math.PI * 1.3), basic(CRIMSON, ev.tornado ? 0.2 : 0.45, true));
        m.rotation.x = -Math.PI / 2;
        m.position.y = 0.15 + i * (ev.tornado ? 0.35 : 0.25);
        g.add(m);
      }
      // Blade Wheel (Kesh 20 Nov 17:08 SGT): a small tornado with many small swords flying inside, cutting the foes
      const tw = ev.wheel ? tornadoOfSwords(CRIMSON) : null;
      if (tw) g.add(tw.g);
      root.add(g);
      w = { g, r: ev.r, col: CRIMSON, tornado: !!ev.tornado };
      w.it = add(new Group(), 99, (u, t, dt) => {
        if (tw) { tw.tick(t, dt || 0, w.r); return; }
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
  // a small tornado of crimson light, 1.7 u tall and widening upward (radius 0.4 to 1 times r), with 22 small ghost
  // swords flying up it in a spiral, each point leading round, the lower ones faster.
  // Kesh 20 Nov 18:42 SGT (round 4 repaint, the wind's look only; the swords stay ours): the wind is smooth see-through
  // sheets of pink light wrapping up the funnel in spirals, each with a crisp pale upper edge, a thin lower edge and a
  // soft fill, overlapping in layers (inner ones deeper pink), fading at their ends, with a soft swirl at the foot
  let windTex = null;
  function windSheetTex() {
    if (windTex) return windTex;
    const W = 256, Hh = 64, cv = document.createElement('canvas');
    cv.width = W; cv.height = Hh;
    const g = cv.getContext('2d'), img = g.createImageData(W, Hh);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1), along = Math.pow(Math.sin(Math.PI * u), 0.7) * (0.55 + 0.45 * u); // fades at both ends, brighter at the head
      for (let y = 0; y < Hh; y++) {
        const v = 1 - y / (Hh - 1); // 1 at the upper edge
        // a brush stroke: a bright pale line along the top edge with a hot-pink glow trailing down from it
        const edge = Math.exp(-((v - 0.88) ** 2) / 0.004), fill = 0.55 * Math.pow(Math.max(0, v), 2.2) * (v < 0.95 ? 1 : (1 - v) / 0.05), bot = 0.25 * Math.exp(-((v - 0.08) ** 2) / 0.0006);
        const k = Math.min(1, edge + fill + bot) * along;
        const i = (y * W + x) * 4;
        img.data[i] = 255; img.data[i + 1] = Math.round(40 + (190 - 40) * edge); img.data[i + 2] = Math.round(120 + (220 - 120) * edge); img.data[i + 3] = Math.round(255 * k);
      }
    }
    g.putImageData(img, 0, 0);
    windTex = new CanvasTexture(cv);
    return windTex;
  }
  // one spiral sheet on the funnel: `turns` round while it climbs from h0 to h1, `w` tall, sitting k times out
  function windSheet(H, rAt, { h0 = 0, h1 = H, turns = 1.1, w = 0.32, k = 1, th0 = 0, col = '#FF3F86', op = 0.8 } = {}) {
    const N = 64, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, th = th0 + s * turns * Math.PI * 2, h = h0 + (h1 - h0) * s, rr = rAt(h) * k;
      for (const [dv, vv] of [[-w / 2, 0], [w / 2, 1]]) {
        const hh = Math.max(0.02, h + dv), r2_ = rAt(hh) * k;
        pos.push(Math.cos(th) * r2_, hh, -Math.sin(th) * r2_);
        uv.push(s, vv);
      }
      void rr;
      if (i < N) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const m = new Mesh(geo, new MeshBasicMaterial({ map: windSheetTex(), color: col, transparent: true, opacity: op, depthWrite: false, side: DoubleSide, blending: AdditiveBlending }));
    m.renderOrder = 5;
    return m;
  }
  function tornadoOfSwords(col) {
    const g = new Group(), sheets = [], swords = [];
    const H = 1.9, rAt = (h) => 0.18 + 0.82 * Math.pow(h / H, 1.2); // a narrow foot that opens into a tall funnel
    // thin bright streaks spiralling up: outer ones pale and slow, inner ones deep pink and fast
    const SPEC = [
      { k: 1.0, turns: 1.7, w: 0.16, th0: 0, col: '#FF7AAE', op: 1, spin: 7 },
      { k: 1.0, turns: 1.7, w: 0.15, th0: 1.6, col: '#FF7AAE', op: 0.95, spin: 7 },
      { k: 1.0, turns: 1.7, w: 0.15, th0: 3.2, col: '#FF7AAE', op: 0.9, spin: 7 },
      { k: 1.0, turns: 1.7, w: 0.14, th0: 4.8, col: '#FF7AAE', op: 0.85, spin: 7 },
      { k: 0.75, turns: 2.2, w: 0.13, th0: 0.8, col: '#FF2F7A', op: 1, spin: 9.5, h1: H * 0.9 },
      { k: 0.75, turns: 2.2, w: 0.13, th0: 2.9, col: '#FF2F7A', op: 0.95, spin: 9.5, h1: H * 0.9 },
      { k: 0.75, turns: 2.2, w: 0.12, th0: 5.0, col: '#FF2F7A', op: 0.9, spin: 9.5, h1: H * 0.9 },
      { k: 1.1, turns: 1.1, w: 0.1, th0: 2.4, col: '#FFB0CC', op: 0.6, spin: 5.5, h0: H * 0.4 },
      { k: 1.1, turns: 1.1, w: 0.09, th0: 5.5, col: '#FFB0CC', op: 0.5, spin: 5.5, h0: H * 0.5 },
    ];
    // the hot pink haze inside the funnel: an open cone, brightest low, gone at the rim
    const hazeGeo = new CylinderGeometry(rAt(H) * 0.9, rAt(0) * 0.9, H, 32, 8, true);
    { const pa = hazeGeo.attributes.position, col = []; for (let i = 0; i < pa.count; i++) { const v = (pa.getY(i) + H / 2) / H, a = 0.55 * Math.pow(1 - v, 0.6) * Math.min(1, v * 6); col.push(a, a, a); } hazeGeo.setAttribute('color', new Float32BufferAttribute(col, 3)); }
    const haze = new Mesh(hazeGeo, new MeshBasicMaterial({ color: '#FF1F6E', vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, side: DoubleSide, blending: AdditiveBlending }));
    haze.position.y = H / 2 + 0.05; haze.userData.spin = 0; haze.userData.op = 0.32; g.add(haze); sheets.push(haze);
    for (const sp of SPEC) { const m = windSheet(H, rAt, { ...sp, w: sp.w * 1.5 }); m.userData.spin = sp.spin; m.userData.op = sp.op; g.add(m); sheets.push(m); }
    // the soft swirl at the foot: two short sheets lying low round it
    const foot = [windSheet(H, rAt, { h0: 0.02, h1: 0.12, turns: 0.9, w: 0.08, k: 2.6, th0: 0.5, col: '#FF6FA6', op: 0.55 }), windSheet(H, rAt, { h0: 0.02, h1: 0.1, turns: 0.9, w: 0.06, k: 3.4, th0: 3.6, col: '#FF6FA6', op: 0.35 })];
    foot.forEach((m) => { m.userData.spin = 6; m.userData.op = m.material.opacity; g.add(m); sheets.push(m); });
    for (let i = 0; i < 22; i++) {
      const s = ghostSword(col, 0.45, 0.24);
      const P = new Group(); P.add(s);
      s.rotation.set(0, 0, -Math.PI / 2); // point along the pivot's +x, so it leads round the spiral
      g.add(P);
      swords.push({ P, a0: (i * 2.39996) % (Math.PI * 2), h0: (i / 22) * H, w: 9 + (i % 5) });
    }
    const tick = (t, dt, r) => {
      sheets.forEach((m, i) => { m.rotation.y = t * m.userData.spin + i; m.scale.set(r, 1, r); m.material.opacity = m.userData.op * (0.85 + 0.15 * Math.sin(t * 6 + i * 1.7)); });
      for (const s of swords) {
        const h = (s.h0 + t * 1.1) % H, a = s.a0 + t * s.w * (1.2 - 0.4 * h / H), rr = r * rAt(h) * 0.85;
        s.P.position.set(Math.cos(a) * rr, 0.1 + h, -Math.sin(a) * rr);
        s.P.rotation.set(0, a + Math.PI / 2, 0.35); // tangent, nose a little up the spiral
        s.P.scale.setScalar(Math.min(1, h / 0.25, (H - h) / 0.25)); // they grow in at the foot, shrink out at the top
      }
    };
    return { g, tick };
  }
  // the swords cut each foe the tornado holds: a small crimson crescent through it at a new angle, and a fleck of light
  bus.on('review_af_whirlcut', (ev) => {
    (ev.ids || []).forEach((id, i) => {
      const e = byId(id);
      if (!e) return;
      const a = rnd() * Math.PI * 2;
      later2(0.03 * i, () => {
        slash3d(e.x, e.z, Math.cos(a), Math.sin(a), 0.5, 50, CRIMSON, { tilt: (rnd() - 0.5) * 120, y: 0.4 + rnd() * 0.5, life: 0.18, op: 0.7, w: 0.22 });
        sparkSpray(new Vector3(e.x, 0.6, e.z), { n: 3, col: SILVER, speed: 1.8, life: 0.18, needle: true, nw: 0.4 });
      });
    });
  });
  bus.on('review_af_whirlpos', (ev) => { const w = whirls.get(ev.id); if (w) w.g.position.set(ev.x, 0, ev.z); });
  // Blade Storm: blades whirl round him while he spins
  bus.on('review_af_storm', (ev) => {
    const g = new Group();
    for (let i = 0; i < 3; i++) {
      const m = new Mesh(new RingGeometry(0.85, 1.0, 40, 1, 0, Math.PI * 0.5), basic(CRIMSON, 0.45, true));
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
      // Kesh 20 Nov 16:54 SGT, every form: the mirror really plays the 剑花. A pink shade of him (the echo's
      // look) that plays Mirror Image's own 剑花 (mirror20, 0.10 to 0.325 s, the blade circling in front) in a
      // slow loop, at half speed, facing where he faced
      const st = window.__tripoFox;
      const S = st && st.spirit ? st.spirit({ colA: '#FF3F86', colB: '#FF9CC0', scale: 1, op: 0.5, swordA: '#FF6FA6', swordB: '#FFD0E2' }) : null;
      if (!S) return;
      const f = fox();
      S.root.position.set(ev.x, 0, ev.z);
      S.root.rotation.y = f ? Math.atan2(f.faceX, f.faceZ) : 0;
      S.play('mirror20', { from: 0.1, speed: 0.5 });
      image = add(S.root, 99, (u, t, dt) => {
        if (S.act && S.act.time > 0.325) S.act.time = 0.1 + (S.act.time - 0.325);
        S.tick(dt || 0);
        S.opacity(Math.min(1, t / 0.15) * (0.9 + 0.1 * Math.sin(t * 3)));
      });
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
    chunks(ev.x, ev.z, { n: 6, r: 0.5, up: 1.6 });
    label('wall slam', SILVER, ev.x, 1.7, ev.z, { life: 0.9, size: 0.3 });
  });

  // ---- mixes and passives ----
  const MIXC = { Blaze: GOLD, Quake: EC.earth, Flood: AQUA, Tornado: SILVER, Firestorm: GOLD, Magma: GOLD, Steam: STEAM, Mud: EC.earth, Sandstorm: EC.earth, Frost: SILVER };
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
    flashStar(ev.x, 0.55, ev.z, 1.2, 0.3);
    puff(ev.x, ev.z, { n: 10, r: ev.r * 0.8, color: c, h: 0.5, y: 0.4, size: 0.25, op: 0.45, life: 0.5 });
    if (ev.el === 'earth') chunks(ev.x, ev.z, { n: 5, r: 0.8 });
  });

  // ---- 1.5: Earthsplitter (S23) ----
  let chargeIt = null;
  // Kesh 18 Nov 14:54: the Crescent basic attack's charge. A crimson light gathers at the blade's tip
  // and grows, motes are drawn into it, a thin ring fills round his feet (a tick at 0.4 s, where the
  // shot starts to go through every foe), and at full a flash: it fires by itself as the last hit
  // ---- Kesh 18 Nov 15:36, the form changes ----
  // Crescent Finisher · Crescent: the cut mark 剑痕 in the floor ahead, held while the foes gather to it
  bus.on('review_af_floorscar', (ev) => {
    strip(ev.x0, ev.z0, ev.x1, ev.z1, CRIMSON, { life: ev.stay, op: 0.85, w: 0.09, y: 0.03, grow: 0.12 });
    strip(ev.x0, ev.z0, ev.x1, ev.z1, SILVER, { life: ev.stay * 0.8, op: 0.6, w: 0.025, y: 0.034, grow: 0.12 });
    sparkSpray(new Vector3((ev.x0 + ev.x1) / 2, 0.05, (ev.z0 + ev.z1) / 2), { n: 10, col: CRIMSON, speed: 2, spread: 2, life: 0.3 });
  });
  bus.on('review_af_gatherline', (ev) => ring(ev.x, ev.z, ev.r, CRIMSON, { life: 0.35, op: 0.5, inward: true }));
  // a skill's charges (Sword Bloom · Swift, Moonfang · Crescent)
  bus.on('review_af_charges', (ev) => {
    const f = fox();
    if (!f) return;
    label('charges ' + ev.n + ' / ' + ev.max, SILVER, f.x, 1.95, f.z, { life: 0.8, size: 0.24, rise: 0.2 });
  });
  // Moonfang · Crescent: the mark is consumed for a sure crit
  bus.on('review_af_markpop', (ev) => {
    ring(ev.x, ev.z, 0.7, CRIMSON, { life: 0.3, op: 0.8, y: 0.6, from: 0.3 });
    sparkSpray(new Vector3(ev.x, 0.7, ev.z), { n: 12, col: SILVER, speed: 3, spread: 2, life: 0.3 });
    label('mark: crit', CRIMSON, ev.x, 1.9, ev.z, { life: 0.8, size: 0.26 });
  });
  // a blink (Mirror Ring · Swift, Blade Wheel · Swift's recast): a flash where he was and where he lands
  bus.on('review_af_blink', (ev) => {
    const k = ev.dim ? 0.6 : 1; // Thousand Cuts' blinks: glare 40% down (pick 1)
    for (const [x, z] of [[ev.x0, ev.z0], [ev.x1, ev.z1]]) {
      ring(x, z, 0.45, CRIMSON, { life: 0.22, op: 0.7, y: 0.4, from: 0.2 });
      if (ev.dim) { const s = sprite(SILVER, 0.6 * k, true); s.position.set(x, 0.5, z); add(s, 0.2, (u) => { s.scale.setScalar(0.6 * (1 - u) + 0.1); s.material.opacity = 0.6 * k * (1 - u); }); } // Thousand Cuts (passed) keeps its own
      else flashStar(x, 0.5, z, 0.7, 0.22);
    }
    const R = window.__tripoFox;
    const im = R && R.snapshot ? pinkShade() : null;
    if (im) { im.position.set(ev.x0, 0, ev.z0); root.add(im); add(im, 0.25, (u) => setShade(im, 0.35 * k * (1 - u))); }
  });
  // Mirror Ring · Crescent: a mirror image does the 剑花 in the middle, he stays where he cast
  bus.on('review_af_imgflower', (ev) => {
    const R = window.__tripoFox;
    const im = R && R.snapshot ? pinkShade() : null;
    ring(ev.x, ev.z, 0.5, SILVER, { life: 0.35 });
    if (!im) return;
    im.position.set(ev.x, 0, ev.z);
    root.add(im);
    add(im, ev.secs, (u, t) => { im.rotation.y = t * 14; setShade(im, 0.45 * (1 - sm(0.8, 1, u))); });
  });
  // Ink Dive · Swift: a foe carried up shows a thin ring under it; the crash where they land
  bus.on('review_af_carry', (ev) => {
    onFoe('carry', ev.id, ev.secs, (g) => {
      const m = new Mesh(ringGeo, basic(CRIMSON, 0.6));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.04;
      m.scale.setScalar(0.4);
      g.add(m);
      return (u) => { m.material.opacity = 0.6 * (1 - sm(0.85, 1, u)); };
    });
  });
  bus.on('review_af_carryland', (ev) => {
    ring(ev.x, ev.z, ev.r, CRIMSON, { life: 0.5, op: 0.8 });
    ring(ev.x, ev.z, ev.r * 0.6, SILVER, { life: 0.3, op: 0.6 });
    label('carried ×' + ev.n, CRIMSON, ev.x, 1.8, ev.z, { life: 0.9, size: 0.28 });
  });
  let shotIt = null;
  const tipW = () => {
    const R = liveRig();
    if (!R || !R.weapon || !R.tipL) return null;
    R.weapon.updateMatrixWorld(true);
    return R.tipL.clone().multiplyScalar(0.92).applyMatrix4(R.weapon.matrixWorld);
  };
  bus.on('review_af_bcharge', (ev) => {
    if (!ev.on) {
      if (shotIt) kill(shotIt);
      shotIt = null;
      const f = fox();
      if (f) label(ev.tier === 'full' ? 'full · last hit' : ev.tier === 'tap' ? 'quick shot' : 'charged ' + ev.held + ' s', ev.tier === 'full' ? CRIMSON : SILVER, f.x, 1.75, f.z, { life: 0.9, size: ev.tier === 'full' ? 0.32 : 0.26 });
      return;
    }
    const g = new Group();
    const glow = sprite(CRIMSON, 0.8, true), core = sprite('#FFFFFF', 0.7, true);
    g.add(glow, core);
    // round 3 (the charge repaint): the fill arc is the charge circle's crisp hot-pink line, over a faint tight glow
    const ringM = new Mesh(new RingGeometry(0.5, 0.515, 64, 1, Math.PI / 2, 0.001), basic('#FF3F86', 0.95));
    const edgeM = new Mesh(new RingGeometry(0.49, 0.53, 96), basic('#FF2F7A', 0.3, true));
    ringM.renderOrder = 6; edgeM.renderOrder = 5;
    ringM.rotation.x = edgeM.rotation.x = -Math.PI / 2;
    ringM.position.y = edgeM.position.y = 0.035;
    root.add(ringM, edgeM);
    let lastMote = 0, tapDone = false, fullDone = false;
    shotIt = add(g, ev.full + 1.2, (u, t) => {
      const k = Math.min(1, t / ev.full);
      const p = tipW(), f = fox();
      if (p) g.position.copy(p);
      const s = 0.12 + 0.42 * k * k + (fullDone ? 0.06 * Math.sin(t * 30) : 0);
      glow.scale.setScalar(s * 1.6);
      core.scale.setScalar(s * 0.55);
      glow.material.opacity = 0.35 + 0.45 * k;
      core.material.opacity = 0.3 + 0.5 * k;
      if (f) { ringM.position.x = edgeM.position.x = f.x; ringM.position.z = edgeM.position.z = f.z; }
      ringM.geometry.dispose();
      ringM.geometry = new RingGeometry(0.5, 0.515 + 0.01 * k, 64, 1, Math.PI / 2, Math.max(0.001, k * Math.PI * 2));
      if (p && t - lastMote > 0.07 && !fullDone) {
        lastMote = t;
        for (let i = 0; i < 2; i++) {
          const m = sprite(i ? SILVER : CRIMSON, 0.8, true);
          const a = rnd() * Math.PI * 2, r = 0.45 + rnd() * 0.3, y0 = (rnd() - 0.3) * 0.5;
          const from = new Vector3(p.x + Math.cos(a) * r, p.y + y0, p.z + Math.sin(a) * r);
          add(m, 0.28, (uu) => { const q = tipW() || p; m.position.lerpVectors(from, q, sm(0, 1, uu)); m.scale.setScalar(0.07 * (1 - 0.5 * uu)); m.material.opacity = 0.8 * (1 - sm(0.7, 1, uu)); });
        }
      }
      if (!tapDone && t >= ev.tap && f) { tapDone = true; ring(f.x, f.z, 0.62, SILVER, { life: 0.25, op: 0.45, from: 0.8 }); }
      if (!fullDone && t >= ev.full - 1e-3 && f) {
        fullDone = true;
        ring(f.x, f.z, 0.9, CRIMSON, { life: 0.3, op: 0.8, from: 0.4 });
        if (p) sparkSpray(p, { n: 12, col: SILVER, speed: 2.4, spread: 2, life: 0.25 });
      }
      if (u >= 1 || it2.dead) { root.remove(ringM, edgeM); }
    });
    const it2 = shotIt;
    const off = add(new Group(), ev.full + 1.25, (u) => { if (shotIt !== it2 || u >= 1) { root.remove(ringM, edgeM); ringM.geometry.dispose(); kill(off); } });
  });
  // round 3 (Kesh's charge repaint, 20 Nov 07:11 UTC): while he charges, his sword wears a faceted blade of pink sword
  // light (pink body, pale centre ridge, pale rim), riding the sword itself
  function crystalBlade() {
    const st = window.__tripoFox;
    if (!st || !st.weapon || !st.tipL || !st.axis) return null;
    const ax = st.axis, tip = st.tipL[ax], g0 = st.guardL[ax], sgn = Math.sign(tip) || 1;
    const L = Math.abs(tip - g0) * 1.12, W = Math.abs(tip) * 0.1;
    const inner = new Group();
    const mats = [];
    const put = (geo, c, o, opts = {}) => { const m = new Mesh(geo, new MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: opts.back ? BackSide : DoubleSide, vertexColors: !!opts.vc, ...(opts.add ? { blending: AdditiveBlending } : {}) })); m.userData.op = o; mats.push(m.material); m.material.userData.op = o; inner.add(m); return m; };
    // v4: built flat like the repaint draws it: a pale silver bevel round the outline, a deep pink panel inside, its
    // left half lit, a white ridge down the middle, a diamond tip, a winged guard, and a tight pink glow outside
    const shape = (pts) => { const sh = new Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath(); return new ShapeGeometry(sh); };
    let z = 0;
    // he holds the sword upright while he charges, so the panels turn round the blade to face the camera each frame
    const face = new Group();
    inner.add(face);
    z = Math.abs(tip) * 0.14; // in front of the sword's own blade (it is about 0.1 of its length thick), so it covers it
    const flat = (pts, c, o, add) => { const m = put(shape(pts), c, o, { add }); inner.remove(m); face.add(m); m.position.z = z; z += 0.0015; m.renderOrder = 7 + z; return m; };
    const out = [[-W, 0], [W, 0], [W * 0.92, L * 0.74], [0, L], [-W * 0.92, L * 0.74]];
    flat(out.map(([x, y]) => [x * 1.25, y * 1.03 - 0.015 * L]), '#FF2F7A', 0.16, true);
    flat(out, '#CFC2CA', 0.95);
    flat([[-W * 0.7, L * 0.03], [W * 0.7, L * 0.03], [W * 0.64, L * 0.73], [0, L * 0.92], [-W * 0.64, L * 0.73]], '#B81A56', 0.97);
    flat([[-W * 0.7, L * 0.03], [0, L * 0.03], [0, L * 0.92], [-W * 0.64, L * 0.73]], '#F0508E', 0.6);
    flat([[-W * 0.07, L * 0.04], [W * 0.07, L * 0.04], [W * 0.07, L * 0.84], [0, L * 0.92], [-W * 0.07, L * 0.84]], '#FFD6E6', 0.9);
    // the guard: a pink bar with a swept wing each side
    flat([[-W * 2.1, L * 0.04], [-W * 1.1, -L * 0.015], [W * 1.1, -L * 0.015], [W * 2.1, L * 0.04], [W * 1.1, L * 0.035], [-W * 1.1, L * 0.035]], '#D83A78', 0.95);
    const outer = new Group();
    outer.add(inner);
    if (ax === 'x') outer.rotation.z = -sgn * Math.PI / 2;
    else if (ax === 'z') outer.rotation.x = sgn * Math.PI / 2;
    else if (sgn < 0) outer.rotation.x = Math.PI;
    outer.position[ax] = g0;
    st.weapon.add(outer);
    const camL = new Vector3();
    const turn = () => {
      const cam = stage && stage.camera;
      if (!cam) return;
      inner.updateMatrixWorld(true);
      camL.setFromMatrixPosition(cam.matrixWorld);
      inner.worldToLocal(camL);
      face.rotation.y = Math.atan2(camL.x, camL.z);
    };
    return { set: (k) => { turn(); for (const m of mats) m.opacity = m.userData.op * k; }, remove: () => { outer.parent && outer.parent.remove(outer); } };
  }
  // and its circle on the floor: a crisp hot-pink line with a pale core and a soft glow (unit radius)
  function chargeCircle() {
    const g = new Group();
    let ord = 0;
    const put = (a, b, c, o, ad) => { const m = new Mesh(new RingGeometry(a, b, 160), basic(c, o, ad)); m.rotation.x = -Math.PI / 2; m.userData.op = m.material.opacity; m.renderOrder = 5 + 0.1 * ord++; g.add(m); return m; };
    // v2: a thin line, the glow held tight to it (v1's wide glow read as a pale band)
    put(0.972, 1.016, '#FF2F7A', 0.35, true);
    put(0.984, 1.004, '#FF2F7A', 0.6, true);
    put(0.989, 0.999, '#FF3F86', 0.95);
    put(0.9925, 0.9965, '#FFE0EC', 0.95);
    return g;
  }
  // Kesh 20 Nov 16:40 SGT (Titan Cleave, Crescent): a great Grove sword hangs point-down over the charge circle and
  // grows while he charges; on release it shoots down
  let skySword = null;
  const faceCam = (g) => { const c = stage && stage.camera; if (c) g.rotation.y = Math.atan2(c.position.x - g.position.x, c.position.z - g.position.z) + Math.PI / 2; };
  // a scarred foe bursts open as a star (Sword Bloom's bloom), k sizes it
  function bloomAt(x, z, k) {
    flashStar(x, 0.6, z, 1.3 * k, 0.35);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, L = (i % 2 ? 0.6 : 1.0) * k; strip(x, z, x + Math.cos(a) * L, z + Math.sin(a) * L, GOLD, { life: 0.35, op: 0.65, w: 0.04, y: 0.04, grow: 0.25 }); }
    ring(x, z, 1.5 * k, GOLD, { life: 0.4, op: 0.5 });
  }
  // Sword Bloom (Kesh 20 Nov 17:04 and 17:29 SGT): a sword (the Grove sword, 0.7 size) floats point down over the
  // foe, its flat to the camera, following it; at ev.secs it stabs down into the foe in 0.08 s and fades; ev.bloom
  // (Crescent 1, Swift 0.5) opens a bloom where it stabs
  bus.on('review_af_hangsword', (ev) => {
    const sw = groveSword(), g = new Group(), glow = sprite('#FF2F7A', 0.3, true);
    g.add(sw);
    glow.position.y = 0.55; glow.scale.setScalar(0.7); g.add(glow);
    g.scale.setScalar(0.7);
    sw.traverse((o) => { if (o.material) o.userData.o0 = o.material.opacity; });
    let hitDone = false;
    const life = ev.secs + 0.4;
    add(g, life, (u, t) => {
      const e = byId(ev.id), x = e ? e.x : ev.x, z = e ? e.z : ev.z;
      const drop = sm(0, 1, Math.min(1, Math.max(0, (t - ev.secs) / 0.08)));
      g.position.set(x, 1.55 + 0.05 * Math.sin(t * 6) - 1.25 * drop, z);
      faceCam(g);
      const k = Math.min(1, t / 0.15) * (1 - sm(ev.secs + 0.12, life, t));
      sw.traverse((o) => { if (o.material) o.material.opacity = o.userData.o0 * k; });
      glow.material.opacity = 0.3 * k * (1 - drop * 0.5);
      if (!hitDone && t >= ev.secs + 0.08) {
        hitDone = true;
        pinkStar(x, 0.55, z, { size: 0.8, life: 0.22 });
        ring(x, z, 0.45, CRIMSON, { life: 0.3, op: 0.6, y: 0.04 });
        sparkSpray(new Vector3(x, 0.5, z), { n: 6, col: CRIMSON, dir: new Vector3(0, 1, 0), speed: 2.2, spread: 0.8, life: 0.25, needle: true, nw: 0.5 });
        if (ev.bloom) bloomAt(x, z, ev.bloom);
      }
    });
  });
  bus.on('review_af_charge', (ev) => {
    cue('play', { clip: 'chargeHold', from: 0 });
    if (!ev.sky) { cue('swordScale', { to: 1.8, secs: ev.full }); cue('edge', { el: 'earth', secs: ev.full + 0.6 }); }
    const m = chargeCircle();
    m.position.set(ev.x, 0.04, ev.z);
    const cb = ev.sky ? null : crystalBlade();
    let sw = null;
    if (ev.sky) {
      sw = groveSword();
      const glow = sprite('#FF3F86', 0.5, true);
      glow.position.y = 0.5; glow.scale.set(0.9, 1.8, 1);
      sw.add(glow);
      sw.position.set(ev.x, 0.9, ev.z);
      // Kesh 20 Nov 18:12 SGT (two swords): the sword keeps its own state, so the slam clearing skySword no longer
      // set a dropped sword back to hovering; it is gone once it has dropped
      const S = { g: sw, x: ev.x, z: ev.z, s: 1, drop: null };
      skySword = S;
      const it = add(sw, ev.full + 2.5, (u, t, dt) => {
        faceCam(sw);
        if (S.drop != null) {
          // it shoots down: point first into the floor in 0.2 s, then is gone in the hit's light
          S.drop += dt || 0;
          const k = Math.min(1, S.drop / 0.2);
          sw.position.y = 0.9 * (1 - k * k) - 0.15 * k;
          sw.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * (k < 1 ? 1 : Math.max(0, 1 - (S.drop - 0.2) / 0.15)); });
          if (S.drop >= 0.35) kill(it);
          return;
        }
        const k = Math.min(1, t / ev.full);
        // it gathers out of the air over 0.25 s and grows from 1.0 to 1.7 u long as he charges (a broad blade); it sways
        S.s = 1.0 + 0.7 * k;
        const ss = S.s;
        sw.scale.set(ss * 1.6, ss, ss * 1.6);
        sw.position.y = 0.9 + 0.05 * Math.sin(t * 5);
        sw.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * Math.min(1, t / 0.25); });
      });
    }
    chargeIt = add(m, ev.full + 0.6, (u, t) => {
      const k = Math.min(1, t / ev.full);
      m.scale.setScalar(ev.r0 + (ev.r1 - ev.r0) * k);
      m.traverse((o) => { if (o.material) o.material.opacity = o.userData.op * (0.55 + 0.45 * k) * (1 - sm(0.92, 1, u)); });
      if (cb) { cb.set(Math.min(1, t / 0.25) * (1 - sm(0.92, 1, u))); if (u >= 0.999) cb.remove(); }
      // let go without a release: the sword stays until the slam drops it
      if (sw && u >= 0.999 && skySword && skySword.g === sw && skySword.drop == null) { /* held */ }
    });
  });
  // the hit's crescent blades (Kesh's ref): tall curved blades of sword light burst up out of the floor in a ring
  // round the hit, each bending in over the middle, with rays of light on the floor between them
  // Kesh 20 Nov 18:44 SGT: the 剑风 is moon shaped. An upright crescent moon: tips on the floor and at H, the outer arc
  // bulging W out (+x), the inner arc bulging less, so it is thickest in the middle and sharp at both tips
  // k thins the crescent round its middle line, so the glow, body, edge band, core and hairline nest inside each other
  function moonBlade(H, k = 1) {
    const pts = [], N = 18, W = H * 0.42, Wi = W * 0.42, mid = (W + Wi) / 2, ht = ((W - Wi) / 2) * k;
    for (let i = 0; i <= N; i++) { const s = i / N; pts.push([(mid + ht) * Math.sin(Math.PI * s), H * s]); }
    for (let i = N - 1; i > 0; i--) { const s = i / N; pts.push([(mid - ht) * Math.sin(Math.PI * s), H * s]); }
    const sh = new Shape();
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    sh.closePath();
    return new ShapeGeometry(sh);
  }
  function hornRing(x, z, r, { n = 8, life = 0.45 } = {}) {
    // Kesh 20 Nov 18:38 SGT: the 剑风 slower and with more detail. Each blade flies out in 0.5 s (was 0.18) and rises in
    // 0.3 s, 0.035 s apart; two fading after-images trail it, a silver hairline runs down its edge, its pale core
    // shimmers, it sheds pink needle sparks as it flies, and it cuts a glowing line in the floor along its way
    // Kesh 20 Nov 19:06 SGT: too slow. They fire together the moment the sword stabs down, reach the ring in 0.1 s (before
    // the slam motion ends), and stand facing out along their own line instead of turning to the camera
    const FLY = 0.1, GAP = 0.004;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const H = r * (0.8 + 0.2 * ((i * 7) % 3) / 2);
      // Kesh 20 Nov 17:32 SGT: each blade is a vertical 剑风 cut out of the blow: it flies out from near the middle to
      // the ring as it rises, with a vertical sword-light cut along its way
      const ca = Math.cos(a), sa = Math.sin(a);
      later2(i * GAP, () => slash3d(x + ca * r * 0.55, z + sa * r * 0.55, ca, sa, H * 0.55, 60, CRIMSON, { tilt: 90, y: H * 0.45, life: 0.3, op: 0.7, w: 0.3 }));
      later2(i * GAP, () => {
        strip(x + ca * r * 0.05, z + sa * r * 0.05, px, pz, '#FF4F90', { life: 0.6, op: 0.55, w: 0.06, y: 0.045, grow: FLY });
        strip(x + ca * r * 0.05, z + sa * r * 0.05, px, pz, '#FFE0EC', { life: 0.45, op: 0.5, w: 0.015, y: 0.047, grow: FLY });
      });
      // dim and readable: a soft glow, a deep pink body, a hot-pink edge band, a thin pale core and a silver hairline
      const lay = [['#FF2F7A', 0.28, true, 1.3], ['#C8145A', 0.6, false, 1], ['#FF4F90', 0.65, false, 0.5], ['#FFD0E2', 0.6, false, 0.14], ['#E7E3F0', 0.5, false, 0.045]];
      // the blade, then two after-images that lag 0.05 and 0.1 s behind at 40% and 18%
      [[0, 1], [0.025, 0.4], [0.05, 0.18]].forEach(([lag, k0], gi) => {
        const g = new Group();
        g.position.set(px, 0.02, pz);
        const inner = new Group();
        g.add(inner);
        const ms = (gi ? lay.slice(0, 3) : lay).map(([col, op, ad, k], li) => { const m = new Mesh(moonBlade(H, k), basic(col, op * k0, ad)); m.position.z = li * 0.002 - gi * 0.01; m.renderOrder = 6 + li * 0.1 - gi; m.userData.op = m.material.opacity; inner.add(m); return m; });
        let spark = 0;
        add(g, life + i * GAP, (u, t, dt) => {
          g.rotation.set(0, -a, 0); // its face along its own outward line, the bulge leading
          const T = Math.max(0, t - i * GAP - lag);
          // Kesh 20 Nov 18:44 SGT: fired from where the sword stabs down, small at the point and growing big as it flies out
          const fly = 1 - Math.pow(1 - Math.min(1, T / FLY), 3), d = r * fly;
          g.position.set(x + ca * d, 0.02, z + sa * d);
          const grow = 0.15 + 0.85 * fly;
          inner.scale.set(grow, grow * (1 + 0.04 * Math.sin(T * 30) * (1 - fly)), grow);
          const out = sm(0.65, 1, u);
          ms.forEach((m, li) => {
            const shimmer = li === 3 ? 0.8 + 0.2 * Math.sin(T * 38 + i) : 1;
            m.material.opacity = m.userData.op * (1 - out) * shimmer * (T > 0 ? 1 : 0);
          });
          // needle sparks off the blade while it flies
          if (!gi && T > 0 && T < FLY && (spark -= dt || 0) <= 0) {
            spark = 0.06;
            sparkSpray(new Vector3(g.position.x, H * (0.3 + 0.5 * rnd()), g.position.z), { n: 2, col: CRIMSON, dir: new Vector3(ca, 0.6, sa), speed: 1.6, spread: 0.6, life: 0.3, needle: true, nw: 0.4 });
          }
        });
      });
    }
    // rays of light on the floor from the middle, between the blades
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1 * (i % 3), L = r * (0.9 + 0.5 * ((i * 5) % 4) / 3);
      strip(x, z, x + Math.cos(a) * L, z + Math.sin(a) * L, '#FF4F90', { life: 0.45, op: 0.75, w: 0.05 + 0.03 * (i % 2), y: 0.05, grow: 0.08 });
      strip(x, z, x + Math.cos(a) * L * 0.8, z + Math.sin(a) * L * 0.8, '#FFE0EC', { life: 0.3, op: 0.7, w: 0.015, y: 0.052, grow: 0.08 });
    }
  }
  bus.on('review_af_slam', (ev) => {
    if (ev.phase === 'swing') { cue('play', { clip: 'slam', from: 0 }); if (ev.sky && skySword) skySword.drop = 0; return; }
    if (chargeIt) { kill(chargeIt); chargeIt.update && chargeIt.update(1, chargeIt.life, 0); }
    chargeIt = null;
    if (!ev.sky) cue('swordScale', { to: 1, secs: 0.45 });
    const r = ev.r;
    if (ev.sky) { skySword = null; hornRing(ev.x, ev.z, r * 0.9, { n: 8 }); pinkStar(ev.x, 0.4, ev.z, { n: 14, L0: 0.5, L1: 0.9, w0: 0.03, life: 0.3, knot: 0.2 }); }
    // round 2 (Kesh's Titan Cleave repaint, 19 Nov 15:46 UTC): the same ring, field, inner ring and cuts, in its look
    swordRing(ev.x, 0.05, ev.z, r, { tone: 'pink', life: 0.55, from: 0.3, op: 1, w: 0.12, n: 9 });
    fieldDisc(ev.x, ev.z, r, 1, 0.6);
    swordRing(ev.x, 0.05, ev.z, r * 0.55, { tone: 'silver', life: 0.25, from: 0.3, op: 0.6, w: 0.07, n: 7 });
    chunks(ev.x, ev.z, { n: 8 + Math.round(8 * ev.f), r: r * 0.6, up: 2.6 });
    // cracks run out from the blow, and a fissure runs ahead along his aim
    // Kesh 20 Nov: cracks like Stonehide's, wide at the hit point, a hairline at the end
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd() * 0.5;
      taperCrack(ev.x + Math.cos(a) * 0.12, ev.z + Math.sin(a) * 0.12, a, r * (1.0 + 0.35 * rnd()), 0.22, { life: 1.2, grow: 0.12 });
    }
    // fine hairline cracks round the hit (the repaint's crazed floor)
    for (let i = 0; i < 6; i++) { const a = rnd() * Math.PI * 2, d = 0.3 + 0.5 * rnd(); taperCrack(ev.x + Math.cos(a) * d, ev.z + Math.sin(a) * d, a + (rnd() - 0.5) * 1.2, 0.3 + 0.3 * rnd(), 0.035, { life: 1.1, grow: 0.15, branch: 0, seam: 0.25 }); }
    taperCrack(ev.x, ev.z, Math.atan2(ev.dz, ev.dx), r * 1.6, 0.3, { life: 1.4, grow: 0.2, y: 0.046 });
    label(ev.f > 0.95 ? 'full charge' : ev.f < 0.1 ? 'quick slam' : Math.round(ev.f * 100) + '% charge', EC.earth, ev.x, 1.7, ev.z, { life: 1.0, size: 0.3 });
  });
  bus.on('review_af_smash', (ev) => { ring(ev.x, ev.z, 1, EC.earth, { life: 0.4 }); label('smash', EC.earth, ev.x, 1.5, ev.z, { life: 0.8, size: 0.3 }); });

  // ---- 1.5: Tide Ring (S30) ----
  let tide = null;
  bus.on('review_af_tidering', (ev) => {
    if (ev.on) {
      const g = new Group();
      g.position.set(ev.x, 0, ev.z);
      // round 2 (Kesh's Mirror Ring repaint, passed 20 Nov): the zone look, shared by every floor zone (zoneLook)
      const zl = zoneLook(ev.r);
      g.add(zl);
      const edgeM = zl.children[1];
      root.add(g);
      const st = window.__tripoFox;
      const imgs = ev.pts.map((P) => {
        if (!P) return null;
        const [x, z] = P;
        const im = st && st.snapshot ? pinkShade() : null;
        if (!im) return null;
        setShade(im, 0.45);
        im.position.x = x;
        im.position.z = z;
        im.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(ev.x - x, ev.z - z));
        root.add(im);
        ring(x, z, 0.4, AQUA, { life: 0.35 });
        return im;
      });
      tide = { g, imgs, it: add(new Group(), 99, (u, t) => { edgeM.material.opacity = Math.min(0.9, t * 3); }) };
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
    const im = tide.imgs[ev.k];
    strip(ev.x0, ev.z0, ev.x1, ev.z1, AQUA, { life: 0.5, op: 0.6, w: 0.12, y: 0.5, grow: 0.5 });
    strip(ev.x0, ev.z0, ev.x1, ev.z1, SILVER, { life: 0.35, op: 0.5, w: 0.04, y: 0.52, grow: 0.5 });
    if (!im) return;
    tide.imgs[ev.k] = null;
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
  bus.on('review_af_ringburst', (ev) => {
    for (let i = 0; i < 3; i++) {
      const a = rnd() * Math.PI * 2, rr = 0.6 + rnd() * (ev.r - 0.9);
      const x = ev.x + Math.cos(a) * rr * 0.5, z = ev.z + Math.sin(a) * rr * 0.5;
      bladeArc(x, z, Math.cos(a + 1.6), Math.sin(a + 1.6), 0.9 + rnd() * 0.6, 70, { life: 0.3, y: 0.4 + rnd() * 0.3, op: 1, w: 0.45, tone: i ? 'pink' : 'silver' });
    }
    swordRing(ev.x, 0.3, ev.z, ev.r * (0.5 + 0.15 * ev.i), { tone: 'pink', life: 0.3, op: 0.6, w: 0.1, n: 6 });
  });
  bus.on('review_af_flower', (ev) => cue('flower', ev));

  // ---- 1.5 restyles from the copy-all refs ----
  // Crescent Finisher (5bsoG8vEr): a gold star on the floor where the rising cut lands
  // VFX dream loop round 2: the passed burst look (Thousand Cuts), shared: tapered needles with hot-pink bodies and
  // white last quarters round a small hot-pink knot. flat: on the floor; else in the camera's plane.
  function pinkStar(x, y, z, { n = 12, L0 = 0.3, L1 = 0.52, w0 = 0.022, fan = Math.PI * 2, phi = 0, flat = false, life = 0.32, knot = 0.12 } = {}) {
    const bg = new Group();
    bg.position.set(x, y, z);
    if (flat) bg.rotation.x = -Math.PI / 2;
    else { const cam = stage && stage.camera; if (cam) bg.quaternion.copy(root.getWorldQuaternion(new Quaternion()).invert().multiply(cam.getWorldQuaternion(new Quaternion()))); }
    const bms = [];
    for (let k = 0; k < n; k++) {
      const a = phi + (fan >= Math.PI * 2 - 1e-3 ? (k / n) * fan : (k / Math.max(1, n - 1) - 0.5) * fan) + (rnd() - 0.5) * 0.12;
      const L = L0 + (L1 - L0) * rnd();
      const arm = new Group();
      arm.rotation.z = a;
      const strip2 = (x0, x1, wa, wb, col, o) => {
        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute([x0, -wa / 2, 0, x0, wa / 2, 0, x1, wb / 2, 0, x1, -wb / 2, 0], 3));
        geo.setIndex([0, 1, 2, 0, 2, 3]);
        const m = new Mesh(geo, basic(col, o, true));
        m.material.depthTest = flat; m.renderOrder = 31; m.userData.op = m.material.opacity;
        arm.add(m); bms.push(m);
      };
      strip2(0.04, 0.04 + L * 0.75, w0, w0 * 0.3, '#FF6FA6', 1);
      strip2(0.04 + L * 0.75, 0.04 + L, w0 * 0.3, 0, '#FFFFFF', 0.9);
      bg.add(arm);
    }
    add(bg, life, (u) => { bg.scale.setScalar(0.5 + 0.5 * sm(0, 0.15, u)); for (const m of bms) m.material.opacity = m.userData.op * (1 - sm(0.5, 1, u)); });
    if (knot > 0) {
      const kn = sprite('#FF5C9A', 0.6, true);
      kn.position.set(x, flat ? y + 0.02 : y, z);
      add(kn, life, (u) => { kn.scale.setScalar(knot * (0.7 + 0.5 * u)); kn.material.opacity = 0.6 * (1 - u); });
    }
    return bg;
  }
  bus.on('review_af_starburst', (ev) => {
    // VFX dream loop round 2 (Kesh 19 Nov 22:50 SGT: the old star behind the foes): the same star, its eight floor rays,
    // its flash and its motes, in the passed burst look
    pinkStar(ev.x, 0.04, ev.z, { n: 8, L0: 0.7, L1: 1.2, w0: 0.08, flat: true, life: 0.5, phi: 0.2, knot: 0 });
    pinkStar(ev.x, 0.55, ev.z, { n: 12, L0: 0.3, L1: 0.55, life: 0.4, knot: 0.16 });
    for (let k = 0; k < 6; k++) sparkSpray(new Vector3(ev.x, 0.3, ev.z), { n: 1, dir: new Vector3(Math.cos(k), 1, Math.sin(k)), col: CRIMSON, speed: 1.4, spread: 0.6, life: 0.5, needle: true, nl: 0.5, nw: 0.5 });
  });
  // Kesh 20 Nov 16:56 SGT, every form: the rising blades are the sword model (the passed Grove sword), point up,
  // 0.85 size, the flat turned to the camera, rising out of the floor as they circle him
  bus.on('review_af_bladesrise', (ev) => {
    const g = new Group();
    for (let i = 0; i < 6; i++) {
      const b = new Group(), sw = groveSword();
      sw.rotation.z = Math.PI; sw.position.y = 1.3; // point up, pommel at the floor
      b.add(sw);
      b.scale.setScalar(0.85);
      b.userData.a = (i / 6) * Math.PI * 2;
      sw.traverse((o) => { if (o.material) o.userData.o0 = o.material.opacity; });
      g.add(b);
    }
    add(g, 0.8, (u, t) => {
      const f = fox();
      if (f) g.position.set(f.x, 0, f.z);
      const k = sm(0, 0.12, u) * (1 - sm(0.6, 1, u));
      g.children.forEach((b) => {
        const a = b.userData.a + t * 6;
        b.position.set(Math.cos(a) * ev.r, -1.0 + 1.3 * sm(0, 0.7, u), Math.sin(a) * ev.r);
        // the flat of each blade turns to the camera, so it reads as a sword, not an edge
        const c = stage && stage.camera;
        b.rotation.set(0, c ? Math.atan2(c.position.x - g.position.x - b.position.x, c.position.z - g.position.z - b.position.z) + Math.PI / 2 : -a, 0);
        b.traverse((o) => { if (o.material) o.material.opacity = o.userData.o0 * k; });
      });
    });
    ring(ev.x, ev.z, ev.r, CRIMSON, { life: 0.5, op: 0.45, y: 0.04 });
  });
  // ---- kit 2.3: Lunge Strike 贯刺 (M13) ----
  // the thrust: a long spear of crimson light with a white core and a point of light past the blade
  bus.on('review_af_spear', (ev) => {
    const L = Math.hypot(ev.x1 - ev.x0, ev.z1 - ev.z0) || 1, dx = (ev.x1 - ev.x0) / L, dz = (ev.z1 - ev.z0) / L;
    // Kesh 19 Nov 22:17 SGT: the original band stays, in the repaint's look: a hot-pink band with a white-pink core
    strip(ev.x0, ev.z0, ev.x1, ev.z1, '#FF6FA6', { life: 0.4, op: 0.7, w: 0.22, y: 0.55, grow: 0.12 });
    strip(ev.x0, ev.z0, ev.x1, ev.z1, '#FFD0E2', { life: 0.34, op: 0.55, w: 0.08, y: 0.555, grow: 0.12 });
    strip(ev.x0, ev.z0, ev.x1, ev.z1, '#FFFFFF', { life: 0.3, op: 0.45, w: 0.05, y: 0.56, grow: 0.12 }); // glare 40% down (Kesh 19 Nov, pick 1)
    const tip = new Mesh(new ConeGeometry(0.16, 0.6, 16, 1, true), basic('#FF7FB0', 0.7, true));
    const g = new Group(); g.add(tip); tip.rotation.x = Math.PI / 2;
    g.position.set(ev.x1, 0.55, ev.z1); g.rotation.y = Math.atan2(dx, dz);
    add(g, 0.3, (u) => { g.scale.set(1 + u, 1 + u, 1 + 1.5 * u); tip.material.opacity = 0.21 * (1 - u); });
    sparkSpray(new Vector3(ev.x1, 0.55, ev.z1), { n: 10, col: CRIMSON, dir: new Vector3(dx, 0.2, dz), speed: 3.5, spread: 0.5, needle: true, nw: 0.6 }); // the repaint's look: pink needles with white tips
  });
  // the drill: a spinning cone of crimson and silver bands along the line, with a spiral round it.
  // moving: it runs from x0 to x1 (Swift carries it on him, Crescent's 剑气 flies it)
  bus.on('review_af_drill', (ev) => {
    const L = Math.hypot(ev.x1 - ev.x0, ev.z1 - ev.z0) || 1, dx = (ev.x1 - ev.x0) / L, dz = (ev.z1 - ev.z0) / L, secs = ev.secs || 0.3;
    // Kesh 19 Nov 22:17 SGT: copy only the repaint's look onto the original drill (the X of crescents was extra; gone)
    const g = new Group(), spin = new Group();
    g.add(spin);
    const len = ev.moving ? 1.3 : L;
    for (let i = 0; i < 3; i++) {
      const c = new Mesh(new ConeGeometry(0.34 - i * 0.08, len, 12, 1, true), basic(i === 1 ? '#FFB0CE' : i ? '#FF8CB8' : '#FF6FA6', 0.55, true)); // the repaint's look: a faint hot-pink haze
      c.rotation.x = Math.PI / 2; c.rotation.z = i * 0.7;
      spin.add(c);
    }
    g.rotation.y = Math.atan2(dx, dz);
    const life = secs + 0.15;
    add(g, life, (u, t) => {
      const k = Math.min(1, t / secs);
      const along = ev.moving ? k * L : L / 2;
      g.position.set(ev.x0 + dx * along, 0.55, ev.z0 + dz * along);
      spin.rotation.z = t * 40;
      spin.children.forEach((c, i) => { c.material.opacity = (i === 1 ? 0.13 : 0.18) * 0.06 * (1 - sm(0.8, 1, u)) * Math.min(1, t / 0.05); }); // the repaint's look: the drill a faint haze, the spiral blade carries it
    });
    streak20({ x0: ev.x0, z0: ev.z0, x1: ev.x1, z1: ev.z1, spiral: true, secs, ghost: !!ev.qi, blaze: true });
    // the original's hit sparks, in the repaint's look: pink white-tipped needles on each foe as the spiral reaches it
    if (!ev.moving) for (const e of world.entities()) {
      if (e.kind === 'ally' || e.kind === 'player' || e.kind === 'wisp') continue;
      const rx = e.x - ev.x0, rz = e.z - ev.z0, along = rx * dx + rz * dz, across = Math.abs(-rx * dz + rz * dx);
      if (along < 0 || along > L + 0.3 || across > 0.7) continue;
      later2(secs * Math.min(1, along / L), () => sparkSpray(new Vector3(e.x, 0.6, e.z), { n: 10, col: CRIMSON, dir: new Vector3(dx, 0.4, dz), speed: 2.6, spread: 1.2, life: 0.3, needle: true, nl: 1.1, nw: 0.6 }));
    }
    if (ev.moving) for (let i = 0; i < 6; i++) later2((i / 6) * secs, () => puff(ev.x0 + dx * L * (i / 6), ev.z0 + dz * L * (i / 6), { n: 2, r: 0.3, color: CRIMSON, h: 0.5, y: 0.45, size: 0.2, op: 0.4, life: 0.4 }));
  });

  // ---- kit 2.3: Sword Grove 剑林 (M15) ----
  // six full-size ghost swords, Fox Crimson with a Moon Silver edge, fall point down into the ring;
  // a thread of light runs from each hilt to his paw while they stand
  const groves = new Map();
  const pawAt = () => { const f = fox(); const P = tipPos(); return f ? new Vector3(f.x, 0.6, f.z).lerp(P || new Vector3(f.x, 0.6, f.z), 0.25) : null; };
  function groveSword() {
    // a solid Fox Crimson blade with a thin Moon Silver edge on each side, point down in the floor
    const g = new Group(), H = 1.0;
    // round 2 (Kesh's Sword Grove repaint, 19 Nov 15:46 UTC): a see-through ghost sword of hot-pink light, a white
    // core down the blade, glowing pink edges, a crimson guard with swept quillons, a wrapped grip, a pale pommel
    const blade = new Mesh(new BoxGeometry(0.03, H, 0.13), basic('#E8186A', 0.72));
    blade.position.y = H / 2;
    const tip = new Mesh(new ConeGeometry(0.075, 0.2, 4), basic('#E8186A', 0.72));
    tip.rotation.x = Math.PI; tip.position.y = -0.05;
    const core = new Mesh(new BoxGeometry(0.034, H * 0.96, 0.016), basic('#FFB0CC', 0.7));
    core.position.y = H / 2 + 0.02;
    const e1 = new Mesh(new BoxGeometry(0.036, H, 0.014), basic('#FF6FA6', 0.35, true));
    e1.position.set(0, H / 2, 0.066);
    const e2 = e1.clone(); e2.material = e1.material.clone(); e2.position.z = -0.066;
    const guard = new Mesh(new BoxGeometry(0.06, 0.05, 0.26), basic('#B01048', 0.95));
    guard.position.y = H + 0.02;
    const q1 = new Mesh(new ConeGeometry(0.03, 0.12, 4), basic('#D8306A', 0.95));
    q1.position.set(0, H + 0.0, 0.16); q1.rotation.x = Math.PI / 2 + 0.5;
    const q2 = q1.clone(); q2.material = q1.material.clone(); q2.position.z = -0.16; q2.rotation.x = -Math.PI / 2 - 0.5;
    const grip = new Mesh(new BoxGeometry(0.05, 0.2, 0.05), basic('#6A0A2A', 0.95));
    grip.position.y = H + 0.14;
    const pom = new Mesh(new BoxGeometry(0.07, 0.06, 0.07), basic('#D8C4CE', 0.85));
    pom.position.y = H + 0.26;
    g.add(blade, tip, core, e1, e2, guard, q1, q2, grip, pom);
    return g;
  }
  // Kesh 20 Nov 09:31 SGT (Sword Grove): the grove's ring gets a light magic-circle pattern: a double rim, a band of
  // small runes (ticks, dots, diamonds), a dashed inner ring and a faint six-point star joining the six swords
  let magicTex = null;
  function magicCircleTex() {
    if (magicTex) return magicTex;
    const S = 1024, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'), C = S / 2, R = (k) => k * C;
    const circ = (k, w, col, dash) => { g.beginPath(); g.setLineDash(dash || []); g.lineWidth = w; g.strokeStyle = col; g.arc(C, C, R(k), 0, Math.PI * 2); g.stroke(); g.setLineDash([]); };
    g.lineCap = 'round';
    // v2: the rims glow (a blurred pink stroke under a crisp pale core), the band between them stays clear for the runes
    g.shadowColor = 'rgba(255,47,122,1)'; g.shadowBlur = 28;
    circ(0.975, 9, 'rgba(255,47,122,0.95)'); circ(0.905, 6, 'rgba(255,47,122,0.85)');
    g.shadowBlur = 0;
    circ(0.975, 3.5, 'rgba(255,224,236,1)'); circ(0.905, 2.5, 'rgba(255,224,236,0.95)');
    // the rune band between the rims
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      g.strokeStyle = 'rgba(255,170,200,1)'; g.fillStyle = 'rgba(255,170,200,1)';
      if (i % 5 === 0 || i % 5 === 2) {
        // a small diamond
        const r = R(0.94), d = 12;
        g.beginPath(); g.moveTo(C + ca * (r + d), C + sa * (r + d)); g.lineTo(C - sa * d * 0.6 + ca * r, C + ca * d * 0.6 + sa * r);
        g.lineTo(C + ca * (r - d), C + sa * (r - d)); g.lineTo(C + sa * d * 0.6 + ca * r, C - ca * d * 0.6 + sa * r); g.closePath(); g.fill();
      } else {
        // round 3 (Kesh's magic circle repaint): small glyphs, two or three upright strokes and a cross stroke
        const tx = -sa, tz = ca, n2 = 2 + (i % 3 === 0 ? 1 : 0);
        g.lineWidth = 4.5;
        for (let k = 0; k < n2; k++) {
          const o = (k - (n2 - 1) / 2) * 8;
          g.beginPath(); g.moveTo(C + ca * R(0.922) + tx * o, C + sa * R(0.922) + tz * o); g.lineTo(C + ca * R(0.958) + tx * o, C + sa * R(0.958) + tz * o); g.stroke();
        }
        g.beginPath(); g.moveTo(C + ca * R(0.94) - tx * 10, C + sa * R(0.94) - tz * 10); g.lineTo(C + ca * R(0.94) + tx * 10, C + sa * R(0.94) + tz * 10); g.stroke();
      }
    }
    circ(0.84, 3, 'rgba(255,111,166,0.75)');
    // a faint six-point star on the inner ring
    // round 3: the star is a crisp pale line over a soft pink one, with a dot at each point
    for (const [col, lw] of [['rgba(255,63,134,0.3)', 8], ['rgba(255,232,240,0.95)', 3]]) {
      g.strokeStyle = col; g.lineWidth = lw;
      for (const off of [0, Math.PI / 3]) {
        g.beginPath();
        for (let k = 0; k <= 3; k++) { const a = off + (k / 3) * Math.PI * 2 - Math.PI / 2; const x = C + Math.cos(a) * R(0.84), y = C + Math.sin(a) * R(0.84); k ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
    }
    g.fillStyle = 'rgba(255,226,236,0.95)';
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(C + Math.cos(a) * R(0.84), C + Math.sin(a) * R(0.84), 6, 0, Math.PI * 2); g.fill(); }
    circ(0.42, 2, 'rgba(255,111,166,0.3)');
    magicTex = new CanvasTexture(c);
    magicTex.colorSpace = 'srgb';
    magicTex.anisotropy = 4;
    return magicTex;
  }
  function magicCircle(x, z, r, life, { y = 0.035, spin = 0.12, op = 0.85 } = {}) {
    const m = new Mesh(discGeo, new MeshBasicMaterial({ map: magicCircleTex(), transparent: true, opacity: 0, depthWrite: false }));
    // round 3 v2: the glow is the same drawing laid again, added light at a third (no flat band over the runes)
    const glowR = new Mesh(discGeo, new MeshBasicMaterial({ map: magicCircleTex(), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
    glowR.position.z = 0.001; glowR.scale.setScalar(1.01);
    m.add(glowR);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.renderOrder = 5;
    const it = add(m, life, (u, t) => {
      const fin = m.userData.endAt != null ? 1 - Math.min(1, (t - m.userData.endAt) / 0.2) : 1;
      m.scale.setScalar(r * (0.85 + 0.15 * sm(0, 0.2, t)));
      m.rotation.z = t * spin;
      m.material.opacity = op * Math.min(1, t / 0.15) * (1 - sm(0.88, 1, u)) * fin;
      glowR.material.opacity = 0.5 * m.material.opacity;
    });
    it.mesh = m;
    return it;
  }
  bus.on('review_af_grove', (ev) => {
    if (!ev.on) return;
    const G = { swords: [], threads: [], pts: ev.pts }, ghost = !!ev.echo, LIFE = ghost ? 0.9 : 5.6;
    if (!ghost) groves.set(ev.id, G); // an Echo's grove is a short-lived ghost: its swords fade and are never called
    swordRing(ev.x, 0.05, ev.z, 1.5, { tone: 'pink', life: 0.6, from: 0.3, op: 0.8, w: 0.06, n: 9, spin: 1 });
    G.circle = magicCircle(ev.x, ev.z, 1.62, LIFE, { op: ghost ? 0.4 : 0.85 });
    ev.pts.forEach(([x, z], i) => {
      const g = groveSword();
      g.position.set(x, 3, z); g.rotation.y = rnd() * 3;
      const th = new Mesh(new BoxGeometry(0.008, 0.008, 1), basic('#FFE0EC', 0.6, false)); // round 2: a fine pink-white thread
      const sItem = add(g, LIFE, (u, t) => {
        const T = Math.max(0, t - i * 0.03), drop = Math.min(1, T / 0.14);
        if (!g.userData.fly) g.position.y = (1 - drop) * 3 - 0.12 * drop;
        g.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * Math.min(1, t / 0.06) * (ghost ? 0.5 * (1 - sm(0.6, 1, u)) : 1); });
        if (drop >= 1 && !g.userData.landed) { g.userData.landed = true; swordRing(x, 0.05, z, 0.4, { tone: 'pink', life: 0.3, from: 0.3, op: 0.85, w: 0.1, n: 4 }); puff(x, z, { n: 3, r: 0.2, color: SILVER, h: 0.3, y: 0.05, size: 0.15, op: 0.4, life: 0.4 }); }
      });
      const tItem = add(th, LIFE, (u, t) => {
        const P = pawAt();
        if (ghost || !P || !g.userData.landed || g.userData.fly) { th.visible = false; return; }
        th.visible = true;
        const H = new Vector3(g.position.x, g.position.y + 1.25, g.position.z);
        th.position.lerpVectors(H, P, 0.5); th.lookAt(P); th.scale.set(1, 1, H.distanceTo(P));
        th.material.opacity = 0.42 + 0.08 * Math.sin(t * 9 + i);
      });
      G.swords.push({ g, it: sItem, x, z }); G.threads.push(tItem);
    });
  });
  // the call: each sword pulls out of the floor and flies to (x, z) (his paw; Swift: the grove's middle, then bursts)
  bus.on('review_af_grovecall', (ev) => {
    const G = groves.get(ev.id);
    if (!G) return;
    groves.delete(ev.id);
    G.threads.forEach(kill);
    if (G.circle && G.circle.mesh) G.circle.mesh.userData.endAt = G.circle.t;
    const secs = ev.secs || 0.25;
    G.swords.forEach((S, i) => {
      const g = S.g, p0 = g.position.clone(), q0 = g.rotation.clone();
      g.userData.fly = true;
      kill(S.it);
      const target = new Vector3(ev.x, 0.6, ev.z), dir = target.clone().sub(p0); dir.y = 0;
      const yaw = Math.atan2(dir.x, dir.z);
      g.position.copy(p0); root.add(g);
      add(g, secs + 0.08, (u, t) => {
        const k = Math.min(1, t / secs);
        g.position.lerpVectors(p0, target, k * k); g.position.y = p0.y + (0.4 - p0.y) * Math.min(1, k * 3);
        g.rotation.set(Math.PI / 2 * Math.min(1, k * 4), yaw, 0);
        g.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ?? o.material.opacity) * (1 - sm(0.85, 1, k)); });
      });
      strip(S.x, S.z, ev.x, ev.z, CRIMSON, { life: secs + 0.15, op: 0.45, w: 0.08, y: 0.45, grow: secs * 0.8 });
      strip(S.x, S.z, ev.x, ev.z, SILVER, { life: secs + 0.1, op: 0.5, w: 0.02, y: 0.46, grow: secs * 0.8 });
    });
    later2(secs, () => {
      if (ev.swift) {
        ring(ev.x, ev.z, 1.8, CRIMSON, { life: 0.45, op: 0.7, from: 0.2 });
        ring(ev.x, ev.z, 1.5, SILVER, { life: 0.35, op: 0.45, from: 0.3 });
        emitStar(ev.x, ev.z);
      } else {
        const f = fox();
        if (f) flashStar(f.x, 0.6, f.z, 0.8, 0.24);
      }
    });
  });
  const emitStar = (x, z) => { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; strip(x, z, x + Math.cos(a) * (i % 2 ? 1.1 : 1.8), z + Math.sin(a) * (i % 2 ? 1.1 : 1.8), CRIMSON, { life: 0.45, op: 0.6, w: i % 2 ? 0.04 : 0.08, y: 0.04, grow: 0.2 }); } };
  // Crescent's call: each sword spins once in place and throws a 剑风 ring
  bus.on('review_af_grovespin', (ev) => {
    const G = groves.get(ev.id);
    if (!G) return;
    G.swords.forEach((S) => {
      const g = S.g, y0 = g.rotation.y;
      later2(0, () => add(new Group(), ev.secs || 0.3, (u) => { g.rotation.y = y0 + u * Math.PI * 2; g.position.y = -0.18 + 0.25 * Math.sin(u * Math.PI); }));
      ring(S.x, S.z, 1.2, CRIMSON, { life: 0.4, op: 0.6, y: 0.35, from: 0.3 });
      ring(S.x, S.z, 1.05, SILVER, { life: 0.3, op: 0.35, y: 0.36, from: 0.3 });
      arc(S.x, S.z, 1, 0, 1.0, 180, CRIMSON, { life: 0.3, y: 0.4, spin: true, op: 0.55 });
    });
  });
  // Ring the grove (C9): each standing sword rings once, a small burst at its foot
  bus.on('review_af_grovering', (ev) => {
    const G = groves.get(ev.id);
    if (!G) return;
    G.swords.forEach((S, i) => later2(i * 0.03, () => {
      ring(S.x, S.z, 1.0, CRIMSON, { life: 0.35, op: 0.7, from: 0.2 });
      const s = sprite(SILVER, 0.6, true); s.position.set(S.x, 0.9, S.z); add(s, 0.2, (u) => { s.scale.setScalar(0.3 + 0.7 * u); s.material.opacity = 0.6 * (1 - u); });
      sparkSpray(new Vector3(S.x, 0.8, S.z), { n: 6, col: CRIMSON, speed: 2.4 });
    }));
  });

  // ---- 1.6: the four skills from the copy-all videos ----
  // the dash streak (Blazing Cascade's last dash, Skyblade Waltz's flash dash)
  // ---- Fox Step (redrawn 18 Nov 20:32 SGT) and Rift Cut · Swift ----
  // a step's shade: a crimson image of him holding the cut where he cut; `out` puts the shades out
  // one by one, `cut` flashes them as they cut once more
  const foxShades = [];
  bus.on('review_af_foxshade', (ev) => {
    const R = window.__tripoFox;
    if (ev.out) {
      foxShades.splice(0).forEach((sh, i) => later2(i * 0.06, () => { sh.end = true; ring(sh.x, sh.z, 0.35, CRIMSON, { life: 0.25, op: 0.6, y: 0.05, from: 0.15 }); }));
      return;
    }
    if (ev.cut) {
      for (const sh of foxShades) { sh.flash = 1; }
      return;
    }
    // round 2 (Kesh's Fox Step repaint, 19 Nov 15:46 UTC): a see-through pink silhouette with a brighter pink rim
    const im = pinkShade();
    if (!im) return;
    root.add(im);
    const sh = { im, x: ev.x, z: ev.z, end: false, flash: 0, k: 1 };
    foxShades.push(sh);
    ring(ev.x, ev.z, 0.42, CRIMSON, { life: 0.3, op: 0.55, y: 0.04, from: 0.2 });
    add(im, 2.4, (u, t) => {
      if (sh.end) sh.k = Math.max(0, sh.k - 0.12);
      sh.flash = Math.max(0, sh.flash - 0.08);
      const flick = 0.85 + 0.15 * Math.sin(t * 40);
      const op = (0.16 * flick + 0.2 * sh.flash) * sh.k * (1 - sm(0.85, 1, u)); // round 2: see-through
      im.traverse((o) => { if (o.material) o.material.opacity = op * (o.material.userData.k || 1); });
      if (sh.k <= 0) im.visible = false;
    });
  });
  // Kesh 20 Nov 16:53 SGT, Calm Crescent · Swift: a fox mirror (the Fox Step shade) beside a foe the hop cut, cutting it again
  bus.on('review_af_mirrorcut', (ev) => {
    const im = pinkShade();
    if (im) {
      im.position.x = ev.x; im.position.z = ev.z; im.rotation.y = Math.atan2(ev.dx, ev.dz);
      add(im, 0.5, (u) => setShade(im, 0.3 * sm(0, 0.15, u) * (1 - sm(0.55, 1, u))));
    }
    ring(ev.x, ev.z, 0.42, CRIMSON, { life: 0.3, op: 0.55, y: 0.04, from: 0.2 });
    later2(0.06, () => foxCut({ x: ev.x, z: ev.z, dx: ev.dx, dz: ev.dz, r: 0.9, tilt: ev.tilt, shade: true }));
  });
  // a step's cut: a crimson crescent with a silver core along his facing, tilted
  bus.on('review_af_foxcut', (ev) => foxCut(ev));
  function foxCut(ev) {
    const r = ev.r || 0.9;
    slash3d(ev.x, ev.z, ev.dx, ev.dz, r, 75, CRIMSON, { tilt: ev.tilt || 0, y: 0.48, life: ev.shade ? 0.3 : 0.26, op: 0.75, w: 0.36 });
    slash3d(ev.x, ev.z, ev.dx, ev.dz, r * 0.96, 70, SILVER, { tilt: ev.tilt || 0, y: 0.48, life: 0.18, op: 0.7, w: 0.08 });
    sparkSpray(new Vector3(ev.x + ev.dx * r * 0.7, 0.45, ev.z + ev.dz * r * 0.7), { n: 6, col: SILVER, dir: new Vector3(ev.dx, 0.4, ev.dz), speed: 2.4, life: 0.22 });
  }
  // where the two Crescent 剑气 cross: a flare in an X
  bus.on('review_af_foxcross', (ev) => {
    flashStar(ev.x, 0.5, ev.z, 1.1, 0.3);
    ring(ev.x, ev.z, 0.6, CRIMSON, { life: 0.35, op: 0.6, y: 0.05, from: 0.2 });
  });
  // fins of light burst out of the rift where he crosses it
  // round 2, Rift Cut repaint (Kesh 19 Nov 15:46 UTC): a sword-light spike: a thin four-sided needle rising from the
  // floor, hot pink at its foot to a white tip, one face lit, a small pink glow and glint at its foot
  const spikeGeo = (() => {
    const g = new ConeGeometry(0.05, 1, 4, 1, true).toNonIndexed();
    g.translate(0, 0.5, 0);
    const P = g.attributes.position, col = [], base = new Color('#C8185A'), mid = new Color('#FF6FA6'), tip = new Color('#FFF0F6'), dark = new Color('#A01046');
    for (let i = 0; i < P.count; i += 3) {
      const cx = (P.getX(i) + P.getX(i + 1) + P.getX(i + 2)) / 3, cz = (P.getZ(i) + P.getZ(i + 1) + P.getZ(i + 2)) / 3;
      const lit = cx + cz > 0; // the face toward the light
      for (let k = 0; k < 3; k++) {
        const h = P.getY(i + k);
        const c = lit ? (h < 0.4 ? base.clone().lerp(mid, h / 0.4) : mid.clone().lerp(tip, sm(0.85, 1, h))) : dark.clone().lerp(mid, sm(0.3, 1, h) * 0.6);
        col.push(c.r, c.g, c.b);
      }
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    return g;
  })();
  function pinkSpike(x, z, h, life, { delay = 0, w = 1 } = {}) {
    const g = new Group();
    g.position.set(x, 0, z);
    const m = new Mesh(spikeGeo, new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, side: DoubleSide }));
    m.scale.set(w, h, w);
    m.rotation.y = rnd() * Math.PI;
    m.rotation.z = (rnd() - 0.5) * 0.2;
    g.add(m);
    // the lit edge: a white hairline up one edge to the tip
    const ed = new Mesh(new PlaneGeometry(0.008, 1.0), basic('#FFFFFF', 0.95, false));
    ed.position.set(0.025, 0.5, 0.004);
    ed.rotation.z = Math.atan2(0.05, 1);
    m.add(ed);
    const tg = new Sprite(new SpriteMaterial({ map: star(), color: '#FFD8E6', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.6 }));
    g.add(tg);
    const gl = sprite('#FF5C9A', 0.7, true);
    gl.position.y = 0.03;
    g.add(gl);
    const st = new Sprite(new SpriteMaterial({ map: star(), color: '#FFC8DC', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.8 }));
    st.position.y = 0.04;
    g.add(st);
    void delay;
    return add(g, life, (k) => {
      const up = sm(0, 0.18, k);
      m.scale.set(w, h * up * (1 - 0.25 * sm(0.6, 1, k)), w);
      m.material.opacity = 0.85 * (1 - sm(0.6, 1, k));
      ed.material.opacity = 0.95 * (1 - sm(0.5, 0.9, k));
      tg.position.y = h * up * 0.98;
      tg.scale.setScalar(0.12 * up);
      tg.material.opacity = 0.6 * (1 - sm(0.4, 0.9, k));
      gl.scale.setScalar(0.22 * (0.6 + 0.4 * up));
      gl.material.opacity = 0.6 * (1 - sm(0.5, 1, k));
      st.scale.setScalar(0.28 * up * (1 - 0.6 * k));
      st.material.opacity = 0.8 * (1 - sm(0.3, 0.8, k));
    });
  }
  // round 2, Blade Storm repaint (Kesh 19 Nov 15:46 UTC): a shock ring drawn as overlapping sword-light strokes,
  // each a thin arc tapering to needle tips, turning as it spreads; 'pink' (hot pink, pale core) or 'silver'
  // (silver-white strokes with a pink blush)
  function arcBandGeo(R0, w, a0, a1, n = 28, spiral = 0) {
    const pos = [], idx = [], uv = [];
    for (let i = 0; i <= n; i++) {
      const s2 = i / n, a = a0 + (a1 - a0) * s2, k = Math.pow(Math.sin(Math.PI * s2), 0.8) * (0.55 + 0.45 * s2);
      const R = R0 * (1 + spiral * (s2 - 0.5)), r0 = R - w * k;
      pos.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * R, 0, Math.sin(a) * R);
      uv.push(s2, 0, s2, 1);
    }
    for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  function swordRing(x, y, z, R, { tone = 'pink', life = 0.4, from = 0.5, inward = false, op = 0.85, w = 0.12, n = 7, spin = 2.5, spiral = 0 } = {}) {
    const g = new Group();
    g.position.set(x, y, z);
    const C = tone === 'pink' ? ['#E8186A', '#FF5C9A', '#FFE0EC'] : ['#D8C8D4', '#F6D8E4', '#FFFFFF'];
    const ms = [];
    const put = (geo, c, o, add_) => { const m = new Mesh(geo, basic(c, o, add_)); m.renderOrder = 7; m.userData.op = m.material.opacity; g.add(m); ms.push(m); };
    const putT = (geo, tex, c, o, add_) => { const m = new Mesh(geo, strandMat(tex, o, add_, c)); m.renderOrder = 7; m.userData.op = o; g.add(m); ms.push(m); };
    const a00 = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a0 = a00 + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.2, a1 = a0 + ((Math.PI * 2) / n) * (1.5 + rnd() * 0.4);
      // unit radius (scaled to R like ring()), so the width scales with it
      const r = 1 + (rnd() - 0.5) * 0.07, ww = w * (0.7 + rnd() * 0.6), sp = spiral * (rnd() < 0.5 ? -1 : 1);
      // streaky like the passed blades: a feathered trail, the blaze body, a pale core and a white hairline
      putT(arcBandGeo(r, ww * 1.5, a0 - 0.05, a1, 28, sp), blazeTex('feather', 3 + (i % 3) * 2), tone === 'pink' ? '#D8306A' : '#E8D0DC', op * 0.45, true);
      if (tone === 'pink') putT(arcBandGeo(r, ww, a0, a1, 28, sp), blazeTex('body'), '#FFFFFF', op, false);
      else put(arcBandGeo(r, ww * 0.6, a0, a1, 28, sp), C[0], op * 0.5, false);
      put(arcBandGeo(r, ww * 0.3, a0 + 0.05, a1 - 0.05, 28, sp), C[1], op * 0.6, false);
      put(arcBandGeo(r + 0.003, Math.max(0.006, ww * 0.08), a0 + 0.1, a1, 28, sp), C[2], op, false);
    }
    // the same growth and fade as ring()
    return add(g, life, (u, t, dt) => {
      g.rotation.y -= spin * (dt || 0.016);
      const k = inward ? 1 - 0.7 * (1 - (1 - u) ** 2) : from + (1 - from) * (1 - (1 - u) ** 3);
      g.scale.setScalar(R * k);
      for (const m of ms) m.material.opacity = m.userData.op * (1 - u * u);
    });
  }
  // round 2, Mirror Ring repaint: arc() as a sword-light crescent (hot-pink body, pale core, white edge, needle tips)
  function bladeArc(x, z, dx, dz, r, half, { life = 0.3, y = 0.5, op = 0.8, w = 0.32, tone = 'pink' } = {}) {
    const th = Math.min(Math.PI, (Math.max(20, half) * Math.PI) / 180), yaw = Math.atan2(dx, dz);
    const a0 = -(th + yaw - Math.PI / 2), a1 = -(-th + yaw - Math.PI / 2);
    const g = new Group();
    g.position.set(x, y, z);
    const C = tone === 'pink' ? ['#E8186A', '#FF5C9A', '#FFE6F0'] : ['#F4B8CE', '#FFE8F0', '#FFFFFF'];
    const ms = [];
    const put = (geo, c, o, add_) => { const m = new Mesh(geo, basic(c, o, add_)); m.renderOrder = 7; m.userData.op = m.material.opacity; g.add(m); ms.push(m); };
    const putT = (geo, tex, c, o, add_) => { const m = new Mesh(geo, strandMat(tex, o, add_, c)); m.renderOrder = 7; m.userData.op = o; g.add(m); ms.push(m); };
    putT(arcBandGeo(r - w * 0.2, w * 1.8, a0 - 0.1, a1, 36), blazeTex('feather', 5), '#D8306A', op * 0.45, true);
    putT(arcBandGeo(r, w, a0, a1, 36), blazeTex('body'), tone === 'pink' ? '#FFFFFF' : '#FFD0E2', op, false);
    putT(arcBandGeo(r - w * 0.55, w * 0.5, a0 + 0.1, a1 - 0.05, 36), blazeTex('body'), '#F07090', op * 0.5, false);
    put(arcBandGeo(r - w * 0.1, w * 0.3, a0 + 0.04, a1 - 0.04, 36), C[1], op * 0.6, false);
    put(arcBandGeo(r + 0.004, Math.max(0.012, w * 0.07), a0 + 0.06, a1, 36), C[2], op, false);
    return add(g, life, (u) => {
      for (const m of ms) m.material.opacity = m.userData.op * (1 - u) * Math.min(1, u * 10);
      g.scale.setScalar(0.85 + 0.15 * u);
    });
  }
  // Kesh 20 Nov 06:41 UTC: every floor zone or field is Mirror Ring's passed zone: a crisp hot-pink edge with a pale
  // core and a soft glow, over a faint see-through fill (radius r in world units)
  function zoneLook(r) {
    const g = new Group();
    const flat = (geo, c, o, add_, y) => { const m = new Mesh(geo, basic(c, o, add_)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.userData.op = m.material.opacity; g.add(m); return m; };
    flat(new RingGeometry(Math.max(0.01, r - 0.14), r + 0.08, 128), '#FF2F7A', 0.4, true, 0.039);
    flat(new RingGeometry(Math.max(0.01, r - 0.05), r, 128), '#FF2F7A', 0.9, false, 0.04);
    flat(new RingGeometry(Math.max(0.01, r - 0.032), r - 0.018, 128), '#FFD6E6', 0.9, false, 0.042);
    const fill = flat(discGeo, '#FF2F7A', 0.03, false, 0.035);
    fill.scale.setScalar(r);
    return g;
  }
  function fieldDisc(x, z, r, op, life) {
    const g = zoneLook(r);
    g.position.set(x, 0, z);
    return add(g, life, (u) => {
      const f = Math.min(1, u * 12) * (1 - sm(0.85, 1, u)) * Math.min(1, op);
      g.traverse((o) => { if (o.material) o.material.opacity = o.userData.op * f; });
    });
  }
  // a sword cut in the floor: a dark crimson line with hot-pink lit edges and a pale core
  function floorCut(ax, az, bx, bz, { life = 1.1, op = 0.85, w = 0.05, y = 0.045, grow = 0.15 } = {}) {
    strip(ax, az, bx, bz, '#FF2F7A', { life, op: op * 0.25, w: w * 2.2, y, grow });
    strip(ax, az, bx, bz, '#2A0410', { life, op, w: w * 1.3, y: y + 0.002, grow });
    strip(ax, az, bx, bz, '#FF6FA6', { life: life * 0.8, op: op * 0.8, w: w * 0.25, y: y + 0.004, grow });
  }
  // Kesh 20 Nov 09:31 SGT (Titan Cleave): the floor cracks like Stonehide's Fault Line: a jagged gap, wide at the hit
  // point and narrowing to a hairline at the end, over a soft crushed bed, with a hot-pink seam of sword light inside
  function taperGeo(pts, wAt) {
    const pos = [];
    const side = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      const w = wAt(i / (pts.length - 1), i) / 2;
      return [[p[0] - (dz / L) * w * p[2], p[1] + (dx / L) * w * p[2]], [p[0] + (dz / L) * w * p[3], p[1] - (dx / L) * w * p[3]]];
    });
    for (let i = 1; i < pts.length; i++) {
      const [l0, r0] = side[i - 1], [l1, r1] = side[i];
      pos.push(l0[0], 0, l0[1], r0[0], 0, r0[1], l1[0], 0, l1[1], r0[0], 0, r0[1], r1[0], 0, r1[1], l1[0], 0, l1[1]);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    return g;
  }
  function taperCrack(x, z, ang, L, w0, { life = 1.2, grow = 0.12, y = 0.044, op = 1, branch = true, seam = 1 } = {}) {
    const n = Math.max(6, Math.round(L / 0.09)), pts = [];
    let a = ang, px = x, pz = z;
    for (let i = 0; i <= n; i++) {
      // jagged lips: each side's width wobbles on its own
      pts.push([px, pz, 0.7 + 0.6 * rnd(), 0.7 + 0.6 * rnd()]);
      // v2: sharper zig-zags (the repaint's cracks break at angles, they do not curve)
      a += (rnd() - 0.5) * 1.0;
      a += (ang - a) * 0.45;
      px += Math.cos(a) * (L / n); pz += Math.sin(a) * (L / n);
    }
    const prof = (s) => w0 * (1 - s) ** 1.4 + 0.006, lit = (s) => Math.max(0, 1 - s / 0.7) ** 1.2;
    crackMesh(pts, prof, lit, { life, grow, y, op, seam });
    // side cracks off the wide half, and fine hairlines off those (the repaint's branching)
    const nb = branch === true ? 2 : branch > 0 ? 1 : 0;
    for (let b = 0; b < nb && L > 0.35; b++) {
      const i = Math.floor(n * (0.2 + 0.45 * rnd()));
      later2(grow * (i / n), () => taperCrack(pts[i][0], pts[i][1], ang + (rnd() < 0.5 ? -1 : 1) * (0.45 + 0.5 * rnd()), L * (0.3 + 0.15 * rnd()), prof(i / n) * 0.5, { life: life - grow * (i / n), grow: grow * 0.5, y: y + 0.0005, op, branch: branch === true ? 1 : 0, seam: seam * 0.2 }));
    }
  }
  // the crack's layers along pts ([x, z, left wobble, right wobble]): prof(s) its width, lit(s) how much of the
  // pink seam shows
  function crackMesh(pts, prof, lit, { life = 1.2, grow = 0.12, y = 0.044, op = 1, seam = 1 } = {}) {
    const n = pts.length - 1;
    // round 3 (Kesh's crack repaint, 20 Nov 07:11 UTC): a soft dark bed, a pale broken lip, the dark gap, and a glowing
    // hot-pink seam that fills most of the gap near the hit and thins to a thread at the end
    const layers = [
      [taperGeo(pts, (s) => prof(s) * 2.6 + 0.03), '#2A0612', 0.3, false, 0],
      [taperGeo(pts, (s) => prof(s) * 1.2 + 0.006), '#9E9296', 0.3, false, 0.0005],
      [taperGeo(pts, prof), '#16040C', 0.95, false, 0.001],
      // v3: the pink light lives deep in the gap near the hit and dies out before the end (the repaint's outer cracks are dark)
      [taperGeo(pts, (s) => prof(s) * 0.6 * lit(s)), '#E8186A', 0.45 * seam, true, 0.002],
      [taperGeo(pts, (s) => prof(s) * 0.32 * lit(s)), '#FF4F90', 0.9 * seam, false, 0.0025],
      [taperGeo(pts, (s) => prof(s) * 0.1 * lit(s)), '#FFC8DC', 0.75 * seam, false, 0.003],
    ];
    const g = new Group();
    g.position.y = y;
    // each layer draws in its own order (same height, so depth sorting cannot order them)
    const ms = layers.map(([geo, c, o, ad, dy], li) => { const m = new Mesh(geo, basic(c, o * op, ad)); m.position.y = dy; m.userData.op = m.material.opacity; m.renderOrder = 6 + li * 0.1; g.add(m); return m; });
    const tris = n * 6;
    add(g, life, (u) => {
      const k = grow ? Math.min(1, u / (grow / life)) : 1;
      for (const m of ms) { m.geometry.setDrawRange(0, Math.ceil(tris * k / 3) * 3); m.material.opacity = m.userData.op * (1 - sm(0.6, 1, u)); }
    });
  }
  // a crack along a path of [x, z] points (a curve or a circle), widest in its middle, a hairline at both ends
  function pathCrack(path, w0, { life = 1.4, grow = 0.2, y = 0.044, op = 1, seam = 0.8, ends = true } = {}) {
    const pts = [];
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.round(L / 0.09)), nx = -(bz - az) / (L || 1), nz = (bx - ax) / (L || 1);
      for (let k = 0; k < m; k++) { const t = k / m, j = (rnd() - 0.5) * 0.05; pts.push([ax + (bx - ax) * t + nx * j, az + (bz - az) * t + nz * j, 0.7 + 0.6 * rnd(), 0.7 + 0.6 * rnd()]); }
    }
    const e = path[path.length - 1];
    pts.push([e[0], e[1], 1, 1]);
    const prof = (s) => w0 * (ends ? Math.sin(Math.PI * s) ** 0.6 : 1) + 0.006, lit = (s) => 0.7 + 0.3 * Math.sin(Math.PI * s);
    crackMesh(pts, prof, lit, { life, grow, y, op, seam });
  }
  function riftFin(x, z, yaw, size, life) {
    // round 2: the Rift Cut repaint's spike look
    if (size) { pinkSpike(x, z, 0.42 * size, life); return; }
    const sh = new Shape();
    sh.moveTo(-0.22, 0);
    sh.lineTo(0.12, 0);
    sh.lineTo(-0.04, 0.55);
    sh.closePath();
    const fin = new Mesh(new ShapeGeometry(sh), basic(BRONZE, 0.65, true));
    const core = new Mesh(new ShapeGeometry(sh), basic('#FFFFFF', 0.45, true));
    core.scale.set(0.5, 0.85, 1);
    const g = new Group();
    g.add(fin, core);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    add(g, life, (k) => { g.scale.set(size, size * sm(0, 0.2, k) * (1 - 0.3 * k), size); fin.material.opacity = 0.65 * (1 - sm(0.55, 1, k)); core.material.opacity = 0.45 * (1 - sm(0.3, 0.8, k)); });
  }
  bus.on('review_af_finburst', (ev) => {
    const yaw = Math.atan2(ev.dx, ev.dz) - Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const o = (i - 1) * 0.3;
      later2(i * 0.03, () => riftFin(ev.x + ev.dx * o, ev.z + ev.dz * o, yaw + (i - 1) * 0.25, i === 1 ? 1.5 : 1.1, 0.5));
    }
    chunks(ev.x, ev.z, { n: 4, r: 0.3, up: 1.6, size: 0.7 });
    sparkSpray(new Vector3(ev.x, 0.1, ev.z), { n: 8, col: BRONZE, speed: 2.2, life: 0.3 });
  });
  bus.on('review_af_streak', (ev) => {
    if (ev.x1 !== undefined) { streak20(ev); return; }
    const c = EC[ev.el] || SILVER, flash = !!ev.flash;
    const x1 = ev.x + ev.dx * ev.dist, z1 = ev.z + ev.dz * ev.dist;
    band(ev.x, ev.z, x1, z1, { life: flash ? 0.35 : 0.6, op: 0.6, w: flash ? 0.22 : 0.3, y: 0.45, grow: flash ? 0.2 : 0.35 });
    strip(ev.x, ev.z, x1, z1, c, { life: 0.7, op: 0.25, w: 0.14, y: 0.03, grow: 0.35 });
    if (flash) {
      flashStar(x1, 0.5, z1, 0.8, 0.25);
    } else {
      for (let i = 0; i < 5; i++) later2(0.04 * i, () => puff(ev.x + ev.dx * ev.dist * (i / 5), ev.z + ev.dz * ev.dist * (i / 5), { n: 2, r: 0.3, color: AMBER, h: 0.5, y: 0.4, size: 0.25, op: 0.45, life: 0.45 }));
      later2(0.18, () => slash3d(x1, z1, ev.dx, ev.dz, 1.0, 60, c, { tilt: 15, y: 0.5, life: 0.3, op: 0.7 }));
    }
    const st = window.__tripoFox;
    for (let i = 1; i <= 3; i++) later2(i * 0.05, () => {
      if (!st || !st.snapshot) return;
      const im = pinkShade();
      if (im) add(im, 0.3, (u) => setShade(im, 0.22 * (1 - u)));
    });
  });
  // Blazing Cascade's fire swirl (5bsoG8vEr 3.0 to 4.5 s): spinning arcs, a ring on the floor and spikes
  // Kesh 20 Nov 16:45 SGT, every form: the spinning arcs inside are the passed 剑光 (slash3d's blade look: hot-pink
  // body, white-pink core, silver hairline), and the spikes round the ring are Grove swords, crimson and white by turns
  bus.on('review_af_swirl', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const arcs = [];
    for (let i = 0; i < 3; i++) {
      const m = new Group(), th = Math.PI * (0.62 - i * 0.08), w = 0.3;
      for (const [geo, c, o, ad] of [[bandGeo(1, w, th, 32, 'taper', 1), '#FF6FA6', 0.5, true], [bandGeo(1 - w * 0.12, w * 0.3, th * 0.92, 32, 'taper', 1), '#FFD0E2', 0.45, true], [bandGeo(1.006, 0.022, th * 0.95, 32, 'taper', 1), '#E4DCE2', 0.6, false]]) m.add(new Mesh(geo, basic(c, o, ad)));
      m.position.y = 0.15 + i * 0.25;
      m.userData.ph = i * 2.1;
      g.add(m);
      arcs.push(m);
    }
    const floor = new Group();
    const fr = new Mesh(new RingGeometry(0.94, 1, 64), basic(CRIMSON, 0.35));
    fr.rotation.x = -Math.PI / 2;
    fr.position.y = 0.03;
    floor.add(fr);
    for (let i = 0; i < 10; i++) {
      const P = new Group(), sw = groveSword();
      const a = (i / 10) * Math.PI * 2;
      if (i % 2) sw.traverse((o) => { if (o.material) { const h = o.material.color.getHexString(); if (h === 'e8186a') o.material.color.set('#F2E4EA'); else if (h === 'ffb0cc') o.material.color.set('#FFFFFF'); } });
      sw.rotation.z = -0.5; // the hilt leans out, the point in the floor
      P.add(sw);
      P.position.set(Math.cos(a), 0, Math.sin(a));
      P.rotation.set(0, -a, 0);
      P.scale.setScalar(0.55 / Math.max(0.5, ev.r)); // about 0.55 u long whatever the ring's size
      floor.add(P);
    }
    g.add(floor);
    add(g, ev.secs + 0.15, (u, t) => {
      const k = sm(0, 0.25, u) * (1 - sm(0.85, 1, u));
      arcs.forEach((m, i) => { m.rotation.y = m.userData.ph - t * (10 + i * 2); m.scale.setScalar(ev.r * (0.85 - i * 0.12) * (0.6 + 0.4 * k)); });
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
    const band = new Mesh(new CylinderGeometry(ev.r, ev.r * 1.08, 0.4, 48, 1, true), basic(CRIMSON, 0.35, true));
    band.position.y = 0.45;
    g.add(band);
    const flat = new Mesh(new RingGeometry(ev.r * 0.6, ev.r, 64), basic(CRIMSON, 0.4, true));
    flat.rotation.x = -Math.PI / 2;
    flat.position.y = 0.45;
    g.add(flat);
    add(g, 0.35, (u) => { g.rotation.y = -u * 9; g.scale.setScalar(0.7 + 0.3 * sm(0, 0.3, u)); band.material.opacity = 0.18 * (1 - u); flat.material.opacity = 0.2 * (1 - u); });
  });
  // Skyblade Waltz's last beats (Pi4PRflgB 6.75 to 7.25 s): a beam falls and leaves a sword standing
  bus.on('review_af_beam', (ev) => {
    // round 2 spread: a shaft of hot-pink sword light with a pale core, not a white flash
    const beam = new Group();
    const bo = new Mesh(new CylinderGeometry(0.1, 0.14, 3.2, 12, 1, true), basic('#FF4F90', 0.5, true));
    const bc = new Mesh(new CylinderGeometry(0.03, 0.04, 3.2, 8, 1, true), basic('#FFD0E2', 0.5));
    beam.add(bo, bc);
    beam.position.set(ev.x, 1.6, ev.z);
    add(beam, 0.3, (u) => { bo.material.opacity = 0.25 * (1 - u); bc.material.opacity = 0.5 * (1 - u); beam.scale.set(1 - 0.6 * u, 1, 1 - 0.6 * u); });
    ring(ev.x, ev.z, ev.r, CRIMSON, { life: 0.35, op: 0.6 });
    puff(ev.x, ev.z, { n: 6, r: 0.5, color: CRIMSON, h: 0.5, y: 0.1, size: 0.2, op: 0.45, life: 0.5 });
    // Kesh 20 Nov 09:31 SGT: the sky blade is the Sword Grove blade, dropping from the sky into the floor
    const sw = groveSword();
    sw.scale.setScalar(0.75);
    sw.position.set(ev.x, 3, ev.z);
    sw.rotation.set((rnd() - 0.5) * 0.2, rnd() * 3, (rnd() - 0.5) * 0.2);
    add(sw, ev.stay, (u, t) => { const k = Math.min(1, t / 0.1); sw.position.y = 3 * (1 - k) - 0.09 * k; sw.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * (1 - sm(0.75, 1, u)); }); });
  });
  // Inkstone Dive (2SnjhTKLD): spikes after the X cut, strokes in the air, the air burst, the landing
  bus.on('review_af_xspikes', (ev) => {
    // Kesh 20 Nov: every floor spike is Rift Cut's passed spike (pinkSpike)
    for (let i = 0; i < 6; i++) {
      const a = Math.atan2(ev.dz, ev.dx) + (i - 2.5) * 0.35;
      const x = ev.x + Math.cos(a) * (0.2 + 0.1 * (i % 3)), z = ev.z + Math.sin(a) * (0.2 + 0.1 * (i % 3));
      pinkSpike(x, z, 0.42 + 0.08 * (i % 2), 0.5, { w: 0.8 });
    }
    chunks(ev.x, ev.z, { n: 4, r: 0.4, up: 1.2, size: 0.6 });
  });
  bus.on('review_af_airink', (ev) => {
    const a = ev.i * 2.1 + 0.4;
    slash3d(ev.x, ev.z, Math.cos(a), Math.sin(a), 1.2, 55, CRIMSON, { tilt: [35, -50, 70][ev.i % 3], y: 1.2, life: 0.4, ink: true, op: 0.7 });
  });
  bus.on('review_af_airburst', (ev) => {
    flashStar(ev.x, 1.3, ev.z, 1.3, 0.3);
    ring(ev.x, ev.z, ev.r, CRIMSON, { life: 0.35, op: 0.55, y: 1.2 });
    puff(ev.x, ev.z, { n: 8, r: 0.6, color: CRIMSON, h: 0.4, y: 1.2, size: 0.18, op: 0.6, life: 0.45 });
  });
  bus.on('review_af_inkland', (ev) => {
    const { x, z } = ev;
    // the ink arc of the dive (2.0 s in the ref), then the floor bursts in dust
    slash3d(x - ev.dx * 0.5, z - ev.dz * 0.5, ev.dx, ev.dz, 1.1, 40, CRIMSON, { tilt: 88, y: 0.8, life: 0.45, ink: true, op: 0.8 });
    ring(x, z, ev.r, EC.earth, { life: 0.5, op: 0.75 });
    // round 3: the floor crack look (Kesh's crack repaint) bursts out from the landing
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rnd() * 0.4;
      taperCrack(x + Math.cos(a) * 0.1, z + Math.sin(a) * 0.1, a, 0.8 + rnd() * 0.9, 0.16, { life: 1.0, grow: 0.15, branch: 1 });
    }
    disc(x, z, 0.6, INK, 0.5, 0.8);
    chunks(x, z, { n: 10, r: 1.0, up: 2.0 });
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
  const restM = () => {
    const st = window.__tripoFox;
    if (!st || !st.restMatrix) return null;
    const M = st.restMatrix();
    if (!fxCtx || !st.yawGroup) return M;
    // the echo: his rest pose moved from where he stands to where the ghost stands, turned as the ghost faces
    const Y = st.yawGroup.matrixWorld, pos = new Vector3(), q = new Quaternion(), sc = new Vector3();
    Y.decompose(pos, q, sc);
    const r = fxCtx.G.root;
    const E = new Matrix4().compose(new Vector3(r.position.x, pos.y, r.position.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), r.rotation.y), sc);
    return E.multiply(Y.clone().invert()).multiply(M);
  };
  // the blade's base and tip at a clip time, in the world (where he stands now)
  function swAt(clip, t, M = restM()) {
    const st = window.__tripoFox, sw = st && st.sweeps && st.sweeps[clip];
    if (!sw || !M) return null;
    const k = Math.max(0, Math.min(sw.pts.length - 1, Math.round(t / sw.dt))), p = sw.pts[k];
    return [new Vector3(p[0], p[1], p[2]).applyMatrix4(M), new Vector3(p[3], p[4], p[5]).applyMatrix4(M)];
  }
  // a brush stroke of light along the blade's path between two clip times: it hangs in the air for
  // `hold`, then fades; flare() brightens it and draws it in to its middle
  function bladeStroke(clip, t0, t1, { color = GOLD, w = 0.55, ext = 1.25, hold = 0.25, fade = 0.25, op = 0.7, brush = true, M = restM(), core: coreOn = true, blaze = true } = {}) {
    const st = window.__tripoFox, sw = st && st.sweeps && st.sweeps[clip];
    if (!sw || !M) return null;
    // the stroke covers the whole cut it was written for (Kesh 19 Nov 09:31 SGT: too short, not complete,
    // in the wrong spot): the strike stretch that overlaps t0 to t1 most (st.strikes), else t0 to t1
    const Wn = (st.strikes && st.strikes[clip]) || [];
    let best = null, bo = 0;
    for (const W of Wn) { const o = Math.min(t1 + 0.08, W[1]) - Math.max(t0 - 0.08, W[0]); if (o > bo) { bo = o; best = W; } }
    if (best) { t0 = best[0]; t1 = best[1]; }
    const k0 = Math.max(0, Math.round(t0 / sw.dt)), k1 = Math.min(sw.pts.length - 1, Math.round(t1 / sw.dt));
    const n = k1 - k0 + 1;
    if (n < 2) return null;
    const mkGeo = (wf, prof) => {
      const pos = new Float32Array(n * 6), al = new Float32Array(n * 2), uv = new Float32Array(n * 4), idx = [];
      for (let i = 0; i < n; i++) {
        const p = sw.pts[k0 + i], s = i / (n - 1);
        uv.set([s, 0, s, 1], i * 4);
        const b = new Vector3(p[0], p[1], p[2]).applyMatrix4(M), tp = new Vector3(p[3], p[4], p[5]).applyMatrix4(M);
        const out = b.clone().lerp(tp, ext), kw = prof === 'tips' ? Math.pow(Math.sin(Math.PI * s), 0.7) : prof ? Math.pow(Math.sin(Math.PI * Math.min(1, s * 2.2 + 0.08)), 0.5) * Math.pow(1 - s * 0.85, 0.7) : 1;
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
      geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      return geo;
    };
    const g = new Group();
    // VFX dream loop: the stroke is the repaint's strands (deep crimson lines, a hot edge at the tip side)
    // round 2 (Kesh 19 Nov 14:50 UTC): blaze = the passed blade look (feathered trail, hot-pink body,
    // white-pink core, silver hairline on the leading edge); Triple Crescent passed with the strands
    const body = blaze ? new Mesh(mkGeo(w * 0.9, brush), strandMat(blazeTex('body'), op, brush !== 'tips', '#FFFFFF')) : new Mesh(mkGeo(w * 1.15, brush), strandMat(strandTex('trail', 11), op, false));
    const glow = blaze ? new Mesh(mkGeo(w * 1.4, brush), strandMat(blazeTex('feather', 3), op, true, '#D8306A')) : new Mesh(mkGeo(w * 0.7, brush), strandMat(strandTex('trail', 4), op * 0.9, true));
    const core = blaze ? new Mesh(mkGeo(w * 0.22, brush), alphaMat(brush === 'tips' ? '#FF4F90' : '#FFD0E2', 0.8, true)) : new Mesh(mkGeo(0.06, false), alphaMat('#FFFFFF', 0.8, true));
    const hair = blaze ? new Mesh(mkGeo(brush === 'tips' ? 0.06 : 0.025, brush === 'tips' ? 'tips' : false), alphaMat(brush === 'tips' ? '#FFFFFF' : '#F2ECF0', 0.9, false)) : null;
    if (brush === 'tips') glow.visible = false; // the Rift Cut repaint's crisp crescent: no feathered trail
    for (const m of [glow, body, core, hair]) { if (!m) continue; m.frustumCulled = false; m.renderOrder = m === hair ? 8 : 6; g.add(m); }
    core.visible = coreOn;
    const mats = blaze ? [[glow, op * 0.6], [body, op], [core, 0.5 * Math.min(1, op / 0.6)], [hair, (brush === 'tips' ? 1 : 0.75) * Math.min(1, op / 0.6)]] : [[body, op], [glow, op * 0.45], [core, 0.4 * Math.min(1, op / 0.6)]];
    let flare = -1;
    // drawn only as far as the blade has gone (it never runs ahead of the sword): while he plays this
    // clip the head follows the clip's time, and the hold starts once the blade has finished the cut
    const live = st.act && st.actName === clip ? st.act : null;
    const ahead = live ? Math.max(0, t1 - live.time) / Math.max(0.1, live.timeScale || 1) : 0;
    const it = add(g, ahead + hold + fade + 0.06, (u, t) => {
      const rev = live && st.act === live ? Math.max(0, Math.min(1, (live.time / sw.dt - k0) / Math.max(1, n - 1))) : Math.min(1, t / 0.05);
      for (const [m] of mats) m.geometry.setDrawRange(0, Math.ceil(rev * (n - 1)) * 6);
      const th = t - ahead;
      let a = th < hold + 0.06 ? 1 : 1 - (th - hold - 0.06) / fade;
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
  function moonAt(x, y, z, yaw, { w = 1.2, thick = 0.3, color = GOLD, op = 0.7, life = 0.6, grow = 0.08, flat = false, roll = 0, blaze = true } = {}) {
    const g = new Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw - Math.PI / 2;
    const r = new Group();
    r.rotation.x = flat ? -Math.PI / 2 : 0;
    r.rotation.z = roll;
    g.add(r);
    if (blaze) {
      // round 2: the passed blade crescent (Triple Crescent's blazeCrescent) in place of the flat moon
      const ms = [];
      blazeCrescent(w / 2, thick * 0.8, Math.PI / 2, Math.min(1, op * 1.3), (geo, mat, o) => { const m = new Mesh(geo, mat); m.userData.op = o; m.frustumCulled = false; r.add(m); ms.push(m); return m; });
      return add(g, life, (u, t) => {
        const k = Math.min(1, t / grow);
        r.scale.set(0.4 + 0.6 * k, k, 1);
        for (const m of ms) m.material.opacity = m.userData.op * (1 - sm(0.55, 1, u));
      });
    }
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
  function sparkSpray(p0, { n = 10, dir = new Vector3(0, 1, 0), col = GOLD, speed = 3, spread = 0.9, life = 0.3, white = true, needle = true, nl = 1, nw = 1, hold = false } = {}) { // round 2: needles by default
    for (let k = 0; k < n; k++) {
      const m = new Mesh(needle ? needleGeo : sparkGeo, needle ? needleMat() : basic(k % 3 === 0 ? col : k % 3 === 1 ? (white ? '#FFFFFF' : '#F6A0B6') : col, 0.95, true));
      const v = dir.clone().normalize().add(new Vector3(rnd() - 0.5, rnd() * 0.6, rnd() - 0.5).multiplyScalar(spread)).normalize().multiplyScalar(speed * (0.6 + rnd() * 0.8));
      const p = p0.clone();
      const L = life * (0.6 + rnd() * 0.7);
      add(m, L, (u, t, dt) => {
        v.y -= 7 * dt;
        p.addScaledVector(v, dt);
        p.y = Math.max(0.02, p.y);
        m.position.copy(p);
        m.lookAt(p.x + v.x, p.y + v.y, p.z + v.z);
        m.scale.set(nw, nw, nl * (0.5 + Math.min(1.6, v.length() * 0.3)));
        m.material.opacity = 0.95 * (hold ? 1 - sm(0.5, 1, u) : 1 - u); // hold: full for the first half
      });
    }
  }
  // a ghost sword (a blade of light with a guard) and a wheel of them
  function ghostSword(col, op = 0.6, len = 0.62, keep = false) {
    const g = new Group();
    if (!keep) {
      // Kesh 20 Nov 06:23 UTC: the Sword Grove sword is the passed ghost sword, so every ghost sword is that one
      // (point up here, guard at the origin, `len` long)
      const sw = groveSword(), k = len;
      sw.rotation.x = Math.PI;
      sw.scale.setScalar(k);
      sw.position.y = 1.02 * k;
      g.add(sw);
      return g;
    }
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
      const s = ghostSword(col, 0.4, 0.3); // glare 40% down (pick 1); Kesh 20 Nov: smaller (0.5 -> 0.3 long)
      const a = (i / n) * Math.PI * 2;
      // each blade lies flat, its point leading round the wheel
      s.position.set(Math.cos(a) * r * 0.62, 0, Math.sin(a) * r * 0.62);
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
  // round 2 (Kesh's Fox Step repaint): a shade of him = a faint see-through pink fill that writes depth, and an
  // additive back-face shell a little larger, seen only round the silhouette, as its bright rim
  function pinkShade() {
    const st = window.__tripoFox;
    if (!st || !st.snapshot) return null;
    const fillM = new MeshBasicMaterial({ color: '#FF3F86', transparent: true, opacity: 0.16, depthWrite: true });
    const rimM = new MeshBasicMaterial({ color: '#FF5C9A', transparent: true, opacity: 0.5, depthWrite: false, side: BackSide, blending: AdditiveBlending });
    fillM.userData.k = 1; rimM.userData.k = 3.5;
    const im = st.snapshot(fillM), rim = st.snapshot(rimM);
    if (!im || !rim) return im;
    im.traverse((o) => { if (o.isMesh) o.renderOrder = 4; });
    rim.traverse((o) => { if (o.isMesh) o.renderOrder = 5; });
    // the pair carries the snapshot's world pose, so a caller can place it like a plain snapshot
    const g = new Group();
    g.position.copy(im.position); g.quaternion.copy(im.quaternion); g.scale.copy(im.scale);
    for (const o of [im, rim]) { o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1); }
    rim.scale.setScalar(1.04);
    g.add(im, rim);
    return g;
  }
  // a shade's strength: `a` 0.25 gives the Fox Step fill (0.16) and its rim 3.5x
  function setShade(g, a) { g.traverse((o) => { if (o.material) o.material.opacity = Math.min(1, a * 0.64 * (o.material.userData.k || 1)); }); }
  function afterImage(col, op = 0.3, life = 0.3, off = null) {
    const st = window.__tripoFox;
    if (!st || !st.snapshot) return null;
    // Kesh 20 Nov 09:31 SGT: every mirror of him is the Fox Step shade (Thousand Cuts keeps its spread of shades)
    const im = pinkShade();
    if (!im) return null;
    if (off) im.position.add(off);
    return add(im, life, (u) => setShade(im, op * (1 - u)));
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
        flashStar(mid.x, mid.y, mid.z, 1, 0.3);
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
        // judge round 1: two thin, separate, needle-tipped crescents: one wrapping the foes about 150
        // degrees, one flat floor sweep from behind him, under his feet, to the foes
        moon = strandMoon(g.x + d.x * 0.95, 0.7, g.z + d.z * 0.95, Math.atan2(d.x, d.z), { w: 1.56, thick: 0.27, op: 1, life: 0.55, grow: 0.07, inner: false, arcK: 0.7, wisps: false, rimW: 1.3, rimCol: '#D8CCD2', solid: true, sheen: 0.6 });
        // Kesh 19 Nov 18:33 SGT: the floor sweep round his feet is extra 剑气; removed
        if (false) [[1.0, 1, 0.13], [0.88, 0.6, 0.09], [0.77, 0.45, 0.07]].forEach(([rr, oo, th], i) => { const sw = strandSwirl(g, 0, -1, { r: rr, op: oo, life: 0.45, thick: th, inner: false, arcK: 0.9 - 0.06 * i, rim: i ? 0.5 : 1, yawOff: -1.0, wisps: false }); /* judge round 6: swung from behind him */ if (sw) sw.obj.position.y = 0.1 + 0.01 * i; });
        // judge round 3: no stroke over his head, no floating streak (the crescents carry the cut)
        const near = world.entities().filter((e) => e.faction === 'hostile' && Math.hypot(e.x - g.x, e.z - g.z) < 1.8).slice(0, 3);
        sparkSpray(new Vector3(g.x - d.x * 0.3, 0.3, g.z - d.z * 0.3), { n: 5, dir: new Vector3(-d.x, 0.1, -d.z), col: CRIMSON, speed: 2, spread: 1.2, life: 0.25, needle: true, white: false, nl: 1 });
        near.forEach((e) => {
          const c0 = new Vector3(e.x - d.x * 0.18, 0.5, e.z - d.z * 0.18);
          sparkSpray(c0, { n: Math.ceil(25 / Math.max(1, near.length)), dir: new Vector3(d.x, 0.1, d.z), col: CRIMSON, speed: 2.4, spread: 2.6, life: 0.26, needle: true, white: false, nl: 1.2 });
        });
        // judge round 7: more needles at the contact between the two near dummies
        if (near.length > 1) sparkSpray(new Vector3((near[0].x + near[1].x) / 2, 0.5, (near[0].z + near[1].z) / 2), { n: 5, dir: new Vector3(d.x, 0.1, d.z), col: CRIMSON, speed: 2.2, spread: 2.4, life: 0.26, needle: true, white: false, nl: 1.1 });
        // judge round 6: a few needles out past the far dummy, so the burst is not all on his side
        if (near.length) { const far = near.reduce((a, b) => (Math.hypot(b.x - g.x, b.z - g.z) > Math.hypot(a.x - g.x, a.z - g.z) ? b : a)); sparkSpray(new Vector3(far.x + d.x * 0.25, 0.5, far.z + d.z * 0.25), { n: 7, dir: new Vector3(d.x, 0.1, d.z), col: CRIMSON, speed: 2.6, spread: 1.0, life: 0.26, needle: true, white: false, nl: 1.2 }); }
      });
      later2(0.8, () => {
        if (moon) kill(moon);
        if (!mp) return;
        const c = mp;
        for (let i = 0; i < 4; i++) sparkSpray(c.clone().add(new Vector3(0, (i - 1.5) * 0.3, 0)), { n: 6, col: GOLD, dir: new Vector3(0, 0.2, 0), speed: 2.4, spread: 2.2, life: 0.4, white: false, needle: false });
      });
    },
    // M10 Keen Crescent: a ring of gold light round him as he turns, unrolled into the crescent;
    // a glowing cut line stays in the floor
    keen20: (f, ev) => {
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
        if (ev && ev.noLine) return;
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
        flashStar(p.x, p.y, p.z, 0.7, 0.22);
        ring(p.x, p.z, 0.5, GOLD, { life: 0.3, y: p.y, op: 0.6 });
      });
      later2(0.72, () => {
        const st = window.__tripoFox;
        if (!st || !st.handR) return;
        const p = new Vector3().setFromMatrixPosition(st.handR.matrixWorld);
        flashStar(p.x, p.y, p.z, 0.5, 0.14);
      });
      later2(0.84, () => bladeStroke('bloom20', 0.74, 0.86, { color: GOLD, hold: 0.15, op: 0.65 }));
    },
    // M12 Triple Crescent: three ghost blades fanned out behind him like wings, three great cuts,
    // the wings fold as he sheathes
    triple20: (f) => {
      const wings = new Group();
      const blades = [-1, 0, 1].map((i) => { const b = ghostSword(GOLD, 0.22, 0.75, true); b.userData.i = i; wings.add(b); return b; });
      add(wings, 1.45, (u, t) => {
        const g = fox() || f, d = facing(g);
        wings.position.set(g.x - d.x * 0.25, 0.55, g.z - d.z * 0.25);
        wings.rotation.y = Math.atan2(d.x, d.z);
        const open = sm(0.05, 0.35, t) * (1 - sm(1.15, 1.35, t));
        blades.forEach((b) => { b.rotation.set(-0.35 * open, 0, -b.userData.i * 0.9 * open); b.position.set(-b.userData.i * 0.12 * open, 0.05, -0.05); b.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * Math.min(1, t / 0.15) * (1 - sm(1.2, 1.4, t)); }); });
      });
      [0.4, 0.65, 0.9].forEach((T, i) => later2(T + 0.06, () => bladeStroke('triple20', T - 0.06, T + 0.06, { color: GOLD, hold: 0.1, op: 0.45, w: 0.7, blaze: false })));
      // VFX dream loop: each great cut wraps him in a swirl of strands as the wave leaves
      [[0.4, 0], [0.65, 40], [0.9, 85]].forEach(([T, tilt], i) => later2(T - 0.02, () => strandSwirl(fox() || f, tilt * 0.5, i % 2 ? -1 : 1, { op: 1, blaze: true, thick: 0.28 })));
    },
    // M13 Lunge Strike (kit 2.3): the spear, the drill and the star are the sim's events
    lunge20: () => {},
    // M14 Rift Cut: the stab's shock ring, a glowing line carved round his feet (the rift is rift20)
    rift20: (f) => {
      later2(0.2, () => { const P = swAt('rift20', 0.2); if (P) { ring(P[1].x, P[1].z, 0.45, BRONZE, { life: 0.35, op: 0.75 }); sparkSpray(P[1], { n: 8, col: BRONZE, speed: 2.5 }); } });
      later2(0.2, () => tipFloor('rift20', 0.2, 0.52, { color: BRONZE, life: 0.9, w: 0.06, op: 0.75 }));
      later2(0.62, () => bladeStroke('rift20', 0.55, 0.68, { color: BRONZE, hold: 0.15, op: 0.95, w: 0.55, brush: 'tips' })); // round 2: the repaint's full crescent sweep
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
      later2(0.36, () => { const g = fox() || f, d = facing(g); sparkSpray(new Vector3(g.x - d.x * 0.3, 0.05, g.z - d.z * 0.3), { n: 8, col: SILVER, dir: new Vector3(-d.x, 0.3, -d.z), speed: 2.2 }); });
    },
    // M21 Blade Storm: a wider silver ring on each turn (the beats), the blade's strokes round him
    storm20: () => {
      [0.3, 0.6, 0.9].forEach((T) => later2(T + 0.05, () => bladeStroke('storm20', T - 0.12, T + 0.05, { color: CRIMSON, hold: 0.06, fade: 0.15, op: 0.6, w: 0.3, brush: 'tips' })));
    },
    // M22 Blade Dance: two tilted rings crossing like an X, after-images from his feet on landing
    dance20: () => {
      later2(0.3, () => bladeStroke('dance20', 0.08, 0.3, { color: CRIMSON, hold: 0.35, op: 0.55, w: 0.45, brush: false }));
      later2(0.5, () => bladeStroke('dance20', 0.3, 0.5, { color: CRIMSON, hold: 0.2, op: 0.6, w: 0.45, brush: false }));
      for (let i = 0; i < 3; i++) later2(0.52 + i * 0.05, () => afterImage('#FF3F86', 0.22, 0.28));
    },
    // M23 Blade Wheel: a wheel of ghost blades turns on the blade and grows; the throw sends it off
    wheel20: () => {
      const W = bladeWheel(CRIMSON, 12, 0.55); // Kesh 20 Nov: smaller swords, more of them
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
      later2(0.16, () => { for (const s of [-1, 1, 0]) afterImage(SILVER, 0.18, 0.35, new Vector3(-d.z * 0.22 * s, 0, d.x * 0.22 * s)); });
      // Kesh 19 Nov 22:17 SGT: copy only the look of the original's 剑光; the repaint's two swirl crescents are extra (removed)
    },
  };
  const thinRing = new RingGeometry(0.97, 1, 72);
  bus.on('review_af_play', (ev) => { const f = fox(); if (f && SFX[ev.clip]) SFX[ev.clip](f, ev); });
  // the beats of the 2.0 skills: an impact on each foe the beat landed on, along the blade's path
  const BEATC = { flurry20: GOLD, finisher20: GOLD, keen20: GOLD, bloom20: GOLD, triple20: GOLD, lunge20: CRIMSON, rift20: BRONZE, riposteHit20: BRONZE, moonfang20: AQUA, calm20: AQUA, mirror20: AQUA, foxstep20: CRIMSON, storm20: CRIMSON, dance20: CRIMSON, wheel20: CRIMSON, thousand20: CRIMSON };
  const BEATT = { flurry20: [0.14, 0.23, 0.33, 0.42], finisher20: [0.3],  foxstep20: [0.2], storm20: [0.3, 0.6, 0.9, 1.1], dance20: [0.2, 0.45], bloom20: [0.4, 0.8] };
  bus.on('review_af_beat', (ev) => {
    const col = BEATC[ev.clip] || CRIMSON, at = (BEATT[ev.clip] || [])[ev.i];
    const S = at !== undefined ? sweepPts({ clip: ev.clip, at }) : null;
    for (const id of ev.ids || []) {
      const e = byId(id);
      if (!e) continue;
      // VFX dream loop: the Finisher's own needle sparks and star replace the white hit flash (judge round 1)
      if (S && !(ev.clip === 'bloom20' && ev.i === 0) && ev.clip !== 'finisher20') bladeHit({ dx: ev.dx, dz: ev.dz, col, strong: ev.clip === 'storm20' }, S, e);
      else if (ev.clip === 'triple20' || ev.clip === 'lunge20' || ev.clip === 'thousand20') { const s = sprite(col, 0.6, true); s.position.set(e.x, 0.6, e.z); add(s, 0.18, (u) => { s.scale.setScalar(0.3 + 0.4 * u); s.material.opacity = 0.6 * (1 - u); }); } // the passed skills keep theirs
      else flashStar(e.x, 0.6, e.z, 0.6, 0.22);
    }
    const f = fox();
    if (ev.clip === 'bloom20' && ev.i === 0) for (const id of ev.ids) { const e = byId(id); if (e && f) strip(f.x, f.z, e.x, e.z, GOLD, { life: 0.18, op: 0.5, w: 0.02, y: 0.6, grow: 0.5 }); }
    if (ev.clip === 'bloom20' && ev.i === 1) for (const id of ev.ids) { const e = byId(id); if (e) bloomAt(e.x, e.z, 1); }
    if (ev.clip === 'storm20') {
      const g = f || ev;
      // Kesh 20 Nov 09:31 SGT: each foe the spin hits takes a sword-light slash across it (and a strong rock, above)
      for (const id of ev.ids || []) {
        const e = byId(id);
        if (!e) continue;
        const ox = e.x - g.x, oz = e.z - g.z, ol = Math.hypot(ox, oz) || 1;
        // the slash runs along the spin, crossing the foe, tilted a new way each beat
        const tx = -oz / ol, tz = ox / ol, r = 0.62, tilt = [55, -40, 70, -60][ev.i % 4] + (rnd() - 0.5) * 20;
        slash3d(e.x - tx * r * 0.9, e.z - tz * r * 0.9, tx, tz, r, 70, CRIMSON, { tilt, y: 0.62, life: 0.32, w: 0.22, op: 1, side: ev.i % 2 ? -1 : 1 });
      }
      // round 2 (Kesh's Blade Storm repaint, 19 Nov 15:46 UTC): the same two shock rings, drawn as sword-light strokes
      swordRing(g.x, ev.i === 3 ? 0.05 : 0.45, g.z, ev.r || 1.5, { tone: 'pink', life: 0.35, from: 0.5, op: 0.95, w: 0.17, n: 9 });
      if (ev.i < 3) swordRing(g.x, 0.45, g.z, (ev.r || 1.5) * 0.98, { tone: 'silver', life: 0.3, inward: true, op: 0.75, w: 0.07, n: 16, spin: -3, spiral: 0.08 });
      else { ring(g.x, g.z, 1.3, CRIMSON, { life: 0.5, op: 0.7 }); chunks(g.x, g.z, { n: 8, r: 0.8, up: 1.4 }); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; strip(g.x, g.z, g.x + Math.cos(a) * 0.9, g.z + Math.sin(a) * 0.9, CRIMSON, { life: 0.6, op: 0.6, w: 0.04, y: 0.035, grow: 0.15 }); } }
    }
    if (ev.clip === 'moonfang20') {
      // a pale crescent moon opens along the whole path
      const x0 = ev.x0, z0 = ev.z0, x1 = ev.x1, z1 = ev.z1, L = Math.hypot(x1 - x0, z1 - z0);
      moonAt((x0 + x1) / 2, 0.08, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0) + Math.PI / 2, { w: L, thick: 0.45, color: AQUA, op: 0.7, life: 0.7, grow: 0.12, flat: true });
      strip(x0, z0, x1, z1, AQUA, { life: 0.5, op: 0.35, w: 0.3, y: 0.03 });
    }
    if (ev.clip === 'dance20' && ev.i === 1 && f) ring(f.x, f.z, 1.3, CRIMSON, { life: 0.3, op: 0.5, y: 0.3 });
  });
  // the 2.0 streaks: Moonfang's pale streak, Fox Step's spiral of silver strokes
  function streak20(ev) {
    const c = ev.el ? EC[ev.el] || SILVER : CRIMSON;
    const L = Math.hypot(ev.x1 - ev.x0, ev.z1 - ev.z0) || 1, dx = (ev.x1 - ev.x0) / L, dz = (ev.z1 - ev.z0) / L;
    if (ev.spiral && !ev.big && !ev.blaze) ev = { ...ev, blaze: true, pinkShade: true }; // round 2: every spiral in the passed (Lunge) ribbon look
    if (ev.spiral) {
      // two turns of a thin spiral round the path, drawn as he goes
      const N = ev.big ? 72 : 48, secs = ev.secs || 0.28;
      if (ev.big) for (let i = 0; i < 6; i++) later2((i / 6) * secs, () => { const u = (i + 0.5) / 6; ring(ev.x0 + dx * L * u, ev.z0 + dz * L * u, 0.5, CRIMSON, { life: 0.35, op: 0.5, y: 0.04, from: 0.3 }); });
      if (ev.blaze) {
        // Lunge Strike in the repaint's look (Kesh 19 Nov 22:17 SGT: the same spiral, only its look copied): one
        // continuous blade ribbon round the path, facing the camera, thick on the lobes and thin where it crosses
        // the path (so the turns read as crossing crescents), a hot-pink body, a white-pink core, a silver hairline
        const sg = ev.flip ? -1 : 1, rr = ev.ghost ? 0.3 : 0.38, yy = ev.ghost ? 0.32 : 0.45, M = 160;
        const cam = stage && stage.camera;
        const view = cam ? new Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new Quaternion())).applyQuaternion(root.getWorldQuaternion(new Quaternion()).invert()) : new Vector3(0, -0.8, -0.6);
        const pt = (k) => { const a = k * Math.PI * 4 * sg, along = k * L; return new Vector3(ev.x0 + dx * along + -dz * Math.cos(a) * rr, yy + Math.sin(a) * rr, ev.z0 + dz * along + dx * Math.cos(a) * rr); };
        const ribbon = (w, off, pw) => {
          const pos = [], uv = [], idx = [];
          for (let i = 0; i <= M; i++) {
            const k = i / M, p0 = pt(k), t = pt(Math.min(1, k + 1 / M)).sub(pt(Math.max(0, k - 1 / M))).normalize();
            const side = new Vector3().crossVectors(t, view).normalize();
            const lobe = Math.pow(Math.abs(Math.cos(k * Math.PI * 4)), 0.7); // widest on the lobes, a needle where it crosses the path
            const ww = w * Math.pow(Math.sin(Math.PI * k), 0.3) * (0.08 + 0.92 * lobe) / 2, o = off * lobe;
            const a = p0.clone().addScaledVector(side, o - ww), b = p0.clone().addScaledVector(side, o + ww);
            pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(k, 0, k, 1);
          }
          for (let i = 0; i < M; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
          const geo = new BufferGeometry();
          geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
          geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
          geo.setIndex(idx);
          return geo;
        };
        const lays = [];
        const lay = (geo, tex, o, col, additive, ro) => { const m = new Mesh(geo, strandMat(tex, o, additive, col)); m.renderOrder = ro; m.userData.op = o; lays.push(m); return m; };
        const g = new Group();
        g.add(lay(ribbon(0.36, 0, 1), blazeTex('body'), 0.9, '#FFA8CA', true, 7));
        g.add(lay(ribbon(0.1, 0, 1), blazeTex('core'), 0.75, '#FFD0E2', true, 8));
        g.add(lay(ribbon(0.022, 0.12, 1), litTex(33, 0.45, 0.35, 1, [200, 192, 198], [222, 216, 220]), 0.9, '#FFFFFF', false, 9));
        const total = M * 6;
        add(g, secs + 0.4, (u, t) => {
          const k = Math.min(1, t / secs);
          for (const m of lays) { m.geometry.setDrawRange(0, Math.ceil(total * k / 6) * 6); m.material.opacity = m.userData.op * (1 - sm(secs / (secs + 0.4), 1, u)); }
        });
        if (!ev.ghost) for (let i = 0; i < 3; i++) later2(0.06 + i * 0.07, () => afterImage(ev.pinkShade ? '#FF3F86' : SILVER, 0.22, 0.25));
        return;
      }
      for (let i = 0; i < N; i++) later2((i / N) * secs, () => {
        const sg = ev.flip ? -1 : 1, rr = ev.big ? 0.45 : ev.ghost ? 0.3 : 0.38, yy = ev.big ? 0.5 : ev.ghost ? 0.32 : 0.45;
        const pt = (k) => { const a = k * Math.PI * 4 * sg, along = k * L; return new Vector3(ev.x0 + dx * along + -dz * Math.cos(a) * rr, yy + Math.sin(a) * rr, ev.z0 + dz * along + dx * Math.cos(a) * rr); };
        const a0 = pt(i / N), a1 = pt((i + 1) / N);
        // blaze (Lunge Strike, the repaint's look): a hot-pink stroke with a white-pink core, silver-white glints
        const m = new Mesh(new BoxGeometry(ev.blaze ? 0.04 : 0.03, ev.blaze ? 0.04 : 0.03, a0.distanceTo(a1) * 1.1), basic(ev.blaze ? (i % 4 ? '#FF6FA6' : '#E4DCE2') : i % 4 ? c : '#FFFFFF', 0.85, true));
        m.position.lerpVectors(a0, a1, 0.5);
        m.lookAt(a1);
        if (ev.blaze) { const k2 = new Mesh(new BoxGeometry(0.014, 0.014, a0.distanceTo(a1) * 1.1), basic('#FFD0E2', 0.9, true)); m.add(k2); }
        add(m, 0.45, (u) => { m.material.opacity = 0.85 * (1 - u); if (m.children[0]) m.children[0].material.opacity = 0.45 * (1 - u); });
      });
      if (!ev.ghost) for (let i = 0; i < 3; i++) later2(0.06 + i * 0.07, () => afterImage(ev.blaze ? SILVER : c, 0.22, 0.25));
      return;
    }
    if (ev.thrust) {
      // 2.1: a thrust: a streak in the will colour with a white core, after-images, sparks where it stops
      const short = !!ev.short;
      band(ev.x0, ev.z0, ev.x1, ev.z1, { life: short ? 0.25 : 0.4, op: 0.65, w: short ? 0.1 : 0.16, y: 0.45, grow: 0.3 });
      if (!short) for (let i = 0; i < 2; i++) later2(0.03 + i * 0.05, () => afterImage(c, 0.22, 0.22));
      later2(short ? 0.08 : 0.2, () => sparkSpray(new Vector3(ev.x1, 0.1, ev.z1), { n: short ? 4 : 8, col: c, dir: new Vector3(dx, 0.5, dz), speed: 2.2 }));
      return;
    }
    band(ev.x0, ev.z0, ev.x1, ev.z1, { life: 0.4, op: 0.6, w: 0.16, y: 0.45, grow: 0.25 });
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
    const im = pinkShade();
    if (!im) return;
    im.position.x = ev.x;
    im.position.z = ev.z;
    im.rotation.y = Math.atan2(ev.dx, ev.dz);
    add(im, 0.45, (u) => setShade(im, 0.4 * (1 - u)));
  });
  bus.on('review_af_aimline', (ev) => strip(ev.x, ev.z, ev.x + ev.dx * ev.len, ev.z + ev.dz * ev.len, EC[ev.el] || SILVER, { life: ev.secs + 0.2, op: 0.55, w: 0.02, y: 0.05, grow: 0.7 }));
  // Rift Cut's rift: a glowing line races out and blade fins of bronze light rise along it
  function rift20(ev) {
    const n = 9, fins = [];
    for (let i = 0; i < n; i++) later2((ev.secs * (i + 1)) / n, () => {
      const u = (i + 1) / n, x = ev.x + ev.dx * ev.len * u, z = ev.z + ev.dz * ev.len * u;
      const px = ev.x + ev.dx * ev.len * (u - 1 / n), pz = ev.z + ev.dz * ev.len * (u - 1 / n);
      // round 2 (Kesh's Rift Cut repaint, 19 Nov 15:46 UTC): a thin hot-pink line with a white-pink core, and a
      // needle spike of sword light at each step (the original's fins, in the repaint's look)
      strip(px, pz, x, z, '#FF2F7A', { life: 0.9, op: 0.95, w: 0.032, y: 0.02 });
      strip(px, pz, x, z, '#FF9CC0', { life: 0.75, op: 0.85, w: 0.01, y: 0.024 });
      pinkSpike(x, z, 0.62 + 0.08 * Math.sin(i * 2.3), 0.6, { w: 1.15 });
      sparkSpray(new Vector3(x, 0.05, z), { n: 2, col: CRIMSON, speed: 1.6, life: 0.25 });
      if (true) return;
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
  const tcutBy = new Map(); // foe id -> how many cuts it has taken this cast
  bus.on('review_af_tcut', (ev) => {
    // judge round 1: a straight needle cut-mark through each struck foe, ~2.2 dummy-heights, each at its own
    // screen angle (steep through the side foes, shallow through the back ones), facing the camera
    // judge round 2: the angle comes from where the foe stands in the pack (not from the moving fox): the
    // front-left foe a steep "/", the front-right foe a steep "\\", the centre and back foes a shallow cut
    // descending to the right. One cut per foe: a new hit on the same foe replaces its old cut.
    const tgt = byId(ev.id);
    const pack = tgt ? world.entities().filter((e) => e.kind === tgt.kind) : [];
    const cx = pack.length ? pack.reduce((a, e) => a + e.x, 0) / pack.length : ev.x, cz = pack.length ? pack.reduce((a, e) => a + e.z, 0) / pack.length : ev.z;
    const rx = ev.x - cx, rz = ev.z - cz;
    const deg = rz > 0.3 && Math.abs(rx) > 0.5 ? (rx < 0 ? 75 : -65) : rx > 0.5 ? -36 : -28;
    // Kesh 19 Nov 22:17 SGT: one cut per hit, as the original; a repeat hit on the same foe crosses its earlier cut
    const n0 = tcutBy.get(ev.id) || 0;
    tcutBy.set(ev.id, n0 + 1);
    const sa = (deg + [0, 50, -40, 25][n0 % 4]) * (Math.PI / 180);
    const g = new Group();
    g.position.set(ev.x, 0.6, ev.z);
    const cam = stage && stage.camera;
    if (cam) g.quaternion.copy(root.getWorldQuaternion(new Quaternion()).invert().multiply(cam.getWorldQuaternion(new Quaternion())));
    const hold = new Group();
    hold.rotation.z = sa;
    g.add(hold);
    const len = 1.45, wd = 0.105;
    const needleGeo2 = (w, n = 40, pw = 1.6, off = 0, follow = false) => {
      const pos = [], uv = [], idx = [];
      for (let i = 0; i <= n; i++) {
        const s0 = i / n, x = (s0 - 0.5) * len, k = Math.pow(Math.sin(Math.PI * s0), pw) * w;
        const o = follow ? off * Math.pow(Math.sin(Math.PI * s0), pw) : off; // judge round 4: the hairline rides the body's edge
        pos.push(x, o - k * 0.5, 0, x, o + k * 0.5, 0);
        uv.push(s0, 0, s0, 1);
      }
      for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      return geo;
    };
    const ms = [];
    const lay = (geo, tex, o, col, additive, ro, z = 0) => { const m = new Mesh(geo, strandMat(tex, o, additive, col)); m.material.depthTest = false; m.renderOrder = ro + 20; m.position.z = z; m.userData.op = o; hold.add(m); ms.push(m); return m; }; // drawn over the foe it cuts
    lay(needleGeo2(wd * 1.7, 40, 1.4, -wd * 0.45), blazeTex('feather', 7), 0.4, '#D8306A', true, 5); // a short feathered trail on the trailing side
    lay(needleGeo2(wd, 48, 2.2), blazeTex('body'), 0.85, '#FFA8CA', true, 7, 0.002); // hot pink either side of the core // widest mid-length, needle points
    lay(needleGeo2(wd * 0.3, 48, 2.4), blazeTex('core'), 0.75, '#FFD0E2', true, 8, 0.004); // the core: the middle third // the white-pink core
    lay(needleGeo2(wd * 0.14, 48, 2.2, wd * 0.4, true), litTex(31, 0.45, 0.35, 1, [200, 192, 198], [222, 216, 220]), 0.95, '#FFFFFF', false, 9, 0.006); // the silver hairline on the leading edge
    // judge round 5: 4-5 small pink flecks drift off the cut's two tips until the final flash
    const flecks = [];
    const sliver = (l) => { // a thin diamond: pointed at both ends
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute([-l / 2, 0, 0, 0, 0.007, 0, l / 2, 0, 0, 0, -0.007, 0], 3));
      geo.setIndex([0, 1, 3, 1, 2, 3]);
      return geo;
    };
    for (let k = 0; k < 5; k++) {
      const end = k < 3 ? 1 : -1, d = 0.1 + 0.3 * ((k * 0.37 + rnd() * 0.3) % 1);
      const m = new Mesh(sliver(0.06 + rnd() * 0.04), basic('#FF8CB8', 0.9, true));
      m.material.depthTest = false; m.renderOrder = 30;
      m.userData.op = 0.45 * (1 - 0.7 * (d - 0.1) / 0.3); // fades with distance past the tip
      const ang = (rnd() - 0.5) * 1.4; // within about 40 degrees of the cut
      m.userData.v = [end * 0.12 * Math.cos(ang), 0.12 * Math.sin(ang)];
      m.userData.p = [end * (len / 2 + d) - end * 0.12, (rnd() - 0.5) * 0.08];
      m.rotation.z = ang;
      m.position.set(m.userData.p[0], m.userData.p[1], 0.01);
      hold.add(m); ms.push(m); flecks.push(m);
    }
    const sc = hold;
    const it = add(g, 2.0, (u, t) => {
      g.scale.set(Math.min(1, t / 0.05), 1, 1);
      let k0 = 0.2 * (1 - sm(0.15, 0.5, t)) + 0.85; // bright as it cuts, then it hangs a little dimmer until the click
      if (it.flash >= 0) { const k = (t - it.flash) / 0.25; k0 = Math.max(0, 1.15 * (1 - k)); hold.scale.y = 1 + 0.8 * Math.min(1, k * 3); if (k >= 1) it.t = it.life; }
      for (const m of ms) m.material.opacity = m.userData.op * Math.min(1, k0);
      for (const m of flecks) m.position.set(m.userData.p[0] + m.userData.v[0] * t, m.userData.p[1] + m.userData.v[1] * t, 0.01);
    });
    it.flash = -1;
    tcuts.push(it);
    const p0 = new Vector3(ev.x, 0.6, ev.z);
    // judge round 6: a pink starburst that reads on its own: 12 tapered needles fanned over ~200 degrees on the
    // pack's outer side, in the camera's plane, pink bodies with white last quarters, round a hot-pink knot
    const bg = new Group();
    bg.position.copy(p0);
    bg.quaternion.copy(g.quaternion);
    const phi = Math.atan2(-rz, rx || 0.01);
    const bms = [];
    for (let k = 0; k < 12; k++) {
      const a = phi + (k / 11 - 0.5) * (200 * Math.PI / 180) + (rnd() - 0.5) * 0.12;
      const L = 0.3 + 0.22 * rnd(), w0 = 0.022;
      const arm = new Group();
      arm.rotation.z = a;
      const strip2 = (x0, x1, wa, wb, col, o) => {
        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute([x0, -wa / 2, 0, x0, wa / 2, 0, x1, wb / 2, 0, x1, -wb / 2, 0], 3));
        geo.setIndex([0, 1, 2, 0, 2, 3]);
        const m = new Mesh(geo, basic(col, o, true));
        m.material.depthTest = false; m.renderOrder = 31; m.userData.op = m.material.opacity;
        arm.add(m); bms.push(m);
      };
      strip2(0.04, 0.04 + L * 0.75, w0, w0 * 0.3, '#FF6FA6', 1); // the hot-pink body
      strip2(0.04 + L * 0.75, 0.04 + L, w0 * 0.3, 0, '#FFFFFF', 0.9); // the white last quarter
      bg.add(arm);
    }
    add(bg, 0.32, (u) => { bg.scale.setScalar(0.5 + 0.5 * sm(0, 0.15, u)); for (const m of bms) m.material.opacity = m.userData.op * (1 - sm(0.5, 1, u)); });
    const knot = sprite('#FF5C9A', 0.6, true); // a small hot-pink knot where the needles meet
    knot.position.copy(p0);
    add(knot, 0.3, (u) => { knot.scale.setScalar(0.12 * (0.7 + 0.5 * u)); knot.material.opacity = 0.6 * (1 - u); });
    // judge round 3: no per-cut flash sprite (it bloomed into a haze); the blades carry the brightness
  });
  bus.on('review_af_tclick', (ev) => {
    for (const it of tcuts.splice(0)) it.flash = it.t;
    tcutBy.clear();
    const e = ev.id != null ? byId(ev.id) : null;
    if (e) { ring(e.x, e.z, 1.0, CRIMSON, { life: 0.35, op: 0.7, y: 0.5 }); sparkSpray(new Vector3(e.x, 0.6, e.z), { n: 12, col: CRIMSON, speed: 3, spread: 2, needle: false }); }
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
  const SPC = { fire: CRIMSON, earth: CRIMSON, water: CRIMSON, wind: CRIMSON };
  function spirit(x, z, dx, dz, wills, { life = 1.4, scale = 1.5, op = 0.62, fadeIn = 0.14, fadeOut = 0.35, y = 0, clip = null, speed = 1, from = 0, onT = null } = {}) {
    const st = window.__tripoFox;
    if (!st || !st.spirit) return null;
    const [w1, w2] = wills;
    const cA = SILVER, cB = CRIMSON;
    const takes = spTake;
    spTake = false;
    const S = st.spirit({ colA: cA, colB: cB, scale, op, swordA: SILVER, swordB: '#FFFFFF', swordL: takes ? SILVER : null });
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
  // Kesh 21 Nov 00:53 SGT "see in ten will which one can replace to what we have": the seal is the passed magic circle
  function seal(x, z, r, wills, life) { magicCircle(x, z, r, life, { op: 0.7 }); }
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
  // ---- Will special detail (Kesh 21 Nov 00:04 SGT: "all Will specials lack details, add insanely details: 剑光, 剑痕,
  // 剑风, 剑影, the mirror effect, the water effect"). Shared pieces; each special adds its own in SPECIAL_DETAIL ----
  // 剑痕: a scar cut into the floor: a hot-pink glow, a pale core and a silver hairline, fading slowly
  // Kesh 21 Nov 00:51 SGT "the floor crack use what we have": every 剑痕 is the passed floor crack (taperCrack), wide
  // where the blade bit in and a hairline at its end
  function swordScar(ax, az, bx, bz, { life = 1.6, w = 1, grow = 0.08 } = {}) {
    const L = Math.hypot(bx - ax, bz - az);
    taperCrack(ax, az, Math.atan2(bz - az, bx - ax), L, 0.1 * w, { life, grow: Math.max(0.04, grow), branch: L > 1.2 && w >= 1 ? 1 : 0, seam: 0.85 });
  }
  // 剑风: an upright moon crescent fired from (x, z) at angle a, facing out, growing from 20% as it flies `dist` in `fly` s
  const MOON_LAY = [['#FF2F7A', 0.28, true, 1.3], ['#C8145A', 0.6, false, 1], ['#FF4F90', 0.65, false, 0.5], ['#FFD0E2', 0.6, false, 0.14], ['#E7E3F0', 0.5, false, 0.045]];
  function moonWave(x, z, a, { H = 0.8, dist = 2.5, fly = 0.18, life = 0.5, delay = 0, scar = true } = {}) {
    later2(delay, () => {
      const ca = Math.cos(a), sa = Math.sin(a), g = new Group();
      g.rotation.y = -a;
      const ms = MOON_LAY.map(([col, op, ad, k], li) => { const m = new Mesh(moonBlade(H, k), basic(col, op, ad)); m.position.z = li * 0.002; m.renderOrder = 6 + li * 0.1; m.userData.op = m.material.opacity; g.add(m); return m; });
      if (scar) swordScar(x, z, x + ca * dist, z + sa * dist, { life: 1.0, w: 0.7, grow: fly });
      add(g, life, (u, t) => {
        const f = 1 - Math.pow(1 - Math.min(1, t / fly), 3), d = dist * f, k = 0.2 + 0.8 * f;
        g.position.set(x + ca * d, 0.02, z + sa * d);
        g.scale.setScalar(k);
        const out = sm(0.6, 1, u);
        ms.forEach((m) => { m.material.opacity = m.userData.op * (1 - out); });
      });
    });
  }
  function moonBurst(x, z, n, opts = {}, a0 = 0.2) { for (let i = 0; i < n; i++) moonWave(x, z, a0 + (i / n) * Math.PI * 2, { ...opts, delay: (opts.delay || 0) + i * 0.006 }); }
  // 剑影: a ghost sword left where a blade passed, fading; rx Math.PI points it down
  function swordShade(x, y, z, { rx = 0, ry = 0, rz = 0, len = 0.6, life = 0.35, op = 1, onT = null } = {}) {
    const s = ghostSword(CRIMSON, 0.6, len);
    s.position.set(x, y, z);
    s.rotation.set(rx, ry, rz, 'YXZ');
    return add(s, life, (u, t) => { s.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * op * Math.min(1, t / 0.06) * (1 - sm(0.5, 1, u)); }); if (onT) onT(s, u, t); });
  }
  // water: thin pale ripples spreading out one after another, and pale drops thrown up
  const rippleGeo = new RingGeometry(0.975, 1, 72);
  function ripples(x, z, r, { n = 3, gap = 0.14, life = 0.8, op = 0.5, delay = 0 } = {}) {
    for (let i = 0; i < n; i++) later2(delay + i * gap, () => {
      for (const [col, k, o] of [['#FFD0E2', 1, op], [SILVER, 0.94, op * 0.6], ['#FF4F90', 1.03, op * 0.4]]) {
        const m = new Mesh(rippleGeo, basic(col, o, true));
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.045, z);
        add(m, life, (u) => { m.scale.setScalar(r * k * (0.15 + 0.85 * (1 - (1 - u) ** 2))); m.material.opacity = o * 0.5 * (1 - u); });
      }
    });
  }
  function drops(x, z, { n = 10, up = 2.2, life = 0.55, y = 0.1 } = {}) { sparkSpray(new Vector3(x, y, z), { n, col: '#FFD0E2', dir: new Vector3(0, 1, 0), speed: up, spread: 1.3, life, needle: false }); }
  // the mirror: his Fox Step shade at (x, z) facing (dx, dz), in and out over `life`
  function mirrorShade(x, z, dx, dz, { life = 0.5, a = 0.3 } = {}) {
    const im = pinkShade();
    if (!im) return null;
    im.position.x = x; im.position.z = z; im.rotation.y = Math.atan2(dx, dz);
    return add(im, life, (u) => setShade(im, a * sm(0, 0.15, u) * (1 - sm(0.6, 1, u))));
  }
  const SPECIAL_DETAIL = {
    // One Thought: sword shadows trail the falling giant sword, a vertical 剑光 along the line, three moons run the
    // 7 u line, a long scar with two side scars stays 3 s, stars flash down the line (no rocks)
    one_thought: (ev) => {
      const { x, z, dx, dz } = ev, a = Math.atan2(dz, dx), yaw = Math.atan2(dx, dz), nx = -dz, nz = dx;
      for (let k = 0; k < 4; k++) later2(0.33 + k * 0.03, () => swordShade(x + dx * 3.5, 2.6 - k * 0.5, z + dz * 3.5, { rx: Math.PI, ry: yaw, len: 2.2, life: 0.25, op: 0.5 - k * 0.1 }));
      later2(0.45, () => {
        slash3d(x + dx * 3.5, z + dz * 3.5, dx, dz, 3.6, 38, CRIMSON, { tilt: 90, y: 1.1, life: 0.4, op: 0.7, w: 0.42 });
        slash3d(x + dx * 3.5, z + dz * 3.5, dx, dz, 3.5, 36, SILVER, { tilt: 90, y: 1.1, life: 0.25, op: 0.6, w: 0.08 });
        swordScar(x, z, x + dx * 7, z + dz * 7, { life: 3.0, w: 1.8, grow: 0.12 });
        for (const s2 of [-1, 1]) swordScar(x + dx * 0.8 + nx * 0.45 * s2, z + dz * 0.8 + nz * 0.45 * s2, x + dx * 6.2 + nx * 0.6 * s2, z + dz * 6.2 + nz * 0.6 * s2, { life: 2.2, w: 0.8, grow: 0.14 });
        [0.95, 0.75, 0.55].forEach((H, k) => moonWave(x + dx * 0.4, z + dz * 0.4, a, { H, dist: 6.6, fly: 0.22, life: 0.5, delay: k * 0.05, scar: false }));
        for (let k = 0; k < 7; k++) later2(k * 0.025, () => flashStar(x + dx * (0.6 + k), 0.2, z + dz * (0.6 + k), 1.1, 0.25));
      });
    },
    // Unmoved: eight moons go out from the planted sword with eight scars, eight small sword shadows stand round it
    // for its 3 s, a silver sword ring turns slowly round him
    unmoved: (ev) => {
      const { x, z, dx, dz } = ev, px = x + dx * 0.7, pz = z + dz * 0.7;
      later2(0.3, () => {
        moonBurst(px, pz, 8, { H: 0.6, dist: 2.5, fly: 0.16, life: 0.45, scar: false });
        for (let i = 0; i < 8; i++) { const b = 0.2 + (i / 8) * Math.PI * 2; swordScar(px + Math.cos(b) * 0.4, pz + Math.sin(b) * 0.4, px + Math.cos(b) * 2.5, pz + Math.sin(b) * 2.5, { life: 2.6, w: 1.1 }); }
        flashStar(px, 0.6, pz, 1.8, 0.3);
        for (let i = 0; i < 8; i++) {
          const b = 0.2 + ((i + 0.5) / 8) * Math.PI * 2;
          later2(0.04 * i, () => swordShade(px + Math.cos(b) * 1.7, 0.5, pz + Math.sin(b) * 1.7, { rx: Math.PI, ry: -b, len: 0.5, life: 3.0, op: 0.7, onT: (s2, u, t) => { s2.position.y = 0.5 + 0.5 * Math.max(0, 1 - t / 0.1); } }));
        }
        swordRing(px, 0.06, pz, 1.7, { tone: 'silver', life: 3.0, from: 1, op: 0.35, n: 7, spin: 0.6 });
      });
    },
    // Clear Mirror: still-water ripples run out over the mirror floor, his mirror twin stands facing him and four
    // more ring him as the reflection sheathes, a full circle of 剑光 and a scar circle, drops thrown up
    clear_mirror: (ev) => {
      const { x, z, dx, dz } = ev;
      ripples(x, z, 3, { n: 6, gap: 0.22, life: 1.0, op: 0.55 });
      later2(0.1, () => mirrorShade(x + dx * 1.2, z + dz * 1.2, -dx, -dz, { life: 1.2, a: 0.3 }));
      later2(0.5, () => {
        for (let i = 0; i < 4; i++) { const b = Math.atan2(dz, dx) + Math.PI / 4 + (i * Math.PI) / 2, mx = x + Math.cos(b) * 1.8, mz = z + Math.sin(b) * 1.8; mirrorShade(mx, mz, x - mx, z - mz, { life: 0.7, a: 0.22 }); ripples(mx, mz, 0.7, { n: 2, gap: 0.1, life: 0.5 }); }
        slash3d(x, z, dx, dz, 1.6, 170, CRIMSON, { y: 0.5, life: 0.35, op: 0.6, w: 0.3 });
        slash3d(x, z, dx, dz, 1.55, 165, SILVER, { y: 0.5, life: 0.22, op: 0.6, w: 0.07 });
        pathCrack(Array.from({ length: 33 }, (_, i) => { const b = (i / 32) * Math.PI * 2; return [x + Math.cos(b) * 2.6, z + Math.sin(b) * 2.6]; }), 0.07, { life: 1.4, grow: 0.25, ends: false });
        for (let i = 0; i < 8; i++) { const b = (i / 8) * Math.PI * 2; drops(x + Math.cos(b) * 2.2, z + Math.sin(b) * 2.2, { n: 3, up: 1.8 }); }
        drops(x, z, { n: 10, up: 2.6 });
      });
    },
    // Counterblow: five sword shadows fan out in front of the guard for its second
    counterblow: (ev) => {
      const { x, z, dx, dz } = ev, px = x + dx * 0.9, pz = z + dz * 0.9, yaw = Math.atan2(dx, dz);
      for (let i = 0; i < 5; i++) { const off = (i - 2) * 0.28; later2(0.05 + i * 0.03, () => swordShade(px - dz * off, 0.15, pz + dx * off, { ry: yaw, rz: (i - 2) * 0.25, len: 0.7, life: 1.0, op: 0.55 })); }
    },
    // See Through: his mirror shade steps in behind every marked foe before the cut, a cross scar under each, a star
    see_through: (ev) => {
      const { dx, dz } = ev;
      later2(0.58, () => {
        for (const id of ev.ids || []) {
          const e = byId(id);
          if (!e) continue;
          mirrorShade(e.x - dx * 0.75, e.z - dz * 0.75, dx, dz, { life: 0.45, a: 0.3 });
        }
      });
      later2(0.7, () => {
        for (const id of ev.ids || []) {
          const e = byId(id);
          if (!e) continue;
          foxCut({ x: e.x - dx * 0.4, z: e.z - dz * 0.4, dx, dz, r: 0.8, tilt: 25, shade: true });
          swordScar(e.x - 0.45, e.z - 0.45, e.x + 0.45, e.z + 0.45, { life: 2.0, w: 0.8 });
          swordScar(e.x - 0.45, e.z + 0.45, e.x + 0.45, e.z - 0.45, { life: 2.0, w: 0.8 });
          flashStar(e.x, 0.6, e.z, 1.0, 0.25);
        }
      });
    },
    // Wild Dance: every stroke is a 剑光 crescent and leaves a sword shadow at its corner and a scar; when the star
    // folds in, five moons fly out from its points
    wild_dance: (ev) => {
      if (ev.tid == null) return;
      const cx = ev.tx, cz = ev.tz, R = 1.15, a0 = Math.atan2(ev.dx, ev.dz);
      const P = [0, 1, 2, 3, 4].map((k) => ({ x: cx + Math.sin(a0 + Math.PI + (k * 2 * Math.PI) / 5) * R, z: cz + Math.cos(a0 + Math.PI + (k * 2 * Math.PI) / 5) * R }));
      const order = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];
      order.forEach(([i, j], n) => later2(0.1 + n * 0.085, () => {
        const A = P[i], B = P[j], L = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / L, uz = (B.z - A.z) / L;
        foxCut({ x: A.x + ux * L * 0.15, z: A.z + uz * L * 0.15, dx: ux, dz: uz, r: L * 0.55, tilt: n % 2 ? 22 : -22 });
        swordShade(A.x, 0.45, A.z, { ry: Math.atan2(ux, uz), rx: 1.2, len: 0.55, life: 0.35, op: 0.6 });
        swordScar(A.x, A.z, B.x, B.z, { life: 1.8 - n * 0.08, w: 0.9 });
      }));
      later2(1.25, () => {
        P.forEach((p) => moonWave(p.x, p.z, Math.atan2(p.z - cz, p.x - cx), { H: 0.6, dist: 1.6, fly: 0.16, life: 0.45 }));
        flashStar(cx, 0.6, cz, 1.6, 0.3);
      });
    },
    // Still Mountain: still water under him (a slow ripple each 0.6 s), six sword shadows hang round him point down
    // and turn slowly for the 3 s; when it rises eight moons go out with ripples and drops
    still_mountain: (ev) => {
      const { x, z } = ev;
      for (let k = 0; k < 5; k++) later2(0.2 + k * 0.6, () => { const f = fox() || { x, z }; ripples(f.x, f.z, 1.3, { n: 1, life: 1.2, op: 0.5 }); });
      const g = new Group();
      for (let i = 0; i < 6; i++) { const s2 = ghostSword(CRIMSON, 0.6, 0.45); s2.rotation.x = Math.PI; g.add(s2); }
      add(g, 3.0, (u, t) => {
        const f = fox();
        if (f) g.position.set(f.x, 0, f.z);
        g.children.forEach((s2, i) => {
          const b = t * 0.8 + (i / 6) * Math.PI * 2;
          s2.position.set(Math.cos(b) * 1.0, 0.95 + 0.06 * Math.sin(t * 2.5 + i), Math.sin(b) * 1.0);
          s2.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ??= o.material.opacity) * 0.6 * Math.min(1, t / 0.3) * (1 - sm(0.9, 1, u)); });
        });
      });
      later2(3.05, () => {
        moonBurst(x, z, 8, { H: 0.7, dist: 3, fly: 0.18, life: 0.5 });
        ripples(x, z, 3, { n: 3, gap: 0.1, life: 0.8 });
        drops(x, z, { n: 14, up: 2.8 });
      });
    },
    // Last Stand: ten radial scars, eight moons out, eight swords spring up out of the floor round him (no rocks)
    last_stand: (ev) => {
      const { x, z } = ev;
      later2(0.3, () => {
        for (let i = 0; i < 10; i++) { const b = (i / 10) * Math.PI * 2 + 0.15; swordScar(x + Math.cos(b) * 0.3, z + Math.sin(b) * 0.3, x + Math.cos(b) * 2.3, z + Math.sin(b) * 2.3, { life: 2.2, w: 1.1, grow: 0.06 }); }
        moonBurst(x, z, 8, { H: 0.75, dist: 2.5, fly: 0.16, life: 0.45, scar: false });
        for (let i = 0; i < 8; i++) {
          const b = ((i + 0.5) / 8) * Math.PI * 2;
          later2(i * 0.02, () => swordShade(x + Math.cos(b) * 1.2, -0.6, z + Math.sin(b) * 1.2, { ry: -b, rz: 0.3, len: 0.7, life: 0.8, op: 0.8, onT: (s2, u, t) => { s2.position.y = -0.6 + 0.75 * Math.min(1, t / 0.12); } }));
        }
      });
    },
    // Flow: drops and ripples where the stream passes, a scar along its S on the floor, a 剑光 at its turn, ripples
    // and a star as it comes home
    flow: (ev) => {
      const { x, z, dx, dz } = ev, nx = -dz, nz = dx;
      const at = (u) => { const out = u < 0.5, v = out ? u * 2 : (1 - u) * 2, lat = (out ? 1 : -1) * 0.9 * Math.sin(Math.PI * 2 * v); return { x: x + dx * 6 * v + nx * lat, z: z + dz * 6 * v + nz * lat }; };
      // the crack runs along the S as the stream goes out (the way back stays on the same line)
      later2(0.2, () => pathCrack(Array.from({ length: 41 }, (_, i) => { const p = at((i / 40) * 0.5); return [p.x, p.z]; }), 0.09, { life: 1.6, grow: 0.35 }));
      for (let k = 0; k <= 36; k += 5) later2(0.2 + (k / 36) * 0.7, () => { const p = at(k / 36); drops(p.x, p.z, { n: 3, up: 1.6, life: 0.45, y: 0.4 }); ripples(p.x, p.z, 0.6, { n: 1, life: 0.6, op: 0.45 }); });
      later2(0.55, () => { const p = at(0.5); foxCut({ x: p.x, z: p.z, dx, dz, r: 1.0, tilt: 30 }); flashStar(p.x, 0.55, p.z, 1.3, 0.28); ripples(p.x, p.z, 1.2, { n: 2, gap: 0.1 }); });
      later2(0.92, () => { const f = fox(); if (f) { flashStar(f.x, 0.7, f.z, 1.2, 0.28); ripples(f.x, f.z, 1.4, { n: 3, gap: 0.12 }); } });
    },
  };
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
        for (let k = 0; k < 12; k++) { const t = 0.4 + k * 0.55, s2 = k % 2 ? 1 : -1; pinkSpike(x + dx * t - dz * 0.35 * s2, z + dz * t + dx * 0.35 * s2, 0.5 + 0.35 * rnd(), 0.6, { delay: k * 0.015 }); }
        strip(x, z, ex, ez, SILVER, { life: 0.6, op: 0.75, w: 0.08, y: 0.08 });
        ring(x + dx * 2.6, z + dz * 2.6, 1.6, GOLD, { life: 0.45, op: 0.7 });
        for (let k = 0; k < 7; k++) {
          const px = x + dx * (0.6 + k), pz = z + dz * (0.6 + k);
          later2(k * 0.02, () => sparkSpray(new Vector3(px, 0.1, pz), { n: 6, col: GOLD, dir: new Vector3(0, 1, 0), speed: 3.2, spread: 1.4, life: 0.4 }));
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
        plantedSword(px, pz, yaw, BRONZE, 1.05, 3.0, () => { flashStar(px, 0.8, pz, 1.4, 0.3); sparkSpray(new Vector3(px, 0.8, pz), { n: 12, col: BRONZE, speed: 3, spread: 2, life: 0.5 }); });
        for (let k = 0; k < 6; k++) later2(0.2 + k * 0.45, () => ring(px, pz, 0.55, BRONZE, { life: 1.0, op: 0.5, y: 0.1 + k * 0 }));
        // his own still guard: a bronze ring at his feet while it stands
        const f = fox();
        if (f) { const g = new Mesh(ringGeo, basic(BRONZE, 0.55)); g.rotation.x = -Math.PI / 2; add(g, 3.0, (u) => { const b = fox(); if (b) g.position.set(b.x, 0.06, b.z); g.scale.setScalar(0.62); g.material.opacity = 0.55 * (1 - sm(0.85, 1, u)); }); }
      });
    },
    // M29 Clear Mirror: the floor round him turns to a mirror; his reflection rises out of it and sheathes
    clear_mirror: (ev) => {
      const { x, z, dx, dz } = ev;
      fieldDisc(x, z, 3, 1, 1.6); // the mirror floor is the passed Mirror Ring zone
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
    // M30 Frenzy: four silver spirits burst out to four sides and cut back across him, a cross, then a second.
    // Kesh 21 Nov 00:02 SGT "design is good, but make it extremely fancy": same spirits, paths and timing; on top:
    // a burst as they leave him, speed streaks on every dash, each cut a full 剑光 crescent with a white hairline, a
    // star where the cuts cross and a scar left on the floor; after the second cross the eight scars flash as one
    // star, the spirits streak back into him, and for the 4 s of haste he runs hot: pink after-images, a spinning
    // twin-arc ring at his feet and pink-and-silver sparks off the blade
    frenzy: (ev) => {
      const { x, z, dx, dz } = ev, yaw0 = Math.atan2(dz, dx), R = 1.9;
      const scars = [];
      // the burst out of him: a star at his chest, a hot ring, needles to the four spirits' first marks
      flashStar(x, 0.7, z, 1.6, 0.3);
      ring(x, z, 1.2, '#FF4F90', { life: 0.35, from: 0.2, op: 0.8 });
      ring(x, z, 0.7, '#FFFFFF', { life: 0.25, from: 0.2, op: 0.6 });
      for (let k = 0; k < 4; k++) {
        const a0 = yaw0 + Math.PI / 4 + (k * Math.PI) / 2;
        sparkSpray(new Vector3(x, 0.6, z), { n: 4, col: '#FF4F90', dir: new Vector3(Math.cos(a0), 0.15, Math.sin(a0)), speed: 4.5, spread: 0.25, life: 0.25, needle: true, nw: 0.5 });
      }
      // one cut along a -> b: the streak, a crescent at the crossing, the hairline, a star and a scar
      const cut = (ax, az, bx, bz, side) => {
        const lx = bx - ax, lz = bz - az, L = Math.hypot(lx, lz) || 1, ux = lx / L, uz = lz / L;
        strip(ax, az, bx, bz, '#FFFFFF', { life: 0.2, op: 0.75, w: 0.025, y: 0.6, grow: 0.08 });
        strip(ax, az, bx, bz, '#FF4F90', { life: 0.3, op: 0.4, w: 0.2, y: 0.55, grow: 0.08 });
        slash3d(x, z, -uz * side, ux * side, 1.15, 62, CRIMSON, { tilt: side * 18, y: 0.6, life: 0.3, op: 0.75, w: 0.36, side });
        later2(0.05, () => { flashStar(x, 0.6, z, 1.1, 0.22); sparkSpray(new Vector3(x, 0.6, z), { n: 5, col: '#FF4F90', dir: new Vector3(ux, 0.3, uz), speed: 3.5, spread: 0.5, life: 0.28, needle: true, nw: 0.4 }); });
        swordScar(ax, az, bx, bz, { life: 1.4, w: 0.8, grow: 0.08 });
        scars.push([ax, az, bx, bz]);
        ring(bx, bz, 0.35, '#FF4F90', { life: 0.25, from: 0.3, op: 0.6 });
      };
      for (let k = 0; k < 4; k++) {
        const a0 = yaw0 + Math.PI / 4 + (k * Math.PI) / 2, a1 = a0 + Math.PI + 0.5;
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
        // the streak as it bursts out to its first mark, and the curve it runs round to the second
        strip(x, z, p0.x, p0.z, '#FF4F90', { life: 0.22, op: 0.5, w: 0.1, y: 0.5, grow: 0.12 });
        later2(0.12, () => ring(p0.x, p0.z, 0.4, '#FFFFFF', { life: 0.2, from: 0.2, op: 0.5 }));
        later2(0.32 + k * 0.1, () => strip(p1.x, p1.z, p2.x, p2.z, '#FF4F90', { life: 0.3, op: 0.3, w: 0.06, y: 0.45, grow: 0.2 }));
        later2(0.2 + k * 0.1, () => { S.play('blurA', { speed: 1.2 }); });
        later2(0.22 + k * 0.1, () => cut(p0.x, p0.z, p1.x, p1.z, 1));
        later2(0.6 + k * 0.1, () => { S.root.rotation.y = Math.atan2(p3.x - p2.x, p3.z - p2.z); S.play('blurB', { speed: 1.2 }); });
        later2(0.62 + k * 0.1, () => cut(p2.x, p2.z, p3.x, p3.z, -1));
        // after the last cross it streaks back into him
        later2(1.05, () => { const f = fox() || { x, z }; strip(p3.x, p3.z, f.x, f.z, '#FF4F90', { life: 0.2, op: 0.55, w: 0.08, y: 0.6, grow: 0.12 }); strip(p3.x, p3.z, f.x, f.z, '#FFFFFF', { life: 0.15, op: 0.6, w: 0.02, y: 0.62, grow: 0.12 }); });
      }
      // the finale: the eight scars flash as one star, a burst at the middle, and he flares
      later2(1.05, () => {
        for (const [ax, az, bx, bz] of scars) { strip(ax, az, bx, bz, '#FF4F90', { life: 0.35, op: 0.8, w: 0.12, y: 0.045 }); strip(ax, az, bx, bz, '#FFFFFF', { life: 0.25, op: 0.7, w: 0.025, y: 0.05 }); }
        pinkStar(x, 0.15, z, { n: 16, L0: 0.8, L1: 2.1, w0: 0.03, flat: true, life: 0.35, knot: 0.3 });
        ring(x, z, 2.1, '#FF4F90', { life: 0.4, from: 0.4, op: 0.4 });
      });
      later2(1.18, () => {
        const f = fox();
        if (!f) return;
        flashStar(f.x, 0.8, f.z, 1.4, 0.3);
        ring(f.x, f.z, 0.9, '#FFFFFF', { life: 0.3, from: 0.2, op: 0.6 });
        for (let i = 0; i < 3; i++) later2(i * 0.05, () => afterImage('#FF3F86', 0.25, 0.3));
        label('attack speed +30%', '#FF9CC0', f.x, 1.6, f.z, { life: 1.1, size: 0.24 });
      });
      // the 4 s of haste: a spinning twin-arc ring at his feet, a pink after-image every 0.2 s, sparks off the blade
      later2(1.0, () => {
        const g = new Group();
        for (let i = 0; i < 2; i++) {
          const m = new Mesh(new RingGeometry(0.5, 0.56, 40, 1, i * Math.PI, Math.PI * 0.6), basic('#FF4F90', 0.55, true));
          m.rotation.x = -Math.PI / 2;
          g.add(m);
        }
        const m2 = new Mesh(new RingGeometry(0.62, 0.64, 48), basic('#FFD0E2', 0.3));
        m2.rotation.x = -Math.PI / 2;
        g.add(m2);
        add(g, 4.0, (u, t) => {
          const f = fox();
          if (f) g.position.set(f.x, 0.05, f.z);
          g.rotation.y = -t * 9;
          const k = Math.min(1, t / 0.15) * (1 - sm(0.85, 1, u));
          g.children.forEach((m, i) => { m.material.opacity = (i < 2 ? 0.28 : 0.3) * k * (0.85 + 0.15 * Math.sin(t * 14)); });
        });
      });
      for (let k = 0; k < 20; k++) later2(1.2 + k * 0.2, () => afterImage('#FF3F86', 0.16, 0.25));
      for (let k = 0; k < 30; k++) later2(1.0 + k * 0.13, () => { const p = tipPos(); if (p) sparkSpray(p, { n: 2, col: k % 2 ? SILVER : '#FF4F90', dir: new Vector3(0, 0.3, 0), speed: 0.8, spread: 0.7, life: 0.35 }); });
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
      later2(0.2, () => {
        for (const id of ev.ids || []) {
          const e = byId(id);
          if (!e) continue;
          // where the cut will come: a faint 剑光 held on the foe (the passed blade look)
          slash3d(e.x - dx * 0.4, e.z - dz * 0.4, dx, dz, 0.7, 70, SILVER, { y: 0.6, life: 0.5, op: 0.35, w: 0.12, tilt: 25 });
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
      order.forEach(([i, j], n) => later2(0.1 + n * 0.085, () => {
        const A = P[i], B = P[j], col = n < 5 ? GOLD : SILVER;
        if (S) {
          S.root.position.set(A.x, 0, A.z);
          S.root.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
          S.play(n % 2 ? 'blurB' : 'blurA', { speed: 1.6 });
          add(new Group(), 0.085, (u) => { S.root.position.set(A.x + (B.x - A.x) * u, 0, A.z + (B.z - A.z) * u); });
        }
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
      fieldDisc(x, z, 0.95, 1, 3.0); // the still ring under him is the passed Mirror Ring zone
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
        // the pillar is a sheaf of the passed Rift Cut spikes
        pinkSpike(x, z, 2.8, 0.7, { w: 2.2 });
        for (let k = 0; k < 7; k++) { const b = (k / 7) * Math.PI * 2, d = 0.22 + 0.12 * rnd(); pinkSpike(x + Math.cos(b) * d, z + Math.sin(b) * d, 1.4 + 1.0 * rnd(), 0.65, { delay: 0.01 * k, w: 1.3 }); }
        ring(x, z, 2.5, BRONZE, { life: 0.5, op: 0.7 });
        ring(x, z, 2.1, SILVER, { life: 0.45, op: 0.45 });
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
  bus.on('review_af_special', (ev) => { spTake = true; if (SPECIAL_FX[ev.name]) SPECIAL_FX[ev.name](ev); spTake = false; if (SPECIAL_DETAIL[ev.name]) SPECIAL_DETAIL[ev.name](ev); });

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
    // Kesh 20 Nov: the echo is a pink shade like Fox Step's, not silver
    const S = st.spirit({ colA: '#FF3F86', colB: '#FF9CC0', scale: 1, op: 0.5, swordA: '#FF6FA6', swordB: '#FFD0E2' });
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
  // Blade Dance · Swift (Kesh 20 Nov 16:57 SGT): a mirror of him (the echo's pink shade) stays where he dashed out,
  // still, facing his dash; when he starts the burst it plays the same dance and bursts with him, then fades
  bus.on('review_af_dmirror', (ev) => {
    const st = window.__tripoFox;
    if (ev.on) {
      if (!st || !st.spirit) return;
      if (mirrorG && !mirrorG.dead) mirrorG.dispose();
      const S = st.spirit({ colA: '#FF3F86', colB: '#FF9CC0', scale: 1, op: 0.5, swordA: '#FF6FA6', swordB: '#FFD0E2' });
      if (!S) return;
      mirrorG = S;
      S.root.position.set(ev.x, 0, ev.z);
      S.root.rotation.y = Math.atan2(ev.dx, ev.dz);
      S.play('dance20', { from: 0 });
      S.freeze();
      S.end = 3;
      ring(ev.x, ev.z, 0.42, CRIMSON, { life: 0.3, op: 0.55, y: 0.04, from: 0.2 });
      add(S.root, 3, (u, t, dt) => {
        S.tNow = t;
        S.tick(dt || 0);
        S.opacity(Math.min(1, t / 0.12) * Math.max(0, Math.min(1, (S.end - t) / 0.35)));
        if (t >= S.end) S.dispose();
      });
    } else if (ev.play && mirrorG && !mirrorG.dead) {
      const S = mirrorG;
      S.play('dance20', { from: 0 });
      S.end = (S.tNow || 0) + 0.9; // the mirror's own dance carries it (cue skips ev.mirror)
    }
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
      for (let k = 0; k < 6; k++) { const t = 0.5 + k * 0.48; pinkSpike(ev.x + ev.dx * t, ev.z + ev.dz * t, 0.45 + 0.3 * rnd(), 0.5, { delay: k * 0.015 }); }
      strip(ev.x, ev.z, ev.x + ev.dx * 3, ev.z + ev.dz * 3, '#FFFFFF', { life: 0.3, op: 0.9, w: 0.07, y: 0.08, grow: 0.08 });
      slash3d(px, pz, ev.dx, ev.dz, 1.6, 60, GOLD, { y: 0.8, life: 0.3, op: 0.55, tilt: 70 });
      moonWave(px, pz, Math.atan2(ev.dz, ev.dx), { H: 1.0, dist: 2.6, fly: 0.15, life: 0.45 });
      flashStar(px, 0.8, pz, 1.4, 0.28);
    });
  });
  bus.on('review_af_sp_cut', (ev) => {
    const S = cb.S;
    const px = ev.x + ev.dx * 0.55, pz = ev.z + ev.dz * 0.55;
    if (S) S.play('rising', { speed: 1.1 });
    later2(0.12, () => {
      for (let k = 0; k < 6; k++) { const t = 0.5 + k * 0.48; pinkSpike(ev.x + ev.dx * t, ev.z + ev.dz * t, 0.4 + 0.3 * rnd(), 0.45, { delay: k * 0.015 }); }
      slash3d(px, pz, ev.dx, ev.dz, 1.4, 55, GOLD, { y: 0.8, life: 0.3, op: 0.7, tilt: 70 });
      moonWave(px, pz, Math.atan2(ev.dz, ev.dx), { H: 0.9, dist: 2.6, fly: 0.15, life: 0.45 });
      flashStar(px, 0.8, pz, 1.2, 0.25);
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
      if (it.update) { fxCtx = it.ctx; try { it.update(u, it.t, dt); } finally { fxCtx = null; } }
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
