// Relics and curses (docs/CONTENT_PLAN.md §5, "the collect half of the loop").
//
// RELICS are run-long party buffs. A relic pick (one of three, no reroll)
// opens after the draft of:
//   - room 1 of every level (a free relic: one per level, three per campaign);
//   - any CURSED room the party cleared (the curse's reward).
// CURSES are opt-in risk: on each path screen one of the two doors may carry a
// curse (relic stream roll). Walking through it applies the curse to that
// room only; clearing the room pays a relic pick. A defend soft-fail forfeits
// it with the room's reward.
//
// Determinism: every roll here (curse on a door, which door, which curse,
// which three relics) comes from the RELIC STREAM, seeded from the run seed
// with no gameplay draw (hash32(seed, 'RELC')), so turning relics on never
// moves the gameplay stream's run frame, waves or drafts. Relic procs that go
// through the combat pipeline (Hearthstone's heal, Thorn Mail's reflect) draw
// their crit rolls from the gameplay stream like any other instance.
//
// Slice 2 (docs/RELICS.md "Slice 2"): two more relics (Ash Feather, Spore
// Sac), a sixth room curse (Short Fuse), MAJOR curses that bind the party for
// the rest of the run and pay a greater relic (rare or legendary), relic
// drops from elite kills (one roll per elite, at most one drop a level) and a
// relic shelf at the room-7 peddler. Every new roll is on the relic stream.
//
// Scope: relics are ON for campaign runs (Begin Run, the Level Select) and
// OFF for the legacy single-level startRun() the act runner, the golden
// traces and ?run=1 use; cmd('relics', true) turns them on for a probe. With
// relics off nothing here runs, no event fires and the run view carries no
// `relics` key, so the 9 golden traces hash exactly as before.
import { createGameplayRng } from '../core/rng.js';
import * as STATUS from './status.js';
import { dailyPick } from '../data/daily.js';
import { CLASS_TECH } from '../data/classes.js';
import { CONSUMABLES, shareFor } from './consumables.js';
import { isChampionKind } from './champions.js';

const r2 = (v) => Math.round(v * 100) / 100;

// rarity -> offer weight (the relic stream draws without replacement).
export const RELIC_WEIGHT = Object.freeze({ common: 6, rare: 3, legendary: 1 });

// Every number a relic changes lives here (the UI prints `text`).
export const RELICS = Object.freeze({
  whetstone: { name: 'Whetstone', rarity: 'common', text: 'The party deals 12% more damage.', dealt: 0.12 },
  ember_tooth: { name: 'Ember Tooth', rarity: 'common', text: 'Party critical hits deal ×2 instead of ×1.5.', critMul: 0.5 },
  hawk_feather: { name: 'Hawk Feather', rarity: 'common', text: '+7% critical chance on party hits and heals.', crit: 0.07 },
  lantern_oil: { name: 'Lantern Oil', rarity: 'common', text: 'Healing on the party is 20% stronger.', heal: 0.2 },
  millstone: { name: 'Millstone', rarity: 'common', text: 'Party hits knock enemies back 75% farther.', kb: 0.75 },
  grave_coin: { name: 'Grave Coin', rarity: 'common', text: '+6 Glint every time a combat room is cleared.', glint: 6 },
  peddlers_seal: { name: "Peddler's Seal", rarity: 'common', text: "Your shelf at the peddler is 25% cheaper.", shop: 0.25 },
  wyrm_scale: { name: 'Wyrm Scale', rarity: 'rare', text: 'The party takes 15% less damage.', taken: -0.15 },
  hearthstone: { name: 'Hearthstone', rarity: 'rare', text: 'Clearing a room heals the party for 25% of max HP.', clearHeal: 0.25 },
  heron_quill: { name: 'Heron Quill', rarity: 'rare', text: 'Every room opens with all party skills ready.', freshCds: true },
  thorn_mail: { name: 'Thorn Mail', rarity: 'rare', text: 'Enemies that hit the party take 60% of it back.', thorns: 0.6 },
  leech_fang: { name: 'Leech Fang', rarity: 'rare', text: 'Each party kill heals the most wounded member for 4 HP.', leech: 4 },
  last_light: { name: 'Last Light', rarity: 'legendary', text: 'Once per room, each member who would fall stays up at 1 HP.', lastLight: true },
  glass_heart: { name: 'Glass Heart', rarity: 'legendary', text: 'The party deals 35% more damage but takes 20% more.', dealt: 0.35, taken: 0.2 },
  ashen_crown: { name: 'Ashen Crown', rarity: 'legendary', text: '+8% party damage for every curse taken this run (up to +40%).', perCurse: 0.08, perCurseMax: 5 },
  // Slice 2.
  ash_feather: { name: 'Ash Feather', rarity: 'common', text: 'Dodges recover 25% faster.', dodgeCd: -0.25 },
  spore_sac: { name: 'Spore Sac', rarity: 'rare', text: 'Party kills leave no hazards behind and puff spores that slow nearby enemies by 35%.', spores: true },
  // Batch 3 (docs/RELICS.md "Batch 3"): synergy relics. A `cls` relic is a
  // CLASS relic, offered only while that class stands in the party.
  wardens_oath: { name: "Warden's Oath", rarity: 'rare', cls: 'tank', text: 'Each enemy the Tank taunts heals the Tank for 6 HP (once per enemy every 3 seconds).', oath: Object.freeze({ heal: 6, perTick: 4, everyTicks: 180 }) },
  fox_ribbon: { name: 'Fox Ribbon', rarity: 'common', cls: 'swordsman', text: "The Swordsman's critical hits cut again for half the damage.", ribbon: 0.5 },
  fletchers_knot: { name: "Fletcher's Knot", rarity: 'rare', cls: 'archer', text: "The Archer's hits on an exposed enemy ricochet to another enemy nearby for 60% of the damage.", knot: Object.freeze({ frac: 0.6, range: 3.2 }) },
  mercy_bell: { name: 'Mercy Bell', rarity: 'common', cls: 'healer', text: "The Healer's healing past full health becomes a shield, up to 20% of max HP.", bell: Object.freeze({ cap: 0.2, ticks: 300 }) },
  kindling_coal: { name: 'Kindling Coal', rarity: 'rare', text: 'Party critical hits flare, dealing 8 damage to other enemies nearby (16 with Ember Tooth).', kindle: Object.freeze({ dmg: 8, radius: 1.6, max: 4, emberMul: 2 }) },
  sun_chalice: { name: 'Sun Chalice', rarity: 'legendary', text: 'Party healing also sears the nearest enemy for the health it restores.', chalice: Object.freeze({ range: 4.5, min: 1 }) },
  cinder_pact: { name: 'Cinder Pact', rarity: 'legendary', text: 'In a cursed room the party deals 30% more damage and takes 15% less. Each major curse held adds 5% damage everywhere.', pact: Object.freeze({ dealt: 0.3, taken: -0.15, perMajor: 0.05 }) },
  bounty_writ: { name: 'Bounty Writ', rarity: 'common', text: 'Each elite the party kills pays 6 Glint, plus 4 for every affix it carried.', bounty: Object.freeze({ base: 6, perAffix: 4 }) },
  huntsmans_horn: { name: "Huntsman's Horn", rarity: 'rare', text: 'In Hunt and Purge rooms the party deals 25% more damage, and winning one pays 15 more Glint.', horn: Object.freeze({ dealt: 0.25, glint: 15 }) },
  pilgrims_lamp: { name: "Pilgrim's Lamp", rarity: 'common', text: 'Entering an event room heals the party for 30% of max HP and pays 10 Glint.', lamp: Object.freeze({ heal: 0.3, glint: 10 }) },
  // THE TIDECALLER (docs/TIDECALLER.md): her two class relics, offered only
  // while she stands in the party (so never to the default four).
  otters_pearl: { name: "Otter's Pearl", rarity: 'common', cls: 'tidecaller', text: "The Tidecaller's crashes heal her for 2 HP for every enemy they hit.", pearl: Object.freeze({ heal: 2 }) },
  // (No dice: every fourth qualifying hit spreads, so holding it never moves
  // the relic stream.)
  millrace_charm: { name: 'Millrace Charm', rarity: 'rare', cls: 'tidecaller', text: 'Every fourth party hit on a soaked enemy spreads the soak to another enemy within 1.5 u.', charm: Object.freeze({ every: 4, range: 1.5 }) },
  // THE BELLWRIGHT (docs/BELLWRIGHT.md "Tolly in the world"): her two class
  // relics, offered only while she stands in the party. No dice either.
  bell_rope: { name: 'Bell-Rope', rarity: 'common', cls: 'bellwright', text: "The Bellwright's Peals and Carillons heal her for 3 HP for every bell they ring.", rope: Object.freeze({ heal: 3 }) },
  verdigris_clapper: { name: 'Verdigris Clapper', rarity: 'rare', cls: 'bellwright', text: "Every fourth toll of the Bellwright's bells that strikes an enemy rings again: 6 damage to every enemy in that bell's ring.", clapper: Object.freeze({ every: 4, dmg: 6 }) },
  // Batch 4 (docs/RELICS.md "Batch 4"): relics that answer the rooms of
  // content plan 3 (Escort, Hold, champions, keys, vaults, objective rooms,
  // event rooms) and the curses themselves.
  shepherds_crook: { name: "Shepherd's Crook", rarity: 'common', text: 'The pilgrim you escort has 50% more health, and bringing it home pays 15 Glint.', crook: Object.freeze({ hp: 0.5, glint: 15 }) },
  vigil_candle: { name: 'Vigil Candle', rarity: 'rare', text: 'In Escort and Hold rooms the party takes 20% less damage.', vigil: Object.freeze({ taken: -0.2 }) },
  warding_chalk: { name: 'Warding Chalk', rarity: 'rare', text: "A Hold room's sigil ring takes twice as long to go out, and party members inside it heal 2 HP a second.", chalk: Object.freeze({ fadeMul: 2, heal: 2, everyTicks: 60 }) },
  champions_laurel: { name: "Champion's Laurel", rarity: 'rare', text: "The party deals 30% more damage to champions, and a champion's chest pays 25 Glint.", laurel: Object.freeze({ dealt: 0.3, glint: 25 }) },
  jailers_ring: { name: "Jailer's Ring", rarity: 'common', text: 'Picking up a key heals the party for 15% of max HP and pays 10 Glint.', ring: Object.freeze({ heal: 0.15, glint: 10 }) },
  vault_ledger: { name: 'Vault Ledger', rarity: 'rare', text: 'Glint piles in a vault pay twice as much.', ledger: Object.freeze({ mul: 2 }) },
  banner_pennant: { name: 'Banner Pennant', rarity: 'common', text: 'Winning a Hunt, Purge, Escort or Hold room heals the party for 25% of max HP.', pennant: Object.freeze({ heal: 0.25 }) },
  wanderers_token: { name: "Wanderer's Token", rarity: 'common', text: 'Each event offer the party takes pays 12 Glint.', token: Object.freeze({ glint: 12 }) },
  geode_heart: { name: 'Geode Heart', rarity: 'legendary', text: 'A cleared cursed room pays a greater relic pick (rare or legendary) and 20 Glint.', geode: Object.freeze({ glint: 20 }) },
  saints_ashes: { name: "Saint's Ashes", rarity: 'legendary', text: 'Major curses weigh half as much on the party.', ashes: Object.freeze({ scale: 0.5 }) },
  // THE STILL SPIRE (plan 4 slice 7, docs/RELICS.md "The Spire's pair"): the
  // wind off the belfry and the quiet before a blow. Heirlooms like any
  // relic once found (data/unlocks.js builds one per relic).
  weathercock_plume: { name: 'Weathercock Plume', rarity: 'common', text: 'Dodges recover 15% faster, and party hits knock enemies back 30% farther.', dodgeCd: -0.15, kb: 0.3 },
  hushbell: { name: 'Hushbell', rarity: 'rare', text: 'The party deals 25% more damage to an enemy while its attack warning is up.', hush: Object.freeze({ dealt: 0.25 }) },
  // Batch 5 (docs/RELICS.md "Batch 5"): relics that answer content plan 4
  // (tonics and bombs, shrines, the second champions, the Spire's gust
  // vents, the bells and the vows). No dice: every one reads the bus or a
  // count, so holding one never moves the relic stream.
  brewers_satchel: { name: "Brewer's Satchel", rarity: 'common', text: 'Each tonic or bomb a hero uses also heals every other hero for 12% of max HP.', satchel: Object.freeze({ heal: 0.12 }) },
  votive_ribbon: { name: 'Votive Ribbon', rarity: 'common', text: "A shrine's blessing lasts twice as long, and each offering heals the party for 20% of max HP.", votive: Object.freeze({ blessMul: 2, heal: 0.2 }) },
  // (Small fixes 5: in a fight with no gust vent the glass blows its own
  // gust, so it works in every land; a vent room keeps the vents' gusts.)
  stormglass: { name: 'Stormglass', rarity: 'common', text: 'Gust vents turn on the enemy: each gust strikes every enemy in its lane for 12% of its max HP (6% for elites, 2% for champions and bosses). In a fight with no gust vent, the glass blows a gust of its own every 8 seconds, from you down a lane to the nearest enemy.', storm: Object.freeze({ dmg: 0.12, elite: 0.06, big: 0.02, everyTicks: 480, gatherTicks: 40, len: 9, w: 1.6, retryTicks: 30 }) },
  twin_fuse: { name: 'Twin Fuse', rarity: 'rare', text: 'A thrown bomb bursts a second time 0.6 s after it lands, for half its damage.', fuse: Object.freeze({ delayTicks: 36, frac: 0.5 }) },
  trophy_cord: { name: 'Trophy Cord', rarity: 'rare', text: '+6% party damage for every champion the party has felled this run (up to +30%).', trophy: Object.freeze({ per: 0.06, max: 5 }) },
  // Offered only while the run wears a vow (never the Daily's omen).
  oathkeepers_brand: { name: "Oathkeeper's Brand", rarity: 'rare', vow: true, text: '+4% party damage for every Vow level the run wears (up to +40%).', brand: Object.freeze({ per: 0.04, max: 10 }) },
  bottomless_flask: { name: 'Bottomless Flask', rarity: 'legendary', text: "Once a room, each hero's first tonic or bomb comes back to their slot 10 s later.", flask: Object.freeze({ delayTicks: 600 }) },
  tenor_bell: { name: 'Tenor Bell', rarity: 'legendary', text: "Every 10th enemy the party fells in a room rings the great bell: every enemy in the room takes 12 damage and is slowed 40% for 2 s. Kills inside the Bellwright's bell rings count twice.", tenor: Object.freeze({ every: 10, dmg: 12, slow: 0.4, ticks: 120 }) },
});
// Batch 3: the class relics (a relic -> the class it needs in the party).
export const CLASS_RELICS = Object.freeze(Object.fromEntries(Object.keys(RELICS).filter((id) => RELICS[id].cls).map((id) => [id, RELICS[id].cls])));
export const RELIC_IDS = Object.freeze(Object.keys(RELICS));

// A curse lasts its room only. `diff` reshapes the room's difficulty numbers
// (sim/run.js applies it to a copy before the wave plan is rolled).
export const CURSES = Object.freeze({
  elite_tide: { name: 'Elite Tide', text: 'Elites are far more common in this room.', diff: { eliteAdd: 0.35 } },
  crowded: { name: 'Crowded', text: 'Every wave in this room is half again as large.', diff: { budgetMul: 1.5 } },
  iron_hide: { name: 'Iron Hide', text: 'Enemies in this room have 40% more HP.', diff: { hpMul: 1.4 } },
  sharp_fangs: { name: 'Sharp Fangs', text: 'Enemies in this room deal 35% more damage.', diff: { dmgMul: 1.35 } },
  famine: { name: 'Famine', text: 'Healing on the party is 60% weaker in this room.', healCut: 0.6 },
  short_fuse: { name: 'Short Fuse', text: 'Enemy attack warnings in this room are 20% shorter (never under 0.6 s).', fuse: { mul: 0.8, minTicks: 36 } },
  // MAJOR curses: taken on a door like any curse, but they bind the party for
  // the rest of the run (across levels) and the room they open pays a GREATER
  // relic pick (rare and legendary only). `diff` reshapes every combat room;
  // `taken` / `healCut` hold everywhere, the boss room included.
  hunted: { name: 'Hunted', major: true, text: 'Elites are more common in every combat room for the rest of the run.', diff: { eliteAdd: 0.15 } },
  thick_hide: { name: 'Thick Hide', major: true, text: 'Enemies in every combat room have 15% more HP for the rest of the run.', diff: { hpMul: 1.15 } },
  brittle_bones: { name: 'Brittle Bones', major: true, text: 'The party takes 12% more damage for the rest of the run.', taken: 0.12 },
  withering: { name: 'Withering', major: true, text: 'Healing on the party is 25% weaker for the rest of the run.', healCut: 0.25 },
  // Batch 4: two room curses and two major ones.
  restless: { name: 'Restless', text: 'Waves in this room arrive 35% sooner.', diff: { waveMul: 0.65 } },
  kindred_blood: { name: 'Kindred Blood', text: 'When an enemy falls in this room, enemies within 2.5 u heal 10% of their max HP.', kindred: Object.freeze({ heal: 0.1, radius: 2.5 }) },
  teeming: { name: 'Teeming', major: true, text: 'Every wave is 12% larger for the rest of the run.', diff: { budgetMul: 1.12 } },
  paupers_mark: { name: "Pauper's Mark", major: true, text: 'The party gains 20% less Glint for the rest of the run.', glintCut: 0.2 },
  // Batch 5: two room curses and one major one.
  corked: { name: 'Corked', text: 'Tonics and bombs cannot be used in this room, and enemies here have 10% more HP.', corked: true, diff: { hpMul: 1.1 } },
  tolling_dead: { name: 'Tolling Dead', text: 'Each enemy that falls in this room tolls a knell: 0.8 s later it strikes heroes within 1.6 u for 10% of their max HP.', toll: Object.freeze({ delayTicks: 48, radius: 1.6, dmg: 0.1, max: 6 }) },
  dulled_edge: { name: 'Dulled Edge', major: true, text: 'Party critical hits deal ×1.25 instead of ×1.5 for the rest of the run.', critMul: -0.25 },
});
// The room curses a door can carry, and the major ones.
export const CURSE_IDS = Object.freeze(Object.keys(CURSES).filter((id) => !CURSES[id].major));
export const MAJOR_CURSE_IDS = Object.freeze(Object.keys(CURSES).filter((id) => CURSES[id].major));

// DAILY DESCENT (docs/DAILY.md): the day's fixed relic (any relic not bound
// to a class) and its fixed major curse, from the day's seed.
export function dailyOmen(seed) {
  return {
    relic: dailyPick(seed, RELIC_IDS.filter((id) => !RELICS[id].cls && !RELICS[id].vow), 'relic'),
    curse: dailyPick(seed, MAJOR_CURSE_IDS, 'curse'),
  };
}

export const RELIC_RULES = Object.freeze({
  choices: 3, // relics per pick
  curseChance: 0.6, // a path screen carries a cursed door
  emptyPoolGlint: 20, // a pick with every relic owned pays Glint instead
  majorChance: 0.3, // a cursed door carries a MAJOR curse instead
  majorMax: 3, // major curses a run can hold
  eliteDrop: 0.05, // an elite killed by the party drops a relic (at most one a level)
  shelfSize: 2, // relics on the peddler's relic shelf
  shelfPrice: Object.freeze({ common: 30, rare: 40, legendary: 55 }),
  spore: Object.freeze({ radius: 1.8, slow: 0.35, ticks: 90 }), // Spore Sac's kill puff
});

// Pick one relic id from `pool` by rarity weight (removes it from `pool`).
function weightedTake(stream, pool) {
  const total = pool.reduce((s, id) => s + RELIC_WEIGHT[RELICS[id].rarity], 0);
  let roll = stream.float() * total;
  let k = 0;
  for (; k < pool.length - 1; k++) {
    roll -= RELIC_WEIGHT[RELICS[pool[k]].rarity];
    if (roll < 0) break;
  }
  return pool.splice(k, 1)[0];
}

// Ash Feather: the dodge cooldown for a set of owned relic ids (the sim's
// mods.dodgeCdMul() as a pure function, for the guest's predictors and the
// HUD rings, which only see the replicated run view).
// (`extra`: VOW RANKS, the Heavy Bell vow's slower recovery, the relic
// view's `vowDodge`.)
export function dodgeCooldownTicks(base, ownedIds, extra = 0) {
  const ids = Array.isArray(ownedIds) ? ownedIds : [];
  const add = ids.reduce((s, id) => s + ((RELICS[id] && RELICS[id].dodgeCd) || 0), 0) + (Number.isFinite(extra) ? extra : 0);
  return add ? Math.round(base * Math.max(0.2, 1 + add)) : base;
}

// The relic stream's seed: derived from the run SEED with no gameplay draw.
export function relicSeed(seed) {
  let h = ((seed >>> 0) ^ 0x52454c43) >>> 0; // 'RELC'
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// A room's difficulty numbers with the live curse applied (a plain copy; the
// frozen difficulty() row is never touched).
// `scale` weakens the curse toward nothing (Saint's Ashes: 0.5 on a major).
export function cursedDiff(diff, curseId, scale = 1) {
  const c = CURSES[curseId];
  if (!c || !c.diff) return diff;
  const d = { ...diff };
  const m = c.diff;
  const k = (mul) => 1 + (mul - 1) * scale;
  if (m.eliteAdd) d.eliteChance = r2(Math.min(0.9, (d.eliteChance ?? 0) + m.eliteAdd * scale));
  if (m.budgetMul) {
    d.budget = r2(d.budget * k(m.budgetMul));
    d.defendBudget = r2(d.defendBudget * k(m.budgetMul));
  }
  if (m.hpMul) d.hpMul = r2(d.hpMul * k(m.hpMul));
  if (m.dmgMul) d.dmgMul = r2(d.dmgMul * k(m.dmgMul));
  if (m.waveMul && Number.isFinite(d.waveIntervalTicks)) d.waveIntervalTicks = Math.round(d.waveIntervalTicks * k(m.waveMul));
  return d;
}

// `vowMods()` (VOW RANKS, sim/run.js): the Spire vows the run wears,
// { heal, dodge } (null with none), read live like the major curses.
// Batch 5: `vowLevel()` is the run's Vow level (Oathkeeper's Brand) and
// `tonicSlot` reads and fills a seat's carry slot (Bottomless Flask).
export function createRelicSystem({ registry, events, getTick, combat, skillSys, player, live = () => true, glint = null, vowMods = () => null, vowLevel = () => 0, tonicSlot = null }) {
  let on = false;
  let stream = null;
  let owned = []; // relic ids in pick order
  let curse = null; // { id, room } — the room the party walked into cursed
  let cursesTaken = 0;
  let majors = []; // major curse ids, run-long, in the order taken
  let shelf = null; // the peddler's relic shelf: [{ id, price, sold }]
  let roomNow = 0; // the combat room being fought (elite drop cap)
  let dropped = false; // an elite already dropped a relic this level
  let forced = null; // probe: the next path screen's cursed door
  let dropNext = false; // probe / VFX lab: the next elite kill drops (no draw)
  let due = null; // { room, source } — a pick owed once the draft is done
  let offer = null; // { room, source, choices: [id], focus }
  let savedThisRoom = []; // Last Light: party ids already saved this room
  let pending = []; // procs resolved at the end of the tick (never mid-attack)
  let roomMode = null; // batch 3: the live room's mode (Huntsman's Horn)
  let oathAt = {}; // batch 3: Warden's Oath, enemy id -> the tick it last healed
  let oathTick = -1; // ... and how many taunts healed on that tick
  let oathCount = 0;
  let charmHits = 0; // THE TIDECALLER: Millrace Charm's count of soaked hits
  let tollHits = 0; // THE BELLWRIGHT: Verdigris Clapper's count of striking tolls
  let ring = null; // batch 4: the live Hold ring { x, z, r } (Warding Chalk)
  let later = []; // batch 5: procs that land on a later tick ({ at, ... })
  let trophies = 0; // batch 5: champions the party felled this run (Trophy Cord)
  let tenorKills = 0; // batch 5: Tenor Bell's count of this room's kills
  let flaskUsed = []; // batch 5: seats whose flask already refilled this room
  let stormNext = -1; // small fixes 5: the tick Stormglass gathers its own gust (-1: none this room)

  const has = (id) => owned.includes(id);
  const sum = (key) => owned.reduce((s, id) => s + (RELICS[id][key] ?? 0), 0);
  const partyBodies = () => registry.all().filter((e) => e.partyIndex !== undefined);
  // Batch 3: the body of a class's seat, and whether that class stands in
  // the party (a class relic is offered only then).
  const seatBody = (cls) => partyBodies().find((e) => (e.partyIndex === 0 ? 'healer' : e.classId) === cls) ?? null;
  // Batch 5: a vow relic is offered only while the run wears a vow.
  const offerable = (id) => !owned.includes(id) && (!RELICS[id].cls || !!seatBody(RELICS[id].cls)) && (!RELICS[id].vow || vowLevel() > 0);
  const pool0 = () => RELIC_IDS.filter(offerable);
  const hostileLive = (e) => !!e && e.faction === 'hostile' && e.hp > 0 && e.lifecycle !== 'break' && e.kind !== 'eglob';
  const relicSource = (src) => typeof src === 'string' && !!RELICS[src];
  const cursedHere = () => !!curse && curse.room === roomNow;
  const pay = (n, reason) => {
    if (typeof glint === 'function' && n > 0) glint(n, reason);
  };

  function reset(seed, enabled) {
    on = !!enabled;
    stream = on ? createGameplayRng(relicSeed(seed)) : null;
    owned = [];
    curse = null;
    cursesTaken = 0;
    majors = [];
    shelf = null;
    roomNow = 0;
    dropped = false;
    forced = null;
    due = null;
    offer = null;
    savedThisRoom = [];
    pending = [];
    roomMode = null;
    oathAt = {};
    oathTick = -1;
    oathCount = 0;
    charmHits = 0;
    tollHits = 0;
    ring = null;
    later = [];
    trophies = 0;
    tenorKills = 0;
    flaskUsed = [];
    stormNext = -1;
    if (combat && typeof combat.setMods === 'function') combat.setMods(on ? mods : null);
  }

  // ------------------------------------------------------- combat mods --
  // Read by sim/combat.js on every instance while relics are on. With nothing
  // owned and no curse every factor is exactly 1 (and every bonus 0). Live
  // for the whole relic run (not only once a relic is owned) so an elite
  // killed in room 1 can already drop one.
  // Saint's Ashes: every major curse weighs this much (1 = in full).
  const majorScale = () => (on && has('saints_ashes') ? RELICS.saints_ashes.ashes.scale : 1);
  const majorSum = (key) => majors.reduce((s, id) => s + (CURSES[id][key] ?? 0), 0) * majorScale();
  const cursedNow = (id) => cursedHere() && curse.id === id;
  const mods = {
    active: () => on && live(),
    dealtMul(target = null) {
      let m = 1 + sum('dealt');
      if (has('ashen_crown')) m += RELICS.ashen_crown.perCurse * Math.min(RELICS.ashen_crown.perCurseMax, cursesTaken);
      if (has('cinder_pact')) {
        const P = RELICS.cinder_pact.pact;
        m += P.perMajor * majors.length;
        if (cursedHere()) m += P.dealt;
      }
      if (has('huntsmans_horn') && (roomMode === 'hunt' || roomMode === 'purge')) m += RELICS.huntsmans_horn.horn.dealt;
      // Batch 4: Champion's Laurel on a champion.
      if (target && target.champion && has('champions_laurel')) m += RELICS.champions_laurel.laurel.dealt;
      // THE STILL SPIRE: the Hushbell on an enemy mid-warning.
      if (target && target.telegraph && has('hushbell')) m += RELICS.hushbell.hush.dealt;
      // Batch 5: Trophy Cord (champions felled) and Oathkeeper's Brand (the
      // Vow level).
      if (has('trophy_cord')) m += RELICS.trophy_cord.trophy.per * Math.min(RELICS.trophy_cord.trophy.max, trophies);
      if (has('oathkeepers_brand')) m += RELICS.oathkeepers_brand.brand.per * Math.min(RELICS.oathkeepers_brand.brand.max, vowLevel());
      return m;
    },
    takenMul: () =>
      Math.max(
        0.1,
        1 +
          sum('taken') +
          majorSum('taken') +
          (has('cinder_pact') && cursedHere() ? RELICS.cinder_pact.pact.taken : 0) +
          (has('vigil_candle') && (roomMode === 'escort' || roomMode === 'hold') ? RELICS.vigil_candle.vigil.taken : 0),
      ),
    critChance: () => sum('crit'),
    // Batch 5: Dulled Edge (a major curse) blunts every crit.
    critMulAdd: () => sum('critMul') + majorSum('critMul'),
    kbMul: () => 1 + sum('kb'),
    healMul() {
      let m = 1 + sum('heal');
      if (curse && CURSES[curse.id] && CURSES[curse.id].healCut && !CURSES[curse.id].major) m *= 1 - CURSES[curse.id].healCut;
      for (const id of majors) if (CURSES[id].healCut) m *= 1 - CURSES[id].healCut * majorScale();
      // VOW RANKS: Thin Air.
      const vm = vowMods();
      if (vm && vm.heal) m *= 1 - vm.heal;
      return m;
    },
    // Ash Feather: the dodge cooldown factor (1 = unchanged).
    dodgeCdMul: () => {
      // VOW RANKS: Heavy Bell.
      const vm = vowMods();
      return Math.max(0.2, 1 + sum('dodgeCd') + (vm && vm.dodge ? vm.dodge : 0));
    },
    // Last Light: true = the blow leaves this member at 1 HP instead.
    saveFromDown(target) {
      if (!has('last_light') || savedThisRoom.includes(target.id)) return false;
      savedThisRoom.push(target.id);
      events.emit(getTick(), 'relic_proc', { relic: 'last_light', target: target.id, x: r2(target.x), z: r2(target.z) });
      return true;
    },
    onPartyHit(target, attacker, amount) {
      if (!has('thorn_mail') || !attacker || !(amount > 0)) return;
      pending.push({ kind: 'thorns', attacker: attacker.id, amount: amount * RELICS.thorn_mail.thorns, from: target.id });
    },
    // A party blow is about to kill `target` (before its death event).
    // Spore Sac: the corpse leaves no hazard (sim/enemies.js reads the flag).
    beforeKill(target) {
      if (has('spore_sac')) target.noDeathHazard = true;
    },
    onKill(target) {
      if (has('leech_fang')) pending.push({ kind: 'leech' });
      if (!target) return;
      // Batch 4: Kindred Blood, the fallen's kin drink its death.
      if (cursedNow('kindred_blood')) pending.push({ kind: 'kindred', x: target.x, z: target.z, id: target.id });
      // Batch 5: Tolling Dead tolls where the fallen stood; Trophy Cord counts
      // a champion; Tenor Bell counts the room's kills.
      if (cursedNow('tolling_dead')) {
        const K = CURSES.tolling_dead.toll;
        if (later.filter((p) => p.kind === 'toll').length < K.max) {
          const at = getTick() + K.delayTicks;
          later.push({ kind: 'toll', at, from: target.id, x: r2(target.x), z: r2(target.z) });
          events.emit(getTick(), 'curse_proc', { curse: 'tolling_dead', stage: 'toll', from: target.id, radius: K.radius, resolveTick: at, x: r2(target.x), z: r2(target.z) });
        }
      }
      if ((target.champion || isChampionKind(target.kind)) && !target.trophied) {
        target.trophied = true;
        trophies += 1;
        if (has('trophy_cord')) pending.push({ kind: 'trophy', x: target.x, z: target.z, id: target.id });
      }
      if (has('tenor_bell')) {
        tenorKills += inBellRing(target) ? 2 : 1;
        if (tenorKills >= RELICS.tenor_bell.tenor.every) {
          tenorKills = 0;
          pending.push({ kind: 'tenor', x: target.x, z: target.z, id: target.id });
        }
      }
      if (has('spore_sac')) pending.push({ kind: 'spores', x: target.x, z: target.z, id: target.id });
      if (target.elite && has('bounty_writ')) pending.push({ kind: 'bounty', x: target.x, z: target.z, id: target.id, affixes: Array.isArray(target.affixes) ? target.affixes.length : 0 });
      if (target.elite && (!dropped || dropNext)) pending.push({ kind: 'drop', x: target.x, z: target.z, id: target.id, etype: target.kind });
    },
  };

  // ------------------------------------------------ batch 3 listeners --
  // The synergy relics read the sim's own bus (hits, heals, statuses). Each
  // only queues a proc for endOfTick(); nothing here runs while relics are
  // off, so the legacy run and the golden traces never see them.
  const bodyCls = (id) => {
    const b = id !== null && id !== undefined ? registry.byId(id) : null;
    return b && b.partyIndex !== undefined ? (b.partyIndex === 0 ? 'healer' : b.classId) : null;
  };
  events.on('hit', (ev) => {
    if (!on || !live() || owned.length === 0 || relicSource(ev.source) || !(ev.amount > 0)) return;
    const t = registry.byId(ev.target);
    if (!t || t.faction !== 'hostile' || t.lifecycle === 'break') return;
    const atk = ev.attacker !== null && ev.attacker !== undefined ? registry.byId(ev.attacker) : null;
    if (atk && atk.faction === 'hostile') return;
    // A party blow: a party body's, or an id-less bolt or skill.
    if (!atk && ev.delivery !== 'basic' && ev.delivery !== 'skill') return;
    const cls = atk ? bodyCls(atk.id) : null;
    if (ev.crit && cls === 'swordsman' && has('fox_ribbon')) pending.push({ kind: 'ribbon', target: t.id, amount: ev.amount * RELICS.fox_ribbon.ribbon, dx: ev.dirX ?? 0, dz: ev.dirZ ?? 0 });
    if (cls === 'archer' && has('fletchers_knot') && STATUS.magnitude(t, 'exposed', getTick()) > 0) pending.push({ kind: 'knot', from: t.id, x: t.x, z: t.z, amount: ev.amount * RELICS.fletchers_knot.knot.frac });
    if (ev.crit && has('kindling_coal')) pending.push({ kind: 'kindle', from: t.id, x: t.x, z: t.z });
    // THE TIDECALLER: Millrace Charm. (A crash spends the soak before its
    // hit event, so a crash itself never spreads.)
    if (has('millrace_charm') && STATUS.magnitude(t, 'soaked', getTick()) > 0) {
      charmHits += 1;
      if (charmHits >= RELICS.millrace_charm.charm.every) {
        charmHits = 0;
        pending.push({ kind: 'charm', from: t.id, x: t.x, z: t.z, src: atk ? atk.id : null });
      }
    }
  });
  // Batch 5: Dulled Edge's beat. A party crit under the curse emits a
  // cosmetic curse_proc (a blunted spark, a dull clink) at most once every
  // 20 ticks; nothing in the sim reads it.
  let dullAt = -1e9;
  events.on('hit', (ev) => {
    if (!on || !live() || !ev.crit || !majors.includes('dulled_edge') || relicSource(ev.source) || !(ev.amount > 0)) return;
    const t = registry.byId(ev.target);
    if (!t || t.faction !== 'hostile') return;
    const atk = ev.attacker !== null && ev.attacker !== undefined ? registry.byId(ev.attacker) : null;
    if (atk && atk.faction === 'hostile') return;
    if (getTick() - dullAt < 20) return;
    dullAt = getTick();
    events.emit(getTick(), 'curse_proc', { curse: 'dulled_edge', stage: 'blunt', target: t.id, from: atk ? atk.id : null, amount: r2(ev.amount), x: r2(t.x), z: r2(t.z) });
  });
  // THE TIDECALLER: Otter's Pearl, one heal per soaked enemy her crash hit.
  events.on('crash', (ev) => {
    if (!on || !live() || !has('otters_pearl')) return;
    const b = Number.isInteger(ev.seat) ? partyBodies().find((e) => e.partyIndex === ev.seat) : null;
    if (!b || bodyCls(b.id) !== 'tidecaller') return;
    pending.push({ kind: 'pearl', target: b.id, from: ev.target });
  });
  // THE BELLWRIGHT: Bell-Rope, one heal per bell her Peal or Carillon rang
  // (a Peal with no bell hung rings round her and rings none).
  events.on('ally_cast', (ev) => {
    if (!on || !live() || !has('bell_rope') || ev.classId !== 'bellwright' || !Array.isArray(ev.bells)) return;
    const n = ev.bells.filter((b) => b && b.id !== null && b.id !== undefined).length;
    if (n > 0 && registry.byId(ev.id)) pending.push({ kind: 'rope', target: ev.id, bells: n });
  });
  // ... and Verdigris Clapper: a toll of one of her bells that struck someone.
  events.on('azone_tick', (ev) => {
    if (!on || !live() || !has('verdigris_clapper') || !Array.isArray(ev.hit) || ev.hit.length === 0) return;
    const z = registry.byId(ev.id);
    if (!z || !z.bell || bodyCls(z.sourceId) !== 'bellwright') return;
    tollHits += 1;
    if (tollHits < RELICS.verdigris_clapper.clapper.every) return;
    tollHits = 0;
    pending.push({ kind: 'clapper', bell: z.id, x: z.x, z: z.z, r: z.radius });
  });
  events.on('heal', (ev) => {
    if (!on || !live() || owned.length === 0) return;
    const t = registry.byId(ev.target);
    if (!t || t.partyIndex === undefined) return;
    if (has('mercy_bell') && ev.amount > ev.applied + 0.01 && bodyCls(ev.healer) === 'healer') pending.push({ kind: 'bell', target: t.id, healer: ev.healer, amount: ev.amount - ev.applied });
    if (has('sun_chalice') && ev.applied >= RELICS.sun_chalice.chalice.min) pending.push({ kind: 'chalice', target: t.id, x: t.x, z: t.z, amount: ev.applied });
  });
  events.on('status_apply', (ev) => {
    if (!on || !live() || ev.status !== 'taunt' || !has('wardens_oath')) return;
    if (bodyCls(ev.src) !== 'tank') return;
    const O = RELICS.wardens_oath.oath;
    const tick = getTick();
    if (Number.isFinite(oathAt[ev.id]) && tick - oathAt[ev.id] < O.everyTicks) return;
    if (oathTick !== tick) {
      oathTick = tick;
      oathCount = 0;
    }
    if (oathCount >= O.perTick) return;
    oathCount += 1;
    oathAt[ev.id] = tick;
    pending.push({ kind: 'oath', tank: ev.src, from: ev.id, x: ev.x ?? 0, z: ev.z ?? 0 });
  });

  // ------------------------------------------------ batch 4 listeners --
  // The rooms of content plan 3 announce themselves on the bus; each relic
  // only queues a proc for endOfTick().
  events.on('pilgrim_spawn', (ev) => {
    if (on && live() && has('shepherds_crook')) pending.push({ kind: 'crook', target: ev.id });
  });
  events.on('pilgrim_arrive', (ev) => {
    if (on && live() && has('shepherds_crook')) pending.push({ kind: 'crook_home', target: ev.id, x: ev.x, z: ev.z });
  });
  events.on('hold_start', (ev) => {
    if (!on || !live()) return;
    ring = { x: ev.x, z: ev.z, r: ev.radius, t0: getTick() };
    if (has('warding_chalk')) events.emit(getTick(), 'relic_proc', { relic: 'warding_chalk', stage: 'drawn', radius: r2(ring.r), x: r2(ring.x), z: r2(ring.z) });
  });
  const ringDone = () => {
    ring = null;
  };
  events.on('sigil_out', ringDone);
  events.on('sigil_sealed', ringDone);
  events.on('key_pickup', (ev) => {
    if (on && live() && has('jailers_ring')) pending.push({ kind: 'jailer', by: ev.by, x: ev.x, z: ev.z });
  });
  events.on('event_take', (ev) => {
    if (on && live() && has('wanderers_token')) pending.push({ kind: 'token', encounter: ev.encounter });
  });
  const healParty = (frac, source) => {
    let n = 0;
    for (const e of partyBodies()) if (e.hp > 0 && e.hp < e.maxHp && combat.applyHeal(e, e.maxHp * frac, { source })) n += 1;
    return n;
  };

  // ------------------------------------------------ batch 5 listeners --
  // Tonics and bombs, shrines and gust vents announce themselves on the bus;
  // each relic queues a proc for endOfTick() (or `later`, on a set tick).
  // Tenor Bell: did `e` fall inside one of the Bellwright's bell rings?
  function inBellRing(e) {
    for (const z of registry.all()) {
      if (!z.bell || bodyCls(z.sourceId) !== 'bellwright') continue;
      if (Math.hypot(e.x - z.x, e.z - z.z) <= (z.radius ?? 0) + (e.radius ?? 0)) return true;
    }
    return false;
  }
  // A big body (a boss, the Stag, a champion) takes the small share.
  const bigBody = (e) => e.boss === true || e.kind === 'stag' || !!e.champion || isChampionKind(e.kind);
  events.on('tonic_use', (ev) => {
    if (!on || !live() || !Number.isInteger(ev.seat)) return;
    if (has('brewers_satchel')) pending.push({ kind: 'satchel', seat: ev.seat, by: ev.by, item: ev.item });
    if (has('bottomless_flask') && tonicSlot && !flaskUsed.includes(ev.seat) && CONSUMABLES[ev.item]) {
      flaskUsed.push(ev.seat);
      later.push({ kind: 'refill', at: getTick() + RELICS.bottomless_flask.flask.delayTicks, seat: ev.seat, item: ev.item });
      events.emit(getTick(), 'relic_proc', { relic: 'bottomless_flask', stage: 'pour', seat: ev.seat, item: ev.item, target: ev.by ?? null, x: r2(ev.x ?? player.x), z: r2(ev.z ?? player.z) });
    }
  });
  events.on('tonic_burst', (ev) => {
    if (!on || !live() || !has('twin_fuse') || ev.echo || !CONSUMABLES[ev.item]) return;
    const F = RELICS.twin_fuse.fuse;
    later.push({ kind: 'fuse', at: getTick() + F.delayTicks, item: ev.item, seat: ev.seat, x: ev.x, z: ev.z, radius: ev.radius });
    events.emit(getTick(), 'relic_proc', { relic: 'twin_fuse', stage: 'lit', item: ev.item, radius: ev.radius, resolveTick: getTick() + F.delayTicks, x: r2(ev.x), z: r2(ev.z) });
  });
  events.on('shrine_offer', (ev) => {
    if (on && live() && has('votive_ribbon')) pending.push({ kind: 'votive', x: ev.x, z: ev.z, blessing: ev.blessing ?? null });
  });
  events.on('hazard_resolve', (ev) => {
    if (!on || !live() || !ev.gust || !ev.lane || !has('stormglass')) return;
    pending.push({ kind: 'storm', lane: { ...ev.lane } });
  });
  // Warding Chalk: once a second, every standing member inside the ring.
  function chalkTick() {
    if (!ring || !has('warding_chalk')) return;
    const C = RELICS.warding_chalk.chalk;
    const tick = getTick();
    if ((tick - ring.t0) % C.everyTicks !== 0 || tick === ring.t0) return;
    const healed = [];
    for (const e of partyBodies()) {
      if (!(e.hp > 0) || e.hp >= e.maxHp || Math.hypot(e.x - ring.x, e.z - ring.z) > ring.r) continue;
      if (combat.applyHeal(e, C.heal, { healer: null, source: 'warding_chalk' })) healed.push(e.id);
    }
    if (healed.length) events.emit(tick, 'relic_proc', { relic: 'warding_chalk', stage: 'mend', healed, radius: r2(ring.r), x: r2(ring.x), z: r2(ring.z) });
  }

  // Stormglass in a room with no gust vent: on its beat it aims a lane from
  // the carrier through the nearest enemy, shows it for gatherTicks, then
  // blows (the `storm` proc, the vents' own). No enemy in reach waits a
  // moment and looks again. A vent room leaves the gusts to the vents.
  function stormTick() {
    const tick = getTick();
    if (tick < stormNext) return;
    const S = RELICS.stormglass.storm;
    if (registry.all().some((e) => e.kind === 'hazard' && e.htype === 'gust')) {
      stormNext = -1;
      return;
    }
    let best = null;
    let bestD = Infinity;
    for (const e of registry.all().filter(hostileLive).sort((a, b) => a.id - b.id)) {
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < bestD && d <= S.len) {
        best = e;
        bestD = d;
      }
    }
    if (!best || !(player.hp > 0)) {
      stormNext = tick + S.retryTicks;
      return;
    }
    const dx = (best.x - player.x) / (bestD || 1);
    const dz = (best.z - player.z) / (bestD || 1);
    const x0 = r2(player.x + dx * 0.5);
    const z0 = r2(player.z + dz * 0.5);
    const lane = { x0, z0, x1: r2(x0 + dx * S.len), z1: r2(z0 + dz * S.len), w: S.w };
    later.push({ kind: 'storm', at: tick + S.gatherTicks, lane, own: true });
    events.emit(tick, 'relic_proc', { relic: 'stormglass', stage: 'gather', lane: { ...lane }, resolveTick: tick + S.gatherTicks, x: r2((lane.x0 + lane.x1) / 2), z: r2((lane.z0 + lane.z1) / 2) });
    stormNext = tick + S.everyTicks;
  }

  // Short Fuse: the live room's telegraph rule ({ mul, minTicks }) or null.
  // sim/enemies.js shortens every new telegraph by it.
  function fuse() {
    if (!on || !curse) return null;
    const c = CURSES[curse.id];
    return c && c.fuse ? c.fuse : null;
  }

  // A relic arrives without a pick (elite drop, shop, probe grant).
  function gain(id, source, at, extra = {}) {
    owned.push(id);
    events.emit(getTick(), 'relic_gain', { relic: id, rarity: RELICS[id].rarity, room: roomNow, source, owned: owned.length, x: r2(at.x), z: r2(at.z), ...extra });
  }

  // Procs land at the end of the tick, after every attack of the tick has
  // resolved, so a reflected blow never despawns an enemy mid-swing.
  function endOfTick() {
    if (!on) return;
    if (ring && live()) chalkTick();
    if (stormNext >= 0 && roomMode && live() && has('stormglass')) stormTick();
    if (later.length && live()) {
      const tick = getTick();
      const due = later.filter((p) => p.at <= tick);
      if (due.length) {
        later = later.filter((p) => p.at > tick);
        pending.push(...due);
      }
    }
    if (pending.length === 0) return;
    const list = pending;
    pending = [];
    for (const p of list) {
      if (p.kind in BATCH5) {
        BATCH5[p.kind](p);
        continue;
      }
      if (p.kind === 'thorns') {
        const a = registry.byId(p.attacker);
        if (!a || !(a.hp > 0)) continue;
        const r = combat.applyDamage(a, p.amount, { delivery: 'skill', shape: 'thorns', attacker: null, source: 'thorn_mail' });
        if (r && r.amount > 0) events.emit(getTick(), 'relic_proc', { relic: 'thorn_mail', target: a.id, from: p.from, x: r2(a.x), z: r2(a.z) });
      } else if (p.kind === 'spores') {
        const S = RELIC_RULES.spore;
        const tick = getTick();
        let n = 0;
        for (const e of registry.all()) {
          if (e.faction !== 'hostile' || !(e.hp > 0) || e.lifecycle === 'break' || e.kind === 'eglob') continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) > S.radius + (e.radius ?? 0)) continue;
          if (combat.status.apply(e, 'slow', S.slow, S.ticks, tick, null)) n += 1;
        }
        events.emit(tick, 'relic_proc', { relic: 'spore_sac', x: r2(p.x), z: r2(p.z), radius: S.radius, slowed: n });
      } else if (p.kind === 'drop') {
        // One roll per elite kill, at most one drop a level.
        if (dropped && !dropNext) continue;
        if (dropNext) dropNext = false;
        else if (!(stream.float() < RELIC_RULES.eliteDrop)) continue;
        const pool = pool0();
        if (pool.length === 0) continue;
        const id = weightedTake(stream, pool);
        dropped = true;
        events.emit(getTick(), 'relic_drop', { relic: id, rarity: RELICS[id].rarity, room: roomNow, from: p.id, etype: p.etype, x: r2(p.x), z: r2(p.z), px: r2(player.x), pz: r2(player.z) });
        gain(id, 'elite', player, { fromX: r2(p.x), fromZ: r2(p.z) });
      } else if (p.kind === 'oath') {
        const tank = registry.byId(p.tank);
        if (!tank || !(tank.hp > 0)) continue;
        combat.applyHeal(tank, RELICS.wardens_oath.oath.heal, { healer: tank.id, source: 'wardens_oath' });
        events.emit(getTick(), 'relic_proc', { relic: 'wardens_oath', target: tank.id, from: p.from, fx: r2(p.x), fz: r2(p.z), x: r2(tank.x), z: r2(tank.z) });
      } else if (p.kind === 'ribbon') {
        const t = registry.byId(p.target);
        if (!hostileLive(t)) continue;
        const r = combat.applyDamage(t, p.amount, { delivery: 'skill', shape: 'ribbon', dirX: p.dx, dirZ: p.dz, attacker: null, source: 'fox_ribbon' });
        if (r && r.amount > 0) events.emit(getTick(), 'relic_proc', { relic: 'fox_ribbon', target: t.id, amount: r2(r.amount), dx: r2(p.dx), dz: r2(p.dz), x: r2(t.x), z: r2(t.z) });
      } else if (p.kind === 'knot') {
        const K = RELICS.fletchers_knot.knot;
        let best = null;
        let bd = Infinity;
        for (const e of registry.all()) {
          if (e.id === p.from || !hostileLive(e)) continue;
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          if (d <= K.range + (e.radius ?? 0) && d < bd) {
            best = e;
            bd = d;
          }
        }
        if (!best) continue;
        const l = bd || 1;
        const r = combat.applyDamage(best, p.amount, { delivery: 'skill', shape: 'projectile', dirX: (best.x - p.x) / l, dirZ: (best.z - p.z) / l, attacker: null, source: 'fletchers_knot' });
        if (r && r.amount > 0) events.emit(getTick(), 'relic_proc', { relic: 'fletchers_knot', target: best.id, from: p.from, fx: r2(p.x), fz: r2(p.z), x: r2(best.x), z: r2(best.z) });
      } else if (p.kind === 'kindle') {
        const K = RELICS.kindling_coal.kindle;
        const dmg = K.dmg * (has('ember_tooth') ? K.emberMul : 1);
        const near = registry
          .all()
          .filter((e) => e.id !== p.from && hostileLive(e) && Math.hypot(e.x - p.x, e.z - p.z) <= K.radius + (e.radius ?? 0))
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z) || a.id - b.id)
          .slice(0, K.max);
        const hit = [];
        for (const e of near) {
          const l = Math.hypot(e.x - p.x, e.z - p.z) || 1;
          const r = combat.applyDamage(e, dmg, { delivery: 'skill', shape: 'kindle', dirX: (e.x - p.x) / l, dirZ: (e.z - p.z) / l, attacker: null, source: 'kindling_coal' });
          if (r && r.amount > 0) hit.push(e.id);
        }
        events.emit(getTick(), 'relic_proc', { relic: 'kindling_coal', from: p.from, hit, radius: K.radius, ember: has('ember_tooth'), x: r2(p.x), z: r2(p.z) });
      } else if (p.kind === 'bell') {
        const t = registry.byId(p.target);
        if (!t || !(t.hp > 0)) continue;
        const B = RELICS.mercy_bell.bell;
        const before = STATUS.magnitude(t, 'shield', getTick());
        const rec = STATUS.addShield(t, p.amount, t.maxHp * B.cap, B.ticks, getTick(), p.healer);
        if (rec && rec.mag > before + 1e-6) events.emit(getTick(), 'relic_proc', { relic: 'mercy_bell', target: t.id, shield: r2(rec.mag), x: r2(t.x), z: r2(t.z) });
      } else if (p.kind === 'chalice') {
        const C = RELICS.sun_chalice.chalice;
        const from = registry.byId(p.target);
        const fx = from ? from.x : p.x;
        const fz = from ? from.z : p.z;
        let best = null;
        let bd = Infinity;
        for (const e of registry.all()) {
          if (!hostileLive(e)) continue;
          const d = Math.hypot(e.x - fx, e.z - fz);
          if (d <= C.range + (e.radius ?? 0) && d < bd) {
            best = e;
            bd = d;
          }
        }
        if (!best) continue;
        const l = bd || 1;
        const r = combat.applyDamage(best, p.amount, { delivery: 'skill', shape: 'sear', dirX: (best.x - fx) / l, dirZ: (best.z - fz) / l, attacker: null, source: 'sun_chalice' });
        if (r && r.amount > 0) events.emit(getTick(), 'relic_proc', { relic: 'sun_chalice', target: best.id, from: p.target, amount: r2(r.amount), fx: r2(fx), fz: r2(fz), x: r2(best.x), z: r2(best.z) });
      } else if (p.kind === 'bounty') {
        const B = RELICS.bounty_writ.bounty;
        const n = B.base + B.perAffix * p.affixes;
        pay(n, 'relic_bounty_writ');
        events.emit(getTick(), 'relic_proc', { relic: 'bounty_writ', from: p.id, glint: n, affixes: p.affixes, x: r2(p.x), z: r2(p.z) });
      } else if (p.kind === 'pearl') {
        const t = registry.byId(p.target);
        if (!t || !(t.hp > 0)) continue;
        combat.applyHeal(t, RELICS.otters_pearl.pearl.heal, { healer: t.id, source: 'otters_pearl' });
        events.emit(getTick(), 'relic_proc', { relic: 'otters_pearl', target: t.id, from: p.from, x: r2(t.x), z: r2(t.z) });
      } else if (p.kind === 'rope') {
        const t = registry.byId(p.target);
        if (!t || !(t.hp > 0)) continue;
        combat.applyHeal(t, RELICS.bell_rope.rope.heal * p.bells, { healer: t.id, source: 'bell_rope' });
        events.emit(getTick(), 'relic_proc', { relic: 'bell_rope', target: t.id, bells: p.bells, x: r2(t.x), z: r2(t.z) });
      } else if (p.kind === 'clapper') {
        const K = RELICS.verdigris_clapper.clapper;
        const near = registry
          .all()
          .filter((e) => hostileLive(e) && Math.hypot(e.x - p.x, e.z - p.z) <= p.r)
          .sort((a, b) => a.id - b.id);
        const hit = [];
        for (const e of near) {
          const l = Math.hypot(e.x - p.x, e.z - p.z) || 1;
          const r = combat.applyDamage(e, K.dmg, { delivery: 'skill', shape: 'ground_aoe', dirX: (e.x - p.x) / l, dirZ: (e.z - p.z) / l, attacker: null, source: 'verdigris_clapper' });
          if (r && r.amount > 0) hit.push(e.id);
        }
        events.emit(getTick(), 'relic_proc', { relic: 'verdigris_clapper', bell: p.bell, hit, radius: r2(p.r), x: r2(p.x), z: r2(p.z) });
      } else if (p.kind === 'charm') {
        const C = RELICS.millrace_charm.charm;
        const tick = getTick();
        let best = null;
        let bd = Infinity;
        for (const e of registry.all()) {
          if (e.id === p.from || !hostileLive(e) || STATUS.magnitude(e, 'soaked', tick) > 0) continue;
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          if (d <= C.range + (e.radius ?? 0) && (d < bd || (d === bd && best && e.id < best.id))) {
            best = e;
            bd = d;
          }
        }
        if (!best || !combat.status.apply(best, 'soaked', CLASS_TECH.soakMag, CLASS_TECH.soakTicks, tick, p.src)) continue;
        events.emit(tick, 'relic_proc', { relic: 'millrace_charm', target: best.id, from: p.from, fx: r2(p.x), fz: r2(p.z), x: r2(best.x), z: r2(best.z) });
      } else if (p.kind === 'crook') {
        // Shepherd's Crook: the pilgrim walks out sturdier.
        const t = registry.byId(p.target);
        if (!t || !(t.hp > 0) || t.crooked) continue;
        const H = RELICS.shepherds_crook.crook;
        const add = t.maxHp * H.hp;
        t.maxHp = r2(t.maxHp + add);
        t.hp = r2(t.hp + add);
        t.crooked = true;
        events.emit(getTick(), 'relic_proc', { relic: 'shepherds_crook', stage: 'spawn', target: t.id, maxHp: t.maxHp, x: r2(t.x), z: r2(t.z) });
      } else if (p.kind === 'crook_home') {
        const G = RELICS.shepherds_crook.crook.glint;
        pay(G, 'relic_shepherds_crook');
        events.emit(getTick(), 'relic_proc', { relic: 'shepherds_crook', stage: 'home', target: p.target, glint: G, x: r2(p.x ?? 0), z: r2(p.z ?? 0) });
      } else if (p.kind === 'jailer') {
        const J = RELICS.jailers_ring.ring;
        const healed = healParty(J.heal, 'jailers_ring');
        pay(J.glint, 'relic_jailers_ring');
        events.emit(getTick(), 'relic_proc', { relic: 'jailers_ring', by: p.by ?? null, healed, glint: J.glint, x: r2(p.x ?? player.x), z: r2(p.z ?? player.z) });
      } else if (p.kind === 'token') {
        const G = RELICS.wanderers_token.token.glint;
        pay(G, 'relic_wanderers_token');
        events.emit(getTick(), 'relic_proc', { relic: 'wanderers_token', encounter: p.encounter ?? null, glint: G, x: r2(player.x), z: r2(player.z) });
      } else if (p.kind === 'kindred') {
        // Kindred Blood (a room curse): the fallen's kin drink its death.
        const K = CURSES.kindred_blood.kindred;
        const healed = [];
        for (const e of registry.all()) {
          if (e.id === p.id || !hostileLive(e) || e.hp >= e.maxHp) continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) > K.radius + (e.radius ?? 0)) continue;
          if (combat.applyHeal(e, e.maxHp * K.heal, { source: 'kindred_blood' })) healed.push(e.id);
        }
        events.emit(getTick(), 'curse_proc', { curse: 'kindred_blood', from: p.id, healed, radius: K.radius, x: r2(p.x), z: r2(p.z) });
      } else if (p.kind === 'leech') {
        let best = null;
        for (const e of partyBodies()) if (e.hp > 0 && e.hp < e.maxHp && (!best || e.hp / e.maxHp < best.hp / best.maxHp)) best = e;
        if (!best) continue;
        combat.applyHeal(best, RELICS.leech_fang.leech, { source: 'leech_fang' });
        events.emit(getTick(), 'relic_proc', { relic: 'leech_fang', target: best.id, x: r2(best.x), z: r2(best.z) });
      }
    }
  }

  // Batch 5's procs (endOfTick).
  const BATCH5 = {
    satchel(p) {
      const H = RELICS.brewers_satchel.satchel.heal;
      const healed = [];
      for (const e of partyBodies()) {
        if (e.partyIndex === p.seat || !(e.hp > 0) || e.downed || e.hp >= e.maxHp) continue;
        if (combat.applyHeal(e, e.maxHp * H, { source: 'brewers_satchel' })) healed.push(e.id);
      }
      const by = p.by !== undefined && p.by !== null ? registry.byId(p.by) : null;
      events.emit(getTick(), 'relic_proc', { relic: 'brewers_satchel', seat: p.seat, item: p.item, healed, target: by ? by.id : null, x: r2(by ? by.x : player.x), z: r2(by ? by.z : player.z) });
    },
    refill(p) {
      if (!tonicSlot || tonicSlot.get(p.seat)) return; // a full slot keeps what it holds
      if (!tonicSlot.set(p.seat, p.item)) return;
      const b = partyBodies().find((e) => e.partyIndex === p.seat) ?? player;
      events.emit(getTick(), 'relic_proc', { relic: 'bottomless_flask', stage: 'refill', seat: p.seat, item: p.item, target: b.id, x: r2(b.x), z: r2(b.z) });
    },
    fuse(p) {
      const row = CONSUMABLES[p.item];
      const F = RELICS.twin_fuse.fuse;
      const hit = [];
      for (const e of registry.all().filter(hostileLive).sort((a, b) => a.id - b.id)) {
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        if (Math.hypot(dx, dz) > p.radius + (e.radius ?? 0.3)) continue;
        const l = Math.hypot(dx, dz) || 1;
        const r = combat.applyDamage(e, e.maxHp * shareFor(row, e, (k) => !!e.champion || isChampionKind(k)) * F.frac, { delivery: 'skill', shape: 'burst', dirX: dx / l, dirZ: dz / l, attacker: null, source: 'twin_fuse' });
        if (r && r.amount > 0) hit.push(e.id);
      }
      events.emit(getTick(), 'relic_proc', { relic: 'twin_fuse', stage: 'burst', item: p.item, radius: p.radius, hit, x: r2(p.x), z: r2(p.z) });
    },
    votive(p) {
      const healed = healParty(RELICS.votive_ribbon.votive.heal, 'votive_ribbon');
      events.emit(getTick(), 'relic_proc', { relic: 'votive_ribbon', blessing: p.blessing, healed, x: r2(p.x ?? player.x), z: r2(p.z ?? player.z) });
    },
    storm(p) {
      const S = RELICS.stormglass.storm;
      const L = p.lane;
      const len = Math.hypot(L.x1 - L.x0, L.z1 - L.z0) || 1;
      const dx = (L.x1 - L.x0) / len;
      const dz = (L.z1 - L.z0) / len;
      const hit = [];
      for (const e of registry.all().filter(hostileLive).sort((a, b) => a.id - b.id)) {
        const rx = e.x - L.x0;
        const rz = e.z - L.z0;
        const along = rx * dx + rz * dz;
        const side = -rx * dz + rz * dx;
        if (along < 0 || along > len || Math.abs(side) > L.w / 2 + (e.radius ?? 0)) continue;
        const share = bigBody(e) ? S.big : e.elite ? S.elite : S.dmg;
        const r = combat.applyDamage(e, e.maxHp * share, { delivery: 'skill', shape: 'gust', dirX: dx, dirZ: dz, attacker: null, source: 'stormglass' });
        if (r && r.amount > 0) hit.push(e.id);
      }
      events.emit(getTick(), 'relic_proc', { relic: 'stormglass', hit, lane: { ...L }, ...(p.own ? { own: true } : {}), x: r2((L.x0 + L.x1) / 2), z: r2((L.z0 + L.z1) / 2) });
    },
    trophy(p) {
      const T = RELICS.trophy_cord.trophy;
      events.emit(getTick(), 'relic_proc', { relic: 'trophy_cord', from: p.id, trophies, dealt: r2(T.per * Math.min(T.max, trophies)), x: r2(p.x), z: r2(p.z) });
    },
    tenor(p) {
      const B = RELICS.tenor_bell.tenor;
      const tick = getTick();
      const hit = [];
      for (const e of registry.all().filter(hostileLive).sort((a, b) => a.id - b.id)) {
        const l = Math.hypot(e.x - p.x, e.z - p.z) || 1;
        const r = combat.applyDamage(e, B.dmg, { delivery: 'skill', shape: 'ground_aoe', dirX: (e.x - p.x) / l, dirZ: (e.z - p.z) / l, attacker: null, source: 'tenor_bell' });
        if (registry.byId(e.id) && e.hp > 0) combat.status.apply(e, 'slow', B.slow, B.ticks, tick, null);
        if (r && r.amount > 0) hit.push(e.id);
      }
      events.emit(tick, 'relic_proc', { relic: 'tenor_bell', from: p.id ?? null, hit, x: r2(p.x), z: r2(p.z), px: r2(player.x), pz: r2(player.z) });
    },
    toll(p) {
      const K = CURSES.tolling_dead.toll;
      const struck = [];
      for (const e of partyBodies()) {
        if (!(e.hp > 0) || e.downed || Math.hypot(e.x - p.x, e.z - p.z) > K.radius + (e.radius ?? 0)) continue;
        const l = Math.hypot(e.x - p.x, e.z - p.z);
        const r = combat.applyDamage(e, e.maxHp * K.dmg, { delivery: 'hazard', shape: 'hazard', dirX: l > 1e-6 ? (e.x - p.x) / l : 0, dirZ: l > 1e-6 ? (e.z - p.z) / l : 1, attacker: null, source: 'tolling_dead' });
        if (r && r.amount > 0) struck.push(e.id);
      }
      events.emit(getTick(), 'curse_proc', { curse: 'tolling_dead', stage: 'strike', from: p.from, struck, radius: K.radius, x: r2(p.x), z: r2(p.z) });
    },
  };

  // ------------------------------------------------------- run hooks --
  // A combat or boss room's first tick.
  function onRoomEnter(room, mode) {
    if (!on) return;
    savedThisRoom = [];
    roomNow = room;
    roomMode = mode;
    tenorKills = 0;
    flaskUsed = [];
    // Stormglass's own gust: a fight's first one after a full beat (never in
    // an event or vault room; endOfTick skips a room with gust vents).
    stormNext = mode === 'event' || mode === 'vault' ? -1 : getTick() + RELICS.stormglass.storm.everyTicks;
    later = later.filter((p) => p.kind === 'refill');
    if (curse && curse.room !== room) curse = null;
    if (curse) {
      events.emit(getTick(), 'curse_apply', { curse: curse.id, room, mode, ...(CURSES[curse.id].major ? { major: true } : {}), x: r2(player.x), z: r2(player.z) });
      if (has('cinder_pact')) events.emit(getTick(), 'relic_proc', { relic: 'cinder_pact', room, majors: majors.length, x: r2(player.x), z: r2(player.z) });
    }
    if (has('huntsmans_horn') && (mode === 'hunt' || mode === 'purge')) events.emit(getTick(), 'relic_proc', { relic: 'huntsmans_horn', room, mode, stage: 'enter', x: r2(player.x), z: r2(player.z) });
    if (has('oathkeepers_brand') && vowLevel() > 0 && mode !== 'event' && mode !== 'vault') events.emit(getTick(), 'relic_proc', { relic: 'oathkeepers_brand', room, level: vowLevel(), x: r2(player.x), z: r2(player.z) });
    if (has('vigil_candle') && (mode === 'escort' || mode === 'hold')) events.emit(getTick(), 'relic_proc', { relic: 'vigil_candle', room, mode, x: r2(player.x), z: r2(player.z) });
    if (has('pilgrims_lamp') && mode === 'event') {
      const L = RELICS.pilgrims_lamp.lamp;
      for (const e of partyBodies()) if (e.hp > 0 && e.hp < e.maxHp) combat.applyHeal(e, e.maxHp * L.heal, { source: 'pilgrims_lamp' });
      pay(L.glint, 'relic_pilgrims_lamp');
      events.emit(getTick(), 'relic_proc', { relic: 'pilgrims_lamp', room, glint: L.glint, x: r2(player.x), z: r2(player.z) });
    }
    if (has('heron_quill')) {
      const tick = getTick();
      for (const e of partyBodies()) if (e.kind === 'ally' && Array.isArray(e.cds)) e.cds = e.cds.map(() => tick);
      const s = skillSys.serialize();
      s.slots = s.slots.map((x) => (x ? { ...x, remaining: 0 } : null));
      skillSys.restore(s);
      events.emit(tick, 'relic_proc', { relic: 'heron_quill', x: r2(player.x), z: r2(player.z) });
    }
  }

  // The room was cleared (boundary step 5). `gainGlint(n, reason)` is the
  // run's wallet. Returns nothing; queues the pick that is owed.
  function onRoomCleared(room, { forfeited = false, gainGlint, boss = false, objective = null, won = false, champion = null } = {}) {
    if (!on) return;
    const tick = getTick();
    roomMode = null;
    ring = null;
    stormNext = -1;
    // Batch 5: a Bottomless Flask still pouring fills its slot now; a
    // knell or a second burst still waiting dies with the room.
    const refills = later.filter((p) => p.kind === 'refill');
    later = [];
    for (const p of refills) BATCH5.refill(p);
    // Batch 4: Banner Pennant (any objective won), Champion's Laurel (the
    // chest), Geode Heart (a cursed room cleared).
    if (has('banner_pennant') && objective && won) {
      const healed = healParty(RELICS.banner_pennant.pennant.heal, 'banner_pennant');
      events.emit(tick, 'relic_proc', { relic: 'banner_pennant', room, mode: objective, healed, x: r2(player.x), z: r2(player.z) });
    }
    if (has('champions_laurel') && champion && !forfeited) {
      const G = RELICS.champions_laurel.laurel.glint;
      gainGlint(G, 'relic_champions_laurel');
      events.emit(tick, 'relic_proc', { relic: 'champions_laurel', room, champion, glint: G, x: r2(player.x), z: r2(player.z) });
    }
    if (has('geode_heart') && !forfeited && curse && curse.room === room) {
      const G = RELICS.geode_heart.geode.glint;
      gainGlint(G, 'relic_geode_heart');
      events.emit(tick, 'relic_proc', { relic: 'geode_heart', room, curse: curse.id, glint: G, x: r2(player.x), z: r2(player.z) });
    }
    if (has('huntsmans_horn') && objective && won) {
      gainGlint(RELICS.huntsmans_horn.horn.glint, 'relic_huntsmans_horn');
      events.emit(tick, 'relic_proc', { relic: 'huntsmans_horn', room, mode: objective, stage: 'won', glint: RELICS.huntsmans_horn.horn.glint, x: r2(player.x), z: r2(player.z) });
    }
    if (has('grave_coin')) gainGlint(RELICS.grave_coin.glint, 'relic_grave_coin');
    if (has('hearthstone')) {
      for (const e of partyBodies()) if (e.hp > 0 && e.hp < e.maxHp) combat.applyHeal(e, e.maxHp * RELICS.hearthstone.clearHeal, { source: 'hearthstone' });
      events.emit(tick, 'relic_proc', { relic: 'hearthstone', x: r2(player.x), z: r2(player.z) });
    }
    const cursed = curse && curse.room === room ? curse.id : null;
    if (cursed) {
      events.emit(tick, 'curse_lift', { curse: curse.id, room, forfeited });
      curse = null;
    }
    if (boss || forfeited) return;
    if (cursed) due = { room, source: CURSES[cursed].major ? 'major' : 'curse', curse: cursed };
    else if (room === 1) due = { room, source: 'free' };
  }

  // Called once the draft is resolved: opens the owed pick, if any. Returns
  // true when a pick is now open (the run enters phase 'relic').
  function presentDue(gainGlint) {
    if (!on || !due) return false;
    const d = due;
    due = null;
    let pool = pool0();
    // A major curse pays a GREATER pick: rare and legendary relics only
    // (any relic once those run out).
    // EVENT ROOMS: the altar pays legendaries (rare when none are left), the
    // spirit pays the greater pool like a major curse.
    // THE STILL SPIRE: the Gods' Seat pays the altar's legendaries.
    if (d.source === 'altar' || d.source === 'seat') {
      const legend = pool.filter((id) => RELICS[id].rarity === 'legendary');
      const greater = pool.filter((id) => RELICS[id].rarity !== 'common');
      if (legend.length > 0) pool = legend;
      else if (greater.length > 0) pool = greater;
    }
    // CHAMPION ROOMS: the champion's chest pays the greater pool too.
    // Batch 4: Geode Heart grows a plain cursed room's pick into a greater one.
    // SHRINES: the Geode Shrine's pick (a key's worth) is a greater one too.
    if (d.source === 'major' || d.source === 'spirit' || d.source === 'champion' || d.source === 'shrine' || (d.source === 'curse' && has('geode_heart'))) {
      const greater = pool.filter((id) => RELICS[id].rarity !== 'common');
      if (greater.length > 0) pool = greater;
    }
    if (Array.isArray(d.not)) pool = pool.filter((id) => !d.not.includes(id));
    const choices = [];
    while (choices.length < RELIC_RULES.choices && pool.length > 0) choices.push(weightedTake(stream, pool));
    if (choices.length === 0) {
      gainGlint(RELIC_RULES.emptyPoolGlint, 'relic_pool_empty');
      return false;
    }
    offer = { room: d.room, source: d.source, choices, focus: 0, ...(d.curse ? { curse: d.curse } : {}) };
    events.emit(getTick(), 'relic_offer', { room: d.room, source: d.source, choices: [...choices] });
    return true;
  }

  function focus(i) {
    if (!offer) return null;
    const n = Number(i);
    if (Number.isInteger(n) && n >= 0 && n < offer.choices.length) offer.focus = n;
    return offer.focus;
  }

  // Take choice `i` (default: the focused one). Returns the relic id.
  function choose(i) {
    if (!offer) return null;
    const n = Number.isInteger(Number(i)) && i !== null && i !== undefined ? Number(i) : offer.focus;
    const id = offer.choices[n];
    if (!id) return null;
    owned.push(id);
    const o = offer;
    offer = null;
    events.emit(getTick(), 'relic_gain', { relic: id, rarity: RELICS[id].rarity, room: o.room, source: o.source, owned: owned.length, x: r2(player.x), z: r2(player.z) });
    return id;
  }

  // Path screen: does one door carry a curse? -> { side, curse, major? } | null.
  // A cursed door is major with RELIC_RULES.majorChance while the run holds
  // fewer than majorMax major curses (one more stream draw only then).
  function rollDoorCurse() {
    if (!on) return null;
    if (forced) {
      const f = forced;
      forced = null;
      return { side: f.side, curse: f.curse, ...(CURSES[f.curse].major ? { major: true } : {}) };
    }
    if (!(stream.float() < RELIC_RULES.curseChance)) return null;
    const side = stream.int(2);
    const free = MAJOR_CURSE_IDS.filter((id) => !majors.includes(id));
    if (free.length > 0 && majors.length < RELIC_RULES.majorMax && stream.float() < RELIC_RULES.majorChance) {
      return { side, curse: free[stream.int(free.length)], major: true };
    }
    const id = CURSE_IDS[stream.int(CURSE_IDS.length)];
    return { side, curse: id };
  }

  function takeCurse(id, room) {
    if (!on || !CURSES[id]) return;
    const major = !!CURSES[id].major;
    if (major && majors.includes(id)) return;
    curse = { id, room, ...(major ? { major: true } : {}) };
    if (major) majors.push(id);
    cursesTaken += 1;
    events.emit(getTick(), 'curse_taken', { curse: id, room, taken: cursesTaken, ...(major ? { major: true, majors: majors.length } : {}) });
  }

  // The ROOM curse that reshapes room `room`'s numbers (a major curse's
  // numbers come from majorCurses(), every combat room).
  const curseFor = (room) => (on && curse && curse.room === room && !curse.major ? curse.id : null);

  // ------------------------------------------------- the relic shelf --
  // The room-7 peddler's relic shelf: RELIC_RULES.shelfSize relics (relic
  // stream, by rarity weight, none owned), priced by rarity. Any character
  // buys from its own purse; the relic is the party's.
  function openShelf() {
    if (!on) return null;
    const pool = pool0();
    const ids = [];
    while (ids.length < RELIC_RULES.shelfSize && pool.length > 0) ids.push(weightedTake(stream, pool));
    shelf = ids.map((id) => ({ id, price: RELIC_RULES.shelfPrice[RELICS[id].rarity], sold: false }));
    events.emit(getTick(), 'relic_shelf', { stock: shelf.map((s) => ({ relic: s.id, rarity: RELICS[s.id].rarity, price: s.price })) });
    return shelf;
  }
  const shelfItem = (i) => (on && shelf && shelf[i] && !shelf[i].sold && !owned.includes(shelf[i].id) ? shelf[i] : null);
  // The purse was charged by the run; the relic joins the party.
  function sellShelf(i, seat, purse) {
    const item = shelfItem(i);
    if (!item) return null;
    item.sold = true;
    events.emit(getTick(), 'relic_purchase', { relic: item.id, rarity: RELICS[item.id].rarity, price: item.price, seat, wallet: purse, index: i });
    gain(item.id, 'shop', player, { seat });
    return item.id;
  }

  // Level reset (level clear): nothing level-bound survives but the relics.
  function levelReset() {
    shelf = null;
    dropped = false;
    roomNow = 0;
    curse = null;
    due = null;
    offer = null;
    savedThisRoom = [];
    pending = [];
    roomMode = null;
    oathAt = {};
    ring = null;
    later = [];
    tenorKills = 0;
    flaskUsed = [];
    stormNext = -1;
  }

  // Shop: the Healer's shelf prices with Peddler's Seal.
  function shopPrice(price) {
    if (!on || !has('peddlers_seal')) return price;
    return Math.max(1, Math.round(price * (1 - RELICS.peddlers_seal.shop)));
  }

  function view() {
    return {
      owned: owned.map((id) => ({ id, name: RELICS[id].name, rarity: RELICS[id].rarity, text: RELICS[id].text, ...(RELICS[id].cls ? { cls: RELICS[id].cls } : {}) })),
      curse: curse ? { id: curse.id, room: curse.room, name: CURSES[curse.id].name, text: CURSES[curse.id].text, ...(curse.major ? { major: true } : {}) } : null,
      cursesTaken,
      majors: majors.map((id) => ({ id, name: CURSES[id].name, text: CURSES[id].text })),
      // VOW RANKS: Heavy Bell's slower dodges, for the HUD ring (present only
      // when worn).
      ...(vowMods() && vowMods().dodge ? { vowDodge: vowMods().dodge } : {}),
      shelf: shelf ? shelf.map((s) => ({ id: s.id, name: RELICS[s.id].name, rarity: RELICS[s.id].rarity, text: RELICS[s.id].text, ...(RELICS[s.id].cls ? { cls: RELICS[s.id].cls } : {}), price: s.price, sold: s.sold || owned.includes(s.id) })) : null,
      offer: offer
        ? {
            room: offer.room,
            source: offer.source,
            focus: offer.focus,
            ...(offer.curse ? { curse: { id: offer.curse, name: CURSES[offer.curse].name } } : {}),
            choices: offer.choices.map((id) => ({ id, name: RELICS[id].name, rarity: RELICS[id].rarity, text: RELICS[id].text, ...(RELICS[id].cls ? { cls: RELICS[id].cls } : {}) })),
          }
        : null,
    };
  }

  function saveState() {
    if (!on) return null;
    return {
      on,
      stream: stream.getState(),
      owned: [...owned],
      curse: curse ? { ...curse } : null,
      cursesTaken,
      majors: [...majors],
      shelf: shelf ? shelf.map((s) => ({ ...s })) : null,
      roomNow,
      dropped,
      due: due ? { ...due } : null,
      offer: offer ? { ...offer, choices: [...offer.choices] } : null,
      savedThisRoom: [...savedThisRoom],
      ...(roomMode ? { roomMode } : {}),
      ...(Object.keys(oathAt).length ? { oathAt: { ...oathAt } } : {}),
      ...(charmHits ? { charmHits } : {}),
      ...(tollHits ? { tollHits } : {}),
      ...(ring ? { ring: { ...ring } } : {}),
      ...(later.length ? { later: later.map((p) => ({ ...p })) } : {}),
      ...(trophies ? { trophies } : {}),
      ...(tenorKills ? { tenorKills } : {}),
      ...(flaskUsed.length ? { flaskUsed: [...flaskUsed] } : {}),
      ...(stormNext >= 0 && has('stormglass') ? { stormNext } : {}),
      ...(pending.length ? { pending: pending.map((p) => ({ ...p })) } : {}),
    };
  }
  function loadState(d) {
    if (!d || !d.on) {
      reset(0, false);
      return;
    }
    reset(d.stream && Number.isFinite(d.stream.seed) ? d.stream.seed : 0, true);
    if (d.stream) stream.setState(d.stream);
    owned = Array.isArray(d.owned) ? d.owned.filter((id) => RELICS[id]) : [];
    curse = d.curse && CURSES[d.curse.id] ? { ...d.curse } : null;
    cursesTaken = Number.isFinite(d.cursesTaken) ? d.cursesTaken : 0;
    majors = Array.isArray(d.majors) ? d.majors.filter((id) => CURSES[id] && CURSES[id].major) : [];
    shelf = Array.isArray(d.shelf) ? d.shelf.filter((s) => s && RELICS[s.id]).map((s) => ({ id: s.id, price: Number(s.price) || 0, sold: !!s.sold })) : null;
    roomNow = Number.isFinite(d.roomNow) ? d.roomNow : 0;
    dropped = !!d.dropped;
    due = d.due ? { ...d.due } : null;
    offer = d.offer && Array.isArray(d.offer.choices) ? { ...d.offer, choices: d.offer.choices.filter((id) => RELICS[id]) } : null;
    savedThisRoom = Array.isArray(d.savedThisRoom) ? [...d.savedThisRoom] : [];
    roomMode = typeof d.roomMode === 'string' ? d.roomMode : null;
    oathAt = d.oathAt && typeof d.oathAt === 'object' ? { ...d.oathAt } : {};
    charmHits = Number.isFinite(d.charmHits) ? d.charmHits : 0;
    tollHits = Number.isFinite(d.tollHits) ? d.tollHits : 0;
    ring = d.ring && Number.isFinite(d.ring.x) && Number.isFinite(d.ring.z) ? { x: d.ring.x, z: d.ring.z, r: Number(d.ring.r) || 0, t0: Number(d.ring.t0) || 0 } : null;
    pending = Array.isArray(d.pending) ? d.pending.filter((p) => p && typeof p.kind === 'string').map((p) => ({ ...p })) : [];
    later = Array.isArray(d.later) ? d.later.filter((p) => p && typeof p.kind === 'string' && Number.isFinite(p.at)).map((p) => ({ ...p })) : [];
    trophies = Number.isFinite(d.trophies) ? d.trophies : 0;
    tenorKills = Number.isFinite(d.tenorKills) ? d.tenorKills : 0;
    flaskUsed = Array.isArray(d.flaskUsed) ? d.flaskUsed.filter(Number.isInteger) : [];
    stormNext = Number.isFinite(d.stormNext) ? d.stormNext : -1;
  }

  return {
    reset,
    enabled: () => on,
    enable(v) {
      on = !!v;
      if (on && !stream) stream = createGameplayRng(relicSeed(0));
      if (combat && typeof combat.setMods === 'function') combat.setMods(on ? mods : null);
      return on;
    },
    mods,
    endOfTick,
    onRoomEnter,
    onRoomCleared,
    presentDue,
    hasOffer: () => !!offer,
    focus,
    choose,
    rollDoorCurse,
    takeCurse,
    curseFor,
    majorCurses: () => (on ? [...majors] : []),
    // Batch 4: how much each major curse weighs (Saint's Ashes), the Glint
    // factor (Pauper's Mark), a vault pile's factor (Vault Ledger) and the
    // Hold ring's fade factor (Warding Chalk). All exactly 1 with relics off.
    majorScale,
    glintMul: () => (on ? Math.max(0, 1 - majorSum('glintCut')) : 1),
    vaultPileMul: () => (on && has('vault_ledger') ? RELICS.vault_ledger.ledger.mul : 1),
    holdFadeMul: () => (on && has('warding_chalk') ? RELICS.warding_chalk.chalk.fadeMul : 1),
    // Batch 5: a shrine blessing's length factor (Votive Ribbon), whether the
    // live room is Corked (no tonic or bomb), and the champions felled.
    blessMul: () => (on && has('votive_ribbon') ? RELICS.votive_ribbon.votive.blessMul : 1),
    corked: () => on && cursedHere() && !!CURSES[curse.id] && !!CURSES[curse.id].corked,
    trophies: () => (on ? trophies : 0),
    fuse,
    openShelf,
    shelfItem,
    sellShelf,
    dropNext() {
      if (!on) return false;
      dropNext = true;
      return true;
    },
    forceDoor(curseId, side = 0) {
      // Probe: the next path screen's cursed door (no stream draw).
      if (!on || !CURSES[curseId]) return null;
      forced = { curse: curseId, side: side === 1 ? 1 : 0 };
      return forced;
    },
    levelReset,
    shopPrice,
    owned: () => [...owned],
    pool: () => (on ? pool0() : []),
    // DAILY DESCENT (docs/DAILY.md): the day's fixed relic and major curse,
    // held from the first room. The curse binds like one taken on a door
    // but opens no room, so it owes no pick.
    grantDaily(relicId, curseId) {
      if (!on) return null;
      if (RELICS[relicId] && !owned.includes(relicId)) gain(relicId, 'daily', player);
      if (CURSES[curseId] && CURSES[curseId].major && !majors.includes(curseId)) {
        takeCurse(curseId, 0);
        curse = null;
      }
      return { relic: relicId, curse: curseId };
    },
    // VFX lab (batch 4): play a room relic's beat where the party stands,
    // with its real payout, without building the room around it.
    demo(id) {
      if (!on || !RELICS[id]) return null;
      if (!owned.includes(id)) gain(id, 'grant', player);
      const tick = getTick();
      const at = { x: r2(player.x), z: r2(player.z) };
      if (id === 'shepherds_crook') pending.push({ kind: 'crook_home', target: null, ...at });
      else if (id === 'jailers_ring') pending.push({ kind: 'jailer', by: player.id, ...at });
      else if (id === 'wanderers_token') pending.push({ kind: 'token', encounter: 'demo' });
      else if (id === 'vault_ledger') events.emit(tick, 'relic_proc', { relic: id, pile: 0, glint: 24, x: at.x, z: r2(player.z - 1.5) });
      else if (id === 'warding_chalk') {
        ring = { x: at.x, z: at.z, r: 2.6, t0: tick };
        events.emit(tick, 'relic_proc', { relic: id, stage: 'drawn', radius: 2.6, ...at });
      } else if (id === 'banner_pennant') events.emit(tick, 'relic_proc', { relic: id, mode: 'hold', healed: healParty(RELICS.banner_pennant.pennant.heal, id), ...at });
      else if (id === 'vigil_candle') events.emit(tick, 'relic_proc', { relic: id, mode: 'hold', ...at });
      else if (id === 'champions_laurel') events.emit(tick, 'relic_proc', { relic: id, champion: 'demo', glint: RELICS.champions_laurel.laurel.glint, ...at });
      else if (id === 'geode_heart') events.emit(tick, 'relic_proc', { relic: id, curse: 'restless', glint: RELICS.geode_heart.geode.glint, ...at });
      // Batch 5: each beat through its real proc, in front of the party.
      else if (id === 'brewers_satchel') pending.push({ kind: 'satchel', seat: player.partyIndex ?? 0, by: player.id, item: 'mend_tonic' });
      else if (id === 'votive_ribbon') pending.push({ kind: 'votive', x: at.x, z: r2(at.z - 1.6), blessing: 'tailwind' });
      else if (id === 'stormglass') {
        // Its own gust (the every-land beat): the lane gathers, then blows.
        const S = RELICS.stormglass.storm;
        const lane = { x0: r2(at.x - 4.5), z0: r2(at.z - 2.2), x1: r2(at.x + 4.5), z1: r2(at.z - 2.2), w: S.w };
        later.push({ kind: 'storm', at: tick + S.gatherTicks, lane, own: true });
        events.emit(tick, 'relic_proc', { relic: id, stage: 'gather', lane: { ...lane }, resolveTick: tick + S.gatherTicks, x: at.x, z: lane.z0 });
      }
      else if (id === 'twin_fuse') {
        const F = RELICS.twin_fuse.fuse;
        const fz = r2(at.z - 2.6);
        later.push({ kind: 'fuse', at: tick + F.delayTicks, item: 'fire_bomb', seat: 0, x: at.x, z: fz, radius: CONSUMABLES.fire_bomb.radius });
        events.emit(tick, 'relic_proc', { relic: id, stage: 'lit', item: 'fire_bomb', radius: CONSUMABLES.fire_bomb.radius, resolveTick: tick + F.delayTicks, x: at.x, z: fz });
      } else if (id === 'trophy_cord') {
        trophies += 1;
        pending.push({ kind: 'trophy', x: at.x, z: r2(at.z - 2), id: null });
      } else if (id === 'oathkeepers_brand') events.emit(tick, 'relic_proc', { relic: id, level: Math.max(1, vowLevel()), ...at });
      else if (id === 'bottomless_flask') {
        const seat = player.partyIndex ?? 0;
        later.push({ kind: 'refill', at: tick + 90, seat, item: 'mend_tonic' });
        events.emit(tick, 'relic_proc', { relic: id, stage: 'pour', seat, item: 'mend_tonic', target: player.id, ...at });
      } else if (id === 'tenor_bell') pending.push({ kind: 'tenor', x: at.x, z: at.z, id: null });
      return id;
    },
    grant(id) {
      // Probe / harness: give a relic now (no pick).
      if (!on || !RELICS[id] || owned.includes(id)) return null;
      gain(id, 'grant', player);
      return id;
    },
    // EVENT ROOMS (docs/EVENT_ROOMS.md): a pick owed by an encounter (shown
    // by the next presentDue), a relic given outright, the newest relic
    // taken back, and a major curse taken in an event room.
    // SHRINES: is a pick already owed (a cursed room's) when the room clears?
    owed: () => !!due,
    owe(room, source, { not = null, curse = null } = {}) {
      if (!on) return false;
      due = { room, source, ...(Array.isArray(not) && not.length ? { not: [...not] } : {}), ...(curse && CURSES[curse] ? { curse } : {}) };
      return true;
    },
    grantRandom(source, at = player) {
      if (!on) return null;
      const pool = pool0();
      if (pool.length === 0) return null;
      const id = weightedTake(stream, pool);
      gain(id, source, at);
      return id;
    },
    // More event rooms (slice 6): a relic given outright from the rarities
    // listed (the first of `tiers` with anything left; any relic after
    // that), never one of `not`. The smith's reforge and the dice's doubles.
    grantTier(source, tiers = [], not = null, at = player) {
      if (!on) return null;
      let pool = pool0();
      if (Array.isArray(not)) pool = pool.filter((id) => !not.includes(id));
      for (const tier of tiers) {
        const some = pool.filter((id) => tier.includes(RELICS[id].rarity));
        if (some.length > 0) {
          pool = some;
          break;
        }
      }
      if (pool.length === 0) return null;
      const id = weightedTake(stream, pool);
      gain(id, source, at);
      return id;
    },
    loseNewest(source) {
      if (!on || owned.length === 0) return null;
      const id = owned.pop();
      events.emit(getTick(), 'relic_lose', { relic: id, rarity: RELICS[id].rarity, source, owned: owned.length, x: r2(player.x), z: r2(player.z) });
      return id;
    },
    freeMajors: () => (on && majors.length < RELIC_RULES.majorMax ? MAJOR_CURSE_IDS.filter((id) => !majors.includes(id)) : []),
    // THE STILL SPIRE (plan 4 slice 7): the Silent Bell lifts the newest
    // major curse (it stays counted in cursesTaken: the curse was taken).
    liftMajor(source) {
      if (!on || majors.length === 0) return null;
      const id = majors.pop();
      events.emit(getTick(), 'curse_lifted', { curse: id, source, majors: majors.length, x: r2(player.x), z: r2(player.z) });
      return id;
    },
    takeMajor(id, room) {
      if (!on || !CURSES[id] || !CURSES[id].major || majors.includes(id)) return null;
      majors.push(id);
      cursesTaken += 1;
      events.emit(getTick(), 'curse_taken', { curse: id, room, taken: cursesTaken, major: true, majors: majors.length, source: 'altar' });
      return id;
    },
    view,
    saveState,
    loadState,
  };
}
