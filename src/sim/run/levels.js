// THE LEVEL DIRECTOR (BUILD_BRIEF §12, docs/gauntlet/PLAN.md §12): a level's clear,
// a level reset after a wipe, the party restored and carried between levels,
// the transit, the road pick and the next level. A part of the run system
// (sim/run.js): the run's state is `rs`, its other functions `RF`.
import { DEFAULT_ROAD, ROADS, levelFor } from '../../data/levels.js';
import { CARRY_RULES, FIRST_LEVEL, TRANSIT, nextLevel } from '../../data/campaign.js';
import { RUN, cloneData } from './rules.js';
import { STARTING_SKILLS } from '../skills.js';
import { SKILL_SLOTS } from '../../core/constants.js';
import { dailyLevelSeed } from '../../data/daily.js';
import { rushReward } from '../../data/rush.js';
import { assignObjectives } from '../objectives.js';

export function createRunLevels(ctx) {
  const { rs, RF, allySys, boss, buildSys, currentBoss, encounters, enemies, events, firstRoom, forkRoads, getTick, nextOf, objectivesOn, pages, party, player, registry, relics, rng, secrets, skillSys, vaults, waves } = ctx;

  // ------------------------------------------------ level director (§12) --
  // The level-clear trigger. Reached ONLY from onRoomCleared in the boss room,
  // which itself acts only while phase === 'combat' and changes the phase in
  // this same call; the per-level latch below makes a second call a no-op
  // whatever path reaches it (a replayed clear, a cmd, a same-tick double).
  function onLevelCleared(tick) {
    const c = rs.campaign;
    if (c && c.clearedAt === c.index) return;
    const level = rs.act;
    const next = nextOf(c, level);
    const levelTicks = c ? tick - c.levelStartTick : tick - rs.startTick;
    if (c) {
      c.clearedAt = c.index;
      const rec = c.levels[c.levels.length - 1];
      if (rec) {
        rec.rooms = rs.roomsDone;
        rec.cleared = true;
        rec.ticks = levelTicks;
        // THIRD BOSSES: the boss this level met (unlock facts read it).
        // Always kept: a Daily reseeds each level, so the summary's one seed
        // cannot re-roll the earlier levels' bosses.
        rec.boss = currentBoss().kind ?? 'stag';
      }
      // ENDLESS: the final level's first clear wins the campaign; the
      // descent goes on.
      if (c.endless && !c.won && nextLevel(level) === null) {
        c.won = true;
        events.emit(tick, 'campaign_won', { level, depth: c.index, endless: true });
      }
    }
    events.emit(tick, 'level_clear', {
      level,
      name: levelFor(level).name,
      next,
      final: next === null,
      index: c ? c.index : 1,
      campaign: !!(c && c.mode === 'campaign'),
      ticks: levelTicks,
      rooms: rs.roomsDone,
      ...(c && c.endless ? { depth: c.index } : {}),
      ...(c && c.rush ? { fight: c.index } : {}),
    });
    if (next === null) {
      RF.endRun('victory');
      // CAMPAIGN COMPLETE: the card returns to camp by itself (sim time, so a
      // pause holds it and a network guest follows the host).
      if (c && c.mode === 'campaign') rs.autoReturnTick = tick + TRANSIT.victoryReturnTicks;
      return;
    }
    beginTransit('clear', level, next, tick);
  }

  // RESET — every level-bound thing the sim owns goes (PLAN §12.3). The
  // presentation half (decals, particles, numerals, telegraph rigs, voices,
  // dressing) follows the `level_transit` event (src/campaign/manager.js).
  function resetLevel(tick, cause) {
    if (CARRY_RULES.resetShop) rs.shop = null;
    // PARTY: the party page, the four shelves and every deadline are level-bound.
    if (pages) pages.reset();
    relics.levelReset(); // RELICS: the relics ride on; curse / pick do not
    encounters.levelReset(); // EVENT ROOMS: two "?" doors a level
    vaults.levelReset(rs.act); // KEYS AND VAULTS: a key lasts its level
    secrets.levelReset(); // SECRET ROOMS: one wall a level
    RF.shrineLevelReset(); // SHRINES: one shrine a level
    if (party && CARRY_RULES.resetEntities) party.resetLevelState();
    rs.reward = null;
    rs.path = null;
    rs.pendingRoom = 0;
    if (CARRY_RULES.resetDirector) {
      waves.stop(cause);
      boss.despawn();
    }
    if (CARRY_RULES.resetEntities) {
      enemies.reset();
      RF.sweepPlayerTransients(tick, cause);
      RF.exitRoom(tick); // room hooks: hazards + interactables despawn
      allySys.cmd('mark', [null]);
      allySys.cmd('roomBoundary'); // ally zones + ally bolts, revive channels
      // Pending Echo recasts are in-flight casts of the level that ended.
      const bs = cloneData(buildSys.saveState());
      if (bs && Array.isArray(bs.echoQueue) && bs.echoQueue.length) {
        bs.echoQueue = [];
        buildSys.loadState(bs);
      }
      // Anything level-owned a system missed (belt and braces): only the
      // party may ride into the next level. Counted so a leak stays visible
      // (campaign().card.leftovers — the GC.5 probe expects []).
      const leftovers = [];
      for (const e of registry.all()) {
        if (e.partyIndex !== undefined || e.kind === 'player' || e.kind === 'ally') continue;
        leftovers.push(e.kind);
        registry.despawn(e.id);
      }
      return leftovers;
    }
    return [];
  }

  // RESTORE + the non-default CARRY switches (PLAN §12.3).
  function restoreParty(tick) {
    for (const e of registry.all()) {
      if (e.partyIndex === undefined) continue;
      if (CARRY_RULES.reviveDowned && (e.downed || e.hp <= 0)) {
        e.downed = false;
        e.downedTick = -1;
        if (e.hp <= 0) e.hp = e.maxHp;
      }
      if (CARRY_RULES.restoreHp) e.hp = e.maxHp;
      if (CARRY_RULES.clearStatuses && e.status) e.status = {};
      // PARTY: no parry window, dash / vault or pending cast rides across.
      if (e.kind === 'ally') {
        if (e.guard && e.guard.parry) e.guard = null;
        e.skillDash = null;
        e.pendingCast = null;
      }
      if (CARRY_RULES.resetCooldowns) {
        if (Array.isArray(e.cds)) e.cds = e.cds.map(() => tick);
        if (e.kind === 'ally' && Number.isFinite(e.dodgeReadyTick)) e.dodgeReadyTick = tick;
      }
    }
    if (CARRY_RULES.resetCooldowns) {
      const s = skillSys.serialize();
      s.slots = s.slots.map((x) => (x ? { ...x, remaining: 0 } : null));
      skillSys.restore(s);
      player.dodgeReadyTick = tick;
      player.nextBasicTick = tick;
      player.dashTicksLeft = 0;
    }
    applyCarrySwitches(tick);
  }

  function applyCarrySwitches(tick) {
    const R = CARRY_RULES;
    if (!R.carrySkills || !R.carrySockets || !R.carryBench) {
      const bs = cloneData(buildSys.saveState());
      const keep = R.carrySkills ? null : new Set(STARTING_SKILLS);
      const freed = [];
      const rows = [];
      for (const [id, row] of bs.assignments ?? []) {
        if ((keep && !keep.has(id)) || !R.carrySockets) {
          for (const r of row) if (r) freed.push({ ...r });
          continue;
        }
        rows.push([id, row]);
      }
      bs.assignments = rows;
      bs.bench = R.carryBench ? [...(bs.bench ?? []), ...freed] : [];
      buildSys.loadState(bs);
      if (keep) {
        const s = skillSys.serialize();
        const kit = new Array(SKILL_SLOTS).fill(null);
        STARTING_SKILLS.forEach((id, i) => {
          kit[i] = { id, remaining: 0 };
        });
        skillSys.restore({ slots: kit, override: s.override, auras: s.auras });
      }
    }
    if (!R.carryGlint) rs.wallet = 0;
    if (!R.carryHealOverride) {
      skillSys.clearOverride();
      events.emit(tick, 'heal_override', { index: null });
    }
    if (!R.carrySeedStream && typeof rng.reseed === 'function') rng.reseed(Math.floor(rng.float() * 0x100000000) >>> 0);
    if (!R.carryRecords && rs.campaign) rs.campaign.levels = rs.campaign.levels.slice(-1);
  }

  // What the card shows about the build that rides into the next level.
  function carriedSummary() {
    const b = buildSys.view();
    const owned = skillSys.slotsView().filter(Boolean).map((s) => s.id);
    return {
      skills: owned,
      socketed: b.skills.reduce((n, s) => n + s.filled, 0),
      sockets: b.skills.length * (b.socketCount ?? 8),
      bench: b.bench.length,
      wallet: rs.wallet,
      grant: rs.campaign && rs.campaign.grant ? cloneData(rs.campaign.grant) : null,
      // PARTY: the four builds that ride on (the card's compact lines).
      ...(party ? { builds: partyBuilds() } : {}),
    };
  }

  // PARTY: [{ seat, classId, skills, filled, sockets, bench, purse }] ×4.
  function partyBuilds() {
    const b = buildSys.view();
    const out = [
      {
        seat: 0,
        classId: 'healer',
        skills: skillSys.slotsView().map((s) => (s ? s.id : null)),
        filled: b.skills.reduce((n, s) => n + s.filled, 0),
        sockets: 32,
        bench: b.bench.length,
        purse: rs.wallet,
      },
    ];
    for (const i of [1, 2, 3]) {
      const v = party.view(i);
      out.push({ seat: i, classId: v.classId, skills: [...v.slots], filled: v.filled, sockets: 32, bench: v.bench.length, purse: v.purse });
    }
    return out;
  }

  // Phase 'transit' — the level-clear card (kind 'clear') or the setting-out
  // card of a Level-N start (kind 'depart'). The card is sim-timed.
  function beginTransit(kind, from, to, tick) {
    let leftovers = [];
    if (kind === 'clear') {
      leftovers = resetLevel(tick, 'level_clear');
      restoreParty(tick);
    }
    const min = kind === 'clear' ? TRANSIT.clearTicks : to !== FIRST_LEVEL ? TRANSIT.departTicks : 0;
    // THE LEVEL V FORK: the Level IV clear card waits for the party's road
    // (pickRoad); until then it leads to the Spire, which it takes if nobody
    // picks.
    const roads = kind === 'clear' ? forkRoads(rs.campaign, from) : null;
    const wait = roads ? Math.max(min, TRANSIT.forkTicks) : min;
    rs.campaign.card = {
      kind,
      from,
      to,
      startTick: tick,
      untilTick: tick + wait,
      minSkipTick: tick + Math.min(min, TRANSIT.minSkipTicks),
      hardUntilTick: tick + wait - min + TRANSIT.hardTicks,
      summary: carriedSummary(),
      leftovers,
      // THE LEVEL V FORK: present only on the Level IV clear card of a
      // campaign that has two roads ahead (`pick`: the party's, else null).
      ...(roads ? { fork: { roads, pick: null } } : {}),
      // ENDLESS: the depth the card leads to (present only then).
      ...(rs.campaign.endless ? { depth: rs.campaign.index + (kind === 'clear' ? 1 : 0) } : {}),
      // BOSS RUSH: the fight the card leads to (present only then).
      ...(rs.campaign.rush ? { fight: rs.campaign.index + (kind === 'clear' ? 1 : 0), fights: rs.campaign.rush.fights } : {}),
    };
    rs.campaign.transitions += 1;
    rs.phase = 'transit';
    events.emit(tick, 'level_transit', {
      kind,
      from,
      to,
      name: levelFor(to).name,
      index: rs.campaign.index + (kind === 'clear' ? 1 : 0),
      untilTick: rs.campaign.card.untilTick,
      minSkipTick: rs.campaign.card.minSkipTick,
      hardUntilTick: rs.campaign.card.hardUntilTick,
      ...(rs.campaign.endless ? { depth: rs.campaign.card.depth } : {}),
      ...(roads ? { fork: roads.slice() } : {}),
    });
  }

  // THE LEVEL V FORK: the party picks its road on the Level IV clear card
  // (the host in co-op). The card then leads to that road's Level V and
  // sets out shortly after. -> { ok, road, to } | { refused }
  function pickRoad(road, reason = 'pick') {
    const c = rs.campaign;
    if (!rs.active || rs.phase !== 'transit' || !c || !c.card || !c.card.fork) return { refused: 'no_fork' };
    const card = c.card;
    if (card.fork.pick) return { refused: 'picked', road: card.fork.pick };
    if (!card.fork.roads.includes(road) || !ROADS[road]) return { refused: 'road' };
    const tick = getTick();
    c.road = road;
    card.fork.pick = road;
    card.to = ROADS[road];
    card.untilTick = Math.max(card.minSkipTick, tick + TRANSIT.forkSettleTicks);
    card.hardUntilTick = tick + TRANSIT.hardTicks;
    events.emit(tick, 'road_pick', { road, to: card.to, name: levelFor(card.to).name, from: card.from, reason });
    return { ok: true, road, to: card.to };
  }

  // The card's Enter / the presentation's "ready" advance / the autopilot.
  function campaignAdvance(reason = 'skip') {
    if (!rs.active || rs.phase !== 'transit' || !rs.campaign || !rs.campaign.card) return null;
    const tick = getTick();
    if (tick < rs.campaign.card.minSkipTick) return { refused: 'settle', inTicks: rs.campaign.card.minSkipTick - tick };
    return advanceLevel(typeof reason === 'string' ? reason : 'skip');
  }

  // Build the next level and walk into its room 1.
  function advanceLevel(reason) {
    const tick = getTick();
    // A fork nobody picked takes the Spire's road.
    if (rs.campaign.card && rs.campaign.card.fork && !rs.campaign.card.fork.pick) pickRoad(DEFAULT_ROAD, 'default');
    const card = rs.campaign.card;
    const to = card.to;
    RF.exitRoom(tick);
    if (card.kind === 'clear') {
      // A NEW level: its own run frame, rolled from the CARRIED run stream (no
      // reseed), and fresh per-level counters. (A 'depart' card's level was
      // opened — frame rolled, grant applied — before the card.)
      rs.act = to;
      // DAILY: every level of the day's run rolls from the day, not from
      // what the party drew in the level before.
      if (rs.campaign.daily) RF.reseedTo(dailyLevelSeed(rs.campaign.daily.seed, rs.campaign.index + 1));
      rs.frame = RF.rollFrame();
      rs.roomIndex = 0;
      rs.clearedRooms = 0;
      rs.roomsDone = 0;
      rs.rewardFor = { 1: 'skill' };
      rs.reward = null;
      rs.path = null;
      rs.shop = null;
      rs.spoils = null;
      rs.pendingRoom = 0;
      rs.fadeUntilTick = 0;
      rs.lastCombatLayout = null;
      rs.roomPlanView = null;
      rs.campaign.index += 1;
      if (rs.campaign.rush) rs.rewardFor[RUN.bossRoom] = rushReward(rs.campaign.index);
      if (objectivesOn()) assignObjectives(rs.frame.modes, rs.frame.seed, rs.campaign.index);
      rs.campaign.levels.push({ level: to, index: rs.campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
    } else {
      const rec = rs.campaign.levels[rs.campaign.levels.length - 1];
      if (rec) rec.startTick = tick;
    }
    rs.campaign.level = to;
    rs.campaign.levelStartTick = tick;
    rs.campaign.card = null;
    events.emit(tick, 'level_start', {
      level: to,
      name: levelFor(to).name,
      index: rs.campaign.index,
      from: card.kind === 'clear' ? card.from : null,
      campaign: rs.campaign.mode === 'campaign',
      reason,
      seed: rs.frame.seed,
      modes: [...rs.frame.modes],
      ...(rs.campaign.endless ? { depth: rs.campaign.index } : {}),
      ...(rs.campaign.rush ? { fight: rs.campaign.index } : {}),
    });
    RF.enterRoom(firstRoom());
    return RF.view();
  }

  return { onLevelCleared, resetLevel, restoreParty, applyCarrySwitches, carriedSummary, partyBuilds, beginTransit, pickRoad, campaignAdvance, advanceLevel };
}
