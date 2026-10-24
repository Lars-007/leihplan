import { useState } from 'react';
import { api } from '../api.ts';
import { LoanForm } from '../components/LoanForm.tsx';
import { LoanTable } from '../components/LoanTable.tsx';
import { Empty, ErrorMessage, Loading } from '../components/States.tsx';
import type { LoanStatus } from '../types.ts';
import { useLoad } from '../useLoad.ts';

type Filter = 'alle' | LoanStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'zurueckgegeben', label: 'Zurückgegeben' },
  { value: 'storniert', label: 'Storniert' },
  { value: 'alle', label: 'Alle' },
];

export function LoanList() {
  const loans = useLoad(() => api.listLoans(), []);
  const items = useLoad(() => api.listItems(), []);
  const [filter, setFilter] = useState<Filter>('aktiv');

  const visible = (loans.data ?? []).filter((l) => filter === 'alle' || l.status === filter);

  function reloadAll() {
    loans.reload();
    items.reload();
  }

  return (
    <section>
      <div className="page-head">
        <h1>Ausleihen</h1>
      </div>

      <div className="two-columns">
        <div>
          <fieldset className="filter">
            <legend>Anzeigen</legend>
            {FILTERS.map((f) => (
              <label key={f.value} className="filter-option">
                <input
                  type="radio"
                  name="filter"
                  value={f.value}
                  checked={filter === f.value}
                  onChange={() => setFilter(f.value)}
                />
                {f.label}
              </label>
            ))}
          </fieldset>

          {loans.loading && !loans.data && <Loading />}
          {loans.error && <ErrorMessage message={loans.error} onRetry={loans.reload} />}
          {loans.data && visible.length === 0 && (
            <Empty>
              <p>Keine Ausleihen in dieser Ansicht.</p>
            </Empty>
          )}
          {visible.length > 0 && <LoanTable loans={visible} showItem onChanged={reloadAll} />}
        </div>

        {items.data && items.data.length > 0 && (
          <LoanForm items={items.data} onCreated={reloadAll} />
        )}
        {items.data && items.data.length === 0 && (
          <Empty>
            <p>Erfasse zuerst einen Gegenstand, bevor du ihn ausleihen kannst.</p>
            <a href="#/gegenstaende/neu">Gegenstand hinzufügen</a>
          </Empty>
        )}
      </div>
    </section>
  );
}
