STATUS: COMPLETE
FAIL (1 must-fix: the dev/preview /echoes proxy prints ECONNABORTED stack traces on client aborts, contradicting PLAN 14.2) - zero-settings join works over http, https/wss, npm run serve and the preview proxy; GD.1-GD.9 green; benchmark 20 met / 3 partial of 23.

# Critic — DEPLOY (hosted multiplayer), gauntlet round 4

Critic: fresh-context DEPLOY critic, 2026-09-27. Branch `gauntlet`. Judges only the running game / server / measured traffic.
Ports used by this critic: see "Ports" below. All tools/captures prefixed `gntcdeploy4-`.

## Steps log
- [x] S0 checkpoint file created

## 1. Blind benchmark checklist (written BEFORE inspecting any Echoes capture)

How the named shipped systems behave (from my own knowledge), turned into testable items. Each is scored in §6.

### A. Zero-config browser multiplayer (Jackbox.tv, skribbl.io, gartic.io, krunker.io, agar.io)
- B1 Open the link and play: no server address, port, or protocol field is ever shown to a player on the happy path. The client connects to the service at the site it was loaded from (same origin / known endpoint). (agar.io, krunker.io, skribbl.io.)
- B2 Private room by short code / link: host clicks "Create private room" and gets a short human code (Jackbox: 4 letters; skribbl/gartic: an invite link) — the code is shown big and can be copied/shared in one click.
- B3 Join by code: guest opens the site, types only the code (+ optional name) and is in the lobby. Code entry is case-insensitive and tolerant of stray spaces. Invalid code → an immediate specific error ("Room not found"), not a hang.
- B4 Guest time-to-lobby: from page load to in the room is a few seconds (Jackbox/skribbl: < 5 s on LAN/localhost excluding typing). No reload needed.
- B5 https site uses wss automatically (mixed content is impossible in browsers; every one of these games serves wss on https).
- B6 Server-down / unreachable state is explicit and actionable ("Can't connect to server — retry"), with a Retry button; never a silent spinner forever.
- B7 Version mismatch after an update: the client is told to refresh (krunker/agar/Jackbox show "new version — refresh" or auto-reload); never a dead-end or cryptic error code.
- B8 Advanced override exists but is hidden: custom server address only in an advanced/settings spot (krunker custom servers), persistent, with a way back to default.
- B9 Single-player / offline paths do not depend on the server (agar.io offline mode is absent, but single-player games never try to connect until multiplayer is chosen): no console noise or connection attempts before the player picks multiplayer.

### B. Static hosting conventions (itch.io HTML5 uploads, Netlify / Vercel)
- B10 Relative asset paths: the build works when served from a sub-path or zip root (itch.io serves from a CDN sub-path); no absolute `/assets` assumptions that break under a sub-folder, or documented if root-only.
- B11 index.html (entry HTML) is `Cache-Control: no-cache` / `max-age=0, must-revalidate` (Netlify default `public, max-age=0, must-revalidate`); hashed assets `public, max-age=31536000, immutable` (Vercel/Netlify convention).
- B12 Correct MIME types: .js/.mjs `text/javascript`, .css `text/css`, .wasm `application/wasm`, .json, .png, .ogg/.mp3/.wav, .svg `image/svg+xml`; `X-Content-Type-Options: nosniff`.
- B13 404 for missing asset files is a real 404 (not index.html 200 for `/assets/missing.js`, which would feed HTML to the JS parser); SPA fallback only for navigation routes.
- B14 Path traversal (`/../`, `%2e%2e`, `%2f`, backslash on Windows) never escapes the web root (Netlify/nginx normalise and 400/404).
- B15 HEAD supported (same headers, no body); ETag/Last-Modified + 304 on conditional GET; gzip/br compression for text assets; Range requests for large media.
- B16 Large assets stream without blocking other requests (nginx/Netlify CDN).

### C. Reverse-proxy WebSocket deployment (Caddy / nginx with automatic HTTPS)
- B17 Standard recipe works: Caddy `reverse_proxy localhost:PORT` (which proxies WebSocket upgrades automatically) or nginx `proxy_http_version 1.1; Upgrade/Connection` headers — the documented config is copy-pasteable and correct.
- B18 Behind TLS termination the client uses wss://host/path with no port (443 implied); works through a proxy that terminates TLS.
- B19 Server honours X-Forwarded-For only from trusted proxy (loopback), for per-IP limits; Origin check (allow-list) rejects foreign sites' pages from opening sockets (cross-site WebSocket hijacking defence).
- B20 Process management: a systemd unit / pm2 / `npm start` command that restarts on crash; server binds 0.0.0.0 or documented; port configurable by env/flag.
- B21 Graceful redeploy: clients of an old build are told to reload (never a dead end); reconnect/backoff.
- B22 Health endpoint (`/health`) for the proxy / uptime monitor.
- B23 README deploy section followable verbatim by a new user: every command works as written on the platform stated.
- [x] S1 PLAN §14 + GD.1–GD.9 read; build-DEPLOY.md claims read (to be re-measured, not trusted). README "Host it on a server" read.
- [x] S2 Build A: `npx vite build --outDir dist-gntcdeploy4a` → 18.5 s wall, 7 files, 2.0 MB; version.json `{"name":"echoes","version":"0.5.124","entry":"index-DGyKhaqD.js","builtAt":"2026-09-26T20:55:17.516Z"}`; index.html references `./assets/...` (relative paths). Vite warning: `advancedChunks` deprecated; index chunk 1 309 kB (> 1300 kB warning).
- [x] S3 Server A: `node server/index.mjs --static dist-gntcdeploy4a --port 7940 --host 0.0.0.0 --origins self` (Windows PID 86260, log captures/gntcdeploy4/server-7940.log). Prints play links http://127.0.0.1:7940/ and http://192.168.1.45:7940/; /health ok with build 0.5.124, static true, origins [self], maxPerIp 16.

## Ports / PIDs (critic-owned; all killed before return)
- 7940 static server A (PID 86260)
- [x] S4 Zero-settings LAN/static join (probe `tools/gntcdeploy4-zeroconf.mjs`, 3 separate Chrome processes each with a fresh userDataDir, real mouse clicks + typed code; page http://192.168.1.45:7940/ with NO ?net=): **17/17** (captures/gntcdeploy4/gntcdeploy4-zc-static.json, -host-lobby-full.png, -g1-ingame.png). Host click Multiplayer→lobby 456 ms, code L7YXT; guest 1 typed lowercase "l7yxt" → lobby 669 ms after Enter; guest 2 1 624 ms; page load→title 16.5–19.1 s (3 SwiftShader browsers booting at once), load→lobby 20.4–22.1 s, host Start→guest in game 1.72 s; every profile `net.serverUrl ''`, source `site`, WS `ws://192.168.1.45:7940/echoes` 101 (2 short probe sockets + 1 session socket each); party positions identical on host and both guests; desyncs 0; 0 page errors. Share panel: "Friends open http://192.168.1.45:7940/ — no settings needed · code L7YXT" (no copy button / no direct-join link).
- 7941 static server loopback (PID 68204); 4334 TLS proxy (PID 73660)
- [x] S5 HTTPS: own TLS proxy `tools/gntcdeploy4-tls.mjs --port 4334 --to 7941` (self-signed cert CN/SAN 127.0.0.1+192.168.1.45, Host kept, XFF/-Proto/-Host added, raw upgrade passthrough) in front of `node server/index.mjs --static dist-gntcdeploy4a --port 7941 --host 127.0.0.1 --origins self` (the README's systemd shape). Zero-settings probe on https://192.168.1.45:4334/ (Chrome --ignore-certificate-errors): **17/17** (captures/gntcdeploy4/gntcdeploy4-zc-https.json). Every profile resolved `wss://192.168.1.45:4334/echoes` by itself (source site, https true, serverUrl ''), all sockets wss 101, Enter→lobby 153/160 ms, host Start→guest in game 1.78/1.84 s, rtt 27–40 ms, desyncs 0, 0 page errors; share line "Friends open https://192.168.1.45:4334/ — no settings needed".
- 7942 / 7943 plain session servers (PIDs 64140 / 79272), origins any
- [x] S6 Settings ▸ Network (probes `tools/gntcdeploy4-settings.mjs` 13/14, `-settings2.mjs`, `-settings3.mjs` 6/7; real clicks + typing in fresh profiles; JSON + PNGs captures/gntcdeploy4/gntcdeploy4-set*):
  - Fresh: `net.serverUrl ''`, source site, note "Automatic (this site) — ws://127.0.0.1:7940/echoes", input empty w/ placeholder "Automatic", Reset to automatic disabled (set-A-automatic.png). Check → "Online — ws://127.0.0.1:7940/echoes answered in 96 ms · LAN ws://192.168.1.45:7940/echoes".
  - Typed ws://127.0.0.1:7942/echoes + Enter → saved at once (note "Saved — press Check to test it"; my B.customSaved regex expected "Custom" in that transient note = probe heuristic, not a defect); mp-menu "Online · 46 ms · Address ws://127.0.0.1:7942/echoes · Custom address"; Host a Game used only ws://127.0.0.1:7942/echoes (3 × 101). After reload: source saved, mp-menu Custom + Online, all sockets :7942. Reopened note: "Custom address — "Reset to automatic" goes back to this site's server" (URL shown in the input, not in the note).
  - Reset to automatic → '' + site at once (button disabled again) and after reload.
  - Wrong saved ws://127.0.0.1:7949/echoes → mp-menu unreachable panel after 4 673 ms: "Can't reach the Echoes server at ws://127.0.0.1:7949/echoes. That is the custom address saved in Settings ▸ Network … Or press "Use this site's server"", Retry focused (set-E-unreachable.png) → Use this site's server → '' + Online.
  - http:// refused ("Server addresses start with ws:// or wss://", serverUrl stays ''); empty commit → automatic; `?net=` wins over saved (source param; note "Set by the page link (?net=) — ws://127.0.0.1:7942/echoes"; sockets :7942 only). Keyboard ArrowDown path name → server → auto → stats.
  - https page: automatic wss://127.0.0.1:4334/echoes; typed ws:// refused ("This page is served over https, so the browser only allows secure (wss://) servers."); wss:// accepted; `?net=ws://` recorded in `skipped` (insecure_on_https).
  - Legacy blob {v:1,data:{net.serverUrl:"ws://127.0.0.1:7800/echoes"}} → boots automatic, loadReport ok with 0 errors, other setting (display.showFps=true) kept; typing the old default afterwards survives reload (migration once); blob with ws://127.0.0.1:7943/echoes kept.
  - DEVIATION (minor): https page + saved wss://192.168.1.45:4334/echoes + `?net=ws://…` → the skipped param falls through to `site` (addressInfo.saved null), not to the saved address as PLAN §14.1 "first valid wins" says (settings3 C.skippedParamFallsToSaved FAIL). Harness-link-only edge case.
  - UI copy nit: Settings help panel shows literal backticks: "`npm run net -- --host 0.0.0.0`" (set-B-custom.png).
- 4335 vite preview `ECHOES_NET_PORT=7944 npx vite preview --outDir dist-gntcdeploy4a --port 4335 --strictPort --host` (PID 66756); 7944 `npm run net -- --port 7944` (PID 66160)
- [x] S7 Dev / preview parity:
  - No session server on 7944: preview GET /echoes → **502** text/plain; ONE hint line "[echoes] /echoes -> http://127.0.0.1:7944: no session server there (ECONNREFUSED). Multiplayer needs it: run "npm run net" in another terminal." (2 lines over 2 page visits > 30 s apart). Page http://127.0.0.1:4335/ → unreachable panel "…which the dev and preview servers forward to the session server on this computer — and it isn't running. In the game folder run npm run net, then press Retry." (captures/gntcdeploy4/gntcdeploy4-preview-noserver-loop-unreach.png); page on the LAN URL http://192.168.1.45:4335/ gets the generic "this site isn't running one right now. If you host it: start it with npm run serve, or forward /echoes to npm run net …" copy (gntcdeploy4-preview-noserver-unreach.png).
  - With `npm run net -- --port 7944`: zero-settings host + guest on the LAN Network URL http://192.168.1.45:4335/: **11/11** (captures/gntcdeploy4/gntcdeploy4-zc-preview.json): source site, ws://192.168.1.45:4335/echoes 101 ×3 per profile, Enter→lobby 127 ms, host Start→guest in game 1.68 s, desyncs 0, 0 page errors.
  - Shared dev server 5199: GET /echoes → 502 (nothing on 7800), / 200. (Not given a live 7800 server — player default port.)
  - **DEFECT (PLAN §14.2 "client aborts log nothing"; builder claim 54087fd "proxy silent on client aborts")**: the preview terminal printed `[vite] ws proxy socket error: Error: write ECONNABORTED` + a 10-line Node stack when players left a live session: first preview session close (host+guest browsers closed) → 2 stack traces; repeat run 1 → 2 traces (24 lines); repeat run 2 → 0; a killed browser → `Error: read ECONNRESET` + stack (probe tools/gntcdeploy4-abort.mjs → captures/gntcdeploy4/gntcdeploy4-abort.json; single-host navigate/close → 0). Intermittent race, 3 of 5 multi-socket closes. Raw log: captures/gntcdeploy4/preview-4335.log.
- 7945 static test server `--static dist-gntcdeploy4s` (copy of build A + t.* MIME fixtures, 20 MB assets/big-Ab12Cd34.bin, 5 MB json, .secret, .well-known, sub/index.html, junction `escape` → captures/gntcdeploy4) (PID 58984)
- [x] S8 Static serving (raw-socket probe `tools/gntcdeploy4-static.mjs --port 7945`): **23/23** (captures/gntcdeploy4/gntcdeploy4-static.json). MIME 20/20 (.js/.mjs text/javascript, .wasm application/wasm, .css, .svg, .png, .woff2 font/woff2, .ogg, .mp3 audio/mpeg, .wav, .glb, .gltf, .webmanifest, .json, .txt, .webp, unknown octet-stream), all `nosniff`. `/some/client/route` → 200 index (no-cache); `/assets/missing-XXXX1234.js` → 404 text/plain "Not found"; `/nope.png` 404; `/sub/` → sub/index.html. Cache: `/`, `/index.html`, version.json, unhashed t.txt `no-cache`; `assets/index-DGyKhaqD.js` and `assets/big-Ab12Cd34.bin` `public, max-age=31536000, immutable`. If-None-Match → 304 (0 B), If-Modified-Since → 304. HEAD 200, content-length 1 309 437, 0 B body. POST/PUT/DELETE 405 `Allow: GET, HEAD`. gzip 432 359 B and br 377 819 B decompress byte-exact to the 1 309 437 B chunk, `Vary: Accept-Encoding`; Chrome's "gzip, deflate, br, zstd" → br; "br;q=0, gzip;q=1" → gzip. Range bytes=100-199 → 206 exact; bytes=999999999- → 416 `bytes */20971520`. 3 parallel 20 MB downloads 151–155 ms each (first byte 11–15 ms) while /health p50 1 / p95 2 / max 24 ms over 64 pings. Traversal: 30 attempts (../, %2e%2e, %2f, %5c, %252e double-encode, overlong %c0%ae, NUL, C:/, //etc/passwd, junction escape, .git, dotfile) → 404/400, **0 leaks**; `//etc/passwd` → index fallback (no leak); `/.well-known/security.txt` 200; junction to outside root 404. /health 200 `no-store`.
- NOTE (critic accident): `node server/index.mjs --help` does NOT print usage — it silently started a session server on the player default port 7800 (Windows PID 89372, 05:17:31). Stopped via the task runner (TaskStop reported success); a follow-up kill/verify of 7800 was blocked by the permission classifier, so the user should confirm nothing is left listening on 7800. (Also a CLI finding: `--help` is not handled.)
- [x] S9 Hardening (`tools/gntcdeploy4-hardening.mjs`, own servers 7946 `--host 0.0.0.0 --origins self --max-per-ip 3 --admin` and 7947 `--origins https://ok.example,http://127.0.0.1:4335`, both killed by the probe): **15/15** (captures/gntcdeploy4/gntcdeploy4-hardening.json). self: same-origin 101, foreign 403, no Origin 101, same host other port 403, `null` 403, LAN self 101, https Origin via proxy 101. List: listed ×2 101; foreign / suffix trick ok.example.evil.com / prefix trick / http-vs-https scheme swap / unlisted self → 403; no Origin 101. Cap 3: via loopback XFF 203.0.113.7 → 101,101,101 then **429 Retry-After 10**; other IP 101; XFF chain last hop counted (429); a close frame frees the slot (101); a TCP FIN half-close frees it within 111 ms; 6 direct loopback sockets all 101 (exempt); LAN-address peer capped at 3 (4th 429) and a spoofed XFF from that non-loopback peer is ignored (429). Admin /stats: direct 200; with X-Forwarded-For / Forwarded / X-Real-IP 403; from the LAN address 403. Hello timeout closes a silent socket after 6.0 s. 2 MB frame → close 1009 "frame too large"; 1 200 control msgs → 1008 "control flood" in 383 ms; /health 200 afterwards.
- [x] S9b Foreign-origin refusal as a player sees it: page http://127.0.0.1:4335/?net=ws://127.0.0.1:7940/echoes (7940 = `--origins self`, so the upgrade is 403) → mp-menu "Can't reach the Echoes server at ws://127.0.0.1:7940/echoes … run npm run net …" (captures/gntcdeploy4/gntcdeploy4-foreign-origin-mp.png). The server IS running; the copy blames a missing server instead of the origin allow-list — the README's own "page on a CDN / game portal needs its origin in --origins" case ends in misleading advice.
- [x] S10 Redeploy (`tools/gntcdeploy4-redeploy.mjs`, port 7948, own servers). Build B = a real `npx vite build --outDir dist-gntcdeploy4b` (byte-identical to A: same entry hash — nothing changed in src) then released as v0.5.125: version string bumped in the entry chunk, chunk renamed `index-GNTCB125.js`, index.html + version.json updated. Host + guest in game on A (v0.5.124) → restart onto B → guest reloaded (F5) at once, host left stale, stale page polled every 100 ms from the moment A stopped:
  - **graceful** (in-process `createEchoesServer().close()`, then B on the same port 1.5 s later): **11/11** (captures/gntcdeploy4/gntcdeploy4-redeploy-graceful.json). Stale host: title at once, then dialog "A new version of Echoes is available · This page is v0.5.124; the server now runs v0.5.125. Reload to update — your settings, saves and records stay in this browser." **63 ms after B listened** (1.6 s after A stopped), Reload focused; never "Can't reach" / "version_mismatch". F5'd guest → v0.5.125 + index-GNTCB125.js. Not now → Multiplayer → update panel (Reload focused, SERVER "Update available"), Esc → title; Reload button → v0.5.125/index-GNTCB125.js; both host + join + in game on B; 0 page errors.
  - **crash** (child `SIGKILL`, B 1.9 s later): 8/8 before the probe's own B-rejoin step (captures/gntcdeploy4/gntcdeploy4-redeploy-crash.json): stale host "Connection lost — reconnecting (14 s)" → dialog **583 ms after B listened**, Reload focused, Not now → update panel, Reload → B. My probe then stopped because the F5'd guest was showing a **"Rejoin Z9MXN? Your Tank seat is held for a minute after a disconnect"** dialog (gntcdeploy4-redeploy-crash-G-fatal.png) for a room that died with the crashed process.
  - Follow-up `tools/gntcdeploy4-rejoin.mjs` (captures/gntcdeploy4/gntcdeploy4-rejoin-newbuild.json): Rejoin → "rejoin 93P2M — No room with that code." for ~2.7 s → title (recoverable, not a dead end, but the offer is false after a server restart).
- [x] S11 README verbatim (in a fresh `git clone` of branch gauntlet HEAD 9e7913c into the scratchpad = "/opt/echoes"; Windows + Git Bash, so apt/systemd/caddy/nginx/ufw cannot run here):
  1. `PUPPETEER_SKIP_DOWNLOAD=1 npm ci    # …` → exit 0 in 7.0 s, 47 packages; `npm audit`: 1 high (sharp < 0.35.4 libheif, a dev-only image tool).
  2. `npm run build` → exit 0, dist/version.json 0.5.124 / index-DGyKhaqD.js (same hashes as my build A).
  3. `npm start -- --host 127.0.0.1` (+ `--port 7949`, the ONLY deviation — 7800 is the player default port) → prints "serving the game v0.5.124 from …\opt-echoes\dist" and "play on this computer: http://127.0.0.1:7949/" exactly as the README says; `curl -s http://127.0.0.1:7949/health` → `{"ok":true,…,"static":true,"origins":["self"],"maxPerIp":16}`; LAN http://192.168.1.45:7949/ refused (loopback only, as documented). A host+guest session on it: 11/11 (captures/gntcdeploy4/gntcdeploy4-zc-readme.json); files written in the app dir during the session: none (only my stdout redirect) → compatible with the unit's `DynamicUser=yes` + `ProtectSystem=strict`.
  4. Home network: `npm run serve` (+ `-- --port 7949`) → builds, then prints "play on this computer: http://127.0.0.1:7949/" and "players on your network open: http://192.168.1.45:7949/" (the README's example format). Host on the loopback link + 2 guests on the LAN link, zero settings: **17/17** (captures/gntcdeploy4/gntcdeploy4-zc-npmserve.json); host's invite line "Friends on your network open http://192.168.1.45:7949/ — no settings needed".
  5. Caddyfile / nginx / systemd read for correctness against the measured server: Caddy `reverse_proxy 127.0.0.1:7800` keeps Host and passes upgrades (my TLS proxy reproduced exactly that, S5 17/17); nginx sets Host, Upgrade/Connection on `location = /echoes`, `$proxy_add_x_forwarded_for` (server takes the LAST hop = nginx's $remote_addr, S9 cap.xffLastHopCounts), 3600 s timeouts; unit ExecStart = `--static dist --host 127.0.0.1 --port 7800 --origins self`. Not executable here: apt, caddy, certbot, nginx, systemctl, ufw.
  6. "Updating" (`npm run build` while the service keeps running, then restart): `tools/gntcdeploy4-updatewindow.mjs` polled `/`, the entry chunk and version.json every ~30 ms during 3 rebuilds of the clone's dist/ under a running `npm start`: build 1.8–2.1 s; **`/` itself answered 404 "Not found" (10 B text/plain) for 9–11 consecutive samples ≈ 0.3–0.35 s per rebuild** (entry + version.json 404 too) while Vite empties and rewrites dist/ (captures/gntcdeploy4/gntcdeploy4-updatewindow.json). A player opening the link or pressing Reload in that window gets a bare "Not found". Every chunk (index, three, 2 registry, paint-worker) loads at boot, so an already-open stale page never needs a deleted chunk later.
- 4336 / 4337 sub-path static servers (PIDs 81760 / 72444)
- [x] S12 Static-host conventions: build A served under a sub-path by a dumb static server (`tools/gntcdeploy4-subpath.mjs`, http://127.0.0.1:4336/games/echoes/, itch.io-style) boots to the title with every chunk (relative `./assets/` paths); Multiplayer → honest unreachable panel for ws://127.0.0.1:4336/echoes. A `VITE_NET_URL=ws://127.0.0.1:7942/echoes` build (dist-gntcdeploy4c, entry index-M3iuWlc7.js) under http://127.0.0.1:4337/html/12345/ → source `build`, "Online · 55 ms · Address ws://127.0.0.1:7942/echoes · Automatic (this build's server)" with zero settings (the README's CDN/game-portal recipe works).
- [x] S13 Regression:
  - Single-player, real UI (`tools/gntcdeploy4-sp.mjs`): title → New Game → hold W to portal → E → combat room 1 → killAllEnemies → reward. On the static server http://127.0.0.1:7940/ (session server present): **0 WebSockets of any kind**, loop ticks camp 91 → portal 244 → combat 263 → reward 439, 0 page errors (captures/gntcdeploy4/gntcdeploy4-sp-static.json). On the dev server 5199: the only socket is Vite's HMR `ws://127.0.0.1:5199/?token=…`, **0 `/echoes` sockets**, portal 233 → combat 249 → reward 424 (my check counted the HMR socket as a FAIL — probe over-strictness, not a defect).
  - `?net=` harness session on 5199 (`tools/gntcdeploy4-netparam.mjs`, ?net=ws://127.0.0.1:7943/echoes + ?nethost=1 / ?netjoin=CODE): 6/6 — both source `param`, only :7943/echoes sockets (+HMR), both in game, desyncs 0, 0 page errors.
  - Smoke `node tools/cert-capture.mjs shot gntcdeploy4-smoke --settle 4000 --timeout 180000` → exit 0, 0 PAGEERROR. Core loop `?seed=7&menu=0` (tools/actions/gntcdeploy4-coreloop.json) → exit 0: portal tick 212 → combat room 1 tick 232 → reward tick 363 (captures/gntcdeploy4-coreloop.console.txt).
  - `node tools/gntM2-goldens.mjs` → ok true, 9/9 `match: true` (run twice).
- [x] S14 Extra checks: crash redeploy rerun with the F5'd guest's "Rejoin JXJFU? Your Tank seat is held for a minute…" offer dismissed (Not now) → **11/11**, stale host dialog 615 ms after B listened, both play on v0.5.125 (captures/gntcdeploy4/gntcdeploy4-redeploy-crash.json, -crash-stale-dialog.png shows the dialog + toast "The server was updated — a new version of Echoes is available."). file:// page → boot card "Echoes couldn't start. This page was opened as a file … run "npm run serve", then open … http://localhost:7800/" (gntcdeploy4-file-boot.png). `--static` on an empty / missing folder → exit 2 "no built game there (index.html missing). Build it first: npm run build …". A typo flag `--statc dist` is silently ignored (server starts WITHOUT the game, no warning) and `--help` starts a server on 7800 (see NOTE above). Code entry " u2 BF8 " (spaces + lowercase) → joined (tools/gntcdeploy4-misc.mjs). Dead /echoes behind a live site → unreachable panel 643 ms after the click, Retry focused, Retry re-answers in 656 ms. Clean single guest (host already in lobby): load→title 15.0 s (SwiftShader boot), Multiplayer→Join→typed code→lobby 1.07 s, host Start→guest in game 1.61 s, load→in game 18.2 s (captures/gntcdeploy4/gntcdeploy4-misc.json).
- [x] S15 Cleanup: killed every critic-owned process (PIDs 86260, 68204, 73660, 64140, 79272, 66756, 66160, 58984, 81760, 72444 - all SUCCESS; the 7946-7949 servers were children killed by their probes; 81060, 71324, 79176 killed during S11). Port sweep 7940-7949 and 4334-4337: all free. Shared dev server 5199 untouched (200). Junction removed with rmdir (target intact), dist-gntcdeploy4s deleted; dist-gntcdeploy4a/b/c kept (gitignored).

## 2. Probe table (all numbers measured this session)

| # | Probe (tool) | Setup | Result |
|---|---|---|---|
| P1 | zero-settings LAN (gntcdeploy4-zeroconf) | --static 0.0.0.0 --origins self, http://192.168.1.45:7940/, 3 fresh Chrome profiles | **17/17**; Enter->lobby 669 / 1 624 ms; Start->guest in game 1.72 s; ws://192.168.1.45:7940/echoes; desyncs 0 |
| P2 | HTTPS (gntcdeploy4-tls + zeroconf) | TLS proxy 4334 -> 127.0.0.1:7941 --origins self | **17/17**; wss://192.168.1.45:4334/echoes found by itself; Start->in game 1.78 / 1.84 s |
| P3 | Settings > Network (gntcdeploy4-settings, -settings2, -settings3) | real clicks + typing | 13/14, 6/8, 6/7; the FAILs are 3 probe heuristics + 1 real minor deviation (A6a) |
| P4 | preview parity (zeroconf) | ECHOES_NET_PORT=7944 vite preview --host + npm run net -- --port 7944 | **11/11** via http://192.168.1.45:4335/; no server -> 502 + ONE hint line + honest panel |
| P5 | proxy abort silence (gntcdeploy4-abort + zeroconf re-runs) | preview 4335 | **FAIL**: "[vite] ws proxy socket error: Error: write ECONNABORTED" + 10-line stack in 3 of 5 multi-socket closes |
| P6 | static serving (gntcdeploy4-static) | raw sockets, 7945 | **23/23**; 30 traversal attempts, 0 leaks |
| P7 | hardening (gntcdeploy4-hardening) | 7946 self + cap 3 + admin, 7947 list | **15/15** |
| P8 | redeploy graceful (gntcdeploy4-redeploy) | in-process close -> B | **11/11**, prompt 63 ms after B listened |
| P9 | redeploy crash | SIGKILL -> B | **11/11**, prompt 583-615 ms after B listened; the F5'd guest is offered a dead-room Rejoin (A3) |
| P10 | README verbatim (fresh git clone) | npm ci / build / npm start / npm run serve | all run as written (only --port added); sessions 11/11 and 17/17; in-place update -> 404 for ~0.3 s (A1) |
| P11 | sub-path + VITE_NET_URL (gntcdeploy4-subpath) | 4336 / 4337 | boots from a sub-path; build-baked server Online with zero settings |
| P12 | regression (gntcdeploy4-sp, -netparam, smoke, core loop, goldens) | 7940, 5199 | 0 /echoes sockets in single-player; ?net= 6/6; smoke exit 0; core loop portal 212 -> combat 232 -> reward 363; goldens 9/9 |

## 3. PLAN 14 gates, literally

| Gate | Verdict | Evidence |
|---|---|---|
| GD.1 address rules | PASS (minor deviations A6) | P3: fresh -> site + empty serverUrl + "Automatic (this site) - ws://127.0.0.1:7940/echoes", Reset disabled; a typed address saves on Enter, is used at once (:7942 only), persists and wins after reload; Reset -> site at once and after reload; ?net= wins + "Set by the page link (?net=)"; wrong saved -> panel naming ws://127.0.0.1:7949/echoes + Use this site's server -> Online; http:// refused (copy unchanged); legacy-default blob -> automatic, loadReport ok with 0 errors, other setting kept; another address kept; migration once; file:// boot card says npm run serve |
| GD.2 one-process deploy | PASS | P1 17/17 and npm run serve 17/17 (host on the loopback link + 2 LAN guests), serverUrl empty everywhere, 0 page errors |
| GD.3 HTTPS | PASS | P2 17/17; --origins self passes through the proxy |
| GD.4 dev/preview parity | PASS on the gate text | P4 11/11; 502 + one hint line + npm run net panel. PLAN 14.2 "client aborts log nothing" FAILS (P5) |
| GD.5 static serving | PASS | P6 23/23 |
| GD.6 hardening | PASS | P7 15/15 |
| GD.7 redeploy | PASS | P8 + P9: both stale pages end on the title with "A new version of Echoes is available" by itself 63 / 583-615 ms after the restart, Reload focused; Reload -> v0.5.125 + index-GNTCB125.js; Not now + Multiplayer -> update panel, Esc leaves, never "Can't reach" or version_mismatch; both play on B |
| GD.8 README | PASS (runnable steps) | P10; apt / caddy / certbot / nginx / systemctl / ufw cannot run on this Windows machine (configs reviewed against the measured server behaviour); the Multiplayer section never asks guests for an address |
| GD.9 no regressions | PASS | P12 |

Builder claims (build-DEPLOY.md) re-measured: every GD result reproduced within noise EXCEPT commit 54087fd "dev/preview proxy silent on client aborts", which is false (P5).

## 4. Findings

### Must-fix
- **F1 - the dev/preview /echoes proxy prints stack traces when a player leaves** (PLAN 14.2 "client aborts log nothing"; builder claim in 54087fd). Measured on vite preview --host (port 4335) in front of npm run net -- --port 7944: closing a host+guest session printed "[vite] ws proxy socket error:" / "Error: write ECONNABORTED" / 10 "at ..." lines per socket in 3 of 5 multi-socket closes (runs: 2 traces; 2 traces = 24 lines; 0; a killed browser -> "Error: read ECONNRESET" + stack); single-host navigate/close: 0. The README sends home hosts to exactly this setup (npm run dev -- --host / npm run preview -- --host), so a beginner host sees red stack traces every time a friend closes the tab. Repro: node tools/gntcdeploy4-zeroconf.mjs --url http://127.0.0.1:4335/ --guests 1 --tag x, then diff captures/gntcdeploy4/preview-4335.log.

### Advisories (real and measured, but not blocking)
- A1 In-place update: during the README "Updating" npm run build, the running server answers / with **404 "Not found" for ~0.3-0.35 s** (9-11 consecutive 30 ms samples, x3 builds). An atomic swap like Netlify/Vercel (build to a new dir, then switch) would make it zero-downtime.
- A2 An origin refused by --origins (HTTP 403) reaches the player as "Can't reach the Echoes server ... run npm run net". In the README's own CDN/game-portal case with a missing --origins entry, this sends the host debugging the wrong thing.
- A3 After a server crash and restart, a guest who presses F5 is offered "Rejoin <code>? Your Tank seat is held for a minute" for a room the new process never had. Rejoin -> "No room with that code." (~2.7 s) -> title. It recovers, but the offer is false.
- A4 Server CLI: --help is not handled (it silently started a server on 7800), and an unknown or mistyped flag (--statc dist) is silently ignored, so the server runs WITHOUT the game and gives no warning.
- A5 Share UX compared with skribbl / gartic / Jackbox: the room code is in large type and the invite line names the link, but there is no one-click copy and no direct-join link, so the link and the code have to be sent separately.
- A6 PLAN 14.1 details: (a) on an https page with a saved wss address, a ?net=ws:// param is skipped and resolution falls through to site instead of the saved address (addressInfo.saved null) - only reachable from a harness link; (b) the note for a saved custom address reads "Custom address - Reset to automatic goes back to this site's server" (the URL appears only in the input), not "<label> - <url>"; (c) the Settings help panel shows literal backticks around "npm run net -- --host 0.0.0.0".
- A7 Sub-path reverse-proxy deploys (example.com/games/echoes/ -> :7800) look for the socket at the domain root /echoes (measured on a sub-path page: ws://127.0.0.1:4336/echoes). The README does not mention this (PLAN D1 does).
- A8 npm ci on the server installs dev tools, and npm audit reports 1 high (sharp < 0.35.4, libheif). It is dev-only, but it is the first thing a new server admin sees.
- A9 Outside this module: the README intro still says "Three expeditions (...), each a full run" (wording from before the campaign model).

## 5. Benchmark scoring (checklist 1)

| Item | Score | Evidence |
|---|---|---|
| B1 open the link and play | met | P1/P2/P4/P10: 0 settings, source site everywhere |
| B2 short code, one-click share | partial | 5-char code in large type + invite line; no copy button or direct-join link (A5) |
| B3 join by code, tolerant, instant error | met | "l7yxt" and " u2 BF8 " join; "zzzzz" -> "No room with that code." |
| B4 guest time-to-lobby | met | Multiplayer->lobby 1.07 s incl. typing; Enter->lobby 127-1 624 ms; Start->in game 1.6-1.8 s |
| B5 https -> wss automatically | met | P2 |
| B6 explicit, actionable unreachable state | partial | panel in 643 ms, Retry focused, copy fits each case; origin 403 mislabelled (A2) |
| B7 new version -> reload, no dead end | met | P8/P9 |
| B8 hidden, persistent override + back to default | met | P3 |
| B9 single-player never connects | met | P12: 0 /echoes sockets |
| B10 relative paths / sub-path | met | P11 |
| B11 no-cache index, immutable hashed | met | P6 |
| B12 MIME + nosniff | met | P6 20/20 |
| B13 real 404 for assets, fallback for routes | met | P6 |
| B14 traversal-safe | met | P6: 30 attempts, 0 leaks, junction refused |
| B15 HEAD, 304, gzip/br, ranges | met | P6 |
| B16 large assets stream, loop responsive | met | 3 x 20 MB in 151-155 ms, /health p95 2 ms |
| B17 copy-paste Caddy/nginx recipe | met | P2 stand-in + config review |
| B18 wss through TLS termination, no port | met | P2 |
| B19 XFF only from loopback, Origin allow-list | met | P7 |
| B20 process management | met | unit Restart=always, npm start, --port; no runtime disk writes |
| B21 graceful redeploy | met | P8/P9 (A3 noted) |
| B22 /health | met | 200 no-store; build / static / origins / maxPerIp |
| B23 README followable verbatim | partial | every runnable command works; in-place update gives a ~0.3 s 404 window (A1); --port added only to keep off the player's port |

**Score: 20 met / 3 partial / 0 not met of 23.**

## 6. Verdict
FAIL, on one must-fix: F1. PLAN 14.2 says "client aborts log nothing", but the dev/preview proxy prints stack traces when players leave. The user's actual goal is met. Over plain http, https/wss, npm run serve and the preview proxy, fresh profiles open the link, click Multiplayer and play with zero settings. Static serving, hardening, redeploy, the README and the regression checks all measured green.
