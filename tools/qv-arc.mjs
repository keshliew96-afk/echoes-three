import sharp from 'sharp';
const [f,cx,cy,rx,ry] = process.argv.slice(2).map((v,i)=>i?+v:v);
const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px=(x,y)=>{x=Math.round(x);y=Math.round(y);const i=(y*info.width+x)*info.channels;return [data[i],data[i+1],data[i+2]];};
const rows=[];
for (let d=0; d<360; d+=15){const th=d*Math.PI/180;const p=px(cx+rx*Math.sin(th), cy-ry*Math.cos(th));
 const lum=Math.round(0.2126*p[0]+0.7152*p[1]+0.0722*p[2]);
 rows.push([d,'#'+p.map(v=>v.toString(16).padStart(2,'0')).join(''),lum]);}
console.log(JSON.stringify(rows));
