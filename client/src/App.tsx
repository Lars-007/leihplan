import { useEffect, useState } from 'react';
import { ItemDetail } from './pages/ItemDetail.tsx';
import { ItemForm } from './pages/ItemForm.tsx';
import { ItemList } from './pages/ItemList.tsx';
import { LoanList } from './pages/LoanList.tsx';

// Einfache Navigation über den Teil der Adresse nach dem # (z. B. #/gegenstaende/3).
// Dafür braucht es keine zusätzliche Bibliothek.
function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || '#/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function Page({ hash }: { hash: string }) {
  if (hash === '#/' || hash === '#') return <ItemList />;
  if (hash === '#/ausleihen') return <LoanList />;
  if (hash === '#/gegenstaende/neu') return <ItemForm />;

  const edit = hash.match(/^#\/gegenstaende\/(\d+)\/bearbeiten$/);
  if (edit) return <ItemForm key={edit[1]} id={Number(edit[1])} />;

  const detail = hash.match(/^#\/gegenstaende\/(\d+)$/);
  if (detail) return <ItemDetail id={Number(detail[1])} />;

  return (
    <section>
      <h1>Seite nicht gefunden</h1>
      <p>
        <a href="#/">Zur Übersicht</a>
      </p>
    </section>
  );
}

export function App() {
  const hash = useHash();
  const onLoans = hash.startsWith('#/ausleihen');

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        Zum Inhalt springen
      </a>
      <header className="header">
        <div className="container header-inner">
          <a className="logo" href="#/">
            LeihPlan
          </a>
          <nav aria-label="Hauptnavigation">
            <a href="#/" aria-current={!onLoans ? 'page' : undefined}>
              Gegenstände
            </a>
            <a href="#/ausleihen" aria-current={onLoans ? 'page' : undefined}>
              Ausleihen
            </a>
          </nav>
        </div>
      </header>
      <main id="main" className="container" tabIndex={-1}>
        <Page hash={hash} />
      </main>
      <footer className="container footer">
        Lern- und Demoprojekt mit erfundenen Daten. Nicht für den öffentlichen Betrieb gedacht.
      </footer>
    </>
  );
}
