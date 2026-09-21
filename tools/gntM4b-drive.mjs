#!/usr/bin/env node
// M4b browser driver: named visual/behaviour scenarios on the RUNNING game
// (dev server 5199 by default), built with the §6.4 deterministic commands.
// Screenshots -> captures/gntM4b-<scenario>-*.png; one JSON report on stdout
// (+ captures/gntM4b-<scenario>.json). Exit 1 on page errors.
//   node tools/gntM4b-drive.mjs <scenario> [--url base] [--w 1600 --h 900] [--headful]
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes, openEchoes, waitReady } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const scenario = argv[0];
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const BASE = opt('url', 'http://127.0.0.1:5199/');
const W = Number(opt('w', 1600));
const H = Number(opt('h', 900));
mkdirSync('captures', { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(name, fn, attempt = 1) {
  const browser = await launchEchoes({ gpu: true, headful: argv.includes('--headful'), width: W, height: H });
  const report = { scenario: name, steps: [] };
  let errors = [];
  let consoleLines = [];
  try {
    const ctx = {
      page: null,
      async open(query) {
        const r = await openEchoes(browser, BASE + query, { width: W, height: H });
        ctx.page = r.page;
        errors = r.errors;
        consoleLines = r.consoleLines;
        return waitReady(r.page, { minTick: 60 });
      },
      async ev(code, label) {
        const v = await ctx.page.evaluate(code);
        report.steps.push({ label: label ?? 'eval', v });
        return v;
      },
      async shot(tag) {
        const path = `captures/gntM4b-${name}-${tag}.png`;
        await ctx.page.screenshot({ path });
        report.steps.push({ shot: path });
        return path;
      },
      sleep,
      async key(k, ms = 100) {
        await ctx.page.keyboard.down(k);
        await sleep(ms);
        await ctx.page.keyboard.up(k);
      },
    };
    await fn(ctx);
  } catch (e) {
    report.crash = String(e && e.stack ? e.stack : e);
  } finally {
    report.pageErrors = errors;
    report.consoleErrors = consoleLines.filter((l) => l.startsWith('[error]')).slice(0, 20);
    report.warnings = consoleLines.filter((l) => l.startsWith('[warn')).slice(0, 12);
    await browser.close();
  }
  // An HMR reload mid-scenario (other agents edit src/** live) is not a
  // defect: retry up to 3 times.
  if (report.crash && /Execution context was destroyed|navigation|Target closed/i.test(report.crash) && attempt < 3) {
    console.error(`[retry] ${name} attempt ${attempt} hit a reload; retrying`);
    await sleep(3000);
    return run(name, fn, attempt + 1);
  }
  writeFileSync(`captures/gntM4b-${name}.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1).slice(0, 12000));
  process.exit(report.pageErrors.length || report.crash ? 1 : 0);
}

const SCEN = {
  // Every archetype + an elite in a line in front of the camera, frozen-ish.
  async zoo(c) {
    await c.open('?scene=arena&seed=3&variant=1');
    await c.ev(`(()=>{const E=__echoes;E.cmd('teleport',0,1.5);
      const ids={};const ks=['boar','mantis','quillback','toad','moth','ram','mole'];
      ks.forEach((k,i)=>{ids[k]=E.cmd('spawn',k,-6+i*2,-2.2,{elite:k==='ram'});});
      return ids;})()`, 'spawn');
    await c.sleep(1500);
    await c.shot('a');
    await c.sleep(1800);
    await c.shot('b');
    await c.ev(`(()=>{const s=__echoes.state();return {enemies:s.enemies.map(e=>({k:e.kind,x:e.x,z:e.z,st:e.state})),fx:s.vfx&&s.vfx.enemyRigs, gl:s.gl}})()`, 'state');
  },
  // Silhouette sheet: every archetype + elites posed in one row, sim frozen.
  async sheet(c) {
    await c.open('?scene=arena&seed=3&variant=' + opt('variant', '1'));
    await c.ev(`(()=>{const E=__echoes;E.cmd('teleport',0,3.2);
      for(let i=1;i<=3;i++) E.cmd('placeAlly',i,10+i*0.6,7);
      const ks=['boar','mantis','quillback','toad','moth','ram','mole'];
      const ids=ks.map((k,i)=>E.cmd('spawn',k,-6+i*2,0.2,{elite:false}));
      const el=['quillback','ram','moth'].map((k,i)=>E.cmd('spawn',k,-2.5+i*2.5,-2.4,{elite:true}));
      const m2=E.cmd('spawn','mole',4.6,-2.2);E.sim.stepN(1);E.cmd('burrow',m2,false);
      E.sim.stepN(2);E.sim.freeze();
      // face the camera (+z) for the portrait
      for(const e of E.state().enemies){} return {ids,el};})()`, 'spawn');
    await c.ev(`(()=>{for(const e of __echoes.cmd('contentState').hazards){}; const reg=__echoes.state().enemies; return reg.map(e=>e.kind+':'+e.x+','+e.z)})()`, 'where');
    await c.sleep(900);
    await c.shot('a');
  },
  // Each telegraph shape live: quillback lane, toad ring, ram cone, moth lane, mole ring.
  async tele(c) {
    await c.open('?scene=arena&seed=3&variant=' + opt('variant', '2'));
    await c.ev(`(()=>{const E=__echoes;E.cmd('teleport',0,0.6);
      for(const p of E.state().party) if(p.kind==='ally'){E.cmd('placeAlly',p.partyIndex,10.5,6.8);E.cmd('setHp',p.id,0);}
      const kinds=(${JSON.stringify(opt('kinds', 'quillback,toad,ram,moth,mole'))}).split(',');
      const pos=[[-4.2,0.4],[4.4,-1.2],[1.4,-0.6],[-3.2,-2.6],[2.8,2.6]];
      kinds.forEach((k,i)=>E.cmd('spawn',k,pos[i][0],pos[i][1]));return kinds;})()`, 'spawn');
    const want = Number(opt('want', '3'));
    for (let shot = 0; shot < 3; shot++) {
      await c.ev(`(async()=>{const t0=performance.now();while(performance.now()-t0<9000){
        const n=__echoes.state().enemies.filter(e=>e.telegraph).length+__echoes.state().party.filter(()=>false).length
          +(__echoes.content.render().globs||0);
        if(n>=${want}){__echoes.sim.freeze();return n;} __echoes.state().party[0] && __echoes.cmd('setHp',__echoes.state().party[0].id,1);
        await new Promise(r=>setTimeout(r,30));}return -1})()`, 'wait');
      await c.sleep(300);
      await c.shot('s' + shot);
      await c.ev(`(()=>({live:__echoes.state().enemies.filter(e=>e.telegraph).map(e=>e.kind+':'+JSON.stringify(e.telegraph)), fx:__echoes.state().vfx&&__echoes.state().vfx.archetypeTelegraphs}))()`, 'live');
      await c.ev(`__echoes.sim.thaw()`, 'thaw');
      await c.sleep(900);
    }
  },
  // Debug: one ram next to the player; freeze on its wind-up; list the shapes.
  async shapedbg(c) {
    await c.open('?scene=arena&seed=3&variant=1');
    await c.ev(`(()=>{const E=__echoes;E.cmd('teleport',0,0.6);
      for(const p of E.state().party) if(p.kind==='ally'){E.cmd('placeAlly',p.partyIndex,10.5,6.8);E.cmd('setHp',p.id,0);}
      return E.cmd('spawn',${JSON.stringify(opt('kind', 'ram'))},1.6,-0.6);})()`, 'spawn');
    await c.ev(`(async()=>{const t0=performance.now();while(performance.now()-t0<9000){
        const g=(__echoes.content.enemyfx()||{}).globs||0;
        if(__echoes.state().enemies.some(e=>e.telegraph)||g>0){await new Promise(r=>setTimeout(r,${Number(opt('delay', '250'))}));__echoes.sim.freeze();return __echoes.tick;}
        await new Promise(r=>setTimeout(r,20));}return -1})()`, 'wait');
    await c.sleep(400);
    await c.ev(`(()=>{const out=[];__arenaProbe.stage.scene.traverse(o=>{if(o.name&&o.name.startsWith('m4b-tele')){const p=o.getWorldPosition(new o.position.constructor());out.push({n:o.name,vis:o.visible,parentVis:o.parent&&o.parent.visible,x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2),kids:o.children.length});}});return {out,tel:__echoes.state().enemies.map(e=>e.telegraph)}})()`, 'shapes');
    await c.shot('a');
  },
  // A biome's dressing alone (?variant=N): frame + layout/builder state.
  async biome(c) {
    const v = opt('variant', '4');
    await c.open(`?scene=arena&seed=3&variant=${v}`);
    const at = opt('at', null);
    if (at) await c.ev(`__echoes.cmd('teleport',${at})`, 'teleport');
    await c.sleep(Number(opt('settle', '1500')));
    await c.ev(`(()=>({layout:__echoes.state().vfx.layout, propTypes:__echoes.state().vfx.propTypes, gl:__echoes.state().gl}))()`, 'layout');
    await c.shot('v' + v + (at ? '-at' : ''));
    await c.ev(`(async()=>{const R=__arenaProbe.stage.renderer;R.info.autoReset=false;R.info.reset();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const o={calls:R.info.render.calls,triangles:R.info.render.triangles,frames:R.info.render.frame};R.info.autoReset=true;
      const t0=performance.now();let n=0;await new Promise(r=>{function f(){n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else r();}requestAnimationFrame(f)});o.fps=Math.round(n/3);return o})()`, 'glinfo');
    // --hide <what>: A/B the frame with a layer class hidden (pools | glows | lights).
    const hide = opt('hide', '');
    if (hide) {
      await c.ev(`(()=>{let n=0;const S=__arenaProbe.stage.scene;S.traverse(o=>{const m=o.material;
        if(${JSON.stringify(hide)}==='pools'&&o.isMesh&&m&&m.blending===2&&o.rotation&&Math.abs(o.rotation.x+Math.PI/2)<1e-3&&o.geometry&&o.geometry.type==='CircleGeometry'){o.visible=false;n++;}
        if(${JSON.stringify(hide)}==='glows'&&o.isSprite){o.visible=false;n++;}
        if(${JSON.stringify(hide)}==='lights'&&o.isPointLight){o.visible=false;n++;}});return n})()`, 'hide');
      await c.sleep(300);
      await c.shot('v' + v + '-no' + hide);
    }
  },
  // A REAL run of act N (the G4b.7 combat frame): startRun({act}) from the
  // menu-skip camp, the run's own layout_enter swaps the dressing; wait for a
  // wave with >= 4 enemies incl. a new archetype (top up with spawns only if
  // the wave is short), push one of the room's hazards into its telegraph,
  // cast (RMB + 1 + 2) and shoot while an enemy telegraph is live.
  async run(c) {
    const act = Number(opt('act', '2'));
    await c.open(`?seed=${opt('seed', '7')}&menu=0&act=${act}`);
    // The realistic path: the camp idles while the act's dressings pre-build
    // (a player walks to the portal); --cold skips the wait (sync fallback).
    if (!argv.includes('--cold'))
      await c.ev(`(async()=>{const E=__echoes;const want=${JSON.stringify({ 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9] })}[${act}];const t0=performance.now();
        while(performance.now()-t0<20000){const L=E.cmd('arenaLayout');if(L&&want.every(i=>L.built.includes(i)))return {ms:Math.round(performance.now()-t0),built:L.built,maxSliceMs:L.maxSliceMs,worker:L.worker};await new Promise(r=>setTimeout(r,100));}
        return {timeout:true,L:E.cmd('arenaLayout')}})()`, 'prebuild');
    await c.ev(`(()=>{const E=__echoes;window.__c={ev:[]};for(const t of ['telegraph_start','layout_enter','room_enter','hazard_telegraph','hit','death'])E.on(t,e=>window.__c.ev.push(Object.assign({T:t},e)));
      const r=E.cmd('startRun',{act:${act}});return {room:r&&r.room,phase:r&&r.phase}})()`, 'startRun');
    await c.page.mouse.move(W / 2, H / 2);
    const NEW = ['quillback', 'toad', 'moth', 'ram', 'mole'];
    const wait = await c.ev(`(async()=>{const E=__echoes;const NEW=${JSON.stringify(NEW)};const t0=performance.now();
      while(performance.now()-t0<45000){const s=E.state();const r=s.run;
        if(r&&r.phase==='combat'&&s.enemies.length>=${Number(opt('min', '4'))}&&s.enemies.some(e=>NEW.includes(e.kind)))return {ok:true,ms:Math.round(performance.now()-t0),room:r.room,enemies:s.enemies.map(e=>e.kind)};
        await new Promise(r=>setTimeout(r,50));}
      const s=E.state();return {ok:false,phase:s.run&&s.run.phase,enemies:s.enemies.map(e=>e.kind)}})()`, 'wave');
    const at = opt('at', null);
    if (at) await c.ev(`(()=>{const E=__echoes;E.cmd('teleport',${at});const p=E.state().party;p.filter(q=>q.kind==='ally').forEach((q,i)=>E.cmd('placeAlly',q.partyIndex,${at.split(',')[0]}+(i-1)*1.1,${at.split(',')[1]}+0.9));return true})()`, 'teleport');
    const top = opt('top', '');
    await c.ev(`(()=>{const E=__echoes;const s=E.state();const out=[];const want=${JSON.stringify(top)}.split(',').filter(Boolean);
      const p=s.party.find(q=>q.kind!=='ally')||s.party[0];
      want.forEach((k,i)=>{const a=i*2.1+0.4;out.push(E.cmd('spawn',k,p.x+Math.cos(a)*4.2,p.z-Math.abs(Math.sin(a))*3.4-0.8));});
      return {spawned:out,layout:E.cmd('arenaLayout'),content:E.content.layout&&E.content.layout()}})()`, 'topup');
    await c.sleep(Number(opt('fight', '1800')));
    // An enemy telegraph with >= 30 ticks to run, THEN a hazard telegraph (60
    // ticks), so both are live in the frame.
    await c.ev(`(async()=>{const E=__echoes;const t0=performance.now();while(performance.now()-t0<8000){
        const live=window.__c.ev.filter(e=>e.T==='telegraph_start'&&e.resolveTick-E.tick>=30);
        if(live.length)return {tele:true,ms:Math.round(performance.now()-t0),live:live.map(e=>[e.kind,e.resolveTick-E.tick])};
        await new Promise(r=>setTimeout(r,16));}return {tele:false}})()`, 'tele');
    await c.ev(`(()=>{const E=__echoes;const hz=(E.content.hazards&&E.content.hazards())||[];const pick=hz.find(h=>h.kind==='hazard'&&h.htype===${JSON.stringify(opt('hz', ''))})||hz.find(h=>h.kind==='hazard'&&!['bramble','rockfall'].includes(h.htype));
      return pick?{forced:pick.htype,r:E.cmd('hazardPhase',pick.id,'telegraph')}:{forced:null,hz:hz.map(h=>h.htype)}})()`, 'hazard');
    await c.page.mouse.down({ button: 'right' });
    await c.key('Digit1', 60);
    await c.key('Digit2', 60);
    await c.sleep(Number(opt('delay', '200')));
    await c.shot('a' + act);
    const picks = opt('pick', '');
    if (picks) await c.ev(`(()=>{const out={};for(const xy of ${JSON.stringify(picks)}.split(';')){const [x,y]=xy.split(',').map(Number);out[xy]=__arenaProbe.pick(x,y,4);}
      const s=__echoes.state();out.azones=(s.azones||[]).map(z=>[z.skill,z.radius,+(z.x||0).toFixed(1),+(z.z||0).toFixed(1)]);out.zones=(s.zones||[]).map(z=>JSON.stringify(z).slice(0,120));
      out.hz=(__echoes.content.hazards()||[]).map(h=>[h.htype,h.phase,+h.x.toFixed(1),+h.z.toFixed(1)]);out.party=s.party.map(p=>[p.kind,+p.x.toFixed(1),+p.z.toFixed(1)]);return out;})()`, 'pick');
    await c.page.mouse.up({ button: 'right' });
    await c.ev(`(()=>{const E=__echoes;const s=E.state();return {fps:+E.fps.toFixed(1),room:s.run.room,layout:E.cmd('arenaLayout'),enemies:s.enemies.map(e=>[e.kind,+e.x.toFixed(1),+e.z.toFixed(1),e.telegraph?1:0]),hazards:(E.content.hazards()||[]).map(h=>h.htype+':'+h.phase),assets:(E.content.interactables()||[]).map(i=>i.itype),propTypes:s.vfx.propTypes,events:window.__c.ev.filter(e=>e.T==='layout_enter').map(e=>[e.room,e.layoutId,e.biome])}})()`, 'state');
  },
  // Layout placements (hazards + assets) in a layout.
  async layout(c) {
    const L = opt('layout', '1');
    await c.open(`?scene=arena&seed=3&layout=${L}`);
    await c.sleep(800);
    await c.ev(`(()=>({layout:__echoes.content.layout(), hz:__echoes.content.hazards().map(h=>h.htype+':'+h.phase), ia:__echoes.content.interactables().map(i=>i.itype), render:__echoes.content.render()}))()`, 'content');
    await c.shot('a');
    // force every hazard into its telegraph so the Ember shapes show
    await c.ev(`(()=>{for(const h of __echoes.content.hazards()) if(h.kind==='hazard'&&h.htype!=='bramble') __echoes.cmd('hazardPhase',h.id,'telegraph');return true})()`, 'force');
    await c.sleep(500);
    await c.shot('b');
  },
};

if (!SCEN[scenario]) {
  console.error(`unknown scenario '${scenario}'. known: ${Object.keys(SCEN).join(', ')}`);
  process.exit(2);
}
await run(scenario, SCEN[scenario]);
