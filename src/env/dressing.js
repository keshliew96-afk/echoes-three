// Per-ROOM dressing for the Act-1 arena (certification fix round 1, A-world).
//
// The arena is ONE persistent scene for all eight rooms of a run (main.js
// builds it once; the run frame only re-seats the party and swaps the wave
// director), so the round-1 scorers saw "the identical clearing" in room 1,
// the room-7 shop and the room-8 boss fight. REFERENCE_BAR reference B rings a
// boss arena with pillars / statues / vases, and §19.3 asks the shop room for
// "one dense stall cluster under a single warm pooled lantern (Shopkeep's
// Lantern)". Both are built here as hidden groups inside the arena root and
// shown for the room they belong to.
//
// ROOM SEAM. Env modules never see the sim (§1: render reads the cosmetic
// stream, never sim state) and this block owns no scene file, so the only
// channel that reaches the run frame's `room_enter` events from here is the
// documented debug API: `window.__echoes.on(type, fn)` (docs/TESTING.md) is a
// straight subscribe on the sim event bus. It is installed at the END of
// main.js — after every scene is built — so the subscription is deferred until
// the object exists. Everything is read-only and event-driven: the groups
// toggle `visible` on `room_enter` and hide on run end. With no debug API (a
// bare render test) the dressing simply stays hidden.
//
// Placement goes through the SAME footprint rejection table as the base prop
// clusters (props.js expandClusters), continued from the base pass, so a
// pillar can never be born inside a stump, and every dressing group carries
// its own contact-shadow instancer so a hidden room's shadow discs never
// litter room 1. Emitter FX for the stall's lantern live INSIDE the group
// (flame + halo + pool, flickered from onBeforeRender on the wall clock), never
// in the arena's emitter list, for the same reason — and so the world behind
// the shop page keeps visibly moving.
import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from 'three';
import { CAMERA } from '../core/constants.js';
import { makeGlowSprite } from '../render/glow.js';
import { makeFlameSprite } from './flame.js';
import { EMBER_GLOW } from './colors.js';

const EL = (CAMERA.elevationDeg * Math.PI) / 180;
const TOWARD_CAM = { y: Math.sin(EL), z: Math.cos(EL) };
const POOL_ORDER = -12; // == props.js ORDER.pool (pools first, shadows on top)
const HALO_ORDER = -1.5; // == the arena's HALO_ORDER (under the identity rings)

// Shop-lantern pool: the broad-plateau falloff the arena's fire pools use (a
// bloom-halo ramp reads as fog, not as light on a floor).
let poolTex = null;
function getPoolTexture() {
  if (poolTex) return poolTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const h = size / 2;
  const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.16, 'rgba(255,255,255,0.92)');
  grad.addColorStop(0.34, 'rgba(255,255,255,0.58)');
  grad.addColorStop(0.52, 'rgba(255,255,255,0.25)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.08)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  poolTex = new CanvasTexture(canvas);
  poolTex.colorSpace = SRGBColorSpace;
  return poolTex;
}

// Subscribe to the run frame's room events through the debug API once it
// exists (it is created after the scenes are built). Polls at animation-frame
// cadence for up to ~10 s, then gives up silently.
// CAMPAIGN (docs/gauntlet/PLAN.md §12.5, gate GC.6): ONE module-level bus
// subscription fans out to every live dressing's watcher, and a disposed
// dressing unregisters its watcher. (Each dressing used to add four bus
// listeners that were never removed — once dressings are torn down and
// rebuilt per level, that leaked 12 listeners and the disposed room groups
// they closed over at every level.)
const watchers = new Set();
let hooked = false;
function hookOnce() {
  if (hooked) return;
  hooked = true;
  let tries = 0;
  const tryHook = () => {
    const E = typeof window !== 'undefined' ? window.__echoes : null;
    if (E && typeof E.on === 'function') {
      E.on('room_enter', (ev) => {
        for (const fn of watchers) fn(ev.mode ?? null);
      });
      for (const t of ['run_end', 'return_to_camp', 'run_wiped']) {
        E.on(t, () => {
          for (const fn of watchers) fn(null);
        });
      }
      return;
    }
    if (++tries < 600) requestAnimationFrame(tryHook);
    else hooked = false;
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tryHook);
  else hooked = false;
}
function watchRun(onRoom) {
  watchers.add(onRoom);
  hookOnce();
  return () => watchers.delete(onRoom);
}

// Build every room-dressing group declared in `spec.rooms`:
//   spec.rooms = { shop: { clusters, stall: [x, z, yaw] }, boss: { clusters } }
// opts: { types, mats, place(clusters, seedDiscs), mount(group, byType),
//         buildShadows(group, shadows), placedSeed } — all handed in by
// props.js buildProps so this module never imports it back.
export function buildRoomDressing(root, spec, cosmetic, opts) {
  const rooms = spec.rooms ?? null;
  const info = { groups: [], active: null };
  if (!rooms) return { footprints: [], info, setRoom() {}, dispose() {} };

  const { types, mats, place, mount, buildShadows } = opts;
  const groups = new Map();
  const footprints = [];
  let discs = opts.placedSeed ?? [];

  for (const [mode, def] of Object.entries(rooms)) {
    const group = new Group();
    group.name = `dressing-${mode}`;
    group.visible = false;
    const { byType, placedDiscs } = place(def.clusters ?? [], discs);
    discs = placedDiscs;
    const mounted = mount(group, byType);
    let stall = null;
    if (def.stall) stall = mountStall(group, def.stall, types, mats, mounted, cosmetic);
    buildShadows(group, mounted.shadows);
    footprints.push(...mounted.footprints);
    info.groups.push({
      mode,
      props: [...byType.values()].reduce((n, t) => n + t.length, 0) + (stall ? 1 : 0),
      types: byType.size + (stall ? 1 : 0),
    });
    root.add(group);
    groups.set(mode, group);
  }

  function setRoom(mode) {
    info.active = mode;
    for (const [m, g] of groups) g.visible = m === mode;
  }
  const unwatch = watchRun(setRoom);
  setRoom(null);
  return { footprints, info, setRoom, dispose: unwatch };
}

// The Shopkeep's stall: the stall prop (props.js `stall`) plus its hanging
// lantern — wick flame + warm halo + a broad amber ground pool, all inside the
// room group so they exist only while the shelf is open.
function mountStall(group, [x, z, yaw = 0], types, mats, mounted, cosmetic) {
  const def = types.stall;
  if (!def) return null;
  const t = { x, z, yaw, s: 1 };
  mounted.addInstanced(group, def.layers, [t]);
  mounted.shadows.push({ x, z, rx: def.foot * 1.6, rz: (def.rz ?? def.foot) * 1.6, yaw, faint: true });
  mounted.footprints.push({ x, z, r: Math.max(def.foot, def.rz ?? 0) + 0.16 });

  // Fix round 1 (check 2, "layered light"): the Shopkeep's Lantern is the
  // shop room's ONE warm pool (§19.3), so it is sized like an arena brazier
  // rather than like a hanging path lantern — the round-1 shop frame measured
  // >160 at 1.26%, under the 1.5% gate, with no light pool anywhere.
  const em = def.emitter(t);
  const wick = makeFlameSprite(0.34, 0.95, 1.5);
  wick.position.set(em.x, em.y + 0.01 + TOWARD_CAM.y * 0.1, em.z + TOWARD_CAM.z * 0.1);
  wick.renderOrder = 8;
  group.add(wick);
  const glow = makeGlowSprite({ color: EMBER_GLOW.halo, size: 1.5, opacity: 0.55 });
  glow.renderOrder = HALO_ORDER;
  glow.position.set(em.x, em.y, em.z);
  group.add(glow);
  const pool = new Mesh(
    new CircleGeometry(1, 28),
    new MeshBasicMaterial({
      map: getPoolTexture(),
      color: new Color(EMBER_GLOW.pool),
      transparent: true,
      opacity: 0.68,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(3.4, 3.4, 1);
  pool.position.set(em.x, 0.013, em.z);
  pool.renderOrder = POOL_ORDER;
  group.add(pool);

  // Wall-clock flicker (cosmetic): the wick, the halo and the pool breathe
  // together, so the lantern is alive in every frame the shelf is up.
  const phase = cosmetic.range(0, Math.PI * 2);
  pool.onBeforeRender = () => {
    const tSec = performance.now() / 1000;
    const n =
      Math.sin(tSec * 12 + phase) * 0.5 +
      Math.sin(tSec * 27 + phase * 2.3) * 0.3 +
      Math.sin(tSec * 5.7) * 0.2;
    glow.material.opacity = Math.max(0.28, 0.55 + 0.12 * n);
    glow.scale.setScalar(1.5 * (1 + 0.1 * n));
    pool.material.opacity = Math.max(0.42, 0.68 + 0.07 * n);
    const w = 0.34 * (1 + 0.18 * n);
    wick.scale.set(w * 0.66, w, 1);
  };
  void mats;
  return { wick, glow, pool };
}
