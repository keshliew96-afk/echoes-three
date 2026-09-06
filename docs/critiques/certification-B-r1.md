STATUS: PARTIAL
VERDICT: (pending)

# Certification B round 1 — full-loop critic (certB1)

Started: 2026-09-06T00:11:04+08:00

## Method / checkpoint notes

- Fresh instance 2026-09-06. A previous instance (usage-limit-killed 2026-09-05, prefix `certB1-r1*`) left a
  generator and a clean-exit log but NO report; its certified run ended in DEFEAT in room 8 (`run_end(defeat)@13161`,
  boss 327/1800, 3 allies down, ~12 heals in the boss room because each loop iteration cost ~840 ms). Its captures
  are NOT reused as evidence; only its proven click rects informed my generator.
- My files: generator `tools/certB1-fl-gen.mjs` -> `tools/actions/certB1-fl-main.json` (certified loop) and
  `tools/actions/certB1-fl-bossrecon.json` (policy validation only, cmd-driven, not evidence for B2);
  recon `tools/certB1-fl-recon-gen.mjs` -> `tools/actions/certB1-fl-recon.json` (field-shape dump).
  Captures: `captures/certB1-fl-*` (+ `.console.txt`). Harness: `tools/cert-capture.mjs --timeout 180000`.
- Policy (real input only on certified runs): WASD held across the whole loop iteration; RMB held; Digit1-4 pressed
  when `remainingTicks===0` and an ally < 95 % (aimed heals aim at the lowest ally via the 12-point ring picked by
  bearing from the player's projected position); Space dodge on a telegraph resolving <= 30 ticks within its radius
  (+ one deliberate test dodge per room); E held 5.3 s stationary within 0.45 u of a downed ally when no hostile is
  within 1.4 u of it; boss room: post 1.8 u behind the allies' centroid, back off when the Stag is < 2.2 u, flee the
  quake ring. Screens: Take / door / shop card / Advance / Return to Camp are real clicks at the live rect.

## Probe log (appended as measured)

