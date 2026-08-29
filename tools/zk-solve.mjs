// Offline replica of render/critters/common.js forwardPost, so a candidate can
// be solved without a browser round-trip.
const EXPOSURE = 1.04, gradeMix = 0.35, gradeSat = 1.05;
const ACES_IN = [0.59719,0.076,0.0284,0.35458,0.90834,0.13383,0.04823,0.01566,0.83777];
const ACES_OUT = [1.60475,-0.10208,-0.00327,-0.53108,1.10813,-0.07276,-0.07367,-0.00605,1.07602];
const m3 = (m,v)=>[m[0]*v[0]+m[3]*v[1]+m[6]*v[2], m[1]*v[0]+m[4]*v[1]+m[7]*v[2], m[2]*v[0]+m[5]*v[1]+m[8]*v[2]];
const rrt = v => (v*(v+0.0245786)-0.000090537)/(v*(0.983729*v+0.432951)+0.238081);
const c01 = v => Math.min(1,Math.max(0,v));
const l2s = c => c<=0.0031308 ? c*12.92 : 1.055*Math.pow(c,1/2.4)-0.055;
const s2l = c => c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4);
function fwd(lin){
  let c = m3(ACES_IN, lin.map(v=>v*EXPOSURE/0.6)).map(rrt);
  c = m3(ACES_OUT, c).map(c01).map(l2s);
  const s = c.map(v=>v*v*(3-2*v));
  c = c.map((v,i)=>v+(s[i]-v)*gradeMix);
  c = [c[0]*1.045+0.012, c[1]*1.01+0.006, c[2]*0.965];
  const L = 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
  return c.map(v=>c01(L+(v-L)*gradeSat));
}
function solve3(J,r){const m=[[...J[0],r[0]],[...J[1],r[1]],[...J[2],r[2]]];
 for(let i=0;i<3;i++){let p=i;for(let k=i+1;k<3;k++)if(Math.abs(m[k][i])>Math.abs(m[p][i]))p=k;[m[i],m[p]]=[m[p],m[i]];
  if(Math.abs(m[i][i])<1e-9)return[0,0,0];
  for(let k=0;k<3;k++){if(k===i)continue;const f=m[k][i]/m[i][i];for(let j=i;j<4;j++)m[k][j]-=f*m[i][j];}}
 return [m[0][3]/m[0][0],m[1][3]/m[1][1],m[2][3]/m[2][2]];}
function solve(target){ // target = display 0..1 triple
  const lin=[...target]; let out=null;
  for(let it=0;it<200;it++){const got=fwd(lin);const res=target.map((t,i)=>t-got[i]);
    const err=Math.max(...res.map(Math.abs)); if(out===null||err<out.err)out={err,lin:[...lin],got};
    if(err<0.0008)break;
    const h=1e-4;const J=[[0,0,0],[0,0,0],[0,0,0]];
    for(let j=0;j<3;j++){const l2=[...lin];l2[j]+=h;const g2=fwd(l2);for(let i=0;i<3;i++)J[i][j]=(g2[i]-got[i])/h;}
    const d=solve3(J,res); for(let i=0;i<3;i++)lin[i]=Math.max(0,Math.min(4,lin[i]+d[i]*0.8));}
  return out;
}
const hsv=(c)=>{const [r,g,b]=c;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;
 if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;
 return [h,mx?d/mx:0,mx];};
const hex2disp = h => [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255];
const HEAL = '#5FE873';
const base = hex2disp(HEAL);
console.log('target', HEAL, 'hsv', hsv(base).map(v=>+v.toFixed(3)));
for (const s of [1.0,0.95,0.9,0.85,0.8,0.75,0.7,0.65,0.6,0.55,0.5,0.45,0.4]) {
  const t = base.map(v=>v*s);
  const r = solve(t);
  const got = r.got;
  const gh = hsv(got);
  const lin = r.lin;
  const lum = 0.2126*lin[0]+0.7152*lin[1]+0.0722*lin[2];
  console.log(`s=${s.toFixed(2)} err=${r.err.toFixed(4)} display rgb(${got.map(v=>Math.round(v*255)).join(',')}) h=${gh[0].toFixed(1)} sat=${gh[1].toFixed(2)} v=${Math.round(gh[2]*255)}  linLum=${lum.toFixed(3)} lin=(${lin.map(v=>v.toFixed(3)).join(',')})`);
}
