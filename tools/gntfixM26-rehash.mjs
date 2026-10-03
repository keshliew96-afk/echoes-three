// Save critic r6 — Node-side crafting helper: parse a save file's canonical text, mutate it, recompute the
// integrity hash with the game's own pure hash module (imported read-only), return the new text.
import { hashState } from '../src/core/hash.js';
import { canonicalJSON, parseCanonical } from '../src/core/canonical.js';
export function parse(text) { return parseCanonical(text); }
export function rehash(text, mutate, { keepHash = false } = {}) {
  const o = parseCanonical(text);
  const r = mutate(o) || o;
  if (!keepHash) r.hash = hashState(r.state);
  return canonicalJSON(r);
}
export function selfCheck(text) { const o = parseCanonical(text); return hashState(o.state) === o.hash; }
