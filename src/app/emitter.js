// Minimal synchronous emitter shared by the app layer (settings store, screen
// manager, app state machine). on() returns an unsubscribe; '*' hears all.
export class EventEmitterLite {
  constructor() {
    this._l = new Map();
  }

  on(type, fn) {
    let set = this._l.get(type);
    if (!set) {
      set = new Set();
      this._l.set(type, set);
    }
    set.add(fn);
    return () => set.delete(fn);
  }

  once(type, fn) {
    const off = this.on(type, (p) => {
      off();
      fn(p);
    });
    return off;
  }

  emit(type, payload) {
    for (const key of [type, '*']) {
      const set = this._l.get(key);
      if (!set) continue;
      for (const fn of [...set]) {
        try {
          fn(payload, type);
        } catch (err) {
          // A broken listener must never take the app shell down with it.
          console.error(`[app] listener for '${type}' threw`, err);
        }
      }
    }
  }
}
