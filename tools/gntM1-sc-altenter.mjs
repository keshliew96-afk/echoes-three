// Alt+Enter toggles fullscreen anywhere — in play (no screen open) and in a
// menu — and never reaches the game or the menu as Enter.
export default async function (h) {
  const { ev, sleep, log, waitFor, page } = h;
  await waitFor(() => window.__echoes && __echoes.app.state === 'playing' && __echoes.tick > 60, { timeout: 90000 });
  const combo = async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Alt');
    await sleep(450);
    return ev(() => ({ fs: !!document.fullscreenElement, setting: __echoes.settings.get('display.fullscreen'), stack: __echoes.app.stack() }));
  };
  const play1 = await combo();
  const play2 = await combo();
  await ev(() => {
    __echoes.app.open('settings');
    return true;
  });
  await sleep(300);
  const menu1 = await combo();
  const menu2 = await combo();
  log('altenter', { play1, play2, menu1, menu2 });
  log('verdict', { play: play1.fs && !play2.fs, menu: menu1.fs && !menu2.fs && menu2.stack.join() === 'settings' });
}
