# Cloud saves

Since v0.5.230 a player can move their save to another device: **Save to
cloud** keeps it on the game's own server under a short code, and **Load from
cloud** on the other device fetches it. The save on the device is still the
game's save; nothing syncs on its own.

## Player view

Settings ▸ Gameplay ▸ **Cloud save**:

- **Save to cloud** uploads the whole local save: the profile (records,
  Embers, unlocks, loadout) and every save slot (manual, autosaves, quicksave).
  Mid-run that is the run as Continue would resume it, at the start of the
  current room (the held autosave is written first). The status line shows the
  code, like `K7QM-3XRD`, when it was saved and how long the server keeps it.
  The code is also put in the Cloud code field. Saving again from the same
  device keeps the same code.
- **Copy code** copies it to the clipboard.
- **Cloud code** + **Load from cloud** fetch a code's save. A confirm names
  the code, when it was saved, how many slots and Embers it holds, and says it
  replaces the profile and every slot on this device. In a run it adds that the
  run is replaced too and that Continue resumes the loaded run at the start of
  its room. On confirm the game writes the files and reloads; Cancel changes
  nothing.
- **Save a backup file** / **Load a backup file** do the same with a file on
  disk (`echoes-backup-<date>.json`), for when the server has forgotten a code.

Codes are 8 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O, 1/I/L),
shown as `ABCD-EFGH`; case, spaces and dashes are ignored when typed. A
malformed code, an unknown or expired one, no connection, too many tries, a
save from a newer game and a damaged save each get their own line.

Settings (language, keys, volume, server address) are this device's own and
never travel in a save. In co-op each player saves and loads their own profile
from their own device; loading reloads the page, so an online game is left.

## How long a cloud save lasts

The server keeps saves in one of two places (`server/cloud.mjs`):

| Setting on the server | Where | Lasts |
|---|---|---|
| nothing (the default) | files in `./.echoes-cloud` (or `ECHOES_CLOUD_DIR`, or `--cloud-dir`) | until that directory is wiped |
| `ECHOES_CLOUD_REDIS_URL` + `ECHOES_CLOUD_REDIS_TOKEN` | an Upstash Redis database over its REST API | a year after the last cloud save of that code |

**On the current hosting (one free Render web service) the default directory
is on the instance's ephemeral disk.** Render wipes it on every deploy and
every restart, and a free instance restarts when it wakes from sleep, which it
does after about 15 minutes with no visitors. So today a cloud save lasts
while someone is playing and for about 15 minutes after the last player
leaves, or until the next Manual Deploy. That is enough to move a save from
one device to another right away, not to park it. The game says so in the Save
to cloud help text and the status line (the server reports `durable: false`).

To make cloud saves last, pick one:

1. **Free:** create a free Upstash Redis database (upstash.com), copy its REST
   URL and REST token, and add them in the Render dashboard ▸ the service ▸
   Environment as `ECHOES_CLOUD_REDIS_URL` and `ECHOES_CLOUD_REDIS_TOKEN`, then
   Manual Deploy. Saves then survive restarts and deploys and expire a year
   after their last save.
2. **Paid Render:** move the service to a paid instance, attach a persistent
   disk (say at `/var/data`), and set `ECHOES_CLOUD_DIR=/var/data/cloud-saves`
   and `ECHOES_CLOUD_DURABLE=1`.

Either way the game's text switches to "Kept for a year after your last cloud
save." on its own.

The fallback while saves are short-lived:
- the device that made a code holds a secret token for it; **Save to cloud**
  again on that device puts the save back under the same code even after the
  server forgot it;
- a **backup file** never depends on the server.

## How it is wired

- `server/cloud.mjs`: the store and the HTTP routes on the session server
  (`server/admin.mjs` hands `/cloud/*` to it, behind the same Origin allow-list
  as the WebSocket).
  - `POST /cloud/save { bundle, code?, token? }` -> `{ ok, code, token, savedAt, expiresAt, durable, store }`
  - `GET /cloud/save/<code>` -> `{ ok, bundle, savedAt }`, or 404 `not_found`, 400 `bad_code`
  - `GET /cloud/info` -> `{ store, durable, ttlDays, maxBytes }`
  - Limits: 3 MB per save, 30 saves and 60 lookups per IP per 10 minutes,
    5000 files on disk (oldest dropped). The token is stored hashed.
- `vite.config.js` forwards `/cloud/` to the session server in dev and
  preview, like `/echoes`.
- `src/save/cloud.js`: the bundle (`{ kind: 'echoes-cloud', v: 1, game,
  savedAt, profile, slots }`, slot pictures left out), its checks (every slot
  must parse, the profile must read) and `applyBundle`, which writes every slot
  then the profile, drops slots the bundle does not have, and freezes the
  store so nothing the page still holds (a pagehide autosave, the profile
  flush) can write over the loaded files before the reload
  (`storage.freeze()`). It is staged: see "Loading safely" below.
- `src/save/index.js`: `cloudBundle()`, `readBundle()`, `applyBundle()`,
  `exportBackup()` on the save service.
- `src/ui/menu/cloud.js`: the Settings rows. The server address is the one
  multiplayer uses (`src/net/address.js`: this site's own server unless the
  player saved another). The last code and its token live in
  `localStorage['echoes.cloud.v1']`.

## Loading safely

Since v0.5.308 (code review finding 5) a load never leaves a device half
replaced:

1. **Stage.** Every file the bundle brings is written beside its key as
   `<key>.incoming` (`echoes.save.v1.auto-1.incoming`,
   `echoes.profile.v1.incoming`). Nothing on the device has changed yet. If
   any write is refused (the device is full), the staged copies are removed
   and the menu's "Nothing was changed" line is true: every slot, backup and
   the profile are as they were, and the save service turns the autosave
   back on for the rest of the session.
2. **Plan.** `echoes.cloud.applying` records which slots and whether the
   profile are coming.
3. **Swap.** Slots first, then the profile, as before: a slot the bundle
   holds is written with the usual atomic write (its old copy goes to
   `.bak`, only when it is readable: a damaged slot keeps its good backup); a slot it does not hold is removed with its backup. When the
   atomic write does not fit, that slot's old copies are removed first, so
   the swap needs no room beyond what staging proved. The plan key goes last.
4. **Finish at boot.** A page closed during the swap leaves the plan: the
   next boot finishes the swap before the profile or the slots are read
   (`finishPendingApply`). Staged files with no plan (a page closed while
   staging) are dropped. A swap that still stops part-way reports
   `partial`; the menu says "The load stopped part-way. Reload the page: the
   game finishes loading it when it starts."

Staging holds the bundle twice for a moment, so a device very close to full
may refuse a load the old order would have squeezed in; the refusal changes
nothing. A profile from a newer format is carried in a bundle as it is and
reads as `newer` ("This save comes from a newer version of Echoes…").

## Checks

`node tools/cloudsave-browser.mjs [--lang de]` after `npm run build`: starts
its own server on the built game, checks the server (codes, bad and unknown
codes, a forgotten code kept by its token, a wrong token, another site
refused, the Upstash backend against a mock), then drives two browser
profiles: A saves (Embers, a run, a manual slot), B gets the bad-code and
unknown-code lines, loads A's code through the confirm and holds A's Embers,
slots and run after the reload; A mid-run gets the run line and Cancel changes
nothing; saving again keeps the code after the server forgot it. The nine
goldens are unchanged (`node tools/gntM2-goldens.mjs`): nothing here touches
the sim.

`node tools/save-safety-probe.mjs` (headless) covers "Loading safely": a
refused staging changes nothing and turns the autosave back on, a clean load
replaces as before, a partial swap is finished at boot, orphan staging is
dropped, and a damaged slot keeps its good backup through a save or a load.
