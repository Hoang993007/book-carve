import { promises as fs } from 'node:fs';

export async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

/** Writes are serialized per file and atomic (temp file + rename), so a crash never leaves half a file. */
const queues = new Map<string, Promise<void>>();

export function writeJson(file: string, value: unknown, pretty: boolean): Promise<void> {
  return writeText(file, JSON.stringify(value, null, pretty ? 2 : undefined));
}

export function writeText(file: string, text: string): Promise<void> {
  const run = async () => {
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, text, 'utf8');
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
