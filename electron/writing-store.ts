import { ipcMain, shell } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readJson, writeJson, writeText } from './fs-utils.js';

/**
 * Your own writing lives as plain files, readable in any editor:
 *   <root>/writing/works/<id>/work.json          title, status, chapter order
 *   <root>/writing/works/<id>/parts/<part>.md    one file per chapter
 *   <root>/writing/works/<id>/notebook.md        characters, outline, research
 *   <root>/writing/works/<id>/removed/           chapters taken out of the work
 *   <root>/writing/ideas.json                    loose ideas
 * The renderer sends ids only; every path is built here.
 */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTEBOOK = 'notebook';

const checkId = (id: unknown): string => {
  if (typeof id !== 'string' || !ID.test(id)) throw new Error(`Invalid id: ${String(id)}`);
  return id;
};

export async function registerWritingHandlers(root: string): Promise<void> {
  const worksDir = path.join(root, 'writing', 'works');
  const ideasFile = path.join(root, 'writing', 'ideas.json');
  await fs.mkdir(worksDir, { recursive: true });

  const workDir = (id: unknown) => path.join(worksDir, checkId(id));
  const textFile = (workId: unknown, part: unknown) =>
    part === NOTEBOOK ? path.join(workDir(workId), 'notebook.md') : path.join(workDir(workId), 'parts', `${checkId(part)}.md`);

  ipcMain.handle('writing:list-works', async () => {
    const dirs = (await fs.readdir(worksDir, { withFileTypes: true })).filter((d) => d.isDirectory() && ID.test(d.name));
    const works = await Promise.all(dirs.map((d) => readJson(path.join(worksDir, d.name, 'work.json'))));
    return works.filter((w) => w !== null);
  });

  ipcMain.handle('writing:get-work', (_e, id: unknown) => readJson(path.join(workDir(id), 'work.json')));

  ipcMain.handle('writing:save-work', async (_e, work: { id?: unknown }) => {
    const dir = workDir(work.id);
    await fs.mkdir(path.join(dir, 'parts'), { recursive: true });
    await writeJson(path.join(dir, 'work.json'), work, true);
  });

  ipcMain.handle('writing:get-text', async (_e, workId: unknown, part: unknown) => {
    try {
      return await fs.readFile(textFile(workId, part), 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return '';
      throw e;
    }
  });

  ipcMain.handle('writing:save-text', async (_e, workId: unknown, part: unknown, text: unknown) => {
    if (typeof text !== 'string') throw new Error('Text must be a string');
    const file = textFile(workId, part);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await writeText(file, text);
  });

  // A removed chapter is moved aside, never deleted.
  ipcMain.handle('writing:remove-part', async (_e, workId: unknown, partId: unknown) => {
    const file = textFile(workId, checkId(partId));
    const removed = path.join(workDir(workId), 'removed');
    await fs.mkdir(removed, { recursive: true });
    try {
      await fs.rename(file, path.join(removed, `${partId}-${Date.now()}.md`));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
  });

  ipcMain.handle('writing:delete-work', (_e, id: unknown) => shell.trashItem(workDir(id)));

  ipcMain.handle('writing:reveal', async (_e, id: unknown) => {
    const error = await shell.openPath(workDir(id));
    if (error) throw new Error(error);
  });

  ipcMain.handle('writing:get-ideas', async () => (await readJson(ideasFile)) ?? []);
  ipcMain.handle('writing:save-ideas', async (_e, ideas: unknown) => {
    if (!Array.isArray(ideas)) throw new Error('Ideas must be a list');
    await writeJson(ideasFile, ideas, true);
  });
}
