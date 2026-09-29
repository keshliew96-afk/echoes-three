// fix-M2-r5 — SAVE5-F2 companion: the slot detail in its OTHER states at 1024x576 and 1920x1080 — a camp save
// (starting kits, 0 nodes), a damaged slot (truncated file: the reason + Restore / Export / Delete), the in-game
// Save tab on an empty slot and on a four-build run slot. Every text / icon leaf inside its clip, no scroller.
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
const SIZES = (process.env.GFM25_SIZES || '1024x576,1920x1080').split(',');
export default async function (h) {
  await h.open(`${BASE}?menu=0&seed=21&fresh=1`);
  await h.ready(200);
  await h.sleep(800);
  const made = await h.ev(async () => {
    const E = window.__echoes;
    const camp = await E.save.save('manual-2', { name: 'At the hearth' });
    const dmg = await E.save.save('manual-3', { name: 'Soon damaged' });
    const key = Object.keys(localStorage).find((k) => /manual-3$/.test(k));
    if (key) localStorage.setItem(key, localStorage.getItem(key).slice(0, 400));
    const S = E.sim; S.freeze();
    const until = (p, n) => { for (let i = 0; i < n; i++) { if (p()) return i; S.stepN(1, null); } return -1; };
    E.cmd('startCampaign', { level: 1 });
    until(() => E.state().run.phase === 'combat' && E.state().enemies.length > 0, 900);
    until(() => { E.cmd('killAllEnemies'); return E.state().run.phase === 'reward'; }, 1500);
    S.stepN(5, null);
    E.cmd('partyStress');
    E.cmd('draftTake');
    S.stepN(20, null);
    S.thaw();
    await new Promise((r) => setTimeout(r, 600));
    const run = await E.save.save('manual-1', { name: 'Four builds' });
    return { camp: camp.ok, dmg: dmg.ok, key, run: run.ok };
  });
  h.log('made', made);
  // a page reload (storage kept) re-reads every slot file: the truncated one is listed as damaged
  await h.open(`${BASE}?menu=0&seed=21`);
  await h.ready(120);
  await h.sleep(800);
  h.log('listed', await h.ev(() => window.__echoes.save.list().map((m) => ({ id: m.id, status: m.status, error: m.error || null }))));
  const measure = () => h.ev(() => {
    const det = document.querySelector('.sv-detail');
    const clipOf = (el) => { let r = { top: -1e9, bottom: 1e9, left: -1e9, right: 1e9 }; let p = el.parentElement; while (p) { const cs = getComputedStyle(p); if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') { const b = p.getBoundingClientRect(); r = { top: Math.max(r.top, b.top), bottom: Math.min(r.bottom, b.bottom), left: Math.max(r.left, b.left), right: Math.min(r.right, b.right) }; } p = p.parentElement; } r.bottom = Math.min(r.bottom, innerHeight); r.right = Math.min(r.right, innerWidth); return r; };
    const leaves = [...det.querySelectorAll('*')].filter((e) => (e.children.length === 0 && (e.textContent || '').trim()) || e.tagName === 'svg' || e.tagName === 'IMG');
    const bad = [];
    for (const e of leaves) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const b = e.getBoundingClientRect(); const c = clipOf(e);
      if (b.width === 0 && b.height === 0) continue;
      const vis = b.top >= c.top - 0.5 && b.bottom <= c.bottom + 0.5 && b.left >= c.left - 0.5 && b.right <= c.right + 0.5;
      if (!vis) bad.push({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 40), top: Math.round(b.top), bottom: Math.round(b.bottom), clip: [Math.round(c.top), Math.round(c.bottom)] });
    }
    const scrollers = [det, ...det.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY)).map((e) => ({ cls: String(e.className), sh: e.scrollHeight, ch: e.clientHeight }));
    return { text: det.innerText.replace(/\s+/g, ' ').slice(0, 400), bad, scrollers };
  });
  const pick = async (id) => {
    await h.ev((id) => { const r = document.getElementById(`sv-slot-${id}`); if (r) r.scrollIntoView({ block: 'nearest' }); }, id);
    for (let i = 0; i < 20; i++) {
      const f = await h.ev(() => window.__echoes.app.focus().id);
      if (f === `sv-slot-${id}`) return true;
      await h.key(i < 10 ? 'ArrowDown' : 'ArrowUp'); await h.sleep(100);
    }
    return false;
  };
  for (const sz of SIZES) {
    const [w, hh] = sz.split('x').map(Number);
    await h.page.setViewport({ width: w, height: hh });
    await h.sleep(500);
    // in-game: open the saves screen on its Load tab, then the Save tab
    await h.ev(() => window.__echoes.app.open('saves', { mode: 'load' }));
    await h.sleep(600);
    for (const id of ['manual-2', 'manual-3', 'manual-1']) {
      const ok = await pick(id);
      await h.sleep(250);
      const m = await measure();
      await h.shot(`detailstates-${sz}-load-${id}`);
      h.log('state', { size: sz, tab: 'load', id, ok, bad: m.bad, scrollers: m.scrollers, text: m.text });
      h.check(ok && m.bad.length === 0 && m.scrollers.length === 0, `${sz} load ${id}: detail fits`, m);
    }
    await h.key('KeyQ'); await h.sleep(500); // Save tab
    for (const id of ['manual-4', 'manual-1']) {
      const ok = await pick(id);
      await h.sleep(250);
      const m = await measure();
      await h.shot(`detailstates-${sz}-save-${id}`);
      h.log('state', { size: sz, tab: 'save', id, ok, bad: m.bad, scrollers: m.scrollers, text: m.text });
      h.check(ok && m.bad.length === 0 && m.scrollers.length === 0, `${sz} save ${id}: detail fits`, m);
    }
    await h.key('Escape'); await h.sleep(500);
  }
}
