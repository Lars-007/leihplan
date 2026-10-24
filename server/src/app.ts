import express, { type NextFunction, type Request, type Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { rangesOverlap, validateItem, validateLoan } from './validation.ts';

type ItemRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  activeLoanCount: number;
};

type LoanRow = {
  id: number;
  itemId: number;
  itemName: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  status: 'aktiv' | 'storniert' | 'zurueckgegeben';
};

// Die SQL-Spalten heissen snake_case (item_id), in JSON verwenden wir camelCase (itemId).
const ITEM_SELECT = `
  SELECT i.id, i.name, i.description, i.category,
         (SELECT COUNT(*) FROM loans l WHERE l.item_id = i.id AND l.status = 'aktiv') AS activeLoanCount
  FROM items i`;

const LOAN_SELECT = `
  SELECT l.id, l.item_id AS itemId, i.name AS itemName, l.borrower_name AS borrowerName,
         l.start_date AS startDate, l.end_date AS endDate, l.status
  FROM loans l JOIN items i ON i.id = l.item_id`;

// '2026-03-10' → '10.03.2026' (nur für Meldungen; gespeichert wird immer JJJJ-MM-TT)
function swissDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

function parseId(value: string | string[] | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Die App bekommt die Datenbank von aussen. So können Tests eine leere
// Datenbank im Arbeitsspeicher verwenden, ohne die echten Daten anzufassen.
export function createApp(db: DatabaseSync) {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  const findItem = (id: number) =>
    db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id) as ItemRow | undefined;
  const findLoan = (id: number) =>
    db.prepare(`${LOAN_SELECT} WHERE l.id = ?`).get(id) as LoanRow | undefined;

  // ---------- Gegenstände ----------

  app.get('/api/items', (_req, res) => {
    const items = db.prepare(`${ITEM_SELECT} ORDER BY i.name COLLATE NOCASE`).all();
    res.json(items);
  });

  app.get('/api/items/:id', (req, res) => {
    const id = parseId(req.params.id);
    const item = id ? findItem(id) : undefined;
    if (!item) return res.status(404).json({ error: 'Dieser Gegenstand wurde nicht gefunden.' });

    const loans = db
      .prepare(`${LOAN_SELECT} WHERE l.item_id = ? ORDER BY l.start_date DESC`)
      .all(item.id);
    res.json({ ...item, loans });
  });

  app.post('/api/items', (req, res) => {
    const result = validateItem(req.body);
    if (!result.ok) {
      return res.status(400).json({ error: 'Bitte prüfe deine Eingaben.', fields: result.errors });
    }
    const { name, description, category } = result.value;
    const info = db
      .prepare('INSERT INTO items (name, description, category) VALUES (?, ?, ?)')
      .run(name, description, category);
    res.status(201).json(findItem(Number(info.lastInsertRowid)));
  });

  app.put('/api/items/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id || !findItem(id)) {
      return res.status(404).json({ error: 'Dieser Gegenstand wurde nicht gefunden.' });
    }
    const result = validateItem(req.body);
    if (!result.ok) {
      return res.status(400).json({ error: 'Bitte prüfe deine Eingaben.', fields: result.errors });
    }
    const { name, description, category } = result.value;
    db.prepare('UPDATE items SET name = ?, description = ?, category = ? WHERE id = ?').run(
      name,
      description,
      category,
      id,
    );
    res.json(findItem(id));
  });

  app.delete('/api/items/:id', (req, res) => {
    const id = parseId(req.params.id);
    const item = id ? findItem(id) : undefined;
    if (!item) return res.status(404).json({ error: 'Dieser Gegenstand wurde nicht gefunden.' });

    // Schutz: Solange es aktive Ausleihen gibt, darf der Gegenstand nicht gelöscht werden.
    if (item.activeLoanCount > 0) {
      return res.status(409).json({
        error: `Der Gegenstand hat noch ${item.activeLoanCount} aktive Ausleihe(n). Bitte zuerst stornieren oder als zurückgegeben markieren.`,
      });
    }
    // Abgeschlossene und stornierte Ausleihen werden mitgelöscht (ON DELETE CASCADE).
    db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
    res.status(204).end();
  });

  // ---------- Ausleihen ----------

  app.get('/api/loans', (req, res) => {
    const status = req.query.status;
    if (status === 'aktiv' || status === 'storniert' || status === 'zurueckgegeben') {
      return res.json(
        db.prepare(`${LOAN_SELECT} WHERE l.status = ? ORDER BY l.start_date`).all(status),
      );
    }
    res.json(db.prepare(`${LOAN_SELECT} ORDER BY l.start_date DESC`).all());
  });

  app.post('/api/loans', (req, res) => {
    // 1. Eingaben prüfen (Pflichtfelder, gültige Daten, Rückgabe nicht vor Start)
    const result = validateLoan(req.body);
    if (!result.ok) {
      return res.status(400).json({ error: 'Bitte prüfe deine Eingaben.', fields: result.errors });
    }
    const loan = result.value;

    // 2. Gibt es den Gegenstand überhaupt?
    if (!findItem(loan.itemId)) {
      return res.status(404).json({ error: 'Dieser Gegenstand wurde nicht gefunden.' });
    }

    // 3. Überschneidungen prüfen: nur aktive Ausleihen blockieren.
    //    Stornierte und zurückgegebene Ausleihen werden ignoriert.
    const activeLoans = db
      .prepare(`${LOAN_SELECT} WHERE l.item_id = ? AND l.status = 'aktiv'`)
      .all(loan.itemId) as LoanRow[];

    const conflict = activeLoans.find((existing) =>
      rangesOverlap(loan.startDate, loan.endDate, existing.startDate, existing.endDate),
    );
    if (conflict) {
      return res.status(409).json({
        error: `Der Gegenstand ist in diesem Zeitraum bereits ausgeliehen (${swissDate(conflict.startDate)} bis ${swissDate(conflict.endDate)}).`,
        conflict,
      });
    }

    // 4. Speichern. Prüfen und Speichern laufen ohne Unterbruch nacheinander
    //    (node:sqlite arbeitet synchron), darum kann keine zweite Anfrage dazwischenkommen.
    const info = db
      .prepare('INSERT INTO loans (item_id, borrower_name, start_date, end_date) VALUES (?, ?, ?, ?)')
      .run(loan.itemId, loan.borrowerName, loan.startDate, loan.endDate);

    // 5. Antwort mit der gespeicherten Ausleihe
    res.status(201).json(findLoan(Number(info.lastInsertRowid)));
  });

  // Statuswechsel: nur eine aktive Ausleihe kann storniert oder zurückgegeben werden.
  function changeStatus(newStatus: 'storniert' | 'zurueckgegeben') {
    return (req: Request, res: Response) => {
      const id = parseId(req.params.id);
      const loan = id ? findLoan(id) : undefined;
      if (!loan) return res.status(404).json({ error: 'Diese Ausleihe wurde nicht gefunden.' });
      if (loan.status !== 'aktiv') {
        return res.status(409).json({ error: 'Diese Ausleihe ist bereits abgeschlossen.' });
      }
      db.prepare('UPDATE loans SET status = ? WHERE id = ?').run(newStatus, loan.id);
      res.json(findLoan(loan.id));
    };
  }

  app.post('/api/loans/:id/cancel', changeStatus('storniert'));
  app.post('/api/loans/:id/return', changeStatus('zurueckgegeben'));

  // ---------- Fehlerbehandlung ----------

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Diese Adresse gibt es in der API nicht.' });
  });

  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Die Anfrage enthält kein gültiges JSON.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Auf dem Server ist ein unerwarteter Fehler aufgetreten.' });
  });

  return app;
}
