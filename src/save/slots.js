// Slot catalogue + index (docs/gauntlet/PLAN.md §3.4 "Slots"). Owner: M2.
//
// manual-1 … manual-8 · auto-1 / auto-2 (autosave alternates between them so
// a torn write never costs the only autosave) · quick (F5 / F9).
// The index (echoes.save.v1.index) is a CACHE of the slot metadata: it is
// always derivable by scanning the slot keys, so a missing or corrupt index
// is rebuilt silently. scan() verifies every file (format, schema, keys,
// hash), so the menu can mark a damaged slot before the player tries it.
import { parseFile } from './codec.js';
import { SAVE_PREFIX, INDEX_KEY } from './storage.js';

export const MANUAL_SLOTS = Object.freeze(['manual-1', 'manual-2', 'manual-3', 'manual-4', 'manual-5', 'manual-6', 'manual-7', 'manual-8']);
export const AUTO_SLOTS = Object.freeze(['auto-1', 'auto-2']);
export const QUICK_SLOT = 'quick';
export const ALL_SLOTS = Object.freeze([...MANUAL_SLOTS, ...AUTO_SLOTS, QUICK_SLOT]);

export const slotKey = (id) => `${SAVE_PREFIX}${id}`;
export const isSlotId = (id) => ALL_SLOTS.includes(id);
export function slotKind(id) {
  if (AUTO_SLOTS.includes(id)) return 'auto';
  if (id === QUICK_SLOT) return 'quick';
  return 'manual';
}
export function defaultSlotName(id) {
  if (AUTO_SLOTS.includes(id)) return 'Autosave';
  if (id === QUICK_SLOT) return 'Quicksave';
  const n = MANUAL_SLOTS.indexOf(id);
  return n >= 0 ? `Slot ${n + 1}` : id;
}

// SlotMeta from a parsed file (what the menu, the title's Continue and the
// index show).
export function metaOf(file, { id, bytes, status = 'ok', thumb = false, detail = null }) {
  return {
    id,
    kind: slotKind(id),
    name: (file.slot && file.slot.name) || defaultSlotName(id),
    createdAt: file.createdAt ?? null,
    savedAt: file.savedAt ?? null,
    game: file.game ?? null,
    schema: file.schema ?? null,
    hash: file.hash ?? null,
    bytes,
    status, // 'ok' | 'damaged' | 'newer'
    detail,
    thumb,
    meta: file.meta ?? {},
  };
}

// scan(store) -> { [id]: SlotMeta } — every slot key verified.
export function scanSlots(store) {
  const out = {};
  for (const id of ALL_SLOTS) {
    const text = store.read(slotKey(id));
    if (text === null) continue;
    const r = parseFile(text);
    const thumb = store.read(`${slotKey(id)}.thumb`) !== null;
    const bytes = text.length;
    if (r.ok) {
      out[id] = metaOf(r.file, { id, bytes, thumb });
      continue;
    }
    const f = r.file && typeof r.file === 'object' ? r.file : {};
    out[id] = metaOf(f, { id, bytes, thumb, status: r.error === 'version' ? 'newer' : 'damaged', detail: r.detail || r.error });
    out[id].error = r.error;
    out[id].backup = backupMeta(store, id);
  }
  return out;
}

// The .bak copy of a slot, if it is a valid save (offered when main fails).
export function backupMeta(store, id) {
  const text = store.read(`${slotKey(id)}.bak`);
  if (text === null) return null;
  const r = parseFile(text);
  if (!r.ok) return null;
  return metaOf(r.file, { id, bytes: text.length });
}

// The index text is a pure function of the slots (catalogue order), so every
// tab that scans the same storage writes the same bytes: a tab compares the
// stored index with the one it last wrote to see that another tab changed a
// slot (SAVE4-F1, index.js ensureFresh). -> { ok, text (what is stored now) }
export function writeIndex(store, slots) {
  const idx = { v: 1, slots: {} };
  for (const id of ALL_SLOTS) {
    const m = slots[id];
    if (!m) continue;
    idx.slots[id] = { id, kind: m.kind, name: m.name, savedAt: m.savedAt, status: m.status, bytes: m.bytes, hash: m.hash };
  }
  const text = JSON.stringify(idx);
  const w = store.writePlain(INDEX_KEY, text);
  return { ...w, text: w.ok ? text : store.read(INDEX_KEY) };
}
