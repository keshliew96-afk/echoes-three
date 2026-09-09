import sharp from 'sharp';
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info; const N = W * H;
  const b = new Array(16).fill(0);
  for (let i = 0; i < N; i++) b[Math.min(15, Math.floor((0.2126*data[i*C]+0.7152*data[i*C+1]+0.0722*data[i*C+2])/16))]++;
  console.log(f, b.map((v,i)=>`${i}:${(v/N*100).toFixed(3)}`).join(' '));
}
