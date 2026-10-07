// THE HEARTH SONG (docs/STORY.md): two app screens.
//
//   'story'     The Story so far — J in camp, Quill's bubble on the map table.
//               The verses held (seven pips, the missing ones blank), one
//               card per chapter (held chapters tell their summary, the rest
//               say how to read on), and the people met so far.
//   'prologue'  Wick tells the prologue: once per profile, the first time a
//               player reaches the camp (before the tutorial question on a
//               first New Game). Continue / Enter / Esc closes it.
//
// Both read the local player's own profile (a network guest's included) and
// write nothing but the prologue's seen flag.
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { service } from '../../app/registry.js';
import { CAMPAIGN_LEVELS } from '../../data/campaign.js';
import { CHAPTERS, PROLOGUE, TOTAL_VERSES, NPCS, PEOPLE, versesHeld } from '../../data/story.js';
import { t, tn } from '../../i18n/index.js';

const STYLE_ID = 'st-story-style';
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);


function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.st-story .st-wrap, .st-prologue .st-wrap {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  max-height: 94vh; overflow: auto; padding: ${px(28)} ${px(36)} ${px(22)};
  display: flex; flex-direction: column; align-items: center; gap: ${px(14)};
}
.st-story .st-wrap { width: min(96vw, ${px(1560)}); }
.st-prologue .st-wrap { width: min(92vw, ${px(1060)}); }
.st-head { display: flex; flex-direction: column; align-items: center; gap: ${px(4)}; text-align: center; }
.st-kicker { font-size: ${px(20)}; font-weight: 800; letter-spacing: 0.22em; color: ${P.hearthAmber}; }
.st-verses { display: flex; align-items: center; gap: ${px(14)}; font-size: ${px(22)}; color: ${P.bone}; }
.st-pips { display: inline-flex; gap: ${px(9)}; }
.st-pip { width: ${px(18)}; height: ${px(18)}; transform: rotate(45deg); border: max(2px, ${px(2)}) solid ${P.warmGrey}; }
.st-pip.st-on { background: ${P.hearthAmber}; border-color: ${P.hearthAmber}; box-shadow: 0 0 ${px(10)} ${P.hearthAmber}88; }
.st-pip.st-blank { border-style: dashed; border-color: ${P.warmGrey}88; }
.st-cols { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: ${px(24)}; width: 100%; }
.st-col { display: flex; flex-direction: column; gap: ${px(12)}; min-width: 0; }
.st-sec { font-size: ${px(20)}; font-weight: 800; letter-spacing: 0.22em; color: ${P.warmGrey}; }
.st-chap {
  padding: ${px(12)} ${px(16)}; border-radius: ${px(12)};
  background: linear-gradient(172deg, #2C2823 0%, ${P.voidCharcoal} 80%);
  border: max(2px, ${px(2)}) solid ${P.warmGrey}66;
}
.st-chap.st-held { border-color: ${P.hearthAmber}99; }
.st-chap .st-ct { font-size: ${px(24)}; font-weight: 800; color: ${P.parchment}; }
.st-chap .st-cv { font-size: ${px(19)}; color: ${P.hearthAmber}; letter-spacing: 0.06em; margin-top: ${px(2)}; }
.st-chap .st-cs { font-size: ${px(21)}; color: ${P.bone}; line-height: 1.34; margin-top: ${px(5)}; }
.st-chap.st-locked { border-style: dashed; }
.st-chap.st-locked .st-ct, .st-chap.st-locked .st-cs { color: ${P.warmGrey}; }
.st-person { display: flex; flex-direction: column; gap: ${px(2)}; padding: ${px(8)} ${px(12)}; border-left: max(2px, ${px(3)}) solid ${P.warmGrey}66; }
.st-person b { font-size: ${px(21)}; color: ${P.parchment}; }
.st-person span { font-size: ${px(19)}; color: ${P.bone}; line-height: 1.3; }
.st-person.st-voice { border-left-color: ${P.godstuffViolet}; }
.st-person.st-voice b { color: ${P.godstuffViolet}; }
.st-unmet { font-size: ${px(19)}; color: ${P.warmGrey}; font-style: italic; }
.st-text { display: flex; flex-direction: column; gap: ${px(12)}; }
.st-text p { margin: 0; font-size: ${px(24)}; line-height: 1.42; color: ${P.bone}; }
.st-text p:first-child::first-letter { font-size: 1.6em; font-weight: 800; color: ${P.hearthAmber}; }
.st-foot { display: flex; gap: ${px(24)}; align-items: center; flex-wrap: wrap; justify-content: center; font-size: ${px(20)}; color: ${P.warmGrey}; }
.st-foot b { display: inline-flex; align-items: center; justify-content: center; min-width: ${px(34)}; height: ${px(32)}; padding: 0 ${px(8)}; margin-right: ${px(6)};
  border-radius: ${px(7)}; border: max(1px, ${px(2)}) solid ${P.warmGrey}AA; background: ${P.voidCharcoal}; color: ${P.bone}; font-weight: 700; }
@media (max-height: 640px) {
  .st-chap .st-cs { font-size: ${px(19)}; }
  .st-text p { font-size: ${px(22)}; }
}
`;
  document.head.appendChild(st);
}

function profile() {
  try {
    const s = service('save');
    return s && typeof s.profile === 'function' ? s.profile() : null;
  } catch {
    return null;
  }
}

// What the page shows, from the profile (also the probe's view of it).
export function storyInfo(p = profile()) {
  const held = versesHeld(p, CAMPAIGN_LEVELS);
  const story = (p && p.story) || { seen: [], met: {} };
  const heldLevels = new Set(held.map((c) => c.level));
  const chapters = CHAPTERS.map((c) => ({
    level: c.level,
    verse: c.verse,
    inGame: CAMPAIGN_LEVELS.includes(c.level),
    held: heldLevels.has(c.level),
  }));
  const people = PEOPLE.map((x) => ({
    id: x.id,
    met: !!(x.always || (story.met && story.met[x.met] > 0) || (x.seenPrefix && (story.seen || []).some((s) => s.startsWith(x.seenPrefix)))),
  }));
  return { verses: held.length, total: TOTAL_VERSES, chapters, people, prologueSeen: (story.seen || []).includes('prologue') };
}

export function createStoryScreen(ctx) {
  installStyle();
  const { manager } = ctx;
  const el = document.createElement('div');
  el.className = 'st-story';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t('The story so far'));
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="st-wrap ap-plate">
      <div class="st-head">
        <div class="ap-orn">◆ ◇ ◆</div>
        <h2 class="ap-h2">${esc(t('The story so far'))}</h2>
        <div class="st-verses"></div>
      </div>
      <div class="st-cols">
        <div class="st-col st-chapters"></div>
        <div class="st-col st-people"></div>
      </div>
      <div class="st-foot">
        <button type="button" class="ap-btn st-again" data-nav>${esc(t('Read the prologue again'))}</button>
        <button type="button" class="ap-btn ap-primary st-close" data-nav data-nav-default>${esc(t('Back to camp'))}</button>
      </div>
    </div>`;
  const versesEl = el.querySelector('.st-verses');
  const chapEl = el.querySelector('.st-chapters');
  const peopleEl = el.querySelector('.st-people');
  el.querySelector('.st-close').addEventListener('click', () => close());
  el.querySelector('.st-again').addEventListener('click', () => reread());
  let info = null;

  function close() {
    if (manager.top() === 'story') manager.pop();
  }
  // The prologue again, from the page.
  function reread() {
    close();
    const s = service('story');
    if (s && typeof s.showPrologue === 'function') s.showPrologue({ force: true });
  }

  function render() {
    info = storyInfo();
    const pips = Array.from({ length: info.total }, (_, i) => {
      const ch = info.chapters[i];
      const cls = ch && ch.held ? 'st-pip st-on' : ch && ch.inGame ? 'st-pip' : 'st-pip st-blank';
      return `<i class="${cls}"></i>`;
    }).join('');
    versesEl.innerHTML = `<span>${esc(t('Verses in the hearth: {n} of {total}', { n: info.verses, total: info.total }))}</span><span class="st-pips">${pips}</span>`;
    chapEl.innerHTML = `<div class="st-sec">${esc(t('CHAPTERS'))}</div>`;
    for (const ch of info.chapters) {
      const c = CHAPTERS.find((x) => x.level === ch.level);
      const div = document.createElement('div');
      div.className = `st-chap ${ch.held ? 'st-held' : 'st-locked'}`;
      div.dataset.level = String(ch.level);
      if (ch.held) {
        div.innerHTML = `<div class="st-ct"></div><div class="st-cv"></div><div class="st-cs"></div>`;
        div.querySelector('.st-ct').textContent = t(c.title);
        div.querySelector('.st-cv').textContent = t('Verse of {verse}', { verse: t(c.name) });
        div.querySelector('.st-cs').textContent = t(c.summary);
      } else {
        div.innerHTML = `<div class="st-ct"></div><div class="st-cs"></div>`;
        div.querySelector('.st-ct').textContent = t('Chapter {n} · ???', { n: ROMAN[ch.level] ?? ch.level });
        div.querySelector('.st-cs').textContent = ch.inGame
          ? t('Clear Level {n} to read on.', { n: ROMAN[ch.level] ?? ch.level })
          : t('The road below the Barrow is not on the map yet.');
      }
      chapEl.appendChild(div);
    }
    const missing = info.total - info.chapters.length;
    if (missing > 0) {
      const div = document.createElement('div');
      div.className = 'st-unmet';
      div.textContent = tn(missing, '{n} more verse is still missing, somewhere past the edge of the map.', '{n} more verses are still missing, somewhere past the edge of the map.');
      chapEl.appendChild(div);
    }
    peopleEl.innerHTML = `<div class="st-sec">${esc(t('PEOPLE'))}</div>`;
    for (const person of info.people) {
      const x = PEOPLE.find((q) => q.id === person.id);
      const div = document.createElement('div');
      div.className = `st-person${person.id === 'voice' ? ' st-voice' : ''}`;
      div.dataset.npc = person.id;
      if (person.met) {
        div.innerHTML = '<b></b><span></span>';
        div.querySelector('b').textContent = t(NPCS[person.id].name);
        div.querySelector('span').textContent = t(x.lore);
      } else {
        div.innerHTML = '<span class="st-unmet"></span>';
        div.querySelector('span').textContent = t('Someone you have not met yet.');
      }
      peopleEl.appendChild(div);
    }
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    reusable: false,
    defaultFocus: '.st-close',
    onOpen() {
      render();
    },
    back() {
      close();
      return true;
    },
    debug: () => ({
      info,
      text: el.querySelector('.st-wrap').textContent.replace(/\s+/g, ' ').trim(),
      rect: (() => {
        const r = el.querySelector('.st-wrap').getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })(),
    }),
  };
}

export function createPrologueScreen(ctx) {
  installStyle();
  const { manager } = ctx;
  const el = document.createElement('div');
  el.className = 'st-prologue';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t(PROLOGUE.title));
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="st-wrap ap-plate">
      <div class="st-head">
        <div class="st-kicker"></div>
        <h2 class="ap-h2"></h2>
        <div class="ap-orn">◆ ◇ ◆</div>
      </div>
      <div class="st-text"></div>
      <button type="button" class="ap-btn ap-primary st-go" data-nav data-nav-default>${esc(t('Continue'))}</button>
      <div class="st-foot"><span><b>Enter</b>${esc(t('Continue'))}</span></div>
    </div>`;
  el.querySelector('.st-kicker').textContent = t(NPCS.keeper.name).toUpperCase();
  el.querySelector('.ap-h2').textContent = t(PROLOGUE.title);
  const textEl = el.querySelector('.st-text');
  for (const line of PROLOGUE.text) {
    const p = document.createElement('p');
    p.textContent = t(line);
    textEl.appendChild(p);
  }
  let params = null;
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    if (manager.top() === 'prologue') manager.pop();
    params?.onDone?.();
  }
  el.querySelector('.st-go').addEventListener('click', finish);
  return {
    el,
    blocking: true,
    layer: 'dialog',
    reusable: false,
    defaultFocus: '.st-go',
    onOpen(p = {}) {
      params = p;
      done = false;
    },
    onClose() {
      if (!done) {
        done = true;
        params?.onDone?.();
      }
    },
    back() {
      finish();
      return true;
    },
    debug: () => ({ text: textEl.textContent }),
  };
}
