# The Daily Descent

Content plan 2, slice 8: one run a day that every player shares, and a small
leaderboard on the session server.

## Player view

- **Level Select ▸ Daily card** (the sixth card, after Endless). It names the
  day, the day's relic and curse, and this device's best run of the day.
  It is open from the first visit; in a network session it is locked
  ("Single player only").
- The card opens **the day's screen**: the relic and the major curse every
  player starts with, the rules, today's board (top 10, and the player's own
  row when they are further down), and **Set out**. `R` refreshes the board.
- The run plays the **campaign rules from Level I** to the final level, on
  **Standard**, with **nothing equipped** from the Unlocks screen. The day's
  relic is held and its major curse is bound from the first room. The HUD
  plate reads `DAILY · ROOM n/8 · …`.
- At the end (a fall, a win, or Quit to Lobby) the run is posted to the
  board, and the end card shows the day, the depth reached, the time and the
  board's answer (`#3 of 41 today · Your best today!`).
- Play as often as you like: the board keeps each player's best run of the
  day. The day turns over at **00:00 UTC**.

## Rules (src/data/daily.js)

- **Seed:** `dailySeed(day)` hashes the UTC date (`YYYY-MM-DD`). Level I's
  frame (room modes, doors, defend rooms, the boss) comes from it. Every later
  level reseeds from `dailyLevelSeed(seed, index)`, so Level II is the same
  for everyone however Level I was played.
- **Omen:** `dailyOmen(seed)` in src/sim/relics.js picks one relic that is not
  bound to a class, and one of the four major curses.
- **Depth:** rooms cleared across the levels (`dailyDepth`): earlier levels
  count 8 each, a won run counts every room. The board ranks deeper first,
  then the shorter run time, then the earlier post.
- Everything else (drafts, doors, relic picks, enemies) follows the shared
  stream, so two players see the same offers as long as they play alike.

The plain campaign, Endless and the tutorial never carry the `daily` key, so
the nine goldens are byte-identical.

## Server (server/daily.mjs)

```
GET  /daily/board/<YYYY-MM-DD>[?me=<id>]  -> { ok, key, today, total, entries[≤20], me?, store, durable }
POST /daily/score { key, id, name, cls, depth, won, ticks, version } -> { ok, rank, total, best, entry }
```

- `id` is a random id the game keeps in `localStorage['echoes.daily.v1']`
  (with this device's best run per day); the board never shows it.
- The name is Settings ▸ Network ▸ Player name (`net.playerName`, default
  `Mouse123`), cleaned to 16 characters; `?netname=` overrides it for
  harnesses.
- Only today's and yesterday's boards take scores (a run that ends after
  midnight UTC still counts for its day). Depth 0 to 64, a time up to six
  hours. 30 posts and 120 board reads per IP per 10 minutes.
- **Storage:** the cloud saves' Upstash Redis (`ECHOES_CLOUD_REDIS_URL` and
  `ECHOES_CLOUD_REDIS_TOKEN`), one hash `echoes:daily:<day>` per day kept 30
  days. Without it, the board is kept in memory and is gone after a restart
  or a redeploy (the day's screen says so).
- Same Origin allow-list as cloud saves; Vite proxies `/daily/` in dev.

## Probes

- `node tools/daily-probe.mjs` (headless, 25 checks): seed, omen, Level II
  reseed, rules, depth, board order, closed days, bad input, Upstash
  commands, and the HTTP routes on a live server.
- `node tools/daily-browser.mjs [--lang de] [--dir …]` against a served build
  (`npm run build && node server/index.mjs --static dist --port 7821
  --origins self`): card, day screen, run, HUD, end card, board.

## Known limits

- The board trusts the game: a modified client could post any depth. The
  server checks shape and bounds only.
- A day's omen comes from the relic list of the running version, so on the
  day a new relic batch ships, players on the old and new build can roll
  different relics.
