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

## Determinism

- The Healer is the default. With the Healer chosen, single-player steps exactly as before (`world.step(tick, sampleIntents())`), so plain runs, replays and the 9 golden traces are unchanged (`node tools/gntM2-goldens.mjs`, 9 of 9).
- Another class steps the world the way a network host on that seat does: the local input becomes that seat's `SeatInput` (one frame per tick, its seq is the tick so the seat's frame-clock timers survive a save and reload), the Healer's snapshot comes from the leader bot, and every other code path is the existing M5b seat path.
- The leader bot is the autopilot with `pages: false`; its config carries `leader: true` so a harness autopilot is never switched off by class select.

## Verification

- `node tools/classpick-browser.mjs` against `npm run dev`: a fresh profile plays the Healer; C and a click pick the Swordsman; real keys walk it in camp (not the Healer); a camp-started run has it human-held with its kit on the command bar, real keys move and cast it, the reward waits for the player; the choice survives a reload; picking the Healer hands it back. Screenshots `captures/class-1..4-*.png`.
- `node tools/classpick-net.mjs` against `npm run dev` (own server on port 7911): the host takes the Archer and the guest the Swordsman, a taken class is refused, each page's keys move its own body, the empty Healer seat is the bot, the reward waits for the host, guests are told the Archer decides.
