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
// Navigation: ↑↓ rows (up from the first row reaches the tab bar), ←→ adjust,
// Q/E · PageUp/PageDown · LB/RB switch tabs, Esc / B / right-click = Back.
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
  const hints = createHints(app, [
    ['move', 'Select'],
    ['adjust', 'Change'],
    ['tabs', 'Tabs'],
    ['back', 'Back'],
  ]);
  foot.insertBefore(hints.el, footNote);
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
    return rec;
  }

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
    const resettable = next.inst.resettable !== false && !next.inst.unavailable && !next.inst.failed;
    resetBtn.setDisabled(!resettable, 'Nothing to reset on this tab');
    const target = focus === 'tab' ? tabBtns.get(id) : firstRow(next) || tabBtns.get(id);
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
      liveTimer = setInterval(updateInfo, LIVE_MS);
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
    },
    onNav(action, source) {
      if (busy) return true;
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
