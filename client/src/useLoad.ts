import { useCallback, useEffect, useState } from 'react';

// Lädt Daten von der API und merkt sich die drei möglichen Zustände:
// laden → fertig (data) oder Fehler (error). reload() lädt neu.
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // deps bestimmt, wann neu geladen wird (z. B. wenn sich die ID in der Adresse ändert).
  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await run());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
