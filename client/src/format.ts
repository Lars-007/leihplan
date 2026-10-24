import type { LoanStatus } from './types.ts';

// '2026-03-10' → '10.03.2026'
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

export const STATUS_LABELS: Record<LoanStatus, string> = {
  aktiv: 'Aktiv',
  storniert: 'Storniert',
  zurueckgegeben: 'Zurückgegeben',
};
