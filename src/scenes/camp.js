// Camp hub + run bookends (BUILD_BRIEF §2 "the camp hub scene bookends runs",
// §18 "Camp hub", §19.1 camp colour story, REFERENCE_BAR reference A).
//
// WHAT THIS SCENE IS
// ------------------
// The game BOOTS here. A 3/4 top-down night camp: deep indigo-teal ambient with
// ONE Hearth-Fire that every other element composes toward, the four party
// critters idling around it, >=12 distinct prop types at 3-5x combat density,
// fireflies, a vignette, a contact shadow under everything, and a marked
// run-portal at the north gate. Walk the Healer onto the gate's sill, press E,
// and room 1 starts behind a <=300 ms fade. When the run ends — victory or
// defeat — the world comes straight back here with the run state wiped and the
// next run's seed already drawn.
//
// HOW IT COEXISTS WITH THE COMBAT ARENA
// -------------------------------------
// `createCampScene` WRAPS `createArenaScene` the same way the arena wraps the
// graybox: one scene object is handed to main.js, and it owns a MODE.
//
//   mode 'camp' — the camp dressing is visible, the camp drives its own party
//                 rigs and its own follow camera; the arena's roots are hidden
//                 and its update loop is not called at all (so a hidden arena
//                 costs one visibility test per frame, not a frame's work).
//   mode 'run'  — the arena's roots are shown and `arena.update()` runs exactly
//                 as it does today; the camp's roots are hidden.
//
// The two modes own DIFFERENT rig instances on purpose. The ally render layer
// (src/render/allies/index.js) adopts `scene.allies` and drives those bodies
// from sim state every frame — during a run they must be the ARENA's critters,
// which is why this scene re-exports the arena's `allies` array untouched. The
// camp's own four rigs are camp-only furniture, driven here, hidden the moment
// a run starts. Nothing about the combat path changes.
//
// FRESH SEED PER RUN (§2 "all run state is wiped at run end"). The gameplay
// stream is REBUILT at each Begin Run from a draw off the previous stream, so:
//   - every run of a session rolls its own run frame, waves and drafts;
//   - `?seed=123` stays deterministic end to end, because the sequence of run
//     seeds is itself a function of the boot seed;
//   - a scripted `__echoes.cmd('startRun')` (the run block's own probes) does
//     NOT reseed — only walking through the gate does.
//
// Render-only discipline: this module reads sim state and the event bus and
// never mutates sim state except through the same `cmd`/run entry points a
// player press drives.
import { Color, Group, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import { ARENA, CAMERA, TICK_HZ } from '../core/constants.js';
import { PALETTE } from '../data/palette.js';
import { createArenaScene } from './arena.js';
import { createCritter, setInkViewport } from '../render/critters/index.js';
import { setPropInkViewport, buildShadowInstances, ORDER } from '../env/props.js';
import { buildProps } from '../env/props.js';
import { buildApronMesh } from '../env/ground.js';
import { buildTreeline } from '../env/treeline.js';
import { buildWalls } from '../env/walls.js';
import { buildFoliage } from '../env/foliage.js';
import { variantLayoutRng } from '../env/layout.js';
import { installBandGuard, bandGuardInfo } from '../env/bandguard.js';
import { COOL, mix } from '../env/colors.js';
import { CAMP_SPEC, CAMP_SPOTS, HEARTH, PORTAL } from '../env/camp/spec.js';
import { buildCampGround } from '../env/camp/ground.js';
import { buildCampProps, RUNE_VIOLET } from '../env/camp/props.js';
import { createCampEmitters, createCampFireflies } from '../env/camp/hearth.js';
import { createFollowRig } from '../render/camera.js';
import { createBookends } from '../ui/bookends/index.js';

// §18: "deep indigo/teal ambient". Two numbers carry the whole night read —
// the key drops to a cold moon (a twelfth of the Act-1 sun) and the hemisphere
// fill goes indigo. Everything warm in frame then HAS to come from the fire,
// which is exactly what "one Hearth-Fire as the single warm light source" means
// as a lighting rig rather than as prose.
const CAMP_LIGHT = Object.freeze({
  // Solved against the ACES curve, not eyeballed (same method as the arena's
  // rig in scenes/arena.js): key 1.0 / fill 2.1 lands unlit night ground near
  // display luma 55-75 — dark enough to read as night, bright enough that the
  // frame's dark half still carries TEXTURE. At the first cut (0.62 / 1.15) the
  // outer camp measured 6-7 of 16 luminance buckets and 32-52% flat 8x8 blocks:
  // the murk failure REFERENCE_BAR check 1 exists to catch.
  keyIntensity: 1.15,
  fillIntensity: 2.5,
  // Cold moonlight, blue-white: the ONLY thing it may do is separate a prop's
  // top face from its side. All colour temperature in the camp is the hearth's.
  // Indigo-TEAL (§18), not indigo-violet: every one of these hues sits at
  // 196-212 so the unlit camp lands in the analyzer's cool band and never in
  // the h245-285 violet band the palette reserves for corruption.
  keyColor: new Color('#8FB4C8').lerp(new Color('#FFFFFF'), 0.2),
  skyColor: new Color('#5C7E9C'),
  groundColor: new Color('#0F1A20'),
});

// §18 camp vignette: the night frame needs more corner falloff than the
// combat rig's 0.16 — the reference camp is a pool of firelight in a dark wood.
const CAMP_VIGNETTE = 0.26;

// ACES input gain while the camp is on screen (stage.js ships 1.04 for Act 1).
// A night frame lit by ONE fire has almost all of its information in the lower
// half of the histogram, and at the combat exposure the camp measured 0.8% of
// the frame over luma 160 against the docs/TESTING.md floor of 1.5%. Exposure
// is the honest lever for that — it lifts the whole curve without inventing a
// second light source, and ACES rolls the fire's highlights off instead of
// clipping them. Restored to the combat value the moment a run starts.
const CAMP_EXPOSURE = 1.24;

// Begin Run timing (§16 "enter/exit <= 300 ms fades", criterion: room 1 starts
// within 300 ms of the fade).
const FADE = Object.freeze({ inMs: 150, startAtMs: 180, outMs: 240 });

const YAW_RATE = 10; // 1/s — same smoothing the arena gives the Healer
const MOVE_EPS = 0.3; // u/s of sim speed above which the walk clip drives
const CAST_PHASE = 0.45;
const CAST_HOLD = 0.4;

// Camera focus clamp: same idea as the arena's — the camp is 24x16 u and the
// rig looks ~9 u past the far edge, so an unclamped wall-hug would put a third
// of the screen outside the dressing.
const CAM_OFF_Z = CAMERA.distance * Math.cos((CAMERA.elevationDeg * Math.PI) / 180);
const CAM_CLAMP = { x: 6.4, zMin: -4.2, zMax: 4.6 };
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const CAMP_CSS = `
  #camp-fade {
    position: fixed; inset: 0; z-index: 26; pointer-events: none;
    background: ${PALETTE.voidCharcoal};
    opacity: 0; transition: opacity ${FADE.inMs}ms linear;
  }
  #camp-fade.cp-on { opacity: 1; }
  #camp-prompt {
    position: fixed; left: 50%; bottom: 21%; transform: translateX(-50%) scale(var(--cp-s, 1));
    transform-origin: bottom center;
    z-index: 13; pointer-events: none; display: none;
    align-items: center; gap: 12px;
    padding: 10px 20px; border-radius: 12px;
    background: ${PALETTE.voidCharcoal}F2;
    border: 2px solid ${PALETTE.hearthAmber}AA;
    box-shadow: 0 0 22px ${PALETTE.hearthAmber}33, inset 0 0 0 1px ${PALETTE.bone}22;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: ${PALETTE.parchment};
    font-size: 19px; letter-spacing: 0.06em;
    user-select: none;
  }
  #camp-prompt.cp-on { display: flex; }
  #camp-prompt .cp-key {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 30px; height: 30px; padding: 0 7px;
    border-radius: 7px; border: 2px solid ${PALETTE.warmGrey};
    background: #2c2822;
    font-size: 20px; font-weight: 800; color: ${PALETTE.hearthAmber};
    font-variant-numeric: tabular-nums;
  }
  #camp-prompt .cp-lab b { color: ${PALETTE.hearthAmber}; font-weight: 700; }
`;

export function createCampScene(stage, toggles, ctx) {
  const { cosmetic, world, bus, rng } = ctx;

  // ------------------------------------------------------------- arena --
  // Built FIRST so its own light tune lands before the camp's, and so its
  // three party critters exist for the ally render layer to adopt.
  const arena = createArenaScene(stage, toggles, ctx);
  const arenaRoots = [arena.root];
  const grayboxRoot = stage.scene.getObjectByName('graybox');
  if (grayboxRoot) arenaRoots.push(grayboxRoot);
  // The game boots in CAMP, so the arena starts hidden. (setMode short-circuits
  // on an unchanged mode, so this cannot be left to it.)
  for (const r of arenaRoots) r.visible = false;

  // Snapshot the arena's light rig so switching modes restores it exactly.
  let keyLight = null;
  let fillLight = null;
  for (const obj of stage.scene.children) {
    if (obj.isDirectionalLight && !keyLight) keyLight = obj;
    else if (obj.isHemisphereLight && !fillLight) fillLight = obj;
  }
  const runLight = {
    key: keyLight ? { color: keyLight.color.clone(), intensity: keyLight.intensity } : null,
    fill: fillLight
      ? {
          color: fillLight.color.clone(),
          ground: fillLight.groundColor.clone(),
          intensity: fillLight.intensity,
        }
      : null,
  };
  const vignetteUniform = stage.gradePass?.uniforms?.uVignette ?? null;
  const runVignette = vignetteUniform ? vignetteUniform.value : 0;
  const runExposure = stage.renderer.toneMappingExposure;

  // -------------------------------------------------------------- camp --
  const root = new Group();
  root.name = 'camp';
  stage.scene.add(root);

  // Camp dressing is drawn from the LAYOUT stream (a constant of the layout,
  // see env/layout.js), never the cosmetic one: the camp must measure the same
  // on every load or a quality gate becomes a lucky draw.
  const layout = variantLayoutRng(9, 7);

  const ground = buildCampGround(CAMP_SPEC, layout);
  root.add(ground.mesh);
  root.add(buildApronMesh(CAMP_SPEC, layout));
  const treeline = buildTreeline(root, CAMP_SPEC, layout);

  // Camp furniture first (its footprints mask the grass), then the reused
  // Act-1 perimeter set, then the boundary, then the foliage.
  const camp = buildCampProps(root, CAMP_SPEC);
  const edge = buildProps(root, CAMP_SPEC, layout);
  const shadows = camp.shadows.concat(edge.shadows);
  buildShadowInstances(root, shadows);
  const footprints = camp.footprints.concat(edge.footprints, ground.footprints);
  const foliage = buildFoliage(root, CAMP_SPEC, layout, footprints);
  const wallInfo = buildWalls(root, CAMP_SPEC, layout);

  const emitters = camp.emitters.concat(edge.emitters);
  const fx = createCampEmitters(root, emitters, cosmetic);
  const flies = createCampFireflies(root, cosmetic, 150);

  // --- The gate marker (§18 "the glowing run-portal / GATE MARKER"). A thin
  // arcane ring on the sill: the interaction disc drawn where it actually is,
  // so "walk here" is a fact on the ground rather than a guess. It brightens
  // when the Healer is inside it — the affordance, before the DOM prompt.
  // Under the 0.68 linear bloom threshold on every channel: the marker is a
  // GLYPH on the ground (§17 Zone 3 grammar), not an emitter, and a ring that
  // blooms reads as a second light source at the north wall.
  const markerMat = new MeshBasicMaterial({
    color: new Color().setRGB(RUNE_VIOLET[0] * 0.3, RUNE_VIOLET[1] * 0.3, RUNE_VIOLET[2] * 0.34),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    toneMapped: false,
  });
  const marker = new Mesh(new RingGeometry(PORTAL.radius - 0.16, PORTAL.radius, 56), markerMat);
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(PORTAL.x, 0.016, PORTAL.z + 0.55);
  marker.renderOrder = ORDER.shadow + 1;
  root.add(marker);

  // --- Party rigs. Camp-only instances (see the header note): the arena keeps
  // its own, and the ally render layer keeps adopting THOSE.
  const healerRig = createCritter('healer', { cosmetic });
  root.add(healerRig.group);
  const allyRigs = [
    { classId: 'tank', partyIndex: 1, rig: createCritter('tank', { cosmetic }), yaw: CAMP_SPOTS.tank.yaw },
    {
      classId: 'swordsman',
      partyIndex: 2,
      rig: createCritter('swordsman', { cosmetic }),
      yaw: CAMP_SPOTS.swordsman.yaw,
    },
    {
      classId: 'archer',
      partyIndex: 3,
      rig: createCritter('archer', { cosmetic }),
      yaw: CAMP_SPOTS.archer.yaw,
    },
  ];
  for (const a of allyRigs) {
    a.rig.group.position.set(CAMP_SPOTS[a.classId].x, 0, CAMP_SPOTS[a.classId].z);
    a.rig.setYaw(a.yaw);
    a.rig.setAnim('idle');
    root.add(a.rig.group);
  }
  healerRig.setAnim('idle');

  // §19.1 reserved-band guard: Ember Danger belongs to enemy threats alone, and
  // a warm hearth multiplied into timber/canvas albedo is exactly the product
  // that rotates into h5-25. Installed over the whole stage (idempotent — the
  // arena's install already covered its own materials).
  const bandGuard = installBandGuard(stage.scene);

  // ---------------------------------------------------------------- DOM --
  const style = document.createElement('style');
  style.id = 'camp-style';
  style.textContent = CAMP_CSS;
  document.head.appendChild(style);

  const fade = document.createElement('div');
  fade.id = 'camp-fade';
  document.body.appendChild(fade);

  const prompt = document.createElement('div');
  prompt.id = 'camp-prompt';
  prompt.innerHTML =
    '<span class="cp-key">E</span><span class="cp-lab"><b>Begin Run</b> &nbsp;·&nbsp; the wood is waiting</span>';
  document.body.appendChild(prompt);
  const fitPrompt = () => {
    const s = Math.min(1, Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * 1.35);
    prompt.style.setProperty('--cp-s', s.toFixed(3));
  };
  fitPrompt();
  window.addEventListener('resize', fitPrompt);

  // §18 run bookends: the warm high-key Victory wash and the soft violet-white
  // theatrical Defeat wash live in their own module (src/ui/bookends).
  const bookends = createBookends({ bus, world });

  // ------------------------------------------------------------- state --
  let mode = 'camp';
  let healerYaw = Math.PI;
  let castLeft = 0;
  let firedFlag = false;
  let lastElapsed = null;
  const followRig = createFollowRig(stage.camera);
  let begin = null; // { pressedAt, started, startedAt }
  let lastBegin = null; // probe record of the most recent Begin Run
  let runs = 0;
  let inRange = false;

  bus.on('basic_fire', () => {
    firedFlag = true;
  });

  function applyCampLighting() {
    if (keyLight) {
      keyLight.color.copy(CAMP_LIGHT.keyColor);
      keyLight.intensity = CAMP_LIGHT.keyIntensity;
    }
    if (fillLight) {
      fillLight.color.copy(CAMP_LIGHT.skyColor);
      fillLight.groundColor.copy(CAMP_LIGHT.groundColor);
      fillLight.intensity = CAMP_LIGHT.fillIntensity;
    }
    // ?vignette=0 must stay off — only scenes decide the STRENGTH, never
    // whether the toggle exists.
    if (vignetteUniform && runVignette > 0) vignetteUniform.value = CAMP_VIGNETTE;
    stage.renderer.toneMappingExposure = CAMP_EXPOSURE;
    stage.scene.background = new Color('#0A0D16');
  }

  function applyRunLighting() {
    if (keyLight && runLight.key) {
      keyLight.color.copy(runLight.key.color);
      keyLight.intensity = runLight.key.intensity;
    }
    if (fillLight && runLight.fill) {
      fillLight.color.copy(runLight.fill.color);
      fillLight.groundColor.copy(runLight.fill.ground);
      fillLight.intensity = runLight.fill.intensity;
    }
    if (vignetteUniform && runVignette > 0) vignetteUniform.value = runVignette;
    stage.renderer.toneMappingExposure = runExposure;
    stage.scene.background = new Color(PALETTE.voidCharcoal);
  }

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    const inCamp = next === 'camp';
    root.visible = inCamp;
    for (const r of arenaRoots) r.visible = !inCamp;
    if (inCamp) applyCampLighting();
    else applyRunLighting();
  }

  // Park the whole party on its camp spots and snap the camera onto the fire.
  function seatParty() {
    world.cmd('teleport', CAMP_SPOTS.healer.x, CAMP_SPOTS.healer.z);
    healerYaw = CAMP_SPOTS.healer.yaw;
    healerRig.setYaw(healerYaw);
    healerRig.group.position.set(CAMP_SPOTS.healer.x, 0, CAMP_SPOTS.healer.z);
    healerRig.setAnim('idle');
    for (const a of allyRigs) {
      const spot = CAMP_SPOTS[a.classId];
      world.cmd('placeAlly', a.partyIndex, spot.x, spot.z);
      a.rig.group.position.set(spot.x, 0, spot.z);
      a.rig.setYaw(spot.yaw);
      a.rig.setAnim('idle');
    }
    // Snap (not slide) the follow rig: a huge dt drives the exponential to 1.
    followRig.update(5, CAMP_SPOTS.healer.x, CAMP_SPOTS.healer.z, null);
  }

  applyCampLighting();
  seatParty();

  // The run ending is what brings the world home (§2: "run end (victory or
  // defeat screen) returns to Camp"). The end PAGE is still up at this point —
  // the environment behind it is the camp, which is what makes the §18 Victory
  // wash "the only screen where the environment matches party warmth" a fact
  // about the world and not just about a div.
  bus.on('run_end', () => {
    runs += 1;
    setMode('camp');
    seatParty();
  });
  bus.on('return_to_camp', () => {
    setMode('camp');
    seatParty();
  });

  // ------------------------------------------------------- Begin Run --
  function withinPortal() {
    const p = world.player;
    const dx = p.x - PORTAL.x;
    const dz = p.z - (PORTAL.z + 0.55);
    return dx * dx + dz * dz <= PORTAL.radius * PORTAL.radius;
  }

  function canBegin() {
    if (mode !== 'camp' || begin) return false;
    const run = world.runSystem();
    if (run.isActive()) return false;
    const phase = run.view().phase;
    return phase === 'idle';
  }

  function beginRun() {
    if (!canBegin() || !withinPortal()) return false;
    begin = { pressedAt: performance.now(), started: false };
    fade.classList.add('cp-on');
    prompt.classList.remove('cp-on');
    return true;
  }

  function startPending() {
    // §1/§2: a run gets its OWN seeded stream. Drawn off the previous stream so
    // `?seed=` keeps the whole session deterministic.
    let seed = null;
    if (rng && typeof rng.reseed === 'function') {
      seed = rng.reseed(Math.floor(rng.float() * 0x100000000) >>> 0);
    }
    setMode('run');
    world.runSystem().startRun();
    begin.started = true;
    begin.startedAt = performance.now();
    lastBegin = {
      seed,
      pressedAt: Math.round(begin.pressedAt),
      startedAt: Math.round(begin.startedAt),
      deltaMs: Math.round(begin.startedAt - begin.pressedAt),
    };
    fade.classList.remove('cp-on');
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyE' || e.repeat) return;
    if (mode !== 'camp') return;
    beginRun();
  });

  // ------------------------------------------------------------ update --
  function update(elapsedSec, alpha = 1) {
    const dt =
      lastElapsed === null ? 1 / 60 : Math.min(0.1, Math.max(0, elapsedSec - lastElapsed));
    lastElapsed = elapsedSec;

    // The pending Begin Run runs on wall time (it is a UI transition, not sim).
    if (begin && !begin.started && performance.now() - begin.pressedAt >= FADE.startAtMs) {
      startPending();
    }
    if (begin && begin.started && performance.now() - begin.startedAt >= FADE.outMs) {
      begin = null;
    }

    bookends.update();

    if (mode === 'run') {
      arena.update(elapsedSec, alpha);
      if (prompt.classList.contains('cp-on')) prompt.classList.remove('cp-on');
      return;
    }

    setInkViewport(window.innerWidth, window.innerHeight);
    setPropInkViewport(window.innerWidth, window.innerHeight);

    const p = world.player;
    const ix = p.px + (p.x - p.px) * alpha;
    const iz = p.pz + (p.z - p.pz) * alpha;
    healerRig.group.position.set(ix, 0, iz);

    // §3/A1: yaw turns smoothly toward aim, shortest arc.
    let tx = p.lastAimDir?.x ?? 0;
    let tz = p.lastAimDir?.z ?? 1;
    if (p.aim) {
      const adx = p.aim.x - ix;
      const adz = p.aim.z - iz;
      const al = Math.hypot(adx, adz);
      if (al > 1e-3) {
        tx = adx / al;
        tz = adz / al;
      }
    }
    let dy = Math.atan2(tx, tz) - healerYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    healerYaw += dy * (1 - Math.exp(-YAW_RATE * dt));
    healerRig.setYaw(healerYaw);

    const simSpeed = Math.hypot(p.x - p.px, p.z - p.pz) * TICK_HZ;
    const moving = simSpeed > MOVE_EPS;
    if (firedFlag) {
      firedFlag = false;
      castLeft = CAST_HOLD;
      healerRig.setAnim('cast', CAST_PHASE);
    }
    castLeft = Math.max(0, castLeft - dt);
    if (castLeft > 0) healerRig.setAnim('cast');
    else healerRig.setAnim(moving ? 'walk' : 'idle');
    healerRig.update(dt);

    // Allies: sim bodies drive them (the ally AI keeps them within the §12
    // leash of the player, so the party follows you around its own camp), and
    // they idle on the spot when nobody is walking anywhere.
    for (const a of allyRigs) {
      const e = world.entities().find((x) => x.kind === 'ally' && x.partyIndex === a.partyIndex);
      if (e) {
        const ax = e.px + (e.x - e.px) * alpha;
        const az = e.pz + (e.z - e.pz) * alpha;
        a.rig.group.position.set(ax, 0, az);
        const sp = Math.hypot(e.x - e.px, e.z - e.pz) * TICK_HZ;
        if (sp > MOVE_EPS) {
          const want = Math.atan2(e.x - e.px, e.z - e.pz);
          let d = want - a.yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          a.yaw += d * (1 - Math.exp(-YAW_RATE * dt));
          a.rig.setYaw(a.yaw);
          a.rig.setAnim('walk');
        } else {
          // Standing still: turn slowly back toward the fire. The camp's
          // composition is "everything faces the hearth", characters included.
          const want = Math.atan2(HEARTH.x - e.x, HEARTH.z - e.z);
          let d = want - a.yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          a.yaw += d * (1 - Math.exp(-2.2 * dt));
          a.rig.setYaw(a.yaw);
          a.rig.setAnim('idle');
        }
      }
      a.rig.update(dt);
    }

    fx.update(elapsedSec);
    flies.update(elapsedSec);

    // Gate marker: brighter and a touch larger while the Healer stands in it.
    const now = withinPortal();
    if (now !== inRange) {
      inRange = now;
      prompt.classList.toggle('cp-on', inRange && canBegin());
    } else if (inRange && !begin && !prompt.classList.contains('cp-on') && canBegin()) {
      prompt.classList.add('cp-on');
    } else if (!canBegin() && prompt.classList.contains('cp-on')) {
      prompt.classList.remove('cp-on');
    }
    const pulse = 0.5 + 0.5 * Math.sin(elapsedSec * 2.2);
    markerMat.opacity = (inRange ? 0.72 : 0.4) + pulse * 0.18;
    marker.scale.setScalar(inRange ? 1.04 : 1.0);

    // §22 camera: smoothed follow + aim lookahead, then the camp focus clamp.
    followRig.update(dt, ix, iz, p.aim);
    const fxp = stage.camera.position.x;
    const fzp = stage.camera.position.z - CAM_OFF_Z;
    const cxp = clamp(fxp, -CAM_CLAMP.x, CAM_CLAMP.x);
    const czp = clamp(fzp, CAM_CLAMP.zMin, CAM_CLAMP.zMax);
    if (cxp !== fxp || czp !== fzp) {
      stage.camera.position.x = cxp;
      stage.camera.position.z = czp + CAM_OFF_Z;
      stage.camera.lookAt(cxp, 0, czp);
    }

    bandGuard.rescan();
  }

  function debugState() {
    const p = world.player;
    return {
      mode,
      runs,
      lastBegin,
      inPortal: withinPortal(),
      promptVisible: prompt.classList.contains('cp-on'),
      fading: fade.classList.contains('cp-on'),
      portal: { x: PORTAL.x, z: PORTAL.z, radius: PORTAL.radius },
      hearth: { x: HEARTH.x, z: HEARTH.z },
      player: { x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100 },
      // Criterion 1/2 probes: distinct prop types, contact shadows, emitters.
      propTypes: camp.typeCount + edge.typeCount,
      campPropTypes: camp.names,
      propShadows: shadows.length,
      emitters: emitters.length,
      emitterKinds: emitters.map((e) => e.kind),
      lights: fx.counts.lights,
      embers: fx.counts.embers,
      gateMotes: fx.counts.gateMotes,
      fireflies: flies.count,
      mote0: flies.sample().map((v) => Math.round(v * 1000) / 1000),
      grass: foliage.grassCount,
      flowers: foliage.flowerCount,
      treeline,
      wall: wallInfo,
      bandGuard: bandGuardInfo(),
      vignette: vignetteUniform ? Math.round(vignetteUniform.value * 100) / 100 : null,
      exposure: Math.round(stage.renderer.toneMappingExposure * 100) / 100,
      keyIntensity: keyLight ? Math.round(keyLight.intensity * 100) / 100 : null,
      fillIntensity: fillLight ? Math.round(fillLight.intensity * 100) / 100 : null,
      bookends: bookends.debug(),
      party: {
        healerAnim: healerRig.getAnim(),
        healerYaw: Math.round(healerYaw * 100) / 100,
        rigs: [
          { classId: 'healer', x: r2(healerRig.group.position.x), z: r2(healerRig.group.position.z) },
          ...allyRigs.map((a) => ({
            classId: a.classId,
            anim: a.rig.getAnim(),
            x: r2(a.rig.group.position.x),
            z: r2(a.rig.group.position.z),
          })),
        ],
      },
      // The arena's own probe surface stays reachable while a run is live.
      arena: mode === 'run' && arena.debugState ? arena.debugState() : null,
    };
  }

  const r2 = (v) => Math.round(v * 100) / 100;

  // Camp commands for the capture harness (docs/TESTING.md): everything a
  // player press does, drivable from a script.
  function cmd(name, args = []) {
    switch (name) {
      case 'campBegin':
        return beginRun();
      case 'campState':
        return debugState();
      case 'campSeat':
        seatParty();
        return true;
      case 'campMode':
        if (args[0] === 'camp' || args[0] === 'run') setMode(args[0]);
        return mode;
      default:
        return undefined;
    }
  }

  return {
    name: 'camp',
    root,
    update,
    debugState,
    cmd,
    // The ally render layer adopts THESE — the arena's critters, the bodies
    // that fight. See the header note.
    allies: arena.allies,
    isCamp: () => mode === 'camp',
  };
}
