// The rig table of the foes still drawn by their first rigs (the Spire and
// Kiln kinds, render/enemies/spire.js and kiln.js, and the champions,
// render/enemies/champions.js), the crown height per kind, and the elite mark
// (§23.5) the layer attaches to any rig. The Level I to IV foes are drawn by
// their faceted rigs (render/enemies/facet/, docs/MODEL_STANDARD.md); their
// classic rigs were retired (AUDIT.md D1).
//
// Faces +Z. The layer drives animation through `pose({ t, walkPhase, moveK,
// telegraphK, fireK, e })` (`e` = the sim entity, READ ONLY).
import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { markShared } from '../geocache.js';
import { makeGlowSprite } from '../glow.js';
import { TELL_INDIGO, TELL_INDIGO_GLOW } from './style.js';
import { buildKite, buildChime, buildGargoyle, buildHanger, buildVane, buildSacristan } from './spire.js';
import { buildNewt, buildSlag, buildBellows, buildCindermoth, buildHurler, buildAshWraith } from './kiln.js';
import { CHAMPION_BUILDERS, CHAMPION_CROWN_Y } from './champions.js';

function tellGlow(size, opacity) {
  const g = makeGlowSprite({ color: TELL_INDIGO_GLOW, size, opacity });
  g.material.toneMapped = false;
  g.material.color.copy(TELL_INDIGO_GLOW);
  return g;
}

const cache = {};
function shared(key, make) {
  if (!cache[key]) {
    cache[key] = make();
    markShared(cache[key]);
  }
  return cache[key];
}

// ------------------------------------------------------------ ELITE --
// §23.5 Elite: an indigo crown glyph above the head + a second, outer indigo
// ring on the ground (never violet). Attached to any rig by the layer.
export function makeEliteMark(height = 1.0, ringR = 0.62) {
  const g = new Group();
  g.name = 'elite-mark';
  const crownG = shared('elite-crown', () =>
    mergeGeometries([
      new CylinderGeometry(0.13, 0.13, 0.05, 10, 1, true).translate(0, 0, 0),
      ...[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return new ConeGeometry(0.035, 0.12, 4).translate(Math.cos(a) * 0.12, 0.08, Math.sin(a) * 0.12);
      }),
    ])
  );
  const crown = new Mesh(crownG, new MeshBasicMaterial({ color: TELL_INDIGO, toneMapped: false }));
  crown.position.y = height;
  g.add(crown);
  const glow = tellGlow(0.55, 0.32);
  glow.position.y = height + 0.04;
  g.add(glow);
  const ring = new Mesh(
    shared(`elite-ring:${ringR}`, () => new RingGeometry(ringR - 0.05, ringR, 40)),
    new MeshBasicMaterial({ color: TELL_INDIGO, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.014;
  ring.renderOrder = -1;
  g.add(ring);
  return {
    group: g,
    update(t) {
      crown.rotation.y = t * 1.2;
      crown.position.y = height + 0.04 * Math.sin(t * 2.2);
      glow.material.opacity = 0.26 + 0.08 * Math.sin(t * 2.2);
    },
  };
}

export const ARCH_BUILDERS = Object.freeze({
  // Act V, the Still Spire (render/enemies/spire.js).
  kite: buildKite,
  chime: buildChime,
  gargoyle: buildGargoyle,
  hanger: buildHanger,
  vane: buildVane,
  sacristan: buildSacristan,
  // The Ember Kiln (render/enemies/kiln.js, docs/KILN.md).
  newt: buildNewt,
  slag: buildSlag,
  bellows: buildBellows,
  cindermoth: buildCindermoth,
  hurler: buildHurler,
  ashwraith: buildAshWraith,
  // CHAMPIONS (render/enemies/champions.js, docs/CHAMPIONS.md).
  ...CHAMPION_BUILDERS,
});
// Crown height per kind (world u above the ground at scale 1).
export const CROWN_Y = Object.freeze({ boar: 0.95, mantis: 1.35, quillback: 0.95, toad: 0.72, moth: 1.75, ram: 1.12, mole: 0.62, rotcap: 0.78, snail: 0.92, crow: 0.92, brood: 0.85, broodling: 0.45, wasp: 1.2, thornling: 0.95, crab: 0.72, lamprey: 0.55, gravewisp: 1.55, knight: 1.55, husk: 1.3, lancer: 1.9, geode: 1.6, censer: 1.9, owl: 2.0, lasher: 1.15, leech: 0.6, miller: 1.75, ...CHAMPION_CROWN_Y, keener: 1.75, sexton: 1.35, bloom: 1.35, siphon: 1.95, kite: 2.1, chime: 2.0, gargoyle: 1.75, hanger: 2.55, vane: 2.05, sacristan: 1.55, newt: 0.62, slag: 1.75, bellows: 1.25, cindermoth: 1.85, hurler: 1.7, ashwraith: 2.1 });
