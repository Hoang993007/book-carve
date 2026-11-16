// Renders build/icon.svg to build/icon.png (512px, transparent corners) using Electron itself.
// Run: pnpm icon
import { app, BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';

const SIZE = 512;

app.whenReady().then(async () => {
  const svg = readFileSync('build/icon.svg', 'utf8').replace('<svg ', `<svg width="${SIZE}" height="${SIZE}" `);
  const html = `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden">${svg}</body></html>`;
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true },
  });
  win.webContents.setZoomFactor(1);
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 300));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  const png = image.resize({ width: SIZE, height: SIZE, quality: 'best' }).toPNG();
  writeFileSync('build/icon.png', png);
  console.log(`Wrote build/icon.png (${image.getSize().width}x${image.getSize().height} captured)`);
  app.quit();
});
