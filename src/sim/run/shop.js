// THE SHOP (room 7; BUILD_BRIEF §14, §16; docs/SHOP_REFRESH.md): the shelves, the relic shelf and
// the tonic stand, buying from the run wallet or a seat's purse, the AI
// seats' relic plan, refreshing, and leaving for the boss. A part of the run
// system (sim/run.js): the run's state is `rs`, its other functions `RF`.
import { CONSUMABLES, standKind } from '../consumables.js';
import { suggestShelf } from '../partyai.js';
import { refreshPrice } from '../draft.js';
import { RUN } from './rules.js';

export function createRunShop(ctx) {
  const { rs, RF, allyOn, buildSys, controllers, draft, events, getTick, pages, party, relics, tonics } = ctx;

  // ------------------------------------------------------------------ shop --
  function openShop() {
    // RELICS (Peddler's Seal): the Healer's shelf prices (identity when off).
    const stock = draft.shopStock().map((s) => ({ ...s, price: relics.shopPrice(s.price), sold: false }));
    rs.shop = { stock, visited: true };
    // TONICS AND BOMBS: the Peddler's tonic stand sells one kind a visit (a
    // hash of the level and the room); each hero may buy one into an empty
    // slot, from its own purse.
    if (tonics.enabled() && rs.frame && rs.campaign) {
      const item = standKind(rs.frame.seed, rs.campaign.index, rs.roomIndex);
      rs.shop.stand = { item, price: relics.shopPrice(CONSUMABLES[item].price), bought: [false, false, false, false] };
    }
    events.emit(getTick(), 'shop_open', {
      room: rs.roomIndex,
      wallet: rs.wallet,
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
    if (allyOn()) pages.openShop(rs.roomIndex, reserve);
    // v0.5.237 (Kesh: "shouldn't be able to control the Healer's shop ... it
    // should be done by AI"): a Healer the player does not control (class
    // select, or an AI seat in co-op) shops like the other AI seats — its
    // picks marked under Suggested (bought on Advance), bought now under Auto.
    if (healerAiShops()) {
      const picks = suggestShelf(rs.shop.stock, rs.wallet - reserve[0]);
      if (party.mode() === 'suggest') {
        rs.shop.marked = rs.shop.stock.map((_, k) => picks.includes(k));
        rs.shop.touched = false;
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
      const purse = seat === 0 ? rs.wallet : party.purse(seat);
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
    if (Object.keys(plan).length) rs.shop.relicPlan = plan;
    return reserve;
  }

  // Suggested: the held relics, bought as the party leaves (a seat a human
  // took over since, or a relic gone or now too dear, is skipped).
  function buyPlannedRelics() {
    if (!rs.shop || !rs.shop.relicPlan) return;
    const c = controllers();
    for (const [seat, k] of Object.entries(rs.shop.relicPlan)) if (c[seat] !== 'human') buyRelic(Number(seat), k);
    delete rs.shop.relicPlan;
  }

  // RELICS: buy relic `index` off the relic shelf from `seat`'s purse (the
  // Healer's is the run wallet). The relic is the whole party's.
  function buyRelic(seat, index) {
    if (rs.phase !== 'shop' || !rs.shop) return null;
    const s = Number(seat) | 0;
    const i = Number(index) | 0;
    const item = relics.shelfItem(i);
    if (!item) return null;
    if (s !== 0 && !(allyOn() && party && party.purse(s) !== null)) return null;
    const purse = s === 0 ? rs.wallet : party.purse(s);
    const tick = getTick();
    if (purse < item.price) {
      events.emit(tick, 'relic_denied', { seat: s, relic: item.id, price: item.price, wallet: purse, index: i });
      return { denied: 'insufficient_funds', price: item.price, purse };
    }
    if (s === 0) rs.wallet -= item.price;
    else party.spend(s, item.price);
    const left = s === 0 ? rs.wallet : party.purse(s);
    const id = relics.sellShelf(i, s, left);
    return { relic: id, price: item.price, purse: left, seat: s };
  }

  // PARTY: a purchase for an ally, from ITS purse (`partyBuy`); seat 0 is
  // the Healer's buy() above.
  function partyBuy(seat, index) {
    if (rs.phase !== 'shop') return null;
    if (Number(seat) === 0) return buy(index);
    if (!pages || !pages.shopOpen()) return null;
    return pages.buy(Number(seat), index, { by: 'human' });
  }

  function partyShopMark(seat, index, on) {
    if (rs.phase !== 'shop' || !pages || !pages.shopOpen()) return null;
    if (Number(seat) === 0) {
      // The AI-held Healer's Suggested marks live on the run's own shelf.
      if (!rs.shop || !rs.shop.marked || !rs.shop.stock[index]) return null;
      const v = on === undefined ? !rs.shop.marked[index] : !!on;
      rs.shop.marked[index] = v;
      events.emit(getTick(), 'party_shop_mark', { seat: 0, index, on: v });
      return v;
    }
    return pages.mark(Number(seat), index, on);
  }

  function partyShopDone(seat) {
    if (rs.phase !== 'shop' || !pages || !pages.shopOpen()) return null;
    pages.done(Number(seat));
    // The host's Advance countdown is running and this was the last human
    // it waited on: leave at once.
    const v = pages.shopView();
    if (v && v.leaveTick !== null && pages.humansNotDone(v.leaveBy ?? hostSeat()).length === 0) advanceFromShop({ force: true });
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
    if (rs.phase !== 'shop' || !rs.shop) return null;
    const card = rs.shop.stock[index];
    if (!card || card.sold) return null;
    const tick = getTick();
    if (rs.wallet < card.price) {
      events.emit(tick, 'currency_denied', {
        node: card.node,
        price: card.price,
        wallet: rs.wallet,
        index,
      });
      return { denied: 'insufficient_funds', price: card.price, wallet: rs.wallet };
    }
    rs.wallet -= card.price;
    buildSys.grantNode(card.node, 'purchased'); // card departs to the bench
    card.sold = true;
    // The player bought for an AI-held Healer (Manual): its marks are void.
    if (by === 'human' && rs.shop.marked) {
      rs.shop.touched = true;
      rs.shop.marked = rs.shop.marked.map(() => false);
    }
    const owned = draft.ownedCount(card.node);
    events.emit(tick, 'shop_purchase', {
      node: card.node,
      price: card.price,
      wallet: rs.wallet,
      owned,
      index,
    });
    return { node: card.node, price: card.price, wallet: rs.wallet, owned };
  }

  // TONICS AND BOMBS: `seat` buys the stand's tonic into its empty slot,
  // from its own purse (the Healer's is the run wallet).
  function buyTonic(seat, { by = 'human' } = {}) {
    if (rs.phase !== 'shop' || !rs.shop || !rs.shop.stand || !tonics.enabled()) return null;
    const s = Number(seat) | 0;
    if (!(s >= 0 && s <= 3)) return null;
    if (s !== 0 && !(allyOn() && party && party.purse(s) !== null)) return null;
    const st = rs.shop.stand;
    const tick = getTick();
    const purse = s === 0 ? rs.wallet : party.purse(s);
    const deny = (reason) => {
      events.emit(tick, 'tonic_denied', { seat: s, reason, item: st.item, price: st.price, wallet: purse });
      return { denied: reason, price: st.price, purse };
    };
    if (st.bought[s]) return deny('bought');
    if (tonics.slot(s) !== null) return deny('full');
    if (purse < st.price) return deny('insufficient_funds');
    if (s === 0) rs.wallet -= st.price;
    else party.spend(s, st.price);
    st.bought[s] = true;
    const left = s === 0 ? rs.wallet : party.purse(s);
    tonics.grant(st.item, 'shop', s);
    events.emit(tick, 'tonic_buy', { seat: s, item: st.item, price: st.price, purse: left, by });
    return { item: st.item, price: st.price, purse: left, seat: s };
  }

  // SHOP REFRESH (v0.5.248): the price `seat`'s next refresh costs this
  // visit (the Peddler's Seal discount applies, like the cards).
  function refreshCost(seat) {
    const s = Number(seat) | 0;
    const n = s === 0 ? (rs.shop && rs.shop.refreshes) || 0 : pages ? pages.refreshes(s) : 0;
    return relics.shopPrice(refreshPrice(n));
  }

  // A press on the shelf's Refresh: `seat` pays from its own purse (the
  // Healer's is the run wallet) and its whole node shelf is redrawn from its
  // class pool under the same stratified draw as the open (the Healer's from
  // the run's seeded stream, an ally's from the party stream). The relic
  // shelf is the whole party's and stays. AI seats never refresh, so a run
  // with no press draws exactly as before.
  function refreshShop(seat = 0) {
    if (rs.phase !== 'shop' || !rs.shop) return null;
    const s = Number(seat) | 0;
    const price = refreshCost(s);
    if (s !== 0) {
      if (!allyOn() || !pages || !pages.shopOpen() || party.purse(s) === null) return null;
      return pages.refresh(s, price);
    }
    const tick = getTick();
    const n = rs.shop.refreshes || 0;
    if (rs.wallet < price) {
      events.emit(tick, 'refresh_denied', { seat: 0, price, wallet: rs.wallet });
      return { denied: 'insufficient_funds', price, wallet: rs.wallet };
    }
    rs.wallet -= price;
    rs.shop.stock = draft.shopStock().map((c) => ({ ...c, price: relics.shopPrice(c.price), sold: false }));
    rs.shop.refreshes = n + 1;
    // The player chose for an AI-held Healer's shelf (Manual): marks void.
    if (rs.shop.marked) {
      rs.shop.touched = true;
      rs.shop.marked = rs.shop.stock.map(() => false);
    }
    events.emit(tick, 'shop_refresh', { seat: 0, price, wallet: rs.wallet, n: n + 1, stock: rs.shop.stock.map((c) => ({ node: c.node, rarity: c.rarity, price: c.price })) });
    return { seat: 0, price, wallet: rs.wallet, refreshes: n + 1 };
  }

  function advanceFromShop({ force = false, by = null } = {}) {
    if (rs.phase !== 'shop') return null;
    // PARTY (BUILD_BRIEF §25.7): with >= 2 humans the Advance leaves at once
    // only when every OTHER human pressed Done; else a 15 s countdown (shown
    // to all) — the countdown or the shop's own 90 s deadline then force it.
    if (!force && pages && pages.shopOpen() && pages.humans() >= 2) {
      const waiting = pages.humansNotDone(by ?? hostSeat());
      if (waiting.length > 0) {
        const v = pages.shopView();
        const leaveTick = v && v.leaveTick !== null ? v.leaveTick : pages.startAdvanceCountdown(getTick(), by ?? hostSeat());
        return { countdown: true, leaveTick, waiting };
      }
    }
    // PARTY: every AI-held shelf's still-marked buys (Suggested), benches
    // auto-filled, then the shelves close. Held relics go first: the marks
    // were picked from what they leave.
    buyPlannedRelics();
    if (rs.shop && rs.shop.marked && !rs.shop.touched && healerAiShops() && party.mode() === 'suggest') {
      rs.shop.marked.forEach((m, k) => {
        if (m && !rs.shop.stock[k].sold && rs.wallet >= rs.shop.stock[k].price) buy(k, { by: 'ai' });
      });
      rs.shop.marked = rs.shop.marked.map(() => false);
    }
    if (healerAiShops() && party.mode() !== 'manual') buildSys.autoFill();
    if (pages && pages.shopOpen()) pages.closeShop();
    // TONICS AND BOMBS: an AI-held hero with an empty slot buys at the stand
    // with what its purse has left (none under Ally builds Manual).
    if (rs.shop && rs.shop.stand && (!party || party.mode() !== 'manual')) {
      const c = controllers();
      for (const s of [0, 1, 2, 3]) {
        if (s === 0 ? !healerAiShops() : c[s] === 'human' || !allyOn()) continue;
        if (tonics.slot(s) === null && !rs.shop.stand.bought[s] && (s === 0 ? rs.wallet : party.purse(s) ?? 0) >= rs.shop.stand.price) buyTonic(s, { by: 'ai' });
      }
    }
    // The shop room is a room the player leaves behind, so it counts toward
    // the §18 summary row (it pays no stipend — `clearedRooms` is untouched).
    rs.roomsDone = Math.max(rs.roomsDone, RUN.shopRoom);
    events.emit(getTick(), 'shop_close', {
      wallet: rs.wallet,
      sold: rs.shop.stock.filter((s) => s.sold).length,
      roomsDone: rs.roomsDone,
    });
    RF.beginFade(RUN.bossRoom); // one-way (§16)
    return { nextRoom: RUN.bossRoom };
  }

  return { openShop, planAiRelics, buyPlannedRelics, buyRelic, partyBuy, partyShopMark, partyShopDone, hostSeat, partyScreen, healerAiShops, seatPursesOn, buy, buyTonic, refreshCost, refreshShop, advanceFromShop };
}
