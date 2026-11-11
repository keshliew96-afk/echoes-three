#!/usr/bin/env node
// SHOT STAMP (docs/TESTING.md "Shot stamps"). A READY's screenshots prove the
// files they were shot from. `stamp` records a content hash of each of those
// files beside the shots; `check` says which files changed since, so a shot
// taken before a fix-first edit reads as older than the code instead of
// passing as proof of it. Hashes, not git or mtimes: a file edited and not
// committed, or restored with an old mtime, still reads CHANGED.
//
//   node tools/shot-stamp.mjs stamp <shot-dir> <file> [<file> ...]
//   node tools/shot-stamp.mjs check <shot-dir>
//
// Files are named relative to the repo root (or absolute inside it). `stamp`
// writes <shot-dir>/stamp.json; `check` exits 1 when any stamped file is
// CHANGED or GONE, 0 when every one is the same, 2 on a usage error.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const STAMP_FILE = 'stamp.json';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const hashOf = (abs) => createHash('sha256').update(readFileSync(abs)).digest('hex');
const repoPath = (p) => {
  const abs = isAbsolute(p) ? p : resolve(root, p);
  const rel = relative(root, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${p} is outside the repo`);
  return rel.split('\\').join('/');
};
const readVersion = () => {
  const m = /VERSION\s*=\s*'([^']+)'/.exec(readFileSync(join(root, 'src/version.js'), 'utf8'));
  return m ? m[1] : null;
};

export function stamp(dir, files) {
  if (!files.length) throw new Error('name the files the shots prove');
  const out = { version: readVersion(), files: {} };
  for (const f of files) {
    const rel = repoPath(f);
    const abs = join(root, rel);
    if (!existsSync(abs)) throw new Error(`${f} does not exist`);
    out.files[rel] = hashOf(abs);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, STAMP_FILE), JSON.stringify(out, null, 1) + '\n');
  return out;
}

export function check(dir) {
  const path = join(dir, STAMP_FILE);
  if (!existsSync(path)) throw new Error(`no ${STAMP_FILE} in ${dir}`);
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  const rows = Object.entries(saved.files).map(([rel, h]) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return { file: rel, state: 'GONE' };
    return { file: rel, state: hashOf(abs) === h ? 'same' : 'CHANGED' };
  });
  return { version: saved.version, rows, stale: rows.some((r) => r.state !== 'same') };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, dir, ...files] = process.argv.slice(2);
  try {
    if (cmd === 'stamp' && dir) {
      const s = stamp(resolve(dir), files);
      console.log(`stamped ${Object.keys(s.files).length} files at v${s.version} -> ${join(dir, STAMP_FILE)}`);
    } else if (cmd === 'check' && dir) {
      const r = check(resolve(dir));
      for (const row of r.rows) console.log(`${row.state.padEnd(7)} ${row.file}`);
      console.log(r.stale ? `STALE: the shots in ${dir} (v${r.version}) are older than the code` : `fresh: every file the shots prove is unchanged since v${r.version}`);
      process.exit(r.stale ? 1 : 0);
    } else {
      console.log('usage: node tools/shot-stamp.mjs stamp <shot-dir> <file> [...] | check <shot-dir>');
      process.exit(2);
    }
  } catch (e) {
    console.log(`shot-stamp: ${e.message}`);
    process.exit(2);
  }
}
