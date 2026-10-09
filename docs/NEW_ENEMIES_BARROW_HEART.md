# New enemies: the Barrow and the Heart

Content plan 3, slice 4. Two new rank-and-file enemies for the Ashen Barrow
(Act III) and two for the Hollow Heart (Act IV), so the Heart has six of its
own. Each has its own attack, its own Ember telegraph, its own rig and its own
voice.

## Where they appear

- **Campaign only.** `CAMPAIGN_ONLY_ENEMIES` in `src/data/levels.js` lists
  `keener`, `sexton`, `bloom` and `siphon`; `planRoom` (src/sim/waves.js) drops
  them unless the run plan says `campaignKinds` (run.js passes
  `objectivesOn()`). The legacy run and the tutorial never plan them, so the
  nine goldens stay byte-identical. Endless and the Daily start through
  `startCampaign`, so they get them too.
- **From room 3.** Both acts' rosters carry them with `introduce: 3`
  (Barrow: keener 0.11, sexton 0.09; Heart: bloom 0.10, siphon 0.11).
- **Endless.** Endless lands mix them in as guests like any act kind
  (`GUEST_WEIGHT`, from room 4).
- Threat (src/data/difficulty.js): keener 1.4, sexton 1.3, bloom 1.5, siphon 1.5.

## The four

| Kind | Name | Role | HP | Attack | Telegraph |
|---|---|---|---|---|---|
| `keener` | Ash Keener | Mourner | 24 | Wail down a cone (r 4.2, ±28°) for 10, 40% slow for 2 s | cone, 54 ticks, governor-gated |
| `sexton` | Barrow Sexton | Trapper | 28 | Buries bone snares (max 3); sprung jaws snap for 11, 60% slow 1.25 s | ring r 0.95, 42 ticks, not player-targeted |
| `bloom` | Heart Bloom | Pulse | 34 | Roots, then pulses on every second heartbeat for 12 | ring r 2.3, 54 ticks, not player-targeted |
| `siphon` | Vein Siphon | Drinker | 20 (flier) | Lash down a lane for 5, latch, drink 2 every 0.5 s and heal by it | lane 0.7 wide, 54 ticks, governor-gated |

### Ash Keener (src/sim/enemies/keener.js)
Drifts at 2.0 to 3.4 u. Every 270 ticks (first at 80) it raises its head and
keens: a cone telegraph aimed at its target. Everyone in the cone on the
resolve tick takes 10 and a 40% slow for 120 ticks. A stun spills the wail.

### Barrow Sexton (src/sim/enemies/sexton.js)
Keeps 3.0 to 4.6 u and never strikes. Every 300 ticks (first at 100) it kneels
for 36 ticks and buries a snare up to 1.8 u toward its target. A snare is a
slick (variant `snare`, no slow of its own) that arms after 45 ticks and lasts
20 s. A party ground body stepping onto an armed snare springs it: a ring
r 0.95 rises for 42 ticks, then snaps for 11 and a 60% slow for 75 ticks on
everyone inside. Fliers never spring it. Three snares at most (the oldest
crumbles); a stun mid-dig spoils the grave; its snares crumble when it dies.

### Heart Bloom (src/sim/enemies/bloom.js)
Creeps at 0.7 u/s and roots for good once a party body is within 2.4 u, or
after 240 ticks. Rooted, it ignores knockback and beats with the husks'
heartbeat (`HEARTBEAT` in husk.js): `bloomOpens(tick)` opens a ring r 2.3 on
every second beat, closing on the surge for 12. Every bloom pulses on the same
beat. It only opens with a party body within 6 u.

### Vein Siphon (src/sim/enemies/siphon.js)
A flier that keeps 2.8 to 4.4 u. It lashes down a lane toward its target; the
first party body in the lane takes 5 and is latched. Latched, it drinks 2
every 30 ticks for 180 ticks (contact damage, no knockback) and heals by what
it took. The tether breaks when the prey walks beyond 5.6 u, when the siphon is
stunned, when either falls, or when the drink is done.

## Affixes (src/sim/affixes.js)
Vampiric skips the Siphon (it already drinks); Blinking and Hasted skip the
Bloom (it never moves once rooted). The Keener and the Sexton take every
power. None of the four splits or summons, so the Splitting and Broodling caps
are untouched.

## Render, VFX and sound
- Rigs: src/render/enemies/barrowheart.js (crown heights in archetypes.js).
  The Barrow pair wear the indigo tell (the Keener's mouth, the Sexton's
  lantern); the Heart pair are violet crystal and flesh.
- Snares and the siphon's tether: src/render/enemies/extras.js.
- VFX recipes and deaths: src/render/vfx/signature.js (marks `keener_wail`,
  `sexton_bury`, `sexton_snare_trip`, `sexton_snare_snap`,
  `sexton_snare_crumble`, `sexton_spoil`, `bloom_root`, `bloom_open`,
  `bloom_pulse`, `siphon_lash`, `siphon_latch`, `siphon_drink`,
  `siphon_unlatch`, and `<kind>_death`).
- Sounds: src/audio/barrowheartcues.js, twelve `bh_*` cues, calibrated with
  `node tools/smallfixes2-cuecal.mjs --only barrowheartcues --write`.
- `?vfxlab=1`: Enemies, Act III and Act IV rows.

## Probe
`node tools/new-enemies-bh.mjs` checks the four kits, the rosters, the
campaign gate, the affix rules, the journal rows and save round trips.
