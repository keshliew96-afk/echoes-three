import sharp from 'sharp';
const f = process.argv[2];
const band = process.argv[3] || 'danger';
const img = sharp(f); const meta = await img.metadata();
const d = await img.ensureAlpha().raw().toBuffer();
const W = meta.width, H = meta.height;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),c=mx-mn;let h=0;if(c){if(mx===r)h=((g-b)/c)%6;else if(mx===g)h=(b-r)/c+2;else h=(r-g)/c+4;h*=60;if(h<0)h+=360;}return[h,mx?c/mx:0,mx*255];}
const inBand=(h)=>band==='danger'?(h>=5&&h<25):band==='violet'?(h>=245&&h<285):band==='heal'?(h>=110&&h<150):(h>=30&&h<50);
// 32x32 cell counts
const CW=32, cols=Math.ceil(W/CW), rows=Math.ceil(H/CW);
const grid=new Array(cols*rows).fill(0);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;const r=d[i],g=d[i+1],b=d[i+2];const[h,s,L]=hsv(r,g,b);if(s>0.35&&L>40&&inBand(h))grid[Math.floor(y/CW)*cols+Math.floor(x/CW)]++;}
const cells=[...grid.map((c,i)=>[c,(i%cols)*CW,Math.floor(i/cols)*CW])].filter(c=>c[0]>0).sort((a,b)=>b[0]-a[0]).slice(0,14);
console.log(`${f} band=${band} total=${grid.reduce((a,b)=>a+b,0)} top 32px cells (count @ x,y):`);
for(const[c,x,y]of cells)console.log(`  ${c} @ (${x},${y})`);
