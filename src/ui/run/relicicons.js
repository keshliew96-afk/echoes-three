// Drawn relic and curse icons (same grammar as ui/hud/icons.js: a 32x32 SVG,
// stroked and filled with `currentColor`, one distinct silhouette per relic
// that survives 20 px — never a system-font glyph).

const STROKE = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const FILL = 'fill="currentColor" stroke="none"';

const RELIC_SVG = {
  // THE TIDECALLER: a pearl in an open shell; a charm of three wave lines on a cord.
  otters_pearl: `<path d="M5 20 Q16 30 27 20 Z" ${STROKE}/><path d="M5 20 Q7 8 16 7 Q25 8 27 20" ${STROKE}/><circle cx="16" cy="18" r="3.4" ${FILL}/>`,
  millrace_charm: `<path d="M10 4 L16 10 L22 4" ${STROKE}/><circle cx="16" cy="19" r="9" ${STROKE}/><path d="M10 17 Q13 14 16 17 Q19 20 22 17 M10 22 Q13 19 16 22 Q19 25 22 22" ${STROKE}/>`,
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
  // Batch 3. A kite shield with a bar across it and a heart on its boss.
  wardens_oath: `<path d="M16 4 L26 8 Q26 20 16 28 Q6 20 6 8 Z" ${STROKE}/><path d="M16 19 L12.5 15.5 Q12.5 12 16 13.6 Q19.5 12 19.5 15.5 Z" ${FILL}/><path d="M6 11 L26 11" ${STROKE}/>`,
  // A ribbon tied in a bow whose tails flick like a fox's brush.
  fox_ribbon: `<path d="M16 14 Q9 6 6 11 Q8 16 16 14 Z" ${STROKE}/><path d="M16 14 Q23 6 26 11 Q24 16 16 14 Z" ${STROKE}/><circle cx="16" cy="14" r="2" ${FILL}/><path d="M15 16 Q12 22 8 27 M17 16 Q21 21 25 25" ${STROKE}/>`,
  // An arrow bent at a knot, glancing off toward a second mark.
  fletchers_knot: `<path d="M4 24 L15 15" ${STROKE}/><circle cx="16" cy="14" r="2.6" ${STROKE}/><path d="M18 13 L27 6" ${STROKE}/><path d="M22 6 L27 6 L27 11" ${STROKE}/><path d="M4 24 L4 20 M4 24 L8 24" ${STROKE}/>`,
  // A hand bell with a clapper and two chime arcs.
  mercy_bell: `<path d="M9 23 Q9 10 16 8 Q23 10 23 23 Z" ${STROKE}/><path d="M7 23 H25" ${STROKE}/><circle cx="16" cy="26" r="1.8" ${FILL}/><path d="M16 5 V8" ${STROKE}/><path d="M4 12 Q3 16 5 20 M28 12 Q29 16 27 20" ${STROKE}/>`,
  // A faceted coal with a flame licking up out of its crack.
  kindling_coal: `<path d="M6 21 L11 14 L20 13 L26 19 L22 27 L10 27 Z" ${STROKE}/><path d="M14 22 L17 17 L19 22" ${STROKE}/><path d="M16 12 Q12 8 16 3 Q17 7 20 8 Q20 12 16 12 Z" ${FILL}/>`,
  // A chalice under a rayed sun.
  sun_chalice: `<path d="M9 14 H23 Q23 21 16 22 Q9 21 9 14 Z" ${STROKE}/><path d="M16 22 V26 M11 27 H21" ${STROKE}/><circle cx="16" cy="8" r="3" ${FILL}/><path d="M16 2 V3.5 M10 5 L11 6 M22 5 L21 6 M8.5 9 H10 M22 9 H23.5" ${STROKE}/>`,
  // A pact scroll sealed with an ember drop, its corners curling.
  cinder_pact: `<rect x="8" y="6" width="16" height="20" rx="2" ${STROKE}/><path d="M12 11 H20 M12 15 H20" ${STROKE}/><path d="M16 19 Q19 22 16 25 Q13 22 16 19 Z" ${FILL}/><path d="M6 6 Q8 3 10 6 M22 26 Q24 29 26 26" ${STROKE}/>`,
  // A pinned writ with a coin stamped on it.
  bounty_writ: `<path d="M7 5 H22 L25 8 V27 H7 Z" ${STROKE}/><circle cx="16" cy="18" r="5" ${STROKE}/><path d="M16 15 V21" ${STROKE}/><circle cx="16" cy="5" r="2" ${FILL}/><path d="M10 10 H19" ${STROKE}/>`,
  // A curled hunting horn with its sound lines.
  huntsmans_horn: `<path d="M5 20 Q6 9 18 9 L24 6 L25 15 L19 14 Q11 14 9 22 Z" ${STROKE}/><path d="M5 20 Q4 25 9 24" ${STROKE}/><path d="M27 4 L29 2 M28 10 L31 10" ${STROKE}/>`,
  // A pilgrim's lamp on a staff head, with a hood over the flame.
  pilgrims_lamp: `<path d="M16 3 V7" ${STROKE}/><path d="M10 9 Q16 5 22 9 L22 20 Q16 24 10 20 Z" ${STROKE}/><path d="M16 12 Q19 15.5 16 19 Q13 15.5 16 12 Z" ${FILL}/><path d="M16 23 V29" ${STROKE}/>`,
  // Batch 4. A shepherd's crook: a tall staff hooked over at the top.
  shepherds_crook: `<path d="M13 29 V12 Q13 4 19 4 Q25 4 25 10 Q25 14 21 14" ${STROKE}/><circle cx="21" cy="14" r="1.8" ${FILL}/><path d="M9 29 H17" ${STROKE}/>`,
  // A vigil candle in a dish, a tall steady flame, a small ward ring.
  vigil_candle: `<rect x="12" y="13" width="8" height="12" rx="1" ${STROKE}/><path d="M7 26 H25" ${STROKE}/><path d="M16 3 Q20 8 16 11 Q12 8 16 3 Z" ${FILL}/><path d="M5 18 Q5 10 10 7 M27 18 Q27 10 22 7" ${STROKE}/>`,
  // A stick of chalk drawing a ring.
  warding_chalk: `<circle cx="14" cy="18" r="9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="4 2.4"/><path d="M19 13 L27 5 L29 7 L21 15 Z" ${FILL}/><circle cx="14" cy="18" r="2" ${FILL}/>`,
  // A laurel wreath round a small crown.
  champions_laurel: `<path d="M8 25 Q3 16 8 8 M24 25 Q29 16 24 8" ${STROKE}/><path d="M6 12 L9 11 M5 17 L8 17 M6 22 L9 22 M26 12 L23 11 M27 17 L24 17 M26 22 L23 22" ${STROKE}/><path d="M11 21 L12 13 L14 17 L16 11 L18 17 L20 13 L21 21 Z" ${FILL}/>`,
  // A jailer's iron ring with two keys hanging from it.
  jailers_ring: `<circle cx="16" cy="9" r="6" ${STROKE}/><path d="M12 14 L9 25 M9 25 H13 M10 21 H12" ${STROKE}/><path d="M20 14 L23 25 M23 25 H19 M22 21 H20" ${STROKE}/>`,
  // A bound ledger with a coin stamped on its cover.
  vault_ledger: `<path d="M7 5 H24 V27 H7 Z" ${STROKE}/><path d="M10 5 V27" ${STROKE}/><circle cx="17.5" cy="14" r="4" ${FILL}/><path d="M13 22 H22" ${STROKE}/>`,
  // A swallow-tailed pennant on a short pole.
  banner_pennant: `<path d="M8 3 V29" ${STROKE}/><path d="M8 5 H26 L21 11 L26 17 H8" ${STROKE}/><path d="M12 9 H18 M12 13 H18" ${STROKE}/>`,
  // A pierced travel token on a cord, a compass star on its face.
  wanderers_token: `<path d="M10 3 L16 8 L22 3" ${STROKE}/><circle cx="16" cy="18" r="10" ${STROKE}/><path d="M16 11 L18 18 L16 25 L14 18 Z" ${FILL}/><path d="M9 18 H23" ${STROKE}/>`,
  // A split geode: rough shell, crystals growing in its heart.
  geode_heart: `<path d="M5 17 Q5 6 16 5 Q27 6 27 17 Q27 27 16 28 Q5 27 5 17 Z" ${STROKE}/><path d="M11 21 L13 13 L15 21 Z M15 21 L17 10 L19 21 Z M19 21 L21 15 L22 21 Z" ${FILL}/>`,
  // A small reliquary urn with ash rising out of it.
  saints_ashes: `<path d="M10 15 H22 L20 27 H12 Z" ${STROKE}/><path d="M8 15 H24" ${STROKE}/><path d="M13 11 Q11 8 13 5 M16 11 Q18 7 16 3 M19 11 Q21 8 19 6" ${STROKE}/><circle cx="16" cy="21" r="1.8" ${FILL}/>`,
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
