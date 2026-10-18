// THE HEARTH SONG (docs/STORY.md): the camp's NPCs and the freed wardens.
//
//   Wick, the Hearth-Keeper   an old owl perched on the woodpile by the fire.
//                             Walk up: a speech bubble with the current story
//                             line; E talks (the next line); U offers Embers
//                             to the hearth (the existing Unlocks screen).
//   Bramble, the Peddler      a tortoise at the market stall. Talks only: her
//                             shelf opens in room 7, never at camp (§18).
//   Quill, the Chronicler     a magpie on the Level Select's map table. The
//                             table still opens the Level Select with E; J
//                             opens the Story so far page.
//   Freed wardens             a felled warden's spirit at the camp's edge
//                             (profile meta.bosses), with one line.
//   Rill, the Tidecaller      a playable class (docs/TIDECALLER.md), so her
//                             body is her party rig, not an NPC model: once
//                             freed, walk up to her at her spot on the sluice
//                             side of the fire and E talks (lines by verses).
//                             Wick gains a line about her.
//   Tolly, the Bellwright     the same (docs/BELLWRIGHT.md), from her spot on
//                             the west side of the fire, once the Verse of
//                             Stone frees her.
//   Sable, the Duskwing       the same (docs/DUSKWING.md), from his perch on
//                             the east side of the fire, once the Verse of
//                             Heart frees him.
//
// Presentation only: nothing here writes the sim except the peddler's
// collider, which the camp hands the sim with its own (camp mode only, so a
// run never sees it). Lines come from src/data/story.js and are translated
// here, at the display site.
import { Group } from 'three';
import { PALETTE } from '../data/palette.js';
import { t } from '../i18n/index.js';
import { createNpc } from '../render/npcs/index.js';
import { NPCS, KEEPER_LINES, PEDDLER_LINES, CHRONICLER_LINES, WARDENS, versesHeld, RILL_LINES, rillLineFor, KEEPER_RILL_LINE, TOLLY_LINES, tollyLineFor, KEEPER_TOLLY_LINE, SABLE_LINES, sableLineFor, KEEPER_SABLE_LINE } from '../data/story.js';
import { ALL_LEVELS } from '../data/campaign.js';
import { HEARTH, CAMP_SPOTS } from '../env/camp/spec.js';
import { MAP_TABLE } from '../campaign/maptable.js';
import { cap } from '../app/controls.js';

// Where the three stand. Wick sits on the woodpile (a solid prop already),
// Quill on the map table's far corner (solid too); Bramble stands in front of
// the market stall, clear of the camp road, with a collider of her own.
export const NPC_SPOTS = Object.freeze({
  keeper: { x: -2.65, z: 1.95, perchY: 0.56, talk: 1.75, near: 2.9 },
  peddler: { x: 5.25, z: 1.72, perchY: 0, talk: 1.6, near: 2.9 },
  chronicler: { x: MAP_TABLE.x - 0.28, z: MAP_TABLE.z - 0.12, perchY: 0.92, talk: 0, near: 2.6 },
});
const WARDEN_NEAR = 3.2;
// THE TIDECALLER: Rill talks while she sits at her own spot.
const RILL_TALK = 1.6;
const RILL_NEAR = 2.4;
const RILL_SEATED = 0.9; // her rig within this of her spot (not trailing the party)
// The heroes who talk at camp from their own spots (their bodies are party
// rigs): Rill, and THE BELLWRIGHT's Tolly.
const HERO_TALK = Object.freeze({
  rill: Object.freeze({ cls: 'tidecaller', lineFor: rillLineFor, extra: RILL_LINES.extra.text }),
  tolly: Object.freeze({ cls: 'bellwright', lineFor: tollyLineFor, extra: TOLLY_LINES.extra.text }),
  // THE DUSKWING's Sable.
  sable: Object.freeze({ cls: 'duskwing', lineFor: sableLineFor, extra: SABLE_LINES.extra.text }),
});
const TALK_MS = 1600;

const BUBBLE_CSS = `
  .npc-bubble {
    position: fixed; z-index: 12; left: 0; top: 0; transform: translate(-50%, -100%) scale(var(--nb-s, 1));
    transform-origin: bottom center; max-width: 420px; min-width: 200px;
    padding: 10px 16px 11px; border-radius: 14px;
    background: ${PALETTE.voidCharcoal}EB; border: 2px solid ${PALETTE.warmGrey}AA;
    box-shadow: 0 6px 22px #000000AA;
    font-family: system-ui, var(--i18n-font, sans-serif); color: ${PALETTE.parchment};
    pointer-events: none; opacity: 0; transition: opacity 180ms ease;
  }
  .npc-bubble.nb-on { opacity: 1; }
  .npc-bubble::after {
    content: ''; position: absolute; left: 50%; bottom: -10px; transform: translateX(-50%) rotate(45deg);
    width: 14px; height: 14px; background: ${PALETTE.voidCharcoal}; border-right: 2px solid ${PALETTE.warmGrey}AA; border-bottom: 2px solid ${PALETTE.warmGrey}AA;
  }
  .npc-bubble .nb-name { font-size: 15px; font-weight: 800; letter-spacing: 0.12em; color: ${PALETTE.hearthAmber}; text-transform: uppercase; margin-bottom: 3px; }
  .npc-bubble .nb-line { font-size: 17px; line-height: 1.34; color: ${PALETTE.bone}; }
  .npc-bubble.nb-warden { border-color: #A8D2DCAA; }
  .npc-bubble.nb-warden::after { border-color: #A8D2DCAA; }
  .npc-bubble.nb-warden .nb-name { color: #A8D2DC; }
  .npc-bubble.nb-warden .nb-line { font-style: italic; }
  .npc-bubble .nb-keys { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 7px; font-size: 15px; color: ${PALETTE.warmGrey}; pointer-events: auto; }
  .npc-bubble .nb-keys span { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
  .npc-bubble .nb-keys b {
    display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 5px;
    border-radius: 5px; border: 2px solid ${PALETTE.warmGrey}; background: #2c2822; color: ${PALETTE.hearthAmber}; font-weight: 800;
  }
`;

export function createCampNpcs({ root, stage, cosmetic, svc, toScreen, openUnlocks, openStory, heroAt = () => null, heroOpen = () => false }) {
  const group = new Group();
  group.name = 'camp-npcs';
  root.add(group);

  if (!document.getElementById('npc-bubble-style')) {
    const st = document.createElement('style');
    st.id = 'npc-bubble-style';
    st.textContent = BUBBLE_CSS;
    document.head.appendChild(st);
  }

  // --- the three camp NPCs
  const npcs = {};
  for (const id of ['keeper', 'peddler', 'chronicler']) {
    const spot = NPC_SPOTS[id];
    const body = createNpc(id, { cosmetic, perchY: spot.perchY });
    body.group.position.set(spot.x, 0, spot.z);
    const yaw = Math.atan2(HEARTH.x - spot.x, HEARTH.z - spot.z);
    body.setYaw(yaw);
    group.add(body.group);
    npcs[id] = { id, spot, body, yaw, bubble: makeBubble(), line: null, talkIdx: -1, talkUntil: 0, near: false, lastKey: '' };
  }
  // THE TIDECALLER: Rill's bubble (her body is the camp's party rig), and
  // THE BELLWRIGHT's Tolly the same way.
  const heroes = Object.fromEntries(Object.entries(HERO_TALK).map(([id, h]) => [id, { id, cls: h.cls, bubble: makeBubble(), line: null, talkIdx: -1, near: false, lastKey: '', at: null }]));
  // Bramble's own collider (Wick and Quill sit on solid props).
  const colliders = [{ id: 'npc-peddler', x: NPC_SPOTS.peddler.x, z: NPC_SPOTS.peddler.z, r: 0.42 }];

  // --- freed wardens (built lazily, shown when the profile has felled them)
  const wardens = {};
  function syncWardens(meta) {
    const felled = (meta && meta.bosses) || {};
    for (const [kind, w] of Object.entries(WARDENS)) {
      // Either boss of a level frees that land's warden (`also`: the alternate).
      const want = [kind, ...(w.also || [])].some((k) => (felled[k] ?? 0) > 0);
      let entry = wardens[kind];
      if (want && !entry) {
        const body = createNpc(w.model, { cosmetic });
        body.group.position.set(w.x, 0, w.z);
        body.setYaw(w.yaw);
        group.add(body.group);
        entry = wardens[kind] = { kind, w, body, bubble: makeBubble('nb-warden'), near: false };
        entry.bubble.querySelector('.nb-name').textContent = t('Freed warden');
        entry.bubble.querySelector('.nb-line').textContent = t(w.text);
      }
      if (entry) entry.body.group.visible = want;
    }
  }

  function makeBubble(extra = '') {
    const el = document.createElement('div');
    el.className = `npc-bubble ${extra}`.trim();
    el.innerHTML = '<div class="nb-name"></div><div class="nb-line"></div><div class="nb-keys"></div>';
    document.body.appendChild(el);
    return el;
  }

  // --- story state (the profile) -------------------------------------------
  function profile() {
    const s = svc('save');
    try {
      return s && typeof s.profile === 'function' ? s.profile() : null;
    } catch {
      return null;
    }
  }
  // (The camp calls refresh() once its services are up, then twice a second.)
  let verses = 0;
  // THE LEVEL V FORK: five verses with Flame and not Sky (the Kiln road
  // first) have their own Wick, Quill, Rill, Tolly and Sable lines.
  let flameFive = false;
  function refresh() {
    const p = profile();
    const held = versesHeld(p, ALL_LEVELS);
    verses = held.length;
    flameFive = verses === 5 && held.some((c) => c.verse === 'flame') && !held.some((c) => c.verse === 'sky');
    syncWardens(p && p.meta);
  }

  // The line an NPC says on approach, and on each further E.
  function lineFor(n) {
    if (n.id === 'keeper') {
      const base = flameFive ? KEEPER_LINES.flameFive.text : KEEPER_LINES.byVerses.text[Math.min(verses, KEEPER_LINES.byVerses.text.length - 1)];
      if (n.talkIdx < 0) return base;
      const all = [base, ...KEEPER_LINES.extra.text, ...(heroOpen('tidecaller') ? [KEEPER_RILL_LINE.text] : []), ...(heroOpen('bellwright') ? [KEEPER_TOLLY_LINE.text] : []), ...(heroOpen('duskwing') ? [KEEPER_SABLE_LINE.text] : [])];
      return all[(n.talkIdx + 1) % all.length]; // each E moves on a line
    }
    if (n.id === 'peddler') {
      const all = PEDDLER_LINES.text;
      return all[(n.talkIdx + 1) % all.length];
    }
    if (HERO_TALK[n.id]) {
      const base = HERO_TALK[n.id].lineFor(verses, flameFive);
      if (n.talkIdx < 0) return base;
      const all = [base, ...HERO_TALK[n.id].extra];
      return all[(n.talkIdx + 1) % all.length];
    }
    return flameFive ? CHRONICLER_LINES.flameFive.text : CHRONICLER_LINES.byVerses.text[Math.min(verses, CHRONICLER_LINES.byVerses.text.length - 1)];
  }
  function keysFor(n) {
    if (n.id === 'keeper') return [['interact', t('Talk'), () => talk('keeper')], ['unlocks', t('Offerings to the hearth'), () => openUnlocks('npc')]];
    if (n.id === 'peddler') return [['interact', t('Talk'), () => talk('peddler')]];
    if (HERO_TALK[n.id]) return [['interact', t('Talk'), () => talkHero(n.id)]];
    return [['story', t('Story so far'), () => openStory('npc')]];
  }

  function talk(id) {
    const n = npcs[id];
    if (!n) return false;
    n.talkIdx += 1;
    n.talkUntil = performance.now() + TALK_MS;
    n.body.setTalking(true);
    n.lastKey = ''; // repaint the chips on the next frame
    n.line = lineFor(n); // the line itself changes at once
    n.bubble.querySelector('.nb-line').textContent = t(n.line);
    return true;
  }

  function talkHero(id) {
    const h = heroes[id];
    if (!h || !h.at) return false;
    h.talkIdx += 1;
    h.lastKey = '';
    h.line = lineFor(h);
    h.bubble.querySelector('.nb-line').textContent = t(h.line);
    const s = svc('save');
    try {
      if (s && typeof s.meetNpc === 'function') s.meetNpc(id);
    } catch {
      /* a profile this browser can't write still talks */
    }
    return true;
  }

  // E near Wick, Bramble, Rill or Tolly: the next line. Returns true when it was taken.
  function interact(body) {
    for (const id of ['keeper', 'peddler']) {
      const n = npcs[id];
      if (n.spot.talk > 0 && dist(body, n.spot) <= n.spot.talk) return talk(id);
    }
    for (const h of Object.values(heroes)) if (h.at && dist(body, h.at) <= RILL_TALK) return talkHero(h.id);
    return false;
  }
  const dist = (b, s) => Math.hypot(b.x - s.x, b.z - s.z);

  let shown = true;
  function setVisible(on) {
    shown = on;
    group.visible = on;
    if (!on) {
      for (const n of Object.values(npcs)) n.bubble.classList.remove('nb-on');
      for (const w of Object.values(wardens)) w.bubble.classList.remove('nb-on');
      for (const h of Object.values(heroes)) {
        h.bubble.classList.remove('nb-on');
        h.near = false;
      }
    }
  }

  function placeBubble(el, x, y, z) {
    const a = toScreen(x, y, z);
    const s = Math.min(1, Math.min(window.innerWidth / 1920, window.innerHeight / 1080) * 1.35);
    el.style.setProperty('--nb-s', s.toFixed(3));
    el.style.left = `${Math.round(a.x)}px`;
    el.style.top = `${Math.round(Math.max(40, a.y))}px`;
  }

  // Per camp frame. `body` = the local player's body; `quiet` = a menu, a
  // fade or a run start is in the way (bubbles hide, figures keep idling).
  function update(dt, elapsedSec, body, quiet) {
    if (!shown) return;
    const now = performance.now();
    for (const n of Object.values(npcs)) {
      n.body.update(dt, elapsedSec);
      if (n.talkUntil && now > n.talkUntil) {
        n.talkUntil = 0;
        n.body.setTalking(false);
      }
      const near = !quiet && dist(body, n.spot) <= n.spot.near;
      if (near !== n.near) {
        n.near = near;
        n.bubble.classList.toggle('nb-on', near);
        if (!near) n.talkIdx = -1; // walking away resets the talk
        n.lastKey = '';
      }
      if (!near) continue;
      const line = lineFor(n);
      const key = `${line}|${cap('interact')}|${cap('unlocks')}|${cap('story')}`;
      if (key !== n.lastKey) {
        n.lastKey = key;
        n.line = line;
        n.bubble.querySelector('.nb-name').textContent = t(NPCS[n.id].name);
        n.bubble.querySelector('.nb-line').textContent = t(line);
        const keys = n.bubble.querySelector('.nb-keys');
        keys.textContent = '';
        for (const [action, label, fn] of keysFor(n)) {
          const span = document.createElement('span');
          span.innerHTML = `<b></b><i></i>`;
          span.querySelector('b').textContent = cap(action);
          span.querySelector('i').textContent = label;
          span.style.fontStyle = 'normal';
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            fn();
          });
          keys.appendChild(span);
        }
      }
      const h = n.body.metrics ? n.body.metrics.height : 1.2;
      placeBubble(n.bubble, n.spot.x, n.spot.perchY + h + 0.25, n.spot.z);
    }
    for (const h of Object.values(heroes)) updateHero(h, body, quiet);
    for (const w of Object.values(wardens)) {
      if (!w.body.group.visible) continue;
      w.body.update(dt, elapsedSec);
      const near = !quiet && dist(body, w.w) <= WARDEN_NEAR;
      if (near !== w.near) {
        w.near = near;
        w.bubble.classList.toggle('nb-on', near);
      }
      if (near) placeBubble(w.bubble, w.w.x, (w.body.metrics ? w.body.metrics.height : 1.4) + 0.3, w.w.z);
    }
  }

  // Rill or Tolly: near her while she sits at her spot -> her bubble.
  function updateHero(h, body, quiet) {
    const pos = heroAt(h.cls);
    const spot = CAMP_SPOTS[h.cls];
    h.at = pos && Math.hypot(pos.x - spot.x, pos.z - spot.z) <= RILL_SEATED ? pos : null;
    const near = !quiet && !!h.at && dist(body, h.at) <= RILL_NEAR;
    if (near !== h.near) {
      h.near = near;
      h.bubble.classList.toggle('nb-on', near);
      if (!near) h.talkIdx = -1;
      h.lastKey = '';
    }
    if (!near) return;
    const line = lineFor(h);
    const key = `${line}|${cap('interact')}`;
    if (key !== h.lastKey) {
      h.lastKey = key;
      h.line = line;
      h.bubble.querySelector('.nb-name').textContent = t(NPCS[h.id].name);
      h.bubble.querySelector('.nb-line').textContent = t(line);
      const keys = h.bubble.querySelector('.nb-keys');
      keys.textContent = '';
      for (const [action, label, fn] of keysFor(h)) {
        const span = document.createElement('span');
        span.innerHTML = `<b></b><i></i>`;
        span.querySelector('b').textContent = cap(action);
        span.querySelector('i').textContent = label;
        span.style.fontStyle = 'normal';
        span.addEventListener('click', (e) => {
          e.stopPropagation();
          fn();
        });
        keys.appendChild(span);
      }
    }
    placeBubble(h.bubble, h.at.x, (h.at.height || 1.1) + 0.35, h.at.z);
  }

  function debug() {
    const box = (el) => {
      if (!el.classList.contains('nb-on')) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      verses,
      npcs: Object.values(npcs).map((n) => ({
        id: n.id,
        x: n.spot.x,
        z: n.spot.z,
        near: n.near,
        talkIdx: n.talkIdx,
        line: n.near ? n.line : null,
        text: n.near ? n.bubble.textContent.replace(/\s+/g, ' ').trim() : null,
        bubble: box(n.bubble),
      })),
      wardens: Object.values(wardens).map((w) => ({ kind: w.kind, visible: w.body.group.visible, near: w.near, bubble: box(w.bubble) })),
      ...Object.fromEntries(Object.values(heroes).map((h) => [h.id, { seated: !!h.at, near: h.near, talkIdx: h.talkIdx, line: h.near ? h.line : null, text: h.near ? h.bubble.textContent.replace(/\s+/g, ' ').trim() : null, bubble: box(h.bubble) }])),
    };
  }

  return { group, colliders, update, interact, refresh, setVisible, debug, spots: NPC_SPOTS, verses: () => verses };
}
