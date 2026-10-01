// Save critic r5 — independent round trip at several moments.
// Legs per moment:  R = fresh page, build moment, 600-tick continuation, NEVER saved (the reference)
//                   S = fresh page, build, save (real storage), continuation (save side-effect check),
//                       load (player path save.load) -> digest equal -> continuation
//                   L = page reload WITHOUT fresh (storage kept), load the slot -> continuation
// Digest = my own SHA-256 over a canonical (sorted-key) JSON of save.capture(), plus the game's hash.
import { install, MOMENTS, POST } from './gntfixM26-lib.mjs';

const BASE = process.env.GFM26_BASE || 'http://127.0.0.1:4324/';
const SEED = Number(process.env.GFM26_SEED || 13);
const SCRIPT = Number(process.env.GFM26_SCRIPT || 5);

export default async function (h) {
  const names = (process.env.GFM26_MOMENTS || 'camp,combat,reward,shop,boss,card,l2mid,act1haz,act2haz,l3content,hswap,built4,pshop').split(',');
  const U_FRESH = `${BASE}?menu=0&seed=${SEED}&fresh=1&freeze=1`;
  const U_KEEP = `${BASE}?menu=0&seed=${SEED}&freeze=1`;
  const table = [];
  for (const m of names) {
    const slot = 'manual-6';
    const row = { moment: m };
    const src = MOMENTS[m].toString();
    const post = async (leg) => { if (!POST[m]) return null; const r = await h.ev(`(${POST[m].toString()})()`); row[leg + "_post"] = r; return r; };
    const build = async () => {
      await h.ev(install);
      return h.ev(`(${src})()`);
    };
    // ---- leg R
    await h.open(U_FRESH);
    await h.sleep(1500);
    row.R_build = await build();
    row.R_d0 = await h.ev(() => window.__gcs5.digest());
    row.R_sum = await h.ev(() => window.__gcs5.summary());
    await post('R');
    row.R_cont = await h.ev((sc) => window.__gcs5.cont(600, sc, 60), SCRIPT);
    // ---- leg S
    await h.open(U_FRESH);
    await h.sleep(1500);
    row.S_build = await build();
    row.S_d0 = await h.ev(() => window.__gcs5.digest());
    row.buildDeterministic = row.S_d0.my === row.R_d0.my && row.S_d0.game === row.R_d0.game;
    row.S_gameRT = await h.ev(async (sc) => { const r = await window.__echoes.save.roundTrip({ ticks: 600, scriptSeed: sc, every: 60 }); return { hashBefore: r.hashBefore, hashAfterApply: r.hashAfterApply, equal: r.equal, continuationEqual: r.continuationEqual, firstDivergence: r.firstDivergence, events: Array.isArray(r.events) ? r.events.length : r.events, ms: r.ms }; }, SCRIPT);
    row.S_d0b = await h.ev(() => window.__gcs5.digest());
    row.gameRTrestored = row.S_d0b.my === row.S_d0.my;
    const sv = await h.ev(async (slot) => {
      const t0 = performance.now();
      const r = await window.__echoes.save.save(slot, { name: 'gcs5 ' + slot });
      return { ok: r.ok, error: r.error, bytes: r.bytes, ms: r.ms, wallMs: Math.round(performance.now() - t0), hash: r.meta && r.meta.hash, schema: r.meta && r.meta.schema };
    }, slot);
    row.S_save = sv;
    row.S_meta = await h.ev((slot) => { const m = window.__echoes.save.list().find((x) => x.id === slot || x.slot === slot || (x.slot && x.slot.id === slot)); return m ? JSON.parse(JSON.stringify(m)) : null; }, slot);
    row.S_dAfterSave = await h.ev(() => window.__gcs5.digest());
    await post('Ssaved');
    row.S_contSaved = await h.ev((sc) => window.__gcs5.cont(600, sc, 60), SCRIPT);
    const ld = await h.ev(async (slot) => {
      const t0 = performance.now();
      const r = await window.__echoes.save.load(slot);
      return { ok: r.ok, error: r.error, wallMs: Math.round(performance.now() - t0), frozen: window.__echoes.sim.frozen, tick: window.__echoes.tick };
    }, slot);
    row.S_load = ld;
    row.S_d1 = await h.ev(() => window.__gcs5.digest());
    row.S_sum1 = await h.ev(() => window.__gcs5.summary());
    await post('Sloaded');
    row.S_contLoaded = await h.ev((sc) => window.__gcs5.cont(600, sc, 60), SCRIPT);
    // ---- leg L (reload, keep storage)
    await h.open(U_KEEP);
    await h.sleep(1500);
    await h.ev(install);
    const ld2 = await h.ev(async (slot) => {
      const t0 = performance.now();
      const r = await window.__echoes.save.load(slot);
      return { ok: r.ok, error: r.error, wallMs: Math.round(performance.now() - t0), frozen: window.__echoes.sim.frozen, tick: window.__echoes.tick };
    }, slot);
    row.L_load = ld2;
    row.L_d1 = await h.ev(() => window.__gcs5.digest());
    row.L_sum1 = await h.ev(() => window.__gcs5.summary());
    await post('L');
    row.L_cont = await h.ev((sc) => window.__gcs5.cont(600, sc, 60), SCRIPT);
    // ---- compare
    const eqRows = (a, b) => {
      for (let i = 0; i < a.rows.length; i++) {
        if (!b.rows[i] || a.rows[i].my !== b.rows[i].my || a.rows[i].game !== b.rows[i].game) return { equal: false, firstDivTick: a.rows[i].tick };
      }
      return { equal: a.evSha === b.evSha && a.evCount === b.evCount, events: [a.evCount, b.evCount], firstDivTick: null };
    };
    row.cmp = {
      buildDeterministic: row.buildDeterministic,
      S_saved_vs_S_loaded: eqRows(row.S_contSaved, row.S_contLoaded),
      S_loaded_vs_L_reload: eqRows(row.S_contLoaded, row.L_cont),
      ticks: { R: row.R_d0.tick, S: row.S_d0.tick },
      saveSideEffectFree: row.S_dAfterSave.my === row.S_d0.my,
      contAfterSave_vs_R: eqRows(row.R_cont, row.S_contSaved),
      inPage_hashEqual: row.S_d1.my === row.S_d0.my && row.S_d1.game === row.S_d0.game,
      inPage_cont_vs_R: eqRows(row.R_cont, row.S_contLoaded),
      reload_hashEqual: row.L_d1.my === row.S_d0.my && row.L_d1.game === row.S_d0.game,
      reload_cont_vs_R: eqRows(row.R_cont, row.L_cont),
      postEqual: !POST[m] || (JSON.stringify(row.R_post) === JSON.stringify(row.Ssaved_post) && JSON.stringify(row.R_post) === JSON.stringify(row.Sloaded_post) && JSON.stringify(row.R_post) === JSON.stringify(row.L_post)),
      summaryEqual_inPage: JSON.stringify(row.S_sum1) === JSON.stringify(row.R_sum),
      summaryEqual_reload: JSON.stringify({ ...row.L_sum1, profileHS: null }) === JSON.stringify({ ...row.R_sum, profileHS: null }),
    };
    if (!row.cmp.summaryEqual_reload) {
      const a = row.R_sum, b = row.L_sum1, diff = {};
      for (const k of Object.keys(a)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diff[k] = [a[k], b[k]];
      row.cmp.summaryDiffReload = diff;
    }
    h.log(`rt-${m}`, { moment: m, post: [row.R_post, row.L_post], gameRT: row.S_gameRT, gameRTrestored: row.gameRTrestored, meta: row.S_meta, build: row.R_build, d0: row.R_d0, save: sv, load: ld, reloadLoad: ld2, cmp: row.cmp, contR: { from: row.R_cont.fromTick, to: row.R_cont.toTick, ev: row.R_cont.evCount, types: row.R_cont.types, last: row.R_cont.rows[9] } });
    const c = row.cmp;
    h.check(sv.ok && ld.ok && ld2.ok, `${m}: save/load failed`, { sv, ld, ld2 });
    h.check(c.inPage_hashEqual && c.reload_hashEqual, `${m}: hash after load differs`, { d0: row.S_d0, d1: row.S_d1, L: row.L_d1 });
    h.check(c.inPage_cont_vs_R.equal && c.reload_cont_vs_R.equal && c.contAfterSave_vs_R.equal, `${m}: continuation diverged`, c);
    h.check(c.postEqual, `${m}: post-load decision differs`, [row.R_post, row.Ssaved_post, row.Sloaded_post, row.L_post]);
    h.check(c.buildDeterministic, `${m}: moment build not deterministic across pages (harness caveat)`, { R: row.R_d0, S: row.S_d0 });
    table.push({ moment: m, summary: row.R_sum, cmp: c });
  }
  h.log('table', table.map((t) => ({ m: t.moment, phase: t.summary.phase, room: t.summary.room, act: t.summary.act, tick: t.summary.tick, kinds: t.summary.kinds, proj: t.summary.projectiles, eshots: t.summary.eshots, zones: t.summary.zones, azones: t.summary.azones, wallet: t.summary.wallet, bench: t.summary.bench, sockets: t.summary.sockets, skills: t.summary.skills, rng: t.summary.rng, campaign: t.summary.campaign, pos: t.summary.party[0], cmp: t.cmp })));
}
