import { app } from 'electron';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Where the library lives, first match wins:
 * 1. the BOOK_CARVE_DATA environment variable (tests, a second library);
 * 2. `dataDir` (a full path) in config.json in the app's profile folder (%APPDATA%\Book Carve on Windows);
 * 3. Documents\BookCarve.
 */
export function resolveDataDir(): string {
  const env = process.env.BOOK_CARVE_DATA;
  if (env) return env;
  try {
    const config = JSON.parse(readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8')) as { dataDir?: unknown };
    // Only full paths: a relative one would quietly resolve against wherever the app was started.
    if (typeof config.dataDir === 'string' && path.isAbsolute(config.dataDir)) return config.dataDir;
  } catch {
    // No config file, or not valid JSON: use the default.
  }
  return path.join(app.getPath('documents'), 'BookCarve');
}
