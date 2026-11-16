import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * A small round button that floats over every app. Click it to bring the reading window
 * up or put it away; drag it anywhere; right-click for the menu. Its position is remembered.
 */
const SIZE = 56;
const DRAG_THRESHOLD = 4;

export interface ReaderControl {
  toggle: () => void;
  isVisible: () => boolean;
  quit: () => void;
}

const page = `<!doctype html><html><head><meta charset="utf-8"><title>Book Carve – nút nổi</title><style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden;user-select:none}
button{all:unset;position:absolute;inset:6px;border-radius:50%;background:#1f1d1a;display:grid;place-items:center;cursor:pointer;
box-shadow:0 2px 8px rgb(0 0 0/.35);transition:transform .12s}
button:hover{transform:scale(1.06)}button:active{cursor:grabbing}
</style></head><body><button aria-label="Mở hoặc ẩn Book Carve" title="Book Carve: bấm để mở/ẩn, kéo để di chuyển, chuột phải để xem thêm">
<svg width="24" height="26" viewBox="0 0 24 26"><rect x="2" y="1" width="20" height="24" rx="3" fill="#fffdf8"/>
<rect x="5" y="5" width="14" height="2" rx="1" fill="#ddd6c8"/><rect x="5" y="9" width="14" height="2.6" rx="1.3" fill="#1f1d1a"/>
<rect x="4" y="13.5" width="16" height="5" rx="1" fill="#d6e6f7"/><rect x="4" y="13.5" width="1.6" height="5" fill="#2f6fb0"/>
<rect x="5" y="21" width="9" height="2" rx="1" fill="#ddd6c8"/></svg></button>
<script>
const b=document.querySelector('button');
b.addEventListener('pointerdown',e=>{if(e.button!==0)return;b.setPointerCapture(e.pointerId);window.bubble.down();});
b.addEventListener('pointerup',e=>{if(e.button!==0)return;window.bubble.up();});
b.addEventListener('contextmenu',e=>{e.preventDefault();window.bubble.menu();});
</script></body></html>`;

export async function createBubble(here: string, reader: ReaderControl): Promise<BrowserWindow> {
  const store = path.join(app.getPath('userData'), 'bubble.json');
  const start = placeOnScreen(await readPosition(store));

  const bubble = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    x: start.x,
    y: start.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    webPreferences: { preload: path.join(here, 'bubble-preload.cjs'), contextIsolation: true, sandbox: true },
  });
  bubble.setAlwaysOnTop(true, 'floating');
  bubble.setVisibleOnAllWorkspaces(true);
  void bubble.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`);

  // Dragging follows the system cursor from the main process, so a fast flick never loses the button.
  let drag: { dx: number; dy: number; sx: number; sy: number; moved: boolean; timer?: ReturnType<typeof setInterval> } | null = null;

  ipcMain.on('bubble:down', () => {
    if (drag) clearInterval(drag.timer);
    const c = screen.getCursorScreenPoint();
    const [x, y] = bubble.getPosition();
    const d: NonNullable<typeof drag> = { dx: c.x - x, dy: c.y - y, sx: c.x, sy: c.y, moved: false };
    d.timer = setInterval(() => {
      const p = screen.getCursorScreenPoint();
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > DRAG_THRESHOLD) d.moved = true;
      if (d.moved) bubble.setPosition(p.x - d.dx, p.y - d.dy);
    }, 16);
    drag = d;
  });

  ipcMain.on('bubble:up', () => {
    if (!drag) return;
    clearInterval(drag.timer);
    const moved = drag.moved;
    drag = null;
    if (!moved) return reader.toggle();
    const [x, y] = bubble.getPosition();
    void fs.writeFile(store, JSON.stringify({ x, y })).catch(() => undefined);
  });

  ipcMain.on('bubble:menu', () => {
    Menu.buildFromTemplate([
      { label: reader.isVisible() ? 'Ẩn cửa sổ đọc' : 'Mở cửa sổ đọc', click: reader.toggle },
      { type: 'separator' },
      { label: 'Thoát Book Carve', click: reader.quit },
    ]).popup({ window: bubble });
  });

  return bubble;
}

async function readPosition(file: string): Promise<{ x: number; y: number } | null> {
  try {
    const p = JSON.parse(await fs.readFile(file, 'utf8'));
    return Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
  } catch {
    return null;
  }
}

/** Keeps the button on a connected screen; first run puts it near the bottom-right corner. */
function placeOnScreen(saved: { x: number; y: number } | null): { x: number; y: number } {
  const fallback = screen.getPrimaryDisplay().workArea;
  if (!saved) return { x: fallback.x + fallback.width - SIZE - 24, y: fallback.y + fallback.height - SIZE - 120 };
  const area = screen.getDisplayMatching({ ...saved, width: SIZE, height: SIZE }).workArea;
  return {
    x: Math.min(Math.max(saved.x, area.x), area.x + area.width - SIZE),
    y: Math.min(Math.max(saved.y, area.y), area.y + area.height - SIZE),
  };
}
