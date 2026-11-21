# Prompt review: the text that steers Claude's work on Echoes

Written 2026-10-19 against gauntlet at cbb181b (v0.5.305). Reading taken: "prompts" means the standing text every Claude thread works from: the project instructions, the repo's guidance docs, the plan docs in the project files, the shared memory notes, and the coordinator's briefs and fix-first relays. Nothing here redesigns the game.

## Headline

1. **A thread starting cold lands on the wrong documents.** The repo has no `CLAUDE.md`, so nothing loads automatically. The files a new thread finds first are all stale and some give orders: `PROGRESS.md` opens with "GAUNTLET PAUSED at v0.5.220 … Resume point: do this first", `docs/TESTING.md` calls itself "Binding for every builder" and says to update `PROGRESS.md` after every round, and `docs/BUILD_BRIEF.md` says a builder "implements from this document alone" and "THIS BRIEF WINS", while its ruling A8 still puts relics and extra classes out of scope (the game has 63 relics and 7 heroes). The real working rules live only in memory.
2. **The working rules live in the wrong place.** The slice defaults, the golden gates, the content gates (`CAMPAIGN_ONLY_*`, `gatedPool()`, `*_FREE`, `*_PREVIEW`) and Kesh's settled design decisions sit in `MEMORY.md`, a 15.4 KB coordinator log that is close to its 16 KB limit and mixes repo facts with merge procedure and message ids. They belong in a short `CLAUDE.md` in the repo, which every thread reads and which stays true for any future tool.
3. **Most "fix X first" taps fall into five classes a checklist would catch.** About twenty pre-merge fixes since plan 3 come down to: things too hard to see in the real game, a rule with no visible or audible beat, a side effect on an existing deed, count or rule, a rule applied to part of its category, and counts that are wrong for old profiles. A ten-line "before READY" checklist (below) covers all five.
4. **One recurring piece of friction is still unfixed in code.** Fifteen memory notes describe patching `--no-sandbox` into `tools/gnt-arch-browser.mjs` by hand and reverting it, and the nine golden hashes are re-recorded from the base on every thread because `captures/` is gitignored. Both are a few lines to fix once.

What to decide: whether to apply the project-instructions rewrite (the coordinator does that) and whether to open one small docs PR with the repo changes below.

## 1. Sources reviewed and their state

| Source | Size | State at v0.5.305 | Recommendation |
|---|---|---|---|
| Project instructions | 2 paragraphs | Accurate; missing the build gate and the docs/notes duties | Rewrite (section 4) |
| `CLAUDE.md` / `AGENTS.md` | none | Missing | Add (section 5.1) |
| `PROGRESS.md` | 111 KB | Frozen at v0.5.220 (2026-10-04) with a "Resume point: do this first" block and a pending "prompt audit" patch that lives only on Kesh's machine | Replace with a pointer (5.2) |
| `docs/BUILD_BRIEF.md` | 195 KB, 2,719 lines | Rulings stop at A18 (Act IV); claims to be the whole spec; A8 contradicts the game | Add a header and rulings A19+ (5.3) |
| `docs/TESTING.md` | 2,288 lines | Windows and critic-loop era (`preview_start`, Chrome 152 loopback, round critics); the Linux cloud recipe is only in memory | Add a "current recipe" section on top (5.4) |
| `docs/CONTENT_PLAN.md` | 148 lines | "slice 1 shipped, slices 2–4 planned" (plan 1) | Header line: historical (5.2) |
| `README.md` | 412 lines | Intro says three expeditions, the Healer only, three bosses | Refresh the first 15 lines (5.2) |
| `docs/I18N.md` | 6 KB | Accurate; missing the house conventions threads got wrong ("u" for units, long-name breaks) | Add a short glossary (5.5) |
| Per-system docs (`docs/KILN.md`, `RELICS.md`, …) | 45 files | Accurate where checked; they describe, they do not instruct | Keep |
| Plan docs (`/mnt/project-files/plan/`) | 5 files | Plan 5 fully merged; its slice table header carries the slice rules well | Keep; one line added to the plan template (6) |
| `MEMORY.md` | 15.4 KB of 16 KB | Accurate but overloaded; threads load it too | Split (7) |
| Per-slice notes | 100 files | Accurate per slice; some duplicates and dead links | Prune lightly (7) |
| Coordinator briefs and relays | per thread | Clear and specific; long but each line is used | Small changes (8) |

## 2. Stale or wrong text a cold thread would trip on

- `PROGRESS.md:8`: "⏸ GAUNTLET PAUSED at v0.5.220 … Resume: Workflow tools/gauntlet.workflow.js …" and "Resume point — do this first: Start the dev server with preview_start". A thread told "read the repo first" can take this as its task.
- `PROGRESS.md:8` and `:98` also queue "a prompt audit of the workflow prompts (66 findings, 55 patches) … `..\echoes-prompt-audit\prompt-audit.patch`" for after the gauntlet. That patch is not in the repo, so nobody can apply it from here. Kesh should say whether it still matters; this review does not depend on it.
- `docs/BUILD_BRIEF.md:6-10`: "A builder with NO other context implements from this document alone … Where this brief and a memory of the original docs disagree, THIS BRIEF WINS." Its later sections still say keyboard and mouse only (§3), the Healer as the only player character, an 8-room run, and A8/A11 put relics and classes beyond four out of scope. Memory already has to say "his ask overrides docs/BUILD_BRIEF.md's four-class limit".
- `docs/TESTING.md:6-15`: "the dev server must be running on 127.0.0.1:5199 … do not spawn extra vite instances … Progress log: PROGRESS.md (update after every round)". `docs/TESTING.md` also describes the Chrome 152 Windows loopback workaround as current.
- `src/version.js:2`: "Bump per block/commit per docs/TESTING.md": the real rule is one bump per slice PR, next free version from gauntlet.
- `tools/gntM2-goldens.mjs:2-4`: says the goldens were "recorded by M2 BEFORE its first edit (… from `git archive 9246562`)", while the cloud recipe note says "re-record goldens from `git archive HEAD`". Both work, but a thread meets two different instructions for the same gate.
- `cloud-probe-recipe.md` gives the browser as `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; `vfx-redesign.md` gives `/opt/pw-browsers/chromium`. Both exist today; one line in the repo should name one.
- `vfx-redesign.md` links `[[echoes-repo-facts]]`, which does not exist.
- `README.md:3-13`: "the mouse Healer leading three AI allies … eight-room expeditions … the Hollow Stag, the Drowned Heron or the Barrow Wyrm … Three expeditions". This is player-facing, so it is a defect in itself, not only a prompt issue.

Checked and true at v0.5.305: `objectivesOn()` and `championsOn()` (in `src/sim/run.js`, not `objectives.js` as `MEMORY.md` says), `gatedPool()`, `CAMPAIGN_ONLY_SKILLS/NODES`, `bossPool`, `championPick`, `STEER_OFF_POOLS`, `NAME_BREAKS`, `BELLWRIGHT_FREE`, `DUSKWING_FREE`, `ACT5_PREVIEW`, `ACT6_PREVIEW`, `CAMPAIGN_ACTS`, `legacyLayouts`, and the version 0.5.305.

## 3. What the fix-first taps say about the briefs

These are the pre-merge fixes Kesh asked for, from the per-slice notes (plan 3 onward). Each class ends with the line that would have caught it before READY.

| Class | Taps | What happened | Would have caught it |
|---|---|---|---|
| **A. Hard to see in the real game** | Fix hurler size (#84), Fix Cinder look (#85), Fix Kiln look (#81), Soften all champions (#71), Fix small names (#78), Fit side panel (#70); the Bell Abbess pale on a pale floor was caught by its own thread | Threads judge looks from software-rendered frames at about 1 fps, often close up or alone in an empty room | A readability shot: the new thing at normal play zoom, on its own land's floor, in a busy fight, beside the nearest existing thing of its kind; any new UI text in German or Russian at 1024x640 |
| **B. A rule with no beat** | Dulled Edge beat (#72), Cap Matron heal (#68), Heal pilgrim (#52), Show Take (#51), Fix Hourwarden (#83, a missing instrument is silent, not an error), Fix hero lines (#82) | The rule worked in the sim but the player could not see or hear it fire, or a new land had no line for the newest heroes | "Every rule the player gains or suffers shows a visual and plays a sound at the moment it fires; a new land, boss or verse gets a line for every hero, the newest included" |
| **C. Side effect on something that already exists** | Windfall Herald-only (#76), Shrines unchanged (#74), Separate co-op best (#73), Fix counter (#89), Crown Shard pays Glint (#87) | The thread widened a deed, changed a shrine rule, merged a record or changed a total, then listed it as an open choice. For #87 it built a different relic than the plan line and listed the plan's version as the alternative | Invert the default: **build the plan line as written; offer the alternative as an open choice.** Never change an existing deed, record, total or rule unless the slice line names it |
| **D. Applied to part of its category** | Steer round slag pools too (#86), Fix beds first (#88, champion beds only, then every bed) | A rule keyed on a list covered the case in front of the thread, not every member | "When a rule applies to a kind of thing (pools, beds, elites, heroes, lands), list every member from the data and say which it covers" |
| **E. Counts wrong for old saves** | Fix recount (#90), the "Felled: 1" line in #89 | A new counter showed a made-up number for profiles that played before it existed | "For anything a profile counts, say what an old profile shows, and never show a number the game did not record" |
| F. House conventions | Fix unit text (#79, "u" in every language) | The convention was not written anywhere a thread reads | A glossary in `docs/I18N.md` (5.5) |

Two observations about the brief itself. The briefs already say "keep slices to what was asked (side effects out, or listed as open choices)", and threads followed the letter of that by building the side effect and listing it. The rule needs the inversion in class C. And the READY replies already have an "Open choices" section; when Kesh taps one, it usually means the thread should have built the conservative version, so the conservative version should be the default.

## 4. Project instructions: proposed rewrite

The current text is accurate. It is missing the build gate, the doc and note duties, and the readiness checklist that would cut the fix-first round trips. Proposed text (the coordinator applies it if Kesh agrees):

> Project owner Kesh (GitHub keshliew96-afk) runs this project through a coordinator in the project chat. Read `CLAUDE.md` in the repo before any work; it holds the conventions, the gates and the settled design decisions.
>
> Each slice is one draft PR into gauntlet from its current head: the version bumped in `src/version.js`, all new text in all ten languages, one probe for the feature, the nine goldens byte-identical, `npx vite build` clean, screenshots under `/mnt/project-files/<slice>/`, the system's doc under `docs/` updated, and a note under the memory directory.
>
> Build the plan line or the ask as written. Where you think it should differ, build it as written and offer your version as an open choice. Never change an existing deed, record, total, counter or rule unless the ask names it.
>
> Before you say READY, check the list in `CLAUDE.md` ("Before READY"): readability shots, a beat for every rule, every member of a category, old profiles, and the house conventions.
>
> Merging: (unchanged from the current text.)

## 5. Repo docs: proposed changes (one small PR, docs plus one tool flag)

### 5.1 Add `CLAUDE.md` (about 80 lines)

Moves the durable half of `MEMORY.md` into the repo. Proposed outline, with the text mostly lifted from `MEMORY.md` "Slice defaults" and "Repo facts":

```markdown
# Echoes: working on this repo

Current game: see the counts in this file's "Game today" list; the per-system docs under docs/ describe each system.
Historical, do not follow as instructions: PROGRESS.md, docs/CONTENT_PLAN.md, docs/gauntlet/, docs/critiques/, the round/critic sections of docs/TESTING.md.
docs/BUILD_BRIEF.md is the original spec; its rulings A1-A18 still hold where the rulings below do not replace them.

## Slice rules
- One draft PR into gauntlet from its current head. Version: next free patch in src/version.js.
- New text in all ten languages (docs/I18N.md). One probe. Nine goldens identical. `npx vite build` clean.
- Gates that keep the goldens identical: new content is campaign-only or from room 4 on
  (CAMPAIGN_ONLY_* and gatedPool() in src/data/classes.js; objectivesOn()/championsOn() in src/sim/run.js;
  the campaign tables of src/data/levels.js, never legacyLayouts; third bosses `gated: true`, `endlessOnly`, `rushLap: 2`;
  champions by championPick(seed, index, act); late affixes in src/sim/affixes.js).
- A new hero stays free behind *_FREE in src/data/lineup.js until its world slice; a new land behind *_PREVIEW in src/data/levels.js until its bosses slice.

## Before READY
1. Readability: shot the new thing at play zoom, on its land's floor, in a busy fight, beside the nearest existing thing of its kind. New UI text also in de or ru at 1024x640.
2. A beat: every rule the player gains or suffers shows a visual and plays a sound when it fires (a missing music instrument is silent, not an error). A new land, boss or verse has a line for every hero.
3. Scope: built as the line says; anything else is an open choice. No existing deed, record, total, counter or rule changed unless asked.
4. Category: a rule about a kind of thing covers every member in the data; the reply names them.
5. Old profiles: anything counted on a profile says what an old profile shows; no invented numbers.
6. Colour: Ember #FF5A36 for enemy threats only, Bright Heal #5FE873 for healing only, Violet #B79CF0 for corruption only; land heat colours are not Ember (BUILD_BRIEF §19, §23).

## Settled decisions (Kesh's own picks; do not reopen)
(The SETTLED list from MEMORY.md, as rulings: lineup chooses who joins; Level V fork Spire or Kiln, run stays 40 rooms;
shrine sleeps at room clear; boss arena boss-only; Windfall Herald-only; Crown Shard pays Glint; AI and autopilot steer round
every slowing bed, the human hero never steered; Bestiary total counts creatures only; old powers keep the not-counted note.)

## Running things in a Linux cloud session
(The cloud-probe-recipe note: browser path, ECHOES_CHROME_ARGS, software GL timing, domcontentloaded, goldens.)

## Map
(The "Repo facts" map from MEMORY.md, as is.)
```

### 5.2 Mark the stale files as history

- `PROGRESS.md`: replace the whole file with three lines: "This log stopped at v0.5.220 (2026-10-04). The current state is in CLAUDE.md and git history; the old log is in git at <commit>." Keeping 111 KB of round logs in the tree costs every thread that greps.
- `docs/CONTENT_PLAN.md`: first line "Plan 1, historical. Plans 2–5 are in the project files."
- `README.md`: refresh the intro and the feature bullets to seven heroes, five levels with the Spire-or-Kiln fork, 17 bosses, Endless, Daily, Boss Rush, ten languages, co-op.

### 5.3 `docs/BUILD_BRIEF.md`

- Replace the "builder with NO other context" and "THIS BRIEF WINS" sentences with: "This is the original spec. Later rulings (A19 on) and the per-system docs replace it where they differ; CLAUDE.md lists the current working rules."
- Add rulings A19 to A2x for what has been decided since Act IV: relics, curses and more heroes in scope (supersedes A8/A11 there); Level V and the fork; seven heroes and the lineup rule; the gamepad; and the settled list above. Each one short, as A15–A18 are.

### 5.4 `docs/TESTING.md`

Add a section at the top, "Current recipe (cloud and local)": the slice gates, the Linux browser line, the goldens command and where its baseline comes from, and "the round, critic and Windows sections below are historical". Fix `src/version.js:2` to say "one bump per slice PR".

### 5.5 `docs/I18N.md`: house conventions

Add under "Proper nouns":
- Distances read "u" in every language (never m, ед., 单位).
- A long one-word name (de, ru, es, fr) gets a `NAME_BREAKS` entry in `src/ui/run/classpick.js`; names shrink at most 20%.
- New deed, relic and power text says its numbers the same way the existing rows do.

### 5.6 Two tool fixes that stop repeated workarounds

- `tools/gnt-arch-browser.mjs`: read extra Chrome flags from `ECHOES_CHROME_ARGS` (the newer probes already do). Fifteen notes describe adding `--no-sandbox` by hand and reverting it.
- Goldens: commit the nine expected hashes (for example `tools/goldens.json`, written by `gntM2-goldens.mjs --record`) so a fresh clone checks against fixed values instead of re-recording from its own base. If Kesh prefers not to touch tools, at least make the tool header and the recipe say the same thing.

These are small and only touch `tools/`; the goldens themselves do not change.

## 6. Plan docs

`CONTENT_PLAN_5.md` is the best-steering text in the project: its slice table header states every gate and its one-line briefs are specific. Two additions for plan 6:
- Under each slice line, a "Beats" half-line naming what the player sees and hears when it fires (class B), and, where the slice touches an existing system, "Leaves alone:" (class C).
- The plan's counts table should be regenerated from the data at the plan's commit, as plan 5 did; it is the only counts table that is right.

## 7. Memory

- `MEMORY.md` is 15.4 KB against a 16 KB hard limit, and every thread loads it. Keep it for the coordinator's live state: the status, the ship rule, the merge gate, the card habits. Move "Slice defaults", "Repo facts" and the SETTLED list to `CLAUDE.md` (5.1) and leave a one-line pointer. That frees about 5 KB.
- Fix `objectivesOn()` "in src/sim/objectives.js" to `src/sim/run.js`.
- Prune: `plan3-escort-hold.md`, `plan3-more-event-rooms.md` and `plan3-new-layouts.md` duplicate the slice notes; `content-slice-1.md`, `content-slice-2.md`, `room-layouts-slice2.md` and `gp13d-level1-open.md` describe plan 1 work. Drop the dead `[[echoes-repo-facts]]` link.
- Each slice note's "Open" line is where the next fix round's brief comes from, and it works. Keep that.

## 8. Coordinator briefs and relays

The briefs read well: they name the plan line, the notes, the version, the base commit and what stays as built. Three changes:
- Replace "keep slices to what was asked (side effects out, or listed as open choices)" with the class C sentence: "Build it as written; offer your version as an open choice."
- Add "Run the Before READY list in CLAUDE.md" instead of restating gates the instructions and `CLAUDE.md` already carry. That shortens each brief.
- Fix-first relays already restate the full merge procedure each time. Once `CLAUDE.md` and the instructions carry it, the relay can be the tap, the change, and "then merge as usual".

## 9. Left out on purpose

- The code itself: the sibling Code review thread covers it.
- The ship rule, merge gate and card rules: they work, and they are the coordinator's to run.
- Tuning numbers and design choices still open in memory: they wait on Kesh playing.
