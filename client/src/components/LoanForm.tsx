import { useState } from 'react';
import { ApiError, api } from '../api.ts';
import type { FieldErrors, Item } from '../types.ts';
import { Field, ariaFor } from './Field.tsx';

type LoanFormProps = {
  // Entweder ist der Gegenstand fest vorgegeben (Detailseite) …
  fixedItemId?: number;
  // … oder man wählt ihn aus einer Liste (Seite «Ausleihen»).
  items?: Item[];
  onCreated: () => void;
};

const EMPTY = { itemId: '', borrowerName: '', startDate: '', endDate: '' };

export function LoanForm({ fixedItemId, items, onCreated }: LoanFormProps) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof EMPTY, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  // Prüfung im Browser: nur für schnelle Rückmeldung.
  // Die verbindliche Prüfung macht der Server (siehe server/src/validation.ts).
  function checkLocally(): FieldErrors {
    const e: FieldErrors = {};
    if (!fixedItemId && !values.itemId) e.itemId = 'Bitte wähle einen Gegenstand.';
    if (!values.borrowerName.trim()) e.borrowerName = 'Bitte gib den Namen der ausleihenden Person ein.';
    if (!values.startDate) e.startDate = 'Bitte gib ein Startdatum ein.';
    if (!values.endDate) e.endDate = 'Bitte gib ein Rückgabedatum ein.';
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      e.endDate = 'Das Rückgabedatum darf nicht vor dem Startdatum liegen.';
    }
    return e;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setSuccess(null);

    const localErrors = checkLocally();
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSaving(true);
    try {
      await api.createLoan({
        itemId: fixedItemId ?? Number(values.itemId),
        borrowerName: values.borrowerName,
        startDate: values.startDate,
        endDate: values.endDate,
      });
      setValues(EMPTY);
      setSuccess('Die Ausleihe wurde gespeichert.');
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      } else {
        setMessage('Die Ausleihe konnte nicht gespeichert werden.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2>Neue Ausleihe</h2>
      <p className="form-note">Start- und Rückgabetag zählen beide als belegt.</p>

      {message && (
        <p className="alert alert-error" role="alert">
          {message}
        </p>
      )}
      {success && (
        <p className="alert alert-success" role="status">
          {success}
        </p>
      )}

      {!fixedItemId && (
        <Field id="loan-item" label="Gegenstand" error={errors.itemId}>
          <select
            {...ariaFor('loan-item', errors.itemId)}
            value={values.itemId}
            onChange={(e) => update('itemId', e.target.value)}
          >
            <option value="">Bitte wählen …</option>
            {items?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field id="loan-borrower" label="Name der ausleihenden Person" error={errors.borrowerName}>
        <input
          {...ariaFor('loan-borrower', errors.borrowerName)}
          type="text"
          maxLength={100}
          autoComplete="off"
          value={values.borrowerName}
          onChange={(e) => update('borrowerName', e.target.value)}
        />
      </Field>

      <div className="field-row">
        <Field id="loan-start" label="Startdatum" error={errors.startDate}>
          <input
            {...ariaFor('loan-start', errors.startDate)}
            type="date"
            value={values.startDate}
            onChange={(e) => update('startDate', e.target.value)}
          />
        </Field>
        <Field id="loan-end" label="Rückgabedatum" error={errors.endDate}>
          <input
            {...ariaFor('loan-end', errors.endDate)}
            type="date"
            min={values.startDate || undefined}
            value={values.endDate}
            onChange={(e) => update('endDate', e.target.value)}
          />
        </Field>
      </div>

      <button type="submit" className="button" disabled={saving}>
        {saving ? 'Wird gespeichert …' : 'Ausleihe speichern'}
      </button>
    </form>
  );
}
