// Sound for the Gauntlet skill/status events (PLAN §3.5 "M4a/M4b register
// cues for their new events with registerEventCue in their own files").
// Owner: M4a. Every handler returns [{ cue, x?, z?, gainDb?, pitch? }] from
// the engine's existing cue library (src/audio/cues.js) or null to leave the
// built-in mapping; world-anchored gameplay cues are spatial (x/z).
const at = (ev) => (Number.isFinite(ev.x) && Number.isFinite(ev.z) ? { x: ev.x, z: ev.z } : {});

export function registerContentCues(audio, world = null) {
  if (!audio || typeof audio.registerEventCue !== 'function') return false;
  const player = () => (world && world.player ? { x: world.player.x, z: world.player.z } : {});
  // New skills keep their own cast family (the engine's fallback maps by
  // shape; the two damage bolts need 'cast_damage', the toll a heavier nova).
  audio.registerEventCue('skill_cast', (ev) => {
    if (ev.skill === 'lantern_flurry') return [{ cue: 'cast_damage', ...player(), pitch: 1.12 }];
    if (ev.skill === 'pale_lance') return [{ cue: 'cast_damage', ...player(), pitch: 0.86 }];
    if (ev.skill === 'bell_toll')
      return [
        { cue: 'cast_nova', ...player(), pitch: 0.7 },
        { cue: 'telegraph_hit', ...player(), pitch: 1.3, gainDb: -6 },
      ];
    if (ev.skill === 'rootsnare') return [{ cue: 'cast_zone', ...player(), pitch: 0.82 }];
    if (ev.resonance) return null;
    return null;
  });
  audio.registerEventCue('skill_bolt_pierce', (ev) => [{ cue: 'impact', ...at(ev), pitch: 1.2, gainDb: -2 }]);
  // A resonant CAST is an event; a resonant passive PULSE (M4c: Resonance now
  // fits a passive — every 3rd pulse, i.e. every 3 s for as long as the aura
  // is owned) is ambience: the same soft field sparkle as the other passive
  // techniques, so a 3-second metronome never rides the mix.
  audio.registerEventCue('resonance_proc', (ev) =>
    ev.pulse ? [{ cue: 'sparkle', ...at(ev), pitch: 0.85, gainDb: -9 }] : [{ cue: 'echo', ...at(ev), pitch: 0.75, gainDb: 1 }]
  );
  audio.registerEventCue('split_shard', (ev) => [{ cue: 'bounce', ...at(ev), pitch: ev.mode === 'heal' ? 1.1 : 1.35, gainDb: -3 }]);
  audio.registerEventCue('shield_absorb', (ev) => [{ cue: 'bounce', ...at(ev), pitch: 1.7, gainDb: -4 }]);
  audio.registerEventCue('technique_pulse', (ev) => [{ cue: 'sparkle', ...player(), pitch: ev.node === 'snare' ? 0.8 : 1.2, gainDb: -10 }]);
  audio.registerEventCue('status_apply', (ev) => {
    if (ev.status === 'stun') return [{ cue: 'mark', ...at(ev), pitch: 0.8, gainDb: -4 }];
    if (ev.status === 'shield') return [{ cue: 'sparkle', ...at(ev), pitch: 0.9, gainDb: -6 }];
    if (ev.status === 'haste') return [{ cue: 'echo_tick', ...at(ev), pitch: 1.3, gainDb: -8 }];
    return null; // slow / ward / exposed / inspired refresh every pulse: silent
  });
  return true;
}
