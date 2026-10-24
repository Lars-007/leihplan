# Architektur und Datenstruktur

## Überblick

```
Browser (React)          Vite-Entwicklungsserver        Express-API              SQLite
localhost:5173    ──►    leitet /api weiter     ──►     127.0.0.1:3001    ──►    leihplan.db
  Formular                                              prüft Regeln             speichert
  Anzeige         ◄──    JSON-Antwort           ◄──     Statuscode + JSON  ◄──   Zeilen
```

## Ordner

```
leihplan/
├── server/
│   ├── src/
│   │   ├── index.ts        Startet den Server auf Port 3001
│   │   ├── app.ts          Alle API-Routen (was passiert bei welcher Adresse)
│   │   ├── db.ts           Öffnet die Datenbank und legt die Tabellen an
│   │   ├── validation.ts   Prüfregeln und die Überschneidungsprüfung
│   │   └── seed.ts         Erfundene Beispieldaten
│   └── test/
│       └── loans.test.ts   Tests der Regeln über echte HTTP-Anfragen
└── client/
    └── src/
        ├── App.tsx         Navigation (welche Seite bei welcher Adresse)
        ├── api.ts          Alle Aufrufe an die API an einem Ort
        ├── useLoad.ts      Laden mit den Zuständen «lädt», «Fehler» und «fertig»
        ├── pages/          Übersicht, Detail, Formular, Ausleihen
        └── components/     Ausleihformular, Ausleihliste, Felder, Zustände
```

## Datenbank

Zwei Tabellen, verbunden über `item_id`:

```
items                               loans
─────────────────────               ──────────────────────────────
id           INTEGER  PK  ◄───┐     id             INTEGER  PK
name         TEXT     Pflicht  └─── item_id        INTEGER  FK → items.id
description  TEXT                   borrower_name  TEXT     Pflicht
category     TEXT     Pflicht       start_date     TEXT     JJJJ-MM-TT
created_at   TEXT                   end_date       TEXT     JJJJ-MM-TT
                                    status         TEXT     aktiv | storniert | zurueckgegeben
                                    created_at     TEXT
```

- Ein Gegenstand kann viele Ausleihen haben (1:n).
- `item_id` ist ein **Fremdschlüssel**. Die Datenbank lässt keine Ausleihe für einen Gegenstand zu, den es nicht gibt.
- Wird ein Gegenstand gelöscht, löscht `ON DELETE CASCADE` auch seine alten Ausleihen. Die API verhindert das Löschen aber, solange noch eine Ausleihe aktiv ist.
- Daten werden als Text im Format `JJJJ-MM-TT` gespeichert. In diesem Format entspricht die Reihenfolge der Buchstaben der Reihenfolge im Kalender, darum funktioniert `'2026-03-09' < '2026-03-10'` direkt als Textvergleich.
- Die Datenbank prüft zusätzlich selbst, dass `end_date >= start_date` gilt und der Status einer der drei erlaubten Werte ist. Das ist ein zweites Sicherheitsnetz.

## API

| Methode | Adresse | Zweck | Mögliche Antworten |
| --- | --- | --- | --- |
| GET | `/api/items` | Alle Gegenstände | 200 |
| GET | `/api/items/:id` | Ein Gegenstand mit Ausleihen | 200, 404 |
| POST | `/api/items` | Gegenstand anlegen | 201, 400 |
| PUT | `/api/items/:id` | Gegenstand ändern | 200, 400, 404 |
| DELETE | `/api/items/:id` | Gegenstand löschen | 204, 404, 409 (aktive Ausleihen) |
| GET | `/api/loans` | Alle Ausleihen | 200 |
| POST | `/api/loans` | Ausleihe anlegen | 201, 400, 404, 409 (Überschneidung) |
| POST | `/api/loans/:id/cancel` | Stornieren | 200, 404, 409 (nicht aktiv) |
| POST | `/api/loans/:id/return` | Als zurückgegeben markieren | 200, 404, 409 (nicht aktiv) |

Bei Fehlern antwortet der Server mit `{ "error": "Meldung", "fields": { "feldname": "Meldung" } }`.

## Weg einer Ausleihe: vom Formular bis zur Datenbank

1. **Formular** (`client/src/components/LoanForm.tsx`): Du füllst die Felder aus und klickst «Ausleihe speichern». `checkLocally()` prüft die Eingaben sofort im Browser, damit du schnell eine Rückmeldung bekommst.
2. **API-Aufruf** (`client/src/api.ts`): `api.createLoan(...)` schickt mit `fetch` eine Anfrage `POST /api/loans` und die Daten als JSON.
3. **Weiterleitung**: Vite leitet `/api/...` an Express auf Port 3001 weiter (`client/vite.config.ts`).
4. **Prüfung auf dem Server** (`server/src/app.ts`, Route `POST /api/loans`):
   1. `validateLoan()` prüft Pflichtfelder, Datumsformat und die Reihenfolge der Daten. Bei einem Fehler kommt **400** zurück.
   2. Gibt es den Gegenstand? Wenn nicht, kommt **404** zurück.
   3. Alle aktiven Ausleihen dieses Gegenstands werden geladen und mit `rangesOverlap()` verglichen. Bei einer Überschneidung kommt **409** zurück.
5. **Datenbank**: `INSERT INTO loans ...` speichert die Ausleihe. SQLite vergibt die neue `id`.
6. **Antwort**: Der Server schickt **201** und die gespeicherte Ausleihe als JSON zurück.
7. **Anzeige**: Das Formular leert sich und zeigt «Die Ausleihe wurde gespeichert.». `onCreated()` lädt die Liste neu. Bei einem Fehler zeigt das Formular die Meldung des Servers an.

### Warum der Server nochmals prüft

Die Prüfung im Browser ist nur eine Hilfe für die Bedienung. Man kann sie umgehen, zum Beispiel mit:

```bash
curl -X POST http://127.0.0.1:3001/api/loans \
  -H "Content-Type: application/json" \
  -d '{"itemId":1,"borrowerName":"","startDate":"2026-03-12","endDate":"2026-03-01"}'
```

Diese Anfrage kommt nie durch das Formular. Nur der Server kann darum garantieren, dass falsche Daten nicht gespeichert werden.

## Die Überschneidungsprüfung

Die Regel lautet: Start- und Rückgabetag zählen beide als belegt. Zwei Zeiträume überschneiden sich, wenn gilt:

```
neuer_start <= bestehendes_ende   UND   neues_ende >= bestehender_start
```

Beispiele mit einer bestehenden Ausleihe vom **10. bis 12. März**:

| Neue Ausleihe | neuer_start <= 12.? | neues_ende >= 10.? | Ergebnis |
| --- | --- | --- | --- |
| 05.–09. März | ja | **nein** | erlaubt, endet davor |
| 13.–15. März | **nein** | ja | erlaubt, beginnt danach |
| 08.–10. März | ja | ja | abgelehnt, der 10. ist doppelt belegt |
| 12.–14. März | ja | ja | abgelehnt, der 12. ist doppelt belegt |
| 11.–11. März | ja | ja | abgelehnt, liegt mitten drin |
| 01.–31. März | ja | ja | abgelehnt, umschliesst die Ausleihe |

Merksatz: Zwei Zeiträume überschneiden sich **nicht**, wenn einer ganz vorher endet oder ganz nachher beginnt. Die Formel oben ist genau das Gegenteil davon.

Nur Ausleihen mit Status `aktiv` werden verglichen. Eine stornierte oder zurückgegebene Ausleihe blockiert nichts mehr.

## Einen Fehler eingrenzen

Wenn etwas nicht funktioniert, gehe den Weg von oben Schritt für Schritt durch:

1. **Browser, Entwicklerwerkzeuge, Reiter «Netzwerk»**: Wurde die Anfrage überhaupt geschickt? Welcher Statuscode kam zurück, und was steht in der Antwort?
2. **Kein Statuscode oder «Server nicht erreichbar»**: Läuft die API? Schau ins Terminal mit `npm run dev`.
3. **400, 404 oder 409**: Der Server hat bewusst abgelehnt. Die Meldung sagt, warum.
4. **500**: Im Terminal der API steht die genaue Fehlermeldung.
5. **API direkt testen**: Mit `curl http://127.0.0.1:3001/api/items` schliesst du die Oberfläche als Fehlerquelle aus.
6. **Test schreiben**: Den Fehlerfall als Test in `server/test/loans.test.ts` nachbauen. So siehst du, ob er an der API liegt.
