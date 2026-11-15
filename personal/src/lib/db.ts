import { readdir, readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import {
  PERSO_PGDATA_DIR,
  restorePersoPgdataFromBlob,
  schedulePersoPgdataPersist,
} from "@/lib/perso-pglite-blob";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

const globalForDb = globalThis as unknown as {
  __vintflowPool?: pg.Pool;
  __vintflowPglite?: Promise<PGlite>;
  __vintflowPgRestoreDone?: boolean;
};

function isWriteQuery(text: string): boolean {
  return /^\s*(insert|update|delete|create|alter|drop|truncate)/i.test(
    text.trim(),
  );
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    globalForDb.__vintflowPool ??= new pg.Pool({
      connectionString: databaseUrl,
      max: 5,
    });
    const res = await globalForDb.__vintflowPool.query(text, params);
    return res.rows as T[];
  }

  globalForDb.__vintflowPglite ??= startLocal().catch((error: unknown) => {
    globalForDb.__vintflowPglite = undefined;
    throw error;
  });

  const db = await globalForDb.__vintflowPglite;
  const res = await db.query<T>(text, params);
  if (process.env.VERCEL && isWriteQuery(text)) {
    schedulePersoPgdataPersist();
  }
  return res.rows;
}

async function startLocal(): Promise<PGlite> {
  if (process.env.VERCEL && !globalForDb.__vintflowPgRestoreDone) {
    globalForDb.__vintflowPgRestoreDone = true;
    await restorePersoPgdataFromBlob();
  }

  let dataDir: string | undefined;
  if (process.env.VERCEL) {
    try {
      await access(PERSO_PGDATA_DIR);
      dataDir = PERSO_PGDATA_DIR;
    } catch {
      dataDir = PERSO_PGDATA_DIR;
    }
  }

  const db = dataDir ? new PGlite(dataDir) : new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}