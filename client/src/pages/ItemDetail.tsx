import { useState } from 'react';
import { api } from '../api.ts';
import { LoanForm } from '../components/LoanForm.tsx';
import { LoanTable } from '../components/LoanTable.tsx';
import { Empty, ErrorMessage, Loading } from '../components/States.tsx';
import { useLoad } from '../useLoad.ts';

export function ItemDetail({ id }: { id: number }) {
  const { data: item, error, loading, reload } = useLoad(() => api.getItem(id), [id]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`«${item.name}» wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    setDeleteError(null);
    try {
      await api.deleteItem(item.id);
      window.location.hash = '#/';
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Löschen ist fehlgeschlagen.');
    }
  }

  if (loading && !item) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!item) return null;

  return (
    <section>
      <p className="back">
        <a href="#/">← Alle Gegenstände</a>
      </p>

      <div className="page-head">
        <div>
          <p className="item-category">{item.category}</p>
          <h1>{item.name}</h1>
        </div>
        <div className="page-actions">
          <a className="button button-secondary" href={`#/gegenstaende/${item.id}/bearbeiten`}>
            Bearbeiten
          </a>
          <button
            type="button"
            className="button button-danger"
            onClick={handleDelete}
            disabled={item.activeLoanCount > 0}
            title={item.activeLoanCount > 0 ? 'Gegenstände mit aktiven Ausleihen können nicht gelöscht werden.' : undefined}
          >
            Löschen
          </button>
        </div>
      </div>

      {item.activeLoanCount > 0 && (
        <p className="form-note">Löschen ist erst möglich, wenn keine Ausleihe mehr aktiv ist.</p>
      )}
      {deleteError && (
        <p className="alert alert-error" role="alert">
          {deleteError}
        </p>
      )}

      {item.description ? <p className="description">{item.description}</p> : null}

      <div className="two-columns">
        <div>
          <h2>Ausleihen</h2>
          {item.loans.length === 0 ? (
            <Empty>
              <p>Dieser Gegenstand wurde noch nie ausgeliehen.</p>
            </Empty>
          ) : (
            <LoanTable loans={item.loans} onChanged={reload} />
          )}
        </div>
        <LoanForm fixedItemId={item.id} onCreated={reload} />
      </div>
    </section>
  );
}
