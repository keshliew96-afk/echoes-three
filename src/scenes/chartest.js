// Character gallery scene (?scene=chartest): the four chibi party critters side
// by side on a neutral desaturated ground — the party-warmth proving ground
// (§19.2 acceptance: critters are the warmest, most saturated elements in
// frame; silhouettes identifiable at 50% zoom in greyscale).
//
// URL params:
//   ?anim=idle|walk|cast|hurt|downed   switch the procedural clip
//       (downed applies to the Healer + Swordsman and leaves the Tank + Archer
//        standing, so the horizontal-collapse + accent-desaturation read can be
//        judged against upright critters in the same frame)
//   ?zoomcheck=1     frame the party small (silhouette test at play distance)
//   ?overlap=1       cluster the party so bodies + identity rings overlap
//   ?closeup=0..3    frame one critter's head/face close up
//   ?cam=game        re-frame at the real gameplay camera elevation
//   ?yaw=deg         yaw every critter (prop/grip inspection from other sides)
//   ?ground=dark|light  swap the neutral ground value (ring-contrast check)
import { Color, Group, Mesh, PlaneGeometry, Vector3 } from 'three';
import { CAMERA } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';
import { toonMaterial } from '../render/toon.js';
import { createCritter, CRITTER_CLASSES, CLIPS, setInkViewport } from '../render/critters/index.js';

const CAM_ELEV = (33 * Math.PI) / 180; // low 3/4 — straight-on enough to
const CAM_DIST = 10.5; //                 measure head % against standing height
const CAM_DIST_ZOOMCHECK = 27;
const CAM_FOV = 28; // long lens: at the stock 45° fov the off-centre critters
//                     skewed ~13°, so a vertical staff measured as a diagonal
//                     and one eye of each outer critter fell out of view
const LOOK_Y = 0.5;

export function createCharTestScene(stage, toggles, { cosmetic }) {
  const params = new URLSearchParams(window.location.search);
  const anim = CLIPS.includes(params.get('anim')) ? params.get('anim') : 'idle';
  const zoomcheck = params.get('zoomcheck') === '1';
  const overlap = params.get('overlap') === '1';
  const closeup = params.has('closeup') ? parseInt(params.get('closeup'), 10) : null;
  const yaw = params.has('yaw') ? (parseFloat(params.get('yaw')) * Math.PI) / 180 : 0;

  const root = new Group();
  root.name = 'chartest';
  stage.scene.add(root);

  // Neutral ground: desaturated warm-grey pulled slightly cool, so the party
  // reads as the warmest, most saturated thing in frame (§19.2 warmth test).
  //
  // VALUE (round-4). The gallery floor rendered at luma 136-163 — brighter than
  // any surface the game actually ships. Measured on the live build: the Act-1
  // arena floor runs luma 30-101 (captures/r4-arena.png) and the reference
  // frame's painted stone bridge 67-74 (docs/reference/pass-the-fear.png). A
  // proving ground for ground-decal contrast has to sit in the band the game
  // uses, so the default lands near 110. `?ground=light` keeps the old, much
  // brighter floor as an explicit worst-case stress test for ring legibility,
  // and `?ground=dark` covers the arena's shaded pockets.
  const groundMix = params.get('ground') === 'light' ? 0.6 : params.get('ground') === 'dark' ? 0.94 : 0.84;
  // Cool cast applied as a CHANNEL RATIO, not a lerp toward Signal Blue: at
  // this ground value a linear lerp toward a saturated blue swamps the neutral
  // (Signal Blue's linear blue is 0.69 against the floor's 0.04) and the
  // gallery turned into a blue field instead of a neutral proving ground.
  const groundColor = new Color(PALETTE.bone)
    .lerp(new Color(PALETTE.voidCharcoal), groundMix)
    .multiply(new Color().setRGB(0.86, 0.97, 1.18));
  const ground = new Mesh(new PlaneGeometry(300, 300), toonMaterial({ color: groundColor }));
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  // The party, left to right: Healer, Tank, Swordsman, Archer.
  // Overlap layout: bodies overlap left-to-right while each critter keeps its
  // own depth row, so every identity ring still shows an arc on the floor.
  const positions = overlap
    ? [
        [-0.86, 0.08],
        [-0.24, 0.44],
        [0.46, 0.06],
        [0.84, 0.4],
      ]
    : [
        [-2.55, 0],
        [-0.85, 0],
        [0.85, 0],
        [2.55, 0],
      ];
  const critters = CRITTER_CLASSES.map((classId, i) => {
    const c = createCritter(classId, { cosmetic });
    c.group.position.set(positions[i][0], 0, positions[i][1]);
    c.setYaw(yaw);
    root.add(c.group);
    // Downed test: alternate downed/standing for the same-frame contrast.
    if (anim === 'downed') c.setAnim(i % 2 === 0 ? 'downed' : 'idle');
    else c.setAnim(anim);
    return c;
  });

  // Fixed straight-on gallery camera (this scene owns camera placement).
  if (closeup !== null && critters[closeup]) {
    // Frame the POSED head (headWorld), not the rest-pose metrics: the fox
    // carries its head forward of the hips, so a metrics-derived target aimed
    // the closeup at his crown.
    const c = critters[closeup];
    const head = c.headWorld();
    const d = 1.7;
    const ce = CAM_ELEV * 0.55;
    stage.camera.position.set(head.x, head.y + d * Math.sin(ce), head.z + d * Math.cos(ce));
    stage.camera.lookAt(head);
  } else {
    stage.camera.fov = CAM_FOV;
    stage.camera.updateProjectionMatrix();
    const dist = zoomcheck ? CAM_DIST_ZOOMCHECK : CAM_DIST;
    const elev = params.get('cam') === 'game' ? (CAMERA.elevationDeg * Math.PI) / 180 : CAM_ELEV;
    stage.camera.position.set(0, LOOK_Y + dist * Math.sin(elev), dist * Math.cos(elev));
    stage.camera.lookAt(new Vector3(0, LOOK_Y, 0));
  }

  let lastElapsed = null;
  function update(elapsedSec) {
    const dt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, elapsedSec - lastElapsed));
    lastElapsed = elapsedSec;
    // Ink thickness is specified in screen pixels, so the hull shader needs the
    // live canvas size (see render/critters/common.js).
    setInkViewport(window.innerWidth, window.innerHeight);
    for (const c of critters) c.update(dt);
  }

  // Self-check surface: PROJECTED PIXEL measurements per critter, using the
  // measured quantity the art bible acceptance names — head mass (dome top to
  // chin) over total standing height INCLUDING ears. Target band 42-44%.
  const v = new Vector3();
  function projY(x, y, z) {
    v.set(x, y, z).project(stage.camera);
    return Math.round((((1 - v.y) / 2) * window.innerHeight) * 10) / 10;
  }
  function projX(x, y, z) {
    v.set(x, y, z).project(stage.camera);
    return Math.round((((v.x + 1) / 2) * window.innerWidth) * 10) / 10;
  }
  function debugState() {
    return {
      anim,
      zoomcheck,
      overlap,
      critters: critters.map((c) => {
        const x = c.group.position.x;
        const z = c.group.position.z;
        const M = c.metrics;
        const earTop = projY(x, M.earTopY, z);
        const domeTop = projY(x, M.domeTopY, z);
        const chin = projY(x, M.chinY, z);
        const feet = projY(x, 0, z);
        const headPx = chin - domeTop;
        const totalPx = feet - earTop;
        return {
          classId: c.classId,
          anim: c.getAnim(),
          centerX: projX(x, 0, z),
          earTop,
          domeTop,
          chin,
          feet,
          headPx: Math.round(headPx * 10) / 10,
          totalPx: Math.round(totalPx * 10) / 10,
          headPct: Math.round((headPx / totalPx) * 1000) / 10,
          ringRadius: M.ringRadius,
        };
      }),
    };
  }

  return { name: 'chartest', root, update, debugState };
}
