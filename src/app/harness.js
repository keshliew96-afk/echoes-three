// PLAYER-BUILD GATING (docs/TESTING.md "Player build"): the debug command
// surface (window.__echoes) and every harness URL param exist only where a
// probe can use them: the dev server (`npm run dev`), a build made with
// VITE_ECHOES_HARNESS=1, and Node (no Vite, so no import.meta.env). The
// production build (`npx vite build`, what Render serves) keeps only the
// player params below and drops every other one before any module reads it.
export const HARNESS =
  typeof import.meta.env === 'undefined' || import.meta.env.DEV === true || import.meta.env.VITE_ECHOES_HARNESS === '1';

// The params a player build honours: the language link, the title rule that
// the game's own fresh-boot reload sets (?menu=0), the fps meter, a muted
// boot, the server address (the same as Settings ▸ Network), the render
// quality and memory knobs, and the tip / story popup switches.
export const PLAYER_PARAMS = Object.freeze([
  'lang',
  'menu',
  'fps',
  'audio',
  'net',
  'bloom',
  'vignette',
  'grade',
  'outline',
  'msaa',
  'ink',
  'bandguard',
  'dressings',
  'tips',
  'story',
]);

// The page's query as the game may read it: every param in a harness build,
// only PLAYER_PARAMS in a player build.
export function gateQuery(search, harness = HARNESS) {
  const p = new URLSearchParams(search || '');
  if (harness) return p;
  for (const k of [...p.keys()]) if (!PLAYER_PARAMS.includes(k)) p.delete(k);
  return p;
}

export function pageQuery() {
  let search = '';
  try {
    search = typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '';
  } catch {
    search = '';
  }
  return gateQuery(search);
}
