// App-level event emitter (docs/gauntlet/PLAN.md §3.1). NOT the sim bus:
// sim events live in core/events.js and feed the determinism probes; app
// events are UI/app-state traffic that must never enter the sim ring.
//
// Events (payload in PLAN.md §3.1 table):
//   'app_state'     { state, prev, mode, overlay }   boot|title|playing|farewell
//   'overlay'       { top, stack }                   screen stack changed
//   'sim_pause'     { paused, reason }               sim clock gated / ungated
//   'nav'           { action, source }               menu navigation action (UI sound hook)
//   'settings_open' / 'settings_close'
//   'service'       { name }                         a service was provided
import { EventEmitterLite } from './emitter.js';

export const appEvents = new EventEmitterLite();
