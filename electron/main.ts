import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerStoreHandlers } from './book-store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BOOK_CARVE_DATA || 'E:\\BookCarve\\data';

let win: BrowserWindow | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'Book Carve',
    backgroundColor: '#f7f5f0',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // The app never navigates or opens windows; web links go to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(path.join(here, '..', 'dist', 'index.html'));
  win.on('closed', () => (win = null));
}

// One instance only: two windows writing the same files would overwrite each other.
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    await registerStoreHandlers(DATA_DIR);
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
