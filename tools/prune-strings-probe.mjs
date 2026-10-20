#!/usr/bin/env node
// PRUNE OLD STRINGS probe (v0.5.326) — headless Node, no browser.
//
//   node tools/prune-strings-probe.mjs
//
// Checks:
//   1. `i18n-extract.mjs --check` passes on the committed tables, and every
//      table reports unused 0.
//   2. The 29 lines this slice pruned are gone from every table, and no
//      literal t('...') in src/ asks for one again.
//   3. The three hero critter names the check used to miss (the Bellwright's
//      Beetle, the Tidecaller's Otter, the Duskwing's Bat, shown through
//      t(CLASS_CRITTER[cls])) are in the catalog and still translated.
//   4. Every flat string table the UI shows through t(TABLE[key]) and that
//      Node can import has all its values in the catalog, so the check never
//      calls a shown line unused.
//   5. A planted unused entry in a copy of the tables fails the check and is
//      named; a deleted entry fails it as missing.
// Exit code 1 on any failure.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`);
  if (!ok) fails.push(what);
};

const PRUNED = [
  "+ SUGGEST",
  "Complete a campaign (Levels I to III).",
  "Elites are far more common in every combat room. Embers +25%.",
  "Enemies in every combat room deal 35% more damage. Embers +25%.",
  "Enemies in every combat room have 40% more HP. Embers +25%.",
  "Every wave in every combat room is half again as large. Embers +25%.",
  "Past the Barrow the road turns back into the wood, darker each time. The three lands repeat, harder at every depth, until the party falls.",
  "Score = the sum over the levels played of (100 × rooms + 5 × kills + 1000 if cleared) × level (I 1.0 · II 1.5 · III 2.0), × challenge (relaxed 0.75 · standard 1 · harrowing 1.5), plus a speed bonus on a completed campaign (900 × levels played − seconds).",
  "The {cls} leads on to the next level…",
  "The {cls} picks the door — point with ←/→ and Enter",
  "The Healer leads on…",
  "The party fell at Depth {depth}, before the Barrow. The gods applaud.",
  "Through all three lands and down again, until the party falls.",
  "Waiting for the {cls}…",
  "Wear vows to curse every combat room. Each vow pays {pct}% more {currency}.",
  "Wood · Mill · Barrow · and down again",
  "You play one of the four. The AI plays the other three, so the party is always whole.",
  "Complete a campaign (Levels I to IV).",
  "The story so far",
  "One seed for everyone",
  "Fell the first four bosses of a Boss Rush.",
  "Win a Boss Rush: all eight bosses.",
  "Win a Boss Rush in under 10 minutes.",
  "Fight in every arena: the Thornwood Ring, the Millrace Basin, the Ash Amphitheatre and the Hollow Nave.",
  "Waves in every combat room arrive 35% sooner. Embers +25%.",
  "Enemy attack warnings in every combat room are 20% shorter (never under 0.6 s). Embers +25%.",
  "Above the world stands the Still Spire, the belfry where the gods sat down to watch. The Skyhorn kept its stair, and the hollow song turned it at the top. Beside the gods sits the Hush, the silence that stopped them: the quiet the Hollow Cantor sang into. Felling either frees the Verse of Sky, and the bell rings where the gods can hear it.",
  "Where the Heart’s road forks below the Spire, the other way climbs to the Ember Kiln, where the gods fired the first bells. Every bell was tuned to the note of its fire, and the fire never went out. The hollow song found it still burning and learned to keep it. Whatever keeps the Kiln now, felling it frees the Verse of Flame, the note every bell was tuned to.",
  "The Healer chooses the road…",
];

const extract = (...args) => spawnSync(process.execPath, [join(here, 'tools/i18n-extract.mjs'), '--check', ...args], { cwd: here, encoding: 'utf8' });
const locDir = join(here, 'src/i18n/locales');
const tables = Object.fromEntries(readdirSync(locDir).filter((n) => n.endsWith('.json')).map((n) => [n, JSON.parse(readFileSync(join(locDir, n), 'utf8'))]));
const catalog = JSON.parse(readFileSync(join(here, 'src/i18n/catalog.json'), 'utf8'));

// 1. The real tables.
const real = extract();
check(real.status === 0, 'i18n-extract --check passes on the committed tables');
const reports = [...real.stdout.matchAll(/^(\S+\.json): .* unused (\d+)$/gm)];
check(reports.length === 9 && reports.every((m) => m[2] === '0'), `all nine tables report unused 0 (${reports.map((m) => m[1] + ' ' + m[2]).join(', ')})`);

// 2. The pruned lines.
check(PRUNED.length === 29, `29 pruned lines listed (${PRUNED.length})`);
const left = [];
for (const [f, t] of Object.entries(tables)) for (const k of PRUNED) if (k in t) left.push(`${f}: ${k}`);
check(left.length === 0, `no table keeps a pruned line${left.length ? ' (' + left.slice(0, 3).join('; ') + ')' : ''}`);
check(PRUNED.every((k) => !(k in catalog)), 'no pruned line is in the catalog');

// 3. The critter names.
const { CLASS_CRITTER } = await import(pathToFileURL(join(here, 'src/net/seats.js')).href);
for (const name of Object.values(CLASS_CRITTER)) {
  const inAll = Object.values(tables).every((t) => typeof t[name] === 'string' && t[name] !== '');
  check(name in catalog && inAll, `critter "${name}" is in the catalog and every table`);
}

// 4. Flat tables shown through t(TABLE[key]).
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}
const uses = new Map(); // table name -> module path it is imported from
for (const f of walk(join(here, 'src'))) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?<![\w.$])t\(\s*([A-Z][A-Z0-9_]+)\[/g)) {
    const name = m[1];
    const imp = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)].find((x) => x[1].split(',').some((s) => s.trim().split(/\s+as\s+/).pop() === name));
    if (imp) uses.set(name, resolve(dirname(f), imp[2]));
  }
}
let flat = 0;
for (const [name, path] of uses) {
  let mod;
  try {
    mod = await import(pathToFileURL(path).href);
  } catch {
    continue;
  }
  const v = mod[name];
  if (!v || typeof v !== 'object' || !Object.values(v).every((x) => typeof x === 'string')) continue;
  flat++;
  const missing = Object.values(v).filter((x) => x && !(x in catalog));
  check(missing.length === 0, `every value of ${name} is in the catalog${missing.length ? ' (missing ' + missing.join(', ') + ')' : ''}`);
}
check(flat >= 2, `flat display tables checked (${flat})`);

// 5. Planted entries in a copy.
const tmp = mkdtempSync(join(tmpdir(), 'echoes-prune-'));
try {
  cpSync(locDir, tmp, { recursive: true });
  const de = { ...tables['de.json'], 'A line the game no longer shows': 'Eine Zeile, die das Spiel nicht mehr zeigt' };
  writeFileSync(join(tmp, 'de.json'), JSON.stringify(de, null, 1) + '\n');
  const planted = extract(`--locales=${tmp}`);
  check(planted.status === 1 && /unused: A line the game no longer shows/.test(planted.stdout), 'a planted unused entry fails the check and is named');
  const ru = { ...tables['ru.json'] };
  delete ru.Beetle;
  writeFileSync(join(tmp, 'de.json'), JSON.stringify(tables['de.json'], null, 1) + '\n');
  writeFileSync(join(tmp, 'ru.json'), JSON.stringify(ru, null, 1) + '\n');
  const gone = extract(`--locales=${tmp}`);
  check(gone.status === 1 && /missing: Beetle/.test(gone.stdout), 'a deleted entry fails the check as missing');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
process.exit(fails.length ? 1 : 0);
