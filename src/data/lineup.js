// PARTY LINEUP (docs/LINEUP.md) — which class holds which of the four seats
// in a run. Until v0.5.258 seat == class everywhere (data/classes.js
// CLASS_OF_SEAT: 0 Healer, 1 Tank, 2 Swordsman, 3 Archer); a lineup lets a
// later class take one of the three ally seats while the class it replaces
// stays at camp (the Tidecaller plan, /mnt/project-files/plan/
// NEW_CHARACTER_TIDECALLER.md). Still four seats, four bodies; the player
// chooses who joins.
//
// Rules: the Healer always holds seat 0 (the bell-carrier and the leader
// bot); seats 1-3 hold three DISTINCT classes from LINEUP_CLASSES. Anything
// else normalises to DEFAULT_LINEUP, which is exactly the old mapping, so a
// run that never names a lineup is byte-for-byte the run it always was (the
// nine goldens, the replays, every save without a lineup).
//
// The ACTIVE lineup is the one the live run uses. The sim's party system
// (sim/party.js setLineup / loadState) is its owner and is the only writer on
// a host or solo game; a network guest mirrors it from the replicated ally
// bodies (syncLineupFromBodies). Every reader — HUD, shop, draft, camp,
// relics, the guest predictor — asks classOfSeat() / seatOfClass() instead of
// indexing CLASS_OF_SEAT. One page runs one game, so one module-level value
// is enough; it changes only at a run start, a load or a guest snapshot.
import { CLASS_OF_SEAT } from './classes.js';

export const DEFAULT_LINEUP = CLASS_OF_SEAT;
// The classes that may hold an ally seat (1-3), in seat order. A new class
// joins here. THE TIDECALLER (docs/TIDECALLER.md) is the fifth: the player
// composes the team by choosing who JOINS (the Healer always does), so the
// roster can keep growing.
export const LINEUP_CLASSES = Object.freeze(['tank', 'swordsman', 'archer', 'tidecaller']);
// Today's party: the joiners an unchosen team falls back on, in fill order.
export const DEFAULT_TEAM = Object.freeze(['tank', 'swordsman', 'archer']);
// THE TIDECALLER is free from the start in this slice. The Level II boss
// unlock replaces this one flag (the plan's slice 4).
export const TIDECALLER_FREE = true;
export const tidecallerOpen = () => TIDECALLER_FREE;
const joinable = (c) => LINEUP_CLASSES.includes(c) && (c !== 'tidecaller' || tidecallerOpen());

// The joiners a setting names ('tank,archer' or an array): known, open,
// distinct, at most three, in the order given.
export function parseTeam(raw) {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const out = [];
  for (const c of list.map((x) => String(x).trim())) if (joinable(c) && !out.includes(c) && out.length < 3) out.push(c);
  return out;
}

// The lineup a new campaign takes from the player's two choices: the class
// they play (`gameplay.playClass`) and who joins the team (`gameplay.team`,
// up to three of LINEUP_CLASSES). The class you play always joins: it
// takes the place of the last other pick when the team is full. A team short
// of three is filled from today's party, so an unchosen team is the default
// four. The joiners sit in seat order (LINEUP_CLASSES), so the default team
// is exactly DEFAULT_LINEUP.
export function plannedLineup(playClass, team) {
  const t = parseTeam(team);
  if (joinable(playClass) && !t.includes(playClass)) {
    if (t.length >= 3) t.splice(t.length - 1, 1);
    t.push(playClass);
  }
  for (const c of [...DEFAULT_TEAM, ...LINEUP_CLASSES]) if (t.length < 3 && joinable(c) && !t.includes(c)) t.push(c);
  return normalizeLineup(['healer', ...LINEUP_CLASSES.filter((c) => t.includes(c))]);
}

// A valid lineup array (frozen), or DEFAULT_LINEUP.
export function normalizeLineup(raw) {
  if (!Array.isArray(raw) || raw.length !== 4 || raw[0] !== 'healer') return DEFAULT_LINEUP;
  const allies = raw.slice(1);
  if (!allies.every((c) => LINEUP_CLASSES.includes(c))) return DEFAULT_LINEUP;
  if (new Set(allies).size !== 3) return DEFAULT_LINEUP;
  if (allies.includes('tidecaller') && !tidecallerOpen()) return DEFAULT_LINEUP;
  if (isDefaultLineup(raw)) return DEFAULT_LINEUP;
  return Object.freeze([...raw]);
}

export const isDefaultLineup = (l) => Array.isArray(l) && l.length === 4 && l.every((c, i) => c === DEFAULT_LINEUP[i]);
export const sameLineup = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((c, i) => c === b[i]);
// The classes a lineup leaves at camp (the Tidecaller for the default four).
export const benchOf = (l) => LINEUP_CLASSES.filter((c) => !normalizeLineup(l).includes(c));
// The three who join the Healer in a lineup.
export const teamOf = (l) => normalizeLineup(l).slice(1);

let active = DEFAULT_LINEUP;

export const activeLineup = () => active;
export function setActiveLineup(l) {
  active = normalizeLineup(l);
  return active;
}
// The class on a seat in the active lineup (null off the four seats).
export const classOfSeat = (i) => active[i] ?? null;
// The seat a class holds in the active lineup (-1 when it is at camp).
export const seatOfClass = (cls) => active.indexOf(cls);

// A guest's mirror: the lineup the replicated ally bodies show (each ally
// entity carries partyIndex + classId). Bodies missing (between snapshots,
// before the first one) leave the active lineup as it is.
export function syncLineupFromBodies(entities) {
  const l = ['healer', null, null, null];
  for (const e of entities) {
    if (!e || e.kind !== 'ally' || !Number.isInteger(e.partyIndex)) continue;
    if (e.partyIndex >= 1 && e.partyIndex <= 3 && typeof e.classId === 'string') l[e.partyIndex] = e.classId;
  }
  if (l.some((c) => c === null)) return active;
  if (!sameLineup(l, active)) active = normalizeLineup(l);
  return active;
}
