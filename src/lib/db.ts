import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seedDatabase } from "@/lib/seed";

type SqlParams = Array<string | number | null>;

type Store = {
  exec(sql: string): void;
  run(sql: string, params?: SqlParams): void;
  get<T>(sql: string, params?: SqlParams): T | undefined;
  all<T>(sql: string, params?: SqlParams): T[];
  close(): void;
};

const globalStore = globalThis as unknown as { __driftwood?: Store; __driftwoodPath?: string };

function wrap(db: DatabaseSync): Store {
  return {
    exec(sql) {
      db.exec(sql);
    },
    run(sql, params = []) {
      db.prepare(sql).run(...params);
    },
    get<T>(sql: string, params: SqlParams = []) {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    all<T>(sql: string, params: SqlParams = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    close() {
      db.close();
    },
  };
}

export function databasePath(): string {
  if (process.env.DW_DB_PATH) return process.env.DW_DB_PATH;
  return path.join(process.cwd(), "data", "driftwood.sqlite");
}

function migrate(store: Store) {
  store.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      number TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      status TEXT NOT NULL,
      placed_at TEXT NOT NULL,
      delivered_at TEXT,
      promised_at TEXT,
      shipping_method TEXT NOT NULL,
      city TEXT NOT NULL,
      region TEXT NOT NULL,
      country TEXT NOT NULL,
      postal TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      tracking_number TEXT,
      carrier TEXT,
      total_cents INTEGER NOT NULL,
      items_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shipment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL,
      at TEXT NOT NULL,
      code TEXT NOT NULL,
      label TEXT NOT NULL,
      location TEXT NOT NULL,
      detail TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      customer_email TEXT,
      status TEXT NOT NULL,
      verified_json TEXT NOT NULL,
      fail_streak INTEGER NOT NULL DEFAULT 0,
      summary TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      cards_json TEXT NOT NULL,
      citations_json TEXT NOT NULL,
      tools_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS returns (
      rma TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      email TEXT NOT NULL,
      items_json TEXT NOT NULL,
      reason TEXT NOT NULL,
      kind TEXT NOT NULL,
      replacement_size TEXT,
      status TEXT NOT NULL,
      label_fee_cents INTEGER NOT NULL,
      refund_cents INTEGER,
      created_at TEXT NOT NULL,
      received_at TEXT,
      refund_issued_at TEXT,
      conversation_id TEXT
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      priority TEXT NOT NULL,
      reason TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      email TEXT NOT NULL,
      percent INTEGER NOT NULL,
      cap_cents INTEGER NOT NULL,
      reason TEXT NOT NULL,
      conversation_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS channel_links (
      channel TEXT NOT NULL,
      external_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      PRIMARY KEY (channel, external_id)
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL
    );
  `);
  const count = store.get<{ n: number }>("SELECT COUNT(*) AS n FROM orders");
  if (!count || count.n === 0) seedDatabase(store);
}

export function getStore(): Store {
  const nextPath = databasePath();
  if (!globalStore.__driftwood || globalStore.__driftwoodPath !== nextPath) {
    if (nextPath !== ":memory:") {
      fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(nextPath), { recursive: true });
    }
    const db = new DatabaseSync(nextPath);
    if (nextPath !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
    const store = wrap(db);
    migrate(store);
    globalStore.__driftwood = store;
    globalStore.__driftwoodPath = nextPath;
  }
  return globalStore.__driftwood;
}

export function resetStore(): void {
  const current = databasePath();
  globalStore.__driftwood?.close();
  globalStore.__driftwood = undefined;
  globalStore.__driftwoodPath = undefined;
  if (current !== ":memory:" && fs.existsSync(/* turbopackIgnore: true */ current)) {
    fs.rmSync(/* turbopackIgnore: true */ current);
    for (const suffix of ["-wal", "-shm"]) {
      const sidecar = current + suffix;
      if (fs.existsSync(/* turbopackIgnore: true */ sidecar)) {
        fs.rmSync(/* turbopackIgnore: true */ sidecar);
      }
    }
  }
  getStore();
}

export type { Store };
