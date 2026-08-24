// Character gallery scene (?scene=chartest): the four chibi party critters
// side by side on a neutral desaturated ground — the party-warmth proving
// ground (§19.2 acceptance: critters are the warmest, most saturated elements
// in frame; silhouettes identifiable at 50% zoom in greyscale).
//
// URL params:
//   ?anim=idle|walk|cast|hurt|downed   switch the procedural clip
//       (downed applies to the Healer + Swordsman and leaves the Tank +
//        Archer standing, so the horizontal-collapse + accent-desaturation
//        read can be judged against upright critters in the same frame)
//   ?zoomcheck=1                       frame the party small (silhouette test)
//   ?overlap=1                         cluster the party so bodies + identity
//                                      rings overlap (ring-visibility test)
//   ?closeup=0..3                      frame one critter's head/face close up
//                                      (eye/glint/ink inspection)
//   ?cam=game                          re-frame at the real gameplay camera
//                                      elevation (CAMERA.elevationDeg) instead
//                                      of the low straight-on gallery angle —
//                                      how identity rings actually read in play
import { Color, Group, Mesh, PlaneGeometry, Vector3 } from 'three';
import { CAMERA } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';
import { toonMaterial } from '../render/toon.js';
import { createCritter, CRITTER_CLASSES, CLIPS } from '../render/critters/index.js';

const CAM_ELEV = (33 * Math.PI) / 180; // low 3/4 — straight-on enough to
const CAM_DIST = 5.6; //                  measure head % against standing height
const CAM_DIST_ZOOMCHECK = 14.5;
const LOOK_Y = 0.45;

export function createCharTestScene(stage, toggles, { cosmetic }) {
  const params = new URLSearchParams(window.location.search);
  const anim = CLIPS.includes(params.get('anim')) ? params.get('anim') : 'idle';
  const zoomcheck = params.get('zoomcheck') === '1';
  const overlap = params.get('overlap') === '1';
  const closeup = params.has('closeup') ? parseInt(params.get('closeup'), 10) : null;

  const root = new Group();
  root.name = 'chartest';
  stage.scene.add(root);

  // Neutral ground: desaturated warm-grey pulled slightly cool, so the party
  // reads as the warmest, most saturated thing in frame (§19.2 warmth test).
  const groundColor = new Color(PALETTE.bone)
    .lerp(new Color(PALETTE.voidCharcoal), 0.58)
    .lerp(new Color(PALETTE.signalBlue), 0.16);
  // 300 u square: still fills the horizon at the zoomcheck camera distance
  // (60 u left a black band across the frame top — verified in capture).
  const ground = new Mesh(new PlaneGeometry(300, 300), toonMaterial({ color: groundColor }));
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  // The party, left to right: Healer, Tank, Swordsman, Archer.
  const positions = overlap
    ? [
        [-0.95, 0.3],
        [-0.32, -0.12],
        [0.32, 0.22],
        [0.95, -0.18],
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
    root.add(c.group);
    // Downed test: alternate downed/standing for the same-frame contrast.
    if (anim === 'downed') c.setAnim(i % 2 === 0 ? 'downed' : 'idle');
    else c.setAnim(anim);
    return c;
  });

  // Fixed straight-on gallery camera (this scene owns camera placement).
  if (closeup !== null && critters[closeup]) {
    const c = critters[closeup];
    const cx = c.group.position.x;
    const cz = c.group.position.z;
    const cy = (c.metrics.headTopY + c.metrics.headBottomY) / 2;
    const d = 1.6;
    // Look down far enough that the ground horizon stays out of frame (at a
    // shallower tilt the 45 deg fov clipped sky into the top of the capture).
    const ce = CAM_ELEV * 0.78;
    stage.camera.position.set(cx, cy + d * Math.sin(ce), cz + d * Math.cos(ce));
    stage.camera.lookAt(new Vector3(cx, cy, cz));
  } else {
    const dist = zoomcheck ? CAM_DIST_ZOOMCHECK : CAM_DIST;
    const elev = params.get('cam') === 'game' ? (CAMERA.elevationDeg * Math.PI) / 180 : CAM_ELEV;
    stage.camera.position.set(0, LOOK_Y + dist * Math.sin(elev), dist * Math.cos(elev));
    stage.camera.lookAt(new Vector3(0, LOOK_Y, 0));
  }

  let lastElapsed = null;
  function update(elapsedSec) {
    const dt = lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, elapsedSec - lastElapsed));
    lastElapsed = elapsedSec;
    for (const c of critters) c.update(dt);
  }

  // Self-check surface: projected pixel measurements for the head-proportion
  // acceptance (head = 40-45% of standing height) per critter.
  const v = new Vector3();
  function projY(x, y, z) {
    v.set(x, y, z).project(stage.camera);
    return ((1 - v.y) / 2) * window.innerHeight;
  }
  function debugState() {
    return {
      anim,
      zoomcheck,
      overlap,
      critters: critters.map((c) => {
        const [x, , z] = [c.group.position.x, 0, c.group.position.z];
        const headTop = projY(x, c.metrics.headTopY, z);
        const headBottom = projY(x, c.metrics.headBottomY, z);
        const feet = projY(x, 0, z);
        const headPx = headBottom - headTop;
        const heightPx = feet - headTop;
        return {
          classId: c.classId,
          anim: c.getAnim(),
          headPx: Math.round(headPx * 10) / 10,
          heightPx: Math.round(heightPx * 10) / 10,
          headPct: Math.round((headPx / heightPx) * 1000) / 10,
        };
      }),
    };
  }

  return { name: 'chartest', root, update, debugState };
}
