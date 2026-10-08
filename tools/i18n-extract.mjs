#!/usr/bin/env node
// LANGUAGES (docs/I18N.md) — collect every translatable line into
// src/i18n/catalog.json and check the language tables against it.
//
//   node tools/i18n-extract.mjs            rewrite src/i18n/catalog.json
//   node tools/i18n-extract.mjs --check    also list, per language, missing
//                                          keys and placeholder mismatches
//                                          (exit 1 when any)
//
// Keys come from two places:
//   1. literal first arguments of t('...') and the two literal forms of
//      tn(n, '...', '...') anywhere in src/ outside sim/, core/ and i18n/;
//   2. the English names and descriptions in the data tables the UI shows
//      through t(value): every string under a display field (name, text,
//      desc, blurb, ...) of every export of src/sim/** and src/data/**.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const { LANGUAGES } = await import('../src/i18n/index.js');
const LANGUAGE_GLOSSES = LANGUAGES.map((l) => l.english);
const root = new URL('..', import.meta.url).pathname;
const SRC = join(root, 'src');
const CHECK = process.argv.includes('--check');

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const LIT = String.raw`('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\$]|\\.|\$(?!\{))*\`)`;
const RE_T = new RegExp(String.raw`(?<![\w.$])t\(\s*` + LIT, 'g');
const RE_TN = new RegExp(String.raw`(?<![\w.$])tn\(\s*[^,()]+(?:\([^()]*\))?[^,()]*,\s*` + LIT + String.raw`\s*,\s*` + LIT, 'g');
const lit = (s) => Function(`"use strict"; return (${s});`)();

const keys = new Map(); // key -> { files:Set, plural?:true, data?:true }
const add = (k, file, extra = {}) => {
  if (typeof k !== 'string' || !k.trim()) return;
  const e = keys.get(k) || { files: new Set() };
  e.files.add(file);
  Object.assign(e, extra);
  keys.set(k, e);
};

const SKIP = ['sim', 'core', 'i18n'].map((d) => join(SRC, d) + '/');
for (const f of walk(SRC)) {
  if (SKIP.some((d) => f.startsWith(d))) continue;
  if (f.endsWith('vfxlab.js') || f.endsWith('ui/debug.js')) continue;
  const src = readFileSync(f, 'utf8');
  const rel = relative(root, f);
  for (const m of src.matchAll(RE_T)) add(lit(m[1]), rel);
  for (const m of src.matchAll(RE_TN)) {
    add(lit(m[1]), rel, { pluralOne: true });
    add(lit(m[2]), rel, { plural: true, one: lit(m[1]) });
  }
}

// Data tables.
const FIELDS = new Set(['verb', 'spentLabel', 'abbrev', 'name', 'text', 'desc', 'description', 'blurb', 'title', 'short', 'long', 'tagline', 'flavor', 'epithet', 'subtitle', 'role', 'hint', 'tip', 'banner', 'land', 'full', 'label', 'summary', 'kicker', 'lore', 'effect', 'detail']);
const looksLikeText = (s) => /[A-Za-z]/.test(s) && !/^[a-z0-9_.:-]+$/.test(s) && !/^#[0-9a-f]+$/i.test(s);
const dataFiles = [join(SRC, 'ui/run/cards.js'), ...walk(join(SRC, 'sim')), ...walk(join(SRC, 'data')), join(SRC, 'net/protocol/messages.js'), join(SRC, 'net/seats.js')].filter((f) => existsSync(f));
const seenObj = new WeakSet();
function harvest(v, rel, field, depth, all = false) {
  if (depth > 8 || v === null || v === undefined) return;
  if (typeof v === 'string') {
    if ((all || (field && FIELDS.has(field))) && looksLikeText(v)) add(v, rel, { data: true });
    return;
  }
  if (typeof v !== 'object' || seenObj.has(v)) return;
  if (typeof v === 'function') return;
  seenObj.add(v);
  if (Array.isArray(v)) {
    for (const x of v) harvest(x, rel, field, depth + 1, all);
    return;
  }
  for (const [k, x] of Object.entries(v)) harvest(x, rel, k, depth + 1, all);
}
const NAME_TABLES = new Set(['NODE_EFFECT', 'NODE_EFFECT_SHORT', 'SKILL_BODY', 'SHAPE_LABEL', 'SUBSTITUTE_LINE', 'EMPTY_LINE', 'SIPHON_CARD_LINE', 'CLASS_NAME', 'SEAT_NAMES', 'SEAT_LABELS', 'SEAT_CRITTERS', 'ENEMY_NAMES', 'BOSS_NAMES', 'REASON_TEXT', 'KIND_LABEL', 'CURRENCY']);
for (const f of dataFiles) {
  const rel = relative(root, f);
  let mod;
  try {
    mod = await import(pathToFileURL(f).href);
  } catch {
    continue;
  }
  for (const [name, v] of Object.entries(mod)) {
    if (NAME_TABLES.has(name)) harvest(v, rel, 'name', 0, true);
    else harvest(v, rel, null, 0);
  }
}

// Lines the UI looks up through a variable that no table above exports: the
// settings tab names (registered in English, shown with t(def.label)), the
// sim's lowercase rarity ids shown as words, the language names' English
// glosses, and the fixed strings src/net builds (it stays i18n-free so the
// Node bots and the server can import it) that the UI shows with t(text).
const EXTRA = {
  'src/ui/menu/settings.js': ['Display', 'Audio', 'Controls', 'Gameplay', 'Network'],
  'src/ui/run/unlocks.js': ['common', 'rare', 'legendary'],
  'src/ui/story/journal.js': ['Story', 'Bestiary', 'Relics', 'Events', 'Deeds'],
  'src/sim/nodes.js': ['fits your kit', 'nothing in your kit uses this yet'],
  'src/ui/menu/tabs/gameplay.js': LANGUAGE_GLOSSES,
  'src/net/address.js': ['Set by the page link (?net=)', 'Custom address', 'Automatic (this build’s server)', 'Automatic (this site)', 'Automatic (this computer)'],
  'src/net/lobbyClient.js': [
    'Connection to the server was lost.',
    'Your seat was released — the session moved on without you.',
    'The server closed this session.',
    'This session continued in another window.',
    'The server was updated — a new version of Echoes is available.',
    'The session ended.',
    'Room codes are 5 letters/digits (no 0, O, 1 or I).',
    'That session is open in another tab of this browser.',
  ],
};
for (const [file, list] of Object.entries(EXTRA)) for (const k of list) add(k, file, { data: true });

const sorted = [...keys.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const catalog = {};
for (const [k, e] of sorted) {
  catalog[k] = { files: [...e.files].sort(), ...(e.plural ? { plural: true, one: e.one } : {}), ...(e.data ? { data: true } : {}) };
}
writeFileSync(join(SRC, 'i18n/catalog.json'), JSON.stringify(catalog, null, 1) + '\n');
const nPlural = sorted.filter(([, e]) => e.plural).length;
console.log(`catalog: ${sorted.length} keys (${nPlural} plural, ${sorted.filter(([, e]) => e.data).length} from data tables)`);

if (CHECK) {
  const holders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  const tags = (s) => [...String(s).matchAll(/<\/?[a-z]+[^>]*>/g)].length;
  let bad = 0;
  const locDir = join(SRC, 'i18n/locales');
  for (const f of readdirSync(locDir).filter((n) => n.endsWith('.json')).sort()) {
    const table = JSON.parse(readFileSync(join(locDir, f), 'utf8'));
    const missing = [];
    const mism = [];
    for (const [k, e] of sorted) {
      if (e.pluralOne && !e.plural) continue; // the one form rides on the other form's entry
      const v = table[k];
      if (v === undefined || v === '') {
        missing.push(k);
        continue;
      }
      const forms = typeof v === 'string' ? [v] : Object.values(v);
      const want = holders(k);
      for (const s of forms) {
        // a plural form may drop {n} ("one" in many languages reads "a").
        const got = holders(s);
        const ok = e.plural ? got.split(',').filter((x) => x !== 'n').join(',') === want.split(',').filter((x) => x !== 'n').join(',') : got === want;
        if (!ok || tags(s) !== tags(k)) mism.push(`${k} => ${s}`);
      }
    }
    const extra = Object.keys(table).filter((k) => !keys.has(k)).length;
    console.log(`${f}: ${Object.keys(table).length} entries, missing ${missing.length}, placeholder/tag mismatches ${mism.length}, unused ${extra}`);
    for (const m of missing.slice(0, 15)) console.log(`  missing: ${m}`);
    for (const m of mism.slice(0, 15)) console.log(`  mismatch: ${m}`);
    bad += missing.length + mism.length;
  }
  process.exit(bad ? 1 : 0);
}
