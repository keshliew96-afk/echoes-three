// Render-only cosmetics of a guest's OWN predicted actions (docs/gauntlet/
// PLAN.md §3.7 "Own-action prediction"). Owner: M5b.
//
// Nothing here is sim state and nothing is ever spawned in the registry:
//   - cosmetic bolts: a predicted shot flies at once, on the press frame,
//     drawn like the skill-bolt layer's parchment core + amber glow. When the
//     host's replicated bolt appears (same skill, owned by this seat) the
//     replica renders it LEAD ticks ahead so it sits exactly where the
//     cosmetic is, and the cosmetic fades out over 60 ms — the handoff is
//     seamless (within 0.3 u; otherwise it snaps: removed at once);
//   - placement rings for predicted ground zones (the zone itself arrives
//     from the host);
//   - dash afterimages on the predicted body while the i-frame window of a
//     dodge runs (G5b.10 "dodge i-frame window visible on the predicted body").
// Retracted predictions remove their cosmetics at once.
import { Group, Mesh, MeshBasicMaterial, CapsuleGeometry, RingGeometry, CylinderGeometry, AdditiveBlending } from 'three';
import { PALETTE } from '../../data/palette.js';

const BOLT_Y = 0.55;
const HANDOFF_U = 0.3;
const FADE_S = 0.06;

export function createCosmetics({ stage }) {
  const root = new Group();
  root.name = 'net-cosmetics';
  stage.scene.add(root);
  const coreGeo = new CapsuleGeometry(0.085, 0.2, 4, 8);
  const glowGeo = new CapsuleGeometry(0.16, 0.26, 4, 8);
  const ringGeo = new RingGeometry(0.86, 1.0, 40);
  const ghostGeo = new CylinderGeometry(0.26, 0.3, 0.9, 12, 1, true);
  const bolts = []; // { predId, skill, g, x, z, vx, vz, traveled, range, age, fade, handed, entityId }
  const rings = []; // { predId, m, age, life }
  const ghosts = []; // { m, age }
  const stats = { spawned: 0, handedOff: 0, snapped: 0, retracted: 0, expired: 0, ghosts: 0 };

  function makeBolt() {
    const g = new Group();
    const core = new Mesh(coreGeo, new MeshBasicMaterial({ color: PALETTE.parchment, transparent: true, opacity: 1, depthWrite: false, depthTest: false }));
    core.rotation.z = Math.PI / 2;
    core.renderOrder = 6;
    core.name = 'core';
    const glow = new Mesh(glowGeo, new MeshBasicMaterial({ color: PALETTE.hearthAmber, transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false, depthTest: false }));
    glow.rotation.z = Math.PI / 2;
    glow.renderOrder = 5;
    glow.name = 'glow';
    g.add(glow, core);
    g.position.y = BOLT_Y;
    return g;
  }

  function spawnBolt({ predId, skill, x, z, dirX, dirZ, speed, range }) {
    const g = makeBolt();
    g.position.set(x, BOLT_Y, z);
    const yaw = Math.atan2(dirZ, -dirX);
    g.getObjectByName('core').rotation.y = yaw;
    g.getObjectByName('glow').rotation.y = yaw;
    root.add(g);
    bolts.push({ predId, skill, g, x, z, vx: dirX * speed, vz: dirZ * speed, speed, traveled: 0, range, age: 0, fade: -1, handed: false, entityId: null });
    stats.spawned += 1;
  }

  function ring({ predId, x, z, radius }) {
    const m = new Mesh(ringGeo, new MeshBasicMaterial({ color: PALETTE.hearthAmber, transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.04, z);
    m.scale.setScalar(radius);
    m.renderOrder = -2;
    root.add(m);
    rings.push({ predId, m, age: 0, life: 0.45 });
  }

  function ghost(x, z) {
    const m = new Mesh(ghostGeo, new MeshBasicMaterial({ color: PALETTE.parchment, transparent: true, opacity: 0.32, blending: AdditiveBlending, depthWrite: false }));
    m.position.set(x, 0.45, z);
    root.add(m);
    ghosts.push({ m, age: 0 });
    stats.ghosts += 1;
  }

  function dispose(obj) {
    root.remove(obj);
    obj.traverse((o) => {
      if (o.material) o.material.dispose();
    });
  }

  function remove(predId) {
    for (const b of bolts) {
      if (b.predId === predId && b.fade < 0) {
        b.fade = 0;
        stats.retracted += 1;
      }
    }
    for (const r of rings) if (r.predId === predId) r.age = r.life;
  }
  function confirm() {
    /* confirmation alone changes nothing visible: the handoff does */
  }

  // update(dt, { ownMovers, setLead }) — once per rendered frame.
  //   ownMovers(): replicated bolts owned by this seat that have no lead yet,
  //                at their RENDER position: [{ id, skill, x, z, vx, vz (per tick) }]
  //   setLead(id, ticks): render that bolt `ticks` ahead (replica.leads)
  function update(dt, ctx = {}) {
    const movers = ctx.ownMovers ? ctx.ownMovers() : [];
    for (const m of movers) {
      // Nearest un-handed cosmetic of the same skill, measured along flight.
      let best = null;
      let bestD = Infinity;
      const spt = Math.hypot(m.vx, m.vz); // u per tick
      if (!(spt > 0)) continue;
      const ux = m.vx / spt;
      const uz = m.vz / spt;
      for (const b of bolts) {
        if (b.handed || b.fade >= 0 || b.skill !== m.skill) continue;
        // How far ahead along the flight line the cosmetic is (in ticks),
        // and how far off that line (the handoff test).
        const along = (b.x - m.x) * ux + (b.z - m.z) * uz;
        const lead = along / spt;
        const px = m.x + m.vx * lead;
        const pz = m.z + m.vz * lead;
        const d = Math.hypot(px - b.x, pz - b.z);
        if (d < bestD) {
          bestD = d;
          best = { b, lead };
        }
      }
      if (!best) continue;
      best.b.handed = true;
      best.b.entityId = m.id;
      best.b.fade = 0;
      if (bestD <= HANDOFF_U && best.lead > 0) {
        if (ctx.setLead) ctx.setLead(m.id, best.lead);
        stats.handedOff += 1;
      } else {
        best.b.fade = FADE_S; // snap: gone this frame
        stats.snapped += 1;
      }
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.age += dt;
      const step = Math.min(b.speed * dt, Math.max(0, b.range - b.traveled));
      const l = Math.hypot(b.vx, b.vz) || 1;
      b.x += (b.vx / l) * step;
      b.z += (b.vz / l) * step;
      b.traveled += step;
      b.g.position.set(b.x, BOLT_Y, b.z);
      if (b.fade >= 0) {
        b.fade += dt;
        const k = Math.max(0, 1 - b.fade / FADE_S);
        b.g.getObjectByName('core').material.opacity = k;
        b.g.getObjectByName('glow').material.opacity = 0.45 * k;
        if (k <= 0) {
          dispose(b.g);
          bolts.splice(i, 1);
        }
        continue;
      }
      if (b.traveled >= b.range - 1e-6 || b.age > 3) {
        b.fade = 0;
        stats.expired += 1;
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      const k = 1 - r.age / r.life;
      if (k <= 0) {
        dispose(r.m);
        rings.splice(i, 1);
      } else r.m.material.opacity = 0.8 * k;
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i];
      g.age += dt;
      const k = 1 - g.age / 0.22;
      if (k <= 0) {
        dispose(g.m);
        ghosts.splice(i, 1);
      } else g.m.material.opacity = 0.32 * k;
    }
  }

  function clear() {
    for (const b of bolts) dispose(b.g);
    for (const r of rings) dispose(r.m);
    for (const g of ghosts) dispose(g.m);
    bolts.length = 0;
    rings.length = 0;
    ghosts.length = 0;
  }

  return {
    spawnBolt,
    ring,
    ghost,
    remove,
    confirm,
    update,
    clear,
    dispose() {
      clear();
      stage.scene.remove(root);
    },
    stats: () => ({ ...stats, live: bolts.length, rings: rings.length, ghostsLive: ghosts.length }),
  };
}
