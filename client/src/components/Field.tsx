// Ein Formularfeld: Beschriftung, das Eingabefeld (children) und eine Fehlermeldung.
// Das Eingabefeld selbst setzt id, aria-invalid und aria-describedby={`${id}-error`},
// damit Screenreader die Fehlermeldung zum richtigen Feld vorlesen.

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className={error ? 'field field-invalid' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

// Hilfsfunktion für die aria-Attribute eines Eingabefelds.
export function ariaFor(id: string, error?: string) {
  return {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
  };
}
