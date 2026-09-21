// Socket screen (BUILD_BRIEF §16 + §15.5 display contract) — the between-rooms
// build workbench. Flat storybook card page in the §17 HUD grammar (charcoal
// plates, parchment ink, warm-grey chrome — never browser-default text), laid
// over the world; Zone-1 HUD persists beneath (§16).
//
// Binding display contract implemented here (§15.5):
//   - GREY (technique cell GREY / stat key absent): per-cell HOLLOW icon +
//     diagonal strike-through. Advisory only — socketing proceeds with a warn.
//   - SATURATION-INERT (Multiply, realizable delta 0): hollow icon + "+0"
//     caption — a DISTINCT marker that never reuses the grey strike.
//   - Hard blocks (rarity cap / repetition limit): rejection SHAKE + block
//     glyph on the cell; the sim logs `socket_denied` (§16).
//   - Slot chips show their rarity cap (common Bone / rare Signal Blue /
//     legendary Hearth Amber, §19.1); Legendary chrome gets the shimmer sweep
//     (never pulses, §19.1 colorblind fence).
//   - No state by color alone: grey = strike shape, inert = "+0" text, live
//     preview = ◆ badge, cap block = ⊘ glyph (color rides along, never alone).
//
// Interaction (§3/§16): B toggles (between rooms only; combat_active locks it
// out), Esc closes (banks the focused candidate back to the bench — bench
// nodes never leave the bench until socketed). Click a bench card to focus a
// candidate; click a slot cell to socket it there; click a filled cell with no
// candidate to unsocket. __echoes.cmd('openSocket'|'closeSocket') drives the
// same paths for tests.
//
// Reads sim truth exclusively through world.buildSystem() (view/preview) and
// mutates only through its socket/unsocket — the same entry points as
// __echoes.cmd, so every screen action emits the same sim events.
import { PALETTE } from '../../data/palette.js';

const RARITY_COLOR = {
  common: PALETTE.bone,
  rare: PALETTE.signalBlue,
  legendary: PALETTE.hearthAmber,
};

const NODE_GLYPH = {
  sharpen: '▲',
  quicken: '»',
  multiply: '✚',
  ascend: '★',
  bounce: '⇄',
  siphon: '⇓',
  echo: '◎',
  detonate: '✶',
};

const SHAPE_LABEL = {
  projectile: 'projectile',
  direct: 'direct',
  nova: 'nova',
  ground_aoe: 'ground zone',
  aura: 'passive aura',
  melee_arc: 'arc',
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// §15.2 feasibility of one candidate across a whole skill row. A slot is legal
// when its rarity cap admits the node AND socketing there (displacing only that
// slot's own occupant) keeps the copies on this skill within the node's limit.
// With no legal slot the row must read as the hard block it is — a cap-blocked
// or limit-blocked candidate NEVER shows a live contribution line (§16).
// Returns the reason string, or null when at least one slot would take it.
function hardBlockReason(sys, sk, nodeId) {
  const info = sys.nodeInfo(nodeId);
  if (!info) return null;
  let capFits = false;
  for (let i = 0; i < sk.caps.length; i++) {
    if (info.rarityRank > sys.rarityRank(sk.caps[i])) continue;
    capFits = true;
    const copies = sk.sockets.filter((s, j) => j !== i && s && s.node === nodeId).length;
    if (copies + 1 <= info.limit) return null;
  }
  if (capFits) return `repeat limit — ${info.limit} per skill already socketed here`;
  const caps = [...new Set(sk.caps)].join('/');
  return `${info.rarity} node — ${
    sk.caps.length === 1 ? 'this skill’s only slot caps' : 'every slot here caps'
  } at ${caps}`;
}

export function createSocketScreen({ bus, world }) {
  const build = () => world.buildSystem();

  // ------------------------------------------------------------------ style --
  const style = document.createElement('style');
  style.textContent = `
    #socket-screen {
      position: fixed; inset: 0; z-index: 30; display: none;
      align-items: center; justify-content: center;
      background: radial-gradient(ellipse at center, ${PALETTE.voidCharcoal}99 0%, ${PALETTE.voidCharcoal}D9 100%);
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      color: ${PALETTE.parchment};
      user-select: none;
    }
    #socket-screen.nd-open { display: flex; }
    #socket-screen * { box-sizing: border-box; }
    .nd-page {
      /* §17/A7 virtual-px grammar: the card is AUTHORED at these sizes (all
         text at or above the 16 px floor, numerals at 20) and uniformly scaled
         to fit the window by --nd-s, exactly like the HUD root. */
      width: 1180px; max-height: 800px;
      transform: scale(var(--nd-s, 1)); transform-origin: center center;
      display: flex; flex-direction: column;
      background: linear-gradient(175deg, #2b2723 0%, ${PALETTE.voidCharcoal} 55%);
      border: 2px solid ${PALETTE.warmGrey}77;
      border-radius: 16px;
      box-shadow: 0 0 0 5px ${PALETTE.voidCharcoal}CC, 0 0 0 6px ${PALETTE.warmGrey}44,
                  0 18px 60px #000000AA, inset 0 0 0 1px ${PALETTE.bone}22;
      overflow: hidden;
    }
    .nd-head {
      display: flex; align-items: baseline; gap: 12px;
      padding: 12px 20px 10px;
      border-bottom: 1px solid ${PALETTE.warmGrey}44;
      background: ${PALETTE.voidCharcoal}80;
    }
    .nd-title {
      font-size: 30px; font-weight: 800; letter-spacing: 0.14em;
      color: ${PALETTE.parchment};
    }
    .nd-orn { color: ${PALETTE.warmGrey}; font-size: 17px; letter-spacing: 0.3em; }
    .nd-hint { margin-left: auto; font-size: 17px; color: ${PALETTE.warmGrey}; }
    .nd-hint b { color: ${PALETTE.bone}; font-weight: 700; }
    .nd-lock {
      display: none; margin: 10px 20px 0; padding: 8px 12px;
      border: 1px solid ${PALETTE.warmGrey}66; border-radius: 8px;
      background: ${PALETTE.voidCharcoal}; color: ${PALETTE.bone};
      font-size: 19px; text-align: center;
    }
    .nd-lock.nd-on { display: block; }
    .nd-body { overflow-y: auto; min-height: 0; padding: 12px 24px 16px; }
    .nd-sect {
      font-size: 17px; font-weight: 700; letter-spacing: 0.22em;
      color: ${PALETTE.warmGrey}; margin: 8px 0 6px;
    }
    /* ---------------------------------------------------------------- bench */
    .nd-bench { display: flex; flex-wrap: wrap; gap: 8px; min-height: 46px; }
    .nd-bench-empty { font-size: 17px; color: ${PALETTE.warmGrey}; padding: 6px 2px; }
    .nd-card {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px 6px 6px; cursor: pointer;
      background: ${PALETTE.voidCharcoal};
      border: 2px solid var(--rar, ${PALETTE.bone}); border-radius: 10px;
      position: relative; overflow: hidden;
    }
    .nd-card.nd-focus {
      outline: 2px solid ${PALETTE.hearthAmber}; outline-offset: 2px;
    }
    .nd-card.nd-legendary::after {
      content: ''; position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(115deg, transparent 30%, ${PALETTE.hearthAmber}33 46%, ${PALETTE.godstuffVioletPeak}22 50%, transparent 66%);
      background-size: 260% 100%;
      animation: nd-shimmer 3.2s linear infinite; /* shimmer sweep, never a pulse */
    }
    @keyframes nd-shimmer { from { background-position: 130% 0; } to { background-position: -130% 0; } }
    .nd-card-icon {
      width: 38px; height: 38px; border-radius: 7px; flex: none;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; background: #2e2a25; color: var(--rar, ${PALETTE.bone});
      border: 1px solid ${PALETTE.warmGrey}44;
    }
    .nd-card-name { font-size: 19px; font-weight: 700; line-height: 1.1; }
    .nd-card-sub { font-size: 16px; color: ${PALETTE.warmGrey}; letter-spacing: 0.05em; }
    /* ----------------------------------------------------------- skill rows */
    .nd-row {
      display: grid; grid-template-columns: 210px 1fr auto; gap: 8px 16px;
      align-items: center; padding: 7px 10px; margin-bottom: 6px;
      background: ${PALETTE.voidCharcoal}B3;
      border: 1px solid ${PALETTE.warmGrey}33; border-radius: 12px;
    }
    .nd-skill-name { font-size: 21px; font-weight: 700; }
    .nd-skill-sub { font-size: 16px; color: ${PALETTE.warmGrey}; letter-spacing: 0.04em; }
    .nd-stats {
      font-size: 20px; color: ${PALETTE.bone};
      font-variant-numeric: tabular-nums; line-height: 1.45;
    }
    .nd-stats .nd-mod { color: ${PALETTE.hearthAmber}; font-weight: 700; }
    .nd-prev { font-size: 17px; color: ${PALETTE.warmGrey}; margin-top: 2px; }
    /* §15.5 per-row realized-contribution note for a grey / inert SOCKETED node */
    .nd-note { font-size: 17px; color: ${PALETTE.bone}; margin-top: 2px; }
    .nd-note .nd-warn { color: ${PALETTE.bone}; font-weight: 800; margin-right: 3px; }
    .nd-prev .nd-live { color: ${PALETTE.hearthAmber}; }
    .nd-prev .nd-warn { color: ${PALETTE.bone}; }
    .nd-cells { display: flex; gap: 10px; }
    .nd-cellwrap { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .nd-cell {
      position: relative; width: 56px; height: 56px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; cursor: pointer;
      background: #2e2a25; border: 2px solid var(--cap, ${PALETTE.warmGrey});
    }
    .nd-cell.nd-vacant { border-style: dashed; background: ${PALETTE.voidCharcoal}; }
    .nd-cell.nd-vacant .nd-glyph { color: ${PALETTE.warmGrey}66; }
    .nd-glyph { color: var(--rar, ${PALETTE.bone}); font-weight: 700; }
    /* §15.5 GREY: hollow icon + diagonal strike-through */
    .nd-glyph.nd-hollow {
      color: transparent;
      -webkit-text-stroke: 1.4px ${PALETTE.bone};
    }
    .nd-strike { display: none; position: absolute; width: 132%; height: 3px;
      background: ${PALETTE.bone}; transform: rotate(-45deg); border-radius: 2px;
      box-shadow: 0 0 0 1px ${PALETTE.voidCharcoal};
      pointer-events: none;
    }
    .nd-cell.nd-grey .nd-strike { display: block; }
    /* §15.5 SATURATION-INERT: hollow icon + "+0" caption — no strike, ever */
    .nd-inert-badge { display: none; position: absolute; right: -7px; top: -7px;
      background: ${PALETTE.voidCharcoal}; border: 1px solid ${PALETTE.bone};
      border-radius: 7px; padding: 0 4px;
      font-size: 16px; font-weight: 800; color: ${PALETTE.bone};
      font-variant-numeric: tabular-nums; pointer-events: none;
    }
    .nd-cell.nd-inert .nd-inert-badge { display: block; }
    /* live-preview badge on a vacant target cell */
    .nd-fit-badge { display: none; position: absolute; right: -6px; top: -6px;
      color: ${PALETTE.hearthAmber}; font-size: 18px; pointer-events: none;
      text-shadow: 0 0 3px ${PALETTE.voidCharcoal};
    }
    .nd-cell.nd-fits .nd-fit-badge { display: block; }
    /* cap hard-block hint on an impossible cell */
    .nd-capblock { display: none; position: absolute; right: -7px; top: -8px;
      color: ${PALETTE.bone}; font-size: 20px; pointer-events: none;
      text-shadow: 0 0 3px ${PALETTE.voidCharcoal};
    }
    .nd-cell.nd-capped .nd-capblock { display: block; }
    .nd-cap-label {
      font-size: 16px; letter-spacing: 0.08em; color: var(--cap, ${PALETTE.warmGrey});
      text-transform: uppercase;
    }
    /* §16 rejection: shake + block glyph */
    @keyframes nd-reject {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(-5px); } 35% { transform: translateX(5px); }
      55% { transform: translateX(-4px); } 75% { transform: translateX(3px); }
    }
    .nd-cell.nd-shake { animation: nd-reject 0.3s ease-out; }
    .nd-blockglyph {
      position: absolute; inset: 0; display: none;
      align-items: center; justify-content: center;
      font-size: 38px; color: ${PALETTE.bone};
      background: ${PALETTE.voidCharcoal}B3; border-radius: 8px;
      pointer-events: none;
    }
    .nd-cell.nd-blocked .nd-blockglyph { display: flex; }
    /* ----------------------------------------------------------------- foot */
    .nd-foot {
      border-top: 1px solid ${PALETTE.warmGrey}44; padding: 10px 20px 12px;
      background: ${PALETTE.voidCharcoal}80; min-height: 58px;
    }
    .nd-foot-title { font-size: 20px; font-weight: 800; }
    .nd-foot-title .nd-rar { font-weight: 700; font-size: 16px; letter-spacing: 0.1em;
      text-transform: uppercase; margin-left: 8px; }
    .nd-foot-line { font-size: 18px; color: ${PALETTE.bone}; margin-top: 3px; }
    .nd-foot-verdict { font-size: 17px; color: ${PALETTE.warmGrey}; margin-top: 3px; font-style: italic; }
    .nd-toast {
      position: absolute; left: 50%; top: 8%; transform: translateX(-50%);
      background: ${PALETTE.voidCharcoal}; color: ${PALETTE.bone};
      border: 1px solid ${PALETTE.warmGrey}88; border-radius: 8px;
      padding: 9px 18px; font-size: 19px; opacity: 0; pointer-events: none;
      transition: opacity 0.18s ease;
    }
    .nd-toast.nd-show { opacity: 1; }
  `;
  document.head.appendChild(style);

  // ------------------------------------------------------------------- dom --
  const rootEl = document.createElement('div');
  rootEl.id = 'socket-screen';
  rootEl.innerHTML = `
    <div class="nd-page">
      <div class="nd-head">
        <span class="nd-orn">◆ ◇</span>
        <span class="nd-title">SOCKETS</span>
        <span class="nd-orn">◇ ◆</span>
        <span class="nd-hint"><b>click</b> a bench node, then a slot · <b>B</b>/<b>Esc</b> close</span>
      </div>
      <div class="nd-lock"></div>
      <div class="nd-body">
        <div class="nd-sect">BENCH — unsocketed nodes</div>
        <div class="nd-bench"></div>
        <div class="nd-sect">SKILLS — slots in cast order</div>
        <div class="nd-rows"></div>
      </div>
      <div class="nd-foot"></div>
      <div class="nd-toast"></div>
    </div>`;
  document.body.appendChild(rootEl);

  // §17/A7 uniform virtual scaler: the card is AUTHORED at DESIGN_W x DESIGN_H
  // virtual px (every label >= the 16 px text floor, stat numerals at 20) and
  // scaled by min(1, fit) — the same grammar the HUD root uses, so type never
  // drops below its authored ratio and the panel always fits the window.
  const DESIGN_W = 1180;
  const DESIGN_H = 800;
  function fitScale() {
    const s = Math.min(
      1,
      (window.innerWidth - 24) / DESIGN_W,
      (window.innerHeight - 24) / DESIGN_H
    );
    rootEl.style.setProperty('--nd-s', s.toFixed(4));
    return s;
  }
  fitScale();
  window.addEventListener('resize', fitScale);
  const lockEl = rootEl.querySelector('.nd-lock');
  const benchEl = rootEl.querySelector('.nd-bench');
  const rowsEl = rootEl.querySelector('.nd-rows');
  const footEl = rootEl.querySelector('.nd-foot');
  const toastEl = rootEl.querySelector('.nd-toast');

  let open = false;
  let focusIdx = null; // bench index of the focused candidate
  const cellEls = new Map(); // `${skillId}:${slot}` -> cell element
  let toastTimer = null;

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove('nd-show');
    void toastEl.offsetWidth;
    toastEl.classList.add('nd-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('nd-show'), 1600);
  }

  const focusedNode = () => {
    const b = build();
    if (!b || focusIdx === null) return null;
    const bench = b.view().bench;
    return bench[focusIdx] ? bench[focusIdx].node : null;
  };

  // ---------------------------------------------------------------- render --
  const fmtStat = (label, base, res, unit = '') => {
    const changed = res !== null && res !== undefined && base !== res;
    const b = `${label} ${base}${unit}`;
    return changed ? `${b} → <span class="nd-mod">${res}${unit}</span>` : b;
  };

  function renderAll() {
    const sys = build();
    if (!sys) return;
    const view = sys.view();
    const candidate = focusedNode();

    lockEl.classList.toggle('nd-on', view.combatActive);
    lockEl.textContent = view.combatActive
      ? '⊘ combat is live — sockets open between rooms only'
      : '';

    // Bench.
    benchEl.innerHTML = '';
    if (view.bench.length === 0) {
      const d = document.createElement('div');
      d.className = 'nd-bench-empty';
      d.textContent = 'nothing on the bench — nodes arrive from drafts and the shop';
      benchEl.appendChild(d);
    }
    view.bench.forEach((rec, i) => {
      const info = sys.nodeInfo(rec.node);
      const card = document.createElement('div');
      card.className = `nd-card${info.rarity === 'legendary' ? ' nd-legendary' : ''}${i === focusIdx ? ' nd-focus' : ''}`;
      card.style.setProperty('--rar', RARITY_COLOR[info.rarity]);
      card.innerHTML = `
        <div class="nd-card-icon">${NODE_GLYPH[rec.node] ?? '?'}</div>
        <div>
          <div class="nd-card-name">${esc(info.name)}</div>
          <div class="nd-card-sub">${info.rarity} · ${info.kind} · ${esc(rec.provenance)}</div>
        </div>`;
      card.addEventListener('click', () => {
        focusIdx = focusIdx === i ? null : i;
        renderAll();
      });
      benchEl.appendChild(card);
    });

    // Skill rows.
    rowsEl.innerHTML = '';
    cellEls.clear();
    for (const sk of view.skills) {
      const row = document.createElement('div');
      row.className = 'nd-row';

      const stats = [];
      stats.push(fmtStat('power', sk.base.power, sk.resolved.power));
      if (sk.base.cd !== null) stats.push(fmtStat('cd', sk.base.cd, sk.resolved.cd, ' s'));
      if (sk.base.count !== null) stats.push(fmtStat('count', sk.base.count, sk.resolved.count));

      // §16 live preview: focused candidate × this skill — computed
      // contribution and reason, straight from the sim's preview(). A
      // candidate no slot on this row can legally take (§15.2 rarity cap /
      // repetition limit) never shows a live contribution: it reads as the
      // hard block it is, with the reason.
      let prevHtml = '';
      if (candidate) {
        const block = hardBlockReason(sys, sk, candidate);
        if (block) {
          prevHtml = `<div class="nd-prev"><span class="nd-warn">⊘</span> ${esc(block)}</div>`;
        } else {
          const p = sys.preview(sk.id, candidate);
          if (!p.error) {
            const cls = p.verdict.state === 'live' ? 'nd-live' : 'nd-warn';
            const mark = p.verdict.state === 'live' ? '◆' : p.verdict.state === 'inert' ? '＋0' : '⊘';
            prevHtml = `<div class="nd-prev"><span class="${cls}">${mark}</span> ${esc(p.lines.join(' — '))}</div>`;
          }
        }
      }

      // §15.5: a SOCKETED node that is grey or saturation-inert states its own
      // realized contribution in the row, so the amber stat delta above it can
      // never be read as a promise the node does not keep (a resolved
      // `count 4 → 5` against an ally pop of 4 realizes +0, and says so).
      let noteHtml = '';
      for (let slot = 0; slot < sk.sockets.length; slot++) {
        const rec = sk.sockets[slot];
        if (!rec || rec.verdict === 'live') continue;
        const info = sys.nodeInfo(rec.node);
        const p = sys.preview(sk.id, rec.node);
        const why = p && p.lines ? p.lines[0] : rec.verdict;
        const mark = rec.verdict === 'inert' ? '＋0' : '⊘';
        noteHtml += `<div class="nd-note"><span class="nd-warn">${mark}</span> ${esc(
          info ? info.name : rec.node
        )}: ${esc(why)}</div>`;
      }

      row.innerHTML = `
        <div>
          <div class="nd-skill-name">${esc(sk.name)}</div>
          <div class="nd-skill-sub">${sk.archetype} · ${SHAPE_LABEL[sk.shape] ?? sk.shape}</div>
        </div>
        <div class="nd-stats">${stats.join(' · ')}${noteHtml}${prevHtml}</div>
        <div class="nd-cells"></div>`;
      const cells = row.querySelector('.nd-cells');

      sk.sockets.forEach((rec, slot) => {
        const cap = sk.caps[slot];
        const wrap = document.createElement('div');
        wrap.className = 'nd-cellwrap';
        const cell = document.createElement('div');
        cell.className = 'nd-cell';
        cell.style.setProperty('--cap', RARITY_COLOR[cap]);

        let glyphChar = '·';
        let hollow = false;
        if (rec) {
          const info = sys.nodeInfo(rec.node);
          glyphChar = NODE_GLYPH[rec.node] ?? '?';
          cell.style.setProperty('--rar', RARITY_COLOR[info.rarity]);
          // §15.5 per-cell states on the SOCKETED node:
          if (rec.verdict === 'grey') {
            hollow = true;
            cell.classList.add('nd-grey'); // hollow icon + strike
          } else if (rec.verdict === 'inert') {
            hollow = true;
            cell.classList.add('nd-inert'); // hollow icon + "+0" — never the strike
          }
          cell.title = `${info.name} — click to unsocket`;
        } else {
          cell.classList.add('nd-vacant');
          if (candidate) {
            // Candidate preview on a vacant target cell.
            const v = sys.verdictFor(sk.id, candidate);
            const cinfo = sys.nodeInfo(candidate);
            // §15.2 hard blocks for THIS cell: rarity cap, or the repetition
            // limit counting the copies the other slots already hold. A cell
            // that would refuse never advertises a fit.
            const capBlocked = cinfo.rarityRank > sys.rarityRank(cap);
            const copiesElsewhere = sk.sockets.filter(
              (s, j) => j !== slot && s && s.node === candidate
            ).length;
            const blocked = capBlocked || copiesElsewhere + 1 > cinfo.limit;
            glyphChar = NODE_GLYPH[candidate] ?? '?';
            cell.style.setProperty('--rar', RARITY_COLOR[cinfo.rarity]);
            if (blocked) {
              cell.classList.add('nd-capped'); // ⊘ hint — clicking still tries + shakes
              hollow = true;
            } else if (v.state === 'grey') {
              hollow = true;
              cell.classList.add('nd-grey');
            } else if (v.state === 'inert') {
              hollow = true;
              cell.classList.add('nd-inert');
            } else {
              cell.classList.add('nd-fits');
            }
          }
        }
        cell.innerHTML = `
          <span class="nd-glyph${hollow ? ' nd-hollow' : ''}">${glyphChar}</span>
          <span class="nd-strike"></span>
          <span class="nd-inert-badge">+0</span>
          <span class="nd-fit-badge">◆</span>
          <span class="nd-capblock">⊘</span>
          <span class="nd-blockglyph">⊘</span>`;
        cell.addEventListener('click', () => onCellClick(sk.id, slot, !!rec));
        wrap.appendChild(cell);
        const capLabel = document.createElement('div');
        capLabel.className = 'nd-cap-label';
        capLabel.style.setProperty('--cap', RARITY_COLOR[cap]);
        capLabel.textContent = `${String.fromCharCode(65 + slot)} · ${cap} cap`;
        wrap.appendChild(capLabel);
        cells.appendChild(wrap);
        cellEls.set(`${sk.id}:${slot}`, cell);
      });
      rowsEl.appendChild(row);
    }

    // Foot: focused candidate summary + §15.5 kit verdict.
    if (candidate) {
      const info = sys.nodeInfo(candidate);
      const lines = [];
      if (candidate === 'siphon') lines.push(sys.siphonCardLine());
      footEl.innerHTML = `
        <div class="nd-foot-title" style="color:${RARITY_COLOR[info.rarity]}">
          ${NODE_GLYPH[candidate]} ${esc(info.name)}
          <span class="nd-rar">${info.rarity} · limit ${info.limit}/skill</span>
        </div>
        ${lines.map((l) => `<div class="nd-foot-line">“${esc(l)}”</div>`).join('')}
        <div class="nd-foot-verdict">${esc(sys.kitVerdict(candidate))}</div>`;
    } else {
      footEl.innerHTML = `<div class="nd-foot-verdict">focus a bench node to preview its fit — grey cells socket freely but contribute nothing</div>`;
    }
  }

  // ------------------------------------------------------------ interaction --
  function onCellClick(skillId, slot, filled) {
    const sys = build();
    if (!sys) return;
    const candidate = focusedNode();
    if (candidate) {
      const v = sys.verdictFor(skillId, candidate);
      const r = sys.socket(skillId, candidate, slot);
      if (r && !r.denied) {
        focusIdx = null;
        if (v.state === 'grey') toast('socketed — grey here: it contributes nothing on this skill');
        else if (v.state === 'inert') toast('socketed — +0 right now (target cap already saturated)');
        renderAll();
      }
      // Denied: the socket_denied listener below shakes the cell.
    } else if (filled) {
      const r = sys.unsocket(skillId, slot);
      if (r && !r.error && !r.denied) renderAll();
    }
  }

  function shakeCell(skillId, slot) {
    // slot may be null (auto-slot denial) — shake every cell of the skill row.
    const keys =
      slot === null || slot === undefined
        ? [...cellEls.keys()].filter((k) => k.startsWith(`${skillId}:`))
        : [`${skillId}:${slot}`];
    for (const k of keys) {
      const cell = cellEls.get(k);
      if (!cell) continue;
      cell.classList.remove('nd-shake', 'nd-blocked');
      void cell.offsetWidth;
      cell.classList.add('nd-shake', 'nd-blocked'); // §16: shake + block glyph
      setTimeout(() => cell.classList.remove('nd-blocked'), 650);
    }
  }

  function setOpen(next) {
    if (next === open) return { open };
    if (next) {
      const sys = build();
      const active = sys ? sys.view().combatActive : false;
      if (active) {
        // §3: B opens between rooms only.
        return { denied: 'combat_active' };
      }
      open = true;
      focusIdx = null;
      fitScale();
      rootEl.classList.add('nd-open');
      renderAll();
    } else {
      open = false;
      focusIdx = null; // Esc banks the candidate: it never left the bench
      rootEl.classList.remove('nd-open');
    }
    return { open };
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyB') {
      const r = setOpen(!open);
      if (r.denied) toast('⊘ sockets are for between rooms');
    } else if (e.code === 'Escape' && open) {
      setOpen(false);
    }
  });

  // Sim events keep the screen truthful even when cmd() drives the changes.
  bus.on('node_granted', () => open && renderAll());
  bus.on('node_socketed', (ev) => {
    if (!open) return;
    renderAll();
    if (ev.verdict === 'grey') toast('grey socket — contributes nothing on this skill');
  });
  bus.on('node_unsocketed', () => open && renderAll());
  // §16: a room starting flips combat_active — the workbench must never be the
  // thing holding the Healer still, so it closes itself the moment combat opens.
  bus.on('room_start', () => {
    if (open) setOpen(false);
  });
  bus.on('build_restored', () => open && renderAll());
  bus.on('skill_equip', () => open && renderAll());
  bus.on('socket_denied', (ev) => {
    if (!open) return;
    shakeCell(ev.skill, ev.slot);
    toast(`⊘ ${ev.reason === 'cap' ? 'rarity cap' : ev.reason === 'limit' ? 'repeat limit' : esc(ev.reason)} — refused`);
  });

  // __echoes.cmd bridge (main.js routes these two names here).
  function cmd(name) {
    if (name === 'openSocket') return setOpen(true);
    if (name === 'closeSocket') return setOpen(false);
    return null;
  }

  // @gnt:M2 RESTORE-RESYNC begin
  // @gnt:M2 RESTORE-RESYNC end
  // @gnt:M5b GUEST-GUARD begin
  // @gnt:M5b GUEST-GUARD end
  return { cmd, isOpen: () => open };
}
