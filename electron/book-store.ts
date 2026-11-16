import { ipcMain, shell } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Books live as plain files, one folder per book:
 *   <root>/books/<id>/meta.json, book.json, annotations.json, source.<epub|pdf>
 * The renderer only ever sends ids and JSON; every path is built here.
 */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_EXT = new Set(['epub', 'pdf']);

interface WithId {
  id?: unknown;
  bookId?: unknown;
}

export async function registerStoreHandlers(root: string): Promise<void> {
  const booksDir = path.join(root, 'books');
  await fs.mkdir(booksDir, { recursive: true });

  const bookDir = (id: unknown): string => {
    if (typeof id !== 'string' || !ID.test(id)) throw new Error(`Invalid book id: ${String(id)}`);
    return path.join(booksDir, id);
  };

  const readAll = async (file: string): Promise<unknown[]> => {
    const ids = (await fs.readdir(booksDir, { withFileTypes: true })).filter((d) => d.isDirectory() && ID.test(d.name));
    const values = await Promise.all(ids.map((d) => readJson(path.join(booksDir, d.name, file))));
    return values.filter((v) => v !== null);
  };

  ipcMain.handle('store:location', () => root);
  ipcMain.handle('store:list-books', () => readAll('meta.json'));
  ipcMain.handle('store:list-annotations', () => readAll('annotations.json'));
  ipcMain.handle('store:get-book', (_e, id: unknown) => readJson(path.join(bookDir(id), 'book.json')));
  ipcMain.handle('store:get-annotations', (_e, id: unknown) => readJson(path.join(bookDir(id), 'annotations.json')));

  ipcMain.handle('store:save-book', async (_e, book: WithId & { chapters?: unknown }, source?: { ext: unknown; bytes: ArrayBuffer }) => {
    const dir = bookDir(book.id);
    await fs.mkdir(dir, { recursive: true });
    const { chapters: _chapters, ...meta } = book;
    await writeJson(path.join(dir, 'book.json'), book, false);
    await writeJson(path.join(dir, 'meta.json'), meta, true);
    if (source && typeof source.ext === 'string' && SOURCE_EXT.has(source.ext)) {
      await fs.writeFile(path.join(dir, `source.${source.ext}`), Buffer.from(source.bytes));
    }
  });

  ipcMain.handle('store:get-source', async (_e, id: unknown) => {
    const dir = bookDir(id);
    for (const ext of SOURCE_EXT) {
      try {
        return { ext, bytes: new Uint8Array(await fs.readFile(path.join(dir, `source.${ext}`))) };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      }
    }
    return null;
  });

  // Re-parse result: the current parse is kept as book.prev.json, then text and annotations are replaced.
  ipcMain.handle('store:replace-book', async (_e, book: WithId & { chapters?: unknown }, ann: WithId) => {
    const dir = bookDir(book.id);
    if (ann.bookId !== book.id) throw new Error('Annotations belong to another book');
    await fs.copyFile(path.join(dir, 'book.json'), path.join(dir, 'book.prev.json'));
    const { chapters: _chapters, ...meta } = book;
    await writeJson(path.join(dir, 'book.json'), book, false);
    await writeJson(path.join(dir, 'meta.json'), meta, true);
    await writeJson(path.join(dir, 'annotations.json'), ann, true);
  });

  ipcMain.handle('store:save-annotations', async (_e, ann: WithId) => {
    const dir = bookDir(ann.bookId);
    await fs.access(dir); // only for books that exist
    await writeJson(path.join(dir, 'annotations.json'), ann, true);
  });

  // Deleting a book moves its folder to the Recycle Bin, so it can still be recovered.
  ipcMain.handle('store:delete-book', (_e, id: unknown) => shell.trashItem(bookDir(id)));
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

/** Writes are serialized per file and atomic (temp file + rename), so a crash never leaves half a file. */
const queues = new Map<string, Promise<void>>();

function writeJson(file: string, value: unknown, pretty: boolean): Promise<void> {
  const run = async () => {
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value, null, pretty ? 2 : undefined), 'utf8');
    await renameWithRetry(tmp, file);
  };
  const next = (queues.get(file) ?? Promise.resolve()).then(run, run);
  queues.set(file, next.catch(() => undefined));
  return next;
}

/** Windows can briefly lock a file (antivirus, OneDrive sync); retry a few times. */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (attempt >= 4 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) throw e;
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
    }
  }
}
