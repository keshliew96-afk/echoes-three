# Echoes

A top-down party roguelike for the browser, built with Three.js. You play the
mouse Healer leading three AI (or human) allies — a badger Tank, a fox Swordsman
and a hare Archer — through eight-room expeditions, drafting skills and socketing
nodes between fights, until you face the Hollow Stag.

- Single player and up to 4-player online co-op (one host + 3 guests)
- Three expeditions (Hollow Wood, Sunken Mill, Ashen Barrow), each a full run
- 4 equipped skills, each with 8 node sockets (any rarity fits any socket)
- Save slots, autosave, quick save, records, a settings menu with display and
  audio controls

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer (developed on 24)
- A desktop browser with WebGL 2 (Chrome, Edge or Firefox). Keyboard + mouse;
  a standard gamepad also works in the menus and for movement.

## Run it

```bash
npm install
npm run dev
```

Open **http://localhost:5199** and press any key on the loading screen. That
first press also unlocks audio.

Production build (a static bundle in `dist/` that runs from any path):

```bash
npm run build
npm run preview
```

## How to play

**Title screen:** New Game / Continue / Load Game / Multiplayer / Settings /
Records / Exit. Navigate with the arrow keys or mouse; Enter confirms, Esc goes
back.

**The loop:** you start at the night camp. Walk to the violet portal at the top
of the camp and press **E** to begin an expedition (once you have won Act I, the
portal offers an expedition picker). A run is eight rooms: kill-all and defend
rooms, a shop in room 7, and the Hollow Stag in room 8. Clearing a room offers a
reward draft — a skill or a node — then you pick a door to the next room.
Winning or dying returns you to camp with your records updated.

### Controls

| Input | Action |
|---|---|
| **W A S D** | Move |
| **Mouse** | Aim |
| **Right mouse (hold)** | Basic attack, repeats while held |
| **Space** | Dodge roll (invulnerable frames) |
| **1 2 3 4** | Skills in slots 1–4 |
| **R** | Rally: all allies regroup on you |
| **E (hold)** | Revive a downed ally next to you · **E (tap)** interact with objects |
| **Tab** | Cycle the party's focus target |
| **F1–F4** | Toggle heal-target override per party member (or click a portrait) |
| **B** | Open the socket screen (between rooms) |
| **Esc / P** | Pause menu (Resume, Settings, Save, Load, Quit) |
| **F5 / F9** | Quick save / quick load (single player) |

On a reward screen: **A/D** or the arrows choose, **Enter** takes, **X** or the
Decline button declines. (Esc opens the pause menu everywhere; it never throws a
reward away.)

### Build: skills and nodes

You can carry at most **4 skills**. Every skill has **8 node sockets**, and a node
of any rarity fits any socket; the only limits are per-node copy limits (for
example Sharpen at most twice on one skill). Nodes you draft, buy or pick up as
room spoils land on your bench; open the socket screen with **B** between rooms
to place them (arrows/WASD move the cursor, Enter picks and places, X removes,
Tab switches between the bench and the sockets, F auto-fills). Technique nodes
reinterpret themselves per skill: Bounce ricochets a damage skill but chains a
heal, and so on. Grey markers mean a node does nothing on that skill.

### Saving

- **Autosave** runs at safe points (camp, room boundaries).
- **Save / Load** live in the pause menu and on the title; slots show a
  thumbnail, room, playtime and date. Overwrite and delete ask for confirmation.
- **Continue** on the title resumes the newest save.
- Saves are stored in the browser's local storage for this site. You can also
  export a slot to a JSON file and import it on another machine from the
  Load Game screen.

### Settings

- **Display:** resolution scale (internal render size), windowed/fullscreen,
  V-Sync (display-paced vs uncapped rendering), frame-rate limit
  (30/60/120/144/unlimited). Fullscreen changes ask you to keep or revert.
- **Audio:** Master, Music and SFX sliders, each switchable between a linear and
  a logarithmic (dB) curve, plus mute and a test sound.
- **Network:** the session server address (see below).

## Multiplayer

Co-op needs two things running: the **game page** (what everyone opens in their
browser) and the **session server** (a small Node program that runs lobbies and
relays the game between players). One player — the host — runs both.

### 1. Host: start the session server

```bash
npm run net -- --host 0.0.0.0
```

The server prints the addresses players can use, for example:

```
[echoes-net] this computer: ws://127.0.0.1:7800/echoes
[echoes-net] your network:  ws://192.168.1.13:7800/echoes
```

Without `--host 0.0.0.0` only your own computer can connect. Use `--port` to
pick another port if 7800 is taken. The server has no npm dependencies.

### 2. Host: serve the game page to your friends

Your friends also need to load the game page. On a home network the simplest
way is to expose the dev server (or the production preview) on your LAN:

```bash
npm run dev -- --host
```

Vite prints a `Network:` URL such as `http://192.168.1.13:5199/`. Share it. (For
the production build use `npm run preview -- --host` instead.) If you host the
built `dist/` folder on any static web host, players can open that URL instead.

### 3. Host: open a room

In the game: **Multiplayer → Host a Game** (private, friends join with the code)
or **Host a Public Game** (Quick Match can fill empty seats). The lobby shows a
**5-letter room code** in large type. Read it out or paste it to your friends.
The lobby also lists the LAN server address for players on your network.

### 4. Friends: join

1. Open the host's game page URL in a browser.
2. **Multiplayer → Settings → Network tab** (or the "Change server" button on
   the unreachable panel) and enter the host's server address, for example
   `ws://192.168.1.13:7800/echoes`. Addresses start with `ws://` (or `wss://` if
   the page is served over https).
3. **Multiplayer → Join by Code** and type the 5-letter code (case and dashes
   do not matter), or **Quick Match** to join any open public room.
4. Pick a seat and press **Ready**. The host presses **Start** once everyone is
   ready.

Seats map to the party: the host is the Healer, guests take the Tank, Swordsman
and Archer. Any seat without a human is played by the AI, so a 2-player game
works fine. Guests can also **drop in** to a running game with the room code.

### Playing over the internet

The server must be reachable from outside your network. Either run it on a
machine with a public address (a VPS, or a home PC with port 7800 forwarded on
your router) and share that address as `ws://<public-ip>:7800/echoes`, or use a
tunnel/VPN tool your group already trusts. If the game page is served over
https, the server address must be `wss://` — put the session server behind a
TLS-terminating reverse proxy (nginx, Caddy, Cloudflare Tunnel) that forwards
`/echoes` as a WebSocket.

### If something goes wrong

- **"Server unreachable"** panel: the server is not running or the address is
  wrong. Start it, check the address in Settings → Network, press **Retry**.
- **Connection lost mid-game:** the game reconnects automatically for 15 s. If
  it gives up, the title offers **Rejoin** for a minute.
- **Host disconnects:** after a 10 s grace the guest with the best connection
  becomes the new host and the game continues.
- **Lag:** the in-game chip shows your ping. Play stays responsive up to roughly
  150 ms round-trip; movement and your own actions are predicted locally and
  corrected smoothly.

## Project layout

```
src/            game code (sim, render, ui, audio, net, save, env)
server/         session server (npm run net)
tools/          capture harness, analyzers, probes and the agent workflows
docs/           design brief, testing contract, reference bar, critiques, plan
PROGRESS.md     live build log
```

Development follows a builder/critic loop: every feature is built by one agent
and judged against real shipped games by a fresh critic on captured frames and
measured behaviour. See `docs/TESTING.md` for the harness and `docs/gauntlet/`
for the current iteration's plan and verdicts.
