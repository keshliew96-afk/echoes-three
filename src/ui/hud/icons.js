// Drawn HUD icons (REFERENCE_BAR check 9: "boon/skill icons — clean geometric
// frames, not browser-default text"). One geometric line-icon per skill and per
// node, plus the Stag medallion for the boss plate, the Glint coin and the
// location marker. Everything is an inline SVG on a 32x32 box, stroked and
// filled with `currentColor`, so the HUD colours it from CSS exactly like the
// old text abbreviations and it inherits the §17 grammar (Parchment ink on a
// charcoal plate, class/rarity accents only where the stylesheet says so).
//
// No unicode glyphs: ⇄ / ✶ / ★ rendered by the system font were the round-1
// shop defect (Detonate and Ascend were both "a star", told apart only by rim
// colour). Each icon here is a distinct silhouette that survives 20 px.

const NS = 'http://www.w3.org/2000/svg';

// Each entry: array of primitives [tag, attrs]. Stroke defaults are applied to
// every primitive unless it sets `fill`/`stroke` itself.
const ICONS = {
  // ---------------------------------------------------------- skills --
  // Mending Bolt: a diamond bolt-head with three trailing streaks and the +HP
  // cross behind it (heal projectile).
  mending_bolt: [
    ['path', { d: 'M22 5 L28 11 L22 17 L16 11 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 13 L6 21' }],
    ['path', { d: 'M18 18 L12 24' }],
    ['path', { d: 'M12 9 L8 13' }],
    ['path', { d: 'M24 21 V29 M20 25 H28' }],
  ],
  // Swift Mend: a bold cross with speed lines (instant direct heal).
  swift_mend: [
    ['path', { d: 'M18 6 V26 M8 16 H28', 'stroke-width': 3.4 }],
    ['path', { d: 'M3 10 H7 M2 16 H5 M3 22 H7' }],
  ],
  // Nova Bloom: six petals around a core (heal nova).
  nova_bloom: [
    ...[0, 60, 120, 180, 240, 300].map((a) => [
      'path',
      {
        d: 'M16 3.5 Q20 9 16 13.5 Q12 9 16 3.5 Z',
        fill: 'currentColor',
        stroke: 'none',
        transform: `rotate(${a} 16 16)`,
      },
    ]),
    ['circle', { cx: 16, cy: 16, r: 3.2, fill: 'currentColor', stroke: 'none' }],
  ],
  // Sanctuary: a dome over a ground line, crowned with a small cross (zone).
  sanctuary: [
    ['path', { d: 'M6 23 A10 10 0 0 1 26 23' }],
    ['path', { d: 'M3 25.5 H29' }],
    ['path', { d: 'M16 5 V11 M13 8 H19' }],
    ['path', { d: 'M12 23 V19 A4 4 0 0 1 20 19 V23', 'stroke-width': 1.8 }],
  ],
  // Spirit Bolt: a wisp flame with a spark core (damage projectile).
  spirit_bolt: [
    ['path', { d: 'M16 3 C23 10 26 15 23 22 C21 27.5 11 27.5 9 22 C6 15 9 10 16 3 Z' }],
    ['path', { d: 'M16 12 C18.5 16 18.5 20 16 24 C13.5 20 13.5 16 16 12 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Warding Aura: a shield inside a broken ring (passive field).
  warding_aura: [
    ['path', { d: 'M16 6 L24 9 V15.5 C24 21 20 24.5 16 26.5 C12 24.5 8 21 8 15.5 V9 Z' }],
    ['path', { d: 'M5 9 A14 14 0 0 1 27 9', 'stroke-width': 1.8 }],
    ['path', { d: 'M5 23 A14 14 0 0 0 27 23', 'stroke-width': 1.8 }],
  ],
  // Guardian Bond: two interlocked rings.
  guardian_bond: [
    ['circle', { cx: 11.5, cy: 16, r: 6.5 }],
    ['circle', { cx: 20.5, cy: 16, r: 6.5 }],
  ],
  // Restorative Wave: two swells with a cross rising above them (arc heal).
  restorative_wave: [
    ['path', { d: 'M3 19 Q9.5 11 16 19 T29 19' }],
    ['path', { d: 'M3 26 Q9.5 18 16 26 T29 26' }],
    ['path', { d: 'M16 3 V10 M12.5 6.5 H19.5' }],
  ],

  // ----------------------------------------------------------- nodes --
  // Sharpen: a whetted blade with a sparkle.
  sharpen: [
    ['path', { d: 'M7 27 L27 7 L27 15 L15 27 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M8 6 V12 M5 9 H11' }],
  ],
  // Quicken: double chevron.
  quicken: [
    ['path', { d: 'M6 6 L15 16 L6 26' }],
    ['path', { d: 'M16 6 L25 16 L16 26' }],
  ],
  // Multiply: one shaft forking into three heads.
  multiply: [
    ['path', { d: 'M3 16 H13' }],
    ['path', { d: 'M13 16 L26 6 M13 16 L27 16 M13 16 L26 26' }],
    ['path', { d: 'M21 5 L26 6 L25 11 M22 16 L27 16 L22 16 M21 27 L26 26 L25 21', 'stroke-width': 1.8 }],
  ],
  // Ascend: a rising star with a lift arrow beneath.
  ascend: [
    [
      'path',
      {
        d: 'M16 2.5 L19.2 10.2 L27.5 10.8 L21.1 16.2 L23.1 24.3 L16 20 L8.9 24.3 L10.9 16.2 L4.5 10.8 L12.8 10.2 Z',
        fill: 'currentColor',
        stroke: 'none',
      },
    ],
    ['path', { d: 'M9 29 H23', 'stroke-width': 1.8 }],
  ],
  // Bounce: a ricochet path ending in an arrow head.
  bounce: [
    ['path', { d: 'M3 27 L12 8 L20 21 L27 7' }],
    ['path', { d: 'M21.5 6.5 L27.5 6.5 L27.5 12.5' }],
  ],
  // Siphon: a funnel that drinks into a drop.
  siphon: [
    ['path', { d: 'M5 5 H27 L19 15 V22 L13 25 V15 Z' }],
    ['path', { d: 'M16 24 V29', 'stroke-width': 1.8 }],
  ],
  // Echo: concentric rings around a core.
  echo: [
    ['circle', { cx: 16, cy: 16, r: 3.6, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 16, cy: 16, r: 8.5 }],
    ['path', { d: 'M3.5 16 A12.5 12.5 0 0 1 16 3.5 M28.5 16 A12.5 12.5 0 0 1 16 28.5', 'stroke-width': 1.8 }],
  ],
  // Detonate: an eight-spike burst.
  detonate: [
    [
      'path',
      {
        d: 'M16 2 L18.6 11.4 L27 6.5 L21.6 14 L30 16 L21.6 18 L27 25.5 L18.6 20.6 L16 30 L13.4 20.6 L5 25.5 L10.4 18 L2 16 L10.4 14 L5 6.5 L13.4 11.4 Z',
        fill: 'currentColor',
        stroke: 'none',
      },
    ],
  ],

  // ----------------------------------------------------------- chrome --
  // The Hollow Stag: antlers, a hooded head, the crown mote.
  stag: [
    ['path', { d: 'M12 14 L7 6 M7 6 L3 8 M7 6 L8.5 1.5 M8.8 9 L5.5 11.5' }],
    ['path', { d: 'M20 14 L25 6 M25 6 L29 8 M25 6 L23.5 1.5 M23.2 9 L26.5 11.5' }],
    ['path', { d: 'M16 12 L22 19 L20 29 H12 L10 19 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 16, cy: 8.5, r: 2.2, fill: 'currentColor', stroke: 'none' }],
  ],
  // Glint coin: rim, inner ring, a glint stroke.
  coin: [
    ['circle', { cx: 16, cy: 16, r: 12.5 }],
    ['circle', { cx: 16, cy: 16, r: 7.5, 'stroke-width': 1.8 }],
    ['path', { d: 'M9.5 11.5 L12 9', 'stroke-width': 1.8 }],
  ],
  // Location marker: a compass diamond on a pin.
  marker: [
    ['path', { d: 'M16 3 L22 14 L16 25 L10 14 Z' }],
    ['path', { d: 'M16 25 V29 M11 29 H21', 'stroke-width': 1.8 }],
    ['circle', { cx: 16, cy: 14, r: 2, fill: 'currentColor', stroke: 'none' }],
  ],
  // Dodge: double chevron dash (unchanged from the old drawn glyph).
  dodge: [
    ['path', { d: 'M4 6 L13 16 L4 26 L8.5 26 L17.5 16 L8.5 6 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 6 L23 16 L14 26 L18.5 26 L27.5 16 L18.5 6 Z', fill: 'currentColor', stroke: 'none' }],
  ],
};

export const ICON_IDS = Object.freeze(Object.keys(ICONS));
export const hasIcon = (id) => Object.prototype.hasOwnProperty.call(ICONS, id);

const STROKE = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

function attrsOf(a) {
  const out = { ...STROKE, ...a };
  return out;
}

// SVG element (for the command bar / banner, which build their DOM by hand).
export function iconEl(id, { size = 32, cls = '' } = {}) {
  const prims = ICONS[id];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ico ico-${id}${cls ? ' ' + cls : ''}`);
  svg.dataset.icon = id;
  if (!prims) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '16');
    c.setAttribute('cy', '16');
    c.setAttribute('r', '3');
    c.setAttribute('fill', 'currentColor');
    svg.appendChild(c);
    return svg;
  }
  for (const [tag, a] of prims) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrsOf(a))) n.setAttribute(k, String(v));
    svg.appendChild(n);
  }
  return svg;
}

// Markup string (for the run cards, which render through innerHTML).
export function iconHtml(id, { size = 32, cls = '' } = {}) {
  const prims = ICONS[id];
  const body = prims
    ? prims
        .map(([tag, a]) => {
          const attrs = Object.entries(attrsOf(a))
            .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
            .join(' ');
          return `<${tag} ${attrs}/>`;
        })
        .join('')
    : '<circle cx="16" cy="16" r="3" fill="currentColor"/>';
  return `<svg class="ico ico-${id}${cls ? ' ' + cls : ''}" data-icon="${id}" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}
