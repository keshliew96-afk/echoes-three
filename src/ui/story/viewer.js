// THE JOURNAL (docs/JOURNAL.md): the bestiary's model viewer. One offscreen
// WebGLRenderer, alive only while the Bestiary page is open, draws the
// game's own enemy and boss rigs (render/enemies, render/boss) under the
// portrait light rig (ui/hud/portraits.js): a slowly turning model for the
// picked entry, and one still frame per entry for the tiles (kept for the
// session, so the page opens at once the second time).
//
// The rigs are built here and nowhere near the sim: no registry, no world.
// Each one is posed idle (the rig's own pose() with a stand-in entity) and
// dropped with the viewer.
import {
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  HemisphereLight,
  Color,
  WebGLRenderer,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  Box3,
  Vector3,
} from 'three';
import { buildBoar } from '../../render/enemies/boar.js';
import { buildMantis } from '../../render/enemies/mantis.js';
import { ARCH_BUILDERS } from '../../render/enemies/archetypes.js';
import { buildStag } from '../../render/boss/stag.js';
import { buildHeron } from '../../render/boss/heron.js';
import { buildWyrm } from '../../render/boss/wyrm.js';
import { buildThornmother, buildMillwheel, buildLichram } from '../../render/boss/slice2.js';
import { buildCantor, buildColossus } from '../../render/boss/heart.js';
import { setInkViewport } from '../../render/critters/index.js';
import { EXPOSURE } from '../../render/stage.js';
import { PALETTE } from '../../data/palette.js';

const BUILDERS = {
  boar: buildBoar,
  mantis: buildMantis,
  ...ARCH_BUILDERS,
  stag: buildStag,
  heron: buildHeron,
  wyrm: buildWyrm,
  thornmother: buildThornmother,
  millwheel: buildMillwheel,
  lichram: buildLichram,
  cantor: buildCantor,
  colossus: buildColossus,
};
export const VIEWER_KINDS = Object.freeze(Object.keys(BUILDERS));

const LIVE_PX = 560; // render size of the turning model (CSS scales it)
const THUMB_PX = 112; // tile still
const TURN = 0.55; // rad/s
const PITCH = 0.42; // camera elevation (rad): the game's own top-down lean
const FOV = 26;

// Session cache of tile stills: kind -> data URL.
const THUMBS = new Map();
export const thumbFor = (kind) => THUMBS.get(kind) ?? null;

// A stand-in entity for pose(): idle, healthy, nothing telegraphing.
const idleEntity = (kind) => ({
  id: 0,
  kind,
  x: 0,
  z: 0,
  px: 0,
  pz: 0,
  hp: 10,
  maxHp: 10,
  state: 'active',
  mode: 'idle',
  telegraph: null,
  elite: false,
  faceX: 0,
  faceZ: 1,
  burrowed: false,
  hittable: true,
  beatK: 0,
});

// The box of the solid body: opaque meshes only (no glows, rings or shadows).
function bodyBox(root) {
  const box = new Box3();
  const tmp = new Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.isSprite || !o.visible || !o.geometry) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && (m.transparent || m.side === 1 /* BackSide: ink hulls */)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    if (![tmp.min.x, tmp.min.y, tmp.min.z, tmp.max.x, tmp.max.y, tmp.max.z].every(Number.isFinite)) return; // an empty or unbuilt geometry
    box.union(tmp);
  });
  if (box.isEmpty()) box.setFromObject(root);
  if (box.isEmpty()) box.set(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5));
  return box;
}

export function createModelViewer() {
  let renderer = null;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(LIVE_PX, LIVE_PX, false);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    renderer.setClearColor(0x000000, 0);
  } catch {
    return null; // no second context: the page shows its drawn plates instead
  }
  const canvas = renderer.domElement;
  canvas.className = 'jr-canvas';

  const scene = new Scene();
  const key = new DirectionalLight(new Color(PALETTE.hearthAmber).lerp(new Color('#FFFFFF'), 0.45), 4.2);
  key.position.set(2.2, 3.4, 3.0);
  scene.add(key);
  const rim = new DirectionalLight(new Color(PALETTE.godstuffViolet).lerp(new Color('#FFFFFF'), 0.35), 2.2);
  rim.position.set(-2.6, 1.8, -2.4);
  scene.add(rim);
  scene.add(new HemisphereLight(new Color(PALETTE.signalBlue).lerp(new Color('#FFFFFF'), 0.45), new Color(PALETTE.voidCharcoal), 2.4));
  const cam = new PerspectiveCamera(FOV, 1, 0.05, 200);

  const rigs = new Map(); // kind -> { rig, center, radius }
  let current = null;
  let raf = 0;
  let t0 = performance.now();
  let disposed = false;
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = THUMB_PX;
  thumbCanvas.height = THUMB_PX;
  const thumbCtx = thumbCanvas.getContext('2d');

  function rigFor(kind) {
    if (rigs.has(kind)) return rigs.get(kind);
    const build = BUILDERS[kind];
    let rec = null;
    try {
      const rig = build(null);
      pose(rig, kind, 0);
      if (rig.setYaw) rig.setYaw(0);
      const box = bodyBox(rig.group);
      const center = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());
      const r = 0.5 * Math.hypot(size.x, size.y, size.z);
      const radius = Number.isFinite(r) ? Math.max(0.2, r) : 1;
      if (!Number.isFinite(center.x + center.y + center.z)) center.set(0, 0.5, 0);
      rig.group.visible = false;
      scene.add(rig.group);
      rec = { kind, rig, center, radius };
    } catch {
      rec = null;
    }
    rigs.set(kind, rec);
    return rec;
  }
  function pose(rig, kind, t) {
    if (typeof rig.pose !== 'function') return;
    try {
      rig.pose({ t, tick: Math.round(t * 60), walkPhase: t * 1.4, moveK: 0, telegraphK: 0, lungeK: 0, fireK: 0, sealK: 0, hpFrac: 1, e: idleEntity(kind) });
    } catch {
      /* a rig that needs more than an idle stand-in stays in its build pose */
    }
  }
  function frame(rec, yaw) {
    const d = rec.radius / Math.sin(((FOV / 2) * Math.PI) / 180) * 1.02;
    cam.position.set(rec.center.x, rec.center.y + Math.sin(PITCH) * d, rec.center.z + Math.cos(PITCH) * d);
    cam.lookAt(rec.center);
    cam.updateProjectionMatrix();
    if (rec.rig.setYaw) rec.rig.setYaw(yaw);
    else rec.rig.group.rotation.y = yaw;
  }
  function draw(rec, t, yaw) {
    for (const r of rigs.values()) if (r) r.rig.group.visible = r === rec;
    pose(rec.rig, rec.kind, t);
    frame(rec, yaw);
    setInkViewport(LIVE_PX, LIVE_PX);
    renderer.render(scene, cam);
    setInkViewport(window.innerWidth, window.innerHeight);
  }

  function tick() {
    raf = 0;
    if (disposed || !current) return;
    const t = (performance.now() - t0) / 1000;
    const rec = rigFor(current);
    if (rec) draw(rec, t, -0.5 + t * TURN);
    raf = requestAnimationFrame(tick);
  }

  return {
    canvas,
    // Turn `kind` on the live canvas (null stops it).
    show(kind) {
      if (disposed) return false;
      current = BUILDERS[kind] ? kind : null;
      if (current && current !== this.shown) t0 = performance.now();
      this.shown = current;
      if (current && !raf) raf = requestAnimationFrame(tick);
      return !!(current && rigFor(current));
    },
    shown: null,
    // A still for a tile (cached for the session).
    thumb(kind) {
      if (THUMBS.has(kind)) return THUMBS.get(kind);
      if (disposed || !BUILDERS[kind]) return null;
      const rec = rigFor(kind);
      if (!rec) return null;
      draw(rec, 0.4, -0.55);
      thumbCtx.clearRect(0, 0, THUMB_PX, THUMB_PX);
      thumbCtx.drawImage(canvas, 0, 0, THUMB_PX, THUMB_PX);
      const url = thumbCanvas.toDataURL('image/png');
      THUMBS.set(kind, url);
      // the live model redraws on its next frame
      return url;
    },
    debug: () => ({ rigs: [...rigs.entries()].map(([k, r]) => ({ kind: k, ok: !!r, radius: r ? Math.round(r.radius * 100) / 100 : null })), shown: current, thumbs: THUMBS.size }),
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      for (const r of rigs.values()) {
        if (!r) continue;
        // Removed, not released: a rig's geometries and materials are shared
        // with the live game's rigs (module caches), and disposing them here
        // would free the main renderer's copies too. Losing this context
        // frees everything it uploaded.
        scene.remove(r.rig.group);
      }
      rigs.clear();
      try {
        renderer.dispose();
        renderer.forceContextLoss();
      } catch {
        /* context already gone */
      }
    },
  };
}
