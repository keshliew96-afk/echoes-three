// REVIEW-ONLY (never committed): the talent looks (MOSSLIGHT_TALENT_PATHS.md v2,
// T38 to T40): the vine ring shrinking at a HoT or afterglow ally's feet, Bark's
// thin ring, the dark green Sap motes flying into the gem, the Bright Heal pour
// from the gem (or the planted staff) to an ally, and the pour's reach ring.
import { AdditiveBlending, ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, PlaneGeometry, SphereGeometry, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
import { PALETTE } from '../../data/palette.js';
import { getRadialTexture } from '../glow.js';
import { makeOak, makeOakling, makePuffcap, makeSapling, makeSpitter } from './reviewPlants.js'; // REVIEW-ONLY: Kesh's plant models (16 Nov)

const SAP_GREEN = '#3E8240';
const SAP_HEAD = '#8CC46E';

export function createReviewPathsFx({ bus, root, world, tip }) {
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
      const ring = new Mesh(ringGeo, new MeshBasicMaterial({ color: PALETTE.brightHeal, transparent: true, opacity: 0.6, depthWrite: false, side: DoubleSide }));
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
      const a = (i / n) * Math.PI * 2;
      parts.push({ s, kind: 'fly', from: new Vector3(x, y, z), vel: new Vector3(Math.cos(a) * 0.9, 0.9, Math.sin(a) * 0.9), t: 0, life: 0.4 });
    }
  };
  // S11 Seed Bolt: a spent bolt drops a glowing seed that heals the first hurt ally to touch it.
  bus.on('review_seed', (ev) => {
    const g = new Group();
    const seed = new Mesh(new IcosahedronGeometry(0.07, 0), new MeshStandardMaterial({ color: '#8FD08A', emissive: '#3E9A4E', emissiveIntensity: 0.6, roughness: 0.6 }));
    seed.position.y = 0.08;
    g.add(seed);
    const glow = sprite(PALETTE.brightHeal);
    glow.scale.setScalar(0.32);
    glow.position.y = 0.12;
    g.add(glow);
    const ring = new Mesh(new RingGeometry(0.4, 0.43, 32), new MeshBasicMaterial({ color: PALETTE.brightHeal, transparent: true, opacity: 0.35, depthWrite: false, side: DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    g.add(ring);
    g.position.set(ev.x, 0, ev.z);
    root.add(g);
    const thr = ev.fromX != null ? { from: new Vector3(ev.fromX, 0.7, ev.fromZ), to: new Vector3(ev.x, 0, ev.z), t: 0 } : null;
    if (thr) g.position.copy(thr.from);
    kitObjs.set(ev.id, { kind: 'seed', g, glow, seed, ring, t: 0, thr });
  });
  bus.on('review_seed_end', (ev) => {
    const o = kitObjs.get(ev.id);
    if (!o) return;
    if (ev.target != null) burst(o.g.position.x, 0.3, o.g.position.z, PALETTE.brightHeal, 7, 0.13);
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
    const ring = new Mesh(new RingGeometry(0.38, 0.5, 40), new MeshBasicMaterial({ color: PALETTE.brightHeal, transparent: true, opacity: 0.8, depthWrite: false, side: DoubleSide }));
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
    const reachRing = new Mesh(new RingGeometry(ev.reach - 0.04, ev.reach, 64), new MeshBasicMaterial({ color: PALETTE.brightHeal, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
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
    kitObjs.set(ev.id, { kind: 'sapling', g, tree, crown: sway, glow, reachRing, t: 0, pulse: 0, life: ev.secs || 8, sc: 0.9 });
    burst(ev.x, 0.15, ev.z, '#8CC46E', 6, 0.1);
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
    gw.set(ev.id, { core, glow, tail, hist: [], t: 0, fade: null, fly: false });
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
      o.tail.forEach((s, i) => {
        const h = o.hist[Math.min(o.hist.length - 1, (i + 1) * 3)];
        if (h) s.position.copy(h);
        s.scale.setScalar((0.1 - i * 0.025) * grow);
        s.material.opacity = (0.5 - i * 0.14) * out;
      });
      if (o.fade != null && o.fade > 0.25) {
        for (const x of [o.core, o.glow, ...o.tail]) { root.remove(x); x.material.dispose(); }
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
      o.bed.material.opacity = 0.22 * Math.min(1, o.t * 8) * out;
      o.edgeL.material.opacity = o.edgeR.material.opacity = 0.75 * Math.min(1, o.t * 8) * out;
      o.band.position.z = roll * o.len;
      o.band.material.opacity = 0.7 * (o.t < 0.32 ? 1 : out);
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
  const ringPart = (x, z, r, color, life = 0.45, grow = 0.5, op = 0.8) => {
    const ring = flat(new RingGeometry(r * 0.9, r, 48), color, op);
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
    const s = sprite(DMG);
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
      const leaf = new Mesh(new ConeGeometry(0.07, 0.22, 5), mat(PALETTE.brightHeal, 1, { emissive: '#2E8B45', emissiveIntensity: 0.4 }));
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
      const f = sprite(i % 3 ? '#D6FFB0' : PALETTE.brightHeal);
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
    if (e) burst(e.x, 0.7, e.z, ev.foe ? DMG : PALETTE.brightHeal, 5, 0.08);
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
      const sp = new Mesh(new ConeGeometry(0.11 + (i % 3) * 0.03, 0.6 + (i % 4) * 0.12, 5), mat(i % 2 ? WOOD : WOOD_D)); // kit v1.4 R20: wooden roots with bark
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
    const head = sprite(WHITE_GOLD);
    head.scale.setScalar(0.42);
    root.add(head);
    const tail = [0, 1, 2].map(() => { const t = sprite(WHITE_GOLD); t.scale.setScalar(0.24); root.add(t); return t; });
    parts.push({ s: head, kind: 'dive', t: 0, life: ev.secs, x: ev.x, z: ev.z, tail });
  });
  bus.on('review_fall_land', (ev) => {
    burst(ev.x, 0.2, ev.z, WHITE_GOLD, 7, 0.1);
    ringPart(ev.x, ev.z, ev.r, WHITE_GOLD, 0.35, 0.2, 0.75);
  });
  // S23 Rootsnare: a ring of roots that drags foes in, then clenches.
  bus.on('review_snare', (ev) => {
    const g = new Group();
    g.position.set(ev.x, 0, ev.z);
    const disc = flat(new RingGeometry(0.01, ev.r, 64), DMG_DEEP, 0.0);
    disc.position.y = 0.03;
    const edge = flat(new RingGeometry(ev.r - 0.07, ev.r, 64), DMG, 0.0);
    edge.position.y = 0.035;
    g.add(disc, edge);
    const roots = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rt = new Mesh(new ConeGeometry(0.07, 0.75, 5), mat(i % 2 ? '#5C7A38' : '#6E5A34'));
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
    burst(o.g.position.x, 0.2, o.g.position.z, DMG, 10, 0.12);
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
    g.position.set(ev.fromX, 0.7, ev.fromZ);
    root.add(g);
    k3.set(ev.id, { kind: 'puff', g, t: 0, from: new Vector3(ev.fromX, 0.7, ev.fromZ), to: new Vector3(ev.x, 0, ev.z) });
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
  const leafMesh = (color = LEAF, k = 1) => { const m = new Mesh(leafGeo4, mat(color, 1, { transparent: true })); m.scale.setScalar(k); return m; };
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
    for (let i = 0; i < 5; i++) {
      const pt = new Mesh(petalGeo, mat(FLOWER, 1, { transparent: true, emissive: '#6E6A58', emissiveIntensity: 0.3 }));
      const a = (i / 5) * Math.PI * 2;
      pt.position.set(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05);
      pt.rotation.y = -a;
      g.add(pt);
    }
    const c = new Mesh(new SphereGeometry(0.03, 5, 4), mat(POLLEN, 1, { transparent: true }));
    g.add(c);
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
      const lead = leafMesh(LEAF_LIGHT, 4.0);
      const trail = [0, 1, 2, 3].map((i) => leafMesh(i % 2 ? LEAF : LEAF_LIGHT, 2.4 - i * 0.35));
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
          for (let i = 0; i < 4; i++) { const l = leafMesh(i % 2 ? LEAF : LEAF_LIGHT, 2.8); l.rotation.set(0.5, (i / 4) * 6.28, 0.9); l.position.set(Math.cos(i * 1.57) * 0.11, 0.05, Math.sin(i * 1.57) * 0.07); sprig.add(l); }
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
  // R10 Dew Wave: grass and small flowers spring up along the lane behind the wave, gone after 2 s.
  bus.on('review_rect', (ev) => {
    const n = Math.round(ev.len / 0.2);
    for (let i = 0; i < n; i++) {
      const d = ((i + 0.5) / n) * ev.len;
      const side = ((i * 37) % 9) / 9 - 0.5;
      const x = ev.x + ev.dx * d - ev.dz * side * ev.width * 0.85;
      const z = ev.z + ev.dz * d + ev.dx * side * ev.width * 0.85;
      const delay = (d / ev.len) * 0.32;
      tuft(x, z, 2.0, delay);
      if (i % 2 === 1) { const fl = flower(x + 0.1, 0.3, z, 2.0, 2.6); fl.t = -delay; }
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
      for (let k = 0; k < 3; k++) { const b = new Mesh(bladeGeo, mat(k % 2 ? LEAF : '#6FAE52')); b.position.set((k - 1) * 0.05, 0.08, 0); b.rotation.z = (k - 1) * 0.35; t.add(b); }
      if (i % 3 === 0) { const c = new Mesh(new SphereGeometry(0.055, 6, 4), mat(i % 2 ? FLOWER : BLOSSOM, 1, { emissive: '#5A5048', emissiveIntensity: 0.3 })); c.position.y = 0.2; t.add(c); }
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
    if (ev.skill !== 'kindred_shield') return;
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
    if (ev.skill !== 'kindred_shield') return;
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
    const shade = flat(new RingGeometry(0.01, ev.r, 64), '#2E5A2A', 0.0);
    shade.position.y = 0.025;
    const edge = flat(new RingGeometry(ev.r - 0.06, ev.r, 64), LEAF_LIGHT, 0.0);
    edge.position.y = 0.03;
    g.add(shade, edge);
    const roots = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2;
      const len = ev.r * (0.75 + (i % 3) * 0.08);
      const rt = flat(new PlaneGeometry(0.11, len), i % 2 ? WOOD : WOOD_D, 0.0);
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
  });
  bus.on('review_ling_slam', (ev) => {
    const o = k3.get('ling' + ev.id);
    if (o) o.slam = 0;
    burst(ev.x, 0.25, ev.z, WOOD, 6, 0.12);
    burst(ev.x, 0.4, ev.z, DMG, 5, 0.1);
    ringPart(ev.x, ev.z, 0.7, '#C9A27A', 0.35, 0.8, 0.8);
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
          f.material.color.set(o.foe && f !== o.flies[0] && (u.sp % 2) ? DMG : (u.sp % 2 ? '#D6FFB0' : PALETTE.brightHeal));
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
          o.bed.material.opacity = Math.max(0, 0.28 - o.burst * 0.5);
          o.fill.material.opacity = 0;
          const rise = Math.min(1, o.burst / 0.08), sink = Math.max(0, (o.burst - 0.45) / 0.25);
          for (const sp of o.spikes) { sp.visible = true; sp.position.y = -0.45 + 0.75 * rise - 0.8 * sink; }
          if (o.burst > 0.75) o.fade = o.fade ?? 0.35;
        }
      } else if (o.kind === 'fall') {
        const p = p0();
        o.g.position.set(p.x, 0, p.z);
        o.ring.material.opacity = 0.22 * Math.min(1, o.t * 4) * out;
      } else if (o.kind === 'snare') {
        if (o.clench == null) {
          const u = Math.min(1, o.t * 3);
          o.disc.material.opacity = 0.12 * u;
          o.edge.material.opacity = 0.7 * u;
          o.roots.forEach((pv, i) => { pv.scale.setScalar(Math.min(1, Math.max(0.01, o.t * 4 - i * 0.05))); pv.children[0].rotation.x = 0.35 + Math.sin(o.t * 3 + i) * 0.08; });
        } else {
          o.clench += dt;
          const u = Math.min(1, o.clench / 0.15);
          o.roots.forEach((pv) => { pv.children[0].rotation.x = 0.35 + 0.9 * u; pv.scale.setScalar(1 + 0.3 * u); });
          o.edge.material.opacity = 0.9 * (1 - Math.min(1, o.clench / 0.6));
          o.disc.material.opacity = 0.18 * (1 - Math.min(1, o.clench / 0.6));
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
        o.shade.material.opacity = 0.16 * u * out;
        o.edge.material.opacity = 0.5 * u * out;
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
    for (const [id, o] of kitObjs) {
      o.t += dt;
      if (o.fade != null) o.fade += dt;
      const out = o.fade != null ? Math.max(0, 1 - o.fade / 0.35) : 1;
      if (o.kind === 'seed') {
        o.glow.material.opacity = (0.45 + 0.25 * Math.sin(o.t * 6)) * out;
        o.seed.rotation.y += dt * 2;
        o.ring.material.opacity = 0.35 * out;
        o.g.scale.setScalar(Math.min(1, o.t * 6) * (0.4 + 0.6 * out));
        if (o.thr && o.thr.t < 1) {
          o.thr.t = Math.min(1, o.thr.t + dt / 0.35);
          o.g.position.lerpVectors(o.thr.from, o.thr.to, o.thr.t);
          o.g.position.y = o.thr.from.y * (1 - o.thr.t) + 0.9 * Math.sin(Math.PI * o.thr.t);
          o.ring.visible = o.thr.t >= 1;
          if (o.thr.t >= 1) burst(o.thr.to.x, 0.1, o.thr.to.z, '#8CC46E', 4, 0.07);
        }
      } else if (o.kind === 'sapling') {
        o.pulse = Math.max(0, o.pulse - dt * 2.5);
        o.g.scale.setScalar(Math.min(1, o.t * 2.5) * out + 0.001);
        // kit v1.4 R17: three sizes in its life, sprout to a young tree as tall as the Tank
        const stage = o.t < o.life / 3 ? 0.9 : o.t < (o.life * 2) / 3 ? 1.8 : 2.7;
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
  // staff takes root (R44), the dash's flower trail (R48), Swiftleaf comes back (R27), Dew Wave washes
  // (R28), the wind rolls seeds (R39), the watered staff (R49) and Bramble Hedge (S53). The thorn
  // bolts (R47) are drawn in scenes/graybox.js.
  const HEDGE_LEAF = '#447F3F';
  const THORN_PALE = '#D8C9A0';
  const CRYSTAL = '#A8E6B0';
  // R44: roots spread 0.5 u from the staff's foot in 0.2 s and two leaves open under the gem;
  // they pull back in 0.15 s when she takes it up.
  let staffFx = null;
  function staffGone(fast) {
    const s = staffFx;
    if (!s) return;
    staffFx = null;
    s.back = 0;
    s.fast = fast;
  }
  const staffOld = [];
  bus.on('review_staff_plant', (ev) => {
    if (staffFx) { staffOld.push(staffFx); staffGone(true); }
    const g = new Group();
    const roots = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4 * (i % 2);
      const len = 0.5 * (0.75 + 0.25 * ((i * 5) % 3) / 2);
      const r = flat(new PlaneGeometry(0.08, 1), i % 2 ? '#8B6A45' : WOOD, 0.95); // lighter than the bark so it reads on the dark floor
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
    g.position.set(ev.x, 0.032, ev.z);
    root.add(g);
    staffFx = { g, roots, leaves, gx: ev.gx, gz: ev.gz, fx: ev.x, fz: ev.z, t: 0, back: null, wet: 0 };
    staffOld.push(staffFx);
    burst(ev.x, 0.1, ev.z, LEAF_LIGHT, 5, 0.08);
  });
  bus.on('review_staff_up', () => staffGone(false));
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
  // R48: a trail of small flowers opens along the 1.8 u of the dash and fades after 1 s.
  bus.on('review_dash', (ev) => {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, side = (i % 2 ? 1 : -1) * 0.12;
      const x = ev.x + ev.dx * ev.len * u - ev.dz * side, z = ev.z + ev.dz * ev.len * u + ev.dx * side;
      const a = flower(x, 0.04, z, 1.25, 1.7);
      a.t = -(0.06 + 0.27 * u);
      if (i % 2 === 0) tuft(x + ev.dz * 0.1, z - ev.dx * 0.1, 1.0, 0.06 + 0.27 * u);
    }
  });
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
  const reach = new Mesh(new RingGeometry(1.74, 1.8, 64), new MeshBasicMaterial({ color: PALETTE.brightHeal, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
  reach.rotation.x = -Math.PI / 2;
  root.add(reach);
  const gem = new Vector3();
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
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.t += dt;
      const u = Math.max(0, q.t / q.life);
      if (q.kind === 'fly') {
        q.s.position.copy(q.from).addScaledVector(q.vel, q.t);
        q.s.position.y -= 1.2 * q.t * q.t;
        q.s.material.opacity = 0.85 * (1 - u);
      } else if (q.kind === 'dive') {
        const h = 3.2 * (1 - Math.min(1, u));
        q.s.position.set(q.x - 0.6 * (1 - u), 0.25 + h, q.z);
        q.tail.forEach((tl, k) => { tl.position.set(q.x - 0.6 * (1 - u) - 0.12 * (k + 1), 0.25 + h + 0.35 * (k + 1), q.z); tl.material.opacity = (0.6 - k * 0.18) * (u < 1 ? 1 : 0); });
        q.s.material.opacity = 0.95;
        if (u >= 1) for (const tl of q.tail) { root.remove(tl); tl.material.dispose(); }
      } else if (q.kind === 'ring') {
        q.s.scale.setScalar(1 + q.grow * u);
        q.s.material.opacity = 0.8 * (1 - u);
      } else if (q.kind === 'sap') {
        q.s.position.lerpVectors(q.from, gem, u * u);
        q.s.position.y += 0.35 * Math.sin(Math.PI * u);
        q.s.material.opacity = 0.9 * Math.min(1, u * 8);
      } else {
        const e = byId(q.target);
        if (!e) u >= 0 && (q.t = q.life);
        else {
          const to = new Vector3(e.x, 0.55, e.z);
          q.s.position.lerpVectors(q.from || gem, to, Math.min(1, u));
          q.s.position.y += (q.arc ?? 0.18) * Math.sin(Math.PI * Math.min(1, u));
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
