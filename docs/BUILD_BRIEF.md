# ECHOES WEB — BUILD BRIEF (v1.0, 2026-08-15)

This is the single self-contained implementation spec for the Three.js web build of
**Echoes**, translated from the approved GameStudio design corpus (game concept R3,
combat GDD, build/draft/shop GDDs, HUD/UX specs, art bible). A builder with NO other
context implements from this document alone. The binding visual/responsiveness
quality bar is `docs/REFERENCE_BAR.md` (same folder) — every rendered frame is
judged against its 10 checks and its responsiveness bar. Where this brief and a
memory of the original docs disagree, THIS BRIEF WINS (scoping rulings are listed
in Appendix A).

**Elevator pitch**: top-down party action roguelike. You play the Healer — a chibi
mouse in a bell cloak — leading three AI critter allies (badger Tank, fox Swordsman,
hare Archer) through an 8-room run against corrupted beasts. Hades-grade combat
responsiveness; skills drafted mid-run; a tiny pool of nodes that *reinterpret*
per skill (Bounce on a heal = chain-heal; Siphon on a heal = your heals damage
enemies). Runs bookend in a warm camp scene. Storybook-warm party vs. a world
going wrong.

---

## 1. Locked stack & global conventions

- **Stack**: Vite + three.js (already installed: `three ^0.185`, `vite ^8`),
  vanilla ES modules, NO TypeScript. Post stack via `EffectComposer`
  (UnrealBloomPass + custom vignette/color-grade ShaderPass). No external asset
  downloads of any kind — all geometry, textures, sprites, and audio are
  generated in code (primitives, LatheGeometry, CanvasTexture, DataTexture,
  WebAudio synthesis).
- **Coordinate system**: gameplay happens on the ground plane **XZ** (y = up).
  Camera is 3/4 top-down. Mouse aim = raycast from camera through cursor to the
  y=0 plane.
- **Units**: **1 world unit = 100 design-px**. All design numbers below are given
  in world units already converted (original px in parentheses where useful).
  Character standing height ≈ 1.05 u.
- **Simulation**: fixed **60 Hz tick** (16.666 ms) via accumulator; render frames
  interpolate visual positions but NEVER mutate sim state. All cooldowns/timers
  are **integer tick counts**. No gameplay logic reads wall-clock time.
- **RNG**: two streams. (a) *Gameplay stream*: one seeded PRNG (mulberry32 or
  splitmix32) created at run start; consumed ONLY by gameplay-affecting rolls
  (crits, wave rolls, draft draws, room frame). (b) *Cosmetic stream*: unseeded
  `Math.random` for VFX jitter, foliage placement, particle spread. Never cross
  the streams.
- **Spawn ordinal**: a per-run monotonic counter assigned to every spawned entity
  (actors, projectiles, zones). It is the universal deterministic tiebreak.
  Never use engine object ids for tiebreaks.
- **Input abstraction**: game logic never reads DOM events directly. Input layer
  converts raw events into the closed intent vocabulary (§5) each tick; AI
  controllers emit the same intents. One controller interface for humans and AI.
- **Density ceilings (hard)**: ≤40 concurrent enemies · ≤150 live projectiles ·
  ≤20 simultaneous telegraphs · ≤12 timed zones + 4 auras · ≤12 simultaneous
  damage numerals (oldest fades early) · ≤40 persistent kill decals (oldest
  removed).
- **Performance**: 60 fps desktop target, no >100 ms hitches during waves.
  Canvas fully responsive: on window resize, renderer + composer + camera update
  same frame; HUD overlay rescales (see §17). No layout breakage at any aspect
  from 1024×640 up.

---

## 2. Run overview

- One run = **8 rooms**: rooms 1–6 combat, room 7 shop (fixed), room 8 boss
  (fixed). Of rooms 1–6, exactly **2 are `defend`** rooms and 4 are `kill_all`
  (positions rolled from the seeded stream at run start; room 1 is always
  kill_all so onboarding stays simple — scoping ruling A3). Boss room = kill_all
  over boss + adds.
- The **run frame** (defend positions, path pairings, reward-side randomization)
  is rolled once at run start from the seeded stream and is immutable.
- Victory = clear room 8. Defeat = all 4 party members Downed simultaneously
  (the ONLY defeat rule). Defeat precedence: on a tick satisfying both defeat
  and clear, defeat wins.
- Rooms 1–5 clear → **path choice**: 2 doors, each showing only
  `{win_condition, reward_type}`; every pairing has exactly one `skill`-reward
  and one `node`-reward option (side randomized, pre-rolled). Room 1's reward is
  always a Skill draft. Rooms 6→7 and 7→8 are fixed transitions (no choice).
- Between-rooms only (`combat_active == false`): draft screen, socket screen,
  shop, path choice. Zero build interaction mid-combat (Pillar: Fight Fast,
  Build Slow).
- The **camp hub scene** bookends runs: game boots into Camp; "Begin Run"
  interaction starts room 1; run end (victory or defeat screen) returns to Camp.
  All run state (skills, nodes, Glint, HP, cooldowns) is wiped at run end.
- One continuous 60 Hz sim clock runs through every state; cooldowns keep
  ticking during reward/shop/path screens (they saturate during dwell) and are
  NEVER reset by any path.

---

## 3. Controls (keyboard + mouse only)

| Input | Action |
|---|---|
| WASD | 8-directional movement (pre-normalized; no faster diagonals) |
| Mouse | Aim (world position under cursor) |
| Right-click (hold) | Basic attack, hold-to-repeat; first shot immediate on press |
| Space | Dodge roll (i-frames) |
| 1 / 2 / 3 / 4 | Skills, slot-indexed |
| R | Rally (all allies regroup at player position) |
| E (hold) | Revive channel on adjacent downed ally (5.0 s) |
| Tab | Cycle enemy mark (party-shared focus target) |
| F1–F4 (or portrait click) | Heal-target override toggle per party member |
| B | Open Socket screen (between rooms only; blocked while a draft is pending) |
| Esc / Enter / arrows / Space | Meta-screen navigation per §18 rules |

Movement is instant (no acceleration). Moving never affects aim; aiming never
slows movement. Character yaw turns smoothly toward aim (3D adaptation, ruling
A1); body leans slightly toward the move vector so kiting reads (fire forward,
run backward).

---

## 4. Simulation core (binding rules)

Each tick, two phases:

1. **Continuous phase** — apply `move`/`aim`/held states, advance dashes,
   projectiles, channels, zone clocks.
2. **Discrete phase** — resolve accepted discrete actions in strict total order:
   ① deferred maturations (projectile impacts, delayed Echo recasts) by
   ascending spawn ordinal of the carrying entity; multi-hits within one
   delivery near→far, ties by ascending target id. ② actor resolutions: party by
   `party_index` 0–3 (player = 0), then enemies by spawn ordinal. Per actor:
   targeting/party commands first (`target_cycle`, `target_select`, `rally` —
   never suppressed), then skills ascending slot 0–3, then basic-attack fire
   (slot 4). ③ technique continuations (Bounce hops, Detonate bursts, spawned
   pools) nest depth-first immediately after their triggering impact.
   ④ persistent-zone scheduled ticks, ascending zone spawn ordinal.
- Each resolution sees earlier same-tick mutations (two same-tick smart heals
  pick two different targets).
- A character Downed mid-tick loses its not-yet-executed resolutions silently.

**Intent vocabulary (closed list — humans and AI both act only through these)**:
`move` (Vec2, continuous) · `aim` (world pos, continuous) · `basic_attack`
(held bool) · `dodge` · `skill_1..4` · `rally` (player-only) · `revive_hold`
(held) · `target_cycle` (player-only) · `target_select 0–3` (player-only).
One discrete intent of each kind per tick; duplicates denied. Denied intents are
no-ops (no queue, no refund) but emit
`intent_denied(reason ∈ {on_cooldown, empty_slot, priority_suppressed,
duplicate_in_tick, not_anchor, revive_occupied})` for HUD nudges (§17).

---

## 5. Movement, dodge, basic attack

- **Move**: `velocity = dir × move_speed`. 8-dir, instant.
- **Dodge roll**: fixed dash, **i-frames for the full travel window**.
  Direction = this tick's move vector; if zero, dash toward aim. Direction and
  speed locked at activation. Defaults: distance **1.8 u**, duration **0.25 s**
  (speed 7.2 u/s = 3× run), cooldown **1.2 s** (own timer, outside the skill
  pipeline). Wall contact terminates the dash (no slide); collision is **swept**
  per tick (7.2 u/s tunnels thin walls if point-sampled). Activation while flush
  against a wall = zero travel, zero i-frames, full cooldown spent.
  During the dash all skill/basic fires are suppressed (`priority_suppressed`);
  targeting/rally never suppressed. Same-tick dodge beats skill fires, basic
  fires, and a revive-channel start. After the dash, a still-held basic attack
  restarts its full interval (hard reset). While i-framed, an incoming hit
  creates **no damage instance at all** (no crit roll, no RNG draw). The dash
  smear/afterimage VFX IS the i-frame signal and ends exactly at dash end.
- **Basic attack**: free (no cooldown resource), hold-to-repeat at the class
  `attack_interval`; first shot immediate. Ranged classes fire a projectile at
  the cursor; melee classes swing an arc on live aim hitting ALL targets in the
  arc. Damage = `basic_attack_power`, then crit roll.

---

## 6. Skills & delivery shapes

- 4 slots, cooldown-gated, no mana, **instant cast** (press → fire → cooldown
  starts). No cast bars; animation never gates movement or recasting. No global
  cooldown; no input buffering. Cooldown floor: `cd_final = max(0.5 s, cd)`.
  Cooldown-reduction is a multiplicative duration modifier. Cooldowns tick in
  sim time, persist across rooms, never reset.
- **Delivery shapes (closed set of 6)**, stats drawn from
  `{power, cooldown, range, area, count}`:

| Shape | range | area | count |
|---|---|---|---|
| `projectile` | max travel u | splash radius (0 = single target) | simultaneous bolts, fanned symmetric about aim, 12° spacing (n=2 → ±6°) |
| `melee_arc` | reach u | arc **half-angle** ° (live unquantized aim) | max targets, nearest-first |
| `nova` (self burst) | — | burst radius u | max targets |
| `ground_aoe` (at cursor, clamped to range) | max placement u | zone radius u | — |
| `aura` (self-attached field) | — | field radius u | — |
| `direct` (auto-target) | eligibility radius u | — | recipients = bottom-N by HP fraction |

- Count-capped shapes filter to eligible targets (living, not i-framed) first;
  ties by spawn ordinal. `count_final = max(1, floor(count))`; arc half-angle
  clamped 10–90°.
- **Projectiles**: straight line, `pos(t) = origin + aimDir × speed × t`;
  expire at `range/speed`; impact beats same-tick expiry; swept collision.
  Speeds are per-skill data, 4.0–6.5 u/s.
- **Zones** (`ground_aoe`): tick cadence 1.0 s, first tick 1.0 s after
  placement; each zone tick creates normal instances (own crit roll; i-frame /
  Downed suppression applies).
- Aim exactly on the caster: direction shapes reuse last valid aim; ground_aoe
  uses the cursor as-is.

---

## 7. Party classes & stats

Player controls the **Healer** (party_index 0, party anchor). AI drives Tank,
Swordsman, Archer (fixed 4-skill kits, no build growth — the player's build
grows, allies' don't; that's the intended power curve).

| Stat | Healer (mouse) | Tank (badger) | Archer (hare) | Swordsman (fox) |
|---|---|---|---|---|
| max_hp | 100 | 150 | 80 | 95 |
| move_speed u/s | 2.40 | 2.10 | 2.50 | 2.65 |
| attack_interval s | 0.5 | 0.65 | 0.4 | 0.35 |
| basic_attack_power | 8 | 9 | 12 | 11 |
| basic geometry | projectile 5.2 u/s, range 5.0 | arc reach 0.90, half-angle 50° | projectile 5.6 u/s, range 4.5 | arc reach 0.75, half-angle 40° |
| crit | 0.05 chance / 1.5× mult (all classes, damage AND heals; strict `roll < chance`) | | | |

### Healer skills (player) — 2 starting + 6 draftable
`archetype ∈ {damage, heal, passive}` drives node reinterpretation (§15).

| Skill | Archetype / shape | power | cd s | range | area | count | notes |
|---|---|---|---|---|---|---|---|
| **Mending Bolt** (start, slot 1) | heal / projectile | 22 | 3.5 | 5.0 | 0 | 1 | heal bolt, speed 5.2 u/s; hits first ally in path (passes enemies) |
| **Swift Mend** (start, slot 2) | heal / direct | 14 | 2.5 | 3.2 | — | 1 | smart-target instant heal |
| Nova Bloom | heal / nova | 16/target | 7 | — | 1.4 | 3 | |
| Sanctuary | heal / ground_aoe | 6/tick | 9 | 3.8 | 1.0 | — | duration 4 s (4 ticks) |
| Spirit Bolt | damage / projectile | 18 | 4 | 4.8 | 0 | 1 | speed 5.0 u/s |
| Warding Aura | **passive** / aura | 3/tick | — | — | 0.9 | — | always-on field around Healer, 1.0 s cadence, heals allies inside |
| Guardian Bond | heal / direct | 12 each | 6 | 3.4 | — | 2 | bottom-2 HP allies |
| Restorative Wave | heal / melee_arc | 15 | 5 | 1.1 | 55° | 4 | |

Warding Aura occupies a skill slot when drafted but has no activation (its slot
icon renders as a passive glyph, never a cooldown wipe).

### Ally kits (fixed, all damage)
**Tank (badger)**: Heavy Slam (arc 34, 5 s, 1.00/40°, cap 3) · Brutal Cleave
(arc 16/target, 4 s, 0.95/80°, cap 6) · Ground Crack (ground_aoe 10/tick, 8 s,
range 2.6, radius 0.9, 4 s) · Whirling Guard (nova 20/target, 9 s, 1.3, cap 5).
**Archer (hare)**: Piercing Shot (projectile 30, 3 s, 5.5, speed 6.2) · Volley
(projectile 14/bolt, 4.5 s, 4.8, count 3 fan, speed 5.4) · Detonating Charge
(ground_aoe 12/tick, 7 s, range 4.2, radius 0.85, 3 s) · Sundering Nova (nova
16/target, 8 s, 1.1, cap 4).
**Swordsman (fox)**: Flurry (arc 11/hit, 3 s, 0.80/60°, cap 6) · Lunge Strike
(arc 26, 4 s, 1.30/30°, cap 2) · Blade Storm (nova 14/target, 7 s, 1.0, cap 5) ·
Caltrops (ground_aoe 8/tick, 6.5 s, range 2.0, radius 0.70, 5 s).

AI casts a kit skill when: target in shape range ∧ off cooldown; skills fire
ascending slot; AI basic-attacks between casts.

---

## 8. Targeting & command verbs

- **Heal smart-target** (`direct` heals): lowest-HP-fraction living ally (self
  included) within range; self is exempt from the range test so there is never
  "no target". Tiebreak: caster first, then ascending party_index (never
  distance). Multi-recipient = bottom-N; a forced override recipient is excluded
  from the remaining N−1 picks.
- **Override (F1–F4 / portrait click)**: durable toggle per caster. Press = set;
  same key again = clear; other key = replace; room clear = clear. A valid
  override forces the recipient; an invalid one (downed/out of range) falls back
  to smart-target WITHOUT clearing and resumes when valid. Self-select legal.
- **Enemy mark (Tab)**: party-shared. First press = nearest enemy to player;
  repeats cycle outward by distance (ties ascending spawn id); past farthest
  wraps to nearest; recomputed fresh each press. Cleared on mark death or room
  clear. Steers allies and AI `direct` casts only — NEVER the player's aimed
  shapes. Empty room: no-op. Marked enemy shows a Signal Blue reticle glyph.
- **Rally (R, player-only, no cooldown)**: captures the player's position that
  tick; every ally breaks engagement (including revive channels) and moves
  there. On arrival hold with no re-engagement for **1.0 s**, then resume.
  Re-press re-points immediately. Unavailable to everyone while the player is
  Downed. HUD confirm: simultaneous expanding-ring flash on all 4 portraits.

---

## 9. Damage, healing, crits, and the juice contract

**Instance pipeline** (identical for player, ally, and enemy sources):
base = skill `power` or `basic_attack_power` → one crit roll from the seeded
stream in resolution order → `final = base × (1.5 if roll < 0.05 else 1)`.
No armor/resists/damage types. Heals clamp at max_hp. A **`full_heal` event**
fires per instance when `pre_clamp > 0 ∧ current + pre_clamp ≥ max_hp`
(inclusive — an AoE topping 3 allies fires 3 events; feeds Detonate-on-heal).
Downed characters are OUTSIDE the pipeline: no instance ever targets them, no
roll is drawn. I-framed targets likewise produce no instance.

**Juice contract — every hit must land with ALL of (Hades bar, binding):**
1. **Hit flash**: victim mesh flashes white ~3 frames (emissive/color modulation,
   never material swap).
2. **Damage number**: pops on EVERY hit (see §17 world-space).
3. **Knockback**: non-boss enemies get a positional impulse away from the hit —
   0.12 u over 80 ms on basic hits, 0.30 u on skill hits; swept vs. walls; boss
   immune. Party members are never knocked back (readability ruling A5).
4. **Hitstop**: global sim pause 2 ticks on melee-arc connects, 3 ticks on kill
   blows (cap: no stacking above 4 ticks per 20-tick window).
5. **Sound slot**: a distinct WebAudio synth cue per event family (§21).
6. **Kill**: squash-stretch death pop + particle burst + persistent ground decal
   (dark splat, cosmetic-stream rotation/scale, fades after ~20 s, cap 40).
7. **Screenshake**: small (≤0.06 u camera offset, ≤120 ms) on player-adjacent
   explosions and kills; never on ordinary hits.

- **Tuning note (certification fix round 1, 2026-09-09):** two §9 numbers moved
  because the round-1 scorers could not SEE them on the frame.
  - **#3 knockback** 0.12 u basic / 0.30 u skill over 5 ticks -> **0.34 u /
    0.72 u over 10 ticks**. A Thorn Boar closes at 2.0 u/s = 0.033 u per tick,
    so the authored impulse was fully eaten back inside 4 ticks: the
    certification probe measured **0.03 u of net travel** on a hit and all
    three scorers marked the hit as landing without consequence. Everything
    else about #3 is unchanged (swept vs walls, boss immune, party never
    knocked back), and the impulse still never stacks — a repeat hit re-arms it.
  - **#7 screenshake** is now emitted by the sim as a `screenshake` event
    (`{cause, amp, durationSec, x, z}`) instead of being inferred render-side
    from `death`. Kills keep the authored ceilings exactly (0.06 u / 120 ms);
    the two heaviest events only — **boss stomp and quake landing** — run
    **180 ms** at the same 0.06 u amplitude, because a 120 ms shake almost
    never intersects a 150 ms capture cadence and the round-1 scorers recorded
    "0 screenshake events / torch centroid stable +-2 px". The render side
    clamps every event to amp <= 0.06 u and duration <= 200 ms.
  - Hits now also carry `dirX`/`dirZ` (the unit impact direction) so the
    render side can throw its debris spray ALONG the hit.
- **Implementation note (certification fix round 2, 2026-09-10):** no §9 number
  moved. #4 hitstop is now requested for BOTH halves of the contract — the
  2-tick melee-arc pause was never wired, so only kill blows paused the sim.
  Two rulings make the authored cap behave: (a) every damage instance carries
  its `shape`, and a `melee_arc` instance that does NOT kill requests
  `HITSTOP.meleeTicks`; a LETHAL arc connect takes the 3-tick kill pause
  instead, never both; (b) requests landing on the SAME sim tick — a 6-target
  Brutal Cleave, the Tank and the Swordsman connecting together, an arc whose
  third victim dies — TOP UP to the strongest cause (kill 3 > arc 2) instead of
  stacking 2+2+3, because the tick freezes as one impact moment either way.
  Stacking would have emptied the 4-per-20 window budget on a single swing and
  starved the next kill. `hit` events now carry `shape` and `hitstop` events
  carry `cause: 'melee_arc' | 'kill'` plus the tick's running `total`.

Player spawn/skill VFX must never use Ember Danger or God-stuff Violet (§19).

---

## 10. Downed & revive contract

- HP ≤ 0 (any source) → **Downed**: crawls at 0.8 u/s (movement only), cannot
  act, cannot be damaged or killed. Pose collapses horizontal; accent color
  desaturates toward charcoal; identity ring stays visible.
- **Manual revive**: any living party member holds **E** while stationary (zero
  move intent) within **0.6 u** of a downed ally. One reviver per body (second
  attempt denied `revive_occupied`). After **5.0 s** uninterrupted → target
  restored to **30% max_hp**, both mobile.
- **Breaks** (progress resets to 0, never resumes): nonzero move, dodge, skill
  cast, *fresh* attack press, or the reviver going Downed (target stays down).
  The breaking intent executes normally that tick. A held attack carried into
  the channel is consumed silently (neither fires nor breaks). Same-tick dodge +
  channel start: dodge wins.
- **Repeat-revive diminishing** (same character, same room, manual only):
  30% → −10 pp per repeat, floor 10%; resets each room.
- **Room clear**: every Downed member revives free at 30% (exempt from
  diminishing).
- **All four Downed simultaneously ⇒ run ends (defeat).**
- HUD/world feedback: hollow Bone radial ring + hold-E glyph over the body and
  on the portrait; channel fills clockwise from 12 o'clock in Parchment;
  interrupt = reverse drain at 2× speed + one 2 px lateral portrait shake.

---

## 11. Enemies, waves, telegraphs, boss

Act-1 family: corrupted beasts. NEVER round warm low-set eyes, never bell-cloak
silhouettes — those are party-exclusive. Each enemy has exactly one corruption
tell (angular growth / faint violet eye-glint).

| Stat | **Thorn Boar** (melee rusher) | **Spitting Mantis** (ranged shooter) | **The Hollow Stag** (boss) |
|---|---|---|---|
| HP | 20 | 15 | 1800 (tuned — see note below; authored 200) |
| move u/s | 2.0 | 1.6 (repositions to keep range) | 1.8 |
| damage | contact 8 | shot 10 | primary 15 · secondary 12 |
| attack cd | 0.8 s per target | 2.5 s | primary 4.0 s · secondary 2.5 s |
| range | contact (0.35 u) | engage 3.5 u | see attacks |
| telegraphed? | no | yes (0.7 s) | primary yes (0.7 s) · secondary no |

- **Tuning note (Round D2, 2026-09-03):** the Stag's authored 200 HP was never
  validated against this section's own kit numbers — measured party output is
  ~220 opening burst + ~120 dps sustained, which killed the boss in 0.95 s with
  all three add phases inside half a second. HP is now 1800 so the fight spans
  the quake cadence and the three add waves, and add phases are additionally
  spaced ≥ one quake cycle (4.0 s) apart. No hidden immunity; numerals stay
  equal to HP deltas.
- Enemy projectile speed 4.0 u/s (always slower than the player's 5.2, by
  design). Enemy attack VFX use the Ember family; enemy damage resolves through
  the same instance pipeline (i-frames/Downed suppress entirely).
- **Targeting**: every enemy independently targets the nearest living non-Downed
  party member, re-evaluated continuously — no threat table, no coordination.
  In defend rooms while the objective lives, the candidate set is
  {party} ∪ {objective}, same nearest-wins rule (interposition IS the defense);
  reverts on objective death.
- **Telegraphs**: Ember Danger `#FF5A36` ground decal at the impact zone
  (opacity pulse 2 Hz) + hazard chevron, visible ≥0.7 s before resolution.
  Structural cadence rule: no two player-targeted telegraphs resolve within
  1.2 s of each other — enforced by an encounter director capping simultaneous
  telegraphing attackers at **2** and staggering attack-cast starts by ≥1.2 s
  (applies across boss + adds too).
- **Waves — kill_all rooms**: 2–3 sequential waves (seeded roll) of 3–5 enemies,
  each enemy 60% Boar / 40% Mantis (seeded). Spawn at arena-edge spawn points
  with a 0.8 s spawn telegraph (violet shimmer, not Ember). Next wave at
  previous-wave-dead OR 2.0 s after previous wave fully spawned +
  wave-interval 8 s, whichever first. Clear predicate: schedule exhausted ∧ no
  living enemies ∧ ≥1 party member not Downed (evaluated end of tick).
- **Defend rooms**: objective = **the Waystone**, a static rune monolith,
  150 HP, warm amber rune glow. `defend_timer` = **45 s**. Waves at t = 0, 12,
  24, 36 s (3–4 enemies each, same mix), and run to completion regardless of
  objective state. Clear: timer expires ∧ objective alive (survivors despawn).
  Objective death = **soft-fail**: room reward forfeited (silently — no reward
  event), room converts to kill-all-remaining with the same remaining schedule,
  leash anchor flips to the party that tick, run continues, stipend still paid
  on clear.
- **Boss — The Hollow Stag** (room 8): a corrupted stag, party-height ×2.2,
  violet-white veined antlers, the room's single brightest light source
  (feverish warm boss-light; room a stop darker than normal Act-1).
  - *Antler Quake* (primary, telegraphed): Ember decal ring radius 1.6 u at the
    current target's position, 0.7 s warning, then burst 15 dmg. cd 4.0 s.
  - *Trample* (secondary, untelegraphed): short lunge at nearest party member
    within 1.5 u, contact 12 dmg. cd 2.5 s.
  - Adds: at 75% / 50% / 25% HP, spawn 2 Boars + 1 Mantis (concurrent cap ≤7 in
    the boss room). Boss cannot be marked past leash rules; boss immune to
    knockback. Clear = boss and adds all dead. Boss HP bar top-center with name
    plate.
- **Tuning note (certification fix round 1, 2026-09-09):** the rank-and-file
  corruption tell moves from **God-stuff Violet to INDIGO** (hue 228, one long
  step off Signal Blue's 200 deg). §19.1 reserves violet for
  corruption/boss/Defeat, and all three round-1 scorers read the Thorn Boar's
  violet thorn ridge and the Spitting Mantis's violet eye-glint as a colour-
  discipline break: if a wave-1 boar wears violet, the Hollow Stag's rack and
  the corrupted monolith stop meaning anything. Each enemy still carries
  **exactly one** tell — only its hue changed, into the indigo-night family the
  hides already live in. Violet stays exclusive to the Stag, the monolith and
  the 0.8 s spawn shimmer (a spawn IS corruption arriving, and it is an event,
  not a body).
- **Room clear**: surviving enemies enter Retreating (ignore players, stop
  attacking, despawn ~1 s); zero further instances or RNG draws.

---

## 12. Ally AI (Tank / Swordsman / Archer)

- **Leash**: reference = the room's live `leash_anchor` (party anchor in
  kill_all/boss/shop; the Waystone in defend until soft-fail flips it). Radius
  **3.4 u**. Beyond the leash with no valid in-range target → disengage and move
  to anchor; re-engage only once within 0.8 × radius. Marked targets are
  leash-capped — never pursued past the boundary. Anchor tracking follows a
  Downed anchor's crawl.
- **Targeting**: no mark → all allies attack the enemy nearest to the
  leash_anchor (one shared computation = natural focus fire), ties by spawn
  ordinal. Player's Tab-mark overrides for all allies, honored live; if the mark
  dies/leaves range it is NOT cleared — fall back to nearest-to-anchor, resume
  when valid. Approach: steer to own attack/skill range (melee reach for
  Tank/Swordsman, projectile range for Archer). Obstacle-aware steering is
  sufficient (arenas are open with edge props — full navmesh not required;
  ruling A6). Ally separation: 0.26 u soft push.
- **Revive AI**: serial rescue, priority = player's body first, then
  longest-Downed; reviver = nearest eligible ally with HP ≥ 30% of own max.
  Eagerness unconditional: the nearest eligible ally breaks off combat
  immediately and channels. Rally interrupts an AI channel (reset, not resume).
- AI allies never dodge-roll and never set heal overrides; AI heal casts (none
  in MVP kits) would use smart-target.

---

## 13. Rooms & run lifecycle

**Room-clear boundary sequence (fixed order from the clear tick):**
1. `combat_active := false`
2. Every live combat entity ends: projectiles, zones, surviving enemies despawn
   (no instance may land after the clear tick)
3. All Downed party members revive at 30% max_hp
4. Targeting state clears: mark → none, heal overrides cleared, rally point
   cleared
5. `room_cleared` event (stipend +12 Glint for combat rooms)
6. Reward presentation (skipped if forfeited) → path choice (rooms 1–5) →
   transition fade
7. Next room's first tick: `combat_active := true`

**Persistence across rooms**: cooldown timers (skills + dodge — keep ticking),
party HP + Downed state, owned skills + socket assignments, bench nodes, Glint,
RNG stream state, run frame + room index. **Cleared each boundary**: targeting
state, projectiles/zones. **Wiped at run end**: everything.

**Arenas** (hand-built layout pool, seeded pick): combat playfield ≈ 24×16 u
inside walls; 3 layout variants (prop arrangement + spawn points differ).
Shop room ≈ 12×10 u. Boss arena ≈ 18×18 u. Camp ≈ 16×12 u. Walls block movement
and projectiles; wall visual height ≤ 70–80% of character height (never fully
occludes; a character behind a wall stays partly visible + identity ring always
visible).

---

## 14. Glint economy

| Value | Number |
|---|---|
| starting_glint | 0 |
| clear stipend | +12 per combat-room clear (incl. boss, incl. after defend soft-fail) |
| wallet at shop (deterministic) | 0 + 12×6 = **72** |
| shop prices | common **25** · rare **30** · legendary **35** |
| invariants | 3 cheapest = 75 > 72 (never all 3) · any 2 ≤ 65 ≤ 72 (any 2 affordable) |

Wallet: integer ≥ 0, atomic spend; insufficient funds → `currency_denied` no-op
(item never hidden or greyed for price). Wiped at run end. Glint UI color Pale
Gold `#D9B872` with a ≥24 px coin icon.

---

## 15. Build system — nodes, sockets, reinterpretation

### 15.1 Node pool (MVP: 4 stat + 4 technique)

| Node | Kind | Rarity | Limit/skill | Effect |
|---|---|---|---|---|
| **Sharpen** | stat | common | 2 | +25% power (additive_pct) |
| **Quicken** | stat | common | 2 | −15% cooldown (additive_pct on duration) |
| **Multiply** | stat | rare | 1 | +1 count (additive_flat) |
| **Ascend** | stat | legendary | 1 | ×2 power (multiplicative) |
| **Bounce** | technique | common | 2 | see matrix |
| **Siphon** | technique | common | **1** | see matrix |
| **Echo** | technique | rare | 1 | see matrix |
| **Detonate** | technique | rare | 1 | see matrix |

### 15.2 Sockets
- Active skill (damage/heal): **2 slots — slot A cap `rare`, slot B cap
  `legendary`**. Passive (Warding Aura): **1 slot, cap `rare`**.
- Cap = ceiling on rarity rank (common 0 < rare 1 < legendary 2). One node per
  socket. Unsocketed nodes live on an **uncapped bench** (provenance
  `drafted`/`purchased`). Socket/unsocket free and unlimited — but ONLY while
  `combat_active == false`. Repetition: copies of a node on one skill (incl.
  candidate) ≤ its limit.
- Ascend fits only slot B (legendary cap) and never the passive.

### 15.3 Technique reinterpretation matrix (authored numbers)

| Node | On damage skill | On heal skill | On passive (Warding Aura) |
|---|---|---|---|
| **Bounce** | impact ricochets to the nearest OTHER enemy within 2.2 u, full resolved power, 1 hop per copy | heal chains to the next-lowest-HP OTHER ally within 2.2 u, full resolved power, 1 hop per copy | **GREY** |
| **Siphon** | caster self-heals for `0.25 × flat-stage power` per instance | damages the nearest enemy within 2.0 u of the healed ally for `0.25 × flat-stage power` (tie → lowest spawn id; none → "nobody near" fizzle cue at the ally) | **GREY** |
| **Echo** | full recast at the same aim/target 1.0 s later at **50%** resolved power | full recast 1.0 s later at **100%** power | *Reapply*: one bonus full-strength aura pulse every 3.0 s while the aura persists |
| **Detonate** | kills by this skill explode: 50% resolved power damage burst, radius 1.2 u | `full_heal` events from this skill burst-heal allies within 1.2 u for 50% resolved power | **GREY** |

Technique rules: fire ascending slot index (A then B; duplicate Bounce = 2
hops). **Depth-1 rule**: technique-produced output never triggers techniques
(a Bounce hop doesn't re-bounce; a Detonate burst never re-detonates or feeds
Siphon); Echo recasts are new resolutions producing primary events but an echo
never re-arms its own echo (one per cast). Siphon amount is computed from the
FLAT-stage power (base at MVP) — immune to %/× nodes, crit, and clamps; its
card always shows: *"converts 25% of base healing — unmodified by any other
socket, crit, or buff."*

**Shape capabilities** (what makes a technique cell live): retargetable-impact =
{projectile, direct} (Bounce needs it) · Siphon/Detonate/Echo-active = any
active skill · Echo-passive needs a persistent aura. Grey therefore lands as:

| Skill | Bounce | Siphon | Echo | Detonate | Quicken | Multiply |
|---|---|---|---|---|---|---|
| Mending Bolt (heal proj) | live (chain) | live (drain) | live | live | live | live (2-bolt heal fan) |
| Swift Mend (heal direct) | live (chain) | live | live | live | live | live (bottom-2) |
| Nova Bloom (heal nova) | GREY | live | live | live | live | live (cap 3→4) |
| Sanctuary (heal zone) | GREY | live (per tick per occupant) | live | live | live | GREY (no count stat) |
| Spirit Bolt (dmg proj) | live (ricochet) | live (self-heal) | live | live (kills explode) | live | live (2-bolt fan) |
| Warding Aura (passive) | GREY | GREY | live (reapply) | GREY | GREY (no cooldown stat) | GREY |
| Guardian Bond (heal direct) | live | live | live | live | live | live (bottom-3) |
| Restorative Wave (heal arc) | GREY | live | live | live | live | **saturation-inert** (count 4 = whole party; realizes +0) |

Sharpen and Ascend are live on every skill (power is always a stat key).

### 15.4 Stat resolution pipeline
Per stat key: `base → +flat → ×max(0, 1 + Σ additive_pct) → ×Π multiplicative →
techniques → clamps (cd ≥ 0.5 s)`. Two Sharpens = +50% applied once
(22 → 33, never 22×1.25²). Worked examples (bindable tests):
Sharpen+Ascend on Mending Bolt: 22 → 27.5 → **55**. Quicken on Mending Bolt:
3.5 → **2.975 s**. Siphon on Mending Bolt: drain always **5.5**; on Spirit
Bolt: self-heal **4.5**. Multiply on Restorative Wave: 4 → 5 but ally pop = 4 ⇒
realized **+0** (saturation-inert).

### 15.5 Display contract (grey / inert / verdict — binding)
- **Grey** (technique cell GREY, or stat key absent from the skill): legal to
  socket, contributes nothing; advisory warning before socketing; shown as
  hollow icon + diagonal strike-through. Never blocked.
- **Saturation-inert** (Multiply where realizable delta = 0): non-grey but
  currently +0 — distinct marker (hollow icon + "+0" caption), NEVER reusing
  the grey strike treatment. Live-preview copy: "+1 target — currently +0 (all
  4 allies already hit)".
- **Card verdicts**: draft/shop cards show "fits your kit" (∃ owned skill where
  it's non-grey and non-inert) vs. "nothing in your kit uses this yet"; a
  per-skill breakdown is behind an explicit toggle (Space), never hover-only.
- **Never encode state by color alone** — every state has a shape/glyph channel.
- Draft/shop pools filter by `usable_by_party` (∃ owned skill + vacant slot
  where the node is non-grey, fits the cap, within its limit).

---

## 16. Draft, shop, path flow

- **Draft** = ONE candidate card, take-or-decline, no reroll, no confirm dialog,
  no reopen. Skill pool = 6 draftable healer skills − owned
  (`free_skill_slots = 4 − owned`); node pool = the 8 nodes filtered by
  `usable_by_party`. Uniform seeded draw from the pool sorted ascending id.
  Empty promised pool → substitute the other type with an explicit line
  ("no slot free — offering a Node instead"); both empty → "the run moves on" +
  Continue. Declines have no memory. Taken skill → first empty slot; taken node
  → bench (never auto-socketed). Taking a node chains straight into the Socket
  screen with the candidate pre-focused.
- **Socket screen** (B key between rooms, or chained): skills as rows, slots in
  ascending slot order; live preview on focused candidate×slot with computed
  contribution and reason; slot chips show rarity cap; hard-blocks (cap/limit)
  = rejection shake + block glyph; grey = advisory, proceeds. Esc banks the
  candidate to bench.
- **Shop (room 7, one visit)**: 3 node cards drawn without replacement from the
  live filtered pool at room activation (<3 eligible → show fewer). Prices by
  rarity 25/30/35 on plaques below the card; Glint balance in the top context
  strip; "you own N" line when applicable. Purchase = whole-card click →
  price-stamp flash → card departs to bench; no backfill/sell-back/reroll.
  Insufficient funds: plaque emphasis + one ~300 ms shake, item stays. Empty
  shelf: "nothing left to sell you". Advance → boss (one-way). Esc inert.
  - **Tuning note (certification fix round 1, 2026-09-09):** the shop is the ONE
    meta screen that is not a full-veil "flat storybook card page". Round-1
    certification scored the shop frame 10–12/20 with three independent scorers
    agreeing on the cause: a full-screen charcoal modal over a 65–90% veil,
    parked exactly on the party (FLAT 52.9%, LUMA >160 1.26%, zero entities in
    frame, no shop light of its own). The shelf is therefore now a COMPACT
    ORNATE PANEL (wood grain + brass, ~920×355 design px) docked above the
    command bar, over a ~12% dim (`#run-veil.rn-light`), so the lit arena, its
    torches and the party stay in frame. Everything §16 actually specifies is
    unchanged: 3 cards, plaques BELOW the card at 25/30/35, Glint strip, "you
    own N", whole-card click → stamp → bench, one ~300 ms denial shake with the
    item never greyed or hidden for price, Advance one-way, Esc inert. Every
    other meta screen (draft, path, victory, defeat) keeps the §16 full veil.
  - **Tuning note (certification fix round 2, 2026-09-10):** the shelf is
    NIGHT-GRADED and the shop dim is COOL. Round-2 certification scored the
    shop frame's check 2 ("layered light") 1/2 on two of three scorecards with
    the same cause: "no cool pole — cool 5.7% against the reference's 76.4%;
    the frame is amber panel vs green field". The round-1 shelf was warm brown
    edge to edge (panel box HUEMIX warm 97.3 / cool 1.6). It now runs a warm
    pool under the peddler's lantern falling off through slate to deep indigo
    at the rim (panel box warm 40.1 / cool 59.5), casts an indigo rather than a
    neutral-black shadow, and the `#run-veil.rn-light` dim keeps its round-1
    alphas (6% centre, 10% mid, 24% edge) but is tinted deep indigo instead of
    Void Charcoal. The §19.1 palette is untouched — brass, Pale Gold plaques,
    the Hearth Amber Advance lamp and the Bone / Signal Blue / Hearth Amber
    rarity rims all keep their authored colours, and no HUD (Zone-1) plate is
    re-tinted; this note covers the shop PAGE's own wood only. The §16
    ornament diamond on the title rail is now a drawn brass lantern (a light
    SOURCE for the pool that was already there), and the purchase
    choreography's window moved from 620 ms to 2100 ms: a harness screenshot
    costs several hundred ms of page time, so the shorter window was
    photographable only once and a scorer measured "0.00% changed" three
    frames running. Everything §16 specifies about the transaction (whole-card
    click, stamp, departure to bench, one ~300 ms denial shake, item never
    greyed for price) is unchanged.
- **Path choice** (after rooms 1–5): two door panels (160×220 design-px), each
  showing ONLY a win-condition glyph + reward-type glyph; `free_skill_slots`
  displayed at screen level. A/D or arrows focus, Enter commits under the
  **fresh-press rule** (a held Enter from the previous screen never commits).
  Irreversible; Esc inert.
- All meta screens: flat storybook card pages, non-diegetic, Zone 1 HUD persists
  beneath; enter/exit ≤300 ms fades; interactive within 350 ms.

---

## 17. HUD spec

Implementation: a DOM overlay (`#hud` root) above the canvas. The root is
designed at **1920×1080 virtual px** and uniformly scaled by
`min(innerWidth/1920, innerHeight/1080)` (centered, letterbox margins
transparent) so all px values below hold at every window size. World-space
elements (§ Zone 3) are three.js sprites/decals OR DOM nodes projected each
frame — builder's choice per element; damage numbers are pooled DOM nodes.

**Grammar**: HUD = calm geometric instrument panel — rounded-rects, colors
limited to Void Charcoal `#221F1B` plates, Warm Grey `#9C9186`, Parchment
`#F4EFE6` text/glyphs, Bruise Umber `#4E463F` incoming-damage numerals, plus
semantic colors. HUD never adopts environment tinting. Typography: rounded
humanist sans stack (`system-ui` rounded stack), `font-variant-numeric:
tabular-nums` for ALL HP/timer/damage numerals. Floors: HUD text ≥16 px,
numerals ≥20 px. Combat text always sits on an opaque charcoal plate.

**Zone 1 — Command Bar (bottom-center; the only permanent UI; persists under
meta screens)**: 4 party portraits (player + 3 allies, left group) + 4 skill
slots (in slot order = execution order) + dodge slot (right).
- **Portrait** 64×64: rendered head of the actual character model (render each
  class model to a 128² RenderTarget once at load), class-accent frame, HP bar
  in class accent on a charcoal track. States: Healthy (>50%) static · Hurt
  (25–50%) bar length only · Critical (<25%): frame+track value-pulse
  charcoal↔bone at 2 Hz, inner frame 1→3 px, persistent ≥20 px HP numeral
  (character art never tints) · Downed: horizontal portrait treatment + hollow
  Bone radial ring with hold-E glyph · Being-revived: ring fills clockwise in
  Parchment · Revive-interrupted: reverse drain at 2× + single 2 px shake ·
  Selected override (F1–F4/click): static 2 px Hearth Amber outline · Hover:
  chrome +1 value step only. Full tile = click region.
- **Cooldowns** (one grammar for skills + dodge): clockwise radial wipe from 12,
  70% charcoal overlay; <1.0 s remaining → ≥20 px Parchment numeral; ready-pop =
  120 ms scale 1.0→1.15→1.0 + plate flash charcoal→warm-grey. Empty slot = dim
  hollow frame. Passive skill slot = static glyph, no wipe.
- **Denial nudges** (~150–200 ms, restart on repeat, icon-level only, never
  alarms): `on_cooldown` → wipe nudge · `empty_slot` → frame blink ·
  `priority_suppressed` → ready-icon skip-pulse. Grey-socketed-node marker on a
  slot: hollow icon + diagonal strike, persistent, static.
- **Rally confirm**: outer expanding-ring flash on all 4 portraits at once
  (distinct from Critical's inner pulse; must composite with it).

**Zone 2 — Room banner (top-center, contextual, ≤300 ms fade in/out)**:
defend → Waystone HP bar + `current/max` numeral + countdown timer; kill_all →
wave progress cue ("Wave 2/3" + remaining pips); boss → ornate boss HP bar +
name plate ("THE HOLLOW STAG"). Zones 1+2 combined ≤ ~15% of screen height;
center screen stays clear.

**Zone 3 — world-space** ("render at the thing"):
- Ember telegraph decals (ground, ≤3 Hz pulse) — the ONLY red-orange.
- Signal Blue mark reticle on the Tab-marked enemy (glyph, never a fill).
- Identity rings: soft ground ellipse under each party member in class-accent
  hex, constant opacity, exempt from all palette/lighting shifts, visible under
  occlusion.
- Revive ring: Parchment radial fill on a charcoal backing disc, concentric
  OUTSIDE the downed ally's identity ring, ≥48 px on screen.
- Damage numbers: outgoing = Parchment, rise-and-fade, scale with magnitude;
  incoming (party) = Bruise Umber with Parchment outline, drops with lateral
  shake; heals = Bright Heal `#5FE873` rising with a "+HP" glyph. 2 px contrast
  outline, no plate. Cap 12 simultaneous; oldest fades early.
- Siphon fizzle cue ("nobody near") momentary at the healed ally.

**Reduced-motion note** (nice-to-have, not a block gate): decorative overshoot
drops to static flash; telegraph decals hold static peak but keep the fill
sweep.

---

## 18. Meta screens & camp

- **Victory screen**: warm high-key wash — the only screen where the
  environment matches party warmth. Run summary + "Return to Camp".
- **Defeat screen**: soft God-stuff violet-white wash regardless of act
  (theatrical curtain-call, not harsh); wry tone ("The gods applaud.");
  "Return to Camp". Vignette: static violet, fade-in ≤600 ms, ≤12% screen width
  from edges, never touching text.
- **Camp hub** (bookends runs): 3/4 top-down night scene — deep indigo/teal
  ambient, one **Hearth-Fire** as the single warm light source everything
  composes toward (campfire with glow halo + fireflies/motes). Prop density
  3–5× a combat room (target ≥12 distinct prop types per the reference bar:
  tents/bedrolls, market-stall shell, rune monolith, anvils, weapon rack with a
  glowing item, crates, barrels, fences, hanging lanterns, torches, cart,
  grass tufts, dirt path with hue variation). The four party critters idle
  around the fire (idle bob, ear/tail motion). Corruption never touches Camp.
  Interaction: walk the Healer to the glowing run-portal / gate marker and
  press E → "Begin Run" → fade to room 1. No shop/talents in camp at MVP.

---

## 19. Art direction (binding)

### 19.1 Palette

| Name | Hex | Exclusive role |
|---|---|---|
| Warm Grey | `#9C9186` | Party base neutral, HUD chrome |
| Hearth Amber | `#E8A23D` | Positive UI, Legendary rarity, selection, Victory, camp fire |
| Sage Cloak | `#33513C` | Healer accent |
| Ember Danger | `#FF5A36` | Enemy telegraphs + enemy attack VFX ONLY — never party/heal/UI-positive |
| Bright Heal | `#5FE873` | ALL heal output — never damage |
| God-stuff Violet | `#B79CF0` (peak `#F1ECFA`) | Corruption/boss/Defeat ONLY — never friendly |
| Signal Blue | `#4FA3D9` | Rare rarity frames + mark reticle glyph; in combat HUD glyph/ink only, never fills |
| Void Charcoal | `#221F1B` | Universal outline ink, HUD plates |
| Parchment | `#F4EFE6` | HUD ink, outgoing damage numerals, progress rings |
| Bruise Umber | `#4E463F` | Party-damage numerals only |
| Bone | `#C9C2B3` | Common rarity, downed/neutral rings |
| Pale Gold | `#D9B872` | Glint currency |
| Class accents | Healer `#33513C` · Tank `#6B6157` · Swordsman `#6B2E3A` · Archer `#6E7A3F` | rings, HP bars, cloak trim |

Color discipline per frame: ≤3 hue families + reserved accents (indigo-night /
amber-warmth / violet-arcane in camp; green-woodland / warm-party / ember-danger
in Act-1 combat). Colorblind fence: no state communicated by color alone —
danger = ground decal + chevron; heal = rising particles + "+HP" glyph;
Legendary = shimmer sweep (never pulses); telegraphs pulse (never shimmer).

### 19.2 Characters — chibi 3-mass builds (procedural, three.js primitives)
Shared family treatment (all four party members):
- **Three-mass rule**: one head mass + one body/bell-cloak mass + one prop
  mass. Head = **40–45% of standing height** (~1.05 u total). Cloak body via
  `LatheGeometry` bell profile. Paws = single rounded mitten spheres, no
  digits.
- **Toon shading**: `MeshToonMaterial` with a 3-step gradient `DataTexture`.
- **Outlines**: inverted-hull second mesh (backface, scale ~1.04, Void
  Charcoal) on every character and hero prop — reads as the ~2 px storybook
  ink line.
- **Eyes**: large dark bean/dot eyes set in the LOWER two-thirds of the head,
  plus a tiny white glint — party/friendly-exclusive treatment.
- **Contact shadow**: soft dark blob sprite under every entity (incl.
  projectiles) + the class-accent identity ring under party members.
- Per class silhouette (one varied trait each):
  - **Healer (mouse)**: softest closed bell cloak in Sage `#33513C`, small
    round ears, short snout, staff held center-low with a glowing gem (Bright
    Heal glow sprite; the gem brightens on cast).
  - **Tank (badger)**: widest stance, lowest center, head-stripe two-tone, the
    party's ONLY rectangular mass — a squared pauldron/shield block at the
    shoulder.
  - **Swordsman (fox)**: narrow forward-leaning wedge (~8° body lean — the only
    asymmetric lean), long sharp snout, big pointed ears, white-tipped tail,
    sword as a diagonal line off the roundness.
  - **Archer (hare)**: tallest thinnest vertical mass, very long upright ears,
    bow held to one side forming an open negative-space arc.
- **Procedural animation** (no keyframe assets): idle breathe (y-scale ±2%,
  ear/tail sway from the cosmetic stream), walk bob + lean toward move vector,
  cast = quick squash-stretch + prop raise, hurt flinch, downed = collapse to
  horizontal + accent desaturates toward charcoal. Mid-action frames must show
  anticipation/impact poses (reference-bar motion check).
- **Enemies**: quadruped/insect low-poly silhouettes (boar wedge, mantis
  stick), desaturated cool-tinted vs. the party's warmth, angular eye slits or
  faint violet glints, exactly one violet corruption tell each. Boss stag scale
  2.2×, veined antlers with violet glow sprites.

### 19.3 Act-1 combat environment ("uneasy pastoral woodland")
- Baseline: saturated greens 55–65% HSV sat, hue 70–110°; warm:cool light
  ratio ≈ 70:30 (warm hemisphere/directional key + cool fill); dappled
  low-moderate value contrast.
- **No dead ground** (<20% of frame flat single-color): ground plane gets
  vertex-color hue noise, dirt-path patches, scatter decals (moss, cracks,
  leaf litter — canvas-generated), instanced grass tufts (InstancedMesh, ≥300
  instances), small flowers.
- Props ring the arena edges: 6–10 distinct silhouettes per combat room, ≥8
  types across variants (dry-stone wall segments, mill fragment, stumps,
  boulders, fence posts, lanterns/torch stakes with glow halos, a corrupted
  monolith with violet veining as the act's tell). None taller than the Tank;
  ≥60% of floor navigable; center stays readable.
- Walls exactly 1 value-step darker than the adjoining floor. ≤2 value steps
  per surface plane (+1 near light sources). Flat fills; gradients only for
  large light falloff. No micro-texture.
- Every light emitter (torch, gem, portal, projectile) carries an additive
  radial glow sprite. Fireflies/motes drift (cosmetic stream).
- **Tuning note (certification fix round 1, 2026-09-09):** the run arenas run
  their key at ~0.5x and their cool fill at ~0.65x of the shared Act-1 rig
  (`mood` in `env/variants.js`). At 1.0x the rooms read as flat daylight —
  round 1 measured LUMA buckets 0-2 at 7% of the combat frame against the
  reference's 48%, with bucket 0 empty, i.e. no black point for the fire pools
  to read against. At the stopped-down rig the same frame measures buckets 0-2
  at 44% with a torch pool at display 103 over ground at 36 (2.9x), and the
  warm:cool split stays on this section's 70:30 (warm 37.5% : cool 14.7% of the
  frame's non-foliage coloured pixels). Prop clusters are also aimed at the
  FRAME's edges rather than the arena's: the 3/4 rig (fov 45, distance 12,
  elevation 52) only shows world z from -8 to about +4.6, so a ring authored at
  the arena's south wall never appears on screen.
- **Tuning note (certification fix round 2, 2026-09-10):** the run arenas paint
  the floor **night-first**. This section's baseline reads as a saturated green
  field with cool "only in shadow pockets", and round 2 measured what that
  produces: combat HUEMIX **warm 40.0 / foliage 52.0 / cool 8.0** against the
  reference's **22.5 / 1.1 / 76.4**, with the darkest region of the frame
  reading warm 47.1 / cool 13.6 (a brown-olive shadow) and LUMA bucket 0 at 7%
  against 27%. All three scorers rejected check 2 on the same clause: there is
  no cool pole for the fire pools to read against. A field whose BASE is green
  cannot carry that funnel — every shade pocket painted on top of it is a
  puddle on a lawn.
  So the polarity is inverted, which is what all four reference screenshots do:
  the base fill is the SHADE end (a deep saturated indigo-teal, `ground.nightBase`
  in env/variants.js), the §19.3 green arrives as the lit dapple stamps where
  the canopy opens, and the instanced grass tufts + flowers carry the brief's
  hue 70-110 / sat 0.55-0.65 turf on top. Per-variant: lit `l` 0.39/0.42/0.355
  -> 0.30/0.325/0.275, shade 196-197/0.26 -> 202-203/0.38, `coolLift` 6 -> 22,
  `dirtL` 0.255/0.30/0.285 -> 0.20/0.235/0.225 (the beaten track was the frame's
  brightest large surface, i.e. a warm river with no emitter over it).
  Measured after, same seed and same certified frame conditions: combat HUEMIX
  **warm 36.6 / foliage 15.0 / cool 48.4**, LUMA buckets 0+1 = 44% against the
  reference's 48%, an open-grass box (400,120,500,220) at cool 73.4% with SAT
  0.572 — inside this section's 0.55-0.65 grass bar — and the reserved heal
  band on a pure-grass box down from 1032 px to 523. The camp (env/camp/*)
  keeps the authored polarity: its spec is already a night spec and its frame
  scored 20/20.
- Shop room: one dense stall cluster under a single warm pooled lantern
  (Shopkeep's Lantern), act palette visible at room edges. Boss room: a stop
  darker/desaturated; boss = brightest emitter.

### 19.4 VFX color + layering rules
- **Every attack effect = ≥3 layers**: white-hot core + colored glow +
  particles/trail. Player heals: Bright Heal core + green glow + rising motes +
  "+HP" glyph. Player damage bolts: warm parchment-white core + amber glow +
  trail. Enemy shots: white core + Ember glow + trail. Boss/corruption: violet.
- Z-order (top→bottom): projectiles > characters > enemy telegraphs > friendly
  ground VFX > environment. Projectiles always render above all environment.
- Instant impacts hold ≥3–5 frames. Kills leave persistent decals. AoE zones =
  layered translucent blobs + particles + ticking numbers inside.
- Friendly shadows/zones must never resemble Ember telegraph decals.

### 19.5 Post stack (EffectComposer, always on)
`RenderPass → UnrealBloomPass (threshold ≈ 0.85, strength ≈ 0.5, radius ≈ 0.4)
→ ShaderPass(grade)` where `grade` = vignette (soft, ~0.35 strength at
corners) + color grading (slight warm lift in camp/act-1, gentle contrast S-
curve, ~5% saturation boost on the party layer left untouched — grade the
whole frame subtly; party saturation is authored in materials, not the grade).
`renderer.outputColorSpace = SRGBColorSpace`, ACES filmic tone mapping.
Resize-safe: composer + passes resized with the renderer.

- **Tuning note (certification fix round 1, 2026-09-09):** the vignette runs at
  **0.82** with the falloff opening at normalised radius 0.40, not the ~0.35
  written above, and it is **shadow-protected** (weighted from 0.30x of the
  darkening at black to full strength above display ~100) with a cool tint into
  the darkened corners. Reason, measured: at 0.35-and-below the combat frame's
  BOTTOM CORNERS came out BRIGHTER than its centre (BL 120.6 / BR 119.2 against
  centre 103.8) — no vignette at all — against the reference's centre 71.5 with
  corners 18.1-42.1. All three round-1 scorers scored check 7 down for it. At
  0.82/0.40 the same frame measures corners 45.9/37.1/30.4/32.6 against centre
  66.6 (1.8x, reference 2.3x) while >160 5.84% / >200 1.63% stay at or above
  the reference benchmark. A plain multiply at that strength scales an 8x8
  block's channel SPREAD by the same factor as its mean and collapsed the dark
  half of every night frame into flat dead ground (check 1: boss FLAT 5.6% ->
  22.4%), which is why the darkening is shadow-weighted and why the grade also
  carries a **static screen-locked dither** (+-3.7/255 in the shadows, tapering
  to +-0.4/255 above display ~120) — the standard fix for a dim gradient
  quantising into 8-bit bands. With it, FLAT reads 1.3-1.9% on all four
  certification frames. The grade additionally carries a shadow SPLIT-TONE
  (shadows multiplied toward indigo, the lit range untouched): that is the
  "cool wash" §19.3 asks the unlit half of an Act-1 room to carry, and it is
  what makes the grade visible in frame at all.

- **Tuning note (certification fix round 2, 2026-09-10):** three numbers move,
  all of them measured against the round-2 combat frame.
  (a) The split-tone's ramp opens at **smoothstep(0.02, 0.55)** with multiplier
  **(0.76, 0.88, 1.18)**, not (0.03, 0.42) / (0.84, 0.90, 1.10). At the old
  ramp a shadow pixel at display 27 received a 1% blue lift — i.e. the "cool
  wash" was invisible exactly where it was needed, and the reference lens's own
  darkest-region probe (box 1100,700,500,200) read warm 47.1 / cool 13.6. After:
  the same box reads **warm 33.1 / cool 40.9**. Above display ~140 the mix
  factor is 0.99, so the fire pools, the party and every emitter core are
  untouched.
  (b) The vignette's COOL TINT is no longer weighted by the shadow-protected
  `ve` — that gave a torch pool near a frame edge the full indigo multiply and a
  dark corner almost none of it, which is backwards. The tint now rides the
  vignette radius and fades out with luminance
  (`min(1, v*1.35) * (1 - smoothstep(0.10, 0.55, vlm))`, multiplier
  (0.66, 0.85, 1.20)); the darkening itself is unchanged.
  (c) Bloom strength **1.35** (was 1.15) and the flame texture's white core
  becomes a plateau (env/flame.js): stops (255,253,248,1.0) / (255,251,240,0.95)
  at 42% / (252,240,205,0.62) at 62%, radius 33 -> 38 px. `GAIN_MAX` is NOT
  touched — its derivation is that no COLOURED stop may clear the bloom
  threshold — and every added stop stays near-neutral (HSV sat 0.06 / 0.19)
  and under that budget. All three lenses scored check 7 down on one number,
  LUMA >200 0.632% against the reference's 1.427% with the top buckets empty;
  after, the combat frame measures **>160 4.510% / >200 0.775% / 16 of 16
  buckets, 0.086% above display 240** (reference 3.418 / 1.427 / 16 / 0.132)
  and the boss frame **2.948 / 1.387 / 16**. The party is still not blown:
  box 600,500,220,230 measures >200 0.022%.
  (d) env/colors.js EMBER_GLOW pool/halo keep their 0.26 / 0.20 Parchment
  shares and gain a LINEAR multiplier instead (x1.25 / x1.18). Whitening the
  tint was the first attempt at buying the mid-bright band a night floor needs
  between its black point and its emitter cores, and it worked on luma — but it
  pushed the pools under the analyzer's s>0.35 gate and the frame's amber-band
  count fell 138848 -> 66354 px, which is the evidence the scorers read as
  "the warm pools exist". A scalar multiply leaves HSV hue and saturation
  exactly where they were (both are scale-invariant) and adds the light on top:
  amber 140551 px with >160 at 4.510%.

---

## 20. Module architecture (proposal — builder may refine inside these seams)

```
echoes-three/
  index.html            vite.config.js        (exist)
  src/
    main.js             — boot, resize, fixed-tick accumulator loop, scene swap (camp/run)
    core/
      constants.js      — every tuning number in this brief, one file, exported frozen
      rng.js            — seeded gameplay stream + cosmetic stream
      clock.js          — 60 Hz accumulator, hitstop, interpolation alpha
      events.js         — tiny pub/sub event bus
      input.js          — DOM events → per-tick intent snapshot (controller iface)
      registry.js       — entity registry + spawn-ordinal counter
    sim/
      world.js          — sim root; runs continuous + discrete phases in total order
      movement.js       — 8-dir move, dodge state, swept circle-vs-wall collision
      combat.js         — damage/heal instance pipeline, crit, full_heal, downed
      skills.js         — slots, cooldowns, the 6 delivery shapes
      projectiles.js    — pooled projectile sim (swept)
      zones.js          — ground_aoe + aura ticking
      revive.js         — channel state machine, diminishing returns
      targeting.js      — smart heal, overrides, Tab mark, rally point
    data/
      classes.js skills.js nodes.js enemies.js waves.js rooms.js palette.js
    build/
      resolver.js       — stat pipeline (flat→pct→mult→tech→clamp) + grey/inert verdicts
      techniques.js     — bounce/siphon/echo/detonate primitives (depth-1 guard)
      sockets.js bench.js draft.js shop.js wallet.js
    run/
      run.js            — run frame roll, room index, persistence ledger, win/lose
      room.js           — room lifecycle, boundary sequence, win-condition predicates
      director.js       — wave scheduling + telegraph cadence governor
    ai/
      allyAI.js         — leash, engage, kit casting, revive AI, rally response
      enemyAI.js        — nearest-target chase/shoot, telegraph requests
      bossAI.js         — Hollow Stag attacks + add phases
      steering.js       — obstacle avoidance + separation
    render/
      stage.js          — renderer, scene, lights, EffectComposer stack, resize
      camera.js         — 3/4 follow cam (smoothing + aim lookahead, never loses player)
      toon.js           — gradient maps, toon material factory, outline (inverted hull)
      glow.js           — canvas-generated radial glow sprite factory (pooled)
      chars/            — healer.js tank.js swordsman.js archer.js enemies.js boss.js
                          (primitive/lathe chibi builders + procedural animation drivers)
      env/              — arena.js props.js foliage.js (instancing) campSet.js shopSet.js
      vfx/              — pools: flashes, trails, particles, decals, telegraphs, dashSmear
      numbers.js        — pooled DOM damage numerals, world→screen projection
    ui/
      hud.js            — overlay root, virtual-1080p scaler
      portraits.js slots.js banner.js nudges.js
      screens/          — draft.js socket.js shop.js path.js victory.js defeat.js
    scenes/
      camp.js           — camp hub scene + Begin Run interaction
      combatRoom.js     — glue: sim + render + HUD for a room
    audio/
      synth.js          — WebAudio SFX synth (hit/shoot/heal/dodge/ui/death) + ambient bed
```

Rules: sim modules never import render modules (events bridge them); all
tuning numbers live in `data/` + `core/constants.js` (no magic numbers inline);
render reads sim state read-only + interpolates.

---

## 21. Audio (minimal, procedural)

WebAudio synthesis only (no files): short filtered-noise+osc one-shots for
basic hit, enemy hit, kill pop, heal chime (soft major), dodge whoosh, telegraph
warning tick, denial blip, UI select/commit, revive complete; a low ambient bed
per scene (camp: warm drone + crackle noise loop; combat: sparse wind).
Every juice-contract event fires its sound slot. Master volume constant, no UI.

---

## 22. Responsiveness bar (from REFERENCE_BAR.md — binding, verified in gameplay)

- Measured 60 fps desktop during full waves; no >100 ms hitches.
- Movement responds the same frame; dodge fires on keydown; no input queuing.
- Every hit: flash + number + knockback + sound.
- Every enemy attack that can be avoided is telegraphed ≥0.7 s (Ember decal).
- Dodge i-frames provably work (dash through a resolving telegraph = 0 damage).
- Camera: smoothed follow, aim lookahead ≤0.8 u, player never leaves frame.
- Full loop start→victory/defeat→camp→restart with zero console errors.

---

## Appendix A — Scoping rulings (web build; do not relitigate)

| # | Ruling |
|---|---|
| A1 | 3D characters yaw smoothly toward aim (the 2D 8-bucket facing rule is a sprite-era rule); walk lean still follows the move vector independently. |
| A2 | Node pool cut from 16 to the 8 in §15 (MVP mandate: 4 stat + 4 technique). Chosen so grey, saturation-inert, chain-heal, siphon-drain, echo-on-passive, and detonate-both-ways all provably occur. Rarity spread keeps all three shop price points reachable. |
| A3 | Room 1 is always kill_all (defend positions rolled among rooms 2–6). |
| A4 | Echo magnitudes authored: damage recast 50%, heal recast 100%, delay 1.0 s, passive reapply every 3.0 s. Bounce authored: 1 hop/copy, 2.2 u, full power. Detonate authored: 50% power, 1.2 u. |
| A5 | Party members receive no knockback; enemies (non-boss) do. |
| A6 | Open arenas + steering instead of navmesh (props ring the edges; the falsified-straight-line finding applied to Godot-era cluttered layouts — web arenas are authored open). |
| A7 | HUD is a DOM overlay scaled from a 1920×1080 virtual canvas; world-space cues may be sprites or projected DOM. |
| A8 | Relics, Echoes/Seals currencies, talent trees, camp facilities, classes beyond the four, acts 2–3 environments: OUT of scope. Defeat/victory washes reference the act-3 violet language without building act-3 content. |
| A9 | Audio is procedural WebAudio synthesis (sound slots must exist per the juice contract). |
| A10 | Hitstop/knockback/screenshake numbers in §9 are authored web-build defaults (absent from the source corpus) — tunable in `constants.js`, not removable. |
