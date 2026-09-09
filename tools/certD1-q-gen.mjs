// certD1 (4th instance) generator: reuses the LIB eval from the previous instance's action files and adds a
// WebGL renderer-identity probe so headless numbers can be labelled SwiftShader vs GPU-backed.
import { readFileSync, writeFileSync } from 'fs';
const base = JSON.parse(readFileSync('tools/actions/certD1-n-camp-idle.json', 'utf8'));
const LIB = base[0]; const LOAD = base[1]; const VER = base[2];
const ev = (code) => ({ type: 'eval', code });
const iife = (b) => `(()=>{const E=window.__echoes;${b}})()`;
const GPU = ev(iife(`const r={};try{const c=document.querySelector('canvas');const gl=c.getContext('webgl2')||c.getContext('webgl');const d=gl.getExtension('WEBGL_debug_renderer_info');r.renderer=d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);r.vendor=d?gl.getParameter(d.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR);r.version=gl.getParameter(gl.VERSION);r.canvas=[c.width,c.height];r.dpr=devicePixelRatio;r.maxTex=gl.getParameter(gl.MAX_TEXTURE_SIZE);}catch(e){r.err=String(e).slice(0,120);}try{const st=window.__arenaProbe.stage;r.threeRenderer=st.renderer.capabilities&&{isWebGL2:st.renderer.capabilities.isWebGL2,precision:st.renderer.capabilities.precision,maxSamples:st.renderer.capabilities.maxSamples};r.pixelRatio=st.renderer.getPixelRatio();const sz=st.renderer.getSize(new (Object.getPrototypeOf(st.camera.position).constructor)(0,0,0));r.rendererSize=[sz.x,sz.y];}catch(e){r.err2=String(e).slice(0,120);}r.tick=E.tick;r.fps=E.fps;r.ua=navigator.userAgent.slice(0,90);return r`));
writeFileSync('tools/actions/certD1-q-gpu.json', JSON.stringify([LIB, LOAD, GPU, VER], null, 1));
console.log('wrote tools/actions/certD1-q-gpu.json');
