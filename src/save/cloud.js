// Cloud saves and backup files (docs/CLOUD_SAVES.md): the whole local save —
// the profile (records, Embers, unlocks) plus every save slot — as one
// bundle, and the way back. The same bundle goes to the session server under
// a short code (Save to cloud) or to a file on disk (Save a backup file).
//
//   makeBundle(store, { game })   -> bundle  { kind: 'echoes-cloud', v: 1, game, savedAt, profile, slots }
//   readBundle(value)             -> { ok, bundle, summary } | { ok: false, error }
//   applyBundle(store, bundle)    -> { ok } | { ok: false, error } — replaces the
//                                    local profile and slots, then FREEZES the
//                                    store: the caller reloads the page.
//
// Slot pictures (.thumb) stay out: they are large and the next save of that
// slot takes a new one. Settings (language, keys, volume) are this device's
// own and are never in a bundle.
import { parseFile } from './codec.js';
import { PROFILE_KEY, INDEX_KEY } from './storage.js';
import { ALL_SLOTS, slotKey, isSlotId } from './slots.js';
import { parseProfile } from './profile.js';

export const BUNDLE_KIND = 'echoes-cloud';
export const BUNDLE_V = 1;

export function makeBundle(store, { game = null } = {}) {
  const slots = {};
  for (const id of ALL_SLOTS) {
    const text = store.read(slotKey(id));
    if (text !== null && parseFile(text).ok) slots[id] = text;
  }
  const p = store.read(PROFILE_KEY);
  return { kind: BUNDLE_KIND, v: BUNDLE_V, game, savedAt: new Date().toISOString(), profile: p !== null && parseProfile(p) ? p : null, slots };
}

// A bundle from the server or a file: checked before anything is replaced.
// error: 'not_a_bundle' | 'newer' (made by a newer game) | 'corrupt' | 'empty'
export function readBundle(value) {
  let b = value;
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b);
    } catch {
      return { ok: false, error: 'not_a_bundle' };
    }
  }
  if (!b || typeof b !== 'object' || b.kind !== BUNDLE_KIND) return { ok: false, error: 'not_a_bundle' };
  if (b.v !== BUNDLE_V) return { ok: false, error: b.v > BUNDLE_V ? 'newer' : 'not_a_bundle' };
  if (!b.slots || typeof b.slots !== 'object') return { ok: false, error: 'not_a_bundle' };
  const ids = Object.keys(b.slots).filter(isSlotId);
  let latest = null;
  for (const id of ids) {
    const pf = parseFile(b.slots[id]);
    if (!pf.ok) return { ok: false, error: pf.error === 'version' && /newer/.test(String(pf.detail)) ? 'newer' : 'corrupt', detail: `${id}: ${pf.detail || pf.error}` };
    const at = pf.file.savedAt || null;
    if (at && (!latest || at > latest)) latest = at;
  }
  const profile = b.profile != null ? parseProfile(b.profile) : null;
  if (b.profile != null && !profile) return { ok: false, error: 'corrupt', detail: 'profile' };
  if (!profile && !ids.length) return { ok: false, error: 'empty' };
  const summary = {
    slots: ids.length,
    latest,
    savedAt: typeof b.savedAt === 'string' ? b.savedAt : latest,
    game: typeof b.game === 'string' ? b.game : null,
    embers: profile && profile.meta && Number.isFinite(profile.meta.embers) ? profile.meta.embers : 0,
    runs: profile && profile.records && Number.isFinite(profile.records.runs) ? profile.records.runs : null,
  };
  return { ok: true, bundle: b, summary, ids };
}

export function applyBundle(store, value) {
  const r = readBundle(value);
  if (!r.ok) return r;
  const { bundle, ids } = r;
  // Every slot first (the profile last): a write refused half-way leaves the
  // old profile, which still matches most of what is on disk.
  for (const id of ALL_SLOTS) {
    const key = slotKey(id);
    store.remove(`${key}.thumb`);
    store.remove(`${key}.tmp`);
    if (ids.includes(id)) {
      const w = store.writeAtomic(key, bundle.slots[id]);
      if (!w.ok) return { ok: false, error: w.error };
    } else {
      store.remove(key);
      store.remove(`${key}.bak`);
    }
  }
  store.remove(INDEX_KEY); // rebuilt from the slots on the next boot
  if (bundle.profile != null) {
    store.remove(`${PROFILE_KEY}.tmp`);
    const w = store.writeAtomic(PROFILE_KEY, bundle.profile);
    if (!w.ok) return { ok: false, error: w.error };
  }
  store.freeze();
  return { ok: true, summary: r.summary };
}
