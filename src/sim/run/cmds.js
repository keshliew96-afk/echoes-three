// THE RUN'S DEBUG COMMANDS (docs/TESTING.md): run.cmd(name, args), the
// harness and probe entry points that jump rooms, pick bosses and roads, grant
// Glint, force shrines and vaults and the rest. A part of the run system
// (sim/run.js): the run's state is `rs`, its other functions `RF`.
import { campaignRules, grantFor } from '../../data/campaign.js';
import { endlessRules, levelOfDepth } from '../../data/endless.js';
import { RUSH_RULES, rushAct, rushRules } from '../../data/rush.js';
import { setDifficultyLegacy } from '../../data/difficulty.js';
import { championById, crownFor } from '../champions.js';
import { AFFIXES, AFFIX_RULES } from '../affixes.js';
import { ACT_IDS, levelFor } from '../../data/levels.js';
import { isObjectiveMode } from '../objectives.js';
import { SHRINES } from '../shrines.js';
import { RUN } from './rules.js';

export function createRunCommands(ctx) {
  const { rs, RF, allyOn, autopilot, boss, buildSys, championsOn, combat, draft, encCtx, encounters, enemies, events, getTick, levelChampion, pages, party, player, registry, relics, rng, secrets, tonics, vaults, waves } = ctx;

  // ----------------------------------------------- debug cmds (TESTING.md) --
  function cmd(name, args) {
    switch (name) {
      case 'startRun':
        // ('startRun', { act, challenge }) — PLAN §6.4; bypasses act locks.
        return RF.startRun(args[0] && typeof args[0] === 'object' ? args[0] : { act: args[0], challenge: args[1] });
      // ------------------------------------------ CAMPAIGN (PLAN §12.11) --
      case 'startCampaign': {
        // ('startCampaign', { level, challenge, depart }) — a developer path:
        // bypasses the unlock chain and marks the run harness.
        const o = args[0] && typeof args[0] === 'object' ? args[0] : { level: args[0], challenge: args[1] };
        return RF.startCampaign({ harness: true, ...o });
      }
      case 'campaignAdvance':
        return RF.campaignAdvance(args[0] ?? 'skip');
      case 'pickRoad':
        // ('pickRoad', 'spire' | 'kiln') — the Level IV clear card's fork.
        return RF.pickRoad(String(args[0] ?? ''), 'pick');
      case 'abandonRun':
        return RF.abandonRun(args[0] ?? 'quit');
      case 'tutorialRelease':
        return RF.tutorialRelease();
      case 'endTutorial':
        return RF.endTutorial(args[0] ?? 'skip');
      case 'campaignState':
        return RF.campaignView();
      case 'campaignRules':
        return campaignRules();
      case 'endlessRules':
        return endlessRules();
      case 'rushRules':
        return rushRules();
      case 'rushJump': {
        // ('rushJump', fight) — probes: a live rush clears the fight it is in
        // AS fight - 1 and opens the card to `fight` (marks the campaign
        // harness). Never outside a rush.
        if (!rs.active || !rs.campaign || !rs.campaign.rush || rs.phase === 'transit') return null;
        const d = Math.min(RUSH_RULES.fights, Math.max(rs.campaign.index + 1, Number(args[0]) | 0));
        const tick = getTick();
        rs.campaign.harness = true;
        rs.campaign.index = d - 1;
        rs.act = rushAct(d - 1);
        rs.campaign.level = rs.act;
        rs.campaign.levels.push({ level: rs.act, index: rs.campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
        RF.onLevelCleared(tick);
        return RF.campaignView();
      }
      case 'endlessJump': {
        // ('endlessJump', depth) — probes: a live endless descent clears the
        // level it is in AS depth - 1 and opens the card to `depth` (marks
        // the campaign harness). Never in a plain campaign.
        if (!rs.active || !rs.campaign || !rs.campaign.endless || rs.phase === 'transit') return null;
        const d = Math.max(rs.campaign.index + 1, Number(args[0]) | 0);
        const tick = getTick();
        rs.campaign.harness = true;
        rs.campaign.index = d - 1;
        rs.act = levelOfDepth(d - 1);
        rs.campaign.level = rs.act;
        if (d - 1 > ACT_IDS.length) rs.campaign.won = true;
        rs.campaign.levels.push({ level: rs.act, index: rs.campaign.index, startTick: tick, rooms: 0, cleared: false, ticks: 0 });
        RF.onLevelCleared(tick);
        return RF.campaignView();
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
        return RF.roomPlanFull();
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
        return RF.view();
      case 'draftTake':
        // ('draftTake'[, slot]) — ruling A17: the slot a swap replaces.
        return RF.takeReward(Number.isInteger(args[0]) ? args[0] : undefined);
      case 'draftReplace':
        return RF.setRewardReplace(args[0]);
      // ------------------------------------------- PARTY (PLAN §16.11) --
      case 'partyPick':
        return RF.partyPick(args[0], args[1], Number.isInteger(args[2]) ? args[2] : null, { by: 'human' });
      case 'partyReplace':
        // ('partyReplace', seat, slot) — move a swap card's Replaces mark.
        if (Number(args[0]) === 0) return RF.setRewardReplace(args[1]);
        return pages && pages.isOpen() ? pages.setReplace(Number(args[0]), args[1]) : null;
      case 'partyCommit':
        return rs.phase === 'reward' && pages && pages.isOpen() ? RF.commitPage('commit') : null;
      case 'partyPage':
        return pages ? pages.pageView() : null;
      case 'partyShop':
        return pages ? pages.shopView() : null;
      case 'partyBuy':
        return RF.partyBuy(args[0], args[1] ?? 0);
      case 'partyShopMark':
        return RF.partyShopMark(args[0], args[1], args[2]);
      case 'partyShopDone':
        return RF.partyShopDone(args[0]);
      case 'difficultyLegacy':
        // ('difficultyLegacy', on) — Node-only determinism proof (PLAN §16.9):
        // the v0.5.150 difficulty constants back in force. Never set by the game.
        return setDifficultyLegacy(args[0] !== false);
      case 'partyScreen':
        // ('partyScreen', seat, open) — a socket screen open / closed (the
        // network socket hold, BUILD_BRIEF §25.7).
        return RF.partyScreen(args[0], args[1]);
      case 'partySupply':
        // Node determinism proof only (PLAN §16.9): the ally supply off.
        if (args[0] !== undefined) rs.supplyOn = !!args[0] && !!pages;
        return rs.supplyOn;
      case 'partyGrant': {
        // ('partyGrant', level | 'max') — now, between rooms (probes).
        if (!party) return null;
        if (args[0] === 'max') {
          RF.stressHealer();
          return party.stress();
        }
        const gr = grantFor(Number(args[0]));
        return gr && gr.allies ? party.applyGrant(gr.allies, 'grant') : null;
      }
      case 'partyHarnessGrant':
        // ('partyHarnessGrant', N | 'max' | null) — applied at the next run start.
        rs.harnessGrant = args[0] === undefined ? null : args[0];
        return rs.harnessGrant;
      case 'draftDecline':
        return RF.declineReward();
      // ------------------------------------------------------ RELICS --
      case 'relicChoose':
        return RF.chooseRelic(args[0]);
      case 'relicFocus':
        return RF.focusRelic(args[0] ?? 0);
      case 'relics':
        // ('relics'[, on]) — turn relics on / off for the live run (probes;
        // a single-level startRun() has them off).
        if (args[0] !== undefined) {
          if (args[0] && !relics.enabled()) relics.reset(rs.frame ? rs.frame.seed : rng.seed, true);
          else if (!args[0]) relics.reset(0, false);
        }
        return relics.enabled() ? relics.view() : null;
      case 'relicsDefault':
        // ('relicsDefault', on) — whether the NEXT campaign rolls relics.
        if (args[0] !== undefined) rs.relicsDefault = !!args[0];
        return rs.relicsDefault;
      case 'relicGrant':
        return relics.grant(args[0]);
      case 'relicDemo':
        // VFX lab: ('relicDemo', relicId) — a batch-4 room relic's beat here.
        return relics.demo(args[0]);
      case 'relicBuy':
        // ('relicBuy', index[, seat]) — buy off the shop's relic shelf.
        return RF.buyRelic(args[1] ?? 0, args[0] ?? 0);
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
        if (!relics.enabled() || !rs.active) return null;
        relics.onRoomEnter(rs.roomIndex, args[0]);
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
        if (!relics.enabled() || rs.phase !== 'combat') return null;
        relics.takeCurse(args[0], rs.roomIndex);
        relics.onRoomEnter(rs.roomIndex, rs.frame ? rs.frame.modes[rs.roomIndex - 1] : 'kill_all');
        return relics.view().curse;
      // ----------------------------------------------- ROOM OBJECTIVES --
      case 'objectiveRoom': {
        // ('objectiveRoom', 'hunt'|'purge'|'escort'|'hold'|'kill_all', room) — a later combat
        // room of this level becomes that room (probes, screenshots).
        const m = args[0];
        const n = Number(args[1]);
        if (!rs.active || !rs.frame || !(isObjectiveMode(m) || m === 'kill_all')) return null;
        if (!(Number.isInteger(n) && n > rs.roomIndex && n >= 2 && n <= 6) || rs.frame.modes[n - 1] === 'defend') return null;
        rs.frame.modes[n - 1] = m;
        return [...rs.frame.modes];
      }
      case 'objectiveDebug':
        // ESCORT AND HOLD: ('objectiveDebug', 'road', 0.9) puts the pilgrim
        // 90% along its road; ('objectiveDebug', 'clock', 600) leaves the
        // hold 10 s (probes, screenshots).
        return rs.active ? waves.debugObjective(args[0], args[1]) : null;
      // ------------------------------------------------- CHAMPION ROOMS --
      case 'championRoom': {
        // ('championRoom', room) — a later combat room of this level becomes
        // the champion's room (probes, screenshots, the VFX lab).
        const n = Number(args[0]);
        if (!rs.active || !rs.frame || !championsOn()) return null;
        if (!(Number.isInteger(n) && n > rs.roomIndex && n >= 2 && n <= 6)) return null;
        rs.frame.modes[n - 1] = 'champion';
        rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== n);
        return [...rs.frame.modes];
      }
      case 'crownDoor':
        // ('crownDoor'[, side]) — the next path screen carries the crown door.
        if (!rs.active || !championsOn()) return null;
        rs.forcedCrown = { room: rs.roomIndex + 1, side: args[0] === 1 ? 1 : 0 };
        return { ...rs.forcedCrown };
      case 'championPick': {
        // ('championPick'[, id]) — this level's champion (by seed); with an
        // id of the act's own, force it for the rest of the level.
        if (!rs.active || !rs.frame || !championsOn()) return null;
        if (args.length && args[0] != null) {
          const c = championById(String(args[0]));
          if (!c) return null;
          rs.forcedChampion = { index: rs.campaign.index, id: c.id };
        }
        return levelChampion();
      }
      case 'crownOf':
        // The crown this level rolled: { room, side }.
        return rs.active && rs.frame && championsOn() ? crownFor(rs.frame.seed, rs.campaign.index) : null;
      // ------------------------------------------------ KEYS AND VAULTS --
      case 'tonicGive': {
        // ('tonicGive', seat, id) — fill a hero's slot (probes, screenshots).
        if (!rs.active || !tonics.enabled()) return null;
        tonics.setSlot(Number(args[0] ?? 0), args.length > 1 ? args[1] : 'mend_tonic');
        return tonics.view();
      }
      case 'tonicDrop': {
        // ('tonicDrop', id[, x, z]) — one falls in the live room.
        if (!rs.active || !tonics.enabled()) return null;
        return tonics.drop(args[0] ?? 'mend_tonic', 'probe', Number(args[1] ?? 0), Number(args[2] ?? -2));
      }
      case 'tonicUse': {
        // ('tonicUse', seat[, x, z]) — the seat presses its slot now.
        if (!rs.active || !tonics.enabled()) return null;
        return tonics.use(Number(args[0] ?? 0), args[1] !== undefined ? { x: Number(args[1]), z: Number(args[2] ?? 0) } : null, rs.phase === 'combat');
      }
      // ------------------------------------------------- SHRINES --
      case 'shrineState':
        return rs.shrine ? RF.shrineView() : null;
      case 'shrineHere': {
        // ('shrineHere'[, biome[, x, z]]) — a shrine stands in the live
        // combat room now (probes, screenshots, the lab).
        if (!rs.active || !rs.shrine || rs.phase !== 'combat') return null;
        const id = SHRINES[args[0]] ? args[0] : levelFor(rs.act)?.biome;
        rs.shrine.used = false;
        rs.shrine.room = rs.roomIndex;
        rs.shrine.id = id;
        for (const e of registry.all()) if (e.kind === 'shrine') registry.despawn(e.id);
        const at = args[1] !== undefined ? [Number(args[1]), Number(args[2] ?? 0)] : RF.shrineSpot(rs.roomIndex);
        return RF.spawnShrine(id, at[0], at[1], getTick());
      }
      case 'shrineRoom': {
        // ('shrineRoom', n) — this level's shrine aims at room n.
        if (!rs.active || !rs.shrine) return null;
        rs.shrine.aim = Number(args[0]);
        rs.shrine.room = null;
        return rs.shrine.aim;
      }
      case 'shrineUse':
        // ('shrineUse'[, seat]) — the seat offers at the live shrine now.
        return RF.useShrine(Number(args[0] ?? 0));
      case 'tonicState':
        return tonics.enabled() ? { ...tonics.view(), stand: rs.shop && rs.shop.stand ? { ...rs.shop.stand, bought: [...rs.shop.stand.bought] } : null } : null;
      case 'keyGive': {
        // The party holds a key (probes, screenshots).
        if (!rs.active || !vaults.enabled()) return null;
        if (!vaults.held()) vaults.loadState({ ...vaults.saveState(), key: { from: args[0] === 'elite' ? 'elite' : 'champion', room: rs.roomIndex, kind: 'probe' } });
        return vaults.view();
      }
      case 'keyDrop': {
        // ('keyDrop'[, x, z]) — a key falls in the live room.
        if (!rs.active || !vaults.enabled()) return null;
        return vaults.drop('elite', 'probe', Number(args[0] ?? 0), Number(args[1] ?? -2), rs.roomIndex);
      }
      case 'vaultDoor':
        // ('vaultDoor', side) — the next path screen's vault door prefers this side.
        if (!rs.active || !vaults.enabled()) return null;
        rs.forcedVault = args[0] === 1 ? 1 : 0;
        return rs.forcedVault;
      case 'vaultRoom': {
        // ('vaultRoom', n) — a later room of this level becomes the vault.
        const n = Number(args[0]);
        if (!rs.active || !rs.frame || !vaults.enabled()) return null;
        if (!(Number.isInteger(n) && n > rs.roomIndex && n >= 2 && n <= 6)) return null;
        rs.frame.modes[n - 1] = 'vault';
        rs.frame.defendAt = rs.frame.defendAt.filter((r) => r !== n);
        return [...rs.frame.modes];
      }
      case 'vaultOpen':
        return RF.openVault();
      // SECRET ROOMS probes.
      case 'secretWall':
        // ('secretWall', n?, holds?) — room n of this level (default: the
        // live room, placed now) hides a wall; `holds` forces its content.
        if (!rs.active || !rs.frame || !secrets.enabled()) return null;
        if (args[1] !== undefined) rs.forcedHolds = String(args[1]);
        if (args[0] === undefined || Number(args[0]) === rs.roomIndex) {
          if (rs.phase !== 'combat' || !secrets.canPlace()) return null;
          const e = RF.placeWall(rs.roomIndex, rs.frame.modes[rs.roomIndex - 1], getTick());
          return e ? secrets.view().wall : null;
        }
        rs.forcedWall = Number(args[0]);
        return rs.forcedWall;
      case 'secretOpen':
        // ('secretOpen') — the live room's wall breaks open now.
        return rs.active && secrets.shut() ? RF.openWall('probe', 0) : null;
      case 'secretTake':
        return RF.openSecret();
      case 'relicSealKnock':
        // RELICS batch 6 (probe / VFX lab): a breaking blow on a Sealed
        // Door's wall, turned by the seal.
        if (!rs.active || !secrets.shut() || !relics.wallSealed()) return null;
        RF.sealedKnock(0);
        return true;
      case 'secretState':
        return secrets.enabled() ? secrets.view() : null;
      case 'vaultState':
        return vaults.enabled() ? vaults.view() : null;
      case 'relicDoor':
        // ('relicDoor', curseId[, side]) — the next path screen's cursed door.
        return relics.forceDoor(args[0], args[1] ?? 0);
      // ----------------------------------------------- ELITE AFFIXES --
      case 'affixRule':
        // The live room's roll rule ({ count, salt } | null).
        return RF.affixRule();
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
      case 'eventMajor':
        // ('eventMajor', curseId) — probe / lab: bind a major curse now (the
        // Heart Crystal feeds on them).
        return relics.takeMajor(args[0], rs.roomIndex);
      case 'eventLand':
        // The land the door roll reads ('wood' | 'mill' | 'barrow' | 'heart').
        return encCtx().land;
      case 'eventOpen':
        return RF.openEncounter();
      case 'eventFocus':
        return RF.focusEncounter(args[0] ?? 0);
      case 'eventChoose':
        return RF.chooseEncounter(args[0]);
      case 'eventState':
        return encounters.view(encCtx());
      case 'pathFocus':
        return RF.focusPath(args[0] ?? 0);
      case 'pathChoose':
        return RF.choosePath(args[0] ?? 0);
      case 'shopBuy':
        return RF.buy(args[0] ?? 0);
      case 'shopRefresh':
        // ('shopRefresh'[, seat]) — redraw that seat's shelf for Glint.
        return RF.refreshShop(args[0] ?? 0);
      case 'shopRefreshCost':
        return rs.phase === 'shop' ? RF.refreshCost(args[0] ?? 0) : null;
      case 'shopAdvance':
        return RF.advanceFromShop();
      case 'returnToCamp':
        return RF.returnToCamp();
      case 'endRun':
        return RF.endRun(args[0] === 'defeat' ? 'defeat' : 'victory');
      case 'skipToRoom': {
        // Jump the run frame forward for scripted probes: clears the live room
        // and walks straight into room n (rewards/paths for the skipped rooms
        // are not presented; the stipends they would have paid ARE, so the
        // §14 wallet arithmetic still holds at the shop).
        // ('skipToRoom', n[, { act, challenge }]) — a live run keeps its act;
        // with no run live, the options start one in that act.
        const n = Math.max(1, Math.min(RUN.rooms, args[0] ?? 1));
        if (!rs.active) RF.startRun(args[1] && typeof args[1] === 'object' ? args[1] : {});
        // A level-transition card is between two levels: advance it first
        // (the skip then lands in the NEW level), never skip inside the old one.
        if (rs.phase === 'transit' && rs.campaign && rs.campaign.card) RF.advanceLevel('skip_room');
        rs.phase = 'skip'; // suppresses the boundary sequence on the forced clear
        waves.forceClear();
        boss.despawn();
        enemies.reset();
        RF.sweepPlayerTransients(getTick(), 'skip');
        // §14: the stipend is +12 per COMBAT-room clear. The shop room pays
        // nothing, so skipping past it must not mint 12 Glint out of thin air
        // — walking to room 7 or room 8 both land on the deterministic 72.
        const combatBefore = rs.frame.modes
          .slice(0, n - 1)
          .filter((m) => m === 'kill_all' || m === 'defend' || m === 'boss' || m === 'champion' || isObjectiveMode(m)).length;
        while (rs.clearedRooms < combatBefore) {
          rs.clearedRooms += 1;
          RF.gainGlint(RUN.stipend, 'skip_stipend');
          if (allyOn()) pages.stipend('skip_stipend'); // PARTY: every purse keeps the §14 arithmetic
        }
        rs.roomsDone = Math.max(rs.roomsDone, n - 1); // every room before n is behind us
        RF.enterRoom(n);
        return RF.view();
      }
      case 'bossHp':
        // ('bossHp', pct[, skipPhases]) — skipPhases marks the add waves at or
        // above pct as already played, so no adds spawn for them.
        return boss.setHpPct(args[0] ?? 0.5, args[1] === true);
      case 'bossPick':
        // ('bossPick', kind | null) — probes and benches: the boss room meets
        // this boss when it belongs to the level (data/levels.js bossFor).
        rs.bossPick = typeof args[0] === 'string' ? args[0] : null;
        return rs.bossPick;
      case 'killBoss': {
        const b = boss.entity();
        if (!b) return null;
        combat.kill(b);
        return true;
      }
      case 'wallet': {
        if (args[0] !== undefined) {
          rs.wallet = Math.max(0, Math.round(args[0]));
          events.emit(getTick(), 'glint_set', { wallet: rs.wallet });
        }
        return rs.wallet;
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

  return { cmd };
}
