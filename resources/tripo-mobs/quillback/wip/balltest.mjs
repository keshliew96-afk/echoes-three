// a test: the curled ball spun once, slowly; prints the lowest point per angle (BALL_Y tuning). usage via build.mjs
import * as C from './clips.mjs';
export const CFG = C.CFG;
const g = C.GAMEPOSE;
export const CLIPS = { spin: { dur: 2, pose: (t) => g({ ...C.GREST_, tuck: 1, legs: 0, crest: 1, bristle: 1, pitch: Math.PI * t }, 0), feet: (t, B) => C.GAMEFEET({ ...C.GREST_, tuck: 1, legs: 0 }, B) } };
