// EVENT ROOMS (docs/EVENT_ROOMS.md, content plan 2 slice 1). A third kind of
// door, marked "?", leads to a small room with no fight that holds one of
// eight encounters. Each is a trade: HP, Glint, a curse, a relic or a fight
// for a reward. Taking the "?" door also gives up the combat room it
// replaces (its stipend, its clear spoils and its draft), which is the price
// of the free ones.
//
// Rules (CONTENT_PLAN_2 "Notes per slice" 1):
//   - campaign only (relics on, never the tutorial): the legacy single-level
//     run and the nine goldens never see a "?" door;
//   - rolled on the path screens leading to rooms 2 to 5, at most two a
//     level, never both doors of one choice, never the cursed door;
//   - an encounter is an interactable (E · Inspect) plus a card (Take or
//     Leave). The trapped chest is the one that becomes a short fight;
//   - the AI seats and the autopilot take the safe option; in co-op the host
//     decides, like the doors.
//
// Own seeded stream (never the run RNG and never the relic stream's order
// before a "?" door is first offered), saved with the run. The sim never
// translates: names and lines are English keys the UI shows with t().
import { createGameplayRng } from '../core/rng.js';

export const EVENT_RULES = Object.freeze({
  firstRoom: 2, // the earliest room a "?" door leads to
  lastRoom: 5, // the latest
  chance: 0.4, // a path screen in range carries a "?" door
  maxPerLevel: 2,
  hpCost: 0.25, // Blood Shrine: each hero gives this share of max HP
  wellCost: 15, // Wishing Well
  wellGlint: 35, // ... the Glint it gives back when it does not give a relic
  pilgrimCost: 20, // Lost Pilgrim
  cacheGlint: 30, // Forgotten Cache: the wallet
  cachePurse: 15, // ... and each ally purse
  chestGlint: 25, // Trapped Chest, after the ambush
  ambush: Object.freeze({ budgetMul: 0.7, eliteAdd: 0.35, waves: 2 }),
  spot: Object.freeze({ x: 1.2, z: -3.6 }), // where the encounter stands
  bodyRadius: 0.6, // its solid footprint (bodies walk round it)
});

// cost: what Take spends · reward: what it pays · safe: the AI's choice.
export const ENCOUNTERS = Object.freeze({
  blood_shrine: {
    name: 'Blood Shrine',
    text: 'A stone bowl, dark and warm. It drinks what it is given.',
    detail: 'Every hero gives a quarter of their max HP (never below 1).',
    effect: 'Choose one of three relics.',
    cost: 'hp',
    safe: false,
  },
  wishing_well: {
    name: 'Wishing Well',
    text: 'Coins glint far down in the black water.',
    detail: 'Toss 15 Glint into the well.',
    effect: 'Half the time a relic, otherwise 35 Glint back.',
    cost: 'glint',
    price: EVENT_RULES.wellCost,
    safe: true,
  },
  trapped_chest: {
    name: 'Trapped Chest',
    text: 'An iron-bound chest, too easy to reach.',
    detail: 'Opening it springs an ambush of elites.',
    effect: 'Win the fight for 25 Glint and a choice of three relics.',
    cost: 'fight',
    safe: false,
  },
  lost_pilgrim: {
    name: 'Lost Pilgrim',
    text: 'A traveller with a lantern and a story, short of coin.',
    detail: 'Give the pilgrim 20 Glint.',
    effect: 'They teach the party: a Skill draft for every hero.',
    cost: 'glint',
    price: EVENT_RULES.pilgrimCost,
    safe: true,
  },
  corrupted_altar: {
    name: 'Corrupted Altar',
    text: 'Violet light pulses in the stone. It offers power for a price.',
    detail: 'Take a major curse for the rest of the run.',
    effect: 'Choose one of three legendary relics (rare when none are left).',
    cost: 'major',
    safe: false,
  },
  wandering_spirit: {
    name: 'Wandering Spirit',
    text: 'A pale shape that trades in old things.',
    detail: 'Give up your newest relic.',
    effect: 'Choose one of three rare or legendary relics.',
    cost: 'relic',
    safe: false,
  },
  forgotten_cache: {
    name: 'Forgotten Cache',
    text: 'Crates under a rotten tarp. Nobody has come back for them.',
    detail: 'Free.',
    effect: '30 Glint for the party purse and 15 for each ally.',
    cost: 'none',
    safe: true,
  },
  healing_spring: {
    name: 'Healing Spring',
    text: 'Clear water wells up between the stones.',
    detail: 'Free.',
    effect: 'The whole party heals to full.',
    cost: 'none',
    safe: true,
  },
});
export const ENCOUNTER_IDS = Object.freeze(Object.keys(ENCOUNTERS));

// The stream's seed, salted so it never shadows the run or relic streams.
export function encounterSeed(seed) {
  let h = ((seed >>> 0) ^ 0x45564e54) >>> 0; // 'EVNT'
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// The encounter state machine for one run. `ctx` reads what an encounter
// needs to know about the run (Glint, relics owned, free major curses), so
// the roll never offers one that cannot be taken.
export function createEncounterSystem({ events, getTick }) {
  let on = false;
  let stream = null;
  let seen = []; // encounter ids met this run (no repeat until all eight are)
  let doors = 0; // "?" doors offered this level
  let forced = null; // probe: { id, side } for the next path screen
  let armed = {}; // room -> encounter id (a "?" door that was walked through)
  // The live encounter: { id, room, state: 'idle'|'card'|'ambush'|'done',
  //   focus: 0 take | 1 leave, result }
  let live = null;

  function reset(seed, enabled) {
    on = !!enabled;
    stream = on ? createGameplayRng(encounterSeed(seed)) : null;
    seen = [];
    doors = 0;
    forced = null;
    armed = {};
    live = null;
  }

  const possible = (id, ctx) => {
    const E = ENCOUNTERS[id];
    if (E.cost === 'major') return ctx.freeMajors > 0;
    if (E.cost === 'relic') return ctx.relics > 0;
    if (E.cost === 'glint') return ctx.wallet >= E.price;
    return true;
  };

  // A path screen toward `nextRoom`: maybe one "?" door. `curseSide` is the
  // cursed door's side (the "?" never shares it). Returns { side, id } | null.
  function rollDoor(nextRoom, curseSide, ctx) {
    if (!on) return null;
    if (forced) {
      const f = forced;
      forced = null;
      doors += 1;
      return { side: curseSide === f.side ? 1 - f.side : f.side, id: f.id };
    }
    if (nextRoom < EVENT_RULES.firstRoom || nextRoom > EVENT_RULES.lastRoom) return null;
    if (doors >= EVENT_RULES.maxPerLevel) return null;
    if (!(stream.float() < EVENT_RULES.chance)) return null;
    const side = curseSide === 0 || curseSide === 1 ? 1 - curseSide : stream.int(2);
    let pool = ENCOUNTER_IDS.filter((id) => !seen.includes(id) && possible(id, ctx));
    if (pool.length === 0) {
      seen = [];
      pool = ENCOUNTER_IDS.filter((id) => possible(id, ctx));
    }
    const id = pool[stream.int(pool.length)];
    seen.push(id);
    doors += 1;
    return { side, id };
  }

  // The party walked through a "?" door toward `room`.
  function arm(room, id) {
    if (!on || !ENCOUNTERS[id]) return;
    armed[room] = id;
    events.emit(getTick(), 'event_door_taken', { room, encounter: id });
  }
  const armedAt = (room) => (on && armed[room] ? armed[room] : null);

  function enter(room) {
    const id = armedAt(room);
    if (!id) return null;
    delete armed[room];
    live = { id, room, state: 'idle', focus: 0, result: null };
    events.emit(getTick(), 'event_enter', { room, encounter: id });
    return live;
  }

  // Why Take is refused right now (null = it can be taken).
  function refusal(ctx) {
    if (!live) return 'closed';
    const E = ENCOUNTERS[live.id];
    if (E.cost === 'glint' && ctx.wallet < E.price) return 'glint';
    if (E.cost === 'relic' && ctx.relics <= 0) return 'relic';
    if (E.cost === 'major' && ctx.freeMajors <= 0) return 'major';
    return null;
  }

  // The card opens on Take, or on Leave when Take is refused.
  function open(ctx) {
    if (!live || live.state !== 'idle') return false;
    live.state = 'card';
    live.focus = ctx && refusal(ctx) ? 1 : 0;
    events.emit(getTick(), 'event_open', { room: live.room, encounter: live.id });
    return true;
  }

  function focus(i) {
    if (!live || live.state !== 'card') return null;
    live.focus = i === 1 ? 1 : 0;
    return live.focus;
  }

  function levelReset() {
    doors = 0;
    armed = {};
    live = null;
  }

  function view(ctx) {
    if (!on || !live) return null;
    const E = ENCOUNTERS[live.id];
    const why = live.state === 'card' ? refusal(ctx) : null;
    return {
      id: live.id,
      room: live.room,
      state: live.state,
      focus: live.focus,
      name: E.name,
      text: E.text,
      detail: E.detail,
      effect: E.effect,
      cost: E.cost,
      safe: E.safe,
      ...(E.price ? { price: E.price } : {}),
      ...(why ? { refused: why } : {}),
      ...(live.result ? { result: { ...live.result } } : {}),
    };
  }

  function saveState() {
    if (!on) return null;
    return {
      on,
      stream: stream.getState(),
      seen: [...seen],
      doors,
      armed: { ...armed },
      live: live ? { ...live, result: live.result ? { ...live.result } : null } : null,
    };
  }
  function loadState(d) {
    if (!d || !d.on) {
      reset(0, false);
      return;
    }
    reset(d.stream && Number.isFinite(d.stream.seed) ? d.stream.seed : 0, true);
    if (d.stream) stream.setState(d.stream);
    seen = Array.isArray(d.seen) ? d.seen.filter((id) => ENCOUNTERS[id]) : [];
    doors = Number.isFinite(d.doors) ? d.doors : 0;
    armed = {};
    if (d.armed && typeof d.armed === 'object') for (const [k, v] of Object.entries(d.armed)) if (ENCOUNTERS[v]) armed[k] = v;
    live = d.live && ENCOUNTERS[d.live.id] ? { ...d.live, result: d.live.result ? { ...d.live.result } : null } : null;
  }

  return {
    reset,
    enabled: () => on,
    rollDoor,
    arm,
    armedAt,
    enter,
    open,
    focus,
    refusal,
    live: () => live,
    // The gamble's coin (Wishing Well): one draw from the encounter stream.
    coin: () => (stream ? stream.float() < 0.5 : false),
    // A free major curse for the altar (one draw from the encounter stream).
    pick: (list) => (list.length ? list[stream.int(list.length)] : null),
    finish(state, result = null) {
      if (!live) return;
      live.state = state;
      if (result) live.result = result;
    },
    clear() {
      live = null;
    },
    force(id, side = 0) {
      if (!on || !ENCOUNTERS[id]) return null;
      forced = { id, side: side === 1 ? 1 : 0 };
      return forced;
    },
    levelReset,
    view,
    saveState,
    loadState,
  };
}
