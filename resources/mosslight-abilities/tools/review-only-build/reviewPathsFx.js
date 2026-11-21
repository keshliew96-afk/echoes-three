// REVIEW-ONLY (never committed): the talent looks (MOSSLIGHT_TALENT_PATHS.md v2,
// T38 to T40): the vine ring shrinking at a HoT or afterglow ally's feet, Bark's
// thin ring, the dark green Sap motes flying into the gem, the Bright Heal pour
// from the gem (or the planted staff) to an ally, and the pour's reach ring.
import { AdditiveBlending, ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, PlaneGeometry, SphereGeometry, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
import { PALETTE } from '../../data/palette.js';
import { getRadialTexture } from '../glow.js';

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
    kitObjs.set(ev.id, { kind: 'sapling', g, crown, glow, reachRing, t: 0, pulse: 0 });
    burst(ev.x, 0.15, ev.z, '#8CC46E', 6, 0.1);
  });
  bus.on('review_sapling_mote', (ev) => {
    const o = kitObjs.get(ev.id);
    if (o) o.pulse = 1;
    for (let i = 0; i < 4; i++) {
      const s = sprite(PALETTE.brightHeal);
      s.scale.setScalar(0.15 - i * 0.02);
      root.add(s);
      parts.push({ s, target: ev.target, from: new Vector3(ev.x, 0.55, ev.z), t: -i * 0.05, life: 0.45, kind: 'pour', arc: 0.5 });
    }
  });
  bus.on('review_sapling_end', (ev) => {
    const o = kitObjs.get(ev.id);
    if (o) o.fade = 0;
  });
  // S25 Sapping Vine: a dark green vine from her gem to the foe; each tick a heal flies to an ally.
  bus.on('review_vine', (ev) => {
    const segs = [];
    for (let i = 0; i < 18; i++) {
      const s = sprite(i % 3 === 0 ? '#B4E08C' : SAP_HEAD, false);
      s.scale.setScalar(0.15);
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
    if (ev.healed != null) {
      for (let i = 0; i < 3; i++) {
        const s = sprite(PALETTE.brightHeal);
        s.scale.setScalar(0.12);
        root.add(s);
        parts.push({ s, target: ev.healed, t: -i * 0.05, life: 0.3, kind: 'pour' });
      }
    }
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
    g.add(stem, head, mouth, leafA, leafB);
    g.position.set(ev.x, 0, ev.z);
    g.scale.setScalar(0.01);
    root.add(g);
    k3.set(ev.id, { kind: 'spit', g, head, t: 0, kick: 0 });
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
    parts.push({ s, target: ev.target, from: new Vector3(ev.x, 0.65, ev.z), t: 0, life: 0.25, kind: 'pour', arc: 0.05 });
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
    for (let i = 0; i < 14; i++) {
      const m = sprite(i % 3 ? '#E9F7B8' : PALETTE.brightHeal);
      m.scale.setScalar(0.09 + (i % 4) * 0.02);
      m.userData = { x: (i / 13 - 0.5) * ev.width, y: 0.25 + (i % 5) * 0.14, ph: i * 1.7 };
      g.add(m);
      motes.push(m);
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
      const sp = new Mesh(new ConeGeometry(0.11 + (i % 3) * 0.03, 0.6 + (i % 4) * 0.12, 5), mat(i % 2 ? '#5C7A38' : '#6E5A34'));
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
    g.add(stem, cap, ...dots);
    g.position.set(ev.fromX, 0.7, ev.fromZ);
    root.add(g);
    k3.set(ev.id, { kind: 'puff', g, t: 0, from: new Vector3(ev.fromX, 0.7, ev.fromZ), to: new Vector3(ev.x, 0, ev.z) });
  });
  bus.on('review_puff_end', (ev) => dropK3(ev.id));
  bus.on('review_puff_burst', (ev) => {
    dropK3(ev.id);
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
  function k3Update(dt) {
    const swarmPos = new Map((globalThis.__reviewSwarms || []).map((w) => [w.id, w]));
    for (const [id, o] of k3) {
      o.t += dt;
      if (o.fade != null) o.fade += dt;
      const out = o.fade != null ? Math.max(0, 1 - o.fade / 0.35) : 1;
      if (o.kind === 'spit') {
        o.kick = Math.max(0, o.kick - dt * 6);
        o.g.scale.setScalar(1.6 * Math.min(1, o.t * 5) * (0.3 + 0.7 * out) + 0.001);
        o.head.scale.setScalar(1 + 0.25 * o.kick);
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
          m.position.set(u.x + Math.sin(o.t * 6 + u.ph) * 0.08, u.y + Math.sin(o.t * 8 + u.ph) * 0.05, d - 0.1 + Math.sin(o.t * 5 + u.ph) * 0.15);
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
        o.g.scale.setScalar(u < 1 ? 0.8 : 1 + 0.04 * Math.sin(o.t * 3));
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
    gwUpdate(dt);
    laneUpdate(dt);
    k3Update(dt);
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
        o.crown.rotation.z = Math.sin(o.t * 2.2) * 0.06;
        o.glow.material.opacity = (0.3 + 0.45 * o.pulse) * out;
        o.glow.scale.setScalar(0.55 + 0.25 * o.pulse);
        o.reachRing.material.opacity = 0.16 * Math.min(1, o.t * 3) * out;
      } else if (o.kind === 'vine') {
        o.pulse = Math.max(0, o.pulse - dt * 3);
        const foe = byId(o.target);
        if (tip) tip(gem) || gem.set(p0().x, 0.9, p0().z);
        if (foe) {
          const to = new Vector3(foe.x, 0.6, foe.z);
          o.segs.forEach((s, i) => {
            const u = (i + 1) / (o.segs.length + 1);
            s.position.lerpVectors(gem, to, u);
            const wob = Math.sin(o.t * 9 + i * 1.3) * 0.07 * Math.sin(Math.PI * u);
            s.position.x += wob;
            s.position.y += Math.sin(Math.PI * u) * 0.25 + wob;
            s.scale.setScalar((0.16 + 0.08 * o.pulse) * Math.min(1, o.t * 8));
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
