// Diese Typen beschreiben, was die API als JSON zurückgibt.

export type Item = {
  id: number;
  name: string;
  description: string;
  category: string;
  activeLoanCount: number;
};

export type LoanStatus = 'aktiv' | 'storniert' | 'zurueckgegeben';

export type Loan = {
  id: number;
  itemId: number;
  itemName: string;
  borrowerName: string;
  startDate: string;
  endDate: string;
  status: LoanStatus;
};

export type ItemWithLoans = Item & { loans: Loan[] };

export type FieldErrors = Record<string, string>;

export const CATEGORIES = ['Kamera', 'Beamer', 'Werkzeug', 'Computer', 'Audio', 'Sonstiges'];
