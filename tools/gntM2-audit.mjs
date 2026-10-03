// In-page layout audit for the M2 screens (saves, records, sv-rename) — the
// same bar M1's G1.1 applies: every [data-nav] item inside the viewport (or
// its scroll container, when reachable by scrolling), pairwise
// non-overlapping, hit targets >= 40 x 40 CSS px, every text-bearing element
// >= the type floor (14 px at <= 1024 x 576, 18 px at 1600 x 900 and up), no
// nowrap text clipped without an ellipsis.
// Usage: await h.ev(auditTop, { floor, minHit })
export function auditTop({ floor = 14, minHit = 40 } = {}) {
  const vw = innerWidth;
  const vh = innerHeight;
  const id = __echoes.app.stack().slice(-1)[0];
  const top = document.querySelector(`.ap-screen.ap-in[data-screen="${id}"]`);
  if (!top) return { screen: id, error: 'no top screen' };
  const shown = (n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden' && getComputedStyle(n).display !== 'none';
  const ringEl = top.querySelector('.ap-focus');
  if (ringEl) ringEl.classList.remove('ap-focus');
  const items = [...top.querySelectorAll('[data-nav]')].filter(shown);
  const issues = [];
  const rects = items.map((n) => {
    const r = n.getBoundingClientRect();
    return { n, id: n.id || n.textContent.trim().slice(0, 24), x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
  });
  for (const a of rects) {
    if (a.w < minHit - 0.5 || a.h < minHit - 0.5) issues.push({ kind: 'hit-target', id: a.id, w: Math.round(a.w), h: Math.round(a.h) });
    // Content spilling out of its own box (a squeezed row whose text runs
    // over the next one).
    if (a.n.scrollHeight > a.n.clientHeight + 2 && getComputedStyle(a.n).overflowY === 'visible') {
      issues.push({ kind: 'content-overflow', id: a.id, box: Math.round(a.n.clientHeight), content: a.n.scrollHeight });
    }
    let p = a.n.parentElement;
    while (p && p !== top) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden)/.test(cs.overflowY)) {
        const pr = p.getBoundingClientRect();
        const inside = a.x >= pr.left - 0.5 && a.r <= pr.right + 0.5 && a.y >= pr.top - 0.5 && a.b <= pr.bottom + 0.5;
        const scrollable = /(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1;
        if (!inside && !scrollable) issues.push({ kind: 'clipped', id: a.id, container: p.className });
        if (!inside && scrollable) a.needsScroll = true;
        a.vis = { x: Math.max(a.x, pr.left), y: Math.max(a.y, pr.top), r: Math.min(a.r, pr.right), b: Math.min(a.b, pr.bottom) };
        break;
      }
      p = p.parentElement;
    }
    const out = a.x < -0.5 || a.y < -0.5 || a.r > vw + 0.5 || a.b > vh + 0.5;
    if (out && !a.needsScroll) issues.push({ kind: 'outside-viewport', id: a.id, rect: [a.x, a.y, a.w, a.h].map(Math.round) });
  }
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].vis || rects[i];
      const b = rects[j].vis || rects[j];
      const ox = Math.min(a.r, b.r) - Math.max(a.x, b.x);
      const oy = Math.min(a.b, b.b) - Math.max(a.y, b.y);
      if (ox > 0.5 && oy > 0.5) issues.push({ kind: 'overlap', a: rects[i].id, b: rects[j].id, ox: Math.round(ox), oy: Math.round(oy) });
    }
  // Horizontal overflow of any box (a table wider than its panel hides columns).
  for (const el of top.querySelectorAll('*')) {
    if (!shown(el)) continue;
    const cs = getComputedStyle(el);
    if (/(auto|scroll|hidden)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && cs.textOverflow !== 'ellipsis') {
      issues.push({ kind: 'h-overflow', el: String(el.className || el.tagName).slice(0, 40), box: el.clientWidth, content: el.scrollWidth });
    }
  }
  let minFont = Infinity;
  let minFontEl = null;
  const walker = document.createTreeWalker(top, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let texts = 0;
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el) || !shown(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // Text scrolled out of view inside a scroll box is still type — count it.
    texts += 1;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < minFont) {
      minFont = fs;
      minFontEl = (el.className || el.tagName) + ': ' + t.textContent.trim().slice(0, 30);
    }
    if (fs < floor - 0.05) issues.push({ kind: 'type-floor', el: (el.className || el.tagName).toString().slice(0, 40), text: t.textContent.trim().slice(0, 30), px: Math.round(fs * 10) / 10 });
    const cs = getComputedStyle(el);
    if (cs.whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && cs.overflow !== 'visible') {
      issues.push({ kind: 'text-clipped', el: String(el.className).slice(0, 40), text: t.textContent.trim().slice(0, 30) });
    }
  }
  if (ringEl) ringEl.classList.add('ap-focus');
  return {
    screen: id,
    viewport: [vw, vh],
    items: rects.length,
    texts,
    minFont: Math.round(minFont * 10) / 10,
    minFontEl,
    ring: document.querySelectorAll('.ap-focus').length,
    focused: __echoes.app.focus ? __echoes.app.focus() : null,
    issues: issues.slice(0, 30),
    issueCount: issues.length,
  };
}
