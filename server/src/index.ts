import { createApp } from './app.ts';
import { openDatabase } from './db.ts';

const PORT = Number(process.env.PORT ?? 3001);
const DB_PATH = process.env.DB_PATH ?? 'leihplan.db';

const db = openDatabase(DB_PATH);
const app = createApp(db);

// Nur auf dem eigenen Rechner erreichbar (127.0.0.1), nicht im ganzen Netzwerk.
// Die Anwendung hat keine Anmeldung und darf darum nicht öffentlich laufen.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`LeihPlan-API läuft auf http://127.0.0.1:${PORT} (Datenbank: ${DB_PATH})`);
});
