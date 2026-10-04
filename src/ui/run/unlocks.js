// UNLOCKS — the between-runs screen (docs/UNLOCKS.md). An app screen
// (registerScreen('unlocks')) the camp opens with U or the portal prompt's
// "Unlocks" chip. It shows this player's profile (Embers, what the last run
// paid and why), what comes next and how to earn it, and every unlock by
// kind: Kits, Heirlooms, Purse, Vows, Tints, plus the Deeds list.
//
// Cards: E / Enter / click on a card buys it (requirement met, enough
// Embers), or equips / takes off one already owned. A locked card names its
// requirement. Q / E (keyboard tabs) or the tab row switch kinds. "Plain run"
// takes off everything that changes a run (tints stay: they are cosmetic).
// Esc / B backs out to the camp. Blocking: the single-player sim pauses.
//
// Every change is one atomic profile write (save service), so a second tab
// and a reload see it; the screen redraws when another tab writes.
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { service } from '../../app/registry.js';
import { UNLOCKS, UNLOCK_IDS, UNLOCK_KINDS, KIND_LABEL, DEEDS, DEED_IDS, CURRENCY, EMBER_RULES, unlockState, reqText, nextGoals } from '../../data/unlocks.js';
import { CLASS_NAME } from '../../data/classes.js';
import { RELICS } from '../../sim/relics.js';
import { SKILLS } from '../../sim/skills.js';
import { relicIconHtml } from './relicicons.js';

const STYLE_ID = 'ul-unlocks-style';
const TABS = [...UNLOCK_KINDS, 'deed'];
const TAB_LABEL = { ...KIND_LABEL, deed: 'Deeds' };
const TAB_BLURB = {
  kit: 'A kit replaces one class’s starting skills. One kit per class.',
  heirloom: 'Begin every run holding one relic. Find a relic in a run to reveal its heirloom.',
  purse: 'Begin every run with extra Glint for the draft and the peddler.',
  vow: `Wear vows to curse every combat room. Each vow pays ${Math.round(EMBER_RULES.perVow * 100)}% more ${CURRENCY}.`,
  tint: 'Recolour a class’s effects. Cosmetic, and only on your screen.',
  deed: `One-off feats. Each pays its ${CURRENCY} once, on the run that does it.`,
};
const EMBER_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1.2 3.4 5.6 5.6 5.6 10.6A5.6 5.6 0 0 1 12 18.7a5.6 5.6 0 0 1-5.6-5.6c0-2.6 1.6-3.9 2.6-5.6.3 1.7 1 2.6 2 3.1-.3-2.8.2-5.6 1-8.1z" fill="currentColor"/></svg>';
const LOCK_SVG =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="14" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M11 14 V10 A5 5 0 0 1 21 10 V14" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.ul-unlocks .ul-wrap {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(96vw, ${px(1560)}); height: min(94vh, ${px(980)}); padding: ${px(24)} ${px(30)} ${px(18)};
  display: grid; grid-template-columns: ${px(400)} 1fr; grid-template-rows: auto 1fr auto; gap: ${px(14)} ${px(26)};
}
.ul-unlocks .ul-head { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: ${px(20)}; }
.ul-unlocks .ul-title { display: flex; flex-direction: column; gap: ${px(2)}; }
.ul-unlocks .ul-kicker { font-size: ${px(18)}; letter-spacing: 0.28em; color: ${P.warmGrey}; font-weight: 800; }
.ul-unlocks .ul-bal { display: flex; align-items: center; gap: ${px(12)}; padding: ${px(10)} ${px(20)}; border-radius: ${px(40)};
  background: radial-gradient(circle at 30% 30%, #4A3420, ${P.voidCharcoal}); border: max(2px, ${px(2)}) solid ${P.hearthAmber}AA;
  box-shadow: 0 0 ${px(26)} ${P.hearthAmber}44; color: ${P.parchment}; }
.ul-unlocks .ul-bal svg { width: ${px(34)}; height: ${px(34)}; color: ${P.hearthAmber}; filter: drop-shadow(0 0 ${px(6)} ${P.hearthAmber}); }
.ul-unlocks .ul-bal b { font-size: ${px(38)}; font-weight: 800; color: ${P.hearthAmber}; }
.ul-unlocks .ul-bal span { font-size: ${px(19)}; color: ${P.bone}; }
.ul-unlocks .ul-side { display: flex; flex-direction: column; gap: ${px(10)}; min-height: 0; overflow: auto; }
.ul-unlocks .ul-box { padding: ${px(10)} ${px(16)}; border-radius: ${px(14)}; background: #00000033; border: max(1px, ${px(2)}) solid ${P.warmGrey}44; }
.ul-unlocks .ul-box h3 { margin: 0 0 ${px(8)}; font-size: ${px(19)}; letter-spacing: 0.2em; color: ${P.warmGrey}; font-weight: 800; }
.ul-unlocks .ul-line { display: flex; justify-content: space-between; gap: ${px(10)}; font-size: ${px(19)}; color: ${P.bone}; line-height: 1.36; }
.ul-unlocks .ul-line b { color: ${P.hearthAmber}; font-weight: 800; white-space: nowrap; }
.ul-unlocks .ul-line.ul-total { border-top: 1px solid ${P.warmGrey}55; margin-top: ${px(4)}; padding-top: ${px(4)}; color: ${P.parchment}; font-weight: 700; }
.ul-unlocks .ul-line i { font-style: normal; color: ${P.warmGrey}; }
.ul-unlocks .ul-empty { font-size: ${px(19)}; color: ${P.warmGrey}; }
.ul-unlocks .ul-plain { margin-top: ${px(8)}; width: 100%; padding: ${px(9)}; font: inherit; font-size: ${px(19)}; font-weight: 700; cursor: pointer;
  color: ${P.parchment}; background: ${P.voidCharcoal}; border: max(1px, ${px(2)}) solid ${P.warmGrey}AA; border-radius: ${px(10)}; }
.ul-unlocks .ul-plain.ap-focus { outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; border-color: ${P.hearthAmber}; }
.ul-unlocks .ul-net { font-size: ${px(18)}; color: ${P.godstuffViolet}; line-height: 1.4; }
.ul-unlocks .ul-main { display: flex; flex-direction: column; gap: ${px(10)}; min-height: 0; }
.ul-unlocks .ul-tabs { display: flex; gap: ${px(8)}; flex-wrap: wrap; }
.ul-unlocks .ul-tab { font: inherit; font-size: ${px(20)}; font-weight: 800; letter-spacing: 0.06em; padding: ${px(8)} ${px(16)}; cursor: pointer;
  color: ${P.bone}; background: transparent; border: max(1px, ${px(2)}) solid ${P.warmGrey}66; border-radius: ${px(30)}; }
.ul-unlocks .ul-tab[aria-selected="true"] { color: ${P.voidCharcoal}; background: ${P.hearthAmber}; border-color: ${P.hearthAmber}; }
.ul-unlocks .ul-tab.ap-focus { outline: max(2px, ${px(2)}) solid ${P.parchment}; outline-offset: ${px(2)}; }
.ul-unlocks .ul-tab small { font-size: ${px(16)}; opacity: 0.8; margin-left: ${px(6)}; }
.ul-unlocks .ul-blurb { font-size: ${px(19)}; color: ${P.bone}; }
.ul-unlocks .ul-grid { flex: 1 1 auto; min-height: 0; overflow: auto; padding: ${px(6)} ${px(6)} ${px(10)};
  display: grid; grid-template-columns: repeat(auto-fill, minmax(${px(300)}, 1fr)); gap: ${px(14)}; align-content: start; }
.ul-unlocks .ul-card { position: relative; display: flex; flex-direction: column; gap: ${px(6)}; text-align: left; min-height: ${px(178)};
  padding: ${px(14)} ${px(16)} ${px(12)}; font: inherit; cursor: pointer; color: ${P.parchment};
  background: linear-gradient(172deg, #2C2823 0%, ${P.voidCharcoal} 75%); border: max(2px, ${px(2)}) solid ${P.warmGrey}77; border-radius: ${px(14)};
  transition: transform 90ms ease, box-shadow 90ms ease, border-color 90ms ease; }
.ul-unlocks .ul-card.ap-focus { outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(3)}; transform: translateY(${px(-2)}) scale(1.02);
  box-shadow: 0 ${px(10)} ${px(24)} #000000AA, 0 0 ${px(18)} ${P.hearthAmber}33; }
.ul-unlocks .ul-card .ul-kind { font-size: ${px(16)}; letter-spacing: 0.2em; font-weight: 800; color: ${P.warmGrey}; display: flex; align-items: center; gap: ${px(8)}; }
.ul-unlocks .ul-card .ul-kind .ul-ico { width: ${px(30)}; height: ${px(30)}; display: inline-flex; }
.ul-unlocks .ul-card .ul-kind .ul-ico svg { width: 100%; height: 100%; }
.ul-unlocks .ul-card .ul-name { font-size: ${px(25)}; font-weight: 800; line-height: 1.1; }
.ul-unlocks .ul-card .ul-text { font-size: ${px(18)}; color: ${P.bone}; line-height: 1.35; flex: 1 1 auto; }
.ul-unlocks .ul-card .ul-swatch { display: flex; gap: ${px(6)}; }
.ul-unlocks .ul-card .ul-swatch i { width: ${px(26)}; height: ${px(14)}; border-radius: ${px(7)}; box-shadow: 0 0 ${px(8)} currentColor; }
.ul-unlocks .ul-card .ul-foot { display: flex; align-items: center; justify-content: space-between; gap: ${px(8)}; font-size: ${px(19)}; font-weight: 800; }
.ul-unlocks .ul-card .ul-foot svg { width: ${px(20)}; height: ${px(20)}; vertical-align: -0.15em; }
.ul-unlocks .ul-card[data-state="locked"] { border-style: dashed; border-color: ${P.bone}55; }
.ul-unlocks .ul-card[data-state="locked"] .ul-name, .ul-unlocks .ul-card[data-state="locked"] .ul-text { color: ${P.warmGrey}; }
.ul-unlocks .ul-card[data-state="locked"] .ul-foot { color: ${P.bone}; font-weight: 700; }
.ul-unlocks .ul-card[data-state="buy"] .ul-foot { color: ${P.hearthAmber}; }
.ul-unlocks .ul-card[data-state="poor"] .ul-foot { color: ${P.warmGrey}; }
.ul-unlocks .ul-card[data-state="owned"] .ul-foot { color: ${P.bone}; }
.ul-unlocks .ul-card[data-equipped="true"] { border-color: ${P.hearthAmber}; box-shadow: inset 0 0 ${px(22)} ${P.hearthAmber}22; }
.ul-unlocks .ul-card[data-equipped="true"] .ul-foot { color: ${P.brightHeal}; }
.ul-unlocks .ul-card[data-kind="vow"][data-equipped="true"] { border-color: ${P.godstuffViolet}; box-shadow: inset 0 0 ${px(22)} ${P.godstuffViolet}33; }
.ul-unlocks .ul-card[data-kind="vow"][data-equipped="true"] .ul-foot { color: ${P.godstuffViolet}; }
.ul-unlocks .ul-card[data-state="done"] { border-color: ${P.paleGold}AA; }
.ul-unlocks .ul-card[data-state="done"] .ul-foot { color: ${P.paleGold}; }
.ul-unlocks .ul-card.ul-pulse { animation: ul-pulse 420ms ease; }
@keyframes ul-pulse { 0% { box-shadow: 0 0 0 ${P.hearthAmber}00; } 40% { box-shadow: 0 0 ${px(34)} ${P.hearthAmber}AA; } 100% { box-shadow: 0 0 0 ${P.hearthAmber}00; } }
.ul-unlocks .ul-card.ul-shake { animation: ul-shake 300ms ease; }
@keyframes ul-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(${px(-8)}); } 50% { transform: translateX(${px(7)}); } 75% { transform: translateX(${px(-4)}); } }
.ul-unlocks .ul-note { grid-column: 1 / -1; min-height: ${px(26)}; font-size: ${px(20)}; color: ${P.bone}; text-align: center; }
.ul-unlocks .ul-foot-keys { grid-column: 1 / -1; display: flex; gap: ${px(24)}; justify-content: center; flex-wrap: wrap; font-size: ${px(19)}; color: ${P.warmGrey}; }
.ul-unlocks .ul-foot-keys b { display: inline-flex; align-items: center; justify-content: center; min-width: ${px(32)}; height: ${px(30)}; padding: 0 ${px(8)}; margin-right: ${px(6)};
  border-radius: ${px(7)}; border: max(1px, ${px(2)}) solid ${P.warmGrey}AA; background: ${P.voidCharcoal}; color: ${P.bone}; font-weight: 700; }
@media (max-width: 900px) {
  .ul-unlocks .ul-wrap { grid-template-columns: 1fr; grid-template-rows: auto auto 1fr auto; overflow: auto; }
}
`;
  document.head.appendChild(st);
}

const saveSvc = () => {
  try {
    return service('save');
  } catch {
    return null;
  }
};
const netRole = () => {
  try {
    const n = service('net');
    if (!n) return null;
    if (typeof n.isGuest === 'function' && n.isGuest()) return 'guest';
    if (typeof n.isHost === 'function' && n.isHost()) return 'host';
  } catch {
    /* no net */
  }
  return null;
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function profileCtx() {
  const s = saveSvc();
  const p = s && typeof s.profile === 'function' ? s.profile() : null;
  if (!p || !p.meta) return null;
  return { meta: p.meta, records: p.records || {}, profile: p };
}

function isEquipped(id, meta) {
  const u = UNLOCKS[id];
  const l = meta.loadout;
  if (!u || !l) return false;
  if (u.kind === 'kit') return l.kits[u.cls] === id;
  if (u.kind === 'tint') return l.tints[u.cls] === id;
  if (u.kind === 'heirloom') return l.heirloom === id;
  if (u.kind === 'purse') return l.purse === u.tier;
  if (u.kind === 'vow') return l.vows.includes(id);
  return false;
}

export function createUnlocksScreen(ctx) {
  installStyle();
  const { manager, app } = ctx;
  const el = document.createElement('div');
  el.className = 'ul-unlocks';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `${CURRENCY} and unlocks`);
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ul-wrap ap-plate">
      <div class="ul-head">
        <div class="ul-title">
          <div class="ul-kicker">BETWEEN RUNS</div>
          <h2 class="ap-h2">${CURRENCY} &amp; Unlocks</h2>
        </div>
        <div class="ul-bal" aria-live="polite">${EMBER_SVG}<b class="ul-bal-n">0</b><span class="ul-bal-t">${CURRENCY}</span></div>
      </div>
      <div class="ul-side">
        <div class="ul-box ul-last"><h3>LAST RUN</h3><div class="ul-last-b"></div></div>
        <div class="ul-box ul-next"><h3>WHAT COMES NEXT</h3><div class="ul-next-b"></div></div>
        <div class="ul-box ul-wear"><h3>NEXT RUN WEARS</h3><div class="ul-wear-b"></div>
          <button type="button" class="ul-plain" data-nav>Plain run (take everything off)</button>
          <div class="ul-net"></div>
        </div>
        <div class="ul-box ul-life"><h3>PROFILE</h3><div class="ul-life-b"></div></div>
      </div>
      <div class="ul-main">
        <div class="ul-tabs" role="tablist"></div>
        <div class="ul-blurb"></div>
        <div class="ul-grid"></div>
      </div>
      <div class="ul-note" aria-live="polite"></div>
      <div class="ul-foot-keys">
        <span><b>Q</b><b>E</b>Kind</span>
        <span><b>Enter</b>Buy / wear / take off</span>
        <span><b>Esc</b>Back to camp</span>
      </div>
    </div>`;
  const $ = (s) => el.querySelector(s);
  const tabsEl = $('.ul-tabs');
  const gridEl = $('.ul-grid');
  const noteEl = $('.ul-note');
  let tab = 'kit';
  let off = null;
  let log = []; // probe: the last actions { id, action, ok, reason }

  function note(t) {
    noteEl.textContent = t || '';
  }

  // ------------------------------------------------------------ side --
  function renderSide(c) {
    const m = c.meta;
    $('.ul-bal-n').textContent = String(m.embers);
    const last = m.lastAward;
    const lastB = $('.ul-last-b');
    if (!last) lastB.innerHTML = `<div class="ul-empty">Finish a run to earn ${CURRENCY}: ${EMBER_RULES.perRoom} per room, more for each level and boss, and deeds pay once.</div>`;
    else {
      const res = { victory: 'Victory', defeat: 'Defeat', abandoned: 'Left early' }[last.result] ?? '';
      lastB.innerHTML =
        (last.lines || []).map((l) => `<div class="ul-line"><span>${esc(l.label)}</span><b>${l.embers >= 0 ? '+' : ''}${l.embers}</b></div>`).join('') +
        `<div class="ul-line ul-total"><span>${esc(res)}</span><b>+${last.embers}</b></div>` +
        (last.unlocked && last.unlocked.length ? `<div class="ul-line"><i>Unlocked: ${last.unlocked.map((id) => esc(UNLOCKS[id] ? UNLOCKS[id].name : id)).join(', ')}</i></div>` : '');
    }
    const goals = nextGoals(c, 3);
    $('.ul-next-b').innerHTML = goals.length
      ? goals.map((g) => `<div class="ul-line"><span>${esc(g.name)}</span><i>${esc(g.how)}</i></div>`).join('')
      : '<div class="ul-empty">Everything is unlocked. Wear vows for more.</div>';
    const l = m.loadout;
    const wear = [];
    for (const cls of Object.keys(l.kits)) if (l.kits[cls]) wear.push(`${CLASS_NAME[cls]}: ${UNLOCKS[l.kits[cls]].name} kit`);
    if (l.heirloom) wear.push(`Heirloom: ${UNLOCKS[l.heirloom].name}`);
    if (l.purse) wear.push(`Purse: +${UNLOCKS[`purse_${l.purse}`].glint} Glint`);
    for (const v of l.vows) wear.push(UNLOCKS[v].name);
    const tints = Object.keys(l.tints).filter((k) => l.tints[k]).map((k) => UNLOCKS[l.tints[k]].name);
    $('.ul-wear-b').innerHTML =
      (wear.length ? wear.map((w) => `<div class="ul-line"><span>${esc(w)}</span></div>`).join('') : '<div class="ul-empty">A plain run: the starting kits, no heirloom, no vows.</div>') +
      (tints.length ? `<div class="ul-line"><i>${esc(tints.join(', '))} (cosmetic)</i></div>` : '') +
      (l.vows.length ? `<div class="ul-line"><i>${CURRENCY} +${Math.round(EMBER_RULES.perVow * 100 * l.vows.length)}%</i></div>` : '');
    const role = netRole();
    $('.ul-net').textContent =
      role === 'guest'
        ? 'Online as a guest: the host’s kits, heirloom, purse and vows set this party’s run. Yours apply when you host. You still earn on your own profile, and your tints show on your screen.'
        : role === 'host'
          ? 'Online as host: your kits, heirloom, purse and vows set the whole party’s run. Every player earns on their own profile.'
          : '';
    const r = c.records;
    $('.ul-life-b').innerHTML =
      `<div class="ul-line"><span>Runs · victories</span><b>${r.runs || 0} · ${r.victories || 0}</b></div>` +
      `<div class="ul-line"><span>${CURRENCY} earned</span><b>${m.earned}</b></div>` +
      `<div class="ul-line"><span>Unlocks</span><b>${Object.keys(m.owned).length} / ${UNLOCK_IDS.length}</b></div>` +
      `<div class="ul-line"><span>Deeds</span><b>${m.deeds.length} / ${DEED_IDS.length}</b></div>`;
  }

  // ------------------------------------------------------------ tabs --
  function renderTabs(c) {
    tabsEl.textContent = '';
    for (const t of TABS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ul-tab';
      b.dataset.tab = t;
      b.setAttribute('role', 'tab');
      b.setAttribute('data-nav', '');
      b.setAttribute('aria-selected', String(t === tab));
      const ids = t === 'deed' ? DEED_IDS : UNLOCK_IDS.filter((id) => UNLOCKS[id].kind === t);
      const have = t === 'deed' ? c.meta.deeds.length : ids.filter((id) => c.meta.owned[id] !== undefined).length;
      b.innerHTML = `${TAB_LABEL[t]}<small>${have}/${ids.length}</small>`;
      b.addEventListener('click', () => setTab(t));
      tabsEl.appendChild(b);
    }
    $('.ul-blurb').textContent = TAB_BLURB[tab];
  }

  function cardHtml(id, c) {
    const u = UNLOCKS[id];
    const st = unlockState(id, c);
    const eq = st === 'owned' && isEquipped(id, c.meta);
    let kind = u.kind === 'kit' || u.kind === 'tint' ? `${CLASS_NAME[u.cls].toUpperCase()} ${u.kind === 'kit' ? 'KIT' : 'TINT'}` : u.kind === 'heirloom' ? `${u.rarity.toUpperCase()} HEIRLOOM` : u.kind === 'vow' ? 'VOW' : 'PURSE';
    let ico = '';
    if (u.kind === 'heirloom' && st !== 'locked') {
      try {
        ico = `<span class="ul-ico">${relicIconHtml(u.relic, 30)}</span>`;
      } catch {
        ico = '';
      }
    }
    let extra = '';
    if (u.kind === 'kit') extra = `<div class="ul-text">${esc(u.text)}<br><i style="font-style:normal;color:${P.warmGrey}">${u.skills.map((s) => esc(SKILLS[s] ? SKILLS[s].name : s)).join(' · ')}</i></div>`;
    else if (u.kind === 'tint') extra = `<div class="ul-text">${esc(u.text)}</div><div class="ul-swatch"><i style="background:${u.colors.glow};color:${u.colors.glow}"></i><i style="background:${u.colors.second};color:${u.colors.second}"></i></div>`;
    else if (u.kind === 'heirloom' && st === 'locked') extra = `<div class="ul-text">An heirloom you have not found yet.</div>`;
    else extra = `<div class="ul-text">${esc(u.text)}</div>`;
    const name = u.kind === 'heirloom' && st === 'locked' ? 'Unknown heirloom' : u.name;
    let foot;
    if (st === 'locked') foot = `<span>${LOCK_SVG} ${esc(reqText(u.req))}</span>${u.cost ? `<span>${u.cost} ${EMBER_SVG}</span>` : ''}`;
    else if (st === 'buy') foot = `<span>Buy</span><span>${u.cost} ${EMBER_SVG}</span>`;
    else if (st === 'poor') foot = `<span>Need ${u.cost - c.meta.embers} more</span><span>${u.cost} ${EMBER_SVG}</span>`;
    else foot = eq ? `<span>✓ ${u.kind === 'vow' ? 'Sworn' : 'Equipped'}</span><span>Take off</span>` : `<span>Owned</span><span>${u.kind === 'vow' ? 'Swear' : 'Equip'}</span>`;
    return { st, eq, html: `<div class="ul-kind">${ico}${kind}</div><div class="ul-name">${esc(name)}</div>${extra}<div class="ul-foot">${foot}</div>` };
  }

  function deedHtml(id, c) {
    const d = DEEDS[id];
    const done = c.meta.deeds.includes(id);
    return { st: done ? 'done' : 'locked', html: `<div class="ul-kind">DEED</div><div class="ul-name">${esc(d.name)}</div><div class="ul-text">${esc(d.text)}</div><div class="ul-foot"><span>${done ? '✓ Done' : 'Not yet'}</span><span>+${d.embers} ${EMBER_SVG}</span></div>` };
  }

  function renderGrid(c, { rebuild = false } = {}) {
    const ids = tab === 'deed' ? DEED_IDS : UNLOCK_IDS.filter((id) => UNLOCKS[id].kind === tab);
    if (rebuild || gridEl.childElementCount !== ids.length) {
      gridEl.textContent = '';
      for (const id of ids) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ul-card';
        b.dataset.id = id;
        b.dataset.kind = tab;
        b.setAttribute('data-nav', '');
        b.addEventListener('click', () => press(id, b));
        gridEl.appendChild(b);
      }
    }
    for (const b of gridEl.querySelectorAll('.ul-card')) {
      const id = b.dataset.id;
      const r = tab === 'deed' ? deedHtml(id, c) : cardHtml(id, c);
      b.dataset.state = r.st;
      b.dataset.equipped = String(!!r.eq);
      b.innerHTML = r.html;
      b.setAttribute('aria-label', b.textContent.replace(/\s+/g, ' ').trim());
    }
  }

  function render({ rebuild = false } = {}) {
    const c = profileCtx();
    if (!c) {
      note('Your profile is unavailable in this browser mode.');
      return;
    }
    renderSide(c);
    renderTabs(c);
    renderGrid(c, { rebuild });
  }

  function setTab(t, { focus = true } = {}) {
    if (!TABS.includes(t)) return;
    tab = t;
    note('');
    render({ rebuild: true });
    if (focus && manager && typeof manager.focusElement === 'function') {
      const first = gridEl.querySelector('.ul-card') || tabsEl.querySelector(`[data-tab="${t}"]`);
      if (first) manager.focusElement(first);
    }
  }

  function bump(card, cls) {
    if (!card) return;
    card.classList.remove('ul-pulse', 'ul-shake');
    void card.offsetWidth;
    card.classList.add(cls);
  }

  // A card pressed: buy, equip or take off (or say why not).
  function press(id, card) {
    const s = saveSvc();
    const c = profileCtx();
    if (!s || !c) return;
    if (tab === 'deed') {
      note(c.meta.deeds.includes(id) ? `${DEEDS[id].name}: done.` : `${DEEDS[id].text} Pays ${DEEDS[id].embers} ${CURRENCY} once.`);
      return;
    }
    const u = UNLOCKS[id];
    const st = unlockState(id, c);
    let r;
    if (st === 'locked') {
      r = { ok: false, reason: 'locked' };
      note(`${u.kind === 'heirloom' ? 'Unknown heirloom' : u.name}: ${reqText(u.req)}${u.cost ? `, then ${u.cost} ${CURRENCY}` : ''}.`);
      bump(card, 'ul-shake');
    } else if (st === 'poor') {
      r = { ok: false, reason: 'poor' };
      note(`${u.name} costs ${u.cost} ${CURRENCY}. You have ${c.meta.embers}.`);
      bump(card, 'ul-shake');
    } else if (st === 'buy') {
      r = s.buyUnlock(id);
      if (r.ok) {
        note(`${u.name} unlocked${u.kind === 'vow' ? '' : ' and equipped'}.`);
        bump(card, 'ul-pulse');
      } else note(`Couldn't buy ${u.name}.`);
    } else {
      const on = !isEquipped(id, c.meta);
      r = s.equipUnlock(id, on);
      note(r.ok ? `${u.name} ${on ? (u.kind === 'vow' ? 'sworn' : 'equipped') : 'taken off'}.` : `Couldn't change ${u.name}.`);
      if (r.ok) bump(card, 'ul-pulse');
    }
    log.push({ id, state: st, ok: !!(r && r.ok), reason: r && r.reason ? r.reason : null });
    if (log.length > 20) log.shift();
    render();
  }

  $('.ul-plain').addEventListener('click', () => {
    const s = saveSvc();
    if (!s) return;
    s.clearLoadout();
    note('Plain run: kits, heirloom, purse and vows taken off.');
    render();
  });

  return {
    el,
    blocking: true,
    layer: 'screen',
    reusable: false,
    defaultFocus: '.ul-card',
    onOpen(params = {}) {
      tab = TABS.includes(params.tab) ? params.tab : 'kit';
      log = [];
      note('');
      const s = saveSvc();
      try {
        if (s && typeof s.grantFreeUnlocks === 'function') s.grantFreeUnlocks();
      } catch {
        /* the screen still shows */
      }
      render({ rebuild: true });
      if (s && typeof s.onProfileChanged === 'function') off = s.onProfileChanged(() => render());
    },
    onClose() {
      if (off) off();
      off = null;
    },
    onNav(action) {
      if (action === 'tabNext' || action === 'tabPrev') {
        const i = TABS.indexOf(tab);
        setTab(TABS[(i + (action === 'tabNext' ? 1 : TABS.length - 1)) % TABS.length]);
        return true;
      }
      return false;
    },
    back() {
      if (manager.top() === 'unlocks') manager.pop();
      return true;
    },
    debug: () => {
      const c = profileCtx();
      return {
        tab,
        note: noteEl.textContent,
        embers: c ? c.meta.embers : null,
        log: log.slice(),
        cards: [...gridEl.querySelectorAll('.ul-card')].map((b) => ({ id: b.dataset.id, state: b.dataset.state, equipped: b.dataset.equipped === 'true', focused: b.classList.contains('ap-focus') })),
      };
    },
  };
}
