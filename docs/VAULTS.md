# Keys and vaults

Content plan 3, slice 2 (v0.5.255). Elites and champions drop a **vault key**.
While the party holds one, a locked **vault door** can show on the path
screen. Behind it waits a treasure room with no fight: three Glint piles, a
food platter and a relic chest.

## Where they appear

- Only in campaign runs, which include Endless Descent and the Daily Descent.
  Never in the tutorial or the legacy single-level run, so the nine goldens
  never see a key.
- A key is not a currency. The party holds at most one. It lasts the level it
  was found in and is lost at the level's end, used or not. A level opens at
  most one vault.

## The key

- **The champion** always drops a key where it falls (the `champion_fall`
  spot), unless the party already holds one or the level's vault is already
  open.
- **An elite** felled in rooms 1 to 5 drops one 10% of the time, on the same
  terms. The roll hashes the level's frame seed and index, the room and the
  body's id (`eliteDropsKey` in `src/sim/vaults.js`), so it never draws from
  the run's random stream.
- The key lands at the end of the tick and turns in a gold beam. Any hero who
  walks over it takes it for the party. A key still on the floor when the
  room clears flies to the party by itself, so nobody can miss it.
- The HUD shows a **VAULT KEY · LASTS THIS LEVEL** plate under the Glint
  plate while one is held.

## The vault door

- It shows on the next path screen into rooms 2 to 6 while a key is held.
- It never takes the cursed door and never the crown door. It goes over a "?"
  door only when no plain door is left. When the crown takes one door and the
  other is cursed, it waits for the next screen.
- It keeps its door's own reward glyph: the room's skill or node draft still
  follows the vault. A gold note under the doors says what the vault holds.
- A first-time tip ("The vault door") explains it.
- Taking it spends the key (the lock turns, `vault_door_taken`).
- The autopilot and the door timeout take the vault when it is offered.

## The vault room

- It stands in the last combat room's clearing, as the shop and the "?" rooms
  do (no layout draw), dressed as a sanctum: a carved disc with gold inlay and
  turning runes, four braziers, light shafts and dust.
- **Three Glint piles**: walking over one takes it, 12 Glint to the wallet and
  6 to each ally purse.
- **The food platter**: walking over it heals every living hero half their
  max HP.
- **The chest** (E · Open): gathers whatever is left, then the lid comes up
  for 1.4 s, then the door's own draft, then a relic pick from the common
  pool ("The vault's chest"), then the doors.
- Nothing in it can hurt the party.

## Numbers

All in `VAULT_RULES` (`src/sim/vaults.js`).

| Rule | Value |
|---|---|
| Elite drop chance, rooms 1 to 5 | 10% |
| Vault door, into rooms | 2 to 6 |
| Vaults per level | 1 |
| Pick-up radius | 0.95 u |
| Glint per pile (wallet / each purse) | 12 / 6 |
| Platter heal | 50% max HP |
| Chest reveal before the draft | 1.4 s |

## Events

`key_drop {id, from, kind, room, x, z}`, `key_pickup {id, from, by, auto, x,
z}`, `vault_door_taken {room, from}`, `key_lapse {level, from}`,
`vault_enter {room, chest, piles, platter, reward}`, `vault_pile {id, pile, by,
glint, x, z}`, `vault_platter {id, by, healed, x, z}`, `vault_open {room,
glint, healed, relic, x, z}`.

## What the player sees and hears

- VFX (`src/render/interactables/vaults.js`, the "KEYS AND VAULTS" recipes in
  `src/render/vfx/signature.js`): the key's loot beam, its flight to the party,
  the sanctum waking, coin sprays off the piles, a warm bloom off the platter,
  and the chest's gold geyser.
- Sound (`src/audio/vaultcues.js`, calibrated with
  `tools/smallfixes2-cuecal.mjs --only vaultcues --write`): the key's bell
  figure, the pick-up jingle, the lock turning, the vault's swell, coins, the
  feast, the chest's peal, and a soft falling figure when a key lapses.

## Checks

- `node tools/vaults-probe.mjs`: headless, 38 checks (gating, elite and
  champion drops, pick-up, the door's placement, the room, the level's end,
  the autopilot, replay and save).
- `node tools/vaults-browser.mjs [--lang de]`: the real pages against
  `npm run dev`, with screenshots.
- Debug commands: `keyGive`, `keyDrop [x, z]`, `vaultDoor side`,
  `vaultRoom n`, `vaultOpen`, `vaultState`.
