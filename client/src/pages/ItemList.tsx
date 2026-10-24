import { api } from '../api.ts';
import { Empty, ErrorMessage, Loading } from '../components/States.tsx';
import { useLoad } from '../useLoad.ts';

export function ItemList() {
  const { data: items, error, loading, reload } = useLoad(() => api.listItems(), []);

  return (
    <section>
      <div className="page-head">
        <h1>Gegenstände</h1>
        <a className="button" href="#/gegenstaende/neu">
          Gegenstand hinzufügen
        </a>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {items && items.length === 0 && (
        <Empty>
          <p>Es sind noch keine Gegenstände erfasst.</p>
          <a href="#/gegenstaende/neu">Ersten Gegenstand hinzufügen</a>
        </Empty>
      )}
      {items && items.length > 0 && (
        <ul className="item-grid">
          {items.map((item) => (
            <li key={item.id}>
              <a className="card item-card" href={`#/gegenstaende/${item.id}`}>
                <span className="item-category">{item.category}</span>
                <span className="item-name">{item.name}</span>
                {item.description && <span className="item-description">{item.description}</span>}
                <span className={item.activeLoanCount > 0 ? 'item-status busy' : 'item-status'}>
                  {item.activeLoanCount === 0
                    ? 'Keine aktiven Ausleihen'
                    : item.activeLoanCount === 1
                      ? '1 aktive Ausleihe'
                      : `${item.activeLoanCount} aktive Ausleihen`}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
