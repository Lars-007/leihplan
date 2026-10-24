// Füllt eine leere Datenbank mit erfundenen Beispieldaten.
// Aufruf: npm run seed
import { openDatabase } from './db.ts';

const db = openDatabase(process.env.DB_PATH ?? 'leihplan.db');

const count = db.prepare('SELECT COUNT(*) AS n FROM items').get() as { n: number };
if (count.n > 0) {
  console.log('Die Datenbank enthält bereits Gegenstände. Es wurde nichts verändert.');
  process.exit(0);
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

const items = [
  ['Systemkamera A', 'Spiegellose Kamera mit 24-mm-Objektiv und zwei Akkus.', 'Kamera'],
  ['Beamer Raum 2', 'Full-HD-Beamer mit HDMI-Kabel und Fernbedienung.', 'Beamer'],
  ['Akkuschrauber', '18 V, inklusive Bit-Set und Ladegerät.', 'Werkzeug'],
  ['Stativ', 'Leichtes Reisestativ, bis 150 cm.', 'Kamera'],
  ['Laptop Leihgerät 1', '14 Zoll, für Präsentationen.', 'Computer'],
];

const insertItem = db.prepare('INSERT INTO items (name, description, category) VALUES (?, ?, ?)');
const ids = items.map(([name, description, category]) =>
  Number(insertItem.run(name, description, category).lastInsertRowid),
);

const insertLoan = db.prepare(
  'INSERT INTO loans (item_id, borrower_name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
);
insertLoan.run(ids[0], 'Mia Muster', isoDate(-2), isoDate(3), 'aktiv');
insertLoan.run(ids[0], 'Luca Beispiel', isoDate(7), isoDate(9), 'aktiv');
insertLoan.run(ids[1], 'Noah Test', isoDate(-10), isoDate(-8), 'zurueckgegeben');
insertLoan.run(ids[2], 'Lea Fiktiv', isoDate(1), isoDate(2), 'storniert');

console.log(`${ids.length} Gegenstände und 4 Ausleihen mit erfundenen Daten angelegt.`);
