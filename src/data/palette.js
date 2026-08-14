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
