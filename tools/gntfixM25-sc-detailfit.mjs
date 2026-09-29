// fix-M2-r5 — SAVE5-F2 layout gate: the Load Game slot detail with a four-build save (partyStress + 4 Healer skills,
// as the critic built it) at many window sizes. For each size: every text / icon leaf of the detail panel inside its
// clip (nothing cut, nothing hidden), the four characters' build lines present, no scroller needed. At extra-small
// sizes (below the PLAN §16.4 sizes) the text box may scroll: keyboard (Right to the panel's buttons, then Down / Up),
// the right stick (the screen manager's scroll entry, as gamepad.js onScroll calls it) and the wheel must reach the
// last line. Sizes via GFM25_SIZES="1024x576,1600x900,..." and GFM25_SMALL="800x450".
const BASE = process.env.GFM25_BASE || 'http://127.0.0.1:5199/';
const SIZES = (process.env.GFM25_SIZES || '1024x576,1280x720,1366x768,1440x900,1600x900,1920x1080,1920x1200,2560x1080,2560x1440,1024x768').split(',');
const SMALL = (process.env.GFM25_SMALL || '800x450').split(',').filter(Boolean);
const NAME = process.env.GFM25_NAME || 'Four builds';
const PURSE = Number(process.env.GFM25_PURSE || 0); // e.g. 999: the widest Glint column
export default async function (h) {
  const foc = async () => h.ev(() => { const E = window.__echoes; let f = null; try { f = E.app.focus(); } catch (e) {} return { state: E.app.state, focus: f && f.id }; });
  const navTo = async (id, keys = ['ArrowDown', 'ArrowUp']) => {
    for (const k of keys) for (let i = 0; i < 16; i++) { if ((await foc()).focus === id) return true; await h.key(k); await h.sleep(110); }
    return (await foc()).focus === id;
  };
  await h.open(`${BASE}?menu=0&seed=13&fresh=1`);
  await h.ready(200);
  await h.sleep(600);
  const made = await h.ev(async (name, purse) => {
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
    if (purse) { E.cmd('wallet', purse); for (const i of [1, 2, 3]) E.cmd('partyPurse', i, purse); }
    S.thaw();
    await new Promise((r) => setTimeout(r, 800));
    const r = await E.save.save('manual-1', { name });
    return { ok: r.ok, builds: E.save.list().find((s) => s.id === 'manual-1').meta.builds };
  }, NAME, PURSE);
  h.log('made', made);
  await h.sleep(600);
  await h.open(`${BASE}`);
  await h.gesture();
  await h.sleep(1000);
  await navTo('ap-title-load');
  await h.key('Enter'); await h.sleep(900);
  await navTo('sv-slot-manual-1');
  await h.sleep(400);
  const measure = () => h.ev(() => {
    const det = document.querySelector('.sv-detail');
    const clipOf = (el) => { let r = { top: -1e9, bottom: 1e9, left: -1e9, right: 1e9 }; let p = el.parentElement; while (p) { const cs = getComputedStyle(p); if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') { const b = p.getBoundingClientRect(); r = { top: Math.max(r.top, b.top), bottom: Math.min(r.bottom, b.bottom), left: Math.max(r.left, b.left), right: Math.min(r.right, b.right) }; } p = p.parentElement; } r.bottom = Math.min(r.bottom, innerHeight); r.right = Math.min(r.right, innerWidth); return r; };
    const leaves = [...det.querySelectorAll('*')].filter((e) => (e.children.length === 0 && (e.textContent || '').trim()) || e.tagName === 'svg' || (e.classList && e.classList.contains('sv-sk')) || e.tagName === 'IMG');
    const bad = [];
    for (const e of leaves) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const b = e.getBoundingClientRect(); const c = clipOf(e);
      if (b.width === 0 && b.height === 0) continue;
      const vis = b.top >= c.top - 0.5 && b.bottom <= c.bottom + 0.5 && b.left >= c.left - 0.5 && b.right <= c.right + 0.5;
      // text cut short: an overflowing box that is not a deliberate ellipsis (the save's name)
      const over = e.tagName !== 'svg' && e.scrollWidth > e.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && cs.overflowX !== 'visible';
      if (!vis || over) {
        const cn = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className;
        bad.push({ tag: e.tagName, cls: String(cn || '').slice(0, 30), text: (e.textContent || '').trim().slice(0, 40), top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), clip: { top: Math.round(c.top), bottom: Math.round(c.bottom), left: Math.round(c.left), right: Math.round(c.right) }, over });
      }
    }
    const scrollers = [det, ...det.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY)).map((e) => ({ cls: String(e.className), sh: e.scrollHeight, ch: e.clientHeight, st: e.scrollTop }));
    const rows = [...det.querySelectorAll('.sv-party tbody tr')].map((tr) => ({ cls: tr.dataset.cls, text: tr.innerText.replace(/\s+/g, ' ').trim(), icons: tr.querySelectorAll('.sv-sk svg').length, title: tr.title }));
    const big = det.querySelector('.sv-big'); const bb = big && big.getBoundingClientRect();
    const minFont = Math.min(...[...det.querySelectorAll('dt,dd,th,td,button')].map((e) => parseFloat(getComputedStyle(e).fontSize)));
    const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ap-s')) || null;
    const name = det.querySelector('.sv-dname');
    return { win: [innerWidth, innerHeight], apS: s, minFontCss: minFont, thumb: bb && getComputedStyle(big).display !== 'none' ? { w: Math.round(bb.width), h: Math.round(bb.height) } : null, nameEllipsis: name ? name.scrollWidth > name.clientWidth : null, bad, scrollers, rows, allyShown: rows.filter((r) => r.cls !== 'healer' && r.icons === 4).length, more: !!det.querySelector('.sv-more-below') };
  });
  const table = [];
  for (const sz of SIZES) {
    const [w, hh] = sz.split('x').map(Number);
    await h.page.setViewport({ width: w, height: hh });
    await h.sleep(700);
    const m = await measure();
    table.push({ size: sz, ...m });
    await h.shot(`detailfit-${sz}`);
    h.log('size', { size: sz, apS: m.apS, minFontCss: m.minFontCss, thumb: m.thumb, nameEllipsis: m.nameEllipsis, bad: m.bad.length, badList: m.bad.slice(0, 6), scrollers: m.scrollers, allyShown: m.allyShown, more: m.more });
    h.check(m.bad.length === 0, `${sz}: clipped / hidden detail content`, m.bad.slice(0, 6));
    h.check(m.scrollers.length === 0, `${sz}: the detail needs scrolling`, m.scrollers);
    h.check(m.allyShown === 3 && m.rows.length === 4, `${sz}: four build lines with the ally skills`, m.rows);
  }
  for (const sz of SMALL) {
    const [w, hh] = sz.split('x').map(Number);
    await h.page.setViewport({ width: w, height: hh });
    await h.sleep(700);
    await navTo('sv-slot-manual-1');
    const m0 = await measure();
    await h.shot(`detailfit-small-${sz}`);
    const reach = {};
    if (m0.scrollers.some((s) => s.cls.includes('sv-dscroll'))) {
      await h.key('ArrowRight'); await h.sleep(200);
      reach.focusAfterRight = (await foc()).focus;
      reach.trace = [];
      for (let i = 0; i < 8; i++) { await h.key('ArrowDown'); await h.sleep(160); reach.trace.push(await h.ev(() => { const b = document.querySelector('.sv-dscroll'); return [window.__echoes.app.focus().id, Math.round(b.scrollTop), b.scrollHeight - b.clientHeight, window.__echoes.app.responses().slice(-1).map((r) => r.action + ':' + r.source).join()]; })); }
      reach.keys = await h.ev(() => { const b = document.querySelector('.sv-dscroll'); return { st: Math.round(b.scrollTop), max: b.scrollHeight - b.clientHeight, focus: window.__echoes.app.focus().id, more: b.classList.contains('sv-more-below') }; });
      await h.shot(`detailfit-small-${sz}-keys`);
      await h.ev(() => { const b = document.querySelector('.sv-dscroll'); b.scrollTop = b.scrollHeight; });
      await h.key('ArrowRight'); await h.sleep(200);
      if (!String((await foc()).focus).startsWith('sv-act-')) { await h.key('ArrowLeft'); await h.sleep(150); await h.key('ArrowRight'); await h.sleep(200); }
      reach.upFrom = (await foc()).focus;
      for (let i = 0; i < 3; i++) { await h.key('ArrowUp'); await h.sleep(160); }
      reach.keysUp = await h.ev(() => { const b = document.querySelector('.sv-dscroll'); return { st: Math.round(b.scrollTop), focus: window.__echoes.app.focus().id, more: b.classList.contains('sv-more-below') }; });
      await h.key('ArrowLeft'); await h.sleep(200);
      reach.focusAfterLeft = (await foc()).focus;
      // right stick: a mocked standard gamepad tilting axis 3 down for ~1.2 s (gamepad.js polls navigator.getGamepads)
      reach.stick = await h.ev(async () => {
        const b = document.querySelector('.sv-dscroll'); b.scrollTop = 0;
        const axes = [0, 0, 0, 0];
        const pad = { id: 'gntfixM25 pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
        const orig = navigator.getGamepads;
        navigator.getGamepads = () => [pad, null, null, null];
        window.dispatchEvent(new Event('gamepadconnected'));
        await new Promise((r) => setTimeout(r, 300));
        axes[3] = 1; pad.timestamp++;
        const t0 = performance.now();
        while (performance.now() - t0 < 1200) { pad.timestamp++; await new Promise((r) => requestAnimationFrame(r)); }
        axes[3] = 0; pad.timestamp++;
        await new Promise((r) => setTimeout(r, 200));
        navigator.getGamepads = orig;
        return { st: Math.round(b.scrollTop), max: b.scrollHeight - b.clientHeight, focus: window.__echoes.app.focus().id };
      });
      const bx = await h.ev(() => { const b = document.querySelector('.sv-dscroll'); b.scrollTop = 0; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await h.page.mouse.move(bx.x, bx.y); await h.sleep(150);
      for (let i = 0; i < 6; i++) { await h.page.mouse.wheel({ deltaY: 120 }); await h.sleep(120); }
      reach.wheel = await h.ev(() => { const b = document.querySelector('.sv-dscroll'); return { st: Math.round(b.scrollTop), max: b.scrollHeight - b.clientHeight }; });
      // Down on the panel's buttons pages the box while it can move, then moves on (spatial): the END must be reached
      // with the focus still on a panel button.
      reach.keysEnd = reach.trace.some((t) => t[0].startsWith('sv-act-') && t[1] >= t[2] - 1 && t[2] > 0);
      h.check(reach.keysEnd, `${sz}: keys reach the end of the detail`, reach);
      h.check(reach.keysUp.st === 0, `${sz}: keys scroll back to the top`, reach);
      h.check(reach.stick.st >= reach.stick.max - 1, `${sz}: right stick reaches the end`, reach);
      h.check(reach.wheel.st >= reach.wheel.max - 1, `${sz}: wheel reaches the end`, reach);
    }
    h.log('small', { size: sz, bad: m0.bad.length, badList: m0.bad.slice(0, 4), scrollers: m0.scrollers, more: m0.more, reach });
  }
  h.log('table', table.map((t) => ({ size: t.size, bad: t.bad.length, scrollers: t.scrollers.length, allyShown: t.allyShown, thumb: t.thumb, minFontCss: t.minFontCss })));
}
