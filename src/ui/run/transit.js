// LEVEL-TRANSITION CARD (docs/gauntlet/PLAN.md §12.6 — the user's "brief
// victory transition screen"). Owner: CAMPAIGN. The run-UI page for sim phase
// 'transit':
//   kind 'clear'  — "<LEVEL> CLEARED", the next level, the carried build
//                   ("party restored"), a progress bar, "Enter — set out now";
//   kind 'depart' — a Level-N start from the Level Select: "SETTING OUT",
//                   the level, the starter grant.
// THE LEVEL V FORK (docs/KILN_BOSSES.md): the Level IV clear card of a
// campaign shows the two roads, the Still Spire and the Ember Kiln; the party
// leader picks one (arrows / A D / 1 2 / the pad, then Enter, or a click),
// and the card sets out on it. Nobody picking takes the Spire's road.
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
import { chapterFor, RILL_CLEAR, TOLLY_CLEAR, SABLE_CLEAR } from '../../data/story.js';
import { ROADS } from '../../data/levels.js';
import { activeLineup } from '../../data/lineup.js';
import { CAMPAIGN_LEVELS, isLevel } from '../../data/campaign.js';

// THE HEARTH SONG (docs/STORY.md): the verse the bell catches on a level's
// clear ('' past the campaign's own levels, deep in the Endless Descent).
export function verseLine(level, depth = null) {
  const ch = chapterFor(level);
  if (!ch || !isLevel(ch.level)) return '';
  if (depth !== null && depth > CAMPAIGN_LEVELS.length) return '';
  return t('The bell catches a verse: {verse}.', { verse: t(ch.name) });
}

// THE TIDECALLER (docs/TIDECALLER.md): the Level II clear card's line about
// Rill: freed by this clear, or singing along when she is in the party.
export function rillLine(level, depth = null) {
  const ch = chapterFor(level);
  if (!ch || ch.verse !== 'water' || (depth !== null && depth > CAMPAIGN_LEVELS.length)) return '';
  return t(activeLineup().includes('tidecaller') ? RILL_CLEAR.along.text : RILL_CLEAR.freed.text);
}
// THE BELLWRIGHT (docs/BELLWRIGHT.md): the Level III clear card's line about
// Tolly, the same way.
export function tollyLine(level, depth = null) {
  const ch = chapterFor(level);
  if (!ch || ch.verse !== 'stone' || (depth !== null && depth > CAMPAIGN_LEVELS.length)) return '';
  return t(activeLineup().includes('bellwright') ? TOLLY_CLEAR.along.text : TOLLY_CLEAR.freed.text);
}
// THE DUSKWING (docs/DUSKWING.md): the Level IV clear card's line about
// Sable, the same way.
export function sableLine(level, depth = null) {
  const ch = chapterFor(level);
  if (!ch || ch.verse !== 'heart' || (depth !== null && depth > CAMPAIGN_LEVELS.length)) return '';
  return t(activeLineup().includes('duskwing') ? SABLE_CLEAR.along.text : SABLE_CLEAR.freed.text);
}

const skillCount = (b) => (b.skills || []).filter(Boolean).length;

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'V']; // 6: the Ember Kiln is the other Level V (docs/KILN.md)
const FLAVOUR = {
  1: () => t('The Hollow Stag falls. The wood breathes out.'),
  2: () => t('The Drowned Heron sinks. The water runs clear again.'),
  3: () => t('The Barrow Wyrm is still. The long night lifts.'),
  // Act IV (docs/ACT_IV.md): whichever warden held the Heart, its line is the Heart's.
  4: () => t('The Heart\'s warden falls. Below the Barrow, the old beat falters.'),
  // Act V preview (docs/ACT_V.md): the Spire's borrowed warden.
  5: () => t('The Spire\'s warden falls. High above, the bells hang still.'),
  // The Ember Kiln (docs/KILN.md): its warden, whichever held the Firing Floor.
  6: () => t('The Kiln\'s warden falls. The great fire gutters, then burns clean.'),
};
// Slice 2: the second boss of each act has its own line.
const BOSS_FLAVOUR = {
  thornmother: () => t('The Thornmother falls. The briars let the wood go.'),
  millwheel: () => t('The Millwheel shatters. The water runs clear again.'),
  lichram: () => t('The Lich Ram crumbles. The graves close; the long night lifts.'),
  // Act IV (docs/ACT_IV_BOSSES.md).
  cantor: () => t('The Hollow Cantor’s last note fades. The Heart falls quiet.'),
  colossus: () => t('The Geode Colossus shatters. Below the Barrow, the old beat falters.'),
  // Act V (docs/ACT_V_BOSSES.md).
  hush: () => t('The Hush breaks. In the gods’ belfry, a bell rings again.'),
  skyhorn: () => t('The Skyhorn falls. The stair to the gods’ belfry stands open.'),
  hourwarden: () => t('The Hourwarden runs down for good. In the loft, the gods’ clock stops at the hour you came.'),
  // The Ember Kiln (docs/KILN_BOSSES.md).
  founder: () => t('The Bellfounder’s crucible cracks. In the gods’ kiln, the last bell rings true.'),
  cinderback: () => t('The Cinderback sinks into the coals. The kiln’s fire burns clean again.'),
  // Third bosses (docs/THIRD_BOSSES.md).
  gloamwolf: () => t('The Gloam Wolf lies down at last. The wood’s long night is over.'),
  mireking: () => t('The Mire King sinks into the silt. The millpond goes still.'),
  ashraven: () => t('The Ash Raven falls out of the sky. The pyres burn down to embers.'),
  veinweaver: () => t('The Vein Weaver’s threads go slack. Deep in the dark, the Heart misses a beat.'),
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
  /* THE LEVEL V FORK: the two roads after the Hollow Heart. */
  .rn-fork { display: flex; gap: 18px; margin: 12px 0 4px; }
  .rn-fork:empty { display: none; }
  .rn-road { width: 300px; padding: 12px 16px 10px; border-radius: 10px; cursor: pointer; text-align: center;
    background: #221F1Bcc; border: 2px solid #9C918655; color: #C9C2B3; transition: border-color 120ms, transform 120ms; }
  .rn-road .rn-rk { font-size: 15px; letter-spacing: 0.24em; color: #9C9186; }
  .rn-road .rn-rn { margin: 4px 0 2px; font-size: 24px; font-weight: 800; letter-spacing: 0.04em; color: #F4EFE6; }
  .rn-road .rn-rb { font-size: 16px; line-height: 1.3; min-height: 42px; }
  .rn-road .rn-rv { margin-top: 6px; font-size: 15px; letter-spacing: 0.1em; }
  .rn-road[data-road="spire"] .rn-rv { color: #C9D2E6; }
  .rn-road[data-road="kiln"] .rn-rv { color: #FFC24A; }
  .rn-road.rn-on { border-color: #E8A23D; transform: translateY(-2px); }
  .rn-road.rn-taken { border-color: #E8A23D; background: #3A2E22e0; }
  .rn-road.rn-left { opacity: 0.35; }
  .rn-fork.rn-guest .rn-road { cursor: default; }
`;

// PARTY (BUILD_BRIEF §25.6): "Tank · 4 skills · 12/32 · ◉ 30" × 4.
export function buildsHtml(builds) {
  if (!Array.isArray(builds) || builds.length === 0) return '';
  const NAME = { healer: () => t('Healer'), tank: () => t('Tank'), swordsman: () => t('Swordsman'), archer: () => t('Archer'), tidecaller: () => t('Tidecaller'), bellwright: () => t('Bellwright'), duskwing: () => t('Duskwing') };
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
    <div class="rn-fork"></div>
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
  const forkEl = el.querySelector('.rn-fork');
  // THE LEVEL V FORK: the road the leader's keys point at (0 Spire, 1 Kiln).
  let roadFocus = 0;
  const roadBlurb = {
    spire: () => t('The gods’ high belfry, where they sat down to watch and never rose.'),
    kiln: () => t('The gods’ kiln, where the first bells were fired. The fire never went out.'),
  };
  forkEl.addEventListener('click', (e) => {
    const card = e.target && e.target.closest ? e.target.closest('.rn-road') : null;
    if (!card || guest()) return;
    pick(card.dataset.road);
  });
  function pick(road) {
    const sys = run();
    if (!sys || typeof sys.pickRoad !== 'function') return false;
    const r = sys.pickRoad(road);
    if (r && r.ok) render(sys.view());
    return !!(r && r.ok);
  }
  function forkHtml(fork) {
    return fork.roads
      .map((road, i) => {
        const act = ROADS[road];
        const ch = chapterFor(act);
        const cls = fork.pick ? (fork.pick === road ? ' rn-taken' : ' rn-left') : i === roadFocus ? ' rn-on' : '';
        return `<div class="rn-road${cls}" data-road="${esc(road)}"><div class="rn-rk">${esc(t('LEVEL {level}', { level: 'V' }))}</div><div class="rn-rn">${esc(t(levelFor(act).name))}</div><div class="rn-rb">${esc(roadBlurb[road] ? roadBlurb[road]() : '')}</div><div class="rn-rv">${esc(ch ? t('Verse of {verse}', { verse: t(ch.name) }) : '')}</div></div>`;
      })
      .join('');
  }

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
    // BOSS RUSH (docs/BOSS_RUSH.md): `card.fight` = the fight the card leads to.
    const fight = Number.isFinite(card.fight) ? card.fight : null;
    if (fight !== null) {
      const c = run().campaign ? run().campaign() : null;
      const line = c && c.rush && Array.isArray(c.rush.line) ? c.rush.line : [];
      const total = card.fights ?? line.length;
      const bossName = (n) => (line[n - 1] ? t(line[n - 1].name) : '');
      const landOf = (n) => (line[n - 1] ? t(levelFor(line[n - 1].act).name) : '');
      verseEl.textContent = '';
      forkEl.innerHTML = '';
      nextRow.style.display = '';
      nextName.textContent = t('Fight {n} of {total} · {boss} · {land}', { n: fight, total, boss: bossName(fight), land: landOf(fight) });
      if (card.kind === 'clear') {
        const met = line[fight - 2] ? line[fight - 2].kind : null;
        kicker.textContent = t('FIGHT {n} OF {total} WON', { n: fight - 1, total });
        headline.textContent = bossName(fight - 1).toUpperCase();
        flavour.textContent = BOSS_FLAVOUR[met] ? BOSS_FLAVOUR[met]() : FLAVOUR[card.from] ? FLAVOUR[card.from]() : t('The way ahead opens.');
        carryEl.innerHTML = [
          row(t('SKILLS CARRIED'), `${(s.skills || []).length} / 4`),
          row(t('SOCKETS FILLED'), `${s.socketed ?? 0} / ${s.sockets ?? 0}`),
          row(t('BENCH'), String(s.bench ?? 0)),
          row(t('GLINT'), String(s.wallet ?? 0)),
          row(t('PARTY'), t('restored to full')),
          row(t('BEFORE THE FIGHT'), t('The Peddler')),
        ].join('');
      } else {
        kicker.textContent = t('THE BOSS RUSH');
        headline.textContent = t('{n} BOSSES, BACK TO BACK', { n: total });
        flavour.textContent = line.map((b) => t(b.name)).join(' · ');
        const g = s.grant;
        carryEl.innerHTML = [
          row(t('STARTER SKILLS'), `+${g ? (g.skills || []).length : 0}`),
          row(t('SOCKETS FILLED'), `${s.socketed ?? 0} / ${s.sockets ?? 0}`),
          row(t('GLINT'), String(s.wallet ?? 0)),
        ].join('');
      }
    } else if (card.kind === 'clear') {
      const rv = v && !v.__card ? v : null;
      let met = rv && rv.frame ? bossFor(card.from, rv.frame.seed, null, rv.thirdBosses ?? null).kind : null;
      if (depth !== null && beyondCampaign(depth - 1) && rv && rv.frame) {
        const lv = levelFor(card.from);
        met = lv.bosses ? lv.bosses[endlessBossIndex(depth - 1, rv.frame.seed, rv.thirdBosses ?? null)].kind : met;
      }
      kicker.textContent = depth !== null ? t('DEPTH {depth} CLEARED', { depth: depth - 1 }) : t('LEVEL {level} CLEARED', { level: ROMAN[card.from] ?? card.from });
      headline.textContent = (card.fromName ? t(card.fromName) : '').toUpperCase();
      const boss = (card.from >= 4 ? null : BOSS_FLAVOUR[met]) ?? FLAVOUR[card.from];
      flavour.textContent =
        depth === CYCLE + 1
          ? t('The campaign is won. The road does not end; it turns back into the dark wood, deeper than before.')
          : boss ? boss() : t('The way ahead opens.');
      const vd = depth !== null ? depth - 1 : null;
      verseEl.textContent = [verseLine(card.from, vd), rillLine(card.from, vd), tollyLine(card.from, vd), sableLine(card.from, vd)].filter(Boolean).join(' ');
      nextRow.style.display = '';
      const name = card.name ? t(card.name) : card.name;
      const fork = card.fork && Array.isArray(card.fork.roads) ? card.fork : null;
      forkEl.innerHTML = fork ? forkHtml(fork) : '';
      forkEl.classList.toggle('rn-guest', guest());
      nextName.textContent = fork && !fork.pick ? t('Choose your road') :
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
      forkEl.innerHTML = '';
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
    const choosing = card.fork && !card.fork.pick;
    hintEl.innerHTML = guest() ? (choosing ? t('The Healer chooses the road…') : t('The Healer leads on…')) : choosing ? t('<b>← →</b> choose a road · <b>Enter</b> take it') : t('<b>Enter</b> set out now');
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
    if (card.fork && !card.fork.pick) {
      const secs = Math.max(1, Math.ceil((card.untilTick - card.startTick - card.elapsedTicks) / 60));
      line = t('No road chosen in {secs} s: the party takes the Spire', { secs });
    } else if (st && st.level === card.to) {
      const name = card.name ? t(card.name) : card.name;
      if (!st.ready) line = t('Preparing {name}… {built}/{total}', { name, built: st.built, total: st.total });
      else if (card.due) line = t('Setting out…');
      else line = t('{name} is ready · setting out in {secs} s', { name, secs: Math.max(1, Math.ceil((card.untilTick - card.startTick - card.elapsedTicks) / 60)) });
    }
    if (readyEl.textContent !== line) readyEl.textContent = line;
  }

  // THE LEVEL V FORK: the road under the leader's keys (true when the card
  // is choosing).
  function forkKey(code) {
    const card = liveCard(null);
    if (!card || !card.fork || card.fork.pick || guest()) return false;
    const n = card.fork.roads.length;
    if (code === 'ArrowLeft' || code === 'KeyA') roadFocus = (roadFocus + n - 1) % n;
    else if (code === 'ArrowRight' || code === 'KeyD') roadFocus = (roadFocus + 1) % n;
    else if (code === 'Digit1' || code === 'Digit2') return pick(card.fork.roads[code === 'Digit1' ? 0 : 1]) || true;
    else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') return pick(card.fork.roads[roadFocus]) || true;
    else return false;
    forkEl.innerHTML = forkHtml(card.fork);
    return true;
  }
  function pad(action) {
    if (action === 'left') return forkKey('ArrowLeft');
    if (action === 'right') return forkKey('ArrowRight');
    if (action === 'confirm') return forkKey('Enter');
    return false;
  }

  function key(code, fresh) {
    if (fresh && forkKey(code)) return true;
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      if (!fresh) return true;
      const mgr = service('campaign');
      if (mgr && typeof mgr.requestSkip === 'function') mgr.requestSkip('enter');
      return true;
    }
    return false;
  }

  return { el, render, key, pad, tick, name: 'transit' };
}
