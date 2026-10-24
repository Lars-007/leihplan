import { DatabaseSync } from 'node:sqlite';

// Öffnet die Datenbank und legt die Tabellen an, falls sie noch fehlen.
// path = ':memory:' erzeugt eine Datenbank nur im Arbeitsspeicher (für Tests).
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);

  // SQLite prüft Fremdschlüssel nur, wenn man es ausdrücklich einschaltet.
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      category    TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Jede Ausleihe gehört zu genau einem Gegenstand (item_id).
    -- Datumswerte werden als Text im Format JJJJ-MM-TT gespeichert.
    -- So lassen sie sich direkt als Text vergleichen: '2026-03-01' < '2026-03-15'.
    CREATE TABLE IF NOT EXISTS loans (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      borrower_name TEXT    NOT NULL,
      start_date    TEXT    NOT NULL,
      end_date      TEXT    NOT NULL,
      status        TEXT    NOT NULL DEFAULT 'aktiv'
                    CHECK (status IN ('aktiv', 'storniert', 'zurueckgegeben')),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      CHECK (end_date >= start_date)
    );

    CREATE INDEX IF NOT EXISTS idx_loans_item ON loans(item_id);
  `);

  return db;
}
