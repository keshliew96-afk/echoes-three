# Meng To's "Dark Souls game in 3 days" post: what it says, and what Echoes could take

Read 2026-11-15 for Kesh's link https://x.com/MengTo/status/2121896633848017145 . Research only; nothing in the game changed.

## What could be reached

- **The first post and its video.** yt-dlp fetched both. The post says: "I made a Dark Souls inspired game in 3 days with Three.js and Claude Fable 5.2. Runs in the browser with full lighting, effects and sound. No build step. Stack: Fable 5.2 + Opus 5.5 in Claude Code, Seedream 5.0 Pro, Tripo 3D. Full workflow and prompts below (1/10)". The video runs 99 s: a knight on castle ramparts, an inventory and map menu, a dragon that breathes fire, a fog gate, a boss called "Stormwrought Sentinel", and a "You have fallen" screen.
- **Not reached:** posts 2/10 to 10/10 and the 106 replies. They need a signed-in X API, and the cloud network refused fxtwitter, vxtwitter, nitter, xcancel, threadreaderapp and the Korean summary site. Claude in Chrome was not connected.
- **Used instead:** his public skills repo, https://github.com/MengTo/Skills (last commit 14 Nov 2026). It holds the game workflow, rules and prompts under `agent-skills/game-development/` and `agent-skills/game-combat/`. I am guessing that this is what the thread links to; I have not checked it against the thread.

## His steps

1. **Concept image first.** It is photoreal, front-on and orthographic, lit flat and evenly on plain grey, with no rim light or hard shadow, since anything lit gets baked into the texture. The figure stands in an A-pose with the arms 35 to 45 degrees off the body and a clear gap at the hips, and holds nothing in its hands. "A weak concept cannot be rescued later."
2. **Image to 3D, then rig.** The rig has 24 Mixamo-style joints. He keeps the high-detail unrigged source beside the runtime file.
3. **Pose in code by direction.** He aims each bone at a world direction rather than setting Euler angles, then checks the hand-to-hip gap on the skinned mesh.
4. **Lighting makes the realism, not polygon count.** Dark scene, cool key, warm fill, two rim lights, ACES. At 310k and 150k triangles the model looked the same.
5. **A written animation standard with numbers, and a test for each number,** measured on the real skinned mesh on every frame:
   - elbow 10 to 152 degrees; wrist bend 50 or less; arm raise 105 or less;
   - skin stretch at most 2x and crush at most 3x;
   - no dead hold over 0.25 s; feet never slide;
   - the strike is the fastest part, and hips lead the chest, which leads the arm.
6. **Blind judging.** Two fresh critics score on a fixed rubric (5 criteria from 0 to 2), and the lower score counts. A blind A/B runs against the last release. He checks every critic claim against full-resolution frames before changing anything ("critics misread thumbnails").
7. **Film casts on a frozen clock stepped 0.05 s,** then build contact strips (timing) and close-ups (art). Scores run separately for readability and art.
8. **Levers that raised skill scores:**
   - the result lands when the blow arrives, not on the click;
   - each skill has its own schedule and keyed move;
   - hero props come from a painted concept through image-to-3D, where scripted primitives plateau at 5.5 to 6.5.
9. **One manifest per actor:** source and licence, sockets, and each clip with its contact events and loop policy. A script validates it. Equipment is kept separate from the body.
10. **Ship proof.** He opens the deployed game and checks load, first input, a fight and the console, and reports that separately from local checks. Players get an in-game changelog.

## Against Echoes

**Already the same or stronger here**

- One Tripo model per creature.
- A review page per model, with written standards per kind (`docs/tripo/`).
- Kesh's dash, no-splay and planted-feet rules.
- Budgets, goldens, `npm run check`, the feature freeze and the gates in CLAUDE.md.
- The four-view turnaround sheet flow.
- High-detail GLBs kept beside the packed ones (`docs/TRIPO_MODELS.md`).

**Different on purpose**

- He goes photoreal on 150k to 310k triangles. Echoes keeps its toon look on 4k to 30k triangles.
- He uses Meshy or Tripo through the Fil API. Kesh uses Tripo Studio by hand.
- He has no build step. Echoes uses Vite.
- His game is a 3-day single-player vertical slice, not a full campaign.

**Gaps**

- Our review rules are judged by eye on the pages. His are numbers that a script checks on every frame.
- No blind second opinion.
- No per-model manifest.
- No check of the live site after Manual Deploy.

## The full thread (from Kesh's screenshots, 2026-11-15)

1. **Get it playable.** He gave Fable 5.2 one prompt, along with three skills: @anshuc's dream-loop, and his own workflow-score-to-target and design-action-combat. After 6 hours and 12 prompts he had a playable level and a boss.
2. **Split it across agents.** Fable 5.2 coordinates side threads on Opus 5.5, one per area: lighting, effects, characters, props, UI and sound. Up to nine run at once, and each owns its files.
   - Sound comes from his Seerveil library plus the earshot skill (github.com/Leonxlnx/earshot). earshot gives agents ears: it describes a sound in words, scores how well it fits a description, and checks that a hit sounds on its frame.
3. **Make the models.** Seedream 5.0 Pro draws each concept in a strict A-pose on grey, and Tripo 3D turns it into a GLB. 29 are in the game. They arrive unrigged, so the agent wrote the rig and the animations in code.
4. **The dream loop** (github.com/achimala/dream-loop).
   - Seedream repaints a game screenshot as the target. The prompt says to keep EXACTLY the same camera, framing, layout and pose, only better rendered.
   - The agents then chase the target, and a separate critic compares each live screenshot with it.
   - The repo warns not to call the target "concept art". It should read as a real in-engine screenshot.
   - Rocks, pots and stone are free CC0 scans from polyhaven.com.
5. **UI.** His prompts:
   - "Give me a UI concept for the bottom bars as well, for the entire UI of the game"
   - "Build it"
   - "use more border gradients/uneven/shadowy/noisy"
   - "generate transparent pngs for these icons"

   The icons are transparent PNGs from Seedream.
6. **Judge every change blind.**
   - Every change gets a 4K before-and-after from the same camera. A fresh judge sees them shuffled as X and Y, and only wins or ties are kept.
   - Full rounds use two judges and a rubric out of 10. The lower score counts, and the target is 9.

**His real prompts were short:**
- "keep working until 8 out of 10"
- "Always give me the screenshots before/after, video before/after for animations"
- "show the boss. the slashes are still wrong..."

**"Not perfect though":**
- The video is a scripted bot, and every scene is set up.
- Strict judges score most of the game 5 to 6 out of 10.
- It takes over 10 s to load.
- The walk was rejected 4 times before he approved it.

**Links he gives:** fil.design, threeui.com, dream-loop, earshot, github.com/MengTo/Skills.
