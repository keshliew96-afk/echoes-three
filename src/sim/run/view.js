// THE RUN'S VIEW: the read-only picture of the run the HUD, the end screens
// and the probes read each frame (view()), and the campaign's (campaignView()).
// A part of the run system (sim/run.js): the run's state is `rs`, its other
// functions `RF`.
import { RUN, cloneData } from './rules.js';
import { levelFor } from '../../data/levels.js';

export function createRunView(ctx) {
  const { rs, RF, boss, combatActive, currentBoss, draft, encCtx, encounters, endlessDepth, getTick, nextOf, pages, party, relics, secrets, tonics, vaults } = ctx;

  function campaignView() {
    const c = rs.campaign;
    const tick = getTick();
    if (!c) return { active: false, mode: null, autoReturnTick: rs.autoReturnTick, autoReturnInTicks: rs.autoReturnTick !== null ? Math.max(0, rs.autoReturnTick - tick) : null };
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
      active: rs.active,
      mode: c.mode,
      harness: c.harness,
      startLevel: c.startLevel,
      level: c.level,
      name: levelFor(c.level).name,
      index: c.index,
      next: nextOf(c, c.level),
      ...(c.road ? { road: c.road } : {}),
      ...(c.endless ? { endless: true, depth: c.index, won: !!c.won } : {}),
      ...(c.rush ? { rush: { fight: c.index, fights: c.rush.fights, line: cloneData(c.rush.line) } } : {}),
      ...(c.tutorial ? { tutorial: { hold: !!c.tutorial.hold } } : {}),
      levels: cloneData(c.levels),
      levelsCleared: c.levels.filter((l) => l.cleared).length,
      clearedAt: c.clearedAt,
      card,
      grant: cloneData(c.grant),
      transitions: c.transitions,
      startTick: c.startTick,
      levelStartTick: c.levelStartTick,
      autoReturnTick: rs.autoReturnTick,
      autoReturnInTicks: rs.autoReturnTick !== null ? Math.max(0, rs.autoReturnTick - tick) : null,
    };
  }

  function view() {
    return {
      active: rs.active,
      phase: rs.phase,
      combatActive: combatActive(),
      room: rs.roomIndex,
      rooms: RUN.rooms,
      act: rs.act,
      actName: levelFor(rs.act).name,
      challenge: rs.challenge,
      // Slice 2: the boss this run meets, from room 6 on (the shop's Advance
      // label, the boss banner); absent earlier so the hashed view of the
      // certified early rooms is unchanged.
      // THIRD BOSSES: present only when a gated boss can join (hash-stable view).
      ...(rs.thirdOpen.length ? { thirdBosses: rs.thirdOpen.slice() } : {}),
      ...(rs.active && rs.roomIndex >= 6 ? { actBoss: { kind: currentBoss().kind, name: currentBoss().name } } : {}),
      // ENDLESS: present only on an endless descent (hash-stable view).
      ...(endlessDepth() ? { endless: { depth: endlessDepth(), won: !!rs.campaign.won } } : {}),
      // DAILY: present only on the day's run (hash-stable view).
      ...(rs.active && rs.campaign && rs.campaign.daily ? { daily: { key: rs.campaign.daily.key, ...(rs.campaign.daily.practice ? { practice: true } : {}) } } : {}),
      // BOSS RUSH: present only on a rush (hash-stable view).
      ...(rs.active && rs.campaign && rs.campaign.rush ? { rush: { fight: rs.campaign.index, fights: rs.campaign.rush.fights } } : {}),
      // TUTORIAL: present only in the guided first room (hash-stable view).
      ...(RF.tutorialOn() ? { tutorial: { hold: !!rs.campaign.tutorial.hold } } : {}),
      layout: rs.layout ? { ...rs.layout } : null,
      mode: rs.frame && rs.roomIndex ? rs.frame.modes[rs.roomIndex - 1] : null,
      wallet: rs.wallet,
      // Small fixes: every seat's Glint ([Healer wallet, seat 1-3 purses]) so
      // the HUD counter reads the viewer's own; present only when a seat
      // other than the Healer is played (class select, co-op), so a solo
      // Healer run hashes as before.
      ...(RF.seatPursesOn() ? { purses: [rs.wallet, party.purse(1), party.purse(2), party.purse(3)] } : {}),
      clearedRooms: rs.clearedRooms,
      roomsDone: rs.roomsDone,
      freeSkillSlots: draft.freeSkillSlots(),
      frame: rs.frame
        ? { seed: rs.frame.seed, modes: [...rs.frame.modes], defendAt: [...rs.frame.defendAt], sides: [...rs.frame.sides] }
        : null,
      rewardFor: { ...rs.rewardFor },
      // fix-M4a-r4: `upgrades` (the drops that upgrade a full build) is
      // present only when non-empty — the view is part of snapshotState(), so
      // a fill-only run hashes exactly as it did before the fix.
      spoils: rs.spoils
        ? rs.spoils.upgrades && rs.spoils.upgrades.length
          ? { room: rs.spoils.room, nodes: [...rs.spoils.nodes], upgrades: [...rs.spoils.upgrades] }
          : { room: rs.spoils.room, nodes: [...rs.spoils.nodes] }
        : null,
      spoilsTotal: rs.spoilsTotal,
      reward: rs.reward
        ? {
            type: rs.reward.type,
            id: rs.reward.id,
            promised: rs.reward.promised,
            substituted: rs.reward.substituted,
            line: rs.reward.line,
            freeSkillSlots: rs.reward.freeSkillSlots,
            // fix-M4a-r4: `pool: 'upgrade'` when drawn from the upgrade
            // layer, `upgrade` = the swap target read LIVE (the player may
            // re-socket while the page is up; absent once the node would fill
            // a vacant socket), `reason` = why an empty offer is empty. Each
            // key is present only when set (hash-stable view, see spoils).
            ...(rs.reward.pool ? { pool: rs.reward.pool } : {}),
            ...RF.upgradeKey(rs.reward.type === 'node' ? rs.reward.id : null),
            ...(rs.reward.reason ? { reason: rs.reward.reason } : {}),
            // Ruling A17: a swap offer's pending Replaces slot + the AI's
            // suggestion (present only on a swap — hash-stable view).
            ...(rs.reward.swap ? { swap: true, replace: rs.reward.replace, suggest: rs.reward.suggest } : {}),
          }
        : null,
      path: rs.path
        ? {
            nextRoom: rs.path.nextRoom,
            focus: rs.path.focus,
            freeSkillSlots: rs.path.freeSkillSlots,
            options: rs.path.options.map((o) => ({ ...o })),
            // PARTY socket hold (present only while held — hash-stable).
            ...(rs.path.hold ? { hold: { side: rs.path.hold.side, untilTick: rs.path.hold.untilTick, inTicks: Math.max(0, rs.path.hold.untilTick - getTick()) } } : {}),
          }
        : null,
      shop: rs.shop
        ? {
            wallet: rs.wallet,
            stock: rs.shop.stock.map((s) => ({
              node: s.node,
              rarity: s.rarity,
              price: s.price,
              sold: s.sold,
              owned: draft.ownedCount(s.node),
              // fix-M4a-r4: the swap target when this card UPGRADES a full
              // build — present only then (hash-stable view).
              ...RF.upgradeKey(s.sold ? null : s.node),
              affordable: rs.wallet >= s.price,
              // An AI-held Healer's Suggested pick (key present only then).
              ...(rs.shop.marked ? { marked: !!rs.shop.marked[rs.shop.stock.indexOf(s)] } : {}),
            })),
            // The AI-held Healer's shelf: the player bought on it (Manual).
            ...(rs.shop.marked ? { touched: !!rs.shop.touched } : {}),
            // SHOP REFRESH: how often the Healer's shelf was redrawn this
            // visit (present only after one — hash-stable).
            ...(rs.shop.refreshes ? { refreshes: rs.shop.refreshes } : {}),
            // TONICS AND BOMBS: the tonic stand (present only with tonics on).
            ...(rs.shop.stand ? { stand: { item: rs.shop.stand.item, price: rs.shop.stand.price, bought: [...rs.shop.stand.bought] } } : {}),
          }
        : null,
      boss: rs.active && rs.roomIndex === RUN.bossRoom ? boss.view() : null,
      // PARTY: the party page / shelves (keys present only while open, so a
      // v0.5.150 view hashes exactly as before when none is up).
      ...(pages && pages.isOpen() ? { party: pages.pageView() } : {}),
      ...(pages && pages.shopOpen() ? { partyShop: pages.shopView() } : {}),
      // PARTY: which socket screens are open (network only; present only then).
      ...(pages && pages.screensAny() ? { socketScreens: pages.screens() } : {}),
      // RELICS: present only while a run with relics is live (hash-stable).
      ...(rs.active && relics.enabled() ? { relics: relics.view() } : {}),
      // EVENT ROOMS: present only while an encounter is live (hash-stable).
      ...(rs.active && encounters.view(encCtx()) ? { encounter: encounters.view(encCtx()) } : {}),
      // KEYS AND VAULTS: present only in a run with keys (hash-stable).
      ...(rs.active && vaults.enabled() ? { vaults: vaults.view() } : {}),
      // TONICS AND BOMBS: present only in a run with tonics (hash-stable).
      ...(rs.active && tonics.enabled() ? { tonics: tonics.view() } : {}),
      // SECRET ROOMS: present only in a run with secrets (hash-stable).
      ...(rs.active && secrets.enabled() ? { secrets: secrets.view() } : {}),
      // SHRINES: present only in a run with shrines.
      ...(rs.active && rs.shrine ? { shrine: RF.shrineView() } : {}),
      // UNLOCKS: the run's boons (present only when the player picked some).
      ...(rs.active && rs.campaign && rs.campaign.boons ? { boons: cloneData(rs.campaign.boons) } : {}),
      summary: rs.summary,
      fadeTicksLeft: rs.phase === 'fade' ? Math.max(0, rs.fadeUntilTick - getTick()) : 0,
    };
  }

  return { campaignView, view };
}
