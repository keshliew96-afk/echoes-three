// fix-M3-r3: production build of the working tree with src/ui/menu/tabs/audio.js
// swapped for the file given in GNT_AUDIO_TAB (the pre-fix HEAD copy) — a BEFORE
// build for tools/gntfixM33-reveal.mjs without touching src/** on the dev server.
//   GNT_AUDIO_TAB=<file> npx vite build --config tools/gntfixM33-vite-before.mjs --outDir dist-gntfixM33-before
import fs from 'node:fs';
import path from 'node:path';
import base from '../vite.config.js';

const swap = process.env.GNT_AUDIO_TAB;
const root = path.resolve(import.meta.dirname, '..');
const target = path.resolve(root, 'src', 'ui', 'menu', 'tabs', 'audio.js');
export default {
  ...base,
  root,
  plugins: [
    {
      name: 'gntfixM33-swap-audio-tab',
      enforce: 'pre',
      load(id) {
        if (swap && path.resolve(id.split('?')[0]) === target) return fs.readFileSync(swap, 'utf8');
        return null;
      },
    },
  ],
};
