#!/usr/bin/env node
// gntfixM4a3 — gate G4a.5 probe (docs/gauntlet/PLAN.md §4.2 / §12.10, BUILD_BRIEF §23.2).
// Fix builder M4a, gauntlet round 3 (CONTENT-R3-F2). Owned by fix-M4a-r3; read-only for others.
//
// Compares the LIVE game's difficulty curve and starter grant with the BINDING
// table: the latest dated tuning note in docs/BUILD_BRIEF.md §23.2 (PLAN §4.2:
// "the BINDING constants are the latest dated note in BUILD_BRIEF §23.2").
//
//   node tools/gntfixM4a3-g4a5.mjs [--url http://127.0.0.1:5199/] [--seed 3] [--out captures/gntfixM4a3-g4a5.json]
//        [--brief docs/BUILD_BRIEF.md] [--plan docs/gauntlet/PLAN.md]   (e.g. a git-show copy for a BEFORE run)
//
// Doc side (Node): §23.2 is cut out of BUILD_BRIEF, every "**Tuning note (KEY, DATE)"
// is listed, the latest one (max date, then last in the document) is parsed:
//   - its per-room table   | room | <L1> | <L2> | <L3> |   cells "hpMul / dmgMul / kill_all budget"
//   - its per-level table  | per level | Level 1 | Level 2 | Level 3 |   (Stag HP, damage, adds, elite, Waystone)
//   - its starter-grant table | start at | skills | nodes | legendaries | Glint |
// plus the pointer check: PLAN §12.10 / BUILD_BRIEF §24 name a "CAMPAIGN note" in §23.2.
//
// Live side (browser, ?menu=0&seed=S): content.difficultyTable('standard'),
// cmd('campaignRules').grants, then per level 1..3 a real campaign start
// (cmd startCampaign {level}) -> the starter_grant event, rooms 1..6 by
// cmd skipToRoom -> roomPlan (hpMul/dmgMul/budget/eliteChance) + the MEASURED
// hp of every enemy_spawn / (base hp x elite 1.8), room 8 -> Stag maxHp and
// its add phase (bossHp 0.74) -> measured add hp ratio. Every comparison is ±1 %.
import { readFileSync, writeFileSync } from 'node:fs';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SEED = Number(opt('seed', '3'));
const OUT = opt('out', 'captures/gntfixM4a3-g4a5.json');
const TOL = 0.01;

// ------------------------------------------------------------ doc side --
function section(md, startRe, endRe) {
  const s = md.search(startRe);
  if (s < 0) return '';
  const rest = md.slice(s);
  const e = rest.slice(1).search(endRe);
  return e < 0 ? rest : rest.slice(0, e + 1);
}
function tableAfter(text, headRe) {
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => headRe.test(l));
  if (i < 0) return null;
  const header = lines[i].split('|').slice(1, -1).map((c) => c.trim());
  const rows = [];
  for (let j = i + 2; j < lines.length && lines[j].trim().startsWith('|'); j++) {
    rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()));
  }
  return { header, rows };
}
const num = (s) => {
  const m = String(s).replace(/\*/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const nums = (s) => (String(s).replace(/\*/g, '').match(/-?\d+(\.\d+)?/g) || []).map(Number);

function parseDoc() {
  const brief = readFileSync(opt('brief', 'docs/BUILD_BRIEF.md'), 'utf8');
  const plan = readFileSync(opt('plan', 'docs/gauntlet/PLAN.md'), 'utf8');
  const s232 = section(brief, /^### 23\.2 /m, /^### /m);
  const s24 = section(brief, /^## 24\. /m, /^## /m);
  const p1210 = section(plan, /^### 12\.10 /m, /^### /m);
  const p42 = section(plan, /^### 4\.2 /m, /^### /m);
  const noteRe = /\*\*Tuning note \(([^,]+), (\d{4}-\d{2}-\d{2})\)/g;
  const notes = [];
  let m;
  while ((m = noteRe.exec(s232))) notes.push({ key: m[1].trim(), date: m[2], at: m.index });
  const latest = notes.slice().sort((a, b) => (a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1)).pop() || null;
  const out = {
    notes: notes.map((n) => `${n.key} ${n.date}`),
    latest: latest ? `${latest.key} ${latest.date}` : null,
    campaignHitsIn232: (s232.match(/CAMPAIGN/g) || []).length,
    campaignNoteIn232: notes.some((n) => /CAMPAIGN/.test(n.key)),
    pointers: {
      plan1210NamesCampaignNote: /CAMPAIGN note|dated CAMPAIGN/.test(p1210),
      brief24NamesCampaignNote: /§23\.2 CAMPAIGN note|CAMPAIGN note/.test(s24),
      plan42PointsToCampaignNote: /latest dated note in BUILD_BRIEF §23\.2 — since [\d-]+ the CAMPAIGN note/.test(p42.replace(/\s+/g, ' ')),
    },
    rooms: null,
    perLevel: null,
    grants: null,
  };
  if (!latest) return out;
  const next = notes.filter((n) => n.at > latest.at).sort((a, b) => a.at - b.at)[0];
  const body = s232.slice(latest.at, next ? next.at : undefined);
  const rt = tableAfter(body, /^\|\s*room\s*\|/);
  if (rt) {
    const levels = rt.header.slice(1);
    out.rooms = { header: levels, byRoom: {} };
    for (const r of rt.rows) {
      const room = num(r[0]);
      if (!room) continue;
      out.rooms.byRoom[room] = r.slice(1).map((c) => {
        const [hp, dmg, budget] = nums(c);
        return { hp, dmg, budget };
      });
    }
  }
  const pl = tableAfter(body, /^\|\s*per level\s*\|/);
  if (pl) {
    out.perLevel = {};
    for (const r of pl.rows) out.perLevel[r[0].replace(/\*/g, '').trim()] = r.slice(1).map((c) => nums(c));
  }
  const gt = tableAfter(body, /^\|\s*start at\s*\|/);
  if (gt) {
    out.grants = {};
    for (const r of gt.rows) {
      const lv = num(r[0]);
      const arr = String(r[5] || '').match(/(\d+)\s*\/\s*32 sockets/);
      if (lv) out.grants[lv] = { skills: num(r[1]), nodes: num(r[2]), legendaries: num(r[3]), glint: num(r[4]), arrivesSockets: arr ? Number(arr[1]) : null };
    }
  }
  return out;
}

// ----------------------------------------------------------- live side --
async function live(page) {
  return page.evaluate(async () => {
    const E = window.__echoes;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const waitTicks = async (n) => {
      const t0 = E.tick;
      const w0 = performance.now();
      while (E.tick < t0 + n && performance.now() - w0 < 20000) await sleep(30);
    };
    const o = { version: E.version, seed: E.seed };
    o.table = E.content.difficultyTable('standard').map((d) => ({
      level: d.act, room: d.room, hpMul: d.hpMul, dmgMul: d.dmgMul, budget: d.budget, defendBudget: d.defendBudget,
      eliteChance: d.eliteChance, bossHp: d.bossHp, bossDmgMul: d.bossDmgMul, addHpMul: d.addHpMul, addDmgMul: d.addDmgMul,
      waystoneHp: d.waystoneHp, waveIntervalTicks: d.waveIntervalTicks,
    }));
    o.rulesGrants = E.cmd('campaignRules').grants;
    const spawns = [];
    const grants = [];
    const offs = [];
    offs.push(E.on('enemy_spawn', (e) => spawns.push({ tick: e.tick, etype: e.etype, hp: e.hp ?? null, elite: !!e.elite, wave: e.wave })));
    offs.push(E.on('starter_grant', (e) => grants.push({ level: e.level, skills: (e.skills || []).length, nodes: (e.nodes || []).length, glint: e.glint })));
    // Base (unscaled) hp per archetype, measured: spawn one of each, read hp, clear.
    E.cmd('startCampaign', { level: 1 });
    // The level manager gates spawns while the level loads: wait for the
    // first wave's spawn before spawning the unscaled references.
    { const w0 = performance.now(); while (!spawns.length && performance.now() - w0 < 15000) await sleep(60); }
    await waitTicks(20);
    const kinds = ['boar', 'mantis', 'quillback', 'toad', 'moth', 'ram', 'mole'];
    o.baseHp = {};
    for (const k of kinds) {
      let hp = null;
      for (let t = 0; t < 5 && hp == null; t++) {
        const id = E.cmd('spawn', k, 2, 2);
        await waitTicks(3);
        const en = id == null ? null : (E.state().enemies || []).find((x) => x.id === id);
        hp = en ? en.hp : null;
        E.cmd('killAllEnemies');
        await waitTicks(3);
      }
      o.baseHp[k] = hp;
    }
    o.levels = [];
    for (const L of [1, 2, 3]) {
      const lv = { level: L, rooms: [], boss: null };
      const start = E.cmd('startCampaign', { level: L });
      lv.start = start && typeof start === 'object' ? { ok: start.ok ?? true, error: start.error ?? null } : start;
      await waitTicks(10);
      const cs = E.cmd('campaignState');
      lv.campaign = cs ? { level: cs.level, phase: cs.phase ?? null, grant: cs.grant ?? null, card: cs.card ? cs.card.kind ?? true : null } : null;
      // A setting-out card (Level N > 1) holds room 1: advance it (Enter is
      // honoured after TRANSIT.minSkipTicks) and wait for the live room.
      { const w0 = performance.now();
        while (performance.now() - w0 < 15000) {
          const p = E.cmd('roomPlan');
          if (p && p.room === 1 && p.act === L) break;
          const c2 = E.cmd('campaignState');
          if (c2 && c2.card) E.cmd('campaignAdvance', 'skip');
          await sleep(100);
        } }
      // The build the level starts with (skills + filled sockets, HUD view).
      try {
        const sl = (E.hud && E.hud.slots ? E.hud.slots() : []).filter((x) => x && !x.empty && x.sockets);
        lv.build = { skills: sl.length, sockets: sl.reduce((n, x) => n + ((x.sockets && x.sockets.filled) || 0), 0), wallet: (E.cmd('runState') || {}).wallet ?? null };
      } catch (err) { lv.build = { error: String(err) }; }
      for (let r = 1; r <= 6; r++) {
        if (r > 1) E.cmd('skipToRoom', r);
        await waitTicks(4);
        const plan = E.cmd('roomPlan');
        const s0 = spawns.length;
        // let the first wave spawn (spawn telegraph ~48 ticks)
        const w0 = performance.now();
        while (spawns.length - s0 < 3 && performance.now() - w0 < 8000) await sleep(60);
        await waitTicks(30);
        const got = spawns.slice(s0).filter((s) => s.wave < 100);
        lv.rooms.push({
          room: r,
          act: plan && plan.act,
          mode: plan && plan.mode,
          hpMul: plan && plan.hpMul,
          dmgMul: plan && plan.dmgMul,
          budget: plan && plan.budget,
          eliteChance: plan && plan.eliteChance,
          spawns: got.map((s) => ({ etype: s.etype, hp: s.hp, elite: s.elite, ratio: s.hp == null ? 1 : s.hp / ((o.baseHp[s.etype] || NaN) * (s.elite ? 1.8 : 1)) })),
        });
      }
      E.cmd('skipToRoom', 8);
      await waitTicks(30);
      const plan8 = E.cmd('roomPlan');
      const rs = E.cmd('runState');
      const bv = rs && rs.boss;
      const s0 = spawns.length;
      E.cmd('bossHp', 0.74);
      const w0 = performance.now();
      while (spawns.slice(s0).filter((s) => s.wave >= 100).length < 2 && performance.now() - w0 < 10000) await sleep(60);
      await waitTicks(20);
      const adds = spawns.slice(s0).filter((s) => s.wave >= 100);
      lv.boss = {
        mode: plan8 && plan8.mode,
        planBossHp: plan8 && plan8.bossHp,
        planBossDmgMul: plan8 && plan8.bossDmgMul,
        planAddHpMul: plan8 && plan8.addHpMul,
        planAddDmgMul: plan8 && plan8.addDmgMul,
        liveMaxHp: bv ? bv.maxHp : null,
        adds: adds.map((s) => ({ etype: s.etype, hp: s.hp, elite: s.elite, ratio: s.hp == null ? 1 : s.hp / ((o.baseHp[s.etype] || NaN) * (s.elite ? 1.8 : 1)) })),
      };
      o.levels.push(lv);
    }
    o.grantEvents = grants;
    E.cmd('returnToCamp');
    for (const f of offs) if (typeof f === 'function') f();
    return o;
  });
}

// ---------------------------------------------------------- comparison --
const close = (a, b) => a != null && b != null && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= TOL * Math.max(Math.abs(b), 1e-9);

function compare(doc, L) {
  const mism = [];
  const checks = { n: 0, ok: 0 };
  const chk = (what, liveV, docV) => {
    checks.n++;
    if (close(liveV, docV)) checks.ok++;
    else mism.push({ what, live: liveV, doc: docV, pct: liveV != null && docV ? Math.round(((liveV - docV) / docV) * 1000) / 10 : null });
  };
  if (!doc.rooms) {
    mism.push({ what: 'doc per-room table', live: 'present', doc: 'missing' });
    return { checks, mism };
  }
  for (let lvl = 1; lvl <= 3; lvl++) {
    for (let r = 1; r <= 6; r++) {
      const d = doc.rooms.byRoom[r] && doc.rooms.byRoom[r][lvl - 1];
      const t = L.table.find((x) => x.level === lvl && x.room === r);
      const lr = L.levels[lvl - 1].rooms[r - 1];
      if (!d) { mism.push({ what: `L${lvl} r${r} doc cell`, doc: 'missing' }); continue; }
      chk(`L${lvl} r${r} hpMul (table)`, t.hpMul, d.hp);
      chk(`L${lvl} r${r} dmgMul (table)`, t.dmgMul, d.dmg);
      chk(`L${lvl} r${r} budget (table)`, t.budget, d.budget);
      chk(`L${lvl} r${r} hpMul (roomPlan, live room)`, lr.hpMul, d.hp);
      chk(`L${lvl} r${r} dmgMul (roomPlan, live room)`, lr.dmgMul, d.dmg);
      const defendScale = doc.defendScale ?? 1.25;
      chk(`L${lvl} r${r} budget (roomPlan ${lr.mode})`, lr.budget, lr.mode === 'defend' ? d.budget * defendScale : d.budget);
      const ratios = lr.spawns.map((s) => s.ratio).filter(Number.isFinite);
      if (ratios.length) {
        const bad = ratios.filter((x) => !close(x, d.hp));
        chk(`L${lvl} r${r} MEASURED spawn hp/base (${ratios.length} spawns, ${bad.length} off)`, bad.length ? bad[0] : ratios[0], d.hp);
      } else mism.push({ what: `L${lvl} r${r} measured spawns`, live: 'none seen' });
      if (doc.perLevel && doc.perLevel['elite chance']) chk(`L${lvl} r${r} eliteChance`, lr.eliteChance, doc.perLevel['elite chance'][lvl - 1][r - 1]);
    }
    const pl = doc.perLevel;
    const b = L.levels[lvl - 1].boss;
    if (pl) {
      const row = (k) => (pl[k] ? pl[k][lvl - 1][0] : null);
      chk(`L${lvl} tier T`, L.table.find((x) => x.level === lvl && x.room === 1).hpMul, row('tier T'));
      chk(`L${lvl} Stag HP (plan)`, b.planBossHp, row('Stag HP'));
      chk(`L${lvl} Stag HP (MEASURED live boss)`, b.liveMaxHp, row('Stag HP'));
      chk(`L${lvl} Stag damage x`, b.planBossDmgMul, row('Stag damage ×'));
      chk(`L${lvl} adds HP x (plan)`, b.planAddHpMul, row('adds HP ×'));
      const ar = b.adds.map((s) => s.ratio).filter(Number.isFinite);
      if (ar.length) chk(`L${lvl} adds HP x (MEASURED ${ar.length} adds)`, ar.find((x) => !close(x, row('adds HP ×'))) ?? ar[0], row('adds HP ×'));
      chk(`L${lvl} adds damage x`, b.planAddDmgMul, row('adds damage ×'));
      chk(`L${lvl} Waystone HP`, L.table.find((x) => x.level === lvl && x.room === 1).waystoneHp, row('Waystone HP'));
      const wi = pl['kill_all wave interval, ticks (room 1 → 6)'];
      if (wi) {
        chk(`L${lvl} wave interval room 1`, L.table.find((x) => x.level === lvl && x.room === 1).waveIntervalTicks, wi[lvl - 1][0]);
        chk(`L${lvl} wave interval room 6`, L.table.find((x) => x.level === lvl && x.room === 6).waveIntervalTicks, wi[lvl - 1][1]);
      }
    } else mism.push({ what: `L${lvl} doc per-level table (Stag HP / damage / adds / elite / Waystone)`, doc: 'missing' });
  }
  if (doc.grants) {
    for (const lv of Object.keys(L.rulesGrants)) {
      const g = L.rulesGrants[lv];
      const d = doc.grants[lv];
      if (!d) { mism.push({ what: `grant L${lv}`, doc: 'missing' }); continue; }
      for (const k of ['skills', 'nodes', 'legendaries', 'glint']) chk(`grant L${lv} ${k} (campaignRules)`, g[k], d[k]);
      const ev = L.grantEvents.find((e) => String(e.level) === String(lv));
      if (ev) {
        chk(`grant L${lv} skills drawn (MEASURED starter_grant)`, ev.skills, d.skills);
        chk(`grant L${lv} nodes drawn incl. legendaries (MEASURED)`, ev.nodes, d.nodes + d.legendaries);
        chk(`grant L${lv} Glint (MEASURED)`, ev.glint, d.glint);
        const b = L.levels.find((x) => String(x.level) === String(lv));
        if (d.arrivesSockets != null && b && b.build) chk(`grant L${lv} arrives with sockets filled (MEASURED HUD)`, b.build.sockets, d.arrivesSockets);
      } else mism.push({ what: `grant L${lv} starter_grant event`, live: 'none seen' });
    }
  } else mism.push({ what: 'doc starter-grant table', live: JSON.stringify(L.rulesGrants), doc: 'missing' });
  return { checks, mism };
}

const doc = parseDoc();
const browser = await launchEchoes({ gpu: true });
let result;
try {
  let L = null;
  let errors = [];
  for (let attempt = 1; attempt <= 3 && !L; attempt++) {
    try {
      const o = await openEchoes(browser, `${URL0}?menu=0&seed=${SEED}`);
      errors = o.errors;
      await waitReady(o.page, { minTick: 60 });
      L = await live(o.page);
    } catch (e) {
      console.error(`attempt ${attempt}: ${e.message}`);
    }
  }
  const cmp = L ? compare(doc, L) : { checks: { n: 0, ok: 0 }, mism: [{ what: 'live probe failed' }] };
  result = {
    when: new Date().toISOString(),
    url: URL0,
    seed: SEED,
    version: L && L.version,
    pageErrors: errors,
    doc,
    live: L,
    checks: cmp.checks,
    mismatches: cmp.mism,
    verdict: cmp.mism.length === 0 && doc.campaignNoteIn232 && Object.values(doc.pointers).every(Boolean) && errors.length === 0 ? 'PASS' : 'FAIL',
  };
} finally {
  await browser.close();
}
writeFileSync(OUT, JSON.stringify(result, null, 1));
const s = result;
console.log(JSON.stringify({
  version: s.version, verdict: s.verdict, latestNote: s.doc.latest, notes: s.doc.notes,
  campaignHitsIn232: s.doc.campaignHitsIn232, campaignNoteIn232: s.doc.campaignNoteIn232, pointers: s.doc.pointers,
  checks: s.checks, mismatches: s.mismatches.length, pageErrors: s.pageErrors.length,
}, null, 1));
for (const m of s.mismatches.slice(0, 40)) console.log('  MISMATCH', JSON.stringify(m));
