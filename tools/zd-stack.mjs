import puppeteer from 'puppeteer';
const url = process.argv[2] ?? 'http://127.0.0.1:5199';
const b = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.stack || e.message));
await p.goto(url, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
await b.close();
