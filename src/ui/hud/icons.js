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

  // ------------------------------------------ Gauntlet skills (§23.3) --
  // Lantern Flurry: three diamond bolt-heads fanned out from one point.
  lantern_flurry: [
    ['path', { d: 'M4 26 L14 18 M4 26 L16 22 M4 26 L12 14', 'stroke-width': 1.8 }],
    ['path', { d: 'M22 5 L26 9 L22 13 L18 9 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M26 16 L30 20 L26 24 L22 20 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M15 13 L18 16 L15 19 L12 16 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Pale Lance: a long lance through two bodies (pierce ticks).
  pale_lance: [
    ['path', { d: 'M3 29 L23 9', 'stroke-width': 3 }],
    ['path', { d: 'M20 5 L28 4 L27 12 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M8 18 L14 24 M14 12 L20 18', 'stroke-width': 1.8 }],
  ],
  // Bell Toll: a bell with its clapper and two sound arcs.
  bell_toll: [
    ['path', { d: 'M9 22 C9 12 11 7 16 7 C21 7 23 12 23 22 Z' }],
    ['path', { d: 'M6 22 H26', 'stroke-width': 2.8 }],
    ['circle', { cx: 16, cy: 26, r: 2.2, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M3 12 A12 12 0 0 1 6 6 M29 12 A12 12 0 0 0 26 6', 'stroke-width': 1.8 }],
  ],
  // Rootsnare: a ground line with three roots curling out of it.
  rootsnare: [
    ['path', { d: 'M3 18 H29' }],
    ['path', { d: 'M8 18 C7 23 11 25 9 29 M16 18 C18 23 14 25 16 29 M24 18 C23 23 27 24 25 29', 'stroke-width': 2 }],
    ['path', { d: 'M12 18 C12 13 8 11 9 6 M21 18 C21 12 25 11 23 5', 'stroke-width': 2 }],
  ],
  // Dewfall: three drops falling onto a ground arc.
  dewfall: [
    ['path', { d: 'M9 4 C11 8 12 10 9 12 C6 10 7 8 9 4 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M20 7 C22 11 23 13 20 15 C17 13 18 11 20 7 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 14 C16 18 17 20 14 22 C11 20 12 18 14 14 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M4 27 A14 7 0 0 1 28 27' }],
  ],
  // Kindred Shield: a shield with the heal cross inside it.
  kindred_shield: [
    ['path', { d: 'M16 4 L26 8 V15 C26 21 21 25.5 16 28 C11 25.5 6 21 6 15 V8 Z' }],
    ['path', { d: 'M16 10 V21 M10.5 15.5 H21.5', 'stroke-width': 2.8 }],
  ],
  // Mending Tide: one wide swell under a rising cross.
  mending_tide: [
    ['path', { d: 'M2 22 Q9 12 16 20 T30 18' }],
    ['path', { d: 'M4 28 Q11 19 18 26 T30 25', 'stroke-width': 1.8 }],
    ['path', { d: 'M16 3 V11 M12 7 H20' }],
  ],
  // Hearthsong: a hearth flame with two song arcs.
  hearthsong: [
    ['path', { d: 'M16 5 C21 10 22 14 20 19 C19 22 13 22 12 19 C10 14 11 10 16 5 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M6 26 A11 5 0 0 0 26 26' }],
    ['path', { d: 'M4 12 A13 13 0 0 1 7 7 M28 12 A13 13 0 0 0 25 7', 'stroke-width': 1.8 }],
  ],
  // Quiet Hearth: a dome over a small hearth stone (a ward).
  quiet_hearth: [
    ['path', { d: 'M4 24 A12 12 0 0 1 28 24' }],
    ['path', { d: 'M2 26.5 H30' }],
    ['path', { d: 'M13 24 V20 H19 V24', 'stroke-width': 1.8 }],
    ['path', { d: 'M16 10 V16 M13 13 H19', 'stroke-width': 1.8 }],
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

  // ------------------------------------------- Gauntlet nodes (§23.4) --
  // Widen: a ring pushed outward by two arrows.
  widen: [
    ['circle', { cx: 16, cy: 16, r: 5.5 }],
    ['path', { d: 'M2 16 H8 M24 16 H30' }],
    ['path', { d: 'M5 12 L1.5 16 L5 20 M27 12 L30.5 16 L27 20', 'stroke-width': 2 }],
  ],
  // Reach: a long shaft with a head, past a range tick.
  reach: [
    ['path', { d: 'M3 16 H27' }],
    ['path', { d: 'M22 10 L28.5 16 L22 22', 'stroke-width': 2.6 }],
    ['path', { d: 'M9 10 V22 M15 12 V20', 'stroke-width': 1.8 }],
  ],
  // Linger: an hourglass.
  linger: [
    ['path', { d: 'M8 4 H24 M8 28 H24', 'stroke-width': 2.6 }],
    ['path', { d: 'M10 4 C10 12 16 13 16 16 C16 19 10 20 10 28 M22 4 C22 12 16 13 16 16 C16 19 22 20 22 28' }],
    ['path', { d: 'M12.5 25 L16 21.5 L19.5 25 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Keen: a four-point glint.
  keen: [
    ['path', { d: 'M16 2 L18.8 13.2 L30 16 L18.8 18.8 L16 30 L13.2 18.8 L2 16 L13.2 13.2 Z', fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 25, cy: 7, r: 1.8, fill: 'currentColor', stroke: 'none' }],
  ],
  // Snare: a closing loop of rope.
  snare: [
    ['path', { d: 'M16 6 A10 10 0 1 1 7.5 21' }],
    ['path', { d: 'M16 12 A4.5 4.5 0 1 1 11.5 16.5' }],
    ['path', { d: 'M7.5 21 L3 29', 'stroke-width': 2 }],
  ],
  // Galvanize: a zig-zag bolt.
  galvanize: [
    ['path', { d: 'M19 2 L8 17 H15 L12 30 L24 13 H17 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Bulwark: a hexagonal shield plate.
  bulwark: [
    ['path', { d: 'M16 3 L27 9.5 V22.5 L16 29 L5 22.5 V9.5 Z' }],
    ['path', { d: 'M16 9 L22 12.5 V19.5 L16 23 L10 19.5 V12.5 Z', fill: 'currentColor', stroke: 'none' }],
  ],
  // Split: one line forking into two heads.
  split: [
    ['path', { d: 'M3 16 H13 L25 7 M13 16 L25 25' }],
    ['path', { d: 'M20 5 L26 6.5 L24.5 12 M20 27 L26 25.5 L24.5 20', 'stroke-width': 2 }],
  ],
  // Resonance: three nested arcs around a core (x2 on the third cast).
  resonance: [
    ['circle', { cx: 9, cy: 16, r: 3, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M14 10 A8 8 0 0 1 14 22' }],
    ['path', { d: 'M19 6 A13 13 0 0 1 19 26' }],
    ['path', { d: 'M24 3 A18 18 0 0 1 24 29', 'stroke-width': 1.8 }],
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
  // The Peddler's lantern: a hanging brass lamp — ring, cap, glazed body with
  // a flame inside, and a base. Stands ON the shelf's title rail so the panel
  // has a real light SOURCE instead of an abstract bead (REFERENCE_BAR check 2
  // "every emitter has a glow halo" — the halo is the .rn-lamp pool behind it).
  lantern: [
    ['path', { d: 'M16 2 A2.6 2.6 0 0 1 16 7.2', 'stroke-width': 1.8 }],
    ['path', { d: 'M11 9 H21 L19.5 11.5 H12.5 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M12.5 11.5 H19.5 L21 24 H11 Z' }],
    ['path', { d: 'M9 26 H23 L21.5 29 H10.5 Z', fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M16 14 C18.6 17 18.6 20.4 16 22.6 C13.4 20.4 13.4 17 16 14 Z', fill: 'currentColor', stroke: 'none' }],
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
