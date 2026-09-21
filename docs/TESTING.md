# Testing & Verification Contract

Binding for every builder and critic agent on this project.

## The one rule

**Nobody judges code by reading it.** Visual and gameplay claims are verified
against real rendered pixels and real console output, captured with the harness:

```bash
node tools/capture.mjs shot my-check --settle 3000
node tools/capture.mjs seq combat 8 250 --actions tools/actions/fight.json
```

- Output lands in `captures/` (gitignored): PNG frames + `<name>.console.txt`.
- Exit code 1 = an uncaught page error occurred. A builder may NOT return while
  the smoke capture exits 1.
- The dev server must be running on 127.0.0.1:5199 (`npm run dev`); do not spawn
  extra vite instances — reuse the port and leave the server up for others.
- Read the PNGs with the Read tool to actually look at them.

## Builder exit criteria (every block, every fix round)

1. `node tools/capture.mjs shot smoke` exits 0 (zero console/page errors).
2. The block's own acceptance criteria are self-checked against captured frames
   (or debug-API output) — not assumed from code.
3. `git add -A && git commit` with a conventional message; bump the version
   string in `src/version.js` (patch per block, displayed in the bottom-left
   corner of the screen like the Magicraft reference).

## Debug API (window.__echoes)

Implemented in the sim core block and extended as systems land. Minimum surface:

| Member | Meaning |
|---|---|
| `version` | current version string (same as bottom-left label) |
| `tick` | current sim tick (advances at 60 Hz) |
| `fps` | smoothed render fps |
| `entityCount` | live sim entities |
| `seed` | active run seed (`?seed=123` URL param forces it) |
| `events` | ring buffer (last 200) of sim events `{tick, type, ...}` — spawns, hits, deaths, drafts, denials |
| `state()` | JSON snapshot: room index, party HP/positions, enemies, wallet |
| `cmd(name, ...args)` | test commands: `spawn(type,x,z)`, `teleport(x,z)`, `setHp(id,pct)`, `giveSkill(id)`, `grantNode(id)`, `socket(skillId,nodeId)`, `skipToRoom(n)`, `killAllEnemies()`, `win()`, `lose()` |

Critics drive scenarios through `cmd` + real synthetic input (capture actions),
then judge frames. Determinism checks: load twice with the same `?seed=`, diff
`events`.

## Where things live

- Rubric: `docs/REFERENCE_BAR.md` (+ `docs/reference/pass-the-fear.png`)
- Design truth: `docs/BUILD_BRIEF.md`
- Progress log: `PROGRESS.md` (update after every round)

## Frame analyzer (mandatory for visual blocks)

`node tools/analyze.mjs [--box x,y,w,h] [--ref] <png...>` turns "does it look
right" into the same numbers the critics measure:

| Metric | Meaning | Bar |
|---|---|---|
| `LUMA >160 / >200` | value range — is there any light in the frame? | gameplay frames: **>160 ≥ 1.5%**, **>200 ≥ 0.4%**, **≥13/16 buckets** |
| `FLAT` | % of 8x8 blocks that are one flat colour | **< 20%** (REFERENCE_BAR check 1) |
| `HUEMIX` | warm / foliage / cool split | Act-1 needs visible warm pools, cool only in shadow pockets |
| `SAT` | mean saturation of coloured pixels | Act-1 grass 0.55–0.65 |
| `HUES` | pixel counts in reserved bands | violet only on corruption; danger only on enemy threats; heal only on healing |

`--ref` appends `docs/reference/pass-the-fear.png` for side-by-side comparison.
It measures **>160 3.418%, >200 1.427%, 16/16 buckets** — that is the benchmark.
A frame whose whole histogram sits below bucket 8 is murk, no matter how much
content it contains: fix lighting/exposure, not content.

## Gauntlet Loop harness rules (v0.5.0+, binding — details in docs/gauntlet/PLAN.md §6)

**Boot params.** A plain URL (tools/cert-capture.mjs's default) now shows the
TITLE SCREEN once M1 lands, with the sim paused. Regression captures that must
boot straight into camp use **`?menu=0`** — or any legacy harness param
(`?scene=`, `?room=`, `?run=1`, `?seed=`, `?variant=`), which all keep their
v0.4.63 behaviour and skip the title. `?menu=1` forces the title even with
legacy params (e.g. a seeded journey: `?seed=5&menu=1`). Other params:
`?freeze=1` (sim frozen at tick 0 until `__echoes.sim.thaw()`), `?fresh=1`
(wipe all `echoes.*` localStorage first — a clean profile), `?act=1..3`,
`?slot=<id>`, `?audio=0`, `?fps=1`, `?net=…`, `?nethost=1`, `?netjoin=CODE`,
`?netquick=1`, `?netname=`, `?netseat=`, `?netcond=lat75,jit10,loss10`,
`?netrate=`. Never use `?room=` for a network room code (it is the legacy wave
room param) — use `?netjoin=`.

**Smoke + core loop (every builder commit).**
`node tools/cert-capture.mjs shot <pfx>smoke --settle 4000 --timeout 180000`
must exit 0 with zero `[PAGEERROR]`. Core loop:
`node tools/cert-capture.mjs shot <pfx>core --url "http://127.0.0.1:5199/?seed=7&menu=0" --actions tools/actions/gnt-arch-coreloop.json --timeout 180000`
(hold W to the portal → E → room 1 → killAllEnemies → phase `reward`).

**File prefixes.** Every tool / action / capture an agent creates starts with
its prefix (`gnt<KEY>-`, fix builders `gntfix<KEY><round>-`, critics
`gntc<key><round>-`, refuters `gntr…`, architect `gnt-arch-`). Never edit
tools/cert-capture.mjs, tools/capture.mjs, tools/analyze.mjs, tools/cert-gen.mjs
or another agent's prefixed files.

**Ports.** vite dev 5199 is shared — never start another dev server, never kill
it. Your own net server (`npm run net -- --port P`) and production preview
(`npx vite build --outDir dist-<key>` then
`npx vite preview --outDir dist-<key> --port P --strictPort`) use ONLY the ports
PLAN.md §6.3 assigns your key; kill exactly those PIDs before returning.

**Debug API additions** (`window.__echoes`): `sim` (freeze / thaw / stepN /
trace / hash / script — ARCH), `app` (state, overlay, stack, open, back, press,
focus, responses, frameStats, display — M1), `settings` (get / set / reset /
dump / keys / persist / storageKey / loadReport), `audio` (buses, busGain,
meter, meterReset, testTone, cueLog, music, voices — M3), `save` (list / save /
load / remove / capture / hash / roundTrip / corrupt / simulateQuota /
simulateTornWrite / profile / usage — M2), `net` (state, role, room, seat,
peers, stats, conditioner, connect / host / join / quickMatch / leave /
setReady / start / drop / log — M5a/M5b), `content` (levels, difficultyTable,
roomPlan, hazards, interactables — M4a/M4b). A namespace is `null` until its
module provides the service.

**Determinism.** `node tools/gnt-arch-simtrace.mjs --mode kill_all|defend|run
--ticks 3600 [--seed 7 --script 3] [--root <checkout>] [--record f | --golden f]`
runs the sim headless in Node exactly as main.js builds it. In page:
`?seed=7&scene=arena&room=kill_all&freeze=1` then `__echoes.sim.trace(600, 3)`.
Both exclude `sound` events (audio is not sim state). v0.5.0 references:
Node kill_all 3600 ticks `d1eff38b03f581aa` / `bca6aa1051309b21` (identical to
v0.4.63); in-page trace `8e8d6fd519dca899` / `817f1e9940c91d76`.

**Audio probes.** Launch your own puppeteer with
`--autoplay-policy=no-user-gesture-required`; measure only through
`__echoes.audio.meter()` / `testTone()` (headless Chrome renders Web Audio to a
null sink; analyser taps work).

**Network probes.** Start your own server instance; drive 2–4 clients with your
own harness (puppeteer pages and/or Node WebSocket bots using
src/net/protocol/*); shape links with the server's `--latency --jitter --loss
--dup --reorder` flags or `POST /admin/conditioner` (server started with
`--admin`), and drop links with `POST /admin/drop`.

**Gamepad probes.** The menu polls `navigator.getGamepads()` every frame and
does not require `gamepadconnected`, so a mock installed by an `eval`
(override `navigator.getGamepads` to return a standard-mapping pad whose
`buttons[i].pressed` you toggle) drives the menus.
