// Save critic r5 — the slot DETAIL panel with a four-build save: which metadata lines are visible, which are clipped,
// and whether any ally build appears. Measured on the title Load Game screen at the window size given by --w/--h.
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
export default async function (h) {
  const foc = async () => h.ev(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, overlay: E.app.overlay, focus: f && f.id }; });
  const navTo = async (id, keys = ['ArrowDown', 'ArrowUp']) => {
    for (const k of keys) for (let i = 0; i < 16; i++) { if ((await foc()).focus === id) return true; await h.key(k); await h.sleep(110); }
    return (await foc()).focus === id;
  };
  await h.open(`${BASE}?menu=0&seed=13&fresh=1`);
  await h.ready(200);
  await h.sleep(600);
  await h.ev(async () => {
    const E = window.__echoes; const S = E.sim; S.freeze();
    const until = (p, n) => { for (let i = 0; i < n; i++) { if (p()) return i; S.stepN(1, null); } return -1; };
    E.cmd('startCampaign', { level: 1 });
    until(() => E.state().run.phase === 'combat' && E.state().enemies.length > 0, 900);
    E.cmd('giveSkill', 'sanctuary'); E.cmd('giveSkill', 'spirit_bolt');
    until(() => { E.cmd('killAllEnemies'); return E.state().run.phase === 'reward'; }, 1500);
    S.stepN(5, null);
    E.cmd('partyStress');
    E.cmd('draftTake');
    S.stepN(20, null);
    E.cmd('skipToRoom', 3);
    until(() => E.state().run.phase === 'combat' && E.state().enemies.length > 0, 900);
    S.thaw();
    await new Promise((r) => setTimeout(r, 800));
    return (await E.save.save('manual-1', { name: 'Four builds' })).ok;
  });
  await h.sleep(800);
  await h.open(`${BASE}`);
  await h.gesture();
  await h.sleep(1000);
  await navTo('ap-title-load');
  await h.key('Enter'); await h.sleep(900);
  await navTo('sv-slot-manual-1');
  await h.sleep(500);
  const m = await h.ev(() => {
    const scr = document.querySelector('.sv-screen');
    const all = [...scr.querySelectorAll('*')];
    const labels = ['Where', 'Saved', 'Played', 'Party', 'Skills', 'Run', 'File', 'Builds', 'Tank', 'Swordsman', 'Archer'];
    const out = {};
    // find the detail container = the smallest element containing both "Where" and the Delete button
    const del = document.getElementById('sv-act-delete');
    let det = del; while (det && !(det.innerText || '').includes('Where')) det = det.parentElement;
    const dr = det ? det.getBoundingClientRect() : null;
    // visible clip = intersection of every ancestor with overflow != visible
    const clipOf = (el) => { let r = { top: -1e9, bottom: 1e9, left: -1e9, right: 1e9 }; let p = el.parentElement; while (p) { const cs = getComputedStyle(p); if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') { const b = p.getBoundingClientRect(); r = { top: Math.max(r.top, b.top), bottom: Math.min(r.bottom, b.bottom), left: Math.max(r.left, b.left), right: Math.min(r.right, b.right) }; } p = p.parentElement; } r.bottom = Math.min(r.bottom, innerHeight); return r; };
    for (const L of labels) {
      const el = all.find((e) => e.children.length === 0 && (e.textContent || '').trim() === L && det && det.contains(e));
      if (!el) { out[L] = null; continue; }
      const b = el.getBoundingClientRect(); const c = clipOf(el);
      const valEl = el.nextElementSibling;
      out[L] = { top: Math.round(b.top), bottom: Math.round(b.bottom), clipBottom: Math.round(c.bottom), visible: b.bottom <= c.bottom + 0.5 && b.top >= c.top - 0.5 && b.height > 0, value: valEl ? valEl.innerText.replace(/\n+/g, ' ').slice(0, 160) : null };
    }
    const scrollers = [...det.querySelectorAll('*'), det].filter((e) => e.scrollHeight > e.clientHeight + 2 && getComputedStyle(e).overflowY !== 'visible').map((e) => ({ cls: e.className, sh: e.scrollHeight, ch: e.clientHeight, oy: getComputedStyle(e).overflowY }));
    const hasAllyBuild = /taunting|roar|iron stance|razor|kestrel|rain of arrows|32\s*\/\s*32/i.test(det.innerText);
    return { win: [innerWidth, innerHeight], detailRect: dr && { top: Math.round(dr.top), bottom: Math.round(dr.bottom), h: Math.round(dr.height) }, rows: out, scrollers, hasAllyBuild, text: det.innerText.replace(/\n+/g, ' | ').slice(0, 1200), rowText: document.getElementById('sv-slot-manual-1').innerText.replace(/\n+/g, ' | '), meta: window.__echoes.save.list().find((s) => s.id === 'manual-1').meta.builds };
  });
  await h.shot(`detail-${h.W}x${h.H}`);
  h.log('detail', m);
}
