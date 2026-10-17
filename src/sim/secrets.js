// SECRET ROOMS (docs/SECRET_ROOMS.md, content plan 5 slice 3): something
// hidden in the rooms. From room 4 on, a plain fight can hide a CRACKED WALL
// against the room's edge: a faint seam of light and a draught of dust give
// it away. A bomb bursting beside it, or a heavy hit (one skill hit of 12 or
// more) from a hero a person plays, breaks it open while the fight is on.
// Once the room's reward and relic pick are done, the party steps through the
// breach into a HIDDEN CHAMBER holding one of:
//   hoard    three small Glint piles (walk over them)
//   relic    a reliquary (E): a relic pick from the common pool
//   tonics   a cache (E): two tonics into empty carry slots (Glint for each
//            one no slot can take)
//   lore     a lectern (E): a page of the land's lore for the Journal, and a
//            little Glint
//   event    a rare event: one of the land's encounters stands in the dark
// Nothing in a chamber can hurt the party, and nothing in it lasts past the
// run (no new currency). Then the doors, as after any room.
//
//   - Rolls: a pure hash of the level's frame seed and index and the room
//     (never the run stream), so the Daily shows everyone the same walls.
//     Rooms 4-6 of a level, plain fights only (kill_all, defend): never an
//     objective, champion, event, vault, shop or boss room. At most one wall
//     a level.
//   - The AI seats never open a wall (their bombs and hits pass it by); the
//     autopilot does, so the probes can reach a chamber.
//   - A wall left shut when the room ends is missed; the end card counts the
//     secrets found of the walls seen.
//
// WHERE: campaign runs only (Endless and the Daily included), never the
// tutorial and never the legacy single-level run, so the nine goldens never
// see a wall. Sim only: no DOM, no i18n.
import { fnv1a64Hex } from '../core/hash.js';

export const SECRET_RULES = Object.freeze({
  rooms: Object.freeze([4, 6]), // the rooms a wall can stand in
  modes: Object.freeze(['kill_all', 'defend']), // plain fights only
  chance: 0.75, // each such room rolls this (until the level's one wall shows)
  maxPerLevel: 1,
  heavyMin: 12, // a skill hit of at least this base damage breaks a wall
  bombReach: 0.9, // u past the bomb's own radius that still reaches the wall
  knockEveryTicks: 12, // a light knock's dust at most this often
  wall: Object.freeze({ hx: 0.85, hz: 0.24 }), // the slab's footprint (local x along the room's edge)
  // Where a wall can stand: along the far wall and the two side walls'
  // upper halves, flush with the boundary. [x, z, yaw]
  spots: Object.freeze([
    Object.freeze([-8.4, -7.66, 0]),
    Object.freeze([-2.8, -7.66, 0]),
    Object.freeze([2.8, -7.66, 0]),
    Object.freeze([8.4, -7.66, 0]),
    Object.freeze([-11.66, -3.9, Math.PI / 2]),
    Object.freeze([11.66, -3.9, -Math.PI / 2]),
  ]),
  // What a chamber holds, by weight.
  contents: Object.freeze({ hoard: 30, relic: 20, tonics: 20, lore: 15, event: 15 }),
  hoardGlint: 10, // each of the three piles, to the Healer's wallet...
  hoardPurse: 5, // ...and to each ally purse
  loreGlint: 15, // the lectern's purse beside its page
  tonicGlint: 12, // paid for a cache tonic no empty slot can take
  pickupRadius: 0.95, // u, a hero this close to a pile takes it
  revealSec: 1.2, // s, a body's opening plays before the chamber pays
  relicSource: 'secret', // the reliquary's pick (the common pool)
  // The chamber's shape: the party walks in at the centre, the treasure
  // waits at the top of the light. A spot blocked by the clearing's props
  // moves to the first clear one of its row.
  spotsIn: Object.freeze({
    body: Object.freeze([[0, -3.5], [0, -2.8], [0, -4.2]]),
    piles: Object.freeze([
      Object.freeze([[-1.7, -3.0], [-2.2, -2.4], [-1.3, -3.8]]),
      Object.freeze([[0, -3.9], [0, -3.2], [0.6, -4.4]]),
      Object.freeze([[1.7, -3.0], [2.2, -2.4], [1.3, -3.8]]),
    ]),
    light: Object.freeze([0, -2.4]),
  }),
  // The encounters a chamber never holds (the trapped chest is a fight).
  noEvents: Object.freeze(['trapped_chest']),
});

export const SECRET_CONTENT_IDS = Object.freeze(Object.keys(SECRET_RULES.contents));

// The chamber's bodies (E · Open etc.), one per non-pile content.
export const SECRET_BODY = Object.freeze({
  relic: Object.freeze({ verb: 'Open', spentLabel: 'Opened', interactRadius: 1.1, radius: 0.5 }),
  tonics: Object.freeze({ verb: 'Open', spentLabel: 'Opened', interactRadius: 1.1, radius: 0.5 }),
  lore: Object.freeze({ verb: 'Read', spentLabel: 'Read', interactRadius: 1.1, radius: 0.45 }),
});

// THE LORE PAGES: two for each land, found in its chambers; the Journal
// keeps the pages a player has read. Names and text are English keys the UI
// shows through t() (docs/I18N.md).
export const LORE_PAGES = Object.freeze([
  Object.freeze({ id: 'wood_tally', land: 'wood', name: "A Warden's Tally", text: 'Notched into a slate in a careful hand: one cut for every beast the Stag turned back at the treeline. The last row of notches is violet, and none of them is finished.' }),
  Object.freeze({ id: 'wood_seeds', land: 'wood', name: 'The Seed Ledger', text: 'The foresters kept the oldest seeds here, out of the rain and out of the song. The jars are empty now. Something took them out one at a time and planted them in rows.' }),
  Object.freeze({ id: 'mill_rule', land: 'mill', name: "The Miller's Rule", text: 'Never grind when the race runs backwards. Never grind after dark. Never grind if the wheel starts to hum. Below it, in a wetter hand: it hums every night now.' }),
  Object.freeze({ id: 'mill_bottle', land: 'mill', name: 'A Note in a Bottle', text: 'If the sluices close, the river will remember the old way round. Let it. Water that is kept too long forgets what it was for.' }),
  Object.freeze({ id: 'barrow_roster', land: 'barrow', name: "The Ringers' Roster", text: 'Twelve names, each with an hour beside it. Eleven are struck through in violet. The twelfth hour is left blank, as if whoever wrote it meant to come back.' }),
  Object.freeze({ id: 'barrow_grave', land: 'barrow', name: 'A Grave Inscription', text: 'Here lies one who sang along. Do not answer if you hear him. He will only ever sing back what you say.' }),
  Object.freeze({ id: 'heart_draft', land: 'heart', name: "The Cantor's Draft", text: 'The same verse, copied out a hundred times, each copy a little more hollow than the last. In the margin: if I sing it enough, it will be mine.' }),
  Object.freeze({ id: 'heart_rubbing', land: 'heart', name: 'A Crystal Rubbing', text: 'Pressed into the violet crystal like a leaf in a book: the shape of a bell, and under it one word, home.' }),
  Object.freeze({ id: 'spire_service', land: 'spire', name: 'The Order of Service', text: 'First the gods sit. Then the bells are rung. Then the gods sing. Someone has struck out the last line and written beside it: then they listen.' }),
  Object.freeze({ id: 'spire_clock', land: 'spire', name: "The Clockmaker's Apology", text: 'I built them a clock so they would know when to stand. They never looked at it. I am sorry the hours ran on without them.' }),
]);
export const LORE_IDS = Object.freeze(LORE_PAGES.map((p) => p.id));
export const LORE_BY_ID = Object.freeze(Object.fromEntries(LORE_PAGES.map((p) => [p.id, p])));

const hash32 = (s) => parseInt(fnv1a64Hex(s).slice(0, 8), 16) >>> 0;
const unit = (s) => hash32(s) / 0x100000000;
const key = (seed, index, room) => `${seed >>> 0}:${index | 0}:${room | 0}`;

// Does room `room` of this level hide a wall (before the per-level cap)?
export function wallRolls(seed, index, room, mode) {
  const R = SECRET_RULES;
  if (!(room >= R.rooms[0] && room <= R.rooms[1]) || !R.modes.includes(mode)) return false;
  return unit(`${key(seed, index, room)}:SECRET`) < R.chance;
}
// The wall's preferred spot (an index into SECRET_RULES.spots).
export function wallPref(seed, index, room) {
  return hash32(`${key(seed, index, room)}:SECRET_SPOT`) % SECRET_RULES.spots.length;
}
// What the chamber behind it holds.
export function chamberContent(seed, index, room) {
  const W = SECRET_RULES.contents;
  let u = unit(`${key(seed, index, room)}:SECRET_HOLDS`) * SECRET_CONTENT_IDS.reduce((n, id) => n + W[id], 0);
  for (const id of SECRET_CONTENT_IDS) {
    u -= W[id];
    if (u < 0) return id;
  }
  return SECRET_CONTENT_IDS[0];
}
// The land's page a lectern holds (the land's first page when it has none).
export function chamberPage(seed, index, room, land) {
  const here = LORE_PAGES.filter((p) => p.land === land);
  const list = here.length ? here : LORE_PAGES;
  return list[hash32(`${key(seed, index, room)}:SECRET_PAGE`) % list.length].id;
}
// The rare event a chamber holds, from `ids` (the land's encounters).
export function chamberEvent(seed, index, room, ids) {
  const list = ids.filter((id) => !SECRET_RULES.noEvents.includes(id));
  return list.length ? list[hash32(`${key(seed, index, room)}:SECRET_EVENT`) % list.length] : null;
}

// The secret system: the level's wall, the live chamber and the run's count.
// Plain state, saved with the run (present only when on).
export function createSecretSystem({ registry, events, getTick }) {
  let on = false;
  let walls = 0; // walls shown this level
  // wall: null | { id, room, x, z, yaw, state: 'shut'|'open', how?, by?, content }
  let wall = null;
  // chamber: null | { room, content, state: 'shut'|'open'|'done', page?, encounter?, glint, payAt?, paid? }
  let chamber = null;
  let found = 0; // walls opened this run
  let seen = 0; // walls shown this run
  let pages = []; // lore pages read this run
  let knockAt = -999;

  const r2 = (v) => Math.round(v * 100) / 100;
  const heroes = () => registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0);
  function toucher(e) {
    for (const h of heroes()) if (Math.hypot(h.x - e.x, h.z - e.z) <= SECRET_RULES.pickupRadius + (h.radius ?? 0.3)) return h;
    return null;
  }

  return {
    reset(enabled) {
      on = !!enabled;
      walls = 0;
      wall = null;
      chamber = null;
      found = 0;
      seen = 0;
      pages = [];
      knockAt = -999;
    },
    enabled: () => on,
    canPlace: () => on && walls < SECRET_RULES.maxPerLevel && !wall,
    // A wall stands in the room (run.js spawned its body).
    placed(rec) {
      wall = { ...rec, state: 'shut' };
      walls += 1;
      seen += 1;
      return wall;
    },
    wall: () => wall,
    shut: () => !!(wall && wall.state === 'shut'),
    // The wall breaks open (`how`: 'bomb' | 'hit' | 'probe').
    open(how, by) {
      if (!wall || wall.state !== 'shut') return null;
      wall.state = 'open';
      wall.how = how;
      wall.by = by ?? null;
      found += 1;
      return wall;
    },
    // A light blow: dust, at most every few ticks. True when it shows.
    knock() {
      const t = getTick();
      if (t - knockAt < SECRET_RULES.knockEveryTicks) return false;
      knockAt = t;
      return true;
    },
    // Does the party walk into a chamber before the doors?
    chamberDue: (room) => !!(on && wall && wall.state === 'open' && wall.room === room && !chamber),
    enterChamber(room, content, extra = {}) {
      chamber = { room, content, state: 'shut', glint: 0, ...extra };
      return chamber;
    },
    chamber: () => chamber,
    notePage(id) {
      if (!pages.includes(id)) pages.push(id);
    },
    // The room is left behind: its wall (found or missed) and chamber go.
    leaveRoom() {
      wall = null;
      chamber = null;
    },
    levelReset() {
      walls = 0;
      wall = null;
      chamber = null;
    },
    toucher,
    view() {
      return {
        found,
        seen,
        ...(pages.length ? { pages: [...pages] } : {}),
        ...(wall ? { wall: { room: wall.room, x: r2(wall.x), z: r2(wall.z), state: wall.state, ...(wall.how ? { how: wall.how } : {}) } } : {}),
        ...(chamber ? { chamber: { ...chamber } } : {}),
      };
    },
    summary: () => ({ found, seen }),
    saveState: () => ({ on, walls, wall: wall ? { ...wall } : null, chamber: chamber ? { ...chamber } : null, found, seen, pages: [...pages], knockAt }),
    loadState(d) {
      on = !!(d && d.on);
      walls = d && Number.isFinite(d.walls) ? d.walls : 0;
      wall = d && d.wall ? { ...d.wall } : null;
      chamber = d && d.chamber ? { ...d.chamber } : null;
      found = d && Number.isFinite(d.found) ? d.found : 0;
      seen = d && Number.isFinite(d.seen) ? d.seen : 0;
      pages = d && Array.isArray(d.pages) ? d.pages.filter((id) => LORE_BY_ID[id]) : [];
      knockAt = d && Number.isFinite(d.knockAt) ? d.knockAt : -999;
    },
  };
}
