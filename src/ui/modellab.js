// MODEL LAB toolbar (docs/MODEL_STANDARD.md) — the review strip over the model
// lab scene (scenes/modellab.js), laid out like the one in Kesh's sample
// video: model tabs on the left, Idle / Move / Ability / Still, the ability
// picker, Rewind, the view and a live readout ("1.2s · Ash Breath: strike").
// A harness-only debug page, English only like the VFX lab.
import { PALETTE } from '../data/palette.js';

const INK = PALETTE.voidCharcoal;
const PAPER = PALETTE.parchment;
const CSS = `
#modellab{position:fixed;left:0;right:0;top:0;z-index:9999;display:flex;flex-wrap:wrap;gap:8px;align-items:center;
  padding:8px 10px;background:${PAPER}F0;color:${INK};font:600 13px/1.2 system-ui,sans-serif;
  box-shadow:0 1px 0 ${INK}40}
#modellab .grp{display:flex;border:1px solid ${INK}4D;border-radius:7px;overflow:hidden}
#modellab button{border:0;border-right:1px solid ${INK}2E;background:transparent;color:inherit;font:inherit;
  padding:6px 11px;cursor:pointer}
#modellab .grp button:last-child{border-right:0}
#modellab button.on{background:${INK};color:${PAPER}}
#modellab .read{font:500 13px/1.2 ui-monospace,monospace;white-space:nowrap;padding-left:4px;opacity:.85}
#modellab input[type=range]{width:160px}
#modellab .tip{font-weight:400;opacity:.6}
`;

// spec: { models: [[id, label]], modes: [[id, label]], abilities(model) ->
// [[id, label]], get() -> state, set(patch) }
export function mountModelLab(spec) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const bar = document.createElement('div');
  bar.id = 'modellab';
  document.body.appendChild(bar);

  const groups = {};
  function group(key, items, onPick) {
    const g = document.createElement('div');
    g.className = 'grp';
    g.dataset.key = key;
    for (const [id, label] of items) {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.id = id;
      b.addEventListener('click', () => onPick(id));
      g.appendChild(b);
    }
    bar.appendChild(g);
    groups[key] = g;
    return g;
  }
  function mark(key, id) {
    const g = groups[key];
    if (!g) return;
    for (const b of g.children) b.classList.toggle('on', b.dataset.id === String(id));
  }

  group('model', spec.models, (id) => spec.set({ model: id }));
  group('mode', spec.modes, (id) => spec.set({ mode: id }));
  let abilityGroup = null;
  let abilityModel = null;
  function buildAbilities() {
    const s = spec.get();
    if (abilityModel === s.model) return;
    abilityModel = s.model;
    if (abilityGroup) abilityGroup.remove();
    abilityGroup = group('ability', spec.abilities(s.model), (id) => spec.set({ ability: id, mode: 'ability', t: 0, rate: 1 }));
    bar.insertBefore(abilityGroup, rewindGroup);
  }
  const rewindGroup = group('rewind', [['rewind', 'Rewind']], () => spec.set({ rate: -1, mode: 'ability' }));
  group('view', [['showcase', 'Showcase'], ['play', 'Play zoom']], (id) => spec.set({ view: id }));
  group('extra', [['turn', 'Turntable'], ['classic', 'Classic beside']], (id) => {
    const s = spec.get();
    if (id === 'turn') spec.set({ turntable: !s.turntable });
    else spec.set({ classic: !s.classic });
  });
  const scrub = document.createElement('input');
  scrub.type = 'range';
  scrub.min = '0';
  scrub.max = '1000';
  scrub.value = '0';
  scrub.title = 'Scrub the ability (holds it Still)';
  scrub.addEventListener('input', () => {
    const s = spec.get();
    spec.set({ mode: 'still', t: (Number(scrub.value) / 1000) * s.duration });
  });
  bar.appendChild(scrub);
  const read = document.createElement('span');
  read.className = 'read';
  bar.appendChild(read);
  const tip = document.createElement('span');
  tip.className = 'tip';
  tip.textContent = '?facet=0 shows the classic models in the game';
  bar.appendChild(tip);

  function refresh() {
    const s = spec.get();
    buildAbilities();
    mark('model', s.model);
    mark('mode', s.mode);
    mark('ability', s.ability);
    mark('view', s.view);
    mark('rewind', s.rate < 0 ? 'rewind' : '');
    const ex = groups.extra;
    ex.children[0].classList.toggle('on', !!s.turntable);
    ex.children[1].classList.toggle('on', !!s.classic);
    if (document.activeElement !== scrub && s.duration > 0) scrub.value = String(Math.round((s.t / s.duration) * 1000));
    read.textContent = s.readout;
  }
  return { refresh, el: bar };
}
