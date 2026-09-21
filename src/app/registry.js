// App registries (docs/gauntlet/PLAN.md §3.2): the seams that let the Gauntlet
// modules plug into each other WITHOUT editing each other's files.
//
//   services        provide('save', api) / service('save') / whenService('save')
//                   — one named implementation per module (save, audio, net,
//                   app, settings, display). Consumers must tolerate a missing
//                   service (null) and degrade honestly (e.g. Load Game shows
//                   "No saves yet" and is disabled until 'save' exists).
//   settings tabs   registerSettingsTab({ id, label, order, build }) — the
//                   settings screen (M1) renders every registered tab in
//                   `order`; Display/Gameplay/Controls = M1, Audio = M3,
//                   Network = M5b.
//   screens         registerScreen(id, factory) — screen factories for the
//                   screen manager (src/app/screens.js). Keys may register
//                   before the manager exists; the manager instantiates lazily.
//
// Pure registry: no DOM here.
import { appEvents } from './events.js';

// ------------------------------------------------------------ services --
const services = new Map();
const waiters = new Map();

export function provide(name, impl) {
  services.set(name, impl);
  const w = waiters.get(name);
  if (w) {
    waiters.delete(name);
    for (const resolve of w) resolve(impl);
  }
  appEvents.emit('service', { name });
  return impl;
}

export function service(name) {
  return services.get(name) ?? null;
}

export function whenService(name) {
  if (services.has(name)) return Promise.resolve(services.get(name));
  return new Promise((resolve) => {
    let w = waiters.get(name);
    if (!w) {
      w = [];
      waiters.set(name, w);
    }
    w.push(resolve);
  });
}

export function serviceNames() {
  return [...services.keys()];
}

// ------------------------------------------------------- settings tabs --
// def: {
//   id: 'display' | 'audio' | 'gameplay' | 'controls' | 'network' | ...,
//   label: 'Display',
//   order: 10,                       // Display 10, Audio 20, Gameplay 30, Controls 40, Network 50
//   build(ctx) -> {                  // called once, lazily, the first time the tab is shown
//     el: HTMLElement,               // the tab body (the settings screen owns the chrome)
//     onShow?(), onHide?(),
//     hasPendingChanges?() -> bool,  // display keep/revert (PLAN §5)
//     revert?(), confirm?(),
//     destroy?(),
//   }
//   available?() -> { ok: bool, reason?: string }   // e.g. Network tab offline
// }
// ctx (supplied by the settings screen): { settings, widgets, app, services:{service}, toast(msg), close() }
const tabs = new Map();

export function registerSettingsTab(def) {
  if (!def || !def.id || typeof def.build !== 'function') {
    throw new TypeError('registerSettingsTab: { id, label, order, build } required');
  }
  tabs.set(def.id, { order: 100, label: def.id, ...def });
  appEvents.emit('settings_tabs', { ids: [...tabs.keys()] });
  return () => tabs.delete(def.id);
}

export function settingsTabs() {
  return [...tabs.values()].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
}

export function settingsTab(id) {
  return tabs.get(id) ?? null;
}

// Extra rows contributed to ANOTHER key's tab (e.g. M4a adds "Challenge" to
// M1's Gameplay tab) without editing that tab's file. The owning tab renders
// settingsRows(tabId) after its own rows, in `order`.
// row: { id, order = 100, build(ctx) -> HTMLElement }
const rows = new Map(); // tabId -> Map(rowId -> row)

export function registerSettingsRow(tabId, row) {
  if (!row || !row.id || typeof row.build !== 'function') {
    throw new TypeError('registerSettingsRow: { id, order, build } required');
  }
  let m = rows.get(tabId);
  if (!m) {
    m = new Map();
    rows.set(tabId, m);
  }
  m.set(row.id, { order: 100, ...row });
  appEvents.emit('settings_rows', { tabId, ids: [...m.keys()] });
  return () => m.delete(row.id);
}

export function settingsRows(tabId) {
  const m = rows.get(tabId);
  return m ? [...m.values()].sort((a, b) => a.order - b.order) : [];
}

// -------------------------------------------------------------- screens --
// factory(ctx) -> Screen  (contract in src/app/screens.js)
const screenFactories = new Map();

export function registerScreen(id, factory) {
  if (typeof factory !== 'function') throw new TypeError(`registerScreen(${id}): factory required`);
  screenFactories.set(id, factory);
  appEvents.emit('screens', { ids: [...screenFactories.keys()] });
  return () => screenFactories.delete(id);
}

export function screenFactory(id) {
  return screenFactories.get(id) ?? null;
}

export function screenIds() {
  return [...screenFactories.keys()];
}
