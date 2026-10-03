// Settings screen (docs/gauntlet/PLAN.md §1.3 'settings', §3.2 tab registry,
// §5 apply/revert). Owner: M1.
//
// Chrome: SETTINGS title + a tab bar built from settingsTabs() (Display 10,
// Audio 20, Gameplay 30, Controls 40, Network 50 — each key registers its own),
// the active tab's rows on the left, an info panel on the right that explains
// the focused row (the tab's `help` text + its live numbers), and a footer with
// the control hints, "Reset to defaults" (behind app.confirm) and Back.
// Every change applies live (the game behind keeps rendering it). A tab with
// hasPendingChanges() — Display after a resolution-scale change or entering
// fullscreen — is settled through the 10 s keep-display dialog when the player
// leaves it (tab switch or closing Settings); Revert / timeout call its
// revert(), Keep its confirm().
// Navigation: ←→ adjust, Q/E · PageUp/PageDown · LB/RB switch tabs,
// Esc / B / right-click = Back. ↑↓ (and Tab / Shift+Tab, the D-pad) walk ONE
// ring in reading order — the SELECTED tab -> the tab's rows (spatial inside
// the tab, so a row with two controls still works) -> Reset -> Back -> the
// selected tab again — and Up is exactly the reverse. The cursor never lands
// on an unselected tab (whose content is not the one shown), and every stop
// comes round again (fix-M1-r3 MENU-R3-F2: the screen-wide spatial wrap sent
// Down from Reset to the Network tab and skipped the first rows forever).
// Overflow (fix-M1-r5 MENU-R5-F2): content taller than the tab's box is
// never out of reach of a keyboard or pad player. The box fades with a
// chevron at the cut edge; the ring entering a tab brings that end of the
// content into view and leaving it shows the end it passed; a READ-ONLY tab
// (no focusable rows — Controls) becomes one focus stop whose ↑/↓ scroll a
// step at a time before the ring moves on; the right stick scrolls the box
// from anywhere on the screen (screen.onScroll), the wheel as always.
import { settingsTabs, settingsTab, service } from '../../app/registry.js';
import { createHints } from './hints.js';

const LIVE_MS = 250;

export function createSettingsScreen(ctx) {
  const { app, manager, settings, widgets } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-settings';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Settings');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ap-panel ap-plate">
      <div class="ap-set-head">
        <h2 class="ap-h2">Settings</h2>
        <div class="ap-tabs" role="tablist"></div>
      </div>
      <div class="ap-set-body">
        <div class="ap-tabwrap"></div>
        <aside class="ap-info" aria-live="polite">
          <div class="ap-info-title"></div>
          <div class="ap-info-body"></div>
          <div class="ap-info-live"></div>
        </aside>
      </div>
      <div class="ap-set-foot">
        <span class="ap-foot-note"></span>
      </div>
    </div>`;
  const tabsEl = el.querySelector('.ap-tabs');
  const wrap = el.querySelector('.ap-tabwrap');
  const infoTitle = el.querySelector('.ap-info-title');
  const infoBody = el.querySelector('.ap-info-body');
  const infoLive = el.querySelector('.ap-info-live');
  const foot = el.querySelector('.ap-set-foot');
  const footNote = el.querySelector('.ap-foot-note');
  const HINTS = [
    ['move', 'Select'],
    ['adjust', 'Change'],
    ['tabs', 'Tabs'],
    ['back', 'Back'],
  ];
  const hints = createHints(app, HINTS);
  foot.insertBefore(hints.el, footNote);
  // With the caret in a text field (Settings ▸ Network) the footer tells the
  // truth: Q / E and ← / → edit the text there, Enter saves, and Esc cancels
  // an uncommitted edit before it ever backs out (MENU-R4-F1).
  function syncHints() {
    const n = focusedEl && el.contains(focusedEl) ? focusedEl : null;
    if (n && n.dataset && n.dataset.navScroll === '1') {
      return hints.setItems([
        ['move', 'Scroll'],
        ['tabs', 'Tabs'],
        ['back', 'Back'],
      ]);
    }
    const text = !!n && n.tagName === 'INPUT' && (n.type || 'text') === 'text' && document.activeElement === n;
    if (!text) return hints.setItems(HINTS);
    const dirty = typeof n.__navDirty === 'function' && n.__navDirty();
    hints.setItems([
      ['move', 'Select'],
      ['confirm', 'Save'],
      ['back', dirty ? 'Cancel edit' : 'Back'],
    ]);
  }
  el.addEventListener('input', syncHints);
  el.addEventListener('keyup', syncHints);
  el.addEventListener('focusin', syncHints);
  el.addEventListener('focusout', () => setTimeout(syncHints, 0));
  const resetBtn = widgets.button({
    label: 'Reset to defaults',
    id: 'ap-settings-reset',
    help: 'Puts every setting on this tab back to its default. Asks first.',
    onPress: () => resetTab(),
  });
  const backBtn = widgets.button({
    label: 'Back',
    id: 'ap-settings-back',
    variant: 'primary',
    help: 'Close Settings. Every change is already applied and saved.',
    onPress: () => requestClose(),
  });
  foot.append(resetBtn.el, backBtn.el);

  const built = new Map(); // tabId -> { def, inst, body }
  const tabBtns = new Map(); // tabId -> button
  let activeId = null;
  let open = false;
  let busy = false;
  let liveTimer = 0;
  let focusedEl = null;
  let lastTab = 'display';

  function availability(def) {
    if (typeof def.available !== 'function') return { ok: true };
    try {
      const r = def.available();
      if (r === true || r === undefined) return { ok: true };
      if (r === false) return { ok: false, reason: 'Not available right now' };
      return { ok: r.ok !== false, reason: r.reason || '' };
    } catch {
      return { ok: false, reason: 'Not available right now' };
    }
  }

  function tabCtx() {
    return {
      settings,
      widgets,
      app,
      services: { service },
      toast: (msg, o) => app.toast(msg, o),
      close: () => requestClose(),
      refocus: () => manager.refocus(),
    };
  }

  function ensureBuilt(id) {
    if (built.has(id)) return built.get(id);
    const def = settingsTab(id);
    if (!def) return null;
    const body = document.createElement('div');
    body.className = 'ap-tabbody';
    body.dataset.tab = id;
    body.setAttribute('role', 'tabpanel');
    let inst;
    const av = availability(def);
    if (!av.ok) {
      inst = { el: widgets.note(av.reason || 'Not available right now', 'warn'), unavailable: true };
    } else {
      try {
        inst = def.build(tabCtx()) || {};
      } catch (err) {
        console.error(`[settings] tab '${id}' failed to build`, err);
        inst = { el: widgets.note('This tab could not be loaded.', 'warn'), failed: true };
      }
    }
    if (inst.el) body.appendChild(inst.el);
    wrap.appendChild(body);
    const rec = { def, inst, body };
    built.set(id, rec);
    if (resizeObs) resizeObs.observe(body);
    return rec;
  }

  // ------------------------------------------ overflow (fix-M1-r5 F2) --
  const SCROLL_HELP = 'Scroll with ↑ / ↓ (the D-pad or the right stick on a gamepad) or the mouse wheel.';
  const scrollMax = () => Math.max(0, wrap.scrollHeight - wrap.clientHeight);
  function syncFades() {
    const max = scrollMax();
    const top = wrap.scrollTop;
    wrap.classList.toggle('ap-more-below', max > 1 && top < max - 1);
    wrap.classList.toggle('ap-more-above', max > 1 && top > 1);
  }
  // A read-only tab that overflows gets ONE focus stop: its content root.
  function syncOverflow() {
    syncFades();
    const rec = activeId && built.get(activeId);
    const region = rec && !rec.inst.unavailable && !rec.inst.failed ? rec.inst.el : null;
    if (!region) return;
    const others = manager.navigable(rec.body).filter((n) => n !== region);
    const want = scrollMax() > 1 && others.length === 0;
    if (want === region.hasAttribute('data-nav')) return;
    const label = rec.def.label || rec.def.id;
    if (want) {
      if (!region.id) region.id = `ap-scroll-${rec.def.id}`;
      region.classList.add('ap-scrollstop');
      region.setAttribute('data-nav', '');
      region.tabIndex = -1;
      region.setAttribute('role', 'region');
      region.setAttribute('aria-label', `${label} — scroll with ↑ ↓`);
      region.dataset.navScroll = '1';
      region.dataset.helpTitle = `${label} reference`;
      region.dataset.help = SCROLL_HELP;
    } else {
      const wasFocused = focusedEl === region;
      region.classList.remove('ap-scrollstop');
      for (const a of ['data-nav', 'tabindex', 'role', 'aria-label', 'data-nav-scroll', 'data-help-title', 'data-help']) region.removeAttribute(a);
      if (wasFocused && open && manager.top() === 'settings') manager.focusElement(tabBtns.get(activeId), 'api');
    }
    const fr = firstRow(rec);
    screen.defaultFocus = fr && fr.id ? `#${fr.id}` : null;
  }
  // ↑/↓ on a scroll stop: one step (~45% of the box) while there is more.
  function scrollStep(sign) {
    const max = scrollMax();
    const top = wrap.scrollTop;
    if (sign > 0 ? top >= max - 1 : top <= 1) return false;
    const step = Math.max(40, Math.round(wrap.clientHeight * 0.45));
    wrap.scrollTop = sign > 0 ? Math.min(max, top + step) : Math.max(0, top - step);
    syncFades();
    return true;
  }
  // The ring entering the tab's content shows the end it came in at; leaving
  // it shows the end it passed (a note above the first row or below the last
  // is never stranded out of view).
  function edgeScroll(cur, target, dir) {
    const rec = activeId && built.get(activeId);
    if (!rec || scrollMax() <= 1) return;
    const fromBody = !!cur && rec.body.contains(cur);
    const toBody = !!target && rec.body.contains(target);
    if (fromBody === toBody) return;
    const toEnd = toBody ? dir !== 'down' : dir === 'down';
    wrap.scrollTop = toEnd ? scrollMax() : 0;
    syncFades();
  }
  const resizeObs = typeof ResizeObserver === 'function' ? new ResizeObserver(() => open && syncOverflow()) : null;
  if (resizeObs) resizeObs.observe(wrap);
  wrap.addEventListener('scroll', syncFades, { passive: true });

  function renderTabs() {
    const defs = settingsTabs();
    tabsEl.textContent = '';
    tabBtns.clear();
    for (const def of defs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ap-tab';
      b.id = `ap-tab-${def.id}`;
      b.textContent = def.label || def.id;
      b.setAttribute('role', 'tab');
      b.setAttribute('data-nav', '');
      b.dataset.helpTitle = def.label || def.id;
      b.dataset.help = `${def.label || def.id} settings. Switch tabs with Q / E (LB / RB on a gamepad) from anywhere on this screen.`;
      b.classList.toggle('ap-active', def.id === activeId);
      b.setAttribute('aria-selected', def.id === activeId ? 'true' : 'false');
      b.addEventListener('click', () => activate(def.id, { focus: 'tab' }));
      tabsEl.appendChild(b);
      tabBtns.set(def.id, b);
    }
  }

  function firstRow(rec) {
    if (!rec) return null;
    const items = [...rec.body.querySelectorAll('[data-nav]')].filter(
      (n) => !n.disabled && n.getAttribute('aria-disabled') !== 'true' && n.getClientRects().length > 0
    );
    return items[0] || null;
  }

  // Synchronous switch (no pending-change check) — used on open and after a
  // keep/revert settled.
  function switchTo(id, { focus = 'body', source = 'api' } = {}) {
    const next = ensureBuilt(id);
    if (!next) return false;
    if (activeId && activeId !== id) {
      const cur = built.get(activeId);
      if (cur) {
        cur.body.classList.remove('ap-active');
        if (cur.inst.onHide) cur.inst.onHide();
      }
    }
    const changed = activeId !== id;
    activeId = id;
    lastTab = id;
    // Exactly one tab body is shown (a re-open on another tab after a close
    // left the previous body marked active — two tabs stacked).
    for (const [tid, r] of built) if (tid !== id) r.body.classList.remove('ap-active');
    next.body.classList.add('ap-active');
    for (const [tid, b] of tabBtns) {
      b.classList.toggle('ap-active', tid === id);
      b.setAttribute('aria-selected', tid === id ? 'true' : 'false');
    }
    if (changed || !next.shown) {
      next.shown = true;
      if (next.inst.onShow) next.inst.onShow();
    }
    if (changed) wrap.scrollTop = 0;
    syncOverflow();
    const resettable = next.inst.resettable !== false && !next.inst.unavailable && !next.inst.failed;
    resetBtn.setDisabled(!resettable, 'Nothing to reset on this tab');
    const target = focus === 'tab' ? tabBtns.get(id) : firstRow(next) || tabBtns.get(id);
    // The manager's fallback focus is this tab's first row, never another
    // tab's button (it was the tab the screen opened on).
    const fr = firstRow(next);
    screen.defaultFocus = fr && fr.id ? `#${fr.id}` : null;
    if (target && open && manager.top() === 'settings') manager.focusElement(target, source);
    updateInfo();
    return true;
  }

  // Leaving a tab with armed display changes: settle them first (keep/revert).
  async function settlePending() {
    const cur = activeId && built.get(activeId);
    const inst = cur && cur.inst;
    if (!inst || typeof inst.hasPendingChanges !== 'function' || !inst.hasPendingChanges()) return true;
    const changes = typeof inst.pendingDescription === 'function' ? inst.pendingDescription() : [];
    busy = true;
    try {
      const res = await app.keepDisplay({ changes, seconds: 10 });
      if (res === 'keep') {
        if (inst.confirm) inst.confirm();
      } else if (inst.revert) inst.revert();
    } finally {
      busy = false;
    }
    return true;
  }

  async function activate(id, { focus = 'body', source = 'api' } = {}) {
    if (busy || !open) return false;
    if (id === activeId) {
      const target = focus === 'tab' ? tabBtns.get(id) : null;
      if (target) manager.focusElement(target, source);
      return true;
    }
    await settlePending();
    if (!open) return false;
    return switchTo(id, { focus, source });
  }

  function cycle(dir, source) {
    const ids = [...tabBtns.keys()];
    if (ids.length < 2) return;
    const i = Math.max(0, ids.indexOf(activeId));
    const next = ids[(i + dir + ids.length) % ids.length];
    // Keep the ring where it was: on the tab bar when a tab was focused.
    const onTab = focusedEl && focusedEl.classList && focusedEl.classList.contains('ap-tab');
    activate(next, { focus: onTab ? 'tab' : 'body', source });
  }

  async function requestClose() {
    if (busy || !open) return;
    await settlePending();
    if (open && manager.top() === 'settings') manager.pop();
  }

  async function resetTab() {
    const rec = activeId && built.get(activeId);
    if (!rec) return;
    const label = rec.def.label || rec.def.id;
    const ok = await app.confirm({
      title: `Reset ${label} settings?`,
      body: 'Every setting on this tab goes back to its default.',
      confirmLabel: 'Reset',
      cancelLabel: 'Cancel',
      danger: true,
      defaultFocus: 'cancel',
    });
    if (!ok) return;
    if (typeof rec.inst.reset === 'function') rec.inst.reset();
    else settings.reset(rec.def.id);
    app.toast(`${label} settings reset to defaults`, { tone: 'good' });
  }

  // The vertical ring (see the header). Inside the tab the items are grouped
  // into visual ROWS (items whose centres share a band: an audio channel's
  // Curve · Mute · Test, the server field + Check); Down / Up step exactly one
  // row, entering a row at the item nearest the cursor in x (←→ move inside
  // a row of buttons). Row steps, not a free spatial search, so a narrow
  // switch below a wide selector is never skipped (the V-Sync and Pause-on-
  // focus-loss rows were at 1024x576).
  function rowsOf(items) {
    const recs = items
      .map((n) => {
        const r = n.getBoundingClientRect();
        return { n, top: r.top, bottom: r.bottom, cy: r.top + r.height / 2, cx: r.left + r.width / 2, left: r.left };
      })
      .sort((a, b) => a.cy - b.cy || a.left - b.left);
    const rows = [];
    for (const it of recs) {
      const row = rows[rows.length - 1];
      if (row && it.cy >= row.top && it.cy <= row.bottom) row.items.push(it);
      else rows.push({ top: it.top, bottom: it.bottom, items: [it] });
    }
    for (const row of rows) row.items.sort((a, b) => a.left - b.left);
    return rows;
  }
  function nearestX(row, cx) {
    let best = row.items[0];
    for (const it of row.items) if (Math.abs(it.cx - cx) < Math.abs(best.cx - cx)) best = it;
    return best.n;
  }

  function walk(dir, source) {
    const cur = focusedEl;
    // A read-only tab's scroll stop scrolls first, then lets the ring go on.
    if (cur && cur.dataset && cur.dataset.navScroll === '1' && el.contains(cur) && scrollStep(dir === 'down' ? 1 : -1)) return true;
    const target = walkTarget(cur, dir);
    if (target === false) return false; // manager's initial focus
    if (target && target !== cur) {
      edgeScroll(cur, target, dir);
      // A scroll stop is taller than the box: edgeScroll placed it already.
      manager.focusElement(target, source, { scroll: !(target.dataset && target.dataset.navScroll === '1') });
    }
    return true;
  }

  function walkTarget(cur, dir) {
    if (!cur || !el.contains(cur) || !cur.isConnected) return false;
    const rec = activeId && built.get(activeId);
    const tab = activeId ? tabBtns.get(activeId) : null;
    const rows = rowsOf(rec ? manager.navigable(rec.body) : []);
    const footItems = manager.navigable(foot);
    const zone = tabsEl.contains(cur) ? 'tabs' : foot.contains(cur) ? 'foot' : rec && rec.body.contains(cur) ? 'body' : null;
    if (!zone) return false;
    const cr = cur.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    const down = dir === 'down';
    const firstRow = () => (rows.length ? rows[0].items[0].n : null);
    const lastRow = () => (rows.length ? nearestX(rows[rows.length - 1], cx) : null);
    let target = null;
    if (zone === 'body') {
      const i = rows.findIndex((r) => r.items.some((it) => it.n === cur));
      if (i < 0) {
        // The focused item left the navigable set (disabled meanwhile): the
        // first row wholly past it in the pressed direction.
        const cy = cr.top + cr.height / 2;
        const nextRow = down ? rows.find((r) => r.top > cy) : [...rows].reverse().find((r) => r.bottom < cy);
        target = nextRow ? nearestX(nextRow, cx) : null;
      } else {
        const next = rows[i + (down ? 1 : -1)];
        target = next ? nearestX(next, cx) : null;
      }
      if (!target) target = down ? footItems[0] || tab : tab || footItems[footItems.length - 1];
    } else if (zone === 'foot') {
      const i = footItems.indexOf(cur);
      if (down) target = (i >= 0 && footItems[i + 1]) || tab || firstRow();
      else target = (i > 0 && footItems[i - 1]) || lastRow() || tab;
    } else {
      // On the tab bar (the selected tab, or one the mouse hovered).
      if (down) target = firstRow() || footItems[0] || null;
      else target = footItems[footItems.length - 1] || lastRow() || null;
    }
    return target;
  }

  function helpFor(node) {
    if (!node) return { title: '', body: '' };
    const holder = node.closest('[data-help], [data-help-title]') || node;
    const title = holder.dataset.helpTitle || node.getAttribute('aria-label') || (node.textContent || '').trim();
    let body = holder.dataset.help || '';
    const noteEl = holder.querySelector && holder.querySelector('.ap-note');
    const inline = noteEl ? noteEl.textContent.trim() : '';
    if (!body) body = inline;
    if (!body) {
      // A contributed row without help text: say how to operate it.
      if (node.type === 'range') body = 'Adjust with ← / → (the D-pad on a gamepad), or drag with the mouse.';
      else if (node.getAttribute('role') === 'switch') body = 'Switch with Enter, ← / → or a click (A on a gamepad).';
      else if (node.classList.contains('ap-choice')) body = 'Choose with ← / → (the D-pad on a gamepad), or click the arrows.';
    }
    return { title, body };
  }

  function updateInfo() {
    const node = focusedEl && el.contains(focusedEl) ? focusedEl : null;
    const rec = activeId && built.get(activeId);
    const h = helpFor(node);
    infoTitle.textContent = h.title || (rec ? rec.def.label : '');
    infoBody.textContent = h.body;
    let live = '';
    if (rec && typeof rec.inst.info === 'function') {
      try {
        live = rec.inst.info(node) || '';
      } catch {
        live = '';
      }
    }
    infoLive.textContent = live;
    infoLive.style.display = live ? '' : 'none';
  }

  function updateFootNote() {
    const r = settings.loadReport;
    const notes = [];
    if (r.storage === 'memory') notes.push("Settings can't be saved in this browser mode");
    if (r.status === 'recovered') notes.push('Settings were reset — the saved file was unreadable');
    if (r.status === 'newer') notes.push('Saved by a newer version of Echoes — using defaults');
    footNote.textContent = notes.join(' · ');
    footNote.style.display = notes.length ? '' : 'none';
  }

  app.events.on('settings_tabs', () => {
    if (!open) return;
    renderTabs();
  });

  const screen = {
    el,
    blocking: true,
    layer: 'overlay',
    onOpen(params = {}) {
      open = true;
      renderTabs();
      updateFootNote();
      const want = params.tab && settingsTab(params.tab) ? params.tab : settingsTab(lastTab) ? lastTab : [...tabBtns.keys()][0];
      const prev = activeId;
      activeId = null; // force onShow of the opened tab
      if (prev && built.get(prev)) built.get(prev).body.classList.remove('ap-active');
      if (want) switchTo(want, { focus: 'body' });
      const rec = want && built.get(want);
      screen.defaultFocus = rec && firstRow(rec) && firstRow(rec).id ? `#${firstRow(rec).id}` : null;
      clearInterval(liveTimer);
      liveTimer = setInterval(() => {
        updateInfo();
        syncHints(); // a pad B / right-click cancel changes no text event
      }, LIVE_MS);
      syncHints();
    },
    onClose() {
      open = false;
      clearInterval(liveTimer);
      const cur = activeId && built.get(activeId);
      if (cur && cur.inst.onHide) cur.inst.onHide();
      if (cur) cur.shown = false;
      activeId = null;
    },
    onFocusChange(node) {
      focusedEl = node;
      updateInfo();
      syncHints();
    },
    // The focused item disabled itself (Network's "Reset to automatic" once
    // pressed): the ring moves on to the next row in reading order — never to
    // an unselected tab button (the manager's first item).
    onFocusLost(node) {
      if (!node || !node.isConnected || !el.contains(node)) return null;
      const body = activeId && built.get(activeId) && built.get(activeId).body;
      if (!body || !body.contains(node)) return null;
      const t = walkTarget(node, 'down');
      return t && !(t.classList && t.classList.contains('ap-tab')) ? t : walkTarget(node, 'up') || null;
    },
    onNav(action, source) {
      if (busy) return true;
      if (action === 'up' || action === 'down') return walk(action, source);
      if (action === 'tabPrev' || action === 'tabNext') {
        cycle(action === 'tabPrev' ? -1 : 1, source);
        return true;
      }
      // On the tab bar, left/right switch tabs (console convention).
      if ((action === 'left' || action === 'right') && focusedEl && focusedEl.classList.contains('ap-tab')) {
        cycle(action === 'left' ? -1 : 1, source);
        return true;
      }
      return false;
    },
    // Right stick (app.js -> manager.scroll): the tab's box, from anywhere.
    onScroll(dy) {
      if (busy || scrollMax() <= 1) return false;
      wrap.scrollTop = Math.max(0, Math.min(scrollMax(), wrap.scrollTop + dy));
      syncFades();
      return true;
    },
    back() {
      requestClose();
      return true;
    },
    // Idle-time warm-up (app.js): every registered tab is built now, so the
    // first switch to it is a class toggle, not a DOM build.
    prebuild() {
      if (!tabBtns.size) renderTabs();
      for (const def of settingsTabs()) ensureBuilt(def.id);
    },
    debug: () => ({ activeId, tabs: [...tabBtns.keys()], busy, pending: !!(activeId && built.get(activeId)?.inst.hasPendingChanges?.()) }),
  };
  return screen;
}
