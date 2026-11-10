// THE SHRINES (docs/SHRINES.md): where a room's shrine stands, raising it, a
// seat paying Glint to use it, its sleep at the room clear, and its view. A
// part of the run system (sim/run.js): the run's state is `rs`, its other
// functions `RF`.
import { SHRINES, SHRINE_RULES, bless, shrineCurseFor, shrineOfBiome, shrineRoomFor, shrineSpec, shrineSpotStart } from '../shrines.js';
import { LAYOUTS } from '../../data/layouts.js';
import { SPAWN_POINTS } from '../waves.js';
import { staticClearance } from '../movement.js';
import { ARENA } from '../../core/constants.js';
import { r2 } from './rules.js';
import { CURSE_IDS } from '../relics.js';

export function createRunShrines(ctx) {
  const { rs, RF, championsOn, events, getTick, party, player, registry, relics, tonics, vaults } = ctx;

  const shrinesOn = () => !!rs.shrine && championsOn() && !(rs.campaign && rs.campaign.rush);

  function shrineReset() {
    rs.shrine = championsOn() && !(rs.campaign && rs.campaign.rush) ? { aim: shrineRoomFor(rs.frame.seed, rs.campaign.index), room: null, id: null, used: false, usedBy: null, pick: null, curse: null, offered: 0 } : null;
    for (const e of registry.all()) if (e.partyIndex !== undefined && e.blessing) delete e.blessing;
  }

  function shrineLevelReset() {
    if (!rs.shrine) return;
    // The Grave Shrine's curse waits for the next fight, even past a level's end.
    rs.shrine = { ...rs.shrine, aim: shrineRoomFor(rs.frame.seed, rs.campaign.index), room: null, id: null, used: false, usedBy: null, pick: null };
  }

  // A free spot: clear of the clearing's props, the hazards and assets, the
  // spawn ring and the party's entry.
  function shrineSpot(n) {
    const S = SHRINE_RULES.spots;
    const start = shrineSpotStart(rs.frame.seed, rs.campaign.index, n);
    const ring = LAYOUTS[rs.layout?.layoutId]?.spawns ?? SPAWN_POINTS;
    const content = registry.all().filter((e) => e.kind === 'hazard' || e.interactable || e.kind === 'barricade' || e.kind === 'keg');
    const pts = [];
    for (const e of content) {
      if (e.vents) for (const v of e.vents) pts.push([v.x, v.z, 0.7]);
      else if (e.lane) {
        const L = e.lane;
        for (let k = 0; k <= 8; k++) pts.push([L.x0 + ((L.x1 - L.x0) * k) / 8, L.z0 + ((L.z1 - L.z0) * k) / 8, L.w / 2]);
      } else if (e.htype === 'rockfall' || e.htype === 'spur') continue;
      else pts.push([e.x, e.z, e.radius ?? 0.5]);
    }
    for (let k = 0; k < S.length; k++) {
      const [x, z] = S[(start + k) % S.length];
      if (staticClearance(x, z, SHRINE_RULES.radius + 0.3) < 0.15) continue;
      if (Math.hypot(x, z) < 3 || Math.abs(x) > ARENA.halfW - 1.2 || Math.abs(z) > ARENA.halfD - 1.0) continue;
      if (ring.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 1.5)) continue;
      if (pts.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + SHRINE_RULES.radius + 0.9)) continue;
      return [x, z];
    }
    return null;
  }

  function spawnShrine(id, x, z, tick) {
    const e = registry.spawn(shrineSpec(id, x, z));
    events.emit(tick, 'interactable_spawn', { id: e.id, itype: 'shrine', x: r2(x), z: r2(z) });
    events.emit(tick, 'shrine_spawn', { id: e.id, shrine: id, room: rs.roomIndex, x: r2(x), z: r2(z) });
    return e.id;
  }

  function placeShrine(n, mode, biome, tick) {
    if (rs.shrine.room !== null || n < rs.shrine.aim) return;
    const id = shrineOfBiome(biome) ? biome : null;
    if (!id) return;
    const at = shrineSpot(n);
    if (!at) return; // a crowded room: the next combat room tries
    rs.shrine.room = n;
    rs.shrine.id = id;
    spawnShrine(id, at[0], at[1], tick);
    void mode;
  }

  // Pay the Tithe Shrine from the offering seat's own Glint.
  function seatGlint(seat) {
    return seat !== 0 && RF.seatPursesOn() ? party.purse(seat) : rs.wallet;
  }

  function payGlint(seat, n) {
    if (seat !== 0 && RF.seatPursesOn()) party.gainPurse(seat, -n, 'shrine_tithe');
    else RF.spend(n, 'shrine_tithe');
  }

  // E at the shrine (any human seat), or cmd('shrineUse'). The price, then
  // the blessing; a price the party cannot pay gives the use back.
  function useShrine(seat = 0) {
    const body = registry.all().find((e) => e.kind === 'shrine');
    if (!rs.active || !rs.shrine || !body || rs.phase !== 'combat') return null;
    const tick = getTick();
    const S = SHRINES[body.shrine];
    const by = registry.all().find((e) => e.partyIndex === seat) ?? player;
    let why = null;
    if (rs.shrine.used) why = 'used';
    else if (S.cost === 'glint' && seatGlint(seat) < SHRINE_RULES.glintCost) why = 'glint';
    else if (S.cost === 'key' && !vaults.held()) why = 'key';
    else if (S.cost === 'tonic' && !(tonics.enabled() && tonics.slot(seat))) why = 'tonic';
    else if (S.cost === 'curse' && !relics.enabled()) why = 'curse';
    else if (S.cost === 'relic' && !relics.newestOf('common')) why = 'relic';
    if (why) {
      if (why !== 'used') {
        body.uses = 1;
        body.usedTick = -1;
        body.usedBy = null;
      }
      events.emit(tick, 'shrine_denied', { id: body.id, shrine: S.id, seat, reason: why, x: r2(body.x), z: r2(body.z) });
      return { denied: why };
    }
    body.uses = 0;
    body.usedTick = tick;
    body.usedBy = by.id;
    const bodies = registry.all().filter((e) => e.partyIndex !== undefined);
    const result = { shrine: S.id, seat };
    if (S.cost === 'hp') {
      let paid = 0;
      for (const e of bodies) {
        if (!(e.hp > 0)) continue;
        const loss = Math.max(0, Math.min(e.hp - 1, e.maxHp * SHRINE_RULES.hpCost));
        e.hp = r2(e.hp - loss);
        paid += loss;
      }
      result.hp = r2(paid);
    } else if (S.cost === 'glint') {
      payGlint(seat, SHRINE_RULES.glintCost);
      result.glint = SHRINE_RULES.glintCost;
    } else if (S.cost === 'curse') {
      rs.shrine.curse = shrineCurseFor(rs.frame.seed, rs.campaign.index, rs.roomIndex, CURSE_IDS);
      result.curse = rs.shrine.curse;
    } else if (S.cost === 'key') {
      vaults.surrender('shrine');
      rs.shrine.pick = rs.roomIndex;
      result.pick = true;
    } else if (S.cost === 'tonic') {
      result.tonic = tonics.slot(seat);
      tonics.setSlot(seat, null);
    } else if (S.cost === 'relic') {
      // THE EMBER KILN's Forge Shrine (content plan 5 slice 9).
      result.relic = relics.loseNewestOf('forge', 'common');
    }
    // RELICS batch 5: Votive Ribbon makes the blessing last longer.
    const B = S.gift !== 'relic' ? bless(bodies, S.gift, tick, Math.round(SHRINE_RULES.blessTicks * relics.blessMul())) : null;
    if (B) result.blessing = B.id;
    rs.shrine.used = true;
    rs.shrine.usedBy = seat;
    rs.shrine.offered += 1;
    events.emit(tick, 'shrine_offer', { id: body.id, by: by.id, x: r2(body.x), z: r2(body.z), ...result, ...(B ? { untilTick: B.untilTick } : {}) });
    return result;
  }

  function shrineView() {
    const tick = getTick();
    const b = player.blessing && player.blessing.untilTick > tick ? player.blessing : null;
    const live = registry.all().find((e) => e.kind === 'shrine');
    return {
      aim: rs.shrine.aim,
      room: rs.shrine.room,
      id: rs.shrine.id,
      used: rs.shrine.used,
      offered: rs.shrine.offered,
      ...(rs.shrine.curse ? { curse: rs.shrine.curse } : {}),
      ...(rs.shrine.pick !== null ? { pick: rs.shrine.pick } : {}),
      ...(live ? { body: { id: live.id, x: live.x, z: live.z, shrine: live.shrine } } : {}),
      ...(b ? { blessing: { id: b.id, ticksLeft: b.untilTick - tick } } : {}),
    };
  }

  return { shrinesOn, shrineReset, shrineLevelReset, shrineSpot, spawnShrine, placeShrine, seatGlint, payGlint, useShrine, shrineView };
}
