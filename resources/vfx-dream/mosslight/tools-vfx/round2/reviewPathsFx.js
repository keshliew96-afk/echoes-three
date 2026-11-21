// REVIEW-ONLY (never committed): the talent looks (MOSSLIGHT_TALENT_PATHS.md v2,
// T38 to T40): the vine ring shrinking at a HoT or afterglow ally's feet, Bark's
// thin ring, the dark green Sap motes flying into the gem, the Bright Heal pour
// from the gem (or the planted staff) to an ally, and the pour's reach ring.
import { AdditiveBlending, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, PlaneGeometry, Shape, ShapeGeometry, SphereGeometry, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
import { PALETTE } from '../../data/palette.js';
import { getRadialTexture } from '../glow.js';
import { DREAM as DT, dreamTrail } from './reviewMossFx.js'; // round 2: the passed looks' textures
import { makeLily, makeOak, makeOakling, makePuffcap, makeSapling, makeSeed, makeSnapjaw, makeSpitter } from './reviewPlants.js'; // REVIEW-ONLY: Kesh's plant models (16 Nov)

const SAP_GREEN = '#3E8240';
const SAP_HEAD = '#8CC46E';

export function createReviewPathsFx({ bus, root, world, tip }) {
  function rimGlow(r, color, op) { // round 2: Dew Wave's glowing rim, round (r = outer radius)
    const d = (2 * r) / 0.92;
    const m = new Mesh(new PlaneGeometry(d, d), new MeshBasicMaterial({ map: DT.rimTex(), color, transparent: true, opacity: op, depthWrite: false, side: DoubleSide, blending: AdditiveBlending }));
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  const byId = (id) => {
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };
  const sprite = (color, add = true) =>
    new Sprite(new SpriteMaterial({ map: getRadialTexture(), color, blending: add ? AdditiveBlending : undefined, depthWrite: false, transparent: true, opacity: 0 }));
  const vines = new Map(); // `${target}|${skill}` -> { ring, id, t, life }
  const parts = []; // flying sprites
  const ringGeo = new RingGeometry(0.42, 0.47, 40);
  bus.on('review_hot', (ev) => {
    const key = `${ev.target}|${ev.skill}`;
    let v = vines.get(key);
    if (!v) {
      const ring = rimGlow(0.47, PALETTE.brightHeal, 0.6); // round 2: Dew Wave rim
      ring.rotation.x = -Math.PI / 2;
      root.add(ring);
      v = { ring, id: ev.target };
      vines.set(key, v);
    }
    v.t = 0;
    v.life = ev.secs;
    v.offset = 0.04 + 0.012 * [...vines.keys()].filter((k) => k.startsWith(`${ev.target}|`)).indexOf(key);
  });
  let sapThrottle = 0;
  bus.on('review_sap', (ev) => {
    if (sapThrottle > 0) return;
    sapThrottle = 0.25; // at most four a second (T35)
    const s = sprite(SAP_HEAD, false);
    s.scale.setScalar(0.16);
    root.add(s);
    parts.push({ s, from: new Vector3(ev.x, 0.6, ev.z), t: 0, life: 0.45, kind: 'sap' });
  });
  bus.on('review_pour', (ev) => {
    const from = ev.fx != null ? new Vector3(ev.fx, 1.0, ev.fz) : null; // Rooted Staff (T27): from the planted staff's gem
    for (let i = 0; i < 5; i++) {
      const s = sprite(PALETTE.brightHeal);
      s.scale.setScalar(0.14 - i * 0.015);
      root.add(s);
      parts.push({ s, target: ev.target, from, t: -i * 0.04, life: 0.32, kind: 'pour' });
    }
  });
  // Mercy Bell's nature wisp (Kesh 11-16): a soft Bright Heal mote circling the ally, sized by
  // what it holds; when the ally is hit it dives in and heals.
  const wisps = new Map(); // target -> { core, tail[], a, store, cap, fade }
  bus.on('review_wisp', (ev) => {
    let w = wisps.get(ev.target);
    if (!w) {
      const core = sprite(PALETTE.brightHeal);
      root.add(core);
      const tail = [0, 1, 2, 3].map(() => {
        const t = sprite(PALETTE.brightHeal);
        root.add(t);
        return t;
      });
      w = { core, tail, a: Math.random() * 6.28, born: 0, hist: [] };
      wisps.set(ev.target, w);
    }
    w.store = ev.store;
    w.cap = ev.cap;
    w.fade = null;
    w.pulse = 1;
  });
  bus.on('review_wisp_heal', (ev) => {
    const w = wisps.get(ev.target);
    if (w) {
      w.store = ev.store;
      w.dive = 1;
    }
    const e = byId(ev.target);
    if (!e) return;
    for (let i = 0; i < 4; i++) {
      const s = sprite(PALETTE.brightHeal);
      s.scale.setScalar(0.12);
      root.add(s);
      parts.push({ s, target: ev.target, from: w ? w.core.position.clone() : null, t: -i * 0.03, life: 0.22, kind: 'pour' });
    }
  });
  bus.on('review_wisp_end', (ev) => {
    const w = wisps.get(ev.target);
    if (w) w.fade = 0;
  });
  // ---- The druid kit (MOSSLIGHT_SKILL_KIT.md): the seed, the bloom, the sapling, the vine ----
  const kitObjs = new Map(); // id -> { kind, g, t, ... }
  const burst = (x, y, z, color, n = 6, size = 0.12) => {
    for (let i = 0; i < n; i++) {
      const s = sprite(color);
      s.scale.setScalar(size);
      root.add(s);
      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.7, v = 0.75 + Math.random() * 0.5; // EFX3
      parts.push({ s, kind: 'fly', from: new Vector3(x, y, z), vel: new Vector3(Math.cos(a) * 0.9 * v, 0.7 + Math.random() * 0.5, Math.sin(a) * 0.9 * v), t: 0, life: 0.36 + Math.random() * 0.12, size });
    }
  };
  // S11 Seed Bolt: a spent bolt drops a glowing seed that heals the first hurt ally to touch it.
  bus.on('review_seed', (ev) => {
    const g = new Group();
    const sm = makeSeed(); // Kesh's seed model (16 Nov), 0.3 u; the stand-in pod if it has not loaded
    let seed;
    if (sm) { seed = new Group(); seed.add(sm); seed.userData.model = true; seed.rotation.y = ((ev.id * 2.39) % 6.28); }
    else { seed = new Mesh(new IcosahedronGeometry(0.07, 0), new MeshStandardMaterial({ color: '#8FD08A', emissive: '#3E9A4E', emissiveIntensity: 0.6, roughness: 0.6 })); seed.position.y = 0.08; }
    g.add(seed);
    const glow = sprite(PALETTE.brightHeal);
    glow.scale.setScalar(0.32);
    glow.position.y = 0.12;
    g.add(glow);
    const ring = rimGlow(0.43, PALETTE.brightHeal, 0.7); // round 2: Dew Wave rim (soft rim needs more opacity to read)
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    g.add(ring);
    g.position.set(ev.x, 0, ev.z);
    root.add(g);
    // Sower (Kesh 11-16 22:52): turret seeds shoot from the staff top on a low arc, quick and spinning.
    const thr = ev.fromX != null ? (ev.low
      ? { from: new Vector3(ev.fromX, 0.55, ev.fromZ), to: new Vector3(ev.x, 0, ev.z), t: 0, dur: 0.42, peak: 0.32, low: true, trail: 0 }
      : { from: new Vector3(ev.fromX, 0.7, ev.fromZ), to: new Vector3(ev.x, 0, ev.z), t: 0, dur: 0.35, peak: 0.9 }) : null;
    if (thr) g.position.copy(thr.from);
    kitObjs.set(ev.id, { kind: 'seed', g, glow, seed, ring, t: 0, thr });
  });
  bus.on('review_seed_end', (ev) => {
    const o = kitObjs.get(ev.id);
    if (!o) return;
    if (ev.used) { // kit 1.7 (S56): the player sees the seed go and what it became
      const p = o.g.position;
      o.ring.visible = false;
      if (ev.toX != null) { o.thr = null; o.use = { from: p.clone(), to: new Vector3(ev.toX, ev.used === 'hedge' ? 0.2 : 0.5, ev.toZ), t: 0 }; return; }
      burst(p.x, 0.15, p.z, ev.used === 'flower' ? FLOWER : LEAF_LIGHT, 5, 0.09);
      o.fade = 0;
      return;
    }
    if (ev.target != null) burst(o.g.position.x, 0.3, o.g.position.z, PALETTE.brightHeal, 7, 0.13);
    if (ev.sprout) o.sprouting = 0; // it opens up as it sprouts
    o.fade = 0;
  });
  // S13 Nova Bloom: Moss on an ally pays out at once - its vine rings burst open.
  bus.on('review_bloom', (ev) => {
    const e = byId(ev.target);
    for (const [key, v] of vines) {
      if (!key.startsWith(`${ev.target}|`) || key.endsWith('|perennial')) continue;
      v.t = v.life; // the update removes it
    }
    if (!e) return;
    const ring = rimGlow(0.5, PALETTE.brightHeal, 0.8); // round 2: Dew Wave rim
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(e.x, 0.06, e.z);
    root.add(ring);
    parts.push({ s: ring, kind: 'ring', t: 0, life: 0.45, grow: 1.6 });
    burst(e.x, 0.5, e.z, PALETTE.brightHeal, 8, 0.15);
  });
  // S18 Mending Sapling: a small sapling grows where she aimed and sends a heal mote every 2 s.
  const trunkGeo = new CylinderGeometry(0.03, 0.05, 0.36, 6);
  const leafGeo = new ConeGeometry(0.17, 0.3, 6);
  bus.on('review_sapling', (ev) => {
    const g = new Group();
    const tree = new Group(); // the sapling reads at play zoom beside a hero
    tree.scale.setScalar(1.8);
    g.add(tree);
    const trunk = new Mesh(trunkGeo, new MeshStandardMaterial({ color: '#6B4A2B', roughness: 0.9 }));
    trunk.position.y = 0.18;
    tree.add(trunk);
    const leafMat = new MeshStandardMaterial({ color: '#5FA35A', emissive: '#2E6B34', emissiveIntensity: 0.35, roughness: 0.7, flatShading: true });
    const crown = new Group();
    for (const [x, y, z, k] of [[0, 0.42, 0, 1], [0.09, 0.33, 0.05, 0.7], [-0.08, 0.34, -0.05, 0.7]]) {
      const l = new Mesh(leafGeo, leafMat);
      l.position.set(x, y, z);
      l.scale.setScalar(k);
      crown.add(l);
    }
    tree.add(crown);
    const glow = sprite(PALETTE.brightHeal);
    glow.scale.setScalar(0.55);
    glow.position.y = 0.75;
    g.add(glow);
    const reachRing = rimGlow(ev.reach, PALETTE.brightHeal, 0); // round 2: Dew Wave rim
    reachRing.rotation.x = -Math.PI / 2;
    reachRing.position.y = 0.03;
    g.add(reachRing);
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    tree.scale.setScalar(0.9);
    let sway = crown;
    const sm = makeSapling();
    if (sm) { tree.remove(trunk, crown); sway = new Group(); sm.scale.setScalar(0.48); sway.add(sm); tree.add(sway); } // Kesh's model: 0.43, 0.87, 1.3 u
    kitObjs.set(ev.id, { kind: 'sapling', g, tree, crown: sway, glow, reachRing, t: 0, pulse: 0, life: ev.secs || 8, sc: 0.9, level: 1 });
    burst(ev.x, 0.15, ev.z, '#8CC46E', 6, 0.1);
  });
  // Kesh 18 Nov: the sapling grows a level (a ring and a leaf burst; the third level reaches 1 u further).
  bus.on('review_sapling_grow', (ev) => {
    const o = kitObjs.get(ev.id);
    if (!o) return;
    o.level = ev.level;
    o.pulse = 1;
    if (ev.level === 3) { o.reachRing.geometry.dispose(); o.reachRing.geometry = new RingGeometry(ev.reach - 0.04, ev.reach, 64); }
    burst(ev.x, 0.5 * ev.level, ev.z, '#8CC46E', 6 + 3 * ev.level, 0.11);
    burst(ev.x, 0.2, ev.z, PALETTE.brightHeal, 5, 0.09);
  });
  bus.on('review_sapling_mote', (ev) => {
    const o = kitObjs.get(ev.id);
    if (o) o.pulse = 1;
    const sap = kitObjs.get(ev.id);
    const fy = sap ? 0.45 * sap.sc + 0.2 : 0.55;
    for (let i = 0; i < 5; i++) {
      const s = sprite(i === 0 ? BLOSSOM : PALETTE.brightHeal); // kit v1.4 R17: a blossom leads the heal
      s.scale.setScalar(i === 0 ? 0.2 : 0.15 - i * 0.02);
      root.add(s);
      parts.push({ s, target: ev.target, from: new Vector3(ev.x, fy, ev.z), t: -i * 0.05, life: 0.45, kind: 'pour', arc: 0.5 });
    }
  });
  bus.on('review_sapling_end', (ev) => {
    const o = kitObjs.get(ev.id);
    if (o) o.fade = 0;
  });
  // S25 Sapping Vine: a dark green vine from her gem to the foe; each tick a heal flies to an ally.
  bus.on('review_vine', (ev) => {
    const segs = [];
    for (let i = 0; i < 26; i++) {
      // kit v1.4 R23: a vine of green stem with pale thorns (mesh, so it reads as a plant, not light)
      const thorn = i % 3 === 0;
      const s = thorn ? new Mesh(vineThornGeo, mat('#D8C9A0', 1, { transparent: true })) : new Mesh(vineStemGeo, mat(i % 2 ? '#4F8F45' : LEAF, 1, { transparent: true }));
      s.userData.thorn = thorn;
      root.add(s);
      segs.push(s);
    }
    kitObjs.set(ev.id, { kind: 'vine', segs, target: ev.target, t: 0, pulse: 0 });
  });
  bus.on('review_vine_tick', (ev) => {
    const o = kitObjs.get(ev.id);
    if (o) o.pulse = 1;
    const foe = byId(ev.target);
    if (foe) burst(foe.x, 0.6, foe.z, SAP_HEAD, 4, 0.1);
    const to = ev.healed != null ? byId(ev.healed) : null;
    if (foe && to) rootLine(foe.x, foe.z, to, 0.55); // kit v1.4 R23: the heal runs along a root line on the floor
  });
  bus.on('review_vine_end', (ev) => {
    const o = kitObjs.get(ev.id);
    if (o) o.fade = 0;
  });
  // S19 Glade Wisps (Kesh 11-16): small pale lights circling her; each flies to a hurt ally and
  // heals on touch. Positions come from the sim (review build only); the relic's wisp circles an ally.
  const gw = new Map(); // id -> { core, glow, tail, hist, t, fade }
  bus.on('review_gw_spawn', (ev) => {
    const glow = sprite(PALETTE.brightHeal);
    const core = sprite('#E2FFD6');
    const tail = [0, 1, 2].map(() => sprite(PALETTE.brightHeal));
    for (const x of [glow, core, ...tail]) root.add(x);
    const trail = dreamTrail(root, PALETTE.brightHeal, 0, 0.06, 0.85, false, 1.6), trailHi = dreamTrail(root, '#B8FFB0', 0, 0.022, 0.9, false, 1.6); // round 2: Wispfall's comet tail, in heal green
    gw.set(ev.id, { core, glow, tail, trail, trailHi, hist: [], t: 0, fade: null, fly: false });
    const p = p0();
    burst(p.x, 0.8, p.z, PALETTE.brightHeal, 4, 0.08);
  });
  bus.on('review_gw_fly', (ev) => { const o = gw.get(ev.id); if (o) o.fly = true; });
  bus.on('review_gw_heal', (ev) => {
    const e = byId(ev.target);
    if (e) burst(e.x, 0.7, e.z, PALETTE.brightHeal, 6, 0.12);
  });
  bus.on('review_gw_end', (ev) => { const o = gw.get(ev.id); if (o) o.fade = 0; });
  function gwUpdate(dt) {
    const live = new Map((globalThis.__reviewGladeWisps || []).map((w) => [w.id, w]));
    for (const [id, o] of gw) {
      o.t += dt;
      if (o.fade != null) o.fade += dt;
      const w = live.get(id);
      if (w) {
        const y = w.state === 'wait' ? 0.85 + Math.sin(o.t * 4 + id) * 0.06 : 0.75;
        o.core.position.set(w.x, y, w.z);
      }
      o.glow.position.copy(o.core.position);
      o.hist.unshift(o.core.position.clone());
      o.hist.length = Math.min(o.hist.length, 10);
      const out = o.fade != null ? Math.max(0, 1 - o.fade / 0.25) : 1;
      const grow = Math.min(1, o.t * 4);
      o.core.scale.setScalar(0.13 * grow);
      o.core.material.opacity = 0.95 * out;
      o.glow.scale.setScalar(0.34 * grow);
      o.glow.material.opacity = 0.55 * out;
      o.tail.forEach((s) => { s.material.opacity = 0; }); // round 2: the ribbon tail replaces the three dots
      { const pts = o.hist.slice().reverse(); o.trail.set(pts); o.trailHi.set(pts); o.trail.m.material.opacity = 0.85 * out; o.trailHi.m.material.opacity = 0.9 * out; }
      if (o.fade != null && o.fade > 0.25) {
        for (const x of [o.core, o.glow, ...o.tail]) { root.remove(x); x.material.dispose(); }
        o.trail.dispose(); o.trailHi.dispose();
        gw.delete(id);
      }
    }
  }
  // S12 Dew Wave (Kesh 11-16): a lane of dew along her aim; a bright band rolls down it.
  const lanes = [];
  bus.on('review_rect', (ev) => {
    const ang = Math.atan2(ev.dx, ev.dz);
    const g = new Group();
    g.position.set(ev.x, 0.03, ev.z);
    g.rotation.y = ang;
    const mk = (w, l, color, op) => {
      const m = new Mesh(new PlaneGeometry(w, l), new MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      g.add(m);
      return m;
    };
    const bed = mk(ev.width, ev.len, PALETTE.brightHeal, 0.0);
    bed.position.z = ev.len / 2;
    const edgeL = mk(0.05, ev.len, PALETTE.brightHeal, 0.0);
    edgeL.position.set(-ev.width / 2, 0.005, ev.len / 2);
    const edgeR = mk(0.05, ev.len, PALETTE.brightHeal, 0.0);
    edgeR.position.set(ev.width / 2, 0.005, ev.len / 2);
    const band = mk(ev.width, 0.35, '#E2FFD6', 0.0);
    band.position.y = 0.01;
    root.add(g);
    lanes.push({ g, bed, edgeL, edgeR, band, len: ev.len, width: ev.width, t: 0, x: ev.x, z: ev.z, dx: ev.dx, dz: ev.dz, dropped: 0 });
  });
  function laneUpdate(dt) {
    for (let i = lanes.length - 1; i >= 0; i--) {
      const o = lanes[i];
      o.t += dt;
      const roll = Math.min(1, o.t / 0.32);
      const out = o.t < 0.32 ? 1 : Math.max(0, 1 - (o.t - 0.32) / 0.4);
      o.bed.material.opacity = 0; o.edgeL.material.opacity = o.edgeR.material.opacity = 0; // dream loop: reviewMossFx.js draws the lane
      o.band.position.z = roll * o.len;
      o.band.material.opacity = 0; // dream loop: gold front in reviewMossFx.js
      while (o.dropped < Math.floor(roll * 6)) {
        o.dropped += 1;
        const d = (o.dropped / 6) * o.len;
        burst(o.x + o.dx * d, 0.15, o.z + o.dz * d, PALETTE.brightHeal, 3, 0.07);
      }
      if (o.t > 0.75) {
        root.remove(o.g);
        o.g.traverse((m) => { if (m.material) { m.material.dispose(); m.geometry.dispose(); } });
        lanes.splice(i, 1);
      }
    }
  }
  // ---- Kit v1.3 (Kesh 11-16 16:02): Spitters, Heartbloom, Pollen Gust, Firefly Swarm, Rootspear,
  // Wispfall, Rootsnare, Puffcap. Heals Bright Heal; her damage the darker green; Wispfall white-gold.
  const DMG = SAP_HEAD;
  const DMG_DEEP = SAP_GREEN;
  const WHITE_GOLD = '#FFF1C4';
  // kit v1.4 looks
  const WOOD = '#6B4A2B';
  const WOOD_D = '#563820';
  const LEAF = '#5FA35A';
  const LEAF_LIGHT = '#8CC46E';
  const FLOWER = '#F4F1E4';
  const BLOSSOM = '#F6D6E2';
  const POLLEN = '#F2DC6B';
  const WATER = '#BDEBFF';
  const leafGeo4 = new ConeGeometry(0.05, 0.16, 4);
  leafGeo4.scale(1, 1, 0.3);
  const petalGeo = new SphereGeometry(0.04, 5, 3);
  petalGeo.scale(1, 0.25, 1.6);
  const bladeGeo = new ConeGeometry(0.025, 0.18, 3);
  const vineStemGeo = new SphereGeometry(0.07, 6, 4);
  vineStemGeo.scale(0.8, 1.9, 0.8);
  const vineThornGeo = new ConeGeometry(0.035, 0.14, 4);
  const k3 = new Map();
  const mat = (color, op = 1, extra = {}) => new MeshStandardMaterial({ color, roughness: 0.7, transparent: op < 1, opacity: op, flatShading: true, ...extra });
  const flat = (geo, color, op) => {
    const m = new Mesh(geo, new MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    return m;
  };
  // ---- dream loop round 2 (Kesh 19 Nov): the stand-ins restyled with the four passed looks (look only, nothing added)
  const texMat = (map, color, op, add) => new MeshBasicMaterial({ map, color, transparent: true, opacity: op, depthWrite: false, side: DoubleSide, blending: add ? AdditiveBlending : undefined });
  const meadowMats = new Map();
  const meadowMat = (c) => { if (!meadowMats.has(c)) meadowMats.set(c, new MeshStandardMaterial({ color: c, vertexColors: true, roughness: 0.85, side: DoubleSide, emissive: '#2E6A24', emissiveIntensity: 0.1 })); return meadowMats.get(c); };
  const mossy = (m, color = '#7F9A45', tex = DT.mossRoundTex()) => { m.material.map = tex; m.material.color.set(color); m.material.needsUpdate = true; return m; }; // a flat disc gets Rootspear's moss bed
  const rimRing = (r, color = '#D8FF9A') => rimGlow(r, color, 0);
  const RIM_HEAL = '#D8FF9A', RIM_DMG = DMG; // round 2 fix: floor rings stay her green (lantern gold on the floor read as Ember)
  const BARK = ['#6A4528', '#5A3A22'];
  const dressSpike = (sp, i, k = 1) => { // Rootspear's root spears: warm bark, a moss tuft at the foot, a leaf on every third
    sp.material.color.set(BARK[i % 2]);
    const tf = new Mesh(new ConeGeometry(0.15 * k, 0.08 * k, 6), mat('#4F6B2A')); tf.position.y = -sp.geometry.parameters.height / 2 + 0.03; sp.add(tf);
    if (i % 3 === 0) { const lf = new Mesh(leafGeo4, mat(LEAF)); lf.scale.setScalar(1.6 * k); lf.position.set(0.08 * k, 0.05, 0); lf.rotation.z = -0.9; sp.add(lf); }
    return sp;
  };
  const rootFlat = (w, len, op = 0) => texMat(DT.rootStripTex(), '#FFFFFF', op, false); // Rootspear's roots on the floor
  const sparks = (x, y, z, n = 6) => { burst(x, y, z, DT.LANTERN, Math.ceil(n * 0.6), 0.1); burst(x, y + 0.1, z, DT.ARCANE, Math.floor(n * 0.4), 0.07); }; // her damage: lantern gold with an arcane purple sparkle
  const ringPart = (x, z, r, color, life = 0.45, grow = 0.5, op = 0.8) => {
    const ring = rimRing(r, color); ring.material.opacity = op; // round 2: Dew Wave's glowing rim
    ring.position.set(x, 0.05, z);
    root.add(ring);
    parts.push({ s: ring, kind: 'ring', t: 0, life, grow });
  };
  const dropK3 = (id) => {
    const o = k3.get(id);
    if (!o) return;
    root.remove(o.g);
    o.g.traverse((m) => { if (m.material) m.material.dispose(); if (m.geometry && m.geometry !== trunkGeo && m.geometry !== leafGeo) m.geometry.dispose(); });
    k3.delete(id);
  };
  // S43 Spitter: a small plant that spits thorns.
  bus.on('review_spit', (ev) => {
    const g = new Group();
    const stem = new Mesh(new CylinderGeometry(0.035, 0.06, 0.34, 6), mat('#4E7A34'));
    stem.position.y = 0.17;
    const head = new Mesh(new IcosahedronGeometry(0.13, 0), mat(DMG, 1, { emissive: DMG_DEEP, emissiveIntensity: 0.3 }));
    head.position.y = 0.4;
    const mouth = new Mesh(new ConeGeometry(0.07, 0.12, 6), mat('#2E5A24'));
    mouth.rotation.x = Math.PI / 2;
    mouth.position.set(0, 0.4, 0.12);
    const leafA = new Mesh(leafGeo, mat('#5FA35A'));
    leafA.scale.set(0.6, 0.6, 0.6); leafA.position.set(0.1, 0.08, 0); leafA.rotation.z = -1.1;
    const leafB = leafA.clone(); leafB.position.x = -0.1; leafB.rotation.z = 1.1;
    let top = head, model = false;
    const sm = makeSpitter();
    if (sm) { top = new Group(); sm.scale.setScalar(0.5 / 1.6); top.add(sm); g.add(top); model = true; } // Kesh's model, 0.5 u
    else g.add(stem, head, mouth, leafA, leafB);
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    k3.set(ev.id, { kind: 'spit', g, head: top, model, t: 0, kick: 0 });
    burst(ev.x, 0.2, ev.z, DMG, 6, 0.1);
  });
  bus.on('review_spit_shot', (ev) => {
    const o = k3.get(ev.id);
    const e = byId(ev.target);
    if (o && e) o.g.rotation.y = Math.atan2(e.x - o.g.position.x, e.z - o.g.position.z);
    if (o) o.kick = 1;
    const s = sprite(DT.LANTERN); // round 2: her damage in lantern gold
    s.scale.setScalar(0.2);
    root.add(s);
    parts.push({ s, target: ev.target, from: new Vector3(ev.x, o && o.model ? 0.4 : 0.65, ev.z), t: 0, life: 0.25, kind: 'pour', arc: 0.05 });
  });
  bus.on('review_spit_end', (ev) => { const o = k3.get(ev.id); if (o) o.fade = 0; });
  // S13 Heartbloom: a bud above the ally that grows, then opens and sends wisps.
  bus.on('review_heart_bud', (ev) => {
    const g = new Group();
    const petals = [];
    for (let i = 0; i < 5; i++) {
      const pv = new Group();
      const leaf = new Mesh(new ConeGeometry(0.07, 0.22, 5), mat(PALETTE.brightHeal, 1, { emissive: '#2E8B45', emissiveIntensity: 0.4 })); // round 2: kept green (the white daisy lost the blind judge)
      leaf.position.y = 0.11;
      pv.add(leaf);
      pv.rotation.y = (i / 5) * Math.PI * 2;
      pv.rotation.x = 0.25;
      g.add(pv);
      petals.push(pv);
    }
    const core = sprite('#E2FFD6');
    core.scale.setScalar(0.18);
    core.position.y = 0.06;
    g.add(core);
    root.add(g);
    k3.set(ev.id, { kind: 'bud', g, petals, core, target: ev.target, t: 0, life: ev.secs, open: null });
  });
  bus.on('review_heart_bloom', (ev) => {
    const o = k3.get(ev.id);
    const from = o ? o.g.position.clone() : null;
    if (o) o.open = 0;
    const e = byId(ev.target);
    if (e) { burst(e.x, 1.2, e.z, PALETTE.brightHeal, 10, 0.12); ringPart(e.x, e.z, 0.6, PALETTE.brightHeal, 0.5, 3.5, 0.6); }
    for (const id of ev.to || []) {
      for (let i = 0; i < 3; i++) {
        const s = sprite(i ? PALETTE.brightHeal : '#E2FFD6');
        s.scale.setScalar(i ? 0.12 : 0.17);
        root.add(s);
        parts.push({ s, target: id, from: from ? from.clone() : null, t: -i * 0.04, life: 0.38, kind: 'pour', arc: 0.6 });
      }
    }
  });
  bus.on('review_heart_end', (ev) => dropK3(ev.id));
  // S14 Pollen Gust: a pale wall of wind and pollen rolling out along her aim.
  bus.on('review_gust', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    g.rotation.y = Math.atan2(ev.dx, ev.dz);
    const band = flat(new PlaneGeometry(ev.width, 0.5), '#D8F5B0', 0.0);
    band.position.y = 0.06;
    g.add(band);
    const edge = flat(new PlaneGeometry(ev.width, 0.06), '#F4FFE0', 0.0);
    edge.position.y = 0.07;
    g.add(edge);
    const motes = [];
    for (let i = 0; i < 20; i++) {
      const m = sprite(i % 3 === 0 ? POLLEN : i % 3 === 1 ? BLOSSOM : '#E9F7B8'); // kit v1.4 R14: pollen and petals
      m.scale.setScalar(0.15 + (i % 4) * 0.03);
      m.userData = { x: (i / 19 - 0.5) * ev.width, y: 0.25 + (i % 5) * 0.14, ph: i * 1.7, dz: ((i * 7) % 5) / 4 - 0.6 };
      g.add(m);
      motes.push(m);
    }
    for (let i = 0; i < 12; i++) {
      const lf = new Mesh(leafGeo4, mat(i % 2 ? LEAF_LIGHT : '#7CBF5E', 1, { transparent: true }));
      lf.scale.setScalar(3.4);
      lf.userData = { x: ((i + 0.5) / 12 - 0.5) * ev.width, y: 0.35 + (i % 4) * 0.18, ph: i * 2.3, leaf: true, dz: ((i * 3) % 4) / 3 * -0.7 };
      g.add(lf);
      motes.push(lf);
    }
    root.add(g);
    k3.set(ev.id, { kind: 'gust', g, band, edge, motes, t: 0, len: ev.len, speed: ev.speed });
  });
  bus.on('review_gust_push', (ev) => { const e = byId(ev.target); if (e) burst(e.x, 0.5, e.z, '#E9F7B8', 5, 0.09); });
  bus.on('review_gust_end', (ev) => { const o = k3.get(ev.id); if (o) o.fade = 0; });
  // S16 Firefly Swarm: a cloud of tiny lights; positions come from the sim.
  bus.on('review_swarm', (ev) => {
    const g = new Group();
    const flies = [];
    for (let i = 0; i < 9; i++) {
      const f = sprite(i % 3 ? DT.GOLD : PALETTE.brightHeal); f.material.map = DT.glowTex(); // round 2: Dew Wave's gold motes
      f.scale.setScalar(0.07 + (i % 3) * 0.02);
      f.userData = { a: i * 0.7, r: 0.18 + (i % 4) * 0.07, y: 0.55 + (i % 3) * 0.18, sp: 3 + (i % 5) };
      g.add(f);
      flies.push(f);
    }
    const p = p0();
    g.position.set(p.x, 0, p.z);
    root.add(g);
    k3.set(ev.id, { kind: 'swarm', g, flies, t: 0, foe: false, id: ev.id });
  });
  bus.on('review_swarm_stay', (ev) => {
    const o = k3.get(ev.id);
    if (o) o.foe = ev.foe;
    const e = byId(ev.target);
    if (e) { if (ev.foe) sparks(e.x, 0.7, e.z, 5); else burst(e.x, 0.7, e.z, PALETTE.brightHeal, 5, 0.08); }
  });
  bus.on('review_swarm_hop', (ev) => { const o = k3.get(ev.id); if (o) o.foe = ev.foe; });
  bus.on('review_swarm_end', (ev) => { const o = k3.get(ev.id); if (o) o.fade = 0; });
  // S21 Rootspear: the row shows dark green for 0.4 s, then root spears burst up along it.
  bus.on('review_spear_warn', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    g.rotation.y = Math.atan2(ev.dx, ev.dz);
    const bed = flat(new PlaneGeometry(ev.width, ev.len), DMG_DEEP, 0.0);
    bed.position.set(0, 0.04, ev.len / 2);
    const fill = flat(new PlaneGeometry(ev.width, 1), DMG, 0.0);
    fill.position.set(0, 0.045, 0);
    g.add(bed, fill);
    const spikes = [];
    const n = Math.round(ev.len / 0.42);
    for (let i = 0; i < n; i++) {
      const sp = new Mesh(new ConeGeometry(0.11 + (i % 3) * 0.03, 0.6 + (i % 4) * 0.12, 5), mat(i % 2 ? '#6A4528' : '#5A3A22')); // kit v1.4 R20: wooden roots with bark (dream loop: warmer)
      { const tf = new Mesh(new ConeGeometry(0.15, 0.08, 6), mat('#4F6B2A')); tf.position.y = -0.24; sp.add(tf); } // a moss tuft at its foot
      if (i % 3 === 0) { const lf = new Mesh(leafGeo4, mat(LEAF)); lf.scale.setScalar(1.6); lf.position.set(0.08, 0.05, 0); lf.rotation.z = -0.9; sp.add(lf); }
      sp.position.set(((i * 37) % 7) / 7 * ev.width * 0.7 - ev.width * 0.35, -0.5, 0.35 + (i / n) * (ev.len - 0.35));
      sp.rotation.set((((i * 13) % 5) - 2) * 0.08, 0, (((i * 7) % 5) - 2) * 0.1);
      sp.visible = false;
      g.add(sp);
      spikes.push(sp);
    }
    root.add(g);
    k3.set(ev.id, { kind: 'spear', g, bed, fill, spikes, t: 0, warn: ev.secs, len: ev.len, burst: null });
  });
  bus.on('review_spear', (ev) => {
    const o = k3.get(ev.id);
    if (o) o.burst = 0;
    for (let i = 0; i <= 6; i++) {
      const d = (i / 6) * ev.len;
      burst(ev.x + ev.dx * d, 0.1, ev.z + ev.dz * d, '#8A7A50', 3, 0.08);
    }
  });
  // S22 Wispfall: a faint ring round her; white-gold wisps dive on foes.
  bus.on('review_fall', (ev) => {
    const g = new Group();
    const ring = flat(new RingGeometry(ev.r - 0.04, ev.r, 64), WHITE_GOLD, 0.0);
    ring.position.y = 0.04;
    g.add(ring);
    root.add(g);
    k3.set(ev.id, { kind: 'fall', g, ring, t: 0 });
  });
  bus.on('review_fall_end', (ev) => { const o = k3.get(ev.id); if (o) o.fade = 0; });
  bus.on('review_fall_dive', (ev) => {
    if (!ev.nectar) return; // dream loop: reviewMossFx.js draws Wispfall's comets
    const head = sprite(WHITE_GOLD);
    head.scale.setScalar(0.42);
    root.add(head);
    const tail = [0, 1, 2].map(() => { const t = sprite(WHITE_GOLD); t.scale.setScalar(0.24); root.add(t); return t; });
    parts.push({ s: head, kind: 'dive', t: 0, life: ev.secs, x: ev.x, z: ev.z, tail });
  });
  bus.on('review_fall_land', (ev) => {
    // dream loop: reviewMossFx.js draws the landing
  });
  // S23 Rootsnare: a ring of roots that drags foes in, then clenches.
  bus.on('review_snare', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const disc = mossy(flat(new RingGeometry(0.01, ev.r, 64), DMG_DEEP, 0.0)); // round 2: Rootspear's moss bed
    disc.position.y = 0.03;
    const edge = rimRing(ev.r, RIM_DMG); // round 2: the glowing rim (Dew Wave look), in her green
    edge.position.y = 0.035;
    g.add(disc, edge);
    const roots = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rt = dressSpike(new Mesh(new ConeGeometry(0.07, 0.75, 5), mat(i % 2 ? '#5C7A38' : '#6E5A34')), i, 0.7); // round 2: Rootspear's root spears
      const pv = new Group();
      pv.position.set(Math.cos(a) * ev.r * 0.95, 0, Math.sin(a) * ev.r * 0.95);
      pv.rotation.y = -a + Math.PI / 2;
      rt.position.y = 0.3;
      pv.add(rt);
      pv.scale.setScalar(0.01);
      g.add(pv);
      roots.push(pv);
    }
    root.add(g);
    k3.set(ev.id, { kind: 'snare', g, disc, edge, roots, t: 0, clench: null, r: ev.r });
  });
  bus.on('review_snare_clench', (ev) => {
    const o = k3.get(ev.id);
    if (!o) return;
    o.clench = 0;
    sparks(o.g.position.x, 0.2, o.g.position.z, 10); // round 2: Rootspear's gold and purple sparks
  });
  // S24 Puffcap: a mushroom; its burst is a spore cloud in her damage green.
  bus.on('review_puff', (ev) => {
    const g = new Group();
    const stem = new Mesh(new CylinderGeometry(0.06, 0.08, 0.22, 7), mat('#E6DCC0'));
    stem.position.y = 0.11;
    const cap = new Mesh(new SphereGeometry(0.2, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#5E8A3E', 1, { emissive: DMG_DEEP, emissiveIntensity: 0.25 }));
    cap.position.y = 0.2;
    const dots = [0, 1, 2, 3].map((i) => { const d = new Mesh(new SphereGeometry(0.035, 5, 4), mat('#E9F2C8')); const a = i * 1.6; d.position.set(Math.cos(a) * 0.12, 0.33, Math.sin(a) * 0.12); return d; });
    const pm = makePuffcap();
    if (pm) g.add(pm); // Kesh's model, 0.4 u
    else g.add(stem, cap, ...dots);
    const fy = ev.seed ? 0 : 0.7; // kit 1.7 U4 a: from a seed it springs up where the seed lay
    g.position.set(ev.fromX, fy, ev.fromZ);
    root.add(g);
    k3.set(ev.id, { kind: 'puff', g, t: 0, from: new Vector3(ev.fromX, fy, ev.fromZ), to: new Vector3(ev.x, 0, ev.z) });
    if (ev.seed) burst(ev.x, 0.15, ev.z, '#E9F2C8', 5, 0.09);
  });
  bus.on('review_puff_end', (ev) => dropK3(ev.id));
  bus.on('review_puff_burst', (ev) => {
    { const p = k3.get(ev.id); if (p && p.kind === 'puff') p.pop = 0; else dropK3(ev.id); } // it swells, then bursts
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const edge = flat(new RingGeometry(ev.r - 0.06, ev.r, 64), DMG, 0.0);
    edge.position.y = 0.04;
    const disc = flat(new RingGeometry(0.01, ev.r, 64), DMG_DEEP, 0.0);
    disc.position.y = 0.035;
    g.add(edge, disc);
    const puffs = [];
    for (let i = 0; i < 16; i++) {
      const pu = sprite(i % 2 ? DMG : '#A8D48A', false);
      const a = i * 2.39, rr = Math.sqrt((i + 0.5) / 16) * ev.r * 0.85;
      pu.userData = { x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: 0.25 + (i % 4) * 0.12, s: 0.5 + (i % 3) * 0.18, ph: i };
      g.add(pu);
      puffs.push(pu);
    }
    root.add(g);
    k3.set('c' + ev.id, { kind: 'cloud', g, edge, disc, puffs, t: 0, life: ev.secs });
    burst(ev.x, 0.3, ev.z, DMG, 10, 0.14);
  });
  bus.on('review_cloud_end', (ev) => { const o = k3.get('c' + ev.id); if (o) o.fade = 0; });

  // ---- Kit v1.4 (Kesh 11-16 17:29, MOSSLIGHT_DRUID_REVIEW.md): plants, wood, roots. Heals stay
  // Bright Heal; leaves her greens; wood a warm red-brown, well off the Thornling's bramble
  // (#3F4A2E) and the Thorned power's bark (#A27A4A); flowers small and pale.
  const anims = []; // { t, life, step(u, a, dt), objs[] }
  const anim = (life, step, objs = []) => { for (const o of objs) root.add(o); const a = { t: 0, life, step, objs }; anims.push(a); return a; };
  const leafMeshOld = (color = LEAF, k = 1) => { const m = new Mesh(leafGeo4, mat(color, 1, { transparent: true })); m.scale.setScalar(k); return m; }; // R9's sprig (old Swiftleaf) keeps it
  // round 2: every other leaf is Swiftleaf's passed leaf (deep green to lime, a yellow tip, a dark vein), same size and motion
  const leafPlane = new PlaneGeometry(0.17, 0.1); leafPlane.rotateZ(Math.PI / 2);
  const leafMesh = (color = LEAF, k = 1) => { const m = new Mesh(leafPlane, mat(color === LEAF_LIGHT || color === '#7CBF5E' ? '#FFFFFF' : '#CFE3C4', 1, { transparent: true, map: DT.leaf2Tex(), alphaTest: 0.5, side: DoubleSide, flatShading: false })); m.scale.setScalar(k); return m; };
  function rootLine(fx, fz, to, life) {
    const len = Math.hypot(to.x - fx, to.z - fz);
    if (len < 0.05) return;
    const line = flat(new PlaneGeometry(0.08, len), WOOD, 0.0);
    line.position.set((fx + to.x) / 2, 0.035, (fz + to.z) / 2);
    line.rotation.z = -Math.atan2(to.z - fz, to.x - fx) + Math.PI / 2;
    const mote = sprite(PALETTE.brightHeal);
    mote.scale.setScalar(0.22);
    let done = false;
    anim(life, (u) => {
      line.material.opacity = 0.9 * Math.min(1, u * 6) * (1 - Math.max(0, (u - 0.6) / 0.4));
      const k = Math.min(1, u / 0.7);
      mote.position.set(fx + (to.x - fx) * k, 0.14, fz + (to.z - fz) * k);
      mote.material.opacity = k < 1 ? 0.95 : 0;
      if (k >= 1 && !done) { done = true; burst(to.x, 0.5, to.z, PALETTE.brightHeal, 4, 0.1); }
    }, [line, mote]);
  }
  function flower(x, y, z, life = 0.7, k = 1) {
    const g = new Group();
    const fl = new Mesh(new PlaneGeometry(0.2, 0.2), texMat(DT.flowerTex(), '#EDE8D2', 1, false)); // round 2: Dew Wave's and Rootspear's white daisy
    fl.rotation.set(-Math.PI / 2, 0, Math.random() * 6); fl.material.alphaTest = 0.4;
    g.add(fl);
    g.position.set(x, y, z);
    g.scale.setScalar(0.001);
    return anim(life, (u) => {
      g.scale.setScalar(k * Math.min(1, u * 5) * (1 - Math.max(0, (u - 0.75) / 0.25)) + 0.001);
    }, [g]);
  }
  function tuft(x, z, life, delay) {
    const g = new Group();
    for (let i = 0; i < 3; i++) {
      const b = new Mesh(bladeGeo, mat(i % 2 ? LEAF : '#6FAE52', 1, { transparent: true }));
      b.position.set((i - 1) * 0.05, 0.08, ((i * 7) % 3 - 1) * 0.03);
      b.rotation.z = (i - 1) * 0.35;
      g.add(b);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(0.001);
    return anim(life + delay, (u, a) => {
      const t = a.t - delay;
      g.scale.setScalar(t < 0 ? 0.001 : 2.6 * Math.min(1, t * 6) * (1 - Math.max(0, (a.t - (life + delay - 0.4)) / 0.4)) + 0.001);
    }, [g]);
  }
  // R9 Swiftleaf: a spinning leaf with a trail of small leaves; a sprig opens on the ally's shoulder.
  bus.on('skill_cast', (ev) => {
    if (ev.classId || ev.skill !== 'swift_mend') return;
    const p = p0();
    if (!p) return;
    for (const id of ev.targets ?? []) {
      const e = byId(id);
      if (!e) continue;
      const from = new Vector3(p.x, 0.9, p.z);
      const lead = leafMeshOld(LEAF_LIGHT, 4.0);
      const trail = [0, 1, 2, 3].map((i) => leafMeshOld(i % 2 ? LEAF : LEAF_LIGHT, 2.4 - i * 0.35));
      let done = false;
      anim(0.5, (u) => {
        const to = new Vector3(e.x, 0.8, e.z);
        [lead, ...trail].forEach((m, i) => {
          const k = Math.max(0, Math.min(1, (u - i * 0.08) / 0.76));
          m.position.lerpVectors(from, to, k);
          m.position.y += Math.sin(Math.PI * k) * 0.35;
          m.rotation.set(u * 11 + i, u * 8, 0.6);
          m.material.opacity = k >= 1 ? 0 : 1;
        });
        if (u >= 0.76 && !done) {
          done = true;
          const sprig = new Group();
          for (let i = 0; i < 4; i++) { const l = leafMeshOld(i % 2 ? LEAF : LEAF_LIGHT, 2.8); l.rotation.set(0.5, (i / 4) * 6.28, 0.9); l.position.set(Math.cos(i * 1.57) * 0.11, 0.05, Math.sin(i * 1.57) * 0.07); sprig.add(l); }
          sprig.scale.setScalar(0.001);
          anim(1.0, (v) => { sprig.position.set(e.x + 0.2, 1.0, e.z); sprig.scale.setScalar(Math.min(1, v * 6) * (1 - Math.max(0, (v - 0.7) / 0.3)) + 0.001); sprig.rotation.y = v * 2; }, [sprig]);
        }
      }, [lead, ...trail]);
    }
  });
  // R19 Seed Bolt: the bolt is a seed pod with two leaf wings; it bursts into petals on the ally.
  const pods = new Map();
  function podUpdate(dt) {
    const live = new Set();
    for (const e of world.entities()) {
      if (e.kind !== 'skillbolt' || e.skill !== 'mending_bolt') continue;
      live.add(e.id);
      let o = pods.get(e.id);
      if (!o) {
        const g = new Group();
        const pod = new Mesh(new SphereGeometry(0.11, 8, 6), mat('#8FD08A', 1, { emissive: '#3E9A4E', emissiveIntensity: 0.5 }));
        pod.scale.set(0.8, 0.8, 1.35);
        const wl = leafMesh(LEAF_LIGHT, 2.2), wr = leafMesh(LEAF_LIGHT, 2.2);
        wl.position.set(-0.12, 0.03, 0); wr.position.set(0.12, 0.03, 0);
        g.add(pod, wl, wr);
        root.add(g);
        o = { g, wl, wr, t: 0 };
        pods.set(e.id, o);
      }
      o.t += dt;
      o.g.position.set(e.x, 0.6, e.z);
      o.g.rotation.y = Math.atan2(e.vx || 0, e.vz || 1);
      const f = Math.sin(o.t * 30) * 0.6;
      o.wl.rotation.set(0, 0, 1.3 + f);
      o.wr.rotation.set(0, 0, -1.3 - f);
    }
    for (const [id, o] of pods) if (!live.has(id)) { root.remove(o.g); o.g.traverse((m) => m.material && m.material.dispose()); pods.delete(id); }
  }
  bus.on('skill_bolt_despawn', (ev) => {
    if (ev.skill !== 'mending_bolt' || ev.cause !== 'impact') return;
    for (let i = 0; i < 9; i++) {
      const s = sprite(i % 3 === 2 ? FLOWER : BLOSSOM);
      s.scale.setScalar(0.14);
      root.add(s);
      const a = (i / 9) * Math.PI * 2;
      parts.push({ s, kind: 'fly', from: new Vector3(ev.x, 0.6, ev.z), vel: new Vector3(Math.cos(a) * 1.1, 1.0, Math.sin(a) * 1.1), t: 0, life: 0.55 });
    }
  });
  // R10 Dew Wave: grass springs up along the lane behind the wave, gone after 2 s (no flowers: Kesh, 16 Nov).
  bus.on('review_rect', (ev) => {
    const n = Math.round(ev.len / 0.2);
    for (let i = 0; i < n; i++) {
      const d = ((i + 0.5) / n) * ev.len;
      const side = ((i * 37) % 9) / 9 - 0.5;
      const x = ev.x + ev.dx * d - ev.dz * side * ev.width * 0.85;
      const z = ev.z + ev.dz * d + ev.dx * side * ev.width * 0.85;
      const delay = (d / ev.len) * 0.32;
      if (globalThis.__reviewMossFx) continue; // dream loop: reviewMossFx.js grows a meadow in the lane (Kesh 19 Nov)
      tuft(x, z, 2.0, delay);
    }
  });
  // R12 Dewfall: a flower bed while the dew falls, with a ring of tiny mushrooms at its edge.
  const beds = new Map();
  bus.on('zone_spawn', (ev) => {
    if (ev.skill !== 'dewfall' || ev.classId) return;
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const r = ev.radius;
    const items = [];
    for (let i = 0; i < 30; i++) {
      const a = i * 2.39996, rr = Math.sqrt((i + 0.5) / 30) * r * 0.88;
      const t = new Group();
      for (let k = 0; k < 4; k++) { const b = new Mesh(DT.meadowBladeGeo(), meadowMat(DT.MEADOW[(i * 3 + k) % DT.MEADOW.length])); b.scale.set(1, 0.13 + ((i + k) % 3) * 0.03, 1); b.rotation.set(0.15 + (k % 2) * 0.2, k * 1.7 + i, 0, 'YXZ'); b.position.set(((k * 37) % 5 - 2) * 0.025, 0, ((k * 13) % 5 - 2) * 0.025); t.add(b); } // round 2: Dew Wave's meadow grass
      if (i % 3 === 0) { const c = new Mesh(new PlaneGeometry(0.17, 0.17), texMat(DT.flowerTex(), i % 2 ? '#F4F0E2' : '#F2C2CF', 1, false)); c.material.alphaTest = 0.4; c.rotation.set(-Math.PI / 2, 0, i); c.position.y = 0.2; t.add(c); } // round 2: its wild flowers
      t.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      t.userData.at = (i / 30) * 1.6;
      g.add(t);
      items.push(t);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const m = new Group();
      const st = new Mesh(new CylinderGeometry(0.025, 0.03, 0.09, 5), mat('#E6DCC0'));
      st.position.y = 0.045;
      const cp = new Mesh(new SphereGeometry(0.06, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(i % 2 ? '#C9A27A' : '#E8D2B0'));
      cp.position.y = 0.08;
      m.add(st, cp);
      m.position.set(Math.cos(a) * r * 0.97, 0, Math.sin(a) * r * 0.97);
      m.userData.at = 0.2 + (i / 16) * 0.5;
      g.add(m);
      items.push(m);
    }
    for (const it of items) it.scale.setScalar(0.001);
    root.add(g);
    beds.set(ev.id, { g, items, t: 0, fade: null });
  });
  bus.on('zone_expire', (ev) => { const b = beds.get(ev.id); if (b) b.fade = 0; });
  // R16 Mossgrowth: moss and leaves creep up the ally from the feet; a small white flower each tick.
  const creepers = new Map();
  bus.on('review_hot', (ev) => {
    if (ev.skill !== 'kindred_shield' && ev.skill !== 'creeping_moss') return; // kit 1.8: Creeping Moss grows the same moss
    let c = creepers.get(ev.target);
    if (!c) {
      const g = new Group();
      const leaves = [];
      for (let i = 0; i < 14; i++) {
        const l = leafMesh(i % 3 === 0 ? LEAF_LIGHT : i % 2 ? LEAF : '#4F8F45', 2.7);
        l.userData = { a: i * 1.9, h: (i / 14) * 0.8, r: 0.4 - (i / 14) * 0.1 };
        g.add(l);
        leaves.push(l);
      }
      root.add(g);
      c = { g, leaves, t: 0 };
      creepers.set(ev.target, c);
    }
    c.life = (c.t || 0) + ev.secs;
    c.end = null;
  });
  bus.on('review_hot_tick', (ev) => {
    if (ev.skill !== 'kindred_shield' && ev.skill !== 'creeping_moss') return; // kit 1.8: Creeping Moss grows the same moss
    const e = byId(ev.target);
    if (e) { const a = Math.random() * 6.28; flower(e.x + Math.cos(a) * 0.3, 0.35 + Math.random() * 0.4, e.z + Math.sin(a) * 0.3, 1.1, 3.0); }
  });
  bus.on('review_bloom', (ev) => { const c = creepers.get(ev.target); if (c) c.end = 0; });
  // R14 Pollen Gust: allies it sped up trail petals while the haste lasts. R38: spores ride the wind.
  bus.on('review_gust_ally', (ev) => {
    let next = 0, n = 0;
    anim(ev.secs, (u, a) => {
      if (a.t < next) return;
      next = a.t + 0.08;
      const e = byId(ev.target);
      if (!e) return;
      const s = sprite(n++ % 2 ? BLOSSOM : POLLEN);
      s.scale.setScalar(0.17);
      root.add(s);
      parts.push({ s, kind: 'fly', from: new Vector3(e.x, 0.5, e.z), vel: new Vector3(Math.sin(n * 2.1) * 0.25, 0.3, Math.cos(n * 1.7) * 0.25), t: 0, life: 0.6 });
    });
  });
  bus.on('review_gust_spores', (ev) => {
    const o = k3.get(ev.id);
    if (!o) return;
    for (let i = 0; i < 10; i++) {
      const m = sprite(i % 2 ? DMG : '#A8D48A', false);
      m.scale.setScalar(0.24);
      m.userData = { x: ((i + 0.5) / 10 - 0.5) * 2.6, y: 0.3 + (i % 3) * 0.15, ph: i * 1.3 };
      o.g.add(m);
      o.motes.push(m);
    }
  });
  bus.on('review_spores', (ev) => { const e = byId(ev.target); if (e) burst(e.x, 0.6, e.z, DMG, 6, 0.12); });
  // R36 Water grows: dew drops where a plant or a Moss is watered.
  bus.on('review_water', (ev) => {
    burst(ev.x, 0.45, ev.z, WATER, 6, 0.11);
    ringPart(ev.x, ev.z, 0.38, WATER, 0.45, 0.6, 0.75);
  });
  bus.on('review_puff_grow', (ev) => { const o = k3.get(ev.id); if (o) o.big = 0.01; });
  // R17 the sapling sheds its leaves: they fly off and heal everyone near it.
  bus.on('review_sapling_shed', (ev) => {
    const sap = kitObjs.get(ev.id);
    const y = sap ? 0.5 * sap.sc + 0.2 : 0.8;
    for (let i = 0; i < 14; i++) {
      const l = leafMesh(i % 2 ? LEAF : LEAF_LIGHT, 2.0);
      const a = (i / 14) * Math.PI * 2, sp = 0.8 + (i % 3) * 0.3;
      anim(0.9, (u) => {
        l.position.set(ev.x + Math.cos(a) * sp * u * 1.5, y + 0.4 * Math.sin(Math.PI * u) - u * 0.5, ev.z + Math.sin(a) * sp * u * 1.5);
        l.rotation.set(u * 9 + i, u * 6, 0);
        l.material.opacity = 1 - Math.max(0, (u - 0.6) / 0.4);
      }, [l]);
    }
    for (const id of ev.to ?? []) {
      for (let i = 0; i < 3; i++) {
        const s = sprite(i ? PALETTE.brightHeal : BLOSSOM);
        s.scale.setScalar(0.16);
        root.add(s);
        parts.push({ s, target: id, from: new Vector3(ev.x, y, ev.z), t: -i * 0.05, life: 0.45, kind: 'pour', arc: 0.5 });
      }
    }
  });
  // S50 Elder Oak: a great oak; roots spread under its crown; leaves fly off as wisps at the end.
  bus.on('review_oak', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const shade = mossy(flat(new RingGeometry(0.01, ev.r, 64), '#2E5A2A', 0.0), '#5F7F34'); // round 2: Rootspear's moss under the crown
    shade.position.y = 0.025;
    const edge = rimRing(ev.r, RIM_HEAL); // round 2: Dew Wave's glowing rim
    edge.position.y = 0.03;
    g.add(shade, edge);
    const roots = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      const len = ev.r * (0.75 + (i % 3) * 0.08);
      const rt = flat(new PlaneGeometry(0.22, len), i % 2 ? WOOD : WOOD_D, 0.0); rt.material = rootFlat(); rt.geometry.rotateZ(Math.PI); // round 2: Rootspear's roots (gold line on top), base at the trunk
      rt.position.set((Math.cos(a) * len) / 2, 0.035, (Math.sin(a) * len) / 2);
      rt.rotation.z = -a + Math.PI / 2;
      g.add(rt);
      roots.push(rt);
    }
    const tree = new Group();
    const trunk = new Mesh(new CylinderGeometry(0.2, 0.36, 1.2, 8), mat(WOOD));
    trunk.position.y = 0.6;
    tree.add(trunk);
    for (let i = 0; i < 3; i++) {
      const br = new Mesh(new CylinderGeometry(0.06, 0.11, 0.9, 6), mat(WOOD_D));
      const a = (i / 3) * Math.PI * 2;
      br.position.set(Math.cos(a) * 0.3, 1.1, Math.sin(a) * 0.3);
      br.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8);
      tree.add(br);
    }
    const crown = new Group();
    const crownMat = mat(LEAF, 0.55, { depthWrite: false, emissive: '#2E6B34', emissiveIntensity: 0.25 });
    for (const [x, y, z, k] of [[0, 1.6, 0, 0.75], [0.6, 1.4, 0.2, 0.55], [-0.55, 1.45, 0.25, 0.55], [0.1, 1.45, -0.6, 0.55], [-0.2, 1.35, 0.6, 0.5], [0.5, 1.3, -0.45, 0.45], [-0.55, 1.3, -0.4, 0.45]]) {
      const c = new Mesh(new IcosahedronGeometry(k, 0), crownMat);
      c.position.set(x, y, z);
      crown.add(c);
    }
    for (let i = 0; i < 8; i++) { const a = i * 0.785; const fl = new Mesh(new SphereGeometry(0.07, 5, 4), mat(BLOSSOM)); fl.position.set(Math.cos(a) * 0.65, 1.6 + (i % 2) * 0.15, Math.sin(a) * 0.65); crown.add(fl); }
    tree.add(crown);
    const om = makeOak();
    if (om) { tree.clear(); tree.add(om); } // Kesh's model, about 3 u tall
    tree.scale.setScalar(0.001);
    g.add(tree);
    root.add(g);
    k3.set('oak' + ev.id, { kind: 'oak', g, tree, crown, shade, edge, roots, t: 0, grow: ev.grow || 0.6 });
    burst(ev.x, 0.2, ev.z, WOOD, 10, 0.14);
  });
  bus.on('review_oak_tick', (ev) => {
    const o = k3.get('oak' + ev.id);
    if (!o) return;
    for (const id of ev.to ?? []) {
      const s = sprite(PALETTE.brightHeal);
      s.scale.setScalar(0.17);
      root.add(s);
      parts.push({ s, target: id, from: new Vector3(o.g.position.x, 2.0, o.g.position.z), t: 0, life: 0.5, kind: 'pour', arc: 0.2 });
    }
  });
  bus.on('review_oak_end', (ev) => {
    const o = k3.get('oak' + ev.id);
    if (!o) return;
    o.fade = 0;
    for (const id of ev.to ?? []) {
      const l = leafMesh(LEAF_LIGHT, 2.4);
      const s = sprite(PALETTE.brightHeal);
      s.scale.setScalar(0.32);
      const from = new Vector3(o.g.position.x, 2.2, o.g.position.z);
      let done = false;
      anim(0.4, (u) => {
        const e = byId(id);
        if (!e) return;
        const to = new Vector3(e.x, 0.7, e.z);
        l.position.lerpVectors(from, to, u);
        l.position.y += Math.sin(Math.PI * u) * 0.6;
        s.position.copy(l.position);
        l.rotation.set(u * 10, u * 7, 0);
        s.material.opacity = 0.9 * (u < 1 ? 1 : 0);
        if (u >= 1 && !done) { done = true; burst(e.x, 0.6, e.z, PALETTE.brightHeal, 6, 0.12); }
      }, [l, s]);
    }
  });
  // S51 Oakling: a knee-high tree-folk; it rises from the floor, walks to the ally and slams foes off.
  bus.on('review_ling', (ev) => {
    const g = new Group();
    const body = new Group();
    const torso = new Mesh(new CylinderGeometry(0.15, 0.19, 0.42, 7), mat(WOOD));
    torso.position.y = 0.42;
    const head = new Group();
    const h1 = new Mesh(new IcosahedronGeometry(0.22, 0), mat(LEAF, 1, { emissive: '#2E6B34', emissiveIntensity: 0.2 }));
    const h2 = new Mesh(new IcosahedronGeometry(0.15, 0), mat(LEAF_LIGHT));
    h2.position.set(0.1, 0.1, -0.05);
    const fl = new Mesh(new SphereGeometry(0.05, 5, 4), mat(BLOSSOM));
    fl.position.set(-0.1, 0.16, 0.06);
    head.add(h1, h2, fl);
    head.position.y = 0.75;
    const eyeMat = new MeshBasicMaterial({ color: '#E9FFD8' });
    for (const x of [-0.06, 0.06]) { const ey = new Mesh(new SphereGeometry(0.03, 5, 4), eyeMat); ey.position.set(x, 0.52, 0.16); body.add(ey); }
    const limb = (x, y, len, r) => { const pv = new Group(); pv.position.set(x, y, 0); const m = new Mesh(new CylinderGeometry(r * 0.8, r, len, 5), mat(WOOD_D)); m.position.y = -len / 2; pv.add(m); body.add(pv); return pv; };
    const armL = limb(-0.2, 0.58, 0.32, 0.055), armR = limb(0.2, 0.58, 0.32, 0.055);
    const legL = limb(-0.08, 0.24, 0.24, 0.06), legR = limb(0.08, 0.24, 0.24, 0.06);
    body.add(torso, head);
    body.scale.setScalar(1.25);
    let rig = { body, armL, armR, legL, legR };
    const om = makeOakling();
    if (om) rig = { body: om.g, armL: om.armL, armR: om.armR, legL: om.legL, legR: om.legR, model: true }; // Kesh's model, 0.6 u
    g.add(rig.body);
    g.position.set(ev.x, -0.9, ev.z);
    root.add(g);
    k3.set('ling' + ev.id, { kind: 'ling', g, ...rig, t: 0, slam: null, id: ev.id, walk: 0 });
    burst(ev.x, 0.1, ev.z, WOOD, 8, 0.12);
    if (ev.seed) burst(ev.x, 0.2, ev.z, LEAF_LIGHT, 6, 0.1); // grown from a seed
  });
  bus.on('review_ling_slam', (ev) => {
    const o = k3.get('ling' + ev.id);
    if (o) o.slam = 0;
    burst(ev.x, 0.25, ev.z, WOOD, 6, 0.12);
    sparks(ev.x, 0.4, ev.z, 5); // round 2: her damage in lantern gold with arcane
    ringPart(ev.x, ev.z, 0.7, RIM_DMG, 0.35, 0.8, 0.8);
  });
  bus.on('review_ling_water', (ev) => { const o = k3.get('ling' + ev.id); if (o) o.wet = 1; });
  bus.on('review_ling_end', (ev) => { const o = k3.get('ling' + ev.id); if (o) o.fade = 0; });
  function k4Update(dt) {
    podUpdate(dt);
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      a.t += dt;
      if (a.t < 0) continue;
      a.step(Math.min(1, a.t / a.life), a, dt);
      if (a.t >= a.life) {
        for (const o of a.objs) { root.remove(o); o.traverse((m) => m.material && m.material.dispose()); }
        anims.splice(i, 1);
      }
    }
    for (const [id, b] of beds) {
      b.t += dt;
      if (b.fade != null) b.fade += dt;
      const out = b.fade != null ? Math.max(0, 1 - b.fade / 0.5) : 1;
      for (const it of b.items) it.scale.setScalar(Math.min(1.5, Math.max(0.001, (b.t - it.userData.at) * 4)) * out + 0.001);
      if (b.fade != null && b.fade > 0.5) { root.remove(b.g); b.g.traverse((m) => m.material && m.material.dispose()); beds.delete(id); }
    }
    for (const [id, c] of creepers) {
      c.t += dt;
      if (c.end != null) c.end += dt;
      const e = byId(id);
      const out = c.end != null ? Math.max(0, 1 - c.end / 0.35) : c.t >= c.life ? Math.max(0, 1 - (c.t - c.life) / 0.35) : 1;
      if (!e || out <= 0) { root.remove(c.g); c.g.traverse((m) => m.material && m.material.dispose()); creepers.delete(id); continue; }
      c.g.position.set(e.x, 0, e.z);
      const climb = Math.min(1, c.t * 0.45 + 0.15);
      for (const l of c.leaves) {
        const d = l.userData;
        const on = d.h <= climb * 0.8;
        l.position.set(Math.cos(d.a) * d.r, 0.06 + d.h, Math.sin(d.a) * d.r);
        l.rotation.set(0.4, -d.a, 0.5);
        l.material.opacity = on ? out : 0;
        l.scale.setScalar(on ? 2.7 : 0.001);
      }
    }
  }
  function k3Update(dt) {
    const swarmPos = new Map((globalThis.__reviewSwarms || []).map((w) => [w.id, w]));
    for (const [id, o] of k3) {
      o.t += dt;
      if (o.fade != null) o.fade += dt;
      const out = o.fade != null ? Math.max(0, 1 - o.fade / 0.35) : 1;
      if (o.kind === 'spit') {
        o.kick = Math.max(0, o.kick - dt * 6);
        o.g.scale.setScalar(1.6 * Math.min(1, o.t * 5) * (0.3 + 0.7 * out) + 0.001);
        if (o.model) { o.head.scale.set(1 + 0.14 * o.kick, 1 - 0.2 * o.kick, 1 + 0.14 * o.kick); o.head.rotation.x = -0.3 * o.kick; } // squash and rock back to spit
        else o.head.scale.setScalar(1 + 0.25 * o.kick);
      } else if (o.kind === 'bud') {
        const e = byId(o.target);
        if (e) o.g.position.set(e.x, 1.45, e.z);
        const grow = Math.min(1, o.t / Math.max(0.1, o.life));
        if (o.open == null) {
          o.g.scale.setScalar(2 * (0.55 + 0.45 * grow));
          for (const pv of o.petals) pv.rotation.x = 0.25;
          o.core.material.opacity = 0.35 + 0.35 * Math.sin(o.t * 5) ** 2;
        } else {
          o.open += dt;
          const u = Math.min(1, o.open / 0.3);
          for (const pv of o.petals) pv.rotation.x = 0.25 + 1.3 * u;
          o.core.material.opacity = 0.9 * (1 - u);
          if (o.open > 0.5) { o.fade = o.fade ?? 0; }
        }
        if (o.fade != null) o.g.scale.multiplyScalar(out + 0.001);
      } else if (o.kind === 'gust') {
        const d = Math.min(o.len, o.t * o.speed);
        o.band.position.z = d;
        o.edge.position.z = d + 0.25;
        o.band.material.opacity = 0.32 * out;
        o.edge.material.opacity = 0.7 * out;
        for (const m of o.motes) {
          const u = m.userData;
          m.position.set(u.x + Math.sin(o.t * 6 + u.ph) * 0.08, u.y + Math.sin(o.t * 8 + u.ph) * 0.05, d - 0.1 + (u.dz || 0) + Math.sin(o.t * 5 + u.ph) * 0.15);
          if (u.leaf) m.rotation.set(o.t * 7 + u.ph, o.t * 5, o.t * 3);
          m.material.opacity = 0.8 * out;
        }
      } else if (o.kind === 'swarm') {
        const w = swarmPos.get(o.id);
        if (w) o.g.position.set(w.x, 0, w.z);
        for (const f of o.flies) {
          const u = f.userData;
          u.a += dt * u.sp;
          f.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(u.a * 1.7) * 0.08, Math.sin(u.a) * u.r);
          f.material.color.set(o.foe && f !== o.flies[0] && (u.sp % 2) ? DT.LANTERN : (u.sp % 2 ? DT.GOLD : PALETTE.brightHeal));
          f.material.opacity = 0.9 * out * Math.min(1, o.t * 5);
        }
      } else if (o.kind === 'spear') {
        if (o.burst == null) {
          const u = Math.min(1, o.t / o.warn);
          o.bed.material.opacity = 0.18 + 0.1 * u;
          o.fill.scale.y = Math.max(0.01, u * o.len);
          o.fill.position.z = (u * o.len) / 2;
          o.fill.material.opacity = 0.3;
        } else {
          o.burst += dt;
          o.bed.material.opacity = 0; // dream loop: the moss row replaces it
          o.fill.material.opacity = 0;
          const rise = Math.min(1, o.burst / 0.08), sink = Math.max(0, (o.burst - 0.45) / 0.25);
          for (const sp of o.spikes) { sp.visible = true; sp.position.y = -0.45 + 0.75 * rise - 0.8 * sink; }
          if (o.burst > 0.75) o.fade = o.fade ?? 0.35;
        }
      } else if (o.kind === 'fall') {
        const p = p0();
        o.g.position.set(p.x, 0, p.z);
        const m = o.mul || 1; // kit 2.3: the channel ring brightens and thickens as the wisps ramp up
        o.ring.material.opacity = (0.22 + 0.3 * (m - 1)) * Math.min(1, o.t * 4) * out;
        o.ring.scale.setScalar(1 + 0.02 * Math.sin(o.t * 8) * m);
      } else if (o.kind === 'snare') {
        if (o.clench == null) {
          const u = Math.min(1, o.t * 3);
          o.disc.material.opacity = 0.7 * u;
          o.edge.material.opacity = 0.7 * u;
          o.roots.forEach((pv, i) => { pv.scale.setScalar(Math.min(1, Math.max(0.01, o.t * 4 - i * 0.05))); pv.children[0].rotation.x = 0.35 + Math.sin(o.t * 3 + i) * 0.08; });
        } else {
          o.clench += dt;
          const u = Math.min(1, o.clench / 0.15);
          o.roots.forEach((pv) => { pv.children[0].rotation.x = 0.35 + 0.9 * u; pv.scale.setScalar(1 + 0.3 * u); });
          o.edge.material.opacity = 0.9 * (1 - Math.min(1, o.clench / 0.6));
          o.disc.material.opacity = 0.75 * (1 - Math.min(1, o.clench / 0.6));
          if (o.clench > 0.6) o.fade = o.fade ?? 0.35;
        }
      } else if (o.kind === 'puff') {
        const u = Math.min(1, o.t / 0.35);
        o.g.position.lerpVectors(o.from, o.to, u);
        o.g.position.y = o.from.y * (1 - u) + 0.8 * Math.sin(Math.PI * u);
        o.big = o.big ? Math.min(1, o.big + dt * 3) : 0;
        const br = u < 1 ? 0 : Math.sin(o.t * 3) * 0.05; // breathes while it waits
        const k = (u < 1 ? 0.8 : 1) * (1 + o.big);
        if (o.pop != null) { o.pop += dt; const sw = 1 + 3 * Math.min(o.pop, 0.12); o.g.scale.set(k * sw, k * sw * 0.9, k * sw); if (o.pop > 0.12) dropK3(id); }
        else o.g.scale.set(k * (1 + br), k * (1 - br), k * (1 + br));
      } else if (o.kind === 'oak') {
        const u = Math.min(1, o.t / o.grow);
        const e = 1 - (1 - u) ** 3;
        o.tree.scale.setScalar(Math.max(0.001, e * out));
        o.tree.rotation.y = Math.sin(o.t * 0.8) * 0.03;
        o.shade.material.opacity = 0.55 * u * out;
        o.edge.material.opacity = 0.6 * u * out;
        o.roots.forEach((r, i) => { r.material.opacity = 0.75 * Math.min(1, Math.max(0, o.t * 2.5 - i * 0.05)) * out; });
      } else if (o.kind === 'ling') {
        const live = (globalThis.__reviewOaklings || []).find((q) => q.id === o.id);
        if (live) { o.g.position.x = live.x; o.g.position.z = live.z; o.g.rotation.y += ((live.face || 0) - o.g.rotation.y) * Math.min(1, dt * 10); o.moving = live.moving; }
        const rise = Math.min(1, o.t / 0.4);
        o.g.position.y = -0.9 * (1 - rise) - (o.fade != null ? o.fade * 1.2 : 0);
        o.walk += dt * (o.moving ? 12 : 0);
        const sw = o.moving ? Math.sin(o.walk) * 0.6 : 0;
        o.legL.rotation.x = sw; o.legR.rotation.x = -sw;
        let arm = -sw * 0.5;
        if (o.slam != null) { o.slam += dt; const s = o.slam; arm = s < 0.12 ? -2.6 * (s / 0.12) : s < 0.22 ? -2.6 + 3.4 * ((s - 0.12) / 0.1) : 0.8 * Math.max(0, 1 - (s - 0.22) / 0.2); if (s > 0.45) o.slam = null; }
        o.armL.rotation.x = arm; o.armR.rotation.x = o.slam != null ? arm : sw * 0.5;
        o.body.position.y = o.moving ? Math.abs(Math.sin(o.walk)) * 0.05 : 0;
        o.body.rotation.z = (o.moving ? Math.sin(o.walk) * 0.09 : 0) + (o.fade != null ? o.fade * 2.2 : 0); // waddle; it withers over sideways
        o.body.rotation.x = o.slam != null ? Math.max(0, -arm) * -0.08 + Math.max(0, arm) * 0.35 : 0; // leans back on the raise, into the slam
        if (o.wet) { o.wet = Math.max(0, o.wet - dt); burst(o.g.position.x, 0.9, o.g.position.z, WATER, 1, 0.07); }
      } else if (o.kind === 'cloud') {
        const u = Math.min(1, o.t * 3);
        o.edge.material.opacity = 0.55 * u * out;
        o.disc.material.opacity = 0.1 * u * out;
        for (const pu of o.puffs) {
          const d = pu.userData;
          pu.position.set(d.x + Math.sin(o.t * 0.8 + d.ph) * 0.12, d.y + Math.sin(o.t * 1.3 + d.ph) * 0.06, d.z + Math.cos(o.t * 0.7 + d.ph) * 0.12);
          pu.scale.setScalar(d.s * (0.6 + 0.4 * u));
          pu.material.opacity = 0.32 * u * out;
        }
      }
      if (o.fade != null && o.fade > 0.35) dropK3(id);
    }
  }
  function kitUpdate(dt) {
    k4Update(dt);
    gwUpdate(dt);
    laneUpdate(dt);
    k3Update(dt);
    k5Update(dt);
    k7Update(dt);
    for (const [id, o] of kitObjs) {
      o.t += dt;
      if (o.fade != null) o.fade += dt;
      const out = o.fade != null ? Math.max(0, 1 - o.fade / 0.35) : 1;
      if (o.kind === 'seed') {
        o.glow.material.opacity = (0.45 + 0.25 * Math.sin(o.t * 6)) * out;
        if (o.seed.userData.model) { // the model rocks a little while it waits and squashes as it lands
          o.seed.rotation.z = 0.1 * Math.sin(o.t * 2.3 + o.seed.rotation.y);
          if (!(o.thr && o.thr.t < 1) && !o.use) { o.land = (o.land ?? 0) + dt; const q = Math.max(0, 1 - o.land / 0.18); o.seed.scale.set(1 + 0.25 * q, 1 - 0.3 * q, 1 + 0.25 * q); }
          if (o.sprouting != null) { o.sprouting += dt; o.seed.scale.set(1 + 0.6 * o.sprouting / 0.35, 1 + 0.9 * o.sprouting / 0.35, 1 + 0.6 * o.sprouting / 0.35); }
        } else o.seed.rotation.y += dt * 2;
        o.ring.material.opacity = 0.35 * out;
        o.g.scale.setScalar(Math.min(1, o.t * 6) * (0.4 + 0.6 * out));
        if (o.use) { // kit 1.7: a used seed zips to what took it and pops there
          o.use.t = Math.min(1, o.use.t + dt / 0.28);
          o.g.position.lerpVectors(o.use.from, o.use.to, o.use.t);
          o.g.position.y += 0.3 * Math.sin(Math.PI * o.use.t);
          o.seed.rotation.x += dt * 12;
          if (o.use.t >= 1 && o.fade == null) { burst(o.use.to.x, o.use.to.y, o.use.to.z, LEAF_LIGHT, 5, 0.09); o.fade = 0; }
        } else if (o.thr && o.thr.t < 1) {
          o.thr.t = Math.min(1, o.thr.t + dt / o.thr.dur);
          o.g.position.lerpVectors(o.thr.from, o.thr.to, o.thr.t);
          o.g.position.y = o.thr.from.y * (1 - o.thr.t) + o.thr.peak * Math.sin(Math.PI * o.thr.t);
          o.ring.visible = o.thr.t >= 1;
          if (o.thr.low) {
            o.seed.rotation.x += dt * 14;
            o.thr.trail -= dt;
            if (o.thr.trail <= 0 && o.thr.t < 0.95) { o.thr.trail = 0.05; burst(o.g.position.x, o.g.position.y + 0.08, o.g.position.z, LEAF_LIGHT, 1, 0.06); }
          }
          if (o.thr.t >= 1) { burst(o.thr.to.x, 0.1, o.thr.to.z, '#8CC46E', 4, 0.07); if (o.thr.low) burst(o.thr.to.x, 0.06, o.thr.to.z, '#8B7A55', 3, 0.06); }
        }
      } else if (o.kind === 'sapling') {
        o.pulse = Math.max(0, o.pulse - dt * 2.5);
        o.g.scale.setScalar(Math.min(1, o.t * 2.5) * out + 0.001);
        // kit v1.4 R17: three sizes in its life, sprout to a young tree as tall as the Tank
        const stage = o.level === 3 ? 2.7 : o.level === 2 ? 1.8 : 0.9; // Kesh 18 Nov: sizes follow the sim's levels
        o.sc += (stage - o.sc) * Math.min(1, dt * 7);
        o.tree.scale.setScalar(o.sc);
        o.glow.position.y = 0.42 * o.sc;
        o.crown.rotation.z = Math.sin(o.t * 2.2) * 0.06;
        o.glow.material.opacity = (0.3 + 0.45 * o.pulse) * out;
        o.glow.scale.setScalar(0.55 + 0.25 * o.pulse);
        o.reachRing.material.opacity = 0.16 * Math.min(1, o.t * 3) * out;
      } else if (o.kind === 'vine') {
        // kit v1.4 R23: a thorned vine grows out of the floor at the foe's feet and coils up it.
        o.pulse = Math.max(0, o.pulse - dt * 3);
        const foe = byId(o.target);
        if (foe) { o.fx = foe.x; o.fz = foe.z; }
        if (o.fx != null) {
          const climb = Math.min(1, o.t * 2.2);
          o.segs.forEach((s, i) => {
            const u = i / (o.segs.length - 1);
            const a = u * Math.PI * 4.2 + o.t * 1.5;
            const rr = 0.36 - 0.1 * u;
            const th = s.userData.thorn ? 0.04 : 0;
            s.position.set(o.fx + Math.cos(a) * (rr + th), 0.06 + u * 1.0 * climb, o.fz + Math.sin(a) * (rr + th));
            s.rotation.set(0, -a, s.userData.thorn ? -Math.PI / 2 : 0.5);
            s.scale.setScalar((u <= climb ? 1 : 0.001) * (1 + 0.3 * o.pulse));
            s.material.opacity = 0.95 * out;
          });
        }
      }
      if (o.fade != null && o.fade > 0.35) {
        if (o.g) root.remove(o.g);
        for (const s of o.segs || []) { root.remove(s); s.material.dispose(); }
        kitObjs.delete(id);
      }
    }
  }
  // ---- Kit v1.5 (Kesh 11-16 19:45 "1 a, 2 yes, 3 build all", MOSSLIGHT_SKILL_KIT.md): the planted
  // staff takes root (R44), Swiftleaf comes back (R27), Dew Wave washes
  // (R28), the wind rolls seeds (R39), the watered staff (R49) and Bramble Hedge (S53). The thorn
  // bolts (R47) are drawn in scenes/graybox.js.
  const HEDGE_LEAF = '#447F3F';
  const THORN_PALE = '#D8C9A0';
  const CRYSTAL = '#A8E6B0';
  // R44: roots spread 0.5 u from the staff's foot in 0.2 s and two leaves open under the gem;
  // they pull back in 0.15 s when she takes it up.
  let staffFx = null;
  function staffGone(fast, sowed) {
    const s = staffFx;
    if (!s) return;
    staffFx = null;
    s.back = 0;
    s.fast = fast;
    // Sower: the buds leave as the seeds (sim); an early call back withers them with a small puff.
    // Kesh 11-16 22:52: on a full timer the staff bursts a little as it shoots them out.
    if (sowed) {
      burst(s.gx, 0.5, s.gz, LEAF_LIGHT, 8, 0.11);
      burst(s.gx, 0.35, s.gz, '#8B6A45', 5, 0.08);
      burst(s.fx, 0.12, s.fz, LEAF, 6, 0.1);
      ringPart(s.fx, s.fz, 0.45, LEAF_LIGHT, 0.4, 1.4, 0.7);
    }
    for (const b of s.buds || []) {
      if (b.scale.x < 0.05) continue;
      const x = s.fx + b.userData.x, z = s.fz + b.userData.z;
      if (sowed) burst(x, 0.15, z, LEAF_LIGHT, 3, 0.07);
      else { burst(x, 0.15, z, '#8B7A55', 4, 0.08); burst(x, 0.2, z, '#C9C2A8', 3, 0.1); }
    }
  }
  const staffOld = [];
  bus.on('review_staff_plant', (ev) => {
    if (staffFx) { staffOld.push(staffFx); staffGone(true); }
    const g = new Group();
    const roots = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4 * (i % 2);
      const len = 0.5 * (0.75 + 0.25 * ((i * 5) % 3) / 2);
      const r = flat(new PlaneGeometry(0.18, 1), i % 2 ? '#8B6A45' : WOOD, 0.95); r.material = rootFlat(0, 0, 0.95); r.geometry.rotateZ(Math.PI); // round 2: Rootspear's roots, base at the staff
      r.userData = { a, len };
      g.add(r);
      roots.push(r);
    }
    const leaves = [0, 1].map((i) => {
      const l = leafMesh(i ? LEAF : LEAF_LIGHT, 3.2);
      l.material.opacity = 1;
      root.add(l);
      return l;
    });
    // S54 Sower: two seed buds swell on the roots at 2.4 s and 5 s (Kesh 18 Nov: 2 seeds, was 3).
    const buds = [1, 4].map((ri, k) => {
      const b = new Mesh(new IcosahedronGeometry(0.075, 0), mat('#8FD08A', 1, { transparent: true, emissive: '#3E9A4E', emissiveIntensity: 0.6 }));
      const { a, len } = roots[ri].userData;
      b.userData = { at: [1.97, 4.45][k], // 2.4 and 5 s after the throw (it plants at 0.43 s)
         x: Math.cos(a) * len * 0.85, z: Math.sin(a) * len * 0.85 };
      b.position.set(b.userData.x, 0.06, b.userData.z);
      b.scale.setScalar(0.001);
      g.add(b);
      return b;
    });
    g.position.set(ev.x, 0.032, ev.z);
    root.add(g);
    staffFx = { g, roots, leaves, buds, gx: ev.gx, gz: ev.gz, fx: ev.x, fz: ev.z, t: 0, back: null, wet: 0 };
    staffOld.push(staffFx);
    burst(ev.x, 0.1, ev.z, LEAF_LIGHT, 5, 0.08);
  });
  bus.on('review_staff_up', (ev) => staffGone(false, ev.sowed));
  // S54 Sower: a seed hops out of her belt pouch with a soft pop (the seed's own arc carries it).
  bus.on('review_pouch', (ev) => { burst(ev.x, 0.55, ev.z, LEAF_LIGHT, 4, 0.07); burst(ev.x, 0.55, ev.z, POLLEN, 2, 0.06); });
  bus.on('review_staff_water', (ev) => { if (staffFx) staffFx.wet = ev.secs || 3; });
  function staffUpdate(dt) {
    for (let i = staffOld.length - 1; i >= 0; i--) {
      const s = staffOld[i];
      s.t += dt;
      if (s.back != null) s.back += dt;
      const grow = s.back != null ? Math.max(0, 1 - s.back / (s.fast ? 0.08 : 0.15)) : Math.min(1, s.t / 0.2);
      const ease = 1 - (1 - grow) * (1 - grow);
      for (const r of s.roots) {
        const { a, len } = r.userData;
        const l = Math.max(0.001, len * ease);
        r.scale.set(1, l, 1);
        r.position.set((Math.cos(a) * l) / 2, 0, (Math.sin(a) * l) / 2);
        r.rotation.z = -a + Math.PI / 2;
      }
      for (const b of s.buds || []) {
        const k = s.back != null ? 0 : Math.min(1, Math.max(0, (s.t - b.userData.at) / 0.25));
        b.scale.setScalar(Math.max(0.001, k * (1 + 0.12 * Math.sin(s.t * 6))));
      }
      s.wet = Math.max(0, s.wet - dt);
      const wetK = s.wet > 0 ? 1 : 0;
      s.leaves.forEach((l, k) => {
        const side = k ? 1 : -1;
        const open = ease * (1 + 0.25 * wetK * (0.5 + 0.5 * Math.sin(s.t * 9)));
        l.position.set(s.gx + side * 0.09 * Math.cos(Math.atan2(s.gz - s.fz, s.gx - s.fx) + Math.PI / 2), 0.56, s.gz + side * 0.09 * Math.sin(Math.atan2(s.gz - s.fz, s.gx - s.fx) + Math.PI / 2));
        const dirA = Math.atan2(s.gz - s.fz, s.gx - s.fx) + side * Math.PI / 2;
        l.rotation.set(0, -dirA, -Math.PI / 2 + side * 0.0 + 0.45);
        l.scale.setScalar(3.2 * Math.max(0.001, open));
      });
      if (wetK && Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) burst(s.gx, 0.75, s.gz, WATER, 2, 0.07); // R49: the watered turret drips
      if ((s.back != null && grow <= 0) || s.t > 8) {
        root.remove(s.g);
        s.g.traverse((m) => { if (m.material) m.material.dispose(); if (m.geometry) m.geometry.dispose(); });
        for (const l of s.leaves) { root.remove(l); l.material.dispose(); }
        staffOld.splice(i, 1);
        if (staffFx === s) staffFx = null;
      }
    }
  }
  // R48 dash flower trail: cut (Kesh, 16 Nov: "dash: cancel the flower along path").
  // ---- Kit 1.7 (Kesh 11-16 22:56, U1 to U7): what a seed becomes.
  // U5 b: Heartbloom opens a seed as a flower that heals allies within 2 u.
  bus.on('review_seed_flower', (ev) => {
    flower(ev.x, 0.06, ev.z, 1.3, 4.2);
    ringPart(ev.x, ev.z, ev.r, PALETTE.brightHeal, 0.6, 0.12, 0.5);
    burst(ev.x, 0.35, ev.z, PALETTE.brightHeal, 6, 0.12);
    for (const id of ev.to || []) { const e = byId(id); if (e) burst(e.x, 0.7, e.z, PALETTE.brightHeal, 3, 0.1); }
  });
  // U6: Rootspear bursts a seed as a ring of roots (12 damage in 1.5 u and a slow), then it sprouts.
  const k7Spikes = [];
  const spikeGeo = new ConeGeometry(0.07, 0.5, 5);
  bus.on('review_seed_burst', (ev) => {
    ringPart(ev.x, ev.z, ev.r, '#8B6A45', 0.5, 0.08, 0.85);
    burst(ev.x, 0.2, ev.z, '#8B7A55', 6, 0.1);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, rr = ev.r * (i % 2 ? 0.75 : 0.5);
      const m = new Mesh(spikeGeo, mat(i % 2 ? WOOD : '#8B6A45'));
      m.position.set(ev.x + Math.cos(a) * rr, -0.3, ev.z + Math.sin(a) * rr);
      m.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      root.add(m);
      k7Spikes.push({ m, t: -0.02 * (i % 3) });
    }
  });
  // U3: the wind splits a seed in two.
  bus.on('review_seed_split', (ev) => { burst(ev.x, 0.3, ev.z, BLOSSOM, 5, 0.09); burst(ev.x, 0.2, ev.z, POLLEN, 3, 0.07); });
  function k7Update(dt) {
    for (let i = k7Spikes.length - 1; i >= 0; i--) {
      const s = k7Spikes[i];
      s.t += dt;
      const up = Math.min(1, Math.max(0, s.t) / 0.1), down = Math.max(0, (s.t - 0.45) / 0.25);
      const h = s.tall ?? 0.52, b0 = s.tall != null ? -0.5 : -0.3; // kit 1.8: the thicket's vines rise higher
      s.m.position.y = b0 + h * up - h * Math.min(1, down);
      if (s.t > 0.75) { root.remove(s.m); s.m.material.dispose(); k7Spikes.splice(i, 1); }
    }
  }
  // R27: after its heal the leaf flies home; it detours through the most hurt ally near its path
  // and heals it for half. Positions come from the sim (review build only).
  const backs = new Map(); // id -> { lead, trail, hist, t, fade }
  bus.on('review_leaf_back', (ev) => {
    const lead = leafMesh(LEAF_LIGHT, 4.0);
    const trail = [0, 1, 2].map((i) => leafMesh(i % 2 ? LEAF : LEAF_LIGHT, 2.4 - i * 0.4));
    for (const m of [lead, ...trail]) { root.add(m); m.position.set(ev.x, 0.8, ev.z); }
    backs.set(ev.id, { lead, trail, hist: [], t: 0, fade: null, x: ev.x, z: ev.z });
  });
  bus.on('review_leaf_back_heal', (ev) => {
    const e = byId(ev.target);
    if (!e) return;
    burst(e.x, 0.8, e.z, PALETTE.brightHeal, 5, 0.11);
    const sprig = new Group();
    for (let i = 0; i < 3; i++) { const l = leafMesh(i % 2 ? LEAF : LEAF_LIGHT, 2.4); l.rotation.set(0.5, (i / 3) * 6.28, 0.9); l.position.set(Math.cos(i * 2.1) * 0.1, 0.05, Math.sin(i * 2.1) * 0.06); sprig.add(l); }
    sprig.scale.setScalar(0.001);
    anim(0.8, (v) => { sprig.position.set(e.x + 0.2, 1.0, e.z); sprig.scale.setScalar(Math.min(1, v * 6) * (1 - Math.max(0, (v - 0.7) / 0.3)) + 0.001); sprig.rotation.y = v * 2; }, [sprig]);
  });
  bus.on('review_leaf_back_end', (ev) => {
    const b = backs.get(ev.id);
    if (!b) return;
    b.fade = 0;
    const p = p0();
    if (p) burst(p.x, 0.9, p.z, LEAF_LIGHT, 4, 0.08);
  });
  function backUpdate(dt) {
    const live = new Map((globalThis.__reviewBacks || []).map((b) => [b.id, b]));
    for (const [id, b] of backs) {
      b.t += dt;
      if (b.fade != null) b.fade += dt;
      const s = live.get(id);
      if (s) { b.x += (s.x - b.x) * Math.min(1, dt * 14); b.z += (s.z - b.z) * Math.min(1, dt * 14); }
      const y = 0.8 + 0.12 * Math.sin(b.t * 5);
      b.lead.position.set(b.x, y, b.z);
      b.lead.rotation.set(b.t * 11, b.t * 8, 0.6);
      b.hist.unshift(b.lead.position.clone());
      if (b.hist.length > 12) b.hist.length = 12;
      const out = b.fade != null ? Math.max(0, 1 - b.fade / 0.2) : 1;
      b.lead.material.opacity = out;
      b.trail.forEach((m, i) => {
        m.position.copy(b.hist[Math.min(b.hist.length - 1, (i + 1) * 3)]);
        m.rotation.set(b.t * 9 + i, b.t * 7, 0.6);
        m.material.opacity = out * (0.85 - i * 0.2);
      });
      if (b.fade != null && b.fade > 0.2) {
        for (const m of [b.lead, ...b.trail]) { root.remove(m); m.material.dispose(); }
        backs.delete(id);
      }
    }
  }
  // R28: Dew Wave washes a slow off the ally: drops run off and a pale water ring.
  bus.on('review_wash', (ev) => {
    const e = byId(ev.target);
    if (!e) return;
    for (let i = 0; i < 8; i++) {
      const s = sprite(WATER);
      s.scale.setScalar(0.1);
      root.add(s);
      const a = (i / 8) * Math.PI * 2;
      parts.push({ s, kind: 'fly', from: new Vector3(e.x, 1.0, e.z), vel: new Vector3(Math.cos(a) * 0.7, -0.6, Math.sin(a) * 0.7), t: 0, life: 0.45 });
    }
    ringPart(e.x, e.z, 0.5, WATER, 0.5, 0.7, 0.8);
  });
  // R39: the wind rolls seeds with it.
  bus.on('review_seed_move', (ev) => {
    const o = kitObjs.get(ev.id);
    if (!o) return;
    if (o.thr && o.thr.t < 1) { o.thr.to.set(ev.x, 0, ev.z); return; }
    o.g.position.set(ev.x, 0, ev.z);
    o.seed.rotation.x += 0.5;
  });
  // S53 Bramble Hedge (stand-in until its model comes): dark green leaf clumps on wood stems, pale
  // blossoms, small thorns, a crystal bud at each end. Nothing like the Thornling.
  const hedges = new Map();
  const clumpGeo = new IcosahedronGeometry(0.2, 0);
  const stemGeo = new CylinderGeometry(0.025, 0.04, 0.6, 5);
  const budGeo = new IcosahedronGeometry(0.1, 0);
  budGeo.scale(0.8, 1.5, 0.8);
  const blossomGeo = new SphereGeometry(0.05, 6, 4);
  blossomGeo.scale(1, 0.55, 1);
  bus.on('review_hedge', (ev) => {
    const g = new Group();
    const body = new Group();
    g.add(body);
    const w = ev.w, th = ev.thick;
    const n = Math.round(w / 0.32);
    const blossoms = [];
    for (let i = 0; i <= n; i++) {
      const x = -w / 2 + (w * i) / n;
      for (let k = 0; k < 2; k++) {
        const c = new Mesh(clumpGeo, mat(k ? LEAF : HEDGE_LEAF));
        const j = ((i * 7 + k * 3) % 5) / 5;
        c.position.set(x + (j - 0.5) * 0.1, 0.2 + k * 0.28 + j * 0.06, (k ? 0.04 : -0.04) + (j - 0.5) * 0.12);
        c.scale.set(1.1 + j * 0.3, 0.85 + 0.2 * j, (th / 0.4) * (0.85 + 0.15 * j));
        c.rotation.set(j * 2, i, k);
        body.add(c);
      }
      if (i % 2 === 1) {
        const s = new Mesh(stemGeo, mat(i % 4 === 1 ? WOOD : WOOD_D));
        s.position.set(x, 0.3, ((i * 3) % 2 ? 0.12 : -0.12));
        s.rotation.z = ((i % 3) - 1) * 0.35;
        body.add(s);
      }
      if (i % 2 === 0 && i > 0 && i < n) {
        const b = new Mesh(blossomGeo, mat(i % 4 ? BLOSSOM : FLOWER, 1, { emissive: '#6E6A58', emissiveIntensity: 0.3 }));
        b.position.set(x + 0.05, 0.66, ((i * 5) % 3 - 1) * 0.1);
        body.add(b);
        blossoms.push(b);
      }
      for (const side of [-1, 1]) {
        if ((i + (side > 0 ? 1 : 0)) % 2) continue;
        const t = new Mesh(vineThornGeo, mat(THORN_PALE));
        t.position.set(x, 0.22 + (i % 3) * 0.12, side * (th / 2 + 0.02));
        t.rotation.x = side * Math.PI / 2;
        body.add(t);
      }
    }
    const buds = [-1, 1].map((side) => {
      const b = new Mesh(budGeo, mat(CRYSTAL, 1, { emissive: '#3E9A4E', emissiveIntensity: 0.7, roughness: 0.3 }));
      b.position.set(side * (w / 2 + 0.06), 0.62, 0);
      const glow = sprite(DMG);
      glow.scale.setScalar(0.4);
      glow.position.copy(b.position);
      body.add(b, glow);
      return glow;
    });
    g.position.set(ev.x, 0, ev.z);
    g.rotation.y = Math.atan2(-ev.dz, ev.dx);
    body.scale.set(0.7, 0.001, 0.7);
    root.add(g);
    hedges.set(ev.id, { g, body, buds, blossoms, t: 0, grow: ev.grow || 0.3, end: null, wet: 0, hit: 0, w, ax: ev.dx, az: ev.dz });
    for (let i = 0; i < 6; i++) burst(ev.x + ev.dx * (i - 2.5) * (w / 6), 0.15, ev.z + ev.dz * (i - 2.5) * (w / 6), LEAF_LIGHT, 3, 0.09);
  });
  bus.on('review_hedge_hit', (ev) => {
    const o = hedges.get(ev.id);
    const e = byId(ev.target);
    if (o) o.hit = 1;
    if (e) burst(e.x, 0.5, e.z, DMG, ev.trample ? 10 : 4, ev.trample ? 0.14 : 0.1);
    if (ev.trample && o) {
      for (let i = 0; i < 14; i++) {
        const l = leafMesh(i % 2 ? HEDGE_LEAF : LEAF, 2.4);
        const a = (i / 14) * Math.PI * 2, along = (i / 13 - 0.5) * o.w;
        const x0 = o.g.position.x + o.ax * along, z0 = o.g.position.z + o.az * along;
        anim(0.8, (u) => {
          l.position.set(x0 + Math.cos(a) * u * 1.2, 0.5 + 0.5 * Math.sin(Math.PI * u) - u * 0.5, z0 + Math.sin(a) * u * 1.2);
          l.rotation.set(u * 9 + i, u * 6, 0);
          l.material.opacity = 1 - Math.max(0, (u - 0.6) / 0.4);
        }, [l]);
      }
    }
  });
  bus.on('review_hedge_water', (ev) => { const o = hedges.get(ev.id); if (o) o.wet = ev.secs || 3; });
  bus.on('review_hedge_end', (ev) => { const o = hedges.get(ev.id); if (o && o.end == null) o.end = 0; });
  function hedgeUpdate(dt) {
    for (const [id, o] of hedges) {
      o.t += dt;
      if (o.end != null) o.end += dt;
      o.hit = Math.max(0, o.hit - dt * 4);
      o.wet = Math.max(0, o.wet - dt);
      const up = Math.min(1, o.t / o.grow);
      const down = o.end != null ? Math.max(0, 1 - o.end / 0.3) : 1;
      const k = (1 - (1 - up) * (1 - up)) * down;
      const sx = 0.7 + 0.3 * up;
      o.body.scale.set(sx * (1 + 0.03 * o.hit), Math.max(0.001, 1.35 * k * (1 - 0.06 * o.hit)), sx * 1.15); // reads at play zoom
      const wetK = o.wet > 0 ? 1 : 0;
      for (const b of o.buds) b.material.opacity = (0.35 + 0.2 * Math.sin(o.t * 4) + 0.35 * wetK) * down;
      for (const b of o.blossoms) b.scale.setScalar(1 + 0.45 * wetK);
      if (wetK && Math.floor(o.t * 5) !== Math.floor((o.t - dt) * 5)) {
        const along = (Math.sin(o.t * 13.7) * 0.5) * o.w;
        burst(o.g.position.x + o.ax * along, 0.7, o.g.position.z + o.az * along, WATER, 2, 0.07);
      }
      if (o.end != null && o.end > 0.3) {
        root.remove(o.g);
        o.g.traverse((m) => m.material && m.material.dispose());
        hedges.delete(id);
      }
    }
  }
  function k5Update(dt) {
    staffUpdate(dt);
    backUpdate(dt);
    hedgeUpdate(dt);
  }
  const p0 = () => world.player;
  // Bark (T26): a thin pale ring round the ally while it lasts, the ward look in a thinner line.
  const barks = new Map(); // target -> { ring, left }
  const barkGeo = new RingGeometry(0.55, 0.59, 48);
  bus.on('review_bark', (ev) => {
    let b = barks.get(ev.target);
    if (!b) {
      const ring = new Mesh(barkGeo, new MeshBasicMaterial({ color: '#E8E2C8', transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      root.add(ring);
      b = { ring, t: 0 };
      barks.set(ev.target, b);
    }
    b.left = ev.ticks / 60;
  });
  // Reach ring: only while she holds Sap and an ally in the room is hurt (T35).
  const reach = rimGlow(1.8, PALETTE.brightHeal, 0); // round 2: Dew Wave rim
  reach.rotation.x = -Math.PI / 2;
  root.add(reach);
  const gem = new Vector3();
  // ---- Kit 1.9 (Kesh 11-17, MOSSLIGHT_SKILL_KIT.md S57 to S67): eight new skills, all effects (no
  // new model). Heals stay Bright Heal; her damage the darker green.
  const HONEY = '#F2C45A';
  const CLOUD = '#E6EEF2';
  const SPORE = '#DCE8C8';
  const zTex = (() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.font = 'bold 52px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('z', 32, 34);
    return new CanvasTexture(c);
  })();
  const toss = (fx, fz, x, z, secs, make, peak = 1.1) => {
    const m = make();
    return anim(secs, (u) => {
      m.position.set(fx + (x - fx) * u, 0.9 * (1 - u) + 0.12 + peak * Math.sin(Math.PI * u), fz + (z - fz) * u);
      m.rotation.x += 0.25;
    }, [m]);
  };
  // S57 Nectar Burst: a honey drop arcs out and bursts; the allies it sweetens glow gold for 5 s.
  bus.on('review_nectar', (ev) => {
    toss(ev.fromX, ev.fromZ, ev.x, ev.z, ev.secs, () => {
      const g = new Group();
      const d = new Mesh(new SphereGeometry(0.11, 8, 6), mat(HONEY, 0.95, { emissive: '#8A6420', emissiveIntensity: 0.5 }));
      d.scale.set(1, 1.25, 1);
      const s = sprite(POLLEN);
      s.scale.setScalar(0.35);
      s.material.opacity = 0.6;
      g.add(d, s);
      return g;
    });
  });
  bus.on('review_nectar_burst', (ev) => {
    ringPart(ev.x, ev.z, ev.r, HONEY, 0.5, 0.15, 0.85);
    ringPart(ev.x, ev.z, ev.r * 0.6, PALETTE.brightHeal, 0.45, 0.6, 0.6);
    burst(ev.x, 0.35, ev.z, HONEY, 10, 0.14);
    burst(ev.x, 0.3, ev.z, PALETTE.brightHeal, 5, 0.12);
    for (const id of ev.to || []) {
      const ring = flat(new RingGeometry(0.36, 0.44, 32), HONEY, 0);
      let next = 0;
      anim(ev.secs, (u, a, dt) => {
        const e = byId(id);
        if (!e) return;
        ring.position.set(e.x, 0.05, e.z);
        ring.material.opacity = 0.7 * Math.min(1, a.t * 5) * Math.min(1, (1 - u) * 6);
        next -= dt;
        if (next <= 0 && u < 0.95) { next = 0.22; const s = sprite(HONEY); s.scale.setScalar(0.09); root.add(s); const ang = Math.random() * 6.28; parts.push({ s, kind: 'fly', from: new Vector3(e.x + Math.cos(ang) * 0.3, 0.3, e.z + Math.sin(ang) * 0.3), vel: new Vector3(0, 1.3, 0), t: 0, life: 0.55 }); }
      }, [ring]);
    }
  });
  // S58 Rain Cloud: a small cloud over the ally, rain falling into a soft disc; it follows (sim).
  const k8clouds = new Map();
  bus.on('review_rain', (ev) => {
    const g = new Group();
    const puffs = [];
    for (let i = 0; i < 6; i++) {
      const b = new Mesh(new SphereGeometry(0.28 + (i % 3) * 0.07, 8, 6), mat(i % 2 ? CLOUD : '#D3DEE4', 0.92));
      const a = i * 1.05;
      b.userData = { x: Math.cos(a) * 0.38, z: Math.sin(a) * 0.3, y: 2.35 + (i % 2) * 0.12, ph: i };
      g.add(b);
      puffs.push(b);
    }
    const disc = flat(new RingGeometry(0.01, ev.r, 48), WATER, 0);
    disc.position.y = 0.04;
    const edge = flat(new RingGeometry(ev.r - 0.05, ev.r, 48), WATER, 0);
    edge.position.y = 0.045;
    g.add(disc, edge);
    const drops = [];
    for (let i = 0; i < 18; i++) {
      const d = new Mesh(new CylinderGeometry(0.012, 0.012, 0.28, 4), mat(WATER, 0.8, { emissive: '#5A90A8', emissiveIntensity: 0.4 }));
      const a = i * 2.39, rr = Math.sqrt((i + 0.5) / 18) * ev.r * 0.8;
      d.userData = { x: Math.cos(a) * rr, z: Math.sin(a) * rr, ph: (i * 0.37) % 1 };
      g.add(d);
      drops.push(d);
    }
    g.position.set(ev.x, 0, ev.z);
    root.add(g);
    k8clouds.set(ev.id, { g, puffs, disc, edge, drops, t: 0 });
  });
  bus.on('review_rain_tick', (ev) => { for (const id of ev.to || []) { const e = byId(id); if (e) burst(e.x, 0.6, e.z, WATER, 3, 0.08); } });
  bus.on('review_rain_end', (ev) => { const o = k8clouds.get(ev.id); if (o) o.fade = 0; });
  // S59 Creeping Moss: a moss runner crawls along the floor from one ally to the next.
  bus.on('review_creep', (ev) => {
    const to = byId(ev.to);
    const from = ev.from != null ? byId(ev.from) : null;
    const fx = from ? from.x : ev.fromX, fz = from ? from.z : ev.fromZ;
    if (!to || fx == null) return;
    const n = 12;
    const tufts = [];
    for (let i = 0; i < n; i++) {
      const l = leafMesh(i % 2 ? LEAF : '#4F8F45', 2.4);
      l.userData = { k: i / (n - 1), a: i * 1.7 };
      tufts.push(l);
    }
    anim(1.1, (u) => {
      const e = byId(ev.to);
      const tx = e ? e.x : to.x, tz = e ? e.z : to.z;
      for (const l of tufts) {
        const d = l.userData;
        const on = d.k <= u / 0.6;
        const side = Math.sin(d.k * 9) * 0.12;
        const ux = tx - fx, uz = tz - fz, len = Math.hypot(ux, uz) || 1;
        l.position.set(fx + ux * d.k - (uz / len) * side, 0.06, fz + uz * d.k + (ux / len) * side);
        l.rotation.set(0.5, d.a, 0.4);
        l.material.opacity = on ? Math.min(1, (1 - u) * 4) : 0;
        l.scale.setScalar(on ? 2.4 : 0.001);
      }
      if (u > 0.6 && !tufts.done) { tufts.done = true; burst(tx, 0.4, tz, LEAF_LIGHT, 5, 0.1); }
    }, tufts);
  });
  // S61 Leaf Gale (Wind Wall in 1.8): a standing wall of wind and leaves; a shot that meets it turns into a leaf.
  const k8walls = new Map();
  bus.on('review_wall', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    g.rotation.y = Math.atan2(ev.dx, ev.dz);
    const band = flat(new PlaneGeometry(ev.w, ev.thick), '#E9F7B8', 0);
    band.position.y = 0.05;
    g.add(band);
    const sheets = [0, 1, 2].map((i) => {
      const m = new Mesh(new PlaneGeometry(ev.w, 1.5 - i * 0.25), new MeshBasicMaterial({ color: i ? '#F4FFE0' : '#D8F5B0', transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
      m.position.set(0, 0.75 - i * 0.1, (i - 1) * 0.16);
      g.add(m);
      return m;
    });
    const motes = [];
    for (let i = 0; i < 26; i++) {
      const leaf = i % 2 === 0;
      const m = leaf ? leafMesh(i % 4 ? LEAF_LIGHT : '#7CBF5E', 3.2) : sprite(i % 3 ? '#E9F7B8' : POLLEN);
      if (!leaf) m.scale.setScalar(0.13);
      m.userData = { x: (i / 25 - 0.5) * ev.w, ph: i * 1.37, sp: 0.9 + (i % 5) * 0.2, leaf };
      g.add(m);
      motes.push(m);
    }
    root.add(g);
    k8walls.set(ev.id, { g, band, sheets, motes, t: 0, w: ev.w });
  });
  bus.on('review_wall_end', (ev) => { const o = k8walls.get(ev.id); if (o) o.fade = 0; });
  const k8leaves = new Map();
  bus.on('review_wall_leaf', (ev) => {
    burst(ev.x, 0.6, ev.z, '#E9F7B8', 6, 0.1);
    burst(ev.x, 0.6, ev.z, LEAF_LIGHT, 3, 0.08);
    if (ev.target == null) return;
    const l = leafMesh(LEAF_LIGHT, 5);
    const glow = sprite(PALETTE.brightHeal);
    glow.scale.setScalar(0.26);
    l.position.set(ev.x, 0.6, ev.z);
    root.add(l, glow);
    k8leaves.set(ev.id, { l, glow, t: 0 });
  });
  bus.on('review_wall_leaf_end', (ev) => {
    const o = k8leaves.get(ev.id);
    if (o) { root.remove(o.l, o.glow); o.l.material.dispose(); o.glow.material.dispose(); k8leaves.delete(ev.id); }
    if (ev.healed) { const e = byId(ev.target); if (e) burst(e.x, 0.7, e.z, PALETTE.brightHeal, 5, 0.1); }
  });
  // S62 Wild Thicket: the circle shows in her dark green, then vines burst up through it.
  const k8warns = new Map();
  bus.on('review_thicket_warn', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const edge = rimRing(ev.r, RIM_DMG); // round 2: the glowing rim (Dew Wave look), in her green
    edge.position.y = 0.045;
    const fill = mossy(flat(new RingGeometry(0.01, ev.r, 64), DMG_DEEP, 0), '#5F7F34'); // round 2: Rootspear's moss, deeper while it warns
    fill.position.y = 0.04;
    const grow = mossy(flat(new RingGeometry(0.01, ev.r, 64), DMG, 0));
    grow.position.y = 0.042;
    g.add(edge, fill, grow);
    const a = anim(ev.secs + 0.05, (u) => {
      edge.material.opacity = 0.75 * Math.min(1, u * 6);
      fill.material.opacity = 0.35;
      grow.scale.setScalar(Math.max(0.01, u));
      grow.material.opacity = 0.6;
    }, [g]);
    k8warns.set(ev.id, a);
  });
  bus.on('review_thicket', (ev) => {
    const w = k8warns.get(ev.id);
    if (w) { w.t = w.life; k8warns.delete(ev.id); }
    ringPart(ev.x, ev.z, ev.r, RIM_DMG, 0.55, 0.08, 0.9);
    burst(ev.x, 0.3, ev.z, '#8B7A55', 10, 0.13);
    const spots = [];
    for (let i = 0; i < 22; i++) { const a = i * 2.39, rr = Math.sqrt((i + 0.5) / 22) * ev.r * 0.92; spots.push([ev.x + Math.cos(a) * rr, ev.z + Math.sin(a) * rr, 1]); }
    for (const id of ev.foes || []) { const e = byId(id); if (e) spots.push([e.x, e.z, 1.8]); }
    spots.forEach(([x, z, k], i) => {
      const m = dressSpike(new Mesh(spikeGeo, mat(i % 3 === 0 ? LEAF : i % 2 ? WOOD : '#8B6A45')), i, 0.6); // round 2: Rootspear's root spears
      m.scale.set(1.3 * k, 1.6 * k, 1.3 * k);
      m.position.set(x, -0.5, z);
      m.rotation.set(Math.sin(i) * 0.3, 0, Math.cos(i * 1.3) * 0.3);
      root.add(m);
      k7Spikes.push({ m, t: -0.012 * (i % 5), tall: 0.8 * k });
    });
    for (const p of ev.fast || []) { ringPart(p.x, p.z, 0.55, POLLEN, 0.6, 0.6, 0.8); burst(p.x, 0.5, p.z, POLLEN, 5, 0.1); burst(p.x, 0.4, p.z, LEAF_LIGHT, 3, 0.08); }
  });
  // S64 Pollen Mark: a cloud of pollen; dusted foes glitter, and a hero's hit on them sends a heal back.
  const dusted = new Map(); // foe id -> until (seconds of fx time), so a fresh dusting does not stack dots
  function dustDots(id, secs) {
    const prev = dusted.get(id);
    if (prev) { prev.left = secs; return; }
    const rec = { left: secs };
    dusted.set(id, rec);
    const dots = [0, 1, 2, 3, 4].map(() => { const s = sprite(POLLEN); s.scale.setScalar(0.1); return s; });
    let t = 0;
    anim(600, (u, an, dt) => {
      const e = byId(id);
      t += dt || 0;
      rec.left -= dt || 0;
      const k = Math.min(1, t * 4) * Math.min(1, rec.left * 8);
      dots.forEach((s, j) => {
        if (!e || !(e.hp > 0)) { s.material.opacity = 0; return; }
        const ang = t * 2.2 + j * 1.26;
        s.position.set(e.x + Math.cos(ang) * 0.42, 0.55 + 0.25 * Math.sin(t * 3 + j), e.z + Math.sin(ang) * 0.42);
        s.material.opacity = 0.85 * Math.max(0, k);
      });
      if (rec.left <= 0 || !e || !(e.hp > 0)) { dusted.delete(id); an.t = 1e9; }
    }, dots);
  }
  bus.on('review_pollen', (ev) => {
    ringPart(ev.x, ev.z, ev.r, POLLEN, 0.6, 0.12, 0.8);
    burst(ev.x, 0.5, ev.z, POLLEN, 14, 0.15);
    burst(ev.x, 0.4, ev.z, '#F4FFE0', 6, 0.12);
    for (const id of ev.foes || []) dustDots(id, ev.secs);
    for (const id of []) {
      const dots = [0, 1, 2, 3, 4].map(() => { const s = sprite(POLLEN); s.scale.setScalar(0.1); return s; });
      anim(ev.secs, (u, an) => {
        const e = byId(id);
        dots.forEach((s, k) => {
          if (!e || !(e.hp > 0)) { s.material.opacity = 0; return; }
          const ang = an.t * 2.2 + k * 1.26;
          s.position.set(e.x + Math.cos(ang) * 0.42, 0.55 + 0.25 * Math.sin(an.t * 3 + k), e.z + Math.sin(ang) * 0.42);
          s.material.opacity = 0.85 * Math.min(1, an.t * 4) * Math.min(1, (1 - u) * 8);
        });
      }, dots);
    }
  });
  bus.on('review_pollen_heal', (ev) => {
    const f = byId(ev.foe);
    if (!f) return;
    burst(f.x, 0.8, f.z, POLLEN, 3, 0.08);
    for (let i = 0; i < 3; i++) {
      const s = sprite(PALETTE.brightHeal);
      s.scale.setScalar(0.12);
      root.add(s);
      parts.push({ s, target: ev.hero, from: new Vector3(f.x, 0.8, f.z), t: -i * 0.04, life: 0.3, kind: 'pour', arc: 0.4 });
    }
  });
  // S65 Drowsy Spores: a spore pod puffs; sleepers sink a little and breathe z's until they wake.
  bus.on('review_drowsy', (ev) => {
    toss(ev.fromX, ev.fromZ, ev.x, ev.z, ev.secs, () => {
      const g = new Group();
      const pod = new Mesh(new SphereGeometry(0.12, 8, 6), mat(SPORE, 1, { emissive: '#6E7A5A', emissiveIntensity: 0.3 }));
      const cap = new Mesh(new SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat('#9DB57A'));
      cap.position.y = 0.04;
      g.add(pod, cap);
      return g;
    }, 0.9);
  });
  const sleepers = new Map();
  bus.on('review_sleep', (ev) => {
    ringPart(ev.x, ev.z, ev.r, SPORE, 0.7, 0.1, 0.8);
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const puffs = [];
    for (let i = 0; i < 14; i++) {
      const s = sprite(i % 2 ? SPORE : FLOWER, false);
      const a = i * 2.39, rr = Math.sqrt((i + 0.5) / 14) * ev.r * 0.8;
      s.userData = { x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: 0.3 + (i % 4) * 0.15 };
      g.add(s);
      puffs.push(s);
    }
    anim(1.1, (u) => {
      for (const s of puffs) { const d = s.userData; s.position.set(d.x * (0.4 + 0.6 * u), d.y + u * 0.3, d.z * (0.4 + 0.6 * u)); s.scale.setScalar(0.5 + 0.4 * u); s.material.opacity = 0.5 * (1 - u); }
    }, [g]);
    for (const id of ev.slept || []) sleepers.set(id, { t: 0, next: 0.1 });
    for (const id of ev.slowed || []) { const e = byId(id); if (e) burst(e.x, 0.8, e.z, SPORE, 6, 0.12); }
  });
  // 1.9: each of the first two hits jolts the sleeper; the third wakes it exposed (20% more for 4 s).
  bus.on('review_sleep_hit', (ev) => {
    const s = sleepers.get(ev.target);
    if (s) s.jolt = 1;
    burst(ev.x, 1.0, ev.z, SPORE, 3, 0.08);
  });
  bus.on('review_wake', (ev) => {
    sleepers.delete(ev.target);
    burst(ev.x, 0.9, ev.z, FLOWER, 5, 0.1);
    if (!ev.exposed) return;
    burst(ev.x, 0.8, ev.z, DMG, 8, 0.13);
    const ring = flat(new RingGeometry(0.42, 0.5, 6), DMG, 0);
    anim(ev.secs, (u, an) => {
      const e = byId(ev.target);
      if (!e || !(e.hp > 0)) { ring.material.opacity = 0; return; }
      ring.position.set(e.x, 0.06, e.z);
      ring.rotation.z = an.t * 0.8;
      ring.material.opacity = 0.75 * Math.min(1, an.t * 6) * Math.min(1, (1 - u) * 8);
    }, [ring]);
  });
  // S67 Forest Spirit (1.9): a large pale-green wisp with a wood heart and two oak leaves behind her
  // shoulder; a thin leaf ring shows its 4 u only while an ally is near the edge.
  const spiritFx = (() => {
    const g = new Group();
    const glow = sprite('#CFEFC0');
    glow.scale.setScalar(0.62);
    const halo = sprite(LEAF_LIGHT);
    halo.scale.setScalar(1.0);
    const heart = new Mesh(new SphereGeometry(0.075, 8, 6), mat(WOOD, 1, { emissive: '#3A2814', emissiveIntensity: 0.4 }));
    const leaves = [0, 1].map((i) => { const l = leafMesh(i ? LEAF : '#4F8F45', 5.2); g.add(l); return l; });
    g.add(halo, glow, heart);
    g.visible = false;
    root.add(g);
    const ring = rimGlow(1, LEAF_LIGHT, 0);
    root.add(ring);
    return { g, glow, halo, heart, leaves, ring, t: 0, k: 0 };
  })();
  bus.on('review_spirit_in', (ev) => {
    const e = byId(ev.target);
    if (!e) return;
    ringPart(e.x, e.z, 0.5, LEAF_LIGHT, 0.5, 0.5, 0.8);
    for (let i = 0; i < 5; i++) { const s = sprite(LEAF_LIGHT); s.scale.setScalar(0.1); root.add(s); parts.push({ s, kind: 'fly', from: new Vector3(e.x + Math.cos(i * 1.26) * 0.3, 0.2, e.z + Math.sin(i * 1.26) * 0.3), vel: new Vector3(0, 1.6, 0), t: 0, life: 0.5 }); }
  });
  bus.on('review_spirit_out', (ev) => { const e = byId(ev.target); if (e) burst(e.x, 0.9, e.z, '#8B7A55', 4, 0.08); });
  function spiritUpdate(dt) {
    const sp = globalThis.__reviewSpirit, o = spiritFx;
    o.t += dt;
    o.k += ((sp && sp.on ? 1 : 0) - o.k) * Math.min(1, dt * 5);
    o.g.visible = o.k > 0.02;
    if (!sp || !o.g.visible) { o.ring.material.opacity = 0; return; }
    const tx = sp.x, tz = sp.z, y = 1.35 + 0.08 * Math.sin(o.t * 2.1);
    if (o.g.userData.set) { o.g.position.x += (tx - o.g.position.x) * Math.min(1, dt * 8); o.g.position.z += (tz - o.g.position.z) * Math.min(1, dt * 8); }
    else { o.g.position.set(tx, y, tz); o.g.userData.set = true; }
    o.g.position.y = y;
    o.glow.material.opacity = 0.75 * o.k;
    o.halo.material.opacity = (0.22 + 0.08 * Math.sin(o.t * 3)) * o.k;
    o.leaves.forEach((l, i) => { const a = o.t * 1.6 + i * Math.PI; l.position.set(Math.cos(a) * 0.2, 0.08 * Math.sin(o.t * 4 + i), Math.sin(a) * 0.2); l.rotation.set(0.6, -a, 0.5 + 0.3 * Math.sin(o.t * 5 + i)); });
    let edge = false;
    for (const e of world.entities()) {
      if (e.partyIndex === undefined || !(e.hp > 0)) continue;
      const d = Math.hypot(e.x - sp.x, e.z - sp.z);
      if (Math.abs(d - sp.area) < 1.2) edge = true;
    }
    o.ring.position.set(o.g.position.x, 0.04, o.g.position.z);
    o.ring.scale.setScalar(sp.area);
    o.ring.material.opacity += ((edge ? 0.45 : 0) - o.ring.material.opacity) * Math.min(1, dt * 5);
  }
  // ---- kit 1.11 combos (A3 to A13): small marks on what the combo changed.
  bus.on('review_pollen_carry', (ev) => { const e = byId(ev.target); if (e) { burst(e.x, 0.6, e.z, POLLEN, 6, 0.12); dustDots(ev.target, ev.secs); } }); // A4
  bus.on('review_gust_rain', (ev) => { // A10: rain drops ride the wind
    const o = k3.get(ev.id);
    if (!o) return;
    for (let i = 0; i < 12; i++) {
      const m = sprite(WATER, false);
      m.scale.setScalar(0.16);
      m.userData = { x: ((i + 0.5) / 12 - 0.5) * 2.8, y: 0.25 + (i % 3) * 0.18, ph: i * 1.7 };
      o.g.add(m);
      o.motes.push(m);
    }
  });
  bus.on('review_gale_seed', (ev) => { burst(ev.x, 0.3, ev.z, LEAF_LIGHT, 6, 0.1); ringPart(ev.x, ev.z, 0.45, LEAF_LIGHT, 0.4, 0.5, 0.7); }); // A3
  bus.on('review_pollen_feed', (ev) => { // A5: a pollen mote from the foe to the ally
    const f = byId(ev.foe);
    if (!f) return;
    burst(f.x, 0.7, f.z, POLLEN, 2, 0.06);
    const s = sprite(POLLEN);
    s.scale.setScalar(0.12);
    root.add(s);
    parts.push({ s, target: ev.target, from: new Vector3(f.x, 0.7, f.z), t: 0, life: 0.4, kind: 'pour', arc: 0.6 });
  });
  bus.on('review_pollen_seed', (ev) => { burst(ev.x, 0.5, ev.z, POLLEN, 10, 0.14); ringPart(ev.x, ev.z, 0.5, POLLEN, 0.5, 0.4, 0.8); }); // A11
  bus.on('review_spirit_tend', (ev) => { // A12: leaves drift from the spirit to the new plant
    ringPart(ev.x, ev.z, 0.6, LEAF_LIGHT, 0.6, 0.6, 0.85);
    for (let i = 0; i < 4; i++) {
      const l = leafMesh(i % 2 ? LEAF : LEAF_LIGHT, 1.4);
      anim(0.6, (u) => {
        const k = Math.min(1, Math.max(0, u * 1.2 - i * 0.06));
        l.position.set(ev.fromX + (ev.x - ev.fromX) * k, 1.3 - 0.9 * k + 0.4 * Math.sin(Math.PI * k), ev.fromZ + (ev.z - ev.fromZ) * k);
        l.rotation.set(u * 8 + i, u * 5, 0);
        l.material.opacity = 1 - Math.max(0, (u - 0.8) / 0.2);
      }, [l]);
    }
  });
  bus.on('review_nectar_burst', (ev) => { // A9: sticky nectar under each slowed foe
    for (const id of ev.stuck || []) {
      const ring = flat(new RingGeometry(0.3, 0.5, 24), HONEY, 0);
      anim(ev.stuckSecs || 2, (u, a) => {
        const e = byId(id);
        if (!e) { ring.material.opacity = 0; return; }
        ring.position.set(e.x, 0.04, e.z);
        ring.material.opacity = 0.6 * Math.min(1, a.t * 6) * Math.min(1, (1 - u) * 5);
      }, [ring]);
    }
  });
  bus.on('review_vine_tick', (ev) => { if (ev.dream) { const f = byId(ev.target); if (f) burst(f.x, 0.9, f.z, SPORE, 5, 0.1); } }); // A7
  bus.on('review_thicket', (ev) => { if (ev.oak) ringPart(ev.x, ev.z, ev.r * 0.9, '#8B7A55', 0.8, 0.3, 0.8); }); // A13: the oak's roots join in
  function k8Update(dt) {
    spiritUpdate(dt);
    const sim = new Map((globalThis.__reviewClouds || []).map((c) => [c.id, c]));
    for (const [id, o] of k8clouds) {
      o.t += dt;
      if (o.fade != null) o.fade += dt;
      const out = o.fade != null ? Math.max(0, 1 - o.fade / 0.5) : 1;
      const c = sim.get(id);
      if (c) o.g.position.set(c.x, 0, c.z);
      const k = Math.min(1, o.t * 3) * out;
      for (const b of o.puffs) { const d = b.userData; b.position.set(d.x + Math.sin(o.t * 0.9 + d.ph) * 0.05, d.y + Math.sin(o.t * 1.4 + d.ph) * 0.05, d.z); b.material.opacity = 0.92 * k; b.scale.setScalar(0.6 + 0.4 * k); }
      o.disc.material.opacity = 0.14 * k;
      o.edge.material.opacity = 0.45 * k;
      for (const d of o.drops) { const u = (o.t * 2.6 + d.userData.ph) % 1; d.position.set(d.userData.x, 2.2 - 2.1 * u, d.userData.z); d.material.opacity = 0.75 * k; }
      if (o.fade != null && o.fade > 0.5) { root.remove(o.g); o.g.traverse((m) => { if (m.material) m.material.dispose(); }); k8clouds.delete(id); }
    }
    for (const [id, o] of k8walls) {
      o.t += dt;
      if (o.fade != null) o.fade += dt;
      const out = o.fade != null ? Math.max(0, 1 - o.fade / 0.4) : 1;
      const k = Math.min(1, o.t * 4) * out;
      o.band.material.opacity = 0.35 * k;
      const bw = Math.min(1, o.t * 3.2), back = 1 + 2.4 * Math.pow(bw - 1, 3) + 1.4 * Math.pow(bw - 1, 2); // EFX3 overshoot
      o.sheets.forEach((m, i) => { m.material.opacity = (0.12 - i * 0.025) * k * (0.85 + 0.15 * Math.sin(o.t * 7 + i * 2)); m.scale.y = Math.max(0.05, back * out + 0.05) * (1 + 0.04 * Math.sin(o.t * 5 + i)); m.position.z = (i - 1) * 0.16 + 0.05 * Math.sin(o.t * 4 + i * 1.7); });
      for (const m of o.motes) {
        const d = m.userData;
        const u = (o.t * 0.7 * d.sp + d.ph) % 1;
        const blow = o.fade != null ? o.fade * 3.5 : 0; // EFX3: the end blows the leaves out
        m.position.set(d.x * (1 + blow * 0.3) + Math.sin(o.t * 3 + d.ph) * 0.12, 0.1 + 1.5 * u + blow * 0.4, Math.sin(o.t * 5 + d.ph) * 0.2 + (d.ph % 2 > 1 ? 1 : -1) * blow);
        if (d.leaf) m.rotation.set(o.t * 6 + d.ph, o.t * 4, 0);
        m.material.opacity = 0.85 * k * Math.sin(Math.PI * u);
      }
      if (o.fade != null && o.fade > 0.4) { root.remove(o.g); o.g.traverse((m) => { if (m.material) m.material.dispose(); }); k8walls.delete(id); }
    }
    const lf = new Map((globalThis.__reviewWallLeaves || []).map((q) => [q.id, q]));
    for (const [id, o] of k8leaves) {
      o.t += dt;
      const q = lf.get(id);
      if (q) { o.l.position.set(q.x, 0.6 + 0.15 * Math.sin(o.t * 8), q.z); o.glow.position.copy(o.l.position); }
      o.l.rotation.set(o.t * 9, o.t * 6, 0);
      o.glow.material.opacity = 0.6;
    }
    for (const [id, s] of sleepers) {
      s.t += dt;
      s.next -= dt;
      const e = byId(id);
      if (!e || !(e.hp > 0)) { sleepers.delete(id); continue; }
      s.jolt = Math.max(0, (s.jolt || 0) - dt * 3);
      if (s.next <= 0 && zTex) {
        s.next = 0.55;
        const z = new Sprite(new SpriteMaterial({ map: zTex, color: FLOWER, transparent: true, depthWrite: false, opacity: 0 }));
        const k = 0.22 + 0.08 * ((s.t * 3) % 2);
        z.scale.setScalar(k);
        anim(1.3, (u) => { z.position.set(e.x + 0.25 + 0.25 * Math.sin(u * 5), 1.1 + u * 0.8, e.z); z.material.opacity = 0.9 * Math.min(1, u * 5) * (1 - u); }, [z]);
      }
    }
  }
  // ---- REVIEW-ONLY: kit 2.0 looks (rows L1 to L29): heals Bright Heal and blossom pink, her damage the
  // darker greens, acorns wood, pollen yellow. Dim and small: the old parts stay the main show.
  const k20Fly = new Map(); // flyer id -> { core, glow, tail[], hist[], kind }
  const k20Marks = new Map(); // `${target}|${kind}` -> { ring, left, t, id, y }
  const k20Lanes = new Map();
  const K20C = { blossom: BLOSSOM, mote: PALETTE.brightHeal, spirit: LEAF_LIGHT, blade: LEAF_LIGHT, fruit: '#E8A6AE' }; // kit 2.1: the Snapjaw's fruit
  bus.on('review_k20_fly', (ev) => {
    const heal = !ev.foe;
    const core = sprite(K20C[ev.kind] || PALETTE.brightHeal);
    const glow = sprite(heal ? PALETTE.brightHeal : DT.LANTERN); // round 2: her damage in lantern gold
    const tail = [0, 1].map(() => sprite(heal ? PALETTE.brightHeal : DT.LANTERN));
    for (const x of [core, glow, ...tail]) root.add(x);
    const trail = dreamTrail(root, heal ? PALETTE.brightHeal : DT.LANTERN, 0, 0.05, 0.8, false, 1.6); // round 2: Wispfall's comet tail
    k20Fly.set(ev.id, { core, glow, tail, trail, hist: [], kind: ev.kind, t: 0, heal });
  });
  bus.on('review_k20_fly_end', (ev) => {
    const o = k20Fly.get(ev.id);
    if (!o) return;
    if (ev.landed) {
      const e = byId(ev.target);
      if (e) { if (o.heal) burst(e.x, 0.6, e.z, PALETTE.brightHeal, 5, 0.09); else sparks(e.x, 0.6, e.z, 6); }
      if (e && o.kind === 'blossom') burst(e.x, 0.7, e.z, BLOSSOM, 3, 0.08);
    }
    for (const x of [o.core, o.glow, ...o.tail]) { root.remove(x); x.material.dispose(); }
    o.trail.dispose();
    k20Fly.delete(ev.id);
  });
  bus.on('review_k20_shot', (ev) => {
    const acorn = ev.kind === 'acorn';
    const s = acorn ? sprite(WOOD, false) : sprite(DT.LANTERN); // round 2: her damage in lantern gold
    s.scale.setScalar(acorn ? 0.22 : 0.16);
    root.add(s);
    parts.push({ s, target: ev.target, from: new Vector3(ev.x, ev.h ?? 0.5, ev.z), t: 0, life: acorn ? 0.32 : 0.22, kind: 'pour', arc: acorn ? 0.5 : 0.08 });
    if (acorn) {
      const tx = ev.tx, tz = ev.tz, r = ev.r || 1;
      setTimeout(() => { burst(tx, 0.25, tz, WOOD, 5, 0.09); sparks(tx, 0.3, tz, 4); ringPart(tx, tz, r, RIM_DMG, 0.35, 0.15, 0.6); }, 300);
    }
  });
  const K20HIT = {
    petal: [BLOSSOM, 12, 0.11], slam: [WHITE_GOLD, 7, 0.12], razor: [LEAF_LIGHT, 4, 0.08], pierce: [LEAF_LIGHT, 4, 0.08],
    pollen: [POLLEN, 9, 0.1], wispfire: [PALETTE.brightHeal, 6, 0.1], thornmoss: [THORN_PALE, 5, 0.08], dream: [SPORE, 4, 0.08], dash: [DT.LANTERN, 6, 0.09],
  };
  bus.on('review_k20_hit', (ev) => {
    const [c, n, sz] = K20HIT[ev.kind] || [DMG, 5, 0.09];
    burst(ev.x, 0.45, ev.z, c, n, sz);
    if (ev.kind === 'petal' || ev.kind === 'pollen') ringPart(ev.x, ev.z, ev.r, c, 0.5, 0.1, 0.6);
    else if (ev.kind === 'slam' || ev.kind === 'dash' || ev.kind === 'wispfire') ringPart(ev.x, ev.z, ev.r || 0.6, ev.kind === 'slam' ? WHITE_GOLD : RIM_DMG, 0.3, 0.6, 0.7);
    if (ev.kind === 'wispfire' || ev.kind === 'dash' || ev.kind === 'thornmoss') burst(ev.x, 0.4, ev.z, DT.ARCANE, 3, 0.07); // round 2: the arcane purple sparkle at her hits
  });
  bus.on('review_k20_heal', (ev) => {
    const e = byId(ev.target);
    if (!e) return;
    const c = ev.kind === 'fruit' ? BLOSSOM : ev.kind === 'wet' || ev.kind === 'cling' ? WATER : PALETTE.brightHeal;
    burst(e.x, 0.6, e.z, c, ev.kind === 'fruit' ? 7 : 3, ev.kind === 'fruit' ? 0.11 : 0.07);
    if (ev.kind === 'fruit') burst(e.x, 0.9, e.z, PALETTE.brightHeal, 4, 0.09);
  });
  const K20MARK = { thorns: [THORN_PALE, 0.3], choke: [DMG_DEEP, 0.34], tangle: [LEAF, 0.38], slow: [WATER, 0.42], haste: [PALETTE.brightHeal, 0.46], keep: [LEAF_LIGHT, 0.5], exposed: [DMG_DEEP, 0.54], atk: [BLOSSOM, 0.58], dmg: ['#E9B872', 0.62] }; // kit 2.3: damage buff (honey) // Kesh 18 Nov: 减防 (Firefly Swarm), attack speed (Dewfall)
  bus.on('review_k20_status', (ev) => {
    const [c, r] = K20MARK[ev.kind] || [DMG, 0.4];
    const key = `${ev.target}|${ev.kind}`;
    let m = k20Marks.get(key);
    if (!m) {
      const ring = flat(new RingGeometry(r - 0.035, r, ev.kind === 'thorns' || ev.kind === 'choke' ? 6 : 32), c, 0);
      root.add(ring);
      m = { ring, id: ev.target, t: 0, y: 0.06 + 0.01 * Object.keys(K20MARK).indexOf(ev.kind) };
      k20Marks.set(key, m);
    }
    m.left = ev.secs;
  });
  bus.on('review_k20_choke', (ev) => {
    const a = byId(ev.from);
    for (let i = 0; i < 3; i++) {
      const s = sprite(i ? DT.LANTERN : DT.ARCANE); // round 2: her damage in lantern gold with arcane
      s.scale.setScalar(0.12);
      root.add(s);
      parts.push({ s, target: ev.target, from: a ? new Vector3(a.x, 0.3, a.z) : null, t: -i * 0.06, life: 0.4, kind: 'pour', arc: 0.1 });
    }
  });
  bus.on('review_k20_lane', (ev) => {
    const g = new Group();
    const bed = flat(new PlaneGeometry(ev.width, ev.len), PALETTE.brightHeal, 0); // dream loop: green, not blue
    bed.position.y = 0.03;
    g.add(bed);
    g.position.set(ev.x + ev.dx * ev.len / 2, 0, ev.z + ev.dz * ev.len / 2);
    g.rotation.y = Math.atan2(ev.dx, ev.dz);
    root.add(g);
    k20Lanes.set(ev.id, { g, bed, t: 0, life: ev.secs, glint: 0, ev });
  });
  bus.on('review_k20_lane_end', (ev) => { const o = k20Lanes.get(ev.id); if (o) o.end = 0; });
  bus.on('review_k20_fallheal', (ev) => {
    const head = sprite(PALETTE.brightHeal);
    head.scale.setScalar(0.32);
    root.add(head);
    const tail = [0, 1, 2].map(() => { const t = sprite(PALETTE.brightHeal); t.scale.setScalar(0.18); root.add(t); return t; });
    parts.push({ s: head, kind: 'dive', t: 0, life: ev.secs, x: ev.x, z: ev.z, tail });
  });

  // ---- REVIEW-ONLY: kit 2.1 (Kesh 18 Nov): S71 Snapjaw (a stand-in flytrap) and S70 Rootweb (root lines) ----
  const snapObjs = new Map();
  const SNAP_GREEN = '#7FB069';
  const SNAP_INSIDE = '#E8A6AE';
  bus.on('review_snap', (ev) => {
    const g = new Group();
    const base = new Mesh(new CylinderGeometry(0.16, 0.22, 0.12, 9), mat('#C9A46A')); // honey wood, like her other plants
    base.position.y = 0.06;
    const stem = new Mesh(new CylinderGeometry(0.05, 0.07, 0.42, 7), mat('#6E9A4E'));
    stem.position.y = 0.3;
    const head = new Group();
    head.position.y = 0.55;
    const jaw = (up) => {
      const pv = new Group();
      const shell = new Mesh(new SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(SNAP_GREEN, 1, { emissive: '#2E6B34', emissiveIntensity: 0.25 }));
      const lip = new Mesh(new SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(SNAP_INSIDE, 1, { side: DoubleSide }));
      lip.scale.y = 0.6;
      if (!up) { shell.rotation.x = Math.PI; lip.rotation.x = Math.PI; }
      pv.add(shell, lip);
      return pv;
    };
    const top = jaw(true);
    const bot = jaw(false);
    head.add(top, bot);
    const ribbon = new Mesh(new CylinderGeometry(0.075, 0.075, 0.05, 8), mat('#C8643C')); // her terracotta ribbon
    ribbon.position.y = 0.45;
    g.add(base, stem, ribbon, head);
    const big = 1 + 0.15 * (ev.ate || 0);
    const ring = rimGlow(ev.reach / big, RIM_DMG, 0); // the group is scaled by big
    ring.position.y = 0.03;
    g.add(ring);
    const sm = makeSnapjaw(); // Kesh's model (18 Nov); the stand-in if it has not loaded
    let turn = null, lunge = null;
    if (sm) {
      for (const m of [base, stem, ribbon, head]) m.visible = false;
      turn = new Group();
      lunge = new Group();
      lunge.add(sm);
      turn.add(lunge);
      g.add(turn);
    }
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    snapObjs.set(ev.id, { g, head, top, bot, ring, turn, lunge, t: 0, grow: ev.grow || 0.4, big, bite: null, end: null, aim: 0 });
    burst(ev.x, 0.15, ev.z, '#8CC46E', 6, 0.1);
  });
  bus.on('review_snap_bite', (ev) => {
    const o = snapObjs.get(ev.id);
    if (!o) return;
    o.bite = 0;
    o.aim = Math.atan2(ev.x - o.g.position.x, ev.z - o.g.position.z);
    o.tx = ev.x; o.tz = ev.z;
    sparks(ev.x, 0.5, ev.z, ev.asleep ? 9 : 6); // round 2: her damage in lantern gold with arcane
  });
  bus.on('review_snap_swallow', (ev) => {
    const o = snapObjs.get(ev.id);
    if (o) burst(o.g.position.x, 0.7, o.g.position.z, '#8CC46E', 8, 0.12);
  });
  bus.on('review_snap_end', (ev) => { const o = snapObjs.get(ev.id); if (o) o.end = 0; });
  function snapUpdate(dt) {
    for (const [id, o] of snapObjs) {
      o.t += dt;
      let k = Math.min(1, o.t / o.grow) * o.big;
      if (o.end != null) { o.end += dt; k *= Math.max(0, 1 - o.end / 0.35); if (o.end > 0.35) { root.remove(o.g); snapObjs.delete(id); continue; } }
      o.g.scale.setScalar(Math.max(0.01, k));
      let open = 0.55 + 0.08 * Math.sin(o.t * 3);
      let lean = 0;
      if (o.bite != null) {
        o.bite += dt;
        const b = o.bite;
        open = b < 0.12 ? 0.9 : b < 0.22 ? 0.9 * (1 - (b - 0.12) / 0.1) : b < 1.2 ? 0.02 : 0.02 + Math.min(0.55, (b - 1.2) * 2);
        lean = b < 0.22 ? b / 0.22 : b < 1.2 ? 1 : Math.max(0, 1 - (b - 1.2) * 3);
        if (b > 1.6) o.bite = null;
      }
      o.head.rotation.y = o.aim;
      o.head.rotation.x = 0.9 * lean;
      o.head.position.z = 0;
      o.top.rotation.x = -open;
      o.bot.rotation.x = open * 0.5;
      if (o.turn) { // the model: it turns to its foe, lunges from the base and squashes shut (its jaw has no hinge)
        o.turn.rotation.y = o.aim;
        o.lunge.rotation.x = 0.45 * lean;
        const shut = Math.max(0, Math.min(1, (0.6 - open) / 0.5));
        const wide = Math.max(0, (open - 0.6) / 0.3);
        o.lunge.scale.set(1 + 0.1 * shut - 0.04 * wide, 1 - 0.14 * shut + 0.08 * wide, 1 + 0.1 * shut - 0.04 * wide);
      }
      o.ring.material.opacity = 0.16 * Math.min(1, o.t * 3);
    }
  }
  const webLines = [];
  bus.on('review_web_trip', (ev) => { burst(ev.x, 0.15, ev.z, '#9A7444', 6, 0.08); burst(ev.x, 0.3, ev.z, DMG, 3, 0.07); });
  bus.on('review_web_link', (ev) => burst(ev.x, 0.2, ev.z, PALETTE.brightHeal, 4, 0.07));
  bus.on('review_web_water', (ev) => burst(ev.x, 0.3, ev.z, WATER, 6, 0.09));
  function webUpdate(dt) {
    const links = (globalThis.__reviewWeb && globalThis.__reviewWeb.links) || [];
    while (webLines.length < links.length) {
      const ridge = flat(new PlaneGeometry(1, 1), '#8A6A3A', 0.8);
      const vein = flat(new PlaneGeometry(1, 1), PALETTE.brightHeal, 0.35);
      const pulse = sprite(PALETTE.brightHeal);
      pulse.scale.setScalar(0.28);
      root.add(ridge, vein, pulse);
      webLines.push({ ridge, vein, pulse, t: Math.random() });
    }
    webLines.forEach((w, i) => {
      const l = links[i];
      const vis = !!l;
      w.ridge.visible = w.vein.visible = w.pulse.visible = vis;
      if (!vis) return;
      const dx = l.bx - l.ax, dz = l.bz - l.az, len = Math.hypot(dx, dz) || 0.01;
      for (const [m, wd, y] of [[w.ridge, 0.22, 0.035], [w.vein, 0.08, 0.04]]) {
        m.position.set((l.ax + l.bx) / 2, y, (l.az + l.bz) / 2);
        m.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI / 2);
        m.scale.set(len, wd, 1);
      }
      w.t = (w.t + dt * 0.6) % 1;
      w.pulse.position.set(l.ax + dx * w.t, 0.12, l.az + dz * w.t);
      w.vein.material.opacity = 0.25 + 0.2 * Math.sin((w.t + i * 0.3) * Math.PI * 2);
    });
  }





  // ---- REVIEW-ONLY: the motion pass, part 2 (Kesh 18 Nov 08:47): the plants are alive ----
  // Each plant's solid parts go under one pivot at its foot. The plant's own code still grows and fades it; the pivot adds
  // the spring at birth, the breath and sway, a squash when it acts, and the wilt at the end.
  const JUICE = {
    seed: { pop: 0.5, breathe: 0.03, sway: 0.06, wilt: 0.3, lean: 0.4 },
    sapling: { pop: 0.3, breathe: 0.02, sway: 0.035, wilt: 0.5, lean: 0.5 },
    spit: { pop: 0.35, breathe: 0.03, sway: 0.05, wilt: 0.5, lean: 0.6 },
    oak: { pop: 0.14, breathe: 0.01, sway: 0.012, wilt: 0.25, lean: 0.12 },
    ling: { pop: 0.3, breathe: 0.03, sway: 0, wilt: 0.5, lean: 0.5 },
    puff: { pop: 0.4, breathe: 0.04, sway: 0.04, wilt: 0, lean: 0 },
    snap: { pop: 0.3, breathe: 0.03, sway: 0.035, wilt: 0.5, lean: 0.5 },
    lily: { pop: 0.35, breathe: 0.025, sway: 0.05, wilt: 0.5, lean: 0.6 },
    hedge: { pop: 0.2, breathe: 0.015, sway: 0, wilt: 0.4, lean: 0 },
    cloud: { pop: 0.25, breathe: 0.03, sway: 0, wilt: 0, lean: 0, float: 0.05 },
  };
  const JFLAT = new Set(['RingGeometry', 'CircleGeometry', 'PlaneGeometry', 'ShapeGeometry']);
  const juiced = [];
  function juice(o, kind) {
    const P = new Group();
    for (const c of [...o.g.children]) { if (c.isSprite || (c.isMesh && c.geometry && JFLAT.has(c.geometry.type))) continue; P.add(c); } // floor rings stay flat
    o.g.add(P);
    const r = { o, P, t: 0, ph: (Math.abs(o.g.position.x * 12.9898 + o.g.position.z * 78.233) % 6.283), kick: 0, kv: 0, k: JUICE[kind] };
    juiced.push(r);
    return r;
  }
  const jkick = (o, amt) => { if (o && o.juice) o.juice.kv += amt * 15; };
  const JK3 = { spit: 'spit', oak: 'oak', ling: 'ling', puff: 'puff' };
  function lifeUpdate(dt) {
    for (const o of kitObjs.values()) if (!o.juice && (o.kind === 'seed' || o.kind === 'sapling') && o.g) o.juice = juice(o, o.kind);
    for (const o of k3.values()) if (!o.juice && JK3[o.kind] && o.g) o.juice = juice(o, JK3[o.kind]);
    for (const o of snapObjs.values()) if (!o.juice) o.juice = juice(o, 'snap');
    for (const o of lilyObjs.values()) if (!o.juice) o.juice = juice(o, 'lily');
    for (const o of hedges.values()) if (!o.juice) o.juice = juice(o, 'hedge');
    for (const o of k8clouds.values()) if (!o.juice) o.juice = juice(o, 'cloud');
    for (let i = juiced.length - 1; i >= 0; i--) {
      const r = juiced[i], o = r.o, K = r.k;
      if (!o.g.parent) { juiced.splice(i, 1); continue; }
      const h = Math.min(dt, 0.05);
      r.t += h;
      r.kv += (-220 * r.kick - 14 * r.kv) * h; // a damped spring: a squash that bounces back
      r.kick += r.kv * h;
      const t = r.t;
      const born = K.pop * Math.exp(-5 * t) * Math.sin(15 * t); // the overshoot as it comes up
      const br = K.breathe * Math.sin(2.1 * t + r.ph);
      const end = o.fade ?? o.end;
      const w = end != null && end > 0 ? Math.min(1, end / 0.35) : 0;
      const sy = (1 + born + br - r.kick) * (1 - K.wilt * w * w);
      const sxz = 1 - 0.5 * born - 0.5 * br + 0.6 * r.kick;
      r.P.scale.set(sxz, Math.max(0.05, sy), sxz);
      r.P.rotation.z = K.sway * Math.sin(1.3 * t + r.ph) + K.lean * w * w + 0.5 * born * (K.sway ? 1 : 0) * 0.3;
      r.P.rotation.x = K.sway * 0.7 * Math.sin(1.7 * t + 2 * r.ph);
      if (K.float) r.P.position.y = K.float * Math.sin(1.6 * t + r.ph);
    }
  }
  bus.on('review_sapling_mote', (ev) => jkick(kitObjs.get(ev.id), 0.1));
  bus.on('review_sapling_grow', (ev) => jkick(kitObjs.get(ev.id), -0.3));
  bus.on('review_sapling_shed', (ev) => jkick(kitObjs.get(ev.id), 0.25));
  bus.on('review_seed_flower', (ev) => jkick(kitObjs.get(ev.id), -0.25));
  bus.on('review_spit_shot', (ev) => jkick(k3.get(ev.id), 0.12));
  bus.on('review_oak_tick', (ev) => jkick(k3.get('oak' + ev.id), 0.04));
  bus.on('review_oak_root', (ev) => jkick(k3.get('oak' + ev.id), 0.08));
  bus.on('review_ling_slam', (ev) => jkick(k3.get('ling' + ev.id), 0.3));
  bus.on('review_snap_bite', (ev) => jkick(snapObjs.get(ev.id), 0.22));
  bus.on('review_lily_open', (ev) => jkick(lilyObjs.get(ev.id), -0.3));
  bus.on('review_lily_scent', (ev) => jkick(lilyObjs.get(ev.id), 0.12));
  bus.on('review_hedge_hit', (ev) => jkick(hedges.get(ev.id), 0.15));
  for (const n of ['review_water', 'review_water2']) bus.on(n, (ev) => { // a drink: everything near it stretches up
    if (ev.x == null) return;
    for (const r of juiced) if (Math.hypot(r.o.g.position.x - ev.x, r.o.g.position.z - ev.z) <= (ev.r || 1.6)) r.kv -= 0.2 * 15;
  });
  // Her staff and paws meet the floor on the frame her move lands: dust, and a ring that says where.
  const LAND = { // skill -> [seconds after the cast, what touches down, ring size, colour, motes]
    guardian_bond: [[0.1, 'butt', 0.5, WOOD, 8]],
    wild_thicket: [[0.1, 'butt', 0.55, WOOD, 8]],
    pale_lance: [[0.1, 'butt', 0.3, WOOD, 5]],
    restorative_wave: [[0.1, 'butt', 0.22, LEAF_LIGHT, 3], [0.28, 'butt', 0.3, LEAF_LIGHT, 4]],
    rootsnare: [[0.1, 'paw', 0.4, WOOD, 6]],
    sanctuary: [[0.1, 'paw', 0.25, LEAF_LIGHT, 4]],
    lure_lily: [[0.1, 'paw', 0.2, FLOWER, 3]],
    creeping_moss: [[0.1, 'paw', 0.2, LEAF, 3]],
    swift_mend: [[0.47, 'feet', 0.4, '#C9C2AE', 6]],
    dawn_brand: [[0.36, 'feet', 0.3, '#C9C2AE', 4]],
    nectar_burst: [[0.1, 'gem', 0, POLLEN, 5]],
    rain_cloud: [[0.1, 'gem', 0, WATER, 5]],
    dewfall: [[0.1, 'gem', 0, WATER, 4]],
  };
  const landV = new Vector3();
  bus.on('skill_cast', (ev) => {
    const L = !ev.classId && LAND[ev.skill];
    if (!L) return;
    for (const [at, what, r, color, n] of L) {
      let done = false;
      anim(at + 0.02, (u) => {
        if (u < 1 || done) return;
        done = true;
        const p = world.player, st = typeof window !== 'undefined' ? window.__tripo : null;
        if (!p) return;
        landV.set(p.x, 0, p.z);
        if (st && st.model) {
          if (what === 'butt' && st.staff) landV.set(0, 0.02, 0).applyMatrix4(st.staff.matrixWorld);
          else if (what === 'gem' && st.staff) landV.set(0, 0.8, 0).applyMatrix4(st.staff.matrixWorld);
          else if (what === 'paw') { const h = st.model.getObjectByName('handL'); if (h) h.getWorldPosition(landV); }
        }
        if (what === 'gem') { burst(landV.x, landV.y, landV.z, color, n, 0.1); return; }
        ringPart(landV.x, landV.z, r * 0.5, color, 0.35, 1.2, 0.7);
        burst(landV.x, 0.08, landV.z, color, n, 0.09);
      });
    }
  });
  // ---- REVIEW-ONLY: the motion pass (Kesh 18 Nov 08:47): her body answers her own skills ----
  for (const n of ['review_fall_break', 'review_fall_end', 'review_fall_stack', 'review_sl_home', 'review_snare_clench', 'review_wisp']) bus.on(n, (ev) => { if (typeof window !== 'undefined' && window.__tripo && window.__tripo.react) window.__tripo.react(n, ev); });
  // ---- REVIEW-ONLY: Kesh 18 Nov 08:12: the Snapjaw's bite mark and drag ----
  const BITE_TOOTH = new ConeGeometry(0.06, 0.2, 3);
  const biteMarks = new Map();
  function biteMark() {
    const g = new Group();
    const teeth = new Group();
    for (let k = 0; k < 10; k++) { // two rows of teeth closing on the foe, like the jaws seen from above
      const top = k < 5;
      const a = (top ? 0.25 : Math.PI + 0.25) + ((k % 5) / 4) * (Math.PI - 0.5);
      const t = new Mesh(BITE_TOOTH, new MeshBasicMaterial({ color: DMG, transparent: true, opacity: 0.9, depthWrite: false }));
      t.position.set(0.5, 0.04, 0);
      t.rotation.z = Math.PI / 2; // the tip points in, toward the foe
      const pv = new Group();
      pv.rotation.y = -a;
      pv.add(t);
      teeth.add(pv);
    }
    const ring = rimGlow(0.56, RIM_DMG, 0.6);
    ring.position.y = 0.03;
    const pin = new Mesh(new ConeGeometry(0.09, 0.2, 4), new MeshBasicMaterial({ color: DMG, transparent: true, opacity: 0.9, depthWrite: false })); // a marker over its head
    pin.rotation.x = Math.PI;
    pin.position.y = 1.55;
    g.add(ring, teeth, pin);
    root.add(g);
    return { g, teeth, ring, pin, t: 0, bite: null };
  }
  bus.on('review_snap_aim', (ev) => {
    const old = biteMarks.get(ev.id);
    if (old) { root.remove(old.g); biteMarks.delete(ev.id); }
    if (ev.target == null) return;
    const m = biteMark();
    m.target = ev.target;
    biteMarks.set(ev.id, m);
  });
  bus.on('review_snap_bite', (ev) => { const m = biteMarks.get(ev.id); if (m) m.bite = 0; });
  bus.on('review_snap_drag', (ev) => { // a green tug line from the jaws to the foe while it is dragged
    const o = snapObjs.get(ev.id);
    for (let k = 0; k < 6; k++) {
      const u = k / 5;
      const s = sprite(DT.LANTERN); // round 2: lantern gold
      s.scale.setScalar(0.12);
      root.add(s);
      parts.push({ s, kind: 'fly', from: new Vector3(ev.x + (ev.tx - ev.x) * u, 0.35, ev.z + (ev.tz - ev.z) * u), vel: new Vector3((ev.tx - ev.x) * 2, 0.2, (ev.tz - ev.z) * 2), t: 0, life: 0.3 });
    }
    burst(ev.x, 0.3, ev.z, '#9A7444', 5, 0.08);
  });
  bus.on('review_snap_end', (ev) => { const m = biteMarks.get(ev.id); if (m) { root.remove(m.g); biteMarks.delete(ev.id); } });
  function biteUpdate(dt) {
    for (const [id, m] of biteMarks) {
      const e = byId(m.target);
      if (!e || !(e.hp > 0)) { root.remove(m.g); biteMarks.delete(id); continue; }
      m.t += dt;
      m.g.position.set(e.x, 0, e.z);
      let close = 0.15 + 0.1 * Math.sin(m.t * 6); // the teeth twitch while it waits
      if (m.bite != null) { m.bite += dt; close = m.bite < 0.15 ? 0.15 + (m.bite / 0.15) * 0.85 : Math.max(0.15, 1 - (m.bite - 0.15) * 1.5); if (m.bite > 0.8) m.bite = null; }
      m.teeth.scale.setScalar(1 - 0.45 * close);
      m.teeth.rotation.y = 0;
      m.ring.material.opacity = 0.5 + 0.4 * close;
      m.pin.position.y = 1.55 + 0.08 * Math.sin(m.t * 5);
    }
  }
  // ---- REVIEW-ONLY: kit 2.3b (Kesh 18 Nov): S10 Swiftleaf (three leaves) and S73 Petal Twister ----
  const SL_LEAF = new SphereGeometry(0.17, 8, 5);
  SL_LEAF.scale(0.5, 0.09, 1.25);
  const slObjs = new Map();
  function slLeaf() {
    const g = new Group();
    const m = new Mesh(SL_LEAF, mat(LEAF_LIGHT, 1, { emissive: PALETTE.brightHeal, emissiveIntensity: 0.18 }));
    const rib = new Mesh(new PlaneGeometry(0.02, 0.36), new MeshBasicMaterial({ color: '#F4FFE0', transparent: true, opacity: 0.7, depthWrite: false, side: DoubleSide }));
    rib.rotation.x = -Math.PI / 2;
    rib.position.y = 0.02;
    m.add(rib);
    g.add(m);
    const glow = sprite(PALETTE.brightHeal);
    glow.scale.setScalar(0.3);
    g.add(glow);
    root.add(g);
    g.scale.setScalar(0.01);
    return { g, m, glow, trail: 0, last: null };
  }
  bus.on('review_sl', (ev) => {
    const o = { leaves: [slLeaf(), slLeaf(), slLeaf()], t: 0, shadow: flat(new RingGeometry(0.01, 0.16, 16), '#1A2416', 0), floor: null, flash: 0 };
    o.shadow.position.y = 0.02;
    root.add(o.shadow);
    slObjs.set(ev.id, o);
    const a = byId(ev.target);
    burst(ev.sx, 1.0, ev.sz, PALETTE.brightHeal, 5, 0.08); // the leaves peel off the gem
  });
  bus.on('review_sl_launch', (ev) => { // the three ribbons draw one big leaf on the floor: two edges and the midrib
    const o = slObjs.get(ev.id);
    if (!o) return;
    const N = 18, pts = [];
    const ctl = (k) => ({ x: (ev.sx + ev.tx) / 2 + ev.px * ev.side * k, z: (ev.sz + ev.tz) / 2 + ev.pz * ev.side * k });
    const cur = (k, u) => { const c = ctl(k); return [bez2(ev.sx, c.x, ev.tx, u), bez2(ev.sz, c.z, ev.tz, u)]; };
    for (let i = 0; i <= N; i++) pts.push(cur(-1, i / N));
    for (let i = N; i >= 0; i--) pts.push(cur(1, i / N));
    const sh = new Shape();
    sh.moveTo(pts[0][0], -pts[0][1]);
    for (const p of pts.slice(1)) sh.lineTo(p[0], -p[1]);
    const fill = new Mesh(new ShapeGeometry(sh), new MeshBasicMaterial({ color: PALETTE.brightHeal, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.025;
    const dx = ev.tx - ev.sx, dz = ev.tz - ev.sz, len = Math.hypot(dx, dz) || 0.01;
    const rib = flat(new PlaneGeometry(1, 1), '#F4FFE0', 0);
    rib.position.set((ev.sx + ev.tx) / 2, 0.03, (ev.sz + ev.tz) / 2);
    rib.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI / 2);
    rib.scale.set(len, 0.05, 1);
    root.add(fill, rib);
    o.floor = { fill, rib, t: 0 };
  });
  const bez2 = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
  bus.on('review_sl_meet', (ev) => {
    const o = slObjs.get(ev.id);
    if (o) o.flash = 0.01;
    // dream loop: no floor rings; reviewMossFx.js draws the meeting
    if (ev.seeds) burst(ev.x, 0.8, ev.z, BLOSSOM, 6 + 3 * ev.seeds, 0.11); // the seeds burst into blossom
    if (ev.wet) { burst(ev.x, 0.5, ev.z, WATER, 10, 0.1); ringPart(ev.x, ev.z, 1.5, WATER, 0.5, 0.15, 0.7); }
    // dream loop: the 1.5 u cut ring is off (Kesh's repaint has no floor rings)
  });
  bus.on('review_sl_wet', (ev) => burst(ev.x, 0.6, ev.z, WATER, 5, 0.08));
  bus.on('review_sl_dusty', (ev) => { const o = slObjs.get(ev.id); if (o) { const l = o.leaves[ev.k + 1]; l.dusty = true; l.m.material.emissive.set(POLLEN); } });
  bus.on('review_sl_part', (ev) => { const o = slObjs.get(ev.id); if (o) o.parted = 0; });
  bus.on('review_sl_on', (ev) => { if (ev.target != null) { burst(ev.x, 0.7, ev.z, PALETTE.brightHeal, 7, 0.09); ringPart(ev.x, ev.z, 0.5, PALETTE.brightHeal, 0.35, 0.8, 0.7); } });
  bus.on('review_sl_home', (ev) => { // she catches it on the staff; the gem blinks
    const L = (globalThis.__reviewLeaves || []).find((q) => q.id === ev.id);
    const o = slObjs.get(ev.id);
    const l = o && o.leaves[2];
    if (l) { const p = l.g.position; burst(p.x, p.y + 0.1, p.z, '#F4FFE0', 6, 0.08); ringPart(p.x, p.z, 0.4, PALETTE.brightHeal, 0.3, 1.0, 0.7); }
  });
  bus.on('review_sl_end', (ev) => { const o = slObjs.get(ev.id); if (o) o.done = 0; });
  function slUpdate(dt) {
    const live = globalThis.__reviewLeaves || [];
    for (const [id, o] of slObjs) {
      o.t += dt;
      const L = live.find((q) => q.id === id);
      if (o.floor) { o.floor.t += dt; const k = Math.max(0, 1 - Math.abs(o.floor.t - 0.25) / 0.3); o.floor.fill.material.opacity = 0; o.floor.rib.material.opacity = 0; if (o.floor.t > 0.6) { root.remove(o.floor.fill, o.floor.rib); o.floor = null; } }
      if (!L || o.done != null) {
        o.done = (o.done || 0) + dt;
        for (const l of o.leaves) l.g.scale.setScalar(Math.max(0.01, (l.s || 1) * (1 - o.done / 0.2)));
        if (o.done > 0.2) { for (const l of o.leaves) root.remove(l.g); root.remove(o.shadow); slObjs.delete(id); }
        continue;
      }
      L.leaf.forEach((f, j) => {
        const l = o.leaves[j];
        if (!f.on && L.phase === 'part') { l.s = Math.max(0, (l.s ?? 1) - dt * 5); l.g.scale.setScalar(Math.max(0.01, l.s)); return; }
        l.g.position.set(f.x, f.y, f.z);
        l.m.visible = false; l.glow.visible = false; // dream loop: reviewMossFx.js draws the leaves
        const flying = L.phase === 'fly' || (L.phase === 'part' && j !== 1);
        let s = L.phase === 'wind' ? Math.min(1, o.t / 0.1) : 1;
        if (f.k === 0 && L.phase === 'fly') s = 1 + 0.5 * Math.min(1, Math.max(0, (f.y - 1.0) / 1.2)); // the high leaf grows as it climbs
        if (L.phase === 'part' && j === 1) s = 0.6; // the sprig leaf
        l.s = s;
        l.g.scale.setScalar(s);
        l.m.rotation.y += dt * (flying ? 22 : L.phase === 'pin' ? 14 : 4); // spins like a thrown blade
        l.m.rotation.z = flying ? 0.5 : 0.2;
        l.glow.material.opacity = L.phase === 'pin' ? 0.55 : 0.25; // bright only at the meeting
        if (flying || L.phase === 'pin') { // a ribbon of small leaves behind each
          l.trail += dt;
          if (l.trail > 0.03 && false) { // dream loop: ribbons in reviewMossFx.js
            l.trail = 0;
            const sp = sprite(l.dusty ? POLLEN : LEAF_LIGHT);
            sp.scale.setScalar(0.09);
            root.add(sp);
            parts.push({ s: sp, kind: 'fly', from: new Vector3(f.x, f.y, f.z), vel: new Vector3((Math.random() - 0.5) * 0.3, -0.25, (Math.random() - 0.5) * 0.3), t: 0, life: 0.35 });
          }
        }
        if (f.k === 0) { o.shadow.position.set(f.x, 0.02, f.z); o.shadow.material.opacity = L.phase === 'fly' ? 0.35 : 0; }
      });
    }
  }
  // S73 Petal Twister: petals and pollen spin up a cone; wind lines; lifted seeds spin inside.
  const twObjs = new Map();
  bus.on('review_twister', (ev) => {
    const g = new Group();
    const ring = flat(new RingGeometry(ev.r - 0.05, ev.r, 64), POLLEN, 0);
    ring.position.y = 0.03;
    const disc = flat(new RingGeometry(0.01, ev.r, 48), BLOSSOM, 0);
    disc.position.y = 0.025;
    g.add(ring, disc);
    const petals = [];
    for (let i = 0; i < 30; i++) {
      const sp = sprite(i % 3 === 0 ? POLLEN : BLOSSOM, false);
      sp.scale.setScalar(0.1 + 0.05 * (i % 2));
      g.add(sp);
      petals.push({ sp, h: (i / 30) * 1.8, a: Math.random() * 6.28, v: 4 + Math.random() * 2 });
    }
    const winds = [];
    for (let i = 0; i < 3; i++) {
      const w = flat(new RingGeometry(0.4 + i * 0.35, 0.44 + i * 0.35, 32, 1, 0, Math.PI * 1.2), '#F4F1E4', 0);
      w.position.y = 0.4 + i * 0.5;
      g.add(w);
      winds.push(w);
    }
    g.position.set(ev.x, 0, ev.z);
    root.add(g);
    twObjs.set(ev.id, { g, ring, disc, petals, winds, seeds: [], t: 0, end: null, spores: false, r: ev.r });
    burst(ev.x, 0.4, ev.z, BLOSSOM, 10, 0.12);
  });
  bus.on('review_twister_lift', (ev) => {
    const o = twObjs.get(ev.id);
    if (!o) return;
    const sm = makeSeed();
    const s = sm || new Mesh(new IcosahedronGeometry(0.07, 0), mat('#8FD08A'));
    o.g.add(s);
    o.seeds.push(s);
  });
  bus.on('review_twister_throw', (ev) => {
    const o = twObjs.get(ev.id);
    if (o && o.seeds.length) o.g.remove(o.seeds.pop());
    const s = sprite(LEAF_LIGHT);
    s.scale.setScalar(0.16);
    root.add(s);
    parts.push({ s, kind: 'fly', from: new Vector3(ev.fromX, 1.0, ev.fromZ), vel: new Vector3((ev.x - ev.fromX) / 0.35, 1.2, (ev.z - ev.fromZ) / 0.35), t: 0, life: 0.35 });
    burst(ev.x, 0.3, ev.z, FLOWER, 6, 0.1);
  });
  bus.on('review_twister_blown', (ev) => { const o = twObjs.get(ev.id); if (o) { const p = o.g.position; burst(p.x, 0.8, p.z, '#F4F1E4', 10, 0.12); } });
  bus.on('review_twister_spores', (ev) => { const o = twObjs.get(ev.id); if (o) { o.spores = true; for (const pt of o.petals) if (Math.random() < 0.4) pt.sp.material.color.set(SPORE); } });
  bus.on('review_twister_end', (ev) => { const o = twObjs.get(ev.id); if (o) o.end = 0; });
  function twUpdate(dt) {
    const live = globalThis.__reviewTwisters || [];
    for (const [id, o] of twObjs) {
      o.t += dt;
      const w = live.find((q) => q.id === id);
      if (w) o.g.position.set(w.x, 0, w.z);
      let k = Math.min(1, o.t / 0.3);
      if (o.end != null) { o.end += dt; k *= Math.max(0, 1 - o.end / 0.4); if (o.end > 0.4) { root.remove(o.g); twObjs.delete(id); continue; } }
      o.ring.material.opacity = 0.5 * k;
      o.disc.material.opacity = 0.08 * k;
      for (const pt of o.petals) {
        pt.a += dt * pt.v;
        pt.h = (pt.h + dt * 0.9) % 1.8;
        const rad = (0.25 + 0.55 * (pt.h / 1.8)) * (o.r / 2.2) * 1.6;
        pt.sp.position.set(Math.cos(pt.a) * rad, 0.1 + pt.h, Math.sin(pt.a) * rad);
        pt.sp.material.opacity = 0.55 * k * Math.min(1, (1.8 - pt.h) * 2);
      }
      o.winds.forEach((wl, i) => { wl.rotation.z += dt * (5 - i); wl.material.opacity = 0.3 * k; });
      o.seeds.forEach((s, i) => { const a = o.t * 5 + i * 2.1; s.position.set(Math.cos(a) * 0.45, 0.7 + 0.15 * Math.sin(o.t * 3 + i), Math.sin(a) * 0.45); s.rotation.y += dt * 8; });
    }
  }
  // ---- REVIEW-ONLY: kit 2.3 (Kesh 18 Nov 06:28) ----
  // Wispfall channel: the ring under her brightens with each wisp; a break shatters it.
  bus.on('review_fall_stack', (ev) => {
    const o = k3.get(ev.id);
    if (!o) return;
    o.mul = ev.mul;
    const p = o.g.position;
    burst(p.x, 0.9, p.z, WHITE_GOLD, 2, 0.07);
  });
  bus.on('review_fall_break', (ev) => {
    burst(ev.x, 0.5, ev.z, WHITE_GOLD, 12, 0.12);
    ringPart(ev.x, ev.z, 1.2, WHITE_GOLD, 0.4, 1.2, 0.8);
  });
  // Creeping Moss: the hit is shared along the Moss (moss motes from the hit ally to the others).
  bus.on('review_creep_share', (ev) => {
    const a = byId(ev.from);
    if (!a) return;
    for (const id of ev.to) for (let i = 0; i < 3; i++) {
      const s = sprite(LEAF_LIGHT);
      s.scale.setScalar(0.11);
      root.add(s);
      parts.push({ s, target: id, from: new Vector3(a.x, 0.6, a.z), t: -i * 0.05, life: 0.35, kind: 'pour', arc: 0.3 });
    }
  });
  bus.on('review_creep_link', (ev) => {
    const a = byId(ev.from);
    if (!a) return;
    for (const id of ev.to) for (let i = 0; i < 3; i++) {
      const s = sprite(DMG_DEEP);
      s.scale.setScalar(0.12);
      root.add(s);
      parts.push({ s, target: id, from: new Vector3(a.x, 0.5, a.z), t: -i * 0.05, life: 0.3, kind: 'pour', arc: 0.25 });
    }
  });
  bus.on('review_water2', (ev) => { burst(ev.x, 0.35, ev.z, WATER, 8, 0.1); ringPart(ev.x, ev.z, 0.6, WATER, 0.4, 0.8, 0.7); }); // double watering
  // ---- REVIEW-ONLY: kit 2.2 (Kesh 18 Nov): S72 Lure Lily (a stand-in lily until its Tripo model) ----
  const lilyObjs = new Map();
  const lilyLures = new Map(); // foe id -> { lily, line, left }
  const LILY_PETAL = '#EFC9D3'; // a soft pink, so it does not bloom white
  bus.on('review_lily', (ev) => {
    const g = new Group();
    const base = new Mesh(new CylinderGeometry(0.17, 0.23, 0.12, 9), mat('#C9A46A')); // honey wood, like her other plants
    base.position.y = 0.06;
    const stem = new Mesh(new CylinderGeometry(0.045, 0.06, 0.5, 7), mat('#6E9A4E'));
    stem.position.y = 0.34;
    const ribbon = new Mesh(new CylinderGeometry(0.07, 0.07, 0.05, 8), mat('#C8643C')); // her terracotta ribbon
    ribbon.position.y = 0.42;
    const head = new Group();
    head.position.y = 0.6;
    const petals = [];
    for (let i = 0; i < 6; i++) {
      const pv = new Group();
      pv.rotation.y = (i / 6) * Math.PI * 2;
      const p = new Mesh(new SphereGeometry(0.2, 8, 6), mat(LILY_PETAL, 1, { emissive: BLOSSOM, emissiveIntensity: 0.05 }));
      p.scale.set(0.45, 0.12, 1);
      p.position.z = 0.2;
      const arm = new Group();
      arm.add(p);
      pv.add(arm);
      head.add(pv);
      petals.push(arm);
    }
    const bud = new Mesh(new IcosahedronGeometry(0.08, 0), mat('#BFE8B0', 1, { emissive: '#7FC48A', emissiveIntensity: 0.5 })); // her pale green crystal bud
    bud.position.y = 0.04;
    head.add(bud);
    g.add(base, stem, ribbon, head);
    const lureRing = rimGlow(ev.lureR, BLOSSOM, 0);
    lureRing.position.y = 0.03;
    const burstRing = rimGlow(ev.burstR, RIM_DMG, 0);
    burstRing.position.y = 0.035;
    g.add(lureRing, burstRing);
    const lm = makeLily(); // Kesh's model (18 Nov); the stand-in if it has not loaded
    let bloom = null;
    if (lm) {
      for (const m of [base, stem, ribbon, head]) m.visible = false;
      bloom = new Group();
      bloom.add(lm);
      bloom.rotation.y = Math.atan2(ev.fromX - ev.x, ev.fromZ - ev.z); // it opens toward her
      g.add(bloom);
    }
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    lilyObjs.set(ev.id, { g, head, petals, bud, bloom, lureRing, burstRing, t: 0, open: ev.open || 0.4, secs: ev.secs, opened: null, end: null, snap: null, scent: 0 });
    burst(ev.x, 0.15, ev.z, LEAF_LIGHT, 6, 0.1);
  });
  bus.on('review_lily_open', (ev) => {
    const o = lilyObjs.get(ev.id);
    if (!o) return;
    o.opened = 0;
    const p = o.g.position;
    ringPart(p.x, p.z, 1, BLOSSOM, 0.7, 3, 0.7); // the scent rolls out to 4 u
    burst(p.x, 0.9, p.z, BLOSSOM, 10, 0.12);
    if (ev.ate) burst(p.x, 0.7, p.z, PALETTE.brightHeal, 4 + 2 * ev.ate, 0.1);
  });
  bus.on('review_lily_scent', (ev) => {
    const o = lilyObjs.get(ev.id);
    if (!o) return;
    const p = o.g.position;
    for (let i = 0; i < 3; i++) {
      const s = sprite(BLOSSOM);
      s.scale.setScalar(0.1);
      root.add(s);
      const a = Math.random() * Math.PI * 2;
      parts.push({ s, kind: 'fly', from: new Vector3(p.x, 0.7, p.z), vel: new Vector3(Math.cos(a) * 0.6, 0.5, Math.sin(a) * 0.6), t: -i * 0.1, life: 0.9 });
    }
  });
  bus.on('review_lily_lure', (ev) => {
    let m = lilyLures.get(ev.target);
    if (!m) {
      const line = flat(new PlaneGeometry(1, 1), BLOSSOM, 0);
      line.material.map = DT.lineTex(); line.material.blending = AdditiveBlending; // round 2: a soft glowing ribbon, like Swiftleaf's
      root.add(line);
      m = { line, t: 0 };
      lilyLures.set(ev.target, m);
    }
    m.lily = ev.id;
    m.left = ev.secs;
    const e = byId(ev.target);
    if (e) burst(e.x, 0.9, e.z, BLOSSOM, 5, 0.09);
  });
  bus.on('review_gust_scent', (ev) => { burst(ev.x, 0.8, ev.z, BLOSSOM, 8, 0.11); ringPart(ev.x, ev.z, 1.2, BLOSSOM, 0.4, 0.8, 0.6); });
  bus.on('review_lily_burst', (ev) => {
    const o = lilyObjs.get(ev.id);
    if (o) o.snap = 0;
    ringPart(ev.x, ev.z, ev.r, RIM_DMG, 0.45, 0.3, 0.9);
    sparks(ev.x, 0.5, ev.z, 10); // round 2: her damage in lantern gold with arcane
    burst(ev.x, 0.8, ev.z, BLOSSOM, 8, 0.1);
  });
  bus.on('review_lily_end', (ev) => {
    const o = lilyObjs.get(ev.id);
    if (o && o.end == null) o.end = ev.burst ? -0.3 : 0;
    for (const [k, m] of lilyLures) if (m.lily === ev.id) m.left = 0;
  });
  function lilyUpdate(dt) {
    for (const [id, o] of lilyObjs) {
      o.t += dt;
      let k = Math.min(1, o.t / 0.25);
      if (o.end != null) { o.end += dt; if (o.end > 0) k *= Math.max(0, 1 - o.end / 0.35); if (o.end > 0.35) { root.remove(o.g); lilyObjs.delete(id); continue; } }
      o.g.scale.setScalar(Math.max(0.01, k));
      // closed bud (petals up) -> open (petals out) -> snaps shut at the end
      let open = o.opened == null ? 0.1 : Math.min(1, o.opened / 0.25);
      if (o.opened != null) o.opened += dt;
      if (o.snap != null) { o.snap += dt; open = Math.max(0, 1 - o.snap / 0.08); }
      const sway = o.opened != null && o.snap == null ? 0.05 * Math.sin(o.t * 2.4) : 0;
      for (const a of o.petals) a.rotation.x = -(1.35 - 1.05 * open) + sway;
      if (o.bloom) { // the model: a narrow bud opens wide; at the end it snaps shut
        const sq = o.snap != null ? Math.min(1, o.snap / 0.08) : 0;
        const xz = (0.5 + 0.5 * open) * (1 - 0.35 * sq);
        o.bloom.scale.set(xz, (0.9 + 0.1 * open) * (1 - 0.2 * sq), xz);
        o.bloom.rotation.z = sway;
      }
      o.head.rotation.y += dt * 0.4;
      o.bud.material.emissiveIntensity = 0.15 + 0.1 * Math.sin(o.t * 4); // dim (colour rule: glows ~40% under)
      const live = o.opened != null && o.snap == null && o.end == null;
      o.lureRing.material.opacity = live ? 0.22 + 0.06 * Math.sin(o.t * 2) : Math.max(0, o.lureRing.material.opacity - dt * 2);
      const left = o.opened != null ? o.secs - o.opened : o.secs;
      o.burstRing.material.opacity = live && left < 1.2 ? 0.5 * (0.5 + 0.5 * Math.sin(o.t * 14)) : 0; // a warning before it snaps
    }
    for (const [fid, m] of lilyLures) {
      m.left -= dt;
      m.t += dt;
      const e = byId(fid);
      const o = lilyObjs.get(m.lily);
      if (m.left <= 0 || !e || !o || o.end != null) { root.remove(m.line); lilyLures.delete(fid); continue; }
      const p = o.g.position;
      const dx = p.x - e.x, dz = p.z - e.z, len = Math.hypot(dx, dz) || 0.01;
      m.line.position.set((p.x + e.x) / 2, 0.045, (p.z + e.z) / 2);
      m.line.rotation.set(-Math.PI / 2, 0, Math.atan2(dx, dz) + Math.PI / 2);
      m.line.scale.set(len, 0.12, 1);
      m.line.material.opacity = 0.6 + 0.2 * Math.sin(m.t * 6);
    }
  }
  // Kesh 18 Nov: Elder Oak roots a foe that stays under its crown (five root spikes close round it).
  const oakRoots = [];
  bus.on('review_oak_root', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const rt = new Mesh(new ConeGeometry(0.09, 0.85, 5), mat(i % 2 ? '#7FA048' : '#9A7444'));
      const pv = new Group();
      pv.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      pv.rotation.set(0, -a + Math.PI / 2, 0);
      rt.position.y = 0.34;
      rt.rotation.z = 0.4;
      pv.add(rt);
      g.add(pv);
    }
    g.scale.setScalar(0.01);
    root.add(g);
    oakRoots.push({ g, t: 0, life: ev.secs });
    { const sp = rimGlow(0.56, RIM_DMG, 0.85); sp.position.set(ev.x, 0.05, ev.z); root.add(sp); oakRoots.push({ g: sp, t: 0, life: ev.secs, ring: true }); } // a root ring under the held foe
    burst(ev.x, 0.15, ev.z, LEAF, 6, 0.09);
  });
  function k20Update(dt) {
    snapUpdate(dt); // kit 2.1
    lilyUpdate(dt); // kit 2.2
    slUpdate(dt); // kit 2.3b
    biteUpdate(dt); // Snapjaw bite mark
    twUpdate(dt);
    webUpdate(dt);
    for (let i = oakRoots.length - 1; i >= 0; i--) {
      const o = oakRoots[i];
      o.t += dt;
      const k = o.t < 0.15 ? o.t / 0.15 : o.t > o.life ? Math.max(0, 1 - (o.t - o.life) / 0.25) : 1;
      o.g.scale.setScalar(Math.max(0.01, k));
      if (o.t > o.life + 0.25) { root.remove(o.g); oakRoots.splice(i, 1); }
    }
    const live = new Map(((globalThis.__reviewK20 && globalThis.__reviewK20.flyers) || []).map((f) => [f.id, f]));
    for (const [id, o] of k20Fly) {
      o.t += dt;
      const f = live.get(id);
      if (f) o.core.position.set(f.x, o.kind === 'blade' ? 0.5 : 0.7 + 0.05 * Math.sin(o.t * 9), f.z);
      o.glow.position.copy(o.core.position);
      o.hist.unshift(o.core.position.clone());
      o.hist.length = Math.min(o.hist.length, 8);
      const grow = Math.min(1, o.t * 6);
      o.core.scale.setScalar((o.kind === 'mote' ? 0.11 : 0.15) * grow);
      o.core.material.opacity = 0.95;
      o.glow.scale.setScalar((o.kind === 'mote' ? 0.24 : 0.3) * grow);
      o.glow.material.opacity = 0.4;
      o.tail.forEach((s) => { s.material.opacity = 0; }); // round 2: the ribbon tail replaces the dots
      o.trail.set(o.hist.slice().reverse());
    }
    for (const [key, m] of k20Marks) {
      m.left -= dt;
      m.t += dt;
      const e = byId(m.id);
      if (!e || m.left <= 0 || !(e.hp > 0)) {
        root.remove(m.ring);
        m.ring.material.dispose();
        m.ring.geometry.dispose();
        k20Marks.delete(key);
        continue;
      }
      m.ring.position.set(e.x, m.y, e.z);
      m.ring.rotation.z += dt * 0.8;
      m.ring.material.opacity = 0.7 * Math.min(1, m.t * 5) * Math.min(1, m.left * 2);
    }
    for (const [id, o] of k20Lanes) {
      o.t += dt;
      if (o.end != null) o.end += dt;
      const out = o.end != null ? Math.max(0, 1 - o.end / 0.4) : 1;
      o.bed.material.opacity = 0.1 * Math.min(1, o.t * 4) * out * (0.85 + 0.15 * Math.sin(o.t * 5));
      o.glint += dt;
      if (o.glint > 0.35 && out > 0.5) {
        o.glint = 0;
        const d = Math.random() * o.ev.len, w = (Math.random() - 0.5) * o.ev.width;
        burst(o.ev.x + o.ev.dx * d - o.ev.dz * w, 0.08, o.ev.z + o.ev.dz * d + o.ev.dx * w, WATER, 2, 0.06);
      }
      if (o.end != null && o.end > 0.4) {
        root.remove(o.g);
        o.bed.material.dispose();
        o.bed.geometry.dispose();
        k20Lanes.delete(id);
      }
    }
  }
  function update(dt) {
    sapThrottle = Math.max(0, sapThrottle - dt);
    const p = world.player;
    if (!p) return;
    for (const [key, v] of vines) {
      v.t += dt;
      const e = byId(v.id);
      const u = v.t / v.life;
      if (!e || u >= 1) {
        root.remove(v.ring);
        v.ring.material.dispose();
        vines.delete(key);
        continue;
      }
      v.ring.position.set(e.x, v.offset, e.z);
      v.ring.scale.setScalar(1.15 - 0.55 * u);
      v.ring.material.opacity = 0.6 * Math.min(1, v.t * 6) * (1 - u * 0.5);
    }
    if (tip) tip(gem) || gem.set(p.x, 0.9, p.z);
    kitUpdate(dt);
    k8Update(dt); // kit 1.8
    k20Update(dt); // kit 2.0
    lifeUpdate(dt); // the motion pass: the plants are alive
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.t += dt;
      const u = Math.max(0, q.t / q.life);
      if (q.kind === 'fly') {
        const k = 4.5, d = (1 - Math.exp(-k * q.t)) / k; // EFX3: drag
        q.s.position.copy(q.from).addScaledVector(q.vel, d * 1.6);
        q.s.position.y -= 0.9 * q.t * q.t;
        const sz = q.size ?? q.s.scale.x; if (q.size == null) q.size = sz;
        q.s.scale.setScalar(sz * (u < 0.12 ? 0.6 + 6 * u : 1.32 - 0.62 * Math.min(1, (u - 0.12) / 0.88)));
        q.s.material.opacity = 0.9 * Math.min(1, u * 10) * (1 - u * u);
      } else if (q.kind === 'dive') {
        const h = 3.2 * (1 - Math.min(1, u));
        q.s.position.set(q.x - 0.6 * (1 - u), 0.25 + h, q.z);
        q.tail.forEach((tl, k) => { tl.position.set(q.x - 0.6 * (1 - u) - 0.12 * (k + 1), 0.25 + h + 0.35 * (k + 1), q.z); tl.material.opacity = (0.6 - k * 0.18) * (u < 1 ? 1 : 0); });
        q.s.material.opacity = 0.95;
        if (u >= 1) for (const tl of q.tail) { root.remove(tl); tl.material.dispose(); }
      } else if (q.kind === 'ring') {
        const g = 1 - Math.pow(1 - Math.min(1, u), 3); // EFX3: ease-out
        q.s.scale.setScalar(0.85 + (q.grow + 0.15) * g);
        q.s.material.opacity = (u < 0.08 ? 0.95 : 0.8) * Math.pow(1 - Math.min(1, u), 1.6);
      } else if (q.kind === 'sap') {
        q.s.position.lerpVectors(q.from, gem, u * u);
        q.s.position.y += 0.35 * Math.sin(Math.PI * u);
        q.s.material.opacity = 0.9 * Math.min(1, u * 8);
      } else {
        const e = byId(q.target);
        if (!e) u >= 0 && (q.t = q.life);
        else {
          const to = new Vector3(e.x, 0.55, e.z);
          const w = Math.min(1, u), m = w * w * (3 - 2 * w); // EFX3: ease in-out
          q.s.position.lerpVectors(q.from || gem, to, m);
          q.s.position.y += (q.arc ?? 0.18) * Math.sin(Math.PI * w);
          if (q.size == null) q.size = q.s.scale.x;
          q.s.scale.setScalar(q.size * (w > 0.8 ? 1 + 2.2 * (w - 0.8) : 1));
        }
        q.s.material.opacity = q.t < 0 ? 0 : 0.85 * (1 - u * 0.4);
      }
      if (u >= 1) {
        root.remove(q.s);
        q.s.material.dispose();
        parts.splice(i, 1);
      }
    }
    for (const [id, w] of wisps) {
      const e = byId(id);
      w.born += dt;
      if (w.fade != null) w.fade += dt;
      if (!e || (w.fade != null && w.fade > 0.4)) {
        for (const q of [w.core, ...w.tail]) {
          root.remove(q);
          q.material.dispose();
        }
        wisps.delete(id);
        continue;
      }
      w.a += dt * 3.2;
      w.pulse = Math.max(0, (w.pulse || 0) - dt * 3);
      w.dive = Math.max(0, (w.dive || 0) - dt * 4);
      const fill = w.cap > 0 ? Math.min(1, w.store / w.cap) : 0;
      const rr = 0.5 * (1 - 0.6 * w.dive);
      const y = 0.85 + 0.08 * Math.sin(w.a * 1.7);
      w.core.position.set(e.x + Math.cos(w.a) * rr, y, e.z + Math.sin(w.a) * rr);
      const k = Math.min(1, w.born * 4) * (w.fade != null ? 1 - w.fade / 0.4 : 1);
      w.core.scale.setScalar((0.16 + 0.14 * fill) * (1 + 0.4 * w.pulse));
      w.core.material.opacity = (0.55 + 0.35 * fill) * k;
      w.hist.unshift(w.core.position.clone());
      if (w.hist.length > 16) w.hist.length = 16;
      w.tail.forEach((t, i) => {
        const h = w.hist[Math.min(w.hist.length - 1, (i + 1) * 3)];
        t.position.copy(h);
        t.scale.setScalar((0.11 + 0.08 * fill) * (1 - i * 0.2));
        t.material.opacity = (0.35 - i * 0.07) * k;
      });
    }
    for (const [id, b] of barks) {
      b.left -= dt;
      b.t += dt;
      const e = byId(id);
      if (!e || b.left <= 0 || !(e.hp > 0)) {
        root.remove(b.ring);
        b.ring.material.dispose();
        barks.delete(id);
        continue;
      }
      b.ring.position.set(e.x, 0.5, e.z);
      b.ring.material.opacity = 0.8 * Math.min(1, b.t * 5) * Math.min(1, b.left * 2);
    }
    let hurt = false;
    if (p.reviewSapOn && p.reviewSap > 0.5) for (const e of world.entities()) if (e !== p && e.partyIndex !== undefined && e.hp > 0 && e.hp < e.maxHp) hurt = true;
    reach.scale.setScalar((p.reviewSapReach || 1.8) / 1.8); // Deep Gem (T30): 2.4 u
    reach.position.set(p.x, 0.035, p.z);
    reach.material.opacity += ((hurt ? 0.28 : 0) - reach.material.opacity) * Math.min(1, dt * 6);
    reach.visible = reach.material.opacity > 0.01;
  }
  return { update };
}
