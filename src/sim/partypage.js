// The party page and the party shelves (PLAN §16.3, BUILD_BRIEF §25.5-§25.7).
// Owner: PARTY. Used by the run system (sim/run.js), which keeps rolling the
// Healer's reward / shelf exactly as before (gameplay stream, same order,
// same payloads) and asks this module for the three ally cards / shelves
// (the PARTY stream, seat order 1 → 3).
//
// Card = { seat, type: 'skill'|'node'|null, id, swap, substituted, line,
//          pool?, upgrade?, reason?, spoils: [ids], replace: 0-3|null,
//          suggest: { choice, replace }, decided, choice: 'take'|'leave'|null,
//          by: 'human'|'ai'|'timeout'|null }
// Card 0 mirrors the Healer's run.reward (its decision is recorded here and
// applied by run.js exactly as today).
//
// MODE (gameplay.allyBuilds — AI-held seats only): 'suggest' (default) —
// AI-held cards open pre-decided with the §25.8 pick, benches auto-filled at
// commit, shelves pre-marked; 'manual' — nothing pre-decided, nothing
// auto-filled, nothing marked; 'auto' — decided and summarised, shelves buy
// at open.
//
// DEADLINES (network only, humans ≥ 2): armed LIVE by syncDeadlines() — the
// review fix of 2026-09-27: on the tick the human count reaches 2 while a
// decision is open; a fresh 30 s for a card that turns human-owned while
// undecided; cleared when humans fall to ≤ 1. At a deadline EVERY undecided
// card takes the §25.8 suggestion (`party_autopick { seat, reason }`).
//
// Sim discipline: no DOM, no wall clock; every draw on the party stream.
import { NODES } from './nodes.js';
import { SKILLS } from './skills.js';
import { PARTY_SEATS } from './party.js';
import { suggestCard, suggestShelf } from './partyai.js';
import { ALLY_SUPPLY, PARTY_DEADLINES, swapSuggestion } from '../data/classes.js';

const clone = (v) => (v === null || v === undefined ? v : structuredClone(v));

// ctx: { party, events, getTick, controllers() -> ['human'|'ai' ×4],
//        healerSlots(), humansInSession() -> n }
export function createPartyPages(ctx) {
  const { party, events, getTick } = ctx;
  let page = null; // the open party page
  let shop = null; // the open party shelves
  let doorDeadlineTick = null;
  const aiHeld = (seat) => {
    const c = ctx.controllers ? ctx.controllers() : null;
    return !c || c[seat] !== 'human';
  };
  const humans = () => (ctx.humansInSession ? ctx.humansInSession() : 1);
  const ownerOf = (seat) => (aiHeld(seat) ? 'ai' : 'human');
  // Socket screens open per seat (BUILD_BRIEF §25.7 socket hold; network
  // only — the UI reports it only in a session): a committed door waits
  // <= PARTY_DEADLINES.socketHoldTicks while a human's screen is open.
  const screens = [false, false, false, false];
  function setScreen(seat, open) {
    const s = Number(seat);
    if (!(Number.isInteger(s) && s >= 0 && s <= 3)) return null;
    screens[s] = !!open;
    return screens[s];
  }
  const humanScreenOpen = () => screens.some((o, s) => o && !aiHeld(s));
  // The human seats (the host's own included) whose shop Done is missing.
  const humansNotDone = (except = null) => [0, 1, 2, 3].filter((s) => s !== except && !aiHeld(s) && !(shop && shop.done[s]));

  // ------------------------------------------------------------ spoils --
  // Each ally's clear spoils (ALLY_SUPPLY.spoilsPerClear, party stream, seat
  // order) — straight onto its own bench; returns { [seat]: ids }.
  function dropSpoils(room) {
    const out = {};
    for (const i of PARTY_SEATS) {
      const d = party.draft(i);
      const ids = d.spoils(ALLY_SUPPLY.spoilsPerClear);
      const b = party.build(i);
      for (const id of ids) b.grantNode(id, 'spoils');
      out[i] = ids;
      events.emit(getTick(), 'spoils_drop', { room, nodes: [...ids], seat: i });
    }
    return out;
  }

  // Each ally's clear stipend (+12, its own purse).
  function stipend(reason) {
    for (const i of PARTY_SEATS) party.gainPurse(i, ALLY_SUPPLY.stipend, reason);
  }

  // -------------------------------------------------------------- page --
  function open(room, promised, reward, spoilsBySeat) {
    const tick = getTick();
    const mode = party.mode();
    const cards = [card0(reward)];
    for (const i of PARTY_SEATS) {
      const off = party.draft(i).offer(promised);
      const c = {
        seat: i,
        type: off.type,
        id: off.id,
        swap: !!off.swap,
        substituted: !!off.substituted,
        line: off.line ?? null,
        spoils: spoilsBySeat && spoilsBySeat[i] ? [...spoilsBySeat[i]] : [],
        replace: null,
        suggest: null,
        decided: false,
        choice: null,
        by: null,
      };
      if (off.pool) c.pool = off.pool;
      if (off.upgrade) c.upgrade = { ...off.upgrade };
      if (off.reason) c.reason = off.reason;
      const sg = suggestCard(party.seat(i).classId, party.slots(i), c);
      c.suggest = sg;
      c.replace = c.swap ? sg.replace : null;
      if (!c.type) {
        // Nothing to offer: decided (Continue), nothing to do.
        c.decided = true;
        c.choice = 'leave';
        c.by = 'ai';
      } else if (aiHeld(i) && (mode === 'suggest' || mode === 'auto')) {
        c.decided = true;
        c.choice = sg.choice;
        c.by = 'ai';
      }
      cards.push(c);
    }
    page = { room, promised, openedTick: tick, deadlineTick: null, owners: [0, 1, 2, 3].map(ownerOf), cards };
    events.emit(tick, 'party_offer', {
      room,
      promised,
      cards: cards.slice(1).map((c) => ({ seat: c.seat, reward: c.type, id: c.id, swap: c.swap, substituted: c.substituted, ...(c.pool ? { pool: c.pool } : {}), suggest: c.suggest ? c.suggest.choice : null, ...(c.swap ? { replace: c.replace } : {}), decided: c.decided })),
    });
    syncDeadlines(tick);
    return page;
  }

  // Card 0 — the Healer's run.reward, mirrored (run.js owns its roll).
  function card0(reward) {
    if (!reward) return { seat: 0, type: null, id: null, decided: false, choice: null, by: null };
    const c = { seat: 0, type: reward.type, id: reward.id, swap: !!reward.swap, substituted: !!reward.substituted, line: reward.line ?? null, spoils: [], replace: reward.swap ? reward.replace : null, suggest: reward.swap ? { choice: reward.suggest, replace: reward.replace } : { choice: reward.type ? 'take' : 'leave', replace: null }, decided: false, choice: null, by: null };
    // Ruling A17 / §25.8: an AI-held Healer (the leader bot after a host
    // migration) decides like any AI seat.
    if (!reward.type) {
      c.decided = false; // the Continue press still commits the page
    } else if (aiHeld(0) && party.mode() !== 'manual') {
      // v0.5.227 (Kesh: "for skill and node selection ... auto select by AI
      // like other AI control class"): a Healer the player does not control
      // (class select) opens decided, like the other AI seats' cards.
      c.decided = true;
      c.choice = c.suggest.choice;
      c.by = 'ai';
    }
    return c;
  }

  // pick(seat, choice, replace?, { by }) — set / change a card's decision
  // (the owner check is the network layer's; single-player owns all).
  function pick(seat, choice, replace = null, { by = 'human' } = {}) {
    if (!page) return { denied: 'closed' };
    const c = page.cards[seat];
    if (!c) return { denied: 'no_such_seat' };
    if (choice !== 'take' && choice !== 'leave') return { denied: 'bad_choice' };
    if (choice === 'take' && !c.type) return { denied: 'nothing_to_take' };
    c.choice = choice;
    c.decided = true;
    c.by = by;
    if (c.swap && Number.isInteger(replace) && replace >= 0 && replace < 4) c.replace = replace;
    if (seat > 0) events.emit(getTick(), 'party_pick', { seat, choice, ...(c.swap ? { replace: c.replace } : {}), by });
    return { ok: true, seat, choice, replace: c.replace };
  }
  // Move a swap card's Replaces mark without deciding (the UI's W/S). The
  // player placed the mark: a Take of this card — the player's or the AI's
  // pre-decided one — lands in exactly that key and never re-sorts the
  // others (PARTY6-F1). `keyed` is on the card only once set.
  function setReplace(seat, slot) {
    if (!page) return null;
    const c = page.cards[seat];
    if (!c || !c.swap || !(Number.isInteger(slot) && slot >= 0 && slot < 4)) return null;
    c.replace = slot;
    if (seat > 0) c.keyed = true;
    return slot;
  }

  // Every card that still waits for a decision (seat 0 included).
  const undecided = () => (page ? page.cards.filter((c) => !c.decided).map((c) => c.seat) : []);

  // Apply seats 1-3 (seat 0 is applied by run.js right before this).
  // Undecided ally cards take their suggestion (a harness / timeout commit)
  // or Leave in Manual (nothing was chosen).
  function applyAllies(reason = 'commit') {
    if (!page) return null;
    const tick = getTick();
    const mode = party.mode();
    const out = [];
    for (const c of page.cards.slice(1)) {
      if (!c.decided) {
        if (reason === 'timeout' || (aiHeld(c.seat) && mode !== 'manual')) {
          c.choice = c.suggest ? c.suggest.choice : 'leave';
          c.by = reason === 'timeout' ? 'timeout' : 'ai';
          // A Replaces mark the player moved stays (the Healer's timeout
          // keeps run.reward.replace the same way) — PARTY6-F1.
          if (c.swap && c.suggest && !c.keyed) c.replace = c.suggest.replace;
          if (reason === 'timeout') events.emit(tick, 'party_autopick', { seat: c.seat, reason: 'timeout', choice: c.choice, id: c.id });
        } else {
          c.choice = 'leave';
          c.by = c.by ?? 'human';
        }
        c.decided = true;
      }
      const rec = { seat: c.seat, choice: c.choice, id: c.id, by: c.by };
      if (c.choice === 'take' && c.type === 'skill') {
        // PARTY6-F1 (GP.2 "Take with each replace target 0-3 -> the new skill
        // in that slot"; BUILD_BRIEF §25.1 slot order = keys = cast order):
        // a key the PLAYER chose — the player's own Take, or a Replaces mark
        // the player moved on the AI's pre-decided Take — is final, and the
        // seat's order is the player's from then on. Only an AI decision on
        // a seat whose keys the AI still orders re-sorts by the §25.8
        // priority (aiSort refuses an arranged seat).
        const keyed = c.by === 'human' || !!c.keyed;
        const r = party.swap(c.seat, c.id, c.swap ? c.replace : null, { by: c.by, keyed });
        if (r && r.ok) {
          rec.replace = r.slot;
          rec.replaced = r.replaced;
          if (aiHeld(c.seat) && !keyed) party.aiSort(c.seat);
        }
      } else if (c.choice === 'take' && c.type === 'node') {
        party.build(c.seat).grantNode(c.id, 'drafted');
      }
      out.push(rec);
    }
    events.emit(tick, 'party_commit', { room: page.room, cards: out });
    fillAfterCommit();
    page = null;
    return out;
  }

  // Suggested / Automatic: AI-held benches auto-filled; any human seat with
  // `autoSocketOwn` on too (the Healer's is run.js's).
  function fillAfterCommit() {
    const mode = party.mode();
    for (const i of PARTY_SEATS) {
      if ((aiHeld(i) && mode !== 'manual') || (!aiHeld(i) && party.autoSocketOwn(i))) party.build(i).autoFill();
    }
  }

  // -------------------------------------------------------------- shop --
  // `reserve` (by seat): Glint an AI seat holds for a relic (Suggested), so
  // its card marks are picked from the rest.
  function openShop(room, reserve = null) {
    const tick = getTick();
    const mode = party.mode();
    const shelves = [null];
    const marked = [null];
    for (const i of PARTY_SEATS) {
      const stock = party.draft(i).shopStock().map((s) => ({ ...s, sold: false }));
      shelves.push(stock);
      const m = stock.map(() => false);
      if (aiHeld(i) && mode === 'suggest') for (const k of suggestShelf(stock, party.purse(i) - (reserve ? reserve[i] : 0))) m[k] = true;
      marked.push(m);
    }
    shop = { room, shelves, marked, touched: [false, false, false, false], done: [false, false, false, false], openedTick: tick, leaveTick: null, deadlineTick: null };
    events.emit(tick, 'party_shop_open', { room, shelves: shelves.slice(1).map((s, k) => ({ seat: k + 1, stock: s.map((c) => ({ node: c.node, rarity: c.rarity, price: c.price })), purse: party.purse(k + 1), marked: marked[k + 1].map((b, j) => (b ? j : -1)).filter((j) => j >= 0) })) });
    if (mode === 'auto') for (const i of PARTY_SEATS) if (aiHeld(i)) aiBuy(i, suggestShelf(shelves[i], party.purse(i)), 'ai');
    syncDeadlines(tick);
    return shop;
  }

  // buy(seat, index) — for THAT character from ITS purse (the §14 denial).
  function buy(seat, index, { by = 'human' } = {}) {
    if (!shop) return { denied: 'closed' };
    const shelf = shop.shelves[seat];
    const card = shelf ? shelf[index] : null;
    if (!card || card.sold) return null;
    const tick = getTick();
    const purse = party.purse(seat);
    if (purse < card.price) {
      events.emit(tick, 'currency_denied', { seat, node: card.node, price: card.price, wallet: purse, index });
      return { denied: 'insufficient_funds', price: card.price, purse };
    }
    party.spend(seat, card.price);
    party.build(seat).grantNode(card.node, 'purchased');
    card.sold = true;
    if (by === 'human') {
      shop.touched[seat] = true;
      shop.marked[seat] = shop.marked[seat].map(() => false);
    }
    const owned = party.draft(seat).ownedCount(card.node);
    events.emit(tick, 'shop_purchase', { seat, node: card.node, price: card.price, wallet: party.purse(seat), owned, index, by });
    return { node: card.node, price: card.price, purse: party.purse(seat), owned };
  }
  function aiBuy(seat, indices, by) {
    for (const k of indices) {
      const r = buy(seat, k, { by });
      if (!r || r.denied) break;
    }
  }
  // A Suggested mark toggled by the player (viewing never changes it).
  function mark(seat, index, on) {
    if (!shop || !shop.marked[seat] || !shop.shelves[seat][index]) return null;
    const v = on === undefined ? !shop.marked[seat][index] : !!on;
    shop.marked[seat][index] = v;
    events.emit(getTick(), 'party_shop_mark', { seat, index, on: v });
    return v;
  }
  function done(seat) {
    if (!shop) return null;
    shop.done[seat] = true;
    events.emit(getTick(), 'party_shop_done', { seat });
    return true;
  }
  // Leaving the shop: every AI-held seat the player did not buy for buys its
  // still-marked cards (Suggested), benches auto-filled; then close.
  function closeShop() {
    if (!shop) return null;
    const mode = party.mode();
    for (const i of PARTY_SEATS) {
      if (!aiHeld(i) || shop.touched[i] || mode !== 'suggest') continue;
      const idx = shop.marked[i].map((b, j) => (b ? j : -1)).filter((j) => j >= 0);
      aiBuy(i, idx, 'ai');
    }
    for (const i of PARTY_SEATS) if ((aiHeld(i) && mode !== 'manual') || (!aiHeld(i) && party.autoSocketOwn(i))) party.build(i).autoFill();
    const out = { sold: shop.shelves.slice(1).map((s) => s.filter((c) => c.sold).length) };
    shop = null;
    return out;
  }

  // --------------------------------------------------------- deadlines --
  // Network only (humans ≥ 2), armed LIVE (PLAN §16.3 / the review fix).
  function syncDeadlines(tick = getTick()) {
    const h = humans();
    if (page) {
      page.owners = page.owners || [0, 1, 2, 3].map(ownerOf);
      if (h >= 2) {
        if (page.deadlineTick === null) {
          page.deadlineTick = tick + PARTY_DEADLINES.pageTicks;
          events.emit(tick, 'party_deadline', { what: 'page', tick: page.deadlineTick });
        }
        for (const c of page.cards) {
          const was = page.owners[c.seat];
          const now = ownerOf(c.seat);
          if (was !== now) {
            page.owners[c.seat] = now;
            if (now === 'human' && !c.decided) {
              const t = tick + PARTY_DEADLINES.pageTicks;
              if (t > page.deadlineTick) {
                page.deadlineTick = t;
                events.emit(tick, 'party_deadline', { what: 'page', tick: page.deadlineTick, seat: c.seat });
              }
            } else if (now === 'ai' && !c.decided && party.mode() !== 'manual') {
              // A dropped / away guest: the host decides at once.
              pick(c.seat, c.suggest ? c.suggest.choice : 'leave', c.suggest ? c.suggest.replace : null, { by: 'ai' });
            }
          }
        }
      } else if (page.deadlineTick !== null) {
        page.deadlineTick = null;
        events.emit(tick, 'party_deadline', { what: 'page', tick: null });
      }
    }
    if (shop) {
      if (h >= 2 && shop.deadlineTick === null) {
        shop.deadlineTick = tick + PARTY_DEADLINES.shopTicks;
        events.emit(tick, 'party_deadline', { what: 'shop', tick: shop.deadlineTick });
      } else if (h < 2 && (shop.deadlineTick !== null || shop.leaveTick !== null)) {
        shop.deadlineTick = null;
        shop.leaveTick = null;
        events.emit(tick, 'party_deadline', { what: 'shop', tick: null });
      }
    }
    if (doorDeadlineTick !== null && h < 2) {
      doorDeadlineTick = null;
      events.emit(tick, 'party_deadline', { what: 'door', tick: null });
    }
  }
  function armDoor(tick = getTick()) {
    if (humans() >= 2) {
      doorDeadlineTick = tick + PARTY_DEADLINES.doorTicks;
      events.emit(tick, 'party_deadline', { what: 'door', tick: doorDeadlineTick });
    } else doorDeadlineTick = null;
  }
  // The Advance countdown (a host Advance with a human not Done).
  function startAdvanceCountdown(tick = getTick()) {
    if (!shop) return null;
    shop.leaveTick = tick + PARTY_DEADLINES.shopAdvanceTicks;
    events.emit(tick, 'party_deadline', { what: 'shop_advance', tick: shop.leaveTick });
    return shop.leaveTick;
  }
  // Due deadlines this tick: 'page' | 'door' | 'shop' | null.
  function due(tick = getTick()) {
    if (page && page.deadlineTick !== null && tick >= page.deadlineTick) return 'page';
    if (shop && ((shop.deadlineTick !== null && tick >= shop.deadlineTick) || (shop.leaveTick !== null && tick >= shop.leaveTick))) return 'shop';
    if (doorDeadlineTick !== null && tick >= doorDeadlineTick) return 'door';
    return null;
  }
  // The page deadline fired: every undecided card takes the suggestion.
  function timeoutPage() {
    if (!page) return null;
    for (const c of page.cards) {
      if (c.decided) continue;
      if (c.seat === 0) continue; // run.js decides the Healer's with the same rule
      c.choice = c.suggest ? c.suggest.choice : 'leave';
      if (c.swap && c.suggest && !c.keyed) c.replace = c.suggest.replace; // a player's moved mark stays
      c.decided = true;
      c.by = 'timeout';
      events.emit(getTick(), 'party_autopick', { seat: c.seat, reason: 'timeout', choice: c.choice, id: c.id });
    }
    return true;
  }
  const clearDoor = () => {
    doorDeadlineTick = null;
  };
  // Every deadline goes (a single-player load of a network save; a level reset).
  function clearDeadlines() {
    if (page) page.deadlineTick = null;
    if (shop) {
      shop.deadlineTick = null;
      shop.leaveTick = null;
    }
    doorDeadlineTick = null;
  }

  // -------------------------------------------------------------- views --
  function pageView() {
    if (!page) return null;
    const tick = getTick();
    return {
      room: page.room,
      promised: page.promised,
      openedTick: page.openedTick,
      deadlineTick: page.deadlineTick,
      deadlineInTicks: page.deadlineTick !== null ? Math.max(0, page.deadlineTick - tick) : null,
      mode: party.mode(),
      owners: [0, 1, 2, 3].map(ownerOf),
      cards: page.cards.map((c) => {
        const o = clone(c);
        if (c.seat > 0 && c.type === 'node') {
          const up = party.draft(c.seat).upgradeInfo(c.id);
          if (up) o.upgrade = up;
          else delete o.upgrade;
        }
        return o;
      }),
    };
  }
  function shopView() {
    if (!shop) return null;
    const tick = getTick();
    return {
      room: shop.room,
      touched: [...shop.touched],
      done: [...shop.done],
      deadlineTick: shop.deadlineTick,
      leaveTick: shop.leaveTick,
      deadlineInTicks: shop.deadlineTick !== null ? Math.max(0, shop.deadlineTick - tick) : null,
      leaveInTicks: shop.leaveTick !== null ? Math.max(0, shop.leaveTick - tick) : null,
      shelves: [
        null,
        ...PARTY_SEATS.map((i) => ({
          seat: i,
          purse: party.purse(i),
          stock: shop.shelves[i].map((c, k) => ({
            node: c.node,
            rarity: c.rarity,
            price: c.price,
            sold: c.sold,
            marked: !!shop.marked[i][k],
            owned: party.draft(i).ownedCount(c.node),
            affordable: party.purse(i) >= c.price,
            ...(c.sold ? {} : party.draft(i).upgradeInfo(c.node) ? { upgrade: party.draft(i).upgradeInfo(c.node) } : {}),
          })),
        })),
      ],
    };
  }

  return {
    dropSpoils,
    stipend,
    open,
    pick,
    setReplace,
    undecided,
    applyAllies,
    openShop,
    buy,
    mark,
    done,
    closeShop,
    syncDeadlines,
    armDoor,
    startAdvanceCountdown,
    due,
    timeoutPage,
    clearDoor,
    clearDeadlines,
    pageView,
    shopView,
    isOpen: () => !!page,
    shopOpen: () => !!shop,
    card: (seat) => (page ? page.cards[seat] : null),
    doorDeadline: () => doorDeadlineTick,
    setScreen,
    humanScreenOpen,
    screensAny: () => screens.some(Boolean),
    screens: () => [...screens],
    humansNotDone,
    humans,
    reset() {
      page = null;
      shop = null;
      doorDeadlineTick = null;
      screens.fill(false);
    },
    // `screens` only while one is open (a v0.5.159 tree is byte-identical).
    saveState: () => ({ page: clone(page), shop: clone(shop), doorDeadlineTick, ...(screens.some(Boolean) ? { screens: [...screens] } : {}) }),
    loadState(d) {
      page = d && d.page ? clone(d.page) : null;
      shop = d && d.shop ? clone(d.shop) : null;
      doorDeadlineTick = d && Number.isFinite(d.doorDeadlineTick) ? d.doorDeadlineTick : null;
      for (let s = 0; s < 4; s++) screens[s] = !!(d && Array.isArray(d.screens) && d.screens[s]);
    },
    aiHeld,
  };
}

void NODES;
void SKILLS;
void swapSuggestion;
