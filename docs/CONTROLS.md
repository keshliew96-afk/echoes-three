# Controls (key rebinding and gamepad play)

Slice 12, v0.5.229. Settings ▸ Controls lets the player rebind every play and
camp key, and a gamepad now plays the game, not only the menus. Every hint on
screen names the player's own keys, or gamepad buttons while a gamepad is in
use.

## Player view

**Settings ▸ Controls** opens on the device in use; the *Show controls for*
row switches between the two views.

- **Keyboard & mouse**: 22 actions, each with its key on a button. Click it
  (or pick it and press Enter, or A) and press the new key or mouse button.
  - A key another action already uses **swaps**: that action takes the old
    key, and the status line says so ("Dodge now uses F. Skill 1 took 1.").
    No key drives two actions and no action is ever left unbound.
  - Esc, Enter, F5 / F9 (quicksave / quickload), F11 / F12 and the OS keys keep
    their fixed jobs and are refused; the row keeps waiting.
  - Esc, a gamepad button or a left click elsewhere cancels. A left click on
    the armed key itself binds the left mouse button; the right, middle and
    side buttons bind from anywhere.
  - A changed key gets an amber dot. **Reset to defaults** restores them all.
  - Saved with the other settings (`controls.key.<action>`), so the keys
    survive a reload. Esc always pauses, alongside the pause key.
- **Gamepad**: the fixed button layout below (pad buttons are not rebindable
  in this version).

On a Chromium browser the letter caps follow the keyboard layout (an AZERTY
player reads Z on the key the game calls KeyW).

### Default keys

| Action | Key | Gamepad |
|---|---|---|
| Move | W A S D | left stick |
| Aim | mouse | right stick (at rest: the nearest foe) |
| Basic attack (hold) | right mouse | RT |
| Dodge | Space | LT |
| Skills 1–4 | 1 2 3 4 | X Y B RB |
| Interact · Revive (hold) | E | A |
| Rally the party | R | LB |
| Mark the next enemy | Tab | D-pad ▲ |
| Heal target: ally 1–4 | F1–F4 | D-pad ◀ ▶ cycle, ▼ again to clear |
| Build workbench (between rooms) | B | View |
| Pause | P (and Esc) | Start |
| Levels · Unlocks · Class select (camp) | L · U · C | B · Y · X |

In camp nobody fights, so X / Y / B open the camp screens there instead of
casting.

### Gamepad aim

The right stick points the aim from the character; a foe inside a 22° cone
along the stick, within 13 units, takes the aim (light aim assist). With the
stick at rest the aim turns to the nearest foe in reach, else keeps the last
direction, else follows the move.

## How it is wired

- `src/core/bindings.js` (DOM-free, no translations): the action list and
  defaults, the reserved keys, the swap rule (`plan`), the gamepad layout
  (`PAD_PLAY`, `PAD_LABEL`), the device in use (`keyboard` | `gamepad`) and
  the pad-press hook camp and the tutorial listen to.
- `src/app/controls.js`: registers `controls.key.*` with the settings store,
  `rebind()` / `resetControls()`, and the caps every hint uses: `keyCap(code)`,
  `cap(action)` (key, or pad button while a pad is in use), `moveCaps()`,
  `skillsCap()`, `onHintsChange(fn)`.
- `src/core/input.js` reads keys and mouse buttons through the bindings and
  polls the first gamepad once per sim tick. It produces exactly the intent
  snapshots it did before, so the sim, the golden traces and the co-op wire
  are untouched: bindings and the pad are per-browser input.
  - A key or mouse press switches the device to keyboard; a pad button, a
    stick past its deadzone or RT switches it to gamepad.
  - While a menu or a build page (socket screen, run pages) is up the pad is
    read but gives no presses, and closing it re-arms the pad, so the A or B
    that closed a page never acts in play.
- `src/app/gamepad.js` (menus) still owns Start (pause) and cancels a rebind;
  the socket screen still owns View (backpack).
- Hints that follow the bindings and the device: the command bar's skill and
  dodge caps and the downed-ally cap, the portrait F-key chips (keys only),
  the interact plate, the camp portal prompt and the map-table prompt, the
  hold glyph over downed allies, and the tutorial coach and lesson cards.
- Key caps and pad buttons stay English (docs/I18N.md rule 5); the mouse
  button words and every sentence are translated in all ten languages.

## Checks

- `node tools/controls-browser.mjs [--lang <code>] [--shots <dir>]` (dev
  server on 5199): the Controls tab lists 22 keys; bind, swap, refuse a
  reserved key, Esc cancels without closing Settings, mouse buttons bind,
  the keys survive a reload, the Gamepad view; a rebound move key walks and
  the old one does not; a mocked standard pad walks, holds the attack on RT,
  dodges on LT, picks a heal target on the D-pad, opens class select on X in
  camp (casting nothing), closes it on B, pauses and resumes on Start; the
  command bar, the camp prompt and the tutorial coach name pad buttons and
  turn back to keys on the next key press; Reset restores every key; no page
  error, no missing line.
- `node tools/gntM2-goldens.mjs`: the nine golden traces stay 9/9.
