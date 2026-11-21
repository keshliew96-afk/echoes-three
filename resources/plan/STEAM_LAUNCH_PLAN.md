# Echoes: Steam launch plan

Written 2026-11-11 against `gauntlet` 43999c5 (v0.5.360). Doc only: nothing in the game changed.

**Updated 2026-11-15 for the Tripo models** (Kesh's "the 1 to 12, you help to fix or correct or clean them";
thread "Audit docs and settings for Tripo models"): every hero, boss and champion, 38 foes and six NPCs now have a
passed Tripo model, and ruling A23 makes them the game's models once the freeze lifts (repo `docs/TRIPO_MODELS.md`).
Changed here: D6 (what the min spec is bound by), D7 (art settled), G1 and G8, S1 and S11, S15 (AI disclosure), and two risks.

**Goal (Kesh, 2026-11-11):** a complete, fully playable top-down roguelike released on Steam as a
Windows desktop app, with at least 4 hours to see all content (all heroes, both endings, all modes).
Online co-op stays for launch. All ten languages stay. Minimum spec is chosen here, not the office laptop.

**The freeze.** Every slice below except S0 and S1 adds code, so the slices start only when Kesh
lifts the feature freeze (or lifts it for the launch track alone). Each slice follows the repo's
slice rules: one draft PR into `gauntlet`, version bump, ten languages, one probe, goldens identical.

---

## 1. Decisions (the plan's picks, each with the reason)

### D1. Desktop wrapper: Electron + steamworks.js

The game is plain JS + Three.js + Web Audio and is tested every day in Playwright's Chromium. Electron
ships that same Chromium inside the app, so what our probes and `npm run check` see is what a Steam
player gets. steamworks.js (Node native module, Rust bindings to the Steamworks SDK) gives achievements,
Steam Cloud, rich presence, the overlay, lobbies, P2P networking and leaderboards from JS.

| Option | Verdict |
| --- | --- |
| **Electron + steamworks.js** | **Pick.** Same engine as our tests, Node in the main process for files and Steam, mature, used by shipped Steam games. Cost: about 150 MB install, a known overlay setup step. |
| Tauri (WebView2) | No. WebView2 is the player's system Edge, so the browser version is not ours to pin, WebGL and audio quirks vary by PC, and every Steam call needs Rust. |
| NW.js + Greenworks | No. Greenworks is barely maintained; same Chromium benefit as Electron with less tooling. |
| Port to an engine (Godot, Unity) | No. A rewrite of a finished game. |

How it wraps: `vite build` already makes `dist/`. Electron's main process opens one window on
`dist/index.html` (served from a local `app://` protocol, not `file://`, so module scripts and fetches
work), starts Steam, and exposes a small `window.echoesHost` bridge (saves, achievements, lobbies,
quit) through a preload script. The game reads that bridge when it exists and stays the web game when
it does not. Windows x64 only at launch; the Steam Deck runs the Windows build through Proton (S12).

### D2. Co-op: Steam lobbies + Steam networking, behind the transport we already have

Co-op today is host-authoritative: guests send inputs, the host sends snapshots, over WebRTC with the
WebSocket server as relay and matchmaker (`src/net/`, `server/`). The game rules sit above one
transport interface (`open`, `sendControl`, `sendBinary`, `on('control'|'binary'|'close')`).

Pick: on Steam, **Steam lobbies** replace room codes and Quick Match (invite a friend from the
overlay, join from the friends list), and **Steam Networking Messages** (relayed through Valve's
network, so no NAT trouble and no server bill) replace WebRTC and the relay. It is a new transport
under the same interface, so `session.js`, prediction and snapshots do not change.

Why not keep only our server: the free Render host sleeps, has no uptime promise and is in one region;
a paid game cannot depend on it. Steam's relay is free to us and worldwide.

The web build keeps the WebSocket and WebRTC path (playtest link, demo). That is two transports under
one transport system, the same as WebRTC plus relay is today, so it keeps the "one implementation
per system" rule.

### D3. Saves: files on disk, synced by Steam Auto-Cloud

Saves live in `localStorage` today (`src/save/storage.js`). Inside Electron that is a LevelDB folder
Steam Cloud cannot sync safely. Pick: a file backend in the same storage module (one JSON file per
key under `%APPDATA%/Echoes/saves/<steamid>/`, written through the crash-safe write the module
already does), and **Steam Auto-Cloud** on that folder (set in the Steamworks partner site, no code).
The existing cloud-save client (`src/save/cloud.js`, our server) stays for the web build only.
First launch imports any old `localStorage` save once.

### D4. Achievements: from the 61 deeds

The game already has 61 deeds with tests in `src/data/unlocks.js`. Pick: one Steam achievement per
deed (same id, same name in ten languages), set when the deed is paid. No new rules; Steam just
mirrors what the profile already records. 61 is within Steam's norms; Steam also wants the hidden
flag on story spoilers (the two endings). A profile that earned deeds before Steam unlocks them on
first launch (the profile has the record, so no number is invented).

### D5. Daily board: Steam leaderboards

The Daily board needs Upstash or `ECHOES_DAILY_SECRET` on our server (open item #109). Pick: on
Steam, one leaderboard per day (`daily-YYYYMMDD`, created on first post), scores from the run's own
record. No server needed. The web build keeps `server/daily.mjs`.

### D6. Minimum spec: GTX 1050 Ti class, 1080p, 60 fps, default settings

| | Minimum | Recommended |
| --- | --- | --- |
| OS | Windows 10 64-bit | Windows 10/11 64-bit |
| CPU | Intel i5-4590 / AMD Ryzen 3 1200 (4 cores) | Intel i5-8400 / Ryzen 5 2600 |
| RAM | 8 GB | 16 GB |
| GPU | NVIDIA GTX 1050 Ti 4 GB / AMD RX 570 / Intel Arc A380 (DirectX 11) | GTX 1660 / RX 5600 XT |
| Storage | 1 GB | 1 GB |
| Target | 1920x1080, render scale 1.0, 60 fps in a busy four-hero fight | 1440p or 144 Hz |

Why this line:
- It is the most common floor on Steam store pages for small 3D games, and the Steam Hardware Survey
  has the large majority of players at or above it, so the store promise is honest and wide.
- Iris Xe (the office laptop) drops frames today. A dedicated 4 GB card has several times its memory
  bandwidth, which is what a full-screen bloom stack and additive VFX eat. Promising Iris Xe would
  cost a graphics rework under a frozen look.
- It leaves Iris Xe-class laptops playable with the render scale slider and a Low preset (S9) without
  promising it.
- **What binds the frame now (2026-11-15).** The Tripo models cost a few draw calls each where the faceted rigs cost
  30 to 120, so the frame is bound by triangles (a busy fight is about 160,000, about 320,000 with ink outlines) and
  texture memory (about 300 MB for one room's cast at 2048 px, four to eight times less with KTX2), not by draw calls.
  S9's probe measures the Tripo models, and the Low preset adds a texture-size step.
- **Not proven yet.** We cannot measure a GPU from the cloud. S9 adds a frame-time probe and asks Kesh
  to run it on his home laptop (tell us its GPU) and, if he can borrow one, a 1050 Ti-class PC. The
  spec on the store page is set from that run, not from this paragraph.

Steam Deck: a stretch goal after launch (S12), not a launch promise. Its GPU is near Iris Xe, but it
draws only 1280x800, so it may hold 60 fps on Low where the laptop cannot.

### D7. Art target: Tripo models (settled 2026-11-15)

*Was: decided after a side-by-side of styles A to D on the mouse Healer, recommending A (polished faceted).* Kesh
chose instead to make every model in Tripo Studio (paid Studio plan) and have the threads rig and animate each on a
review page. All seven heroes, 17 bosses and 12 champions, 38 foes and six NPCs are passed; four foes and the five camp
wardens remain (repo `docs/TRIPO_MODELS.md`, "Not made yet"). Ruling A23 makes them the game's models, one per creature.
The art-style comparison (draft #142) and the faceted detail rounds (draft #144) are closed.

### D8. Price: USD 9.99 to 14.99 (Kesh's call)

Recommended **USD 12.99** with a 10% to 15% launch discount: seven heroes, five levels with a fork,
17 bosses, three modes and online co-op sit above most 9.99 roguelikes, and a launch discount is where
most first-week sales come from. Steam suggests regional prices from the USD one; accept them.

---

## 2. Content audit against "about 4 hours to see all content"

**What is in the game now** (counted from `src/data/`, `src/sim/`): 7 heroes (Tidecaller, Bellwright,
Duskwing unlock on Level II, III, IV clears), 5 campaign levels with the Spire-or-Kiln fork and two
endings, 40 rooms per run, 17 bosses (16 boss modules plus the gated third bosses), 12 champions,
41 enemy types, 63 relics, 61 deeds, 117 unlocks costing 6,930 Embers, Endless, Daily, Boss Rush,
online co-op with AI seats, ten languages.

**How long a run takes.** Headless autopilot, 16 seeds, current head (measured today,
`tools/endless-run.mjs --campaign 1`): a winning 40-room campaign takes 17 to 19 minutes of sim time;
the v0.5.260 four-level runs took 11 to 20. The bot never stops in a draft, shop, event or story card
and fights worse than a good player, so a human winning run is an estimate of **40 to 55 minutes**.
Boss Rush: 7 to 9 minutes by autopilot (docs/BOSS_RUSH.md), about 15 for a person.

**The shortest path to "all content" for a skilled first-time player** (estimate):

| Step | Opens | Time |
| --- | --- | --- |
| Run 1, dies in Level II | Tidecaller if II is cleared | 20 min |
| Run 2, dies in Level III | Tidecaller / Bellwright | 30 min |
| Run 3, dies in Level IV | Bellwright / Duskwing | 40 min |
| Run 4, wins via the Spire | ending 1, Endless, Boss Rush | 50 min |
| Run 5, wins via the Kiln | ending 2 | 50 min |
| A Boss Rush | mode | 15 min |
| An Endless descent to Depth 6 | mode | 30 min |
| A Daily | mode | 30 min |
| **Total** | | **about 4.5 hours** |

An average player loses more runs, so 6 to 10 hours; the 117 unlocks take far longer (about 30+ runs
at 100 to 300 Embers per run after the one-off deeds).

**Verdict: the amount of content already clears 4 hours.** The gap is not more levels; it is the
things that make those 4 hours read as a finished, sellable game:

| # | Gap | Why it matters on Steam |
| --- | --- | --- |
| G1 | ~~Level V, Spire and Kiln rigs are not on the model standard~~ Closed 2026-11-15: the Tripo models cover every land. What remains is bringing them into the game (S11) | The last hour of the game, and both endings, look the same standard as the first four |
| G2 | No measured human playtime | "4 hours" on the store page should come from players. The profile already records `playtimeSec`; S13 reads it from playtesters |
| G3 | No graphics presets, only a render-scale slider | Steam players expect Low/Medium/High; the min spec needs a Low |
| G4 | No Quit to Desktop, no Credits | Required for a desktop app; credits are expected (and list Three.js, fonts, licences) |
| G5 | Music and sound are all synthesized | Fine if it sounds finished; it needs one listening pass by Kesh on speakers (a person, not a probe) |
| G6 | Real gamepad untested | Steam shows "controller support" on the page; Deck needs it |
| G7 | Tuning after play (backlog) and the 14 open §6.3 calls in docs/VFX_HIT_RULES.md | Balance and feel, from his laptop runs |
| G8 | Freeze fixes 8 to 10 from the consistency review (Gloamfang tint, Level I banner name, magic purple); still valid with the Tripo models (tints recolour effects, not models) | Small, but visible |
| G9 | Ending and first-hour onboarding not checked as a whole | A new buyer must know what to do in 2 minutes and feel the endings land |

---

## 3. The slices (numbered; each is one PR unless it says doc)

Order: the first three can start now under the freeze (they are setup, not features). The rest wait
for Kesh's freeze lift.

| # | Slice | What it does | Done when |
| --- | --- | --- | --- |
| **S0** | Steamworks account (Kesh's hands) | Section 4 below. Starts the 30-day clock, so do it first | App ID exists |
| **S1** | ~~Art comparison~~ Done 2026-11-15 | Settled by the Tripo models (D7) | Closed |
| **S2** | Electron shell | `desktop/` folder: Electron main + preload, `app://` protocol on `dist/`, one window, fullscreen and windowed, single instance, no menu bar, crash log to `%APPDATA%`. Build with electron-builder to a Windows folder. Web build unchanged | The game boots and plays in the window; `npm run check` has a desktop leg |
| **S3** | Desktop basics | Quit to Desktop in title and pause (desktop only), Credits screen (team, Three.js and licences), fullscreen remembered (the browser reason for not saving it goes away) | Ten languages; probe |
| **S4** | Steam init + overlay | steamworks.js in main, `steam_appid.txt` for dev, restart through Steam when launched outside it, overlay enabled, pause on overlay open, rich presence ("Level III, room 24") | Overlay opens over the game on Kesh's PC |
| **S5** | File saves + Auto-Cloud | File backend in `src/save/storage.js` through the bridge; one-time import from `localStorage`; Auto-Cloud set in Steamworks | Save on PC A, Continue on PC B |
| **S6** | Achievements | 61 achievements from the deeds, art for each (one icon template, 64x64 locked and unlocked), names in ten languages; backfill from the profile | All 61 in Steamworks; a probe pays each deed and checks the call |
| **S7** | Steam co-op transport | Steam lobby create, invite, join, leave; Networking Messages transport under the existing interface; host leaving ends the session as now | Two Steam accounts play a run on two networks (Kesh's cross-network test, open item) |
| **S8** | Daily on Steam leaderboards | Per-day board, top 100 plus friends, the run record as the score | A Daily post shows in the overlay board |
| **S9** | Performance and presets | Frame-time probe (busy four-hero fight, worst 1% frame), Low/Medium/High presets over existing knobs (render scale, bloom, FXAA, shadow and particle caps), auto-pick on first launch | Kesh's runs on his machines; min spec confirmed or moved |
| **S10** | Controller and Deck-readiness | Real-pad pass (Xbox and PlayStation), on-screen glyphs per pad, text readable at 1280x800 | Kesh plays a run on a pad |
| **S11** | Tripo models into the game | First the in-game trial (one hero, one foe, one boss in a Level I room, judged on Kesh's laptop); then land by land: the loader and packed GLBs (`docs/TRIPO_MODELS.md` "Loading plan"), each code-built rig and its probe replaced in the same change, the Ember texels on six Kiln foes moved to land heat, G8 fixes | Shots per Before READY; S9 run on the Tripo models |
| **S12** | Steam Deck (after launch, optional) | Proton test, Low preset at 800p, Deck Verified review | Valve's Verified badge |
| **S13** | Playtest build | Steam Playtest app (free, sign-up), 10 to 30 players, read `playtimeSec`, run counts, where they die | Measured hours for the page; tuning list (G7) |
| **S14** | Tuning pass | From S13 and Kesh's play: balance, the 14 §6.3 calls, onboarding (G9) | Kesh's go |
| **S15** | Store page and assets | Section 5 below; page in all ten languages | Page passes Valve review; "Coming Soon" live |
| **S16** | Demo for Next Fest (optional, recommended) | Level I and II, one boss each, three heroes, separate demo App ID | Demo live for a Next Fest |
| **S17** | Release build | Depots, branches (default, beta), build review by Valve, launch date, launch discount | Kesh presses Release |

Rough size: S2 to S10 are a few days of thread work each; S11 depends on the in-game trial and runs land by land; S13 and S14 need
real players for about two weeks. Earliest realistic release is about 8 to 10 weeks after the freeze
lifts, bounded by Valve's 30-day wait and the store page's two-week Coming Soon minimum.

---

## 4. Steps that need Kesh's hands (in order)

1. **Steamworks account.** partner.steamgames.com, sign up as a developer with his legal name or a
   company. Accept the Steam distribution agreement.
2. **Identity and tax.** Valve's identity check, the tax interview (non-US individuals usually file a
   W-8BEN; the interview picks the form), bank account for payouts.
3. **App credit: USD 100** (Steam Direct fee) for the game. Paid back to him in earnings once the game
   makes USD 1,000. A demo (S16) does not need its own fee. After paying, Valve starts a **30-day wait** before the first release.
4. **Name.** Check "Echoes" on Steam and trademarks; many games use the word. A subtitle
   ("Echoes: ...") or a distinct name avoids a store clash. His pick.
5. **Store page** filled from S15's assets, submitted for review (a few business days), then set to
   **Coming Soon** at least 2 weeks before launch to collect wishlists.
6. **Pricing** in the partner site (D8), regional prices, launch discount.
7. **Build review.** Upload the S17 build; Valve reviews it (a few business days).
8. **Release.** He presses the button; then Manual Deploy for the web build as today.
9. **Optional:** Next Fest sign-up (S16) months ahead; Steam Deck review (S12).

Fees and waits change; each step says the current figure on the partner site when he gets there.

---

## 5. Store assets (S15)

Steam's current required sizes (check the partner site's "Graphical Assets" page when building them):

| Asset | Size |
| --- | --- |
| Header capsule | 920 x 430 |
| Small capsule | 462 x 174 |
| Main capsule | 1232 x 706 |
| Vertical capsule | 748 x 896 |
| Library capsule | 600 x 900 |
| Library hero | 3840 x 1240 (no logo or text) |
| Library logo | 1280 x 720 (transparent PNG) |
| Page background (optional) | 1438 x 810 |
| Screenshots | at least 5, 1920 x 1080 |
| Trailer | 30 to 90 s, 1080p, gameplay in the first 5 s |
| Client icon / community icon | .ico / 184 x 184 |
| Achievement icons | 61 x 2 (locked and unlocked), 256 x 256 |

Text: short description (300 characters), long description, feature list, the "4+ hours" line only
after S13 measures it, system requirements from S9, mature content survey (combat, no gore), the AI-generated
content disclosure in that survey (the models were made with Tripo AI; check the survey's current wording), and every
field in all ten languages (the game's own glossary in `src/i18n/catalog.json` keeps names the same).

Screenshots and the trailer are shot on Kesh's home laptop or a GPU PC, never in the cloud's
software GL (it runs at about 1 fps and would show).

---

## 6. Risks

- **Overlay in Electron** can flicker or not draw on some GPUs. steamworks.js documents the fix
  (a flag and a forced repaint each frame); S4 tests it early.
- **A Steam-only transport** cannot be tested in the cloud. S7 needs two Steam accounts on two
  networks, Kesh's hands.
- **"Echoes" name clash** (step 4) can delay the store page; check first.
- **Freeze length.** Every week the freeze stays on pushes release by a week; S0, S1 and S2 can run
  during it.
- **Min spec is a guess until S9 runs on real hardware.**
- **Tripo licence.** Tripo's help page says paid users hold full commercial rights to what they generate
  (https://www.tripo3d.ai/help/privacy-policy/can-i-use-models-commercially). Keep proof of the paid plan for the dates the
  models were made (12 to 15 Nov 2026 onward); free-plan outputs carry other terms.
- **Download size.** The 80 GLBs are 139.7 MB as exported and 29.1 MB packed (1024 px foe textures, WebP, meshopt;
  measured 2026-11-15). Fine for the 1 GB Steam line; the web build loads a land's models ahead of it.

---

## 7. Steam's content rules, checked against Echoes (added 2026-11-15)

Kesh's screenshot of the Steamworks "Rules and guidelines" list (2026-11-15). Each rule against the game as it is:

| # | Steam rule (short) | Echoes | Action |
| --- | --- | --- | --- |
| 1 | No hate speech | Fantasy creatures, no real groups | None |
| 2 | No nude or sexual images of real people | None | None |
| 3 | Adult content labelled and age-gated | None; cartoon combat, no gore | Answer the mature content survey honestly (fantasy violence) in S15 |
| 4 | No libel | None | None |
| 5 | **Only content you own or have rights to** | Code is ours; Three.js is MIT; fonts are the player's system fonts (no font files shipped); all sound and music are synthesized in code (no audio files); models are Tripo AI output | **Keep proof of the paid Tripo plan** (section 6). Credits screen (S3) lists Three.js, steamworks.js, Electron and their licences. Never put reference images, other games' art or music into the build or store page. Fill the **AI content disclosure** in the content survey (S15) |
| 6 | Legal everywhere it is sold | Nothing regional | Accept Steam's default regions; China needs its own approval, skip it at launch |
| 7 | Nothing made to shock or disgust | None | None |
| 8 | Nothing that exploits children | None | None |
| 9 | No software that changes the PC unexpectedly | Electron app writes only saves and a crash log under `%APPDATA%/Echoes` | S2 keeps it that way: no auto-updater of our own (Steam updates the game), no installer extras |
| 10 | No harvesting of credentials or payment data | Co-op uses Steam IDs; no login screen | The web build's cloud saves and Daily server stay out of the Steam build (D3, D5) |
| 11 | Videos only for shipped products | Trailer is gameplay of Echoes | None |
| 12 | No non-interactive 360 VR video | Not relevant | None |
| 13 | No blockchain, crypto or NFTs | None | Never add |
| 14 | **No advertising-based business model** | One-time purchase | No ads, ever; the store price is the model (D8) |

Result: nothing in the game breaks a rule today. The two that need work are 5 (rights proof, credits, AI disclosure) and 3
(survey answers), both in S3 and S15.
