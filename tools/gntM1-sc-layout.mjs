// G1.1 layout audit at the driver's window size: title, settings (every tab),
// confirm, keep-display, farewell. For each screen: every [data-nav] item
// (disabled ones too) fully inside the viewport AND inside its scroll
// container's visible box (or reachable by scrolling it), pairwise
// non-overlapping, hit targets >= 40x40 at 1024x576, every text-bearing
// element's font-size >= the floor (14 px at <=1024x576, 18 px at 1600x900
// and up), no text clipped (scrollWidth > clientWidth on a nowrap box).
export default async function (h) {
  const { ev, sleep, log, waitFor, key, shot, W, H } = h;
  await waitFor(() => __echoes.app.state === 'title' || document.querySelector('.ap-press.ap-on'), { timeout: 90000 });
  if (await ev(() => __echoes.app.state !== 'title')) await key('Enter');
  await waitFor(() => __echoes.app.state === 'title', { timeout: 10000 });
  await sleep(500);
  const floor = W <= 1024 ? 14 : 18;
  const minHit = W <= 1024 ? 40 : 40;

  const audit = (label) =>
    ev(
      ({ label, floor, minHit }) => {
        const vw = innerWidth;
        const vh = innerHeight;
        const top = document.querySelector(`.ap-screen.ap-in[data-screen="${__echoes.app.stack().slice(-1)[0]}"]`);
        if (!top) return { label, error: 'no top screen' };
        const shown = (n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
        const items = [...top.querySelectorAll('[data-nav]')].filter(shown);
        const R = (n) => {
          const r = n.getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
        };
        const issues = [];
        // Undo the focus transform for geometry (the ring's 3% scale is a
        // highlight, not layout): measure with the ring class removed.
        const ringEl = top.querySelector('.ap-focus');
        if (ringEl) ringEl.classList.remove('ap-focus');
        const rects = items.map((n) => ({ n, id: n.id || n.textContent.trim().slice(0, 24), ...R(n) }));
        for (const a of rects) {
          a.outside = a.x < -0.5 || a.y < -0.5 || a.r > vw + 0.5 || a.b > vh + 0.5;
          if (a.w < minHit || a.h < minHit) issues.push({ kind: 'hit-target', id: a.id, w: Math.round(a.w), h: Math.round(a.h) });
          // scroll container clip
          let p = a.n.parentElement;
          while (p && p !== top) {
            const cs = getComputedStyle(p);
            if (/(auto|scroll|hidden)/.test(cs.overflowY) || /(auto|scroll|hidden)/.test(cs.overflowX)) {
              const pr = p.getBoundingClientRect();
              const inside = a.x >= pr.left - 0.5 && a.r <= pr.right + 0.5 && a.y >= pr.top - 0.5 && a.b <= pr.bottom + 0.5;
              const scrollable = /(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1;
              if (!inside && !scrollable) issues.push({ kind: 'clipped-by-container', id: a.id, container: p.className });
              if (!inside && scrollable) a.needsScroll = true;
              // What the player can see of it: the part inside the scroll box.
              a.vis = { x: Math.max(a.x, pr.left), y: Math.max(a.y, pr.top), r: Math.min(a.r, pr.right), b: Math.min(a.b, pr.bottom) };
              break;
            }
            p = p.parentElement;
          }
        }
        for (const a of rects) if (a.outside && !a.needsScroll) issues.push({ kind: 'outside-viewport', id: a.id, rect: [a.x, a.y, a.w, a.h].map(Math.round) });
        for (let i = 0; i < rects.length; i++)
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i].vis || rects[i];
            const b = rects[j].vis || rects[j];
            a.id = rects[i].id;
            b.id = rects[j].id;
            const ox = Math.min(a.r, b.r) - Math.max(a.x, b.x);
            const oy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
            if (ox > 0.5 && oy > 0.5) issues.push({ kind: 'overlap', a: a.id, b: b.id, ox: Math.round(ox), oy: Math.round(oy) });
          }
        // Type floor: every element with its own visible text.
        let minFont = Infinity;
        let minFontEl = null;
        let textEls = 0;
        const walker = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        while (walker.nextNode()) {
          const t = walker.currentNode;
          if (!t.textContent.trim()) continue;
          const el = t.parentElement;
          if (!el || seen.has(el) || !shown(el)) continue;
          seen.add(el);
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) continue;
          textEls++;
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < minFont) {
            minFont = fs;
            minFontEl = `${el.className || el.tagName}: ${t.textContent.trim().slice(0, 30)}`;
          }
          if (fs < floor) issues.push({ kind: 'font-floor', text: t.textContent.trim().slice(0, 40), px: fs });
          const cs = getComputedStyle(el);
          if (cs.whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible') issues.push({ kind: 'text-clipped', text: t.textContent.trim().slice(0, 40) });
        }
        // Text overflowing its row horizontally (visible overflow past the item box)
        for (const a of rects) {
          if (a.n.scrollWidth > a.n.clientWidth + 2 && a.n.tagName === 'BUTTON') issues.push({ kind: 'button-overflow', id: a.id, sw: a.n.scrollWidth, cw: a.n.clientWidth });
        }
        if (ringEl) ringEl.classList.add('ap-focus');
        return {
          label,
          vw,
          vh,
          s: getComputedStyle(document.documentElement).getPropertyValue('--ap-s'),
          items: rects.length,
          needScroll: rects.filter((r) => r.needsScroll).map((r) => r.id),
          minFont: Math.round(minFont * 10) / 10,
          minFontEl,
          textEls,
          minHit: rects.length ? Math.round(Math.min(...rects.map((r) => Math.min(r.w, r.h)))) : null,
          rings: document.querySelectorAll('.ap-focus').length,
          issues,
        };
      },
      { label, floor, minHit }
    );

  const res = [];
  res.push(await audit('title'));
  await shot(`layout-${W}x${H}-title`);
  await ev(() => __echoes.app.open('settings'));
  await sleep(400);
  const tabs = await ev(() => [...document.querySelectorAll('.ap-tab')].map((b) => b.id));
  for (const id of tabs) {
    await ev((id) => document.getElementById(id).click(), id);
    await sleep(350);
    res.push(await audit(`settings:${id}`));
    await shot(`layout-${W}x${H}-${id}`);
  }
  await key('Escape');
  await sleep(300);
  await ev(() => {
    __echoes.app.confirm({ title: 'Exit Echoes?', body: 'Your settings are saved.', confirmLabel: 'Exit', danger: true });
    return true;
  });
  await sleep(300);
  res.push(await audit('confirm'));
  await shot(`layout-${W}x${H}-confirm`);
  await key('Escape');
  await sleep(250);
  await ev(() => {
    __echoes.app.keepDisplay({ changes: ['Resolution scale 75% — render resolution 1200 × 675', 'Fullscreen'] });
    return true;
  });
  await sleep(300);
  res.push(await audit('keep-display'));
  await shot(`layout-${W}x${H}-keep`);
  await key('Enter');
  await sleep(250);
  await ev(() => {
    __echoes.app.open('farewell');
    return true;
  });
  await sleep(300);
  res.push(await audit('farewell'));
  await shot(`layout-${W}x${H}-farewell`);
  await key('Enter');
  await sleep(300);
  for (const r of res) log(r.label, r);
  log('summary', { W, H, floor, screens: res.length, issues: res.reduce((n, r) => n + (r.issues ? r.issues.length : 1), 0), minFont: Math.min(...res.map((r) => r.minFont)), minHit: Math.min(...res.filter((r) => r.minHit !== null).map((r) => r.minHit)) });
}
