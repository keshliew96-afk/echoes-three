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
  board's answer (`#3 of 41 today`).
- **One counted run a day** (content plan 3, slice 14). The first Set out of
  the day is the counted run: the device marks it spent at that press, so a
  closed tab spends it too. Every later run that day is **practice**: the
  button reads **Practice run**, the HUD plate `DAILY PRACTICE · ROOM n/8`,
  and the end card `Practice run · not on the board`; it is never posted. The
  Level Select card shows the counted run (`Counted today: …`). The day
  turns over at **00:00 UTC**.

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
- **Bosses felled:** each level's record keeps the boss it met (`rec.boss`,
  set at every level clear in src/sim/run.js), and the unlock facts read it.
  Before 0.5.310 a Daily kept none, so `runFacts` re-rolled every level's boss
  from the last level's seed and credited the wrong ones on 337 of 365 days
  (`meta.bosses`, the `boss_*` deeds, Kingslayer, the hero unlock feats, the
  boss tints). Credit is right from 0.5.310 on; what older Daily wins wrongly
  credited stays on the profile (nothing is rewritten).

The plain campaign, Endless and the tutorial never carry the `daily` key, so
the nine goldens are byte-identical.

## Server (server/daily.mjs)

```
GET  /daily/board/<YYYY-MM-DD>[?me=<id>]  -> { ok, key, today, total, entries[≤20], me?, store, durable }
POST /daily/score { key, id, name, cls, depth, won, ticks, seed, version } -> { ok, rank, total, best, entry }
```

- `id` is a random id the game keeps in `localStorage['echoes.daily.v1']`
  (with this device's best run per day); the board never shows it.
- The name is Settings ▸ Network ▸ Player name (`net.playerName`, default
  `Mouse123`), cleaned to 16 characters; `?netname=` overrides it for
  harnesses.
- Only today's and yesterday's boards take scores (a run that ends after
  midnight UTC still counts for its day). 30 posts and 120 board reads per IP
  per 10 minutes.
- **One entry per id and day, the first post.** A different run for the same
  id and day is refused (`409 counted`); the same run sent again is answered
  as before.
- **Plausibility checks** (refused with `400`):
  - `bad_version`: the version is not this server's line (major.minor) or is
    newer than the server (the day's omen comes from the build's relic list);
  - `bad_seed`: `seed` is not `dailySeed(key)`;
  - `bad_score`: depth outside 0 to 40 (8 rooms x 5 levels; `MAX_DEPTH` follows `CAMPAIGN_ACTS`), a time outside
    1 tick to six hours;
  - `implausible`: a won run that did not clear all 40 rooms, or a time under
    `MIN_ROOM_TICKS` (240 ticks, 4 s) per room cleared. The autopilot's fastest
    whole level over 64 seeds took 6046 ticks, 756 a room. Checked again in
    Small fixes 3 against the fastest a run can possibly be: a "god mode"
    Daily (every enemy killed the tick it spawns, the party kept whole) over
    24 days won in 14,531 to 35,507 ticks (363 to 888 a room), and its fastest
    stretch of 20 rooms or more ran 245 a room. So the floor never refuses
    a real run, and it cannot rise much: below 20 rooms the god-mode runs dip
    to about 100 a room through shops and event rooms. `tools/small-fixes-3-probe.mjs`
    re-runs three of those days against the server's check.
- **Storage:** the cloud saves' Upstash Redis (`ECHOES_CLOUD_REDIS_URL` and
  `ECHOES_CLOUD_REDIS_TOKEN`), one hash `echoes:daily:<day>` per day kept 30
  days. Without it, the board is kept in memory and is gone after a restart
  or a redeploy (the day's screen says so).
- Same Origin allow-list as cloud saves; Vite proxies `/daily/` in dev.

## Probes

- `node tools/daily-probe.mjs` (headless, 25 checks): seed, omen, Level II
  reseed, rules, depth, board order, closed days, bad input, Upstash
  commands, and the HTTP routes on a live server.
- `node tools/gameplay-bugs-probe.mjs` (headless): two whole Daily wins
  credit the bosses they fought; a summary without per-level bosses still
  reads the old way.
- `node tools/daily-browser.mjs [--lang de] [--dir …]` against a served build
  (`npm run build && node server/index.mjs --static dist --port 7821
  --origins self`): card, day screen, run, HUD, end card, board.

## Known limits

- The board still trusts the game within the checks above: a modified
  client can post a plausible run it never played, and a cleared browser
  storage (a new device id) gets a new counted run. A real fix would replay
  the run's inputs on the server.
- A day's omen comes from the relic list of the running version, so on the
  day a new relic batch ships, players on the old and new build can roll
  different relics.
