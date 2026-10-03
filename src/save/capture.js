// Complete-state capture / apply (docs/gauntlet/PLAN.md §3.4). Owner: M2.
// Pure module (no DOM): the in-page save service, the Node round-trip probe
// (tools/gntM2-nodetrip.mjs) and — in W4 — the network snapshot/keyframe
// path all build their StateTree here.
//
// StateTree v3 (schema 3 — CAMPAIGN; v1/v2 trees load through codec.js
// MIGRATIONS[1] / [2]; systems.run carries the campaign) = {
//   v: 3,
//   clock:    { tick, hitstopRemaining, grants[] }            core/clock.js
//   rng:      { seed, s, draws }                              the LIVE gameplay stream (main.js handle)
//   registry: { nextOrdinal, entities[] }                     ascending id, plain entity objects
//   world:    { tick, stats, maintainPopulation, harness }    sim/world.js own state
//   systems:  { combat, skills, build, enemies, waves, allies, boss, run, layout,
//               movement (module colliders), shapes (module bolt-owner counter) }
//   scene:    { mode: 'camp'|'run'|null, layout: { act, layoutId, biome }|null }
//   app:      { playtimeTicks, runKillBase, ... }             the save service's own trackers
// }
//
// CAPTURE POINT (§3.4 rule 6): capture() and apply() run only at a tick
// boundary — inside a clock.onTickEnd callback or between frames. The world
// throws a named CapturePointError when its closure queues are not empty.
//
// APPLY ORDER: validate -> rollback snapshot -> scene (static colliders and
// the camp seat hold for the saved mode, dressing for the saved layout; never
// seatParty) -> clock -> rng -> registry (in place, ascending rebuild) ->
// world + every system -> module state (bolt owners, movement colliders
// last: the saved dynamic list is exact at the tick end) -> app trackers.
// A failure after the rollback snapshot re-applies it, so a bad tree can
// never leave the live world half-loaded.
//
// CONTENT (fix-M2-r6, SAVE6-F1): before anything touches the live world the
// private clone is reconciled against this build's skills and nodes
// (content.js — a strict no-op on a tree whose ids are all known), and after
// the apply the read paths every frame and menu takes (world.snapshotState:
// run view, skill slots, build view; the party view of all four characters)
// are run once. A tree that still cannot be read is rolled back like any
// failed apply ({ ok: false, error: 'content', rolledBack: true }) — a save
// can never leave the game with a sim that throws on every frame.
import { serializeMovement, restoreMovement } from '../sim/movement.js';
import { serializeShapes, restoreShapes } from '../sim/shapes.js';
import { clonePlain, checkTree } from './codec.js';
import { reconcileContent } from './content.js';

// Must equal codec.js TREE_VERSION (schema 2, M4c: 4 skill slots, 8 sockets
// per skill; schema 3, CAMPAIGN: systems.run.campaign + autoReturnTick).
// PARTY (schema 4): systems.party (the three ally builds) + run.partyPages.
export const STATE_VERSION = 4;

export function createStateIO({ clock, rng, registry, world, scene = null, appState = null, verify = null }) {
  // The live read paths a loaded world must survive (see CONTENT above).
  // Read-only: the build views create all-empty socket rows lazily, which
  // build.saveState() omits, so a check never changes a state hash.
  function verifyLive() {
    if (typeof verify === 'function') return verify();
    if (typeof world.snapshotState === 'function') world.snapshotState();
    const P = typeof world.partySystem === 'function' ? world.partySystem() : null;
    if (P && typeof P.state === 'function') P.state();
    return true;
  }

  function sceneState() {
    let mode = null;
    try {
      if (scene && typeof scene.isCamp === 'function') mode = scene.isCamp() ? 'camp' : 'run';
    } catch {
      mode = null;
    }
    const run = world.runSystem ? world.runSystem() : null;
    const l = run && typeof run.layout === 'function' ? run.layout() : null;
    return { mode, layout: l ? { act: l.act ?? null, layoutId: l.layoutId ?? null, biome: l.biome ?? null } : null };
  }

  // capture() -> StateTree (a private deep copy — safe to keep, hash, encode).
  function capture() {
    const ws = world.saveState();
    return clonePlain({
      v: STATE_VERSION,
      clock: clock.serialize(),
      rng: rng.getState(),
      registry: registry.serialize(),
      world: ws.world,
      systems: { ...ws.systems, movement: serializeMovement(), shapes: serializeShapes() },
      scene: sceneState(),
      app: appState ? appState.save() : {},
    });
  }

  function restoreSceneFor(tree) {
    if (!scene || typeof scene.cmd !== 'function' || !tree.scene) return null;
    try {
      return scene.cmd('restoreScene', [{ mode: tree.scene.mode, layout: tree.scene.layout }]) ?? null;
    } catch (err) {
      console.warn('[save] restoreScene failed (dressing only — the sim state is unaffected)', err);
      return null;
    }
  }

  function applyRaw(tree) {
    restoreSceneFor(tree);
    clock.restore(tree.clock);
    rng.setState(tree.rng);
    registry.restore(tree.registry);
    world.loadState({ world: tree.world, systems: tree.systems });
    restoreShapes(tree.systems.shapes);
    restoreMovement(tree.systems.movement);
    if (appState) appState.load(tree.app ?? {});
  }

  // apply(tree, { reconcile = true }) ->
  //   { ok: true, repair: <content.js report> | null }
  //   { ok: false, error: 'corrupt'|'busy'|'content', detail, rolledBack? }
  // The caller's tree is never aliased into live state (it is cloned first).
  // `reconcile: false` is for probes only (it proves the read check alone
  // catches a tree the reconcile would have repaired).
  function apply(treeIn, { reconcile = true } = {}) {
    const bad = checkTree(treeIn);
    if (bad) return { ok: false, error: 'corrupt', detail: bad };
    let tree;
    try {
      tree = clonePlain(treeIn);
    } catch (err) {
      return { ok: false, error: 'corrupt', detail: String(err && err.message) };
    }
    let repair = null;
    if (reconcile) {
      try {
        const r = reconcileContent(tree);
        repair = r && r.changed ? r : null;
      } catch (err) {
        return { ok: false, error: 'corrupt', detail: `content check failed (${String(err && err.message).slice(0, 120)})` };
      }
    }
    let rollback = null;
    try {
      rollback = capture();
    } catch (err) {
      return { ok: false, error: 'busy', detail: String(err && err.message) };
    }
    const undo = (why, err) => {
      console.warn(`[save] ${why} — rolling back to the pre-load state`, err);
      try {
        applyRaw(rollback);
      } catch (err2) {
        console.error('[save] rollback failed', err2);
      }
    };
    try {
      applyRaw(tree);
    } catch (err) {
      undo('apply failed', err);
      return { ok: false, error: 'corrupt', detail: String(err && err.message), rolledBack: true };
    }
    try {
      verifyLive();
    } catch (err) {
      undo('the loaded state cannot be read by this build', err);
      return { ok: false, error: 'content', detail: `this version of Echoes can't run that save (${String(err && err.message).slice(0, 120)})`, rolledBack: true };
    }
    return { ok: true, repair };
  }

  return { capture, apply, sceneState, verify: verifyLive };
}
