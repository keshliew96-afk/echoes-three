// THE JOURNAL (docs/JOURNAL.md, content plan 2 slice 9): what the camp
// journal (J) lists beside the Hearth Song — every enemy and boss of the four
// lands, with a lore line and what it does. Relics, curses, events and deeds
// come from their own tables (sim/relics.js, sim/encounters.js,
// data/unlocks.js); the profile's `journal` block (save/profile.js) says which
// of them this player has met and how often.
//
// Pure data (sim-importable): no DOM, no three. Names and lines are English
// keys the UI shows through t() (docs/I18N.md).
import { LEVELS, ACT_IDS, campaignLevel } from './levels.js';
import { CHAMPION_LIST } from '../sim/champions.js';

// One row per enemy kind (sim etype), in the order a campaign meets them.
//   name   shown name          role  one word for its job in a fight
//   lore   one line of story   text  its attacks and the tells that warn of them
const ENEMY_ROWS = [
  ['boar', 'Thorn Boar', 'Rusher', 'The first beast of the Wood to turn. It still charges like it is being hunted.', 'Runs straight at the nearest hero and bites on contact for 8. No warning: keep moving and it never lands twice in a row.'],
  ['mantis', 'Spitting Mantis', 'Ranged', 'It waits in the ferns, folded like a prayer, and spits before it is seen.', 'Keeps about 3.5 u back and spits one shot for 10. A warning mark shows the shot for 0.7 s before it flies: step off the line.'],
  ['quillback', 'Quillback', 'Charger', 'Curled into a ball of quills, it rolls at anything that moves.', 'Locks a warning lane up to 6 u long, then rolls down it for 12. A charge that hits a wall leaves it stunned for half a second.'],
  ['rotcap', 'Rotcap', 'Bursting', 'A toadstool that learned to walk. It bursts like any mushroom, only angrier.', 'Bites for 7, but its death is the danger: the cap bursts in a warning ring for 10 and leaves slowing spores. Kill it from range.'],
  ['wasp', 'Briar Wasp', 'Swarm', 'They nest in briars and never come alone.', 'Comes in threes. Each sister darts down a short warning lane for 4, one after another, so the swarm reads as a rolling string of lanes.'],
  ['thornling', 'Thornling', 'Gardener', 'A bramble sprite that plants a thicket wherever it stands still.', 'Never bites. It roots and plants thorn patches that slow by 35% and prick for 3. Up to three patches at once; chase it through them or kill it fast.'],
  ['toad', 'Mire Toad', 'Artillery', 'It swallows the millrace mud and throws it back.', 'Lobs a glob at where a hero stood. The warning ring on the floor is where it lands, for 12, leaving a slowing slick. It flies over barricades.'],
  ['moth', 'Gloam Moth', 'Flier', 'Drawn to the party lanterns, and to whatever holds them.', 'Circles a hero, then swoops down a long warning lane for 9 to every hero it crosses. Flies over hazards and blockers.'],
  ['snail', 'Lantern Snail', 'Mender', 'Its shell carries a lantern it never lets go out.', 'No attack. Every 4 s its lantern swells and mends its kin within 3.2 u for 12. Kill it first or the wave refuses to die.'],
  ['crab', 'Weir Crab', 'Shield', 'It holds its claws up like a door and scuttles sideways round any blade.', 'Blocks arrows and bolts from the front. Within 1.3 u it snaps in a warning cone for 10, and its guard is down for a moment after.'],
  ['lamprey', 'Bog Lamprey', 'Ambusher', 'It waits under the water where the millrace runs wrong.', 'Hidden and untouchable until it surfaces. Then it lunges down a warning lane for 12 and lies beached on the bank: the time to hit it.'],
  ['ram', 'Barrow Ram', 'Heavy', 'It walks where its horns point, and its horns point at you.', 'Blocks arrows and bolts from the front and turns slowly. Its horn slam is a warning cone for 18. Fight it from the flanks.'],
  ['mole', 'Grave Mole', 'Burrower', 'It tunnels through the grave dirt, untouched by blade or arrow.', 'Burrows toward a hero, then a warning ring marks where it will burst out, for 11. It stays above ground for 2 s afterwards.'],
  ['crow', 'Barrow Crow', 'Ranged', 'A carrion bird that picks the barrow clean and calls to its kin.', 'Keeps its distance, caws a warning cone, then fires a fan of three feathers for 5 each. Sidestep wide, not a little.'],
  ['brood', 'Brood Spider', 'Splitter', 'A bloated grave spider, heavy with young.', 'Bites for 8. When it dies it bursts into two fast Broodlings that bite for 3. The room holds until the young are dead too.'],
  ['gravewisp', 'Grave Wisp', 'Warder', 'A pale light that will not let the dead be hurt.', 'No attack. It tethers to a nearby enemy and makes it immune while the tether holds. Kill the wisp, or wait out the ward.'],
  ['knight', 'Bone Knight', 'Elite heavy', 'A barrow lord in a rusted helm, still keeping a watch nobody asked for.', 'Always elite. Its shield blocks arrows and blades from the front. The overhead slam has the longest wind-up in the game: a warning ring for 12.'],
  ['keener', 'Ash Keener', 'Mourner', 'It mourns every barrow it passes, and it wants company in its grief.', 'Keeps a few steps back, then wails down a long, narrow warning cone for 10. Whoever the wail finds is slowed by 40% for 2 s. Step out of the cone.'],
  ['sexton', 'Barrow Sexton', 'Trapper', 'The barrow still has a gravedigger. He has stopped waiting for the dead to come to him.', 'Never strikes in person. It kneels and buries bone snares on the floor, three at most. Step on one and its jaws rise in a warning ring, then snap for 11 and hold you with a 60% slow. Step off before they close. Kill it and its snares crumble.'],
  ['husk', 'Hollow Husk', 'Rusher', 'A beast emptied out, with the Heart beating violet in its veins.', 'Bites for 9. Every husk surges on the same heartbeat; their veins swell just before. Step back on the pulse and swing between beats.'],
  ['lancer', 'Vein Lancer', 'Ranged', 'It throws a lance of the Heart itself.', 'Stands still and aims a warning lane up to 7 u long, then every hero inside takes 10 at once. Nothing flies: step out of the lane.'],
  ['geode', 'Geode Brute', 'Heavy', 'Violet crystal has grown right through it. It does not seem to mind.', 'Slams a warning ring for 14 that throws three crystal shards, each landing a second later for 8 and leaving slowing crystal.'],
  ['censer', 'Heart Censer', 'Mender', 'A censer on a chain of bone, swinging violet smoke over the fight.', 'No attack. Its coals flare, then it mends every enemy near it by 15% of their health. A stun spills the mend. Kill it first.'],
  // New enemies, Wood and Mill (docs/WOOD_MILL_ENEMIES.md).
  ['owl', 'Shriek Owl', 'Screamer', 'It hunted mice in the Hollow Wood. Now it hunts whatever still has a heartbeat.', 'Flies high and keeps its distance. It hangs still and marks a long, narrow warning cone, then shrieks for 8 and slows every hero in it. Sidestep, do not back away.'],
  ['lasher', 'Vine Lasher', 'Puller', 'A bramble pod that learned to reach. It drags its meals home.', 'Coils a whip-vine and marks a warning lane up to 5 u long. The lash hits for 9 and yanks every hero in it toward the pod, into whatever lies between.'],
  ['leech', 'Mire Leech', 'Latcher', 'Fat with millrace water and something darker, it never lets go willingly.', 'Leaps down a short warning lane. A hero it touches is bitten for 5, slowed and drained for 3 twice a second while it heals. Dodge, or hit it (an ally can too), to shake it off.'],
  ['miller', 'Drowned Miller', 'Bruiser', 'The last miller of the Sunken Mill, still at work after the water took him.', 'Plods straight at you. Close in, he whirls his millstone in a warning ring for 13: walk out of it. At range he throws a flour sack at a warning ring for 10 that leaves slowing paste.'],
  ['bloom', 'Heart Bloom', 'Pulse', 'A flower of violet crystal that grows wherever the Heart beats closest to the floor.', 'Creeps in on its roots, then takes root and never moves again. On every second heartbeat it opens in a warning ring round itself and snaps shut for 12. Every bloom in the room beats together.'],
  ['siphon', 'Vein Siphon', 'Drinker', 'A sac of the Heart\'s blood that never has enough of it.', 'Lashes a tendril down a warning lane for 5 and latches onto the first hero it finds, then drinks 2 every half second and heals by as much. Walk well away from it to snap the tether, or kill it.'],
];
// Act V, the Still Spire (docs/ACT_V.md): listed only while Level V is
// played (the ?act5=1 preview until slice 3 opens it), so the Journal never
// shows pages a player cannot fill.
const SPIRE_ROWS = [
  ['kite', 'Gust Kite', 'Diver', 'Cane and old sailcloth that the Spire\'s wind will not let fall.', 'Circles high, then hangs and marks a warning lane through a hero. It dives down it for 9 to every hero it crosses and lands in a heap: hit it then, it takes half again as much on the floor.'],
  ['chime', 'Chime Wraith', 'Toller', 'A shroud with a cracked bell where its heart should be. It still rings the hours nobody keeps.', 'Drifts in close, then lifts its bell in a warning ring round itself. The toll hits for 6 and slows every hero inside by 40% for 2 s. Step out of the ring; a stun chokes the bell.'],
  ['gargoyle', 'Gargoyle', 'Sleeper', 'It watched the gods sit down. It has been waiting for someone to stand up.', 'Stone until a hero comes close or strikes it. Then it cracks free in a warning ring for 12, stalks you and slams a ring in front of it for 13. Leave it alone long enough and it turns back to stone.'],
  ['hanger', 'Rope Hanger', 'Swinger', 'A bell-ringer who never let go of the rope.', 'Grips its rope and marks a long warning lane through a hero, then swings down it over everything in the way. Every hero it passes takes 8 and is thrown aside.'],
  // Plan 4 slice 7: two more of the Spire's own.
  ['vane', 'Vane Cock', 'Volley', 'A brass weathercock torn off a steeple. It still turns to face whatever is coming.', 'Keeps its distance, then swings into the wind and marks a long, narrow warning lane through a hero. Three gust darts fly down it for 7 each: step out of the lane and they all miss.'],
  ['sacristan', 'Bell Sacristan', 'Warder', 'A stone acolyte of the belfry who still rings the hours for gods who stopped listening.', 'Hangs back behind its kin and rings a pale ring round itself: every other enemy inside is hushed and takes 40% less damage for 5 s. Kill it first, or stun it mid-ring. Alone, it raps you with its bell for 7.'],
];
// The Ember Kiln (docs/KILN.md, content plan 5 slice 7): listed only while
// the Kiln plays (the ?act6=1 preview until slice 8 opens its road), so the
// Journal never shows pages a player cannot fill.
const KILN_ROWS = [
  ['newt', 'Ember Newt', 'Skitterer', 'A fire lizard that basked on the kiln floor while the bells were fired. It never left the warmth.', 'Skitters in fast and low, crouches and marks a short warning lane through a hero, then shoots down it for 7 to every hero it crosses. It rests a beat where it stops. One good hit kills it: watch for three lunging together.'],
  ['slag', 'Slag Golem', 'Furnace', 'The kiln\'s waste, raked out and heaped up until the hollow song found it and stood it up.', 'Its crust turns blows: it takes 40% less damage. In close it rears and slams a warning ring in front of it for 14, splashing a pool of slag that slows. The slam cracks its crust: for 2 s its core glows and it takes 40% more. Hit it then.'],
  ['bellows', 'Bellows Imp', 'Stoker', 'A stoker of the gods\' kiln with its bellows still strapped on. It keeps every fire roaring.', 'Keeps its distance, plants its feet and pumps its bellows behind a wide warning cone. The fan blows a sheet of sparks down the cone for 8. Step out to the side, or close in: it scurries back from a hero up close, and a stun chokes the fan.'],
  ['cindermoth', 'Cinder Moth', 'Kindler', 'A moth of glowing ash. Where it settles, something starts to burn.', 'Flutters straight at a hero and kindles in a small warning ring round itself, then flares for 6. The flare burns it out: for 2.5 s it is a grey husk drifting away, and it takes double damage. They come several at once.'],
];
const ROWS = [...ENEMY_ROWS, ...(ACT_IDS.includes(5) ? SPIRE_ROWS : []), ...(ACT_IDS.includes(6) ? KILN_ROWS : [])];
// The same pages as display data, exported so tools/i18n-extract.mjs collects
// their text with or without the flag.
export const SPIRE_PAGES = Object.freeze(SPIRE_ROWS.map(([id, name, role, lore, text]) => Object.freeze({ id, name, role, lore, text })));
export const KILN_PAGES = Object.freeze(KILN_ROWS.map(([id, name, role, lore, text]) => Object.freeze({ id, name, role, lore, text })));

// CHAMPION ROOMS (docs/CHAMPIONS.md): one row per champion, keyed by kind;
// its land is its act. They are counted like enemies (met, felled).
const CHAMPION_ROWS = {
  briar_knight: ['A knight of the old Hearth whose armour the Wood grew through. He still keeps his vigil.', 'Bramble Charge: marks a long lane at the farthest hero and runs it down for 16. Thorn Ring: a warning ring round him bursts for 14 and leaves a slowing thicket. Below half health he rages: faster, and his moves come sooner.'],
  sluice_warden: ['The keeper of the mill race, iron-shod and patient as the water.', 'Floodgate: a warning cone in front of him floods for 18. Undertow: a ring under a hero wells up for 12 and leaves slick water. Below half health he rages.'],
  bone_reeve: ['The barrow\'s bailiff, who still collects what the dead are owed.', 'Reaping Sweep: a wide warning cone in front of him for 16. Grave Lance: bone spikes burst down a warning lane for 14. Below half health he rages.'],
  hollow_choir: ['Three voices of the Heart sung into one crystal body. It hums even when it is still.', 'Shard Hymn: a narrow warning cone, then five crystal shards for 9 each. Discord: a ring round it bursts for 15. It keeps its distance, and below half health it rages.'],
  gale_herald: ['The gods\' own crier, carved to stand on the belfry roof and call the winds in. It never stopped calling.', 'Gale Call: a warning cone in front of its horn blasts for 12 and throws you down the wind. Stoop: it takes wing over a warning ring under a hero and lands on it for 17. Below half health it rages.'],
  // Second champions (plan 4 slice 8): one more for each of Acts I to IV.
  moss_hart: ['The Wood\'s eldest hart, so long asleep in the clearing that the moss grew over it. Now it walks, and the moss walks with it.', 'Antler Toss: a wide warning cone at its antlers hits for 15 and tosses you away. Hart\'s Leap: a warning ring under the farthest hero; it gathers itself, bounds over and lands on it for 15, leaving moss that slows. Below half health it rages.'],
  lockkeeper: ['The mill\'s lock-keeper, who never let a boat through without his toll. He kept the key when the water rose.', 'Chain Hook: a warning lane at a hero; the key flies down it for 10 and drags you to his feet. Lock Turn: a ring round him locks shut for 16 and slows you hard. Step out of the lane. Below half health he rages.'],
  gravebell_ringer: ['The barrow\'s bell-ringer, who rang the dead to their graves and still rings for the living.', 'Death Knell: a wide ring round it tolls for 11 and slows every hero inside. Grave Call: a warning ring under a hero bursts in ash for 14 and smoulders, slowing. Below half health it rages.'],
  vein_matron: ['The mother of the Heart\'s veins, crowned in crystal, who feeds every root that grows through the dark.', 'Vein Lash: a warning lane at a hero cuts for 13, and she drinks some health for every hero it cuts. Heart Pulse: a ring round her beats for 14, then eight crystal shards fly out all round, 7 each. Below half health she rages.'],
  // The Still Spire's second (content plan 5 slice 2).
  bell_abbess: ['The abbess of the gods\' belfry, who rang the hours for them until they fell still, and keeps the vigil still. She has never let go of the rope.', 'Rope Swing: a warning lane at a hero; she swings down it on the great bell\'s rope for 14 and knocks you aside. Vesper Peal: a warning cone in front of her hand-bell rings for 11 and rings you still, slowing you hard. Below half health she rages.'],
};

// One row per boss kind, in level order.
const BOSS_ROWS = {
  stag: ['Lord of the Hollow Wood, crowned in dead antlers.', 'Antler Quake: a warning ring under a hero bursts for 15. Close in, it tramples for 12 with no warning. Calls boars and a mantis at 75%, 50% and 25% health.'],
  thornmother: ['A bramble-backed sow who turns the clearing into a thicket.', 'Flings three seed pods that root thorn patches. Her Briar Charge runs down a long warning lane for 18 and tears up every patch it crosses.'],
  heron: ['A gaunt wading bird whose bill is a spear.', 'Bill Spear: drives down a warning lane for 16. Wingbeat punishes crowding it. During add waves it hides under the water and resurfaces in a burst.'],
  millwheel: ["The mill's own wheel, torn off its axle and turned against you.", 'Rolls round the rim of the room. It fires fans of cog shards, and its Crosscut rolls straight across the room for 14, grinding every barricade in the way.'],
  wyrm: ['An ash-scaled grave worm that swims through the burial mound.', 'Ash Breath: a warning cone for 14. It burrows, then bursts out of a warning ring for 16 and lies exposed afterwards. Breathes faster below half health.'],
  lichram: ['The skeleton of the first ram, walked out of its mound.', 'Its horns block arrows and bolts from the front. Grave Call cracks three graves around a hero and raises a Grave Mole. Bone Rush charges along its horns.'],
  cantor: ["Not a god but a god's echo, singing verses it stole from the lands above.", 'Hollow Note: a warning ring for 10 that later throws crystal shards. Sung Lance: a warning lane for 16. Each verse calls the beasts of one land above.'],
  // Third bosses (docs/THIRD_BOSSES.md).
  gloamwolf: ['The Hollow Wood\'s oldest hunter, grey with years and hollow with the song.', 'Pounce: crouches, then lands in a warning ring for 15. Rend: a warning cone at its jaws for 13. Moon Howl: a ring round it for 8 that slows, then it pounces twice in a row.'],
  mireking: ['The millpond\'s old toad, grown vast on silt and crowned with the mill\'s grate.', 'Tongue Lash: a warning lane for 14 that drags you in. Belly Flop: lands in a warning ring for 16 and leaves mire. Swallow: its throat swells and pulls you close, then a ring round it snaps shut for 18.'],
  ashraven: ['The barrow\'s carrion bird, grown huge on the ash of the pyres and masked in bone.', 'Carrion Dive: rises, then dives down a warning lane for 15. Wing Gust: a warning cone at its beak for 10 that blows you away. Omen: a warning ring that follows you, then locks and calls the crows down for 14.'],
  veinweaver: ['The Heart\'s own spider, woken once the Cantor and the Colossus have fallen, spinning violet veins through the dark.', 'Bind: a warning lane for 9 that ties you to it for a few seconds. Heartbeat Slam: a ring round it for 18; at the end of the thread you are out of reach. Brood Sacs: three warning rings for 10 that leave webs.'],
  colossus: ['A giant of black rock and pale crystal that the Heart grew to sing through.', 'Fissure: a warning lane for 17 that leaves crystal behind. Geode Rain drops four warning rings. Too close, it bursts round itself for 20.'],
  // Act V (docs/ACT_V_BOSSES.md).
  hush: ['The silence that stopped the gods: the quiet the Hollow Cantor sang into, sitting in their belfry beside them.', 'Still Note: a warning ring for 11 that slows. Unringing: a warning lane for 15. At each Stillness it calls the Spire\'s creatures, then the Great Hush: a huge ring round it for 20. Walk to the walls, then hit it while it sinks.'],
  skyhorn: ['The Spire\'s warden, an ibex of the high ledges with horns cast in bell bronze.', 'Horn Rush: paws, then charges down a warning lane for 12 and throws you aside. Into a wall it stands dazed. Bell Toll: a ring round it for 12. From half health it leaps onto the farthest hero.'],
  // Content plan 5 slice 1 (docs/THIRD_BOSSES.md): the Spire's third.
  hourwarden: ['The gods\' clock, a bronze clock-jack that struck the hours until they sat down to watch. The hollow song wound it again.', 'Pendulum: a warning lane for 14, then it swings back down the same lane for 10. Hand Sweep: a warning cone at its hands for 13 that throws you back. Toll of the Hours: weights fall on warning rings round it for 11 each, one hour after another; then it runs down and takes more damage.'],
};

// The lands, in campaign order, and which of them each enemy lives in (its
// level rosters; a boss's adds borrow it from there).
export const JOURNAL_LANDS = Object.freeze(ACT_IDS.map((a) => Object.freeze({ level: a, name: LEVELS[a].name })));
const landsOf = (etype) => ACT_IDS.filter((a) => (campaignLevel(LEVELS[a]).roster ?? {})[etype] > 0);

export const BESTIARY = Object.freeze([
  ...ROWS.map(([id, name, role, lore, text]) => Object.freeze({ id, boss: false, name, role, lore, text, lands: Object.freeze(landsOf(id)) })),
  ...CHAMPION_LIST.map((c) => {
    const row = CHAMPION_ROWS[c.id] ?? ['', ''];
    return Object.freeze({ id: c.id, boss: false, champion: true, name: c.name, role: 'Champion', lore: row[0], text: row[1], lands: Object.freeze([c.act]) });
  }),
  // (Each boss is listed once, at its first level.)
  ...ACT_IDS.flatMap((a) =>
    (LEVELS[a].bosses ?? []).map((b) => {
      const row = BOSS_ROWS[b.kind] ?? ['', ''];
      return Object.freeze({ id: b.kind, boss: true, name: b.name, role: 'Boss', lore: row[0], text: row[1], lands: Object.freeze([a]) });
    })
  ).filter((b, i, all) => all.findIndex((o) => o.id === b.id) === i),
]);
export const BESTIARY_IDS = Object.freeze(BESTIARY.map((b) => b.id));
export const ENEMY_JOURNAL_IDS = Object.freeze(BESTIARY.filter((b) => !b.boss).map((b) => b.id));
export const BOSS_JOURNAL_IDS = Object.freeze(BESTIARY.filter((b) => b.boss).map((b) => b.id));
// A Broodling is the Brood Spider's young: its kills count on the spider's page.
export const JOURNAL_ALIAS = Object.freeze({ broodling: 'brood' });
