// Settings ▸ Audio tab (docs/gauntlet/PLAN.md §3.2 / §3.5). Owner: M3.
// Registered with registerSettingsTab({ id: 'audio', order: 20 }); M1's
// settings screen hosts it (tab chrome, info panel, footer Reset behind
// app.confirm -> inst.reset()). Built only from M1's widget kit so focus
// rings, keyboard / mouse / gamepad navigation and styling are shared with
// every other tab; the au- classes only lay out each channel group.
//
// One group per channel (Master, Music, Sound Effects, Ambience, Interface):
//   row 1  volume slider (M1 row) — readout "80 %  ·  −3.2 dB" is the real
//          gain of the slider on its current curve; ←/→ / D-pad step 5 %
//   row 2  [Curve: Log|Linear] [Mute] [Test] + a live level meter.
//          Plain buttons (no left/right adjust) so ←/→ moves between them and
//          Enter / A / click presses: Curve cycles (the engine keeps the
//          loudness — the slider moves to the same dB on the new curve),
//          Mute toggles, Test plays a short sample on that channel (SFX pans
//          left -> centre -> right).
// Then "Mute when the game loses focus" and an honest status line (waiting
// for the first key / click, muted by ?audio=0, no Web Audio).
import { registerSettingsTab } from '../../../app/registry.js';
import { sliderToDb, formatDb } from '../../../audio/mixmath.js';

const CHANNELS = [
  { id: 'master', label: 'Master', help: 'Scales every other channel. Music, Sound Effects, Ambience and Interface never change each other.' },
  { id: 'music', label: 'Music', help: 'The score: menu, camp, combat, boss and the victory / defeat stingers.' },
  { id: 'sfx', label: 'Sound Effects', help: 'Combat and world sounds, placed left / right and by distance from the camera.' },
  { id: 'ambient', label: 'Ambience', help: 'The hearth fire at camp, wind and water on expeditions.' },
  { id: 'ui', label: 'Interface', help: 'Menu clicks, rewards, purchases and progress chimes.' },
];
const KEY_STEP = 0.05;
const CURVE_LABEL = { log: 'Log (perceptual)', linear: 'Linear' };
const CURVE_HELP =
  'Log (perceptual): each half of the slider sounds about half as loud (−10 dB at 50 %), the way most PC games feel.\nLinear: the gain follows the slider directly (−6 dB at 50 %), so the top of the slider changes very little.\nSwitching keeps the current loudness — the slider moves to the matching spot.';
const S = (n) => `calc(${n}px * var(--ap-s, 1))`;

let styled = false;
function injectStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const st = document.createElement('style');
  st.id = 'au-style';
  st.textContent = `
.au-tab { display: flex; flex-direction: column; gap: ${S(10)}; }
.au-chan { display: flex; flex-direction: column; gap: ${S(4)}; padding-bottom: ${S(10)}; border-radius: ${S(12)}; background: #221F1B99; }
.au-chan .ap-slider { background: transparent; }
/* Channel slider: label on top, the slider across the full row, so the
   button strip below sits under it and D-pad / arrow Down reaches it. */
.au-chan .ap-slider { grid-template-columns: minmax(0, 1fr); grid-template-areas: "label" "ctl" "note"; row-gap: ${S(2)}; padding-top: ${S(8)}; }
.au-chan .ap-slider:has(.ap-note:empty) .ap-label { grid-row: auto; align-self: end; }
.au-chan .ap-slider .ap-ctl { justify-content: stretch; }
.au-chan .ap-slider .ap-value { min-width: ${S(190)}; }
.au-acts { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: ${S(10)}; padding: 0 ${S(16)}; }
.au-acts .ap-btn { min-width: ${S(120)}; }
.au-acts .au-curve { min-width: ${S(250)}; }
.au-meter { flex: 1 1 ${S(100)}; min-width: ${S(80)}; max-width: ${S(240)}; height: ${S(10)}; border-radius: 999px;
  background: #4E463F; border: 1px solid #9C918666; overflow: hidden; }
.au-meter > i { display: block; height: 100%; width: 0%; background: #F4EFE6; transition: width 70ms linear; }
.au-chan[data-muted="true"] .au-meter > i { background: #9C9186; }
.au-chan[data-muted="true"] .ap-slider .ap-value { color: #9C9186; }
.au-status { padding: ${S(10)} ${S(16)}; border-radius: ${S(12)}; background: #221F1B; border: 1px solid #9C918644; }
.au-status[data-tone="warn"] { color: #C9C2B3; border-color: #E8A23D66; }
`;
  document.head.appendChild(st);
}

const readout = (level, mode, muted) => (muted ? `${Math.round(level * 100)} %  ·  muted` : `${Math.round(level * 100)} %  ·  ${formatDb(sliderToDb(level, mode))}`);

function build(ctx) {
  injectStyle();
  const { settings, widgets: W } = ctx;
  const audio = () => (ctx.services && ctx.services.service ? ctx.services.service('audio') : null);
  const set = (path, v) => settings.set(path, v, { source: 'ui' });
  const el = document.createElement('div');
  el.className = 'au-tab';
  el.setAttribute('data-tab', 'audio');

  // tone 'status' (not 'info': W.note's tone becomes a class, and .ap-info
  // is the settings screen's side panel).
  const status = W.note('', 'status');
  status.classList.add('au-status');
  el.appendChild(status);
  el.appendChild(W.section('Volume'));

  const rows = {};
  for (const ch of CHANNELS) {
    const group = document.createElement('div');
    group.className = 'au-chan';
    group.setAttribute('data-channel', ch.id);
    const muted = () => !!settings.get(`audio.${ch.id}.muted`) || (ch.id === 'master' && !!(audio() && audio().forceMuted));
    const slider = W.slider({
      label: ch.label,
      id: `au-${ch.id}-level`,
      min: 0,
      max: 1,
      step: 0.01,
      value: settings.get(`audio.${ch.id}.level`),
      help: `${ch.help}\n←/→ or the D-pad change it in 5 % steps; drag with the mouse for fine control.`,
      format: (v) => readout(v, settings.get(`audio.${ch.id}.mode`), muted()),
      onInput: (v) => {
        set(`audio.${ch.id}.level`, v);
        const a = audio();
        if (a && a.previewChannel) a.previewChannel(ch.id);
      },
      onChange: (v) => set(`audio.${ch.id}.level`, v),
    });
    // 5 % keyboard / D-pad steps snapped to the 5 % grid.
    const range = slider.input || slider.node;
    range.__navAdjust = (dir) => {
      if (range.disabled) return;
      const cur = Number(range.value);
      const k = dir > 0 ? Math.ceil((cur + 1e-4) / KEY_STEP) : Math.floor((cur - 1e-4) / KEY_STEP);
      const v = Math.round(Math.min(1, Math.max(0, k * KEY_STEP)) * 100) / 100;
      if (v === cur) return;
      slider.set(v);
      set(`audio.${ch.id}.level`, v);
      const a = audio();
      if (a && a.previewChannel) a.previewChannel(ch.id);
    };

    const acts = document.createElement('div');
    acts.className = 'au-acts';
    const curve = W.button({
      label: 'Curve',
      id: `au-${ch.id}-curve`,
      help: CURVE_HELP,
      onPress: () => set(`audio.${ch.id}.mode`, settings.get(`audio.${ch.id}.mode`) === 'log' ? 'linear' : 'log'),
    });
    curve.el.classList.add('au-curve');
    const mute = W.button({
      label: 'Mute',
      id: `au-${ch.id}-mute`,
      help: ch.id === 'master' ? 'Silences everything without moving any slider.' : `Silences ${ch.label} without moving its slider.`,
      onPress: () => {
        const a = audio();
        // ?audio=0 mutes Master for the visit without touching the setting:
        // the button ends that mute rather than flipping the stored value.
        if (ch.id === 'master' && a && a.forceMuted && !settings.get('audio.master.muted')) {
          a.clearForceMute();
          refresh();
          return;
        }
        set(`audio.${ch.id}.muted`, !muted());
      },
    });
    const test = W.button({
      label: 'Test',
      id: `au-${ch.id}-test`,
      help:
        ch.id === 'sfx'
          ? 'Plays a hit on your left, in the centre and on your right.'
          : ch.id === 'master'
            ? 'Plays an interface chime and a hit at the current Master level.'
            : `Plays a short ${ch.label.toLowerCase()} sample at its current level.`,
      onPress: () => {
        const a = audio();
        if (!a || a.state !== 'running') {
          if (ctx.toast) ctx.toast(a && a.state === 'locked' ? 'Sound starts after your first key press or click' : 'Sound is unavailable right now', { tone: 'warn' });
          return;
        }
        if (ch.id === 'master' && muted()) {
          if (ctx.toast) ctx.toast('Master is muted', { tone: 'warn' });
        }
        a.testChannel(ch.id);
      },
    });
    test.el.setAttribute('aria-label', `Test ${ch.label}`);
    curve.el.dataset.helpTitle = `${ch.label} · curve`;
    mute.el.dataset.helpTitle = `${ch.label} · mute`;
    test.el.dataset.helpTitle = `${ch.label} · test`;
    const meter = document.createElement('div');
    meter.className = 'au-meter';
    meter.setAttribute('aria-hidden', 'true');
    meter.title = `${ch.label} level`;
    const bar = document.createElement('i');
    meter.appendChild(bar);
    acts.append(curve.el, mute.el, test.el, meter);
    group.append(slider.el, acts);
    el.appendChild(group);
    rows[ch.id] = { group, slider, curve, mute, test, bar, muted };
  }

  el.appendChild(W.section('Behaviour'));
  const blur = W.toggle({
    label: 'Mute when the game loses focus',
    id: 'au-muteonblur',
    value: !!settings.get('audio.muteOnBlur'),
    help: 'Fades everything out while you are in another window or tab, and back in when you return.',
    onChange: (v) => set('audio.muteOnBlur', v),
  });
  el.appendChild(blur.el);

  function paintStatus() {
    const a = audio();
    let text;
    let tone = 'info';
    if (!a) {
      text = 'Sound is unavailable in this build.';
      tone = 'warn';
    } else if (a.state === 'unavailable') {
      text = 'This browser has no Web Audio — sound is unavailable.';
      tone = 'warn';
    } else if (a.state === 'locked') {
      text = 'Sound starts after your first key press or click (a browser rule).';
      tone = 'warn';
    } else if (a.forceMuted) {
      text = 'Muted for this visit by the ?audio=0 link — unmute Master to hear sound.';
      tone = 'warn';
    } else if (a.state === 'suspended') {
      text = 'Sound is paused by the browser — press any key or click to resume.';
      tone = 'warn';
    } else {
      const sr = a.context ? Math.round(a.context.sampleRate / 100) / 10 : null;
      text = `Sound is on${sr ? ` · ${sr} kHz stereo` : ''}. Changes apply instantly and are saved.`;
    }
    if (status.textContent !== text) status.textContent = text;
    status.setAttribute('data-tone', tone);
  }

  function refresh() {
    for (const ch of CHANNELS) {
      const r = rows[ch.id];
      const mode = settings.get(`audio.${ch.id}.mode`);
      const m = r.muted();
      r.slider.set(settings.get(`audio.${ch.id}.level`));
      r.curve.set(`Curve: ${CURVE_LABEL[mode] || mode}`);
      r.mute.set(m ? 'Muted' : 'Mute');
      const mn = r.mute.node || r.mute.el;
      mn.setAttribute('aria-pressed', m ? 'true' : 'false');
      r.group.setAttribute('data-muted', m ? 'true' : 'false');
    }
    blur.set(!!settings.get('audio.muteOnBlur'));
    paintStatus();
  }

  const unsub = settings.subscribe('audio', () => refresh());
  let raf = 0;
  let visible = false;
  function meterLoop() {
    raf = 0;
    if (!visible) return;
    const a = audio();
    for (const ch of CHANNELS) {
      const v = a && a.level ? a.level(ch.id) : 0;
      const db = v > 0 ? 20 * Math.log10(v) : -90;
      const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
      rows[ch.id].bar.style.width = `${pct.toFixed(1)}%`;
    }
    paintStatus();
    raf = requestAnimationFrame(meterLoop);
  }
  refresh();

  // Live text for M1's info panel: the focused channel's real numbers.
  function info(node) {
    const group = node && node.closest ? node.closest('.au-chan') : null;
    const a = audio();
    if (!group) return a ? `Sound: ${a.state}` : '';
    const id = group.getAttribute('data-channel');
    const lvl = settings.get(`audio.${id}.level`);
    const mode = settings.get(`audio.${id}.mode`);
    const own = sliderToDb(lvl, mode);
    const lines = [`${Math.round(lvl * 100)} % on the ${CURVE_LABEL[mode]} curve = ${formatDb(own)}`];
    if (a && a.debug && a.debug.buses) {
      const b = a.debug.buses()[id];
      if (b) lines.push(id === 'master' ? `Master gain now: ${formatDb(b.effectiveDb <= -998 ? -Infinity : b.effectiveDb)}` : `With Master: ${formatDb(b.effectiveDb <= -998 ? -Infinity : b.effectiveDb)}`);
    }
    if (rows[id] && rows[id].muted()) lines.push('Muted');
    return lines.join('\n');
  }

  return {
    el,
    onShow() {
      visible = true;
      refresh();
      if (!raf) raf = requestAnimationFrame(meterLoop);
    },
    onHide() {
      visible = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    reset() {
      settings.reset('audio');
      refresh();
    },
    info,
    destroy() {
      visible = false;
      unsub();
    },
    debug: { rows: () => Object.keys(rows), refresh },
  };
}

export function registerAudioTab() {
  return registerSettingsTab({ id: 'audio', label: 'Audio', order: 20, build });
}
