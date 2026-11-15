import { head, put } from "@vercel/blob";
import type { PGlite } from "@electric-sql/pglite";
import { waitUntil } from "@vercel/functions";

const BLOB_PATH = "perso/database-export.json";

const TABLE_ORDER = [
  "users",
  "connected_accounts",
  "inventory_items",
  "sales",
  "messages",
  "sourcing_lots",
  "expenses",
  "app_config",
  "rate_limits",
  "revoked_tokens",
] as const;

type TableName = (typeof TABLE_ORDER)[number];

type DatabaseExport = Partial<Record<TableName, Record<string, unknown>[]>>;

let persistInFlight = false;

async function fetchExport(): Promise<DatabaseExport | null> {
  const meta = await head(BLOB_PATH).catch(() => null);
  if (!meta?.url) return null;
  const res = await fetch(meta.url);
  if (!res.ok) return null;
  return (await res.json()) as DatabaseExport;
}

async function insertRows(
  db: PGlite,
  table: TableName,
  rows: Record<string, unknown>[],
): Promise<void> {
  for (const row of rows) {
    const keys = Object.keys(row).filter((k) => row[k] !== undefined);
    if (keys.length === 0) continue;
    const cols = keys.join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = keys.map((k) => {
      const v = row[k];
      if (v !== null && typeof v === "object") return JSON.stringify(v);
      return v;
    });
    await db.query(
      `insert into ${table} (${cols}) values (${placeholders})`,
      values,
    );
  }
}

export async function restorePersoDatabaseFromBlob(
  db: PGlite,
): Promise<boolean> {
  if (!process.env.VERCEL) return false;
  try {
    const data = await fetchExport();
    if (!data) return false;
    for (const table of [...TABLE_ORDER].reverse()) {
      await db.exec(`delete from ${table}`);
    }
    for (const table of TABLE_ORDER) {
      const rows = data[table];
      if (!rows?.length) continue;
      await insertRows(db, table, rows);
    }
    return true;
  } catch {
    return false;
  }
}

export async function persistPersoDatabaseToBlob(db: PGlite): Promise<void> {
  if (!process.env.VERCEL || persistInFlight) return;
  persistInFlight = true;
  try {
    const payload: DatabaseExport = {};
    for (const table of TABLE_ORDER) {
      const res = await db.query(`select * from ${table}`);
      payload[table] = res.rows as Record<string, unknown>[];
    }
    await put(BLOB_PATH, JSON.stringify(payload), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } finally {
    persistInFlight = false;
  }
}

export function schedulePersoDatabasePersist(db: PGlite): void {
  if (!process.env.VERCEL) return;
  waitUntil(
    persistPersoDatabaseToBlob(db).catch(() => {
      /* ignore background persistence errors */
    }),
  );
}