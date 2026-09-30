STATUS: PARTIAL
(round-6 journey critic in progress; started 2026-10-01)

# Critic — Journey r6

## Steps log
- step 0: checkpoint created (no previous r6 file existed).

## 1. Blind benchmark checklist (written BEFORE inspecting any Echoes capture of this round)

Systems: the first-hour flow of Hades, Dead Cells and Slay the Spire (for the co-op leg only: the lobby flow of shipped co-op roguelikes, e.g. Risk of Rain 2 / Hades II-era co-op mods are not relevant, so RoR2). Every item is concrete and testable in a browser build.

| # | Benchmark item (how the shipped games behave) | Test used on Echoes |
|---|---|---|
| B1 | Boot reaches an interactive title in a few seconds with no error dialog; any wait > 1 s has a progress/loading indicator; nothing plays before the first input on platforms that forbid it. | ms navigation -> title-interactive; page errors 0; audio state before gesture |
| B2 | Title: Continue exists only when a save exists and is then the default focus; otherwise New Game is. A visible focus ring follows keyboard, mouse hover and pad. | title with / without save; focus; arrows / Enter / click |
| B3 | Settings apply immediately (display changes the picture, audio sliders are heard at once) and persist across a restart. | 1 display + 1 audio setting by real input; measurable effect; reload persists |
| B4 | New Game over an existing run/save asks before discarding it (StS "abandon run?", Hades save profiles). | New Game with a live save |
| B5 | New Game lands in the hub (House of Hades / Prisoners' Quarters / Neow) with visible interaction prompts. | camp frame, prompt text, ms to control |
| B6 | Starting a run from the hub is one action, covered by a fade, no picker when the design has none, no hitch. | portal E -> Level 1 room 1, frame gaps |
| B7 | In-run control is instant (1-2 frames); the dodge has i-frames; enemy attacks carry readable wind-ups (~0.5-1 s). | keydown->move ticks, dodge immunity, telegraph ticks |
| B8 | Pause (Esc / Start) freezes the sim at once, ducks audio, offers Resume / Settings / Save / Quit; Esc resumes; no input leaks into play on Resume. | ticks while paused, music level, items, action leak |
| B9 | Save & Continue restores exactly: same room, HP, build/deck, currency, seeded rewards (StS keeps the reward seed). | save slot -> title -> Load -> state diff / hash |
| B10 | Quit to title leaves nothing of the run running; title music returns; Continue now offered and focused. | voices / entities / focus after quit |
| B11 | After Continue the HUD is right and the first keypress acts (no swallowed or doubled input). | first key after load moves |
| B12 | Act / biome transition (StS act banner, Dead Cells passage, Hades Styx gate): brief, skippable, the build carries, a respite restores, the next area loads without a hitch and starts on its own. | card copy, auto-advance ~3 s, Enter skip, carried-build equality, HP full, leftovers 0, frame gaps |
| B13 | Final victory: a victory / summary screen is shown over the finished run, THEN the game returns to the hub (Hades credits -> House; StS victory -> score -> menu). | victory frames: world behind the card, then camp |
| B14 | Death: a run summary that says the run was lost (StS "Defeat" score screen, Dead Cells death stats, Hades "you died" -> House), laid out legibly, then the hub; the dead run cannot be Continued. | wipe -> defeat card copy + layout -> camp; Continue target |
| B15 | Run history / statistics reflect the run just played at once. | records before / after |
| B16 | Unlocks persist; locked content is shown locked with the reason and cannot be started by any input. | level select after L1 clear: L2 open, L3 locked + reason; keys / mouse / pad / API refuse |
| B17 | Abandon / give up from pause asks to confirm, then returns cleanly to the hub; the abandoned run is gone. | Quit to Lobby confirm, camp clean, leftovers 0 |
| B18 | Music is contextual (title / hub / combat / boss / victory) with crossfades, never stacked tracks, never a hard silence gap, never clipping; volume settings honoured everywhere. | per-context music gain / theme, stacking, peaks, silence samples |
| B19 | Confirm / Back consistent on every screen (Enter/Space confirm, Esc back, pad A/B); what is highlighted is what Enter takes. | per-screen key test incl. reward swap offer |
| B20 | No dead ends / soft-locks: every screen has an exit; closing the app is handled honestly. | every visited screen has a back path; Exit |
| B21 | Co-op lobby: host creates a lobby with a code, a guest joins and is listed, host starts, both play; leaving returns to the menu and the other side is told once. | host + headless guest; start; leave -> title |
| B22 | Frame pacing: steady 60 fps, no > 100 ms hitch after warm-up, including across transitions. | frame trace |
| B23 | Losing focus (alt-tab) auto-pauses single-player (Hades / Dead Cells). Browser equivalent: blur / visibility-hidden pause. | tab switch probe |
| B24 | Save slots show metadata (where, when, playtime) so the player knows what they load; a save confirmation is shown. | slot text, toast |
| B25 | Full-inventory reward (StS full potion belt / Dead Cells swap-on-pickup / Hades boon replace): the player is asked which item to replace or may skip; the highlighted choice is the one taken; skipping keeps the loadout intact. | swap offer by real keys: pick a slot + Enter; decline |
| B26 | A party / multi-character build screen says clearly whose card or slot it is and switches characters fast by keyboard, mouse and pad, without the layout jumping. | reward / socket / shop owner labels, switch keys, layout movement |
- step 1: blind benchmark checklist B1-B26 written before any Echoes capture of this round was viewed.
