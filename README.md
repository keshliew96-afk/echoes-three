# Echoes

A top-down party roguelike for the browser, built with Three.js. You play the
mouse Healer leading three AI (or human) allies — a badger Tank, a fox Swordsman
and a hare Archer — through eight-room expeditions, drafting skills and socketing
nodes between fights, until you face the expedition's boss: the Hollow Stag, the
Drowned Heron or the Barrow Wyrm.

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

Or build and serve the game **with multiplayer** from one port, for everyone on
your network (see [Multiplayer](#multiplayer)):

```bash
npm run serve        # -> http://localhost:7800/ and your network address
```

## How to play

**Title screen:** New Game / Continue / Load Game / Multiplayer / Settings /
Records / Exit. Navigate with the arrow keys or mouse; Enter confirms, Esc goes
back.

**The loop:** you start at the night camp. Walk to the violet portal at the top
of the camp and press **E** to begin an expedition (once you have won Act I, the
portal offers an expedition picker). A run is eight rooms: kill-all and defend
rooms, a shop in room 7, and the expedition's boss in room 8 (the Hollow Stag, the
Drowned Heron or the Barrow Wyrm). Clearing a room offers a
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
- **Network:** your player name; the server address (Automatic — the site you
  opened the game from — unless you set another); connection details in game.

## Multiplayer

Co-op for up to four: one host plays the Healer, up to three friends take the
Tank, Swordsman and Archer, and the AI plays every empty seat. **Players join by
opening the game's link** — the game finds its multiplayer server on the site it
was loaded from, so nobody types a server address.

Between rooms **every player builds their own character** — their reward card
(a new skill, or a swap when all 4 slots are full), their node sockets and
their shop purchases, all at the same time on their own screen (with two or
more players a reward card nobody decides is picked for them after 30 s, with a
notice). The host also builds the AI-held seats (Settings ▸ Gameplay ▸ Ally
builds) and picks the doors.

### Play on your home network

On the host's computer, in the game folder:

```bash
npm install
npm run serve
```

`npm run serve` builds the game and starts one small Node program that serves
the game **and** multiplayer on port 7800. It prints the links:

```
[echoes-net]   play on this computer:  http://127.0.0.1:7800/
[echoes-net]   players on your network open:  http://192.168.1.13:7800/
```

1. Everyone opens the network link (`http://192.168.1.13:7800/` above) in a
   browser. The host can use either link.
2. Host: **Multiplayer → Host a Game** (private — friends join with the code) or
   **Host a Public Game** (Quick Match can fill the empty seats). The lobby shows
   a **5-letter room code** in large type and the link to share.
3. Friends: **Multiplayer → Join by Code** and type the code (case does not
   matter), or **Quick Match** to join any open public room.
4. Pick a seat and press **Ready**; the host presses **Start** once everyone is
   ready. Guests can also **drop in** to a running game with the code.

The first time, Windows may ask whether Node.js may use private networks —
allow it, or your friends cannot connect. Use `npm run serve -- --port 8080` if
port 7800 is taken. To play over the internet, see
[Host it on a server](#host-it-on-a-server).

### While developing: the dev and preview servers

The dev server (`npm run dev`) and the preview server (`npm run preview`)
forward `/echoes` to the session server on your computer, so run it beside
them — friends still just open the page:

```bash
npm run net              # terminal 1: the session server (port 7800)
npm run dev -- --host    # terminal 2: prints a "Network:" URL — friends open it
```

`npm run preview -- --host` does the same for the production build. For a
session server on another port, set `ECHOES_NET_PORT` for Vite too:
`ECHOES_NET_PORT=7811 npm run dev` with `npm run net -- --port 7811` (PowerShell:
`$env:ECHOES_NET_PORT=7811; npm run dev`).

### Using a different server (optional)

**Settings → Network → Server address** shows **Automatic (this site)** and the
address in use. Only when the game page and its server live in different places
(for example the page on a static host and the server on your own machine) enter
`ws://host:port/echoes` there — `wss://` if the page is served over https — or
use **Change server** on the Multiplayer screen. **Reset to automatic** goes
back. A build can also carry its server:
`VITE_NET_URL=wss://echoes.example.com/echoes npm run build` (PowerShell:
`$env:VITE_NET_URL="wss://echoes.example.com/echoes"; npm run build`).

### If something goes wrong

- **"Can't reach the Echoes server"**: the panel says what is missing for your
  case — no session server behind this site, the dev/preview server without
  `npm run net`, or a custom address that does not answer (then **Use this
  site's server** goes back to automatic). Fix it and press **Retry**.
- **"A new version of Echoes is available"**: the host updated the game. Press
  **Reload** — settings, saves and records stay in your browser.
- **Connection lost mid-game:** the game reconnects automatically for 15 s. If it
  gives up, the title offers **Rejoin** for a minute.
- **Host disconnects:** after a 10 s grace the guest with the best connection
  becomes the new host and the game continues.
- **Lag:** the in-game chip shows your ping. Play stays responsive up to roughly
  150 ms round-trip; movement and your own actions are predicted locally and
  corrected smoothly.

## Host it on a server

Put the game on the internet with one domain and automatic HTTPS: a small Linux
VPS (1 vCPU and 512 MB are plenty — the server only relays game traffic; the
host's browser runs the game) runs **one Node process** that serves the game and
multiplayer, with **Caddy** (or nginx) in front for HTTPS. Players open
`https://echoes.example.com/` and press Multiplayer — nothing else.

Replace `echoes.example.com` with your domain and create a DNS **A record** for
it pointing at the server's IP address before you start.

### 1. Install Node.js and the game

Debian 12 / Ubuntu 22.04 or newer:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo mkdir -p /opt/echoes && sudo chown "$USER" /opt/echoes
```

Copy the project folder to `/opt/echoes` — `git clone <your repository>
/opt/echoes`, or from your computer:
`rsync -a --exclude node_modules --exclude 'dist*' --exclude captures ./ you@your-server:/opt/echoes/`.
Then build it:

```bash
cd /opt/echoes
PUPPETEER_SKIP_DOWNLOAD=1 npm ci    # the test browser is not needed on a server
npm run build                       # -> dist/
```

### 2. Try it

```bash
npm start -- --host 127.0.0.1
```

It prints `serving the game v… from /opt/echoes/dist` and `play on this
computer: http://127.0.0.1:7800/`; `curl -s http://127.0.0.1:7800/health`
answers `{"ok":true,…}`. Stop it with Ctrl+C — systemd runs it in step 4.

### 3. HTTPS with Caddy

```bash
sudo apt-get install -y caddy
```

(Debian 12 and Ubuntu 24.04 ship Caddy; for other systems see
[caddyserver.com/docs/install](https://caddyserver.com/docs/install).) Replace
`/etc/caddy/Caddyfile` with:

```
echoes.example.com {
	# The game (/) and multiplayer (/echoes, a WebSocket) are one process.
	# Caddy fetches the certificate, redirects http to https, keeps the
	# Host header and passes WebSocket upgrades through by itself.
	reverse_proxy 127.0.0.1:7800
}
```

```bash
sudo systemctl reload caddy
```

**Or nginx** (with a certificate from certbot:
`sudo apt-get install -y nginx certbot python3-certbot-nginx`, then
`sudo certbot certonly --nginx -d echoes.example.com`), in
`/etc/nginx/sites-available/echoes` linked from `sites-enabled`:

```nginx
server {
    listen 80;
    server_name echoes.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name echoes.example.com;
    ssl_certificate     /etc/letsencrypt/live/echoes.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/echoes.example.com/privkey.pem;

    # The game.
    location / {
        proxy_pass http://127.0.0.1:7800;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Multiplayer: the WebSocket.
    location = /echoes {
        proxy_pass http://127.0.0.1:7800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/echoes /etc/nginx/sites-enabled/echoes
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Keep it running (systemd)

`/etc/systemd/system/echoes.service`:

```ini
[Unit]
Description=Echoes (game + multiplayer)
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/echoes
ExecStart=/usr/bin/node server/index.mjs --static dist --host 127.0.0.1 --port 7800 --origins self
Restart=always
RestartSec=2
DynamicUser=yes
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now echoes
systemctl status echoes          # "active (running)"
journalctl -u echoes -f          # the server's log
```

(`command -v node` shows the Node path if it is not `/usr/bin/node`.)

### 5. Firewall

Only the web ports are public; 7800 stays on `127.0.0.1` behind the proxy:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

If your provider has its own firewall (security group), open 80 and 443 there
too.

### 6. Players join

Send the link: `https://echoes.example.com/`. Players open it, press
**Multiplayer**, then **Host a Game** or **Join by Code**. The page connects to
`wss://echoes.example.com/echoes` by itself — no settings.

### Updating

```bash
cd /opt/echoes
git pull                       # or rsync the new files
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run build
sudo systemctl restart echoes
```

Anyone still on the old page — mid-game or on the title — is told **"A new
version of Echoes is available"** and one **Reload** brings the new build
(`index.html` is never cached; the hashed game files are cached for a year and
change name with every build).

### Server options

`node server/index.mjs` (`npm run net` / `npm start` / `npm run serve` pass
their flags through, e.g. `npm start -- --port 8080`):

| Flag | Default | What it does |
|---|---|---|
| `--static <dir>` | off | serve the built game (`dist`) on the same port as `/echoes` |
| `--host <addr>` | `127.0.0.1` (`0.0.0.0` in `npm run serve` / `npm start`) | where to listen; behind a proxy keep `127.0.0.1` |
| `--port <n>` | `7800` | the port |
| `--origins <list>` | any (`self` in `npm run serve` / `npm start`) | which web pages may connect: `self` = pages served from this same address (through your proxy too), or exact origins such as `https://games.example.net`, comma-separated |
| `--max-per-ip <n>` | `16` | WebSocket connections per player IP (read from `X-Forwarded-For` behind a local proxy); `0` = no cap |
| `--build <version>` | from `dist/version.json` | the deployed version when the game is served elsewhere |

`GET /health` answers JSON (version, rooms, players). Messages are always
rate-limited per connection and each is capped at 1 MB. A game page hosted elsewhere
(a CDN, a game portal) needs its origin in `--origins` and a build made with
`VITE_NET_URL=wss://echoes.example.com/echoes`.

## Project layout

```
src/            game code (sim, render, ui, audio, net, save, env)
server/         session server + static game server (npm run net / npm run serve)
tools/          capture harness, analyzers, probes and the agent workflows
docs/           design brief, testing contract, reference bar, critiques, plan
PROGRESS.md     live build log
```

Development follows a builder/critic loop: every feature is built by one agent
and judged against real shipped games by a fresh critic on captured frames and
measured behaviour. See `docs/TESTING.md` for the harness and `docs/gauntlet/`
for the current iteration's plan and verdicts.
