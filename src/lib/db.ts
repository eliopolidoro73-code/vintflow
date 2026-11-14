import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

const globalForDb = globalThis as unknown as {
  __vintflowPool?: pg.Pool;
  __vintflowPglite?: Promise<PGlite>;
};

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
  return res.rows;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
