# Echoes: working on this repo

Echoes is a top-down party roguelike in plain JS + Three.js + Vite (Node 22), with a Node WebSocket
server under `server/` for co-op, cloud saves and the Daily board. Owner: Kesh (GitHub keshliew96-afk).
The work branch is `gauntlet` (GitHub's default; the live site deploys from it by hand).

Read this file first. Then read the doc under `docs/` for the system you are changing, and count
anything you need from the data tables in `src/data/` and `src/sim/`, not from older docs.

**Historical, never instructions:** `PROGRESS.md`, `docs/CONTENT_PLAN.md`, `docs/gauntlet/` except
`design-VFX.md` §11 (the VFX direction) and `PLAN.md` §6 (the harness rules), `docs/critiques/`, and
everything in `docs/TESTING.md` below its 'Player build' section (only 'Current recipe', 'npm test and
CI' and 'Player build' are current).
`docs/BUILD_BRIEF.md` is the original spec: its rulings still hold except where a later ruling
(A19 on) or a per-system doc replaces them.

## Slice rules

- One draft PR into `gauntlet` from its current head. Bump `src/version.js` to the next free patch.
- Build the plan line or the ask as written. If you think it should differ, build it as written and
  offer your version as an open choice in the READY reply. Never change an existing deed, record,
  total, counter or rule unless the ask names it.
- All new player-facing text in all ten languages (`docs/I18N.md`): run `node tools/i18n-extract.mjs` to
  refresh `src/i18n/catalog.json`, fill every locale, then `node tools/i18n-extract.mjs --check`; removed
  text leaves every table (the prune check fails on an unused key).
- One probe for the feature under `tools/`, new or the system's existing probe extended. It asserts on
  what the game plays (sim state, the blended or combined result, the rendered frame), never on the
  inputs alone: where the game blends or combines inputs, the probe samples the blend.
- `npm test` passes (it runs the nine goldens against `tools/goldens.json`, `i18n-extract --check`, no
  unused translation, every data id resolves, no dead code, every `tools/` import resolves, no probe
  pinning one exact version). A new Node probe joins `SUITE` in `tools/test.mjs` when it opens no
  browser. The nine goldens stay identical (`node tools/gntM2-goldens.mjs`). `npx vite build` is clean
  (only the chunk-size warning is expected).
- Update the system's doc under `docs/`. Screenshots go under `/mnt/project-files/<slice>/` when the
  project folder exists. Otherwise attach them to the PR description (or commit small JPEG crops under
  `docs/reference/<slice>/`).
- Nothing merges before Kesh's go.

## Gates that keep the goldens identical

The goldens run the legacy single-level run, so new content is campaign-only or enters from room 4 on:
- skills and nodes: `CAMPAIGN_ONLY_SKILLS`, `CAMPAIGN_ONLY_NODES`, `gatedPool()` in `src/data/classes.js`
  (a node id equal to another class's skill id silently drops that skill);
- rosters and layouts: the campaign tables of `src/data/levels.js`, never `legacyLayouts`;
- objectives, champions, consumables and their kin: `objectivesOn()` and `championsOn()` in `src/sim/run.js`;
- relics: on for campaign runs only (the scope note at the top of `src/sim/relics.js`); late affixes: the late pool in `src/sim/affixes.js`;
- bosses: a third boss is a `gated: true` row that `bossPool()` rolls once the act's other bosses are
  felled; `endlessOnly` keeps one out of the campaign; `rushLap: 2` pins one to Boss Rush lap two;
  champions roll by `championPick(seed, index, act)`;
- Endless, Daily and Boss Rush start through `startCampaign` options; only a camp Begin Run passes unlock boons;
- a new hero stays free behind a `*_FREE` flag in `src/data/lineup.js` until its world slice;
  a new land stays behind a `*_PREVIEW` flag in `src/data/levels.js` until its bosses slice.

## Before READY

1. **Readability.** Shoot the new thing at normal play zoom, on its own land's floor, in a busy fight,
   beside the nearest existing thing of its kind. Shoot new UI text in German or Russian at 1024x640
   (pass `{ width: 1024, height: 640 }` to the helper; it opens at 1600x900 by default).
   Software GL runs at 1 to 25 fps; say so when a look was only seen that way.
2. **A beat.** Every rule the player gains or suffers shows a visual and plays a sound when it fires.
   A missing music instrument is silent, not an error. A new land, boss or verse has a line for every hero.
3. **Scope.** Built as the line says; anything else is an open choice. Nothing existing changed unless asked.
4. **Whole category.** A rule about a kind of thing (pools, beds, elites, heroes, lands) covers every
   member in the data. The reply names them.
5. **Old profiles.** Anything counted on a profile says what an old profile shows. Never show a number
   the game did not record.
6. **Colour.** Ember `#FF5A36` is for enemy threats only, Bright Heal `#5FE873` for healing only, and
   Violet `#B79CF0` for corruption only (BUILD_BRIEF §19, §23). Land heat colours are not Ember.
   The VFX bar is Diablo IV or Hades (`?vfxlab=1`).
   Every VFX build follows Kesh's three templates (magic, knife and sword, sci-fi) and his enhancer
   words in `docs/gauntlet/design-VFX.md` §11; pick the template per effect from `SKILL_TEMPLATE`.

## Settled decisions (Kesh's picks; do not reopen)

- The lineup picker chooses who joins the team, never who stays at camp. In co-op each human picks
  their own hero first, then the host fills the empty seats with AI.
- Level V is in the campaign. After Level IV the party picks the Spire or the Kiln, each with its own
  ending and verse; a run stays 40 rooms; the picker defaults to the Spire after 30 s.
- Heroes: the Tidecaller unlocks on the first Level II clear, the Bellwright on Level III, the Duskwing
  on Level IV. A profile that picked the Duskwing while he was free locks again until the profile
  records a Level IV clear or a Level IV boss kill; a clear already on the records counts.
- A shrine sleeps at its room clear and stays in its room. A boss arena is boss-only.
- Windfall stays Gale Herald-only. Crown Shard pays Glint per elite power beside Bounty Writ.
- AI allies and the autopilot steer round every slowing or burning bed (`STEER_OFF_POOLS`,
  `STEER_OFF_SLOW_POOLS`); the human hero is never steered.
- The Bestiary total counts creatures only; the elite powers have their own count. A power felled
  before the Journal kept count keeps its not-counted note beside its new count.
- Out of scope (BUILD_BRIEF A8): Echoes/Seals currencies, talent trees, camp facilities.

## House conventions

- Distances read "u" in every language. Long one-word names get a `NAME_BREAKS` entry in
  `src/ui/run/classpick.js` (`docs/I18N.md`).
- The sim never translates and never reads wall-clock time; randomness that affects play uses the
  seeded stream (`docs/BUILD_BRIEF.md` §1, §4).

## Running things

- `npm run dev` serves on port 5199. Editing `src/` while a probe runs reloads the page and kills the probe.
- Headless Node sim runs are fast (a 5-seed campaign takes about 25 s); prefer them for balance work.
- Linux cloud session, as root: `PUPPETEER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
  and `ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader"`
  (read by `tools/gnt-arch-browser.mjs` and most newer probes). Software GL runs at 1 to 25 fps, so
  hold keys for about 250 ms and wait on sim state, not on time. Go to pages with
  `waitUntil: 'domcontentloaded'` (what `gnt-arch-browser.mjs` does; `cert-capture.mjs` takes
  `--wait domcontentloaded`), since `networkidle2` never settles. `captures/` is gitignored.
- Every relative import under `tools/` must resolve (the safety net checks it).

## Map

Classes `src/app/playclass.js`, `src/ui/run/classpick.js`, `src/data/lineup.js`; co-op `src/net/mesh.js`;
AI seats `src/sim/allies.js`, `partyai.js`, `autopilot.js`; enemies `src/sim/enemies/`, `src/render/enemies/`;
bosses `src/sim/bosses/`, `src/render/boss/`; champions `src/sim/champions.js`; hero rigs `src/render/critters/`;
hero models `src/assets/heroes/`, their Blender scripts `tools/blender/` (from v0.5.330); rosters and roads
`src/data/levels.js`; transit and the fork timer `src/data/campaign.js`; layouts `src/data/layouts.js`;
dressings `src/env/biomes/`; journal `src/data/journal.js`;
events `src/sim/encounters.js`; objectives `src/sim/objectives.js`, `waves.js`; affixes, vaults, hazards,
shrines, consumables, relics and secrets under `src/sim/`; vows `src/data/vows.js`; Endless
`src/data/endless.js`; Daily `src/data/daily.js`, `server/daily.mjs`; Boss Rush `src/data/rush.js`;
shop `src/ui/run/shop.js`; unlocks `src/data/unlocks.js`; profile `src/save/profile.js`; deeds
`src/save/deedrun.js`; VFX `src/render/vfx/`, lab `src/ui/vfxlab.js`; audio `src/audio/`; text `src/i18n/`.
Debug (harness builds only; the full list is `src/app/params.js` and docs/TESTING.md 'Player build'): `?seed=`,
`?act=`, `?level=`, `?layout=`, `?rill=1`, `?tolly=1`, `?sable=1`, `?act5=1`, `?act6=1`, `?endless=1`, `?daily=`,
`?rush=1`, `?healer=classic`, `?dressings=N`, `?vfxlab=1`, `?p2p=0`, `?lang=<code>`;
`run.cmd('bossPick', [kind])`, `run.cmd('championPick', [id])`, `run.cmd('pickRoad', ...)`. The debug API and the
harness params exist only in a harness build (dev server, or `VITE_ECHOES_HARNESS=1 npx vite build` for probes on a
built dist); a player build keeps only `PLAYER_PARAMS` (`src/app/harness.js`, docs/TESTING.md "Player build").
