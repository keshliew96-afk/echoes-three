// LEVEL SELECT — the lobby's level picker (docs/gauntlet/PLAN.md §12.7, the
// user's CRITICAL REFACTOR: "Update the Lobby UI so that players can only
// select or play levels they have already unlocked sequentially"). Owner:
// CAMPAIGN. Replaces the M4a expedition picker (the portal never opens a
// picker any more — Begin Run is always Level 1).
//
// An app screen (registerScreen('levels')) the camp pushes from the map table
// beside the portal, the L key or the portal prompt's "Levels" chip. One card
// per level (data-driven — src/data/campaign.js CAMPAIGN_LEVELS):
//   - UNLOCKED: focusable; E / Enter / Space / click / pad A starts a campaign
//     AT that level (then on to the final level); a Level-N start (N > 1)
//     names its starter grant on the card.
//   - LOCKED: visible (Bone lock glyph + "Clear <previous level> to unlock"),
//     aria-disabled, skipped by keyboard / pad navigation; a click only
//     shakes the card and repeats the lock line — it never starts anything.
// Esc / B backs out to the camp. Blocking: the single-player sim pauses.
//
// params: { via, onChoose(level) -> { ok, reason? }, onCancel() }
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { service } from '../../app/registry.js';
import { CAMPAIGN_LEVELS, FIRST_LEVEL, FINAL_LEVEL, grantFor, prevLevel } from '../../data/campaign.js';
import { levelFor } from '../../data/levels.js';
import { endlessUnlockedFrom } from '../../data/endless.js';
import { rushUnlockedFrom, RUSH_RULES } from '../../data/rush.js';
import { t, tn, getLanguage } from '../../i18n/index.js';
import { RELICS, CURSES } from '../../sim/relics.js';
import { clockOf } from '../../data/daily.js';
import { placeLine } from './daily.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const STYLE_ID = 'cg-levels-style';
// BOSS RUSH: the card's own rust red (not Ember, which is enemy threat only).
const RUSH_RED = '#D9654B';
const BIOME_LABEL = { wood: () => t('Night woodland'), mill: () => t('Flooded mill'), barrow: () => t('Burial mounds'), heart: () => t('The hollow under the Barrow') };
// data/campaign.js lockLine, as one translatable sentence per form.
const lockText = (level) => {
  const prev = prevLevel(level);
  return prev === null ? t('Locked') : t('Clear {level} to unlock', { level: t(levelFor(prev).name) });
};
const LOCK_SVG =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="14" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M11 14 V10 A5 5 0 0 1 21 10 V14" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="16" cy="20.5" r="2" fill="currentColor"/></svg>';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.cg-levels .cg-wrap {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(96vw, ${px(1720)}); max-height: 94vh; overflow: auto; padding: ${px(28)} ${px(34)} ${px(22)};
  display: flex; flex-direction: column; align-items: center; gap: ${px(14)};
}
.cg-levels .cg-head { display: flex; flex-direction: column; align-items: center; gap: ${px(4)}; text-align: center; }
.cg-levels .cg-sub { font-size: ${px(22)}; color: ${P.bone}; letter-spacing: 0.03em; }
.cg-levels .cg-cards { display: flex; gap: ${px(22)}; width: 100%; justify-content: center; }
.cg-levels .cg-card {
  position: relative; flex: 1 1 0; min-width: 0; max-width: ${px(420)};
  min-height: ${px(330)}; padding: ${px(18)} ${px(20)} ${px(16)};
  display: flex; flex-direction: column; gap: ${px(9)}; text-align: left;
  background: linear-gradient(172deg, #2C2823 0%, ${P.voidCharcoal} 70%);
  border: max(2px, ${px(2)}) solid ${P.warmGrey}88; border-radius: ${px(16)};
  color: ${P.parchment}; cursor: pointer; font-family: inherit;
  transition: transform 90ms ease, box-shadow 90ms ease, border-color 90ms ease;
}
.cg-levels .cg-card.ap-focus {
  outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(3)};
  transform: translateY(${px(-3)}) scale(1.03); border-color: ${P.hearthAmber}CC;
  box-shadow: 0 ${px(12)} ${px(28)} #000000AA, 0 0 ${px(20)} ${P.hearthAmber}33;
}
.cg-levels .cg-lvl { font-size: ${px(20)}; font-weight: 800; letter-spacing: 0.22em; color: ${P.warmGrey}; }
.cg-levels .cg-name { font-size: ${px(32)}; font-weight: 800; letter-spacing: 0.03em; line-height: 1.1; }
.cg-levels .cg-blurb { font-size: ${px(21)}; color: ${P.bone}; line-height: 1.32; flex: 1 1 auto; }
.cg-levels .cg-biome { font-size: ${px(19)}; color: ${P.warmGrey}; letter-spacing: 0.05em; }
.cg-levels .cg-danger { display: flex; align-items: center; gap: ${px(10)}; font-size: ${px(20)}; font-weight: 700; letter-spacing: 0.08em; }
.cg-levels .cg-pips { display: inline-flex; gap: ${px(6)}; }
.cg-levels .cg-pip { width: ${px(15)}; height: ${px(15)}; transform: rotate(45deg); border: max(2px, ${px(2)}) solid ${P.bone}; }
.cg-levels .cg-pip.cg-on { background: ${P.hearthAmber}; border-color: ${P.hearthAmber}; }
.cg-levels .cg-status { font-size: ${px(19)}; color: ${P.parchment}; letter-spacing: 0.02em; }
.cg-levels .cg-status b { color: ${P.hearthAmber}; }
.cg-levels .cg-grant { font-size: ${px(18)}; color: ${P.bone}; }
/* Five cards (four levels plus Endless, docs/ACT_IV.md): a tighter cut so they fit one row. */
.cg-levels .cg-cards.cg-many { gap: ${px(14)}; }
.cg-levels .cg-cards.cg-many .cg-card { padding: ${px(15)} ${px(15)} ${px(14)}; min-height: ${px(310)}; }
.cg-levels .cg-cards.cg-many .cg-name { font-size: ${px(27)}; }
.cg-levels .cg-cards.cg-many .cg-blurb { font-size: ${px(18)}; }
.cg-levels .cg-cards.cg-many .cg-biome,
.cg-levels .cg-cards.cg-many .cg-status { font-size: ${px(17)}; }
.cg-levels .cg-cards.cg-many .cg-grant { font-size: ${px(16)}; }
.cg-levels .cg-cards.cg-many .cg-danger { font-size: ${px(18)}; gap: ${px(7)}; }
.cg-levels .cg-card[aria-disabled="true"] { cursor: default; border-style: dashed; border-color: ${P.bone}77; }
.cg-levels .cg-card[aria-disabled="true"] .cg-name,
.cg-levels .cg-card[aria-disabled="true"] .cg-blurb { color: ${P.warmGrey}; }
.cg-levels .cg-card[aria-disabled="true"] .cg-pip.cg-on { background: ${P.bone}66; border-color: ${P.bone}99; }
.cg-levels .cg-card[aria-disabled="true"] .cg-status,
.cg-levels .cg-card[aria-disabled="true"] .cg-grant { display: none; }
.cg-levels .cg-lock { display: none; align-items: center; gap: ${px(10)}; font-size: ${px(21)}; font-weight: 700; color: ${P.bone}; }
.cg-levels .cg-card[aria-disabled="true"] .cg-lock { display: flex; }
.cg-levels .cg-lock svg { width: ${px(26)}; height: ${px(26)}; flex: none; }
.cg-levels .cg-card.cg-endless { background: linear-gradient(172deg, #2A2433 0%, ${P.voidCharcoal} 72%); }
.cg-levels .cg-card.cg-endless .cg-lvl { color: ${P.hearthAmber}; }
.cg-levels .cg-card.cg-daily {
  background:
    radial-gradient(ellipse 90% 45% at 50% 0%, ${P.hearthAmber}2E 0%, ${P.hearthAmber}00 75%),
    linear-gradient(172deg, #2E2A1E 0%, ${P.voidCharcoal} 72%);
  border-color: ${P.hearthAmber}77;
}
.cg-levels .cg-card.cg-daily .cg-lvl { color: ${P.hearthAmber}; }
.cg-levels .cg-card.cg-rush {
  background:
    radial-gradient(ellipse 85% 40% at 50% 0%, ${RUSH_RED}33 0%, #00000000 75%),
    linear-gradient(172deg, #33201E 0%, ${P.voidCharcoal} 72%);
  border-color: ${RUSH_RED}88;
}
.cg-levels .cg-card.cg-rush .cg-lvl { color: ${RUSH_RED}; }
.cg-levels .cg-skulls { display: inline-flex; gap: ${px(5)}; }
.cg-levels .cg-skull { width: ${px(13)}; height: ${px(13)}; border-radius: 50%; border: max(2px, ${px(2)}) solid ${P.bone}; }
.cg-levels .cg-skull.cg-on { background: ${RUSH_RED}; border-color: ${RUSH_RED}; }
/* Seven cards (four levels, Endless, the Daily, Boss Rush): tighter still. */
.cg-levels .cg-cards.cg-seven { gap: ${px(10)}; }
.cg-levels .cg-cards.cg-seven .cg-card { padding: ${px(13)} ${px(12)} ${px(12)}; gap: ${px(7)}; }
.cg-levels .cg-cards.cg-seven .cg-lvl { font-size: ${px(17)}; letter-spacing: 0.16em; }
.cg-levels .cg-cards.cg-seven .cg-name { font-size: ${px(24)}; }
.cg-levels .cg-cards.cg-seven .cg-blurb { font-size: ${px(16.5)}; }
.cg-levels .cg-cards.cg-seven .cg-biome,
.cg-levels .cg-cards.cg-seven .cg-status,
.cg-levels .cg-cards.cg-seven .cg-omen { font-size: ${px(15.5)}; }
.cg-levels .cg-cards.cg-seven .cg-grant { font-size: ${px(15)}; }
.cg-levels .cg-cards.cg-seven .cg-danger { font-size: ${px(16)}; }
.cg-levels .cg-omen { display: flex; flex-direction: column; gap: ${px(2)}; font-size: ${px(17)}; line-height: 1.25; }
.cg-levels .cg-omen .cg-o-relic { color: ${P.paleGold}; }
.cg-levels .cg-omen .cg-o-curse { color: ${P.godstuffViolet}; }
.cg-levels .cg-card[aria-disabled="true"] .cg-omen { display: none; }
.cg-levels .cg-card.cg-shake { animation: cg-shake 320ms ease; }
@keyframes cg-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(${px(-9)}); } 40% { transform: translateX(${px(8)}); } 60% { transform: translateX(${px(-6)}); } 80% { transform: translateX(${px(4)}); } }
.cg-levels .cg-note { min-height: ${px(28)}; font-size: ${px(21)}; color: ${P.bone}; text-align: center; }
.cg-levels .cg-foot { display: flex; gap: ${px(24)}; align-items: center; flex-wrap: wrap; justify-content: center; font-size: ${px(20)}; color: ${P.warmGrey}; }
.cg-levels .cg-foot b { display: inline-flex; align-items: center; justify-content: center; min-width: ${px(34)}; height: ${px(32)}; padding: 0 ${px(8)}; margin-right: ${px(6)};
  border-radius: ${px(7)}; border: max(1px, ${px(2)}) solid ${P.warmGrey}AA; background: ${P.voidCharcoal}; color: ${P.bone}; font-weight: 700; }
/* A short window, and the longer languages (docs/I18N.md): the cards keep
   their shape and the text steps down so the key hints stay on screen. */
@media (max-height: 640px) {
  .cg-levels .cg-card { min-height: ${px(280)}; }
  .cg-levels .cg-wrap { gap: ${px(10)}; padding: ${px(20)} ${px(34)} ${px(16)}; }
  .cg-levels .cg-name { font-size: ${px(28)}; }
  .cg-levels .cg-blurb { font-size: ${px(19)}; line-height: 1.28; }
  .cg-levels .cg-sub, .cg-levels .cg-note { font-size: ${px(19)}; }
  .cg-levels .cg-status, .cg-levels .cg-grant, .cg-levels .cg-biome { font-size: ${px(17)}; }
  .cg-levels .cg-lock { font-size: ${px(18)}; }
  .cg-levels .cg-note { min-height: ${px(22)}; }
}
`;
  document.head.appendChild(st);
}

// Unlock truth (the content service: profile unlocks + this session's clears
// + a probe override) and the per-level clear count (profile records).
export function levelInfo() {
  const content = service('content');
  let unlocked = [FIRST_LEVEL];
  try {
    if (content && typeof content.unlockedActs === 'function') unlocked = content.unlockedActs();
  } catch {
    unlocked = [FIRST_LEVEL];
  }
  let profile = null;
  try {
    const save = service('save');
    profile = save && typeof save.profile === 'function' ? save.profile() : null;
  } catch {
    profile = null;
  }
  const rec = profile && profile.records ? profile.records : {};
  return CAMPAIGN_LEVELS.map((level) => {
    const lv = levelFor(level);
    return {
      level,
      name: t(lv.name),
      blurb: t(lv.blurb),
      biome: lv.biome,
      unlocked: unlocked.includes(level),
      clears: (rec.levelClears && rec.levelClears[level]) || 0,
      lockLine: lockText(level),
      grant: grantFor(level),
    };
  });
}

// ENDLESS (docs/ENDLESS.md): the Endless Descent card — open once the game
// is won (or with the ?endless=1 harness), with the profile's depth record.
export function endlessInfo() {
  let profile = null;
  try {
    const save = service('save');
    profile = save && typeof save.profile === 'function' ? save.profile() : null;
  } catch {
    profile = null;
  }
  const rec = profile && profile.records ? profile.records : {};
  const harness = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('endless') === '1';
  return {
    level: 'endless',
    name: t('The Endless Descent'),
    blurb: t('Past the Heart the road turns back into the wood, darker each time. The four lands repeat, harder at every depth, until the party falls.'),
    unlocked: harness || endlessUnlockedFrom(profile),
    bestDepth: rec.endlessBestDepth || 0,
    runs: rec.endlessRuns || 0,
    lockLine: t('Win the campaign to unlock'),
  };
}

// DAILY DESCENT (docs/DAILY.md): the day's card — open to a single player
// (a network session plays the campaign or Endless), with the day's relic
// and curse and this device's best run of the day.
export function dailyInfo() {
  const d = service('daily');
  let solo = true;
  try {
    const n = service('net');
    solo = !(n && ((typeof n.isGuest === 'function' && n.isGuest()) || (typeof n.isHost === 'function' && n.isHost())));
  } catch {
    solo = true;
  }
  const key = d ? d.today() : null;
  const omen = d && key ? d.omen(key) : { relic: null, curse: null };
  let day = key || '';
  try {
    if (key) day = new Date(`${key}T12:00:00Z`).toLocaleDateString(getLanguage(), { timeZone: 'UTC', day: 'numeric', month: 'short' });
  } catch {
    day = key || '';
  }
  return {
    level: 'daily',
    key,
    day,
    name: t('The Daily Descent'),
    blurb: t('The same run for every player today, with a fixed relic and curse. Go deeper than the rest.'),
    relic: omen.relic && RELICS[omen.relic] ? t(RELICS[omen.relic].name) : '—',
    curse: omen.curse && CURSES[omen.curse] ? t(CURSES[omen.curse].name) : '—',
    best: d && key ? d.localBest(key) : null,
    unlocked: !!d && !!key && solo,
    lockLine: t('Single player only'),
  };
}

// BOSS RUSH (docs/BOSS_RUSH.md): the rush card — open once the game is won
// (or with the ?rush=1 harness), single player only, with the profile's best
// time and most bosses felled.
export function rushInfo() {
  let profile = null;
  try {
    const save = service('save');
    profile = save && typeof save.profile === 'function' ? save.profile() : null;
  } catch {
    profile = null;
  }
  let solo = true;
  try {
    const n = service('net');
    solo = !(n && ((typeof n.isGuest === 'function' && n.isGuest()) || (typeof n.isHost === 'function' && n.isHost())));
  } catch {
    solo = true;
  }
  const rec = profile && profile.records ? profile.records : {};
  const harness = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('rush') === '1';
  const open = harness || rushUnlockedFrom(profile);
  return {
    level: 'rush',
    name: t('The Boss Rush'),
    blurb: t('No rooms, no doors: the bosses one after another, a land at a time and then around again. A draft and the Peddler between fights.'),
    unlocked: open && solo,
    bestSec: rec.rushBestSec ?? null,
    mostFelled: rec.rushMostFelled || 0,
    runs: rec.rushRuns || 0,
    fights: RUSH_RULES.fights,
    lockLine: open ? t('Single player only') : t('Win the campaign to unlock'),
  };
}

export function createLevelsScreen(ctx) {
  installStyle();
  const { manager, app } = ctx;
  const el = document.createElement('div');
  el.className = 'cg-levels';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t('Choose a level'));
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="cg-wrap ap-plate">
      <div class="cg-head">
        <div class="ap-orn">◆ ◇ ◆</div>
        <h2 class="ap-h2">${t('Choose a level')}</h2>
        <div class="cg-sub">${t('A campaign runs from the level you choose through Level {level}. Clear a level to open the next.', { level: ROMAN[FINAL_LEVEL] ?? FINAL_LEVEL })}</div>
      </div>
      <div class="cg-cards"></div>
      <div class="cg-note" aria-live="polite"></div>
      <div class="cg-foot">
        <span><b>←</b><b>→</b>${t('Choose')}</span>
        <span><b>E</b><b>Enter</b>${t('Set out')}</span>
        <span><b>Esc</b>${t('Back to camp')}</span>
      </div>
    </div>`;
  const cardsEl = el.querySelector('.cg-cards');
  const noteEl = el.querySelector('.cg-note');
  let p = null;
  let settled = false;
  let chosen = null;
  let denied = 0;
  let lastDenied = null;
  let infos = [];

  function finish(level) {
    if (settled) return;
    settled = true;
    chosen = level;
    if (manager.top() === 'levels') manager.pop();
    if (level === null) {
      p?.onCancel?.();
      return;
    }
    const r = p?.onChoose?.(level);
    if (r && r.ok === false && app && typeof app.toast === 'function') {
      const line = r.line ? (typeof level === 'number' ? lockText(level) : t(r.line)) : t('That level is locked');
      app.toast(r.reason === 'locked' || r.reason === 'solo' ? line : t("Can't set out right now"), { tone: 'warn' });
    }
  }

  function deny(card, info, source) {
    denied += 1;
    lastDenied = { level: info.level, source, at: Math.round(performance.now()) };
    noteEl.textContent = t('{name} is locked — {line}.', { name: info.name, line: info.lockLine });
    card.classList.remove('cg-shake');
    void card.offsetWidth; // restart the shake
    card.classList.add('cg-shake');
  }

  function render() {
    cardsEl.textContent = '';
    infos = levelInfo();
    cardsEl.classList.toggle('cg-many', infos.length >= 4);
    cardsEl.classList.toggle('cg-seven', infos.length >= 4);
    const open = infos.filter((i) => i.unlocked);
    const preselect = open.length ? open[open.length - 1].level : FIRST_LEVEL;
    for (const info of infos) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cg-card';
      card.dataset.level = String(info.level);
      card.setAttribute('data-nav', '');
      if (!info.unlocked) card.setAttribute('aria-disabled', 'true');
      if (info.unlocked && info.level === preselect) card.setAttribute('data-nav-default', '');
      const pips = CAMPAIGN_LEVELS.map((i) => `<i class="cg-pip${i <= info.level ? ' cg-on' : ''}"></i>`).join('');
      const span = info.level === FINAL_LEVEL ? t('Level {level} only', { level: ROMAN[info.level] }) : t('Level {from} → {to}', { from: ROMAN[info.level], to: ROMAN[FINAL_LEVEL] });
      card.innerHTML = `
        <div class="cg-lvl">${t('LEVEL {level}', { level: ROMAN[info.level] ?? info.level })}</div>
        <div class="cg-name"></div>
        <div class="cg-blurb"></div>
        <div class="cg-biome">${BIOME_LABEL[info.biome] ? BIOME_LABEL[info.biome]() : ''}</div>
        <div class="cg-danger"><span>${t('Danger {level}', { level: ROMAN[info.level] ?? info.level })}</span><span class="cg-pips">${pips}</span></div>
        <div class="cg-status"></div>
        <div class="cg-grant"></div>
        <div class="cg-lock">${LOCK_SVG}<span class="cg-lock-t"></span></div>`;
      card.querySelector('.cg-name').textContent = info.name;
      card.querySelector('.cg-blurb').textContent = info.blurb;
      card.querySelector('.cg-status').innerHTML = `${info.clears ? `<b>${t('Cleared ×{n}', { n: info.clears })}</b>` : t('Not cleared yet')} · ${t('Campaign {span}', { span })}`;
      card.querySelector('.cg-grant').textContent = info.grant
        ? t('Starter kit: +{skills} skills · {nodes} nodes · {glint} Glint', { skills: info.grant.skills, nodes: info.grant.nodes + (info.grant.legendaries ?? 0), glint: info.grant.glint })
        : t('Begins with the starting kit');
      card.querySelector('.cg-lock-t').textContent = info.lockLine;
      card.setAttribute('aria-label', info.unlocked ? t('Level {level}, {name}.', { level: info.level, name: info.name }) : t('Level {level}, {name}. Locked: {line}.', { level: info.level, name: info.name, line: info.lockLine }));
      card.addEventListener('click', () => {
        if (!info.unlocked) {
          deny(card, info, 'click');
          return;
        }
        finish(info.level);
      });
      cardsEl.appendChild(card);
    }
    // ENDLESS: one more card after the levels.
    {
      const info = endlessInfo();
      infos.push(info);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cg-card cg-endless';
      card.dataset.level = 'endless';
      card.setAttribute('data-nav', '');
      if (!info.unlocked) card.setAttribute('aria-disabled', 'true');
      card.innerHTML = `
        <div class="cg-lvl">${t('ENDLESS')}</div>
        <div class="cg-name"></div>
        <div class="cg-blurb"></div>
        <div class="cg-biome">${t('Wood · Mill · Barrow · Heart · and down again')}</div>
        <div class="cg-danger"><span>${t('Danger rises every depth')}</span></div>
        <div class="cg-status"></div>
        <div class="cg-grant">${t('Begins at Level I with the starting kit')}</div>
        <div class="cg-lock">${LOCK_SVG}<span class="cg-lock-t"></span></div>`;
      card.querySelector('.cg-name').textContent = info.name;
      card.querySelector('.cg-blurb').textContent = info.blurb;
      card.querySelector('.cg-status').innerHTML = info.bestDepth ? `<b>${t('Deepest: Depth {depth}', { depth: info.bestDepth })}</b> · ${tn(info.runs, '{n} descent', '{n} descents')}` : t('No descent yet');
      card.querySelector('.cg-lock-t').textContent = info.lockLine;
      card.setAttribute('aria-label', info.unlocked ? t('The Endless Descent.') : t('The Endless Descent. Locked: {line}.', { line: info.lockLine }));
      card.addEventListener('click', () => {
        if (!info.unlocked) {
          deny(card, info, 'click');
          return;
        }
        finish('endless');
      });
      cardsEl.appendChild(card);
    }
    // DAILY DESCENT: the day's card after Endless.
    {
      const info = dailyInfo();
      infos.push(info);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cg-card cg-daily';
      card.dataset.level = 'daily';
      card.setAttribute('data-nav', '');
      if (!info.unlocked) card.setAttribute('aria-disabled', 'true');
      card.innerHTML = `
        <div class="cg-lvl">${t('DAILY · {day}', { day: info.day })}</div>
        <div class="cg-name"></div>
        <div class="cg-blurb"></div>
        <div class="cg-omen"><span class="cg-o-relic"></span><span class="cg-o-curse"></span></div>
        <div class="cg-danger"><span>${t('One seed for everyone')}</span></div>
        <div class="cg-status"></div>
        <div class="cg-grant">${t("Opens today's board")}</div>
        <div class="cg-lock">${LOCK_SVG}<span class="cg-lock-t"></span></div>`;
      card.querySelector('.cg-name').textContent = info.name;
      card.querySelector('.cg-blurb').textContent = info.blurb;
      card.querySelector('.cg-o-relic').textContent = t('Relic: {name}', { name: info.relic });
      card.querySelector('.cg-o-curse').textContent = t('Curse: {name}', { name: info.curse });
      card.querySelector('.cg-status').innerHTML = info.best
        ? `<b>${t('Best today: {place}', { place: placeLine(info.best.depth, info.best.won) })}</b> · ${clockOf(info.best.ticks)}`
        : t('Not played today');
      card.querySelector('.cg-lock-t').textContent = info.lockLine;
      card.setAttribute('aria-label', info.unlocked ? t('The Daily Descent.') : t('The Daily Descent. Locked: {line}.', { line: info.lockLine }));
      card.addEventListener('click', () => {
        if (!info.unlocked) {
          deny(card, info, 'click');
          return;
        }
        finish('daily');
      });
      cardsEl.appendChild(card);
    }
    // BOSS RUSH: the seventh card, after the Daily.
    {
      const info = rushInfo();
      infos.push(info);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cg-card cg-rush';
      card.dataset.level = 'rush';
      card.setAttribute('data-nav', '');
      if (!info.unlocked) card.setAttribute('aria-disabled', 'true');
      const skulls = Array.from({ length: info.fights }, (_, i) => `<i class="cg-skull${i < info.mostFelled ? ' cg-on' : ''}"></i>`).join('');
      card.innerHTML = `
        <div class="cg-lvl">${t('BOSS RUSH')}</div>
        <div class="cg-name"></div>
        <div class="cg-blurb"></div>
        <div class="cg-biome">${t('{n} bosses · two laps of the four lands', { n: info.fights })}</div>
        <div class="cg-danger"><span class="cg-skulls">${skulls}</span></div>
        <div class="cg-status"></div>
        <div class="cg-grant">${t('Begins with the Level II starter kit')}</div>
        <div class="cg-lock">${LOCK_SVG}<span class="cg-lock-t"></span></div>`;
      card.querySelector('.cg-name').textContent = info.name;
      card.querySelector('.cg-blurb').textContent = info.blurb;
      card.querySelector('.cg-status').innerHTML =
        info.bestSec !== null
          ? `<b>${t('Best time: {time}', { time: clockOf(info.bestSec * 60) })}</b> · ${tn(info.runs, '{n} rush', '{n} rushes')}`
          : info.runs
          ? `<b>${t('Most felled: {n} of {total}', { n: info.mostFelled, total: info.fights })}</b> · ${tn(info.runs, '{n} rush', '{n} rushes')}`
          : t('No rush yet');
      card.querySelector('.cg-lock-t').textContent = info.lockLine;
      card.setAttribute('aria-label', info.unlocked ? t('The Boss Rush.') : t('The Boss Rush. Locked: {line}.', { line: info.lockLine }));
      card.addEventListener('click', () => {
        if (!info.unlocked) {
          deny(card, info, 'click');
          return;
        }
        finish('rush');
      });
      cardsEl.appendChild(card);
    }
    noteEl.textContent = '';
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    reusable: false,
    defaultFocus: '[data-nav-default]',
    onOpen(params = {}) {
      p = params;
      settled = false;
      chosen = null;
      denied = 0;
      lastDenied = null;
      render();
    },
    onClose() {
      // Popped by anything other than a choice (a quit to title, a clear):
      // nothing starts, the camp is told.
      if (!settled) {
        settled = true;
        p?.onCancel?.();
      }
    },
    onNav(action, source) {
      // E is the camp's interact key: here it confirms the focused card (the
      // menu map reads KeyE as tabNext; there are no tabs on this screen).
      if (action === 'tabNext' && source === 'keyboard') {
        const f = el.querySelector('.cg-card.ap-focus') ?? el.querySelector('[data-nav-default]');
        if (f) f.click();
        return true;
      }
      if (action === 'tabPrev') return true;
      return false;
    },
    back() {
      finish(null);
      return true;
    },
    debug: () => ({
      chosen,
      denied,
      lastDenied,
      via: p?.via ?? null,
      note: noteEl.textContent,
      cards: [...cardsEl.querySelectorAll('.cg-card')].map((c) => {
        const r = c.getBoundingClientRect();
        return {
          level: c.dataset.level === 'endless' || c.dataset.level === 'daily' || c.dataset.level === 'rush' ? c.dataset.level : Number(c.dataset.level),
          locked: c.getAttribute('aria-disabled') === 'true',
          focused: c.classList.contains('ap-focus'),
          text: c.textContent.replace(/\s+/g, ' ').trim(),
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        };
      }),
    }),
  };
}
