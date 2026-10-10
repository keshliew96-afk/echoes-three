// CLASS SELECT (docs/CLASS_SELECT.md) — which of the four classes the local
// player plays. Pure presentation + input routing around the sim's existing
// seat model (sim/netseats.js, PLAN §3.7): seat index == party index ==
// class (0 Healer, 1 Tank, 2 Swordsman, 3 Archer).
//
// Single-player: the Healer (the default) steps EXACTLY as before —
// world.step(tick, sampleIntents()) — so an unchosen run, the replays and
// the golden traces are untouched. Any other class steps the world the way
// a network host on that seat does: the local input becomes that seat's
// SeatInput, the Healer is played by the seat-0 leader bot (M4a's autopilot,
// combat only: the between-room pages stay the player's), and the camera,
// command bar and interact prompt follow the chosen body (world.netView /
// world.followSeat, the M5b presentation seams).
//
// The choice is a setting (`gameplay.playClass`), read while no run is live:
// a run keeps the class it started with. A network session replaces this
// step with its own driver and restores it when it ends.
import { emptySnapshot } from '../core/intents.js';
import { frameFromSnapshot, seatInputOf } from '../sim/netseats.js';
import { SKILLS } from '../sim/skills.js';
import { SEAT_CLASSES } from '../net/seats.js';
import { seatOfClass as lineupSeatOf, classOfSeat, tidecallerOpen, plannedLineup, parseTeam } from '../data/lineup.js';
import { dodgeCooldownTicks } from '../sim/relics.js';

export const PLAY_CLASS_KEY = 'gameplay.playClass';
// THE TIDECALLER (docs/TIDECALLER.md): five classes for four seats. Who
// joins the Healer is `gameplay.team` (comma list; '' = today's party).
export const TEAM_KEY = 'gameplay.team';
export const PLAY_CLASSES = Object.freeze([...SEAT_CLASSES, 'tidecaller']);
export const playable = (c) => SEAT_CLASSES.includes(c) || (c === 'tidecaller' && tidecallerOpen());
// The lineup the next campaign takes from the two settings.
export const lineupFromSettings = (settings) => plannedLineup(settings.get(PLAY_CLASS_KEY), settings.get(TEAM_KEY));
// PARTY LINEUP (docs/LINEUP.md): the seat the class holds in the run's
// lineup; a class that stayed at camp plays nothing, so the Healer's seat.
export const seatOfClass = (cls) => Math.max(0, lineupSeatOf(cls));

// The leader bot's config: the autopilot's healer play with its page driving
// off (the human decides drafts, doors and the shop). `leader` marks it as
// ours, so a harness autopilot is never switched off by mistake.
export const LEADER_BOT = Object.freeze({ seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true });

export function registerPlayClassSetting(settings) {
  settings.register(PLAY_CLASS_KEY, { default: 'healer', validate: (v) => (playable(v) ? v : undefined) });
  settings.register(TEAM_KEY, { default: '', validate: (v) => (typeof v === 'string' ? parseTeam(v).join(',') : undefined) });
}

const cdTicksOf = (def) => Math.max(30, Math.round((def.cd || 0) * 60));

export function createPlayClass({ world, registry, settings, scene, sampleIntents }) {
  // The class is read while no run is live (a run keeps the class it started
  // with); its seat follows the run's lineup, set at the run start or a load.
  let chosen = settings.get(PLAY_CLASS_KEY);
  let seat = seatOfClass(chosen);
  let presented = false;
  const autopilot = () => {
    const r = world.runSystem();
    return r ? r.autopilot : null;
  };
  const runLive = () => {
    const r = world.runSystem();
    return !!(r && r.isActive());
  };
  const seatEntity = (i) => (i === 0 ? world.player : registry.all().find((e) => e.kind === 'ally' && e.partyIndex === i) || null);

  function leaderOn() {
    const ap = autopilot();
    return !!(ap && ap.active() && ap.view().cfg && ap.view().cfg.leader);
  }
  function setLeader(on) {
    const ap = autopilot();
    if (!ap) return;
    if (on && !ap.active()) world.cmd('autopilot', { ...LEADER_BOT });
    else if (!on && leaderOn()) world.cmd('autopilot', false);
  }

  // The seat's four kit tiles for the command bar (the net session's
  // hostSeatSlots, read from the live sim).
  function slots() {
    const e = seatEntity(seat);
    const P = typeof world.partySystem === 'function' ? world.partySystem() : null;
    const ids = P && typeof P.slots === 'function' ? P.slots(seat) : null;
    const b = P && typeof P.build === 'function' ? P.build(seat) : null;
    if (!e || !ids) return null;
    return [0, 1, 2, 3].map((i) => {
      const base = ids[i] ? SKILLS[ids[i]] : null;
      if (!base) return null;
      let def = base;
      try {
        def = b && typeof b.resolveDef === 'function' ? b.resolveDef(base) : base;
      } catch {
        def = base;
      }
      const passive = base.shape === 'aura';
      return { id: ids[i], abbrev: base.abbrev, passive, remainingTicks: passive ? 0 : Math.max(0, ((e.cds && e.cds[i]) || 0) - world.tick), totalTicks: cdTicksOf(def) };
    });
  }
  function present() {
    const s = seat;
    world.netView = {
      seat: s,
      role: 'solo',
      followTarget: () => seatEntity(s),
      skillSlots: () => slots(),
      dodge: () => {
        const e = seatEntity(s);
        if (!e) return null;
        // RELICS (Ash Feather): the ring's full length follows the relics.
        const R = typeof world.runSystem === 'function' ? world.runSystem() : null;
        const rl = R && typeof R.relics === 'function' ? R.relics() : null;
        const total = dodgeCooldownTicks(72, rl ? rl.owned.map((o) => o.id) : null);
        return { remaining: Math.max(0, (e.dodgeReadyTick || 0) - world.tick), total };
      },
    };
    world.followSeat = (alpha) => {
      const e = seatEntity(s);
      if (!e) return null;
      return { x: e.px + (e.x - e.px) * alpha, z: e.pz + (e.z - e.pz) * alpha, aim: e.aim || null };
    };
    try {
      if (scene && typeof scene.cmd === 'function') scene.cmd('followSeat', [world.followSeat]);
    } catch {
      /* scene without the follow command */
    }
    presented = true;
  }
  function unpresent() {
    if (!presented) return;
    presented = false;
    if (world.netView && world.netView.role === 'solo') world.netView = null;
    world.followSeat = null;
    try {
      if (scene && typeof scene.cmd === 'function') scene.cmd('followSeat', [null]);
    } catch {
      /* ignore */
    }
  }

  function step(tick) {
    if (!runLive()) chosen = settings.get(PLAY_CLASS_KEY);
    seat = seatOfClass(chosen);
    if (seat === 0) {
      if (presented) unpresent();
      if (leaderOn()) setLeader(false);
      return world.step(tick, sampleIntents());
    }
    if (!presented || !world.netView || world.netView.seat !== seat) present();
    setLeader(true);
    // One input frame per tick; its seq is the tick, so the seat's frame-clock
    // timers (sim/allies.js humanTimers) stay valid across saves and reloads.
    const f = frameFromSnapshot(sampleIntents(), { seq: tick, tick, viewTick: tick });
    world.step(tick, emptySnapshot(), { seats: { [seat]: seatInputOf([f]) }, reasons: {}, player: 'ai', rewind: null });
    return undefined;
  }

  return {
    step,
    seat: () => seat,
    classId: () => classOfSeat(seat),
    // Leaving a network session: the next solo step re-installs what it needs.
    reset() {
      presented = false;
    },
    debug: () => ({ seat, classId: classOfSeat(seat), chosen: settings.get(PLAY_CLASS_KEY), presented, leader: leaderOn() }),
  };
}
