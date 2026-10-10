import { promises as fs } from "node:fs";
import path from "node:path";

// Dependency-free JSON file store — the local-first persistence layer for the
// MVP. Each collection is one JSON array file under `.data/`. This is a
// deliberate stand-in for Postgres: the repo modules on top expose an async
// interface identical to what a real DB adapter would, so swapping to Neon
// later is an implementation change here, not a change to callers.

const DATA_DIR = path.join(process.cwd(), ".data");

// Serialize writes per collection so concurrent requests in this single Node
// process can't clobber each other's read-modify-write cycles.
const locks = new Map<string, Promise<unknown>>();

function fileFor(collection: string) {
  return path.join(DATA_DIR, `${collection}.json`);
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Read a collection as an array. Missing/corrupt files read as empty. */
export async function readCollection<T>(collection: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(fileFor(collection), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeCollection<T>(collection: string, rows: T[]): Promise<void> {
  await ensureDir();
  const file = fileFor(collection);
  // Write to a temp file then rename so a crash mid-write can't truncate the
  // live collection (rename is atomic on the same volume).
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await fs.rename(tmp, file);
}

/**
 * Run a read-modify-write against a collection under its lock. The mutator
 * receives the current rows and returns `{ rows, result }`: `rows` is persisted
 * and `result` is handed back to the caller.
 */
export async function mutateCollection<T, R>(
  collection: string,
  mutator: (rows: T[]) => { rows: T[]; result: R } | Promise<{ rows: T[]; result: R }>,
): Promise<R> {
  const prior = locks.get(collection) ?? Promise.resolve();
  const run = prior.then(async () => {
    const rows = await readCollection<T>(collection);
    const { rows: next, result } = await mutator(rows);
    await writeCollection(collection, next);
    return result;
  });
  // Keep the chain alive even if this link rejects, so one failure doesn't
  // wedge the collection forever.
  locks.set(
    collection,
    run.catch(() => undefined),
  );
  return run;
}
