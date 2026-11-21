// movesL.mjs: the "longer load" option (overnight review, not passed). The same v11 moves, but the load before the
// effect lasts twice as long: every key before 0.055 s takes twice the time, the strike itself keeps its speed, and
// everything after moves 0.055 s later. The effect would land 0.155 s after the press instead of 0.10 s.
import { CLIPS as C11 } from './moves11.mjs';
const A=0.055, fw=t=>t<=A?t*2:t+A, inv=t=>t<=2*A?t/2:t-A;
const wk=(g)=>g&&{...g,from:fw(g.from),to:fw(g.to),keys:g.keys.map(k=>({...k,t:fw(k.t)}))};
const lead=(c)=>({...c,T:c.T+A,keys:c.keys.map(k=>({...k,t:fw(k.t)})),offHand:wk(c.offHand),staffPose:wk(c.staffPose),
  free:c.free&&c.free.map(([a,b])=>[fw(a),fw(b)]),twoHand:c.twoHand&&{...c.twoHand,from:fw(c.twoHand.from),to:fw(c.twoHand.to)},
  fn:c.fn&&((t,T)=>c.fn(inv(t),T-A))});
export const CLIPS={};
for(const n of (process.env.LEADS||'toss,throw,bite').split(','))CLIPS[n]=lead(C11[n]);
