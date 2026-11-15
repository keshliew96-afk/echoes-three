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
//   5. Old profiles (Kesh's pick 1): a saved v1 profile that never rebound a
//      key moves to the new keys; one with any key of its own keeps all of
//      them; the move runs once (settings v2) and keeps every other setting.
//   6. Key clash: the reward page leaves on neither X nor the pad's X, and no
//      run page that opens from a fight commits on Space.
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

// ---------------------------------------------------------- 6. key clash --
// Kesh: the reward page's Leave must not use X; no fight key commits a
// choice on a page that opens straight from a fight.
const RUNPAGES = ['draft', 'path', 'relic', 'encounter', 'transit', 'endscreens'];
for (const pg of RUNPAGES) {
  const code = src(`src/ui/run/${pg}.js`);
  check(!/code === 'Space'/.test(code), `the ${pg} page commits nothing on Space (the dodge)`);
}
check(!/code === 'KeyX'/.test(draft), 'the reward page leaves on no X key (skill 4)');
check(!/action === 'secondary'/.test(draft), "the reward page leaves on no pad X (skill 1)");
const runIndex = src('src/ui/run/index.js');
const commitSet = /const COMMIT_KEYS = new Set\(\[([^\]]*)\]\)/.exec(runIndex);
check(!!commitSet && !/Space|KeyX/.test(commitSet[1]), `the run pages' commit keys hold no fight key but the shop's R (${commitSet && commitSet[1]})`);
check(!/<b>X<\/b>/.test(draft), 'the reward page hints name no X key');
check(LANGS.every((l) => !Object.entries(loc(l)).some(([k, v]) => /<b>Enter<\/b>/.test(k) && /<b>X<\/b>/.test(String(v)))), 'no language still shows "X leave" on the reward page');

// --------------------------------------------------------- 5. old profiles --
function memStorage(doc) {
  const m = new Map(doc ? [[SETTINGS_STORAGE_KEY, JSON.stringify(doc)]] : []);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
// The keys a profile ends up with, read through the settings store the way
// installControls registers them.
function keysAfterLoad(doc) {
  const store = createSettingsStore({ storage: memStorage(doc) });
  const out = {};
  for (const id of Object.keys(OLD)) out[id] = store.register(`controls.key.${id}`, { default: DEFAULT_BINDINGS[id] });
  return { keys: out, store };
}
// Any saved v1 settings hold every key, defaults included.
const oldData = Object.fromEntries(Object.entries(OLD).map(([id, c]) => [`controls.key.${id}`, c]));
const v1 = (data) => ({ v: 1, savedAt: '2026-11-01T00:00:00Z', data: { ...data, 'audio.master': 0.5 } });
let r = keysAfterLoad(v1(oldData));
check(Object.keys(OLD).every((id) => r.keys[id] === DEFAULT_BINDINGS[id]), `an old profile that never rebound a key moves to the new keys (skill1 ${r.keys.skill1}, interact ${r.keys.interact}, classes ${r.keys.classes})`);
check(r.store.register('audio.master', { default: 1 }) === 0.5, 'the move keeps every other setting');
r = keysAfterLoad(v1({ ...oldData, 'controls.key.dodge': 'KeyH', 'controls.key.rally': 'Space' }));
check(r.keys.dodge === 'KeyH' && r.keys.rally === 'Space' && r.keys.skill1 === 'Digit1' && r.keys.interact === 'KeyE' && r.keys.useItem === 'KeyQ' && r.keys.classes === 'KeyC', 'an old profile with a key of its own keeps every key (1-4, E, Q, C and its own)');
r = keysAfterLoad({ v: 1, savedAt: '2026-10-01T00:00:00Z', data: { 'audio.master': 0.4 } });
check(r.keys.skill1 === 'KeyQ' && r.keys.interact === 'KeyF', 'a v1 profile saved before the Controls slice (no keys) gets the new keys');
r = keysAfterLoad({ v: 2, savedAt: '2026-11-16T00:00:00Z', data: { ...oldData } });
check(r.keys.skill1 === 'Digit1', 'a v2 profile that chose 1-4 after the move keeps it (the move runs once)');
r = keysAfterLoad(null);
check(r.keys.skill1 === 'KeyQ' && r.keys.interact === 'KeyF', 'a new profile starts on Q / F');
// installControls hands the stored keys to the bindings.
installControls(createSettingsStore({ storage: memStorage(v1({ ...oldData, 'controls.key.skill2': 'KeyV' })) }));
check(bindings.code('skill1') === 'Digit1' && bindings.code('skill2') === 'KeyV', 'the bindings follow the kept keys');

console.log(JSON.stringify({ probe: 'skill-keys', ok: fails.length === 0, fails }));
process.exit(fails.length ? 1 : 0);
