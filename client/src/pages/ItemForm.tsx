import { useEffect, useState } from 'react';
import { ApiError, api } from '../api.ts';
import { Field, ariaFor } from '../components/Field.tsx';
import { ErrorMessage, Loading } from '../components/States.tsx';
import { CATEGORIES, type FieldErrors } from '../types.ts';

// Dasselbe Formular dient zum Hinzufügen (ohne id) und zum Bearbeiten (mit id).
export function ItemForm({ id }: { id?: number }) {
  const [values, setValues] = useState({ name: '', description: '', category: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  // Beim Bearbeiten zuerst die bestehenden Werte laden.
  useEffect(() => {
    if (!id) return;
    api
      .getItem(id)
      .then((item) =>
        setValues({ name: item.name, description: item.description, category: item.category }),
      )
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function update(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    const localErrors: FieldErrors = {};
    if (!values.name.trim()) localErrors.name = 'Bitte gib einen Namen ein.';
    if (!values.category) localErrors.category = 'Bitte wähle eine Kategorie.';
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    setSaving(true);
    try {
      const saved = id ? await api.updateItem(id, values) : await api.createItem(values);
      window.location.hash = `#/gegenstaende/${saved.id}`;
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setMessage(err.message);
      } else {
        setMessage('Speichern ist fehlgeschlagen.');
      }
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (id && message && !values.name) return <ErrorMessage message={message} />;

  // Beim Bearbeiten kann eine alte Kategorie vorkommen, die nicht in der Liste steht.
  const categories =
    values.category && !CATEGORIES.includes(values.category)
      ? [...CATEGORIES, values.category]
      : CATEGORIES;

  return (
    <section>
      <p className="back">
        <a href={id ? `#/gegenstaende/${id}` : '#/'}>← Zurück</a>
      </p>
      <h1>{id ? 'Gegenstand bearbeiten' : 'Gegenstand hinzufügen'}</h1>

      <form className="card form form-narrow" onSubmit={handleSubmit} noValidate>
        {message && (
          <p className="alert alert-error" role="alert">
            {message}
          </p>
        )}

        <Field id="item-name" label="Name" error={errors.name}>
          <input
            {...ariaFor('item-name', errors.name)}
            type="text"
            maxLength={100}
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>

        <Field id="item-category" label="Kategorie" error={errors.category}>
          <select
            {...ariaFor('item-category', errors.category)}
            value={values.category}
            onChange={(e) => update('category', e.target.value)}
          >
            <option value="">Bitte wählen …</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field id="item-description" label="Beschreibung (optional)" error={errors.description}>
          <textarea
            {...ariaFor('item-description', errors.description)}
            rows={4}
            maxLength={500}
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>

        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Wird gespeichert …' : 'Speichern'}
        </button>
      </form>
    </section>
  );
}
