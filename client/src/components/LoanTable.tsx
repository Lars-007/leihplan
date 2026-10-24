import { useState } from 'react';
import { api } from '../api.ts';
import { formatDate } from '../format.ts';
import type { Loan } from '../types.ts';
import { StatusBadge } from './StatusBadge.tsx';

type LoanTableProps = {
  loans: Loan[];
  showItem?: boolean;
  onChanged: () => void;
};

export function LoanTable({ loans, showItem = false, onChanged }: LoanTableProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(loan: Loan, action: 'cancel' | 'return') {
    const question =
      action === 'cancel'
        ? `Ausleihe von ${loan.borrowerName} wirklich stornieren?`
        : `Ausleihe von ${loan.borrowerName} als zurückgegeben markieren?`;
    if (!window.confirm(question)) return;

    setBusyId(loan.id);
    setError(null);
    try {
      if (action === 'cancel') await api.cancelLoan(loan.id);
      else await api.returnLoan(loan.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die Aktion ist fehlgeschlagen.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <ul className="loan-list">
        {loans.map((loan) => (
          <li key={loan.id} className="loan">
            <div className="loan-main">
              {showItem && (
                <a className="loan-item" href={`#/gegenstaende/${loan.itemId}`}>
                  {loan.itemName}
                </a>
              )}
              <span className="loan-borrower">{loan.borrowerName}</span>
              <span className="loan-dates">
                {formatDate(loan.startDate)} – {formatDate(loan.endDate)}
              </span>
            </div>
            <div className="loan-side">
              <StatusBadge status={loan.status} />
              {loan.status === 'aktiv' && (
                <div className="loan-actions">
                  <button
                    type="button"
                    className="button button-small button-secondary"
                    disabled={busyId === loan.id}
                    onClick={() => act(loan, 'return')}
                  >
                    Zurückgegeben
                  </button>
                  <button
                    type="button"
                    className="button button-small button-danger"
                    disabled={busyId === loan.id}
                    onClick={() => act(loan, 'cancel')}
                  >
                    Stornieren
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
