#!/usr/bin/env node
// TEST SAFETY NET probe (code review finding 12, docs/TESTING.md "npm test"),
// headless, no browser. Checks the net itself, so it cannot quietly rot:
//   1. every relative import of every script in tools/ resolves (probes whose
//      critic libraries were never committed live in tools/retired/);
//   2. `npm test` runs tools/test.mjs and every probe in its suite exists;
//   3. the CI job runs `npm test` and `vite build` on pushes to gauntlet and
//      on pull requests;
//   4. `i18n-extract --check` writes nothing: on a copy of src/ with a stale
//      catalog it exits 1, says so, and leaves the file byte for byte;
//   5. no probe pins the game to one exact version (they read src/version.js
//      and ask for "this version or later").
//
//   node tools/test-safety-net-probe.mjs
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, cpSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const tools = join(root, 'tools');
const fails = [];
const check = (ok, what, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${!ok && detail !== undefined ? ` ${JSON.stringify(detail).slice(0, 400)}` : ''}`);
  if (!ok) fails.push(what);
};

// 1. Relative imports (static, dynamic and side-effect) resolve.
const scripts = readdirSync(tools).filter((f) => /\.(mjs|js)$/.test(f));
const resolves = (from, spec) => {
  const p = resolve(dirname(from), spec);
  return [p, `${p}.js`, `${p}.mjs`, join(p, 'index.js')].some((c) => existsSync(c) && statSync(c).isFile());
};
const broken = [];
for (const f of scripts) {
  const path = join(tools, f);
  const src = readFileSync(path, 'utf8');
  for (const m of src.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
    if (!resolves(path, m[1])) broken.push(`${f}: ${m[1]}`);
  }
}
check(broken.length === 0, `every relative import of the ${scripts.length} scripts in tools/ resolves`, broken.slice(0, 10));

// 2. npm test and its suite.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
check(/node tools\/test\.mjs/.test(pkg.scripts?.test || ''), `package.json "test" runs tools/test.mjs (${pkg.scripts?.test})`);
const { SUITE } = await import('./test.mjs');
const missing = SUITE.filter((p) => !existsSync(join(root, p.file))).map((p) => p.file);
check(SUITE.length >= 15 && missing.length === 0, `the npm test suite names ${SUITE.length} probes, all present`, missing);
check(SUITE.some((p) => p.file === 'tools/gntM2-goldens.mjs') && SUITE.some((p) => p.file === 'tools/i18n-extract.mjs' && p.args.includes('--check')), 'the suite holds the nine goldens and the language check');
// (a probe may load puppeteer behind a flag the suite does not pass)
const browsers = SUITE.filter((p) => p.file !== 'tools/test-safety-net-probe.mjs' && /from\s+['"]puppeteer['"]|gnt-arch-browser/.test(readFileSync(join(root, p.file), 'utf8'))).map((p) => p.file);
check(browsers.length === 0, 'no probe in the suite loads a browser up front', browsers);

// 3. The CI job.
const wfPath = join(root, '.github/workflows/test.yml');
const wf = existsSync(wfPath) ? readFileSync(wfPath, 'utf8') : '';
check(/push:\s*\n\s*branches:\s*\[gauntlet\]/.test(wf) && /pull_request:/.test(wf), 'CI runs on pushes to gauntlet and on pull requests');
check(/node-version:\s*22/.test(wf) && /run: npm test/.test(wf) && /run: npx vite build/.test(wf), 'CI runs npm test and vite build on Node 22');

// 4. i18n-extract --check writes nothing.
const tmp = mkdtempSync(join(tmpdir(), 'safety-net-'));
try {
  cpSync(join(root, 'src'), join(tmp, 'src'), { recursive: true });
  mkdirSync(join(tmp, 'tools'));
  cpSync(join(tools, 'i18n-extract.mjs'), join(tmp, 'tools/i18n-extract.mjs'));
  const cat = join(tmp, 'src/i18n/catalog.json');
  const fresh = spawnSync(process.execPath, ['tools/i18n-extract.mjs', '--check'], { cwd: tmp, encoding: 'utf8' });
  check(fresh.status === 0 && readFileSync(cat, 'utf8') === readFileSync(join(root, 'src/i18n/catalog.json'), 'utf8'), `--check passes on the committed tree (exit ${fresh.status})`, fresh.stdout.split('\n').slice(-4));
  const stale = '{\n "stale": { "files": [] }\n}\n';
  writeFileSync(cat, stale);
  const run = spawnSync(process.execPath, ['tools/i18n-extract.mjs', '--check'], { cwd: tmp, encoding: 'utf8' });
  check(run.status === 1 && /catalog\.json is out of date/.test(run.stdout) && readFileSync(cat, 'utf8') === stale, `--check on a stale catalog exits 1, says so and leaves it as it was (exit ${run.status})`);
  const write = spawnSync(process.execPath, ['tools/i18n-extract.mjs'], { cwd: tmp, encoding: 'utf8' });
  check(write.status === 0 && readFileSync(cat, 'utf8') === readFileSync(join(root, 'src/i18n/catalog.json'), 'utf8'), 'without --check it rewrites the catalog as before');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// 5. No exact version pins.
const pins = [];
for (const f of scripts) {
  const src = readFileSync(join(tools, f), 'utf8');
  if (/\bVERSION\s*===?\s*['"]\d+\.\d+\.\d+['"]/.test(src)) pins.push(f);
}
check(pins.length === 0, 'no probe checks VERSION against one exact number', pins);

console.log(fails.length ? `${fails.length} FAIL` : 'safety net holds');
process.exit(fails.length ? 1 : 0);
