// Binding palette — every hex from BUILD_BRIEF §19.1. Nothing in render/ui code
// may use a color literal that is not derived from this file.
export const PALETTE = Object.freeze({
  warmGrey: '#9C9186', // party base neutral, HUD chrome
  hearthAmber: '#E8A23D', // positive UI, legendary, selection, victory, camp fire
  sageCloak: '#33513C', // healer accent
  emberDanger: '#FF5A36', // enemy telegraphs + enemy attack VFX ONLY
  brightHeal: '#5FE873', // ALL heal output — never damage
  godstuffViolet: '#B79CF0', // corruption/boss/defeat ONLY
  godstuffVioletPeak: '#F1ECFA',
  signalBlue: '#4FA3D9', // rare rarity frames + mark reticle glyph
  voidCharcoal: '#221F1B', // universal outline ink, HUD plates
  parchment: '#F4EFE6', // HUD ink, outgoing damage numerals, progress rings
  bruiseUmber: '#4E463F', // party-damage numerals only
  bone: '#C9C2B3', // common rarity, downed/neutral rings
  paleGold: '#D9B872', // Glint currency
});

// Derived environment tone (not a §19.1 semantic color): Act-1 woodland ground
// inside the §19.3 band (HSV hue 100deg, sat 60%, val 55%) — derived from the
// brief's ranges, not invented.
export const ACT1_GROUND = '#548C38';

// Class accents (BUILD_BRIEF §19.1) — rings, HP bars, cloak trim.
export const CLASS_ACCENTS = Object.freeze({
  healer: '#33513C',
  tank: '#6B6157',
  swordsman: '#6B2E3A',
  archer: '#6E7A3F',
});

// Class VFX signatures (docs/gauntlet/design-VFX.md §3). Each class keeps a
// Parchment-white hot core and gets its own glow hue, second tone and debris
// material, clear of the reserved hues (Ember = enemy threat, Bright Heal =
// heal output, Violet = the Stag / corruption). The Healer's damage glow stays
// Hearth Amber — the lantern it always was.
export const VFX_SIGNATURE = Object.freeze({
  healer: Object.freeze({ glow: '#E8A23D', second: '#F6D58E', debris: '#F4EFE6' }), // Lantern Gold
  tank: Object.freeze({ glow: '#9DB8CF', second: '#8F6B45', debris: '#5A4632' }), // Forge Steel / Earth Ochre
  swordsman: Object.freeze({ glow: '#E8577A', second: '#E7E3F0', debris: '#E7E3F0' }), // Fox Crimson / Moon Silver
  archer: Object.freeze({ glow: '#5ED3C0', second: '#C9C2B3', debris: '#C9C2B3' }), // Wind Jade / Feather Bone
});

// Enemy debris materials (design-VFX.md §5). The threat colour is always
// Ember; these are only what a body is made of when it breaks or what its
// attack throws (dirt, chitin, quills, slime, scale dust, stone, earth).
export const VFX_MATTER = Object.freeze({
  dirt: '#4A3A2C',
  chitin: '#3E5A5E',
  quill: '#C9C2B3',
  slime: '#2B3330',
  dust: '#BDB6C8',
  stone: '#7D7A76',
  earth: '#5A4632',
  ash: '#221F1B',
});
