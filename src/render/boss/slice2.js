// Content slice 2 boss rigs (docs/CONTENT_PLAN.md §2.4): the second boss of
// each act. Same grammar and interface as render/boss/stag.js / heron.js /
// wyrm.js — { group, mats, setYaw, setFlash, pose } — faces +Z, world-unit
// sizes, ink on the big masses, a contact shadow, and the violet God-stuff
// corruption as the one boss tell (bosses carry violet, enemies indigo).
//
//   thornmother  a broad, low sow with a hump of bramble spikes along the
//                spine; violet buds in the brambles that swell through a
//                Seed Volley, the head drops and the hind legs dig in for a
//                Briar Charge.
//   millwheel    a standing oak wheel with iron rim plates and six spokes,
//                on a squat axle housing; it ROLLS (spin from `e.spin`), the
//                spoke hub burns violet through Cog Shards and it wobbles
//                while dizzy.
//   lichram      a bone-pale ram skeleton: rib cage, a long skull and huge
//                curled horns that read as the guard; violet grave-light in
//                the eye sockets and the ribs, the horns sink through a Bone
//                Rush and it sags while stuck.
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { toonMaterial } from '../toon.js';
import { addInk, groundShadow } from '../critters/common.js';
import { PALETTE } from '../../data/palette.js';
import { makeGlowSprite } from '../glow.js';
import { HIDE, TELL_VIOLET } from '../enemies/style.js';

const flashable = (c) => toonMaterial({ color: c, emissive: '#FFFFFF', emissiveIntensity: 0 });
const inkMat = () => new MeshBasicMaterial({ color: new Color(PALETTE.voidCharcoal), toneMapped: false });
function glow(size, opacity) {
  const g = makeGlowSprite({ color: '#9B7BF0', size, opacity });
  g.material.toneMapped = false;
  return g;
}
function rigShell(name) {
  const group = new Group();
  group.name = name;
  const yaw = new Group();
  group.add(yaw);
  const rig = new Group();
  yaw.add(rig);
  const mats = [];
  const track = (m) => (mats.push(m), m);
  return { group, yaw, rig, mats, track };
}
const iface = (s, pose) => ({
  group: s.group,
  mats: s.mats,
  setYaw: (r) => {
    s.yaw.rotation.y = r;
  },
  setFlash(k) {
    const v = k < 0 ? 0 : k > 1 ? 1 : k;
    for (const m of s.mats) m.emissiveIntensity = v;
  },
  pose,
});

// ----------------------------------------------------------- THORNMOTHER --
const SOW = HIDE.boarBody.clone().lerp(new Color(PALETTE.warmGrey), 0.15).multiplyScalar(0.8);
const SOW_DARK = HIDE.boarDark.clone().multiplyScalar(0.85);
const BRIAR = HIDE.quillDark.clone().lerp(new Color(PALETTE.sageCloak), 0.35).multiplyScalar(0.8);

export function buildThornmother() {
  const s = rigShell('boss-thornmother');
  const { rig, track } = s;
  const hide = track(flashable(SOW));
  const dark = track(flashable(SOW_DARK));
  const briar = track(flashable(BRIAR));
  const body = new Mesh(new IcosahedronGeometry(0.9, 1), hide);
  body.scale.set(1.05, 0.72, 1.45);
  body.position.set(0, 0.85, -0.1);
  addInk(body);
  rig.add(body);
  const head = new Group();
  head.position.set(0, 0.8, 1.2);
  rig.add(head);
  const skull = new Mesh(new IcosahedronGeometry(0.42, 1), hide);
  skull.scale.set(1, 0.85, 1.15);
  addInk(skull);
  head.add(skull);
  const snout = new Mesh(new CylinderGeometry(0.2, 0.26, 0.3, 7), dark);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.08, 0.45);
  head.add(snout);
  for (const side of [-1, 1]) {
    const tusk = new Mesh(new ConeGeometry(0.06, 0.34, 4), track(flashable(HIDE.bone)));
    tusk.position.set(side * 0.2, -0.12, 0.42);
    tusk.rotation.set(-0.9, 0, side * -0.5);
    head.add(tusk);
    const eye = new Mesh(new BoxGeometry(0.12, 0.03, 0.03), inkMat());
    eye.position.set(side * 0.2, 0.12, 0.32);
    eye.rotation.z = side * 0.35;
    head.add(eye);
  }
  // Bramble hump: angular spikes along the spine with violet buds.
  const buds = [];
  const spikeG = new ConeGeometry(0.11, 0.62, 4);
  const budG = new SphereGeometry(0.09, 6, 4);
  const budMat = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });
  for (let i = 0; i < 11; i++) {
    const a = (i / 10) * Math.PI - Math.PI / 2;
    const z = -0.95 + (i % 6) * 0.36;
    const x = Math.sin(a * 3 + i) * 0.45;
    const sp = new Mesh(spikeG, briar);
    sp.position.set(x, 1.32 + 0.1 * Math.cos(i), z);
    sp.rotation.set(-0.3 + 0.12 * (i % 3), 0, -x * 0.9);
    rig.add(sp);
    if (i % 2 === 0) {
      const b = new Mesh(budG, budMat);
      b.position.set(x * 1.1, 1.55, z + 0.05);
      rig.add(b);
      buds.push(b);
    }
  }
  const humpGlow = glow(2.4, 0.18);
  humpGlow.position.set(0, 1.5, -0.2);
  rig.add(humpGlow);
  const legs = [];
  const legG = new CylinderGeometry(0.13, 0.1, 0.6, 6);
  for (const [x, z] of [[-0.5, 0.65], [0.5, 0.65], [-0.5, -0.8], [0.5, -0.8]]) {
    const leg = new Mesh(legG, dark);
    leg.position.set(x, 0.3, z);
    rig.add(leg);
    legs.push(leg);
  }
  s.group.add(groundShadow(1.25, 0.42, { deep: 1.5 }));
  let lastT = null;
  let skidK = 0;
  return iface(s, ({ t, walkPhase, moveK, telegraphK = 0, lungeK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const chargeK = attack === 'charge' ? telegraphK : 0;
    skidK += ((e && e.mode === 'skid' ? 1 : 0) - skidK) * (1 - Math.exp(-10 * dt));
    for (let i = 0; i < legs.length; i++) legs[i].rotation.x = Math.sin(walkPhase * 2 + (i % 2) * Math.PI) * 0.4 * Math.max(moveK, lungeK);
    // Charge wind-up: head drops, hind legs dig; the charge itself leans in.
    head.rotation.x = 0.35 * chargeK + 0.25 * lungeK + 0.04 * Math.sin(t * 1.7);
    head.position.y = 0.8 - 0.15 * chargeK;
    rig.rotation.x = 0.12 * chargeK + 0.08 * lungeK - 0.1 * skidK;
    body.scale.y = 0.72 * (1 + 0.03 * Math.sin(t * 2));
    const fever = 0.55 + 0.2 * Math.sin(t * 2.4) + (1 - hpFrac) * 0.3;
    for (let i = 0; i < buds.length; i++) buds[i].scale.setScalar(1 + 0.25 * Math.sin(t * 3 + i) * fever);
    humpGlow.material.opacity = Math.min(0.45, 0.16 * fever + 0.2 * chargeK);
  });
}

// ------------------------------------------------------------- MILLWHEEL --
const OAK = HIDE.boarDark.clone().lerp(new Color(PALETTE.bruiseUmber), 0.4).multiplyScalar(1.1);
const IRON = HIDE.ramDark.clone().lerp(new Color(PALETTE.warmGrey), 0.2).multiplyScalar(0.8);

export function buildMillwheel() {
  const s = rigShell('boss-millwheel');
  const { rig, track } = s;
  const oak = track(flashable(OAK));
  const iron = track(flashable(IRON));
  // The wheel stands on its edge, its axle along X; it rolls about X.
  const wheel = new Group();
  wheel.position.y = 1.15;
  rig.add(wheel);
  const tyre = new Mesh(new TorusGeometry(1.0, 0.16, 6, 18), oak);
  tyre.rotation.y = Math.PI / 2;
  addInk(tyre);
  wheel.add(tyre);
  const plateG = new BoxGeometry(0.42, 0.14, 0.34);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new Mesh(plateG, iron);
    p.position.set(0, Math.cos(a) * 1.12, Math.sin(a) * 1.12);
    p.rotation.x = -a;
    wheel.add(p);
  }
  const spokeG = new BoxGeometry(0.12, 1.9, 0.12);
  for (let i = 0; i < 3; i++) {
    const sp = new Mesh(spokeG, oak);
    sp.rotation.x = (i / 3) * Math.PI;
    wheel.add(sp);
  }
  const hub = new Mesh(new CylinderGeometry(0.24, 0.24, 0.4, 8), iron);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  const hubLight = new Mesh(new SphereGeometry(0.14, 8, 6), new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false }));
  hubLight.position.x = 0.22;
  wheel.add(hubLight);
  const hubGlow = glow(1.2, 0.3);
  hubGlow.position.set(0.3, 0, 0);
  wheel.add(hubGlow);
  // Paddle boards on the outside of the rim (the mill read).
  const paddleG = new BoxGeometry(0.5, 0.06, 0.22);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    const p = new Mesh(paddleG, oak);
    p.position.set(0, Math.cos(a) * 1.3, Math.sin(a) * 1.3);
    p.rotation.x = -a;
    wheel.add(p);
  }
  s.group.add(groundShadow(1.0, 0.44, { wide: 0.6, deep: 1.3 }));
  let lastT = null;
  let dizzyK = 0;
  return iface(s, ({ t, telegraphK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    // Roll: the sim accumulates distance travelled; angle = distance / r.
    if (e && Number.isFinite(e.spin)) wheel.rotation.x = e.spin / 1.15;
    dizzyK += ((e && e.mode === 'dizzy' ? 1 : 0) - dizzyK) * (1 - Math.exp(-8 * dt));
    rig.rotation.z = Math.sin(t * 9) * 0.16 * dizzyK + (attack === 'crosscut' ? Math.sin(t * 30) * 0.03 * telegraphK : 0);
    const shardK = attack === 'shards' ? telegraphK : 0;
    const fever = 0.5 + 0.2 * Math.sin(t * 2.6) + (1 - hpFrac) * 0.3;
    hubLight.scale.setScalar(1 + 0.8 * shardK + 0.1 * Math.sin(t * 4));
    hubGlow.material.opacity = Math.min(0.75, 0.22 * fever + 0.5 * shardK);
  });
}

// --------------------------------------------------------------- LICHRAM --
const BONE = new Color(PALETTE.bone).multiplyScalar(0.82);
const BONE_DARK = new Color(PALETTE.bone).lerp(new Color(PALETTE.bruiseUmber), 0.45).multiplyScalar(0.75);

export function buildLichram() {
  const s = rigShell('boss-lichram');
  const { rig, track } = s;
  const bone = track(flashable(BONE));
  const boneDark = track(flashable(BONE_DARK));
  const violet = new MeshBasicMaterial({ color: TELL_VIOLET, toneMapped: false });
  // Spine + rib cage.
  const spine = new Mesh(new CylinderGeometry(0.09, 0.09, 1.9, 6), boneDark);
  spine.rotation.x = Math.PI / 2;
  spine.position.set(0, 1.25, -0.2);
  rig.add(spine);
  const ribG = new TorusGeometry(0.42, 0.05, 4, 10, Math.PI * 1.3);
  for (let i = 0; i < 6; i++) {
    const r = new Mesh(ribG, bone);
    r.position.set(0, 1.0, 0.45 - i * 0.24);
    r.rotation.set(0, 0, Math.PI * 1.15);
    r.scale.setScalar(1 - Math.abs(i - 2) * 0.08);
    rig.add(r);
  }
  const heart = new Mesh(new IcosahedronGeometry(0.16, 0), violet);
  heart.position.set(0, 1.0, 0.1);
  rig.add(heart);
  const heartGlow = glow(1.3, 0.3);
  heartGlow.position.copy(heart.position);
  rig.add(heartGlow);
  const pelvis = new Mesh(new BoxGeometry(0.6, 0.3, 0.35), bone);
  pelvis.position.set(0, 1.15, -1.1);
  addInk(pelvis);
  rig.add(pelvis);
  // Head: long skull, sockets, the curled horns (the guard).
  const head = new Group();
  head.position.set(0, 1.35, 0.95);
  rig.add(head);
  const skull = new Mesh(new BoxGeometry(0.42, 0.42, 0.75), bone);
  skull.position.z = 0.15;
  addInk(skull);
  head.add(skull);
  const eyes = [];
  for (const side of [-1, 1]) {
    const sock = new Mesh(new SphereGeometry(0.07, 6, 4), violet);
    sock.position.set(side * 0.16, 0.06, 0.32);
    head.add(sock);
    const g = glow(0.45, 0.5);
    g.position.copy(sock.position);
    head.add(g);
    eyes.push(g);
    const horn = new Mesh(new TorusGeometry(0.34, 0.11, 6, 12, Math.PI * 1.6), boneDark);
    horn.position.set(side * 0.33, 0.1, 0.1);
    horn.rotation.set(0, Math.PI / 2, side > 0 ? 0.4 : Math.PI - 0.4);
    addInk(horn);
    head.add(horn);
  }
  // Legs: four thin bone shafts.
  const legs = [];
  const legG = new CylinderGeometry(0.07, 0.05, 1.0, 5);
  for (const [x, z] of [[-0.32, 0.55], [0.32, 0.55], [-0.32, -1.0], [0.32, -1.0]]) {
    const leg = new Mesh(legG, bone);
    leg.position.set(x, 0.5, z);
    rig.add(leg);
    legs.push(leg);
  }
  s.group.add(groundShadow(1.0, 0.4, { deep: 1.6 }));
  let lastT = null;
  let stuckK = 0;
  return iface(s, ({ t, walkPhase, moveK, telegraphK = 0, lungeK = 0, hpFrac = 1, e = null }) => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT));
    lastT = t;
    const attack = e && e.telegraph ? e.telegraph.attack : null;
    const rushK = attack === 'rush' ? telegraphK : 0;
    stuckK += ((e && e.mode === 'stuck' ? 1 : 0) - stuckK) * (1 - Math.exp(-10 * dt));
    for (let i = 0; i < legs.length; i++) legs[i].rotation.x = Math.sin(walkPhase * 2 + (i % 2) * Math.PI) * 0.35 * Math.max(moveK, lungeK);
    // Rush wind-up: horns down; stuck: the head buried, the body sags.
    head.rotation.x = 0.4 * rushK + 0.3 * lungeK + 0.65 * stuckK + 0.03 * Math.sin(t * 1.5);
    head.position.y = 1.35 - 0.45 * stuckK;
    rig.position.y = -0.12 * stuckK;
    const enraged = !!(e && e.enraged);
    const fever = 0.55 + 0.2 * Math.sin(t * 2.1) + (1 - hpFrac) * 0.3 + (enraged ? 0.3 : 0);
    for (const g of eyes) g.material.opacity = Math.min(0.95, 0.6 * fever);
    heart.scale.setScalar(1 + 0.15 * Math.sin(t * 3.2) * fever);
    heartGlow.material.opacity = Math.min(0.6, 0.22 * fever);
  });
}
