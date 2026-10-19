# Class select

Play any of the four classes, not only the Healer. Round-7 queue item "player chooses their character" (PROGRESS.md).

Code: the solo seat driver and the setting in `src/app/playclass.js`; the picker screen in `src/ui/run/classpick.js`; the camp entry in `src/scenes/camp.js`; the viewer's seat for the run pages in `src/app/viewerseat.js`; the co-op seat rules in `server/lobby.mjs`, `src/net/protocol/messages.js`, `src/net/seats.js` and the lobby screen `src/ui/menu/lobby.js`.

## How a player uses it

- In the camp, **C** (or the portal prompt's *Class* chip, which names the class you play) opens the picker: four cards with the critter, role, health, speed and starting skills (the equipped unlock kit's skills when one is worn). Pressing a card picks it and closes the picker.
- You walk your class's critter around the camp and through the portal. In a run you control that body: WASD, aim, right mouse for the basic, 1 to 4 for its four skills, Space to dodge, E to interact and hold E to revive.
- Rally (R) and the target calls (Tab, F1 to F4) are the Healer's party commands, so they only work while you play the Healer.
- The other three classes are played by the AI, so the party is always the four classes the game is balanced for. When you are not the Healer, the Healer is played by the same bot the autopilot uses, in combat only: drafts, doors, relics and the shop stay your decisions.
- The between-room pages open on your own class's card and socket build; the other three are the AI-held seats you can still adjust, as before.
- The choice is remembered (setting `gameplay.playClass`, kept in this browser). A run keeps the class it started with.
- Unlock kits and tints are per class, so they apply to whichever class you pick.

## Co-op

- Seat index is still party index is class (0 Healer, 1 Tank, 2 Swordsman, 3 Archer). In the lobby every player, the host included, picks a class by taking its free seat; a taken class reads *Taken* and the server refuses it. A player arriving in a lobby moves to the class they chose in camp when it is free, and a class picked in the lobby becomes their camp choice too.
- A joining guest gets a free ally seat first, then the Healer's if the host left it.
- Unpicked seats are played by the AI on the host; an empty Healer seat is the leader bot (combat only).
- The between-room choices are the host's, whichever class the host plays; guests' banners name the host's class.
- If the host leaves a lobby, the next player becomes host and keeps their class.
- In a session the camp's Class chip is hidden: the class is the lobby seat.
- At camp every player-held seat (a guest's, or the class the host or a solo player walks) faces its own aim, standing or walking, and takes the cast pose when it fires, exactly like the Healer; only seats the AI holds idle toward the hearth. On its own page a player's critter turns to the local mouse; other pages show the replicated facing (`playerHeld()` in `src/scenes/camp.js`).
- What a guest can do at camp: walk, aim and fire its own seat, talk to the camp NPCs, open its own Slots, Unlocks, Journal and settings, open the Level Select (the map table, L, pad B) and walk through the portal. A guest's Begin Run or level card goes to the host as a `camp` CMD (`session.campBegin`); the host's camp (`guestBegin`) runs its own checks (the host's unlocks, Endless and Boss Rush open on the host's profile, nobody mid-pick, the guest's body in the gate) and starts the run for the party exactly as its own press would, with a note naming who set out. A refusal comes back as a note on the guest's screen. The Daily stays single player. The Level Select a guest sees shows its own profile; the host's profile decides what starts. The class is the lobby seat for everyone in a session.
- A player walking Rill, Tolly or Sable is that hero: their camp bubble stays shut and E does not talk to themselves (`isSelf` in `src/scenes/campnpcs.js`).

### Guest vs host in runs (v0.5.315)

A guest plays a run with what the host has. Checked on two pages through a campaign run (and the Endless and Boss Rush runs share the same code): moving, aiming, the basic, dodge, the four skills, E on every interactable (shrines, vaults, encounters, secret bodies, revives), the tonic slot, breaking a secret wall, the own draft card, the own socket screen and loadout order, the own purse at the Peddler (cards, relics, the tonic stand, refresh) and Done. What was not equal, now fixed:

- **A guest playing the Healer** (the host on another class, or a host who came back after a migration) now owns the Healer the way an ally-seat guest owns its hero: it takes or leaves the Healer's draft card and moves its Replaces mark, sockets and auto-fills the Healer's build, shops from the run wallet and refreshes its shelf. These go to the host as the same `party` CMDs (seat 0) and the host applies them through the single-player entry points (`takeReward`, `buy`, `world.buildSystem`). While a guest plays the Healer, the host's own UI no longer decides or edits that card or build (`hostMayAct(0)` in `src/net/session.js`). Before, the host decided the Healer's build for the guest and the guest's own presses were refused.
- **The Healer's party commands from a guest.** Rally (R), Mark (Tab) and the heal target (F1 to F4) now ride the input frame (press bits 11 to 15, `src/sim/netseats.js`) when the sender plays seat 0, so a guest Healer has them as a host or solo Healer does. Any other seat's frame still drops them (they stay the Healer's, solo too).
- **The Peddler countdown** waits on every human other than the one who pressed Advance, whichever seat the host plays (`leaveBy` on the party shop). Before, a host on another class kept waiting on itself, so the last guest's Done did not let the party leave and the 15 s countdown ran out.
- **"Socket my new nodes"** changed by a guest during a session now reaches the host (it was sent only at join).
- **The party tabs** on the host mark the host's own class "you" and a guest Healer with the guest's name (the Healer tab read "you" for any host).
- **The off-screen threat markers** rank threats by distance from the viewer's own hero, and a sound with no place of its own plays at it (both used the Healer's body).

Kept as the host's by design (one call for the whole party): the doors, the party relic, the event cards, the Spire-or-Kiln road, the level card's advance, the end card, Quit to Lobby, saving, and the Ally builds mode for the AI seats. A guest's press on these is shown to the party as a ping.

Probe: `node tools/guest-vs-host-runs.mjs` against `npm run dev` (own server on port 7932, two browsers, the host on the Archer and the guest on the Healer).

## Determinism

- The Healer is the default. With the Healer chosen, single-player steps exactly as before (`world.step(tick, sampleIntents())`), so plain runs, replays and the 9 golden traces are unchanged (`node tools/gntM2-goldens.mjs`, 9 of 9).
- Another class steps the world the way a network host on that seat does: the local input becomes that seat's `SeatInput` (one frame per tick, its seq is the tick so the seat's frame-clock timers survive a save and reload), the Healer's snapshot comes from the leader bot, and every other code path is the existing M5b seat path.
- The leader bot is the autopilot with `pages: false`; its config carries `leader: true` so a harness autopilot is never switched off by class select.

## Verification

- `node tools/classpick-browser.mjs` against `npm run dev`: a fresh profile plays the Healer; C and a click pick the Swordsman; real keys walk it in camp (not the Healer); a camp-started run has it human-held with its kit on the command bar, real keys move and cast it, the reward waits for the player; the choice survives a reload; picking the Healer hands it back. Screenshots `captures/class-1..4-*.png`.
- `node tools/classpick-net.mjs` against `npm run dev` (own server on port 7911): the host takes the Archer and the guest the Swordsman, a taken class is refused, the host's keys move the Archer in camp and in a run, the empty Healer seat is the bot, the reward waits for the host, guests are told the Archer decides. A guest's seat is human only while its input frames keep arriving; under software GL in a Linux cloud (two pages near 1 fps) the host falls back to the AI between frames, exactly as on gauntlet before class select, so the probe reports the guest's seat instead of gating on it.
- `node tools/camp-guest-facing.mjs` against `npm run dev` (own server on port 7931): the guest takes the Tank, points its mouse west of its critter (away from the fire) and stands still; the Tank faces west on the guest's page and the host's and still does three seconds later; walking south with the mouse west it still faces west; the AI Archer still idles toward the hearth; the guest walks into the portal, sees Begin Run, presses E, and the host starts the run with both pages in room 1. `--shots <dir> --tag <name>` saves the pages.
