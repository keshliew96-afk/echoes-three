// THE EVENT ROOM (docs/EVENT_ROOMS.md): entering an event room, the encounter
// card, paying for a choice and what each choice does, and the trapped
// chest's ambush waves. A part of the run system (sim/run.js): the run's
// state is `rs`, its other functions `RF`.
import { encounterSpec } from '../interactables.js';
import { ENCOUNTERS, EVENT_RULES } from '../encounters.js';
import { r2 } from './rules.js';
import { RELICS, RELIC_RULES, cursedDiff } from '../relics.js';
import { beyondCampaign, endlessDifficulty, endlessLevel } from '../../data/endless.js';
import { levelFor } from '../../data/levels.js';
import { difficulty } from '../../data/difficulty.js';
import { LAYOUTS } from '../../data/layouts.js';

export function createEventRoom(ctx) {
  const { rs, RF, allyOn, combat, encCtx, encounterBody, encounters, endlessDepth, events, getTick, objectivesOn, party, player, registry, relics, roomLevel, skillSys, waves } = ctx;

  // ------------------------------------------------------- event rooms --
  // EVENT ROOMS (docs/EVENT_ROOMS.md). Phase 'event': the party walks in
  // with the encounter standing ahead (E · Inspect). Phase 'encounter': its
  // card (Take or Leave). Take pays the cost, then the reward: a relic page,
  // a Skill draft, Glint, a heal, or (the trapped chest) a short fight first.
  // Then the doors, as after any room.
  function enterEvent(n, tick) {
    rs.phase = 'event';
    const enc = encounters.enter(n);
    relics.onRoomEnter(n, 'event');
    if (!enc) {
      RF.afterRelic(); // defensive: a "?" room with nothing armed walks on
      return;
    }
    const e = registry.spawn(encounterSpec(enc.id, EVENT_RULES.spot.x, EVENT_RULES.spot.z, EVENT_RULES.bodyRadius));
    events.emit(tick, 'interactable_spawn', { id: e.id, itype: 'encounter', x: r2(e.x), z: r2(e.z) });
  }

  function openEncounter() {
    if (rs.phase !== 'event' || !encounters.open(encCtx())) return null;
    const body = encounterBody();
    if (body && body.uses > 0) body.uses = 0;
    rs.phase = 'encounter';
    return encounters.view(encCtx());
  }

  function focusEncounter(i) {
    if (rs.phase !== 'encounter') return null;
    return encounters.focus(i);
  }

  function spend(amount, reason) {
    rs.wallet = Math.max(0, rs.wallet - amount);
    events.emit(getTick(), 'glint_spend', { amount, wallet: rs.wallet, reason, room: rs.roomIndex });
  }

  // choice: 'take' | 'leave' (default: the card's focus).
  function chooseEncounter(choice) {
    if (rs.phase !== 'encounter') return null;
    const enc = encounters.live();
    if (!enc) return null;
    const pick = choice === 'take' || choice === 'leave' ? choice : enc.focus === 1 ? 'leave' : 'take';
    const tick = getTick();
    const room = rs.roomIndex;
    if (pick === 'take') {
      const why = encounters.refusal(encCtx());
      if (why) {
        events.emit(tick, 'event_denied', { room, encounter: enc.id, reason: why });
        return { denied: why };
      }
    }
    rs.roomsDone = Math.max(rs.roomsDone, room);
    if (pick === 'leave') {
      encounters.finish('done', { left: true });
      events.emit(tick, 'event_leave', { room, encounter: enc.id });
      RF.afterRelic();
      return { left: true, encounter: enc.id };
    }
    const E = ENCOUNTERS[enc.id];
    const R = EVENT_RULES;
    const result = { took: true };
    const bodies = registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0);
    switch (enc.id) {
      case 'blood_shrine': {
        let paid = 0;
        for (const e of bodies) {
          const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.hpCost));
          e.hp = r2(e.hp - loss);
          paid += loss;
        }
        result.hp = r2(paid);
        relics.owe(room, 'shrine');
        break;
      }
      case 'wishing_well': {
        spend(E.price, 'event_well');
        const relic = encounters.coin() ? relics.grantRandom('well', encounterBody() ?? player) : null;
        if (relic) result.relic = relic;
        else {
          RF.gainGlint(R.wellGlint, 'event_well');
          result.glint = R.wellGlint;
        }
        break;
      }
      case 'trapped_chest':
        startAmbush(tick);
        events.emit(tick, 'event_take', { room, encounter: enc.id, ambush: true });
        return { ambush: true, encounter: enc.id };
      case 'lost_pilgrim':
        spend(E.price, 'event_pilgrim');
        result.draft = 'skill';
        break;
      case 'corrupted_altar': {
        const id = encounters.pick(relics.freeMajors());
        relics.takeMajor(id, room);
        relics.owe(room, 'altar', { curse: id });
        result.curse = id;
        break;
      }
      case 'wandering_spirit': {
        const lost = relics.loseNewest('spirit');
        relics.owe(room, 'spirit', { not: lost ? [lost] : null });
        result.lost = lost;
        break;
      }
      case 'forgotten_cache':
        RF.gainGlint(R.cacheGlint, 'event_cache');
        if (allyOn()) for (const seat of [1, 2, 3]) party.gainPurse(seat, R.cachePurse, 'event_cache');
        result.glint = R.cacheGlint;
        break;
      // MORE EVENT ROOMS (slice 6).
      case 'fey_ring': {
        const paid = rs.wallet;
        spend(paid, 'event_fey');
        relics.owe(room, 'fey');
        result.paid = paid;
        break;
      }
      case 'sluice_gate': {
        if (encounters.coin()) {
          const relic = relics.grantRandom('sluice', encounterBody() ?? player);
          if (relic) result.relic = relic;
          RF.gainGlint(R.sluiceGlint, 'event_sluice');
          result.glint = R.sluiceGlint;
        } else {
          let lost = 0;
          for (const e of bodies) {
            const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.sluiceFlood));
            e.hp = r2(e.hp - loss);
            lost += loss;
          }
          result.flood = true;
          result.hp = r2(lost);
        }
        break;
      }
      case 'barrow_ossuary': {
        let paid = 0;
        for (const e of bodies) {
          const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.ossuaryCost));
          e.hp = r2(e.hp - loss);
          paid += loss;
        }
        result.hp = r2(paid);
        result.draft = 'node';
        break;
      }
      case 'heart_crystal': {
        const grown = [];
        const n = relics.majorCurses().length;
        for (let k = 0; k < n; k++) {
          const relic = relics.grantRandom('crystal', encounterBody() ?? player);
          if (!relic) break;
          grown.push(relic);
        }
        result.relics = grown;
        if (grown.length < n) {
          RF.gainGlint(RELIC_RULES.emptyPoolGlint * (n - grown.length), 'relic_pool_empty');
          result.glint = RELIC_RULES.emptyPoolGlint * (n - grown.length);
        }
        break;
      }
      // THE STILL SPIRE (plan 4 slice 7).
      case 'gods_seat': {
        const lost = [];
        for (let k = 0; k < R.seatRelics; k++) {
          const id = relics.loseNewest('seat');
          if (id) lost.push(id);
        }
        relics.owe(room, 'seat', { not: lost });
        result.lost = lost;
        break;
      }
      case 'silent_bell': {
        let paid = 0;
        for (const e of bodies) {
          const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.bellCost));
          e.hp = r2(e.hp - loss);
          paid += loss;
        }
        result.hp = r2(paid);
        const lifted = relics.liftMajor('bell');
        if (lifted) result.lifted = lifted;
        break;
      }
      // THE EMBER KILN (content plan 5 slice 9): Glint poured into the
      // mould, 40 for each relic, up to three; the rest stays in the purse.
      case 'molten_bell': {
        const n = Math.min(R.pourMax, Math.floor(rs.wallet / R.pourStep));
        spend(n * R.pourStep, 'event_bell');
        const rung = [];
        for (let k = 0; k < n; k++) {
          const relic = relics.grantRandom('molten', encounterBody() ?? player);
          if (!relic) break;
          rung.push(relic);
        }
        result.paid = n * R.pourStep;
        result.relics = rung;
        if (rung.length < n) {
          RF.gainGlint(RELIC_RULES.emptyPoolGlint * (n - rung.length), 'relic_pool_empty');
          result.glint = RELIC_RULES.emptyPoolGlint * (n - rung.length);
        }
        break;
      }
      case 'traveling_smith': {
        spend(E.price, 'event_smith');
        const lost = relics.loseNewest('smith');
        const was = lost ? RELICS[lost].rarity : 'common';
        const tiers = was === 'common' ? [['rare'], ['legendary']] : [['legendary']];
        const relic = relics.grantTier('smith', tiers, lost ? [lost] : null, encounterBody() ?? player);
        result.lost = lost;
        if (relic) result.relic = relic;
        break;
      }
      case 'gamblers_dice': {
        spend(E.price, 'event_dice');
        const dice = encounters.dice();
        result.dice = dice;
        if (dice[0] === dice[1]) {
          const relic = relics.grantTier('dice', [['rare', 'legendary']], null, encounterBody() ?? player);
          if (relic) result.relic = relic;
          else {
            RF.gainGlint(R.diceGlint, 'event_dice');
            result.glint = R.diceGlint;
          }
        } else if (dice[0] + dice[1] >= R.diceHigh) {
          RF.gainGlint(R.diceGlint, 'event_dice');
          result.glint = R.diceGlint;
        }
        break;
      }
      case 'healing_spring': {
        let healed = 0;
        for (const e of bodies) {
          if (e.hp >= e.maxHp) continue;
          combat.applyHeal(e, e.maxHp - e.hp, { source: 'healing_spring' });
          e.hp = e.maxHp; // full, whatever the curses and relics say
          healed += 1;
        }
        result.healed = healed;
        break;
      }
      default:
        break;
    }
    encounters.finish('done', result);
    events.emit(tick, 'event_take', { room, encounter: enc.id, ...result });
    if (result.draft) {
      rs.rewardFor[room] = result.draft;
      RF.presentReward(null);
      return { took: true, encounter: enc.id, ...result };
    }
    RF.afterReward(null);
    return { took: true, encounter: enc.id, ...result };
  }

  // The trapped chest: two short elite-heavy waves in the event room.
  function startAmbush(tick) {
    const depth = endlessDepth();
    const level = depth ? endlessLevel(depth) : roomLevel(levelFor(rs.act));
    const n = rs.roomIndex;
    const base = beyondCampaign(depth) ? endlessDifficulty(depth, Math.min(6, n), rs.challenge) : difficulty(rs.act, Math.min(6, n), rs.challenge);
    const A = EVENT_RULES.ambush;
    let diff = { ...base, budget: r2(base.budget * A.budgetMul), eliteChance: r2(Math.min(0.9, (base.eliteChance ?? 0) + A.eliteAdd)) };
    for (const m of relics.majorCurses()) diff = cursedDiff(diff, m, relics.majorScale());
    diff = RF.vowedDiff(diff);
    encounters.finish('ambush');
    waves.planRoom('kill_all', { act: rs.act, room: n, challenge: rs.challenge, level, diff, waves: A.waves, campaignKinds: objectivesOn() });
    const ring = rs.layout ? LAYOUTS[rs.layout.layoutId]?.spawns : null;
    if (ring) waves.relocateSpawns(ring);
    rs.phase = 'combat';
    waves.beginRoom();
    events.emit(tick, 'event_ambush', { room: n, encounter: 'trapped_chest' });
  }

  function ambushCleared(tick) {
    RF.sweepPlayerTransients(tick, 'room_clear');
    skillSys.clearOverride();
    events.emit(tick, 'heal_override', { index: null });
    rs.roomsDone = Math.max(rs.roomsDone, rs.roomIndex);
    const R = EVENT_RULES;
    RF.gainGlint(R.chestGlint, 'event_chest');
    relics.owe(rs.roomIndex, 'chest');
    encounters.finish('done', { took: true, glint: R.chestGlint });
    events.emit(tick, 'event_chest', { room: rs.roomIndex, glint: R.chestGlint });
    RF.afterReward(null);
  }

  return { enterEvent, openEncounter, focusEncounter, spend, chooseEncounter, startAmbush, ambushCleared };
}
