STATUS: COMPLETE
DEPLOY built and self-verified (v0.5.118–v0.5.124): a player opens the host's link, clicks Multiplayer and plays with zero settings — over plain http, over https/wss behind a TLS proxy, through the dev/preview proxy and through `npm run serve`; a redeploy ends in "A new version of Echoes is available — Reload", never a bare version_mismatch; every GD gate green, no regressions.

# DEPLOY builder checkpoint — zero-config hosted multiplayer (2026-09-26)

Spec: the user's hosted-multiplayer request (PLAN §14, written by this builder:
§14.1–14.6, gates GD.1–GD.9, §15 revision log, §2.1 ownership row, §6.3 ports,
§3.2 `net.serverUrl` row, §3.7 superseded note). TESTING.md "DEPLOY" section.
README: new Multiplayer section + "Host it on a server".

## Commits (branch gauntlet)

| Commit | Version | What |
|---|---|---|
| 9e3b902 | 0.5.118 | client: src/net/address.js resolution (?net= > saved > VITE_NET_URL > site > local), lobbyClient/session wiring, legacy-default migration, mp-menu per-source unreachable copy + update panel, Settings ▸ Network Automatic row + Reset to automatic, lobby invite line, update prompt (src/ui/net/update.js) |
| c5f8685 | 0.5.119 | server: `--static` (server/static.mjs), `--origins`, `--max-per-ip`, `--build`, admin refused behind proxies, ws.mjs half-close fix, hardening probe |
| acec501 | 0.5.120 | vite server.proxy + preview.proxy for /echoes, version.json plugin, `npm run serve`, `npm start` |
| 54087fd | 0.5.121 | mp-menu switches to the update panel on `update_available` while open; proxy quiet on client aborts; TLS proxy + redeploy probes |
| 4748349 | 0.5.122 | Network tab: Enter commits (keyup), ?net= note, "Automatic" placeholder; file:// boot card copy |
| 78fce9f | 0.5.123 | README, PLAN §14/§15, TESTING DEPLOY, sp + layout probes |
| (this)  | 0.5.124 | checkpoint COMPLETE, PROGRESS G29, versions probe |

## Gate evidence (all on the running game / real servers; ports 7920–7937, 4390–4393)

- **GD.1 address rules** — `tools/gntDEPLOY-settings.mjs --dist dist-DEPLOY --port 7928`: 14/14
  (captures/gntDEPLOY-settings.json + -1-automatic / -2-custom / -3-reset / -4-wrong-saved / -8-file PNGs).
  Fresh: source `site`, `net.serverUrl ''`, note "Automatic (this site) — ws://127.0.0.1:7928/echoes", Reset disabled.
  Typed ws://127.0.0.1:7929/echoes + Enter → saved + used at once; after reload persists and wins (mp-menu "Custom address", online).
  ?net= wins over saved and Settings says "Set by the page link (?net=)". Reset → '' + site at once and after reload.
  Wrong saved ws://127.0.0.1:7930 → unreachable panel "That is the custom address saved in Settings ▸ Network… Use this site's server" (Retry focused) → button → online.
  http:// refused ("Server addresses start with ws:// or wss://"). v0.5.117 blob with the old default → automatic, loadReport `ok`, other settings kept; blob with another address kept; typing the old default afterwards survives reload (marker `net.serverUrlV` = 1).
  file:// → boot card "This page was opened as a file … npm run serve … http://localhost:7800/".
- **GD.2 one-process deploy** — `node server/index.mjs --static dist-DEPLOY --port 7920 --host 0.0.0.0 --origins self` + `tools/gntDEPLOY-zeroconf.mjs --guests 2`: 15/15 (captures/gntDEPLOY-zeroconf-static-draft.json); `npm run serve -- --port 7934` opened by its LAN link http://192.168.1.45:7934/: 15/15 (captures/gntDEPLOY-zeroconf-npm-serve-lan.json). Host online in 97 ms after the click; guests join by code in ~110 ms; guests in game and synced (page load → in game 12.7–21.6 s including the boot and waiting for the other guest); `net.serverUrl` '' on every profile; 0 page errors. Invite line "Friends on your network open http://192.168.1.45:7920/ — no settings needed · code Z5UAS".
- **GD.3 https / wss** — `tools/gntDEPLOY-tls.mjs --port 4392 --to 7925` (self-signed, Host kept, X-Forwarded-*) in front of `--static --origins self`: 15/15 (captures/gntDEPLOY-zeroconf-https.json); the page resolved `wss://127.0.0.1:4392/echoes` by itself.
- **GD.4 dev / preview parity** — `ECHOES_NET_PORT=7926 npx vite preview --outDir dist-DEPLOY --port 4390 --strictPort --host` + `node server/index.mjs --port 7926`: guest joined via http://192.168.1.45:4390/ with zero settings, 11/11 (captures/gntDEPLOY-zeroconf-preview-lan.json). Session server stopped: preview GET /echoes 502 "Echoes session server not running (npm run net)", ws closed 1006, ONE hint line in the log. Dev server 5199 (same netProxy()): /echoes 502 with no server; `tools/gntDEPLOY-sp.mjs` shows the loopback-site unreachable copy ("the dev and preview servers forward … run npm run net"). The shared dev server itself was not given a live 7800 server (7800 is the player default, not a DEPLOY port).
- **GD.5 static serving + GD.6 hardening** — `tools/gntDEPLOY-hardening.mjs --dist dist-DEPLOY --port 7922`: 18/18 (captures/gntDEPLOY-hardening.json): MIME .wasm/.mjs/.css/.svg/.png/.woff2/.ogg/.glb/.webmanifest/unknown; route fallback 200 vs asset 404 (text/plain); index no-cache, `assets/index-*.js` `public, max-age=31536000, immutable`, version.json no-cache; 304; HEAD; 405 + Allow; gzip 432 299 B / br 377 770 B decompress to the exact 1 309 245 B chunk; 20 MB streams, Range 206 exact bytes, 416; 13 traversal attempts (../, %2e%2e, %2f, %5c, NUL, .git, C:/, //etc/passwd, /server/…) leak nothing; /health build/static/origins/maxPerIp. Origins self,https://ok.example: foreign 403, same/listed/no-Origin 101. Cap 3: 4th from 203.0.113.7 (XFF via loopback) 429, other IP 101, closed socket frees the slot (101), 6 direct loopback 101. Admin /stats direct 200, via proxy 403. 2 MB frame → 1009; control flood → 1008.
- **GD.7 redeploy** — `tools/gntDEPLOY-redeploy.mjs --mode graceful`: 10/10, dialog on both stale pages 1135 ms after the restart; `--mode crash`: 10/10, 152 ms (captures/gntDEPLOY-redeploy-graceful.json / -crash.json + stale-dialog / stale-mpmenu / b-lobby PNGs). Reload → v0.5.999 + index-REDPLOY9.js; Not now + Multiplayer → update panel, Reload focused, Esc → title, no "Can't reach"/"different version"; both play again on B. `tools/gntDEPLOY-versions.mjs --port 7937`: 4/4 — a join into a newer room → "newer version (v0.5.200) — reload this page" + update_available; into an older room → "its host needs to reload their page"; a `--build 0.5.150` server: stale v0.5.123 probe `update`, connect refused; equal / newer (dev) pages connect.
- **GD.8 README** — `npm run serve` (build + serve, prints both links), `npm start -- --host 127.0.0.1` (loopback only, /health ok, LAN refused), `--static` on a folder without index.html exits 2 with "Build it first" — run as written (only `--port` added: 7800 is not a DEPLOY port). Caddy / nginx / systemd / ufw cannot run on this Windows machine: the Caddyfile's behaviour (Host kept, ws upgrade passthrough, XFF) is what gntDEPLOY-tls.mjs reproduces and GD.3 passed through; nginx sets Host/Upgrade/Connection/XFF explicitly.
- **GD.9 no regressions** — `tools/gntDEPLOY-sp.mjs`: 4/4, zero /echoes sockets through title → New Game → portal → room 1 → reward, sockets only when Multiplayer opens; smoke exit 0 / 0 PAGEERROR (v0.5.123); core loop `?seed=7&menu=0` portal tick 255 → combat room 1 274 → reward 440; goldens 9/9 (twice); gntM5b-ui 23/23 (port 7930, 1280x720); gntM5b-ui2 13/13 (ports 7931/4393 on a dist-DEPLOY preview 4391); gnt-M5a-netbench 2 pages + 2 bots + guest drop: every gate true, reconnect 3343 ms, 0 desyncs; gntCAMPAIGN-net 12/12 (port 7933); layout 6/6 at 1024x576 and 1920x1080 (unreachable panel + Network tab: inside the window, no overlap, >= 40 px, type >= 16.5 px).

## Decisions (PLAN was silent)

- D1 Automatic = the page's ORIGIN root `/echoes` (the spec's wording), not the page directory; a sub-path deploy forwards /echoes at the domain root or bakes `VITE_NET_URL`.
- D2 No web origin (file://, Node bots) → `ws://127.0.0.1:7800/echoes` (source `local`); Chromium cannot boot the game from file:// (module scripts need an origin), so the honest copy lives on the boot failure card too.
- D3 Legacy default → automatic via a one-time marker key (`net.serverUrlV`), not a SETTINGS_VERSION bump (probes write v:1 blobs and read loadReport `ok`). Persisted only with the next real settings write.
- D4 Boot precedence param > saved; an explicit in-page change (Change server / Settings) applies at once, also on a ?net= page.
- D5 A stale page never plays on: stale = server `latestBuild` (from `--static` version.json or `--build`), the site's own version.json (CDN), a newer room build, or a newer protocol; dotted-version compare, plus same version with a different hashed entry. mp-menu shows it in place; elsewhere one dialog (never over a single-player run); after a lost server the client re-asks for 30 s. Reload clears the stored net session.
- D6 `--origins` default `*` (so `npm run net` and every probe are unchanged); `self` in `npm run serve`, `npm start` and the README unit. Requests without Origin pass (not authentication).
- D7 Per-IP cap 16; the client IP is the last X-Forwarded-For hop only when the direct peer is loopback; direct loopback exempt.
- D8 gzip/br computed with async zlib (thread pool) and cached per file version, warmed at start — never blocking the relay's event loop; ranges only on uncompressed bodies.
- D9 Vite proxy target port from `ECHOES_NET_PORT` (default 7800), `xfwd: true`, a 30 s throttled one-line hint on ECONNREFUSED, silent on client aborts.
- D10 version.json reads src/version.js as text at build time (importing it would make every version bump restart the shared dev server).
- D11 `npm start` added (serve an existing build) for systemd and updating; `npm run serve` = build + start.
- D12 The lobby / mp-menu invite line: the page link on a real host ("Friends open https://… — no settings needed"), the `--static` LAN link on a loopback page, else the legacy LAN server line (kept verbatim for ?net= probes).

## Cross-owner edits (minimal, root cause there)

- M5a: src/net/lobbyClient.js (address resolution, update detection, probe states, join text), server/server.mjs, server/index.mjs, server/admin.mjs (static fallback + proxy-aware admin), server/ws.mjs (end half-closed sockets — verified with netbench drop/reconnect).
- M5b: src/net/session.js (net.serverUrl default '' + migration, update prompt install), src/ui/menu/mpmenu.js (copy, update panel, Automatic button in Change server, invite line), mpjoin.js (update → back to mp-menu), lobby.js (invite line), tabs/network.js (Automatic row, Reset to automatic, Enter commit — the nav layer swallowed keydown, a pre-existing bug that also hit Player name).
- INT: vite.config.js, package.json scripts, index.html (file:// boot-card copy, 4 lines).

## For the deploy critic

- Build: `npx vite build --outDir dist-<you>`; a static server: `node server/index.mjs --static dist-<you> --port <p> [--host 0.0.0.0] [--origins self]`; TLS: `node tools/gntDEPLOY-tls.mjs --port <https> --to <p>` + Chrome `--ignore-certificate-errors`.
- `npm run serve` rebuilds `dist/` (the shared default output) — pass `-- --port <yours>`.
- A page on the shared dev server (5199) without ?net= talks to 127.0.0.1:7800 through the proxy.
