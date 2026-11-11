#!/usr/bin/env node
// MODEL REVIEW (docs/MODEL_STANDARD.md "The review loop") — records every move
// of one hero as short clips for Kesh's review page, three ways: a close-up in
// the model lab with no VFX, and in a real room at play zoom with the VFX off
// and on. Dev-only: it drives the harness debug API on a dev server and
// changes nothing in the game.
//
// Determinism: Playwright's fake clock drives the page, so every recorded
// frame is exactly 1/30 s of game time however slow the GPU is (software GL in
// the cloud renders about one frame every two seconds). The VFX-off run and
// the VFX-on run are two separate page loads replaying the same seeded script
// at the same fake times, so the model moves the same in both.
//
// VFX off hides, at draw time, every mesh, sprite, line and point cloud that
// was not on screen when the stage was set (the room, the hero, the training
// dummies) and is not part of a hero rig (`critter-*`): bolts, rings, casts,
// sparks, numbers. The rig's own parts (the gem's flare) stay.
//
//   node tools/model-review.mjs shots --part lab|game [--vfx on|off] [--model healer]
//       [--out captures/model-review] [--only idle,combo]
//   node tools/model-review.mjs page [--model healer] [--out captures/model-review]
//       [--dest /mnt/project-files/model-review/healer] [--round 1]
//
// `page` encodes each clip to MP4 (ffmpeg) and writes index.html beside them.
// Needs `npm run dev` (and `npm run net`, or the title's cloud probe logs a 502).
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const STEP = argv[0];
const MODEL = opt('model', 'healer');
const OUT = join(opt('out', 'captures/model-review'), MODEL);
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const FPS = 30;
const DT = 1000 / FPS;
const T0 = Date.parse('2026-11-11T00:00:00Z');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The review plan per hero. `moves` are the cards: a lab ability (close-up)
// and an in-game clip (play zoom). `skills` are the in-game skill grid.
const PLANS = {
  healer: {
    name: 'Healer',
    tier: 'hero',
    moves: [
      { id: 'idle', label: 'Idle', lab: { mode: 'idle' }, game: 'idle' },
      { id: 'walk', label: 'Walk', lab: { mode: 'move' }, game: 'walk' },
      { id: 'dash', label: 'Dash', lab: null, game: 'dash' },
      { id: 'combo', label: 'Basic combo (3 hits)', lab: { ability: 'combo' }, game: 'combo' },
      { id: 'point', label: 'Cast pose: Lantern Point (bolts and direct heals)', lab: { ability: 'point' }, game: 'skill:pale_lance' },
      { id: 'bloom', label: 'Cast pose: Bloom (novas and auras)', lab: { ability: 'bloom' }, game: 'skill:nova_bloom' },
      { id: 'plant', label: 'Cast pose: Staff Plant (ground skills)', lab: { ability: 'plant' }, game: 'skill:sanctuary' },
      { id: 'sweep', label: 'Cast pose: Wide Sweep (arcs)', lab: { ability: 'sweep' }, game: 'skill:mending_tide' },
      { id: 'hurt', label: 'Taking a heavy hit', lab: null, game: 'hurt' },
      { id: 'spawn', label: 'Spawn (first room of a run)', lab: { ability: 'spawn' }, game: null },
    ],
    skills: [
      'spirit_bolt', 'mending_bolt', 'lantern_flurry', 'pale_lance',
      'swift_mend', 'guardian_bond', 'kindred_shield', 'lantern_ward',
      'nova_bloom', 'bell_toll', 'hearthsong', 'quiet_hearth', 'warding_aura',
      'sanctuary', 'dewfall', 'rootsnare', 'dawn_brand',
      'mending_tide', 'restorative_wave',
    ],
  },
};
const PLAN = PLANS[MODEL];
// The sign-off list per tier (docs/MODEL_STANDARD.md "The detail standard").
const CHECKLIST = {
  hero: [
    'Silhouette: you can tell who it is from the outline alone at play zoom.',
    'Three levels of detail: big forms, secondary parts, and small repeated detail that still reads at play zoom without turning to noise.',
    'Face, ears and weapon read at play zoom in a busy room.',
    'Colours come from the palette; no Ember or Violet on a hero; Bright Heal green only where it means healing.',
    'Every move has a clear wind-up, contact and follow-through; feet stay planted, the lean stays inside 12 degrees.',
    'The weapon swings clear of the face in every move.',
    'With the effects on, the hero still reads under their own effects and nothing is overbright.',
    'Inside the hero budget: at most 60 meshes and 12,000 triangles.',
  ],
};
if (!PLAN) throw new Error(`no review plan for ${MODEL}`);
const ONLY = opt('only', null) ? new Set(opt('only').split(',')) : null;
const wanted = (id) => !ONLY || ONLY.has(id);

// ------------------------------------------------------------------ shots --
async function shots() {
  const { chromium } = await import('playwright');
  const part = opt('part', 'game');
  const off = part === 'lab' || opt('vfx', 'on') === 'off';
  const dir = join(OUT, `${part}-${off ? 'off' : 'on'}`);
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ args: (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean) });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // three announces each scene and renderer to the devtools hook
  await page.addInitScript(() => {
    window.__mr = { scenes: [], renderers: [], camera: null };
    const hook = new EventTarget();
    hook.addEventListener('observe', (e) => {
      const d = e.detail;
      if (d && d.isScene) window.__mr.scenes.push(d);
      else if (d && d.isWebGLRenderer) window.__mr.renderers.push(d);
    });
    window.__THREE_DEVTOOLS__ = hook;
  });
  await page.clock.install({ time: T0 });
  const q = part === 'lab' ? `?modellab=1&model=${MODEL}&view=showcase&turn=0` : '?seed=5&tips=0&story=0';
  await page.goto(`${URL0}${q}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.cmd && window.__echoes.tick > 30, null, { timeout: 300000, polling: 500 });
  const cmd = (name, ...args) => page.evaluate(([n, a]) => window.__echoes.cmd(n, ...a), [name, args]);

  if (part === 'game') {
    const rs = () => page.evaluate(() => (window.__echoes.state().run || {}));
    await cmd('startRun', { act: 1 });
    for (let i = 0; i < 300 && (await rs()).phase !== 'combat'; i++) await sleep(200);
    await cmd('skipToRoom', 3, { act: 1 });
    for (let i = 0; i < 300; i++) {
      const v = await rs();
      if (v.phase === 'combat' && v.room === 3) break;
      await sleep(200);
    }
  }
  // From here on game time moves only when this script says so.
  await page.clock.pauseAt(T0 + 15 * 60000);
  await page.clock.runFor(400);
  await page.addStyleTag({ content: 'body *:not(canvas){visibility:hidden!important} canvas{visibility:visible!important}' });

  // the mouse on the middle dummy (the camera is known once a frame is drawn)
  const aim = async () => {
    const xy = await page.evaluate(() => {
      const c = window.__mr.camera;
      if (!c) return null;
      const v = c.position.clone().set(0, 0.5, -2.5).project(c);
      return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight];
    });
    await page.mouse.move(xy ? xy[0] : 640, xy ? xy[1] : 300);
  };
  // Set the stage: the hero at the room's middle, three dummies ahead, the
  // allies downed out of frame behind.
  let staged = false;
  let M_KEEP = null;
  const stage = async () => {
    if (part === 'lab') return;
    if (!staged) {
      // once: the room's foes gone, the allies downed out of frame (so they
      // never shoot), three training dummies ahead
      // The room must stay in combat (a cleared room takes no attacks), so
      // every wave but the last is killed, and of the last one foe is kept,
      // parked in a far corner and held asleep for the whole recording.
      for (let i = 0; i < 60; i++) {
        const last = await page.evaluate(() => {
          const ws = window.__echoes.events.filter((e) => e.type === 'wave_start');
          const w = ws[ws.length - 1];
          return !!w && w.index === w.total - 1;
        });
        if (last) break;
        await cmd('killAllEnemies');
        await page.clock.runFor(500);
      }
      await page.clock.runFor(1500); // the last wave's spawn telegraph
      const kept = await page.evaluate(() => {
        const w = window.__echoes.content.world();
        const foes = w.entities().filter((e) => e.faction === 'hostile' && e.hp > 0 && e.kind !== 'dummy');
        const keep = foes.find((e) => /boar|wolf|husk|hound/.test(e.kind)) || foes[0];
        return { keep: keep ? keep.id : null, rest: foes.filter((e) => e !== keep).map((e) => e.id) };
      });
      for (const id of kept.rest) await cmd('setHp', id, 0);
      console.log('room phase', (await page.evaluate(() => window.__echoes.state().run || {})).phase, 'kept', kept.keep);
      M_KEEP = kept.keep;
      const ids = await page.evaluate(() => {
        const w = window.__echoes.content.world();
        return w.entities().filter((e) => e.partyIndex !== undefined && e !== w.player).map((e) => e.id);
      });
      for (const id of ids) await cmd('setHp', id, 0);
      for (const [dx, dz] of [[-1.1, -2.2], [0, -2.7], [1.1, -2.2]]) await cmd('spawn', 'dummy', dx, dz);
      await page.clock.runFor(1500);
      staged = true;
    }
    // every clip: allies back out of frame, dummies topped up (they never
    // die on camera), the Healer at 60% so her heals have someone to mend
    const me = await page.evaluate((keep) => {
      const w = window.__echoes.content.world();
      for (const e of w.entities()) {
        if (e.id === keep) {
          e.x = e.px = 9;
          e.z = e.pz = 7;
          e.status = e.status || {};
          e.status.stun = { mag: 1, untilTick: 1e9, src: null, at: window.__echoes.tick };
        }
        if (e.kind === 'dummy' && e.hp > 0) e.hp = e.maxHp = 1e6;
        if (e.partyIndex !== undefined && e !== w.player) {
          e.x = e.px = -3 + 3 * ((e.partyIndex || 1) - 1);
          e.z = e.pz = 6;
        }
      }
      return w.player.id;
    }, M_KEEP);
    await cmd('setHp', me, 0.6);
    await cmd('teleport', 0, 0.6);
    await page.clock.runFor(700); // the camera settles on the hero
    await aim();
  };
  if (part === 'game') {
    await stage();
    await page.clock.runFor(600);
  }
  // snapshot what is on screen now; VFX off hides anything new at draw time
  await page.evaluate((hide) => {
    const M = window.__mr;
    const scene = M.scenes.find((sc) => sc.children.some((c) => c.isDirectionalLight)) || M.scenes[0];
    M.scene = scene;
    const shown = (o) => {
      for (let p = o; p; p = p.parent) if (!p.visible) return false;
      return true;
    };
    const snap = new Set();
    scene.traverse((o) => shown(o) && snap.add(o.uuid));
    const rig = (o) => {
      for (let p = o; p; p = p.parent) if (/^critter-/.test(p.name)) return p.name;
      return null;
    };
    const r = M.renderers.find((x) => x.domElement && x.domElement.isConnected) || M.renderers[0];
    const draw = r.render.bind(r);
    M.draws = 0;
    r.render = (s, c) => {
      M.draws += 1;
      if (s === scene) {
        M.camera = c;
        scene.traverse((o) => {
          const name = rig(o);
          // the downed allies' rigs stay out of the picture
          if (!M.lab && /^critter-/.test(o.name) && o.name !== `critter-${M.model}`) o.visible = false;
          if (hide && (o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !snap.has(o.uuid) && !name) o.visible = false;
        });
      }
      return draw(s, c);
    };
  }, off);
  await page.evaluate(([m, lab]) => Object.assign(window.__mr, { model: m, lab }), [MODEL, part === 'lab']);

  // one frame: advance 1/30 s, grab the canvas right after the frame's draw,
  // cropped round the hero (game) or whole (lab)
  const grab = async (file, w, h) => {
    await page.clock.runFor(DT / 2);
    await page.evaluate(([cw, ch, lab]) => {
      const M = window.__mr;
      const r = M.renderers.find((x) => x.domElement && x.domElement.isConnected) || M.renderers[0];
      r.__echoesNextRender = r.__echoesNextRender || [];
      M.cap = new Promise((res) => {
        r.__echoesNextRender.push((canvas) => {
          let cx = canvas.width / 2;
          let cy = canvas.height / 2;
          if (!lab && M.camera) {
            const p = window.__echoes.content.world().player;
            const v = M.camera.position.clone();
            v.set(p.x, 0.5, p.z).project(M.camera);
            cx = (v.x * 0.5 + 0.5) * canvas.width;
            cy = (-v.y * 0.5 + 0.5) * canvas.height;
          }
          const sw = lab ? canvas.height * 0.94 : Math.min(canvas.width, cw * (canvas.width / innerWidth));
          const sh = lab ? canvas.height * 0.94 : Math.min(canvas.height, ch * (canvas.height / innerHeight));
          const sx = Math.max(0, Math.min(canvas.width - sw, cx - sw / 2));
          const sy = Math.max(0, Math.min(canvas.height - sh, cy - sh * 0.55));
          const out = document.createElement('canvas');
          out.width = cw;
          out.height = ch;
          out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, cw, ch);
          res(out.toDataURL('image/png'));
        });
      });
    }, [w, h, part === 'lab']);
    await page.clock.runFor(DT / 2);
    let url = await Promise.race([page.evaluate(() => window.__mr.cap), sleep(120000).then(() => null)]);
    if (!url) throw new Error(`no frame drawn in 120 s ${errors.slice(0, 5).join(" / ")} ${JSON.stringify(await page.evaluate(() => ({ draws: window.__mr.draws, renderers: window.__mr.renderers.length, scenes: window.__mr.scenes.length, fl: window.__echoes.settings.get('display.frameLimit'), tick: window.__echoes.tick })))}`);
    writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  };
  const clip = async (id, n, script) => {
    const cdir = join(dir, id);
    rmSync(cdir, { recursive: true, force: true });
    mkdirSync(cdir, { recursive: true });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      if (script) await script(i);
      if (part === 'lab') await grab(join(cdir, `f${String(i).padStart(3, '0')}.png`), 720, 720);
      else await grab(join(cdir, `f${String(i).padStart(3, '0')}.png`), 720, 450);
    }
    console.log(`${part}-${off ? 'off' : 'on'} ${id}: ${n} frames in ${Math.round((Date.now() - t0) / 1000)} s`);
  };
  const key = (code) => page.keyboard.down(code);
  const unkey = (code) => page.keyboard.up(code);

  if (part === 'lab') {
    for (const m of PLAN.moves) {
      if (!m.lab || !wanted(m.id)) continue;
      if (m.lab.mode) {
        await cmd('lab', { model: MODEL, view: 'showcase', turntable: false, azimuth: 0.35, mode: m.lab.mode, fixedDt: 1 / FPS });
        await clip(m.id, 45);
      } else {
        const dur = (await cmd('lab', { model: MODEL, view: 'showcase', turntable: false, azimuth: 0.35, ability: m.lab.ability, mode: 'still', t: 0 })).duration || 1.5;
        const n = Math.min(90, Math.ceil(dur * FPS) + 6);
        await clip(m.id, n, (i) => cmd('lab', { mode: 'still', t: Math.min(dur, i / FPS) }));
      }
    }
    // a slow turntable at rest, for the model itself
    if (wanted('turn')) {
      await cmd('lab', { model: MODEL, view: 'showcase', ability: 'combo', mode: 'still', t: 0 });
      await clip('turn', 72, (i) => cmd('lab', { azimuth: (i / 72) * Math.PI * 2 }));
    }
  } else {
    const games = [...PLAN.moves.map((m) => m.game).filter((g) => g && !g.startsWith('skill:')), ...PLAN.skills.map((s) => `skill:${s}`)];
    let slot = 0;
    for (const g of games) {
      const id = g.replace('skill:', 'skill-');
      if (!wanted(id) && !wanted(g)) continue;
      await stage();
      await page.clock.runFor(300);
      if (g === 'idle') await clip(id, 45);
      else if (g === 'walk')
        await clip(id, 48, async (i) => {
          if (i === 0) await key('KeyD');
          if (i === 22) {
            await unkey('KeyD');
            await key('KeyA');
          }
          if (i === 44) await unkey('KeyA');
        });
      else if (g === 'dash')
        await clip(id, 36, async (i) => {
          if (i === 0) await key('KeyD');
          if (i === 4) await key('Space');
          if (i === 6) await unkey('Space');
          if (i === 20) await unkey('KeyD');
        });
      else if (g === 'combo')
        await clip(id, 66, async (i) => {
          if (i === 0) await page.mouse.down({ button: 'right' });
          if (i === 52) await page.mouse.up({ button: 'right' });
        });
      else if (g === 'hurt')
        await clip(id, 30, async (i) => {
          if (i === 3) await page.evaluate(() => window.__echoes.content.hitPreview('heavy'));
        });
      else {
        const sk = g.slice(6);
        const k = slot++ % 4;
        await cmd('partySwap', 0, sk, k);
        await page.clock.runFor(200);
        const code = `Digit${k + 1}`;
        await clip(id, 42, async (i) => {
          if (i === 1) await key(code);
          if (i === 4) await unkey(code);
        });
      }
    }
  }
  // the hero's model numbers for the page (lab only)
  if (part === 'lab') {
    const stats = await page.evaluate((m) => {
      const M = window.__mr;
      let root = null;
      M.scene.traverse((o) => {
        if (!root && /^critter-/.test(o.name) && o.name.includes(m)) root = o;
      });
      if (!root) M.scene.traverse((o) => {
        if (!root && o.name && o.name.toLowerCase().includes(m)) root = o;
      });
      const s = { meshes: 0, instanced: 0, instances: 0, triangles: 0, materials: new Set() };
      (root || M.scene).traverse((o) => {
        if (!o.isMesh) return;
        s.meshes += 1;
        const g = o.geometry;
        const tri = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        if (o.isInstancedMesh) {
          s.instanced += 1;
          s.instances += o.count;
          s.triangles += tri * o.count;
        } else s.triangles += tri;
        for (const mt of [].concat(o.material)) s.materials.add(mt.uuid);
      });
      return { root: root ? root.name : '(whole lab scene)', meshes: s.meshes, instanced: s.instanced, instances: s.instances, triangles: Math.round(s.triangles), materials: s.materials.size };
    }, MODEL);
    writeFileSync(join(OUT, 'stats.json'), JSON.stringify(stats, null, 2));
    console.log('stats', stats);
  }
  await browser.close();
  writeFileSync(join(dir, 'errors.json'), JSON.stringify(errors, null, 2));
  console.log(errors.length ? `page errors:\n${errors.slice(0, 10).join('\n')}` : 'no page errors');
}

// ------------------------------------------------------------------- page --
function encode(srcDir, file) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(srcDir, 'f%03d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', file]);
}
async function page() {
  const dest = opt('dest', join(OUT, 'page'));
  mkdirSync(dest, { recursive: true });
  const have = (d, id) => existsSync(join(OUT, d, id, 'f000.png'));
  const vids = {};
  for (const d of ['lab-off', 'game-off', 'game-on']) {
    if (!existsSync(join(OUT, d))) continue;
    for (const id of readdirSync(join(OUT, d))) {
      if (!have(d, id)) continue;
      const f = `${d}-${id}.mp4`;
      encode(join(OUT, d, id), join(dest, f));
      vids[`${d}/${id}`] = f;
    }
  }
  const stats = existsSync(join(OUT, 'stats.json')) ? JSON.parse(readFileSync(join(OUT, 'stats.json'), 'utf8')) : null;
  const { SKILLS } = await import('../src/sim/skills.js');
  const { VERSION } = await import('../src/version.js');
  const POSE = { projectile: 'Lantern Point', direct: 'Lantern Point', nova: 'Bloom', aura: 'Bloom', ground_aoe: 'Staff Plant', melee_arc: 'Wide Sweep' };
  const round = Number(opt('round', 1));
  const logFile = join(OUT, 'rounds.json');
  const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : [`Round 1 (v${VERSION}): the model as it ships today, before any detail pass.`];
  const manifest = {
    model: MODEL,
    round,
    title: `${PLAN.name} model review`,
    lede: `Every move of the ${PLAN.name} as the game plays it today, recorded at 30 frames a second of game time. Round ${round} of the detail pass: notes here or in the thread go into the next round.`,
    meta: [
      ['Build', `v${VERSION}`],
      ...(stats ? [['Parts', `${stats.meshes} meshes (${stats.instanced} instanced, ${stats.instances} copies)`], ['Triangles', stats.triangles.toLocaleString('en')], ['Materials', String(stats.materials)]] : []),
      ['Clips', `${Object.keys(vids).length}`],
    ],
    checklist: CHECKLIST[PLAN.tier],
    moves: PLAN.moves,
    skills: PLAN.skills.map((id) => ({ id, name: SKILLS[id] ? SKILLS[id].name : id, pose: POSE[SKILLS[id] && SKILLS[id].shape] || '' })),
    vids,
    log,
  };
  writeFileSync(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const tpl = readFileSync(new URL('./model-review-page.html', import.meta.url), 'utf8');
  writeFileSync(join(dest, 'index.html'), tpl.replace('__TITLE__', manifest.title).replace('/*MANIFEST*/null', JSON.stringify(manifest)));
  console.log(`page: ${Object.keys(vids).length} clips -> ${dest}/index.html`);
}

// ------------------------------------------------------------------ stats --
// Parts, triangles and materials of every model in the lab, for the budget
// table: what a tab draws beyond the empty Effect kit tab.
const STAT_TIERS = {
  hero: ['healer', 'tank', 'swordsman', 'archer', 'tidecaller', 'bellwright', 'duskwing'],
  boss: ['wyrm', 'stag', 'thornmother', 'gloamwolf', 'heron', 'millwheel', 'mireking', 'lichram', 'ashraven', 'cantor', 'colossus', 'veinweaver'],
  champion: ['briar_knight', 'moss_hart', 'sluice_warden', 'lockkeeper', 'bone_reeve', 'gravebell_ringer', 'hollow_choir', 'vein_matron'],
  foe: ['boar', 'mantis', 'quillback', 'rotcap', 'wasp', 'thornling', 'owl', 'lasher', 'snail', 'crab', 'toad', 'moth', 'lamprey', 'leech', 'miller', 'ram', 'mole', 'crow', 'brood', 'broodling', 'gravewisp', 'knight', 'keener', 'sexton', 'husk', 'lancer', 'geode', 'censer', 'bloom', 'siphon'],
};
async function stats() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean) });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  await page.addInitScript(() => {
    window.__mr = { scenes: [] };
    const hook = new EventTarget();
    hook.addEventListener('observe', (e) => e.detail && e.detail.isScene && window.__mr.scenes.push(e.detail));
    window.__THREE_DEVTOOLS__ = hook;
  });
  await page.goto(`${URL0}?modellab=1&model=kit&turn=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.cmd && window.__echoes.tick > 10, null, { timeout: 300000, polling: 500 });
  const count = (base) => page.evaluate((b) => {
    const M = window.__mr;
    const sc = M.scenes.find((x) => x.children.some((c) => c.isDirectionalLight)) || M.scenes[0];
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const out = { ids: [], meshes: 0, instanced: 0, triangles: 0, mats: new Set() };
    sc.traverse((o) => {
      if (!o.isMesh || !shown(o)) return;
      out.ids.push(o.uuid);
      if (b && b.includes(o.uuid)) return;
      const g = o.geometry;
      const tri = (g.index ? g.index.count : g.attributes.position.count) / 3;
      out.meshes += 1;
      if (o.isInstancedMesh) { out.instanced += 1; out.triangles += tri * o.count; } else out.triangles += tri;
      for (const m of [].concat(o.material)) out.mats.add(m.uuid);
    });
    return { ids: out.ids, meshes: out.meshes, instanced: out.instanced, triangles: Math.round(out.triangles), materials: out.mats.size };
  }, base);
  await page.waitForTimeout(3000);
  const base = (await count(null)).ids;
  const rows = [];
  for (const [tier, ids] of Object.entries(STAT_TIERS))
    for (const id of ids) {
      const r = await page.evaluate((m) => window.__echoes.cmd('lab', { model: m, mode: 'still', t: 0, turntable: false }), id);
      if (!r || r.model !== id) { rows.push({ tier, id, missing: true }); continue; }
      await page.waitForTimeout(2500);
      const c = await count(base);
      delete c.ids;
      rows.push({ tier, id, ...c });
      console.log(tier, id, c.meshes, c.triangles);
    }
  await browser.close();
  mkdirSync(opt('out', 'captures/model-review'), { recursive: true });
  writeFileSync(join(opt('out', 'captures/model-review'), 'stats-all.json'), JSON.stringify(rows, null, 2));
}

if (STEP === 'stats') await stats();
else if (STEP === 'shots') await shots();
else if (STEP === 'page') await page();
else console.log('usage: node tools/model-review.mjs shots|page [...]');
