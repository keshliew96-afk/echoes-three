#!/usr/bin/env node
// Diagnose why a title boot keeps puppeteer's networkidle2 waiting: list the
// requests still in flight N seconds after navigation.
import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://127.0.0.1:5199/';
const browser = await puppeteer.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--window-size=1600,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
const inflight = new Map();
const t0 = Date.now();
page.on('request', (r) => inflight.set(r, { url: r.url().slice(0, 140), type: r.resourceType(), t: Date.now() - t0 }));
page.on('requestfinished', (r) => inflight.delete(r));
page.on('requestfailed', (r) => inflight.delete(r));
page.goto(url, { waitUntil: 'load', timeout: 180000 }).then(() => console.log('load at', Date.now() - t0));
for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  console.log(`t=${Date.now() - t0} inflight=${inflight.size}`, JSON.stringify([...inflight.values()].slice(0, 8)));
}
await browser.close();
