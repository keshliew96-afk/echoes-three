import sharp from 'sharp';
const [,, file, x, y, w, h] = process.argv;
const { data, info } = await sharp(file).extract({left:+x,top:+y,width:+w,height:+h}).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});
const C = info.channels;
const hsv=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let hh=0;if(d){if(mx===r)hh=60*(((g-b)/d)%6);else if(mx===g)hh=60*((b-r)/d+2);else hh=60*((r-g)/d+4);}if(hh<0)hh+=360;return [hh,mx?d/mx:0,mx*255];};
const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const px=[];
for(let i=0;i<info.width*info.height;i++){const r=data[i*C],g=data[i*C+1],b=data[i*C+2];px.push({r,g,b,L:lum(r,g,b),i});}
px.sort((a,b)=>b.L-a.L);
const topN=(n)=>{const s=px.slice(0,n);const m=[0,1,2].map(k=>Math.round(s.reduce((t,q)=>t+[q.r,q.g,q.b][k],0)/s.length));const hv=hsv(m[0],m[1],m[2]);return {n, rgb:m, h:+hv[0].toFixed(1), s:+hv[1].toFixed(2), L:+lum(m[0],m[1],m[2]).toFixed(0)};};
console.log(file, `box ${x},${y} ${w}x${h}`);
for(const n of [1,5,20,60,150]) console.log(' top', JSON.stringify(topN(n)));
// most-saturated green pixels
const green = px.filter(q=>{const v=hsv(q.r,q.g,q.b);return v[0]>=90&&v[0]<=170&&v[1]>0.3;}).slice(0,40);
if(green.length){const m=[0,1,2].map(k=>Math.round(green.reduce((t,q)=>t+[q.r,q.g,q.b][k],0)/green.length));const hv=hsv(m[0],m[1],m[2]);console.log(' brightest 40 green px:', JSON.stringify({rgb:m,h:+hv[0].toFixed(1),s:+hv[1].toFixed(2)}));}
