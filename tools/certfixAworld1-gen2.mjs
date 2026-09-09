// certfixAworld1 — round-2 probes for the A-world fix builder.
// Written programmatically per docs/TESTING.md. Prefix: certfixAworld1-.
import { readFileSync, writeFileSync } from 'fs';
const ev = (code) => ({ type: 'eval', code });
const wait = (ms) => ({ type: 'wait', ms });
const iife = (body) => `(()=>{const E=__echoes;${body}})()`;
const W = (n, a) => writeFileSync(`tools/actions/certfixAworld1-${n}.json`, JSON.stringify(a, null, 1));

// Where does the arena floor land on screen? Projects a world grid through the
// live camera so prop placement can be aimed at the frame's real edges.
const project = `(()=>{const E=__echoes;const s=E.stage||window.__stage;const cam=(window.__echoesStage&&window.__echoesStage.camera)||null;return {note:'no stage handle',have:Object.keys(E)}})()`;
void project;

const combat = JSON.parse(readFileSync('tools/actions/certA1-combat.json', 'utf8'));
// Grid projection through the renderer's own camera, found from the canvas.
const grid = `(async()=>{const THREE=await import('/node_modules/.vite/deps/three.js?v=0').catch(()=>null);return THREE?'ok':'no'})()`;
void grid;

// Screen projection via __echoes.hud world->screen helper if present, else the
// arena's own camera exposed on the debug API.
W('camprobe', [
  ...combat,
  ev(iife(`const s=E.state();return {tag:'camprobe',cam:E.camera?E.camera():null,keys:Object.keys(E)}`)),
]);

// Shop: two frames ~1.2 s apart so the world behind the veil can be diffed for
// motion (fireflies, flame flicker) — REFERENCE_BAR check 10.
const shop = JSON.parse(readFileSync('tools/actions/certA1-shop.json', 'utf8'));
W('shopmotion', [
  ...shop,
  { type: 'shot', name: 'certfixAworld1-shopmotion_a' },
  wait(1200),
  { type: 'shot', name: 'certfixAworld1-shopmotion_b' },
  ev(iife(`return {tag:'shopmotion',tick:E.tick,fps:E.fps}`)),
]);
console.log('wrote camprobe, shopmotion');
