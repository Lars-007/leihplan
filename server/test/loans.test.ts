import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, beforeEach, describe, test } from 'node:test';
import { createApp } from '../src/app.ts';
import { openDatabase } from '../src/db.ts';

// Jeder Test bekommt eine frische Datenbank im Arbeitsspeicher und einen Server auf
// einem freien Port. Die Tests schicken echte HTTP-Anfragen, genau wie das Formular.
let server: Server;
let baseUrl: string;
let itemId: number;

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function loan(startDate: string, endDate: string, borrowerName = 'Test Person') {
  return api('POST', '/api/loans', { itemId, borrowerName, startDate, endDate });
}

beforeEach(async () => {
  if (server) server.close();
  const app = createApp(openDatabase(':memory:'));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const created = await api('POST', '/api/items', { name: 'Kamera', category: 'Kamera' });
  itemId = created.body.id;
});

after(() => server.close());

describe('Gültige Ausleihe', () => {
  test('wird gespeichert und ist danach abrufbar', async () => {
    const res = await loan('2026-03-10', '2026-03-12', 'Mia Muster');
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'aktiv');
    assert.equal(res.body.borrowerName, 'Mia Muster');

    const detail = await api('GET', `/api/items/${itemId}`);
    assert.equal(detail.body.loans.length, 1);
    assert.equal(detail.body.activeLoanCount, 1);
  });
});

describe('Überschneidungen', () => {
  // In jedem Test gibt es zuerst eine bestehende Ausleihe vom 10. bis 12. März.
  test('ein Zeitraum, der mitten in eine bestehende Ausleihe fällt, wird abgelehnt', async () => {
    await loan('2026-03-10', '2026-03-12');
    const res = await loan('2026-03-11', '2026-03-11');
    assert.equal(res.status, 409);
  });

  test('ein Zeitraum, der eine bestehende Ausleihe ganz umschliesst, wird abgelehnt', async () => {
    await loan('2026-03-10', '2026-03-12');
    const res = await loan('2026-03-01', '2026-03-31');
    assert.equal(res.status, 409);
  });

  test('ein anderer Gegenstand ist im gleichen Zeitraum frei', async () => {
    await loan('2026-03-10', '2026-03-12');
    const other = await api('POST', '/api/items', { name: 'Beamer', category: 'Beamer' });
    const res = await api('POST', '/api/loans', {
      itemId: other.body.id,
      borrowerName: 'Test Person',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
    });
    assert.equal(res.status, 201);
  });
});

describe('Datumsgrenzen (Start- und Rückgabetag zählen beide als belegt)', () => {
  test('Start am Rückgabetag der bestehenden Ausleihe wird abgelehnt', async () => {
    await loan('2026-03-10', '2026-03-12');
    const res = await loan('2026-03-12', '2026-03-14');
    assert.equal(res.status, 409);
  });

  test('Rückgabe am Starttag der bestehenden Ausleihe wird abgelehnt', async () => {
    await loan('2026-03-10', '2026-03-12');
    const res = await loan('2026-03-08', '2026-03-10');
    assert.equal(res.status, 409);
  });

  test('Start am Tag nach der Rückgabe ist erlaubt', async () => {
    await loan('2026-03-10', '2026-03-12');
    const res = await loan('2026-03-13', '2026-03-14');
    assert.equal(res.status, 201);
  });

  test('Rückgabe am Tag vor dem Start ist erlaubt', async () => {
    await loan('2026-03-10', '2026-03-12');
    const res = await loan('2026-03-07', '2026-03-09');
    assert.equal(res.status, 201);
  });

  test('eine Ausleihe von nur einem Tag (Start = Rückgabe) ist erlaubt', async () => {
    const res = await loan('2026-03-10', '2026-03-10');
    assert.equal(res.status, 201);
  });
});

describe('Ungültige Eingaben', () => {
  test('fehlende Pflichtfelder werden mit Feldfehlern abgewiesen', async () => {
    const res = await api('POST', '/api/loans', { itemId });
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.borrowerName);
    assert.ok(res.body.fields.startDate);
    assert.ok(res.body.fields.endDate);
  });

  test('ein Name nur aus Leerzeichen gilt als leer', async () => {
    const res = await loan('2026-03-10', '2026-03-12', '   ');
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.borrowerName);
  });

  test('ein Datum, das es nicht gibt, wird abgewiesen', async () => {
    const res = await loan('2026-02-30', '2026-03-02');
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.startDate);
  });

  test('ein falsches Datumsformat wird abgewiesen', async () => {
    const res = await loan('10.03.2026', '2026-03-12');
    assert.equal(res.status, 400);
  });

  test('Rückgabe vor dem Start wird abgewiesen', async () => {
    const res = await loan('2026-03-12', '2026-03-10');
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.endDate);
  });

  test('ein Gegenstand, den es nicht gibt, wird abgewiesen', async () => {
    const res = await api('POST', '/api/loans', {
      itemId: 9999,
      borrowerName: 'Test Person',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
    });
    assert.equal(res.status, 404);
  });

  test('ein Gegenstand ohne Namen wird abgewiesen', async () => {
    const res = await api('POST', '/api/items', { name: '', category: 'Kamera' });
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.name);
  });
});

describe('Storno und Rückgabe', () => {
  test('eine stornierte Ausleihe blockiert den Zeitraum nicht mehr', async () => {
    const first = await loan('2026-03-10', '2026-03-12');
    assert.equal((await loan('2026-03-10', '2026-03-12')).status, 409);

    const cancel = await api('POST', `/api/loans/${first.body.id}/cancel`);
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.status, 'storniert');

    assert.equal((await loan('2026-03-10', '2026-03-12')).status, 201);
  });

  test('eine bereits stornierte Ausleihe kann nicht nochmals storniert werden', async () => {
    const first = await loan('2026-03-10', '2026-03-12');
    await api('POST', `/api/loans/${first.body.id}/cancel`);
    const again = await api('POST', `/api/loans/${first.body.id}/cancel`);
    assert.equal(again.status, 409);
  });
});

describe('Löschschutz', () => {
  test('ein Gegenstand mit aktiver Ausleihe kann nicht gelöscht werden', async () => {
    await loan('2026-03-10', '2026-03-12');
    const res = await api('DELETE', `/api/items/${itemId}`);
    assert.equal(res.status, 409);
    assert.equal((await api('GET', `/api/items/${itemId}`)).status, 200);
  });

  test('nach der Rückgabe kann der Gegenstand gelöscht werden', async () => {
    const first = await loan('2026-03-10', '2026-03-12');
    await api('POST', `/api/loans/${first.body.id}/return`);
    const res = await api('DELETE', `/api/items/${itemId}`);
    assert.equal(res.status, 204);
    assert.equal((await api('GET', `/api/items/${itemId}`)).status, 404);
  });
});
