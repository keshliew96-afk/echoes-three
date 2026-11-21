// mvid.cjs <spec.json> <out.mp4>: renders mvid.html frame by frame (fps, slow factor, tail hold) and encodes it
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const [specF,out]=process.argv.slice(2); const S=JSON.parse(fs.readFileSync(specF,'utf8'));
const root=__dirname; const types={'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.mjs':'text/javascript'};
const srv=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return;}s.writeHead(200,{'content-type':types[path.extname(p)]||'application/octet-stream'});s.end(d);});});
srv.listen(0,async()=>{const port=srv.address().port;
 const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const CW=S.cw||480,CH=S.ch||480,nv=(S.views||['q']).length;
 const p=await b.newPage({viewport:{width:CW*S.panels.length,height:CH*nv}});
 p.on('pageerror',e=>console.log('err',e.message)); p.on('console',m=>{if(m.type()==='error')console.log('console',m.text())});
 await p.goto(`http://127.0.0.1:${port}/mvid.html?spec=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`);
 await p.waitForFunction(()=>document.title==='READY'||document.title.startsWith('NOCLIP'),null,{timeout:180000});
 const tt=await p.title(); if(tt!=='READY'){console.log(tt);process.exit(1);}
 const dur=(S.dur||await p.evaluate(()=>window.dur))+(S.hold??0.3), fps=S.fps||30, slow=S.slow||1;
 const dir=out+'.frames'; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
 const N=Math.round(dur*fps*slow)+1;
 for(let i=0;i<N;i++){ await p.evaluate(t=>window.setT(t), i/(fps*slow)); await p.screenshot({path:`${dir}/${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:90}); }
 await b.close(); srv.close();
 execFileSync('ffmpeg',['-loglevel','error','-y','-framerate',String(fps),'-i',`${dir}/%04d.jpg`,'-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2','-c:v','libx264','-pix_fmt','yuv420p','-crf','23','-preset','slow','-movflags','+faststart','-an',out]);
 console.log(out, N, 'frames');
});
