// THE CHEST BEAT (VFX_HIT_RULES O1 to O5, §2.14's safe route, §6.2 i): one
// opening for every reward chest, shared by the vault chest, the secret
// reliquary and cache (rigs here), and the champion chest
// (render/enemies/champions.js).
//
//   wobble   from when a hero comes near (CHEST_BEAT.nearFar): bouts of about
//            3.5 swings rocking onto one bottom edge then the other, each
//            swing a little quicker; the closer the hero, the quicker the
//            swings and the shorter the rest between bouts (it "fights to
//            open"). The champion chest wobbles from the champion's fall.
//   press    (a press chest's E) the wobble finishes its last half-swing,
//            then the chest squashes to 0.92 x 1.07 (90% of the depth in the
//            first 8 of 15 frames, then a creep) with a tremble, and snaps at
//            CHEST_BEAT.snap (0.5 s), inside the 1.2 s and 1.4 s reveals.
//   snap S   un-squash in a frame and hop about 8% of its width, tipping a
//            little and narrowing 1 to 2%; the lid is flung open (half open on
//            S, fully by S+3, never slammed); the padlock flips up off the
//            hasp. A 4-frame render hold at the top of the hop (S+4 to S+7)
//            holds the pose, the padlock, the light sheet and the stars; the
//            particles keep running. It lands on S+11.
//   light    S: a thin bright cream line round the rim for 1 frame. S+1 to
//            S+5: a flat cream sheet at rim height grows 1.2 to 1.55 chest
//            widths, holds through the freeze, breaks from its edges S+8 to
//            S+10, gone by S+11. The contents glow hot from S, and from S+4
//            four soft tapered rays fan up, changing fast for a second, then
//            turning slowly for two more.
//   stars    8 five-pointed stars burst up about 0.65 widths on S and hang in
//            an arc; from 0.87 s they pop one at a time in random order over
//            0.7 s (swell 2x and whiten over 3 to 4 frames, a hollow outline
//            for 1 to 2 frames, gone, a small scatter of sparks). Tiny sparks
//            blink and drift up from S.
//   padlock  tumbles down the front, hits the floor about S+31, settles by
//            S+35 and stays there.
// Warm cream and gold, no red. Times are render seconds (the reveal is the
// sim's; nothing here moves it). Sounds: audio/chestcues.js, on the same
// clock (CHEST_BEAT.snap after the press; at once on a champion chest).
//
// Render-only; randomness on the COSMETIC stream where given.
import { AdditiveBlending, BoxGeometry, CanvasTexture, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, Sprite, SpriteMaterial, TorusGeometry } from 'three';
import { makeGlowSprite } from '../glow.js';
import { sharedGeo } from '../geocache.js';
import { toonMaterial } from '../toon.js';
import { addInk } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { impactFx } from '../vfx/hub.js';

const F = 1 / 30; // one frame of the 30 fps captures (2 ticks)

export const CHEST_BEAT = Object.freeze({
  // O1: the wobble.
  nearFar: 4.5, // u: a hero this near starts it
  nearClose: 1.4, // u: fastest here (about the interact reach)
  periodSlow: 0.3, // s: a swing's period when the hero is far
  periodFast: 0.23, // ...and when close
  periodLast: 0.2, // the last swing of a bout
  swings: 3.5, // a bout
  restSlow: 0.9, // s between bouts, far
  restFast: 0.12, // ...close
  tilt: 0.04, // rad (about 2.3 degrees)
  // O2: the press.
  finish: 0.1, // s: the last half-swing after the press
  snap: 0.5, // s after the press
  squashX: 1.07,
  squashY: 0.92,
  tremble: 0.004, // u
  // O3: the snap.
  rise: 4 * F, // S to S+4: the hop rises
  hold: 4 * F, // S+4 to S+8: the render hold at the top
  land: 3 * F, // S+8 to S+11: it lands
  hop: 0.08, // of the chest's width
  narrow: 0.015,
  tip: 0.04, // rad
  lidHalf: 0.5, // the lid's opening on S
  lidOpen: 3 * F, // fully open by S+3
  lockLand: 31 * F, // the padlock hits the floor
  lockSettle: 4 * F,
  // O4: the light.
  rimLine: F,
  sheetIn: 4 * F, // S+1 to S+5
  sheetBreak: 8 * F, // breaks S+8 to S+10, gone S+11
  sheetGone: 11 * F,
  sheetFrom: 1.2,
  sheetTo: 1.55,
  sheetOpacity: 0.38,
  rays: 4,
  raysFrom: 4 * F,
  raysFast: 1.0, // s of fast change
  raysSlow: 2.2, // s of slow turning after it
  core: '#FFF589', // the contents' hot core
  // O5: the stars.
  stars: 8,
  starUp: 0.65, // widths
  starSize: [0.09, 0.16], // widths (drawn a little larger: Echoes' chests are small on screen)
  starDraw: 2.4, // the stars' draw scale against the measured widths
  starPop: 0.87, // s: the first pop
  starPops: 0.7, // s: over which the 8 pop
  popSwell: 3.5 * F,
  popOutline: 1.5 * F,
  sparksPerSec: 14,
  sparksSec: 2.6,
});
// The pop times after the snap (fixed, so the sound can match; which star
// pops at each is random).
export const STAR_POP_TIMES = Object.freeze(Array.from({ length: CHEST_BEAT.stars }, (_, i) => CHEST_BEAT.starPop + (i * CHEST_BEAT.starPops) / (CHEST_BEAT.stars - 1)));

const CREAM = '#FFF1C9';
const GOLD = PALETTE.paleGold;
const GOLD_HOT = '#F7E7C0';

// The beat's own clock after the snap with the 4-frame hold taken out.
export function heldClock(b) {
  const h0 = CHEST_BEAT.rise;
  const h1 = h0 + CHEST_BEAT.hold;
  return b < h0 ? b : b < h1 ? h0 : b - CHEST_BEAT.hold;
}

// The pose the beat puts on a chest (pure: the probe reads it).
//   s.mode 'idle' | 'press' | 'open'; s.t time in the mode; s.ph the
//   wobble's phase; returns { tilt, lift, sx, sy, hop, lid, tremble }.
export function chestPose(s, w) {
  const B = CHEST_BEAT;
  const out = { tilt: 0, lift: 0, sx: 1, sy: 1, hop: 0, lid: 0, tremble: 0 };
  if (s.mode === 'idle') {
    out.tilt = B.tilt * s.amp * Math.sin(s.ph);
  } else if (s.mode === 'press') {
    const t = s.t;
    // The last half-swing settles to rest.
    if (t < B.finish) out.tilt = B.tilt * s.amp0 * Math.sin(s.ph0) * (1 - t / B.finish);
    const sq = Math.max(0, t - B.finish) / (B.snap - B.finish);
    // 90% of the depth by 8/15 of the squash, then a creep.
    const d = sq < 8 / 15 ? 0.9 * (1 - (1 - sq / (8 / 15)) ** 2) : 0.9 + 0.1 * ((sq - 8 / 15) / (7 / 15));
    out.sx = 1 + (B.squashX - 1) * Math.min(1, d);
    out.sy = 1 - (1 - B.squashY) * Math.min(1, d);
    out.tremble = t > B.finish ? B.tremble : 0;
  } else {
    const b = s.t;
    const h = heldClock(b);
    // The hop: rises S..S+4 (ease out), holds, lands S+8..S+11.
    let hk;
    if (b < B.rise) hk = 1 - (1 - b / B.rise) ** 2;
    else if (b < B.rise + B.hold) hk = 1;
    else hk = Math.max(0, 1 - (b - B.rise - B.hold) / B.land) ** 2;
    out.hop = B.hop * w * hk;
    out.tilt = B.tip * hk;
    out.sx = 1 - B.narrow * hk;
    out.sy = 1 + B.narrow * hk;
    // The lid: half open on S, fully by S+3, a little past and back.
    out.lid = h >= B.lidOpen ? 1 + 0.06 * Math.max(0, 1 - (h - B.lidOpen) / (6 * F)) * Math.sin(Math.min(1, (h - B.lidOpen) / (6 * F)) * Math.PI) : B.lidHalf + (1 - B.lidHalf) * (1 - (1 - h / B.lidOpen) ** 2);
    if (s.restored) Object.assign(out, { hop: 0, tilt: 0, sx: 1, sy: 1, lid: 1 });
  }
  out.lift = (w / 2) * Math.abs(Math.sin(out.tilt));
  return out;
}

// The star textures: filled, and the hollow outline.
let starTex = null;
function starTextures() {
  if (starTex) return starTex;
  if (typeof document === 'undefined') return null;
  const make = (hollow) => {
    const S = 64;
    const cv = document.createElement('canvas');
    cv.width = S;
    cv.height = S;
    const c = cv.getContext('2d');
    if (!c) return null;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? S * 0.2 : S * 0.46;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = S / 2 + Math.cos(a) * r;
      const y = S / 2 + Math.sin(a) * r;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.closePath();
    c.lineJoin = 'round';
    if (hollow) {
      c.strokeStyle = '#fff';
      c.lineWidth = 4;
      c.stroke();
    } else {
      c.fillStyle = '#fff';
      c.fill();
    }
    return new CanvasTexture(cv);
  };
  const fill = make(false);
  const hollow = make(true);
  starTex = fill && hollow ? { fill, hollow } : null;
  return starTex;
}

// A padlock: a body and a shackle (gold over dark iron).
function buildPadlock(k) {
  const g = new Group();
  const bodyMat = toonMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 0.3 });
  const body = new Mesh(sharedGeo('cb-lock-body', () => new BoxGeometry(0.11, 0.1, 0.045)), bodyMat);
  addInk(body);
  g.add(body);
  const shackle = new Mesh(sharedGeo('cb-lock-shackle', () => new TorusGeometry(0.035, 0.011, 5, 10, Math.PI)), toonMaterial({ color: '#6E6A62' }));
  shackle.position.y = 0.05;
  g.add(shackle);
  g.scale.setScalar(k);
  return g;
}

const flatMat = (color, opacity) => new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity, toneMapped: false, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });

// The nearest living hero's distance to (x, z) from a list of bodies.
export function nearestHero(party, x, z) {
  let d = Infinity;
  for (const p of party ?? []) d = Math.min(d, Math.hypot(p.x - x, p.z - z));
  return d;
}

// Attach the beat to a chest.
//   group  the chest rig's root (its local frame: +z the front, y up)
//   body   the part that wobbles, squashes and hops (its origin on the floor)
//   spec   { w: width, d: depth, rim: rim height, hasp: {y, z} the lock's
//            place on the front, mode: 'press' | 'auto' }
//   fx     { spray(mode, x, y, z, n, opts) } in world space (the VFX hub)
// Returns { update(dt, near, wx, wz) -> pose, press(), open(), restore(),
//   state(), lidK } — the rig drives its own lid from pose.lid.
export function attachChestBeat(group, body, spec, fx = impactFx, cosmetic = null) {
  const B = CHEST_BEAT;
  const w = spec.w;
  let seed = (Math.round(w * 977 + spec.rim * 131) >>> 0) || 1;
  const rnd = (a, b) => {
    if (cosmetic) return cosmetic.range(a, b);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return a + (b - a) * (seed / 4294967296);
  };
  const st = { mode: 'idle', t: 0, ph: 0, amp: 0, bout: 0, rest: 0, amp0: 0, ph0: 0, restored: false };
  // The padlock on the hasp.
  const lock = buildPadlock(spec.lockScale ?? 1);
  group.add(lock);
  const lockSt = { x: 0, y: spec.hasp.y, z: spec.hasp.z + 0.03, vy: 0, vz: 0, rx: 0, landed: false };
  // The light layers (local to the group, at rim height).
  const fx0 = new Group();
  group.add(fx0);
  const rimMat = flatMat(CREAM, 0);
  const rim = new Mesh(sharedGeo(`cb-rim-${w}-${spec.d}`, () => new RingGeometry(0.5, 0.53, 4, 1).rotateZ(Math.PI / 4)), rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.scale.set(w * 1.41, spec.d * 1.41, 1);
  rim.position.y = spec.rim + 0.01;
  rim.renderOrder = 5;
  fx0.add(rim);
  const sheetMat = flatMat(CREAM, 0);
  const sheet = new Mesh(sharedGeo('cb-sheet', () => new PlaneGeometry(1, 1)), sheetMat);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.y = spec.rim + 0.02;
  sheet.renderOrder = 4;
  fx0.add(sheet);
  const edgeMat = flatMat(CREAM, 0);
  const edge = new Mesh(sharedGeo('cb-sheet-edge', () => new RingGeometry(0.47, 0.5, 4, 1).rotateZ(Math.PI / 4)), edgeMat);
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = spec.rim + 0.025;
  edge.renderOrder = 4;
  fx0.add(edge);
  const core = makeGlowSprite({ color: B.core, size: w * 1.1, opacity: 0 });
  core.material.toneMapped = false;
  core.position.y = spec.rim + 0.05;
  fx0.add(core);
  const rays = [];
  for (let i = 0; i < B.rays; i++) {
    const r = makeGlowSprite({ color: GOLD_HOT, size: 1, opacity: 0 });
    r.material.toneMapped = false;
    fx0.add(r);
    rays.push({ r, a: ((i - (B.rays - 1) / 2) / B.rays) * 1.3, sp: rnd(0.6, 1.2) * (i % 2 ? 1 : -1) });
  }
  const tex = starTextures();
  const stars = [];
  if (tex) {
    for (let i = 0; i < B.stars; i++) {
      const mat = new SpriteMaterial({ map: tex.fill, color: new Color(GOLD), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: AdditiveBlending });
      const sp = new Sprite(mat);
      sp.visible = false;
      fx0.add(sp);
      stars.push({ sp, mat, a: 0, size: 0, pop: 0, gone: false });
    }
  }
  let sparkOwe = 0;
  let wx = 0;
  let wz = 0;

  function place(pose) {
    body.rotation.z = pose.tilt;
    const tx = pose.tremble ? rnd(-pose.tremble, pose.tremble) : 0;
    body.position.set(tx, pose.lift + pose.hop, 0);
    body.scale.set(pose.sx, pose.sy, pose.sx);
  }
  function placeLock(pose, dt) {
    if (st.mode !== 'open') {
      // On the hasp, riding the body.
      const c = Math.cos(pose.tilt);
      const s = Math.sin(pose.tilt);
      const y = spec.hasp.y * pose.sy;
      lock.position.set(-y * s + body.position.x, y * c + body.position.y, (spec.hasp.z + 0.03) * pose.sx);
      lock.rotation.set(0, 0, pose.tilt);
      return;
    }
    if (st.restored) {
      lock.position.set(0.12 * w, 0.03, spec.hasp.z + 0.3);
      lock.rotation.set(-Math.PI / 2, 0, 0.4);
      return;
    }
    // Ballistic on the held clock: up off the hasp, down the front.
    const h = heldClock(st.t);
    const T = B.lockLand - B.hold;
    if (h < T) {
      const y0 = lockSt.y0;
      const vy = 1.6;
      const g = (2 * (y0 - 0.03 + vy * T)) / (T * T);
      lock.position.set(0.04 * w, y0 + vy * h - 0.5 * g * h * h, lockSt.z0 + 0.45 * h);
      lock.rotation.set(-9 * h, 0, 0.4 * h);
    } else {
      const k = Math.min(1, (h - T) / B.lockSettle);
      lock.position.set(0.04 * w, 0.03 + 0.04 * Math.sin(Math.PI * k), lockSt.z0 + 0.45 * T + 0.04 * k);
      const rx = -9 * T;
      const flat = -Math.PI / 2 - 2 * Math.PI * Math.round((-rx - Math.PI / 2) / (2 * Math.PI));
      lock.rotation.set(rx + (flat - rx) * k, 0, 0.4 * T);
      if (!lockSt.landed && fx) {
        lockSt.landed = true;
        const p = group.localToWorld(lock.position.clone());
        fx.spray('smoke', p.x, 0.05, p.z, 2, { color: PALETTE.parchment, speed: [0.1, 0.3], up: [0.05, 0.15], size: [0.12, 0.18], grow: 1.4, life: [0.35, 0.5], opacity: 0.25, drag: 2.2 });
      }
    }
  }
  function lights() {
    const open = st.mode === 'open';
    const b = open ? st.t : -1;
    const h = open ? heldClock(b) : -1;
    rimMat.opacity = open && !st.restored && b < B.rimLine ? 1 : 0;
    // The sheet: grows S+1..S+5 (ease out), holds through the freeze, breaks
    // from its edges S+8..S+10, gone S+11 (on the held clock for the hold).
    let so = 0;
    let ss = B.sheetFrom;
    let eo = 0;
    if (open && !st.restored && b >= F && b < B.sheetGone) {
      const g = Math.min(1, (h - F) / B.sheetIn);
      ss = B.sheetFrom + (B.sheetTo - B.sheetFrom) * (1 - (1 - g) ** 2);
      const brk = b >= B.sheetBreak ? Math.min(1, (b - B.sheetBreak) / (B.sheetGone - B.sheetBreak)) : 0;
      so = B.sheetOpacity * (1 - brk);
      eo = Math.min(1, B.sheetOpacity * 2) * (1 - Math.min(1, brk * 1.6));
    }
    sheetMat.opacity = so;
    edgeMat.opacity = eo;
    sheet.scale.set(w * ss, spec.d * ss, 1);
    edge.scale.set(w * ss * 1.41, spec.d * ss * 1.41, 1);
    // The contents glow hot from S.
    core.material.opacity = open ? (st.restored ? 0.35 : Math.max(0.35, 1 - b / 1.5)) : 0;
    // The rays: from S+4, fast for a second, then slow turning.
    const rt = b - B.raysFrom;
    const rk = open && !st.restored && rt > 0 ? Math.min(1, rt / 0.15) * (rt < B.raysFast + B.raysSlow ? 1 : Math.max(0, 1 - (rt - B.raysFast - B.raysSlow) / 0.8)) : 0;
    for (const r of rays) {
      const spin = rt < B.raysFast ? r.sp * 2.4 * Math.max(0, rt) : r.sp * (2.4 * B.raysFast + 0.35 * (rt - B.raysFast));
      const shimmer = 0.85 + 0.15 * Math.sin(rt * (rt < B.raysFast ? 31 : 7) + r.sp * 9);
      const ang = r.a + 0.25 * Math.sin(spin);
      const len = 0.45 * w * 1.6;
      r.r.material.opacity = 0.55 * rk * shimmer;
      r.r.material.rotation = -ang;
      r.r.scale.set(0.06 * w * 1.6, len, 1);
      r.r.position.set(Math.sin(ang) * len * 0.5, spec.rim + 0.08 + Math.cos(ang) * len * 0.5, 0);
    }
  }
  function starFrame(dt) {
    if (!stars.length) return;
    const open = st.mode === 'open' && !st.restored;
    const b = st.t;
    const h = heldClock(b);
    for (const s of stars) {
      if (!open || s.gone) {
        s.sp.visible = false;
        continue;
      }
      // Up on S with an ease out into an arc, then hanging.
      const u = Math.min(1, h / 0.3);
      const e = 1 - (1 - u) ** 3;
      const up = B.starUp * w * e;
      s.sp.position.set(Math.sin(s.a) * w * 0.55 * e, spec.rim + 0.1 + up * (0.75 + 0.25 * Math.cos(s.a)) + 0.02 * Math.sin(b * 3 + s.a * 5), 0.05);
      let size = s.size * B.starDraw * w;
      let col = GOLD;
      let map = tex.fill;
      let op = 0.95;
      const p = b - s.pop;
      if (p >= 0) {
        if (p < B.popSwell) {
          const k = p / B.popSwell;
          size *= 1 + k;
          col = k > 0.5 ? '#FFFFFF' : CREAM;
        } else if (p < B.popSwell + B.popOutline) {
          size *= 2;
          map = tex.hollow;
          col = '#FFFFFF';
        } else {
          s.gone = true;
          s.sp.visible = false;
          if (fx) {
            const q = group.localToWorld(s.sp.position.clone());
            fx.spray('spark', q.x, q.y, q.z, 5, { color: GOLD_HOT, speed: [0.3, 0.9], up: [-0.2, 0.6], size: [0.025, 0.045], life: [0.18, 0.32], gravity: 0.6, drag: 1.4, jitter: 0.05 });
          }
          continue;
        }
      }
      if (s.mat.map !== map) {
        s.mat.map = map;
        s.mat.needsUpdate = true;
      }
      s.mat.color.set(col);
      s.mat.opacity = op;
      s.sp.scale.set(size, size, 1);
      s.sp.visible = true;
    }
    // Tiny sparks blink and drift up from the release.
    if (fx && b < B.sparksSec) {
      sparkOwe += B.sparksPerSec * dt;
      const n = Math.floor(sparkOwe);
      if (n > 0) {
        sparkOwe -= n;
        fx.spray('spark', wx, spec.rim + 0.2, wz, n, { color: CREAM, speed: [0.02, 0.15], up: [0.3, 0.8], size: [0.02, 0.04], life: [0.05, 0.1], gravity: -0.2, drag: 1, jitter: w * 0.45 });
      }
    }
  }

  function startOpen() {
    st.mode = 'open';
    st.t = 0;
    st.restored = false;
    lockSt.y0 = spec.hasp.y;
    lockSt.z0 = spec.hasp.z + 0.03;
    lockSt.landed = false;
    // Which star pops at each pop time: random order.
    const order = stars.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd(0, i + 0.999));
      [order[i], order[j]] = [order[j], order[i]];
    }
    stars.forEach((s, i) => {
      s.a = ((i - (stars.length - 1) / 2) / stars.length) * 2.6 + rnd(-0.08, 0.08);
      s.size = rnd(B.starSize[0], B.starSize[1]);
      s.pop = STAR_POP_TIMES[order[i]];
      s.gone = false;
      s.mat.map = tex.fill;
      s.mat.needsUpdate = true;
    });
  }

  return {
    // dt seconds; near: the nearest hero's distance (Infinity for none); the
    // chest's world spot (for the sparks).
    update(dt, near = Infinity, x = 0, z = 0) {
      wx = x;
      wz = z;
      st.t += dt;
      if (st.mode === 'idle') {
        const k = near >= B.nearFar ? 0 : Math.min(1, (B.nearFar - near) / (B.nearFar - B.nearClose));
        const on = near < B.nearFar || st.forced;
        const kk = st.forced ? Math.max(k, st.forced) : k;
        if (on) {
          if (st.rest > 0) {
            st.rest -= dt;
            st.amp = Math.max(0, st.amp - dt * 6);
          } else {
            st.amp = Math.min(1, st.amp + dt * 8);
            const swing = st.bout >= B.swings - 1 ? B.periodLast : B.periodSlow + (B.periodFast - B.periodSlow) * Math.min(1, kk + st.bout * 0.12);
            const before = Math.floor(st.ph / Math.PI);
            st.ph += ((2 * Math.PI) / swing) * dt;
            const after = Math.floor(st.ph / Math.PI);
            if (after !== before) {
              st.bout += 0.5;
              if (st.bout >= B.swings) {
                st.bout = 0;
                st.ph = 0;
                st.rest = B.restSlow + (B.restFast - B.restSlow) * kk;
              }
            }
          }
        } else st.amp = Math.max(0, st.amp - dt * 4);
      } else if (st.mode === 'press' && st.t >= B.snap) startOpen();
      const pose = chestPose(st, w);
      place(pose);
      placeLock(pose, dt);
      lights();
      starFrame(dt);
      return pose;
    },
    // The press (a press chest): the wobble finishes, the squash, the snap.
    press() {
      if (st.mode !== 'idle') return;
      st.amp0 = st.amp;
      st.ph0 = st.ph;
      st.mode = 'press';
      st.t = 0;
    },
    // The champion chest: it snaps at once.
    open() {
      if (st.mode === 'open') return;
      startOpen();
    },
    // A chest already open (a restored save, a joining guest).
    restore() {
      st.mode = 'open';
      st.t = 99;
      st.restored = true;
    },
    // The champion chest wobbles from the fall to the clear at this nearness.
    force(k) {
      st.forced = k;
    },
    state: () => ({ mode: st.mode, t: st.t, restored: st.restored, landed: lockSt.landed, stars: stars.filter((q) => q.sp.visible).length }),
  };
}
