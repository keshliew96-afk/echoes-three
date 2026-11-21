// REVIEW-ONLY (never committed, never pushed): a flat square stage for the
// ability review pages (?flat=1 with ?tripo=1). The room dressing is hidden,
// a flat floor of square grey tiles takes its place under even
// light, and every foe is drawn as a training dummy (the foe's own rig is kept,
// hidden, so hit numbers and markers sit where they always do).
import { BoxGeometry, CanvasTexture, RepeatWrapping, SRGBColorSpace, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry } from 'three';

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
    // the game's own training dummy (graybox draws it as a plain capsule):
    // dressed like every other foe, its hp read from the nearest sim dummy
    if (gb) for (const o of gb.children) {
      if (!o.isGroup || o.userData.reviewDressed || !o.children.some((c) => c.isMesh && c.geometry && c.geometry.type === 'CapsuleGeometry')) continue;
      o.userData.reviewDressed = true;
      const ent = {
        get hp() {
          const w = window.__echoes && window.__echoes.content && window.__echoes.content.world();
          let best = null, bd = 1e9;
          if (w) for (const e of w.entities()) if (e.kind === 'dummy') {
            const d = Math.hypot(e.x - o.position.x, e.z - o.position.z);
            if (d < bd) { bd = d; best = e; }
          }
          return best ? best.hp : 0;
        },
      };
      dress({ build: { group: o } }, ent);
    }
    // the dark stain under the VFX kit's ground marks (craters, scorches) reads
    // as a black hole on the light floor; the mark's glowing seam stays
    const kit = stage.scene.children.find((o) => o.name === 'vfxkit');
    if (kit) for (const s of kit.children) for (const o of s.children) if (o.isMesh && o.renderOrder === -8 && o.visible) o.visible = false;
    // a foe glob's dark ground slick (enemyfx, a flat disc in a dark colour):
    // a black pool on the light floor; bright or additive beds stay
    const ef = stage.scene.children.find((o) => o.name === 'enemyfx');
    if (ef) for (const o of ef.children) {
      if (!o.isMesh || !o.visible || !o.geometry || o.geometry.type !== 'CircleGeometry') continue;
      const m = o.material;
      if (m && m.color && m.blending === 1 && m.color.r + m.color.g + m.color.b < 0.9) o.visible = false;
    }
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
    grp.add(d);
    let lastHp = e.hp, wob = 0, flash = 0, side = 1, t = 0;
    body.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(0.1, t ? now - t : 0);
      t = now;
      if (e.hp < lastHp - 0.01) {
        wob = 1;
        flash = 1;
        side = -side;
      }
      lastHp = e.hp;
      wob = Math.max(0, wob - dt / 0.45);
      flash = Math.max(0, flash - dt / 0.15);
      tilt.rotation.x = 0.28 * wob * Math.sin((1 - wob) * Math.PI * 3) * side;
      canvas.emissiveIntensity = 0.5 * flash;
    };
  }
  return { update, dress, dispose: () => { stage.scene.remove(g); if (bg) stage.scene.background = bg; } };
}
