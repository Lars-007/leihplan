// Prüfregeln für Eingaben. Sie gelten auf dem Server, egal was das Formular schickt.
// Jede Funktion gibt entweder die bereinigten Daten oder eine Liste von Fehlern zurück.

export type FieldErrors = Record<string, string>;

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: FieldErrors };

export type ItemInput = {
  name: string;
  description: string;
  category: string;
};

export type LoanInput = {
  itemId: number;
  borrowerName: string;
  startDate: string;
  endDate: string;
};

export const MAX_NAME = 100;
export const MAX_DESCRIPTION = 500;
export const MAX_CATEGORY = 50;

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

// Prüft, ob ein Text ein echtes Datum im Format JJJJ-MM-TT ist.
// '2026-02-30' hat das richtige Format, existiert aber nicht und wird abgelehnt.
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateItem(body: unknown): Result<ItemInput> {
  const data = (body ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const name = asTrimmedString(data.name);
  const description = asTrimmedString(data.description ?? '');
  const category = asTrimmedString(data.category);

  if (!name) errors.name = 'Bitte gib einen Namen ein.';
  else if (name.length > MAX_NAME) errors.name = `Der Name darf höchstens ${MAX_NAME} Zeichen lang sein.`;

  if (description === null) errors.description = 'Die Beschreibung muss ein Text sein.';
  else if (description.length > MAX_DESCRIPTION)
    errors.description = `Die Beschreibung darf höchstens ${MAX_DESCRIPTION} Zeichen lang sein.`;

  if (!category) errors.category = 'Bitte wähle eine Kategorie.';
  else if (category.length > MAX_CATEGORY)
    errors.category = `Die Kategorie darf höchstens ${MAX_CATEGORY} Zeichen lang sein.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name: name!, description: description!, category: category! } };
}

export function validateLoan(body: unknown): Result<LoanInput> {
  const data = (body ?? {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const itemId = Number(data.itemId);
  const borrowerName = asTrimmedString(data.borrowerName);
  const startDate = asTrimmedString(data.startDate);
  const endDate = asTrimmedString(data.endDate);

  if (!Number.isInteger(itemId) || itemId <= 0) errors.itemId = 'Bitte wähle einen Gegenstand.';

  if (!borrowerName) errors.borrowerName = 'Bitte gib den Namen der ausleihenden Person ein.';
  else if (borrowerName.length > MAX_NAME)
    errors.borrowerName = `Der Name darf höchstens ${MAX_NAME} Zeichen lang sein.`;

  if (!startDate) errors.startDate = 'Bitte gib ein Startdatum ein.';
  else if (!isValidDate(startDate)) errors.startDate = 'Das Startdatum ist kein gültiges Datum.';

  if (!endDate) errors.endDate = 'Bitte gib ein Rückgabedatum ein.';
  else if (!isValidDate(endDate)) errors.endDate = 'Das Rückgabedatum ist kein gültiges Datum.';

  // Erst vergleichen, wenn beide Daten gültig sind.
  if (!errors.startDate && !errors.endDate && endDate! < startDate!) {
    errors.endDate = 'Das Rückgabedatum darf nicht vor dem Startdatum liegen.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { itemId, borrowerName: borrowerName!, startDate: startDate!, endDate: endDate! },
  };
}

// Überschneidungsregel (Start- und Rückgabetag zählen beide als belegt):
// Zwei Zeiträume [A_start, A_ende] und [B_start, B_ende] überschneiden sich,
// wenn A_start <= B_ende UND A_ende >= B_start.
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}
