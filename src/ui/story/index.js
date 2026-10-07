// THE HEARTH SONG (docs/STORY.md): the story's runtime pieces that are not a
// page of their own.
//
//   - the prologue, once per profile: before the tutorial question on a first
//     New Game, else the first time a player stands in camp with nothing open;
//   - the Hollow Voice line under a boss's title the first time a player
//     meets each boss (and its lines when the corrupted altar is answered);
//   - service('story'): showPrologue(), prologueFirst(), voice(), debug().
//
// Harness boots (?menu=0, ?seed=, ?room= ...) stay quiet unless ?story=1, the
// same rule the one-time tips follow, so probes and goldens never meet a
// popup they did not ask for; ?story=0 turns the popups off on a player URL.
// Nothing here touches the sim.
import { provide, service } from '../../app/registry.js';
import { PALETTE as P } from '../../data/palette.js';
import { BOSS_VOICE, NPCS, voiceKeyFor } from '../../data/story.js';
import { t } from '../../i18n/index.js';

const POLL_MS = 200;
const VOICE_MS = 6500;
const CAMP_SETTLE_MS = 1500;

const CSS = `
  #story-voice {
    position: fixed; left: 50%; top: 21%; transform: translateX(-50%); z-index: 31;
    max-width: min(760px, 86vw); padding: 10px 22px 12px; text-align: center;
    font-family: system-ui, var(--i18n-font, sans-serif);
    background: radial-gradient(ellipse at 50% 50%, ${P.voidCharcoal}E6 0%, ${P.voidCharcoal}99 70%, transparent 100%);
    pointer-events: none; opacity: 0; transition: opacity 600ms ease;
  }
  #story-voice.sv-on { opacity: 1; }
  #story-voice .sv-who { font-size: 14px; font-weight: 800; letter-spacing: 0.26em; color: ${P.godstuffViolet}; text-transform: uppercase; }
  #story-voice .sv-line { margin-top: 4px; font-size: 21px; font-style: italic; line-height: 1.35; color: #E6DDF7;
    text-shadow: 0 0 14px ${P.godstuffViolet}66, 0 2px 6px #000000CC; }
`;

export function createStory({ app, world, scene: campScene = null, params = null }) {
  const harness = !!(params && params.menuSkip);
  const query = new URLSearchParams(window.location.search);
  const popupsOn = query.get('story') === '1' || (!harness && query.get('story') !== '0');

  if (!document.getElementById('story-voice-style')) {
    const st = document.createElement('style');
    st.id = 'story-voice-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const voiceEl = document.createElement('div');
  voiceEl.id = 'story-voice';
  voiceEl.setAttribute('role', 'status');
  voiceEl.setAttribute('aria-live', 'polite');
  voiceEl.innerHTML = '<div class="sv-who"></div><div class="sv-line"></div>';
  document.body.appendChild(voiceEl);

  const save = () => service('save');
  const story = () => {
    try {
      const s = save();
      return (s && typeof s.story === 'function' && s.story()) || { seen: [], met: {} };
    } catch {
      return { seen: [], met: {} };
    }
  };
  const seen = (id) => story().seen.includes(id);
  const note = (id) => {
    const s = save();
    return !!(s && typeof s.noteStory === 'function' && s.noteStory(id));
  };
  const run = () => (world && typeof world.runSystem === 'function' ? world.runSystem() : null);
  const inGuestSeat = () => {
    const n = service('net');
    try {
      return !!(n && typeof n.isGuest === 'function' && n.isGuest());
    } catch {
      return false;
    }
  };

  // ------------------------------------------------------------ the voice --
  let voiceUntil = 0;
  let lastVoice = null;
  function voice(text, who = NPCS.voice.name) {
    voiceEl.querySelector('.sv-who').textContent = t(who);
    voiceEl.querySelector('.sv-line').textContent = `“${t(text)}”`;
    voiceEl.classList.add('sv-on');
    voiceUntil = performance.now() + VOICE_MS;
    lastVoice = { text, at: Math.round(performance.now()) };
  }

  // --------------------------------------------------------- the prologue --
  let prologueOpen = false;
  let prologueShown = 0;
  function showPrologue({ force = false } = {}) {
    return new Promise((resolve) => {
      if ((!force && seen('prologue')) || prologueOpen || !app || !app.screens) return resolve(false);
      prologueOpen = true;
      prologueShown += 1;
      app.screens.push('prologue', {
        onDone: () => {
          prologueOpen = false;
          note('prologue');
          resolve(true);
        },
      });
    });
  }
  // The title's first New Game: the prologue before the tutorial question.
  function prologueFirst() {
    if (!popupsOn || seen('prologue')) return Promise.resolve(false);
    return showPrologue();
  }

  // ---------------------------------------------------------------- poll --
  let campSince = 0;
  let bossKey = null;
  setInterval(() => {
    const now = performance.now();
    if (voiceUntil && now > voiceUntil) {
      voiceUntil = 0;
      voiceEl.classList.remove('sv-on');
    }
    if (!popupsOn || !app || app.state !== 'playing') {
      campSince = 0;
      return;
    }
    const r = run();
    let v = null;
    try {
      v = r ? r.view() : null;
    } catch {
      v = null;
    }
    // The prologue for a player who never saw it: in camp, settled, nothing open.
    const inCamp = campScene && typeof campScene.isCamp === 'function' ? campScene.isCamp() : false;
    const idle = inCamp && !(r && r.isActive && r.isActive()) && !(app.screens && app.screens.isOpen());
    if (idle && !seen('prologue') && !prologueOpen && !inGuestSeat()) {
      if (!campSince) campSince = now;
      else if (now - campSince > CAMP_SETTLE_MS) showPrologue();
    } else if (!idle) campSince = 0;

    // The Hollow Voice under a boss's title, the first time each boss is met.
    // (Level IV's two bosses speak their own; a stand-in there gets the Heart's.)
    const met = v && v.active && v.boss && v.actBoss && !v.tutorial ? v.actBoss.kind : null;
    const boss = voiceKeyFor(met, v ? v.act : null);
    const key = boss ? `${v.frame ? v.frame.seed : ''}|${v.act}|${boss}` : null;
    if (key && key !== bossKey) {
      bossKey = key;
      if (BOSS_VOICE[boss] && note(`voice:${boss}`)) voice(BOSS_VOICE[boss].text);
    } else if (!key) bossKey = null;
  }, POLL_MS);

  const api = {
    showPrologue,
    prologueFirst,
    voice,
    popupsOn: () => popupsOn,
    debug: () => ({
      popupsOn,
      prologueOpen,
      prologueShown,
      voiceOn: voiceEl.classList.contains('sv-on'),
      voiceText: voiceEl.classList.contains('sv-on') ? voiceEl.textContent : null,
      lastVoice,
      story: story(),
    }),
  };
  provide('story', api);
  return api;
}
