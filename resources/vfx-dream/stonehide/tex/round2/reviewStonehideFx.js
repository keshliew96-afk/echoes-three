// REVIEW-ONLY (never committed, never pushed): stand-in looks for Stonehide's
// kit 1.1 on his ability review page. Dim on purpose: real VFX are made at the
// freeze lift with the VFX templates. His colours only: Forge Steel #9DB8CF,
// Earth Ochre #8F6B45, debris #5A4632, dark iron, stone grey, and Rust for
// berserk (#7A4E36, dim, never on the floor).
import { AdditiveBlending, BoxGeometry, BufferAttribute, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RingGeometry, Shape, ShapeGeometry, ExtrudeGeometry, SphereGeometry, SRGBColorSpace, Sprite, SpriteMaterial, Vector3 } from 'three';
import { getRadialTexture } from '../glow.js';

const STEEL = '#9DB8CF', OCHRE = '#8F6B45', DEBRIS = '#5A4632', IRON = '#3B4046', STONE = '#8E8B85', RUST = '#7A4E36', PARCH = '#F4EFE6', BONE = '#E8DFC9';
const sm = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

export function createReviewStonehideFx({ bus, root, world }) {
  const cue = (k, ev) => window.__tripoTankCue && window.__tripoTankCue(k, ev);
  const byId = (id) => {
    for (const e of world.entities()) if (e.id === id) return e;
    return null;
  };
  const tank = () => world.entities().find((e) => e.kind === 'ally' && e.partyIndex === 1) || null;
  const items = []; // { obj, t, life, update(u, t, dt) }
  const add = (obj, life, update) => {
    root.add(obj);
    const it = { obj, t: 0, life, update };
    items.push(it);
    return it;
  };
  const kill = (it) => {
    if (it) it.t = it.life;
  };
  const basic = (color, op = 1, add_ = false) => new MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: DoubleSide, ...(add_ ? { blending: AdditiveBlending } : {}) });
  const ringGeo = new RingGeometry(0.9, 1, 72);
  const discGeo = new RingGeometry(0, 1, 48);
  function ring(x, z, r, color, { life = 0.5, from = 0.3, op = 0.75, y = 0.05, width = 1 } = {}) {
    const m = new Mesh(width === 1 ? ringGeo : new RingGeometry(1 - 0.1 * width, 1, 72), basic(color, op));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    return add(m, life, (u) => {
      m.scale.setScalar(r * (from + (1 - from) * (1 - (1 - u) ** 3)));
      m.material.opacity = op * (1 - u * u);
    });
  }
  function puff(x, z, { n = 8, r = 0.5, color = DEBRIS, life = 0.7, h = 0.5, size = 0.35 } = {}) {
    for (let i = 0; i < n; i++) {
      const s = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color, transparent: true, depthWrite: false, opacity: 0 }));
      const a = Math.random() * Math.PI * 2, rr = r * (0.3 + Math.random() * 0.7);
      const vx = Math.cos(a) * rr * 1.4, vz = Math.sin(a) * rr * 1.4, vy = h * (0.6 + Math.random() * 0.6);
      s.position.set(x, 0.1, z);
      add(s, life * (0.7 + Math.random() * 0.5), (u, t, dt) => {
        s.position.x += vx * dt * (1 - u);
        s.position.z += vz * dt * (1 - u);
        s.position.y += vy * dt * (1 - u);
        s.scale.setScalar(size * (0.6 + u));
        s.material.opacity = 0.5 * Math.min(1, u * 6) * (1 - u);
      });
    }
  }
  const rockGeo = new DodecahedronGeometry(0.1, 0);
  const rockMat = new MeshStandardMaterial({ color: OCHRE, roughness: 1, flatShading: true });
  const debMat = new MeshStandardMaterial({ color: DEBRIS, roughness: 1, flatShading: true });
  const stoneMat = new MeshStandardMaterial({ color: STONE, roughness: 1, flatShading: true });
  // iron (Kesh's Grudge repaint, 19 Nov): dark blue-grey steel with bright cut edges; every iron skill uses it
  const ironMat = new MeshStandardMaterial({ color: '#4A4440', roughness: 0.7, metalness: 0, flatShading: true, emissive: '#2C2A28', emissiveIntensity: 1 });
  const ironEdgeMat = new MeshBasicMaterial({ color: '#D5DAE0', transparent: true, opacity: 0.8, depthWrite: false });
  // flung debris (Kesh 19 Nov: "part of ground", never stones): chips of the floor that show the tiles they broke
  // from; his own stone (stoneMat) and iron (ironMat) chip in their own material. They land, tip flat and lie.
  function chunks(x, z, { n = 8, r = 0.6, up = 2.2, mat = debMat, size = 1, life = 0.9 } = {}) {
    const floor = mat === debMat || mat === rockMat;
    for (let i = 0; i < n; i++) {
      const m = floorSlab(x, z, size * (0.07 + Math.random() * 0.07), chipSideMat, floor, true);
      if (!floor) m.material = mat;
      const a = Math.random() * Math.PI * 2, sp = r * (0.8 + Math.random());
      const vx = Math.cos(a) * sp, vz = Math.sin(a) * sp, rx = 4 + Math.random() * 4, rz = 2 + Math.random() * 4;
      const rest = [(Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5];
      let vy = up * (0.6 + Math.random() * 0.6), landed = false;
      m.position.set(x, 0.1, z);
      add(m, life, (u, t, dt) => {
        if (!landed) {
          vy -= 9 * dt;
          m.position.x += vx * dt;
          m.position.z += vz * dt;
          m.position.y += vy * dt;
          m.rotation.x += dt * rx;
          m.rotation.z += dt * rz;
          if (m.position.y <= 0.03 && vy < 0) {
            landed = true;
            m.position.y = 0.03;
            m.rotation.set(...rest);
          }
        }
        if (u > 0.75) m.scale.multiplyScalar(0.9);
      });
    }
  }
  // dust thrown one way (Kesh 20 Nov): soft warm puffs that drift along ang, spreading +-spread
  function dirDust(x, z, ang, { n = 6, spread = 0.9, dist = 0.9, y = 0.15, size = 0.5, op = 0.45, life = 0.9 } = {}) {
    for (let i = 0; i < n; i++) {
      const sp = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: '#C8A87A', transparent: true, depthWrite: false, opacity: 0 }));
      const a = ang + (Math.random() - 0.5) * 2 * spread, d = dist * (0.5 + Math.random() * 0.6), sz = size * (0.7 + Math.random() * 0.6);
      const l = life * (0.8 + Math.random() * 0.4), y0 = y + Math.random() * 0.15;
      add(sp, l, (u) => {
        const k = 1 - (1 - u) ** 2;
        sp.position.set(x + Math.cos(a) * d * k, y0 + 0.2 * k, z + Math.sin(a) * d * k);
        sp.scale.set(sz * (0.7 + 0.8 * u), sz * 0.6 * (0.7 + 0.8 * u), 1);
        sp.material.opacity = op * Math.min(1, u * 8) * (1 - sm(0.35, 1, u));
      });
    }
  }
  // stone chips knocked off a body at height y, flying away along ang, falling to the floor (Maul's hits)
  function bodyChips(x, y, z, ang, { n = 4, sp = 1.2, size = 1, mat = null } = {}) {
    for (let i = 0; i < n; i++) {
      const m = floorSlab(0, 0, size * (0.04 + Math.random() * 0.04), chipSideMat, false, true, 0.06);
      m.material = mat || lightChipMat;
      const a = ang + (Math.random() - 0.5) * 1.6, v = sp * (0.6 + Math.random() * 0.7);
      const vx = Math.cos(a) * v, vz = Math.sin(a) * v, rx = 6 + Math.random() * 6, rz = 4 + Math.random() * 6;
      let vy = 0.8 + Math.random() * 1.4, landed = false;
      m.position.set(x, y, z);
      add(m, 0.8, (u, t, dt) => {
        if (!landed) {
          vy -= 9 * dt;
          m.position.x += vx * dt; m.position.z += vz * dt; m.position.y += vy * dt;
          m.rotation.x += dt * rx; m.rotation.z += dt * rz;
          if (m.position.y <= 0.03 && vy < 0) { landed = true; m.position.y = 0.03; m.rotation.set(0, Math.random() * 6, 0); }
        }
        if (u > 0.7) m.scale.multiplyScalar(0.88);
      });
    }
  }
  // floating text (a canvas sprite)
  function label(text, color, x, y, z, { life = 1.2, rise = 0.6, size = 0.42 } = {}) {
    const c = document.createElement('canvas');
    const font = '700 40px system-ui, sans-serif';
    const m = c.getContext('2d');
    m.font = font;
    c.width = Math.max(256, Math.ceil(m.measureText(text).width) + 24);
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
    s.scale.set(size * c.width / 64, size, 1);
    s.position.set(x, y, z);
    return add(s, life, (u, t, dt) => {
      s.position.y += rise * dt * (1 - u);
      s.material.opacity = Math.min(1, u * 8) * (1 - sm(0.7, 1, u));
    });
  }
  function line(getA, getB, color, { life = 0.5, op = 0.8, w = 0.06, y = 0.06 } = {}) {
    const m = new Mesh(new PlaneGeometry(1, 1), basic(color, op));
    m.rotation.x = -Math.PI / 2;
    return add(m, life, (u) => {
      const A = getA(), B = getB();
      if (!A || !B) return;
      const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 0.01;
      m.position.set((A.x + B.x) / 2, y, (A.z + B.z) / 2);
      m.rotation.set(-Math.PI / 2, 0, -Math.atan2(dz, dx));
      m.scale.set(L, w, 1);
      m.material.opacity = op * (1 - u * u);
    });
  }
  const pos = (id) => () => {
    const e = byId(id);
    return e ? { x: e.x, z: e.z } : null;
  };
  const tankPos = () => {
    const t = tank();
    return t ? { x: t.x, z: t.z } : null;
  };

  // ---- rig cues
  bus.on('review_sh_play', (ev) => cue('play', ev));
  bus.on('review_sh_look', (ev) => cue('look', ev));
  bus.on('review_sh_shield', (ev) => cue('shield', ev));
  bus.on('review_sh_dash', (ev) => {
    cue('dash', ev);
    const t = tank();
    if (t) for (let i = 0; i < 4; i++) setTimeout(() => { const t2 = tank(); if (t2) groundDust(t2.x, t2.z, 2, 0.3, 0.45, 0.5); }, 120 + i * 130);
  });
  bus.on('review_sh_dig', (ev) => {
    cue('dig', ev);
    if (ev.phase === 'down') {
      chunks(ev.x, ev.z, { n: 10, r: 0.9, up: 2.4, life: 0.8 });
      groundDust(ev.x, ev.z, 7, 0.6, 1, 0.63);
    }
    if (ev.phase === 'up') {
      if (mound) kill(mound);
      mound = null;
      chunks(ev.x, ev.z, { n: 18, r: 1.8, up: 3.6, life: 1.1, mat: rockMat, size: 1.4 });
      groundDust(ev.x, ev.z, 10, 1.4);
    }
  });

  // ---- rings
  // ground hits and roars: the passed dust wave and sand edge (Heavy Slam's look); rally and grudge wait on Kesh's
  // repaints; 'feet' is Fault Line's passed ring
  const RING = { feet: [OCHRE, 0.8], grudge: [STEEL, 0.85] };
  bus.on('review_sh_ring', (ev) => {
    if (ev.kind === 'rally') {
      rallyBand(ev.x, ev.z, ev.r, 0.35, { life: 1.4, op: 0.9 });
      rallyBand(ev.x, ev.z, ev.r * 0.66, 0.35, { life: 1.25, op: 0.9 });
      sandEdge(ev.x, ev.z, ev.r, { life: 0.8, op: 0.12 });
      // small stones kicked up and lying on the bands, and a little dust off them (Kesh 20 Nov)
      for (const [rr, n] of [[ev.r - 0.17, 12], [ev.r * 0.66 - 0.17, 8]]) {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rnd(-0.2, 0.2), d = rr + rnd(-0.2, 0.2);
          const delay = 0.12 * (d / ev.r);
          setTimeout(() => chunks(ev.x + Math.cos(a) * d, ev.z + Math.sin(a) * d, { n: 1, r: 0.15, up: 0.8, life: 1.3, size: 0.8, mat: lightChipMat }), delay * 1000);
          if (i % 3 === 0) setTimeout(() => groundDust(ev.x + Math.cos(a) * d, ev.z + Math.sin(a) * d, 2, 0.25, 0.6, 0.6), delay * 1000);
        }
      }
      return;
    }
    if (!RING[ev.kind]) {
      const roar = ev.kind === 'roar';
      dustWave(ev.x, ev.z, ev.r * 1.05, { op: roar ? 0.5 : 0.55, from: roar ? 0.3 : 0.55, life: roar ? 0.8 : 0.65 });
      if (roar) dustWave(ev.x, ev.z, ev.r * 0.85, { y: 0.26, op: 0.35, spin: -1.2, from: 0.3, life: 0.6 });
      sandEdge(ev.x, ev.z, ev.r, { life: 0.7, op: 0.12 });
      return;
    }
    const [c, op] = RING[ev.kind];
    ring(ev.x, ev.z, ev.r, c, { life: ev.kind === 'roar' || ev.kind === 'rally' ? 0.55 : 0.45, op });
    if (ev.kind === 'roar' || ev.kind === 'rally') ring(ev.x, ev.z, ev.r * 0.7, c, { life: 0.45, op: op * 0.6 });
    if (ev.kind === 'grudge') {
      puff(ev.x, ev.z, { n: 14, r: 2, color: STEEL, life: 0.8, size: 0.45 });
    }
  });
  // every taunt: the passed Colossus beam, from his chest (or the Growlstone, a guarded ally) to the foe.
  // The class layer's thin taunt line is off on this page; Colossus draws its own beams for its first 600 ms.
  globalThis.__reviewNoTauntLine = true;
  let colBeamsUntil = 0;
  bus.on('review_sh_taunt', (ev) => {
    if (!ev.ok) return;
    if (ev.from) return goldBeam(null, ev.id, { from: ev.from, y: 0.55 });
    const T = tank();
    if (T && performance.now() > colBeamsUntil) goldBeam(T, ev.id, { y: T.reviewGiant ? COL_CHEST : 0.75 });
  });
  bus.on('review_sh_stone', (ev) => {
    const t = tank();
    if (!t) return;
    if (ev.gained) label(`Stone ${ev.n}`, STEEL, t.x, 2.0, t.z, { life: 0.9, rise: 0.4, size: 0.24 });
    if (ev.crumble) {
      chunks(t.x, t.z, { n: 10, r: 0.5, up: 1.2, mat: stoneMat, life: 0.8 });
      groundDust(t.x, t.z, 6, 0.4, 1, 0.52);
    }
  });
  bus.on('review_sh_growl', (ev) => {
    label('growl', PARCH, ev.x, 1.5, ev.z, { life: 0.8, size: 0.2 });
  });
  bus.on('review_sh_hearty', (ev) => {
    const t = tank();
    if (!t) return;
    label(`+${ev.n} max HP`, STEEL, t.x, 2.1, t.z, { life: 1.3, rise: 0.5, size: 0.26 });
    // a mote flies from the fallen foe into him
    const s = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: STEEL, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    s.scale.setScalar(0.3);
    add(s, 0.45, (u) => {
      const t2 = tank() || t;
      s.position.set(ev.x + (t2.x - ev.x) * u, 0.6 + 0.6 * Math.sin(Math.PI * u), ev.z + (t2.z - ev.z) * u);
      s.material.opacity = 0.8 * (1 - u * 0.5);
    });
  });

  // ---- Rock Toss
  bus.on('review_sh_rock', (ev) => {
    const m = floorSlab(ev.x0, ev.z0, 0.2, chipSideMat, false, false, 0.22);
    chunks(ev.x0, ev.z0, { n: 6, r: 0.4, up: 1.6, life: 0.6 });
    add(m, ev.secs + 0.05, (u) => {
      const e = ev.id != null ? byId(ev.id) : null;
      const x1 = e ? e.x : ev.x1, z1 = e ? e.z : ev.z1;
      const k = Math.min(1, u * 1.1);
      m.position.set(ev.x0 + (x1 - ev.x0) * k, 0.7 + 1.4 * Math.sin(Math.PI * k), ev.z0 + (z1 - ev.z0) * k);
      m.rotation.x += 0.3;
      m.rotation.y += 0.2;
    });
  });
  bus.on('review_sh_dust', (ev) => {
    groundDust(ev.x, ev.z, 6, ev.r);
    chunks(ev.x, ev.z, { n: 6, r: 0.8, up: 1.8, life: 0.7, mat: rockMat });
  });

  // ---- Landslide: the strip of floor heaves and slides back to him (dream-loop look, page only)
  // a soft warm dust bed, feathered dark at its rim (x runs along the strip)
  const slideBedTex = (() => {
    const W = 512, c = document.createElement('canvas');
    c.width = W; c.height = W;
    const g = c.getContext('2d'), img = g.createImageData(W, W), d = img.data;
    const cA = [0xAD, 0x97, 0x7A], cB = [0x5A, 0x4A, 0x3A];
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const ex = (x / W - 0.5) * 2, ey = (y / W - 0.5) * 2 / 0.48; // 5u x 2.4u inside a 5.2u square
      const n = 0.08 * Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2) + 0.06 * Math.sin(y * 0.11 + x * 0.03);
      const r = Math.hypot(ex, ey) + n;
      if (r >= 1) continue;
      const rim = sm(0.55, 0.85, r), fade = 1 - sm(0.82, 1, r);
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = cA[k] + (cB[k] - cA[k]) * rim;
      d[i + 3] = 255 * fade * (0.28 + (0.22 - 0.28) * rim) / 0.28;
    }
    g.putImageData(img, 0, 0);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  })();
  // thin cracks radiating from the strip's rim and from behind his ring, drawn fresh per cast (seeded)
  function slideCracks(len, w) {
    const S = 8, W = 1024, P = W / S, c = document.createElement('canvas');
    c.width = W; c.height = W;
    const g = c.getContext('2d');
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#2E2620';
    const mid = len * 0.45; // canvas centre sits this far along the strip
    const px = (a, cc) => [W / 2 + (a - mid) * P, W / 2 + cc * P];
    const lines = [];
    const crack = (a, cc, ang, L, w0) => {
      const pts = [[a, cc]];
      let x = a, y = cc, an = ang;
      const n = Math.max(3, Math.round(L / 0.1));
      for (let i = 0; i < n; i++) { an += rnd(-0.4, 0.4); x += Math.cos(an) * L / n; y += Math.sin(an) * L / n; pts.push([x, y]); }
      lines.push({ pts, w0 });
      return pts;
    };
    const rx = len * 0.55, rz = w * 0.55, roots = [];
    for (let i = 0; i < 15; i++) {
      const th = (i / 15) * Math.PI * 2 + rnd(-0.15, 0.15);
      roots.push(th);
      const a = mid + Math.cos(th) * rx, cc = Math.sin(th) * rz;
      const out = Math.atan2(Math.sin(th) / rz, Math.cos(th) / rx);
      const pts = crack(a, cc, out, rnd(0.4, 0.9), 0.05);
      if (i % 3 === 0) { const q = pts[Math.floor(pts.length / 2)]; crack(q[0], q[1], out + rnd(0.5, 0.9) * (i % 2 ? 1 : -1), rnd(0.25, 0.4), 0.03); }
    }
    for (let i = 0; i < 2; i++) crack(1.9 + i * 0.9, rnd(-0.3, 0.3), rnd(-0.2, 0.2) + (i ? Math.PI : 0), rnd(0.4, 0.6), 0.035); // two short ones along the strip, between the foes
    for (let i = 0; i < 4; i++) { // behind and beside his ring
      const th = Math.PI + (i - 1.5) * 0.7;
      crack(Math.cos(th) * 0.75, Math.sin(th) * 0.75, th, rnd(0.4, 0.8), 0.045);
    }
    // a torn rim of broken floor: thin jagged dark segments (0.1-0.18u) along the strip's edge, each at a crack root
    g.fillStyle = 'rgba(58,50,44,0.82)';
    for (const th0 of roots) {
      const ex = (t) => [mid + Math.cos(t) * rx, Math.sin(t) * rz];
      const circ = Math.hypot(rx * Math.sin(th0), rz * Math.cos(th0)) || 1;
      const segL = rnd(0.4, 0.8) / circ, th = th0 - segL * rnd(0.3, 0.7), wd = rnd(0.1, 0.18), n = 12;
      const outer = [], inner = [];
      for (let j = 0; j <= n; j++) {
        const t = th + (segL * j) / n, [a, cc] = ex(t), nl = Math.hypot(Math.cos(t) / rx, Math.sin(t) / rz);
        const ox = Math.cos(t) / rx / nl, oz = Math.sin(t) / rz / nl, taper = Math.sin(Math.PI * j / n) ** 0.6;
        const wo = wd * 0.5 * taper * rnd(0.3, 1.5), wi = wd * 0.5 * taper * rnd(0.3, 1.5); // jagged, crack-like
        outer.push(px(a + ox * wo, cc + oz * wo)); inner.push(px(a - ox * wi, cc - oz * wi));
      }
      g.beginPath(); g.moveTo(...outer[0]); for (const q of outer.slice(1)) g.lineTo(...q); for (const q of inner.reverse()) g.lineTo(...q); g.closePath(); g.fill();
    }
    // a soft warm dust fringe under each crack, then the crack itself tapering to its tip
    g.filter = 'blur(4px)';
    g.strokeStyle = 'rgba(138,116,88,0.25)';
    g.lineWidth = 0.1 * P;
    for (const { pts } of lines) { g.beginPath(); g.moveTo(...px(...pts[0])); for (const q of pts.slice(1)) g.lineTo(...px(...q)); g.stroke(); }
    g.filter = 'none';
    g.strokeStyle = '#2E2620';
    for (const { pts, w0 } of lines) for (let i = 1; i < pts.length; i++) {
      g.lineWidth = Math.max(1.2, (w0 + (0.015 - w0) * (i / (pts.length - 1))) * P);
      g.beginPath(); g.moveTo(...px(...pts[i - 1])); g.lineTo(...px(...pts[i])); g.stroke();
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return { tex: t, size: S, mid };
  }
  // a floor spike: a 3-4 faced shard of floor tapering to one off-centre point, floor tone warming toward the top,
  // a warm lift in its shadow faces (not blue-black), one lit edge on its top 60%
  const SPIKE_BASE = new Color('#7A6E64'), SPIKE_TOP = new Color('#8F8070'); // lit, the faces land near #7A6E64 (top quarter #8F8070) and #463C34 in shadow
  const spikeMat = new MeshStandardMaterial({ color: '#FFFFFF', vertexColors: true, roughness: 1, flatShading: true, emissive: '#1E1610', emissiveIntensity: 1 }); // a warm floor so no face goes below about #3E352E
  const shardEdgeMat = new MeshBasicMaterial({ color: '#D9B37A', transparent: true, opacity: 0.5, depthWrite: false });
  function floorShard(b, h) {
    const seg = rand() < 0.5 ? 3 : 4;
    const geo = new ConeGeometry(b / 2, h, seg, 1, false, rnd(0, Math.PI * 2)).toNonIndexed();
    geo.translate(0, h / 2, 0);
    const tx = rnd(-0.25, 0.25) * b, tz = rnd(-0.2, 0.2) * b; // the point sits off centre
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), k = y / h;
      pos.setX(i, pos.getX(i) * (1 - 0.15 * k) + tx * k); pos.setZ(i, pos.getZ(i) * (1 - 0.15 * k) + tz * k);
      c.copy(SPIKE_BASE).lerp(SPIKE_TOP, sm(0.72, 0.8, k));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const g = new Group();
    g.add(new Mesh(geo, spikeMat));
    // the lit edge: from 40% up one base corner's edge to the point
    let bx = 0, bz = 0;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0.001) { const x = pos.getX(i), z = pos.getZ(i); if (z - 0.5 * x > bz - 0.5 * bx) { bx = x; bz = z; } }
    const p0 = new Vector3(bx + (tx - bx) * 0.4, h * 0.4, bz + (tz - bz) * 0.4), p1 = new Vector3(tx, h, tz);
    const L = p0.distanceTo(p1), e = new Mesh(new CylinderGeometry(0.008, 0.008, L, 4), shardEdgeMat);
    e.position.copy(p0).add(p1).multiplyScalar(0.5);
    e.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    g.add(e);
    return g;
  }
  function ironBlade(b, h) {
    const g = floorShard(b, h);
    g.children[0].material = ironMat;
    g.children[1].material = ironEdgeMat;
    return g;
  }
  // the sand wave: x across the band (inner = the hero side, leading -> outer), y along the arc. A soft feathered sand body,
  // 2-3 uneven streaks that taper to points at both tails, and only the leading edge brightened
  const slideWaveTex = [0, 1].map((vi) => {
    const W = 192, H = 256, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    const body = [0xE8, 0xC5, 0x8A], crest = [0xF6, 0xE3, 0xB8];
    // the band is 0.6u: u 0.0167 = 0.01u. Crest 0.05u on the hero side, the leading streak 0.19u behind it, then hairlines
    // [centre u, half-width u, alpha, start v, end v]: hairlines 0.03-0.05u, uneven lengths, so it reads as lines dragged
    // at most 2, one ~60% of the arc and one ~30%, each drifting off the leading streak toward its tail, each broken once
    const hair = vi ? [[0.48, 0.035, 0.35, 0.3, 0.9, 0.55], [0.7, 0.03, 0.3, 0.12, 0.42, 0.3]] : [[0.52, 0.035, 0.35, 0.08, 0.68, 0.4], [0.76, 0.03, 0.3, 0.6, 0.9, 0.72]];
    const seg = (v, v0, v1) => (v > v0 && v < v1 ? Math.sin(Math.PI * (v - v0) / (v1 - v0)) ** 0.8 : 0);
    const prof = (u, c0, hw) => Math.exp(-(((u - c0) / hw) ** 4));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / (W - 1), v = y / (H - 1), tail = seg(v, 0, 1);
      let a = 0.22 * sm(0, 0.15, u) * (1 - sm(0.8, 1, u)) * tail, e = 0;
      a = Math.max(a, 0.5 * prof(u, 0.25, 0.16) * seg(v, 0.03, 0.97)); // the leading streak, #E8C58A at 0.5
      for (const [c0, hw, k, v0, v1, vg] of hair) {
        const drift = 0.18 * Math.abs(v - v0) / (v1 - v0) * (v0 < 0.5 ? 1 : -1); // not parallel: they diverge toward the tail
        const gap = 1 - Math.exp(-(((v - vg) / 0.025) ** 4)); // one 0.2-0.3u break
        a = Math.max(a, k * prof(u, c0 + drift, hw) * seg(v, v0, v1) * gap);
      }
      const cr = 0.6 * prof(u, 0.05, 0.04) * seg(v, 0.06, 0.94); // the crest line, hero side only
      if (cr > a) { a = cr; e = 1; } else e = Math.min(1, cr / 0.6);
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = body[k] + (crest[k] - body[k]) * e;
      d[i + 3] = 255 * a;
    }
    g.putImageData(img, 0, 0);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  });
  function slidePuff(x, z, delay, op = 0.32) {
    const sp = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: '#C9B290', transparent: true, depthWrite: false, opacity: 0, toneMapped: true }));
    const sz = rnd(1.0, 1.3);
    add(sp, delay + 0.6, (u, t) => {
      const k = Math.max(0, t - delay) / 0.4;
      sp.position.set(x, 0.15 + 0.3 * Math.min(1, k), z);
      sp.scale.set(sz * (0.8 + 0.3 * k), sz * 0.6 * (0.8 + 0.3 * k), 1);
      sp.material.opacity = op * sm(0, 0.05, t - delay) * (1 - sm(0.25, 0.6, t - delay));
    });
  }
  bus.on('review_sh_slide', (ev) => {
    seed = 18 + Math.round(ev.x * 10) * 31 + Math.round(ev.z * 10) * 17;
    const fa = Math.atan2(ev.dz, ev.dx), nx = -ev.dz, nz = ev.dx, T = ev.secs, life = T + 1.2;
    const at = (a, c) => [ev.x + ev.dx * a + nx * c, ev.z + ev.dz * a + nz * c];
    // 1. the dust bed: in 80 ms, hold, out over 600 ms
    {
      const [cx, cz] = at(ev.len * 0.45, 0);
      const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: slideBedTex, transparent: true, depthWrite: false, opacity: 0 }));
      m.rotation.set(-Math.PI / 2, 0, -fa);
      m.position.set(cx, 0.03, cz);
      m.scale.setScalar(ev.len + 0.4); // its feather ends inside the torn rim
      m.renderOrder = -3;
      add(m, 1.08, (u, t) => { m.material.opacity = 0.36 * sm(0, 0.06, t) * (1 - sm(0.48, 1.08, t)); }); // texture alpha is 1 at the centre: 0.34 there, ~0.27 at the rim
    }
    // 2. thin cracks round the whole strip: in over 60 ms, out over the last 500 ms
    {
      const k = slideCracks(ev.len, ev.w), [cx, cz] = at(k.mid, 0);
      const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: k.tex, transparent: true, depthWrite: false, opacity: 0 }));
      m.rotation.set(-Math.PI / 2, 0, -fa);
      m.position.set(cx, 0.034, cz);
      m.scale.setScalar(k.size);
      m.renderOrder = -2;
      add(m, life, (u, t) => { m.material.opacity = 0.55 * sm(0, 0.06, t) * (1 - sm(life - 0.5, life, t)); });
    }
    // 3. sand waves: open C arcs (130-170 deg) flat on the floor, all out within 40 ms of the cast, open toward him and
    //    long along the strip, offset across it so they don't nest, sliding 1u in; none reaches past len + 0.4
    [0.8, 1.0, 2.4, 3.9].forEach((ac, i) => {
      const near = i === 0; // a thinner arc by him: slides only 0.3u, so it ends outside his ring
      const span = rnd(130, 170) * Math.PI / 180, SX = 1.35, r = near ? 1.0 : Math.min(rnd(1.2, 1.6), (ev.len + 0.4 - ac) / SX), band = Math.min(near ? 0.45 : 0.6, r * 0.5);
      const delay = i * 0.01, cOff = i === 3 ? 0.4 : rnd(-0.3, 0.3); // the far arc sits toward the camera, off the 2.4u one
      const rIn = 1 - band / r;
      const geo = new RingGeometry(rIn, 1, 64, 1, -span / 2, span);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j), y = pos.getY(j);
        uv.setXY(j, (Math.hypot(x, y) - rIn) / (1 - rIn), Math.min(1, Math.max(0, (Math.atan2(y, x) + span / 2) / span)));
      }
      const g = new Group();
      g.rotation.set(-Math.PI / 2, 0, -fa); // local +x runs along the strip, away from him
      const m = new Mesh(geo, new MeshBasicMaterial({ map: slideWaveTex[i % 2], transparent: true, depthWrite: false, opacity: 0, side: DoubleSide }));
      m.scale.set(r * SX, r, 1);
      g.add(m);
      const op = near ? 0.4 : 1;
      add(g, 1.0, (u, t) => {
        const k = sm(delay, delay + 0.35, t) * (near ? 0.3 : 1), [cx, cz] = at(ac - k, near ? 0 : cOff);
        g.position.set(cx, 0.05 + 0.01 * i, cz);
        m.material.opacity = op * sm(delay, delay + 0.025, t) * (1 - sm(0.55, 1, u));
      });
    });
    // 4. floor shards heaved up on the cast: far end first (15 ms apart toward him), full height in 90 ms, held 450 ms,
    //    sunk over 300 ms; 5 tall at the far end, 4 mid shards between the foes, the rest tapering along both edges
    const shards = [];
    for (let i = 0; i < 5; i++) shards.push({ a: rnd(ev.len - 0.9, ev.len + 0.15), c: (i - 2) * ev.w * 0.22 + rnd(-0.1, 0.1), h: i % 2 ? rnd(0.8, 1.0) : rnd(1.2, 1.4), b: i % 2 ? rnd(0.36, 0.42) : 0.45, tall: true, slab: true });
    [0.85, 0.45, 0.65].forEach((h, i) => shards.push({ a: 1.2 + i * 0.9 + rnd(-0.15, 0.15), c: ev.w * rnd(0.44, 0.58), h: h + rnd(-0.05, 0.05), b: 0, slab: i === 0 })); // camera-side edge, in front of the foes, uneven
    for (let i = 0; i < 2; i++) shards.push({ a: 2.0 + i * 0.8 + rnd(-0.1, 0.1), c: -ev.w * rnd(0.46, 0.54), h: rnd(0.4, 0.5), b: 0 }); // far edge, between the foes
    for (let i = 0; i < 2; i++) shards.push({ a: 3.4 + i * 0.7 + rnd(-0.1, 0.1), c: -ev.w * rnd(0.48, 0.56), h: rnd(0.7, 0.9), b: 0 }); // far edge, behind the far foes
    for (let i = 0; i < 4; i++) {
      const a = 0.9 + (i / 3) * (ev.len - 1.9) + rnd(-0.2, 0.2);
      shards.push({ a, c: (i % 2 ? 1 : -1) * rnd(ev.w * 0.56, ev.w * 0.66), h: 0.3 + 0.2 * (a / ev.len) + rnd(0, 0.1), b: 0 });
    }
    for (const q of shards) if (!q.tall) q.b = Math.max(0.3, Math.min(0.45, q.h / 1.6)); // spikes: base 0.3-0.45u to one point
    shards.sort((p, q) => q.a - p.a).forEach(({ a, c, h, b, tall, slab }, rank) => {
      const [cx, cz] = at(a, c);
      const m = floorShard(b, h);
      const hx = ev.x - cx, hz = ev.z - cz, hl = Math.hypot(hx, hz) || 1;
      const ax = new Vector3(hz / hl, 0, -hx / hl), lean = 0.52 + (rank % 2 ? 1 : -1) * rnd(0.09, 0.13), yaw = rnd(-0.4, 0.4);
      const when = rank * 0.005, k = (t) => sm(when, when + 0.09, t) * (1 - sm(when + 0.54, when + 0.84, t));
      m.visible = false;
      add(m, when + 0.9, (u, t) => {
        const up = sm(when, when + 0.09, t), kk = k(t);
        m.visible = kk > 0.001;
        m.position.set(cx, -h * 0.35 * (1 - up) - h * 0.7 * (up - kk), cz);
        m.quaternion.setFromAxisAngle(ax, lean * up);
        m.rotateY(yaw);
        m.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * up));
      });
      contactShadow(cx, cz, b * 1.2, when + 0.9, (u, t) => k(t));
      { // a dark socket where it tore out of the floor
        const so = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: getRadialTexture(), color: '#2E2620', transparent: true, depthWrite: false, opacity: 0 }));
        so.rotation.x = -Math.PI / 2;
        so.position.set(cx, 0.038, cz);
        so.scale.setScalar(b * 1.3 * 1.6);
        add(so, when + 0.9, (u, t) => { so.material.opacity = 0.5 * k(t); });
      }
      if (slab) { // a lifted tile leaning at its foot, on the camera side
        const sx = cx + rnd(-0.15, 0.15), sz = cz + rnd(0.18, 0.28), len = rnd(0.4, 0.5), sl = faultChunk(sx, sz, len);
        const sax = new Vector3(rnd(-1, 1), 0, rnd(-1, 1)).normalize(), tilt = rnd(0.35, 0.6);
        sl.visible = false;
        add(sl, when + 0.9, (u, t) => {
          const kk = k(t);
          sl.visible = kk > 0.001;
          sl.position.set(sx, 0.02 + 0.08 * kk, sz);
          sl.quaternion.setFromAxisAngle(sax, tilt * kk);
          sl.scale.setScalar(Math.max(0.001, kk));
        });
      }
      if (tall && rank % 2 === 0) slidePuff(cx, cz, when, 0.15); // light, so the far end doesn't pool
    });
    // 4b. 7 fallen tile chunks lying along the near edge (floor-grey tops, broken sides)
    for (let i = 0; i < 7; i++) {
      const a = 0.9 + i * 0.55 + rnd(-0.15, 0.15), c = ev.w * rnd(0.36, 0.5), [cx, cz] = at(a, c), len = rnd(0.25, 0.35);
      const m = faultChunk(cx, cz, len);
      const ax = new Vector3(rnd(-1, 1), 0, rnd(-1, 1)).normalize(), tilt = rnd(0.15, 0.4), when = 0.02 + i * 0.01;
      const k = (t) => sm(when, when + 0.08, t) * (1 - sm(0.75, 1.05, t));
      m.visible = false;
      add(m, 1.1, (u, t) => {
        const kk = k(t);
        m.visible = kk > 0.001;
        m.position.set(cx, 0.01 + 0.04 * kk, cz);
        m.quaternion.setFromAxisAngle(ax, tilt * kk);
        m.scale.setScalar(Math.max(0.001, kk));
      });
      contactShadow(cx, cz, len, 1.1, (u, t) => k(t));
    }
    // 4c. 6 small lifted tile fragments on the floor between the foes, each over a dark gap
    for (let i = 0; i < 6; i++) {
      const [cx, cz] = at(1.6 + i * 0.36 + rnd(-0.1, 0.1), rnd(-0.3, 0.3) * ev.w), len = rnd(0.15, 0.25);
      const m = faultChunk(cx, cz, len, i % 2 === 0);
      const ax = new Vector3(rnd(-1, 1), 0, rnd(-1, 1)).normalize(), tilt = rnd(0, 0.33), when = 0.02 + i * 0.008;
      const k = (t) => sm(when, when + 0.06, t) * (1 - sm(0.75, 1.05, t));
      const gp = floorDecal(cx, cz, len * 1.7, getRadialTexture(), { life: 1.1, op: 0.55, color: '#3A322C', y: 0.039, rot: 0, fadeFrom: 0.68 });
      m.visible = false;
      add(m, 1.1, (u, t) => {
        const kk = k(t);
        m.visible = kk > 0.001;
        m.position.set(cx, 0.01 + 0.03 * kk, cz);
        m.quaternion.setFromAxisAngle(ax, tilt * kk);
        m.scale.setScalar(Math.max(0.001, kk));
      });
    }
    // 5. 18 small tile chips, out on the cast; 6 thrown up over the strip's far edge; 5 warm; all drifting back to him
    for (let i = 0; i < 28; i++) {
      const air = i < 6 || (i >= 18 && i < 23), a0 = i >= 23 ? rnd(1.2, 3.4) : i >= 18 ? rnd(0.8, 2.5) : rnd(0.8, ev.len + 0.3), c = i < 6 ? -rnd(0.5, 0.75) * ev.w : rnd(-0.55, 0.55) * ev.w, len = rnd(0.1, 0.22);
      const m = splitSides(floorSlab(0, 0, len / 2, faultSideMat, 'x1.3', true, rnd(0.04, 0.08), i % 2 ? '#B8A890' : null)); // a flake
      m.material = [m.material[0].clone(), m.material[1]];
      m.material[0].map = null;
      m.material[0].color.set('#6E6660').lerp(new Color('#8A6A45'), i % 4 === 1 && !air ? 1 : air ? 0 : rnd(0, 0.35)).multiplyScalar(i % 4 === 1 && !air ? 0.95 : 1.25);
      const hop = i < 5 ? rnd(1.0, 1.2) : air ? rnd(0.3, 0.8) : rnd(0.02, 0.08);
      const ax = new Vector3(rnd(-1, 1), rnd(-0.2, 0.2), rnd(-1, 1)).normalize(), spin = rnd(4, 9);
      const carry = Math.min(1.6, Math.max(0, a0 - 0.9));
      add(m, life, (u, t) => {
        const k = sm(0, T + 0.2, t), a = a0 - carry * (1 - (1 - k) ** 2);
        const [cx, cz] = at(a, c * (1 - 0.25 * k));
        m.position.set(cx, 0.02 + hop * Math.sin(Math.min(1, 0.25 + 0.75 * t / (T + 0.2)) * Math.PI), cz);
        m.quaternion.setFromAxisAngle(ax, spin * Math.min(t, T));
        m.scale.setScalar(Math.max(0.001, 1 - sm(0.85, 1, u)));
      });
    }
    // 6. dust puffs under the foes (the shards' get theirs as they rise)
    for (const e of world.entities()) {
      if (e.faction !== 'hostile' || !(e.hp > 0)) continue;
      const rx = e.x - ev.x, rz = e.z - ev.z, al = rx * ev.dx + rz * ev.dz;
      if (al > 0 && al < ev.len + 0.5 && Math.abs(rx * nx + rz * nz) < ev.w * 0.6) slidePuff(e.x, e.z, 0.02);
    }
    for (let i = 0; i < 3; i++) { const [cx, cz] = at(1.2 + i * 1.2, ev.w * 0.3); slidePuff(cx, cz, 0.03 + i * 0.02, 0.25); } // inside the spike line
  });

  // ---- Growlstone (stand-in until Kesh's Tripo model): a knee-high standing stone carved with a badger's face
  let growl = null;
  // Kesh's Tripo Growlstone (17 Nov, 960 faces): height 1 in the file, drawn knee-high
  let growlModel = null;
  import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader().loadAsync('/review/growlstone.glb')).then((g) => {
    growlModel = g.scene;
    growlModel.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }).catch(() => {});
  function makeGrowlstone() {
    if (growlModel) {
      const g = new Group();
      const m = growlModel.clone();
      m.scale.setScalar(0.85);
      g.add(m);
      return g;
    }
    const g = new Group();
    const body = new Mesh(new CylinderGeometry(0.2, 0.27, 0.62, 7), stoneMat);
    body.position.y = 0.31;
    g.add(body);
    const cap = new Mesh(new DodecahedronGeometry(0.21, 0), stoneMat);
    cap.scale.set(1, 0.55, 0.9);
    cap.position.y = 0.63;
    g.add(cap);
    const dark = new MeshStandardMaterial({ color: '#2C2A27', roughness: 1, flatShading: true });
    const pale = new MeshStandardMaterial({ color: '#CFC9BC', roughness: 1, flatShading: true });
    // the badger's face stripe (pale), the eye bands (dark), the snout
    const stripe = new Mesh(new BoxGeometry(0.07, 0.34, 0.03), pale);
    stripe.position.set(0, 0.47, 0.235);
    g.add(stripe);
    for (const s of [-1, 1]) {
      const band = new Mesh(new BoxGeometry(0.06, 0.26, 0.03), dark);
      band.position.set(0.085 * s, 0.45, 0.225);
      g.add(band);
      const eye = new Mesh(new SphereGeometry(0.022, 8, 6), new MeshBasicMaterial({ color: STEEL }));
      eye.position.set(0.085 * s, 0.47, 0.245);
      g.add(eye);
    }
    const snout = new Mesh(new BoxGeometry(0.1, 0.06, 0.05), dark);
    snout.position.set(0, 0.32, 0.24);
    g.add(snout);
    const mouth = new Mesh(new BoxGeometry(0.14, 0.02, 0.03), dark);
    mouth.position.set(0, 0.25, 0.235);
    g.add(mouth);
    return g;
  }
  bus.on('review_sh_growlstone', (ev) => {
    if (growl) kill(growl);
    const g = makeGrowlstone();
    g.position.set(ev.x, 0, ev.z);
    const t = tank();
    if (t) g.rotation.y = Math.atan2(t.x - ev.x, t.z - ev.z) + Math.PI; // faces away from him, toward the fight
    chunks(ev.x, ev.z, { n: 8, r: 0.6, up: 2.2, life: 0.7 });
    groundDust(ev.x, ev.z, 6, 0.5, 1, 0.57);
    const it = add(g, ev.life + 0.4, (u, tt) => {
      const rise = sm(0, 0.18, tt);
      g.position.y = -0.7 * (1 - rise);
      const pulse = it.pulse > 0 ? (it.pulse -= 1 / 60 / 0.3) : 0;
      g.scale.set(1 + 0.12 * Math.max(0, pulse), 1 + 0.06 * Math.max(0, pulse), 1 + 0.12 * Math.max(0, pulse));
      if (tt > ev.life) g.position.y = -0.7 * sm(ev.life, ev.life + 0.4, tt);
      if (it.flyY != null) {
        g.position.y = it.flyY;
        g.rotation.x += 0.12;
      } else g.rotation.x *= 0.8;
    });
    it.pulse = 0;
    it.id = ev.id;
    growl = it;
  });
  bus.on('review_sh_stoneroar', (ev) => {
    if (!growl) return;
    growl.pulse = 1;
    const p = growl.obj.position;
    groundDust(p.x, p.z, 4, 0.4, 1, 0.52);
    if (ev.wide) label('roars', STEEL, p.x, 1.1, p.z, { life: 0.8, size: 0.22 });
  });
  bus.on('review_sh_stone_gone', (ev) => {
    if (growl && growl.id === ev.id) {
      const p = growl.obj.position;
      chunks(p.x, p.z, { n: 8, r: 0.5, up: 1.4, mat: stoneMat, life: 0.7 });
      growl.t = Math.max(growl.t, growl.life - 0.4);
      growl = null;
    }
  });

  // ---- Fracture (S20): pale cracks on the foe and one pip per Crack over its head
  const crackTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.strokeStyle = BONE;
    g.lineCap = 'round';
    const branch = (x, y, a, len, w, depth) => {
      if (depth <= 0 || len < 6) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x2, y2);
      g.stroke();
      branch(x2, y2, a + 0.5, len * 0.62, w * 0.7, depth - 1);
      branch(x2, y2, a - 0.45, len * 0.55, w * 0.7, depth - 1);
    };
    for (let i = 0; i < 5; i++) branch(64, 64, (i / 5) * Math.PI * 2 + 0.3, 26, 4, 3);
    return new CanvasTexture(c);
  })();
  function pipsTex(n) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 32;
    const g = c.getContext('2d');
    for (let i = 0; i < 4; i++) {
      const x = 16 + i * 32;
      g.beginPath();
      g.arc(x, 16, 9, 0, Math.PI * 2);
      g.fillStyle = i < n ? BONE : 'rgba(30,26,22,0.55)';
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(14,16,12,0.9)';
      g.stroke();
    }
    return new CanvasTexture(c);
  }
  const PIPS = [0, 1, 2, 3, 4].map(pipsTex);
  const cracks = new Map(); // foe id -> { crack, pips, n, age }
  function dropCrack(id) {
    const c = cracks.get(id);
    if (!c) return;
    kill(c.it);
    cracks.delete(id);
  }
  bus.on('review_sh_crack', (ev) => {
    let c = cracks.get(ev.id);
    if (!c) {
      const g = new Group();
      const cr = new Sprite(new SpriteMaterial({ map: crackTex, transparent: true, depthWrite: false, opacity: 0 }));
      const pp = new Sprite(new SpriteMaterial({ map: PIPS[0], transparent: true, depthWrite: false, depthTest: false }));
      pp.renderOrder = 998;
      pp.scale.set(0.6, 0.15, 1);
      g.add(cr, pp);
      c = { cr, pp, n: 0, age: 0 };
      c.it = add(g, 1e9, (u, t, dt) => {
        const e = byId(ev.id);
        c.age += dt;
        if (!e || !(e.hp > 0) || c.age > 4) return dropCrack(ev.id);
        const h = (e.radius || 0.45) * 1.6;
        g.position.set(e.x, (e.reviewY || 0), e.z);
        cr.position.y = h * 0.55;
        pp.position.y = h + 0.75;
        cr.scale.setScalar(h * (0.7 + 0.12 * c.n));
        cr.material.opacity = Math.min(0.95, 0.35 + 0.17 * c.n) * (1 - sm(3.6, 4, c.age));
      });
      cracks.set(ev.id, c);
    }
    c.n = ev.n;
    c.age = 0;
    c.pp.material.map = PIPS[Math.min(4, ev.n)];
    c.pp.material.needsUpdate = true;
  });
  bus.on('review_sh_shatter', (ev) => {
    dropCrack(ev.id);
    chunks(ev.x, ev.z, { n: 16, r: 1.6, up: 2.8, mat: stoneMat, life: 0.9, size: 1.1 });
    groundDust(ev.x, ev.z, 7, 0.7, 1, 0.69);
    dustWave(ev.x, ev.z, 0.9, { op: 0.5, from: 0.4, life: 0.5 });
    label('shatter', BONE, ev.x, 1.6, ev.z, { life: 0.9, size: 0.24 });
  });

  // ---- Slabguard (S21): shots stop on the slab; a shove to end it
  bus.on('review_sh_slab', (ev) => {
    cue('slab', ev);
    if (ev.on && ev.rip) {
      // Bare Claws: the slab comes up out of the floor in front of him
      chunks(ev.x + ev.dx * 0.6, ev.z + ev.dz * 0.6, { n: 14, r: 0.9, up: 2.6, mat: stoneMat, life: 0.8 });
      groundDust(ev.x + ev.dx * 0.6, ev.z + ev.dz * 0.6, 7, 0.6, 1, 0.63);
    }
    if (ev.shove) {
      const ang = Math.atan2(ev.dz, ev.dx);
      const arc = new Mesh(new RingGeometry(0.85, 1, 32, 1, -Math.PI / 3, (2 * Math.PI) / 3), basic(STEEL, 0.75));
      arc.rotation.set(-Math.PI / 2, 0, -ang);
      arc.position.set(ev.x - ev.dx * 0.9, 0.06, ev.z - ev.dz * 0.9);
      add(arc, 0.4, (u) => {
        arc.scale.setScalar(0.9 + 0.9 * u);
        arc.material.opacity = 0.75 * (1 - u * u);
      });
      groundDust(ev.x, ev.z, 6, 0.6, 1, 0.63);
      const t = tank();
      if (t && window.__tripoTank && !window.__tripoTank.shield) {
        // the ripped slab breaks on the shove
        chunks(ev.x, ev.z, { n: 16, r: 1.4, up: 2.2, mat: stoneMat, life: 0.9, size: 1.2 });
      }
    }
  });
  const lightChipMat = new MeshStandardMaterial({ color: '#B09A80', emissive: '#4A4036', emissiveIntensity: 1, roughness: 1, flatShading: true });
  bus.on('review_sh_block', (ev) => {
    const s = new Sprite(new SpriteMaterial({ map: starTex, color: '#F2A23A', transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, opacity: 0 }));
    s.renderOrder = 8;
    s.position.set(ev.x, 0.5, ev.z);
    add(s, 0.25, (u) => {
      s.scale.setScalar(0.32 + 0.08 * u);
      s.material.opacity = 0.85 * sm(0, 0.1, u) * (1 - u);
    });
    chunks(ev.x, ev.z, { n: 8, r: 0.6, up: 1.6, life: 1.1, size: 1.5, mat: lightChipMat });
    const T = tank();
    if (T) dustArc(T.x, T.z, 1.3, { span: 2.1, op: 0.95, w: 0.3, life: 0.9, spin: 0.2, toward: Math.atan2(ev.z - T.z, ev.x - T.x), color: '#C0905C', over: true });
    label('blocked', STEEL, ev.x, 1.35, ev.z, { life: 0.6, size: 0.18 });
  });

  // ---- Stone Ring (S47): plain standing stones rise round him
  let ringIt = null;
  bus.on('review_sh_stonering', (ev) => {
    if (!ev.on) {
      if (ringIt) ringIt.end = ringIt.t;
      ringIt = null;
      return;
    }
    if (ringIt) kill(ringIt);
    const g = new Group();
    const stones = [];
    for (let i = 0; i < ev.n; i++) {
      const a = (i / ev.n) * Math.PI * 2;
      const m = floorShard(0.5, 0.95);
      m.position.set(Math.cos(a) * ev.r, 0, Math.sin(a) * ev.r);
      m.rotation.y = Math.random() * 3;
      m.scale.set(1, 0.85 + 0.35 * ((i * 7) % 5) / 5, 1);
      g.add(m);
      stones.push({ m, h: m.scale.y, d: (i % 4) * 0.03 });
      setTimeout(() => chunks(ev.x + Math.cos(a) * ev.r, ev.z + Math.sin(a) * ev.r, { n: 2, r: 0.4, up: 1.6, life: 0.5 }), 0);
    }
    const fl = new Mesh(new RingGeometry(ev.r - 0.05, ev.r + 0.05, 72), basic(STONE, 0.35));
    fl.rotation.x = -Math.PI / 2;
    fl.position.y = 0.03;
    g.add(fl);
    g.position.set(ev.x, 0, ev.z);
    groundDust(ev.x, ev.z, 8, ev.r);
    const it = add(g, 99, (u, t) => {
      const sink = it.end != null ? sm(0, 0.35, t - it.end) : 0;
      for (const st of stones) st.m.position.y = -0.95 * st.h * (1 - sm(st.d, ev.rise + st.d, t)) - 0.95 * st.h * sink;
      if (sink >= 1) it.t = it.life;
    });
    ringIt = it;
  });

  // ---- Slab Throw (S48): the slab flies, bounces through foes and comes back
  let thrownIt = null;
  function slabMesh(rip) {
    const src = window.__tripoTankSts && window.__tripoTankSts[0] && window.__tripoTankSts[0].weapon;
    if (src && !rip) {
      const g = new Group();
      const c = src.clone();
      c.position.set(0, 0, 0);
      c.quaternion.identity();
      const ws = new Vector3();
      src.getWorldScale(ws);
      c.scale.copy(ws);
      c.visible = true;
      // lay it flat: the outer face (the round boss) up, the grip side down, as it spins
      const holder = new Group();
      holder.rotation.x = -Math.PI / 2;
      holder.add(c);
      g.add(holder);
      return g;
    }
    const m = new Mesh(new BoxGeometry(0.55, 0.08, 0.7), rip ? stoneMat : ironMat);
    const g = new Group();
    g.add(m);
    return g;
  }
  bus.on('review_sh_slabthrow', (ev) => {
    if (ev.on) {
      cue('slabaway', { on: true, rip: ev.rip });
      if (thrownIt) kill(thrownIt);
      const g = slabMesh(ev.rip);
      g.position.set(ev.x, 0.8, ev.z);
      thrownIt = add(g, 99, (u, t, dt) => {
        g.rotation.y += dt * 14;
      });
      if (ev.rip) {
        chunks(ev.x, ev.z, { n: 12, r: 0.8, up: 2.4, mat: stoneMat, life: 0.8 });
        groundDust(ev.x, ev.z, 6, 0.5, 1, 0.57);
      }
      return;
    }
    if (thrownIt) kill(thrownIt);
    thrownIt = null;
    cue('slabaway', { on: false });
    if (ev.broke) {
      chunks(ev.x, ev.z, { n: 16, r: 1.4, up: 2.4, mat: stoneMat, life: 0.9, size: 1.2 });
      groundDust(ev.x, ev.z, 6, 0.6, 1, 0.63);
    } else if (ev.caught) puff(ev.x, ev.z, { n: 4, r: 0.3, color: STEEL, h: 1.2, life: 0.4, size: 0.2 });
  });
  bus.on('review_sh_slabpos', (ev) => {
    if (thrownIt) thrownIt.obj.position.set(ev.x, 0.8, ev.z);
  });
  bus.on('review_sh_slabhit', (ev) => {
    ring(ev.x, ev.z, 0.7, STEEL, { life: 0.3, op: 0.7 });
    chunks(ev.x, ev.z, { n: 5, r: 0.7, up: 1.6, mat: ironMat, life: 0.5, size: 0.6 });
  });

  // ---- Grindstone (S49): grinding dust whirls round him
  let grindIt = null;
  bus.on('review_sh_grind', (ev) => {
    if (!ev.on) {
      if (grindIt) grindIt.end = grindIt.t;
      grindIt = null;
      return;
    }
    const g = new Group();
    const motes = [];
    for (let i = 0; i < 46; i++) {
      const s2 = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: '#C8A87A', transparent: true, depthWrite: false, opacity: 0 }));
      const rr = 0.6 + Math.random() * (ev.r - 0.6);
      motes.push({ s: s2, rr, a: Math.random() * 6.28, h: 0.15 + Math.random() * 0.9, sp: 2.2 + Math.random() * 1.5, sz: 0.18 + Math.random() * 0.22 });
      g.add(s2);
    }
    const bits = [];
    for (let i = 0; i < 14; i++) {
      const m = floorSlab(0, 0, 0.07 + Math.random() * 0.05, chipSideMat, true, true);
      bits.push({ m, rr: 0.8 + Math.random() * (ev.r - 0.9), a: Math.random() * 6.28, h: 0.1 + Math.random() * 0.6, sp: 2.6 + Math.random() });
      g.add(m);
    }
    const fl = new Mesh(new RingGeometry(ev.r - 0.06, ev.r, 72), basic(STONE, 0.4));
    fl.rotation.x = -Math.PI / 2;
    fl.position.y = 0.04;
    g.add(fl);
    const it = add(g, 99, (u, t, dt) => {
      const T = tank();
      if (T) g.position.set(T.x, 0, T.z);
      const fade = (1 - (it.end != null ? sm(0, 0.4, t - it.end) : 0)) * sm(0, 0.3, t);
      for (const m of motes) {
        m.a += m.sp * dt;
        m.s.position.set(Math.cos(m.a) * m.rr, m.h, Math.sin(m.a) * m.rr);
        m.s.scale.set(m.sz * 2, m.sz * 1.1, 1);
        m.s.material.opacity = 0.22 * fade;
      }
      for (const b of bits) {
        b.a += b.sp * dt;
        b.m.position.set(Math.cos(b.a) * b.rr, b.h, Math.sin(b.a) * b.rr);
        b.m.rotation.set(0.5 * Math.sin(b.a * 3), b.a, 0.4 * Math.cos(b.a * 2)); // tumbling but mostly face-up, the tiles showing
        b.m.scale.setScalar(Math.max(0.001, fade));
      }
      fl.material.opacity = 0.4 * fade;
      if (it.end != null && fade <= 0) it.t = it.life;
    });
    grindIt = it;
  });

  // ---- Stone Cubs (S50): stand-in cubs (a stone badger, knee-high) until Kesh's Tripo model
  const cubs = new Map();
  const paleMat = new MeshStandardMaterial({ color: '#CFC9BC', roughness: 1, flatShading: true });
  const darkMat = new MeshStandardMaterial({ color: '#2C2A27', roughness: 1, flatShading: true });
  function makeCub() {
    const g = new Group();
    const body = new Mesh(new DodecahedronGeometry(0.2, 0), stoneMat);
    body.scale.set(0.9, 0.75, 1.25);
    body.position.y = 0.2;
    g.add(body);
    const head = new Mesh(new DodecahedronGeometry(0.13, 0), stoneMat);
    head.position.set(0, 0.3, 0.25);
    g.add(head);
    const stripe = new Mesh(new BoxGeometry(0.05, 0.03, 0.2), paleMat);
    stripe.position.set(0, 0.42, 0.25);
    g.add(stripe);
    for (const sx of [-1, 1]) {
      const band = new Mesh(new BoxGeometry(0.035, 0.04, 0.12), darkMat);
      band.position.set(0.06 * sx, 0.36, 0.31);
      g.add(band);
      const ear = new Mesh(new DodecahedronGeometry(0.04, 0), stoneMat);
      ear.position.set(0.09 * sx, 0.42, 0.18);
      g.add(ear);
    }
    const snout = new Mesh(new BoxGeometry(0.07, 0.06, 0.08), darkMat);
    snout.position.set(0, 0.27, 0.37);
    g.add(snout);
    const legs = [];
    for (const [lx, lz] of [[-0.11, 0.13], [0.11, 0.13], [-0.11, -0.15], [0.11, -0.15]]) {
      const l = new Mesh(new BoxGeometry(0.07, 0.13, 0.07), stoneMat);
      l.position.set(lx, 0.06, lz);
      g.add(l);
      legs.push(l);
    }
    g.userData = { head, legs, body };
    return g;
  }
  bus.on('review_sh_cubs', (ev) => {
    for (const b of ev.born || []) {
      const g = makeCub();
      g.position.set(b.x, -0.5, b.z);
      chunks(b.x, b.z, { n: 8, r: 0.6, up: 2, life: 0.7 });
      groundDust(b.x, b.z, 4, 0.4, 1, 0.52);
      const c = { g, x: b.x, z: b.z, yaw: 0, s: 'climb', bite: 0, t: 0 };
      c.it = add(g, 1e9, (u, t, dt) => {
        c.t += dt;
        const k = Math.min(1, dt * 14);
        g.position.x += (c.x - g.position.x) * k;
        g.position.z += (c.z - g.position.z) * k;
        g.position.y = c.s === 'climb' ? -0.5 + 0.5 * sm(0, 0.45, c.t) : c.s === 'dig' ? -0.6 * sm(0, 0.25, c.t - (c.digT || 0)) : 0;
        c.roar = Math.max(0, (c.roar || 0) - dt / 0.5);
        const dy = Math.atan2(Math.sin(c.yaw - g.rotation.y), Math.cos(c.yaw - g.rotation.y));
        g.rotation.y += dy * Math.min(1, dt * 12);
        const run = c.s === 'run' ? 1 : 0;
        const ud = g.userData;
        ud.legs.forEach((l, i) => (l.rotation.x = run * 0.7 * Math.sin(c.t * 18 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0))));
        ud.body.position.y = 0.2 + run * 0.03 * Math.abs(Math.sin(c.t * 18));
        c.bite = Math.max(0, c.bite - dt / 0.22);
        const lunge = Math.sin(Math.PI * (1 - c.bite)) * (c.bite > 0 ? 1 : 0);
        ud.head.position.z = 0.25 + 0.1 * lunge;
        ud.head.rotation.x = -0.4 * lunge - 0.6 * Math.sin(Math.PI * Math.min(1, (1 - c.roar) * 1.2)) * (c.roar > 0 ? 1 : 0);
      });
      cubs.set(b.id, c);
    }
    for (const id of ev.dig || []) {
      const c = cubs.get(id);
      if (!c) continue;
      c.s = 'dig';
      c.digT = c.t;
      chunks(c.x, c.z, { n: 6, r: 0.4, up: 1.6, life: 0.6 });
      groundDust(c.x, c.z, 4, 0.35, 1, 0.49);
    }
    for (const u of ev.up || []) {
      const c = cubs.get(u.id);
      if (!c) continue;
      c.x = u.x; c.z = u.z; c.s = 'climb'; c.t = 0;
      c.g.position.set(u.x, -0.5, u.z);
      chunks(u.x, u.z, { n: 8, r: 0.6, up: 2, life: 0.7 });
      groundDust(u.x, u.z, 4, 0.4, 1, 0.52);
    }
    for (const id of ev.roar || []) {
      const c = cubs.get(id);
      if (c) c.roar = 1;
    }
    for (const a of ev.at || []) {
      const c = cubs.get(a.id);
      if (!c) continue;
      if (c.s === 'dig' && a.s === 'dig') continue;
      c.x = a.x;
      c.z = a.z;
      c.s = a.s;
      c.yaw = Math.atan2(a.fx, a.fz);
    }
    for (const id of ev.bit || []) {
      const c = cubs.get(id);
      if (!c) continue;
      c.bite = 1;
      groundDust(c.x + Math.sin(c.yaw) * 0.35, c.z + Math.cos(c.yaw) * 0.35, 2, 0.2, 1, 0.41);
    }
    for (const id of ev.gone || []) {
      const c = cubs.get(id);
      if (!c) continue;
      chunks(c.x, c.z, { n: 10, r: 0.6, up: 1.4, mat: stoneMat, life: 0.8 });
      groundDust(c.x, c.z, 4, 0.4, 1, 0.52);
      kill(c.it);
      cubs.delete(id);
    }
  });

  // ---- Kick the stone: the Growlstone rolls
  bus.on('review_sh_roll', (ev) => {
    if (!growl) return;
    if (ev.start) {
      growl.roll = { dx: ev.dx, dz: ev.dz };
      label('rolls', STEEL, growl.obj.position.x, 1.2, growl.obj.position.z, { life: 0.8, size: 0.22 });
      return;
    }
    const g = growl.obj;
    const dx = ev.x - g.position.x, dz = ev.z - g.position.z, d = Math.hypot(dx, dz);
    g.position.x = ev.x;
    g.position.z = ev.z;
    if (growl.roll && d > 0.001) {
      g.children[0].rotateOnWorldAxis(new Vector3(growl.roll.dz, 0, -growl.roll.dx), d / 0.4);
      if (Math.random() < 0.5) groundDust(ev.x, ev.z, 2, 0.3, 1, 0.46);
    }
    if (ev.done) growl.roll = null;
  });
  bus.on('review_sh_slamweight', (ev) => {
    label(`+${ev.extra} from Stone`, STEEL, ev.x, 1.9, ev.z, { life: 1.2, size: 0.24 });
  });
  bus.on('review_sh_shotback', (ev) => {
    const s2 = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: '#B8141F', transparent: true, depthWrite: false }));
    s2.scale.setScalar(0.15);
    add(s2, ev.secs, (u) => {
      const e = byId(ev.id);
      const x1 = e ? e.x : ev.x, z1 = e ? e.z : ev.z;
      s2.position.set(ev.x + (x1 - ev.x) * u, 0.7, ev.z + (z1 - ev.z) * u);
      s2.material.opacity = 0.9;
    });
    line(() => ({ x: ev.x, z: ev.z }), pos(ev.id), '#B8141F', { life: ev.secs + 0.1, op: 0.55, w: 0.05, y: 0.7 }); // the foe's own shot: Foe Crimson
  });
  bus.on('review_sh_wallslam', (ev) => {
    chunks(ev.x, ev.z, { n: 14, r: 1.2, up: 2.2, mat: stoneMat, life: 0.9 });
    groundDust(ev.x, ev.z, 8, 0.8, 1, 0.74);
    label('wall slam', PARCH, ev.ex, 1.7, ev.ez, { life: 1.0, size: 0.26 });
    // a crack mark on the wall face
    const m = new Sprite(new SpriteMaterial({ map: crackTex, color: '#3A332B', transparent: true, depthWrite: false }));
    m.position.set(ev.x - ev.dx * 0.05, 0.6, ev.z - ev.dz * 0.05);
    m.scale.setScalar(1.1);
    add(m, 2.5, (u) => (m.material.opacity = 0.9 * (1 - sm(0.7, 1, u))));
  });

  // ---- Stoneheart (S53): a stone-grey heart on his chest; a capped hit throws a ring of chips
  const heartTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#4A3F36';
    g.strokeStyle = '#F2B36B';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(32, 54);
    g.bezierCurveTo(4, 34, 8, 8, 32, 20);
    g.bezierCurveTo(56, 8, 60, 34, 32, 54);
    g.fill();
    g.stroke();
    return new CanvasTexture(c);
  })();
  bus.on('review_sh_heart', (ev) => {
    const g = new Group();
    const h = new Sprite(new SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false, depthTest: false }));
    h.renderOrder = 997;
    h.scale.setScalar(0.25);
    const glow = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: '#E8B060', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.4 }));
    glow.scale.setScalar(0.6);
    g.add(glow, h);
    add(g, ev.secs, (u, t) => {
      const T = tank();
      if (T) g.position.set(T.x, 1.0 * (window.__tripoTankSts?.[0]?.dbg?.grow.k || 1), T.z + 0.25);
      const f = sm(0, 0.15, t) * (1 - sm(0.94, 1, u));
      h.material.opacity = f;
      glow.material.opacity = 0.2 * f * (0.8 + 0.2 * Math.sin(t * 6));
    });
  });
  const heartPlateMat = new MeshStandardMaterial({ color: '#8C7B6A', roughness: 1, flatShading: true });
  const heartSideMat = new MeshStandardMaterial({ color: '#5E5246', roughness: 1, flatShading: true });
  bus.on('review_sh_capped', (ev) => {
    // Kesh 20 Nov: the blocks float a little out from him, bob up and down and circle him, with dust
    for (let i = 0; i < 11; i++) {
      const a0 = (i / 11) * Math.PI * 2, y0 = 0.6 + rnd(-0.04, 0.04), ph = rnd(0, 6.28), sz = rnd(0.08, 0.1);
      const m = floorSlab(0, 0, sz, chipSideMat, false, true, 0.12);
      m.material = [heartPlateMat, heartSideMat];
      let vy = 0;
      add(m, 1.5, (u, t, dt) => {
        const T = tank(), cx = T ? T.x : ev.x, cz = T ? T.z : ev.z;
        const out = sm(0, 0.25, t), drop = t > 1.15 ? t - 1.15 : 0;
        const r = 0.34 + 0.24 * out + drop * 0.5, a = a0 + 2.4 * t; // ~0.6u out, a turn every 2.6 s
        if (drop) vy -= 8 * dt;
        const bob = 0.07 * Math.sin(t * 5 + ph) * out;
        m.position.set(cx + Math.cos(a) * r, Math.max(0.03, y0 + bob + vy * drop), cz + Math.sin(a) * r);
        m.rotation.set(Math.PI / 2 - 0.1 + 0.15 * Math.sin(t * 3 + ph), 0, 0); // stood up, face out, rocking a little
        m.rotation.y = -a + Math.PI / 2;
        if (u > 0.85) m.scale.setScalar(1 - (u - 0.85) / 0.15);
      });
    }
    groundDust(ev.x, ev.z, 8, 0.7, 1, 0.8);
    { // a slow dust swirl that follows the blocks round
      const T0 = tank();
      for (let i = 0; i < 8; i++) {
        const sp = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: '#C8A87A', transparent: true, depthWrite: false, opacity: 0 }));
        const a0 = (i / 8) * Math.PI * 2, sz = rnd(0.35, 0.55);
        add(sp, 1.3, (u, t) => {
          const T = tank() || T0, a = a0 + 2.0 * t, r = 0.5 + 0.25 * u;
          sp.position.set((T ? T.x : ev.x) + Math.cos(a) * r, 0.2 + 0.25 * u, (T ? T.z : ev.z) + Math.sin(a) * r);
          sp.scale.set(sz * (0.8 + 0.6 * u), sz * 0.6 * (0.8 + 0.6 * u), 1);
          sp.material.opacity = 0.35 * Math.min(1, u * 6) * (1 - sm(0.4, 1, u));
        });
      }
    }
    label(`${ev.thrown} → ${ev.took}`, STEEL, ev.x, 2.3, ev.z, { life: 1.3, size: 0.26 });
  });

  // a heavy blow from a foe (Foe Crimson, the foe's own colour)
  bus.on('review_sh_blow', (ev) => {
    const ang = Math.atan2(ev.tz - ev.z, ev.tx - ev.x);
    const arc = new Mesh(new RingGeometry(0.7, 1, 32, 1, -0.9, 1.8), basic('#B8141F', 0.85));
    arc.rotation.set(-Math.PI / 2, 0, -ang);
    arc.position.set((ev.x + ev.tx) / 2, 0.6, (ev.z + ev.tz) / 2);
    add(arc, 0.3, (u) => {
      arc.scale.setScalar(0.5 + 0.5 * u);
      arc.material.opacity = 0.85 * (1 - u);
    });
    if (ev.big) label('heavy blow', PARCH, ev.x, 1.4, ev.z, { life: 0.8, size: 0.2 });
  });
  // ---- Counter Spin (S54): every 5th hit he spins
  bus.on('review_sh_spincount', (ev) => {
    const t = tank();
    if (t) label(`${ev.n}/5`, PARCH, t.x + 0.5, 2.0, t.z, { life: 0.6, rise: 0.3, size: 0.2 });
  });
  bus.on('review_sh_spin', (ev) => {
    dustWave(ev.x, ev.z, ev.r, { y: 0.25, op: 0.6, spin: 3.2, from: 0.5, life: 0.5 });
    groundDust(ev.x, ev.z, 7, ev.r);
  });

  // ---- Badger Toss (S55): grab, heave, land
  bus.on('review_sh_btoss', (ev) => {
    if (ev.phase === 'land') {
      dustWave(ev.x, ev.z, ev.r * 1.05, { op: 0.55, from: 0.55, life: 0.65 });
      sandEdge(ev.x, ev.z, ev.r, { life: 0.7, op: 0.12 });
      chunks(ev.x, ev.z, { n: 14, r: 1.4, up: 2.4, life: 0.9 });
      groundDust(ev.x, ev.z, 8, 1.2, 1, 0.96);
    }
  });

  // ---- Bodyguard (1.2): the hop, and dust where he lands
  bus.on('review_sh_hop', (ev) => {
    cue('hop', ev);
    const t = tank();
    if (!t) return;
    groundDust(t.x, t.z, 4, 0.4, 1, 0.52);
    const x = t.x + ev.dx, z = t.z + ev.dz;
    setTimeout(() => {
      chunks(x, z, { n: 10, r: 1.1, up: 2.0, life: 0.7 });
      groundDust(x, z, 8, 1.2, 1, 0.96);
    }, ev.secs * 1000);
  });

  // ---- Colossus cast, dream-loop pass (target: vfx-dream/stonehide/targets/2-colossus-gpt.png): the floor cracks
  // round him with a pale-gold light in the seams, two dusty rings roll out with a thin gold edge, a gold beam reaches
  // every foe he taunts, and the floor breaks up under each of them. Gold here is his warm stone-light, kept pale
  // and dim (never Ember).
  const COL_GOLD = '#F0B860';
  const COL_CHEST = 1.15; // his chest height as the giant (Colossus scale 1.8, Kesh 19 Nov: bigger)
  const colTex = { cracks: null, glow: null, foe: null };
  import('three').then(({ TextureLoader }) => {
    const L = new TextureLoader();
    L.loadAsync('/review/colossus-cracks.png').then((t) => { t.colorSpace = SRGBColorSpace; t.anisotropy = 4; colTex.cracks = t; });
    L.loadAsync('/review/colossus-glow.png').then((t) => { t.colorSpace = SRGBColorSpace; t.anisotropy = 4; colTex.glow = t; });
    L.loadAsync('/review/colossus-foe-cracks.png').then((t) => { t.colorSpace = SRGBColorSpace; t.anisotropy = 4; colTex.foe = t; });
  });
  function floorDecal(x, z, size, map, { life = 2.2, op = 1, additive = false, color = '#FFFFFF', y = 0.036, grow = 0.1, fadeFrom = 0.6, rot = null } = {}) {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map, color, transparent: true, depthWrite: false, opacity: 0, ...(additive ? { blending: AdditiveBlending } : {}) }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rot ?? rnd(0, Math.PI * 2);
    m.position.set(x, y, z);
    m.renderOrder = additive ? -1 : -2;
    return add(m, life, (u, t) => {
      m.scale.setScalar(size * (0.8 + 0.2 * sm(0, grow, t)));
      m.material.opacity = op * (1 - sm(fadeFrom, 1, u));
    });
  }
  // a glassy ribbon: thin fill, one bright edge; x runs inner -> outer, y along the arc (its ends taper)
  const bandTex = (() => {
    const W = 256, H = 64, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    let sd = 4242; const lr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    // 6 streaks along the arc at different radii, each fading in and out along its length
    const streaks = Array.from({ length: 4 }, () => ({ f: 0.2 + lr() * 0.62, w: 0.025 + lr() * 0.03, a0: lr() * 0.3, a1: 0.55 + lr() * 0.45 }));
    for (let y = 0; y < H; y++) {
      const v = y / (H - 1), taper = sm(0, 0.18, v) * (1 - sm(0.82, 1, v));
      const wv = sm(0, 0.25, v) * (1 - sm(0.75, 1, v)); // the last ~20 degrees narrow to nothing, toward the outer edge
      for (let x = 0; x < W; x++) {
        const f = x / (W - 1);
        let st = 0.12 * sm(0, 0.06, f) + 0.25 * 0.7 * Math.exp(-(((f - 0.06) / 0.025) ** 2)); // soft body + a dim inner edge
        for (const q of streaks) st += 0.21 * Math.exp(-(((f - q.f) / q.w) ** 2)) * sm(q.a0, q.a0 + 0.12, v) * (1 - sm(q.a1 - 0.12, q.a1, v));
        const edge = 0.7 * Math.exp(-(((f - 0.93) / 0.03) ** 2));
        const a = Math.min(1, (st + edge) * taper) * (1 - sm(0.97, 1, f)) * sm(0.97 - wv, 1.0 - wv, f);
        const we = edge / (st + edge + 1e-6); // colour: streaks #F3DDB0, edge #FFD98A
        const k = (y * W + x) * 4;
        img.data[k] = Math.round(243 + 12 * we); img.data[k + 1] = Math.round(221 - 4 * we); img.data[k + 2] = Math.round(176 - 38 * we); img.data[k + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  // tiny tan specks on the outer side of a band (grain, normal blend)
  const sandTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 512;
    const g = c.getContext('2d');
    for (let i = 0; i < 1400; i++) {
      const u = Math.random() ** 0.7, x = u * 256, y = Math.random() * 512, a = (1 - u) * 0.9;
      g.fillStyle = `rgba(${200 + ((Math.random() * 30) | 0)},${184 + ((Math.random() * 26) | 0)},${150 + ((Math.random() * 24) | 0)},${a.toFixed(2)})`;
      g.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  function sandEdge(x, z, r, { life = 0.8, op = 0.15, w = 0.12 } = {}) {
    const geo = new RingGeometry(1, 1 + w, 128, 1);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i);
      uv.setXY(i, (Math.hypot(px, py) - 1) / w, (Math.atan2(py, px) / (Math.PI * 2) + 0.5) * 6);
    }
    sandTex.wrapT = 1000;
    const m = new Mesh(geo, new MeshBasicMaterial({ map: sandTex, transparent: true, depthWrite: false, opacity: 0, side: DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.09, z);
    add(m, life, (u) => {
      m.scale.setScalar(r * (0.55 + 0.45 * (1 - (1 - Math.min(1, u * 0.94)) ** 3)));
      m.material.opacity = op / 0.15 * 0.9 * sm(0, 0.08, u) * (1 - sm(0.35, 1, u));
    });
  }
  // Rallying Cry's floor band (Kesh's repaint): one band, a soft gold fill between two brighter edges
  const rallyBandTex = (() => {
    const W = 128, c = document.createElement('canvas');
    c.width = W; c.height = 4;
    const g = c.getContext('2d'), img = g.createImageData(W, 4);
    for (let x = 0; x < W; x++) {
      const f = x / (W - 1), e = Math.max(Math.exp(-(((f - 0.08) / 0.05) ** 2)), Math.exp(-(((f - 0.92) / 0.05) ** 2)));
      const a = Math.min(1, 0.2 * sm(0, 0.06, f) * (1 - sm(0.94, 1, f)) + 0.7 * e);
      for (let y = 0; y < 4; y++) {
        const k = (y * W + x) * 4;
        img.data[k] = 0xE8 + (0xFF - 0xE8) * e; img.data[k + 1] = 0xB8 + (0xD5 - 0xB8) * e; img.data[k + 2] = 0x60 + (0x8A - 0x60) * e; img.data[k + 3] = 255 * a;
      }
    }
    g.putImageData(img, 0, 0);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  // cracks running along and across the band (Kesh 20 Nov "crack on the ring, like the floor"); u across, v along
  const rallyCrackTex = (() => {
    const W = 64, H = 1024, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.lineCap = 'round';
    const line = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); };
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 2; k++) { // two long cracks wandering along the band
      const pts = []; let x = 18 + k * 26;
      for (let y = 0; y <= H; y += 24) { x = Math.min(W - 8, Math.max(8, x + (r() - 0.5) * 16)); pts.push([x, y]); }
      line(pts, 3, 'rgba(58,42,30,0.85)'); line(pts.map(([px, py]) => [px + 1.5, py + 1]), 1, 'rgba(255,214,150,0.5)');
    }
    for (let i = 0; i < 26; i++) { // short cross cracks, branching
      const y = r() * H, x0 = r() * 20, pts = [[x0, y]];
      let x = x0, yy = y;
      for (let j = 0; j < 4; j++) { x += 8 + r() * 10; yy += (r() - 0.5) * 18; pts.push([x, yy]); }
      line(pts, 2, 'rgba(58,42,30,0.75)');
    }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.wrapT = 1000; return t;
  })();
  function rallyBand(x, z, r, w, { life = 1.2, op = 1, from = 0.5 } = {}) {
    { // the cracked layer over the band, same size and timing
      const geo = new RingGeometry(r - w, r, 128, 1), pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) { const px = pos.getX(i), py = pos.getY(i); uv.setXY(i, (Math.hypot(px, py) - (r - w)) / w, (Math.atan2(py, px) / (Math.PI * 2) + 0.5) * r * 1.2); }
      const cm = new Mesh(geo, new MeshBasicMaterial({ map: rallyCrackTex, transparent: true, depthWrite: false, opacity: 0, side: DoubleSide }));
      cm.rotation.x = -Math.PI / 2;
      cm.position.set(x, 0.065, z);
      add(cm, life, (u) => {
        cm.scale.setScalar(from + (1 - from) * (1 - (1 - Math.min(1, u * 3)) ** 3));
        cm.material.opacity = 0.8 * op * sm(0, 0.05, u) * (1 - sm(0.6, 1, u));
      });
    }
    const geo = new RingGeometry(r - w, r, 128, 1), pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - (r - w)) / w, 0.5);
    const m = new Mesh(geo, new MeshBasicMaterial({ map: rallyBandTex, transparent: true, depthWrite: false, opacity: 0, side: DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.06, z);
    add(m, life, (u) => {
      m.scale.setScalar(from + (1 - from) * (1 - (1 - Math.min(1, u * 3)) ** 3));
      m.material.opacity = op * sm(0, 0.05, u) * (1 - sm(0.6, 1, u));
    });
  }
  function goldEdge(x, z, r, { life = 0.6, op = 0.45, from = 0.3, w = 0.14, arcs = 0 } = {}) {
    // arcs > 0: the ring breaks into that many swept arcs with 15-25 degree gaps, each tapering at its ends
    const parts = [];
    if (arcs) {
      let a0 = rnd(0, Math.PI * 2);
      const gaps = Array.from({ length: arcs }, () => rnd(0.26, 0.44)), total = Math.PI * 2 - gaps.reduce((p, q) => p + q, 0);
      for (let i = 0; i < arcs; i++) { const len = total / arcs; parts.push([a0, len]); a0 += len + gaps[i]; }
    } else parts.push([0, Math.PI * 2]);
    const g = new Group();
    for (const [t0, tl] of parts) {
      const geo = new RingGeometry(1 - w, 1, Math.max(16, Math.round(128 * tl / (Math.PI * 2))), 1, t0, tl);
      // RingGeometry's UV is planar; give it u = inner -> outer and v = along the arc
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), py = pos.getY(i);
        let ang = Math.atan2(py, px) - t0;
        while (ang < -1e-4) ang += Math.PI * 2;
        uv.setXY(i, (Math.hypot(px, py) - (1 - w)) / w, arcs ? Math.min(1, ang / tl) : 0.5);
      }
      g.add(new Mesh(geo, new MeshBasicMaterial({ map: bandTex, color: '#FFFFFF', transparent: true, depthWrite: false, opacity: 0, side: DoubleSide, blending: AdditiveBlending })));
    }
    const m = g;
    m.material = { set opacity(v) { for (const c of g.children) c.material.opacity = v; } };
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.1, z);
    add(m, life, (u) => {
      m.scale.setScalar(r * (from + (1 - from) * (1 - (1 - u) ** 3)));
      m.material.opacity = op * sm(0, 0.05, u) * (1 - sm(0.3, 1, u));
    });
    return parts;
  }
  const speckTex = (() => { // ~20 grain specks, 2-3 px at play zoom
    const N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');
    let sd = 777; const lr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    g.fillStyle = '#FFFFFF';
    for (let i = 0; i < 20; i++) {
      const a = lr() * Math.PI * 2, r = Math.sqrt(lr()) * N * 0.42, sz = 3 + lr() * 4;
      g.fillRect(N / 2 + Math.cos(a) * r, N / 2 + Math.sin(a) * r, sz, sz);
    }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  const starTex = (() => { // a 4-point spark
    const N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [w, h] of [[N, 5], [5, N]]) {
      const lg = g.createLinearGradient(w > h ? 0 : N / 2, w > h ? N / 2 : 0, w > h ? N : N / 2, w > h ? N / 2 : N);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect((N - w) / 2, (N - h) / 2, w, h);
    }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  const crackleTex = (() => { // 3-4 short gold crackle lines on the foe's body
    const N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      let a = (i / 4) * Math.PI * 2 + 0.4, x = N / 2, y = N / 2;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { a += (k % 2 ? 0.7 : -0.7); x += Math.cos(a) * 13; y += Math.sin(a) * 13; g.lineTo(x, y); }
      g.stroke();
    }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  function beamHit(e, ax, az) {
    const d = Math.hypot(e.x - ax, e.z - az) || 1, ox = (ax - e.x) / d * 0.22, oz = (az - e.z) / d * 0.22; // on the side facing him
    const st = new Sprite(new SpriteMaterial({ map: starTex, color: '#FFF1C8', transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, opacity: 0 }));
    const cr = new Sprite(new SpriteMaterial({ map: crackleTex, color: '#FFD27A', transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, opacity: 0 }));
    st.renderOrder = 8; cr.renderOrder = 7;
    const g = new Group(); g.add(st, cr);
    add(g, 0.5, (u) => {
      st.position.set(e.x + ox, 0.62, e.z + oz); cr.position.set(e.x + ox * 0.6, 0.6, e.z + oz * 0.6);
      st.scale.setScalar(0.35 * (0.7 + 0.3 * sm(0, 0.15, u))); cr.scale.setScalar(0.42);
      st.material.opacity = 0.8 * sm(0, 0.06, u) * (1 - sm(0.3, 1, u));
      cr.material.opacity = 0.6 * sm(0, 0.08, u) * (1 - sm(0.35, 1, u));
    });
  }
  function goldBeam(t, id, { life = 0.7, from = null, y = COL_CHEST } = {}) {
    let hit = false;
    const m = new Mesh(new PlaneGeometry(1, 1), basic(COL_GOLD, 0.8, true));
    const tip = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: COL_GOLD, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0 }));
    // one origin at his chest for every beam, drawn over his body so all four meet at one point
    m.material.depthTest = false; tip.material.depthTest = false;
    m.renderOrder = 5; tip.renderOrder = 6;
    const pivot = new Group();
    pivot.rotation.order = 'YZX';
    pivot.add(m);
    m.rotation.set(-Math.PI / 2, 0, 0);
    const g = new Group();
    g.add(pivot, tip);
    add(g, life, (u) => {
      const e = byId(id), T = from || tank();
      if (!e || !T) return;
      const ax = T.x, az = T.z, bx = e.x, bz = e.z, yb = 0.62; // chest -> the dummy's mid-body
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 0.01, L3 = Math.hypot(L, y - yb);
      const reach = sm(0, 0.12, u * life);
      pivot.position.set(ax, y, az);
      pivot.rotation.y = -Math.atan2(dz, dx);
      pivot.rotation.z = -Math.atan2(y - yb, L);
      m.position.set(L3 * reach / 2, 0, 0);
      m.scale.set(L3 * reach, 0.045, 1);
      m.material.opacity = 0.75 * (1 - sm(0.45, 1, u));
      tip.position.set(ax + dx * reach, y + (yb - y) * reach, az + dz * reach);
      if (reach > 0.98 && !hit) { hit = true; beamHit(e, ax, az); }
      tip.scale.setScalar(0.2 + 0.12 * sm(0.9, 1, reach));
      tip.material.opacity = 0.7 * reach * (1 - sm(0.35, 1, u));
    });
  }
  bus.on('review_sh_colossus', (ev) => {
    seed = 911;
    colBeamsUntil = performance.now() + 600;
    // one turn for both decals (the glow sits in the dark seams), picked so no crack run lies along a beam:
    // the texture's 5 runs point at canvas angles i * 72deg, which land on the floor at (angle - rot)
    const foeA = ev.ids.map((id) => byId(id)).filter(Boolean).map((e) => Math.atan2(e.z - ev.z, e.x - ev.x));
    const angGap = (p, q) => Math.abs(Math.atan2(Math.sin(p - q), Math.cos(p - q)));
    let rot = rnd(0, Math.PI * 2), best = -1;
    if (foeA.length) for (let c = 0; c < 72; c++) {
      const r = (c / 72) * Math.PI * 2;
      let worst = Math.PI;
      for (let i = 0; i < 5; i++) for (const f of foeA) worst = Math.min(worst, angGap((i / 5) * Math.PI * 2 - r, f));
      if (worst > best) { best = worst; rot = r; }
    }
    const RO = 2.45, RM = 1.85, RI = 1.05; // outer band just outside the foes, middle band at them, thin inner band
    if (colTex.cracks) floorDecal(ev.x, ev.z, 4.6, colTex.cracks, { life: 2.4, rot });
    if (colTex.glow) floorDecal(ev.x, ev.z, 4.6, colTex.glow, { rot, life: 1.4, op: 0.9, additive: true, color: '#FFCF6A', y: 0.04, fadeFrom: 0.25 });
    dustWave(ev.x, ev.z, RO + 0.2, { op: 0.35, from: 0.5, life: 0.85, spin: 1.2 }); // faint: the ribbons carry the rings
    const arcsO = goldEdge(ev.x, ev.z, RO, { life: 0.8, op: 1, w: 0.35 / RO, from: 0.55, arcs: 4 });
    const arcsM = goldEdge(ev.x, ev.z, RM, { life: 0.7, op: 0.8, w: 0.3 / RM, from: 0.55, arcs: 3 });
    goldEdge(ev.x, ev.z, RI, { life: 0.6, op: 0.6, w: 0.12 / RI, from: 0.55, arcs: 3 });
    sandEdge(ev.x, ev.z, RO + 0.02, { life: 0.85, op: 0.15 });
    // sandy wisps all round the outer band, pushed outward
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rnd(-0.3, 0.3);
      // flat on the floor, stretched 3:1 along the band, grey-tan, normal blend
      const s2 = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: getRadialTexture(), color: '#6B5D4C', transparent: true, depthWrite: false, opacity: 0 }));
      s2.rotation.set(-Math.PI / 2, 0, -(a + Math.PI / 2));
      const len = rnd(1.0, 1.6); // the radial texture's visible core is about half: 0.5-0.8u of wisp
      // a cluster of ~20 grain specks at the wisp's root
      const sp = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: speckTex, color: '#8A7660', transparent: true, depthWrite: false, opacity: 0 }));
      sp.rotation.set(-Math.PI / 2, 0, -(a + Math.PI / 2));
      add(s2, rnd(0.8, 1.0), (u) => {
        const d = RO * (0.55 + 0.45 * (1 - (1 - Math.min(1, u * 1.2)) ** 3)) + 0.15 + 0.2 * u;
        s2.position.set(ev.x + Math.cos(a) * d, 0.12, ev.z + Math.sin(a) * d);
        s2.scale.set(len * (0.9 + 0.3 * u), 0.5 * (0.9 + 0.3 * u), 1);
        s2.material.opacity = 0.45 * sm(0, 0.15, u) * (1 - sm(0.45, 1, u));
      });
      add(sp, 0.9, (u) => {
        const d = RO * (0.55 + 0.45 * (1 - (1 - Math.min(1, u * 1.2)) ** 3)) + 0.05;
        sp.position.set(ev.x + Math.cos(a) * d, 0.11, ev.z + Math.sin(a) * d);
        sp.scale.set(0.5, 0.3, 1);
        sp.material.opacity = 0.7 * sm(0, 0.1, u) * (1 - sm(0.5, 1, u));
      });
    }
    // a few bright glints riding the two outer bands' edges
    // 4-point glints on the bright edge, 3 clustered at each arc's head
    for (const [R0, arcs, life] of [[RO, arcsO, 0.8], [RM, arcsM, 0.7]]) {
      for (const [t0, tl] of arcs) {
        for (let k = 0; k < 3; k++) {
          const a = -(t0 + tl * (0.86 - k * 0.07)); // the ring lies in XY then turns flat: angle -> -z
          const gl = new Sprite(new SpriteMaterial({ map: starTex, color: '#FFE2A0', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0 }));
          const big = k === 0 ? 1 : 0.7;
          add(gl, life * 0.85, (u) => {
            const rr = R0 * 0.93 * (0.55 + 0.45 * (1 - (1 - u / 0.85) ** 3));
            gl.position.set(ev.x + Math.cos(a) * rr, 0.13, ev.z + Math.sin(a) * rr);
            gl.scale.setScalar(0.12 * big);
            gl.material.opacity = 0.9 * sm(0, 0.08, u) * (1 - sm(0.35, 1, u));
          });
        }
      }
    }
    const T = tank();
    if (T) { // a dim starburst where the beams leave his chest
      const sb = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: COL_GOLD, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, opacity: 0 }));
      sb.renderOrder = 7;
      add(sb, 0.6, (u) => {
        const t2 = tank();
        if (t2) sb.position.set(t2.x, COL_CHEST, t2.z);
        sb.scale.setScalar(0.25);
        sb.material.opacity = 0.5 * sm(0, 0.08, u) * (1 - sm(0.3, 1, u));
      });
    }
    for (const id of ev.ids) {
      if (T) goldBeam(T, id);
      const e = byId(id);
      if (e) smashSlabs(e.x, e.z, 7, 0.2, 0.36, e.x - ev.x, e.z - ev.z, true); // a heap of broken floor round the base
      if (e && colTex.foe) {
        const dd = Math.hypot(e.x - ev.x, e.z - ev.z) || 1;
        floorDecal(e.x - (e.x - ev.x) / dd * 0.5, e.z - (e.z - ev.z) / dd * 0.5, 1.1, colTex.foe, { life: 2.2 });
      }
    }
    // chips of floor thrown along the outer ring
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + rnd(-0.12, 0.12), d = i % 5 === 0 ? rnd(1.2, 1.7) : rnd(1.7, 2.45);
      const cx = ev.x + Math.cos(a) * d, cz = ev.z + Math.sin(a) * d;
      const m = floorSlab(cx, cz, rnd(0.03, 0.055), chipSideMat, true, true);
      // tilted 10-35 degrees, top turned toward the camera (+z)
      const ax = new Vector3(1, 0, rnd(-0.4, 0.4)).normalize(), tl = rnd(0.17, 0.6), hop = rnd(0.05, 0.18);
      // it breaks loose when the outer ring's front reaches it (the ring: 2.8 * (0.55 + 0.45 * easeOutCubic(t / 0.8)))
      const k = Math.min(1, (Math.min(d, RO - 0.1) / RO - 0.55) / 0.45), t0 = Math.max(0, 0.8 * (1 - Math.cbrt(1 - Math.max(0, k))));
      const sh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: getRadialTexture(), color: '#000000', transparent: true, depthWrite: false, opacity: 0 }));
      sh.rotation.x = -Math.PI / 2; sh.position.set(cx, 0.008, cz); sh.scale.setScalar(0.22); sh.visible = false;
      add(sh, 1.6, (u, t) => { sh.visible = t >= t0; sh.material.opacity = 0.4 * (1 - sm(0.85, 1, u)); });
      m.visible = false;
      add(m, 1.6, (u, t) => {
        const tt = t - t0;
        m.visible = tt >= 0;
        if (tt < 0) return;
        m.position.set(cx, 0.01 + hop * Math.sin(Math.min(1, tt / 0.3) * Math.PI), cz);
        m.quaternion.setFromAxisAngle(ax, tl * sm(0, 0.08, tt));
        if (u > 0.85) m.scale.setScalar(1 - (u - 0.85) / 0.15);
      });
    }
  });

  // ---- Colossus (S45): he grows into a stone giant, and later shrinks back
  bus.on('review_sh_giant', (ev) => {
    cue('grow', ev);
    const t = tank();
    if (!t) return;
    if (!ev.on) chunks(t.x, t.z, { n: 10, r: 1.4, up: 1.4, mat: stoneMat, life: 0.9, size: 0.9 });
    puff(t.x, t.z, { n: ev.on ? 6 : 8, r: ev.on ? 0.7 : 1.2, color: STONE, life: 0.8, size: ev.on ? 0.3 : 0.45 });
    if (ev.on) label('Colossus', STEEL, t.x, 3.0, t.z, { life: 1.2, size: 0.3 });
  });

  // ---- Bodyguard: a grey line on the floor joins them
  let guard = null;
  bus.on('review_sh_bodyguard', (ev) => {
    if (guard) kill(guard);
    guard = line(tankPos, pos(ev.ally), STONE, { life: ev.secs, op: 0.75, w: 0.07, y: 0.05 });
    const ln = guard;
    const prev = ln.update;
    ln.update = (u, t, dt) => {
      prev(0, t, dt);
      ln.obj.material.opacity = 0.75 * sm(0, 0.15, t) * (1 - sm(0.94, 1, u));
    };
    const a = byId(ev.ally);
    const rr = new Mesh(new RingGeometry(0.42, 0.5, 40), basic(STONE, 0.7));
    rr.rotation.x = -Math.PI / 2;
    add(rr, ev.secs, (u) => {
      const e = byId(ev.ally) || a;
      if (e) rr.position.set(e.x, 0.05, e.z);
      rr.material.opacity = 0.7 * (1 - sm(0.94, 1, u));
    });
  });
  bus.on('review_sh_bodyguard_end', () => {
    guard = null;
  });
  bus.on('review_sh_guardhit', (ev) => {
    const a = byId(ev.ally), t = tank();
    if (!a || !t) return;
    const s = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: STEEL, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    s.scale.setScalar(0.28);
    add(s, 0.3, (u) => {
      s.position.set(a.x + (t.x - a.x) * u, 0.4, a.z + (t.z - a.z) * u);
      s.material.opacity = 0.8 * (1 - u);
    });
  });

  // ---- Fault Line: a thin earth mark for 0.4 s, then the crack runs out and leaves rubble
  function strip(ev, color, op) {
    const m = new Mesh(new PlaneGeometry(ev.len, ev.w), basic(color, op));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(ev.dz, ev.dx);
    m.position.set(ev.x + (ev.dx * ev.len) / 2, 0.035, ev.z + (ev.dz * ev.len) / 2);
    return m;
  }
  bus.on('review_sh_fault_warn', (ev) => {
    const m = strip({ ...ev, w: 0.08 }, OCHRE, 0.6);
    add(m, ev.secs, (u) => {
      m.material.opacity = 0.25 + 0.4 * u;
      m.scale.y = 1 + 6 * u;
    });
  });
  // the fissure decals (painted top-down, tex/fault.py): 6.4u x 2.8u strip with its left end at him, its gold
  // seam lining, and a 2.4u star of forking hairlines (each foe, and his strike point)
  const faultTex = { crack: null, glow: null, star: null };
  import('three').then(({ TextureLoader }) => {
    const L = new TextureLoader();
    for (const [k, f] of [['crack', 'fault-crack'], ['glow', 'fault-glow'], ['star', 'fault-star']]) {
      L.loadAsync(`/review/${f}.png`).then((t) => { t.colorSpace = SRGBColorSpace; t.anisotropy = 4; faultTex[k] = t; });
    }
  });
  const craterBedTex = (() => {
    const N = 128, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.667, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  const faultSideMat = new MeshStandardMaterial({ color: '#4A423B', roughness: 1, flatShading: true }); // lit sides read ~#5A5048, shadowed ~#2E2925
  // a chunk of broken floor: floor-tile top, dark sides, thick enough that the sides show
  // sides split by facing: lit #5A5048 toward the light, #2E2925 away from it (vertex colours, unlit)
  const faultSideVC = new MeshBasicMaterial({ vertexColors: true });
  const SIDE_LIT = new Color('#5A5048'), SIDE_DARK = new Color('#2E2925');
  function splitSides(m) {
    const g = m.geometry, nrm = g.attributes.normal, n = nrm.count, col = new Float32Array(n * 3), c = new Color();
    for (let i = 0; i < n; i++) {
      const d = Math.max(0, Math.min(1, 0.5 + 0.6 * (nrm.getX(i) * -0.45 + nrm.getZ(i) * 0.89)));
      c.copy(SIDE_DARK).lerp(SIDE_LIT, d);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    m.material[1] = faultSideVC;
    return m;
  }
  function faultChunk(cx, cz, len, edge = true) {
    return splitSides(floorSlab(cx, cz, len / 2, faultSideMat, 'x1.3', false, rnd(0.12, 0.18), edge ? '#B8A890' : null));
  }
  // a soft contact shadow under a piece (offset away from the light)
  function contactShadow(cx, cz, len, life, k = () => 1) {
    const sh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: getRadialTexture(), color: '#14110F', transparent: true, depthWrite: false, opacity: 0 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(cx + 0.057, 0.012, cz - 0.057);
    sh.scale.setScalar(len * 1.5);
    add(sh, life, (u, t) => { sh.material.opacity = 0.6 * k(u, t); });
  }
  // the strip decal revealed outward from him over the run
  function faultStrip(ev, tex0, { life, op = 1, additive = false, color = '#FFFFFF', y = 0.034, fade = [0.82, 1], order = null }) {
    const tex = tex0.clone();
    tex.needsUpdate = true;
    const geo = new PlaneGeometry(1, 1);
    geo.translate(0.5, 0, 0);
    const m = new Mesh(geo, new MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: op, ...(additive ? { blending: AdditiveBlending } : {}) }));
    m.rotation.set(-Math.PI / 2, 0, -Math.atan2(ev.dz, ev.dx));
    m.position.set(ev.x - ev.dx * 0.2, y, ev.z - ev.dz * 0.2);
    m.renderOrder = order ?? (additive ? -1 : -2);
    const L = ev.len + 0.4;
    add(m, life, (u, t) => {
      const reach = Math.max(0.001, sm(0, 1, t / ev.run));
      m.scale.set(L * reach, 2.8, 1);
      tex.repeat.x = reach;
      m.material.opacity = op * (1 - sm(fade[0], fade[1], u));
    });
  }
  // soft dust arcs round a point (normal blend), each spanning part of a circle
  const dustArcTex = (() => {
    const W = 128, H = 128, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    let sd = 99; const lr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const wob = Array.from({ length: 8 }, () => lr());
    for (let y = 0; y < H; y++) {
      const v = y / (H - 1), taper = sm(0, 0.3, v) * (1 - sm(0.7, 1, v));
      for (let x = 0; x < W; x++) {
        const f = x / (W - 1), streak = 0.55 + 0.45 * Math.sin(f * 23 + wob[(y >> 4) & 7] * 6) * Math.sin(y * 0.21 + wob[(x >> 4) & 7] * 5);
        const a = Math.exp(-(((f - 0.5) / 0.26) ** 2)) * taper * Math.max(0, streak);
        const k = (y * W + x) * 4;
        img.data[k] = 255; img.data[k + 1] = 255; img.data[k + 2] = 255; img.data[k + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  function dustArc(x, z, r, { span = 2.2, op = 0.25, w = 0.35, life = 1.0, spin = 0.5, toward = null, color = '#B9A58A', over = false } = {}) {
    // toward: a floor angle the arc centres on (the ring's own angle runs the other way once it lies on the floor)
    const t0 = toward == null ? rnd(0, Math.PI * 2) : -toward - span / 2;
    const geo = new RingGeometry(1 - w / r, 1, 48, 1, t0, span);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i);
      let ang = Math.atan2(py, px) - t0;
      while (ang < -1e-4) ang += Math.PI * 2;
      uv.setXY(i, (Math.hypot(px, py) - (1 - w / r)) / (w / r), Math.min(1, ang / span));
    }
    // the radius wobbles +-0.15u along the arc so it reads as a wisp, not a ruled line
    const ph = rnd(0, 6), ph2 = rnd(0, 6);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i), ang = Math.atan2(py, px), k = 1 + (0.15 / r) * (0.6 * Math.sin(ang * 3 + ph) + 0.4 * Math.sin(ang * 7 + ph2));
      pos.setXY(i, px * k, py * k);
    }
    const m = new Mesh(geo, new MeshBasicMaterial({ map: dustArcTex, color, transparent: true, depthWrite: false, depthTest: !over, opacity: 0, side: DoubleSide }));
    if (over) m.renderOrder = 7;
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.1, z);
    add(m, life, (u) => {
      m.scale.setScalar(r * (0.75 + 0.25 * (1 - (1 - u) ** 2)));
      m.rotation.z = spin * u;
      m.material.opacity = op * sm(0, 0.12, u) * (1 - sm(0.4, 1, u));
    });
  }
  // floor pieces thrown up where a foe is lifted (1.5-3u high), with grit; they land and lie as rubble
  const flyMat = new MeshStandardMaterial({ color: '#6A6056', emissive: '#4A423B', emissiveIntensity: 0.5, roughness: 1, flatShading: true });
  function flySlabs(x, z, n, dx, dz, grit = 3) {
    for (let i = 0; i < n + grit; i++) {
      const isGrit = i >= n;
      const m = isGrit
        ? new Mesh(new PlaneGeometry(0.04, 0.04), new MeshBasicMaterial({ color: '#8A7C6C', side: DoubleSide }))
        : floorSlab(x, z, rnd(0.1, 0.175), faultSideMat, 'x1.1', false, rnd(0.08, 0.12), '#A89A84');
      if (!isGrit) m.material[1] = flyMat; // lit sides so it never reads black in the air
      const a = rnd(0, Math.PI * 2), sp = rnd(0.4, 0.85) * (isGrit ? 1.2 : 1); // lands 0.5-1.2u to the side
      const vx = Math.cos(a) * sp, vz = Math.sin(a) * sp;
      let vy = Math.sqrt(2 * 9 * rnd(1.5, 3.0)), y = 0.05, px = x + Math.cos(a) * 0.3, pz = z + Math.sin(a) * 0.3, landed = false; // starts clear of the foe
      const ax = new Vector3(rnd(-1, 1), rnd(-0.3, 0.3), rnd(-1, 1)).normalize(), spin = rnd(5, 10);
      let ang = 0;
      add(m, rnd(2.0, 2.4), (u, t, dt) => {
        if (!landed) {
          vy -= 9 * dt * (Math.abs(vy) < 1.4 ? 0.3 : 1); // it hangs near the top for about 0.15 s
          px += vx * dt; pz += vz * dt; y += vy * dt; ang += spin * dt;
          if (y <= 0.02 && vy < 0) { y = 0.02; landed = true; ang = Math.round(ang / Math.PI) * Math.PI + rnd(-0.25, 0.25); }
        }
        m.position.set(px, y, pz);
        m.quaternion.setFromAxisAngle(ax, ang);
        if (u > 0.85) m.scale.setScalar(1 - (u - 0.85) / 0.15);
      });
    }
  }
  bus.on('review_sh_fault', (ev) => {
    seed = 23 + Math.round(ev.x * 10) * 31 + Math.round(ev.z * 10) * 17;
    const nx = -ev.dz, nz = ev.dx;
    const life = ev.rubble + 0.5;
    const fr = { gone: null };
    if (ev.id != null) rubbleFx.set(ev.id, fr);
    const used = (t) => (fr.gone == null ? 1 : 1 - sm(fr.gone, fr.gone + 0.25, t));
    const sx = ev.x - ev.dx * 0.3, sz = ev.z - ev.dz * 0.3; // his strike point
    // 1. the crack runs out from him: thin seam, hairline side cracks, a soft crushed band; gold lines it at first
    if (faultTex.crack) faultStrip(ev, faultTex.crack, { life, y: 0.04, order: -1.5 }); // over the crater beds: the gap runs through them
    if (faultTex.glow) faultStrip(ev, faultTex.glow, { life: 0.4 + ev.run, op: 0.25, additive: true, color: '#F0B860', y: 0.036, fade: [0.5, 1] });
    if (faultTex.star) floorDecal(sx, sz, 2.4, faultTex.star, { life });
    // 2. small chunky floor lips along both sides of the seam, tipped up (they stay as the rubble)
    // the gap is wide at him and narrows to a seam (fault.py width_at, 320 px/u over the 6.4u strip)
    const halfGap = (a) => (14 + 180 * (1 - Math.max(0, Math.min(1, (a + 0.2) / 6.4) - 0.3) / 0.7) ** 1.5) / 640;
    const lips = 22;
    for (let i = 0; i < lips; i++) {
      const at = ((i + 0.5) / lips) ** 1.25, a = at * ev.len, side = i % 2 ? 1 : -1; // packed toward the start
      const off = side * (halfGap(a) + rnd(0.12, 0.24));
      const cx = ev.x + ev.dx * a + nx * off, cz = ev.z + ev.dz * a + nz * off;
      const len = rnd(0.25, 0.4) * (1.15 - 0.5 * at), m = faultChunk(cx, cz, len, false);
      const tilt = side * rnd(0.26, 0.61), lift = rnd(0.02, 0.06), ax = new Vector3(ev.dx, 0, ev.dz), spin = rnd(-0.5, 0.5);
      contactShadow(cx, cz, len, life, (u, t) => sm(at, at + 0.15, t / ev.run) * used(t) * (1 - sm(0.88, 1, u)));
      m.visible = false;
      add(m, life, (u, t) => {
        const on = sm(at, at + 0.15, t / ev.run);
        m.visible = on > 0;
        const k = on * used(t) * (1 - sm(0.88, 1, u));
        m.position.set(cx, 0.01 + lift * k, cz);
        m.quaternion.setFromAxisAngle(ax, tilt * k);
        m.rotateY(spin * k);
        m.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * k));
      });
    }
    // 3. layered dust at him, and a low haze along the line
    [[0.9, 0.35], [1.2, 0.38], [1.4, 0.35], [1.7, 0.32], [2.2, 0.26], [2.6, 0.2]].forEach(([r, op], i) => dustArc(sx, sz, r, { span: rnd(1.6, 2.8), op, w: rnd(0.25, 0.4), life: 1.0, spin: i % 2 ? -0.5 : 0.5 }));
    groundDust(sx, sz, 7, 0.4, 0.35 / 0.4, 0.5 / 0.72);
    // Kesh 19 Nov: dust along the fissure, thick at the start and thinning out toward the end, as the crack runs
    // (puffs sit beside the gap, either side, so the dark seam still reads through them)
    for (let i = 0; i < 12; i++) {
      const at = ((i + 0.5) / 12) ** 1.4, a = at * ev.len, side = i % 2 ? 1 : -1, n = Math.max(1, Math.round(3.5 - 3 * at));
      const off = side * (halfGap(a) + 0.3 + 0.15 * (1 - at));
      const cx = ev.x + ev.dx * a + nx * off, cz = ev.z + ev.dz * a + nz * off;
      setTimeout(() => groundDust(cx, cz, n, 0.2 + 0.15 * (1 - at), 1.1 - 0.7 * at, 1.1 - 0.5 * at), at * ev.run * 1000);
    }
    floorDecal(sx, sz, 2.0, getRadialTexture(), { life: 0.8, op: 0.18, color: '#B9A58A', y: 0.06, fadeFrom: 0.2 }); // haze under him
    {
      const hz = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: getRadialTexture(), color: '#C9A878', transparent: true, depthWrite: false, opacity: 0 }));
      hz.rotation.set(-Math.PI / 2, 0, -Math.atan2(ev.dz, ev.dx));
      hz.position.set(ev.x + ev.dx * ev.len / 2, 0.15, ev.z + ev.dz * ev.len / 2);
      add(hz, 1.0, (u, t) => {
        hz.scale.set(ev.len * 1.4, 1.6, 1);
        hz.material.opacity = 0.15 * sm(0, 0.15, t / ev.run) * (1 - sm(0.3, 1, u));
      });
      // a second, denser haze over the first third (the wide end)
      const h2 = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: getRadialTexture(), color: '#C9A878', transparent: true, depthWrite: false, opacity: 0 }));
      h2.rotation.set(-Math.PI / 2, 0, -Math.atan2(ev.dz, ev.dx));
      h2.position.set(ev.x + ev.dx * ev.len * 0.2, 0.16, ev.z + ev.dz * ev.len * 0.2);
      add(h2, 1.1, (u, t) => {
        h2.scale.set(ev.len * 0.6, 2.2, 1);
        h2.material.opacity = 0.12 * sm(0, 0.1, t) * (1 - sm(0.35, 1, u));
      });
    }
    // 4. where it reaches a foe: a shallow crater with chunky rubble on its rim, hairline cracks, a gold light from below,
    //    floor pieces and grit thrown up
    const hs = world.entities().filter((e) => e.faction === 'hostile' && e.hp > 0);
    for (const e of hs) {
      const rx = e.x - ev.x, rz = e.z - ev.z, along = rx * ev.dx + rz * ev.dz, perp = Math.abs(rx * nx + rz * nz);
      if (along < 0 || along > ev.len || perp > ev.w / 2) continue;
      setTimeout(() => {
        floorDecal(e.x, e.z, 1.5, craterBedTex, { life, op: 0.62, color: '#2A221C' }); // 0.62 to 0.5u, then to 0 at 0.75u
        floorDecal(e.x, e.z - 0.2, 0.9, getRadialTexture(), { life, op: 0.45, color: '#14110F', y: 0.037 }); // rim shadow on the far side
        if (faultTex.star) floorDecal(e.x, e.z, 2.0, faultTex.star, { life });
        // 9 pieces (3 slabs, 6 chunks): 4 piled against each other on the seam side (toward him), the rest round
        // the rim with a 90 degree gap ahead
        const fa = Math.atan2(ev.dz, ev.dx), nC = 12;
        for (let i = 0; i < nC; i++) {
          const stack = i < 4;
          const a = stack ? fa + Math.PI + rnd(-0.45, 0.45) : fa + Math.PI / 4 + ((i - 4) / 7) * (Math.PI * 1.5) + rnd(-0.12, 0.12);
          const d = stack ? rnd(0.3, 0.45) : rnd(0.4, 0.62), len = i >= 9 ? rnd(0.2, 0.25) : i % 3 === 0 ? rnd(0.35, 0.5) : rnd(0.2, 0.3);
          const cx = e.x + Math.cos(a) * d, cz = e.z + Math.sin(a) * d;
          const m = faultChunk(cx, cz, len);
          const ax = new Vector3(-Math.sin(a), 0, Math.cos(a)), tilt = stack ? rnd(0.52, 0.96) : rnd(0.26, 0.61), spin = rnd(-0.6, 0.6);
          const yl = stack ? 0.04 + 0.04 * i : 0.04;
          const kk = (u, t) => sm(0, 0.06, t) * used(t) * (1 - sm(0.88, 1, u));
          contactShadow(cx, cz, len, life, kk);
          add(m, life, (u, t) => {
            const k = kk(u, t);
            m.position.set(cx, 0.01 + yl * k, cz);
            m.quaternion.setFromAxisAngle(ax, -tilt * k);
            m.rotateY(spin * k);
            m.scale.setScalar(Math.max(0.001, k));
          });
        }
        floorDecal(e.x, e.z, 0.6, getRadialTexture(), { life: 0.55, op: 0.55, additive: true, color: '#F0B860', y: 0.05, fadeFrom: 0.27 });
        { // a dust puff over the crater
          const pf = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: '#B9A58A', transparent: true, depthWrite: false, opacity: 0 }));
          add(pf, 0.8, (u) => { pf.position.set(e.x, 0.25 + 0.15 * u, e.z); pf.scale.setScalar(1.2 * (0.8 + 0.4 * u)); pf.material.opacity = 0.25 * sm(0, 0.1, u) * (1 - sm(0.3, 1, u)); });
        }
        floorDecal(e.x, e.z, 0.22, getRadialTexture(), { life: 0.4, op: 0.8, additive: true, color: '#FFE9B8', y: 0.055, fadeFrom: 0.2 });
        flySlabs(e.x, e.z, 4, ev.dx, ev.dz, 5);
      }, (along / ev.len) * ev.run * 1000);
    }
  });

  // ---- 1.6 combos (S58, S59, S60)
  const rubbleFx = new Map();
  bus.on('review_sh_rubble', (ev) => {
    const g = new Group();
    const rocks = [];
    for (let i = 0; i < 12; i++) {
      const m = new Mesh(rockGeo, i % 2 ? debMat : rockMat);
      const a = Math.random() * Math.PI * 2, rr = ev.r * Math.sqrt(Math.random());
      m.position.set(Math.cos(a) * rr, 0.05, Math.sin(a) * rr);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      g.add(m);
      rocks.push({ m, s: 0.6 + Math.random() * 0.9 });
    }
    g.position.set(ev.x, 0, ev.z);
    const fr = { gone: null };
    rubbleFx.set(ev.id, fr);
    add(g, ev.secs + 0.4, (u, t) => {
      if (fr.gone == null && fr.kill) fr.gone = t;
      const used = fr.gone == null ? 1 : 1 - sm(fr.gone, fr.gone + 0.25, t);
      for (const r of rocks) r.m.scale.setScalar(Math.max(0.001, r.s * sm(0, 0.15, t) * (1 - sm(0.9, 1, u)) * used));
    });
  });
  bus.on('review_sh_rubble_gone', (ev) => {
    const fr = rubbleFx.get(ev.id);
    if (fr) fr.kill = true;
    const t = tank();
    if (t) {
      chunks(t.x, t.z, { n: 6, r: 0.5, up: 1.8, life: 0.5, mat: rockMat });
      label('rubble: 3 rocks', PARCH, t.x, 2.0, t.z, { life: 1.0, size: 0.24 });
    }
  });
  bus.on('review_sh_spike', (ev) => {
    ring(ev.x, ev.z, ev.r, OCHRE, { life: 0.45, op: 0.8 });
    groundDust(ev.x, ev.z, 10, 0.9, 1, 0.8);
    chunks(ev.x, ev.z, { n: 12, r: 0.9, up: 2.4, life: 0.8, mat: rockMat });
    label('spike', PARCH, ev.x, 1.7, ev.z, { life: 1.0, size: 0.28 });
  });
  // 1.7 Grudge: iron spikes burst out of the floor under a foe that hit him
  bus.on('review_sh_ironspike', (ev) => {
    const g = new Group(), spikes = [];
    for (let i = 0; i < 7; i++) { // a crown round the foe, none in the middle, each leaning out ~25 deg
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.3, rr = 0.6 + Math.random() * 0.15;
      const m = ironBlade(0.24, 0.8 + rand() * 0.5);
      m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      m.rotation.set(Math.sin(a) * 0.44, 0, -Math.cos(a) * 0.44);
      m.scale.setScalar(0.001);
      g.add(m);
      spikes.push({ m, d: Math.random() * 0.05 });
    }
    g.position.set(ev.x, 0, ev.z);
    add(g, 0.9, (u, t) => {
      for (const s of spikes) s.m.scale.setScalar(Math.max(0.001, sm(s.d, s.d + 0.06, t) * (1 - sm(0.6, 0.9, t))));
    });
    seed = 13 + Math.round(ev.x * 10) * 31 + Math.round(ev.z * 10) * 17;
    const pit = new Mesh(new PlaneGeometry(3.6, 3.6), new MeshBasicMaterial({ map: getRadialTexture(), color: '#2E2018', transparent: true, depthWrite: false, opacity: 0 }));
    pit.rotation.x = -Math.PI / 2;
    pit.position.set(ev.x, 0.03, ev.z);
    pit.renderOrder = 2; // over the crater's light disc; the lifted tiles stand at its rim
    add(pit, 1.2, (u) => (pit.material.opacity = 0.8 * sm(0, 0.05, u) * (1 - sm(0.6, 1, u))));
    slamCrater(ev.x, ev.z, 1.25);
    smashSlabs(ev.x, ev.z, 6, 1.0, 1.3, 1, 0);
    for (const [rr, op] of [[0.7, 0.6], [0.82, 0.4]]) {
      const m = new Mesh(new RingGeometry(rr - 0.025, rr, 64), basic('#F2A23A', op, true));
      m.rotation.x = -Math.PI / 2;
      m.position.set(ev.x, 0.05, ev.z);
      add(m, 0.9, (u) => (m.material.opacity = op * sm(0, 0.08, u) * (1 - sm(0.6, 1, u))));
    }
  });
  // 1.7 Stone Cubs: a bite holds the foe in place
  bus.on('review_sh_hold', (ev) => {
    const f = byId(ev.id);
    if (!f) return;
    ring(f.x, f.z, 0.45, STONE, { life: ev.secs + 0.1, op: 0.85 });
    label('held', PARCH, f.x, 1.3, f.z, { life: 0.5, size: 0.2 });
  });
  bus.on('review_sh_stonefly', (ev) => {
    if (!growl) return;
    if (ev.start) {
      const p = growl.obj.position;
      label('thrown', STEEL, p.x, 1.4, p.z, { life: 0.8, size: 0.22 });
      chunks(p.x, p.z, { n: 6, r: 0.4, up: 1.6, life: 0.6, mat: stoneMat });
      return;
    }
    growl.obj.position.x = ev.x;
    growl.obj.position.z = ev.z;
    growl.flyY = ev.done ? null : Math.max(0, ev.y);
    if (ev.done) {
      chunks(ev.x, ev.z, { n: 12, r: 0.9, up: 2.2, life: 0.8 });
      groundDust(ev.x, ev.z, 7, 0.8, 1, 0.74);
    }
  });
  bus.on('review_sh_slabbounce', (ev) => {
    chunks(ev.x, ev.z, { n: 8, r: 0.4, up: 1.8, life: 0.6, mat: stoneMat, size: 0.7 });
    ring(ev.x, ev.z, 0.5, STEEL, { life: 0.3, op: 0.6 });
  });
  bus.on('review_sh_impale', (ev) => {
    const g = new Group();
    const sp = [];
    for (let i = 0; i < 7; i++) {
      const m = new Mesh(new ConeGeometry(0.05, 0.75, 5), ironMat);
      m.geometry.translate(0, 0.375, 0);
      const a = (i / 7) * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22);
      m.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      g.add(m);
      sp.push(m);
    }
    g.position.set(ev.x, 0, ev.z);
    add(g, 0.9, (u, t) => {
      for (const m of sp) m.scale.setScalar(Math.max(0.001, sm(0, 0.08, t) * (1 - sm(0.6, 1, u))));
    });
    chunks(ev.x, ev.z, { n: 6, r: 0.4, up: 1.6, life: 0.5, mat: ironMat, size: 0.6 });
    label('impaled', STEEL, ev.x, 1.7, ev.z, { life: 1.0, size: 0.26 });
  });

  // ---- Burrow: a mound of earth moves under the floor
  let mound = null;
  bus.on('review_sh_mound', (ev) => {
    if (!mound) {
      const g = new Group();
      const hump = new Mesh(new SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), chipSideMat);
      hump.scale.set(1, 0.55, 1.2);
      g.add(hump);
      for (let i = 0; i < 6; i++) { // broken floor tipped up round the hump
        const r = floorSlab(0, 0, 0.1 + Math.random() * 0.05, chipSideMat, false, true);
        const a = (i / 6) * Math.PI * 2;
        r.position.set(Math.cos(a) * 0.36, 0.05, Math.sin(a) * 0.4);
        r.rotation.set(Math.sin(a) * 0.6, a, -Math.cos(a) * 0.6);
        g.add(r);
      }
      mound = add(g, 99, () => {});
      mound.last = null;
    }
    const g = mound.obj;
    g.position.set(ev.x, 0, ev.z);
    g.rotation.y += 0.2;
    if (Math.random() < 0.6) chunks(ev.x, ev.z, { n: 2, r: 0.4, up: 1.6, life: 0.6 });
    if (Math.random() < 0.5) groundDust(ev.x, ev.z, 2, 0.3, 1, 0.46);
  });
  bus.on('review_sh_lift', (ev) => {
    const e = byId(ev.id);
    if (e) groundDust(e.x, e.z, 4, 0.25, 1, 0.44);
  });

  // ---- Rallying Cry: a steel ring under each ally while it lasts
  bus.on('review_sh_rally', (ev) => {
    for (const id of ev.ids) {
      const rr = new Group();
      const outer = new Mesh(new RingGeometry(0.78, 0.82, 64), basic('#E8A850', 0.5, true));
      const inner = new Mesh(new RingGeometry(0.52, 0.55, 64), basic('#F0C878', 0.3, true));
      const glow = new Mesh(new PlaneGeometry(1.8, 1.8), new MeshBasicMaterial({ map: getRadialTexture(), color: '#F2A23A', transparent: true, depthWrite: false, opacity: 0 }));
      glow.renderOrder = 4; // over the selection rings
      rr.add(outer, inner, glow);
      for (const c of rr.children) c.rotation.x = -Math.PI / 2;
      add(rr, ev.secs, (u, t) => {
        const e = byId(id);
        if (e) rr.position.set(e.x, 0.05, e.z);
        const f = sm(0, 0.12, t) * (1 - sm(0.9, 1, u)), p = 0.85 + 0.15 * Math.sin(t * 4);
        outer.material.opacity = 0.5 * f * p;
        inner.material.opacity = 0.55 * f * p;
        glow.material.opacity = 0.4 * f * p;
      });
      const e = byId(id);
      if (e) groundDust(e.x, e.z, 3, 0.3, 0.6, 0.5);
    }
  });

  // ---- Heavy Slam, combo hits: a crack star and dust where the blow lands

  // ---- Heavy Slam, dream-loop pass 1 (target: vfx-dream/stonehide/targets/1-heavy-slam-gpt.png):
  // a cracked crater in the floor, a swirling dust shockwave, stone chunks that land and stay a moment,
  // warm sparks and a warm glow in the foes it hits. Earth, stone and a pale warm light only.
  // seeded so every retake of a clip draws the same cracks and debris (compare live shots with the target fairly)
  let seed = 1;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rnd = (a, b) => a + rand() * (b - a);
  function craterTex() {
    const N = 512, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');
    const C = N / 2;
    // a soft dark bowl and a dusty ochre stain round it
    let gr = g.createRadialGradient(C, C, 0, C, C, C);
    gr.addColorStop(0, 'rgba(46,38,28,0.8)');
    gr.addColorStop(0.3, 'rgba(70,58,44,0.6)');
    gr.addColorStop(0.5, 'rgba(120,100,76,0.32)');
    gr.addColorStop(0.7, 'rgba(160,136,104,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, N, N);
    // broken plates round the centre: lighter faces with dark seams
    for (let i = 0; i < 34; i++) {
      const a = rnd(-1.6, 1.6) * (rand() < 0.75 ? 1 : 2), d = rnd(8, 120), r = rnd(12, 30);
      const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
      g.beginPath();
      const k = 5 + (rand() * 3) | 0;
      for (let j = 0; j < k; j++) {
        const b = (j / k) * Math.PI * 2 + rnd(-0.3, 0.3), rr = r * rnd(0.6, 1.1);
        j ? g.lineTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr) : g.moveTo(x + Math.cos(b) * rr, y + Math.sin(b) * rr);
      }
      g.closePath();
      const v = rnd(0, 1);
      g.fillStyle = `rgba(${(70 + 30 * v) | 0},${(62 + 26 * v) | 0},${(52 + 22 * v) | 0},0.85)`;
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = 'rgba(176,150,112,0.7)';
      g.stroke();
    }
    // a shattered network: jagged radial cracks that taper, joined by short cross cracks into plates
    g.lineCap = 'round';
    g.lineJoin = 'miter';
    const seg = (pts, w0, w1) => {
      for (let i = 1; i < pts.length; i++) {
        const f = (i - 1) / (pts.length - 1), w = w0 + (w1 - w0) * f;
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        g.beginPath();
        g.moveTo(x0 + 1.4, y0 + 1.4);
        g.lineTo(x1 + 1.4, y1 + 1.4);
        g.lineWidth = w + 1;
        g.strokeStyle = 'rgba(200,186,162,0.3)';
        g.stroke();
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.lineWidth = w;
        g.strokeStyle = 'rgba(36,30,24,0.95)';
        g.stroke();
      }
    };
    const jag = (x, y, a, len, steps, amp) => {
      const pts = [[x, y]];
      for (let i = 1; i <= steps; i++) {
        const d = (len * i) / steps, side = (i % 2 ? 1 : -1) * rnd(0.4, 1) * amp;
        pts.push([x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * side, y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * side]);
      }
      return pts;
    };
    const n = 11, radial = [];
    for (let i = 0; i < n; i++) {
      const f = (i / (n - 1)) * 2 - 1, a = f * (i % 3 === 0 ? 2.6 : 1.35) + rnd(-0.15, 0.15), len = rnd(130, 200) * (Math.abs(a) < 1.6 ? 1 : 0.55);
      const pts = jag(C + rnd(-8, 8), C + rnd(-8, 8), a, len, 9, rnd(5, 9));
      radial.push(pts);
      seg(pts, rnd(4.5, 5.5), 0.8);
      // one or two short side cracks off each arm
      for (let k = 0; k < 2; k++) if (rand() < 0.7) {
        const at = pts[3 + ((rand() * 4) | 0)];
        seg(jag(at[0], at[1], a + (rand() < 0.5 ? 1 : -1) * rnd(0.5, 1.0), rnd(25, 55), 4, 3), 2.6, 0.6);
      }
    }
    // cross cracks between neighbouring arms make the plates
    for (let i = 0; i < n; i++) {
      const A = radial[i], B = radial[(i + 1) % n];
      for (const j of [2, 5]) if (rand() < 0.75) {
        const p = A[Math.min(j, A.length - 1)], q = B[Math.min(j + ((rand() * 2) | 0), B.length - 1)];
        const mid = [(p[0] + q[0]) / 2 + rnd(-6, 6), (p[1] + q[1]) / 2 + rnd(-6, 6)];
        seg([p, mid, q], j === 2 ? 3 : 2.2, j === 2 ? 2.6 : 1.8);
      }
    }
    // a dark pit right under the blow
    gr = g.createRadialGradient(C, C, 0, C, C, 48);
    gr.addColorStop(0, 'rgba(18,14,10,0.85)');
    gr.addColorStop(1, 'rgba(18,14,10,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, N, N);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  // the crater is a painted decal (vfx-dream/stonehide/tex/crater.py), +x along the blow
  const craterImg = new CanvasTexture(document.createElement('canvas'));
  import('three').then(({ TextureLoader }) => new TextureLoader().loadAsync('/review/slam-crater.png')).then((t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    CRATERS[0] = CRATERS[1] = CRATERS[2] = t;
  });
  const CRATERS = [craterImg, craterImg, craterImg];
  const dustRingTex = (() => {
    const N = 512, c = document.createElement('canvas');
    c.width = c.height = N;
    const g = c.getContext('2d');
    const C = N / 2;
    // two or three broken smoky arcs: soft blobs strung along each arc, thick in the middle, thin at the ends
    const arcs = 4;
    for (let k = 0; k < arcs; k++) {
      const a0 = (k / arcs) * Math.PI * 2 + rnd(0, 0.6), span = rnd(1.3, 1.9), r0 = C * rnd(0.72, 0.86);
      for (let i = 0; i < 90; i++) {
        const f = i / 89, a = a0 + span * f, thick = Math.sin(f * Math.PI);
        const r = r0 + rnd(-10, 10) * thick + f * 14;
        const x = C + Math.cos(a) * r, y = C + Math.sin(a) * r, br = rnd(10, 18) * (0.35 + thick);
        const gr = g.createRadialGradient(x, y, 0, x, y, br);
        const v = rnd(0, 1);
        const col = `${(196 + 30 * v) | 0},${(182 + 28 * v) | 0},${(158 + 24 * v) | 0}`;
        gr.addColorStop(0, `rgba(${col},${(0.11 * (0.4 + thick)).toFixed(3)})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr;
        g.fillRect(x - br, y - br, br * 2, br * 2);
      }
      // a few streaks inside the arc for the swirl
      for (let j = 0; j < 9; j++) {
        const s0 = a0 + rnd(0, span * 0.6);
        g.beginPath();
        g.arc(C, C, r0 + rnd(-8, 8), s0, s0 + rnd(0.4, 0.9));
        g.lineWidth = rnd(1, 2.5);
        g.strokeStyle = 'rgba(232,222,204,0.24)';
        g.lineCap = 'round';
        g.stroke();
      }
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  })();
  const DUST = '#B79A76', WARM = '#F2D3A0', SPARK = '#F0B45A';
  const plateGeo = new BoxGeometry(0.22, 0.05, 0.18);
  const plateMat = new MeshStandardMaterial({ color: '#6F6962', roughness: 1, flatShading: true });
  const bigRockGeo = new DodecahedronGeometry(0.12, 0);
  const rockGreyMat = new MeshStandardMaterial({ color: '#8E857A', roughness: 0.85, flatShading: true });
  const roundRockGeo = new IcosahedronGeometry(0.12, 1);
  function slamCrater(x, z, r, dx = 1, dz = 0) {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: CRATERS[0], transparent: true, depthWrite: false, opacity: 0 }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(dz, dx);
    m.position.set(x, 0.035, z);
    m.renderOrder = -2;
    add(m, 2.0, (u, t) => {
      m.scale.setScalar(2 * r * (0.85 + 0.15 * sm(0, 0.06, t)));
      m.material.opacity = 1 - sm(0.65, 1, u);
    });
  }
  function slamPlates(x, z, n) {
    for (let i = 0; i < n; i++) {
      const p = new Mesh(plateGeo, plateMat);
      const a = rand() * Math.PI * 2, d = rnd(0.12, 0.5);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const tx = rnd(-0.6, 0.6), tz = rnd(-0.6, 0.6);
      p.scale.setScalar(rnd(0.6, 1.2));
      p.rotation.y = rand() * Math.PI;
      add(p, 1.7, (u, t) => {
        const up = Math.sin(Math.min(1, t / 0.28) * Math.PI) * 0.18 * (1 - sm(0, 0.28, t) * 0.6);
        p.position.set(px, 0.03 + Math.max(0, up), pz);
        p.rotation.x = tx * sm(0, 0.12, t);
        p.rotation.z = tz * sm(0, 0.12, t);
        if (u > 0.8) p.scale.multiplyScalar(0.94);
      });
    }
  }
  // Broken floor (Kesh 19 Nov: "part of ground", not stones): slabs of the floor itself, cut as jagged polygons,
  // smashed up out of the crater edge-first and tilted away from the blow, each carrying the tiles it broke out of.
  // The floor is the flat stage's 40 x 30 plane, its tile texture repeated 20 x 15 (one repeat per 2 u).
  const slabSideMat = new MeshStandardMaterial({ color: '#4A443D', roughness: 1, flatShading: true });
  const slabTopMats = new Map();
  function slabTopMat(light = false) {
    const tex = window.__reviewFloorTex;
    const key = (tex ? 'tex' : 'plain') + (light === 'x1.3' ? 'X' : light ? 'L' : '');
    if (!slabTopMats.has(key)) {
      const t = tex ? tex.clone() : null;
      if (t) { t.repeat.set(1, 1); t.needsUpdate = true; }
      const mat = new MeshStandardMaterial({ map: t, color: t ? '#FFFFFF' : '#68645D', roughness: 0.95 });
      if (light === 'x1.3') mat.color.setScalar(1.3); // Fault Line's rubble: the floor tone x1.3
      else if (light) { // floor-shard tops (about #8E7B66), still the floor's own tiles; a little emissive so shadowed heaps don't go dark
        mat.color.setRGB(1.29, 1.16, 1.02);
        mat.emissive.set('#8E7B66');
        mat.emissiveIntensity = 0.3;
      }
      slabTopMats.set(key, mat);
    }
    return slabTopMats.get(key);
  }
  const chipSideMat = new MeshStandardMaterial({ color: '#5A4C3E', roughness: 0.95, flatShading: true });
  function floorSlab(cx, cz, size, side = slabSideMat, light = false, chip = false, depthOv = 0, edge = null) {
    const ring = [];
    const sx = chip ? 1.5 : 1, ca = chip ? rnd(0, Math.PI) : 0; // a chip is a slab about 3:2:0.5
    const sh = new Shape();
    const k = light ? 4 + ((rand() * 4) | 0) : 5 + ((rand() * 3) | 0); // Colossus' lumps: 4-7 uneven sides
    for (let j = 0; j < k; j++) {
      const b = (j / k) * Math.PI * 2 + rnd(-0.3, 0.3), rr = size * (light ? rnd(0.5, 1.2) : rnd(0.6, 1.1));
      const px = Math.cos(b) * rr * sx, py = Math.sin(b) * rr, qx = px * Math.cos(ca) - py * Math.sin(ca), qy = px * Math.sin(ca) + py * Math.cos(ca);
      j ? sh.lineTo(qx, qy) : sh.moveTo(qx, qy);
      ring.push([qx, qy]);
    }
    sh.closePath();
    const depth = depthOv || (chip ? size * 0.5 : light ? rnd(0.06, 0.09) : rnd(0.07, 0.11));
    const geo = new ExtrudeGeometry(sh, { depth, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); // shape XY -> floor XZ, extrusion goes down to up
    geo.translate(0, -depth, 0); // the top face sits at y = 0 (flush with the floor before it lifts)
    // the top face's UVs: the floor's own tile UVs at this spot, so the slab shows the tiles it came from
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const wx = cx + pos.getX(i), wz = cz + pos.getZ(i);
      uv.setXY(i, (wx + 20) / 2, (15 - wz) / 2);
    }
    uv.needsUpdate = true;
    const tm = slabTopMat(light);
    if (tm.map) tm.map.wrapS = tm.map.wrapT = 1000; // RepeatWrapping
    const mesh = new Mesh(geo, [tm, side]);
    if (edge) { // a lit edge on the 1-2 top edges that face the light (up-left, toward the camera), 0.015u wide
      const k2 = Math.max(0.3, 1 - 0.02 / size), LX = -0.45, LZ = 0.89;
      const cand = ring.map(([ax, ay], j) => {
        const [bx, by] = ring[(j + 1) % ring.length], ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey) || 1;
        const wnx = ey / l, wnz = ex / l; // the shape's outward normal (ey, -ex) taken to the floor: (x, y) -> (x, -y)
        return { j, d: wnx * LX + wnz * LZ };
      }).filter((c) => c.d > 0.35).sort((p, q) => q.d - p.d).slice(0, 2);
      for (const { j } of cand) {
        const [ax, ay] = ring[j], [bx, by] = ring[(j + 1) % ring.length];
        const es = new Shape();
        es.moveTo(ax, ay); es.lineTo(bx, by); es.lineTo(bx * k2, by * k2); es.lineTo(ax * k2, ay * k2); es.closePath();
        const eg = new ShapeGeometry(es);
        eg.rotateX(-Math.PI / 2);
        eg.translate(0, 0.003, 0);
        mesh.add(new Mesh(eg, new MeshBasicMaterial({ color: edge, transparent: true, opacity: 0.9, side: DoubleSide })));
      }
    }
    return mesh;
  }
  function smashSlabs(x, z, n, r0, r1, dx, dz, light = false) {
    const fa = Math.atan2(dz, dx);
    for (let i = 0; i < n; i++) {
      // Colossus' heaps: the first 3 sit on the camera side (+z) so their lit tops cover the dummy's dark base
      const a = light && i < 3 ? Math.PI / 2 + (i - 1) * 0.6 + rnd(-0.15, 0.15) : fa + (i / n) * Math.PI * 2 + rnd(-0.25, 0.25), d = rnd(r0, r1);
      const cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d, size = rnd(0.12, 0.24) * (1 - 0.3 * (d - r0) / (r1 - r0 + 1e-6)) * (light ? 0.6 : 1);
      const m = floorSlab(cx, cz, size, light ? chipSideMat : slabSideMat, light);
      // tilt about the axis across the radius, the inner edge rising (pushed up from the blow), some thrown higher
      const tilt = light ? rnd(0.1, 0.35) : rnd(0.5, 1.0), lift = light ? rnd(0.02, 0.06) : rnd(0.06, 0.16), pop = !light && i % 3 === 0 ? rnd(0.2, 0.36) : 0;
      const ax = new Vector3(-Math.sin(a), 0, Math.cos(a));
      const spin = rnd(-0.4, 0.4);
      add(m, 1.8, (u, t) => {
        const up = sm(0, 0.06, t);
        const hop = pop * Math.max(0, Math.sin(Math.min(1, t / 0.35) * Math.PI));
        const settle = 1 - 0.35 * sm(0.3, 0.6, t);
        m.position.set(cx, 0.01 + (lift * up + hop) * settle, cz);
        m.quaternion.setFromAxisAngle(ax, -tilt * up * settle);
        m.rotateY(spin * up);
        if (u > 0.85) m.scale.setScalar(1 - (u - 0.85) / 0.15);
      });
    }
  }
  function slamRocks(x, z, n, reach) {
    for (let i = 0; i < n; i++) {
      const m = new Mesh(bigRockGeo, rockGreyMat);
      const a = rand() * Math.PI * 2, sp = reach * (i % 2 ? rnd(2.2, 3.6) : rnd(0.5, 1.4));
      const vx = Math.cos(a) * sp, vz = Math.sin(a) * sp;
      let vy = i % 2 ? rnd(0.5, 1.1) : rnd(1.6, 3.0), landed = false;
      m.scale.setScalar(rnd(0.6, 1.7));
      m.position.set(x + Math.cos(a) * 0.15, 0.12, z + Math.sin(a) * 0.15);
      const spin = rnd(4, 9);
      add(m, 1.8, (u, t, dt) => {
        if (!landed) {
          vy -= 11 * dt;
          m.position.x += vx * dt;
          m.position.z += vz * dt;
          m.position.y += vy * dt;
          m.rotation.x += dt * spin;
          m.rotation.z += dt * spin * 0.6;
          if (m.position.y <= 0.06 && vy < 0) {
            landed = true;
            m.position.y = 0.06;
          }
        }
        if (u > 0.82) m.scale.multiplyScalar(0.93);
      });
    }
  }
  // rubble that the blow kicks out across the cracked floor: lands at once, a short hop, then lies there
  function slamRubble(x, z, n, r0, r1, dx = 1, dz = 0) {
    const fa = Math.atan2(dz, dx);
    for (let i = 0; i < n; i++) {
      const m = new Mesh(roundRockGeo, rockGreyMat);
      const a = fa + ((i / (n - 1)) * 2 - 1) * 2.4 + rnd(-0.2, 0.2), d = rnd(r0, r1);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, sc = [0.5, 0.85, 1.3][i % 3] * rnd(0.85, 1.15), hop = rnd(0.08, 0.2);
      m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
      add(m, 1.7, (u, t) => {
        const k = sm(0, 0.05, t);
        m.position.set(x + (px - x) * (0.55 + 0.45 * k), 0.05 + hop * Math.sin(Math.min(1, t / 0.22) * Math.PI), z + (pz - z) * (0.55 + 0.45 * k));
        const k2 = sc * (u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1);
        m.scale.set(k2 * 1.15, k2 * 0.7, k2);
      });
    }
  }
  // tan dust that hugs the floor round the crater (low, flat, slow)
  function groundDust(x, z, n, rad, opK = 1, szK = 1) {
    for (let i = 0; i < n; i++) {
      const sp = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: '#C8A87A', transparent: true, depthWrite: false, opacity: 0 }));
      const a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), d = rad * rnd(0.3, 1);
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, sz = rnd(0.55, 0.9) * szK;
      add(sp, rnd(0.8, 1.1), (u) => {
        sp.position.set(px + Math.cos(a) * 0.25 * u, 0.12 + 0.08 * u, pz + Math.sin(a) * 0.25 * u);
        sp.scale.set(sz * (0.8 + 0.5 * u), sz * 0.55 * (0.8 + 0.5 * u), 1);
        sp.material.opacity = 0.4 * opK * Math.min(1, u * 12) * (1 - sm(0.4, 1, u));
      });
    }
  }
  function dustWave(x, z, r, { y = 0.09, life = 0.75, op = 0.7, spin = 1.6, from = 0.35, tilt = 0 } = {}) {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: dustRingTex, transparent: true, depthWrite: false, opacity: 0, side: DoubleSide }));
    m.rotation.x = -Math.PI / 2 + tilt;
    const rz = rand() * Math.PI * 2;
    m.position.set(x, y, z);
    add(m, life, (u, t) => {
      const e = 1 - (1 - u) ** 3;
      m.scale.setScalar(2 * r * (from + (1 - from) * e));
      m.rotation.z = rz + spin * e;
      m.position.y = y + 0.18 * e;
      m.material.opacity = op * sm(0, 0.06, u) * (1 - sm(0.2, 1, u));
    });
  }
  function warmSparks(x, z, n) {
    for (let i = 0; i < n; i++) {
      const m = new Mesh(new PlaneGeometry(1, 1), basic(SPARK, 0.95, true));
      const a = rand() * Math.PI * 2, sp = rnd(3, 6), L = rnd(0.14, 0.26);
      const vy = rnd(0.5, 2.0);
      m.position.set(x, 0.3, z);
      add(m, rnd(0.14, 0.26), (u, t, dt) => {
        m.position.x += Math.cos(a) * sp * dt;
        m.position.z += Math.sin(a) * sp * dt;
        m.position.y += vy * dt;
        m.rotation.set(-Math.PI / 2, 0, -a);
        m.scale.set(L * (1 - u * 0.5), 0.022, 1);
        m.material.opacity = 0.85 * (1 - u);
      });
    }
  }
  function warmGlowOn(ids) {
    for (const id of ids) {
      const s = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: WARM, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, opacity: 0 }));
      s.renderOrder = 50;
      add(s, 0.35, (u) => {
        const e = byId(id);
        if (e) s.position.set(e.x, 1.05 + (e.reviewY || 0), e.z);
        s.scale.setScalar(0.75 + 0.2 * u);
        s.material.opacity = 0.1 * (1 - sm(0.25, 1, u));
      });
    }
  }
  bus.on('review_sh_slam', (ev) => {
    const giant = !!(tank() && tank().reviewGiant);
    const r = ev.r * (giant ? 1.35 : 1);
    seed = 7 + Math.round(ev.x * 10) * 31 + Math.round(ev.z * 10) * 17;
    slamCrater(ev.x + ev.dx * 0.15, ev.z + ev.dz * 0.15, r * 1.75, ev.dx, ev.dz);
    smashSlabs(ev.x, ev.z, 11, r * 0.25, r * 0.85, ev.dx, ev.dz);
    groundDust(ev.x, ev.z, 9, r * 0.75);
    dustWave(ev.x, ev.z, r * 1.9, { op: 0.6, from: 0.72, life: 0.7 });
    dustWave(ev.x, ev.z, r * 1.55, { y: 0.26, op: 0.45, spin: -1.2, from: 0.78, life: 0.55 });
    puff(ev.x, ev.z, { n: 12, r: 1.1, color: DUST, size: 0.5, h: 0.4, life: 0.8 });
    warmSparks(ev.x, ev.z, 5);
    const near = [];
    for (const e of world.entities()) if (e.faction === 'hostile' && e.hp > 0 && Math.hypot(e.x - ev.x, e.z - ev.z) < r * 1.1) near.push(e.id);
    warmGlowOn(near);
  });
  bus.on('review_sh_combo', (ev) => {
    if (ev.hit === 3) {
      seed = 5 + Math.round(ev.x * 10) * 31 + Math.round(ev.z * 10) * 17;
      slamCrater(ev.x + ev.dx * 0.1, ev.z + ev.dz * 0.1, ev.r * 0.75, ev.dx, ev.dz);
      smashSlabs(ev.x, ev.z, 6, ev.r * 0.15, ev.r * 0.4, ev.dx, ev.dz);
      groundDust(ev.x, ev.z, 6, ev.r * 0.5);
      dustWave(ev.x, ev.z, ev.r * 0.9, { op: 0.5, from: 0.7, life: 0.6 });
    } else groundDust(ev.x, ev.z, 2, 0.4, 0.7, 0.52);
  });

  // ---- Maul: three claw marks in the air for each swipe
  const clawTex = (() => { // u across the streak (inner -> outer), v along it: a tapered brown stroke, its outer edge pale
    const W = 32, H = 256, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / (W - 1), v = y / (H - 1), half = 0.5 * Math.sin(Math.PI * Math.min(1, v * 1.15)) ** 0.8; // thick near the head, a point at the tail
      const a = Math.max(0, 1 - Math.abs(u - 0.5) / Math.max(0.02, half)) ** 0.6, e = Math.max(0.5 * sm(0.6, 0.85, u), sm(0.8, 1, v));
      const i = (y * W + x) * 4;
      d[i] = 0x8A + (0xF0 - 0x8A) * e; d[i + 1] = 0x58 + (0xD2 - 0x58) * e; d[i + 2] = 0x2E + (0xA0 - 0x2E) * e; d[i + 3] = 255 * a;
    }
    g.putImageData(img, 0, 0);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  })();
  function clawGeo(r0, t0, tl) {
    const geo = new RingGeometry(r0, 1, 24, 1, t0, tl), pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i);
      uv.setXY(i, (Math.hypot(px, py) - r0) / (1 - r0), (Math.atan2(py, px) - t0) / tl);
    }
    return geo;
  }
  function clawSet(x, z, side, ox = 0, oz = 0) { // 3 short strokes (~1.2u) raking diagonally across one body, drawn over it
    const g = new Group();
    for (let i = 0; i < 3; i++) {
      const m = new Mesh(clawGeo(0.86, -0.75, 1.5), new MeshBasicMaterial({ map: clawTex, transparent: true, depthWrite: false, depthTest: false, side: DoubleSide, opacity: 0.9 }));
      m.renderOrder = 9;
      m.scale.setScalar(0.8); // ~1.1u chord, ~0.11u thick at the middle
      m.position.set(-0.75 + (i - 1) * 0.12, 0, 0); // the arc's middle sits on the body
      g.add(m);
    }
    // stood up facing the camera; the arc's bulge at 60 deg (or 120 mirrored) so each chord rakes ~30 deg down across the body
    g.rotation.set(-0.9, 0, side > 0 ? 1.05 : 2.09);
    g.position.set(x + ox, 0.7, z + 0.25 + oz);
    add(g, 0.2, (u) => {
      g.scale.setScalar(0.9 + 0.15 * sm(0, 0.3, u));
      g.children.forEach((c) => (c.material.opacity = 0.9 * (1 - u * u)));
    });
  }
  bus.on('review_sh_swipe', (ev) => {
    const T = tank();
    const ax = T ? T.x : ev.x - ev.dx, az = T ? T.z : ev.z - ev.dz;
    let n = 0;
    for (const e of world.entities()) {
      if (e.faction !== 'hostile' || !(e.hp > 0)) continue;
      const dx = e.x - ax, dz = e.z - az, d = Math.hypot(dx, dz);
      if (d < 2.2 && (dx * ev.dx + dz * ev.dz) / (d || 1) > 0.3) { clawSet(e.x, e.z, ev.side, (-dx / (d || 1)) * 0.25, (-dz / (d || 1)) * 0.25); maulHit(e.x, e.z, Math.atan2(dz, dx)); n++; }
    }
    if (!n) clawSet(ev.x, ev.z, ev.side);
  });
  // the hit (Kesh 20 Nov 受击特效): a short warm burst on the body, stone chips break off it and fall, a puff of dust
  function maulHit(x, z, ang) {
    const s = new Sprite(new SpriteMaterial({ map: starTex, color: '#E8C08A', transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, opacity: 0 }));
    s.renderOrder = 9;
    s.position.set(x - Math.cos(ang) * 0.15, 0.7, z - Math.sin(ang) * 0.15 + 0.2);
    add(s, 0.14, (u) => { s.scale.setScalar(0.3 + 0.25 * u); s.material.opacity = 0.7 * (1 - u); });
    bodyChips(x, 0.7, z + 0.15, ang, { n: 4, sp: 1.3 });
    dirDust(x, z + 0.1, ang, { n: 3, spread: 0.7, dist: 0.6, y: 0.45, size: 0.4, op: 0.35, life: 0.7 });
  }

  // ---- Bloodboil: a dim rust steam off him while it lasts (the look's rust tint is on the model)
  bus.on('review_sh_burn', (ev) => {
    label(`-${Math.round(ev.amount)}`, RUST, ev.x, 1.3, ev.z, { life: 1, size: 0.26 });
    const it = add(new Group(), ev.secs, (u, t) => {
      it.acc = (it.acc || 0) + 1;
      if (it.acc % 5) return;
      const T = tank();
      if (!T) return;
      const s = new Sprite(new SpriteMaterial({ map: getRadialTexture(), color: RUST, transparent: true, depthWrite: false, opacity: 0 }));
      const a = Math.random() * 6.28;
      s.position.set(T.x + Math.cos(a) * 0.3, 0.5 + Math.random() * 0.4, T.z + Math.sin(a) * 0.3);
      add(s, 0.9, (v, tt, dt) => {
        s.position.y += 0.7 * dt;
        s.scale.setScalar(0.22 + 0.25 * v);
        s.material.opacity = 0.45 * Math.min(1, v * 5) * (1 - v);
      });
    });
    puff(ev.x, ev.z, { n: 10, r: 0.5, color: RUST, h: 1.2, life: 0.8 });
  });

  // ---- Savage Bite: jaws close on the foe
  const biteMat = new MeshStandardMaterial({ color: '#B39272', roughness: 0.9, flatShading: true, emissive: '#40291A', emissiveIntensity: 1 }); // pale tan rock, warm in its shadow faces (his repaint)
  bus.on('review_sh_bite', (ev) => {
    const T = tank(), fa = T ? Math.atan2(ev.z - T.z, ev.x - T.x) : 0;
    // Kesh 20 Nov: the bite's force drives a pile of floor shards up BEHIND the foe only (his drawing), with dust
    const g = new Group(), fangs = [];
    const bx = Math.cos(fa), bz = Math.sin(fa); // away from him, through the foe
    for (let i = 0; i < 14; i++) {
      const side = (i / 13 - 0.5) * 2, a = fa + side * 1.0 + rnd(-0.12, 0.12); // a 115-degree fan behind the foe
      const tall = 1 - 0.5 * Math.abs(side), d = 0.45 + rnd(0, 0.3) + 0.1 * Math.abs(side);
      const m = floorShard(rnd(0.32, 0.48) * (0.75 + 0.4 * tall), rnd(0.45, 0.8) * (0.6 + 0.6 * tall)); // chunky rock, not planks
      m.children[0].material = biteMat;
      m.rotation.y = rnd(0, 6);
      m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      g.add(m);
      // each leans away from him, out along its own line, as if pushed through the foe
      fangs.push({ m, ax: new Vector3(-Math.sin(a), 0, Math.cos(a)), k: rnd(0.12, 0.3), ry: m.rotation.y, d: rnd(0, 0.05) });
    }
    g.position.set(ev.x, 0, ev.z);
    add(g, 0.95, (u, t) => {
      const sink = sm(0.7, 0.95, t);
      for (const f of fangs) {
        const k = Math.min(1, Math.max(0, (t - f.d) / 0.08)), over = k < 1 ? k * 1.18 : 1.18 - 0.18 * sm(0.08, 0.2, t - f.d); // shoot up past full height, settle
        f.m.quaternion.setFromAxisAngle(f.ax, f.k * (0.6 + 0.4 * k));
        f.m.rotateY(f.ry);
        f.m.scale.set(Math.max(0.001, k), Math.max(0.001, over * (1 - sink)), Math.max(0.001, k));
      }
    });
    const bg = new Mesh(new PlaneGeometry(1.6, 1.6), new MeshBasicMaterial({ map: getRadialTexture(), color: '#F2A040', transparent: true, depthWrite: false, opacity: 0, blending: AdditiveBlending }));
    bg.rotation.x = -Math.PI / 2;
    bg.position.set(ev.x + bx * 0.45, 0.05, ev.z + bz * 0.45);
    add(bg, 0.7, (u) => (bg.material.opacity = 0.2 * sm(0, 0.08, u) * (1 - sm(0.4, 1, u))));
    seed = 29 + Math.round(ev.x * 10) * 31 + Math.round(ev.z * 10) * 17;
    smashSlabs(ev.x + bx * 0.5, ev.z + bz * 0.5, 4, 0.3, 0.6, bx, bz); // lifted tiles at the pile's foot
    dirDust(ev.x + bx * 0.3, ev.z + bz * 0.3, fa, { n: 8, spread: 0.8, dist: 1.1, size: 0.55, op: 0.45 });
    chunks(ev.x + bx * 0.4, ev.z + bz * 0.4, { n: 6, r: 0.9, up: 1.6, life: 1.0, size: 1.2, mat: lightChipMat });
    chunks(ev.x + bx * 0.6, ev.z + bz * 0.6, { n: 8, r: 0.35, up: 0.7, life: 1.0, size: 1.4, mat: biteMat }); // rubble at the pile's foot
    if (ev.missing > 0) label(`${ev.missing}% missing`, RUST, ev.x, 1.4, ev.z, { life: 1.1, size: 0.22 });
  });
  bus.on('review_sh_refund', () => {
    const t = tank();
    if (t) label('half cooldown back', STEEL, t.x, 2.1, t.z, { life: 1.3, size: 0.2 });
  });

  // ---- thorns, quills, Iron Briar
  const shardGeo = new ConeGeometry(0.035, 0.22, 4);
  shardGeo.rotateX(Math.PI / 2);
  function shard(from, id, { life = 0.18, mat = ironMat } = {}) {
    const m = new Mesh(shardGeo, mat);
    add(m, life, (u) => {
      const e = byId(id);
      if (!e) return;
      const x = from.x + (e.x - from.x) * u, z = from.z + (e.z - from.z) * u;
      m.position.set(x, 0.6, z);
      m.lookAt(e.x, 0.6, e.z);
    });
  }
  bus.on('review_sh_thorn', (ev) => {
    for (let i = 0; i < 3; i++) setTimeout(() => shard(ev.from, ev.id, { life: 0.16 + i * 0.03 }), i * 30);
  });
  const quillMarks = new Map();
  bus.on('review_sh_quills', (ev) => {
    for (const id of ev.ids) {
      shard({ x: ev.x, z: ev.z }, id, { life: 0.22 });
      setTimeout(() => {
        const old = quillMarks.get(id);
        if (old) kill(old);
        const m = new Mesh(new ConeGeometry(0.025, 0.24, 4), ironMat);
        const it = add(m, 5, (u) => {
          const e = byId(id);
          if (!e || !(e.hp > 0)) {
            it.t = it.life;
            return;
          }
          m.position.set(e.x + 0.12, 0.75, e.z);
          m.rotation.set(0.5, 0, -0.6);
        });
        quillMarks.set(id, it);
      }, 220);
    }
    sandEdge(ev.x, ev.z, ev.r || 4, { life: 0.7, op: 0.35, w: 0.2 }); // one band on the ring's own radius, nothing outside it
  });
  bus.on('review_sh_quillback', (ev) => {
    const e = byId(ev.id);
    if (e) chunks(e.x, e.z, { n: 3, r: 0.3, up: 1.4, life: 0.4, mat: ironMat, size: 0.5 });
  });
  bus.on('review_sh_briarback', (ev) => {
    const e = byId(ev.id);
    if (e) chunks(e.x, e.z, { n: 3, r: 0.3, up: 1.4, life: 0.4, mat: ironMat, size: 0.5 });
  });
  bus.on('review_sh_briar', (ev) => {
    const g = new Group();
    const spikes = [];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, rr = ev.r * Math.sqrt(Math.random()) * 0.95;
      const m = ironBlade(0.1, 0.34 + Math.random() * 0.2);
      m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      m.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);
      m.scale.setScalar(0.001);
      g.add(m);
      spikes.push({ m, d: Math.random() * 0.2 });
    }
    const edge = new Mesh(new RingGeometry(ev.r - 0.06, ev.r, 64), basic('#E0B060', 0.3, true));
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.04;
    g.add(edge);
    g.position.set(ev.x, 0, ev.z);
    add(g, ev.secs + 0.3, (u, t) => {
      for (const s of spikes) s.m.scale.setScalar(Math.max(0.001, sm(s.d, s.d + 0.15, t) * (1 - sm(ev.secs, ev.secs + 0.3, t))));
      edge.material.opacity = 0.3 * (1 - sm(0.9, 1, u));
    });
    groundDust(ev.x, ev.z, 8, ev.r * 0.8);
  });

  // ---- Grudge: the count rides over his head; the ore in his thorns brightens (on the model)
  let grudgeLabel = null;
  bus.on('review_sh_grudge', (ev) => {
    const t = tank();
    if (!t) return;
    if (ev.slam) {
      if (grudgeLabel) kill(grudgeLabel);
      grudgeLabel = null;
      label(`spikes ×${ev.n}`, STEEL, t.x, 2.1, t.z, { life: 1.3, size: 0.3 });
      return;
    }
    if (ev.mark != null) {
      // 1.7: the foe that hit him is marked, a small iron ring under it
      const f = byId(ev.mark);
      if (f) goldEdge(f.x, f.z, 0.55, { life: 0.7, op: 0.35, w: 0.04 });
    }
    if (grudgeLabel) kill(grudgeLabel);
    grudgeLabel = label(`marked ${ev.n}`, STEEL, t.x, 2.0, t.z, { life: ev.start ? ev.secs : 3, rise: 0, size: 0.22 });
    const L = grudgeLabel;
    const prev = L.update;
    L.update = (u, tt, dt) => {
      prev(Math.min(u, 0.5), tt, 0);
      const T = tank();
      if (T) L.obj.position.set(T.x, 1.5, T.z);
    };
  });

  // review guides: thin white range rings (on a spot, or riding him) for the clip
  let guides = [];
  window.__shGuide = (list) => {
    for (const g of guides) kill(g);
    guides = [];
    for (const gd of list) {
      const m = new Mesh(new RingGeometry(gd.r - 0.035, gd.r, 96), basic('#FFFFFF', 0.45));
      m.rotation.x = -Math.PI / 2;
      const it = add(m, 1e6, () => {
        const c = gd.c ? { x: gd.c[0], z: gd.c[1] } : tankPos();
        if (c) m.position.set(c.x, 0.045, c.z);
      });
      guides.push(it);
    }
  };
  bus.on('review_sh_reset', () => {
    for (const id of [...cracks.keys()]) dropCrack(id);
    cue('grow', { scale: 1, secs: 0.01 });
    cue('slab', { on: false });
    cue('slabaway', { on: false });
    if (ringIt) kill(ringIt);
    ringIt = null;
    if (grindIt) kill(grindIt);
    grindIt = null;
    if (thrownIt) kill(thrownIt);
    thrownIt = null;
    for (const c of cubs.values()) kill(c.it);
    cubs.clear();
    for (const it of items) if (!guides.includes(it)) it.t = it.life;
    growl = null;
    guard = null;
    mound = null;
    rubbleFx.clear();
  });

  function update(dt) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      const u = Math.min(1, it.t / it.life);
      if (it.update) it.update(u, it.t, dt);
      if (it.t >= it.life) {
        root.remove(it.obj);
        it.obj.traverse((o) => {
          if (o.material && o.material.map && o.material.map.isCanvasTexture) o.material.map.dispose();
        });
        items.splice(i, 1);
      }
    }
  }
  return { update };
}
