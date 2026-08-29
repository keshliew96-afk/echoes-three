// TEMP diagnostic: one page load, N screenshots with different layers hidden,
// so a metric delta attributes reserved-band pixels to a specific mesh family
// without any cosmetic-stream variance between the shots.
import { mkdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const tag = argv[0] || 'layer';
const q = argv[1] || '?variant=1&seed=7';
const box = argv[2] ? argv[2].split(',').map(Number) : null;
const luma=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=60*(((g-b)/d)%6);else if(mx===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return [h,mx?d/mx:0,mx*255];}
async function danger(file){const {data,info}=await sharp(readFileSync(file)).ensureAlpha().removeAlpha().raw().toBuffer({resolveWithObject:true});const{width:W,height:H,channels:C}=info;let n=0,cool=0,warm=0,fol=0;
 const X0=box?box[0]:0,Y0=box?box[1]:0,X1=box?box[0]+box[2]:W,Y1=box?box[1]+box[3]:H;
 for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){const i=(y*W+x)*C;const r=data[i],g=data[i+1],b=data[i+2];const L=luma(r,g,b);const[h,s]=hsv(r,g,b);
  if(s>0.12){if(h>=330||h<60)warm++;else if(h<160)fol++;else cool++;}
  if(s>0.35&&L>40&&h>=5&&h<25)n++;}
 return {n,cool:(cool/(cool+warm+fol||1)*100).toFixed(1)};}
const HIDES = {
  base: 'null',
  rings: "(()=>{let n=0;window.__arenaProbe.stage.scene.traverse(o=>{if(o.name==='identity-ring'){o.visible=false;n++}});return n})()",
  ringglow: "(()=>{let n=0;window.__arenaProbe.stage.scene.traverse(o=>{if(o.name==='identity-ring'){o.children.forEach(c=>{if(c.renderOrder===-2){c.visible=false;n++}})}});return n})()",
  ink: "(()=>{let n=0;window.__arenaProbe.stage.scene.traverse(o=>{if(/-ink$/.test(o.name||'')){o.visible=false;n++}});return n})()",
  party: "(()=>{let n=0;window.__arenaProbe.stage.scene.traverse(o=>{if(/^critter-/.test(o.name||'')){o.visible=false;n++}});return n})()",
  pools: "(()=>{let n=0;window.__arenaProbe.root.traverse(o=>{if(o.isMesh&&o.material&&o.material.blending===2&&o.geometry.type==='CircleGeometry'){o.visible=false;n++}});return n})()",
  halos: "(()=>{let n=0;window.__arenaProbe.root.traverse(o=>{if(o.isSprite&&o.material.blending===2){o.visible=false;n++}});return n})()",
  fires: "(()=>{let n=0;window.__arenaProbe.root.traverse(o=>{if(o.isSprite&&o.material.blending!==2){o.visible=false;n++}});return n})()",
  sprites: "(()=>{let n=0;window.__arenaProbe.root.traverse(o=>{if(o.isSprite){o.visible=false;n++}});return n})()",
  points: "(()=>{let n=0;window.__arenaProbe.root.traverse(o=>{if(o.isPoints){o.visible=false;n++}});return n})()",
  additive: "(()=>{let n=0;window.__arenaProbe.stage.scene.traverse(o=>{if(o.material&&o.material.blending===2){o.visible=false;n++}});return n})()",
  bloomoff: "(()=>{window.__arenaProbe.stage.bloomPass.enabled=false;return 1})()",
  props: "(()=>{let n=0;window.__arenaProbe.root.traverse(o=>{if(o.isInstancedMesh){o.visible=false;n++}});return n})()",
};
const seq = (argv[3] || 'base,rings,ink,pools').split(',');
mkdirSync(join(root,'captures'),{recursive:true});
const browser = await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage','--window-size=1600,900']});
const page = await browser.newPage();
await page.setViewport({width:1600,height:900,deviceScaleFactor:1});
await page.goto(`http://127.0.0.1:5199/${q}`,{waitUntil:'networkidle2',timeout:30000});
await new Promise(r=>setTimeout(r,2600));
let prev=null;
for(const step of seq){
  if(step!=='base') console.log(`  hid ${step}: ${await page.evaluate(HIDES[step]||'0')}`);
  const f = join(root,'captures',`${tag}-${step}.png`);
  await page.screenshot({path:f});
  const m = await danger(f);
  console.log(`${step.padEnd(10)} danger ${String(m.n).padStart(5)}  cool ${m.cool}%   ${prev!==null?`(delta ${m.n-prev})`:''}`);
  prev=m.n;
}
await browser.close();
