// The lobby's LEVEL SELECT interactable (docs/gauntlet/PLAN.md §12.7 — the
// user's CRITICAL REFACTOR, owner CAMPAIGN): a small map table beside the
// run-portal. Walk within its ring and press E (or click the prompt) to open
// the Level Select; its parchment map shows one waymark per level, lit amber
// once that level is unlocked and a dim Bone ring while it is locked — the
// same unlock truth the Level Select lists.
//
// Render-only: the camp scene owns the collider / footprint / shadow numbers
// exported here and mounts the group; nothing in the sim knows the table.
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
} from 'three';
import { toonMaterial } from '../render/toon.js';
import { ENV } from '../env/colors.js';
import { PALETTE } from '../data/palette.js';
import { cap, onHintsChange } from '../app/controls.js';
import { t } from '../i18n/index.js';

// West of the gate road, between the west rune stone and the NW tent: clear of
// every camp collider (nearest: rune stone 1.6 u, lantern pole 1.9 u, tent 1.9 u).
export const MAP_TABLE = Object.freeze({ x: -3.6, z: -5.85, yaw: 0.55, radius: 1.25 });

const CSS = `
  #cg-table-prompt {
    position: fixed; left: 0; top: 0; transform: translate(-50%, -100%) scale(var(--cg-s, 1));
    transform-origin: bottom center; z-index: 13; display: none;
    align-items: center; gap: 12px; padding: 10px 18px; border-radius: 12px;
    background: ${PALETTE.voidCharcoal}F2; border: 2px solid ${PALETTE.hearthAmber}AA;
    box-shadow: 0 0 22px ${PALETTE.hearthAmber}33, inset 0 0 0 1px ${PALETTE.bone}22;
    font-family: system-ui, -apple-system, 'Segoe UI', var(--i18n-font, sans-serif); color: ${PALETTE.parchment};
    font-size: 19px; letter-spacing: 0.06em; user-select: none; cursor: pointer; pointer-events: auto;
  }
  #cg-table-prompt.cg-on { display: flex; }
  #cg-table-prompt .cg-key {
    display: inline-flex; align-items: center; justify-content: center; min-width: 30px; height: 30px;
    padding: 0 7px; border-radius: 7px; border: 2px solid ${PALETTE.warmGrey}; background: #2c2822;
    font-size: 20px; font-weight: 800; color: ${PALETTE.hearthAmber};
  }
  #cg-table-prompt b { color: ${PALETTE.hearthAmber}; font-weight: 700; }
`;

// The map sheet: parchment, a dotted route through three waymarks.
function paintMap(canvas, unlocked) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  g.fillStyle = '#E9DFC8';
  g.fillRect(0, 0, W, H);
  // Soft vignette at the paper edge (warm, never dark).
  const grd = g.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(120,92,58,0.35)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  const pts = [
    [W * 0.14, H * 0.74],
    [W * 0.38, H * 0.46],
    [W * 0.62, H * 0.26],
    [W * 0.86, H * 0.5],
  ];
  g.strokeStyle = '#6B5A45';
  g.lineWidth = 5;
  g.setLineDash([10, 10]);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
  g.setLineDash([]);
  pts.forEach(([x, y], i) => {
    const open = unlocked.includes(i + 1);
    g.beginPath();
    g.arc(x, y, 20, 0, Math.PI * 2);
    g.fillStyle = open ? PALETTE.hearthAmber : '#B9B0A0';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = open ? '#5A3F1C' : '#8A8174';
    g.stroke();
    g.fillStyle = open ? '#3A2A14' : '#6E665B';
    g.font = 'bold 22px serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(['I', 'II', 'III', 'IV'][i] ?? String(i + 1), x, y + 1);
  });
}

export function buildMapTable() {
  const group = new Group();
  group.name = 'cg-maptable';
  group.position.set(MAP_TABLE.x, 0, MAP_TABLE.z);
  group.rotation.y = MAP_TABLE.yaw;
  const wood = toonMaterial({ color: ENV.plank });
  const woodLit = toonMaterial({ color: ENV.plankLit });
  const legGeo = new CylinderGeometry(0.045, 0.055, 0.62, 8);
  for (const [lx, lz] of [
    [-0.42, -0.26],
    [0.42, -0.26],
    [-0.42, 0.26],
    [0.42, 0.26],
  ]) {
    const leg = new Mesh(legGeo, wood);
    leg.position.set(lx, 0.31, lz);
    group.add(leg);
  }
  const top = new Mesh(new BoxGeometry(1.02, 0.07, 0.66), woodLit);
  top.position.set(0, 0.645, 0);
  group.add(top);
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  let tex = null;
  let sheetMat = null;
  if (canvas) {
    canvas.width = 256;
    canvas.height = 160;
    paintMap(canvas, [1]);
    tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    sheetMat = new MeshBasicMaterial({ map: tex, toneMapped: true });
    const sheet = new Mesh(new PlaneGeometry(0.86, 0.54), sheetMat);
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set(0, 0.684, 0);
    group.add(sheet);
  }
  // Ground ring: the interaction disc (Hearth Amber = "you can act here",
  // under the bloom threshold like the portal's glyph).
  const ringMat = new MeshBasicMaterial({ color: PALETTE.hearthAmber, transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false });
  const ring = new Mesh(new RingGeometry(MAP_TABLE.radius - 0.12, MAP_TABLE.radius, 48), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(MAP_TABLE.x, 0.015, MAP_TABLE.z);
  ring.name = 'cg-maptable-ring';

  let lastKey = '1';
  function setUnlocked(list) {
    const key = [...list].sort().join(',');
    if (!canvas || key === lastKey) return;
    lastKey = key;
    paintMap(canvas, list);
    tex.needsUpdate = true;
  }
  function update(elapsedSec, inRange) {
    ringMat.opacity = (inRange ? 0.5 : 0.24) + 0.08 * Math.sin(elapsedSec * 2.2);
  }
  return {
    group,
    ring,
    setUnlocked,
    update,
    footprint: { x: MAP_TABLE.x, z: MAP_TABLE.z, r: 0.78 },
    collider: { id: 'maptable', x: MAP_TABLE.x, z: MAP_TABLE.z, hx: 0.52, hz: 0.34, yaw: MAP_TABLE.yaw },
    shadow: { x: MAP_TABLE.x, z: MAP_TABLE.z, rx: 0.7, rz: 0.48, yaw: MAP_TABLE.yaw, faint: false },
  };
}

// The table's DOM prompt ("E · Choose a level"), placed each frame over the
// projected table top by the camp scene. Clicking it opens the select too.
export function createTablePrompt(onClick) {
  if (typeof document === 'undefined') return null;
  const style = document.createElement('style');
  style.id = 'cg-table-style';
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.id = 'cg-table-prompt';
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', t('Choose a level (E)'));
  el.innerHTML = `<span class="cg-key">E</span><span><b>${t('Choose a level')}</b></span>`;
  // Controls slice: the cap follows the interact binding / the pad's A.
  const keyEl = el.querySelector('.cg-key');
  const paint = () => {
    keyEl.textContent = cap('interact');
  };
  paint();
  onHintsChange(paint);
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick('click');
  });
  document.body.appendChild(el);
  return el;
}

export const withinTable = (x, z) => {
  const dx = x - MAP_TABLE.x;
  const dz = z - MAP_TABLE.z;
  return dx * dx + dz * dz <= MAP_TABLE.radius * MAP_TABLE.radius;
};
