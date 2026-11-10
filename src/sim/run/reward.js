// BETWEEN ROOMS (BUILD_BRIEF §2, §16): the reward draft (the Healer's card,
// the party page, taking, replacing and declining), the relic page, and the
// path doors to the next room. A part of the run system (sim/run.js): the
// run's state is `rs`, its other functions `RF`.
import { PARTY_DEADLINES, swapSuggestion } from '../../data/classes.js';
import { SKILL_SLOTS } from '../../core/constants.js';
import { RUN } from './rules.js';
import { crownFor, crownSide } from '../champions.js';
import { VAULT_RULES, vaultPref, vaultSide } from '../vaults.js';

export function createRunReward(ctx) {
  const { rs, RF, allyOn, buildSys, championsOn, controllers, draft, encCtx, encounters, events, getTick, levelChampion, pages, party, relics, rushFight, secrets, skillSys, vaults } = ctx;

  // ----------------------------------------------------------------- draft --
  // Ruling A17: the Healer's loadout in slot order (null = empty slot).
  const healerSlots = () => skillSys.slotsView().map((s) => (s ? s.id : null));

  function presentReward(allySpoils = null) {
    const promised = rs.rewardFor[rs.roomIndex] ?? 'skill';
    rs.reward = draft.offer(promised);
    // Ruling A17 (the user's rule): a SWAP offer carries the §25.8 suggestion
    // — `replace` = the slot the Replaces selector opens on (the lowest-
    // priority owned skill), `suggest` = take|leave. No draw: state only.
    if (rs.reward.swap) {
      const s = swapSuggestion('healer', healerSlots(), rs.reward.id);
      rs.reward.replace = s.replace;
      rs.reward.suggest = s.choice;
    }
    rs.phase = 'reward';
    // NOTE (binding, whole module): the bus builds every event as
    // `{ tick, type, ...payload }` (core/events.js), so a payload key named
    // `type` OVERWRITES the event's own type and makes the event unfindable by
    // `events.some(e => e.type === 'reward_offer')`. The reward's kind
    // therefore rides on `reward:` here, in draft_taken and in draft_declined.
    events.emit(getTick(), 'reward_offer', {
      room: rs.roomIndex,
      promised,
      reward: rs.reward.type,
      id: rs.reward.id,
      substituted: rs.reward.substituted,
      line: rs.reward.line,
      freeSkillSlots: rs.reward.freeSkillSlots,
      poolSize: rs.reward.poolSize,
      // fix-M4a-r4: an UPGRADE offer names its swap target; an empty offer
      // names why (keys present only when set, so fill-pool traces are
      // byte-identical to the pre-fix ones).
      ...(rs.reward.pool ? { pool: rs.reward.pool, upgrade: rs.reward.upgrade ? { ...rs.reward.upgrade } : null } : {}),
      ...(rs.reward.reason ? { reason: rs.reward.reason } : {}),
      // Ruling A17: keys present only on a swap offer (fill-case traces keep
      // their exact payload) — exactly `swap` + `replace` (PLAN §16.3; the
      // suggestion rides the run view, never the event).
      ...(rs.reward.swap ? { swap: true, replace: rs.reward.replace } : {}),
    });
    // PARTY: the ally cards (party stream, seats 1 → 3) — the Healer's card 0
    // mirrors run.reward. With the ally supply off no page opens (the §16.9
    // proof: exactly v0.5.150's events).
    if (allyOn()) pages.open(rs.roomIndex, promised, rs.reward, allySpoils);
  }

  // Ruling A17: move the pending Replaces choice of a swap offer (the UI's
  // W/S / wheel / click, cmd('draftReplace')). Plain run state — saved,
  // replicated, and what takeReward() uses when it is given no slot.
  function setRewardReplace(slot) {
    if (rs.phase !== 'reward' || !rs.reward || !rs.reward.swap) return null;
    const s = Number(slot);
    if (!(Number.isInteger(s) && s >= 0 && s < SKILL_SLOTS) || !healerSlots()[s]) return null;
    rs.reward.replace = s;
    // The party page's card 0 mirrors run.reward: its mark follows at once
    // (was stale until the Healer's decision — state().run.party.cards[0]
    // .replace disagreed with the card on screen; PARTY r6 advisory).
    const c0 = pages && pages.isOpen() ? pages.card(0) : null;
    if (c0 && c0.swap) c0.replace = s;
    return s;
  }

  // PARTY (PLAN §16.3): a card's decision. Seat 0 = the Healer's card (its
  // swap slot moves run.reward.replace); seats 1-3 = the ally cards. The page
  // COMMITS when every card is decided (commitIfReady) — in Suggested mode
  // the AI-held cards open decided, so the Healer's one decision commits.
  function partyPick(seat, choice, replace = null, { by = 'human' } = {}) {
    if (rs.phase !== 'reward') return { denied: 'closed' };
    const s = Number(seat);
    if (s === 0) {
      if (choice === 'take' && (!rs.reward || !rs.reward.type)) return { denied: 'nothing_to_take' };
      if (rs.reward && rs.reward.swap && Number.isInteger(replace)) setRewardReplace(replace);
      if (pages && pages.isOpen()) pages.pick(0, choice, rs.reward && rs.reward.swap ? rs.reward.replace : null, { by });
      else return choice === 'take' ? takeReward(replace ?? undefined) : declineReward();
      return commitIfReady() ?? { ok: true, seat: 0, choice };
    }
    if (!pages || !pages.isOpen()) return { denied: 'closed' };
    const r = pages.pick(s, choice, replace, { by });
    if (r && r.denied) return r;
    return commitIfReady() ?? r;
  }

  function commitIfReady() {
    if (!pages || !pages.isOpen()) return null;
    if (pages.undecided().length > 0) return null;
    return commitPage('commit');
  }

  // Apply the page: seat 0 exactly as today, then seats 1-3, then the doors.
  function commitPage(reason = 'commit') {
    const c0 = pages && pages.isOpen() ? pages.card(0) : null;
    const choice0 = c0 && c0.decided ? c0.choice : rs.reward && rs.reward.type ? 'take' : 'leave';
    const taken = choice0 === 'take' && rs.reward && rs.reward.type ? applyTake(rs.reward.swap ? rs.reward.replace : undefined) : applyDecline();
    if (pages && pages.isOpen()) pages.applyAllies(reason);
    if (party && party.autoSocketOwn(0) && controllers()[0] === 'human') buildSys.autoFill();
    // v0.5.227: an AI-held Healer sockets its own nodes, like the AI seats.
    else if (party && controllers()[0] !== 'human' && party.mode() !== 'manual') buildSys.autoFill();
    afterReward(taken);
    return taken ?? { declined: true };
  }

  // §16: take-or-decline, no confirm, no reroll, no reopen. The legacy
  // one-call entry (the harness, the autopilot, cmd('draftTake')): the
  // Healer's card taken, then the page committed with the ally cards as the
  // mode left them (Suggested: today's one-call behaviour).
  // Ruling A17: on a SWAP offer `replace` names the slot the new skill takes
  // (default: the pending choice, reward.replace); the old skill leaves the
  // loadout and its nodes go to the bench.
  function takeReward(replace) {
    if (rs.phase !== 'reward' || !rs.reward || !rs.reward.type) return null;
    if (pages && pages.isOpen()) {
      if (rs.reward.swap && Number.isInteger(replace)) setRewardReplace(replace);
      pages.pick(0, 'take', rs.reward.swap ? rs.reward.replace : null, { by: 'human' });
      return commitPage('commit');
    }
    const taken = applyTake(replace);
    if (taken) afterReward(taken);
    return taken;
  }

  function applyTake(replace) {
    if (!rs.reward || !rs.reward.type) return null;
    const tick = getTick();
    const taken = { type: rs.reward.type, id: rs.reward.id };
    if (rs.reward.type === 'skill' && rs.reward.swap) {
      const slot = Number.isInteger(replace) && healerSlots()[replace] ? replace : rs.reward.replace;
      const old = healerSlots()[slot];
      if (!old) return null; // defensive: a swap always has 4 owned
      const released = buildSys.releaseSkill(old);
      const r = skillSys.replaceSkill(slot, rs.reward.id);
      if (!r || r.error) return null;
      taken.slot = slot;
      taken.replaced = old;
      taken.released = released;
      events.emit(tick, 'draft_taken', { reward: 'skill', id: rs.reward.id, slot, swap: true, replaced: old, released: [...released] });
      events.emit(tick, 'skill_swapped', { seat: 0, id: rs.reward.id, slot, replaced: old, released: [...released] });
    } else if (rs.reward.type === 'skill') {
      const r = skillSys.giveSkill(rs.reward.id); // -> first empty slot (§16)
      events.emit(tick, 'draft_taken', { reward: 'skill', id: rs.reward.id, slot: r.slot ?? null });
    } else {
      buildSys.grantNode(rs.reward.id, 'drafted'); // -> bench, never auto-socketed
      events.emit(tick, 'draft_taken', { reward: 'node', id: rs.reward.id, bench: true });
    }
    rs.reward = null;
    return taken;
  }

  function declineReward() {
    if (rs.phase !== 'reward') return null;
    if (pages && pages.isOpen()) {
      pages.pick(0, 'leave', null, { by: 'human' });
      return commitPage('commit');
    }
    const r = applyDecline();
    afterReward(null);
    return r;
  }

  function applyDecline() {
    const type = rs.reward ? rs.reward.type : null;
    const id = rs.reward ? rs.reward.id : null;
    events.emit(getTick(), 'draft_declined', { reward: type, id }); // declines have no memory
    rs.reward = null;
    return { declined: true, type, id };
  }

  function afterReward(taken = null) {
    // RELICS: an owed relic pick comes after the draft, before the doors.
    if (relics.presentDue(RF.gainGlint)) {
      rs.phase = 'relic';
      return taken;
    }
    afterRelic();
    return taken;
  }

  function afterRelic() {
    // SECRET ROOMS: a wall broken open in this room: the party steps through
    // the breach before the doors.
    if (secrets.chamberDue(rs.roomIndex)) {
      RF.enterSecret(getTick());
      return;
    }
    // BOSS RUSH: the fight's draft and pick are done; on to the next land.
    if (rushFight() && rs.roomIndex === RUN.bossRoom) {
      RF.onLevelCleared(getTick());
      return;
    }
    if (rs.roomIndex <= RUN.pathRooms) {
      presentPath();
    } else {
      // Rooms 6->7 and 7->8 are fixed transitions (§2: no choice).
      RF.beginFade(rs.roomIndex + 1);
    }
  }

  // RELICS: the relic page (phase 'relic') — one of three, no reroll.
  function focusRelic(i) {
    if (rs.phase !== 'relic') return null;
    return relics.focus(i);
  }

  function chooseRelic(i) {
    if (rs.phase !== 'relic') return null;
    const id = relics.choose(i);
    if (!id) return null;
    afterRelic();
    return { relic: id };
  }

  // ------------------------------------------------------------------ path --
  function presentPath() {
    const nextRoom = rs.roomIndex + 1;
    const win = rs.frame.modes[nextRoom - 1];
    const skillLeft = rs.frame.sides[rs.roomIndex - 1] === 0;
    const options = [
      { side: 0, win, reward: skillLeft ? 'skill' : 'node' },
      { side: 1, win, reward: skillLeft ? 'node' : 'skill' },
    ];
    // RELICS: one door may carry a curse (key present only then).
    const dc = relics.rollDoorCurse();
    if (dc) {
      options[dc.side].curse = dc.curse;
      if (dc.major) options[dc.side].major = true;
    }
    // EVENT ROOMS: maybe a "?" door, never the cursed one (keys present only then).
    const ed = encounters.rollDoor(nextRoom, dc ? dc.side : null, encCtx());
    if (ed) options[ed.side] = { side: ed.side, win: 'event', reward: 'event', event: true, encounter: ed.id };
    // CHAMPION ROOMS: the level's crown door (never the cursed one; over the
    // event door when the other is cursed). Its reward stays the door's own.
    const crown = championsOn() ? (rs.forcedCrown ?? crownFor(rs.frame.seed, rs.campaign.index)) : null;
    rs.forcedCrown = null;
    if (crown && crown.room === nextRoom) {
      const side = crownSide(crown.side, dc ? dc.side : null, ed ? ed.side : null);
      const keep = options[side].event ? { side, win: 'champion', reward: rs.frame.sides[rs.roomIndex - 1] === 0 ? (side === 0 ? 'skill' : 'node') : side === 0 ? 'node' : 'skill' } : { ...options[side], win: 'champion' };
      options[side] = { ...keep, champion: levelChampion() };
    }
    // KEYS AND VAULTS: while the party holds a key, the vault door (never the
    // cursed or the crown door; over a "?" door only when it must). It keeps
    // its door's own reward: the draft still follows the vault.
    const R = VAULT_RULES;
    if (vaults.enabled() && vaults.held() && vaults.open() && nextRoom >= R.doorRooms[0] && nextRoom <= R.doorRooms[1]) {
      const crownAt = options.findIndex((o) => o.champion);
      const eventAt = options.findIndex((o) => o.event);
      const pref = rs.forcedVault ?? vaultPref(rs.frame.seed, rs.campaign.index, nextRoom);
      const side = vaultSide(pref, dc ? dc.side : null, eventAt >= 0 ? eventAt : null, crownAt >= 0 ? crownAt : null);
      if (side !== null) {
        const reward = rs.frame.sides[rs.roomIndex - 1] === 0 ? (side === 0 ? 'skill' : 'node') : side === 0 ? 'node' : 'skill';
        options[side] = { side, win: 'vault', reward, vault: true };
      }
    }
    rs.forcedVault = null;
    rs.path = {
      nextRoom,
      options,
      focus: 0,
      freeSkillSlots: draft.freeSkillSlots(),
    };
    rs.phase = 'path';
    if (pages) pages.armDoor(getTick()); // PARTY: network door deadline (≥ 2 humans)
    events.emit(getTick(), 'path_offer', {
      room: rs.roomIndex,
      nextRoom,
      options: options.map((o) => ({ side: o.side, win: o.win, reward: o.reward, ...(o.curse ? { curse: o.curse } : {}), ...(o.major ? { major: true } : {}), ...(o.event ? { event: true } : {}), ...(o.champion ? { champion: o.champion } : {}), ...(o.vault ? { vault: true } : {}) })),
      freeSkillSlots: rs.path.freeSkillSlots,
    });
  }

  function focusPath(side) {
    if (rs.phase !== 'path' || !rs.path) return null;
    rs.path.focus = side === 1 ? 1 : 0;
    return rs.path.focus;
  }

  function choosePath(side, { hold = true } = {}) {
    if (rs.phase !== 'path' || !rs.path) return null;
    if (rs.path.hold) return { held: true, side: rs.path.hold.side, untilTick: rs.path.hold.untilTick };
    // PARTY (BUILD_BRIEF §25.7): a committed door waits <= socketHoldTicks
    // while a human's socket screen is open (network only: the screens are
    // reported only in a session with >= 2 humans).
    if (hold && pages && pages.humans() >= 2 && pages.humanScreenOpen()) {
      const untilTick = getTick() + PARTY_DEADLINES.socketHoldTicks;
      rs.path.hold = { side: side === 1 ? 1 : 0, untilTick };
      if (pages) pages.clearDoor();
      events.emit(getTick(), 'party_deadline', { what: 'socket_hold', tick: untilTick, side: rs.path.hold.side });
      return { held: true, side: rs.path.hold.side, untilTick };
    }
    const opt = rs.path.options[side === 1 ? 1 : 0];
    if (pages) pages.clearDoor();
    rs.rewardFor[rs.path.nextRoom] = opt.reward;
    events.emit(getTick(), 'path_chosen', {
      room: rs.roomIndex,
      nextRoom: rs.path.nextRoom,
      side: opt.side,
      win: opt.win,
      reward: opt.reward,
    });
    const next = rs.path.nextRoom;
    if (opt.curse) relics.takeCurse(opt.curse, next);
    // EVENT ROOMS: the "?" door turns the next room into its event room.
    if (opt.event) {
      rs.frame.modes[next - 1] = 'event';
      rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== next);
      encounters.arm(next, opt.encounter);
    }
    // CHAMPION ROOMS: the crown door turns the next room into the champion's.
    if (opt.champion) {
      rs.frame.modes[next - 1] = 'champion';
      rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== next);
      events.emit(getTick(), 'crown_door_taken', { room: next });
    }
    // KEYS AND VAULTS: the key turns in the lock; the next room is the vault.
    if (opt.vault) {
      rs.frame.modes[next - 1] = 'vault';
      rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== next);
      vaults.spend(next);
    }
    rs.path = null;
    // TUTORIAL: the door is the last lesson — back to camp.
    if (RF.tutorialOn()) {
      RF.endTutorial('done');
      return { nextRoom: next, reward: opt.reward, win: opt.win, tutorial: 'done' };
    }
    RF.beginFade(next);
    return { nextRoom: next, reward: opt.reward, win: opt.win, ...(opt.curse ? { curse: opt.curse } : {}), ...(opt.major ? { major: true } : {}), ...(opt.event ? { event: true } : {}), ...(opt.champion ? { champion: opt.champion } : {}), ...(opt.vault ? { vault: true } : {}) };
  }

  return { healerSlots, presentReward, setRewardReplace, partyPick, commitIfReady, commitPage, takeReward, applyTake, declineReward, applyDecline, afterReward, afterRelic, focusRelic, chooseRelic, presentPath, focusPath, choosePath };
}
