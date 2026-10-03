// Save-slot management menu (docs/gauntlet/PLAN.md §1.3 'saves', §3.4, gate
// G2.3). Owner: M2. Registered by main.js @gnt:SAVE (registerSaveScreens).
//
// params: { mode: 'load' | 'save' }. From the title only Load exists; in a
// running game (the pause menu, INT) the header offers Save | Load tabs
// (Q / E, LB / RB). Layout: the slot list (left, scrolls) and the detail
// panel of the SELECTED slot (right): a 256 x 144 thumbnail, where / when /
// playtime / party HP / build, and the actions.
//   Load            (Enter / A on a row)   in-game loads ask first
//   Save / Overwrite (Enter / A in Save)   overwriting asks first
//   Rename          (F2 / Y)               a text dialog, 32 characters
//   Export          downloads the slot as echoes-<slot>-<date>.json
//   Delete          (Delete / X)           asks first (danger)
//   Restore backup  a damaged slot with a valid .bak offers it
//   Import…         (footer) a .json file into the first empty slot
// Damaged / newer-version slots stay listed with the reason and the actions
// that still make sense (restore the backup, export the raw file, delete).
// Palette: Void Charcoal plates, Parchment ink, Warm Grey chrome, Hearth
// Amber focus (the thumbnails are pictures of the game, like the backdrop).
import { service, registerScreen } from '../../app/registry.js';
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { createHints } from './hints.js';
import { createRecordsScreen } from './records.js';
import { transitWhere } from '../../save/describe.js';
import { iconEl } from '../hud/icons.js';
import { SKILLS } from '../../sim/skills.js';
import { SKILL_SLOTS, SOCKETS_PER_SKILL } from '../../core/constants.js';

const SAVE_ERRORS = {
  quota: 'Not enough browser storage — delete a slot or export saves to files.',
  unavailable: "This browser isn't letting Echoes store saves (private mode?). Export to a file instead.",
  not_allowed: "You can't save right now.",
  busy: 'Another save is still being written — try again in a moment.',
  missing: 'That slot is empty.',
  corrupt: 'That save file is damaged.',
  version: 'That save was made by a newer version of Echoes — this build cannot read it.',
  hash: 'That save failed its integrity check — it was changed or damaged.',
  full: 'Every save slot is in use — delete one first, or pick a slot to replace.',
};

const ROOM_LABEL = { kill_all: 'Hunt', defend: 'Defend', shop: 'Shop', boss: 'The Hollow Stag' };
const PHASE_LABEL = {
  reward: 'at the reward',
  path: 'choosing a path',
  shop: 'at the shop',
  victory: 'victory card',
  defeat: 'defeat card',
  fade: 'between rooms',
};
const CLASS_NAME = { healer: 'Healer', tank: 'Tank', swordsman: 'Swordsman', archer: 'Archer' };

// A player-facing reason for a damaged file (the raw detail stays in the
// debug API: __echoes.save.list()[i].detail).
export function friendlyDetail(m) {
  const d = String((m && m.detail) || '');
  if (m && m.error === 'hash') return "Its contents changed after it was saved (the checksum doesn't match).";
  if (/not valid JSON|empty file/.test(d)) return 'The file is cut short or garbled — the write may have been interrupted.';
  if (/schema missing/.test(d)) return "The file's version stamp is missing.";
  if (/required keys missing/.test(d)) return 'Parts of the game state are missing from the file.';
  if (/not an Echoes save/.test(d)) return "This isn't an Echoes save file.";
  if (/not plain data/.test(d)) return 'The file holds data Echoes cannot read.';
  return 'The file could not be read.';
}

// --------------------------------------------------------------- format --
export function fmtPlaytime(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${String(ss).padStart(2, '0')} s`;
  return `${ss} s`;
}
export function fmtAgo(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
export function fmtDate(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function whereLine(m) {
  const meta = (m && m.meta) || {};
  // CAMPAIGN (schema 3, PLAN §12.8): levels, and the level cards — a clear
  // card ("Level I cleared — next: Level II · …") or the setting-out card of a
  // Level-N start ("Setting out — Level II · …"), src/save/describe.js (r3 F2).
  const lv = meta.level ?? meta.act ?? null;
  const roman = lv ? ['', 'I', 'II', 'III', 'IV', 'V'][lv] ?? String(lv) : null;
  if (meta.mode === 'run' && meta.phase === 'transit') return transitWhere(meta) || `Level ${roman ?? 'I'} — between levels`;
  if (meta.mode === 'run' && meta.room) {
    const act = roman ? `Level ${roman} · ${meta.levelName || meta.actName || ''}`.replace(/ · $/, '') : meta.actName || `Act ${meta.act || 1}`;
    const kind = ROOM_LABEL[meta.roomMode] || '';
    const phase = PHASE_LABEL[meta.phase] ? ` — ${PHASE_LABEL[meta.phase]}` : '';
    return `${act} · Room ${meta.room} of 8${kind ? ` · ${kind}` : ''}${phase}`;
  }
  if (meta.phase === 'victory' || meta.phase === 'defeat') return `Camp — ${PHASE_LABEL[meta.phase]}`;
  if (meta.mode === 'run') return 'In the arena';
  return 'Camp — at the hearth';
}

// The four characters of a save, in seat order (gauntlet r5 SAVE5-F2): the
// schema-4 build lines (meta.builds — PLAN §16.6's "slot list's build lines":
// classId, skills [4 ids|null], filled, purse) joined with the party's HP
// (meta.party). A meta written before schema 4 (no builds) keeps what it
// has: the Healer's skills (meta.skills) and every character's HP.
export function partyLines(meta) {
  const m = meta || {};
  const hp = Array.isArray(m.party) ? m.party.filter(Boolean) : [];
  const builds = Array.isArray(m.builds) ? m.builds.filter(Boolean) : [];
  const n = Math.max(hp.length, builds.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = builds[i] ?? null;
    const classId = (b && b.classId) || (hp[i] && hp[i].classId) || null;
    const h = hp.find((p) => p.classId === classId) ?? hp[i] ?? null;
    let skills = null;
    if (b && Array.isArray(b.skills)) skills = b.skills.slice(0, SKILL_SLOTS);
    else if (classId === 'healer' && Array.isArray(m.skills)) skills = m.skills.slice(0, SKILL_SLOTS);
    if (skills) while (skills.length < SKILL_SLOTS) skills.push(null);
    const owned = skills ? skills.filter(Boolean).length : 0;
    out.push({
      classId,
      name: CLASS_NAME[classId] || classId || '—',
      hp: h && Number.isFinite(h.hp) ? h.hp : null,
      maxHp: h && Number.isFinite(h.maxHp) ? h.maxHp : null,
      skills,
      filled: b && Number.isFinite(b.filled) ? b.filled : null,
      sockets: owned * SOCKETS_PER_SKILL,
      purse: b && Number.isFinite(b.purse) ? b.purse : null,
    });
  }
  return out;
}
// fix-M2-r6 (SAVE6-F1): a skill this version doesn't have (a file from
// another version) is named as such — loading removes it (save/content.js).
const skillName = (id) =>
  (id && Object.prototype.hasOwnProperty.call(SKILLS, id) && SKILLS[id].name) || (id ? `${String(id).replace(/_/g, ' ')} (not in this version)` : 'empty slot');
// "Tank 150/150 HP · Taunting Roar, … · 32/32 nodes · 24 Glint" (row / panel labels).
export function partyLineText(p) {
  const bits = [p.name];
  if (p.hp !== null && p.maxHp) bits.push(`${Math.round(p.hp)}/${p.maxHp} HP`);
  if (p.skills) bits.push(p.skills.filter(Boolean).map(skillName).join(', ') || 'no skills');
  if (p.filled !== null) bits.push(`${p.filled}/${p.sockets} nodes`);
  if (p.purse !== null) bits.push(`${p.purse} Glint`);
  return bits.join(' · ');
}

// ---------------------------------------------------------------- style --
const CSS = `
.sv-screen .sv-panel {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(${px(1560)}, calc(100vw - 32px)); height: min(${px(900)}, calc(100vh - 32px));
  display: flex; flex-direction: column; padding: ${px(22)} ${px(30)} ${px(18)};
}
.sv-head { display: flex; align-items: center; gap: ${px(26)}; padding-bottom: ${px(12)}; border-bottom: 1px solid ${P.warmGrey}44; }
.sv-head .ap-h2 { white-space: nowrap; flex: 0 0 auto; }
.sv-head .sv-sub { font-size: ${px(22)}; color: ${P.warmGrey}; flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sv-body { flex: 1 1 auto; min-height: 0; display: flex; gap: ${px(24)}; padding-top: ${px(14)}; }
.sv-list {
  flex: 1 1 58%; min-width: 0; overflow-y: auto; overflow-x: hidden;
  display: flex; flex-direction: column; gap: ${px(10)}; padding: ${px(6)} ${px(14)} ${px(6)} ${px(6)};
  scrollbar-color: ${P.warmGrey}88 transparent;
}
.sv-sect { flex: 0 0 auto; margin: ${px(8)} 0 ${px(2)}; font-size: ${px(22)}; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: ${P.warmGrey}; }
.sv-row {
  display: grid; grid-template-columns: ${px(160)} minmax(0, 1fr) auto; align-items: center; gap: ${px(18)};
  flex: 0 0 auto; width: 100%; min-height: ${px(106)}; padding: ${px(8)} ${px(16)} ${px(8)} ${px(8)}; text-align: left;
  background: ${P.voidCharcoal}B3; border: max(2px, ${px(2)}) solid ${P.warmGrey}44; border-radius: ${px(14)};
  color: ${P.parchment}; font-family: inherit; cursor: pointer; position: relative;
  transition: transform 90ms ease, box-shadow 90ms ease, border-color 90ms ease, background 90ms ease;
}
.sv-row.sv-selected { border-color: ${P.warmGrey}AA; background: #2C2823; }
.sv-row.ap-focus {
  outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(2)};
  transform: translateY(${px(-1)}) scale(1.01); border-color: ${P.hearthAmber}AA;
  box-shadow: 0 ${px(8)} ${px(22)} #000000AA;
}
.sv-thumb {
  width: ${px(160)}; height: ${px(90)}; border-radius: ${px(8)}; overflow: hidden; flex: 0 0 auto;
  background: ${P.voidCharcoal}; border: 1px solid ${P.warmGrey}55;
  display: flex; align-items: center; justify-content: center; color: ${P.warmGrey}; font-size: ${px(30)};
}
.sv-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sv-thumb.sv-wait, .sv-big.sv-wait { font-size: ${px(22)}; letter-spacing: 0.06em; color: ${P.bone}; }
.sv-row.sv-saving { border-color: ${P.hearthAmber}88; }
.sv-row.sv-saving .sv-line:first-child { color: ${P.parchment}; }
.sv-row.sv-saving .sv-thumb, .sv-thumb.sv-wait, .sv-big.sv-wait { animation: sv-pulse 0.8s ease-in-out infinite alternate; }
@keyframes sv-pulse { from { opacity: 1; } to { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .sv-row.sv-saving .sv-thumb, .sv-thumb.sv-wait, .sv-big.sv-wait { animation: none; } }
.sv-txt { min-width: 0; display: flex; flex-direction: column; gap: ${px(2)}; }
.sv-name { font-size: ${px(26)}; font-weight: 800; letter-spacing: 0.03em; color: ${P.parchment}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sv-line { font-size: ${px(22)}; color: ${P.bone}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sv-dim { color: ${P.warmGrey}; }
.sv-tag {
  display: inline-block; margin-left: ${px(10)}; padding: 0 ${px(10)}; border-radius: 999px;
  font-size: ${px(22)}; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; vertical-align: middle;
  border: 1px solid ${P.warmGrey}88; color: ${P.bone};
}
.sv-tag.sv-bad { border-color: ${P.parchment}; color: ${P.parchment}; background: ${P.bruiseUmber}; }
.sv-side { display: flex; flex-direction: column; align-items: flex-end; gap: ${px(6)}; }
.sv-pips { display: flex; gap: ${px(5)}; }
.sv-pip { width: ${px(34)}; height: ${px(10)}; border-radius: 999px; background: ${P.bruiseUmber}; border: 1px solid ${P.warmGrey}66; overflow: hidden; }
.sv-pip > i { display: block; height: 100%; background: ${P.bone}; }
.sv-pip.sv-down { background: transparent; border-style: dashed; }
.sv-glint { font-size: ${px(22)}; color: ${P.paleGold}; font-weight: 700; font-variant-numeric: tabular-nums; }
/* The detail panel (gauntlet r5 SAVE5-F2): picture, name, then ONE scroll
   box (where / when / played / file + the four builds) and the actions. The
   picture is the flexible part — it takes the height the text leaves (up to
   16:9 of the panel width) and never pushes a line out of view; only when
   even its minimum leaves no room does the text box scroll (visible thin
   scrollbar, a chevron at the cut edge, wheel, right stick, and Up / Down on
   the panel's buttons). */
.sv-detail {
  flex: 0 0 38%; min-width: 0; display: flex; flex-direction: column; gap: ${px(10)};
  padding: ${px(18)} ${px(22)}; border-radius: ${px(14)}; background: ${P.voidCharcoal}; border: 1px solid ${P.warmGrey}44; overflow: hidden;
  container-type: inline-size;
}
.sv-big { width: 100%; flex: 1 1 0; min-height: ${px(120)}; max-height: min(calc(100cqw * 0.5625), 30vh); border-radius: ${px(10)}; overflow: hidden; background: #161411;
  border: 1px solid ${P.warmGrey}55; display: flex; align-items: center; justify-content: center; color: ${P.warmGrey}; font-size: ${px(24)}; }
.sv-big img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sv-dname { font-size: ${px(30)}; line-height: 1.3; padding-bottom: ${px(2)}; font-weight: 800; letter-spacing: 0.04em; color: ${P.parchment}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 0 auto; }
.sv-dscroll {
  flex: 0 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; gap: ${px(10)};
  scrollbar-width: thin; scrollbar-color: ${P.warmGrey}AA transparent; position: relative;
}
.sv-dscroll.sv-more-below::after {
  content: '▾'; position: sticky; bottom: 0; display: block; flex: 0 0 auto; pointer-events: none;
  height: ${px(34)}; margin-top: ${px(-34)}; line-height: ${px(40)}; text-align: center; font-size: ${px(24)}; color: ${P.bone};
  background: linear-gradient(180deg, ${P.voidCharcoal}00 0%, ${P.voidCharcoal}F2 75%);
}
.sv-dl { display: grid; grid-template-columns: minmax(${px(68)}, max-content) minmax(0, 1fr); align-content: start; gap: ${px(2)} ${px(14)}; margin: 0; font-size: ${px(22)}; line-height: 1.35; flex: 0 0 auto; }
.sv-dl dt { color: ${P.warmGrey}; margin: 0; white-space: nowrap; }
.sv-dl dd { color: ${P.bone}; margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-dl dd.sv-wrap { white-space: normal; overflow: visible; overflow-wrap: anywhere; }
/* Rows size to their (wrapped) content: an overflow:hidden grid item has a
   zero automatic minimum, so in a short panel the auto rows used to shrink to
   one line and clip the second line of Where / Party / Skills (r3). */
.sv-dl { grid-auto-rows: max-content; }
/* The four builds (PLAN §16.6 meta.builds, BUILD_BRIEF §25.6): one line per
   character — class, HP, the four skills as the HUD's own icons (names on
   hover and for screen readers), nodes socketed / sockets, purse. */
.sv-party { width: 100%; border-collapse: collapse; font-size: ${px(22)}; line-height: 1.3; flex: 0 0 auto; }
.sv-party th, .sv-party td { padding: ${px(2)} 0; white-space: nowrap; text-align: left; font-weight: 400; vertical-align: middle; }
.sv-party th + th, .sv-party th + td, .sv-party td + td { padding-left: ${px(12)}; }
.sv-party thead th { color: ${P.warmGrey}; }
.sv-party tbody th { color: ${P.parchment}; font-weight: 800; }
.sv-party .sv-num { text-align: right; font-variant-numeric: tabular-nums; color: ${P.bone}; }
.sv-party .sv-gl { color: ${P.paleGold}; font-weight: 700; }
.sv-party .sv-skc { text-align: center; }
.sv-party tr.sv-down td.sv-hp { color: ${P.warmGrey}; }
.sv-sks { display: inline-flex; gap: ${px(4)}; vertical-align: middle; }
.sv-sk { width: ${px(30)}; height: ${px(30)}; border-radius: ${px(6)}; border: 1px solid ${P.warmGrey}66; background: #161411; color: ${P.bone};
  display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
.sv-sk svg { width: ${px(24)}; height: ${px(24)}; display: block; }
.sv-sk.sv-none { border-style: dashed; background: transparent; }
.sv-msg { font-size: ${px(22)}; color: ${P.parchment}; line-height: 1.4; white-space: pre-line; overflow-y: auto; min-height: 0; flex: 0 1 auto; }
.sv-acts { display: flex; flex-wrap: wrap; gap: ${px(8)}; margin-top: auto; flex: 0 0 auto; padding-top: ${px(4)}; }
.sv-acts .ap-btn { min-width: ${px(96)}; padding: 0 ${px(14)}; font-size: ${px(22)}; letter-spacing: 0.04em; }
.sv-empty { margin: auto; text-align: center; font-size: ${px(24)}; color: ${P.bone}; line-height: 1.5; max-width: ${px(620)}; }
.sv-foot { display: flex; align-items: center; gap: ${px(16)}; padding-top: ${px(12)}; border-top: 1px solid ${P.warmGrey}44; margin-top: ${px(10)}; }
.sv-foot .ap-hints { flex: 1 1 auto; min-width: 0; }
.sv-modes { display: flex; gap: ${px(8)}; }
.sv-usage { font-size: ${px(22)}; color: ${P.warmGrey}; white-space: nowrap; }
.sv-rename .ap-dlg input {
  width: 100%; min-height: ${px(56)}; padding: 0 ${px(16)}; font-family: inherit; font-size: ${px(26)};
  color: ${P.parchment}; background: #161411; border: max(2px, ${px(2)}) solid ${P.warmGrey}88; border-radius: ${px(10)};
}
.sv-rename .ap-dlg input.ap-focus { outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(2)}; border-color: ${P.hearthAmber}AA; }
.sv-rename .sv-count { font-size: ${px(22)}; color: ${P.warmGrey}; text-align: right; }
@media (max-width: 1180px) {
  .sv-detail { flex-basis: 42%; padding: ${px(14)} ${px(16)}; }
  .sv-row { grid-template-columns: ${px(128)} minmax(0, 1fr) auto; min-height: ${px(92)}; }
  .sv-thumb { width: ${px(128)}; height: ${px(72)}; }
  .sv-side .sv-pips { display: none; }
  .sv-head .sv-sub { display: none; }
}
@media (max-height: 640px) {
  .sv-big { display: none; }
}
@media (max-height: 700px) {
  .sv-dl, .sv-party { font-size: ${px(22)}; line-height: 1.25; }
  .sv-big { max-height: 22vh; }
  .sv-dscroll { gap: ${px(8)}; }
}
@media (max-width: 1180px) {
  .sv-party th + th, .sv-party th + td, .sv-party td + td { padding-left: ${px(7)}; }
  .sv-sks { gap: ${px(2)}; }
  .sv-sk { width: ${px(27)}; height: ${px(27)}; }
  .sv-sk svg { width: ${px(21)}; height: ${px(21)}; }
  /* Overwrite · Rename · Export · Delete stay on one line (a wrapped second
     button row pushed the File line out of a 1024x576 panel). */
  .sv-acts { gap: ${px(6)}; }
  .sv-acts .ap-btn { min-width: ${px(84)}; padding: 0 ${px(10)}; }
}
`;
let styled = false;
function installSaveStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.id = 'sv-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// The party table of the detail panel: Party | HP | Skills | Nodes | Glint.
function partyTable(lines) {
  const t = document.createElement('table');
  t.className = 'sv-party';
  t.setAttribute('aria-label', 'Party builds');
  const head = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const [label, num] of [
    ['Party', false],
    ['HP', true],
    ['Skills', 'sv-skc'],
    ['Nodes', true],
    ['Glint', true],
  ]) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    if (num) th.className = num === true ? 'sv-num' : num;
    hr.appendChild(th);
  }
  head.appendChild(hr);
  t.appendChild(head);
  const body = document.createElement('tbody');
  for (const p of lines) {
    const tr = document.createElement('tr');
    tr.dataset.cls = p.classId || '';
    if (p.hp !== null && p.hp <= 0) tr.className = 'sv-down';
    tr.title = partyLineText(p);
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = p.name;
    const hp = document.createElement('td');
    hp.className = 'sv-num sv-hp';
    hp.textContent = p.hp !== null && p.maxHp ? `${Math.round(p.hp)}/${p.maxHp}` : '—';
    const sk = document.createElement('td');
    sk.className = 'sv-skc';
    if (p.skills) {
      const wrap = document.createElement('span');
      wrap.className = 'sv-sks';
      wrap.setAttribute('role', 'img');
      wrap.setAttribute('aria-label', p.skills.filter(Boolean).map(skillName).join(', ') || 'no skills');
      for (const id of p.skills) {
        const s = document.createElement('span');
        s.className = id ? 'sv-sk' : 'sv-sk sv-none';
        s.title = skillName(id);
        if (id) {
          s.dataset.skill = id;
          s.appendChild(iconEl(id, { size: 24 }));
        }
        wrap.appendChild(s);
      }
      sk.appendChild(wrap);
    } else sk.textContent = '—';
    const nodes = document.createElement('td');
    nodes.className = 'sv-num';
    nodes.textContent = p.filled !== null ? `${p.filled}/${p.sockets}` : '—';
    const gl = document.createElement('td');
    gl.className = 'sv-num sv-gl';
    gl.textContent = p.purse !== null ? `◉ ${p.purse}` : '—';
    tr.append(th, hp, sk, nodes, gl);
    body.appendChild(tr);
  }
  t.appendChild(body);
  return t;
}

// The cut-edge chevron of a scroll box that has more below its fold.
function moreMarks(box) {
  if (!box || !box.isConnected) return;
  const below = box.scrollHeight - box.clientHeight - box.scrollTop > 2;
  box.classList.toggle('sv-more-below', below);
}

function mkBtn(label, id, cls, onPress) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `ap-btn ${cls || ''}`.trim();
  b.id = id;
  b.textContent = label;
  b.setAttribute('data-nav', '');
  b.addEventListener('click', () => {
    if (!b.disabled) onPress();
  });
  return b;
}

// ------------------------------------------------------------ the screen --
export function createSavesScreen(ctx) {
  installSaveStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'sv-screen';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="sv-panel ap-plate">
      <div class="sv-head">
        <h2 class="ap-h2 sv-title">Load Game</h2>
        <div class="sv-modes"></div>
        <div class="sv-sub"></div>
        <div class="sv-usage"></div>
      </div>
      <div class="sv-body">
        <div class="sv-list" role="listbox"></div>
        <aside class="sv-detail" aria-live="polite"></aside>
      </div>
      <div class="sv-foot"></div>
    </div>`;
  const titleEl = el.querySelector('.sv-title');
  const modesEl = el.querySelector('.sv-modes');
  const subEl = el.querySelector('.sv-sub');
  const usageEl = el.querySelector('.sv-usage');
  const listEl = el.querySelector('.sv-list');
  const detailEl = el.querySelector('.sv-detail');
  const footEl = el.querySelector('.sv-foot');
  const hints = createHints(app, [
    ['move', 'Select'],
    ['confirm', 'Choose'],
    ['secondary', 'Delete'],
    ['back', 'Back'],
  ]);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  fileInput.id = 'sv-import-file';
  el.appendChild(fileInput);
  const importBtn = mkBtn('Import…', 'sv-import', '', () => fileInput.click());
  const backBtn = mkBtn('Back', 'sv-back', 'ap-primary', () => close());
  footEl.append(hints.el, importBtn, backBtn);

  let mode = 'load';
  let open = false;
  let selectedId = null;
  let busy = false;
  let queued = null; // the last press made while busy — replayed when it ends (r3 F3)
  let savingId = null; // the slot a save is being written to (row shows "Saving…")
  let offThumb = null;
  let offSlots = null;
  const rowEls = new Map(); // slot id -> row button

  const save = () => service('save');
  const inGame = () => app.state === 'playing';

  // ---------------------------------------------------- mouse hover intent --
  // (gauntlet r3, F1) Keyboard / gamepad focus selects a row at once (the
  // detail panel follows). A mouse HOVER moves the focus ring at once (PLAN
  // §3.3 "hover focuses"), but the detail panel — whose Load / Rename /
  // Export / Delete act on the slot it shows — only follows a row the pointer
  // RESTS on (moved < HOVER_REST_PX over HOVER_REST_MS). A pointer travelling
  // from the row the player chose to a panel button crosses other rows without
  // retargeting the panel; leaving the list hands the ring back to the
  // selected row, so ring and panel never disagree. A click on a row still
  // acts on exactly that row.
  // Pointer events arrive frame-aligned and in bursts (gaps of 60-125 ms were
  // measured on a steady path), so a rest must clearly outlast that; and a
  // pointer whose last motion was heading INTO the detail panel (the ray of
  // its motion meets the panel — "menu aim", as in cascading menus) is on its
  // way to a panel button: a pause there must be longer still before the
  // panel changes under it.
  const HOVER_REST_MS = 180;
  const HOVER_REST_AIM_MS = 450;
  const HOVER_REST_PX = 6;
  const trail = []; // pointer samples over the list: { t, x, y }
  let overSlot = null; // the row under the pointer (pointermove target)
  let hoverCand = null; // { id, since, panel: DOMRect } — hovered, not yet selected
  let hoverRaf = 0;
  function cancelHover() {
    hoverCand = null;
    if (hoverRaf) cancelAnimationFrame(hoverRaf);
    hoverRaf = 0;
  }
  // Still (moved < HOVER_REST_PX) for the last `ms`?
  function pointerRested(now, ms) {
    if (trail.length === 0) return true;
    const from = now - ms;
    let ref = null; // where the pointer was `ms` ago
    for (let i = trail.length - 1; i >= 0; i--) {
      if (trail[i].t <= from) {
        ref = trail[i];
        break;
      }
    }
    if (!ref) return false; // not on the list long enough to judge
    for (let i = trail.length - 1; i >= 0 && trail[i].t > from; i--) {
      if (Math.hypot(trail[i].x - ref.x, trail[i].y - ref.y) >= HOVER_REST_PX) return false;
    }
    return true;
  }
  // Was the pointer's last motion (its final ~150 ms of movement) aimed into
  // the detail panel?
  function aimedAtPanel(panel) {
    if (!panel || trail.length < 2) return false;
    const last = trail[trail.length - 1];
    let prev = null;
    for (let i = trail.length - 2; i >= 0; i--) {
      prev = trail[i];
      if (last.t - trail[i].t >= 150) break;
    }
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    if (Math.hypot(dx, dy) < 8 || dx <= 0 || last.x >= panel.left) return false;
    const y = last.y + (dy * (panel.left - last.x)) / dx; // where the ray crosses the panel's edge
    return y >= panel.top - 24 && y <= panel.bottom + 24;
  }
  function hoverTick() {
    hoverRaf = 0;
    if (!hoverCand || !open) return cancelHover();
    const row = rowEls.get(hoverCand.id);
    if (!row || !row.isConnected || document.activeElement !== row || overSlot !== hoverCand.id) return cancelHover();
    const now = performance.now();
    const need = aimedAtPanel(hoverCand.panel) ? HOVER_REST_AIM_MS : HOVER_REST_MS;
    if (now - hoverCand.since >= need && pointerRested(now, need)) {
      const id = hoverCand.id;
      cancelHover();
      select(id);
      return;
    }
    hoverRaf = requestAnimationFrame(hoverTick);
  }
  function armHover(id) {
    if (id === selectedId) return cancelHover();
    if (hoverCand && hoverCand.id === id) return;
    let panel = null;
    try {
      panel = detailEl.getBoundingClientRect(); // once per candidate (a static layout while open)
    } catch {
      panel = null;
    }
    hoverCand = { id, since: performance.now(), panel };
    if (!hoverRaf) hoverRaf = requestAnimationFrame(hoverTick);
  }
  // Runs before the #app-ui root's hover-focus listener (bubble order), so a
  // sample is recorded before the focus change that arms the candidate.
  listEl.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      const t = performance.now();
      trail.push({ t, x: e.clientX, y: e.clientY });
      while (trail.length > 2 && trail[1].t < t - 1000) trail.shift();
      const r = e.target && e.target.closest ? e.target.closest('[data-slot]') : null;
      overSlot = r ? r.dataset.slot : null;
    },
    { passive: true }
  );
  listEl.addEventListener('pointerleave', () => {
    overSlot = null;
    trail.length = 0;
    const pending = hoverCand;
    cancelHover();
    // The pointer left the list from a row it only crossed: the ring goes
    // back to the selected row (the one the panel shows). If it is heading to
    // a panel button, that button's own hover takes the ring right after.
    const a = document.activeElement;
    if (pending && a && a.dataset && a.dataset.slot === pending.id && selectedId && a.dataset.slot !== selectedId) {
      const r = rowEls.get(selectedId);
      if (r && open && manager.top() === 'saves') manager.focusElement(r, 'api');
    }
  });

  function close() {
    if (manager.top() === 'saves') manager.pop();
  }

  function entries() {
    const s = save();
    if (!s) return [];
    const all = s.list();
    const byId = new Map(all.map((m) => [m.id, m]));
    if (mode === 'save') return s.manualSlots().map((id) => byId.get(id) ?? { id, empty: true, name: defaultName(id) });
    // Load: the automatic saves (autosaves + the quicksave) first, then the
    // player's own slots — each group newest first (list() is newest first).
    return [...all.filter((m) => m.kind !== 'manual'), ...all.filter((m) => m.kind === 'manual')];
  }
  function defaultName(id) {
    const n = Number(String(id).split('-')[1]);
    return Number.isFinite(n) ? `Slot ${n}` : id;
  }

  function thumbEl(id, big = false) {
    const box = document.createElement('div');
    box.className = big ? 'sv-big' : 'sv-thumb';
    const s = save();
    const url = s && id ? s.thumb(id) : null;
    if (url && url.startsWith('data:image/')) {
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = url;
      box.appendChild(img);
    } else if (s && id && typeof s.thumbPending === 'function' && s.thumbPending(id)) {
      // The save is written; its picture is still being encoded (r3 F3) —
      // swapped in by the onThumb listener when it lands.
      box.classList.add('sv-wait');
      box.textContent = big ? 'Picture on its way…' : '…';
    } else box.textContent = big ? 'No picture' : '◇';
    box.dataset.thumbFor = id || '';
    return box;
  }

  function pips(meta) {
    const wrap = document.createElement('div');
    wrap.className = 'sv-pips';
    for (const m of (meta && meta.party) || []) {
      const p = document.createElement('div');
      const frac = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
      p.className = frac <= 0 ? 'sv-pip sv-down' : 'sv-pip';
      p.title = `${CLASS_NAME[m.classId] || m.classId} ${Math.round(m.hp)} / ${m.maxHp}`;
      const i = document.createElement('i');
      i.style.width = `${Math.round(frac * 100)}%`;
      p.appendChild(i);
      wrap.appendChild(p);
    }
    return wrap;
  }

  function tag(text, bad = false) {
    const t = document.createElement('span');
    t.className = bad ? 'sv-tag sv-bad' : 'sv-tag';
    t.textContent = text;
    return t;
  }

  function rowFor(m) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sv-row';
    b.id = `sv-slot-${m.id}`;
    b.dataset.slot = m.id;
    b.setAttribute('data-nav', '');
    b.setAttribute('role', 'option');
    b.appendChild(thumbEl(m.empty ? null : m.id));
    const txt = document.createElement('div');
    txt.className = 'sv-txt';
    const name = document.createElement('div');
    name.className = 'sv-name';
    name.textContent = m.empty ? `${m.name} — empty` : m.name;
    if (m.kind === 'auto') name.appendChild(tag('Auto'));
    if (m.kind === 'quick') name.appendChild(tag('Quick'));
    if (m.status === 'damaged') name.appendChild(tag('Damaged', true));
    if (m.status === 'newer') name.appendChild(tag('Newer version', true));
    txt.appendChild(name);
    const l1 = document.createElement('div');
    l1.className = 'sv-line';
    const l2 = document.createElement('div');
    l2.className = 'sv-line sv-dim';
    if (m.empty) {
      l1.textContent = mode === 'save' ? 'Save your game here' : '';
      l2.textContent = '';
    } else if (m.status !== 'ok') {
      l1.textContent = m.status === 'newer' ? 'Made by a newer version of Echoes' : 'This file could not be read';
      l2.textContent = m.backup ? `Backup from ${fmtDate(m.backup.savedAt)} available` : m.savedAt ? fmtDate(m.savedAt) : '';
    } else {
      l1.textContent = whereLine(m);
      l2.textContent = `${fmtDate(m.savedAt)} · ${fmtAgo(m.savedAt)} · Playtime ${fmtPlaytime(m.meta.playtimeSec)}`;
    }
    txt.append(l1, l2);
    b.appendChild(txt);
    const side = document.createElement('div');
    side.className = 'sv-side';
    if (!m.empty && m.status === 'ok') {
      side.appendChild(pips(m.meta));
      const g = document.createElement('div');
      g.className = 'sv-glint';
      g.textContent = m.meta.mode === 'run' ? `◉ ${m.meta.wallet ?? 0}` : '';
      side.appendChild(g);
    }
    b.appendChild(side);
    if (savingId === m.id) {
      b.classList.add('sv-saving');
      b.setAttribute('aria-busy', 'true');
      l1.textContent = 'Saving…';
    }
    const party = !m.empty && m.status === 'ok' ? partyLines(m.meta).map(partyLineText).join('. ') : '';
    b.setAttribute('aria-label', `${name.textContent}. ${l1.textContent}. ${l2.textContent}${party ? `. ${party}` : ''}`);
    b.addEventListener('click', () => primary(m.id));
    return b;
  }

  function current() {
    return entries().find((m) => m.id === selectedId) ?? null;
  }

  function renderDetail() {
    detailEl.textContent = '';
    const m = current();
    if (!m) {
      const e = document.createElement('div');
      e.className = 'sv-msg sv-dim';
      e.textContent = mode === 'save' ? 'Pick a slot to save into.' : 'Pick a save to see it here.';
      detailEl.appendChild(e);
      return;
    }
    detailEl.appendChild(thumbEl(m.empty ? null : m.id, true));
    const nm = document.createElement('div');
    nm.className = 'sv-dname';
    nm.textContent = m.empty ? `${m.name} — empty` : m.name;
    detailEl.appendChild(nm);
    if (m.empty) {
      const t = document.createElement('div');
      t.className = 'sv-msg';
      t.textContent = 'An empty slot. Saving here keeps your current camp or run exactly as it is now.';
      detailEl.appendChild(t);
    } else if (m.status !== 'ok') {
      const t = document.createElement('div');
      t.className = 'sv-msg';
      const why = m.status === 'newer' ? SAVE_ERRORS.version : `${SAVE_ERRORS[m.error] || SAVE_ERRORS.corrupt}\n${friendlyDetail(m)}`;
      t.textContent = m.backup
        ? `${why}\n\nA backup from ${fmtDate(m.backup.savedAt)} (${whereLine(m.backup)}) is intact.`
        : `${why}\n\nExport the raw file to keep it, or delete the slot.`;
      detailEl.appendChild(t);
    } else {
      const meta = m.meta || {};
      const box = document.createElement('div');
      box.className = 'sv-dscroll';
      const dl = document.createElement('dl');
      dl.className = 'sv-dl';
      const add = (k, v, wrap = false) => {
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        if (wrap) dd.className = 'sv-wrap';
        dl.append(dt, dd);
      };
      add('Where', whereLine(m), true);
      add('Saved', `${fmtDate(m.savedAt)} · ${fmtAgo(m.savedAt)}`);
      const ch = meta.challenge ? meta.challenge[0].toUpperCase() + meta.challenge.slice(1) : 'Standard';
      add('Played', `${fmtPlaytime(meta.playtimeSec)} · ${ch} challenge`);
      box.appendChild(dl);
      const lines = partyLines(meta);
      if (lines.length) box.appendChild(partyTable(lines));
      const dl2 = document.createElement('dl');
      dl2.className = 'sv-dl';
      const dt = document.createElement('dt');
      dt.textContent = 'File';
      const dd = document.createElement('dd');
      dd.textContent = `${Math.max(1, Math.round((m.bytes || 0) / 1024))} KB · v${m.game || '?'}${meta.network ? ' · online (host)' : ''}`;
      dl2.append(dt, dd);
      box.appendChild(dl2);
      detailEl.appendChild(box);
      box.addEventListener('scroll', () => moreMarks(box), { passive: true });
    }
    const acts = document.createElement('div');
    acts.className = 'sv-acts';
    const can = save() ? save().canSave() : { ok: false };
    if (mode === 'save') {
      const b = mkBtn(savingId === m.id ? 'Saving…' : m.empty ? 'Save here' : 'Overwrite', 'sv-act-save', 'ap-primary', () => primary(m.id));
      if (!can.ok) {
        b.disabled = true;
        b.title = can.reason || '';
      }
      acts.appendChild(b);
    } else if (!m.empty && m.status === 'ok') {
      acts.appendChild(mkBtn('Load', 'sv-act-load', 'ap-primary', () => primary(m.id)));
    }
    if (!m.empty && m.status !== 'ok' && m.backup) acts.appendChild(mkBtn('Restore backup', 'sv-act-restore', 'ap-primary', () => restoreBackup(m.id)));
    if (!m.empty && m.status === 'ok') acts.appendChild(mkBtn('Rename', 'sv-act-rename', '', () => rename(m.id)));
    if (!m.empty) acts.appendChild(mkBtn('Export', 'sv-act-export', '', () => exportSlot(m.id)));
    if (!m.empty) acts.appendChild(mkBtn('Delete', 'sv-act-delete', 'ap-danger', () => remove(m.id)));
    detailEl.appendChild(acts);
    if (mode === 'save' && !can.ok && can.reason) {
      const n = document.createElement('div');
      n.className = 'sv-msg sv-dim';
      n.textContent = can.reason;
      detailEl.appendChild(n);
    }
    moreMarks(detailEl.querySelector('.sv-dscroll'));
  }

  function renderHead() {
    titleEl.textContent = mode === 'save' ? 'Save Game' : 'Load Game';
    el.setAttribute('aria-label', titleEl.textContent);
    modesEl.textContent = '';
    if (inGame()) {
      for (const [m, label] of [
        ['save', 'Save'],
        ['load', 'Load'],
      ]) {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = mode === m ? 'ap-tab ap-active' : 'ap-tab';
        t.id = `sv-mode-${m}`;
        t.textContent = label;
        t.setAttribute('data-nav', '');
        t.addEventListener('click', () => setMode(m));
        modesEl.appendChild(t);
      }
    }
    const s = save();
    const n = s ? s.list().length : 0;
    subEl.textContent =
      mode === 'save'
        ? 'Choose a slot — autosaves and the quicksave (F5) are kept separately'
        : n
          ? `${n} save${n === 1 ? '' : 's'} · newest first`
          : '';
    if (s) {
      try {
        const u = s.debug.usage();
        usageEl.textContent = u.backend === 'memory' ? "Saves last for this visit only (browser storage is off)" : `Browser storage ${Math.max(1, Math.round(u.total / 1024))} KB used`;
      } catch {
        usageEl.textContent = '';
      }
    }
  }

  function render({ keepFocus = true } = {}) {
    const focusedSlot = keepFocus && document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.slot : null;
    renderHead();
    listEl.textContent = '';
    rowEls.clear();
    const list = entries();
    if (list.length === 0) {
      const e = document.createElement('div');
      e.className = 'sv-empty';
      e.textContent =
        mode === 'save'
          ? 'Saving is not available right now.'
          : 'No saved games yet.\nYour game autosaves at every room and at the camp — or import a save file.';
      listEl.appendChild(e);
      selectedId = null;
    } else {
      let lastSect = null;
      for (const m of list) {
        const sect = mode === 'load' ? (m.kind === 'manual' ? 'Your saves' : 'Autosaves & quicksave') : null;
        if (sect && sect !== lastSect && list.some((x) => x.kind !== 'manual') && list.some((x) => x.kind === 'manual')) {
          const h = document.createElement('div');
          h.className = 'sv-sect';
          h.textContent = sect;
          listEl.appendChild(h);
          lastSect = sect;
        }
        const r = rowFor(m);
        rowEls.set(m.id, r);
        listEl.appendChild(r);
      }
      if (!selectedId || !rowEls.has(selectedId)) {
        // Load: the default is the NEWEST save — the one Continue resumes —
        // even though the autosave group is pinned above the player's slots
        // and may list an older entry first (gauntlet r1, J3 / I1b).
        const s = save();
        const newest = mode === 'load' && s && typeof s.latest === 'function' ? s.latest() : null;
        selectedId = newest && rowEls.has(newest.id) ? newest.id : list[0].id;
      }
      for (const [id, r] of rowEls) {
        r.classList.toggle('sv-selected', id === selectedId);
        if (id === selectedId) r.setAttribute('data-nav-default', '');
      }
    }
    renderDetail();
    if (open && manager.top() === 'saves') {
      const want = rowEls.get(focusedSlot || selectedId);
      if (want) manager.focusElement(want, 'api');
      else manager.refocus();
    }
  }

  function select(id) {
    if (id === selectedId || !rowEls.has(id)) return;
    selectedId = id;
    for (const [sid, r] of rowEls) {
      r.classList.toggle('sv-selected', sid === id);
      if (sid === id) r.setAttribute('data-nav-default', '');
      else r.removeAttribute('data-nav-default');
    }
    renderDetail();
  }

  function setMode(m) {
    if (m === mode || (m === 'save' && !inGame())) return;
    mode = m;
    selectedId = null;
    render({ keepFocus: false });
  }

  function toast(text, tone = 'info') {
    app.toast(text, { tone, ms: tone === 'error' ? 4600 : tone === 'warn' ? 5200 : 2600 });
  }

  // One operation at a time (a save, a confirm, a load). A press that lands
  // while one runs is not dropped: the LAST such press is replayed when it
  // ends, re-resolved against the slots as they are then (a second Enter on
  // a slot that was just saved opens the overwrite confirm) — r3 F3.
  async function guarded(fn) {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } finally {
      busy = false;
      const q = queued;
      queued = null;
      if (q && open && manager.top() === 'saves') q();
    }
  }
  function whenFree(intent) {
    if (!busy) return false;
    queued = intent;
    return true;
  }

  function refreshThumb(id) {
    if (!open) return;
    const r = rowEls.get(id);
    const old = r && r.querySelector('.sv-thumb');
    if (old) old.replaceWith(thumbEl(id));
    if (id === selectedId) {
      const big = detailEl.querySelector('.sv-big');
      if (big) big.replaceWith(thumbEl(id, true));
    }
  }

  // Immediate feedback for a save in flight (the next frame shows it).
  function showSaving(id) {
    savingId = id;
    const r = rowEls.get(id);
    if (r) {
      r.classList.add('sv-saving');
      r.setAttribute('aria-busy', 'true');
      const l1 = r.querySelector('.sv-line');
      if (l1) l1.textContent = 'Saving…';
    }
    const b = detailEl.querySelector('#sv-act-save');
    if (b) {
      b.textContent = 'Saving…';
      b.setAttribute('aria-disabled', 'true');
    }
  }

  function primary(id) {
    if (whenFree(() => primary(id))) return;
    select(id);
    const m = current();
    if (!m) return;
    if (mode === 'save') return doSave(m);
    if (m.empty) return;
    if (m.status !== 'ok') {
      if (m.backup) return restoreBackup(m.id);
      toast(m.status === 'newer' ? SAVE_ERRORS.version : SAVE_ERRORS[m.error] || SAVE_ERRORS.corrupt, 'warn');
      return;
    }
    return doLoad(m);
  }

  function doSave(m) {
    return guarded(async () => {
      const s = save();
      if (!s) return;
      const can = s.canSave();
      if (!can.ok) {
        toast(can.reason || SAVE_ERRORS.not_allowed, 'warn');
        return;
      }
      if (!m.empty) {
        const ok = await app.confirm({
          title: `Overwrite “${m.name}”?`,
          body: m.status === 'ok' ? `The save from ${fmtDate(m.savedAt)} (${whereLine(m)}) will be replaced.` : 'The damaged file in this slot will be replaced.',
          confirmLabel: 'Overwrite',
          cancelLabel: 'Cancel',
          danger: true,
          defaultFocus: 'cancel',
        });
        if (!ok) return;
      }
      showSaving(m.id);
      let r;
      try {
        r = await s.save(m.id, { name: m.empty ? undefined : m.name });
      } finally {
        savingId = null;
      }
      if (r.ok) {
        toast(`Saved to “${r.meta.name}”`, 'good');
        selectedId = m.id;
        render();
      } else {
        render();
        toast(r.reason || SAVE_ERRORS[r.error] || "Couldn't save", r.error === 'quota' ? 'error' : 'warn');
      }
    });
  }

  function doLoad(m) {
    return guarded(async () => {
      if (inGame()) {
        const ok = await app.confirm({
          title: `Load “${m.name}”?`,
          body: 'Anything since your last save will be lost.',
          confirmLabel: 'Load',
          cancelLabel: 'Cancel',
          danger: false,
          defaultFocus: 'confirm',
        });
        if (!ok) return;
      }
      const r = typeof app.loadSlot === 'function' ? await app.loadSlot(m.id) : await save().load(m.id);
      if (r && r.ok) return; // app.loadSlot entered play (the stack is cleared)
      render();
      const why = SAVE_ERRORS[r && r.error] || SAVE_ERRORS.corrupt;
      if (r && r.backup) {
        const ok = await app.confirm({
          title: 'This save could not be loaded',
          body: `${why}\nRestore the backup from ${fmtDate(r.backup.savedAt)}?`,
          confirmLabel: 'Restore backup',
          cancelLabel: 'Not now',
          defaultFocus: 'confirm',
        });
        if (ok) await restoreBackupNow(m.id);
      } else toast(r && r.reason ? r.reason : why, 'error');
    });
  }

  async function restoreBackupNow(id) {
    const r = save().restoreBackup(id);
    if (r.ok) toast('Backup restored — the slot is loadable again', 'good');
    else toast(SAVE_ERRORS[r.error] || "Couldn't restore the backup", 'error');
    selectedId = id;
    render();
  }
  function restoreBackup(id) {
    if (whenFree(() => restoreBackup(id))) return;
    return guarded(async () => {
      const m = entries().find((x) => x.id === id);
      const ok = await app.confirm({
        title: 'Restore the backup?',
        body: m && m.backup ? `The damaged file is replaced by the backup from ${fmtDate(m.backup.savedAt)} (${whereLine(m.backup)}).` : 'The damaged file is replaced by its backup.',
        confirmLabel: 'Restore',
        cancelLabel: 'Cancel',
        defaultFocus: 'confirm',
      });
      if (ok) await restoreBackupNow(id);
    });
  }

  function remove(id) {
    if (whenFree(() => remove(id))) return;
    return guarded(async () => {
      const m = entries().find((x) => x.id === id);
      if (!m || m.empty) return;
      const ok = await app.confirm({
        title: `Delete “${m.name}”?`,
        body: m.status === 'ok' ? `${whereLine(m)} · saved ${fmtDate(m.savedAt)}.\nThis can't be undone.` : "This can't be undone.",
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
        defaultFocus: 'cancel',
      });
      if (!ok) return;
      const r = save().remove(id);
      if (r.ok) toast(`Deleted “${m.name}”`, 'info');
      render();
      if (mode === 'load' && entries().length === 0) manager.refocus();
    });
  }

  function rename(id) {
    if (whenFree(() => rename(id))) return;
    return guarded(async () => {
      const m = entries().find((x) => x.id === id);
      if (!m || m.empty || m.status !== 'ok') return;
      const name = await new Promise((resolve) => {
        if (!manager.push('sv-rename', { value: m.name, resolve })) resolve(null);
      });
      if (name === null || name === undefined || name === m.name) return;
      const r = await save().rename(id, name);
      if (r.ok) toast(`Renamed to “${r.meta.name}”`, 'good');
      else toast(SAVE_ERRORS[r.error] || "Couldn't rename", 'warn');
      render();
    });
  }

  function exportSlot(id) {
    const r = save().exportSlot(id);
    if (r.ok) toast(`Exported ${r.filename}`, 'good');
    else toast(SAVE_ERRORS[r.error] || "Couldn't export", 'warn');
  }

  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    guarded(async () => {
      const s = save();
      let target = null;
      const firstEmpty = s.manualSlots().find((id) => !s.list().some((m) => m.id === id));
      if (!firstEmpty) {
        const sel = current();
        if (!sel || sel.kind !== 'manual') {
          toast(SAVE_ERRORS.full, 'warn');
          return;
        }
        const ok = await app.confirm({
          title: `Replace “${sel.name}” with the imported file?`,
          body: 'Every slot is in use.',
          confirmLabel: 'Replace',
          danger: true,
          defaultFocus: 'cancel',
        });
        if (!ok) return;
        target = sel.id;
      }
      const r = await s.importFile(f, target);
      if (r.ok) {
        // fix-M2-r6: a file naming content this build lacks says so up front.
        if (r.drift) toast(`Imported into “${r.meta ? r.meta.name : r.slotId}” — ${r.drift.short}`, 'warn');
        else toast(`Imported into “${r.meta ? r.meta.name : r.slotId}”`, 'good');
        mode = 'load';
        selectedId = r.slotId;
        render({ keepFocus: false });
      } else {
        const why = r.error === 'full' || r.error === 'quota' || r.error === 'version' ? SAVE_ERRORS[r.error] : friendlyDetail(r);
        toast(`Couldn't import that file — ${why}`, 'error');
      }
    });
  });

  const screen = {
    el,
    blocking: true,
    // The overlay band (z 1100), like Settings: the saves screen opens from the
    // title AND from the in-game pause menu (itself an overlay) and must draw
    // above — and take the mouse over — whichever opened it (SAVE-R1-F1).
    layer: 'overlay',
    onOpen(params = {}) {
      open = true;
      mode = params.mode === 'save' && inGame() ? 'save' : 'load';
      selectedId = null;
      busy = false;
      queued = null;
      savingId = null;
      cancelHover();
      const s = save();
      if (!offThumb && s && typeof s.onThumb === 'function') offThumb = s.onThumb((id) => refreshThumb(id));
      // Another tab of the game saved, overwrote or deleted a slot (SAVE4-F1):
      // the list redraws in place (a confirm on top redraws it on return).
      if (!offSlots && s && typeof s.onSlotsChanged === 'function') {
        offSlots = s.onSlotsChanged(() => {
          if (open && !busy && manager.top() === 'saves') render();
        });
      }
      render({ keepFocus: false });
    },
    onFocus() {
      render();
    },
    onClose() {
      open = false;
      queued = null;
      cancelHover();
      if (offThumb) offThumb();
      offThumb = null;
      if (offSlots) offSlots();
      offSlots = null;
    },
    onFocusChange(node, source) {
      if (!node || !node.dataset || !node.dataset.slot) {
        cancelHover();
        return;
      }
      // A mouse hover only previews a row the pointer rests on (r3 F1);
      // keyboard / gamepad / api focus selects at once.
      if (source === 'mouse') armHover(node.dataset.slot);
      else {
        cancelHover();
        select(node.dataset.slot);
      }
    },
    onNav(action) {
      const a = document.activeElement;
      const onRow = !!(a && a.dataset && a.dataset.slot);
      if (action === 'tabPrev' || action === 'tabNext') {
        if (inGame()) setMode(mode === 'save' ? 'load' : 'save');
        return true;
      }
      if (action === 'secondary') {
        if (selectedId) remove(selectedId);
        return true;
      }
      if (action === 'tertiary') {
        if (selectedId) rename(selectedId);
        return true;
      }
      if (action === 'right' && onRow) {
        const b = detailEl.querySelector('.sv-acts [data-nav]:not([disabled])');
        if (b) manager.focusElement(b, 'api');
        return true;
      }
      if (action === 'left' && a && detailEl.contains(a)) {
        const r = rowEls.get(selectedId);
        if (r) manager.focusElement(r, 'api');
        return true;
      }
      // A detail taller than its panel (only below the §16.4 layout sizes, or
      // a very long name): Up / Down on the panel's buttons page its text box
      // while it can still move that way (SAVE5-F2 — never unreachable).
      if ((action === 'up' || action === 'down') && a && detailEl.contains(a)) {
        const box = detailBox();
        if (box && canScroll(box, action === 'down' ? 1 : -1)) {
          box.scrollTop += (action === 'down' ? 1 : -1) * Math.max(24, box.clientHeight * 0.6);
          moreMarks(box);
          return true;
        }
      }
      return false;
    },
    // Right stick (manager.scroll): the detail's text box when it overflows;
    // otherwise the default (the focused row's list).
    onScroll(dy) {
      const box = detailBox();
      if (!box || !canScroll(box, Math.sign(dy))) return false;
      const before = box.scrollTop;
      box.scrollTop = before + dy;
      moreMarks(box);
      return box.scrollTop !== before;
    },
  };
  function detailBox() {
    const box = detailEl.querySelector('.sv-dscroll');
    return box && box.scrollHeight > box.clientHeight + 1 ? box : null;
  }
  function canScroll(box, dir) {
    if (dir > 0) return box.scrollTop + box.clientHeight < box.scrollHeight - 1;
    if (dir < 0) return box.scrollTop > 0;
    return false;
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => moreMarks(detailEl.querySelector('.sv-dscroll'))).observe(detailEl);
  }
  return screen;
}

// ------------------------------------------------------- rename dialog --
function createRenameScreen(ctx) {
  installSaveStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-dialog sv-rename';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ap-dlg ap-plate">
      <div class="ap-dlg-title">Rename save</div>
      <input type="text" id="sv-rename-input" maxlength="32" autocomplete="off" spellcheck="false" data-nav data-nav-default />
      <div class="sv-count"></div>
      <div class="ap-dlg-btns"></div>
    </div>`;
  const input = el.querySelector('input');
  const count = el.querySelector('.sv-count');
  const btns = el.querySelector('.ap-dlg-btns');
  let p = null;
  let settled = false;
  function finish(v) {
    if (settled) return;
    settled = true;
    if (manager.top() === 'sv-rename') manager.pop();
    if (p && typeof p.resolve === 'function') p.resolve(v);
  }
  const ok = mkBtn('Rename', 'sv-rename-ok', 'ap-primary', () => finish(input.value.trim() || null));
  const cancel = mkBtn('Cancel', 'sv-rename-cancel', '', () => finish(null));
  btns.append(ok, cancel);
  const upd = () => {
    count.textContent = `${input.value.length} / 32`;
  };
  input.addEventListener('input', upd);
  const hints = createHints(app, [
    ['confirm', 'Rename'],
    ['back', 'Cancel'],
  ]);
  hints.el.style.justifyContent = 'flex-end';
  el.querySelector('.ap-dlg').appendChild(hints.el);
  return {
    el,
    blocking: true,
    layer: 'dialog',
    reusable: false,
    onOpen(params = {}) {
      p = params;
      settled = false;
      input.value = String(params.value || '').slice(0, 32);
      upd();
      setTimeout(() => {
        try {
          input.focus({ preventScroll: true });
          input.select();
        } catch {
          /* detached */
        }
      }, 0);
    },
    onClose() {
      if (!settled) {
        settled = true;
        if (p && typeof p.resolve === 'function') p.resolve(null);
      }
    },
    onNav(action) {
      if (action === 'confirm' && document.activeElement === input) {
        finish(input.value.trim() || null);
        return true;
      }
      return false;
    },
    back() {
      finish(null);
      return true;
    },
  };
}

let registered = false;
export function registerSaveScreens() {
  if (registered) return;
  registered = true;
  registerScreen('saves', createSavesScreen);
  registerScreen('sv-rename', createRenameScreen);
  registerScreen('records', createRecordsScreen);
}
