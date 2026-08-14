// ?scene=rendertest — renderer foundation proving ground. Ground plane, three
// outlined toon primitives (class-accent colors), one emissive orb with a glow
// halo for the bloom check, blob contact shadows. Later blocks keep the game
// as the default scene; this URL must keep working for comparison captures.
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { PALETTE, CLASS_ACCENTS } from '../data/palette.js';
import { toonMaterial, addOutline } from '../render/toon.js';
import { makeGlowSprite, getRadialTexture } from '../render/glow.js';

// Act-1 woodland ground tone, inside BUILD_BRIEF §19.3's band (HSV hue 100deg,
// sat 60%, val 55%) — derived from the brief's ranges, not invented.
const GROUND_GREEN = '#548C38';

function blobShadow(radius = 0.45, opacity = 0.35) {
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

export function createRenderTestScene(stage, { outline = true } = {}) {
  const root = new Group();
  root.name = 'rendertest';
  stage.scene.add(root);

  // Ground plane (combat playfield footprint, §13: ~24x16 u).
  const ground = new Mesh(
    new PlaneGeometry(24, 16),
    toonMaterial({ color: GROUND_GREEN })
  );
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  const outlines = [];

  // Three primitive shapes in class-accent colors, each outlined.
  // Shapes float 0.03 u above the ground so the ink line at the base contact
  // isn't depth-clipped by the ground plane (real characters cover the contact
  // with blob shadows).
  const LIFT = 0.03;

  const sphere = new Mesh(
    new SphereGeometry(0.55, 32, 24),
    toonMaterial({ color: CLASS_ACCENTS.healer })
  );
  sphere.position.set(-2.2, 0.55 + LIFT, 0.2);
  root.add(sphere);

  const box = new Mesh(
    new BoxGeometry(1, 1, 1),
    toonMaterial({ color: CLASS_ACCENTS.tank })
  );
  box.position.set(0, 0.5 + LIFT, -1.2);
  root.add(box);

  const cone = new Mesh(
    new ConeGeometry(0.5, 1.2, 48),
    toonMaterial({ color: CLASS_ACCENTS.swordsman })
  );
  cone.position.set(2.1, 0.6 + LIFT, 0.6);
  root.add(cone);

  for (const mesh of [sphere, box, cone]) {
    const hull = addOutline(mesh);
    hull.visible = outline;
    outlines.push(hull);
    const shadow = blobShadow(0.55);
    shadow.position.x = mesh.position.x;
    shadow.position.z = mesh.position.z;
    root.add(shadow);
  }

  // Emissive orb (Hearth Amber) — the bloom subject. HDR emissive pushes it
  // past the 0.85 bloom threshold; additive glow sprite is the authored halo.
  const orb = new Mesh(
    new SphereGeometry(0.35, 32, 24),
    new MeshStandardMaterial({
      color: new Color(PALETTE.hearthAmber),
      emissive: new Color(PALETTE.hearthAmber),
      emissiveIntensity: 2.8,
    })
  );
  orb.position.set(0.6, 1.0, 1.4);
  root.add(orb);

  const halo = makeGlowSprite({ color: PALETTE.hearthAmber, size: 2.4, opacity: 0.8 });
  orb.add(halo);

  const orbShadow = blobShadow(0.4, 0.3);
  orbShadow.position.set(orb.position.x, 0.011, orb.position.z);
  root.add(orbShadow);

  const orbBaseY = orb.position.y;

  return {
    name: 'rendertest',
    root,
    // Cosmetic per-frame animation (wall-clock is fine for cosmetics, §1).
    update(elapsedSec) {
      box.rotation.y = elapsedSec * 0.4;
      orb.position.y = orbBaseY + Math.sin(elapsedSec * 1.5) * 0.12;
    },
  };
}
