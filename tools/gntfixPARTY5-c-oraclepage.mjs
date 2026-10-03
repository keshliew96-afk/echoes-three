// page partyPools / partyVerdicts == Node world's (which the oracle checker verified 440/440) + count vs oracle JSON
import { launch, open, E } from './gntfixPARTY5-lib.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const { createGameplayRng } = await import(u('src/core/rng.js'));
const { createRegistry } = await import(u('src/core/registry.js'));
const { createEventBus } = await import(u('src/core/events.js'));
const { createClock } = await import(u('src/core/clock.js'));
const { createWorld } = await import(u('src/sim/world.js'));
const clock = createClock();
const world = createWorld({ rng: createGameplayRng(7), registry: createRegistry(), events: createEventBus(), harness: false, requestHitstop: clock.requestHitstop, room: null });
const nPools = world.cmd('partyPools'); const nVer = world.cmd('partyVerdicts');
const b = await launch();
try {
  const { page, errors } = await open(b, (process.env.GNTC_BASE || 'http://127.0.0.1:5199/') + '?menu=0&seed=7');
  const r = await E(page, () => ({ pools: window.__echoes.cmd('partyPools'), verdicts: window.__echoes.cmd('partyVerdicts') }));
  let cells = 0, diff = [];
  const counts = { live: 0, grey: 0, inert: 0 };
  for (const cls of Object.keys(nVer)) for (const sk of Object.keys(nVer[cls])) for (const nd of Object.keys(nVer[cls][sk])) { cells++; const a = nVer[cls][sk][nd], p = r.verdicts[cls] && r.verdicts[cls][sk] && r.verdicts[cls][sk][nd]; counts[a] = (counts[a] || 0) + 1; if (a !== p) diff.push(`${cls}.${sk}.${nd}: node ${a} page ${p}`); }
  const oracle = JSON.parse(readFileSync('docs/gauntlet/party-oracle.json', 'utf8'));
  console.log(JSON.stringify({ poolsEqual: JSON.stringify(nPools) === JSON.stringify(r.pools), cells, diff: diff.length, diffs: diff.slice(0, 5), counts, oracleKeys: Object.keys(oracle).slice(0, 10), errors }, null, 1));
} finally { await b.close(); }
