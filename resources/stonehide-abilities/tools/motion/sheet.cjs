// sheet.cjs <glb> <out.png> <clip> <t,t,t...> [views] [bare]: one still strip of a clip
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const [glb,out,clip,ts,views='q,s',bare='0']=process.argv.slice(2);
const root=__dirname; const types={'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.mjs':'text/javascript'};
const srv=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return;}s.writeHead(200,{'content-type':types[path.extname(p)]||'application/octet-stream'});s.end(d);});});
srv.listen(0,async()=>{const port=srv.address().port;
 const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const jobs=clip==='@'?JSON.parse(fs.readFileSync(ts,'utf8')):[{clip,t:ts,out,views,bare}];
 for(const j of jobs){const n=String(j.t).split(',').length, v=(j.views||views).split(',').length;
  const p=await b.newPage({viewport:{width:230*n,height:250*v}});
  p.on('pageerror',e=>console.log('err',e.message));
  await p.goto(`http://127.0.0.1:${port}/viewer.html?glb=${encodeURIComponent(j.glb||glb)}&clip=${j.clip}&t=${j.t}&views=${j.views||views}&bare=${j.bare||bare}`);
  await p.waitForFunction(()=>document.title==='DONE'||document.title==='NOCLIP',null,{timeout:120000});
  await p.screenshot({path:j.out}); await p.close(); console.log(j.clip,'->',j.out);}
 await b.close();srv.close();});
