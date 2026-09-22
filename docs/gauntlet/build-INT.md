STATUS: PARTIAL
INT (integration, W5) — in progress. Scope: pause menu, full journey, cross-module
wiring, dev-chrome gating, production build, core-loop regression.

## Steps (append as completed, with evidence)

### Step 1 — pause menu (commit 21aaef9, v0.5.52) DONE
- NEW src/ui/menu/pause.js (screen id `pause`, layer overlay, CSS prefix `pz-`),
  registered + Esc/P listener in main.js `@gnt:INT-WIRING` (bubble, last,
  `!e.defaultPrevented`, 150 ms fullscreenchange guard).
- Evidence captures/gntINT-esc-pages.console.txt: pause opens with stack
  ["pause"], simPaused true, ringCount 1, focus pz-resume from combat
  (tick 498), draft (716), path (975), shop (1129), end card (1316); the page
  underneath stays open (page draft/path/shop/end) and the draft candidate is
  still `spirit_bolt` after Resume. Socket: 1st Esc closes it and opens NO
  pause (socket false, stack []), 2nd Esc opens pause.
- Camp: captures/gntINT-pause-camp.png; ticks while paused 480 -> 480 (0
  elapsed), resume 523 -> 554 in 500 ms (60 Hz).

### Step 2 — production build + dev chrome (commit ab1f884, v0.5.53) DONE
- vite.config.js: es2022, no sourcemaps, advancedChunks group `three`
  (600.59 kB / 150.46 kB gzip) split from the app chunk (1187.88 kB / 392.99 kB
  gzip); preview host 127.0.0.1; chunkSizeWarningLimit 1300.
- GI.4: `npx vite build --outDir dist-int` + `vite preview --port 4310` ->
  captures/gntINT-prod-loop: camp tick 533 -> portal 688 -> combat room 1 at
  707 -> reward at 900, 0 [PAGEERROR], 0 console errors.
- GI.5: captures/gntINT-devchrome.console.txt on the plain player URL — fps
  meter display:none at boot/title/playing, showFps=false, no #debug-overlay,
  version label "v0.5.52" 12 px at (10,870). `?fps=1` -> meter block.
  `.ix-blocked` is opacity 0 (fade rig), not visible chrome.

### Step 3 — GI.3 audio cue audit (commit c0d6d4c, v0.5.54) DONE
- NEW tools/gntINT-cueaudit.mjs (audio harness profile, autoplay flag).
  captures/gntINT-cueaudit.json: 12 live cases, every one pairs its sim event
  with a `sound` within 2 ticks — elite_spawn/roar, hazard_telegraph/telegraph,
  hazard_resolve/m4b_spore, keg_ignite/m4b_fuse, keg_blast/m4b_blast,
  bell_ring/m4b_bell, sluice_toggle/m4b_lever, dewfont_drink/m4b_drink,
  interact_denied/deny, status_apply(stun)/mark, skill_cast+skill_bolt_spawn/
  cast_heal+cast_damage+bolt (real Digit1-4 presses), room_cleared/room_clear.
  12/12 deeper handlers subscribed (resonance_proc, split_shard, shield_absorb,
  technique_pulse, skill_bolt_pierce, hit_blocked, echo_recast, broken,
  waystone_spawn, siphon_*). 0 page errors.
- Decision D1: 40 event types are cue-less BY DESIGN, each with a written
  reason in the tool's SILENT table (e.g. `interact` would double the
  interactable's own outcome cue; `hazard_spawn` is silent because
  hazard_telegraph warns; status_apply(slow|ward|exposed|inspired) refreshes
  every pulse).

### Step 4 — GI.1 full journey (commit 3ebaff7, v0.5.55) DONE
- NEW tools/gntINT-journey.mjs (multi-page profile; MP pages in their own
  browser contexts so their ?fresh=1 cannot wipe the journey page's storage).
- captures/gntINT-journey.json: 38/38 checks, 0 page errors. Highlights —
  B2 renderScale 1.00->0.75 buffer 1600x900 -> 1200x675; B2b Keep/Revert asked
  on tab change; B4 master 0.8->0.4, bus -3.22 -> -13.22 dB; E1 draft
  kindred_shield taken by Enter; F3 slots manual-1 + auto-1 written from the
  pause menu; G1 Quit to Title confirmed; H1 Continue restores room 1, phase
  path, wallet, 3 skills AND the run seed; I1 profile runs 0->1, high scores
  0->1, best 2046; J3-J10 host+guest session through the menus and both leave
  to the title; K1/K2/K3 settings, saves and profile survive a reload.
- Decision D2: the pause menu's Leave Session (MP) replaces Save & Quit /
  Quit to Title; Save and Load stay VISIBLE but disabled with the service's
  own reason ("Only the host can save an online session").

### Step 5 — GI.6 regression (commit ab27dc9, v0.5.56) DONE
- NEW tools/gntINT-regress.mjs (GPU harness). captures/gntINT-regress.json:
  10/10. Rooms 1:kill_all 2:kill_all 3:defend 4:kill_all 5:defend 6:kill_all
  7:shop 8:boss -> victory end card; draft_taken 6, path_chosen 5,
  room_cleared 7 — all by real keys. keydown-to-move [1,1,1,1,1] ticks;
  dodge dashTicksLeft 15 with keenProbe -> hit_immune and hp 100 -> 100;
  75 telegraph spans, min 42 ticks (0.70 s), median 60; frames 17498 after
  warm-up, max 97 ms, over100 0, p50 12.1 ms, p95 18.2 ms, 86 fps; 0 page
  errors.
- REFERENCE_BAR frames (captures/gntINT-rb-{camp,combat,boss}.png), analyze:
  camp LUMA >160 2.751 / >200 0.941 / 16 buckets / FLAT 1.78%;
  combat 4.694 / 0.625 / 15 / 1.56%; boss 3.311 / 1.207 / 16 / 1.56%.
  Builder self-score (a fresh critic scores independently): camp 18/20,
  combat 19/20, boss 19/20, no zero.
- Decision D3: the harness mutes its frame-time sampler around its own
  screenshots — a puppeteer capture stalls the page up to 1.6 s and is not a
  game hitch (the first run's "1667 ms frame" was exactly that).
