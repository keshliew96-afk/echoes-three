STATUS: PARTIAL
fix-M2 round 5 — SAVE5-F1 (New Game party stream), SAVE5-F2 (slot menu ally builds + detail clipping), SAVE5-F3 (isReady page error)

## Steps
- [start] 2026-09-30: checkpoint created; HEAD 91250de (v0.5.171)
- [x] 1. SAVE5-F1 reproduced on dev 5199 (v0.5.171) with own copies of the critic probes (tools/gntfixM25-drive.mjs + gntfixM25-sc-g29*.mjs, BASE via GFM25_BASE): BEFORE dirty variant New Game hash 04e8be50424fed14 vs fresh ?menu=0&seed=1194165590&freeze=1 boot 74e59e505902a128, equal false, diffs = systems.party.rng.seed/.s only (3959255410 = the BOOT snapshot's party stream vs 1202832158) — captures/gntfixM25-sc-g29-before-dirty.json; debug probe gntfixM25-sc-g29debug.mjs: after Quit to Title the gameplay seed changes (2840524086 -> 2895292020) but the party stream stays at the boot value 3985182525 (captures/gntfixM25-sc-g29debug.json).
  Root cause: src/save/index.js freshTree(seed) cloned the boot snapshot and re-derived only the gameplay stream (t.rng); the schema-4 party stream (PLAN §16.3 partySeed(seed)) kept the boot page's value.
  Fix: freshTree also sets systems.party.rng = createGameplayRng(partySeed(seed)).getState() (the live derivation imported from src/sim/party.js).
  AFTER: dirty e1b94a742a448d41 == e1b94a742a448d41 equal true diffs [] (captures/gntfixM25-sc-g29-after-dirty.json); clean f136d3b83957b1a1 == f136d3b83957b1a1 equal true diffs [] (-after-clean.json); three New Games in one page: party rng0 = partySeed(each game seed) 4279039348 / 3409039433 / 1348041199 (before: 138055169 x3) (-g29repeat-after.json); fresh-boot seeds table unchanged (959409563 -> 3854796593 / f487eeec211dd682 as the critic measured) (-g29seed-after.json). 0 page errors.
