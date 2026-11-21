# HANDOFF: Echoes (state on 2026-11-21, v0.5.366)

For the next AI assistant. Read this, then `CLAUDE.md` (conventions, gates, settled decisions), then the
doc under `docs/` for the system you touch. Owner: Kesh (GitHub keshliew96-afk). He writes English and
sometimes Chinese; he decides by picking from short numbered lists.

## Goal
A complete, fully playable top-down party roguelike (plain JS + Three.js + Vite, Node 22) released on
Steam as a Windows desktop app (Electron), with at least 4 hours to see all content (all heroes, both
endings, all modes). Online co-op stays. All ten languages stay. Minimum spec GTX 1050 Ti / RX 570.

## Where things are
- Repo: https://github.com/keshliew96-afk/echoes-three (public).
  - `gauntlet`: the work branch and GitHub default. The live site (Render, echoes-game-z08o.onrender.com)
    deploys from it by Manual Deploy. Keep it as Render's branch.
  - `main`: gauntlet plus this file plus `resources/` (the design docs below). Created 2026-11-21.
  - `master`: an old, unrelated history (v0.5.215, Oct 2026). Not used; do not build on it.
- `resources/`: text and small images copied from the old project folder (design docs, plans, story,
  talent kits, review-page sources, notes). Binary assets are NOT in Git (the repo is public; Kesh's pick):
  the 238 Tripo `.glb` models, `.mp4` videos, reference frames, big images, zips and his uploads.
- Full copy of everything (all binaries included): Kesh's laptop, `C:\Users\keshl\OneDrive\Desktop\游戏制作\`
  - `echoes-three\` the git clone; `project-files\` the whole old project folder (3.1 GB);
    `claude-memory\` the old assistant's notes (one file per topic; `MEMORY.md` is the index).
- Old docs and memory refer to `/mnt/project-files/<dir>/`: that is now `project-files\<dir>\` on the
  laptop and (text only) `resources/<dir>/` in the repo.
- Review pages (claude.ai artifacts, Kesh's account; sources in `<hero>-abilities/`):
  Mosslight https://claude.ai/artifact/PRvbQox74ZuoGZkzVjEq5c (passed v40) ·
  Stonehide https://claude.ai/artifact/BBW4wymaDTWddmtKmAYCHi (kit 1.7 passed) ·
  Ashfang https://claude.ai/artifact/DX11pzJ3cFu5ztRUNk5PL5 (passed v35, VFX v45) ·
  Windbriar https://claude.ai/artifact/76ZcXQbuVdqCqPLzKPqYQN (passed v26) ·
  Duskwing https://claude.ai/artifact/8Hk5PFCgGSqJZY4uhMMVSy (v18, awaits his look) ·
  Tide Caller https://claude.ai/artifact/DKPsEdrofPCkk2FJ2naMx1 (kit 2.2, awaits marks) ·
  Bellwright https://claude.ai/artifact/QbF8ot3fRqXnje8kzCQFK7 (v2, kit 1.2, awaits marks).

## Finished (in the game, on gauntlet)
- 7 heroes (Healer mouse, Tank badger, Swordsman fox, Archer rabbit, Duskwing bat, Tide Caller otter,
  Bellwright beetle), 5 levels plus the Spire / Kiln fork, 40-room runs, 17 bosses, 12 champions,
  41 enemy types, 63 relics, affixes, hazards, shrines, vaults, events, secrets, journal, deeds, vows.
- Modes: campaign, Endless, Daily Descent (server board), Boss Rush, online co-op (WebSocket + WebRTC),
  cloud saves. Ten languages. `npm test` (55 probes), `npm run check`, nine goldens, CI on GitHub.
- Freeze cleanup (Nov 10): one zone system, one cast path, one VFX director, run.js / signature.js split.

## Finished (design only, not in the game)
- Tripo models: all passed 2026-11-15 (7 heroes, 17 bosses, 12 champions, 38 foes, 6 NPCs).
  Ruling A23: they replace the code-built rigs once the freeze lifts. Spec: `docs/TRIPO_MODELS.md`.
- Talents (ruling A24, `docs/TALENTS.md`): 3 play-style paths per hero, mix and match, one pick per tier.
  Kits: `resources/<hero>-talents/`. Each hero's skill pool is 26 skills; a hero holds 4 at a time.
- Damage formula v1.2 (HSR style): `resources/damage-formula/`.
- Steam launch plan: `resources/plan/STEAM_LAUNCH_PLAN.md` (slices S0-S17; section 7 = Steam rules).
  Steamworks fee paid 2026-11-15; the 30-day wait ends about 2026-12-15; Kesh still has to finish
  bank / tax / ID checks and create the app (App ID not yet known).
- VFX: one repaint per element method (`resources/vfx-dream/METHOD.md`); Tide Caller VFX all passed;
  Ashfang effects passed; Stonehide, Mosslight, Windbriar VFX paused until his go.
- Knee bones: `resources/knees/KNEES.md` (passed).

## In progress, exactly where it stopped
1. Storyline: `resources/story/STORYLINE.md` v7 (Watcher / Old God, Bell Court of ibex lords, map names,
   new Snowridge level as Level III, 6 levels / 48 rooms, two mountain heroes, bard Hymnscale, hyena
   Don Ringtail). Model plan `resources/story/model-fit/MODEL_PLAN.md` (~39 new Tripo exports). His picks
   are in; several change settled rules (unlock on reaching a map, run length) and wait for the freeze lift.
2. Tide Caller page: 36 cards with a blue 新 chip await his marks.
3. Bellwright page v2: awaits his marks.
4. Duskwing page v18: awaits his look.
5. Ashfang VFX: all 100 clips use passed effects; awaits his per-skill notes.
6. Open draft PR #113 (VFX readability, v0.5.331, Oct 2026): unfinished and stale; do not merge without
   asking Kesh.
7. Open items for Kesh: Upstash or `ECHOES_DAILY_SECRET` for the Daily board (#109); a cross-network
   co-op test; a real gamepad test.

## Next steps, in order
1. Keep the feature freeze until Kesh lifts it. Only setup, cleanup and design work.
2. Collect his marks on the open pages (items 2 to 5 above); apply them on the pages only.
3. On freeze lift: the Tripo in-game trial (one hero, one foe, one boss in a Level I room), QA fixes 8-10,
   co-op damage numbers show only own damage dealt and heals received.
4. Then bring in all Tripo models (one per creature, deleting each code-built rig), the hero renames
   (Mosslight, Stonehide, Ashfang, Windbriar) in ten languages, talents, cast modes, the storyline.
5. Steam: Electron shell (S2), Steam lobbies transport, file saves + Auto-Cloud, deeds to achievements,
   perf probe on 1050 Ti class hardware, then store page and release.

## Key decisions (full list: CLAUDE.md "Settled decisions")
- Freeze rules, verbatim: "one implementation per system; replace, never duplicate; small changes only;
  run checks after every change."
- Each change: one draft PR into gauntlet, bump `src/version.js` one patch, all new text in ten
  languages, one probe, nine goldens byte-identical, `npx vite build` clean, docs updated.
  Nothing merges before Kesh says go.
- Controls: skills Q E C X, interact F, tonic G, camp class K, attack right mouse.
- Dash has top priority, cancels wind-up/recovery, has i-frames. No splayed feet in humanoid walks
  (heavy characters excepted). Planted feet do not slide.
- Mosslight: no shields. Stonehide: no self shield, no self heal. Ashfang: no elements, Fox Crimson
  + silver. Bellwright: no heal, no shield, only buffs and debuffs. Tide Caller: massive-AoE sea mage,
  Soaked on every skill, no walls anywhere.
- Colours and VFX: `.claude/rules/visuals.md`, `docs/VFX_TEMPLATES.md`, `docs/VFX_HIT_RULES.md`.
  Effects dim and readable. Repaints: copy only the look; never add effects only in the painting.
- Tripo export: HD Model H3.1, Triangle, 2K texture, Remove Lighting on, PBR off, no Tripo rig.
  Budgets: hero 15k tris, boss ~28k, champion 12k, foe 4k, prop ~1k. Keep Tripo paid-plan receipts.
- Review pages: simple and clean, few words, Chinese first with an English switch, grid floor, dummies.

## How to run and test
```bash
npm ci                 # Node 22 (add --ignore-scripts to skip Puppeteer's browser)
npm run dev            # game at http://127.0.0.1:5199
npm run net            # session server on :7800 (co-op, cloud saves, Daily)
npm run check          # Playwright play check (needs `npx playwright install chromium` once on a laptop)
npm test               # headless suite, about 5 minutes
node tools/gntM2-goldens.mjs   # the nine goldens must stay identical
npx vite build         # only the chunk-size warning is expected
```

## Must not change
- Settled decisions in CLAUDE.md (do not reopen), BUILD_BRIEF rulings, existing deeds, records,
  totals, counters and rules, unless Kesh names them.
- The nine goldens (`tools/goldens.json`) and the gates that keep them identical (CLAUDE.md).
- `gauntlet` as Render's branch; `.claude/settings.json` deny list (no force push, no deleting gauntlet).
- The sim never reads wall-clock time and never translates; play randomness uses the seeded stream.
- Never push the Tripo models or Kesh's uploads to the public repo without asking him.
