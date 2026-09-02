import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader','--disable-dev-shm-usage'] });
const p = await b.newPage();
await p.setViewport({width:1600,height:900,deviceScaleFactor:1});
p.on('console', m => { const t=m.text(); if(!t.includes('flatShading')) console.log('['+m.type()+']', t.slice(0,300)); });
p.on('pageerror', e => console.log('[PAGEERROR]', e.message));
const t0 = Date.now();
try { await p.goto(process.argv[2] || 'http://127.0.0.1:5199', { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch(e){ console.log('goto:', e.message); }
console.log('domcontentloaded at', Date.now()-t0);
for (let i=0;i<40;i++){
  const r = await p.evaluate(()=> (window.__echoes ? {tick: window.__echoes.tick, fps: window.__echoes.fps} : null)).catch(e=>'err:'+e.message);
  if (r && r.tick !== undefined) { console.log('__echoes live at', Date.now()-t0, JSON.stringify(r)); break; }
  await new Promise(r=>setTimeout(r,500));
}
await new Promise(r=>setTimeout(r,3000));
console.log('final', JSON.stringify(await p.evaluate(()=>({tick:__echoes.tick,fps:__echoes.fps}))));
await b.close();
