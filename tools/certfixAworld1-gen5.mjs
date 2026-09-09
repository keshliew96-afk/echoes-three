// certfixAworld1 — variant sweep: the frame-edge ring was authored per variant,
// so rooms that use variants 2 and 3 get looked at too.
import { writeFileSync } from 'fs';
const ev = (c) => ({ type: 'eval', code: c });
for (const room of [3, 5]) {
  writeFileSync(`tools/actions/certfixAworld1-room${room}.json`, JSON.stringify([
    ev(`(()=>{const E=__echoes;E.cmd('startRun');E.cmd('skipToRoom',${room});return 1})()`),
    { type: 'wait', ms: 1600 },
    ev(`(()=>{const E=__echoes;const s=E.state();const a=(s.vfx&&s.vfx.arena)||{};return {tag:'room${room}',room:s.run.room,mode:s.run.mode,variant:a.variant,variantName:a.variantName,propTypes:a.propTypes,propShadows:a.propShadows,emitters:a.emitters,grass:a.grass,fps:E.fps}})()`),
  ], null, 1));
}
console.log('wrote room3, room5');
