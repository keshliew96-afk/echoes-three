// REVIEW-ONLY (never committed, never pushed): a flat square stage for the
// ability review pages (?flat=1 with ?tripo=1). The room dressing is hidden,
// a flat floor of square grey tiles takes its place under even
// light, and every foe is drawn as a training dummy (the foe's own rig is kept,
// hidden, so hit numbers and markers sit where they always do).
import { BoxGeometry, CanvasTexture, Quaternion, Vector3, RepeatWrapping, SRGBColorSpace, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry } from 'three';

const FLOOR = '#6A665F', TILE_B = '#625E58', LINE = '#4E4B46', EDGE = '#8A867E';
const CANVAS = '#A39C8E', WOOD = '#4A3B2C', ROPE = '#8C8472';

export function createReviewFlatStage({ stage, getActive }) {
  const g = new Group();
  g.name = 'review-flat-stage';
  // square tiles, 1 u each, in two close greys with a thin dark joint
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    x.fillStyle = (i + j) % 2 ? TILE_B : FLOOR;
    x.fillRect(i * 64, j * 64, 64, 64);
  }
  x.fillStyle = LINE;
  for (let k = 0; k < 2; k++) {
    x.fillRect(k * 64, 0, 2, 128);
    x.fillRect(0, k * 64, 128, 2);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(20, 15);
  tex.anisotropy = 8;
  const floor = new Mesh(new PlaneGeometry(40, 30), new MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.005;
  g.add(floor);
  // the square the fight is on: a slightly lighter edge, 24 by 16 (the room)
  for (const [w, d, x, z] of [[24, 0.06, 0, -8], [24, 0.06, 0, 8], [0.06, 16, -12, 0], [0.06, 16, 12, 0]]) {
    const m = new Mesh(new BoxGeometry(w, 0.01, d), new MeshStandardMaterial({ color: EDGE, roughness: 1 }));
    m.position.set(x, 0.004, z);
    g.add(m);
  }
  const hemi = new HemisphereLight('#FFFFFF', '#55524C', 0.5);
  const sun = new DirectionalLight('#FFF6E8', 0.6);
  sun.position.set(-6, 14, 8);
  g.add(hemi, sun);
  stage.scene.add(g);
  window.__reviewScene = stage.scene;
  const bg = stage.scene.background ? stage.scene.background.clone() : null;
  stage.scene.background = new Color('#34322E');

  function update() {
    const a = getActive();
    if (a && a.group && a.group.visible) a.group.visible = false;
    if (stage.scene.fog) stage.scene.fog = null;
    // kill splats and leftover scorch burns (graybox's decal pool) read as black
    // blobs on the light floor: keep them off the review stage
    const gb = stage.scene.children.find((o) => o.name === 'graybox');
    if (gb) for (const o of gb.children) if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.visible) o.visible = false;
    // the dark stain under the VFX kit's ground marks (craters, scorches) reads
    // as a black hole on the light floor; the mark's glowing seam stays
    const kit = stage.scene.children.find((o) => o.name === 'vfxkit');
    if (kit) for (const s of kit.children) for (const o of s.children) if (o.isMesh && o.renderOrder === -8 && o.visible) o.visible = false;
  }

  // ---- training dummies in place of the foes' rigs
  const geo = {
    post: new CylinderGeometry(0.06, 0.07, 0.42, 8),
    body: new CylinderGeometry(0.24, 0.27, 0.56, 12),
    head: new SphereGeometry(0.17, 14, 10),
    arm: new CylinderGeometry(0.05, 0.05, 0.86, 8),
    band: new CylinderGeometry(0.255, 0.255, 0.05, 12),
    base: new CylinderGeometry(0.26, 0.3, 0.06, 12),
  };
  const woodMat = new MeshStandardMaterial({ color: WOOD, roughness: 0.9 });
  const ropeMat = new MeshStandardMaterial({ color: ROPE, roughness: 1 });
  function dress(r, e) {
    const grp = r.build.group;
    const hide = new Group();
    hide.visible = false;
    for (const c of [...grp.children]) hide.add(c);
    grp.add(hide);
    const canvas = new MeshStandardMaterial({ color: CANVAS, roughness: 0.95, emissive: '#FFFFFF', emissiveIntensity: 0 });
    const d = new Group();
    const tilt = new Group();
    const base = new Mesh(geo.base, woodMat);
    base.position.y = 0.03;
    d.add(base);
    const post = new Mesh(geo.post, woodMat);
    post.position.y = 0.25;
    tilt.add(post);
    const body = new Mesh(geo.body, canvas);
    body.position.y = 0.72;
    tilt.add(body);
    for (const y of [0.55, 0.88]) {
      const b = new Mesh(geo.band, ropeMat);
      b.position.y = y;
      tilt.add(b);
    }
    const arm = new Mesh(geo.arm, woodMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.y = 0.84;
    tilt.add(arm);
    const head = new Mesh(geo.head, canvas);
    head.position.y = 1.15;
    tilt.add(head);
    d.add(tilt);
    d.scale.setScalar(0.72); // REVIEW-ONLY (Ashfang): a fox-sized dummy
    grp.add(d);
    // 1.8: a hit rocks the dummy away from the blade and twists it along the swing (window.__afHit,
    // set by the fox's review VFX); a hit from anything else rocks it the old way
    let lastHp = e.hp, flash = 0, side = 1, t = 0, hitT = -1, ax = null, tw = 0, amp = 0;
    const iq = new Quaternion(), qa = new Quaternion(), qb = new Quaternion(), up = new Vector3(0, 1, 0);
    body.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(0.1, t ? now - t : 0);
      t = now;
      if (e.hp < lastHp - 0.01) {
        flash = 1;
        side = -side;
        hitT = now;
        const h = window.__afHit;
        d.getWorldQuaternion(iq).invert();
        if (h && h.id === e.id && now - h.t < 0.25) {
          // tilt the top along the blow, twist by the swing's side
          const push = new Vector3(h.dx, 0, h.dz).normalize();
          ax = new Vector3().crossVectors(up, push).normalize().applyQuaternion(iq);
          const swing = new Vector3(h.sx, 0, h.sz);
          tw = Math.max(-1, Math.min(1, new Vector3().crossVectors(push, swing).y * 2)) * (h.strong ? 0.32 : 0.22);
          amp = h.strong ? 0.36 : 0.24;
        } else {
          ax = new Vector3(side, 0, 0);
          tw = 0;
          amp = 0.28;
        }
      }
      lastHp = e.hp;
      flash = Math.max(0, flash - dt / 0.15);
      // 1.8: a softer flash (0.5 blew the canvas out to white under the bloom)
      canvas.emissiveIntensity = 0.22 * flash;
      if (hitT < 0 || !ax) return;
      const s = now - hitT;
      // a quick push (peak about 50 ms in), two rocks back, settled by 0.6 s
      const k = Math.exp(-s / 0.2), osc = Math.sin(Math.min(1, s / 0.05) * Math.PI / 2) * (s < 0.05 ? 1 : Math.cos((s - 0.05) * Math.PI * 2 * 2.6));
      qa.setFromAxisAngle(ax, amp * k * osc);
      qb.setFromAxisAngle(up, tw * Math.exp(-s / 0.14) * Math.sin(Math.min(1, s / 0.04) * Math.PI / 2));
      tilt.quaternion.copy(qa).multiply(qb);
      // the canvas squashes on the blow
      const sq = Math.exp(-s / 0.05);
      body.scale.set(1 + 0.06 * sq, 1 - 0.07 * sq, 1 + 0.06 * sq);
      if (s > 0.9) { hitT = -1; tilt.quaternion.identity(); body.scale.set(1, 1, 1); }
    };
  }
  return { update, dress, dispose: () => { stage.scene.remove(g); if (bg) stage.scene.background = bg; } };
}
