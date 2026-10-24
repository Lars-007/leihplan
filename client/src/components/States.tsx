// Kleine Bausteine für die Zustände «lädt», «Fehler» und «leer».

export function Loading({ text = 'Wird geladen …' }: { text?: string }) {
  return (
    <p className="state" role="status">
      {text}
    </p>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button button-secondary" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="state state-empty">{children}</div>;
}
