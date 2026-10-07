# Tutorial

v0.5.228. A guided first room for new players, and one-time tips for the
systems they meet later.

## Player view

- **The first New Game** asks *Play the tutorial?* (Play the tutorial / Skip).
  Either answer stores `tutorial.seen`, so the question comes once. Skip goes
  straight to the camp.
- **The guided room** is Level 1 room 1 in the spring clearing (layout 2),
  with the AI party along. A coach card above the command bar walks seven
  steps:
  1. Move (W A S D): walk 2.5 units.
  2. Attack: hold the right mouse button.
  3. Dodge: press Space.
  4. Use: drink from the spring with E (the step lets go after 45 s).
  5. Clear the waves: the coach releases them now. The room is gentle: half
     the threat budget, enemies at 60% health and 40% damage, no elites.
  6. Your first skill: a centred card over the reward page explains that
     everyone starts with only the basic attack and dodge and skills come
     from wave rewards.
  7. Pick a door: a centred card over the doors. The door ends the tutorial.
- Back in camp a closing card names C (class), U (Embers) and the portal.
- **Skip tutorial** on the coach, or Quit to Lobby from the pause menu, ends it
  early. A party wipe also just goes home. None of these is a run: no record,
  no Embers, no defeat card.
- **Settings ▸ Gameplay ▸ Play the tutorial** replays it from the camp (not in
  a run, not online). **Show tips again** brings the tips back.
- **Online play** never starts the tutorial.

## Tips

A centred card the first time the player meets each of:

| Id | When |
|---|---|
| `classes` | class select opens |
| `relic` | a relic pick (phase `relic`) |
| `curse` | a path screen with a cursed door |
| `peddler` | the shop |

A tip is marked seen when it appears (`tutorial.tips`, comma list), and it
holds the keyboard until Got it / Enter / Space / Esc, so a key meant to close
it never commits the page underneath. It also closes when its page closes.
The guided room's reward and door lessons use the same card. Harness boots
(`?seed=`, `?room=`, `?menu=0`, ...) show no tips unless `?tips=1`; `?tips=0`
turns them off on a player URL.

## Sim

`startCampaign({ tutorial: true })` (`src/sim/run.js`):

- the campaign record carries `tutorial: { hold }`; `view()`, `campaign()`
  and `run_start` carry a `tutorial` key only on a tutorial run, so every
  other run, save and golden trace is unchanged;
- relics are off, no boons, challenge standard;
- room 1 uses `TUTORIAL_LAYOUT` and `tutorialDiff()`, and the wave director's
  `beginRoom()` waits for `tutorialRelease()`;
- `choosePath`, `abandonRun` and a defeat call `endTutorial(reason)`:
  `tutorial_end { reason }`, `run_end { result: 'tutorial' }` (the save system
  skips it), then `return_to_camp { reason: 'tutorial' }`.

Camp: `cmd('campTutorial')` starts it like Begin Run (single-player only).

## Checks

- `node tools/tutorial-browser.mjs [--lang <code>] [--shots <dir>]` (dev server
  on 5199): the offer, all seven steps driven by real keys and mouse, waves
  held then released, Enter closing a lesson without committing the page, the
  door ending it in camp with no record, each tip once, no missing line, no
  page error.
- The nine goldens (`node tools/gntM2-goldens.mjs`) stay 9/9.
