STATUS: PARTIAL
M4b builder checkpoint (world half of content extension). Steps appended below as completed.

## Decisions (PLAN silent -> best-in-class choice)
- Tool prefix `gntM4b-` (task text), as M1/M3 used `gntM1-`/`gntM3-`.
- Placement rule audit: lanes measured by centreline; party-entry clearance = 1.6 u surface distance (2.2 made every mid-field cover spot illegal); tools/gntM4b-layoutcheck.mjs enforces it.
- Hazards draw NO gameplay RNG: the rockfall schedule is a pure hash of (run seed, room, layout id), so hazards never shift the wave director's roll order.
- Hazard spacing: every scheduled AND hit-triggered hazard resolution reserves a slot on one clock (>= 36 ticks apart); a clash lengthens the telegraph, never shortens it. A gravefire line reserves its whole 36-tick eruption window.
- Status leases: bramble/slick slows apply once on entry and then extend the same record silently, so `status_apply` fires on entry, not every tick.
- Stun interrupts a live enemy wind-up (`telegraph_cancel`) — the Warding Bell can save the party; a stunned quillback charge freezes in place.
- Toad globs are their own entity (`eglob`) that carries the ring telegraph: lobbed (pass over barricades) and they land even if the toad dies. Slicks are `slick` entities (party-only slow 30%).
- Enemy shots also contact neutral breakables (a stray shot can pop a keg); fliers pass over and burrowers under entity-owned blockers.
- Interact reach = surface distance <= 1.1 u; nearest asset answers; downed ally within 0.6 u or a live revive channel owns KeyE.
- Boss rooms and the shop spawn no placements (dressing only). Puffcaps in Act I layouts carry minRoom 2.
- The governor counts EVERY live player-targeted telegraph in the registry (boss, globs, rockfall) and hears every `telegraph_start` — identical in the ?room= harness.
- Minimal edits outside my anchors (reported): world.js `@gnt:M4b IMPORTS` pair (import lines had no anchor) and the shared `case 'spawn'` line routing every archetype + opts (PLAN §6.4 extends `spawn`).

## Steps
### Step 1 — sim content (committed v0.5.12)
- movement.js: entity-owned dynamic colliders (`setDynamicColliders`), `sweptContact` (walls+statics+dynamics, entity id), fliers/burrowers skip blockers, serialize/restore.
- enemies.js: archetype dispatch + 5 archetypes (src/sim/enemies/{quillback,toad,moth,ram,mole}.js), Elite modifier, `spawnScaled`, status speed/stun gating, globs + slicks, blocker-aware enemy shots, serialize/restore; boar/mantis paths verbatim.
- projectiles.js: blockers stop bolts (`cause: 'blocked'`) and take the hit.
- hazards.js (5 types + layout director), interactables.js (5 types), data/layouts.js (9 layouts), world.js anchors (systems, phases, faction hostile filters, cmds).
- Evidence: 9/9 Node goldens (kill_all/defend/run x seeds 1,2,7) GOLDEN MATCH with my files isolated on a HEAD export (captures/gntM4b-base-*.json); tools/gntM4b-simprobe.mjs 84/84 PASS (exact §23 numbers: quillback lane 48t/0.7u, charge 6.0 u/s, 12 dmg, wall stagger 30; toad ring 60t r0.9, 12 dmg, slick 180t 30% -> walk 1.68 u/s; moth lane 45t 5.5u, 8.0 u/s, 9 dmg; ram guard blocks front bolt / back hits, turn 90 deg/s, cone 60t 18 dmg, kb x0.3; mole burrowed untargetable, ring 60t r0.8, 11 dmg, surfaced 120t; elite x1.8/x1.25/x1.2; governor maxLive<=2, stagger>=72; bramble x0.65 (player 1.56 u/s); puffcap 300/60/10/120 + pop by damage; millrace 1.3 u/s, surge 60t telegraph, 3.0 u/s, 12 once; sluice 720 + 1200; rockfall 72t 15 dmg rubble r0.6 480t blocks walk+bolts; gravefire 18 apart, 54t, 12 dmg; hazard spacing >= 36 in all 9 layouts over 3600 ticks; dewfont +25%, once; bell stun 60t, once, denied 'used'; same-tick double use once; barricade blocks walk/bolts/enemy shots, breaks at 0, then walk-through; keg fuse 60 -> 30 dmg r1.6 knockback, chain; canonicalJSON over the registry mid-wave in layouts 1/4/7). tools/gntM4b-layoutcheck.mjs: all placements clear. Smoke exit 0 / 0 PAGEERROR; core loop -> reward room 1.
