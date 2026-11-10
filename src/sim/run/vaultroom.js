// THE VAULT ROOM (docs/VAULTS.md): entering a vault, its chest, the
// Glint piles and the platter, its step each tick and opening the chest. A
// part of the run system (sim/run.js): the run's state is `rs`, its other
// functions `RF`.
import { staticClearance } from '../movement.js';
import { VAULT_CHEST, VAULT_RULES, VAULT_SPOTS } from '../vaults.js';
import { r2 } from './rules.js';
import { chestTonic } from '../consumables.js';
import { TICK_HZ } from '../../core/constants.js';

export function createVaultRoom(ctx) {
  const { rs, RF, allyOn, combat, events, getTick, party, registry, relics, tonics, vaults } = ctx;

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
    rs.phase = 'vault';
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
      reward: rs.rewardFor[n] ?? null,
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
    // RELICS batch 4: Vault Ledger doubles each pile.
    const lm = relics.vaultPileMul();
    const g = Math.round(R.pileGlint * lm);
    RF.gainGlint(g, 'vault_pile');
    if (allyOn()) for (const seat of [1, 2, 3]) party.gainPurse(seat, Math.round(R.pilePurse * lm), 'vault_pile');
    const v = vaults.live();
    if (v) v.glint += g;
    events.emit(getTick(), 'vault_pile', { id: e.id, pile: e.pile, by, glint: g, x: r2(e.x), z: r2(e.z) });
    if (lm !== 1) events.emit(getTick(), 'relic_proc', { relic: 'vault_ledger', pile: e.pile, glint: g, x: r2(e.x), z: r2(e.z) });
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
        RF.presentReward(null);
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
    if (rs.phase !== 'vault') return null;
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
    rs.roomsDone = Math.max(rs.roomsDone, rs.roomIndex);
    // TONICS AND BOMBS: the chest pays one into the first empty slot.
    if (tonics.enabled() && rs.frame && rs.campaign) tonics.grant(chestTonic(rs.frame.seed, rs.campaign.index, rs.roomIndex, 'vault'), 'vault', null, chest ? chest.x : undefined, chest ? chest.z : undefined);
    const owed = relics.owe(rs.roomIndex, VAULT_RULES.chestSource);
    events.emit(tick, 'vault_open', {
      room: rs.roomIndex,
      glint: v.glint,
      healed: v.healed,
      relic: !!owed,
      ...(chest ? { x: r2(chest.x), z: r2(chest.z) } : {}),
    });
    // The lid comes up and the hoard's light rises for a moment; then the
    // door's own draft, the relic pick and the doors (stepVault).
    v.payAt = tick + Math.round(VAULT_RULES.revealSec * TICK_HZ);
    return { opened: true, room: rs.roomIndex, glint: v.glint, healed: v.healed, relic: !!owed };
  }

  return { clearSpot, enterVault, vaultChestSpec, takePile, takePlatter, stepVault, openVault };
}
