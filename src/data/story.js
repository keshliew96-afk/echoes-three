// THE HEARTH SONG (docs/STORY.md): the starting story line and the NPCs who
// carry it. Pure data: every line is the English key the UI translates with
// t() at the display site (docs/I18N.md rule 1), and nothing here touches
// the sim, so the golden traces never see the story.
//
// The spine: the gods sang the world and fell silent; the Hollow Heart under
// the Barrow sings a hollow copy in their place; each Act's boss frees one
// VERSE of the true song, which the Healer's bell carries home to the
// Hearth-Fire. The song has SEVEN verses and the story so far recovers five
// (Levels I to V; the Sky verse since the Spire's bosses), so a future Act adds a chapter, a verse and its two
// bosses here without rewriting what came before (docs/STORY.md "Hooks").

// The number of verses the whole song has. Verses beyond the levels that
// exist stay blank on the Story so far page: the room left for future Acts.
export const TOTAL_VERSES = 7;

// One chapter per campaign level. A level's verse is held once that level
// has been cleared (profile records.levelClears). `name` carries an @@
// context so "Root" the verse never shares a translation with another Root.
export const CHAPTERS = Object.freeze([
  {
    level: 1,
    verse: 'root',
    name: 'Root@@verse',
    title: 'Chapter I · The Hollow Wood',
    summary:
      'The Hollow Stag was the wood’s warden, the first creature to hear the hollow song. Where no warden stood, the briars grew a Thornmother instead, and the Gloam Wolf, the wood’s oldest hunter, still hunts the dark between them. Felling any of the three frees the Verse of Root.',
  },
  {
    level: 2,
    verse: 'water',
    name: 'Water@@verse',
    title: 'Chapter II · The Sunken Mill',
    summary:
      'The song travels with water. The Drowned Heron kept the river; the Millwheel is the mill itself, turned; the Mire King grew fat on the millpond and crowned itself with the grate. Felling any of the three frees the Verse of Water.',
  },
  {
    level: 3,
    verse: 'stone',
    name: 'Stone@@verse',
    title: 'Chapter III · The Ashen Barrow',
    summary:
      'The Barrow Wyrm guarded the way down, not the dead. The violet is oldest here because the Heart lies directly below. Over the mounds the Ash Raven, fat on the pyres, calls its crows down on the living. Felling the Wyrm, the Lich Ram or the Raven frees the Verse of Stone.',
  },
  {
    level: 4,
    verse: 'heart',
    name: 'Heart@@verse',
    title: 'Chapter IV · The Hollow Heart',
    summary:
      'The singer at the bottom is the Hollow Cantor: not a god but a god’s echo, left behind when the gods fell silent. When it will not come out, the Heart grows a Geode Colossus to sing through. Silencing either frees the Verse of Heart, and for the first time the gods stop applauding. Deeper still, past the end of the song, the Vein Weaver spins the Heart’s veins through the dark.',
  },
  // ACT V (docs/ACT_V_BOSSES.md): the Still Spire, the gods' own belfry.
  {
    level: 5,
    verse: 'sky',
    name: 'Sky@@verse',
    title: 'Chapter V · The Still Spire',
    summary:
      'Above the world stands the Still Spire, the belfry where the gods sat down to watch. The Skyhorn kept its stair, and the hollow song turned it at the top. Beside the gods sits the Hush, the silence that stopped them: the quiet the Hollow Cantor sang into. Behind the great dial the Hourwarden, the gods’ own clock, counts down the hours the song wound back into it. Felling any of them frees the Verse of Sky, and the bell rings where the gods can hear it.',
  },
]);

export const chapterFor = (level) => CHAPTERS.find((c) => c.level === Number(level)) ?? null;

// The prologue: Wick tells it the first time a player reaches the camp.
export const PROLOGUE = Object.freeze({
  title: 'The Hearth Song',
  text: [
    'In the beginning the gods sang the world, and the world sang back. Every living thing still carries an echo of that song.',
    'The Hearth-Fire is where those echoes gather. We keep it lit.',
    'One night the gods fell silent and sat down to watch. In the silence, something under the Barrow began to sing in their place. Its song is only echo, everything repeated back hollow, and the beasts that hear it turn violet.',
    'Your bell is the last one that still rings the true note. Take it, and take your friends. Bring the verses home.',
  ],
});

// --- The NPCs --------------------------------------------------------------
// `where`: 'camp' NPCs stand in the camp scene; 'event' NPCs speak on their
// event-room card; 'banner' speaks under a boss's title; 'cards' on the end
// cards. Names are proper nouns (translated or kept per docs/I18N.md).
export const NPCS = Object.freeze({
  keeper: { id: 'keeper', name: 'Wick, the Hearth-Keeper', short: 'Wick', where: 'camp' },
  peddler: { id: 'peddler', name: 'Bramble, the Peddler', short: 'Bramble', where: 'camp' },
  chronicler: { id: 'chronicler', name: 'Quill, the Chronicler', short: 'Quill', where: 'camp' },
  pilgrim: { id: 'pilgrim', name: 'Sedge, the Lost Pilgrim', short: 'Sedge', where: 'event', encounter: 'lost_pilgrim' },
  firstbell: { id: 'firstbell', name: 'The First Bell', short: 'The First Bell', where: 'event', encounter: 'wandering_spirit' },
  voice: { id: 'voice', name: 'The Hollow Voice', short: 'The Hollow Voice', where: 'event', encounter: 'corrupted_altar' },
  chorus: { id: 'chorus', name: 'The Chorus', short: 'The Chorus', where: 'cards' },
  // THE TIDECALLER (docs/TIDECALLER.md): a playable class who also talks at
  // camp, from her spot on the sluice side of the fire.
  rill: { id: 'rill', name: 'Rill, the Tidecaller', short: 'Rill', where: 'camp' },
  // THE BELLWRIGHT (docs/BELLWRIGHT.md "Tolly in the world"): the same, from
  // her spot on the west side of the fire.
  tolly: { id: 'tolly', name: 'Tolly, the Bellwright', short: 'Tolly', where: 'camp' },
  // THE DUSKWING (docs/DUSKWING.md "Sable in the world"): the same, from his
  // perch on the east side of the fire.
  sable: { id: 'sable', name: 'Sable, the Duskwing', short: 'Sable', where: 'camp' },
});

// Who appears under "People" on the Story so far page, and when.
export const PEOPLE = Object.freeze([
  { id: 'keeper', always: true, lore: 'Keeps the Hearth-Fire lit and tells the story. Sits on the woodpile.' },
  { id: 'peddler', always: true, lore: 'Sells in the clearing before every boss, and knows who waits behind the door.' },
  { id: 'chronicler', always: true, lore: 'Inks each land you clear onto the map, and keeps this book.' },
  { id: 'pilgrim', met: 'pilgrim', lore: 'Walking to the Choir, past the Heart. Trades a lesson for a little Glint.' },
  { id: 'firstbell', met: 'firstbell', lore: 'The Healer who carried the bell before you. Trades relics for better ones.' },
  { id: 'voice', met: 'voice', seenPrefix: 'voice:', lore: 'The singer under the Barrow. Speaks through altars, and before every boss.' },
  { id: 'chorus', always: true, lore: 'The gods. They watch, and they applaud.' },
  { id: 'rill', feat: 'tidecaller', lore: 'A river otter from the Mill who sang the sluices shut. Freed with the Verse of Water, she fights with the tide.' },
  { id: 'tolly', feat: 'bellwright', lore: 'A bell beetle who rang the hours over the Barrow until the hollow song cracked every bell but hers. Freed with the Verse of Stone, she hangs her bells where the fight will be.' },
  { id: 'sable', feat: 'duskwing', lore: 'A fruit bat who roosted in the dark under the roads, where the Heart\'s beat comes up through the stone. Freed with the Verse of Heart, he drops on a pack from out of the dark and puts its lights out.' },
]);

// Who speaks on which event-room card.
export const ENCOUNTER_NPC = Object.freeze({
  lost_pilgrim: 'pilgrim',
  wandering_spirit: 'firstbell',
  corrupted_altar: 'voice',
});

// Wick at the hearth. `verses` picks the line set by how many verses the
// player holds; `extra` lines rotate after it on further talks.
export const KEEPER_LINES = Object.freeze({
  byVerses: {
    text: [
      'The bell still rings true. Take it into the Hollow Wood, and listen for the warden.',
      'Root burns in the hearth now. Hear it? The fire sings a little louder.',
      'Root and Water. The Mill runs clear again, and the hearth is warmer for it.',
      'Three verses home. Yet below the Barrow, something is still singing.',
      'Four verses burn. Three are still missing, out where the map runs blank.',
      'Five verses. Sky came home ringing, and the fire leaned up to meet it. Two are still missing.',
    ],
  },
  extra: {
    text: [
      'The gods are still watching. They always are. Don’t play to them.',
      'Embers you bring home can be offered to the hearth. Press U, and I’ll see what they buy.',
      'Every beast out there was a neighbour once. The song turned them, not their hearts.',
    ],
  },
});

// THE TIDECALLER: Rill at her camp spot. `byVerses` follows the verses held
// (she joins with Water, so the first line is for two verses or fewer);
// `extra` rotates after it on further talks.
export const RILL_LINES = Object.freeze({
  byVerses: {
    text: [
      'I sang the sluices shut to keep the hollow song out. It came in with the river anyway. Thank you for bringing the water back.',
      'Three verses home. I can hear Stone in the hearth now, low and slow, the way the millstones used to turn.',
      'Four verses. The river still remembers the other three. Take me along and I will listen for them.',
      'Five verses. The rain off the Spire runs clear again. I can hear the sky in the river now.',
    ],
  },
  extra: {
    text: ['Soak them first, then crash a wave through. Water always finds the gaps.'],
  },
});
export const rillLineFor = (verses) => RILL_LINES.byVerses.text[Math.max(0, Math.min(RILL_LINES.byVerses.text.length - 1, verses - 2))];
// Wick's one line about her, in his rotation once she has joined.
export const KEEPER_RILL_LINE = Object.freeze({ text: 'Rill sits on the sluice side of the fire and wrings out her satchel every night. The hearth hisses at her, and she laughs at it.' });

// THE BELLWRIGHT: Tolly at her camp spot. She joins with Stone, so the first
// line is for three verses or fewer; `extra` rotates after it.
export const TOLLY_LINES = Object.freeze({
  byVerses: {
    text: [
      'Every bell in the Barrow rang the hollow song but mine. I stuffed it with moss and kept it quiet. You can take the moss out now.',
      'Four verses. Under the Barrow the Heart beats out of time. I can hear it from here. A bell keeps better time than a heart.',
      'Five verses. The Spire is all belfries and no ringers. When this is over I mean to tune every one of them.',
    ],
  },
  extra: {
    text: ['Hang the bells first, where they will walk. Then ring them all at once. A peal is just patience, said loudly.'],
  },
});
export const tollyLineFor = (verses) => TOLLY_LINES.byVerses.text[Math.max(0, Math.min(TOLLY_LINES.byVerses.text.length - 1, verses - 3))];
// Wick's one line about her, in his rotation once she has joined.
export const KEEPER_TOLLY_LINE = Object.freeze({ text: 'Tolly polishes her bell before she sleeps, every night. Says a bell that is not loved goes flat. I believe her.' });

// THE DUSKWING: Sable at his perch. He joins with Heart, so the first line
// is for four verses or fewer; `extra` rotates after it.
export const SABLE_LINES = Object.freeze({
  byVerses: {
    text: [
      'I roosted right over the Heart for years. Every beat came up through the stone and shook my roost. Since you stilled it, I sleep the whole day through.',
      'Five verses. The Spire is all open sky and nowhere to hide. I flew it anyway. Up there the wind does the flying for you.',
    ],
  },
  extra: {
    text: ['Drop in, put their lights out, bite, and get out before they find you. The dark is not a place, it is a moment. Use it.'],
  },
});
export const sableLineFor = (verses) => SABLE_LINES.byVerses.text[Math.max(0, Math.min(SABLE_LINES.byVerses.text.length - 1, verses - 4))];
// Wick's one line about him, in his rotation once he has joined.
export const KEEPER_SABLE_LINE = Object.freeze({ text: 'Sable sleeps upside down over the woodpile and eats all my figs. He says the hearth is too bright. He sits as close to it as he can anyway.' });

// Bramble at camp (her shelf opens in room 7, never at camp: BUILD_BRIEF §18).
export const PEDDLER_LINES = Object.freeze({
  text: [
    'My shell has walked every road on that map, and a few that aren’t on it.',
    'I set up in the clearing before every warden’s den. I always get there first. Slow and steady.',
    'Glint is Glint, from the Wood or the Mill. I take it all.',
    'Find me before the boss and I’ll tell you who waits behind the door.',
  ],
});

// Quill on the map table.
export const CHRONICLER_LINES = Object.freeze({
  byVerses: {
    text: [
      'Every land you clear, I ink onto the map. Right now it’s mostly blank.',
      'The Hollow Wood is on the map now. Shall I read you the story so far?',
      'Two lands inked. The Mill’s ink is still wet.',
      'Three lands. Below the Barrow there is no map at all. Yet.',
      'Four lands, and the edges are still blank. The road goes further than we have.',
      'Five lands. I inked the Spire at the very top of the page, and there is still paper above it.',
    ],
  },
});

// The peddler's rumour on her shelf (room 7): which boss waits behind the
// next door, by the boss kind the run view already names, and how to meet it.
export const RUMOURS = Object.freeze({
  stag: { text: 'The Hollow Stag waits beyond the next door. It was the wood’s warden once. Step aside when it lowers its antlers.' },
  thornmother: { text: 'No warden here, only the Thornmother. She fights the floor, so keep off her briars.' },
  heron: { text: 'The Drowned Heron stands in the next pool. Watch the water: it strikes from below.' },
  millwheel: { text: 'The Millwheel has torn loose ahead. It owns the edge of the room, so fight from the middle.' },
  wyrm: { text: 'The Barrow Wyrm coils beyond this clearing. It guards the way down. Don’t stand in front of it.' },
  lichram: { text: 'The Lich Ram walks ahead, and the graves answer it. Break what rises before it gathers.' },
  // Third bosses (docs/THIRD_BOSSES.md).
  gloamwolf: { text: 'The Gloam Wolf hunts the ring of stones ahead. When it crouches, it is coming for you. When it howls, it is coming for all of you.' },
  mireking: { text: 'The Mire King sits in the drained basin. When its throat swells, walk away from it, and do not let its tongue catch you.' },
  ashraven: { text: 'The Ash Raven circles the amphitheatre ahead. When it rises, step out of its line. When its mark finds you, keep running.' },
  veinweaver: { text: 'The Vein Weaver waits in the nave below. If its thread catches you, pull it tight and stay at the end of it.' },
  // Level IV's own bosses (docs/ACT_IV_BOSSES.md).
  cantor: { text: 'The Hollow Cantor itself waits in the Heart Chamber. It sings the verses it stole from every land, and their beasts come with each one. Crowd it and it steps away.' },
  colossus: { text: 'The singer won’t come out today. The Heart has grown a Geode Colossus to guard its chamber. Step off the line when it raises a fist.' },
  // Level V's own bosses (docs/ACT_V_BOSSES.md).
  hush: { text: 'The Hush waits in the Belfry Crown, where the gods sat down. When the air goes still round it, walk to the walls, then hit it while it sinks.' },
  skyhorn: { text: 'The Skyhorn guards the belfry ahead. When it paws the floor, step out of its line and let it meet the wall.' },
  hourwarden: { text: 'The Hourwarden keeps the clock loft ahead. When its pendulum swings, stay out of the line until it has come back. When it strikes the hours, keep moving, then hit it while it winds down.' },
  other: { text: 'Something old waits beyond the next door. I haven’t seen its like before.' },
});
// Level IV (the Hollow Heart): the peddler names its own two bosses; a boss
// from another land standing in the Heart Chamber gets the Heart's own line.
export const HEART_RUMOUR = Object.freeze({ text: 'Whatever waits in the Heart Chamber wears a warden’s shape, but the song in it is the Heart’s own. Don’t listen too closely.' });
const heartLevel = () => (CHAPTERS.find((c) => c.verse === 'heart') || {}).level;
export const isHeartLevel = (level) => level !== null && level !== undefined && level === heartLevel();
// The kinds that belong to the Heart Chamber (their rumour and Hollow Voice
// line are their own).
export const HEART_BOSSES = Object.freeze(['cantor', 'colossus', 'veinweaver']);
export const rumourFor = (kind, level = null) => (isHeartLevel(level) && !HEART_BOSSES.includes(kind) ? HEART_RUMOUR : RUMOURS[kind] ?? RUMOURS.other).text;
// The Hollow Voice key for a boss met on `level` (the Heart Chamber line for a
// stand-in from another land).
export const voiceKeyFor = (kind, level = null) => (kind && isHeartLevel(level) && !HEART_BOSSES.includes(kind) ? 'heart' : kind);

// Event-room NPCs: one line per meeting, the last one repeats.
export const ENCOUNTER_LINES = Object.freeze({
  pilgrim: {
    text: [
      'I’m walking to the Choir. They say it sings where the gods sat down to listen.',
      'You again! The road bends the same way for both of us, it seems.',
      'The violet is louder down here. The Choir must be past it, further down.',
      'Every road I take ends up crossing yours. Maybe that means something.',
    ],
  },
  firstbell: {
    text: [
      'You carry my bell. I rang it once, in the Hollow Wood, long before you.',
      'I went down alone. A bell needs a party around it. You have that.',
      'I stopped at the Heart. I listened too long, and it sang me hollow.',
      'Ring it for me when you reach the bottom.',
    ],
  },
  voice: {
    text: ['Take it. Everything you take, I give back to you, emptied.'],
  },
});

// The Hollow Voice when the altar is answered (a toast as the room moves on).
export const VOICE_TAKE = Object.freeze({ text: 'Good. Now you sound a little more like me.' });
export const VOICE_LEAVE = Object.freeze({ text: 'You will come back. Everything echoes.' });

// The Hollow Voice under a boss's title the first time a player meets it.
export const BOSS_VOICE = Object.freeze({
  stag: { text: 'The wood’s warden heard me first. Listen to how well it sings.' },
  thornmother: { text: 'Where no warden stood, I grew one.' },
  heron: { text: 'The river carries my song now. Drink.' },
  millwheel: { text: 'Even the mill turns to my tune.' },
  wyrm: { text: 'It guarded my door. Now it guards my song.' },
  lichram: { text: 'The dead remember every song. Mine they remember best.' },
  gloamwolf: { text: 'It hunted before the wood had a warden. Now it hunts for me.' },
  mireking: { text: 'It swallowed my song with the millpond. Listen to it croak.' },
  ashraven: { text: 'It ate from my pyres until it could carry the ash. Now it carries my song.' },
  veinweaver: { text: 'You came past the end of my song. My weaver will tie you to it.' },
  // Level IV: the singer itself, and the body it grows to sing through.
  cantor: { text: 'You carried three verses all the way down. Sing them for me.' },
  colossus: { text: 'I would not come out for you, so I grew a body that would.' },
  // Level V: the silence the song was sung into, and the Spire's warden.
  hush: { text: 'You silenced my song. Now hear what I was singing into.' },
  skyhorn: { text: 'It kept the stair to the gods. I taught it to keep you off it.' },
  hourwarden: { text: 'The gods stopped their clock to watch. I wound it again. Now it counts you down.' },
  // A boss from another land standing in the Heart Chamber.
  heart: { text: 'You carried three verses all the way down. Sing them for me.' },
});

// THE TIDECALLER: the Hollow Voice the first time Rill stands in a Mill boss
// room (any Level II boss), and her line on the Level II clear card.
export const RILL_VOICE = Object.freeze({ text: 'The otter sang my river shut once. Sing for me now, little Tidecaller.' });
export const RILL_CLEAR = Object.freeze({
  freed: { text: 'On the riverbank an otter shakes off the hollow song. Rill follows the bell home.' },
  along: { text: 'Rill sings the sluices open again. The Mill remembers her song.' },
});

// THE BELLWRIGHT: the Hollow Voice the first time Tolly stands in a Barrow
// boss room (any Level III boss), and her line on the Level III clear card.
export const TOLLY_VOICE = Object.freeze({ text: 'Every bell in the Barrow sang for me but one. Ring it, little Bellwright. Let me hear what I missed.' });
export const TOLLY_CLEAR = Object.freeze({
  freed: { text: 'In the barrow dust a beetle digs out her bell and pulls the moss from it. Tolly follows the bell home.' },
  along: { text: 'Tolly rings the Barrow\'s hours again. The old stones remember the time.' },
});

// THE DUSKWING: the Hollow Voice the first time Sable stands in a Heart
// boss room (any Level IV boss), and his line on the Level IV clear card.
export const SABLE_VOICE = Object.freeze({ text: 'Little bat, you slept on my heartbeat for years. You knew every beat before it came. Did it never once sound like a song?' });
export const SABLE_CLEAR = Object.freeze({
  freed: { text: 'In the quiet under the Heart a bat unfolds his wings and drops from the dark. Sable follows the bell home.' },
  along: { text: 'Sable flies the Heart\'s dark one last time. Nothing in it beats now but his wings.' },
});

// The level-clear card: the verse the bell catches.
export const VERSE_LINE = 'The bell catches a verse: {verse}.';

// The campaign's last line, by how many levels the campaign has: three end
// at the Barrow, four with the Heart falling quiet, five (since the Spire's
// bosses) with the bell ringing in the gods' own belfry.
export const ENDING = Object.freeze({
  barrow: { text: 'Wick, at the hearth: “Below the Barrow, something is still singing.”' },
  heart: { text: 'The Heart is quiet. Four verses burn in the hearth. Three are still missing, and somewhere above the world, the gods have stopped clapping.' },
  spire: { text: 'The bell rings in the gods’ own belfry, and the silence breaks. Five verses burn in the hearth. Two are still missing, and above the Spire, for the first time, the gods stand up.' },
});
export const endingFor = (levels) => (levels >= 5 ? ENDING.spire : levels >= 4 ? ENDING.heart : ENDING.barrow);

// The Chorus on a defeat card: the gods are an audience. Picked by how the
// party fell; the seed picks among the general lines so a re-render is stable.
export const CHORUS = Object.freeze({
  boss: { text: 'The gods applaud {boss}. A fine performance.' },
  early: { text: 'The gods applaud. A short play, but a sincere one.' },
  cursed: { text: 'The gods applaud. They do love a curse.' },
  general: {
    text: [
      'The gods applaud.',
      'The gods applaud politely.',
      'Somewhere above, a god throws a flower.',
      'Curtain. The gods applaud.',
      'The gods applaud. The second act was better.',
    ],
  },
});

export function chorusLine({ bossRoom = false, room = 0, level = 1, curses = 0, seed = 0 } = {}) {
  if (bossRoom) return CHORUS.boss.text;
  if (level === 1 && room > 0 && room <= 2) return CHORUS.early.text;
  if (curses > 0 && (seed >>> 0) % 2 === 0) return CHORUS.cursed.text;
  const g = CHORUS.general.text;
  return g[(seed >>> 0) % g.length];
}

// Freed wardens: a land's warden spirit stands at the camp's edge once that
// land's boss is felled. Keyed by the boss kind recorded in the profile
// (meta.bosses); `also` names the level's other bosses, which free the same
// warden.
export const WARDENS = Object.freeze({
  stag: { model: 'warden_stag', also: ['thornmother', 'gloamwolf'], x: -10.0, z: -3.9, yaw: 1.2, text: 'The Stag rests at the edge of the wood, free of the hollow song.' },
  heron: { model: 'warden_heron', also: ['millwheel', 'mireking'], x: 10.1, z: 4.6, yaw: -2.2, text: 'The Heron stands quietly, listening to clear water.' },
  wyrm: { model: 'warden_wyrm', also: ['lichram', 'ashraven'], x: 9.9, z: -4.1, yaw: -0.9, text: 'The Wyrm sleeps at last. Its long watch is over.' },
  // ACT V: the Spire's warden, freed by the Skyhorn, the Hush or the
  // Hourwarden.
  skyhorn: { model: 'warden_ibex', also: ['hush', 'hourwarden'], x: -9.8, z: 4.4, yaw: 2.3, text: 'The Skyhorn stands where it can see the most sky. Its bronze horns are quiet at last.' },
});

// How many verses a profile holds: one per campaign level cleared at least once.
export function versesHeld(profile, levels = CHAPTERS.map((c) => c.level)) {
  const clears = profile && profile.records && profile.records.levelClears ? profile.records.levelClears : {};
  return CHAPTERS.filter((c) => levels.includes(c.level) && (clears[c.level] ?? 0) > 0);
}
