// Drawn relic and curse icons (same grammar as ui/hud/icons.js: a 32x32 SVG,
// stroked and filled with `currentColor`, one distinct silhouette per relic
// that survives 20 px — never a system-font glyph).

const STROKE = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const FILL = 'fill="currentColor" stroke="none"';

const RELIC_SVG = {
  // A whetstone bar with a blade edge sliding across it.
  whetstone: `<rect x="6" y="17" width="20" height="8" rx="2" ${STROKE}/><path d="M9 13 L24 6" ${STROKE}/><path d="M11 12 L13 15" ${STROKE}/>`,
  // A curved fang with an ember at its tip.
  ember_tooth: `<path d="M10 5 Q24 9 18 27 Q14 17 10 5 Z" ${STROKE}/><circle cx="18" cy="26" r="2.6" ${FILL}/>`,
  // A long feather with its vane lines.
  hawk_feather: `<path d="M8 26 Q10 10 25 5 Q22 20 8 26 Z" ${STROKE}/><path d="M8 26 L20 12" ${STROKE}/><path d="M13 20 L11 16 M16 17 L15 12" ${STROKE}/>`,
  // A lantern: handle, cage, flame.
  lantern_oil: `<path d="M12 8 Q16 3 20 8" ${STROKE}/><rect x="10" y="9" width="12" height="16" rx="3" ${STROKE}/><path d="M16 13 Q19 17 16 21 Q13 17 16 13 Z" ${FILL}/>`,
  // A millstone: ring with a square eye.
  millstone: `<circle cx="16" cy="16" r="11" ${STROKE}/><rect x="13" y="13" width="6" height="6" ${FILL}/><path d="M16 5 V9 M16 23 V27 M5 16 H9 M23 16 H27" ${STROKE}/>`,
  // A coin with a grave cross.
  grave_coin: `<circle cx="16" cy="16" r="11" ${STROKE}/><path d="M16 9 V23 M11 14 H21" ${STROKE}/>`,
  // A wax seal: scalloped disc with a P-like mark.
  peddlers_seal: `<path d="M16 4 L19 7 L23 6 L24 10 L28 12 L26 16 L28 20 L24 22 L23 26 L19 25 L16 28 L13 25 L9 26 L8 22 L4 20 L6 16 L4 12 L8 10 L9 6 L13 7 Z" ${STROKE}/><circle cx="16" cy="16" r="4" ${FILL}/>`,
  // Overlapping scales.
  wyrm_scale: `<path d="M6 12 Q11 4 16 12 Q21 4 26 12" ${STROKE}/><path d="M6 19 Q11 11 16 19 Q21 11 26 19" ${STROKE}/><path d="M11 26 Q16 18 21 26" ${STROKE}/>`,
  // A hearthstone: a stone with a warm heart glyph.
  hearthstone: `<path d="M6 22 L9 9 L22 6 L27 17 L19 27 Z" ${STROKE}/><path d="M16 20 L12 16 Q12 12 16 14 Q20 12 20 16 Z" ${FILL}/>`,
  // A quill pen with an ink drop.
  heron_quill: `<path d="M24 4 Q12 8 9 22 L12 23 Q22 16 24 4 Z" ${STROKE}/><path d="M9 22 L6 28" ${STROKE}/><circle cx="20" cy="26" r="2" ${FILL}/>`,
  // A breastplate with spikes.
  thorn_mail: `<path d="M9 9 L16 7 L23 9 L22 22 L16 26 L10 22 Z" ${STROKE}/><path d="M9 9 L5 6 M23 9 L27 6 M10 22 L6 25 M22 22 L26 25" ${STROKE}/>`,
  // Two fangs with a drop between them.
  leech_fang: `<path d="M7 7 Q12 9 11 20 Q8 14 7 7 Z" ${STROKE}/><path d="M25 7 Q20 9 21 20 Q24 14 25 7 Z" ${STROKE}/><path d="M16 17 Q19 21 16 25 Q13 21 16 17 Z" ${FILL}/>`,
  // A candle flame inside a ring.
  last_light: `<circle cx="16" cy="16" r="12" ${STROKE}/><path d="M16 7 Q22 15 16 23 Q10 15 16 7 Z" ${FILL}/>`,
  // A faceted heart.
  glass_heart: `<path d="M16 27 L5 15 Q4 7 11 6 Q15 6 16 10 Q17 6 21 6 Q28 7 27 15 Z" ${STROKE}/><path d="M16 10 L13 17 L16 27 M13 17 L5 15 M16 10 L20 17 L27 15 M20 17 L16 27" ${STROKE}/>`,
  // A three-point crown.
  ashen_crown: `<path d="M5 23 L7 9 L12 16 L16 6 L20 16 L25 9 L27 23 Z" ${STROKE}/><path d="M6 26 H26" ${STROKE}/>`,
  // A short curled feather trailing two ash flecks.
  ash_feather: `<path d="M9 23 Q8 11 21 5 Q22 17 9 23 Z" ${STROKE}/><path d="M9 23 L17 11" ${STROKE}/><circle cx="21" cy="22" r="1.8" ${FILL}/><circle cx="25" cy="27" r="1.3" ${FILL}/><path d="M6 27 L9 23" ${STROKE}/>`,
  // A puffed spore pod with three motes rising off it.
  spore_sac: `<path d="M16 28 Q6 28 7 19 Q8 12 16 12 Q24 12 25 19 Q26 28 16 28 Z" ${STROKE}/><circle cx="13" cy="20" r="1.6" ${FILL}/><circle cx="19" cy="22" r="1.6" ${FILL}/><circle cx="11" cy="6" r="1.8" ${FILL}/><circle cx="17" cy="4" r="1.4" ${FILL}/><circle cx="22" cy="8" r="1.6" ${FILL}/>`,
};

// The curse mark: a crescent moon cut by an eye slit.
const CURSE_SVG = `<path d="M21 5 Q9 7 9 16 Q9 25 21 27 Q13 23 13 16 Q13 9 21 5 Z" ${FILL}/><path d="M17 16 Q22 12 27 16 Q22 20 17 16 Z" ${STROKE}/><circle cx="22" cy="16" r="1.4" ${FILL}/>`;

const svg = (body, size) => `<svg class="rl-icon" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${body}</svg>`;

export function relicIconHtml(id, size = 32) {
  return svg(RELIC_SVG[id] ?? `<circle cx="16" cy="16" r="10" ${STROKE}/>`, size);
}
// A MAJOR curse: the same mark bound inside a chained ring.
const MAJOR_SVG = `<circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3.2 2.2"/><g transform="translate(3.2 3.2) scale(0.8)">${CURSE_SVG}</g>`;

export function curseIconHtml(size = 32, major = false) {
  return svg(major ? MAJOR_SVG : CURSE_SVG, size);
}
