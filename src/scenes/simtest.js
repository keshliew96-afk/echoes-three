// ?scene=simtest — sim-core proving ground (the default scene until the game
// scenes land). Renders the sim world's entities read-only: the player probe
// (WASD/dodge-driven, Healer accent) and the harness wisps (Bone), each with
// ink outline + blob contact shadow. Positions are interpolated px/pz -> x/z
// by the clock alpha every frame — the render layer NEVER mutates sim state.
import {
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { ACT1_GROUND, CLASS_ACCENTS, PALETTE } from '../data/palette.js';
import { toonMaterial, addOutline } from '../render/toon.js';
import { getRadialTexture } from '../render/glow.js';

function blobShadow(radius, opacity = 0.35) {
  const mat = new MeshBasicMaterial({
    map: getRadialTexture(),
    color: new Color('#000000'),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const blob = new Mesh(new CircleGeometry(radius, 24), mat);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.01;
  return blob;
}

// Marker template: sphere + outline + shadow in a group; clones share
// geometry/materials, so per-entity cost is trivial.
function makeMarkerTemplate(color, radius) {
  const group = new Group();
  const body = new Mesh(
    new SphereGeometry(radius, 24, 18),
    toonMaterial({ color })
  );
  body.position.y = radius + 0.03;
  addOutline(body);
  group.add(body);
  group.add(blobShadow(radius * 1.6));
  return group;
}

export function createSimTestScene(stage, toggles, { world }) {
  const root = new Group();
  root.name = 'simtest';
  stage.scene.add(root);

  // Combat playfield footprint (§13: ~24x16 u).
  const ground = new Mesh(
    new PlaneGeometry(24, 16),
    toonMaterial({ color: ACT1_GROUND })
  );
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  const templates = {
    probe: makeMarkerTemplate(CLASS_ACCENTS.healer, 0.28),
    wisp: makeMarkerTemplate(PALETTE.bone, 0.18),
  };

  const markers = new Map(); // entity id -> Group

  function sync(alpha) {
    const seen = new Set();
    for (const e of world.entities()) {
      seen.add(e.id);
      let marker = markers.get(e.id);
      if (!marker) {
        marker = (templates[e.kind] ?? templates.wisp).clone();
        markers.set(e.id, marker);
        root.add(marker);
      }
      // Render interpolation: previous tick -> current tick by alpha.
      marker.position.x = e.px + (e.x - e.px) * alpha;
      marker.position.z = e.pz + (e.z - e.pz) * alpha;
    }
    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        root.remove(marker);
        markers.delete(id);
      }
    }
  }

  return {
    name: 'simtest',
    root,
    update(elapsedSec, alpha = 1) {
      sync(alpha);
    },
  };
}
