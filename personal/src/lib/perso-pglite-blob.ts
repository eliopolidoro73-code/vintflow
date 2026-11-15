import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { head, put } from "@vercel/blob";

const execFileAsync = promisify(execFile);

export const PERSO_PGDATA_DIR =
  process.env.PERSO_PGDATA_DIR?.trim() || "/tmp/vintflow-perso-pgdata";

const BLOB_PATH = "perso/pglite-snapshot.tar.gz";

let persistTimer: ReturnType<typeof setTimeout> | undefined;
let persistInFlight = false;

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function restorePersoPgdataFromBlob(): Promise<void> {
  if (!process.env.VERCEL) return;

  const meta = await head(BLOB_PATH).catch(() => null);
  if (!meta?.url) return;

  const work = await mkdtemp(join(tmpdir(), "vf-restore-"));
  const archive = join(work, "snapshot.tar.gz");
  try {
    const res = await fetch(meta.url);
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(archive, buf);
    await rm(PERSO_PGDATA_DIR, { recursive: true, force: true });
    await mkdir(PERSO_PGDATA_DIR, { recursive: true });
    await execFileAsync("tar", ["-xzf", archive, "-C", PERSO_PGDATA_DIR]);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export async function persistPersoPgdataToBlob(): Promise<void> {
  if (!process.env.VERCEL) return;
  if (persistInFlight) return;
  if (!(await pathExists(PERSO_PGDATA_DIR))) return;

  persistInFlight = true;
  const work = await mkdtemp(join(tmpdir(), "vf-snap-"));
  const archive = join(work, "snapshot.tar.gz");
  try {
    await execFileAsync("tar", [
      "-czf",
      archive,
      "-C",
      PERSO_PGDATA_DIR,
      ".",
    ]);
    const body = await readFile(archive);
    await put(BLOB_PATH, body, {
      access: "private",
      addRandomSuffix: false,
    });
  } finally {
    persistInFlight = false;
    await rm(work, { recursive: true, force: true });
  }
}

export function schedulePersoPgdataPersist(): void {
  if (!process.env.VERCEL) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistPersoPgdataToBlob();
  }, 1500);
}