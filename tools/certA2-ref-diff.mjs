// certA2-ref critic tool: % of pixels whose luma differs by >threshold between two PNGs, optional box.
import sharp from 'sharp';
const [a, b, boxArg, thrArg] = process.argv.slice(2);
const thr = Number(thrArg || 8);
const load = async (p) => {
  let img = sharp(p);
  if (boxArg && boxArg !== '-') { const [x,y,w,h] = boxArg.split(',').map(Number); img = img.extract({left:x,top:y,width:w,height:h}); }
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, info };
};
const A = await load(a), B = await load(b);
const ch = A.info.channels; let n = 0, tot = 0, maxd = 0;
for (let i = 0; i < A.data.length; i += ch) {
  const la = 0.2126*A.data[i]+0.7152*A.data[i+1]+0.0722*A.data[i+2];
  const lb = 0.2126*B.data[i]+0.7152*B.data[i+1]+0.0722*B.data[i+2];
  const d = Math.abs(la-lb); if (d > maxd) maxd = d; if (d > thr) n++; tot++;
}
console.log(`${a} vs ${b} box=${boxArg||'full'} thr=${thr}: ${(100*n/tot).toFixed(2)}% changed, maxDelta ${maxd.toFixed(1)}`);
