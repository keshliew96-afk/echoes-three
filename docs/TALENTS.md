# Talents

Every hero's talents: three play-style paths, picked at camp between runs. BUILD_BRIEF A24
(Kesh, 2026-11-17, "Yes") puts talents in the game's scope and replaces A8, A11 and A19 for talent
trees only; the Echoes/Seals currencies and camp facilities stay out. **Nothing here is in the game
yet**: the talents are built only after the feature freeze lifts. Until then the designs live in the
project folder, and this doc holds the rules every hero's talents share and the plan for building them.

## Designs

| Hero | Design | State |
|---|---|---|
| Mosslight (Healer) | `/mnt/project-files/mosslight-talents/MOSSLIGHT_TALENT_PATHS.md` v2.2 (lines T1 to T54), on the skill kit `MOSSLIGHT_SKILL_KIT.md` v1.7 | Finished: every pick closed by Kesh, 2026-11-17. Paths Spring (tempo), Evergreen (weight), Harvest (conversion) |
| Stonehide, Ashfang, Windbriar, Tide Caller, Bellwright, Duskwing | Not made | Each gets its own design doc in the same shape when Kesh reaches it (one-line seeds in the Mosslight doc, T41) |

A hero's design doc fills in: the grid of fifteen talents, the shared rules its talents use, a combo
check, a table of every skill under the talents, the look and sound, and the AI rules. The numbers
in it are first guesses until they are measured in play (below).

## The template (every hero)

From the Mosslight doc, T1 to T15. Read that doc for the full wording.

- **Three paths per hero**, each a play style and a column of talents. The pattern that fits any
  hero: tempo (more casts, each smaller), weight (fewer casts, each lasting longer), conversion (the
  hero's off-role output feeds its main role). A hero with no talent picked plays exactly as today.
- **Five tiers, three talents in each (one per path), one pick per tier from any path.** A path is
  not a lock (Kesh, 2026-11-16): any mix is allowed, so a hero has 3^5 = 243 builds, and a tier may
  be left empty.
- **Every talent works alone.** No talent needs another to do something; talents of one path build
  on each other as a reward, never a requirement.
- **Each tier has one job**, the same for every hero, so two talents that push the same lever can
  never be held together: I Style (the rule that sets the play style, may carry a trade), II Power,
  III Trick, IV Reach (range, area or capacity, no extra output), V Capstone.
- **Camp only, changing is free.** Nothing changes during a run. The picker is on the hero's card in
  the camp's hero pick (K): five rows, three columns, one pick lit per row.
- **Embers buy tiers, not talents.** Tier I is free; tiers II to V cost 20, 40, 60 and 80, bought in
  order, and buying a tier opens all three of its talents for good. One build is kept per hero.
- **A talent only changes its own hero**: never drafts, rewards, rooms, foes or another hero's kit.
- **Budget.** A tier I talent is worth about +20% of the hero's main output in its style, a one-path
  build about +50%, and no mix of five picks beats about +70%.
- **Stacking.** Talent cooldown changes add together, then multiply after the skill's nodes; the
  0.5 s floor stays. A talent's status never adds to or lengthens a stronger status of the same kind
  from a skill or node. A talent's repeat of a cast is not a cast.
- **Look and sound.** Every talent rule shows a look and plays a sound when it fires; skill cards and
  the HUD show the changed numbers; colours follow `.claude/rules/visuals.md`.
- **Which runs wear it.** Every run that takes camp loadouts (the run's `boons`). The tutorial never
  does. The Daily wears the tier I pick only. In co-op each human wears their own profile's picks on
  their own hero, and AI seats wear the host's. AI seats and the autopilot play every talent that is on.
- **Old profiles** show tier I open with nothing picked and play as today. A run saved mid-way keeps
  the picks it started with.
- **Goldens.** The legacy run takes no loadout, so no talent reaches it and the nine goldens stay
  identical.

## Building it (after the freeze lifts)

Each piece goes in the module that owns the job (one implementation per system):

1. The talent table and its numbers: one frozen table, `src/data/talents.js`, nothing hard-coded elsewhere.
2. Buying and picking: tier rows of a new kind in `src/data/unlocks.js`, the profile block in
   `src/save/profile.js`, and `loadoutBoons()` (`src/data/unlocks.js`) handing the run
   `boons.talents` (for each hero, the pick of each tier or none). The Daily takes no boons today
   (docs/UNLOCKS.md), so its tier I pick needs its own path in.
3. Cooldown changes and charges: the slot machinery in `src/sim/skills.js`.
4. Heals over time and other heal changes: a party-only status kind, and the switch inside the one
   `deliver` in `src/sim/allycast.js`.
5. Talent statuses: `applyStatus` (`src/sim/skills.js`) refreshes to the larger size and the later
   end, so a talent status needs its own record to keep the stacking rule above.
6. Hero-specific stores (such as Mosslight's Sap) live in the sim, on the seeded tick, saved with the run.
7. AI rules in `src/sim/autopilot.js` and `src/sim/partyai.js`.
8. UI in `src/ui/run/classpick.js` and the HUD; all text in ten languages (about 36 strings per hero).
9. One probe, `tools/talents-probe.mjs`, that also walks every hero's 243 builds for a dead or broken pick.

**Measuring the numbers.** Run the same headless autopilot seeds with no talents, with each tier I
talent alone, with the three one-path builds and with the strongest mixes from the hero's combo
check. Compare clear rate, downs, healing, overheal and damage. Tune until the three one-path builds
land within about 10% of each other on clear rate and no mix beats the budget ceiling.
