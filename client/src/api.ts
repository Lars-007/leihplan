import type { FieldErrors, Item, ItemWithLoans, Loan } from './types.ts';

// Fehler, den die API zurückmeldet, z. B. 400 (ungültige Eingabe) oder 409 (Konflikt).
export class ApiError extends Error {
  status: number;
  fields: FieldErrors;

  constructor(status: number, message: string, fields: FieldErrors = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// Ein einziger Ort für alle Anfragen an den Server.
// 1. fetch schickt die Anfrage (z. B. POST /api/loans mit JSON im Body).
// 2. Der Server antwortet mit einem Statuscode und JSON.
// 3. Bei einem Fehlerstatus werfen wir einen ApiError mit der Meldung des Servers.
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Der Server ist nicht erreichbar. Läuft die API?');
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error ?? `Unerwartete Antwort vom Server (${res.status}).`,
      data?.fields,
    );
  }
  return data as T;
}

export type ItemInput = { name: string; description: string; category: string };
export type LoanInput = { itemId: number; borrowerName: string; startDate: string; endDate: string };

export const api = {
  listItems: () => request<Item[]>('GET', '/api/items'),
  getItem: (id: number) => request<ItemWithLoans>('GET', `/api/items/${id}`),
  createItem: (input: ItemInput) => request<Item>('POST', '/api/items', input),
  updateItem: (id: number, input: ItemInput) => request<Item>('PUT', `/api/items/${id}`, input),
  deleteItem: (id: number) => request<void>('DELETE', `/api/items/${id}`),

  listLoans: () => request<Loan[]>('GET', '/api/loans'),
  createLoan: (input: LoanInput) => request<Loan>('POST', '/api/loans', input),
  cancelLoan: (id: number) => request<Loan>('POST', `/api/loans/${id}/cancel`),
  returnLoan: (id: number) => request<Loan>('POST', `/api/loans/${id}/return`),
};
