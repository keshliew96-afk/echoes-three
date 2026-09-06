STATUS: PARTIAL
VERDICT: (pending)

# Certification D round 1 — Performance & Chrome

Critic: certD1 (fresh context). Started 2026-09-06T00:11:05+08:00.
URL: http://127.0.0.1:5199/?seed=999 --timeout 180000

## Probe log

### D3 camp idle baseline — DONE (captures/certD1-n-camp-idle.png / .console.txt, exit 0)
Boot ?seed=999, settle 3 s, 10 s rAF sample from tick 486 (GOTO 15.1 s, 107 requests). Camp content: fireflies 150,
embers 130, gateMotes 34, grass 560, emitters 17, propShadows 70, critters 4, ents 4.
- ALL 500 frames / 9982 ms: mean 50.0 fps (20.0 ms), p50 18.2, p95 30.4, p99 36.4, max 36.6 ms, >50 ms 0, >100 ms 0
- WARM (0-3 s): 152 frames, mean 51.0 fps, max 36.4 ms | STEADY (3-10 s): 348 frames, mean 49.7 fps, p95 30.4, max 36.6 ms
- E.fps 53.5-54.9 every second; heap 42-50 MB sawtooth; long tasks none; page errors 0
- VERDICT D3: PASS-conditional (headless SwiftShader 45-55 band), zero hitches.
- API recon: __arenaProbe {stage{renderer,scene,camera,composer,bloomPass,gradePass},root,emitters,...}; E.hud {portraits,metrics,banner,threat,...}

### D1 worst-case wave — room 2 kill_all and room 6 defend DONE (exit 0 both)
Seed 999 frame: modes [kill_all,kill_all,kill_all,defend,kill_all,defend,shop,boss]; direct skipToRoom(2) -> waves [4,5]; skipToRoom(6) -> defend waves [3,3,3,4] at t=0/12/24/36 s. RMB held (player auto-fires), allies live.
captures/certD1-n-wave2 (25 s from tick 548): ALL 1364 fr mean 55.0 fps p95 30.1 max 230.2; WARM(0-3 s) 35.5 fps max 169.5 (t585 = wave-1 spawn #6-9, timerMaxGap 175.9 => main thread blocked, first enemy rigs); STEADY 57.5 fps p50 18.1 p95 24.4 p99 30.8 max 230.2; peakAlive 5 enemies @t834, peakEnt 18.
  gaps>100 after warm-up: 194.1 ms @t1150 (screen draft, timerMaxGap 56.8), 163.5 ms @t1160 (draft, timer 14.1 => rAF starved, main thread free), 230.2 ms @t1178 (draft) — ALL on the reward screen right after room_cleared t1135 -> reward_offer#sanctuary. In-wave: zero gaps >100 ms. Long tasks 166/87/66/50 ms.
captures/certD1-n-defend6 (47 s from tick 902): ALL 3107 fr mean 66.1; WARM 55.5 max 181.7 (t956 wave-1 spawn, timerMaxGap 26.1, heap 55.7->45.2 GC); STEADY 66.8 fps p50 12.2 p95 24.4 p99 36.4; 15 s windows [3-18] gt100 0 max 30.7 mean 75.6 | [8-23] 0/30.5/79.6 | [13-28] 0/30.3/78.5 | [18-33] 0/48.3/74.1 | [23-38] 0/48.6/68.2 | [28-43] 0/60.4/58.6; peakAlive 4 @t3092 (allies kill each 3-4 wave inside its 12 s), Waystone 150->140, party 90/150/85/80, 13 spawns 13 deaths.
  one post-warm-up gap: 363.2 ms @t3603 on screen draft, 19 ticks after room_cleared t3584 -> reward_offer#guardian_bond (timerMaxGap 88, heap flat 66.5->66.9, renderer geometries 945 unchanged).
=> the wave steady state passes; the ROOM-CLEAR -> REWARD-SCREEN transition stalls 163-363 ms every time (4 of 4 clears seen so far incl. the dead instance's 254/424 ms). Dedicated probe certD1-n-clear next.
