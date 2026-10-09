// THE JOURNAL (docs/JOURNAL.md, content plan 2 slice 9): the pages of the
// camp journal (J) after the Hearth Song — Bestiary, Relics, Events, Deeds.
// Each page is a grid of entries and a detail panel for the focused one.
// What the player has met comes from the profile: its `journal` block
// (save/profile.js, written by save/index.js during campaign runs) plus the
// records cross-run unlocks already keep (bosses felled, relics found, levels
// cleared, deeds). Entries not met yet show as dark silhouettes with no name.
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { LEVELS, ACT_IDS } from '../../data/levels.js';
import { BESTIARY, ENEMY_JOURNAL_IDS } from '../../data/journal.js';

const CHAMPION_SET = new Set(BESTIARY.filter((b) => b.champion).map((b) => b.id));
import { RELICS, RELIC_IDS, CURSES } from '../../sim/relics.js';
import { ENCOUNTERS, ENCOUNTER_IDS } from '../../sim/encounters.js';
import { DEEDS, DEED_IDS } from '../../data/unlocks.js';
import { CLASS_NAME } from '../../data/classes.js';
import { RARITY_COLOR } from '../run/cards.js';
import { relicIconHtml, curseIconHtml } from '../run/relicicons.js';
import { encounterSigil, ENCOUNTER_COLOR } from '../run/encounter.js';
import { createModelViewer, thumbFor } from './viewer.js';
import { t, tn } from '../../i18n/index.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const JOURNAL_TABS = Object.freeze(['story', 'bestiary', 'relics', 'events', 'deeds']);
export const TAB_LABEL = Object.freeze({ story: 'Story', bestiary: 'Bestiary', relics: 'Relics', events: 'Events', deeds: 'Deeds' });

// What the journal shows, from the profile (also the probe's view of it).
export function journalInfo(p) {
  const seen = (p && p.journal && p.journal.seen) || {};
  const meta = (p && p.meta) || {};
  const rec = (p && p.records) || {};
  const enemy = { ...(seen.enemy || {}) };
  // A level cleared before the journal existed: its roster was met.
  for (const a of ACT_IDS) {
    if (!((rec.levelClears && rec.levelClears[a]) > 0)) continue;
    for (const id of Object.keys(LEVELS[a].roster ?? {})) if (ENEMY_JOURNAL_IDS.includes(id) && !(id in enemy)) enemy[id] = 0;
  }
  const boss = { ...(seen.boss || {}) };
  for (const [k, n] of Object.entries(meta.bosses || {})) boss[k] = Math.max(boss[k] ?? 0, n);
  const relic = { ...(seen.relic || {}) };
  for (const id of meta.relicsSeen || []) relic[id] = Math.max(relic[id] ?? 0, 1);
  const curse = { ...(seen.curse || {}) };
  const event = { ...(seen.event || {}) };
  const deeds = new Set(meta.deeds || []);
  const row = (map, id) => ({ id, seen: id in map, count: map[id] ?? 0 });
  const bestiary = BESTIARY.map((b) => ({ ...row(b.boss ? boss : enemy, b.id), boss: b.boss }));
  const relics = RELIC_IDS.map((id) => row(relic, id));
  const curses = Object.keys(CURSES).map((id) => row(curse, id));
  const events = ENCOUNTER_IDS.map((id) => row(event, id));
  const deedRows = DEED_IDS.map((id) => ({ id, done: deeds.has(id) }));
  const met = (list) => list.filter((x) => x.seen).length;
  return {
    bestiary,
    relics,
    curses,
    events,
    deeds: deedRows,
    totals: {
      bestiary: { met: met(bestiary), of: bestiary.length },
      relics: { met: met(relics) + met(curses), of: relics.length + curses.length },
      events: { met: met(events), of: events.length },
      deeds: { met: deedRows.filter((d) => d.done).length, of: deedRows.length },
    },
  };
}

export const JOURNAL_CSS = `
.st-tabs { display: flex; gap: ${px(8)}; flex-wrap: wrap; justify-content: center; }
.st-tab { display: inline-flex; align-items: baseline; gap: ${px(8)}; padding: ${px(8)} ${px(18)}; border-radius: ${px(10)};
  font: inherit; font-size: ${px(21)}; font-weight: 800; letter-spacing: 0.08em; cursor: pointer;
  color: ${P.warmGrey}; background: ${P.voidCharcoal}; border: max(2px, ${px(2)}) solid ${P.warmGrey}55; }
.st-tab small { font-size: ${px(16)}; font-weight: 700; color: ${P.warmGrey}; letter-spacing: 0.04em; }
.st-tab.st-on { color: ${P.voidCharcoal}; background: ${P.hearthAmber}; border-color: ${P.hearthAmber}; box-shadow: 0 0 ${px(14)} ${P.hearthAmber}55; }
.st-tab.st-on small { color: ${P.voidCharcoal}; }
.st-pane[hidden] { display: none !important; }
.jr-pane { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: ${px(24)}; width: 100%; min-height: ${px(560)}; }
.jr-list { display: flex; flex-direction: column; gap: ${px(10)}; min-width: 0; max-height: 64vh; overflow: auto; padding: ${px(4)}; }
.jr-sec { font-size: ${px(18)}; font-weight: 800; letter-spacing: 0.22em; color: ${P.warmGrey}; margin-top: ${px(6)}; }
.jr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(${px(92)}, 1fr)); gap: ${px(10)}; }
.jr-tile { position: relative; aspect-ratio: 1; padding: 0; border-radius: ${px(12)}; cursor: pointer; overflow: hidden;
  display: flex; align-items: center; justify-content: center; color: var(--rim, ${P.bone});
  background: radial-gradient(circle at 50% 42%, #3A332C 0%, ${P.voidCharcoal} 72%);
  border: max(2px, ${px(2)}) solid color-mix(in srgb, var(--rim, ${P.warmGrey}) 55%, transparent); transition: transform 120ms ease, box-shadow 160ms ease; }
.jr-tile img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.jr-tile .rl-icon, .jr-tile .ev-sigil { width: 58%; height: 58%; }
.jr-tile.jr-boss { --rim: ${P.godstuffViolet}; }
.jr-tile .jr-n { position: absolute; right: ${px(6)}; bottom: ${px(4)}; font-size: ${px(15)}; font-weight: 800; color: ${P.parchment}; text-shadow: 0 0 ${px(4)} #000, 0 0 ${px(2)} #000; }
.jr-tile.jr-unseen { border-style: dashed; border-color: ${P.warmGrey}66; }
.jr-tile.jr-unseen img, .jr-tile.jr-unseen svg { filter: brightness(0) drop-shadow(0 0 ${px(3)} ${P.warmGrey}AA); opacity: 0.75; }
.jr-tile.jr-sel { transform: translateY(-${px(2)}); box-shadow: 0 0 0 max(2px, ${px(2)}) ${P.parchment}, 0 0 ${px(18)} var(--rim, ${P.hearthAmber}); }
.jr-detail { display: flex; flex-direction: column; gap: ${px(10)}; min-width: 0; max-height: 64vh; overflow: auto; padding: ${px(16)} ${px(20)}; border-radius: ${px(14)};
  background: linear-gradient(172deg, #2C2823 0%, ${P.voidCharcoal} 80%); border: max(2px, ${px(2)}) solid var(--rim, ${P.warmGrey})88; }
.jr-stage { position: relative; flex: none; align-self: center; width: min(100%, ${px(380)}, 34vh); aspect-ratio: 1; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 58%, color-mix(in srgb, var(--rim, ${P.hearthAmber}) 22%, transparent) 0%, transparent 62%),
    radial-gradient(ellipse at 50% 80%, #00000088 0%, transparent 55%); }
.jr-stage .jr-canvas, .jr-stage img { width: 112%; height: 112%; object-fit: contain; }
.jr-stage .rl-icon, .jr-stage .ev-sigil { width: 46%; height: 46%; color: var(--rim, ${P.bone}); filter: drop-shadow(0 0 ${px(14)} var(--rim, ${P.bone})); }
.jr-stage.jr-unseen .jr-canvas, .jr-stage.jr-unseen img, .jr-stage.jr-unseen svg { filter: brightness(0) drop-shadow(0 0 ${px(6)} ${P.warmGrey}); }
.jr-name { font-size: ${px(30)}; font-weight: 800; color: ${P.parchment}; line-height: 1.1; }
.jr-tag { font-size: ${px(18)}; font-weight: 800; letter-spacing: 0.14em; color: var(--rim, ${P.hearthAmber}); }
.jr-lore { font-size: ${px(20)}; color: ${P.bone}; font-style: italic; line-height: 1.35; }
.jr-h { font-size: ${px(17)}; font-weight: 800; letter-spacing: 0.2em; color: ${P.warmGrey}; margin-top: ${px(4)}; }
.jr-text { font-size: ${px(21)}; color: ${P.bone}; line-height: 1.36; }
.jr-count { font-size: ${px(21)}; font-weight: 800; color: ${P.hearthAmber}; }
.jr-dim { color: ${P.warmGrey}; font-style: italic; }
.jr-deeds { display: grid; grid-template-columns: repeat(auto-fill, minmax(${px(340)}, 1fr)); gap: ${px(10)}; width: 100%; max-height: 64vh; overflow: auto; padding: ${px(4)}; }
.jr-deed { display: grid; grid-template-columns: ${px(34)} 1fr auto; gap: ${px(10)}; align-items: center; text-align: left; padding: ${px(10)} ${px(14)};
  border-radius: ${px(12)}; font: inherit; color: ${P.bone}; cursor: default;
  background: ${P.voidCharcoal}; border: max(2px, ${px(2)}) dashed ${P.warmGrey}66; }
.jr-deed.jr-done { border-style: solid; border-color: ${P.hearthAmber}99; background: linear-gradient(172deg, #2C2823 0%, ${P.voidCharcoal} 80%); }
.jr-deed i { width: ${px(22)}; height: ${px(22)}; transform: rotate(45deg); border: max(2px, ${px(2)}) solid ${P.warmGrey}; justify-self: center; }
.jr-deed.jr-done i { background: ${P.hearthAmber}; border-color: ${P.hearthAmber}; box-shadow: 0 0 ${px(10)} ${P.hearthAmber}88; }
.jr-deed b { display: block; font-size: ${px(21)}; color: ${P.parchment}; }
.jr-deed.jr-open b { color: ${P.bone}; }
.jr-deed span { font-size: ${px(18)}; color: ${P.bone}; }
.jr-deed em { font-style: normal; font-size: ${px(17)}; font-weight: 800; color: ${P.paleGold}; white-space: nowrap; }
@media (max-width: 900px) { .jr-pane { grid-template-columns: minmax(0, 1fr); } }
`;

const landName = (lv) => t(LEVELS[lv].name);
const landsLine = (lands) => lands.map(landName).join(' · ');

// One page (Bestiary / Relics / Events): grid + detail. `getInfo` reads the
// profile view the screen rendered with.
export function createJournalPage(kind, getInfo) {
  const el = document.createElement('div');
  el.className = `st-pane jr-pane jr-${kind}`;
  el.innerHTML = `<div class="jr-list"></div><div class="jr-detail" aria-live="polite"></div>`;
  const list = el.querySelector('.jr-list');
  const detail = el.querySelector('.jr-detail');
  let viewer = null;
  let selected = null;
  let thumbQueue = [];
  let thumbRaf = 0;

  function entries() {
    const info = getInfo();
    if (kind === 'bestiary') return info.bestiary.map((r) => ({ ...r, kind: r.boss ? 'boss' : 'enemy' }));
    if (kind === 'relics') return [...info.relics.map((r) => ({ ...r, kind: 'relic' })), ...info.curses.map((r) => ({ ...r, kind: 'curse' }))];
    return info.events.map((r) => ({ ...r, kind: 'event' }));
  }
  const keyOf = (e) => `${e.kind}:${e.id}`;

  function tileArt(e) {
    if (e.kind === 'enemy' || e.kind === 'boss') {
      const url = thumbFor(e.id);
      if (url) return `<img alt="" src="${url}">`;
      thumbQueue.push(e.id);
      return '';
    }
    if (e.kind === 'relic') return relicIconHtml(e.id, 48);
    if (e.kind === 'curse') return curseIconHtml(48, !!CURSES[e.id].major);
    return encounterSigil(e.id, 48);
  }
  function rimOf(e) {
    if (e.kind === 'boss') return P.godstuffViolet;
    if (e.kind === 'enemy' && CHAMPION_SET.has(e.id)) return P.paleGold;
    if (e.kind === 'relic') return RARITY_COLOR[RELICS[e.id].rarity] ?? P.bone;
    if (e.kind === 'curse') return P.godstuffViolet;
    if (e.kind === 'event') return ENCOUNTER_COLOR[e.id] ?? P.bone;
    return P.hearthAmber;
  }

  function renderList() {
    const all = entries();
    const groups = [];
    if (kind === 'bestiary') {
      for (const a of ACT_IDS) {
        const ids = new Set(BESTIARY.filter((b) => !b.boss && !b.champion && b.lands[0] === a).map((b) => b.id));
        groups.push([landName(a), all.filter((e) => e.kind === 'enemy' && ids.has(e.id))]);
      }
      // CHAMPION ROOMS: the four champions, between the lands and the bosses.
      groups.push([t('Champions'), all.filter((e) => e.kind === 'enemy' && CHAMPION_SET.has(e.id))]);
      groups.push([t('Bosses'), all.filter((e) => e.kind === 'boss')]);
    } else if (kind === 'relics') {
      groups.push([t('Relics'), all.filter((e) => e.kind === 'relic')]);
      groups.push([t('Curses'), all.filter((e) => e.kind === 'curse')]);
    } else groups.push([t('Event rooms'), all]);
    list.innerHTML = '';
    for (const [title, rows] of groups) {
      if (!rows.length) continue;
      const sec = document.createElement('div');
      sec.className = 'jr-sec';
      sec.textContent = title.toUpperCase();
      list.appendChild(sec);
      const grid = document.createElement('div');
      grid.className = 'jr-grid';
      for (const e of rows) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `jr-tile${e.kind === 'boss' ? ' jr-boss' : ''}${e.seen ? '' : ' jr-unseen'}`;
        b.dataset.nav = '';
        b.dataset.jid = keyOf(e);
        b.style.setProperty('--rim', rimOf(e));
        b.setAttribute('aria-label', e.seen ? t(nameOf(e)) : t('Not met yet'));
        b.innerHTML = `${tileArt(e)}${e.seen && e.count > 0 && (e.kind === 'enemy' || e.kind === 'boss') ? `<span class="jr-n">${e.count}</span>` : ''}`;
        b.addEventListener('mouseenter', () => select(b.dataset.jid));
        b.addEventListener('focus', () => select(b.dataset.jid));
        b.addEventListener('click', () => select(b.dataset.jid));
        grid.appendChild(b);
      }
      list.appendChild(grid);
    }
  }

  function nameOf(e) {
    if (e.kind === 'enemy' || e.kind === 'boss') return BESTIARY.find((b) => b.id === e.id).name;
    if (e.kind === 'relic') return RELICS[e.id].name;
    if (e.kind === 'curse') return CURSES[e.id].name;
    return ENCOUNTERS[e.id].name;
  }

  // Tile stills, a few per frame (each one is a render of a fresh rig).
  function pumpThumbs() {
    thumbRaf = 0;
    if (!viewer || !thumbQueue.length) return;
    for (let i = 0; i < 2 && thumbQueue.length; i++) {
      const id = thumbQueue.shift();
      const url = viewer.thumb(id);
      if (!url) continue;
      for (const b of list.querySelectorAll(`.jr-tile[data-jid$=":${id}"]`)) {
        if (b.querySelector('img')) continue;
        const img = document.createElement('img');
        img.alt = '';
        img.src = url;
        b.prepend(img);
      }
    }
    if (thumbQueue.length) thumbRaf = requestAnimationFrame(pumpThumbs);
  }

  function select(jid) {
    const e = entries().find((x) => keyOf(x) === jid);
    if (!e) return;
    selected = jid;
    for (const b of list.querySelectorAll('.jr-tile')) b.classList.toggle('jr-sel', b.dataset.jid === jid);
    detail.style.setProperty('--rim', rimOf(e));
    renderDetail(e);
  }

  function renderDetail(e) {
    const name = e.seen ? esc(t(nameOf(e))) : '???';
    const parts = [];
    const stage = (inner) => `<div class="jr-stage${e.seen ? '' : ' jr-unseen'}">${inner}</div>`;
    if (e.kind === 'enemy' || e.kind === 'boss') {
      const b = BESTIARY.find((x) => x.id === e.id);
      parts.push(stage(''));
      parts.push(`<div class="jr-tag">${esc(t(b.role).toUpperCase())} · ${esc(landsLine(b.lands))}</div>`);
      parts.push(`<div class="jr-name">${name}</div>`);
      if (e.seen) {
        parts.push(`<div class="jr-lore">${esc(t(b.lore))}</div>`);
        parts.push(`<div class="jr-h">${esc(t('ATTACKS AND TELLS'))}</div><div class="jr-text">${esc(t(b.text))}</div>`);
        parts.push(`<div class="jr-count">${esc(t('Felled: {n}', { n: e.count }))}</div>`);
      } else parts.push(`<div class="jr-text jr-dim">${esc(t('Not met yet. It lives in {land}.', { land: landName(b.lands[0]) }))}</div>`);
    } else if (e.kind === 'relic') {
      const r = RELICS[e.id];
      parts.push(stage(relicIconHtml(e.id, 96)));
      parts.push(`<div class="jr-tag">${esc(t(r.rarity).toUpperCase())}${r.cls && CLASS_NAME[r.cls] ? ` · ${esc(t(CLASS_NAME[r.cls]).toUpperCase())}` : ''}</div>`);
      parts.push(`<div class="jr-name">${name}</div>`);
      if (e.seen) {
        parts.push(`<div class="jr-text">${esc(t(r.text))}</div>`);
        parts.push(`<div class="jr-count${e.count ? '' : ' jr-dim'}">${esc(e.count ? tn(e.count, 'Taken {n} time', 'Taken {n} times') : t('Seen, never taken'))}</div>`);
      } else parts.push(`<div class="jr-text jr-dim">${esc(t('Not found yet.'))}</div>`);
    } else if (e.kind === 'curse') {
      const c = CURSES[e.id];
      parts.push(stage(curseIconHtml(96, !!c.major)));
      parts.push(`<div class="jr-tag">${esc(t(c.major ? 'MAJOR CURSE' : 'ROOM CURSE'))}</div>`);
      parts.push(`<div class="jr-name">${name}</div>`);
      if (e.seen) {
        parts.push(`<div class="jr-text">${esc(t(c.text))}</div>`);
        parts.push(`<div class="jr-count">${esc(tn(e.count, 'Borne {n} time', 'Borne {n} times'))}</div>`);
      } else parts.push(`<div class="jr-text jr-dim">${esc(t('Not borne yet.'))}</div>`);
    } else {
      const v = ENCOUNTERS[e.id];
      parts.push(stage(encounterSigil(e.id, 96)));
      parts.push(`<div class="jr-tag">${esc(t('EVENT ROOM'))}</div>`);
      parts.push(`<div class="jr-name">${name}</div>`);
      if (e.seen) {
        parts.push(`<div class="jr-lore">${esc(t(v.text))}</div>`);
        parts.push(`<div class="jr-h">${esc(t('Take').toUpperCase())}</div><div class="jr-text">${esc(t(v.detail))} ${esc(t(v.effect))}</div>`);
        parts.push(`<div class="jr-h">${esc(t('Leave').toUpperCase())}</div><div class="jr-text">${esc(t('Walk on with nothing gained and nothing lost.'))}</div>`);
        parts.push(`<div class="jr-count">${esc(tn(e.count, 'Visited {n} time', 'Visited {n} times'))}</div>`);
      } else parts.push(`<div class="jr-text jr-dim">${esc(t('Not found yet. Look behind a door marked ?.'))}</div>`);
    }
    detail.innerHTML = parts.join('');
    if (e.kind === 'enemy' || e.kind === 'boss') {
      const st = detail.querySelector('.jr-stage');
      if (viewer) {
        st.appendChild(viewer.canvas);
        viewer.show(e.id);
      } else {
        const url = thumbFor(e.id);
        if (url) st.innerHTML = `<img alt="" src="${url}">`;
      }
    } else if (viewer) viewer.show(null);
  }

  return {
    el,
    open() {
      if (kind === 'bestiary' && !viewer) viewer = createModelViewer();
      thumbQueue = [];
      renderList();
      if (viewer && thumbQueue.length && !thumbRaf) thumbRaf = requestAnimationFrame(pumpThumbs);
      const keep = selected && list.querySelector(`.jr-tile[data-jid="${selected}"]`);
      const first = keep || list.querySelector('.jr-tile:not(.jr-unseen)') || list.querySelector('.jr-tile');
      if (first) select(first.dataset.jid);
      return first;
    },
    pause() {
      if (viewer) viewer.show(null);
    },
    focusChanged(node) {
      if (node && node.dataset && node.dataset.jid) select(node.dataset.jid);
    },
    dispose() {
      if (thumbRaf) cancelAnimationFrame(thumbRaf);
      thumbRaf = 0;
      if (viewer) viewer.dispose();
      viewer = null;
    },
    debug: () => ({ kind, selected, tiles: list.querySelectorAll('.jr-tile').length, unseen: list.querySelectorAll('.jr-tile.jr-unseen').length, viewer: viewer ? viewer.debug() : null, detail: detail.textContent.replace(/\s+/g, ' ').trim() }),
  };
}

// The Deeds page: every deed, done or not (they are goals, so none is hidden).
export function createDeedsPage(getInfo) {
  const el = document.createElement('div');
  el.className = 'st-pane jr-deeds';
  return {
    el,
    open() {
      const info = getInfo();
      el.innerHTML = '';
      for (const d of info.deeds) {
        const D = DEEDS[d.id];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `jr-deed ${d.done ? 'jr-done' : 'jr-open'}`;
        b.dataset.nav = '';
        b.dataset.deed = d.id;
        b.innerHTML = '<i></i><div><b></b><span></span></div><em></em>';
        b.querySelector('b').textContent = t(D.name);
        b.querySelector('span').textContent = t(D.text);
        b.querySelector('em').textContent = d.done ? t('Done') : tn(D.embers, '{n} Ember', '{n} Embers');
        el.appendChild(b);
      }
      return el.querySelector('.jr-deed');
    },
    pause() {},
    focusChanged() {},
    dispose() {},
    debug: () => ({ kind: 'deeds', rows: el.querySelectorAll('.jr-deed').length, done: el.querySelectorAll('.jr-deed.jr-done').length }),
  };
}

