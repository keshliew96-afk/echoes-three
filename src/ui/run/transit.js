// LEVEL-TRANSITION CARD (docs/gauntlet/PLAN.md §12.6 — the user's "brief
// victory transition screen"). Owner: CAMPAIGN. The run-UI page for sim phase
// 'transit':
//   kind 'clear'  — "<LEVEL> CLEARED", the next level, the carried build
//                   ("party restored"), a progress bar, "Enter — set out now";
//   kind 'depart' — a Level-N start from the Level Select: "SETTING OUT",
//                   the level, the starter grant.
// The card is a Void Charcoal plate over a WARM veil (never a black
// full-screen, PLAN §12.5): the cleared arena stays faintly visible under it
// until the next level's first room replaces it. It never advances the sim by
// itself: Enter asks the level manager (service('campaign').requestSkip()),
// which advances once the next level is ready (hard fallbacks there and in
// the sim).
import { esc } from './style.js';
import { SKILLS } from '../../sim/skills.js';
import { service } from '../../app/registry.js';
import { bossFor, levelFor } from '../../data/levels.js';
import { endlessBossIndex, beyondCampaign, CYCLE } from '../../data/endless.js';
import { t, tn } from '../../i18n/index.js';
import { chapterFor } from '../../data/story.js';
import { CAMPAIGN_LEVELS } from '../../data/campaign.js';

// THE HEARTH SONG (docs/STORY.md): the verse the bell catches on a level's
// clear ('' past the campaign's own levels, deep in the Endless Descent).
export function verseLine(level, depth = null) {
  const ch = chapterFor(level);
  if (!ch || !CAMPAIGN_LEVELS.includes(ch.level)) return '';
  if (depth !== null && depth > CAMPAIGN_LEVELS.length) return '';
  return t('The bell catches a verse: {verse}.', { verse: t(ch.name) });
}

const skillCount = (b) => (b.skills || []).filter(Boolean).length;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const FLAVOUR = {
  1: () => t('The Hollow Stag falls. The wood breathes out.'),
  2: () => t('The Drowned Heron sinks. The water runs clear again.'),
  3: () => t('The Barrow Wyrm is still. The long night lifts.'),
  // Act IV (docs/ACT_IV.md): whichever warden held the Heart, its line is the Heart's.
  4: () => t('The Heart\'s warden falls. Below the Barrow, the old beat falters.'),
};
// Slice 2: the second boss of each act has its own line.
const BOSS_FLAVOUR = {
  thornmother: () => t('The Thornmother falls. The briars let the wood go.'),
  millwheel: () => t('The Millwheel shatters. The water runs clear again.'),
  lichram: () => t('The Lich Ram crumbles. The graves close; the long night lifts.'),
  // Act IV (docs/ACT_IV_BOSSES.md).
  cantor: () => t('The Hollow Cantor’s last note fades. The Heart falls quiet.'),
  colossus: () => t('The Geode Colossus shatters. Below the Barrow, the old beat falters.'),
};

export const TRANSIT_CSS = `
  #run-veil.rn-transit {
    background: radial-gradient(ellipse at 50% 44%,
      rgba(255, 240, 210, 0.34) 0%, rgba(232, 162, 61, 0.30) 42%, rgba(70, 52, 36, 0.66) 100%);
  }
  #run-veil.rn-transit.rn-depart {
    background: radial-gradient(ellipse at 50% 44%,
      rgba(150, 118, 80, 0.88) 0%, rgba(96, 74, 52, 0.92) 50%, rgba(58, 46, 36, 0.95) 100%);
  }
  .rn-verse { margin-top: 2px; font-size: 18px; font-weight: 700; letter-spacing: 0.06em; color: #E8A23D; text-align: center; }
  .rn-verse:empty { display: none; }
  .rn-transit .rn-kicker { font-size: 18px; font-weight: 800; letter-spacing: 0.3em; color: #E8A23D; margin-bottom: 4px; }
  .rn-transit .rn-next { display: flex; align-items: baseline; gap: 12px; margin: 10px 0 6px; font-size: 22px; color: #F4EFE6; }
  .rn-transit .rn-next .rn-lab { font-size: 17px; letter-spacing: 0.2em; color: #9C9186; }
  .rn-transit .rn-next b { font-size: 26px; letter-spacing: 0.04em; }
  .rn-transit .rn-carry { display: grid; grid-template-columns: auto auto; gap: 6px 22px; margin: 8px 0 4px; font-size: 18px; }
  .rn-transit .rn-carry .rn-k { color: #9C9186; letter-spacing: 0.1em; }
  .rn-transit .rn-carry .rn-v { color: #F4EFE6; font-weight: 700; font-variant-numeric: tabular-nums; }
  .rn-transit .rn-kit { margin-top: 6px; font-size: 17px; color: #C9C2B3; text-align: center; max-width: 620px; }
  .rn-transit .rn-bar { position: relative; width: 420px; height: 10px; margin: 16px 0 6px; border-radius: 6px;
    background: #221F1B; border: 1px solid #9C918688; overflow: hidden; }
  .rn-transit .rn-bar i { position: absolute; left: 0; top: 0; bottom: 0; width: 0%; background: linear-gradient(90deg, #D9B872, #E8A23D); }
  .rn-transit .rn-ready { font-size: 17px; color: #C9C2B3; min-height: 22px; }
  /* PARTY: the four builds that ride on, one compact line each. */
  .rn-builds { display: grid; grid-template-columns: auto auto auto auto; gap: 2px 16px; margin-top: 8px; font-size: 16px; color: #C9C2B3; }
  .rn-builds .rn-bn { color: #F4EFE6; font-weight: 800; }
  .rn-builds .rn-bv { font-variant-numeric: tabular-nums; text-align: right; }
`;

// PARTY (BUILD_BRIEF §25.6): "Tank · 4 skills · 12/32 · ◉ 30" × 4.
export function buildsHtml(builds) {
  if (!Array.isArray(builds) || builds.length === 0) return '';
  const NAME = { healer: () => t('Healer'), tank: () => t('Tank'), swordsman: () => t('Swordsman'), archer: () => t('Archer'), tidecaller: () => t('Tidecaller') };
  return builds
    .map(
      (b) =>
        `<span class="rn-bn" data-seat="${b.seat}">${esc(NAME[b.classId] ? NAME[b.classId]() : b.classId)}</span><span class="rn-bv">${esc(tn(skillCount(b), '{n} skill', '{n} skills'))}</span><span class="rn-bv">${b.filled}/${b.sockets ?? 32}</span><span class="rn-bv">◉ ${b.purse ?? 0}</span>`
    )
    .join('');
}

export function createTransitScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-transit';
  el.innerHTML = `
    <div class="rn-kicker"></div>
    <div class="rn-title rn-headline"></div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-sub rn-flavour"></div>
    <div class="rn-verse"></div>
    <div class="rn-next"><span class="rn-lab">${esc(t('NEXT'))}</span><b class="rn-nextname"></b></div>
    <div class="rn-carry"></div>
    <div class="rn-kit"></div>
    <div class="rn-builds"></div>
    <div class="rn-bar"><i></i></div>
    <div class="rn-ready" aria-live="polite"></div>
    <div class="rn-hint">${t('<b>Enter</b> set out now')}</div>`;
  const kicker = el.querySelector('.rn-kicker');
  const headline = el.querySelector('.rn-headline');
  const flavour = el.querySelector('.rn-flavour');
  const verseEl = el.querySelector('.rn-verse');
  const nextName = el.querySelector('.rn-nextname');
  const nextRow = el.querySelector('.rn-next');
  const carryEl = el.querySelector('.rn-carry');
  const kitEl = el.querySelector('.rn-kit');
  const buildsEl = el.querySelector('.rn-builds');
  const barFill = el.querySelector('.rn-bar i');
  const readyEl = el.querySelector('.rn-ready');
  const hintEl = el.querySelector('.rn-hint');

  const row = (k, v) => `<div class="rn-k">${esc(k)}</div><div class="rn-v">${esc(v)}</div>`;
  const guest = () => {
    const n = service('net');
    return !!(n && typeof n.isGuest === 'function' && n.isGuest());
  };

  // `v.__card` = the boot pre-paint's synthetic card (ui/run/index.js).
  const liveCard = (v) => {
    if (v && v.__card) return v.__card;
    const c = run().campaign ? run().campaign() : null;
    return c && c.card ? c.card : null;
  };

  function render(v) {
    const card = liveCard(v);
    if (!card) return;
    const s = card.summary || {};
    const to = card.to;
    // ENDLESS (docs/ENDLESS.md): `card.depth` = the depth the card leads to.
    const depth = Number.isFinite(card.depth) ? card.depth : null;
    if (card.kind === 'clear') {
      const rv = v && !v.__card ? v : null;
      let met = rv && rv.frame ? bossFor(card.from, rv.frame.seed).kind : null;
      if (depth !== null && beyondCampaign(depth - 1) && rv && rv.frame) {
        const lv = levelFor(card.from);
        met = lv.bosses ? lv.bosses[endlessBossIndex(depth - 1, rv.frame.seed)].kind : met;
      }
      kicker.textContent = depth !== null ? t('DEPTH {depth} CLEARED', { depth: depth - 1 }) : t('LEVEL {level} CLEARED', { level: ROMAN[card.from] ?? card.from });
      headline.textContent = (card.fromName ? t(card.fromName) : '').toUpperCase();
      const boss = (card.from === 4 ? null : BOSS_FLAVOUR[met]) ?? FLAVOUR[card.from];
      flavour.textContent =
        depth === CYCLE + 1
          ? t('The campaign is won. The road does not end; it turns back into the dark wood, deeper than before.')
          : boss ? boss() : t('The way ahead opens.');
      verseEl.textContent = verseLine(card.from, depth !== null ? depth - 1 : null);
      nextRow.style.display = '';
      const name = card.name ? t(card.name) : card.name;
      nextName.textContent =
        depth !== null
          ? beyondCampaign(depth)
            ? t('Depth {depth} · {name} · danger rises', { depth, name })
            : t('Depth {depth} · {name}', { depth, name })
          : t('Level {level} · {name}', { level: ROMAN[to] ?? to, name });
      carryEl.innerHTML = [
        row(t('SKILLS CARRIED'), `${(s.skills || []).length} / 4`),
        row(t('SOCKETS FILLED'), `${s.socketed ?? 0} / ${s.sockets ?? 0}`),
        row(t('BENCH'), String(s.bench ?? 0)),
        row(t('GLINT'), String(s.wallet ?? 0)),
        row(t('PARTY'), t('restored to full')),
      ].join('');
    } else {
      kicker.textContent = depth !== null ? t('THE ENDLESS DESCENT') : t('SETTING OUT');
      headline.textContent = t('LEVEL {level} · {name}', { level: ROMAN[to] ?? to, name: (card.name ? t(String(card.name)) : '').toUpperCase() });
      flavour.textContent = depth !== null ? t('Through all four lands and down again, until the party falls.') : t('The campaign begins here and runs on to the final level.');
      nextRow.style.display = 'none';
      verseEl.textContent = '';
      const g = s.grant;
      carryEl.innerHTML = g
        ? [row(t('STARTER SKILLS'), `+${(g.skills || []).length}`), row(t('STARTER NODES'), String((g.nodes || []).length)), row(t('SOCKETS FILLED'), `${s.socketed ?? 0} / ${s.sockets ?? 0}`), row(t('GLINT'), String(s.wallet ?? 0))].join('')
        : row(t('KIT'), t('the starting kit'));
    }
    const names = (s.skills || []).map((id) => (SKILLS[id] ? t(SKILLS[id].name) : id));
    // (a network guest sees the party leader's build — it says whose it is)
    kitEl.textContent = guest() && names.length ? t('The Healer carries · {skills}', { skills: names.join(' · ') }) : names.join(' · ');
    hintEl.innerHTML = guest() ? t('The Healer leads on…') : t('<b>Enter</b> set out now');
    // PARTY: all four builds carry (skills in slot order, sockets, bench, purse).
    buildsEl.innerHTML = buildsHtml(s.builds);
    buildsEl.style.display = s.builds ? '' : 'none';
  }

  // Per-frame: progress bar + readiness line (the level manager's status).
  function tick(v) {
    const card = liveCard(v);
    if (!card) return;
    const span = Math.max(1, card.untilTick - card.startTick);
    const frac = Math.max(0, Math.min(1, card.elapsedTicks / span));
    barFill.style.width = `${Math.round(frac * 100)}%`;
    const mgr = service('campaign');
    const st = mgr && typeof mgr.status === 'function' ? mgr.status() : null;
    let line = '';
    if (st && st.level === card.to) {
      const name = card.name ? t(card.name) : card.name;
      if (!st.ready) line = t('Preparing {name}… {built}/{total}', { name, built: st.built, total: st.total });
      else if (card.due) line = t('Setting out…');
      else line = t('{name} is ready · setting out in {secs} s', { name, secs: Math.max(1, Math.ceil((card.untilTick - card.startTick - card.elapsedTicks) / 60)) });
    }
    if (readyEl.textContent !== line) readyEl.textContent = line;
  }

  function key(code, fresh) {
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      if (!fresh) return true;
      const mgr = service('campaign');
      if (mgr && typeof mgr.requestSkip === 'function') mgr.requestSkip('enter');
      return true;
    }
    return false;
  }

  return { el, render, key, tick, name: 'transit' };
}
