// DAILY DESCENT (docs/DAILY.md, content plan 2 slice 8). Owner: DAILY.
//
// One run a day that every player shares: the seed comes from the UTC date,
// so the same day gives every player the same levels, rooms, doors, bosses,
// the same fixed relic and the same fixed (major) curse from the first room.
// It plays the campaign rules from Level I to the final level, on Standard,
// with nothing equipped from the Unlocks screen, single player only.
// A run's score is how deep it got (rooms cleared across the levels) and,
// between equal depths, how fast.
//
// Pure data + helpers (sim- and server-importable): no DOM, no three, no
// imports. The plain campaign, Endless and the tutorial never read it, so
// the nine goldens are untouched.

export const DAILY_RULES = Object.freeze({
  roomsPerLevel: 8,
  challenge: 'standard',
  // A run may be posted for its own day or, finishing past midnight, the day
  // before (the server's window, server/daily.mjs).
  graceDays: 1,
  nameMax: 16,
  boardSize: 20,
});

const DAY_MS = 86400000;
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// 'YYYY-MM-DD' of `ms` in UTC.
export function dailyKey(ms = Date.now()) {
  const d = new Date(Number(ms));
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
export function isDailyKey(key) {
  const m = KEY_RE.exec(String(key ?? ''));
  if (!m) return false;
  return dailyKey(Date.UTC(+m[1], +m[2] - 1, +m[3])) === key;
}
// Whole days from `a` to `b` (both keys).
export function dayDiff(a, b) {
  if (!isDailyKey(a) || !isDailyKey(b)) return NaN;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

// FNV-1a over a string, then a murmur finalizer: a well-spread uint32.
function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0 || 0x9e3779b9;
}

// The day's run seed (the first level's frame).
export const dailySeed = (key) => hash32(`echoes-daily:${key}`);
// The seed each later level of the day is rolled from (index = the
// campaign's level index, 2, 3, ...): every player meets the same levels
// whatever they did in the one before.
export const dailyLevelSeed = (seed, index) => hash32(`echoes-daily-level:${seed >>> 0}:${index | 0}`);
// One id from `list` for the day (`salt` keeps the picks apart).
export function dailyPick(seed, list, salt) {
  if (!Array.isArray(list) || !list.length) return null;
  return list[hash32(`echoes-daily-${salt}:${seed >>> 0}`) % list.length];
}

// How deep a daily run got: rooms cleared across the levels. Earlier levels
// of the run were cleared whole (a campaign only moves on from a cleared
// level); `rooms` is the last level's count.
export function dailyDepth({ index = 1, rooms = 0, won = false, levels = 4 } = {}) {
  const per = DAILY_RULES.roomsPerLevel;
  if (won) return per * Math.max(1, levels | 0);
  return Math.max(0, ((index | 0) - 1) * per + Math.min(per, Math.max(0, rooms | 0)));
}
// Level and room of a depth, for display ({ level: 2, room: 5 } = Level II,
// 5 rooms cleared there). A depth of every room reads as the last level, 8.
export function depthPlace(depth) {
  const per = DAILY_RULES.roomsPerLevel;
  const d = Math.max(0, depth | 0);
  if (d > 0 && d % per === 0) return { level: d / per, room: per };
  return { level: Math.floor(d / per) + 1, room: d % per };
}

// Board order: deeper first, then faster, then earlier.
export function compareEntries(a, b) {
  return (b.depth | 0) - (a.depth | 0) || (a.ticks | 0) - (b.ticks | 0) || String(a.at ?? '').localeCompare(String(b.at ?? ''));
}
// Is `a` a better run than `b` (b may be null)?
export const betterEntry = (a, b) => !b || compareEntries(a, b) < 0;

// A player-typed name as the board shows it.
export function cleanName(raw, fallback = 'Wanderer') {
  const s = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DAILY_RULES.nameMax);
  return s || fallback;
}

// m:ss / h:mm:ss of a tick count (60 Hz).
export function clockOf(ticks) {
  const s = Math.max(0, Math.round((ticks | 0) / 60));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
