// Run structure — the 8-room run (BUILD_BRIEF §2 "Run overview", §13 "Rooms &
// run lifecycle", §14 "Glint economy", §16 "Draft, shop, path flow").
//
// One run = 8 rooms: 1-6 combat (exactly 2 defend, 4 kill_all; room 1 is
// always kill_all per ruling A3), room 7 shop, room 8 boss. The RUN FRAME
// (defend positions, path pairings, reward-side randomization) is rolled ONCE
// at run start from the seeded stream and is immutable — so the same seed
// always plays the same shape of run.
//
// Room-clear boundary sequence (§13, fixed order from the clear tick):
//   1. combat_active := false
//   2. every live combat entity ends (projectiles, zones, surviving enemies)
//   3. all Downed party members revive at 30% max_hp
//   4. targeting state clears: mark -> none, heal overrides cleared, rally
//      point cleared
//   5. `room_cleared` + stipend +12 Glint for combat rooms
//   6. reward presentation (skipped if forfeited) -> path choice (rooms 1-5)
//      -> transition fade
//   7. next room's first tick: combat_active := true
// Steps 2-4 are shared with the enemy/ally blocks, which already hang their
// half off `room_cleared` (survivor retreat + shot despawn in sim/waves.js;
// free revives, mark and rally clearing in sim/allies.js) — this module owns
// the player-side transient sweep, the heal-override clear, the stipend, and
// the whole of step 6.
//
// PERSISTENCE (§13): cooldowns (skills + dodge), party HP + Downed state,
// owned skills + socket assignments, bench nodes, Glint, RNG stream state and
// the run frame all persist ACROSS every boundary — this module never touches
// them at a transition. CLEARED each boundary: targeting state, projectiles,
// zones. WIPED at run end: everything.
//
// Sim discipline: no DOM, no render imports, no wall clock. The UI in
// src/ui/run/** is a pure view over `view()` and drives the same entry points
// __echoes.cmd does.
import { TICK_HZ } from '../core/constants.js';
import { PARTY_ALLIES, STARTING_SKILLS } from './skills.js';
import { createDraftSystem } from './draft.js';

const r2 = (v) => Math.round(v * 100) / 100;

export const RUN = Object.freeze({
  rooms: 8, // §2
  combatRooms: 6, // rooms 1-6
  defendCount: 2, // §2: exactly 2 of rooms 1-6 are defend
  shopRoom: 7, // §2 fixed
  bossRoom: 8, // §2 fixed
  stipend: 12, // §14 clear stipend, per combat-room clear (incl. boss)
  startingGlint: 0, // §14
  shopWallet: 72, // §14 deterministic wallet at the shop = 0 + 12x6
  pathRooms: 5, // §2: rooms 1-5 clear -> path choice
  fadeTicks: Math.round(0.3 * TICK_HZ), // §16 enter/exit <= 300 ms fades
});

// §16 path doors carry ONLY these two glyph channels.
export const WIN_GLYPH = Object.freeze({ kill_all: '⚔', defend: '⛨', boss: '☠' });
export const REWARD_GLYPH = Object.freeze({ skill: '✦', node: '◈' });

export function createRunSystem({
  rng,
  registry,
  events,
  getTick,
  player,
  waves,
  enemies,
  boss,
  skillSys,
  buildSys,
  allySys,
  combat,
}) {
  const draft = createDraftSystem({
    rng,
    build: () => buildSys,
    slots: () => skillSys.slotsView(),
  });

  let active = false;
  let roomIndex = 0; // 1..8 while a run is live
  let phase = 'idle'; // idle | combat | reward | path | shop | fade | victory | defeat
  let wallet = RUN.startingGlint;
  let frame = null;
  let reward = null; // live draft candidate
  let path = null; // live path offer
  let shop = null; // live shelf
  let summary = null; // frozen run summary for the end screens
  let pendingRoom = 0; // room the fade is walking toward
  let fadeUntilTick = 0;
  let rewardFor = {}; // room index -> promised reward type
  let clearedRooms = 0;
  let startTick = 0;

  // ------------------------------------------------------------ run frame --
  // ONE fixed roll sequence (defend positions, then the 5 path side bits) so a
  // seed reproduces the frame exactly. Room 1 is always kill_all (A3).
  function rollFrame() {
    const modes = new Array(RUN.rooms).fill('kill_all');
    const candidates = [1, 2, 3, 4, 5]; // 0-based indices of rooms 2..6
    const defendAt = [];
    for (let i = 0; i < RUN.defendCount; i++) {
      const pick = candidates.splice(rng.int(candidates.length), 1)[0];
      modes[pick] = 'defend';
      defendAt.push(pick + 1);
    }
    defendAt.sort((a, b) => a - b);
    modes[RUN.shopRoom - 1] = 'shop';
    modes[RUN.bossRoom - 1] = 'boss';
    // Reward-side randomization for the 5 path screens: 0 = skill door on the
    // left, 1 = skill door on the right. Every pairing has exactly one skill
    // and one node option (§16).
    const sides = [];
    for (let i = 0; i < RUN.pathRooms; i++) sides.push(rng.int(2));
    return { seed: rng.seed, modes, defendAt, sides };
  }

  // -------------------------------------------------------------- lifecycle --
  function startRun() {
    wipeState({ silent: true });
    frame = rollFrame();
    active = true;
    wallet = RUN.startingGlint;
    clearedRooms = 0;
    rewardFor = { 1: 'skill' }; // §2: room 1's reward is always a Skill draft
    summary = null;
    startTick = getTick();
    events.emit(getTick(), 'run_start', {
      seed: frame.seed,
      modes: [...frame.modes],
      defendAt: [...frame.defendAt],
      sides: [...frame.sides],
    });
    enterRoom(1);
    return view();
  }

  function positionParty() {
    // Rooms are separate arenas: the party walks in at the entry arc.
    player.x = 0;
    player.z = 0;
    player.px = 0;
    player.pz = 0;
    for (const spec of PARTY_ALLIES) {
      const a = registry.all().find((e) => e.kind === 'ally' && e.partyIndex === spec.partyIndex);
      if (!a) continue;
      a.x = spec.x;
      a.z = spec.z;
      a.px = spec.x;
      a.pz = spec.z;
    }
  }

  function enterRoom(n) {
    const tick = getTick();
    roomIndex = n;
    const mode = frame.modes[n - 1];
    reward = null;
    path = null;
    positionParty();
    events.emit(tick, 'room_enter', {
      index: n,
      mode,
      reward: rewardFor[n] ?? null,
      wallet,
    });
    if (mode === 'kill_all' || mode === 'defend') {
      phase = 'combat'; // §13 step 7: next room's first tick, combat_active := true
      waves.startRoom(mode);
    } else if (mode === 'shop') {
      phase = 'shop';
      openShop();
    } else if (mode === 'boss') {
      phase = 'combat';
      enemies.reset();
      boss.start();
      // The ally block hangs its room-start hygiene off this event (channels,
      // mark, rally, AI state) exactly as it does for wave rooms.
      events.emit(tick, 'room_start', { mode: 'boss', waves: [] });
    }
  }

  // §13 boundary sequence, steps 1-6. Fires off the `room_cleared` event, so
  // waves-cleared rooms and the boss room walk the identical path.
  function onRoomCleared(ev) {
    if (!active || phase !== 'combat') return;
    const tick = getTick();
    // 2. every live combat entity ends — the player-side half (enemy shots and
    //    survivors are handled by the enemy block, ally zones/bolts by the ally
    //    block). No instance may land after the clear tick.
    sweepPlayerTransients(tick, 'room_clear');
    // 4. targeting state clears. Mark and rally are cleared by the ally
    //    block's own `room_cleared` handler; the heal override is ours (§8:
    //    "room clear = clear").
    skillSys.clearOverride();
    events.emit(tick, 'heal_override', { index: null });
    // 5. stipend (+12 per combat-room clear, incl. the boss, incl. after a
    //    defend soft-fail).
    clearedRooms += 1;
    gainGlint(RUN.stipend, 'clear_stipend');

    if (roomIndex === RUN.bossRoom) {
      endRun('victory');
      return;
    }
    // 6. reward presentation — SKIPPED (silently, no reward event) when the
    //    defend objective died: §11 soft-fail forfeits the room reward.
    const forfeited = !!ev.softFailed;
    if (forfeited) {
      events.emit(tick, 'reward_forfeited', { room: roomIndex });
      afterReward();
      return;
    }
    presentReward();
  }

  function sweepPlayerTransients(tick, cause) {
    for (const e of registry.all()) {
      if (e.kind === 'bolt') {
        events.emit(tick, 'projectile_despawn', { id: e.id, cause, x: r2(e.x), z: r2(e.z) });
        registry.despawn(e.id);
      } else if (e.kind === 'skillbolt' && e.boltOwner !== 'ally_kits') {
        events.emit(tick, 'skill_bolt_despawn', {
          id: e.id,
          skill: e.skill,
          heal: !!e.heal,
          cause,
          traveled: r2(e.traveled ?? 0),
          x: r2(e.x),
          z: r2(e.z),
        });
        registry.despawn(e.id);
      } else if (e.kind === 'zone') {
        events.emit(tick, 'zone_expire', { id: e.id, skill: e.skill, cause });
        registry.despawn(e.id);
      }
    }
  }

  function gainGlint(amount, reason) {
    wallet += amount;
    events.emit(getTick(), 'glint_gain', { amount, wallet, reason, room: roomIndex });
    return wallet;
  }

  // ----------------------------------------------------------------- draft --
  function presentReward() {
    const promised = rewardFor[roomIndex] ?? 'skill';
    reward = draft.offer(promised);
    phase = 'reward';
    events.emit(getTick(), 'reward_offer', {
      room: roomIndex,
      promised,
      type: reward.type,
      id: reward.id,
      substituted: reward.substituted,
      line: reward.line,
      freeSkillSlots: reward.freeSkillSlots,
      poolSize: reward.poolSize,
    });
  }

  // §16: take-or-decline, no confirm, no reroll, no reopen.
  function takeReward() {
    if (phase !== 'reward' || !reward || !reward.type) return null;
    const tick = getTick();
    const taken = { type: reward.type, id: reward.id };
    if (reward.type === 'skill') {
      const r = skillSys.giveSkill(reward.id); // -> first empty slot (§16)
      events.emit(tick, 'draft_taken', { type: 'skill', id: reward.id, slot: r.slot ?? null });
    } else {
      buildSys.grantNode(reward.id, 'drafted'); // -> bench, never auto-socketed
      events.emit(tick, 'draft_taken', { type: 'node', id: reward.id, bench: true });
    }
    reward = null;
    afterReward(taken);
    return taken;
  }

  function declineReward() {
    if (phase !== 'reward') return null;
    const type = reward ? reward.type : null;
    const id = reward ? reward.id : null;
    events.emit(getTick(), 'draft_declined', { type, id }); // declines have no memory
    reward = null;
    afterReward(null);
    return { declined: true, type, id };
  }

  function afterReward(taken = null) {
    if (roomIndex <= RUN.pathRooms) {
      presentPath();
    } else {
      // Rooms 6->7 and 7->8 are fixed transitions (§2: no choice).
      beginFade(roomIndex + 1);
    }
    return taken;
  }

  // ------------------------------------------------------------------ path --
  function presentPath() {
    const nextRoom = roomIndex + 1;
    const win = frame.modes[nextRoom - 1];
    const skillLeft = frame.sides[roomIndex - 1] === 0;
    const options = [
      { side: 0, win, reward: skillLeft ? 'skill' : 'node' },
      { side: 1, win, reward: skillLeft ? 'node' : 'skill' },
    ];
    path = {
      nextRoom,
      options,
      focus: 0,
      freeSkillSlots: draft.freeSkillSlots(),
    };
    phase = 'path';
    events.emit(getTick(), 'path_offer', {
      room: roomIndex,
      nextRoom,
      options: options.map((o) => ({ side: o.side, win: o.win, reward: o.reward })),
      freeSkillSlots: path.freeSkillSlots,
    });
  }

  function focusPath(side) {
    if (phase !== 'path' || !path) return null;
    path.focus = side === 1 ? 1 : 0;
    return path.focus;
  }

  function choosePath(side) {
    if (phase !== 'path' || !path) return null;
    const opt = path.options[side === 1 ? 1 : 0];
    rewardFor[path.nextRoom] = opt.reward;
    events.emit(getTick(), 'path_chosen', {
      room: roomIndex,
      nextRoom: path.nextRoom,
      side: opt.side,
      win: opt.win,
      reward: opt.reward,
    });
    const next = path.nextRoom;
    path = null;
    beginFade(next);
    return { nextRoom: next, reward: opt.reward, win: opt.win };
  }

  // §13/§16 transition fade (<= 300 ms) between the meta screens and the next
  // room's first tick.
  function beginFade(next) {
    pendingRoom = next;
    fadeUntilTick = getTick() + RUN.fadeTicks;
    phase = 'fade';
    events.emit(getTick(), 'room_transition', { from: roomIndex, to: next, ticks: RUN.fadeTicks });
  }

  // ------------------------------------------------------------------ shop --
  function openShop() {
    const stock = draft.shopStock().map((s) => ({ ...s, sold: false }));
    shop = { stock, visited: true };
    events.emit(getTick(), 'shop_open', {
      room: roomIndex,
      wallet,
      stock: stock.map((s) => ({ node: s.node, rarity: s.rarity, price: s.price })),
      affordableAny2: stock.length >= 2,
    });
  }

  // §14: integer wallet, atomic spend; insufficient funds => `currency_denied`
  // no-op — the item is NEVER hidden or greyed for price (§16: plaque emphasis
  // + one ~300 ms shake, item stays).
  function buy(index) {
    if (phase !== 'shop' || !shop) return null;
    const card = shop.stock[index];
    if (!card || card.sold) return null;
    const tick = getTick();
    if (wallet < card.price) {
      events.emit(tick, 'currency_denied', {
        node: card.node,
        price: card.price,
        wallet,
        index,
      });
      return { denied: 'insufficient_funds', price: card.price, wallet };
    }
    wallet -= card.price;
    buildSys.grantNode(card.node, 'purchased'); // card departs to the bench
    card.sold = true;
    const owned = draft.ownedCount(card.node);
    events.emit(tick, 'shop_purchase', {
      node: card.node,
      price: card.price,
      wallet,
      owned,
      index,
    });
    return { node: card.node, price: card.price, wallet, owned };
  }

  function advanceFromShop() {
    if (phase !== 'shop') return null;
    events.emit(getTick(), 'shop_close', { wallet, sold: shop.stock.filter((s) => s.sold).length });
    beginFade(RUN.bossRoom); // one-way (§16)
    return { nextRoom: RUN.bossRoom };
  }

  // ------------------------------------------------------------- run end --
  function buildSummary(result) {
    const b = buildSys.view();
    return {
      result,
      rooms: clearedRooms,
      lastRoom: roomIndex,
      glint: wallet,
      seed: frame ? frame.seed : null,
      ticks: getTick() - startTick,
      skills: skillSys
        .slotsView()
        .filter(Boolean)
        .map((s) => s.id),
      nodes: {
        bench: b.bench.map((x) => x.node),
        socketed: b.skills.flatMap((sk) =>
          sk.sockets.filter(Boolean).map((s) => `${sk.id}:${s.node}`)
        ),
      },
      party: registry
        .all()
        .filter((e) => e.partyIndex !== undefined)
        .map((e) => ({ index: e.partyIndex, hp: r2(e.hp), maxHp: e.maxHp })),
    };
  }

  function endRun(result) {
    if (!active) return null;
    const tick = getTick();
    summary = buildSummary(result);
    events.emit(tick, 'run_end', {
      result,
      rooms: summary.rooms,
      glint: summary.glint,
      skills: [...summary.skills],
      nodes: summary.nodes.bench.length + summary.nodes.socketed.length,
      ticks: summary.ticks,
    });
    // §2/§13: ALL run state is wiped at run end (the end screen renders from
    // the frozen summary above, never from live state).
    wipeState({ silent: false });
    phase = result; // 'victory' | 'defeat'
    return summary;
  }

  // Everything the run owns goes back to boot condition (§13 "Wiped at run
  // end: everything"): skills back to the starting kit with fresh cooldowns,
  // bench + sockets empty, Glint 0, party topped up and standing, dodge timer
  // clear, arena emptied of enemies and of the boss.
  function wipeState({ silent }) {
    const tick = getTick();
    active = false;
    roomIndex = 0;
    reward = null;
    path = null;
    shop = null;
    frame = null;
    rewardFor = {};
    pendingRoom = 0;
    wallet = RUN.startingGlint;
    phase = 'idle';
    boss.despawn();
    enemies.reset();
    sweepPlayerTransients(tick, 'run_end');
    allySys.cmd('mark', [null]);
    allySys.cmd('roomBoundary');
    skillSys.restore({
      slots: STARTING_SKILLS.map((id) => ({ id, remaining: 0 })).concat([null, null]).slice(0, 4),
      override: null,
    });
    buildSys.restore({ bench: [], assignments: [] });
    for (const e of registry.all()) {
      if (e.partyIndex === undefined) continue;
      e.hp = e.maxHp;
      e.downed = false;
      e.downedTick = -1;
    }
    player.dodgeReadyTick = tick;
    player.nextBasicTick = tick;
    player.dashTicksLeft = 0;
    if (!silent) events.emit(tick, 'run_wiped', { wallet, skills: STARTING_SKILLS.length });
  }

  function returnToCamp() {
    // The camp hub scene lands with its own block; run state is already wiped
    // at run end, so this only dismisses the end screen.
    if (phase !== 'victory' && phase !== 'defeat') return null;
    phase = 'idle';
    events.emit(getTick(), 'return_to_camp', {});
    return { phase };
  }

  // -------------------------------------------------------------- ticking --
  function continuous() {
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.continuous();
  }

  function discrete() {
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.resolve();
  }

  function endOfTick() {
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.endOfTick();
    if (phase === 'fade' && getTick() >= fadeUntilTick) enterRoom(pendingRoom);
  }

  // §2: defeat = all 4 party members Downed simultaneously (the ONLY defeat
  // rule). The ally block owns the predicate and emits `defeat`.
  function onDefeat() {
    if (!active) return;
    endRun('defeat');
  }

  // ----------------------------------------------------------------- view --
  const combatActive = () => active && phase === 'combat';

  function view() {
    return {
      active,
      phase,
      combatActive: combatActive(),
      room: roomIndex,
      rooms: RUN.rooms,
      mode: frame && roomIndex ? frame.modes[roomIndex - 1] : null,
      wallet,
      clearedRooms,
      freeSkillSlots: draft.freeSkillSlots(),
      frame: frame
        ? { seed: frame.seed, modes: [...frame.modes], defendAt: [...frame.defendAt], sides: [...frame.sides] }
        : null,
      rewardFor: { ...rewardFor },
      reward: reward
        ? {
            type: reward.type,
            id: reward.id,
            promised: reward.promised,
            substituted: reward.substituted,
            line: reward.line,
            freeSkillSlots: reward.freeSkillSlots,
          }
        : null,
      path: path
        ? {
            nextRoom: path.nextRoom,
            focus: path.focus,
            freeSkillSlots: path.freeSkillSlots,
            options: path.options.map((o) => ({ ...o })),
          }
        : null,
      shop: shop
        ? {
            wallet,
            stock: shop.stock.map((s) => ({
              node: s.node,
              rarity: s.rarity,
              price: s.price,
              sold: s.sold,
              owned: draft.ownedCount(s.node),
              affordable: wallet >= s.price,
            })),
          }
        : null,
      boss: active && roomIndex === RUN.bossRoom ? boss.view() : null,
      summary,
      fadeTicksLeft: phase === 'fade' ? Math.max(0, fadeUntilTick - getTick()) : 0,
    };
  }

  // ----------------------------------------------- debug cmds (TESTING.md) --
  function cmd(name, args) {
    switch (name) {
      case 'startRun':
        return startRun();
      case 'runState':
        return view();
      case 'draftTake':
        return takeReward();
      case 'draftDecline':
        return declineReward();
      case 'pathFocus':
        return focusPath(args[0] ?? 0);
      case 'pathChoose':
        return choosePath(args[0] ?? 0);
      case 'shopBuy':
        return buy(args[0] ?? 0);
      case 'shopAdvance':
        return advanceFromShop();
      case 'returnToCamp':
        return returnToCamp();
      case 'endRun':
        return endRun(args[0] === 'defeat' ? 'defeat' : 'victory');
      case 'skipToRoom': {
        // Jump the run frame forward for scripted probes: clears the live room
        // and walks straight into room n (rewards/paths for the skipped rooms
        // are not presented; the stipends they would have paid ARE, so the
        // §14 wallet arithmetic still holds at the shop).
        const n = Math.max(1, Math.min(RUN.rooms, args[0] ?? 1));
        if (!active) startRun();
        phase = 'skip'; // suppresses the boundary sequence on the forced clear
        waves.forceClear();
        boss.despawn();
        enemies.reset();
        sweepPlayerTransients(getTick(), 'skip');
        // §14: the stipend is +12 per COMBAT-room clear. The shop room pays
        // nothing, so skipping past it must not mint 12 Glint out of thin air
        // — walking to room 7 or room 8 both land on the deterministic 72.
        const combatBefore = frame.modes
          .slice(0, n - 1)
          .filter((m) => m === 'kill_all' || m === 'defend' || m === 'boss').length;
        while (clearedRooms < combatBefore) {
          clearedRooms += 1;
          gainGlint(RUN.stipend, 'skip_stipend');
        }
        enterRoom(n);
        return view();
      }
      case 'bossHp':
        return boss.setHpPct(args[0] ?? 0.5);
      case 'killBoss': {
        const b = boss.entity();
        if (!b) return null;
        combat.kill(b);
        return true;
      }
      case 'wallet': {
        if (args[0] !== undefined) {
          wallet = Math.max(0, Math.round(args[0]));
          events.emit(getTick(), 'glint_set', { wallet });
        }
        return wallet;
      }
      case 'draftPools':
        return { skill: draft.skillPool(), node: draft.nodePool(), free: draft.freeSkillSlots() };
      default:
        return undefined;
    }
  }

  return {
    startRun,
    endRun,
    onRoomCleared,
    onDefeat,
    continuous,
    discrete,
    endOfTick,
    view,
    cmd,
    isActive: () => active,
    combatActive,
    // UI entry points (src/ui/run/**) — the same paths __echoes.cmd drives.
    takeReward,
    declineReward,
    focusPath,
    choosePath,
    buy,
    advanceFromShop,
    returnToCamp,
    wallet: () => wallet,
  };
}
