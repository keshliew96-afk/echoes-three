// THE SECRET ROOM (docs/SECRET_ROOMS.md): the cracked wall, opening it, the
// hidden chamber, its piles and pages, its step each tick and its chest. A
// part of the run system (sim/run.js): the run's state is `rs`, its other
// functions `RF`.
import { SECRET_BODY, SECRET_RULES, chamberContent, chamberEvent, chamberPage, wallPref } from '../secrets.js';
import { encounterSpec, refreshBlockers } from '../interactables.js';
import { r2 } from './rules.js';
import { blockerClearance } from '../movement.js';
import { SPAWN_POINTS } from '../waves.js';
import { levelFor } from '../../data/levels.js';
import { ENCOUNTERS, EVENT_RULES } from '../encounters.js';
import { TICK_HZ } from '../../core/constants.js';
import { chestTonic } from '../consumables.js';

export function createSecretRoom(ctx) {
  const { rs, RF, allyOn, encCtx, encounters, events, getTick, party, player, registry, relics, secrets, tonics } = ctx;

  // ---------------------------------------------------- secret rooms --
  // SECRET ROOMS (docs/SECRET_ROOMS.md). The cracked wall stands flush with
  // the room's edge at its hashed spot (the first clear one after it). Broken
  // open in the fight, it leads to phase 'secret' once the room's reward and
  // relic pick are done: the hidden chamber stands in the same clearing (no
  // layout draw), dark but for its own light. Its body pays on E (the hoard
  // by walking); then the doors, as after any room.
  const SECRET_KINDS = ['secret_wall', 'secret_chamber', 'secret_pile', 'secret_body'];

  const isSecretBody = (e) => SECRET_KINDS.includes(e.kind) || (e.itype === 'encounter' && e.secret === true);

  function placeWall(n, mode, tick) {
    const R = SECRET_RULES;
    const W = R.wall;
    const pref = wallPref(rs.frame.seed, rs.campaign.index, n);
    const near = registry.all().filter((e) => e.kind === 'hazard' || e.interactable || e.kind === 'barricade' || e.kind === 'keg' || e.kind === 'shrine');
    let spot = null;
    for (let k = 0; k < R.spots.length && !spot; k++) {
      const [x, z, yaw] = R.spots[(pref + k) % R.spots.length];
      // The slab's face, 0.6 u into the room, must be clear of props and of
      // the room's own content, so the party can reach it.
      const fx = x + Math.sin(yaw) * 0.6;
      const fz = z + Math.cos(yaw) * 0.6;
      if (blockerClearance(fx, fz, 0.5) < 0.1) continue;
      if (near.some((e) => Math.hypot(e.x - x, e.z - z) < 1.7)) continue;
      if (SPAWN_POINTS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 1.2)) continue;
      spot = [x, z, yaw];
    }
    if (!spot) return null;
    const [x, z, yaw] = spot;
    const holds = rs.forcedHolds ?? chamberContent(rs.frame.seed, rs.campaign.index, n);
    rs.forcedHolds = null;
    const e = registry.spawn({
      kind: 'secret_wall',
      faction: 'neutral',
      x,
      z,
      px: x,
      pz: z,
      yaw,
      hittable: true,
      hp: 1,
      maxHp: 1,
      lifecycle: 'break',
      knockbackable: false,
      radius: W.hx,
      collider: { hx: W.hx, hz: W.hz, yaw },
      blocksMovement: true,
      blocksProjectiles: true,
      shut: true,
      biome: rs.layout ? rs.layout.biome : null,
    });
    refreshBlockers(registry);
    secrets.placed({ id: e.id, room: n, x, z, yaw, content: holds });
    events.emit(tick, 'secret_wall', { id: e.id, room: n, mode, x: r2(x), z: r2(z), yaw: r2(yaw) });
    return e;
  }

  // The wall breaks open: its collider goes, the breach stays dark until
  // the party walks through.
  function openWall(how, seat) {
    const w = secrets.open(how, seat);
    if (!w) return null;
    const e = registry.byId(w.id);
    if (e) {
      e.shut = false;
      e.hittable = false;
      delete e.collider;
      e.blocksMovement = false;
      e.blocksProjectiles = false;
      refreshBlockers(registry);
    }
    events.emit(getTick(), 'secret_open', { id: w.id, room: w.room, how, seat: seat ?? null, content: w.content, x: r2(w.x), z: r2(w.z), yaw: r2(w.yaw) });
    return w;
  }

  function secretBodySpec(content, x, z) {
    const B = SECRET_BODY[content];
    return {
      kind: 'secret_body',
      itype: 'secret_body',
      content,
      faction: 'neutral',
      x,
      z,
      px: x,
      pz: z,
      yaw: 0,
      interactable: true,
      interactRadius: B.interactRadius,
      radius: B.radius,
      verb: B.verb,
      spentLabel: B.spentLabel,
      uses: 1,
      cooldownUntilTick: 0,
      activeUntilTick: 0,
      usedTick: -1,
      usedBy: null,
      collider: { r: B.radius },
      blocksMovement: true,
    };
  }

  function enterSecret(tick) {
    const w = secrets.wall();
    const n = rs.roomIndex;
    const S = SECRET_RULES.spotsIn;
    const level = levelFor(rs.act);
    const land = encCtx().land ?? level.biome;
    let content = w.content;
    let extra = {};
    // The rare event: one of the land's encounters (the travellers too).
    if (content === 'event') {
      const ids = Object.keys(ENCOUNTERS).filter((id) => !ENCOUNTERS[id].land || ENCOUNTERS[id].land === land);
      const id = encounters.enabled() ? chamberEvent(rs.frame.seed, rs.campaign.index, n, ids) : null;
      if (id) extra = { encounter: id };
      else content = 'hoard';
    }
    if (content === 'lore') extra = { page: chamberPage(rs.frame.seed, rs.campaign.index, n, land) };
    RF.positionParty();
    rs.phase = 'secret';
    const c = secrets.enterChamber(n, content, extra);
    const [lx, lz] = S.light;
    registry.spawn({ kind: 'secret_chamber', faction: 'neutral', content, x: lx, z: lz, px: lx, pz: lz, yaw: 0, wallX: w.x, wallZ: w.z, biome: rs.layout ? rs.layout.biome : level.biome });
    const bodies = [];
    if (content === 'hoard') {
      S.piles.forEach((row, i) => {
        const [x, z] = RF.clearSpot(row, 0.4);
        const e = registry.spawn({ kind: 'secret_pile', faction: 'neutral', pile: i, x, z, px: x, pz: z, yaw: i * 2.3 });
        bodies.push({ id: e.id, x: r2(x), z: r2(z) });
      });
    } else if (content === 'event') {
      const sp = EVENT_RULES.spot;
      encounters.armHidden(n, extra.encounter);
      const enc = encounters.enter(n);
      const e = registry.spawn({ ...encounterSpec(enc.id, sp.x, sp.z, EVENT_RULES.bodyRadius), secret: true });
      events.emit(tick, 'interactable_spawn', { id: e.id, itype: 'encounter', x: r2(e.x), z: r2(e.z) });
      bodies.push({ id: e.id, x: r2(e.x), z: r2(e.z) });
    } else {
      const [x, z] = RF.clearSpot(S.body, SECRET_BODY[content].radius + 0.3);
      const e = registry.spawn(secretBodySpec(content, x, z));
      events.emit(tick, 'interactable_spawn', { id: e.id, itype: 'secret_body', x: r2(x), z: r2(z) });
      bodies.push({ id: e.id, x: r2(x), z: r2(z) });
    }
    refreshBlockers(registry);
    events.emit(tick, 'secret_enter', { room: n, content, ...extra, bodies, x: r2(w.x), z: r2(w.z) });
    // The rare event plays as a "?" room does (its card ends at the doors).
    if (content === 'event') {
      c.state = 'open';
      rs.phase = 'event';
    }
    return c;
  }

  function takeSecretPile(e, by) {
    const R = SECRET_RULES;
    const g = R.hoardGlint;
    RF.gainGlint(g, 'secret_pile');
    if (allyOn()) for (const seat of [1, 2, 3]) party.gainPurse(seat, R.hoardPurse, 'secret_pile');
    const c = secrets.chamber();
    if (c) c.glint += g;
    events.emit(getTick(), 'secret_pile', { id: e.id, pile: e.pile, by, glint: g, x: r2(e.x), z: r2(e.z) });
    registry.despawn(e.id);
  }

  function stepSecret() {
    const c = secrets.chamber();
    if (!c) return;
    if (c.state === 'open') {
      if (!c.paid && getTick() >= c.payAt) {
        c.paid = true;
        c.state = 'done';
        rs.roomsDone = Math.max(rs.roomsDone, rs.roomIndex);
        // The reliquary's pick, else on to the doors.
        if (relics.presentDue(RF.gainGlint)) rs.phase = 'relic';
        else RF.afterRelic();
      }
      return;
    }
    if (c.content !== 'hoard') return;
    for (const e of registry.all()) {
      if (e.kind !== 'secret_pile') continue;
      const h = secrets.toucher(e);
      if (h) takeSecretPile(e, h.id);
    }
    // The last pile taken: the hoard is the party's.
    if (!registry.all().some((e) => e.kind === 'secret_pile')) openSecret();
  }

  // E on the chamber's body (any hero), the autopilot, or cmd('secretTake').
  function openSecret() {
    if (rs.phase !== 'secret') return null;
    const c = secrets.chamber();
    if (!c || c.state !== 'shut') return null;
    const tick = getTick();
    const R = SECRET_RULES;
    const body = registry.all().find((e) => e.kind === 'secret_body');
    if (body && body.uses > 0) body.uses = 0;
    const at = body ?? player;
    const out = { content: c.content };
    if (c.content === 'hoard') {
      for (const e of registry.all()) if (e.kind === 'secret_pile') takeSecretPile(e, null);
      out.glint = c.glint;
    } else if (c.content === 'relic') {
      out.relic = relics.owe(rs.roomIndex, R.relicSource);
      if (!out.relic) {
        RF.gainGlint(R.loreGlint, 'secret_relic');
        c.glint += R.loreGlint;
      }
    } else if (c.content === 'tonics') {
      const items = [chestTonic(rs.frame.seed, rs.campaign.index, rs.roomIndex, 'secret'), chestTonic(rs.frame.seed, rs.campaign.index, rs.roomIndex, 'secret2')];
      out.tonics = [];
      for (const id of items) {
        const free = [0, 1, 2, 3].some((s) => tonics.slot(s) === null && registry.all().some((e) => e.partyIndex === s && e.hp > 0));
        if (tonics.enabled() && free && tonics.grant(id, 'secret', null, at.x, at.z) >= 0) out.tonics.push(id);
        else {
          RF.gainGlint(R.tonicGlint, 'secret_cache');
          c.glint += R.tonicGlint;
        }
      }
    } else if (c.content === 'lore') {
      RF.gainGlint(R.loreGlint, 'secret_lore');
      c.glint += R.loreGlint;
      secrets.notePage(c.page);
      out.page = c.page;
    }
    c.state = 'open';
    c.payAt = tick + Math.round(R.revealSec * TICK_HZ);
    events.emit(tick, 'secret_take', { room: rs.roomIndex, content: c.content, glint: c.glint, ...(out.page ? { page: out.page } : {}), ...(out.tonics ? { tonics: [...out.tonics] } : {}), ...(c.content === 'relic' ? { relic: !!out.relic } : {}), x: r2(at.x), z: r2(at.z) });
    return { taken: true, ...out };
  }

  return { SECRET_KINDS, isSecretBody, placeWall, openWall, secretBodySpec, enterSecret, takeSecretPile, stepSecret, openSecret };
}
