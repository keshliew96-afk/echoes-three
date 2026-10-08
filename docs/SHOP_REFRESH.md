# Shop refresh

Kesh, 2026-10-08: "add new feature, spend glint for a refresh of shop items".
Version 0.5.248.

## Player view

- The peddler's shelf has a **Refresh** button beside the Advance lamp: two
  turning arrows, the price on a small brass plaque, and its key (**R**, or
  **X** on a gamepad).
- A refresh redraws the viewed character's whole four-card shelf (two
  commons, a rare, a legendary, the same draw the shelf opens with). Sold
  cards go too: the new shelf is all fresh.
- Price: **5 Glint**, then **10, 15, 20 ...** within one visit (+5 each). The
  count starts over at the next shop. The Peddler's Seal discount applies, as
  it does to the cards. With the usual 72 Glint at the shop, one refresh still
  leaves any two cards affordable.
- It is paid from that character's own purse (the Healer's is the run wallet).
- The relic shelf is the whole party's and is not redrawn.
- The button only shows on a tab the player may buy on: the own character, or
  an AI character under Ally builds: Manual. When the purse cannot pay, the
  button cools to unlit dashed brass (never hidden for price) and a press
  shakes it with the denial sound; nothing is spent.
- AI characters never refresh; they shop as before (their Suggested picks, a
  relic under Auto / Suggested). A refresh on an AI-held shelf under Manual
  clears that shelf's Suggested marks, like a buy does.
- Campaign, Endless and Daily alike (they share the peddler).

## Feel

The shelf flips: the old cards (and their price plaques) turn edge-on one
after another, the shelf is rebuilt, and the new cards turn face-up with a
small overshoot through a gold edge flare in their rarity glow. A warm light
band sweeps across the shelf, six coins fly from the Glint strip into the
button while the purse counts down, the button's arrows spin once and the
peddler's lantern flares. The sound (`shop_refresh`, src/audio/cues.js) is a
quick riffle of six paper flicks rising in pitch, then a soft two-note
shimmer as the new cards land; it is on the VFX lab's "Sound, shop" row
(`?vfxlab=1`).

In a narrow window (1024 px) the two key hints beside the lamp step aside
instead of wrapping into tall columns, and in German the button keeps its
arrows, price and key with the word in its tooltip.

## Co-op

Each character's shelf is its own (as for buying). A guest's Refresh is a
`party` command (`op: 'refresh'`, src/net/session.js); the host checks the
seat is the guest's own and applies it through the same `refreshShop(seat)`,
and the redraw reaches everyone in the snapshot. A press on another player's
tab is refused locally.

## Code

- `src/sim/draft.js`: `REFRESH_PRICE`, `refreshPrice(n)`.
- `src/sim/run.js`: `refreshShop(seat)`, `refreshCost(seat)`; the Healer's
  redraw draws from the run's seeded stream, only on a press, so a run with
  no refresh draws exactly as before (the nine goldens are unchanged). Views
  carry `shop.refreshes` / `partyShop.refreshes` only after a refresh.
  Debug commands: `shopRefresh [seat]`, `shopRefreshCost [seat]`.
- `src/sim/partypage.js`: `refresh(seat, price)` for seats 1 to 3 (party
  stream).
- Events: `shop_refresh { seat, price, wallet, n, stock }`,
  `refresh_denied { seat, price, wallet }`.
- `src/ui/run/shop.js`: the button, keys, the flip; `src/ui/run/style.js`.

## Probes

- `node tools/shop-refresh-browser.mjs [--class swordsman] [--lang de] [--size 1024x640]`
- `node tools/shop-refresh-layout.mjs [--langs en,de,ja] [--sizes 1024x640,1280x720,1920x1080]`
