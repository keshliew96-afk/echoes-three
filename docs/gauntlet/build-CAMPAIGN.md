STATUS: PARTIAL
CAMPAIGN builder checkpoint (linear campaign refactor). Started 2026-09-25 at v0.5.87 (HEAD ae07ba9).

## Steps
- [ ] 0. Checkpoint created; reading PLAN/BUILD_BRIEF/TESTING/source.
- [x] 0. Read PLAN / BUILD_BRIEF / TESTING / run.js / camp.js / arena.js / save / net / pause. Baseline: 9/9 Node goldens match at v0.5.87 (node tools/gntM2-goldens.mjs).

## Decisions (where PLAN was silent)
- D1 Sim owns the campaign (run.js): deterministic, saved, replicated. New phase `transit` (level-clear card + level-N depart card). `runSys.view()` shape is UNCHANGED (campaign data via `runSys.campaign()`), and no new event fires before a level clear, so the 9 Node goldens stay bit-identical.
- D2 Harness single-level runs keep their legacy contract: `cmd('startRun', {act})`, `?run=1`, `skipToRoom` with no run, the act runner and simtrace = ONE level (Stag clear -> victory -> camp). Campaigns start from the portal (L1), the Level Select (L n), `?level=N`, `cmd('startCampaign')`.
- D3 Every start at level N>1 (campaign or single) applies the documented starter grant, so the act runner measures "a Level-N start with the grant".
- D4 The card is sim-timed (min 3 s auto / 0.5 s skip) but the HOST presentation advances it only when the next level is ready (preload) — hard fallbacks: 6 s wall (UI) and 600 ticks (sim) so it can never hang.
- D5 Level manager = dressing retention by level: resident = the current level's dressings only (camp: Level 1's). Finished level torn down (dispose geometry/material/texture not shared with anything else in the scene) at the card start, next level built under the card.
- D6 Quit to Lobby = run_end {result:'abandoned'} + return_to_camp (no end card); records count it as an abandoned run.
- D7 Campaign victory auto-returns to camp after 10 s of sim time (pause-aware, net-synced); Enter returns at once. Defeat keeps the manual card.
- D8 Save lock check: a save whose run is in a level this profile has not unlocked is refused on load unless the run was started by a harness/debug path (`campaign.harness`).
