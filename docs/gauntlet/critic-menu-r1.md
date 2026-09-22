STATUS: PARTIAL
(verdict pending)

# Critic report — MENU & SCREEN SETTINGS, gauntlet round 1

Started. Steps will be appended as completed.

## STEP 1 — BLIND BENCHMARK CHECKLIST (written before any Echoes capture was inspected)

Written purely from knowledge of the named shipped systems: Hades (Supergiant), Celeste,
Hollow Knight, Slay the Spire, and Unreal/Unity shipped-game settings conventions.
Timestamp: start of run, before the first capture was taken or read.

### A. Title screen layout & presentation (Hades, Hollow Knight, Celeste)
- A1. Title screen shows a game logo/wordmark plus a vertical (or clearly grouped) list of
      primary actions. Hades: Begin/Continue, Settings, Extras, Quit. Hollow Knight:
      Start Game, Options, Achievements, Quit. Celeste: Climb, Options, Quit.
- A2. The list is short (4-6 entries). Secondary/rare options are nested, never crowding the root.
- A3. The default/most likely action is pre-focused on arrival (Hades pre-selects Continue when
      a save exists; Hollow Knight pre-selects Continue). "New Game" is NOT pre-selected when a
      save exists, because it is the destructive choice.
- A4. Unavailable entries (Load Game with no saves) are visibly disabled/greyed, not missing and
      not silently dead — Slay the Spire greys "Continue" when no run is in progress.
- A5. A build/version string is visible somewhere on the title (all four shipped games show one).
- A6. Layout survives 16:9 at low (1024x576) and high (2560x1440) resolutions: no clipping, no
      overlap, type stays legible (≥ ~14 CSS px equivalent at the smallest size), safe margins kept.
- A7. Title screen has living presentation (animated background / music), not a static flat card.

### B. Navigation model (all four + Unreal/Unity conventions)
- B1. Keyboard alone can reach and activate every entry: Up/Down (and/or W/S) move, Enter/Space
      activates, Esc/Backspace goes back one level.
- B2. Mouse alone can do the same: hover highlights the row (and moves the logical selection, so
      the two input models never disagree), click activates.
- B3. Gamepad alone can do the same: D-pad/left-stick move, A/Cross activates, B/Circle backs out.
      Stick input is treated as discrete steps with a repeat delay, not one step per frame.
- B4. Exactly one visible focus indicator at all times; it never disappears, never duplicates,
      and is visible without relying on colour alone (Hades: pointer + scale; Celeste: highlight
      bar; HK: ornament). Switching input device moves the single indicator rather than adding one.
- B5. No focus trap: Esc/B from any sub-screen returns to the parent, and repeated Esc eventually
      lands back on the title. No screen can only be left by mouse.
- B6. Wrap-around or hard-stop at list ends is consistent across every menu (pick one, keep it).
- B7. Opening a submenu focuses its first/last-used row; returning to a parent restores the row
      you came from (all four do this; it is the single most-felt navigation polish item).
- B8. Input-to-visual latency on a menu press is ≤ ~100 ms (2 frames of audio+visual response;
      Hades/Celeste respond on the same frame with a click sound).
- B9. Menu actions have audio feedback: a move sound distinct from a confirm sound, and a
      back/cancel sound (all four).

### C. Display settings behaviour (Unreal/Unity shipped conventions + the four games)
- C1. Resolution / render-scale control exists and measurably changes the rendered pixel count —
      not just a label. Unity/Unreal ship a "Resolution Scale" slider (e.g. 50-100%+) that changes
      the render target; the UI stays crisp while the 3D image softens.
- C2. Windowed / Fullscreen / (Borderless) toggle actually changes the window/display mode, and
      the game re-lays-out correctly at the new size within a frame or two (no stretched or
      letterboxed-forever state).
- C3. Fullscreen state stays in sync when the OS/browser leaves fullscreen by itself (Esc, alt-tab,
      window manager). The menu must re-read the true state, never show a stale "On".
- C4. V-Sync toggle exists, and the presented frame cadence measurably changes (locked to refresh
      vs free-running). If the platform cannot honour it, shipped titles grey it out and say why.
- C5. Frame-rate limit with discrete options (e.g. 30 / 60 / 120 / Unlimited) that measurably caps
      rendered fps within a few percent, and that is independent of V-Sync.
- C6. Changes preview instantly (Unreal/Unity modern convention) OR are applied with an explicit
      Apply; if a mode change can black-screen the user, a revert timer ("Keep these settings?
      Reverting in 15s") protects them. Either model is acceptable, but it must be stated in the UI.
- C7. Every setting persists across a full restart and is re-applied on boot before the first
      visible frame (no flash of the wrong mode).
- C8. Corrupt/absent settings data falls back to defaults and still boots — never a crash, never a
      wiped profile.
- C9. Settings show their current value as text/number, not just a slider position.
- C10. "Reset to defaults" exists per tab or globally (Unreal/Unity standard).
- C11. A setting that the platform cannot truthfully deliver is labelled honestly rather than
      shipped as a placebo toggle. (Binding project rule; also what a shipped game does when a
      GPU feature is unsupported.)
- C12. Changing display settings from inside a run does not break or desync the run.

### D. State transitions / lifecycle (Hades, Slay the Spire, Celeste)
- D1. New Game from the title starts an actual run with no leftover state from a previous session.
- D2. Load/Continue is distinct from New Game and never silently overwrites a save.
- D3. Quit/Exit is honest about what it can do on the platform. On PC it exits the process; a
      platform that cannot exit must say what it will do instead and confirm destructive loss.
- D4. Quitting/starting a run asks for confirmation when unsaved progress would be lost.
- D5. Losing window focus while in a menu does not strand input (no stuck keys / runaway repeat).
- D6. Returning from a run to the title leaves the title fully functional again (no dead menu,
      no doubled audio, no leaked render loop).

### E. Robustness
- E1. No uncaught page/engine error in any menu flow.
- E2. Rapid input (mash confirm, mash Esc) does not open two screens or leave an orphan overlay.
- E3. Resizing the window while a menu is open re-lays out without clipping.

## STEP 2 — layout probe (G1.1) — DONE
Tool tools/gntcmenu1-layout.mjs; captures/gntcmenu1-layout-{1024,1600,2560}-{title,settings-tab0..4,confirm}.png
- Title at all 3 sizes: 6 items, 0 issues, rings=1, minFont 22.5/25.0/40.0 px, minHit 352x43 / 391x53 / 626x85. 0 page errors.
- Settings Display/Gameplay/Controls tabs: 0 issues at all 3 sizes (minFont 18/20/32 px).
- Audio tab: scroll container; my raw-rect test flagged rows below the fold, verified as scrolled-out, not clipped (see STEP 3 tabwalk in-view).
- Network tab @1024x576: hit targets 390x36, 305.8x36, "Check" 85x36 -> below the G1.1 40 px floor (ok at 1600/2560: 91.7x40 / 146.7x64).
- The only <14 px font found is an empty-text <input type=range> (13.33 px default), no readable type below floor.

## STEP 3 — navigation probe (G1.2) — DONE
Tools tools/gntcmenu1-nav.mjs + gntcmenu1-nav2.mjs; captures/gntcmenu1-nav.log, gntcmenu1-nav2.log
- Keyboard only: title walk, Enter opens settings, Q/E tabs, Esc back, Esc at root = no-op, Backspace = back. rings=1 on all 12 samples.
- Mouse only: hover moves logical focus, click opens, right-click = back, Back button exits. rings=1 on all 5 samples.
- Mocked gamepad only (navigator.getGamepads stub, standard mapping): stick down = 1 discrete step, d-pad 12/13 move, A opens, B backs, LB/RB switch tabs. rings=1 on all 9 samples.
- Esc from settings/saves/records/mp-menu/confirm/keep-display/farewell/expedition -> exactly one level (stack back to ["title"]). lobby: Esc opens a leave-confirm instead (MP screen, defensible) and app.back() then loops lobby<->confirm forever - noted, not this module.
- Every settings tab's ArrowDown cycle reaches every row and wraps: Display 7, Audio 12, Gameplay 5, Controls 3, Network 4 unique ids; focused row always inside the scroll box (in-view true).
- Focus restore on return: before/after = ap-title-settings (ok).
- Mash 6x Enter -> exactly one settings screen; mash 6x Esc -> title. 50 random nav actions: 0 ring violations, 0 traps, 0 page errors. 8x Esc at root: stays on title.
- Oddity: the ArrowDown cycle enters the tab strip at ap-tab-network (the LAST tab) rather than the selected tab, on every tab; "Back" is not in the vertical cycle on 4 of 5 tabs (Esc and mouse still work).
