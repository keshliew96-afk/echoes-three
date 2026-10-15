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

// TONICS AND BOMBS (docs/CONSUMABLES.md): each carry-slot kind's colour, clear
// of the reserved hues (Ember is the enemy's threat, Violet the gods'): Bright
// Heal for the tonic that heals, Hearth Amber flame for the party's Fire Bomb.
export const TONIC_COLORS = Object.freeze({
  mend_tonic: Object.freeze({ glow: '#5FE873', core: '#E9FFE9' }),
  haste_draught: Object.freeze({ glow: '#C9EC5A', core: '#F6FFD6' }),
  ward_flask: Object.freeze({ glow: '#8DB6F2', core: '#EEF5FF' }),
  fire_bomb: Object.freeze({ glow: '#E8A23D', core: '#FFF1C9', deep: '#B4621E' }),
  frost_bomb: Object.freeze({ glow: '#7FE0F2', core: '#F2FDFF', deep: '#2E7C93' }),
  bell_charm: Object.freeze({ glow: '#D9B872', core: '#F7E7C0' }),
});

// SHRINES (docs/SHRINES.md): each land's shrine and the blessing it lays,
// clear of the reserved hues (Ember the enemy's, Violet the gods'): moss gold
// for the Antler Shrine's Swiftness, ward silver-blue for the Tithe Shrine,
// Hearth Amber flame for the Grave Shrine's Fury, Pale Gold for the Geode
// Shrine's relic, sky white-cyan for the Wind Shrine's Tailwind. `stone` is
// the shrine's own body tone in its land.
export const SHRINE_COLORS = Object.freeze({
  wood: Object.freeze({ glow: '#B8D865', core: '#F3FBD6', stone: '#6E6A55' }),
  mill: Object.freeze({ glow: '#8DB6F2', core: '#EEF5FF', stone: '#5C6670' }),
  barrow: Object.freeze({ glow: '#E8A23D', core: '#FFF1C9', stone: '#5E5652' }),
  heart: Object.freeze({ glow: '#D9B872', core: '#F7E7C0', stone: '#4A3F57' }),
  spire: Object.freeze({ glow: '#BFE4F4', core: '#F6FCFF', stone: '#8A8F99' }),
});
// The blessing each shrine lays (HUD plate, hero aura).
export const BLESSING_COLORS = Object.freeze({
  swiftness: SHRINE_COLORS.wood,
  ward: SHRINE_COLORS.mill,
  fury: SHRINE_COLORS.barrow,
  tailwind: SHRINE_COLORS.spire,
});

// Class accents (BUILD_BRIEF §19.1) — rings, HP bars, cloak trim.
export const CLASS_ACCENTS = Object.freeze({
  healer: '#33513C',
  tank: '#6B6157',
  swordsman: '#6B2E3A',
  archer: '#6E7A3F',
  tidecaller: '#2F5F8F', // THE TIDECALLER: river blue (rings, HP bars, trim)
  bellwright: '#7A5530', // THE BELLWRIGHT: bell bronze (rings, HP bars, trim)
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
  tidecaller: Object.freeze({ glow: '#3F7FE6', second: '#E6F3F7', debris: '#7C8A93' }), // Deep Cobalt / Sea Foam / River Pebble
  bellwright: Object.freeze({ glow: '#F5D06B', second: '#86D3B4', debris: '#8A6A3E' }), // Bell Brass / Verdigris / Old Bronze
});

// Biome air (AAA VFX pass, design-VFX.md §10): the tone each act's smoke and
// dust lean toward, so a puff belongs to the room it is in. Act I the Hollow
// Wood's moss, Act II the Sunken Mill's cold slate, Act III the Barrow's ash.
export const VFX_BIOME = Object.freeze({
  1: '#5B6B43',
  2: '#4F6672',
  3: '#5E5450',
  4: '#4E4458', // Act IV, the Hollow Heart: bruised violet dusk
  5: '#6A7488', // Act V, the Still Spire: cold slate-blue high air
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
  // Content slice 1 creatures (design-VFX.md §5b / §6b).
  spore: '#B3B597', // Rotcap: a sickly pale olive-grey spore dust (far off Bright Heal: s 0.15)
  shell: '#4C5763', // Lantern Snail: dark slate shell shards
  feather: '#2B2D35', // Barrow Crow: near-black feathers
  ichor: '#8E9C98', // Brood Spider: pale grey-green ichor and egg sac
  water: '#A9C0C4', // Drowned Heron: millrace foam (desaturated, never a glyph)
  silt: '#4E5848', // Drowned Heron: the mill's murky silt
  cinder: '#5E5853', // Barrow Wyrm: ash smoke light enough to read on the barrow floor
  // Content slice 2 creatures (design-VFX.md §5c / §6c).
  bramble: '#3F4A2E', // Thornling, Thornmother: dark bramble green-brown (well off Bright Heal)
  wasp: '#7A6A3A', // Briar Wasp: dull ochre wing dust
  carapace: '#6E5547', // Weir Crab: rusty brown shell
  eel: '#3D4840', // Bog Lamprey: dark weed-green hide
  wisp: '#8C90A8', // Grave Wisp: pale grave-mist lilac-grey
  boneplate: '#C9C0AE', // Bone Knight, Lich Ram: old bone armour
  iron: '#5A5C60', // Bone Knight's shield, the Millwheel's tyre
  oak: '#5C4630', // the Millwheel's planks
  // Act IV, the Hollow Heart (docs/ACT_IV.md): the corruption is the body.
  heartflesh: '#54465E', // Hollow Husk, Vein Lancer: dark bruised flesh
  heartcrystal: '#A874EE', // Geode Brute, its shards: the Heart's violet crystal
  heartvein: '#B565F5', // the Heart's lit violet (lance, coals, veins): God-stuff Violet pushed toward purple so it never reads blue in the Heart's blue-violet air
  heartpeak: '#F4E8FF', // its white-hot core
  heartbone: '#BDB2C4', // Heart Censer: old bone gone lilac-grey
  heartrose: '#D58FCB', // Heart Censer's mend: rose-violet (never Bright Heal, never Ember)
  // New enemies, Wood and Mill (docs/WOOD_MILL_ENEMIES.md).
  owlfeather: '#B8B3A8', // Shriek Owl: pale barred down
  leech: '#2E3832', // Mire Leech: black-green hide
  flour: '#D6D0C0', // Drowned Miller: wet flour paste (a grey-cream, never Bright Heal)
  // Act V, the Still Spire (docs/ACT_V.md).
  kitecloth: '#C8BFA8', // Gust Kite: weathered sailcloth and cane
  bellbronze: '#B08A4C', // Chime Wraith's bell, the Spire's bells: old tarnished bronze
  spirestone: '#A7A39A', // Gargoyle, the Spire's masonry: pale weathered limestone
  hemp: '#8C7A58', // Rope Hanger: old belfry rope
  gust: '#DCE6EE', // the gust vents' air: a pale cold white-blue (never Bright Heal)
  // Act V's bosses (docs/ACT_V_BOSSES.md).
  hushveil: '#7F8799', // the Hush's veil: grey stillness with a cold slate cast
  hushpale: '#C3CBE0', // its silence: a cold lavender-white, drained of colour (never Bright Heal)
  ibexfur: '#B7AE9E', // the Skyhorn's coat: pale high-ledge goat hair
  // Second champions (plan 4 slice 8, docs/CHAMPIONS.md).
  moss: '#4F5E3A', // the Moss Hart: old dull olive moss (well off Bright Heal)
  lichen: '#D4CF9C', // its antler lichen: a pale cream-sage glow (never Bright Heal)
  rust: '#7A4E36', // the Lockkeeper's key and chain: wet old iron gone to rust
  gravebronze: '#6E6248', // the Gravebell Ringer's bell: ash-dulled bronze
});

// ELITE AFFIXES (docs/ELITE_AFFIXES.md): each power's own hue on the elite's
// aura, its name plate chip and its bursts. All clear of Bright Heal and the
// Stag's violet; the threat itself (every telegraph) stays Ember.
export const AFFIX_COLORS = Object.freeze({
  molten: '#FF8A3D', // lava orange (ember-adjacent: it is the threat)
  frozen: '#9FD8F0', // glacier blue
  vampiric: '#C8243F', // blood crimson
  warded: '#E3C46A', // rune gold
  blinking: '#6F86FF', // cobalt
  splitting: '#B6B04A', // sick mustard
  hasted: '#F3E76A', // spark yellow
  thorned: '#A27A4A', // bark brown (bone tips)
});
