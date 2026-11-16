import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerStoreHandlers } from './book-store.js';
import { createBubble } from './bubble.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BOOK_CARVE_DATA || 'E:\\BookCarve\\data';

let win: BrowserWindow | null = null;
let quitting = false;

function createWindow(): BrowserWindow {
  const w = new BrowserWindow({
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
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  w.webContents.on('will-navigate', (e) => e.preventDefault());

  // Closing only puts the reader away; the floating button brings it back where you left off.
  w.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    w.hide();
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) void w.loadURL(devUrl);
  else void w.loadFile(path.join(here, '..', 'dist', 'index.html'));
  w.on('closed', () => (win = null));
  return w;
}

function showReader(): void {
  if (!win) win = createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/** Bubble click: put the reader away when it is in front, otherwise bring it up. */
function toggleReader(): void {
  if (win && win.isVisible() && !win.isMinimized() && win.isFocused()) win.hide();
  else showReader();
}

function quit(): void {
  quitting = true;
  app.quit();
}

// A custom data folder (tests, a second library) gets its own profile, so it is not
// blocked by the single-instance lock of the everyday app.
if (process.env.BOOK_CARVE_DATA) app.setPath('userData', path.join(DATA_DIR, '.profile'));

// One instance per data folder: two windows writing the same files would overwrite each other.
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', showReader);
  app.on('before-quit', () => (quitting = true));

  app.whenReady().then(async () => {
    await registerStoreHandlers(DATA_DIR);
    win = createWindow();
    await createBubble(here, { toggle: toggleReader, isVisible: () => Boolean(win?.isVisible()), quit });
  });

  app.on('window-all-closed', () => app.quit());
}
