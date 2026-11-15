#!/usr/bin/env node
// VALORANT KEYS probe (docs/CONTROLS.md "Default keys", v0.5.363) — headless
// Node. Kesh's pick: the four skills move off 1-4 to Q, E, C, X so a cast
// never lifts a movement finger; interact moves to F, the tonic to G and camp
// class select to K. Every place that names a skill key reads the bindings.
//
//   node tools/skill-keys-probe.mjs
//
// Checks:
//   1. Defaults: skills Q E C X, interact F, tonic G, class select K; every
//      other action keeps its old key; no key drives two actions; none is
//      reserved.
//   2. Input: on the default keys Q / E / C / X press skill_1..4, F presses
//      interact and holds the revive, G uses the carry slot, 1-4 do nothing.
//   3. Hints: the skill cap reads "Q / E / C / X" (pad "X / Y / B / RB").
//   4. Labels that name a skill key read the bindings: the sockets page's row
//      keycaps, its header and swap lines and its slot-order line, the draft's
//      Replace row and its "AI re-sorts" line; the level table's label names
//      the interact key; the co-op guest's instant feedback and its timing
//      follow the bound keys. Russian and Japanese right mouse match left.
//   5. Old profiles: stored keys (any saved settings hold every key) are kept;
//      a profile with no stored keys gets the new defaults.
// Exit code 1 on any failure.
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
const src = (p) => readFileSync(join(here, p), 'utf8');
const { bindings, ACTIONS, DEFAULT_BINDINGS, RESERVED_CODES } = await import(u('src/core/bindings.js'));
const { createInputController } = await import(u('src/core/input.js'));
const { skillsCap, installControls } = await import(u('src/app/controls.js'));
const { createSettingsStore, SETTINGS_STORAGE_KEY } = await import(u('src/app/settings.js'));

const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};

// ------------------------------------------------------------ 1. defaults --
const OLD = {
  moveUp: 'KeyW', moveLeft: 'KeyA', moveDown: 'KeyS', moveRight: 'KeyD', attack: 'MouseRight', dodge: 'Space',
  skill1: 'Digit1', skill2: 'Digit2', skill3: 'Digit3', skill4: 'Digit4', interact: 'KeyE', useItem: 'KeyQ',
  rally: 'KeyR', markEnemy: 'Tab', ally1: 'F1', ally2: 'F2', ally3: 'F3', ally4: 'F4',
  backpack: 'KeyB', pause: 'KeyP', levels: 'KeyL', unlocks: 'KeyU', classes: 'KeyC', story: 'KeyJ',
};
const MOVED = { skill1: 'KeyQ', skill2: 'KeyE', skill3: 'KeyC', skill4: 'KeyX', interact: 'KeyF', useItem: 'KeyG', classes: 'KeyK' };
for (const [id, code] of Object.entries(MOVED)) check(DEFAULT_BINDINGS[id] === code, `default ${id} = ${code} (${DEFAULT_BINDINGS[id]})`);
const kept = Object.keys(OLD).filter((id) => !MOVED[id]);
check(kept.every((id) => DEFAULT_BINDINGS[id] === OLD[id]), `every other action keeps its key (${kept.filter((id) => DEFAULT_BINDINGS[id] !== OLD[id]).join(', ') || 'all kept'})`);
check(ACTIONS.length === Object.keys(OLD).length, `no action added or removed (${ACTIONS.length})`);
const codes = Object.values(DEFAULT_BINDINGS);
check(new Set(codes).size === codes.length, 'no default key drives two actions');
check(!codes.some((c) => RESERVED_CODES.has(c)), 'no default key is a reserved key');

// --------------------------------------------------------------- 2. input --
function fakeTarget() {
  const map = new Map();
  return {
    addEventListener: (type, fn) => map.set(type, fn),
    removeEventListener: (type) => map.delete(type),
    fire: (type, ev) => map.get(type) && map.get(type)({ preventDefault() {}, repeat: false, target: null, ...ev }),
  };
}
const tgt = fakeTarget();
const input = createInputController({ target: tgt });
const pressOf = (code, { hold = false } = {}) => {
  tgt.fire('keydown', { code });
  const snap = input.sample();
  if (!hold) tgt.fire('keyup', { code });
  return snap;
};
const kinds = (snap) => snap.presses.map((p) => (p.slot !== undefined ? `${p.kind}@${p.slot}` : p.kind)).join(',');
check(kinds(pressOf('KeyQ')) === 'skill_1@0', 'Q presses skill 1');
check(kinds(pressOf('KeyE')) === 'skill_2@1', 'E presses skill 2');
check(kinds(pressOf('KeyC')) === 'skill_3@2', 'C presses skill 3');
check(kinds(pressOf('KeyX')) === 'skill_4@3', 'X presses skill 4');
const f = pressOf('KeyF', { hold: true });
check(kinds(f) === 'interact' && f.reviveHeld === true, 'F presses interact and holds the revive');
tgt.fire('keyup', { code: 'KeyF' });
check(input.sample().reviveHeld === false, 'letting go of F ends the revive hold');
check(kinds(pressOf('KeyG')) === 'use_item', 'G uses the tonic or bomb');
check(['Digit1', 'Digit2', 'Digit3', 'Digit4'].every((c) => pressOf(c).presses.length === 0), '1-4 press nothing');
check(kinds(pressOf('Space')) === 'dodge' && kinds(pressOf('KeyR')) === 'rally', 'Space still dodges, R still rallies');
input.detach();

// --------------------------------------------------------------- 3. hints --
check(skillsCap({ pad: false }) === 'Q / E / C / X', `the skill cap reads Q / E / C / X (${skillsCap({ pad: false })})`);
check(skillsCap({ pad: true }) === 'X / Y / B / RB', `the pad skill cap is unchanged (${skillsCap({ pad: true })})`);

// -------------------------------------------------------------- 4. labels --
const socket = src('src/ui/socket/index.js');
check(/const skillKey = \(r\) => cap\(`skill\$\{r \+ 1\}`\)/.test(socket), 'the sockets page names a row by its skill binding');
check(socket.includes('class="nd-rkey">${esc(skillKey(r))}'), 'the sockets row keycap reads the binding');
check(!/key: focus\.r \+ 1|fromKey: headerInHand \+ 1|toKey: focus\.r \+ 1/.test(socket), 'the sockets header and swap lines name keys, not slot numbers');
check(!socket.includes("'slot order = keys 1–4") && socket.includes("t('slot order = keys {keys}', { keys: skillsCap() })"), 'the slot-order line names the skill keys');
const draft = src('src/ui/run/draft.js');
check(draft.includes('class="rn-repkey">${esc(cap(`skill${i + 1}`))}') && draft.includes('key: cap(`skill${at + 1}`)'), "the draft's Replace row and AI re-sort line name keys");
const table = src('src/campaign/maptable.js');
check(!table.includes("'Choose a level (E)'") && table.includes("t('Choose a level ({key})', { key: cap('interact') })"), "the level table's label names the interact key");
const session = src('src/net/session.js');
check(!/Mouse2|button === 2|button !== 2|`Digit\$\{i\}`|interact: 'KeyE'/.test(session), 'the co-op guest code names no fixed key or button');
check(session.includes("bindings.action(MOUSE_BUTTON_CODE[e.button])") && session.includes("g.keyAt[keyOf('basic')]"), 'the guest instant feedback and its timing follow the bindings');
const loc = (l) => JSON.parse(src(`src/i18n/locales/${l}.json`));
const LANGS = ['de', 'es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-Hans', 'zh-Hant'];
for (const k of ['slot order = keys {keys}', 'slot order = keys {keys} = the order the AI casts in']) {
  check(LANGS.every((l) => typeof loc(l)[k] === 'string' && loc(l)[k].includes('{keys}') && !loc(l)[k].includes('1–4')), `"${k}" in nine languages`);
}
check(LANGS.every((l) => typeof loc(l)['Choose a level ({key})'] === 'string' && loc(l)['Choose a level ({key})'].includes('{key}')), '"Choose a level ({key})" in nine languages');
check(/мыши/.test(loc('ru')['Right mouse']) && /мыши/.test(loc('ru')['Left mouse']), `Russian right and left mouse match (${loc('ru')['Right mouse']} · ${loc('ru')['Left mouse']})`);
check(/ボタン/.test(loc('ja')['Right mouse']) && /ボタン/.test(loc('ja')['Left mouse']), `Japanese right and left mouse match (${loc('ja')['Right mouse']} · ${loc('ja')['Left mouse']})`);

// --------------------------------------------------------- 5. old profiles --
function memStorage(doc) {
  const m = new Map(doc ? [[SETTINGS_STORAGE_KEY, JSON.stringify(doc)]] : []);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
// An old profile that saved any setting holds every key at its old default.
const oldData = Object.fromEntries(Object.entries(OLD).map(([id, c]) => [`controls.key.${id}`, c]));
const oldStore = createSettingsStore({ storage: memStorage({ v: 1, savedAt: '2026-11-01T00:00:00Z', data: { ...oldData, 'audio.master': 0.5 } }) });
installControls(oldStore);
check(bindings.code('skill1') === 'Digit1' && bindings.code('interact') === 'KeyE' && bindings.code('classes') === 'KeyC', 'an old profile with saved keys keeps 1-4, E and C');
// A profile with no stored keys (never saved settings) gets the new defaults.
// (setAll with nothing stored is what installControls hands over then.)
bindings.setAll({});
check(bindings.code('skill1') === 'KeyQ' && bindings.code('interact') === 'KeyF', 'a profile with no stored keys gets Q / F');

console.log(JSON.stringify({ probe: 'skill-keys', ok: fails.length === 0, fails }));
process.exit(fails.length ? 1 : 0);
