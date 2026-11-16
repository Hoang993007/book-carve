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
    // Packaged builds take the icon embedded in the exe; dev runs need it spelled out.
    ...(app.isPackaged ? {} : { icon: path.join(here, '..', 'build', 'icon.png') }),
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

// A custom data folder (tests, a second library) gets its own profile, so it is not
// blocked by the single-instance lock of the everyday app.
if (process.env.BOOK_CARVE_DATA) app.setPath('userData', path.join(DATA_DIR, '.profile'));

// One instance per data folder: two windows writing the same files would overwrite each other.
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
