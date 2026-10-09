// Run structure — the 8-room run (BUILD_BRIEF §2 "Run overview", §13 "Rooms &
// run lifecycle", §14 "Glint economy", §16 "Draft, shop, path flow").
//
// One run = 8 rooms: 1-6 combat (exactly 2 defend, 4 kill_all; room 1 is
// always kill_all per ruling A3), room 7 shop, room 8 boss. The RUN FRAME
// (defend positions, path pairings, reward-side randomization) is rolled ONCE
// at run start from the seeded stream and is immutable — so the same seed
// always plays the same shape of run.
//
// Room-clear boundary sequence (§13, fixed order from the clear tick):
//   1. combat_active := false
//   2. every live combat entity ends (projectiles, zones, surviving enemies)
//   3. all Downed party members revive at 30% max_hp
//   4. targeting state clears: mark -> none, heal overrides cleared, rally
//      point cleared
//   5. `room_cleared` + stipend +12 Glint for combat rooms
//   6. reward presentation (skipped if forfeited) -> path choice (rooms 1-5)
//      -> transition fade
//   7. next room's first tick: combat_active := true
// Steps 2-4 are shared with the enemy/ally blocks, which already hang their
// half off `room_cleared` (survivor retreat + shot despawn in sim/waves.js;
// free revives, mark and rally clearing in sim/allies.js) — this module owns
// the player-side transient sweep, the heal-override clear, the stipend, and
// the whole of step 6.
//
// PERSISTENCE (§13): cooldowns (skills + dodge), party HP + Downed state,
// owned skills + socket assignments, bench nodes, Glint, RNG stream state and
// the run frame all persist ACROSS every boundary — this module never touches
// them at a transition. CLEARED each boundary: targeting state, projectiles,
// zones. WIPED at run end: everything.
//
// Sim discipline: no DOM, no render imports, no wall clock. The UI in
// src/ui/run/** is a pure view over `view()` and drives the same entry points
// __echoes.cmd does.
//
// GAUNTLET (docs/gauntlet/PLAN.md §3.6 / §4.1 / §4.2, BUILD_BRIEF §23.1–23.2):
//   - startRun({ act = 1, challenge = 'standard' }) — the expedition and the
//     difficulty challenge ride run state (serialised); the curve reads run
//     state, never settings (contract (f)).
//   - every room rolls its LAYOUT from the act's room table (never the same
//     layout twice in a row; room 8 = the act's boss layout; the shop keeps
//     the last combat layout's biome) with the run RNG, right after the wave
//     schedule, and delivers it two ways: runSys.setRoomHooks({ enter(layout,
//     tick), exit(tick) }) for the sim content systems (M4b), and the
//     `layout_enter { room, act, layoutId, biome }` event right before
//     `room_enter` for presentation (contract (a)).
//   - wave rooms are planned with the act's roster and the §4.2 numbers; the
//     boss room scales the Stag (HP 2400·T, damage) and its act-tier adds.
//   - the status tracker (sim/status.js) announces status_apply / expire at
//     the end of every tick; the autopilot (sim/autopilot.js) is created here.
//
// LINEAR CAMPAIGN (CAMPAIGN, 2026-09-25 — docs/gauntlet/PLAN.md §12, the
// user's CRITICAL REFACTOR). This module is also the LEVEL DIRECTOR:
//   - startCampaign({ level }) opens a campaign AT a level; clearing a level
//     (the boss room's room_cleared — the Stag AND its adds dead) fires
//     `level_clear` exactly once (a per-level latch), resets the level
//     (director, boss, every hostile and transient, hazards + interactables
//     through the room hooks), restores the party per data/campaign.js
//     CARRY_RULES and enters phase 'transit' (the level-clear card). The
//     host presentation (src/campaign/manager.js) calls campaignAdvance()
//     once the next level is ready; the sim advances by itself at the card's
//     hardUntilTick, so the card can never hang. The next level rolls a fresh
//     run frame from the CARRIED run RNG stream and enters its room 1.
//   - only the FINAL level's clear ends the run (victory, CAMPAIGN COMPLETE
//     card, automatic return to camp after TRANSIT.victoryReturnTicks).
//   - abandonRun() is the pause menu's Quit to Lobby: run_end
//     { result: 'abandoned' } then return_to_camp, no end card.
//   - startRun({ act }) keeps its legacy contract — ONE level (a 'single'
//     run: the Stag clear -> victory -> camp) for the act runner, simtrace,
//     ?run=1 and every probe written against it.
//   - view() keeps its exact shape (the Node golden traces hash it); the
//     campaign is read through campaign(), and no new event fires before the
//     first level clear, so the 9 goldens stay bit-identical.
import { TICK_HZ, SKILL_SLOTS } from '../core/constants.js';
import { PARTY_ALLIES, STARTING_SKILLS, SKILLS, HEALER_SKILL_IDS } from './skills.js';
import { createDraftSystem, SPOILS_PER_CLEAR, refreshPrice } from './draft.js';
import { NODES } from './nodes.js';
import { levelFor, ACT_IDS, ENDLESS_ACTS, bossFor, campaignLevel } from '../data/levels.js';
// ENDLESS (docs/ENDLESS.md): the descent past Act III.
import { endlessDifficulty, endlessLevel, endlessBossIndex, endlessNextLevel, endlessRules, levelOfDepth, beyondCampaign } from '../data/endless.js';
import { LAYOUTS } from '../data/layouts.js';
import { difficulty, CHALLENGE, setDifficultyLegacy, isDifficultyLegacy } from '../data/difficulty.js';
import { createStatusTracker, STATUS_KINDS } from './status.js';
import { createAutopilot } from './autopilot.js';
// RELICS (docs/CONTENT_PLAN.md §5): run-long relics + cursed doors.
import { createRelicSystem, cursedDiff, dailyOmen } from './relics.js';
// DAILY DESCENT (docs/DAILY.md): the shared run of the UTC day.
import { isDailyKey, dailySeed, dailyLevelSeed, dailyDepth, DAILY_RULES } from '../data/daily.js';
// ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md): hunt and purge rooms.
import { assignObjectives, isObjectiveMode, OBJECTIVE_RULES } from './objectives.js';
// CHAMPION ROOMS (docs/CHAMPIONS.md): the crown door and its relic chest.
import { crownFor, crownSide, championFor, CHAMPION_RULES, isChampionKind } from './champions.js';
// KEYS AND VAULTS (docs/VAULTS.md): keys from elites and champions, the vault
// door and its treasure room.
import { createVaultSystem, eliteDropsKey, vaultPref, vaultSide, VAULT_RULES, VAULT_SPOTS, VAULT_CHEST } from './vaults.js';
import { staticClearance } from './movement.js';
// EVENT ROOMS (docs/EVENT_ROOMS.md): "?" doors and their encounters.
import { createEncounterSystem, ENCOUNTERS, EVENT_RULES } from './encounters.js';
// ELITE AFFIXES (docs/ELITE_AFFIXES.md): how many powers an elite carries.
import { affixCountFor, AFFIX_RULES, AFFIXES } from './affixes.js';
import { encounterSpec } from './interactables.js';
// CROSS-RUN UNLOCKS (docs/UNLOCKS.md): the boons a campaign is started with.
import { sanitizeBoons } from '../data/unlocks.js';
import { swapSuggestion, PARTY_DEADLINES } from '../data/classes.js';
import { DEFAULT_LINEUP } from '../data/lineup.js';
// PARTY (PLAN §16.3): the party page + the party shelves.
import { createPartyPages } from './partypage.js';
import { suggestShelf } from './partyai.js';
import { fillStress } from './party.js';
import { STRESS_LOADOUT, gatedPool } from '../data/classes.js';
import { SHARED_NODE_IDS } from './nodes.js';
import {
  CARRY_RULES,
  TRANSIT,
  FIRST_LEVEL,
  nextLevel,
  isLevel,
  grantFor,
  campaignRules,
} from '../data/campaign.js';

// Plain-data deep copy (sim state only — structuredClone keeps -Infinity/NaN).
const cloneData = (v) => (v === null || v === undefined ? v : structuredClone(v));

const r2 = (v) => Math.round(v * 100) / 100;

// TUTORIAL (docs/TUTORIAL.md): the guided room's layout (Level 1's clearing
// with a dewfont) and how much gentler it is than a real room 1.
export const TUTORIAL_LAYOUT = 2;
export function tutorialDiff(d) {
  return Object.freeze({ ...d, budget: d.budget * 0.5, hpMul: d.hpMul * 0.6, dmgMul: d.dmgMul * 0.4, eliteChance: 0 });
}

export const RUN = Object.freeze({
  rooms: 8, // §2
  combatRooms: 6, // rooms 1-6
  defendCount: 2, // §2: exactly 2 of rooms 1-6 are defend
  shopRoom: 7, // §2 fixed
  bossRoom: 8, // §2 fixed
  stipend: 12, // §14 clear stipend, per combat-room clear (incl. boss)
  startingGlint: 0, // §14
  shopWallet: 72, // §14 deterministic wallet at the shop = 0 + 12x6
  spoilsPerClear: SPOILS_PER_CLEAR, // M4c: nodes dropped on the bench per combat-room clear (rooms 1-6)
  pathRooms: 5, // §2: rooms 1-5 clear -> path choice
  fadeTicks: Math.round(0.3 * TICK_HZ), // §16 enter/exit <= 300 ms fades
});

// §16 path doors carry ONLY these two glyph channels.
export const WIN_GLYPH = Object.freeze({ kill_all: '⚔', defend: '⛨', boss: '☠', event: '?', hunt: '➶', purge: '✹', champion: '♛', vault: '⚿' });
export const REWARD_GLYPH = Object.freeze({ skill: '✦', node: '◈' });

export function createRunSystem({
  rng,
  registry,
  events,
  getTick,
  player,
  waves,
  enemies,
  boss,
  skillSys,
  buildSys,
  allySys,
  combat,
  party = null, // PARTY: the party system (sim/party.js)
}) {
  // MORE CLASS SKILLS (docs/CLASS_SKILLS.md): the 2026-10-08 skills and
  // nodes join the pools in a campaign (Endless too), never in the tutorial or
  // the legacy single-level run, so the nine golden traces draw as before.
  const poolsGrown = () => !!(campaign && campaign.mode === 'campaign' && !campaign.tutorial);
  // NEW ENEMIES (docs/WOOD_MILL_ENEMIES.md): the campaign-only creatures join
  // the wave rosters on the same gate (campaign, Endless, the Daily; never the
  // tutorial or the legacy single-level run, so the goldens hold).
  const roomLevel = (lv) => (poolsGrown() ? campaignLevel(lv) : lv);
  const draft = createDraftSystem({
    rng,
    build: () => buildSys,
    slots: () => skillSys.slotsView(),
    skillIds: () => gatedPool(HEALER_SKILL_IDS, poolsGrown()),
  });
  if (party && typeof party.setPoolGate === 'function') party.setPoolGate(poolsGrown);
  // Late-bound cross links between the skill kit and the build system (both
  // exist before the run system): Resonance's per-cast hook, and Echo's
  // recasts / passive Reapply pulses through the kit's own delivery.
  if (typeof skillSys.attachBuild === 'function') skillSys.attachBuild(buildSys);
  // PARTY: the party page / shelves module over the three ally builds. The
  // ally supply can be switched off (Node determinism proof, PLAN §16.9).
  const controllers = () => (allySys && typeof allySys.controllers === 'function' ? allySys.controllers() : ['human', 'ai', 'ai', 'ai']);
  const pages = party
    ? createPartyPages({
        party,
        events,
        getTick,
        controllers,
        humansInSession: () => controllers().filter((c) => c === 'human').length,
      })
    : null;
  let supplyOn = !!party;
  let harnessGrant = null; // ?partygrant=N | 'max' — applied at the next run start
  let relicsDefault = true; // RELICS: campaigns roll relics + curses (cmd('relicsDefault'))
  const allyOn = () => supplyOn && !!pages;
  if (typeof buildSys.attachSkills === 'function') buildSys.attachSkills(skillSys);
  const statusTracker = createStatusTracker({ registry, events, getTick });
  const relics = createRelicSystem({ registry, events, getTick, combat, skillSys, player, live: () => active, glint: (n, reason) => gainGlint(n, reason) });
  // EVENT ROOMS: on with the relics (campaigns only, never the tutorial).
  const encounters = createEncounterSystem({ events, getTick });
  const encCtx = () => ({ wallet, relics: relics.owned().length, freeMajors: relics.freeMajors().length });
  events.on('event_touch', () => openEncounter());
  const autopilot = createAutopilot({
    registry,
    player,
    run: () => api,
    skills: skillSys,
    build: () => buildSys,
  });

  // §2 "all run state wiped at run end" / §18 "Corruption never touches
  // Camp": after the first run has been played, an enemy may spawn ONLY while
  // a run is in live combat. Before any run the ?room=/?scene=arena harness
  // keeps its ungated spawns. The same predicate gates kill hitstop
  // (sim/world.js) so a stray kill can never stall the sim on an end card.
  function combatAllowed() {
    return !everStarted || (active && phase === 'combat');
  }
  enemies.setSpawnGate(combatAllowed);
  // RELICS (Short Fuse): a cursed room's shorter telegraphs.
  if (typeof enemies.setFuse === 'function') enemies.setFuse(() => (active ? relics.fuse() : null));
  // ELITE AFFIXES (docs/ELITE_AFFIXES.md): elites in a campaign's wave rooms
  // (and the trapped chest's ambush) carry named powers. Never the boss room,
  // the tutorial, the legacy single-level run or the ?room= harness (relics
  // off), so the nine golden traces see none.
  if (typeof enemies.setAffixRule === 'function') enemies.setAffixRule(affixRule);
  function affixRule() {
    if (!active || phase !== 'combat' || !frame || !campaign || campaign.mode !== 'campaign' || campaign.tutorial || !relics.enabled()) return null;
    if (frame.modes[roomIndex - 1] === 'boss') return null;
    const depth = endlessDepth();
    // Endless: Depths 1-4 are the campaign's own count; two powers from Depth 5.
    return { count: affixCountFor({ act, room: roomIndex, endless: beyondCampaign(depth) }), salt: `${frame.seed}:${depth || act}:${campaign.index}:${roomIndex}` };
  }

  let active = false;
  // fix-M4a-r5 (GP.8, data/classes.js AI_ENGAGE): the AI-held seats' campaign
  // engagement rules run while a run is live — never in the ?room= harness and
  // never under the Node-only legacy switch (the §16.9 determinism proof).
  if (allySys && typeof allySys.setEngage === 'function') allySys.setEngage(() => active && !isDifficultyLegacy());
  let roomIndex = 0; // 1..8 while a run is live
  let phase = 'idle'; // idle | combat | reward | path | shop | fade | victory | defeat
  let wallet = RUN.startingGlint;
  let frame = null;
  let reward = null; // live draft candidate
  let path = null; // live path offer
  let shop = null; // live shelf
  let summary = null; // frozen run summary for the end screens
  let pendingRoom = 0; // room the fade is walking toward
  let fadeUntilTick = 0;
  let rewardFor = {}; // room index -> promised reward type
  let clearedRooms = 0; // COMBAT rooms cleared — drives the §14 stipend only
  let roomsDone = 0; // every room left behind (combat + the shop) — the §18 summary row
  let startTick = 0;
  let everStarted = false; // once true, enemies exist only inside live combat
  // M4c clear spoils: the last drop `{ room, nodes: [id...] }` (the reward page
  // names it) and the run's running total (the end card / probes).
  let spoils = null;
  let spoilsTotal = 0;
  // Expedition state (serialised with the run).
  let act = 1;
  let challenge = 'standard';
  let layout = null; // { act, layoutId, biome, room, mode } of the live room
  let lastCombatLayout = null; // the "never the same layout twice in a row" memory
  let roomPlanView = null; // difficulty numbers of the live room (probe)
  let roomHooks = { enter: null, exit: null }; // M4b's content systems (contract (a))
  // Linear campaign (PLAN §12.2) — plain data, serialised with the run:
  //   { mode: 'campaign'|'single', harness, startLevel, level, index,
  //     levels: [{ level, index, startTick, rooms, cleared, ticks }],
  //     startTick, levelStartTick, clearedAt, card, grant, transitions }
  // card (phase 'transit') = { kind: 'clear'|'depart', from, to, startTick,
  //   untilTick, minSkipTick, hardUntilTick, summary }.
  let campaign = null;
  // Content slice 2: which boss room 8 holds is bossFor(act, frame.seed) — a
  // pure hash of the seed, nothing saved. `bossPick` is the harness override
  // (cmd('startRun', { act, boss })), saved only while it is set.
  let bossPick = null;
  // ENDLESS: past the first cycle each cycle meets the act's other boss in turn.
  const currentBoss = () => {
    if (!bossPick && beyondCampaign(endlessDepth())) {
      const lv = levelFor(act);
      if (lv.bosses && lv.bosses.length) return lv.bosses[endlessBossIndex(endlessDepth(), frame ? frame.seed : null)];
    }
    return bossFor(act, frame ? frame.seed : null, bossPick);
  };
  // ENDLESS: the depth of a live endless campaign (= its level index), else 0.
  const endlessDepth = () => (campaign && campaign.endless ? campaign.index : 0);
  // The level after `level` in this campaign: the endless cycle wraps.
  const nextOf = (c, level) => (c && c.mode === 'campaign' ? (c.endless ? endlessNextLevel(level) : nextLevel(level)) : null);
  // CAMPAIGN COMPLETE card -> camp at this tick (survives the run-end wipe).
  let autoReturnTick = null;

  // ROOM OBJECTIVES: on for campaigns (Endless too), off for the tutorial and
  // the legacy single-level run (the goldens).
  const objectivesOn = () => !!(campaign && campaign.mode === 'campaign' && !campaign.tutorial);
  // CHAMPION ROOMS: the crown door rides the same gate (campaign, Endless and
  // the Daily; never the tutorial or the legacy single-level run).
  const championsOn = () => objectivesOn();
  let forcedCrown = null; // probe: the next path screen's crown ({ room, side })
  // KEYS AND VAULTS: on with the champions (campaign, Endless and the Daily;
  // never the tutorial or the legacy single-level run, so the goldens never
  // see a key).
  const vaults = createVaultSystem({ registry, events, getTick });
  let forcedVault = null; // probe: the next path screen's vault side (0 | 1)
  // The champion leaves a key where it fell (its chest spot)...
  events.on('champion_fall', (ev) => {
    if (active && vaults.enabled() && phase === 'combat') vaults.drop('champion', ev.champion, ev.x, ev.z, roomIndex);
  });
  // ...and an elite now and then (a hash of the level, the room and its id).
  events.on('death', (ev) => {
    if (!active || !vaults.enabled() || phase !== 'combat' || !frame || !campaign) return;
    const e = registry.byId(ev.id);
    if (!e || !e.elite || e.faction !== 'hostile' || isChampionKind(e.kind)) return;
    if (eliteDropsKey(frame.seed, campaign.index, roomIndex, e.id)) vaults.drop('elite', e.kind, ev.x, ev.z, roomIndex);
  });
  events.on('vault_touch', () => openVault());
  // The quarry is marked for the whole party the moment it breaks cover.
  events.on('quarry_spawn', (ev) => {
    if (active && allySys && typeof allySys.cmd === 'function') allySys.cmd('mark', [ev.id]);
  });

  // ------------------------------------------------------------ run frame --
  // ONE fixed roll sequence (defend positions, then the 5 path side bits) so a
  // seed reproduces the frame exactly. Room 1 is always kill_all (A3).
  // DAILY: point the gameplay stream at `seed` (the app's handle swaps its
  // stream; a bare stream, in Node tools, is set to a fresh one's state).
  function reseedTo(seed) {
    if (typeof rng.reseed === 'function') rng.reseed(seed >>> 0);
    else if (typeof rng.setState === 'function') rng.setState({ seed: seed >>> 0, s: seed | 0, draws: 0 });
  }

  function rollFrame() {
    const modes = new Array(RUN.rooms).fill('kill_all');
    const candidates = [1, 2, 3, 4, 5]; // 0-based indices of rooms 2..6
    const defendAt = [];
    for (let i = 0; i < RUN.defendCount; i++) {
      const pick = candidates.splice(rng.int(candidates.length), 1)[0];
      modes[pick] = 'defend';
      defendAt.push(pick + 1);
    }
    defendAt.sort((a, b) => a - b);
    modes[RUN.shopRoom - 1] = 'shop';
    modes[RUN.bossRoom - 1] = 'boss';
    // Reward-side randomization for the 5 path screens: 0 = skill door on the
    // left, 1 = skill door on the right. Every pairing has exactly one skill
    // and one node option (§16).
    const sides = [];
    for (let i = 0; i < RUN.pathRooms; i++) sides.push(rng.int(2));
    return { seed: rng.seed, modes, defendAt, sides };
  }

  // -------------------------------------------------------------- lifecycle --
  // startRun({ act, challenge }) — the legacy SINGLE-LEVEL run (harness /
  // probes / act runner / ?run=1): one level, the Stag clear ends it with
  // victory. A start past the first level still gets the starter grant (PLAN
  // §12.4), so the act runner measures exactly "a Level-N start".
  function startRun(opts = {}) {
    const o = opts && typeof opts === 'object' ? opts : {};
    openRun({ act: o.act, challenge: o.challenge, mode: 'single', harness: true });
    if (typeof o.boss === 'string') bossPick = o.boss;
    enterRoom(1);
    return view();
  }

  // startCampaign({ level, challenge, depart, harness }) — a CAMPAIGN from
  // `level` through the final level (PLAN §12.2). `depart`: open on the
  // setting-out card (phase 'transit', kind 'depart') so the presentation can
  // load the level first — always used for a Level-N start from the Level
  // Select, and for Begin Run when Level 1's assets are not resident yet.
  // `harness`: started by a developer path that bypasses the unlock chain
  // (?level=N, cmd('startCampaign')) — the save lock check honours it.
  function startCampaign(opts = {}) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const level = isLevel(o.level ?? o.act) ? Number(o.level ?? o.act) : FIRST_LEVEL;
    // ENDLESS: an endless descent always sets out from the first level.
    // DAILY DESCENT (docs/DAILY.md): the day's shared run — Level 1 on,
    // Standard, nothing equipped; never endless, never the tutorial.
    const daily = o.daily && isDailyKey(o.daily.key) ? { key: o.daily.key } : null;
    const endless = !!o.endless && !daily;
    // TUTORIAL (docs/TUTORIAL.md): the guided first room — always Level 1,
    // never endless, no boons.
    const tutorial = !!o.tutorial && !endless && !daily;
    openRun({
      act: endless || tutorial || daily ? FIRST_LEVEL : level,
      challenge: daily ? DAILY_RULES.challenge : o.challenge,
      mode: 'campaign',
      harness: !!o.harness,
      endless,
      boons: tutorial || daily ? null : o.boons,
      tutorial,
      daily,
      lineup: o.lineup,
    });
    if (o.harness && typeof o.boss === 'string') bossPick = o.boss;
    if (o.depart) beginTransit('depart', null, act, getTick());
    else enterRoom(1);
    return view();
  }

  function openRun({ act: a, challenge: c, mode, harness, endless = false, boons: rawBoons = null, tutorial = false, daily = null, lineup = null }) {
    // UNLOCKS: what the player equipped between runs (campaigns only). null =
    // nothing picked, and then nothing below differs from a plain run.
    const boons = mode === 'campaign' ? sanitizeBoons(rawBoons) : null;
    wipeState({ silent: true });
    autoReturnTick = null;
    bossPick = null;
    act = ACT_IDS.includes(Number(a)) ? Number(a) : 1;
    challenge = CHALLENGE[c] ? c : 'standard';
    // DAILY: the day's seed, whatever stream the session was on.
    const day = daily && mode === 'campaign' ? { key: daily.key, seed: dailySeed(daily.key) } : null;
    if (day) reseedTo(day.seed);
    frame = rollFrame();
    active = true;
    everStarted = true;
    wallet = RUN.startingGlint;
    clearedRooms = 0;
    roomsDone = 0;
    rewardFor = { 1: 'skill' }; // §2: room 1's reward is always a Skill draft
    summary = null;
    spoils = null;
    spoilsTotal = 0;
    startTick = getTick();
    campaign = {
      mode,
      harness: !!harness,
      startLevel: act,
      level: act,
      index: 1,
      levels: [{ level: act, index: 1, startTick, rooms: 0, cleared: false, ticks: 0 }],
      startTick,
      levelStartTick: startTick,
      clearedAt: 0,
      card: null,
      grant: null,
      transitions: 0,
      // ENDLESS: present only on an endless campaign (a plain campaign's
      // record, and so its saves and hashes, are unchanged). `won` = the
      // final level was cleared (the campaign itself is won).
      ...(endless && mode === 'campaign' ? { endless: true, won: false } : {}),
      ...(boons ? { boons } : {}),
      // TUTORIAL: present only on the guided first room. `hold` keeps the
      // waves back until the player has moved, attacked, dodged and used the
      // spring (cmd('tutorialRelease') from the coach, src/ui/tutorial/).
      ...(tutorial && mode === 'campaign' ? { tutorial: { hold: true } } : {}),
      // DAILY: present only on the day's run (the day's relic and curse).
      ...(day
        ? {
            daily: { key: day.key, seed: day.seed, ...dailyOmen(day.seed) },
          }
        : {}),
    };
    // ROOM OBJECTIVES: campaigns (never the tutorial) turn one kill_all room
    // of rooms 4-6 into a hunt or a purge (two on later levels). No draws.
    if (objectivesOn()) assignObjectives(frame.modes, frame.seed, campaign.index);
    // PARTY: every ally back to its starting loadout, empty build, purse 0;
    // the party stream seeded from the run SEED (no gameplay draw).
    // UNLOCKS: an equipped kit replaces a class's starting skills.
    // PARTY LINEUP (docs/LINEUP.md): a campaign (never the tutorial) may seat
    // another class; every other run is the default four. Before the reset,
    // so the reset loads each seat's own class.
    if (party) party.setLineup(mode === 'campaign' && !tutorial ? lineup : DEFAULT_LINEUP);
    if (party) party.resetForRun(frame.seed, boons && boons.kits ? boons.kits : null);
    if (boons && boons.kits && boons.kits.healer) {
      const kit = new Array(SKILL_SLOTS).fill(null);
      boons.kits.healer.slice(0, SKILL_SLOTS).forEach((id, i) => {
        kit[i] = { id, remaining: 0 };
      });
      skillSys.restore({ slots: kit, override: null });
    }
    if (pages) pages.reset();
    // RELICS: on for campaigns, off for the legacy single-level run (goldens).
    relics.reset(frame.seed, mode === 'campaign' && relicsDefault && !tutorial);
    encounters.reset(frame.seed, mode === 'campaign' && relicsDefault && !tutorial);
    vaults.reset(championsOn());
    if (campaign.daily) relics.grantDaily(campaign.daily.relic, campaign.daily.curse);
    // Payload unchanged since v0.5.x (the goldens hash every event).
    events.emit(getTick(), 'run_start', {
      seed: frame.seed,
      modes: [...frame.modes],
      defendAt: [...frame.defendAt],
      sides: [...frame.sides],
      act,
      actName: levelFor(act).name,
      challenge,
      // TUTORIAL: key present only on the guided room (golden payloads unchanged).
      ...(tutorial && mode === 'campaign' ? { tutorial: true } : {}),
    });
    // PARTY: an explicit harness grant (?partygrant) REPLACES a Level-N
    // start's ally grant (never stacks, BUILD_BRIEF §25.10); `max` = the
    // deterministic max-stress build for all four seats.
    const hg = harnessGrant;
    harnessGrant = null;
    if (act !== FIRST_LEVEL && hg !== 'max') applyStarterGrant(act, { allies: hg === null });
    if (hg !== null && allyOn()) applyHarnessGrant(hg);
    if (boons) applyBoons(boons);
  }

  // UNLOCKS: the heirloom relic and the purse land after the starter grant
  // (no draws: the relic is given, not rolled). One `boons` event names them.
  function applyBoons(b) {
    const relic = b.relic ? relics.grant(b.relic) : null;
    if (b.glint) gainGlint(b.glint, 'boon_purse');
    events.emit(getTick(), 'boons', {
      kits: b.kits ? Object.keys(b.kits) : [],
      relic,
      glint: b.glint ?? 0,
      vows: b.vows ? [...b.vows] : [],
    });
  }
  const runVows = () => (campaign && campaign.boons && Array.isArray(campaign.boons.vows) ? campaign.boons.vows : null);

  // `?partygrant=N` / `max` (PLAN §16.11) — marks the run harness.
  function applyHarnessGrant(g) {
    if (campaign) campaign.harness = true;
    if (g === 'max') {
      stressHealer();
      party.stress();
      return;
    }
    const lv = Number(g);
    const gr = grantFor(lv);
    if (gr && gr.allies) party.applyGrant(gr.allies, 'grant');
  }
  // The Healer's max-stress build (BUILD_BRIEF §25.10): its loadout + a full
  // 32 / 32 in the stress order.
  function stressHealer() {
    const want = STRESS_LOADOUT.healer;
    const kit = want.map((id) => ({ id, remaining: 0 }));
    buildSys.restore({ bench: [], assignments: [] });
    skillSys.restore({ slots: kit, override: null });
    fillStress(buildSys, want, SHARED_NODE_IDS);
  }

  // PLAN §12.4 starter grant for a start AT level N > 1: skill draws, node
  // draws in pairs (the clear-spoils rule) each followed by the shared
  // auto-fill, legendary draws, then Glint. Fixed draw order off the run RNG
  // (right after the run frame), no combat active (phase idle), so the same
  // seed always grants the same kit.
  function applyStarterGrant(level, { allies = true } = {}) {
    const g = grantFor(level);
    if (!g) return null;
    const tick = getTick();
    const skills = [];
    for (let i = 0; i < (g.skills ?? 0); i++) {
      const pool = draft.skillPool();
      if (pool.length === 0) break;
      const id = pool[rng.int(pool.length)];
      const r = skillSys.giveSkill(id);
      if (r && r.error) break;
      skills.push(id);
    }
    const nodes = [];
    for (let left = g.nodes ?? 0; left > 0; ) {
      const ids = draft.spoils(Math.min(2, left));
      if (ids.length === 0) break;
      for (const id of ids) {
        buildSys.grantNode(id, 'grant');
        nodes.push(id);
      }
      left -= ids.length;
      buildSys.autoFill();
    }
    for (let i = 0; i < (g.legendaries ?? 0); i++) {
      const pool = draft.nodePool().filter((id) => NODES[id] && NODES[id].rarity === 'legendary');
      if (pool.length === 0) break;
      const id = pool[rng.int(pool.length)];
      buildSys.grantNode(id, 'grant');
      nodes.push(id);
      buildSys.autoFill();
    }
    if (g.glint) gainGlint(g.glint, 'starter_grant');
    campaign.grant = { level, skills, nodes, glint: g.glint ?? 0 };
    events.emit(tick, 'starter_grant', { level, skills: [...skills], nodes: [...nodes], glint: g.glint ?? 0 });
    // PARTY §25.10: each ally's STARTER_GRANT[N].allies (party stream, after
    // the Healer's, seat order; swaps by the §25.8 AI rule).
    if (allies && allyOn() && g.allies) campaign.grant.allies = party.applyGrant(g.allies, 'grant');
    return campaign.grant;
  }

  // §4.1 room table roll: one layout per combat room from the act's pool,
  // never the one the previous combat room used. Drawn with the run RNG after
  // the wave schedule (PLAN §3.6 (a)).
  // Slice 2 layouts (10-15) join campaign tables only: the legacy single-level
  // run keeps `legacyLayouts`, so the goldens roll the same rooms.
  function rollLayout(n, mode) {
    const level = levelFor(act);
    if (mode === 'boss') return level.bossLayout;
    const table = campaign && campaign.mode !== 'campaign' && level.legacyLayouts ? level.legacyLayouts : level.layouts;
    // EVENT ROOMS: a "?" room stands in the last combat room's clearing, as
    // the shop does (no draw).
    // KEYS AND VAULTS: so does the vault.
    if (mode === 'shop' || mode === 'event' || mode === 'vault') return lastCombatLayout ?? table[0];
    const pool = table.filter((id) => id !== lastCombatLayout);
    const pick = pool.length > 0 ? pool[rng.int(pool.length)] : table[0];
    lastCombatLayout = pick;
    return pick;
  }

  function exitRoom(tick) {
    if (layout && typeof roomHooks.exit === 'function') roomHooks.exit(tick);
    layout = null;
    // KEYS AND VAULTS: the vault's piles and platter stay in their room.
    for (const e of registry.all()) if (e.kind === 'vault_pile' || e.kind === 'vault_platter') registry.despawn(e.id);
  }

  function positionParty() {
    // Rooms are separate arenas: the party walks in at the entry arc.
    player.x = 0;
    player.z = 0;
    player.px = 0;
    player.pz = 0;
    for (const spec of PARTY_ALLIES) {
      const a = registry.all().find((e) => e.kind === 'ally' && e.partyIndex === spec.partyIndex);
      if (!a) continue;
      a.x = spec.x;
      a.z = spec.z;
      a.px = spec.x;
      a.pz = spec.z;
    }
  }

  function enterRoom(n) {
    const tick = getTick();
    exitRoom(tick);
    // PARTY: no socket hold outlives the room change.
    if (pages && pages.screensAny()) for (let s = 0; s < 4; s++) pages.setScreen(s, false);
    roomIndex = n;
    const mode = frame.modes[n - 1];
    const depth = endlessDepth();
    // ENDLESS: the wave director rolls from the depth's (mixed) roster.
    const level = depth ? endlessLevel(depth) : roomLevel(levelFor(act));
    reward = null;
    path = null;
    positionParty();
    const combatRoom = mode === 'kill_all' || mode === 'defend' || mode === 'champion' || isObjectiveMode(mode);
    const baseDiff = beyondCampaign(depth) ? endlessDifficulty(depth, Math.min(6, n), challenge) : difficulty(act, Math.min(6, n), challenge);
    // RELICS: a cursed room rolls its waves with the curse's numbers.
    const roomCurse = combatRoom ? relics.curseFor(n) : null;
    let diff = roomCurse ? cursedDiff(baseDiff, roomCurse) : baseDiff;
    // TUTORIAL: a gentle room (half the threat, softer and weaker beasts, no
    // elites) so a first-time player learns rather than dies.
    if (combatRoom && tutorialOn()) diff = tutorialDiff(diff);
    // RELICS: each major curse the run holds reshapes every combat room.
    if (combatRoom) for (const m of relics.majorCurses()) diff = cursedDiff(diff, m);
    // UNLOCKS: each vow the party wears curses every combat room.
    const vows = combatRoom ? runVows() : null;
    if (vows) for (const v of vows) diff = cursedDiff(diff, v);
    // NEW ENEMIES: campaign kinds roll in campaign rooms only (levels.js
    // CAMPAIGN_ONLY_ENEMIES), on the objectives' gate.
    if (combatRoom) waves.planRoom(mode, { act, room: n, challenge, level, diff, campaignKinds: objectivesOn() });
    // Layout AFTER the schedule (one fixed roll order per room).
    // TUTORIAL: always the clearing with a dewfont (the spring the coach
    // sends the player to); no layout draw.
    const layoutId = tutorialOn() ? TUTORIAL_LAYOUT : rollLayout(n, mode);
    // A slice-2 layout's own spawn ring: move the rolled units onto it.
    const ring = combatRoom ? LAYOUTS[layoutId]?.spawns : null;
    if (ring) waves.relocateSpawns(ring);
    // Balance pass: a layout with its own enemy mix (Open Grave) retypes part
    // of the rolled schedule toward its favoured types, again with no draw.
    const mix = combatRoom ? LAYOUTS[layoutId]?.mix : null;
    if (mix) waves.favourRoster(mix, level, n);
    layout = { act, layoutId, biome: level.biome, room: n, mode };
    roomPlanView = {
      act,
      room: n,
      mode,
      challenge,
      layoutId,
      hpMul: combatRoom ? diff.hpMul : null,
      dmgMul: combatRoom ? diff.dmgMul : null,
      budget: mode === 'kill_all' || mode === 'champion' || isObjectiveMode(mode) ? diff.budget : mode === 'defend' ? diff.defendBudget : null,
      eliteChance: combatRoom ? diff.eliteChance : null,
      waveIntervalTicks: mode === 'kill_all' || mode === 'hunt' || mode === 'champion' ? diff.waveIntervalTicks : null,
      waystoneHp: mode === 'defend' ? diff.waystoneHp : null,
      bossHp: mode === 'boss' ? diff.bossHp : null,
      bossDmgMul: mode === 'boss' ? diff.bossDmgMul : null,
      addHpMul: mode === 'boss' ? diff.addHpMul : null,
      addDmgMul: mode === 'boss' ? diff.addDmgMul : null,
    };
    if (typeof roomHooks.enter === 'function') roomHooks.enter({ ...layout }, tick);
    events.emit(tick, 'layout_enter', { room: n, act, layoutId, biome: level.biome, mode });
    events.emit(tick, 'room_enter', {
      index: n,
      mode,
      reward: rewardFor[n] ?? null,
      wallet,
      act,
      layoutId,
    });
    if (combatRoom) {
      phase = 'combat'; // §13 step 7: next room's first tick, combat_active := true
      // TUTORIAL: the waves wait for the coach's release.
      if (!(tutorialOn() && campaign.tutorial.hold)) waves.beginRoom();
      relics.onRoomEnter(n, mode);
    } else if (mode === 'shop') {
      phase = 'shop';
      openShop();
    } else if (mode === 'event') {
      enterEvent(n, tick);
    } else if (mode === 'vault') {
      enterVault(n, tick);
    } else if (mode === 'boss') {
      phase = 'combat';
      enemies.reset();
      // §23.1/§23.2: the Stag scales with the act (HP 2400·T after the
      // M4a tuning note, damage × 1 + 0.5(T − 1)) and calls the act's own
      // add phases, which scale with the act tier alone (data/difficulty.js).
      // Slice 2: the act's boss for this run's seed (data/levels.js bossFor).
      const bd = currentBoss();
      boss.start(0, -4.2, {
        kind: bd.kind ?? 'stag',
        hp: diff.bossHp,
        dmgMul: diff.bossDmgMul,
        adds: bd.adds.map(([et, k]) => [et, k]),
        ...(bd.addsByPhase ? { addsByPhase: bd.addsByPhase.map((list) => list.map(([et, k]) => [et, k])) } : {}),
        addHpMul: diff.addHpMul,
        addDmgMul: diff.addDmgMul,
      });
      // The ally block hangs its room-start hygiene off this event (channels,
      // mark, rally, AI state) exactly as it does for wave rooms.
      events.emit(tick, 'room_start', { mode: 'boss', waves: [] });
      relics.onRoomEnter(n, mode);
    }
  }

  // §13 boundary sequence, steps 1-6. Fires off the `room_cleared` event, so
  // waves-cleared rooms and the boss room walk the identical path.
  function onRoomCleared(ev) {
    if (!active || phase !== 'combat') return;
    const tick = getTick();
    // KEYS AND VAULTS: a key still on the floor flies to the party.
    vaults.sweep();
    // EVENT ROOMS: the trapped chest's ambush is won — the chest pays.
    const enc = encounters.live();
    if (enc && enc.state === 'ambush' && enc.room === roomIndex) {
      ambushCleared(tick);
      return;
    }
    // 2. every live combat entity ends — the player-side half (enemy shots and
    //    survivors are handled by the enemy block, ally zones/bolts by the ally
    //    block). No instance may land after the clear tick.
    sweepPlayerTransients(tick, 'room_clear');
    // 4. targeting state clears. Mark and rally are cleared by the ally
    //    block's own `room_cleared` handler; the heal override is ours (§8:
    //    "room clear = clear").
    skillSys.clearOverride();
    events.emit(tick, 'heal_override', { index: null });
    // 5. stipend (+12 per combat-room clear, incl. the boss, incl. after a
    //    defend soft-fail). `clearedRooms` is the COMBAT counter the §14
    //    arithmetic rides on; `roomsDone` is the §18 summary's "rooms cleared"
    //    and counts every room left behind, the shop included — a flawless run
    //    must read 8 / 8, not 7 / 8.
    clearedRooms += 1;
    roomsDone = Math.max(roomsDone, roomIndex);
    gainGlint(RUN.stipend, 'clear_stipend');
    if (allyOn()) pages.stipend('clear_stipend'); // PARTY: +12 per ally purse
    // ROOM OBJECTIVES: a hunt or a purge won pays its bounty.
    if (ev.objective && ev.won) gainGlint(OBJECTIVE_RULES.bounty, `${ev.objective}_bounty`);
    // RELICS: clear procs (Grave Coin, Hearthstone), the curse lifts, and a
    // relic pick is owed after room 1 and after a cursed room.
    relics.onRoomCleared(roomIndex, { forfeited: !!ev.softFailed, gainGlint, boss: roomIndex === RUN.bossRoom, objective: ev.objective ?? null, won: !!ev.won });
    // CHAMPION ROOMS: the champion's chest opens; its greater relic pick
    // comes after the room's draft (the crown door is never cursed, so no
    // other pick is owed here).
    if (ev.champion && !ev.softFailed && relics.owe(roomIndex, CHAMPION_RULES.chestSource)) {
      const at = ev.chest ?? { x: 0, z: 0 };
      events.emit(tick, 'champion_chest', { room: roomIndex, champion: ev.champion, x: at.x, z: at.z });
    }

    if (roomIndex === RUN.bossRoom) {
      onLevelCleared(tick);
      return;
    }
    // 6. reward presentation — SKIPPED (silently, no reward event) when the
    //    defend objective died: §11 soft-fail forfeits the room reward.
    const forfeited = !!ev.softFailed;
    if (forfeited) {
      spoils = null; // the soft-fail forfeits the spoils with the reward
      events.emit(tick, 'reward_forfeited', { room: roomIndex });
      afterReward();
      return;
    }
    dropSpoils(tick);
    // PARTY: each ally's clear spoils (party stream, after the Healer's).
    const allySpoils = allyOn() ? pages.dropSpoils(roomIndex) : null;
    presentReward(allySpoils);
  }

  function sweepPlayerTransients(tick, cause) {
    for (const e of registry.all()) {
      if (e.kind === 'bolt') {
        events.emit(tick, 'projectile_despawn', { id: e.id, cause, x: r2(e.x), z: r2(e.z) });
        registry.despawn(e.id);
      } else if (e.kind === 'skillbolt' && e.boltOwner !== 'ally_kits') {
        events.emit(tick, 'skill_bolt_despawn', {
          id: e.id,
          skill: e.skill,
          heal: !!e.heal,
          cause,
          traveled: r2(e.traveled ?? 0),
          x: r2(e.x),
          z: r2(e.z),
        });
        registry.despawn(e.id);
      } else if (e.kind === 'zone') {
        events.emit(tick, 'zone_expire', { id: e.id, skill: e.skill, cause });
        registry.despawn(e.id);
      }
    }
  }

  function gainGlint(amount, reason) {
    wallet += amount;
    events.emit(getTick(), 'glint_gain', { amount, wallet, reason, room: roomIndex });
    return wallet;
  }

  // --------------------------------------------------------- clear spoils --
  // M4c node supply (8 sockets per skill): every combat-room clear drops
  // SPOILS_PER_CLEAR nodes straight onto the bench (provenance 'spoils'),
  // drawn from the live usable pool's commons and rares BEFORE the reward
  // candidate (a fixed draw order: stipend -> spoils -> reward). They are
  // never auto-socketed; the reward page and the socket screen name them.
  function dropSpoils(tick) {
    const ids = draft.spoils(RUN.spoilsPerClear);
    // fix-M4a-r4: the drops that UPGRADE a full build (no vacant socket —
    // auto-fill swaps them in over a weaker node), named on the reward page.
    const upgrades = ids.filter((id) => draft.upgradeInfo(id) !== null);
    for (const id of ids) buildSys.grantNode(id, 'spoils');
    spoils = upgrades.length ? { room: roomIndex, nodes: ids, upgrades } : { room: roomIndex, nodes: ids };
    spoilsTotal += ids.length;
    events.emit(tick, 'spoils_drop', {
      room: roomIndex,
      nodes: [...ids],
      total: spoilsTotal,
      ...(upgrades.length ? { upgrades: [...upgrades] } : {}),
    });
  }

  // ----------------------------------------------------------------- draft --
  // Ruling A17: the Healer's loadout in slot order (null = empty slot).
  const healerSlots = () => skillSys.slotsView().map((s) => (s ? s.id : null));

  function presentReward(allySpoils = null) {
    const promised = rewardFor[roomIndex] ?? 'skill';
    reward = draft.offer(promised);
    // Ruling A17 (the user's rule): a SWAP offer carries the §25.8 suggestion
    // — `replace` = the slot the Replaces selector opens on (the lowest-
    // priority owned skill), `suggest` = take|leave. No draw: state only.
    if (reward.swap) {
      const s = swapSuggestion('healer', healerSlots(), reward.id);
      reward.replace = s.replace;
      reward.suggest = s.choice;
    }
    phase = 'reward';
    // NOTE (binding, whole module): the bus builds every event as
    // `{ tick, type, ...payload }` (core/events.js), so a payload key named
    // `type` OVERWRITES the event's own type and makes the event unfindable by
    // `events.some(e => e.type === 'reward_offer')`. The reward's kind
    // therefore rides on `reward:` here, in draft_taken and in draft_declined.
    events.emit(getTick(), 'reward_offer', {
      room: roomIndex,
      promised,
      reward: reward.type,
      id: reward.id,
      substituted: reward.substituted,
      line: reward.line,
      freeSkillSlots: reward.freeSkillSlots,
      poolSize: reward.poolSize,
      // fix-M4a-r4: an UPGRADE offer names its swap target; an empty offer
      // names why (keys present only when set, so fill-pool traces are
      // byte-identical to the pre-fix ones).
      ...(reward.pool ? { pool: reward.pool, upgrade: reward.upgrade ? { ...reward.upgrade } : null } : {}),
      ...(reward.reason ? { reason: reward.reason } : {}),
      // Ruling A17: keys present only on a swap offer (fill-case traces keep
      // their exact payload) — exactly `swap` + `replace` (PLAN §16.3; the
      // suggestion rides the run view, never the event).
      ...(reward.swap ? { swap: true, replace: reward.replace } : {}),
    });
    // PARTY: the ally cards (party stream, seats 1 → 3) — the Healer's card 0
    // mirrors run.reward. With the ally supply off no page opens (the §16.9
    // proof: exactly v0.5.150's events).
    if (allyOn()) pages.open(roomIndex, promised, reward, allySpoils);
  }

  // Ruling A17: move the pending Replaces choice of a swap offer (the UI's
  // W/S / wheel / click, cmd('draftReplace')). Plain run state — saved,
  // replicated, and what takeReward() uses when it is given no slot.
  function setRewardReplace(slot) {
    if (phase !== 'reward' || !reward || !reward.swap) return null;
    const s = Number(slot);
    if (!(Number.isInteger(s) && s >= 0 && s < SKILL_SLOTS) || !healerSlots()[s]) return null;
    reward.replace = s;
    // The party page's card 0 mirrors run.reward: its mark follows at once
    // (was stale until the Healer's decision — state().run.party.cards[0]
    // .replace disagreed with the card on screen; PARTY r6 advisory).
    const c0 = pages && pages.isOpen() ? pages.card(0) : null;
    if (c0 && c0.swap) c0.replace = s;
    return s;
  }

  // PARTY (PLAN §16.3): a card's decision. Seat 0 = the Healer's card (its
  // swap slot moves run.reward.replace); seats 1-3 = the ally cards. The page
  // COMMITS when every card is decided (commitIfReady) — in Suggested mode
  // the AI-held cards open decided, so the Healer's one decision commits.
  function partyPick(seat, choice, replace = null, { by = 'human' } = {}) {
    if (phase !== 'reward') return { denied: 'closed' };
    const s = Number(seat);
    if (s === 0) {
      if (choice === 'take' && (!reward || !reward.type)) return { denied: 'nothing_to_take' };
      if (reward && reward.swap && Number.isInteger(replace)) setRewardReplace(replace);
      if (pages && pages.isOpen()) pages.pick(0, choice, reward && reward.swap ? reward.replace : null, { by });
      else return choice === 'take' ? takeReward(replace ?? undefined) : declineReward();
      return commitIfReady() ?? { ok: true, seat: 0, choice };
    }
    if (!pages || !pages.isOpen()) return { denied: 'closed' };
    const r = pages.pick(s, choice, replace, { by });
    if (r && r.denied) return r;
    return commitIfReady() ?? r;
  }
  function commitIfReady() {
    if (!pages || !pages.isOpen()) return null;
    if (pages.undecided().length > 0) return null;
    return commitPage('commit');
  }
  // Apply the page: seat 0 exactly as today, then seats 1-3, then the doors.
  function commitPage(reason = 'commit') {
    const c0 = pages && pages.isOpen() ? pages.card(0) : null;
    const choice0 = c0 && c0.decided ? c0.choice : reward && reward.type ? 'take' : 'leave';
    const taken = choice0 === 'take' && reward && reward.type ? applyTake(reward.swap ? reward.replace : undefined) : applyDecline();
    if (pages && pages.isOpen()) pages.applyAllies(reason);
    if (party && party.autoSocketOwn(0) && controllers()[0] === 'human') buildSys.autoFill();
    // v0.5.227: an AI-held Healer sockets its own nodes, like the AI seats.
    else if (party && controllers()[0] !== 'human' && party.mode() !== 'manual') buildSys.autoFill();
    afterReward(taken);
    return taken ?? { declined: true };
  }

  // §16: take-or-decline, no confirm, no reroll, no reopen. The legacy
  // one-call entry (the harness, the autopilot, cmd('draftTake')): the
  // Healer's card taken, then the page committed with the ally cards as the
  // mode left them (Suggested: today's one-call behaviour).
  // Ruling A17: on a SWAP offer `replace` names the slot the new skill takes
  // (default: the pending choice, reward.replace); the old skill leaves the
  // loadout and its nodes go to the bench.
  function takeReward(replace) {
    if (phase !== 'reward' || !reward || !reward.type) return null;
    if (pages && pages.isOpen()) {
      if (reward.swap && Number.isInteger(replace)) setRewardReplace(replace);
      pages.pick(0, 'take', reward.swap ? reward.replace : null, { by: 'human' });
      return commitPage('commit');
    }
    const taken = applyTake(replace);
    if (taken) afterReward(taken);
    return taken;
  }

  function applyTake(replace) {
    if (!reward || !reward.type) return null;
    const tick = getTick();
    const taken = { type: reward.type, id: reward.id };
    if (reward.type === 'skill' && reward.swap) {
      const slot = Number.isInteger(replace) && healerSlots()[replace] ? replace : reward.replace;
      const old = healerSlots()[slot];
      if (!old) return null; // defensive: a swap always has 4 owned
      const released = buildSys.releaseSkill(old);
      const r = skillSys.replaceSkill(slot, reward.id);
      if (!r || r.error) return null;
      taken.slot = slot;
      taken.replaced = old;
      taken.released = released;
      events.emit(tick, 'draft_taken', { reward: 'skill', id: reward.id, slot, swap: true, replaced: old, released: [...released] });
      events.emit(tick, 'skill_swapped', { seat: 0, id: reward.id, slot, replaced: old, released: [...released] });
    } else if (reward.type === 'skill') {
      const r = skillSys.giveSkill(reward.id); // -> first empty slot (§16)
      events.emit(tick, 'draft_taken', { reward: 'skill', id: reward.id, slot: r.slot ?? null });
    } else {
      buildSys.grantNode(reward.id, 'drafted'); // -> bench, never auto-socketed
      events.emit(tick, 'draft_taken', { reward: 'node', id: reward.id, bench: true });
    }
    reward = null;
    return taken;
  }

  function declineReward() {
    if (phase !== 'reward') return null;
    if (pages && pages.isOpen()) {
      pages.pick(0, 'leave', null, { by: 'human' });
      return commitPage('commit');
    }
    const r = applyDecline();
    afterReward(null);
    return r;
  }
  function applyDecline() {
    const type = reward ? reward.type : null;
    const id = reward ? reward.id : null;
    events.emit(getTick(), 'draft_declined', { reward: type, id }); // declines have no memory
    reward = null;
    return { declined: true, type, id };
  }

  function afterReward(taken = null) {
    // RELICS: an owed relic pick comes after the draft, before the doors.
    if (relics.presentDue(gainGlint)) {
      phase = 'relic';
      return taken;
    }
    afterRelic();
    return taken;
  }
  function afterRelic() {
    if (roomIndex <= RUN.pathRooms) {
      presentPath();
    } else {
      // Rooms 6->7 and 7->8 are fixed transitions (§2: no choice).
      beginFade(roomIndex + 1);
    }
  }

  // RELICS: the relic page (phase 'relic') — one of three, no reroll.
  function focusRelic(i) {
    if (phase !== 'relic') return null;
    return relics.focus(i);
  }
  function chooseRelic(i) {
    if (phase !== 'relic') return null;
    const id = relics.choose(i);
    if (!id) return null;
    afterRelic();
    return { relic: id };
  }

  // ------------------------------------------------------------------ path --
  function presentPath() {
    const nextRoom = roomIndex + 1;
    const win = frame.modes[nextRoom - 1];
    const skillLeft = frame.sides[roomIndex - 1] === 0;
    const options = [
      { side: 0, win, reward: skillLeft ? 'skill' : 'node' },
      { side: 1, win, reward: skillLeft ? 'node' : 'skill' },
    ];
    // RELICS: one door may carry a curse (key present only then).
    const dc = relics.rollDoorCurse();
    if (dc) {
      options[dc.side].curse = dc.curse;
      if (dc.major) options[dc.side].major = true;
    }
    // EVENT ROOMS: maybe a "?" door, never the cursed one (keys present only then).
    const ed = encounters.rollDoor(nextRoom, dc ? dc.side : null, encCtx());
    if (ed) options[ed.side] = { side: ed.side, win: 'event', reward: 'event', event: true, encounter: ed.id };
    // CHAMPION ROOMS: the level's crown door (never the cursed one; over the
    // event door when the other is cursed). Its reward stays the door's own.
    const crown = championsOn() ? (forcedCrown ?? crownFor(frame.seed, campaign.index)) : null;
    forcedCrown = null;
    if (crown && crown.room === nextRoom) {
      const side = crownSide(crown.side, dc ? dc.side : null, ed ? ed.side : null);
      const keep = options[side].event ? { side, win: 'champion', reward: frame.sides[roomIndex - 1] === 0 ? (side === 0 ? 'skill' : 'node') : side === 0 ? 'node' : 'skill' } : { ...options[side], win: 'champion' };
      options[side] = { ...keep, champion: championFor(act).id };
    }
    // KEYS AND VAULTS: while the party holds a key, the vault door (never the
    // cursed or the crown door; over a "?" door only when it must). It keeps
    // its door's own reward: the draft still follows the vault.
    const R = VAULT_RULES;
    if (vaults.enabled() && vaults.held() && vaults.open() && nextRoom >= R.doorRooms[0] && nextRoom <= R.doorRooms[1]) {
      const crownAt = options.findIndex((o) => o.champion);
      const eventAt = options.findIndex((o) => o.event);
      const pref = forcedVault ?? vaultPref(frame.seed, campaign.index, nextRoom);
      const side = vaultSide(pref, dc ? dc.side : null, eventAt >= 0 ? eventAt : null, crownAt >= 0 ? crownAt : null);
      if (side !== null) {
        const reward = frame.sides[roomIndex - 1] === 0 ? (side === 0 ? 'skill' : 'node') : side === 0 ? 'node' : 'skill';
        options[side] = { side, win: 'vault', reward, vault: true };
      }
    }
    forcedVault = null;
    path = {
      nextRoom,
      options,
      focus: 0,
      freeSkillSlots: draft.freeSkillSlots(),
    };
    phase = 'path';
    if (pages) pages.armDoor(getTick()); // PARTY: network door deadline (≥ 2 humans)
    events.emit(getTick(), 'path_offer', {
      room: roomIndex,
      nextRoom,
      options: options.map((o) => ({ side: o.side, win: o.win, reward: o.reward, ...(o.curse ? { curse: o.curse } : {}), ...(o.major ? { major: true } : {}), ...(o.event ? { event: true } : {}), ...(o.champion ? { champion: o.champion } : {}), ...(o.vault ? { vault: true } : {}) })),
      freeSkillSlots: path.freeSkillSlots,
    });
  }

  function focusPath(side) {
    if (phase !== 'path' || !path) return null;
    path.focus = side === 1 ? 1 : 0;
    return path.focus;
  }

  function choosePath(side, { hold = true } = {}) {
    if (phase !== 'path' || !path) return null;
    if (path.hold) return { held: true, side: path.hold.side, untilTick: path.hold.untilTick };
    // PARTY (BUILD_BRIEF §25.7): a committed door waits <= socketHoldTicks
    // while a human's socket screen is open (network only: the screens are
    // reported only in a session with >= 2 humans).
    if (hold && pages && pages.humans() >= 2 && pages.humanScreenOpen()) {
      const untilTick = getTick() + PARTY_DEADLINES.socketHoldTicks;
      path.hold = { side: side === 1 ? 1 : 0, untilTick };
      if (pages) pages.clearDoor();
      events.emit(getTick(), 'party_deadline', { what: 'socket_hold', tick: untilTick, side: path.hold.side });
      return { held: true, side: path.hold.side, untilTick };
    }
    const opt = path.options[side === 1 ? 1 : 0];
    if (pages) pages.clearDoor();
    rewardFor[path.nextRoom] = opt.reward;
    events.emit(getTick(), 'path_chosen', {
      room: roomIndex,
      nextRoom: path.nextRoom,
      side: opt.side,
      win: opt.win,
      reward: opt.reward,
    });
    const next = path.nextRoom;
    if (opt.curse) relics.takeCurse(opt.curse, next);
    // EVENT ROOMS: the "?" door turns the next room into its event room.
    if (opt.event) {
      frame.modes[next - 1] = 'event';
      frame.defendAt = frame.defendAt.filter((r) => r !== next);
      encounters.arm(next, opt.encounter);
    }
    // CHAMPION ROOMS: the crown door turns the next room into the champion's.
    if (opt.champion) {
      frame.modes[next - 1] = 'champion';
      frame.defendAt = frame.defendAt.filter((r) => r !== next);
      events.emit(getTick(), 'crown_door_taken', { room: next });
    }
    // KEYS AND VAULTS: the key turns in the lock; the next room is the vault.
    if (opt.vault) {
      frame.modes[next - 1] = 'vault';
      frame.defendAt = frame.defendAt.filter((r) => r !== next);
      vaults.spend(next);
    }
    path = null;
    // TUTORIAL: the door is the last lesson — back to camp.
    if (tutorialOn()) {
      endTutorial('done');
      return { nextRoom: next, reward: opt.reward, win: opt.win, tutorial: 'done' };
    }
    beginFade(next);
    return { nextRoom: next, reward: opt.reward, win: opt.win, ...(opt.curse ? { curse: opt.curse } : {}), ...(opt.major ? { major: true } : {}), ...(opt.event ? { event: true } : {}), ...(opt.champion ? { champion: opt.champion } : {}), ...(opt.vault ? { vault: true } : {}) };
  }

  // ------------------------------------------------------- event rooms --
  // EVENT ROOMS (docs/EVENT_ROOMS.md). Phase 'event': the party walks in
  // with the encounter standing ahead (E · Inspect). Phase 'encounter': its
  // card (Take or Leave). Take pays the cost, then the reward: a relic page,
  // a Skill draft, Glint, a heal, or (the trapped chest) a short fight first.
  // Then the doors, as after any room.
  function enterEvent(n, tick) {
    phase = 'event';
    const enc = encounters.enter(n);
    relics.onRoomEnter(n, 'event');
    if (!enc) {
      afterRelic(); // defensive: a "?" room with nothing armed walks on
      return;
    }
    const e = registry.spawn(encounterSpec(enc.id, EVENT_RULES.spot.x, EVENT_RULES.spot.z, EVENT_RULES.bodyRadius));
    events.emit(tick, 'interactable_spawn', { id: e.id, itype: 'encounter', x: r2(e.x), z: r2(e.z) });
  }

  const encounterBody = () => registry.all().find((e) => e.itype === 'encounter');

  function openEncounter() {
    if (phase !== 'event' || !encounters.open(encCtx())) return null;
    const body = encounterBody();
    if (body && body.uses > 0) body.uses = 0;
    phase = 'encounter';
    return encounters.view(encCtx());
  }

  function focusEncounter(i) {
    if (phase !== 'encounter') return null;
    return encounters.focus(i);
  }

  function spend(amount, reason) {
    wallet = Math.max(0, wallet - amount);
    events.emit(getTick(), 'glint_spend', { amount, wallet, reason, room: roomIndex });
  }

  // choice: 'take' | 'leave' (default: the card's focus).
  function chooseEncounter(choice) {
    if (phase !== 'encounter') return null;
    const enc = encounters.live();
    if (!enc) return null;
    const pick = choice === 'take' || choice === 'leave' ? choice : enc.focus === 1 ? 'leave' : 'take';
    const tick = getTick();
    const room = roomIndex;
    if (pick === 'take') {
      const why = encounters.refusal(encCtx());
      if (why) {
        events.emit(tick, 'event_denied', { room, encounter: enc.id, reason: why });
        return { denied: why };
      }
    }
    roomsDone = Math.max(roomsDone, room);
    if (pick === 'leave') {
      encounters.finish('done', { left: true });
      events.emit(tick, 'event_leave', { room, encounter: enc.id });
      afterRelic();
      return { left: true, encounter: enc.id };
    }
    const E = ENCOUNTERS[enc.id];
    const R = EVENT_RULES;
    const result = { took: true };
    const bodies = registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0);
    switch (enc.id) {
      case 'blood_shrine': {
        let paid = 0;
        for (const e of bodies) {
          const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * R.hpCost));
          e.hp = r2(e.hp - loss);
          paid += loss;
        }
        result.hp = r2(paid);
        relics.owe(room, 'shrine');
        break;
      }
      case 'wishing_well': {
        spend(E.price, 'event_well');
        const relic = encounters.coin() ? relics.grantRandom('well', encounterBody() ?? player) : null;
        if (relic) result.relic = relic;
        else {
          gainGlint(R.wellGlint, 'event_well');
          result.glint = R.wellGlint;
        }
        break;
      }
      case 'trapped_chest':
        startAmbush(tick);
        events.emit(tick, 'event_take', { room, encounter: enc.id, ambush: true });
        return { ambush: true, encounter: enc.id };
      case 'lost_pilgrim':
        spend(E.price, 'event_pilgrim');
        result.draft = 'skill';
        break;
      case 'corrupted_altar': {
        const id = encounters.pick(relics.freeMajors());
        relics.takeMajor(id, room);
        relics.owe(room, 'altar', { curse: id });
        result.curse = id;
        break;
      }
      case 'wandering_spirit': {
        const lost = relics.loseNewest('spirit');
        relics.owe(room, 'spirit', { not: lost ? [lost] : null });
        result.lost = lost;
        break;
      }
      case 'forgotten_cache':
        gainGlint(R.cacheGlint, 'event_cache');
        if (allyOn()) for (const seat of [1, 2, 3]) party.gainPurse(seat, R.cachePurse, 'event_cache');
        result.glint = R.cacheGlint;
        break;
      case 'healing_spring': {
        let healed = 0;
        for (const e of bodies) {
          if (e.hp >= e.maxHp) continue;
          combat.applyHeal(e, e.maxHp - e.hp, { source: 'healing_spring' });
          e.hp = e.maxHp; // full, whatever the curses and relics say
          healed += 1;
        }
        result.healed = healed;
        break;
      }
      default:
        break;
    }
    encounters.finish('done', result);
    events.emit(tick, 'event_take', { room, encounter: enc.id, ...result });
    if (result.draft) {
      rewardFor[room] = 'skill';
      presentReward(null);
      return { took: true, encounter: enc.id, ...result };
    }
    afterReward(null);
    return { took: true, encounter: enc.id, ...result };
  }

  // --------------------------------------------------- keys and vaults --
  // KEYS AND VAULTS (docs/VAULTS.md). Phase 'vault': the party walks into the
  // treasure room. A hero walking over a Glint pile or the food platter takes
  // it; E on the chest opens it, gathers whatever is left, then pays the
  // door's draft and a relic pick. Then the doors, as after any room.
  const clearSpot = (row, r) => {
    for (const [x, z] of row) if (staticClearance(x, z, r) >= 0.15) return [x, z];
    return row[0];
  };
  function enterVault(n, tick) {
    phase = 'vault';
    const v = vaults.enterRoom(n);
    relics.onRoomEnter(n, 'vault');
    const S = VAULT_SPOTS;
    const [cx, cz] = clearSpot(S.chest, VAULT_RULES.chestRadius + 0.3);
    const chest = registry.spawn(vaultChestSpec(cx, cz));
    events.emit(tick, 'interactable_spawn', { id: chest.id, itype: 'vault_chest', x: r2(cx), z: r2(cz) });
    const piles = S.piles.map((row, i) => {
      const [x, z] = clearSpot(row, 0.4);
      const e = registry.spawn({ kind: 'vault_pile', faction: 'neutral', pile: i, x, z, px: x, pz: z, yaw: i * 2.1 });
      return { id: e.id, x: r2(x), z: r2(z) };
    });
    const [px, pz] = clearSpot(S.platter, 0.45);
    const platter = registry.spawn({ kind: 'vault_platter', faction: 'neutral', x: px, z: pz, px, pz, yaw: 0.4 });
    events.emit(tick, 'vault_enter', {
      room: n,
      chest: { id: chest.id, x: r2(cx), z: r2(cz) },
      piles,
      platter: { id: platter.id, x: r2(px), z: r2(pz) },
      reward: rewardFor[n] ?? null,
    });
    return v;
  }

  function vaultChestSpec(x, z) {
    return {
      kind: 'vault_chest',
      itype: 'vault_chest',
      faction: 'neutral',
      x,
      z,
      px: x,
      pz: z,
      yaw: 0,
      interactable: true,
      interactRadius: VAULT_CHEST.interactRadius,
      radius: VAULT_RULES.chestRadius,
      verb: VAULT_CHEST.verb,
      spentLabel: VAULT_CHEST.spentLabel,
      uses: 1,
      cooldownUntilTick: 0,
      activeUntilTick: 0,
      usedTick: -1,
      usedBy: null,
      collider: { r: VAULT_RULES.chestRadius },
      blocksMovement: true,
    };
  }

  // A Glint pile: the Healer's wallet and each ally purse.
  function takePile(e, by) {
    const R = VAULT_RULES;
    gainGlint(R.pileGlint, 'vault_pile');
    if (allyOn()) for (const seat of [1, 2, 3]) party.gainPurse(seat, R.pilePurse, 'vault_pile');
    const v = vaults.live();
    if (v) v.glint += R.pileGlint;
    events.emit(getTick(), 'vault_pile', { id: e.id, pile: e.pile, by, glint: R.pileGlint, x: r2(e.x), z: r2(e.z) });
    registry.despawn(e.id);
  }
  // The food platter: every living hero heals half their max HP.
  function takePlatter(e, by) {
    let healed = 0;
    for (const h of registry.all()) {
      if (h.partyIndex === undefined || !(h.hp > 0) || h.hp >= h.maxHp) continue;
      if (combat.applyHeal(h, h.maxHp * VAULT_RULES.platterHeal, { source: 'vault_platter' })) healed += 1;
    }
    const v = vaults.live();
    if (v) v.healed = healed;
    events.emit(getTick(), 'vault_platter', { id: e.id, by, healed, x: r2(e.x), z: r2(e.z) });
    registry.despawn(e.id);
  }
  function stepVault() {
    const v = vaults.live();
    if (v && v.state === 'open') {
      if (!v.paid && getTick() >= v.payAt) {
        v.paid = true;
        presentReward(null);
      }
      return;
    }
    for (const e of registry.all()) {
      if (e.kind !== 'vault_pile' && e.kind !== 'vault_platter') continue;
      const h = vaults.toucher(e);
      if (!h) continue;
      if (e.kind === 'vault_pile') takePile(e, h.id);
      else takePlatter(e, h.id);
    }
  }

  // E on the chest (any hero), the autopilot, or cmd('vaultOpen').
  function openVault() {
    if (phase !== 'vault') return null;
    const v = vaults.live();
    if (!v || v.state !== 'shut') return null;
    const tick = getTick();
    const chest = registry.all().find((e) => e.kind === 'vault_chest');
    if (chest && chest.uses > 0) chest.uses = 0;
    // The party gathers the rest of the hoard as the lid comes up.
    for (const e of registry.all()) {
      if (e.kind === 'vault_pile') takePile(e, null);
      else if (e.kind === 'vault_platter') takePlatter(e, null);
    }
    vaults.finishRoom();
    roomsDone = Math.max(roomsDone, roomIndex);
    const owed = relics.owe(roomIndex, VAULT_RULES.chestSource);
    events.emit(tick, 'vault_open', {
      room: roomIndex,
      glint: v.glint,
      healed: v.healed,
      relic: !!owed,
      ...(chest ? { x: r2(chest.x), z: r2(chest.z) } : {}),
    });
    // The lid comes up and the hoard's light rises for a moment; then the
    // door's own draft, the relic pick and the doors (stepVault).
    v.payAt = tick + Math.round(VAULT_RULES.revealSec * TICK_HZ);
    return { opened: true, room: roomIndex, glint: v.glint, healed: v.healed, relic: !!owed };
  }

  // The trapped chest: two short elite-heavy waves in the event room.
  function startAmbush(tick) {
    const depth = endlessDepth();
    const level = depth ? endlessLevel(depth) : roomLevel(levelFor(act));
    const n = roomIndex;
    const base = beyondCampaign(depth) ? endlessDifficulty(depth, Math.min(6, n), challenge) : difficulty(act, Math.min(6, n), challenge);
    const A = EVENT_RULES.ambush;
    let diff = { ...base, budget: r2(base.budget * A.budgetMul), eliteChance: r2(Math.min(0.9, (base.eliteChance ?? 0) + A.eliteAdd)) };
    for (const m of relics.majorCurses()) diff = cursedDiff(diff, m);
    const vows = runVows();
    if (vows) for (const v of vows) diff = cursedDiff(diff, v);
    encounters.finish('ambush');
    waves.planRoom('kill_all', { act, room: n, challenge, level, diff, waves: A.waves, campaignKinds: objectivesOn() });
    const ring = layout ? LAYOUTS[layout.layoutId]?.spawns : null;
    if (ring) waves.relocateSpawns(ring);
    phase = 'combat';
    waves.beginRoom();
    events.emit(tick, 'event_ambush', { room: n, encounter: 'trapped_chest' });
  }

  function ambushCleared(tick) {
    sweepPlayerTransients(tick, 'room_clear');
    skillSys.clearOverride();
    events.emit(tick, 'heal_override', { index: null });
    roomsDone = Math.max(roomsDone, roomIndex);
    const R = EVENT_RULES;
    gainGlint(R.chestGlint, 'event_chest');
    relics.owe(roomIndex, 'chest');
    encounters.finish('done', { took: true, glint: R.chestGlint });
    events.emit(tick, 'event_chest', { room: roomIndex, glint: R.chestGlint });
    afterReward(null);
  }

  // §13/§16 transition fade (<= 300 ms) between the meta screens and the next
  // room's first tick.
  function beginFade(next) {
    pendingRoom = next;
    fadeUntilTick = getTick() + RUN.fadeTicks;
    phase = 'fade';
    events.emit(getTick(), 'room_transition', { from: roomIndex, to: next, ticks: RUN.fadeTicks });
  }

  // ------------------------------------------------ level director (§12) --
  // The level-clear trigger. Reached ONLY from onRoomCleared in the boss room,
  // which itself acts only while phase === 'combat' and changes the phase in
  // this same call; the per-level latch below makes a second call a no-op
  // whatever path reaches it (a replayed clear, a cmd, a same-tick double).
  function onLevelCleared(tick) {
    const c = campaign;
    if (c && c.clearedAt === c.index) return;
    const level = act;
    const next = nextOf(c, level);
    const levelTicks = c ? tick - c.levelStartTick : tick - startTick;
    if (c) {
      c.clearedAt = c.index;
      const rec = c.levels[c.levels.length - 1];
      if (rec) {
        rec.rooms = roomsDone;
        rec.cleared = true;
        rec.ticks = levelTicks;
      }
      // ENDLESS: the final level's first clear wins the campaign; the
      // descent goes on.
      if (c.endless && !c.won && nextLevel(level) === null) {
        c.won = true;
        events.emit(tick, 'campaign_won', { level, depth: c.index, endless: true });
      }
    }
    events.emit(tick, 'level_clear', {
      level,
      name: levelFor(level).name,
      next,
      final: next === null,
      index: c ? c.index : 1,
      campaign: !!(c && c.mode === 'campaign'),
      ticks: levelTicks,
      rooms: roomsDone,
      ...(c && c.endless ? { depth: c.index } : {}),
    });
    if (next === null) {
      endRun('victory');
      // CAMPAIGN COMPLETE: the card returns to camp by itself (sim time, so a
      // pause holds it and a network guest follows the host).
      if (c && c.mode === 'campaign') autoReturnTick = tick + TRANSIT.victoryReturnTicks;
      return;
    }
    beginTransit('clear', level, next, tick);
  }

  // RESET — every level-bound thing the sim owns goes (PLAN §12.3). The
  // presentation half (decals, particles, numerals, telegraph rigs, voices,
  // dressing) follows the `level_transit` event (src/campaign/manager.js).
  function resetLevel(tick, cause) {
    if (CARRY_RULES.resetShop) shop = null;
    // PARTY: the party page, the four shelves and every deadline are level-bound.
    if (pages) pages.reset();
    relics.levelReset(); // RELICS: the relics ride on; curse / pick do not
    encounters.levelReset(); // EVENT ROOMS: two "?" doors a level
    vaults.levelReset(act); // KEYS AND VAULTS: a key lasts its level
    if (party && CARRY_RULES.resetEntities) party.resetLevelState();
    reward = null;
    path = null;
    pendingRoom = 0;
    if (CARRY_RULES.resetDirector) {
      waves.stop(cause);
      boss.despawn();
    }
    if (CARRY_RULES.resetEntities) {
      enemies.reset();
      sweepPlayerTransients(tick, cause);
      exitRoom(tick); // room hooks: hazards + interactables despawn
      allySys.cmd('mark', [null]);
      allySys.cmd('roomBoundary'); // ally zones + ally bolts, revive channels
      // Pending Echo recasts are in-flight casts of the level that ended.
      const bs = cloneData(buildSys.saveState());
      if (bs && Array.isArray(bs.echoQueue) && bs.echoQueue.length) {
        bs.echoQueue = [];
        buildSys.loadState(bs);
      }
      // Anything level-owned a system missed (belt and braces): only the
      // party may ride into the next level. Counted so a leak stays visible
      // (campaign().card.leftovers — the GC.5 probe expects []).
      const leftovers = [];
      for (const e of registry.all()) {
        if (e.partyIndex !== undefined || e.kind === 'player' || e.kind === 'ally') continue;
        leftovers.push(e.kind);
        registry.despawn(e.id);
      }
      return leftovers;
    }
    return [];
  }

  // RESTORE + the non-default CARRY switches (PLAN §12.3).
  function restoreParty(tick) {
    for (const e of registry.all()) {
      if (e.partyIndex === undefined) continue;
      if (CARRY_RULES.reviveDowned && (e.downed || e.hp <= 0)) {
        e.downed = false;
        e.downedTick = -1;
        if (e.hp <= 0) e.hp = e.maxHp;
      }
      if (CARRY_RULES.restoreHp) e.hp = e.maxHp;
      if (CARRY_RULES.clearStatuses && e.status) e.status = {};
      // PARTY: no parry window, dash / vault or pending cast rides across.
      if (e.kind === 'ally') {
        if (e.guard && e.guard.parry) e.guard = null;
        e.skillDash = null;
        e.pendingCast = null;
      }
      if (CARRY_RULES.resetCooldowns) {
        if (Array.isArray(e.cds)) e.cds = e.cds.map(() => tick);
        if (e.kind === 'ally' && Number.isFinite(e.dodgeReadyTick)) e.dodgeReadyTick = tick;
      }
    }
    if (CARRY_RULES.resetCooldowns) {
      const s = skillSys.serialize();
      s.slots = s.slots.map((x) => (x ? { ...x, remaining: 0 } : null));
      skillSys.restore(s);
      player.dodgeReadyTick = tick;
      player.nextBasicTick = tick;
      player.dashTicksLeft = 0;
    }
    applyCarrySwitches(tick);
  }

  function applyCarrySwitches(tick) {
    const R = CARRY_RULES;
    if (!R.carrySkills || !R.carrySockets || !R.carryBench) {
      const bs = cloneData(buildSys.saveState());
      const keep = R.carrySkills ? null : new Set(STARTING_SKILLS);
      const freed = [];
      const rows = [];
      for (const [id, row] of bs.assignments ?? []) {
        if ((keep && !keep.has(id)) || !R.carrySockets) {
          for (const r of row) if (r) freed.push({ ...r });
          continue;
        }
        rows.push([id, row]);
      }
      bs.assignments = rows;
      bs.bench = R.carryBench ? [...(bs.bench ?? []), ...freed] : [];
      buildSys.loadState(bs);
      if (keep) {
        const s = skillSys.serialize();
        const kit = new Array(SKILL_SLOTS).fill(null);
        STARTING_SKILLS.forEach((id, i) => {
          kit[i] = { id, remaining: 0 };
        });
        skillSys.restore({ slots: kit, override: s.override, auras: s.auras });
      }
    }
    if (!R.carryGlint) wallet = 0;
    if (!R.carryHealOverride) {
      skillSys.clearOverride();
      events.emit(tick, 'heal_override', { index: null });
    }
    if (!R.carrySeedStream && typeof rng.reseed === 'function') rng.reseed(Math.floor(rng.float() * 0x100000000) >>> 0);
    if (!R.carryRecords && campaign) campaign.levels = campaign.levels.slice(-1);
  }

  // What the card shows about the build that rides into the next level.
  function carriedSummary() {
    const b = buildSys.view();
    const owned = skillSys.slotsView().filter(Boolean).map((s) => s.id);
    return {
      skills: owned,
      socketed: b.skills.reduce((n, s) => n + s.filled, 0),
      sockets: b.skills.length * (b.socketCount ?? 8),
      bench: b.bench.length,
      wallet,
      grant: campaign && campaign.grant ? cloneData(campaign.grant) : null,
      // PARTY: the four builds that ride on (the card's compact lines).
      ...(party ? { builds: partyBuilds() } : {}),
    };
  }

  // PARTY: [{ seat, classId, skills, filled, sockets, bench, purse }] ×4.
  function partyBuilds() {
    const b = buildSys.view();
    const out = [
      {
        seat: 0,
        classId: 'healer',
        skills: skillSys.slotsView().map((s) => (s ? s.id : null)),
        filled: b.skills.reduce((n, s) => n + s.filled, 0),
        sockets: 32,
        bench: b.bench.length,
        purse: wallet,
      },
    ];
    for (const i of [1, 2, 3]) {
      const v = party.view(i);
      out.push({ seat: i, classId: v.classId, skills: [...v.slots], filled: v.filled, sockets: 32, bench: v.bench.length, purse: v.purse });
    }
    return out;
  }

  // Phase 'transit' — the level-clear card (kind 'clear') or the setting-out
  // card of a Level-N start (kind 'depart'). The card is sim-timed.
  function beginTransit(kind, from, to, tick) {
    let leftovers = [];
    if (kind === 'clear') {
      leftovers = resetLevel(tick, 'level_clear');
      restoreParty(tick);
    }
    const min = kind === 'clear' ? TRANSIT.clearTicks : to !== FIRST_LEVEL ? TRANSIT.departTicks : 0;
    campaign.card = {
      kind,
      from,
      to,
      startTick: tick,
      untilTick: tick + min,
      minSkipTick: tick + Math.min(min, TRANSIT.minSkipTicks),
      hardUntilTick: tick + TRANSIT.hardTicks,
      summary: carriedSummary(),
      leftovers,
      // ENDLESS: the depth the card leads to (present only then).
      ...(campaign.endless ? { depth: campaign.index + (kind === 'clear' ? 1 : 0) } : {}),
    };
    campaign.transitions += 1;
    phase = 'transit';
    events.emit(tick, 'level_transit', {
      kind,
      from,
      to,
      name: levelFor(to).name,
      index: campaign.index + (kind === 'clear' ? 1 : 0),
      untilTick: campaign.card.untilTick,
      minSkipTick: campaign.card.minSkipTick,
      hardUntilTick: campaign.card.hardUntilTick,
      ...(campaign.endless ? { depth: campaign.card.depth } : {}),
    });
  }

  // The card's Enter / the presentation's "ready" advance / the autopilot.
  function campaignAdvance(reason = 'skip') {
    if (!active || phase !== 'transit' || !campaign || !campaign.card) return null;
    const tick = getTick();
    if (tick < campaign.card.minSkipTick) return { refused: 'settle', inTicks: campaign.card.minSkipTick - tick };
    return advanceLevel(typeof reason === 'string' ? reason : 'skip');
  }

  // Build the next level and walk into its room 1.
  function advanceLevel(reason) {
    const tick = getTick();
    const card = campaign.card;
    const to = card.to;
    exitRoom(tick);
    if (card.kind === 'clear') {
      // A NEW level: its own run frame, rolled from the CARRIED run stream (no
      // reseed), and fresh per-level counters. (A 'depart' card's level was
      // opened — frame rolled, grant applied — before the card.)
      act = to;
      // DAILY: every level of the day's run rolls from the day, not from
      // what the party drew in the level before.
      if (campaign.daily) reseedTo(dailyLevelSeed(campaign.daily.seed, campaign.index + 1));
      frame = rollFrame();
      roomIndex = 0;
      clearedRooms = 0;
      roomsDone = 0;
      rewardFor = { 1: 'skill' };
      reward = null;
      path = null;
      shop = null;
      spoils = null;
      pendingRoom = 0;
      fadeUntilTick = 0;
      lastCombatLayout = null;
      roomPlanView = null;
      campaign.index += 1;
      if (objectivesOn()) assignObjectives(frame.modes, frame.seed, campaign.index);
      campaign.levels.push({ level: to, index: campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
    } else {
      const rec = campaign.levels[campaign.levels.length - 1];
      if (rec) rec.startTick = tick;
    }
    campaign.level = to;
    campaign.levelStartTick = tick;
    campaign.card = null;
    events.emit(tick, 'level_start', {
      level: to,
      name: levelFor(to).name,
      index: campaign.index,
      from: card.kind === 'clear' ? card.from : null,
      campaign: campaign.mode === 'campaign',
      reason,
      seed: frame.seed,
      modes: [...frame.modes],
      ...(campaign.endless ? { depth: campaign.index } : {}),
    });
    enterRoom(1);
    return view();
  }

  // ------------------------------------------------ tutorial (TUTORIAL.md) --
  // The guided first room: Level 1 room 1 at tutorialDiff, the waves held
  // until tutorialRelease(), relics off, and the door choice ends it. It ends
  // as run_end { result: 'tutorial' } (the profile records nothing) and goes
  // straight home: return_to_camp { reason: 'tutorial' }.
  function tutorialOn() {
    return !!(active && campaign && campaign.tutorial);
  }
  function tutorialRelease() {
    if (!tutorialOn() || !campaign.tutorial.hold) return null;
    campaign.tutorial.hold = false;
    if (phase === 'combat' && roomIndex === 1) waves.beginRoom();
    events.emit(getTick(), 'tutorial_release', { room: roomIndex });
    return { released: true };
  }
  function endTutorial(reason = 'done') {
    if (!tutorialOn()) return null;
    const tick = getTick();
    events.emit(tick, 'tutorial_end', { reason });
    endRun('tutorial');
    phase = 'idle';
    autoReturnTick = null;
    const leaked = registry.all().filter((e) => e.faction === 'hostile').length;
    waves.stop('return_to_camp');
    boss.despawn();
    enemies.reset();
    events.emit(tick, 'return_to_camp', { enemies: leaked, reason: 'tutorial' });
    return { tutorial: reason };
  }

  // Quit to Lobby (pause menu, confirmed): the campaign is abandoned — the
  // records count it — and the world returns to camp with no end card.
  function abandonRun(reason = 'quit') {
    if (!active) return null;
    // TUTORIAL: leaving the guided room is never a counted run.
    if (tutorialOn()) return endTutorial(typeof reason === 'string' ? reason : 'quit');
    const tick = getTick();
    const s = endRun('abandoned');
    phase = 'idle';
    autoReturnTick = null;
    const leaked = registry.all().filter((e) => e.faction === 'hostile').length;
    waves.stop('return_to_camp');
    boss.despawn();
    enemies.reset();
    events.emit(tick, 'return_to_camp', { enemies: leaked, reason: typeof reason === 'string' ? reason : 'quit' });
    return { abandoned: true, summary: s };
  }

  function campaignView() {
    const c = campaign;
    const tick = getTick();
    if (!c) return { active: false, mode: null, autoReturnTick, autoReturnInTicks: autoReturnTick !== null ? Math.max(0, autoReturnTick - tick) : null };
    const card = c.card
      ? {
          ...cloneData(c.card),
          name: levelFor(c.card.to).name,
          fromName: c.card.from !== null ? levelFor(c.card.from).name : null,
          elapsedTicks: tick - c.card.startTick,
          canSkip: tick >= c.card.minSkipTick,
          due: tick >= c.card.untilTick,
        }
      : null;
    return {
      active,
      mode: c.mode,
      harness: c.harness,
      startLevel: c.startLevel,
      level: c.level,
      name: levelFor(c.level).name,
      index: c.index,
      next: nextOf(c, c.level),
      ...(c.endless ? { endless: true, depth: c.index, won: !!c.won } : {}),
      ...(c.tutorial ? { tutorial: { hold: !!c.tutorial.hold } } : {}),
      levels: cloneData(c.levels),
      levelsCleared: c.levels.filter((l) => l.cleared).length,
      clearedAt: c.clearedAt,
      card,
      grant: cloneData(c.grant),
      transitions: c.transitions,
      startTick: c.startTick,
      levelStartTick: c.levelStartTick,
      autoReturnTick,
      autoReturnInTicks: autoReturnTick !== null ? Math.max(0, autoReturnTick - tick) : null,
    };
  }

  // fix-M4a-r4: `{ upgrade: { skill, slot, replaces, why } }` when `nodeId`
  // would UPGRADE the build (no vacant usable socket, outranks a socketed
  // node), else {} — spread into view objects so the key exists only then.
  function upgradeKey(nodeId) {
    if (!nodeId) return {};
    const up = draft.upgradeInfo(nodeId);
    return up ? { upgrade: up } : {};
  }

  // ------------------------------------------------------------------ shop --
  function openShop() {
    // RELICS (Peddler's Seal): the Healer's shelf prices (identity when off).
    const stock = draft.shopStock().map((s) => ({ ...s, price: relics.shopPrice(s.price), sold: false }));
    shop = { stock, visited: true };
    events.emit(getTick(), 'shop_open', {
      room: roomIndex,
      wallet,
      stock: stock.map((s) => ({ node: s.node, rarity: s.rarity, price: s.price })),
      affordableAny2: stock.length >= 2,
    });
    // RELICS: the relic shelf (relic stream; null when relics are off).
    relics.openShelf();
    // Small fixes: an AI-held seat with the Glint takes a relic first (bought
    // now under Auto, on Advance under Suggested), so its cards below are
    // picked from what is left.
    const reserve = planAiRelics();
    // PARTY: each ally's own 4-card class shelf (party stream, seats 1 → 3).
    if (allyOn()) pages.openShop(roomIndex, reserve);
    // v0.5.237 (Kesh: "shouldn't be able to control the Healer's shop ... it
    // should be done by AI"): a Healer the player does not control (class
    // select, or an AI seat in co-op) shops like the other AI seats — its
    // picks marked under Suggested (bought on Advance), bought now under Auto.
    if (healerAiShops()) {
      const picks = suggestShelf(shop.stock, wallet - reserve[0]);
      if (party.mode() === 'suggest') {
        shop.marked = shop.stock.map((_, k) => picks.includes(k));
        shop.touched = false;
      } else if (party.mode() === 'auto') {
        for (const k of picks) {
          const r = buy(k, { by: 'ai' });
          if (!r || r.denied) break;
        }
      }
    }
  }

  // Small fixes: AI-held seats (Healer first, then seats 1 → 3; none under
  // Ally builds Manual) each take at most one relic off the shelf: its own
  // class relic, else one for no class, when its purse covers the price.
  // Another class's relic stays for that seat. Under Auto the relic is bought
  // at once; under Suggested it is held (shop.relicPlan) and bought first on
  // Advance. Returns each seat's held Glint. Nothing when relics are off.
  function planAiRelics() {
    const reserve = [0, 0, 0, 0];
    if (!allyOn() || !party || party.mode() === 'manual') return reserve;
    const shelf = relics.view().shelf;
    if (!shelf) return reserve;
    const c = controllers();
    const plan = {};
    const taken = new Set();
    for (const seat of [0, 1, 2, 3]) {
      if (c[seat] === 'human') continue;
      const purse = seat === 0 ? wallet : party.purse(seat);
      const cls = seat === 0 ? 'healer' : party.lineup()[seat];
      const fits = (k) => !taken.has(k) && relics.shelfItem(k) && shelf[k].price <= purse;
      const own = shelf.findIndex((r, k) => r.cls === cls && fits(k));
      const k = own >= 0 ? own : shelf.findIndex((r, k2) => !r.cls && fits(k2));
      if (k < 0) continue;
      taken.add(k);
      if (party.mode() === 'auto') buyRelic(seat, k);
      else {
        plan[seat] = k;
        reserve[seat] = shelf[k].price;
      }
    }
    if (Object.keys(plan).length) shop.relicPlan = plan;
    return reserve;
  }
  // Suggested: the held relics, bought as the party leaves (a seat a human
  // took over since, or a relic gone or now too dear, is skipped).
  function buyPlannedRelics() {
    if (!shop || !shop.relicPlan) return;
    const c = controllers();
    for (const [seat, k] of Object.entries(shop.relicPlan)) if (c[seat] !== 'human') buyRelic(Number(seat), k);
    delete shop.relicPlan;
  }


  // RELICS: buy relic `index` off the relic shelf from `seat`'s purse (the
  // Healer's is the run wallet). The relic is the whole party's.
  function buyRelic(seat, index) {
    if (phase !== 'shop' || !shop) return null;
    const s = Number(seat) | 0;
    const i = Number(index) | 0;
    const item = relics.shelfItem(i);
    if (!item) return null;
    if (s !== 0 && !(allyOn() && party && party.purse(s) !== null)) return null;
    const purse = s === 0 ? wallet : party.purse(s);
    const tick = getTick();
    if (purse < item.price) {
      events.emit(tick, 'relic_denied', { seat: s, relic: item.id, price: item.price, wallet: purse, index: i });
      return { denied: 'insufficient_funds', price: item.price, purse };
    }
    if (s === 0) wallet -= item.price;
    else party.spend(s, item.price);
    const left = s === 0 ? wallet : party.purse(s);
    const id = relics.sellShelf(i, s, left);
    return { relic: id, price: item.price, purse: left, seat: s };
  }

  // PARTY: a purchase for an ally, from ITS purse (`partyBuy`); seat 0 is
  // the Healer's buy() above.
  function partyBuy(seat, index) {
    if (phase !== 'shop') return null;
    if (Number(seat) === 0) return buy(index);
    if (!pages || !pages.shopOpen()) return null;
    return pages.buy(Number(seat), index, { by: 'human' });
  }
  function partyShopMark(seat, index, on) {
    if (phase !== 'shop' || !pages || !pages.shopOpen()) return null;
    if (Number(seat) === 0) {
      // The AI-held Healer's Suggested marks live on the run's own shelf.
      if (!shop || !shop.marked || !shop.stock[index]) return null;
      const v = on === undefined ? !shop.marked[index] : !!on;
      shop.marked[index] = v;
      events.emit(getTick(), 'party_shop_mark', { seat: 0, index, on: v });
      return v;
    }
    return pages.mark(Number(seat), index, on);
  }
  function partyShopDone(seat) {
    if (phase !== 'shop' || !pages || !pages.shopOpen()) return null;
    pages.done(Number(seat));
    // The host's Advance countdown is running and this was the last human
    // it waited on: leave at once.
    const v = pages.shopView();
    if (v && v.leaveTick !== null && pages.humansNotDone(hostSeat()).length === 0) advanceFromShop({ force: true });
    return true;
  }
  // The seat whose Advance is the host's (the Healer; a migrated host's
  // session passes its own seat as `by`).
  const hostSeat = () => 0;
  // PARTY: a socket screen opened / closed (network sessions only).
  function partyScreen(seat, open) {
    if (!pages) return null;
    return pages.setScreen(seat, open);
  }

  // §14: integer wallet, atomic spend; insufficient funds => `currency_denied`
  // no-op — the item is NEVER hidden or greyed for price (§16: plaque emphasis
  // + one ~300 ms shake, item stays).
  // An AI-held Healer (controllers()[0] is not 'human') in a party run.
  const healerAiShops = () => allyOn() && !!party && controllers()[0] !== 'human';
  const seatPursesOn = () => allyOn() && !!party && controllers().some((c, i) => (i === 0 ? c !== 'human' : c === 'human'));
  function buy(index, { by = 'human' } = {}) {
    if (phase !== 'shop' || !shop) return null;
    const card = shop.stock[index];
    if (!card || card.sold) return null;
    const tick = getTick();
    if (wallet < card.price) {
      events.emit(tick, 'currency_denied', {
        node: card.node,
        price: card.price,
        wallet,
        index,
      });
      return { denied: 'insufficient_funds', price: card.price, wallet };
    }
    wallet -= card.price;
    buildSys.grantNode(card.node, 'purchased'); // card departs to the bench
    card.sold = true;
    // The player bought for an AI-held Healer (Manual): its marks are void.
    if (by === 'human' && shop.marked) {
      shop.touched = true;
      shop.marked = shop.marked.map(() => false);
    }
    const owned = draft.ownedCount(card.node);
    events.emit(tick, 'shop_purchase', {
      node: card.node,
      price: card.price,
      wallet,
      owned,
      index,
    });
    return { node: card.node, price: card.price, wallet, owned };
  }

  // SHOP REFRESH (v0.5.248): the price `seat`'s next refresh costs this
  // visit (the Peddler's Seal discount applies, like the cards).
  function refreshCost(seat) {
    const s = Number(seat) | 0;
    const n = s === 0 ? (shop && shop.refreshes) || 0 : pages ? pages.refreshes(s) : 0;
    return relics.shopPrice(refreshPrice(n));
  }
  // A press on the shelf's Refresh: `seat` pays from its own purse (the
  // Healer's is the run wallet) and its whole node shelf is redrawn from its
  // class pool under the same stratified draw as the open (the Healer's from
  // the run's seeded stream, an ally's from the party stream). The relic
  // shelf is the whole party's and stays. AI seats never refresh, so a run
  // with no press draws exactly as before.
  function refreshShop(seat = 0) {
    if (phase !== 'shop' || !shop) return null;
    const s = Number(seat) | 0;
    const price = refreshCost(s);
    if (s !== 0) {
      if (!allyOn() || !pages || !pages.shopOpen() || party.purse(s) === null) return null;
      return pages.refresh(s, price);
    }
    const tick = getTick();
    const n = shop.refreshes || 0;
    if (wallet < price) {
      events.emit(tick, 'refresh_denied', { seat: 0, price, wallet });
      return { denied: 'insufficient_funds', price, wallet };
    }
    wallet -= price;
    shop.stock = draft.shopStock().map((c) => ({ ...c, price: relics.shopPrice(c.price), sold: false }));
    shop.refreshes = n + 1;
    // The player chose for an AI-held Healer's shelf (Manual): marks void.
    if (shop.marked) {
      shop.touched = true;
      shop.marked = shop.stock.map(() => false);
    }
    events.emit(tick, 'shop_refresh', { seat: 0, price, wallet, n: n + 1, stock: shop.stock.map((c) => ({ node: c.node, rarity: c.rarity, price: c.price })) });
    return { seat: 0, price, wallet, refreshes: n + 1 };
  }

  function advanceFromShop({ force = false, by = null } = {}) {
    if (phase !== 'shop') return null;
    // PARTY (BUILD_BRIEF §25.7): with >= 2 humans the Advance leaves at once
    // only when every OTHER human pressed Done; else a 15 s countdown (shown
    // to all) — the countdown or the shop's own 90 s deadline then force it.
    if (!force && pages && pages.shopOpen() && pages.humans() >= 2) {
      const waiting = pages.humansNotDone(by ?? hostSeat());
      if (waiting.length > 0) {
        const v = pages.shopView();
        const leaveTick = v && v.leaveTick !== null ? v.leaveTick : pages.startAdvanceCountdown(getTick());
        return { countdown: true, leaveTick, waiting };
      }
    }
    // PARTY: every AI-held shelf's still-marked buys (Suggested), benches
    // auto-filled, then the shelves close. Held relics go first: the marks
    // were picked from what they leave.
    buyPlannedRelics();
    if (shop && shop.marked && !shop.touched && healerAiShops() && party.mode() === 'suggest') {
      shop.marked.forEach((m, k) => {
        if (m && !shop.stock[k].sold && wallet >= shop.stock[k].price) buy(k, { by: 'ai' });
      });
      shop.marked = shop.marked.map(() => false);
    }
    if (healerAiShops() && party.mode() !== 'manual') buildSys.autoFill();
    if (pages && pages.shopOpen()) pages.closeShop();
    // The shop room is a room the player leaves behind, so it counts toward
    // the §18 summary row (it pays no stipend — `clearedRooms` is untouched).
    roomsDone = Math.max(roomsDone, RUN.shopRoom);
    events.emit(getTick(), 'shop_close', {
      wallet,
      sold: shop.stock.filter((s) => s.sold).length,
      roomsDone,
    });
    beginFade(RUN.bossRoom); // one-way (§16)
    return { nextRoom: RUN.bossRoom };
  }

  // ------------------------------------------------------------- run end --
  function buildSummary(result) {
    // CAMPAIGN: the level being played when the run ended records its rooms.
    if (campaign) {
      const rec = campaign.levels[campaign.levels.length - 1];
      if (rec && !rec.cleared) {
        rec.rooms = roomsDone;
        rec.ticks = getTick() - campaign.levelStartTick;
      }
    }
    const b = buildSys.view();
    return {
      result,
      victory: result === 'victory',
      act,
      actName: levelFor(act).name,
      challenge,
      rooms: roomsDone, // §18 "ROOMS CLEARED n / 8" — every room left behind
      combatRooms: clearedRooms, // the §14 stipend counter (max 7)
      lastRoom: roomIndex,
      glint: wallet,
      seed: frame ? frame.seed : null,
      ticks: getTick() - startTick,
      skills: skillSys
        .slotsView()
        .filter(Boolean)
        .map((s) => s.id),
      ...(party ? { builds: partyBuilds() } : {}),
      ...(relics.enabled() ? { relics: relics.owned(), curses: relics.view().cursesTaken } : {}),
      // UNLOCKS: what the run was started with (present only when something was).
      ...(campaign && campaign.boons ? { boons: cloneData(campaign.boons) } : {}),
      nodes: {
        bench: b.bench.map((x) => x.node),
        socketed: b.skills.flatMap((sk) =>
          sk.sockets.filter(Boolean).map((s) => `${sk.id}:${s.node}`)
        ),
      },
      party: registry
        .all()
        .filter((e) => e.partyIndex !== undefined)
        .map((e) => ({ index: e.partyIndex, hp: r2(e.hp), maxHp: e.maxHp })),
      // PLAN §12.8: the campaign this run was (levels played, cleared, time).
      campaign: campaign
        ? {
            mode: campaign.mode,
            harness: campaign.harness,
            startLevel: campaign.startLevel,
            level: campaign.level,
            index: campaign.index,
            levels: cloneData(campaign.levels),
            levelsCleared: campaign.levels.filter((l) => l.cleared).length,
            complete: campaign.mode === 'campaign' && (result === 'victory' || !!campaign.won),
            grant: cloneData(campaign.grant),
            // ENDLESS: how deep the descent went (present only on one).
            ...(campaign.endless ? { endless: true, depth: campaign.index, depthsCleared: campaign.levels.filter((l) => l.cleared).length, won: !!campaign.won } : {}),
            // DAILY: the day and how deep the run got (rooms across levels).
            ...(campaign.daily
              ? {
                  daily: {
                    key: campaign.daily.key,
                    relic: campaign.daily.relic,
                    curse: campaign.daily.curse,
                    depth: dailyDepth({ index: campaign.index, rooms: roomsDone, won: result === 'victory', levels: campaign.index }),
                    won: result === 'victory',
                  },
                }
              : {}),
          }
        : null,
    };
  }

  function endRun(result) {
    if (!active) return null;
    const tick = getTick();
    summary = buildSummary(result);
    events.emit(tick, 'run_end', {
      result,
      rooms: summary.rooms,
      glint: summary.glint,
      skills: [...summary.skills],
      nodes: summary.nodes.bench.length + summary.nodes.socketed.length,
      ticks: summary.ticks,
      act,
      challenge,
      campaign: summary.campaign ? cloneData(summary.campaign) : null,
    });
    // §2/§13: ALL run state is wiped at run end (the end screen renders from
    // the frozen summary above, never from live state). Gauntlet r6 (journey
    // J6-F1 / campaign CR6-F1, PLAN §12.1 "CAMPAIGN COMPLETE card -> camp",
    // ruling A15): the run's world ends here — the director, the Stag, every
    // hostile and shot go, nothing can fight — but the party and its build
    // stay exactly as the last blow left them while the victory / defeat card
    // is up, so the level (and a fallen party) is what the card sits over.
    // The loadout reset (run_wiped) happens with the return to camp. A Quit
    // to Lobby has no card and resets at once.
    if (result === 'abandoned' || result === 'tutorial') wipeState({ silent: false });
    else endWorld();
    phase = result; // 'victory' | 'defeat'
    return summary;
  }

  // Everything the run owns goes back to boot condition (§13 "Wiped at run
  // end: everything"): skills back to the starting kit with fresh cooldowns,
  // bench + sockets empty, Glint 0, party topped up and standing, dodge timer
  // clear, arena emptied of enemies and of the boss.
  function wipeState({ silent }) {
    endWorld();
    resetLoadout({ silent });
  }

  // The run's world goes: room, campaign, pages, director, Stag, hostiles,
  // shots, zones. combatAllowed() is false from here.
  function endWorld() {
    const tick = getTick();
    exitRoom(tick);
    lastCombatLayout = null;
    roomPlanView = null;
    campaign = null; // (endRun froze it into the summary first)
    active = false;
    roomIndex = 0;
    reward = null;
    path = null;
    shop = null;
    frame = null;
    rewardFor = {};
    pendingRoom = 0;
    roomsDone = 0;
    clearedRooms = 0;
    spoils = null;
    spoilsTotal = 0;
    phase = 'idle';
    // The encounter director stops dead (schedule + spawn telegraphs +
    // Waystone), then the boss + adds, every hostile body and shot, and every
    // zone go. From here combatAllowed() is false, so enemies.spawn is a hard
    // no-op until the next run's first combat tick (Round D F6: the pending
    // spawns used to mature 48 ticks after run_end and walk into Camp).
    waves.stop('run_end');
    boss.despawn();
    enemies.reset();
    sweepPlayerTransients(tick, 'run_end');
    allySys.cmd('mark', [null]);
  }

  // Everything the party carried goes back to boot condition.
  function resetLoadout({ silent }) {
    const tick = getTick();
    // (the boundary's free revive stands a fallen party up — at the return,
    // never under the defeat card)
    allySys.cmd('roomBoundary');
    wallet = RUN.startingGlint;
    const kit = new Array(SKILL_SLOTS).fill(null);
    STARTING_SKILLS.forEach((id, i) => {
      kit[i] = { id, remaining: 0 };
    });
    skillSys.restore({ slots: kit, override: null });
    buildSys.restore({ bench: [], assignments: [] });
    // PARTY: every ally back to its starting loadout, empty build, purse 0.
    if (party) party.resetForRun(rng.seed);
    if (pages) pages.reset();
    for (const e of registry.all()) {
      if (e.partyIndex === undefined) continue;
      e.hp = e.maxHp;
      e.downed = false;
      e.downedTick = -1;
      if (e.status) e.status = {}; // §13 "wiped at run end: everything" — statuses too
    }
    player.dodgeReadyTick = tick;
    player.nextBasicTick = tick;
    player.dashTicksLeft = 0;
    if (!silent) events.emit(tick, 'run_wiped', { wallet, skills: STARTING_SKILLS.length });
  }

  function returnToCamp() {
    // The camp hub scene lands with its own block; the run's world went at
    // run end, so this dismisses the end screen and resets the loadout.
    if (phase !== 'victory' && phase !== 'defeat') return null;
    phase = 'idle';
    autoReturnTick = null;
    // Debug assertion for §18: nothing hostile may ride into the hub. The
    // count is taken BEFORE the belt-and-braces sweep so a leak is visible in
    // the event payload even though the sweep removes it.
    const leaked = registry.all().filter((e) => e.faction === 'hostile').length;
    waves.stop('return_to_camp');
    boss.despawn();
    enemies.reset();
    // The party leaves the end card's world: its loadout resets now (always,
    // so a card restored from a save resets too).
    resetLoadout({ silent: false });
    events.emit(getTick(), 'return_to_camp', { enemies: leaked });
    return { phase, enemies: leaked };
  }

  // -------------------------------------------------------------- ticking --
  function continuous() {
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.continuous();
  }

  function discrete() {
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.resolve();
  }

  function endOfTick() {
    // RELICS: this tick's procs (Thorn Mail, Leech Fang) land first.
    if (active) relics.endOfTick();
    // KEYS AND VAULTS: a fallen key lands; a hero walking over one takes it;
    // in the vault, over a pile or the platter.
    if (active && vaults.enabled()) {
      vaults.step();
      if (phase === 'vault') stepVault();
    }
    if (active && roomIndex === RUN.bossRoom && phase === 'combat') boss.endOfTick();
    // Status bookkeeping for the tick that just resolved (announce + prune),
    // before a fade can walk into the next room.
    statusTracker.endOfTick();
    // PARTY: network deadlines (armed live; nothing in single-player).
    if (pages && (phase === 'reward' || phase === 'path' || phase === 'shop')) partyDeadlines();
    // PARTY: a held door leaves when every human socket screen closed or the
    // hold ran out (the screens close and bank a node in hand).
    if (phase === 'path' && path && path.hold && (getTick() >= path.hold.untilTick || !pages || !pages.humanScreenOpen())) {
      const side = path.hold.side;
      const timedOut = getTick() >= path.hold.untilTick;
      path.hold = null;
      if (timedOut) events.emit(getTick(), 'party_socket_close', { reason: 'door' });
      choosePath(side, { hold: false });
    }
    if (phase === 'fade' && getTick() >= fadeUntilTick) enterRoom(pendingRoom);
    // PLAN §12.2: the card's own hard bound — the sim advances whatever the
    // presentation does (hidden host tab, no UI, a stuck preload).
    if (phase === 'transit' && campaign && campaign.card && getTick() >= campaign.card.hardUntilTick) advanceLevel('timeout');
    // CAMPAIGN COMPLETE -> camp, in sim time (pause holds it; guests follow).
    if (phase === 'victory' && autoReturnTick !== null && getTick() >= autoReturnTick) returnToCamp();
  }

  // PARTY (PLAN §16.3 / §16.5): arm / fire the network deadlines.
  function partyDeadlines() {
    const tick = getTick();
    pages.syncDeadlines(tick);
    const due = pages.due(tick);
    if (!due) return;
    if (due === 'page' && phase === 'reward') {
      pages.timeoutPage();
      const c0 = pages.card(0);
      if (c0 && !c0.decided) {
        // The Healer's own card (a human host that never chose): the §25.8 rule.
        const choice = reward && reward.type ? (reward.swap ? reward.suggest : 'take') : 'leave';
        pages.pick(0, choice, reward && reward.swap ? reward.replace : null, { by: 'timeout' });
        events.emit(tick, 'party_autopick', { seat: 0, reason: 'timeout', choice, id: reward ? reward.id : null });
      }
      commitPage('timeout');
    } else if (due === 'door' && phase === 'path') {
      // KEYS AND VAULTS: the AI takes the vault door when it holds a key.
      const vs = path && path.options[1] && path.options[1].vault ? 1 : 0;
      events.emit(tick, 'party_autopick', { seat: 0, reason: 'door_timeout', choice: vs ? 'right' : 'left' });
      choosePath(vs);
    } else if (due === 'shop' && phase === 'shop') {
      advanceFromShop({ force: true });
    }
  }

  // §2: defeat = all 4 party members Downed simultaneously (the ONLY defeat
  // rule). The ally block owns the predicate and emits `defeat`.
  function onDefeat() {
    if (!active) return;
    // TUTORIAL: a fallen party just goes home (no defeat card, no record).
    if (tutorialOn()) {
      endTutorial('defeat');
      return;
    }
    endRun('defeat');
  }

  // ----------------------------------------------------------------- view --
  const combatActive = () => active && phase === 'combat';

  function view() {
    return {
      active,
      phase,
      combatActive: combatActive(),
      room: roomIndex,
      rooms: RUN.rooms,
      act,
      actName: levelFor(act).name,
      challenge,
      // Slice 2: the boss this run meets, from room 6 on (the shop's Advance
      // label, the boss banner); absent earlier so the hashed view of the
      // certified early rooms is unchanged.
      ...(active && roomIndex >= 6 ? { actBoss: { kind: currentBoss().kind, name: currentBoss().name } } : {}),
      // ENDLESS: present only on an endless descent (hash-stable view).
      ...(endlessDepth() ? { endless: { depth: endlessDepth(), won: !!campaign.won } } : {}),
      // DAILY: present only on the day's run (hash-stable view).
      ...(active && campaign && campaign.daily ? { daily: { key: campaign.daily.key } } : {}),
      // TUTORIAL: present only in the guided first room (hash-stable view).
      ...(tutorialOn() ? { tutorial: { hold: !!campaign.tutorial.hold } } : {}),
      layout: layout ? { ...layout } : null,
      mode: frame && roomIndex ? frame.modes[roomIndex - 1] : null,
      wallet,
      // Small fixes: every seat's Glint ([Healer wallet, seat 1-3 purses]) so
      // the HUD counter reads the viewer's own; present only when a seat
      // other than the Healer is played (class select, co-op), so a solo
      // Healer run hashes as before.
      ...(seatPursesOn() ? { purses: [wallet, party.purse(1), party.purse(2), party.purse(3)] } : {}),
      clearedRooms,
      roomsDone,
      freeSkillSlots: draft.freeSkillSlots(),
      frame: frame
        ? { seed: frame.seed, modes: [...frame.modes], defendAt: [...frame.defendAt], sides: [...frame.sides] }
        : null,
      rewardFor: { ...rewardFor },
      // fix-M4a-r4: `upgrades` (the drops that upgrade a full build) is
      // present only when non-empty — the view is part of snapshotState(), so
      // a fill-only run hashes exactly as it did before the fix.
      spoils: spoils
        ? spoils.upgrades && spoils.upgrades.length
          ? { room: spoils.room, nodes: [...spoils.nodes], upgrades: [...spoils.upgrades] }
          : { room: spoils.room, nodes: [...spoils.nodes] }
        : null,
      spoilsTotal,
      reward: reward
        ? {
            type: reward.type,
            id: reward.id,
            promised: reward.promised,
            substituted: reward.substituted,
            line: reward.line,
            freeSkillSlots: reward.freeSkillSlots,
            // fix-M4a-r4: `pool: 'upgrade'` when drawn from the upgrade
            // layer, `upgrade` = the swap target read LIVE (the player may
            // re-socket while the page is up; absent once the node would fill
            // a vacant socket), `reason` = why an empty offer is empty. Each
            // key is present only when set (hash-stable view, see spoils).
            ...(reward.pool ? { pool: reward.pool } : {}),
            ...upgradeKey(reward.type === 'node' ? reward.id : null),
            ...(reward.reason ? { reason: reward.reason } : {}),
            // Ruling A17: a swap offer's pending Replaces slot + the AI's
            // suggestion (present only on a swap — hash-stable view).
            ...(reward.swap ? { swap: true, replace: reward.replace, suggest: reward.suggest } : {}),
          }
        : null,
      path: path
        ? {
            nextRoom: path.nextRoom,
            focus: path.focus,
            freeSkillSlots: path.freeSkillSlots,
            options: path.options.map((o) => ({ ...o })),
            // PARTY socket hold (present only while held — hash-stable).
            ...(path.hold ? { hold: { side: path.hold.side, untilTick: path.hold.untilTick, inTicks: Math.max(0, path.hold.untilTick - getTick()) } } : {}),
          }
        : null,
      shop: shop
        ? {
            wallet,
            stock: shop.stock.map((s) => ({
              node: s.node,
              rarity: s.rarity,
              price: s.price,
              sold: s.sold,
              owned: draft.ownedCount(s.node),
              // fix-M4a-r4: the swap target when this card UPGRADES a full
              // build — present only then (hash-stable view).
              ...upgradeKey(s.sold ? null : s.node),
              affordable: wallet >= s.price,
              // An AI-held Healer's Suggested pick (key present only then).
              ...(shop.marked ? { marked: !!shop.marked[shop.stock.indexOf(s)] } : {}),
            })),
            // The AI-held Healer's shelf: the player bought on it (Manual).
            ...(shop.marked ? { touched: !!shop.touched } : {}),
            // SHOP REFRESH: how often the Healer's shelf was redrawn this
            // visit (present only after one — hash-stable).
            ...(shop.refreshes ? { refreshes: shop.refreshes } : {}),
          }
        : null,
      boss: active && roomIndex === RUN.bossRoom ? boss.view() : null,
      // PARTY: the party page / shelves (keys present only while open, so a
      // v0.5.150 view hashes exactly as before when none is up).
      ...(pages && pages.isOpen() ? { party: pages.pageView() } : {}),
      ...(pages && pages.shopOpen() ? { partyShop: pages.shopView() } : {}),
      // PARTY: which socket screens are open (network only; present only then).
      ...(pages && pages.screensAny() ? { socketScreens: pages.screens() } : {}),
      // RELICS: present only while a run with relics is live (hash-stable).
      ...(active && relics.enabled() ? { relics: relics.view() } : {}),
      // EVENT ROOMS: present only while an encounter is live (hash-stable).
      ...(active && encounters.view(encCtx()) ? { encounter: encounters.view(encCtx()) } : {}),
      // KEYS AND VAULTS: present only in a run with keys (hash-stable).
      ...(active && vaults.enabled() ? { vaults: vaults.view() } : {}),
      // UNLOCKS: the run's boons (present only when the player picked some).
      ...(active && campaign && campaign.boons ? { boons: cloneData(campaign.boons) } : {}),
      summary,
      fadeTicksLeft: phase === 'fade' ? Math.max(0, fadeUntilTick - getTick()) : 0,
    };
  }

  // ----------------------------------------------- debug cmds (TESTING.md) --
  function cmd(name, args) {
    switch (name) {
      case 'startRun':
        // ('startRun', { act, challenge }) — PLAN §6.4; bypasses act locks.
        return startRun(args[0] && typeof args[0] === 'object' ? args[0] : { act: args[0], challenge: args[1] });
      // ------------------------------------------ CAMPAIGN (PLAN §12.11) --
      case 'startCampaign': {
        // ('startCampaign', { level, challenge, depart }) — a developer path:
        // bypasses the unlock chain and marks the run harness.
        const o = args[0] && typeof args[0] === 'object' ? args[0] : { level: args[0], challenge: args[1] };
        return startCampaign({ harness: true, ...o });
      }
      case 'campaignAdvance':
        return campaignAdvance(args[0] ?? 'skip');
      case 'abandonRun':
        return abandonRun(args[0] ?? 'quit');
      case 'tutorialRelease':
        return tutorialRelease();
      case 'endTutorial':
        return endTutorial(args[0] ?? 'skip');
      case 'campaignState':
        return campaignView();
      case 'campaignRules':
        return campaignRules();
      case 'endlessRules':
        return endlessRules();
      case 'endlessJump': {
        // ('endlessJump', depth) — probes: a live endless descent clears the
        // level it is in AS depth - 1 and opens the card to `depth` (marks
        // the campaign harness). Never in a plain campaign.
        if (!active || !campaign || !campaign.endless || phase === 'transit') return null;
        const d = Math.max(campaign.index + 1, Number(args[0]) | 0);
        const tick = getTick();
        campaign.harness = true;
        campaign.index = d - 1;
        act = levelOfDepth(d - 1);
        campaign.level = act;
        if (d - 1 > ACT_IDS.length) campaign.won = true;
        campaign.levels.push({ level: act, index: campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
        onLevelCleared(tick);
        return campaignView();
      }
      // ------------------------------------------ Gauntlet M4a probe cmds --
      case 'setStatus': {
        // ('setStatus', id, kind, mag, ticks) -> the stored record | refusal
        const [id, kind, mag = 0.5, ticks = 120] = args;
        const e = registry.byId(id);
        if (!e) return { error: 'no_entity' };
        const why = combat.status.refusal(e, kind, getTick());
        if (why) return { refused: why };
        const rec = combat.status.apply(e, kind, mag, ticks, getTick(), player.id);
        return rec ? { ...rec } : { refused: 'non_positive' };
      }
      case 'clearStatus': {
        const [id, kind] = args;
        const e = registry.byId(id);
        if (!e) return { error: 'no_entity' };
        return combat.status.clear(e, kind ?? null);
      }
      case 'statusOf': {
        const [id] = args;
        const e = registry.byId(id);
        return e ? combat.status.view(e, getTick()) : null;
      }
      case 'autopilot':
        return autopilot.configure(args[0] === undefined ? true : args[0]);
      case 'echoArm':
        return buildSys.echoArm(args[0]);
      case 'resonance':
        return buildSys.setResonance(args[0], args[1]);
      case 'roomPlan':
        return roomPlanFull();
      case 'difficultyTable':
        return null; // served by the content service (data/difficulty.js)
      case 'keenProbe': {
        // ('keenProbe', id, critBonus) — one real damage instance (power 1,
        // no knockback) through the §9 pipeline with a crit bonus: the probe
        // that measures Keen's roll (G4a.3). Draws exactly one crit roll.
        const [id, bonus = 0] = args;
        const t = registry.byId(id);
        if (!t) return null;
        return combat.applyDamage(t, 1, { delivery: 'skill', shape: 'debug', attacker: null, source: 'keen_probe', critBonus: bonus });
      }
      case 'runState':
        return view();
      case 'draftTake':
        // ('draftTake'[, slot]) — ruling A17: the slot a swap replaces.
        return takeReward(Number.isInteger(args[0]) ? args[0] : undefined);
      case 'draftReplace':
        return setRewardReplace(args[0]);
      // ------------------------------------------- PARTY (PLAN §16.11) --
      case 'partyPick':
        return partyPick(args[0], args[1], Number.isInteger(args[2]) ? args[2] : null, { by: 'human' });
      case 'partyReplace':
        // ('partyReplace', seat, slot) — move a swap card's Replaces mark.
        if (Number(args[0]) === 0) return setRewardReplace(args[1]);
        return pages && pages.isOpen() ? pages.setReplace(Number(args[0]), args[1]) : null;
      case 'partyCommit':
        return phase === 'reward' && pages && pages.isOpen() ? commitPage('commit') : null;
      case 'partyPage':
        return pages ? pages.pageView() : null;
      case 'partyShop':
        return pages ? pages.shopView() : null;
      case 'partyBuy':
        return partyBuy(args[0], args[1] ?? 0);
      case 'partyShopMark':
        return partyShopMark(args[0], args[1], args[2]);
      case 'partyShopDone':
        return partyShopDone(args[0]);
      case 'difficultyLegacy':
        // ('difficultyLegacy', on) — Node-only determinism proof (PLAN §16.9):
        // the v0.5.150 difficulty constants back in force. Never set by the game.
        return setDifficultyLegacy(args[0] !== false);
      case 'partyScreen':
        // ('partyScreen', seat, open) — a socket screen open / closed (the
        // network socket hold, BUILD_BRIEF §25.7).
        return partyScreen(args[0], args[1]);
      case 'partySupply':
        // Node determinism proof only (PLAN §16.9): the ally supply off.
        if (args[0] !== undefined) supplyOn = !!args[0] && !!pages;
        return supplyOn;
      case 'partyGrant': {
        // ('partyGrant', level | 'max') — now, between rooms (probes).
        if (!party) return null;
        if (args[0] === 'max') {
          stressHealer();
          return party.stress();
        }
        const gr = grantFor(Number(args[0]));
        return gr && gr.allies ? party.applyGrant(gr.allies, 'grant') : null;
      }
      case 'partyHarnessGrant':
        // ('partyHarnessGrant', N | 'max' | null) — applied at the next run start.
        harnessGrant = args[0] === undefined ? null : args[0];
        return harnessGrant;
      case 'draftDecline':
        return declineReward();
      // ------------------------------------------------------ RELICS --
      case 'relicChoose':
        return chooseRelic(args[0]);
      case 'relicFocus':
        return focusRelic(args[0] ?? 0);
      case 'relics':
        // ('relics'[, on]) — turn relics on / off for the live run (probes;
        // a single-level startRun() has them off).
        if (args[0] !== undefined) {
          if (args[0] && !relics.enabled()) relics.reset(frame ? frame.seed : rng.seed, true);
          else if (!args[0]) relics.reset(0, false);
        }
        return relics.enabled() ? relics.view() : null;
      case 'relicsDefault':
        // ('relicsDefault', on) — whether the NEXT campaign rolls relics.
        if (args[0] !== undefined) relicsDefault = !!args[0];
        return relicsDefault;
      case 'relicGrant':
        return relics.grant(args[0]);
      case 'relicBuy':
        // ('relicBuy', index[, seat]) — buy off the shop's relic shelf.
        return buyRelic(args[1] ?? 0, args[0] ?? 0);
      case 'relicPool':
        // Batch 3: the relic ids a pick could offer now (class relics only
        // while their class stands in the party).
        return relics.enabled() ? relics.pool() : null;
      case 'relicHit': {
        // Batch 3 probe: ('relicHit', targetId, attackerId|null, power, crit)
        // — one real party hit through the §9 pipeline.
        const [id, by = null, power = 10, crit = false] = args;
        const t = registry.byId(id);
        if (!t) return null;
        return combat.applyDamage(t, power, { delivery: 'basic', shape: 'debug', attacker: by, source: 'relic_probe', forceCrit: !!crit, kbDist: 0 });
      }
      case 'relicStatus': {
        // Batch 3 probe / VFX lab: ('relicStatus', id, kind, mag, ticks,
        // seat|null) — a real status from a party seat (a Tank taunt, an
        // exposure), announced like any other at the end of the tick.
        const [id, kind, mag = 1, ticks = 120, seat = null] = args;
        const t = registry.byId(id);
        const src = Number.isInteger(seat) ? registry.all().find((e) => e.partyIndex === seat) : null;
        if (!t) return null;
        return !!combat.status.apply(t, kind, mag, ticks, getTick(), src ? src.id : null);
      }
      case 'relicRoomEnter':
        // VFX lab: ('relicRoomEnter', mode) — replay the relics' room-entry
        // procs as if this room were a `mode` room (Huntsman's Horn,
        // Pilgrim's Lamp).
        if (!relics.enabled() || !active) return null;
        relics.onRoomEnter(roomIndex, args[0]);
        return true;
      case 'relicHeal': {
        // Batch 3 probe: ('relicHeal', targetId, healerId|null, amount).
        const [id, by = null, amount = 10] = args;
        const t = registry.byId(id);
        if (!t) return null;
        return combat.applyHeal(t, amount, { healer: by, source: 'relic_probe' });
      }
      case 'relicDropNext':
        // Probe / VFX lab: the next elite the party kills drops a relic.
        return relics.dropNext();
      case 'relicCurseHere':
        // Probe / VFX lab: ('relicCurseHere', curseId) curses the live room now
        // (its telegraph and healing rules; its wave numbers are already rolled).
        if (!relics.enabled() || phase !== 'combat') return null;
        relics.takeCurse(args[0], roomIndex);
        relics.onRoomEnter(roomIndex, frame ? frame.modes[roomIndex - 1] : 'kill_all');
        return relics.view().curse;
      // ----------------------------------------------- ROOM OBJECTIVES --
      case 'objectiveRoom': {
        // ('objectiveRoom', 'hunt'|'purge'|'kill_all', room) — a later combat
        // room of this level becomes that room (probes, screenshots).
        const m = args[0];
        const n = Number(args[1]);
        if (!active || !frame || !(isObjectiveMode(m) || m === 'kill_all')) return null;
        if (!(Number.isInteger(n) && n > roomIndex && n >= 2 && n <= 6) || frame.modes[n - 1] === 'defend') return null;
        frame.modes[n - 1] = m;
        return [...frame.modes];
      }
      // ------------------------------------------------- CHAMPION ROOMS --
      case 'championRoom': {
        // ('championRoom', room) — a later combat room of this level becomes
        // the champion's room (probes, screenshots, the VFX lab).
        const n = Number(args[0]);
        if (!active || !frame || !championsOn()) return null;
        if (!(Number.isInteger(n) && n > roomIndex && n >= 2 && n <= 6)) return null;
        frame.modes[n - 1] = 'champion';
        frame.defendAt = frame.defendAt.filter((r) => r !== n);
        return [...frame.modes];
      }
      case 'crownDoor':
        // ('crownDoor'[, side]) — the next path screen carries the crown door.
        if (!active || !championsOn()) return null;
        forcedCrown = { room: roomIndex + 1, side: args[0] === 1 ? 1 : 0 };
        return { ...forcedCrown };
      case 'crownOf':
        // The crown this level rolled: { room, side }.
        return active && frame && championsOn() ? crownFor(frame.seed, campaign.index) : null;
      // ------------------------------------------------ KEYS AND VAULTS --
      case 'keyGive': {
        // The party holds a key (probes, screenshots).
        if (!active || !vaults.enabled()) return null;
        if (!vaults.held()) vaults.loadState({ ...vaults.saveState(), key: { from: args[0] === 'elite' ? 'elite' : 'champion', room: roomIndex, kind: 'probe' } });
        return vaults.view();
      }
      case 'keyDrop': {
        // ('keyDrop'[, x, z]) — a key falls in the live room.
        if (!active || !vaults.enabled()) return null;
        return vaults.drop('elite', 'probe', Number(args[0] ?? 0), Number(args[1] ?? -2), roomIndex);
      }
      case 'vaultDoor':
        // ('vaultDoor', side) — the next path screen's vault door prefers this side.
        if (!active || !vaults.enabled()) return null;
        forcedVault = args[0] === 1 ? 1 : 0;
        return forcedVault;
      case 'vaultRoom': {
        // ('vaultRoom', n) — a later room of this level becomes the vault.
        const n = Number(args[0]);
        if (!active || !frame || !vaults.enabled()) return null;
        if (!(Number.isInteger(n) && n > roomIndex && n >= 2 && n <= 6)) return null;
        frame.modes[n - 1] = 'vault';
        frame.defendAt = frame.defendAt.filter((r) => r !== n);
        return [...frame.modes];
      }
      case 'vaultOpen':
        return openVault();
      case 'vaultState':
        return vaults.enabled() ? vaults.view() : null;
      case 'relicDoor':
        // ('relicDoor', curseId[, side]) — the next path screen's cursed door.
        return relics.forceDoor(args[0], args[1] ?? 0);
      // ----------------------------------------------- ELITE AFFIXES --
      case 'affixRule':
        // The live room's roll rule ({ count, salt } | null).
        return affixRule();
      case 'affixes':
        // Every live affixed elite: { id, etype, affixes, ward, blink }.
        return registry
          .all()
          .filter((e) => Array.isArray(e.affixes) && e.state === 'active')
          .map((e) => ({ id: e.id, etype: e.kind, affixes: [...e.affixes], hp: Math.round(e.hp * 100) / 100, maxHp: e.maxHp, ward: e.affixWard ?? null, blink: e.blink ? { ...e.blink } : null, x: Math.round(e.x * 100) / 100, z: Math.round(e.z * 100) / 100 }));
      case 'affixData':
        return { ids: Object.keys(AFFIXES), rules: AFFIX_RULES };
      // ------------------------------------------------- EVENT ROOMS --
      case 'eventDoor':
        // ('eventDoor', encounterId[, side]) — the next path screen's "?" door.
        return encounters.force(args[0], args[1] ?? 0);
      case 'eventOpen':
        return openEncounter();
      case 'eventFocus':
        return focusEncounter(args[0] ?? 0);
      case 'eventChoose':
        return chooseEncounter(args[0]);
      case 'eventState':
        return encounters.view(encCtx());
      case 'pathFocus':
        return focusPath(args[0] ?? 0);
      case 'pathChoose':
        return choosePath(args[0] ?? 0);
      case 'shopBuy':
        return buy(args[0] ?? 0);
      case 'shopRefresh':
        // ('shopRefresh'[, seat]) — redraw that seat's shelf for Glint.
        return refreshShop(args[0] ?? 0);
      case 'shopRefreshCost':
        return phase === 'shop' ? refreshCost(args[0] ?? 0) : null;
      case 'shopAdvance':
        return advanceFromShop();
      case 'returnToCamp':
        return returnToCamp();
      case 'endRun':
        return endRun(args[0] === 'defeat' ? 'defeat' : 'victory');
      case 'skipToRoom': {
        // Jump the run frame forward for scripted probes: clears the live room
        // and walks straight into room n (rewards/paths for the skipped rooms
        // are not presented; the stipends they would have paid ARE, so the
        // §14 wallet arithmetic still holds at the shop).
        // ('skipToRoom', n[, { act, challenge }]) — a live run keeps its act;
        // with no run live, the options start one in that act.
        const n = Math.max(1, Math.min(RUN.rooms, args[0] ?? 1));
        if (!active) startRun(args[1] && typeof args[1] === 'object' ? args[1] : {});
        // A level-transition card is between two levels: advance it first
        // (the skip then lands in the NEW level), never skip inside the old one.
        if (phase === 'transit' && campaign && campaign.card) advanceLevel('skip_room');
        phase = 'skip'; // suppresses the boundary sequence on the forced clear
        waves.forceClear();
        boss.despawn();
        enemies.reset();
        sweepPlayerTransients(getTick(), 'skip');
        // §14: the stipend is +12 per COMBAT-room clear. The shop room pays
        // nothing, so skipping past it must not mint 12 Glint out of thin air
        // — walking to room 7 or room 8 both land on the deterministic 72.
        const combatBefore = frame.modes
          .slice(0, n - 1)
          .filter((m) => m === 'kill_all' || m === 'defend' || m === 'boss' || m === 'champion' || isObjectiveMode(m)).length;
        while (clearedRooms < combatBefore) {
          clearedRooms += 1;
          gainGlint(RUN.stipend, 'skip_stipend');
          if (allyOn()) pages.stipend('skip_stipend'); // PARTY: every purse keeps the §14 arithmetic
        }
        roomsDone = Math.max(roomsDone, n - 1); // every room before n is behind us
        enterRoom(n);
        return view();
      }
      case 'bossHp':
        // ('bossHp', pct[, skipPhases]) — skipPhases marks the add waves at or
        // above pct as already played, so no adds spawn for them.
        return boss.setHpPct(args[0] ?? 0.5, args[1] === true);
      case 'bossPick':
        // ('bossPick', kind | null) — probes and benches: the boss room meets
        // this boss when it belongs to the level (data/levels.js bossFor).
        bossPick = typeof args[0] === 'string' ? args[0] : null;
        return bossPick;
      case 'killBoss': {
        const b = boss.entity();
        if (!b) return null;
        combat.kill(b);
        return true;
      }
      case 'wallet': {
        if (args[0] !== undefined) {
          wallet = Math.max(0, Math.round(args[0]));
          events.emit(getTick(), 'glint_set', { wallet });
        }
        return wallet;
      }
      case 'draftPools':
        return {
          skill: draft.skillPool(),
          node: draft.nodePool(),
          upgrade: draft.upgradePool(), // fix-M4a-r4: the layer a full build draws from
          free: draft.freeSkillSlots(),
        };
      case 'autoFill':
        // The socket screen's Auto-fill (M4c D7) — the same policy the
        // autopilot uses; refused while combat is live.
        return buildSys.autoFill();
      default:
        return undefined;
    }
  }

  // The live room's plan: difficulty numbers + the rolled waves (wave rooms).
  function roomPlanFull() {
    if (!roomPlanView) return null;
    const w = typeof waves.planView === 'function' ? waves.planView() : null;
    return { ...roomPlanView, waves: w ? w.waves : [], roster: w ? w.roster : [], legacy: w ? w.legacy : null };
  }

  // PLAN §3.6 (a): M4b's content systems register here; enter() is called
  // synchronously at the room-enter point (same tick, before room_enter),
  // exit() when the room is left and at run end.
  function setRoomHooks(h = {}) {
    roomHooks = {
      enter: typeof h.enter === 'function' ? h.enter : null,
      exit: typeof h.exit === 'function' ? h.exit : null,
    };
    return true;
  }

  // Persistence (PLAN §3.4) for the Gauntlet additions (the v0.4.63 run frame
  // members are captured by M2's world-level capture).
  const expeditionState = () => ({
    act,
    challenge,
    layout: layout ? { ...layout } : null,
    lastCombatLayout,
    roomPlan: roomPlanView ? { ...roomPlanView } : null,
    autopilot: autopilot.serialize(),
  });
  function restoreExpedition(d) {
    if (!d) return;
    act = ENDLESS_ACTS.includes(d.act) ? d.act : 1;
    challenge = CHALLENGE[d.challenge] ? d.challenge : 'standard';
    layout = d.layout ? { ...d.layout } : null;
    lastCombatLayout = d.lastCombatLayout ?? null;
    roomPlanView = d.roomPlan ? { ...d.roomPlan } : null;
    autopilot.restore(d.autopilot);
  }

  // Save system (docs/gauntlet/PLAN.md §3.4, M2): the COMPLETE run frame —
  // the v0.4.63 members plus the expedition state and the autopilot (the
  // draft and status tracker are stateless; roomHooks are wiring, not state).
  function saveState() {
    return {
      active,
      roomIndex,
      phase,
      wallet,
      frame,
      reward,
      path,
      shop,
      summary,
      pendingRoom,
      fadeUntilTick,
      rewardFor,
      clearedRooms,
      roomsDone,
      startTick,
      everStarted,
      act,
      challenge,
      layout,
      lastCombatLayout,
      roomPlan: roomPlanView,
      autopilot: autopilot.serialize(),
      spoils,
      spoilsTotal,
      // CAMPAIGN (schema 3): the level director's whole state, the card included.
      campaign: cloneData(campaign),
      autoReturnTick,
      // PARTY (schema 4, PLAN §16.6): the party page, the shelves, the door
      // deadline — present only when something is open.
      ...(pages && (pages.isOpen() || pages.shopOpen() || pages.doorDeadline() !== null || pages.screensAny()) ? { partyPages: pages.saveState() } : {}),
      // RELICS: present only when the run rolls relics.
      ...(active && relics.enabled() ? { relics: relics.saveState() } : {}),
      // EVENT ROOMS: present only when the run rolls "?" doors.
      ...(active && encounters.enabled() ? { encounters: encounters.saveState() } : {}),
      // KEYS AND VAULTS: present only in a run with keys.
      ...(active && vaults.enabled() ? { vaults: vaults.saveState() } : {}),
      ...(bossPick ? { bossPick } : {}),
    };
  }
  function loadState(d) {
    if (!d || typeof d.phase !== 'string') throw new TypeError('run.loadState: missing phase');
    active = !!d.active;
    roomIndex = d.roomIndex ?? 0;
    phase = d.phase;
    wallet = d.wallet ?? RUN.startingGlint;
    frame = d.frame ?? null;
    reward = d.reward ?? null;
    path = d.path ?? null;
    shop = d.shop ?? null;
    summary = d.summary ?? null;
    pendingRoom = d.pendingRoom ?? 0;
    fadeUntilTick = d.fadeUntilTick ?? 0;
    rewardFor = d.rewardFor ?? {};
    clearedRooms = d.clearedRooms ?? 0;
    roomsDone = d.roomsDone ?? 0;
    startTick = d.startTick ?? 0;
    everStarted = !!d.everStarted;
    act = ENDLESS_ACTS.includes(d.act) ? d.act : 1;
    challenge = CHALLENGE[d.challenge] ? d.challenge : 'standard';
    bossPick = typeof d.bossPick === 'string' ? d.bossPick : null;
    layout = d.layout ?? null;
    lastCombatLayout = d.lastCombatLayout ?? null;
    roomPlanView = d.roomPlan ?? null;
    autopilot.restore(d.autopilot ?? null);
    // M4c additions — absent in a tree migrated from schema 1.
    spoils = d.spoils ?? null;
    spoilsTotal = Number.isFinite(d.spoilsTotal) ? d.spoilsTotal : 0;
    // CAMPAIGN additions (schema 3; save/codec.js MIGRATIONS[2] fills them
    // for an older act run). A live run with no campaign record is treated as
    // a campaign from its act, so an in-memory older payload still advances.
    campaign = d.campaign ? cloneData(d.campaign) : null;
    if (!campaign && active) {
      campaign = {
        mode: 'campaign',
        harness: false,
        startLevel: act,
        level: act,
        index: 1,
        levels: [{ level: act, index: 1, startTick, rooms: roomsDone, cleared: false, ticks: 0 }],
        startTick,
        levelStartTick: startTick,
        clearedAt: 0,
        card: null,
        grant: null,
        transitions: 0,
      };
    }
    autoReturnTick = Number.isFinite(d.autoReturnTick) ? d.autoReturnTick : null;
    if (pages) pages.loadState(d.partyPages ?? null);
    relics.loadState(d.relics ?? null);
    encounters.loadState(d.encounters ?? null);
    vaults.loadState(d.vaults ?? null);
  }

  const api = {
    saveState,
    loadState,
    startRun,
    // Linear campaign (PLAN §12.2).
    startCampaign,
    campaignAdvance,
    abandonRun,
    tutorialRelease,
    endTutorial,
    campaign: campaignView,
    campaignRules,
    endRun,
    onRoomCleared,
    onDefeat,
    continuous,
    discrete,
    endOfTick,
    view,
    cmd,
    setRoomHooks,
    autopilot,
    roomPlan: roomPlanFull,
    layout: () => (layout ? { ...layout } : null),
    act: () => act,
    challenge: () => challenge,
    expeditionState,
    restoreExpedition,
    statusKinds: () => [...STATUS_KINDS],
    skillIds: () => Object.keys(SKILLS),
    isActive: () => active,
    // The spawn-gate predicate the HUD mirrors for the ?room= harness boot.
    combatAllowed,
    combatActive,
    combatAllowed,
    // UI entry points (src/ui/run/**) — the same paths __echoes.cmd drives.
    takeReward,
    declineReward,
    setRewardReplace,
    // PARTY (PLAN §16.3): the party page / shelves entry points.
    partyPick,
    partyCommit: () => (phase === 'reward' && pages && pages.isOpen() ? commitPage('commit') : null),
    partyReplace: (seat, slot) => (Number(seat) === 0 ? setRewardReplace(slot) : pages && pages.isOpen() ? pages.setReplace(Number(seat), slot) : null),
    partyBuy,
    partyShopMark,
    partyShopDone,
    partyPages: () => pages,
    // PARTY (§25.1): reorder a character's 4 skills between rooms.
    reorderLoadout(seat, from, to) {
      if (combatActive()) return { denied: 'combat_active' };
      if (Number(seat) === 0) return skillSys.reorderSkills(from, to);
      return party ? party.reorder(Number(seat), from, to) : null;
    },
    // The Auto-fill all button (socket screen, Shift+F / pad). `seats`: the
    // seats this caller owns (a network host: its own + AI-held; a guest's
    // CMD: its own) — default all four.
    autoFillAll(seats = null) {
      if (combatActive()) return { denied: 'combat_active' };
      const want = (s) => !Array.isArray(seats) || seats.includes(s);
      const out = want(0) ? [{ seat: 0, ...buildSys.autoFill() }] : [];
      if (party) for (const s of [1, 2, 3]) if (want(s)) out.push({ seat: s, ...party.autoFill(s) });
      return out;
    },
    partyScreen,
    setHarnessGrant: (g) => {
      harnessGrant = g ?? null;
      return harnessGrant;
    },
    focusPath,
    choosePath,
    // RELICS: the relic page's entry points.
    focusRelic,
    chooseRelic,
    buyRelic,
    // EVENT ROOMS: the encounter card's entry points.
    openEncounter,
    focusEncounter,
    chooseEncounter,
    // KEYS AND VAULTS: the chest (E does the same through the interactables).
    openVault,
    relics: () => (relics.enabled() ? relics.view() : null),
    buy,
    refreshShop,
    refreshCost,
    advanceFromShop,
    returnToCamp,
    wallet: () => wallet,
  };
  return api;
}
