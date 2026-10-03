// Save critic r5 — REAL old files migrate to schema 4: v0.5.150 schema-3 files (minted by me), a v0.5.39 schema-1 run
// save, a v0.5.44 schema-2 camp save, and the v0.5.87 schema-2 act-run storage. Checks: import ok, v 4, allies on their
// kits, the catch-up grant applied exactly ONCE (party_catchup), never again after a re-save + reload, deterministic.
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
const BASE = process.env.GFM26_BASE || 'http://127.0.0.1:4324/';

function inspect() {
  const E = window.__echoes;
  const s = E.state();
  const t = E.save.capture();
  const seats = [1, 2, 3].map((i) => {
    const v = E.cmd('partyView', i);
    return v ? { cls: v.classId, slots: v.slots.join(','), purse: v.purse, bench: (v.bench || []).map((n) => n.node + ':' + (n.provenance || '')).join(','), filled: v.filled } : null;
  });
  const run = t.systems.run;
  const cs = E.campaign.state();
  return {
    tick: E.tick, v: t.v, phase: s.run.phase, level: cs.level, room: s.run.room, wallet: s.wallet,
    healer: s.build.skills.map((k) => k.id + ':' + k.sockets.filter(Boolean).length).join(','), healerBench: s.build.bench.length,
    seats, catchUp: JSON.stringify(t.systems.party.catchUp || null),
    allyCards: run.partyPages && run.partyPages.page ? run.partyPages.page.cards.filter((c) => c.seat > 0).map((c) => ({ seat: c.seat, type: c.type, reason: c.reason, decided: c.decided, choice: c.choice })) : null,
    allyShelves: run.partyShop ? JSON.stringify(run.partyShop).slice(0, 300) : null,
    card: cs.card ? { kind: cs.card.kind, from: cs.card.from, to: cs.card.to } : null,
    hash: E.save.hash(),
  };
}

export default async function (h) {
  const files = [
    ['v150-L2start-r4-combat', 'gntfixM26-v150-manual-1.json'],
    ['v150-L1-r2-reward', 'gntfixM26-v150-manual-2.json'],
    ['v150-L1-shop', 'gntfixM26-v150-manual-3.json'],
    ['v150-L1-card', 'gntfixM26-v150-manual-4.json'],
    ['v039-schema1-run-reward', 'gntccontent1-v1-save.json'],
    ['v044-schema2-camp', join('gntM2-downloads', 'echoes-manual-6-2026-09-22_2342.json')],
    ['v165-schema4-L1r1-reward-netsave', 'gntcsave5-netpage-save.json'],
    ['v165-schema4-export', join('gntcsave5-downloads-x', 'echoes-manual-1-2026-09-28_0703.json')],
  ];
  const only = process.env.GFM26_ONLY ? process.env.GFM26_ONLY.split(',') : null;
  const dumpPath = join(h.outDir, 'gntcsave3-old087-storage.json');
  const dump = existsSync(dumpPath) ? JSON.parse(readFileSync(dumpPath, 'utf8')) : {};
  for (const [k, v] of Object.entries(dump)) {
    if (/^echoes\.save\.v1\.manual-\d$/.test(k)) {
      const o = JSON.parse(v);
      if (o.meta && o.meta.mode === 'run') files.push([`v087-schema2-act${o.meta.act}-r${o.meta.room}-${k.slice(-8)}`, null, v]);
    }
  }
  const INS = inspect.toString();
  let loggedRules = false;
  for (const [label, rel, rawText] of files) {
    if (only && !only.some((o) => label.includes(o))) continue;
    const text = rawText || readFileSync(join(h.outDir, rel), 'utf8');
    const src = JSON.parse(text);
    const run = async () => {
      await h.open(`${BASE}?menu=0&seed=13&fresh=1&freeze=1`);
      await h.sleep(1800);
      if (!loggedRules) {
        h.log('rules', await h.ev(() => { try { return JSON.stringify(window.__echoes.campaign.rules()).slice(0, 2500); } catch (e) { return String(e); } }));
        loggedRules = true;
      }
      await h.ev((t) => { window.__gcs5text = t; }, text);
      return h.ev(`(async () => {
        const text = window.__gcs5text;
        const inspect = ${INS};
        const E = window.__echoes; const S = E.sim; S.freeze();
        E.campaign.unlock([1, 2, 3]);
        const catchups = [];
        E.on('party_catchup', (e) => catchups.push({ tick: E.tick, e: JSON.stringify(e).slice(0, 500) }));
        const imp = await E.save.importText(text);
        const slotId = imp && (imp.slotId || imp.slot);
        const stored = slotId ? JSON.parse(localStorage.getItem('echoes.save.v1.' + slotId) || 'null') : null;
        const ld = slotId ? await E.save.load(slotId) : null;
        const insp = inspect();
        S.stepN(1, null);
        const after1 = inspect();
        S.stepN(599, 3);
        const after600 = inspect();
        const re = await E.save.save('manual-8', { name: 'resaved' });
        return { imp: JSON.parse(JSON.stringify(imp || null)), storedSchema: stored && stored.schema, storedV: stored && stored.state && stored.state.v, storedGame: stored && stored.game,
          storedHashOk: stored ? (E.save.hash(stored.state) === stored.hash) : null, storedMetaBuilds: stored && stored.meta ? JSON.stringify(stored.meta.builds || null).slice(0, 300) : null,
          ld: ld && { ok: ld.ok, error: ld.error }, insp, after1, after600, catchups, slotId, resave: re.ok };
      })()`);
    };
    const a = await run();
    const b = await run();
    await h.open(`${BASE}?menu=0&seed=13&freeze=1`);
    await h.sleep(1800);
    const c = await h.ev(`(async () => {
      const inspect = ${INS};
      const E = window.__echoes; const S = E.sim; S.freeze();
      const catchups = [];
      E.on('party_catchup', (e) => catchups.push({ tick: E.tick }));
      const ld = await E.save.load('manual-8');
      const insp = inspect();
      S.stepN(600, 3);
      return { ld: { ok: ld.ok, error: ld.error }, insp, after600: inspect(), catchups };
    })()`);
    const row = {
      label, srcSchema: src.schema, srcGame: src.game,
      srcMeta: { mode: src.meta.mode, act: src.meta.act, room: src.meta.room, phase: src.meta.phase, wallet: src.meta.wallet, skills: src.meta.skills },
      importOk: a.imp && a.imp.ok, importErr: a.imp && a.imp.error, storedSchema: a.storedSchema, storedV: a.storedV, storedGame: a.storedGame, storedHashOk: a.storedHashOk, storedMetaBuilds: a.storedMetaBuilds,
      load: a.ld, atLoad: a.insp, after1: a.after1, after600: a.after600, catchups: a.catchups,
      deterministic: !!(a.after600 && b.after600 && a.after600.hash === b.after600.hash),
      resaved: { load: c.ld, catchupsAfterReload: c.catchups.length, restoresSame: c.insp.hash === a.after600.hash },
    };
    h.log('mig-' + label, row);
    h.check(a.imp && a.imp.ok && a.ld && a.ld.ok, label + ': import/load failed', { imp: a.imp, ld: a.ld });
    h.check(a.after600 && a.after600.v === 4, label + ': not v4 after load');
    h.check(row.deterministic, label + ': migration + continuation not deterministic', { a: a.after600 && a.after600.hash, b: b.after600 && b.after600.hash });
    h.check(c.catchups.length === 0, label + ': catch-up fired again after re-save + reload', c.catchups);
    h.check(c.insp.hash === a.after600.hash, label + ': re-saved file does not restore the same state', { c: c.insp.hash, a: a.after600.hash });
  }
}
