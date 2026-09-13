"use client";

import { useMemo, useState } from "react";

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function updateAtPath(value: unknown, path: (string | number)[], nextValue: unknown): unknown {
  if (path.length === 0) return nextValue;
  const [head, ...tail] = path;
  if (Array.isArray(value)) {
    return value.map((item, index) => index === head ? updateAtPath(item, tail, nextValue) : item);
  }
  if (!isFields(value)) return value;
  return { ...value, [head]: updateAtPath(value[head], tail, nextValue) };
}

function Field({ label, value, path, onChange }: {
  label: string;
  value: unknown;
  path: (string | number)[];
  onChange: (path: (string | number)[], value: unknown) => void;
}) {
  if (Array.isArray(value)) {
    return (
      <fieldset className="field-group">
        <legend>{label}<span>{value.length} items</span></legend>
        <div className="array-fields">
          {value.map((item, index) => (
            <Field key={index} label={`${label} ${index + 1}`} value={item} path={[...path, index]} onChange={onChange} />
          ))}
        </div>
      </fieldset>
    );
  }

  if (isFields(value)) {
    return (
      <fieldset className="field-group nested-group">
        <legend>{label}</legend>
        {Object.entries(value).map(([key, child]) => (
          <Field key={key} label={key} value={child} path={[...path, key]} onChange={onChange} />
        ))}
      </fieldset>
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="field-row field-checkbox">
        <span>{label}</span>
        <input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />
      </label>
    );
  }

  const stringValue = value == null ? "" : String(value);
  const long = stringValue.length > 80;
  return (
    <label className="field-row">
      <span>{label}</span>
      {long ? (
        <textarea rows={4} value={stringValue} onChange={(event) => onChange(path, event.target.value)} />
      ) : (
        <input
          value={stringValue}
          onChange={(event) => onChange(path, typeof value === "number" ? Number(event.target.value) : event.target.value)}
        />
      )}
      {typeof value === "string" && value.startsWith("content/") && <small className="reference-hint">↳ Entry reference</small>}
    </label>
  );
}

export function EntryEditor({ initialFields }: { initialFields: Fields }) {
  const serializedInitial = useMemo(() => JSON.stringify(initialFields), [initialFields]);
  const [fields, setFields] = useState(initialFields);
  const [savedSnapshot, setSavedSnapshot] = useState(serializedInitial);
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(fields) !== savedSnapshot;

  function handleChange(path: (string | number)[], value: unknown) {
    setMessage("");
    setFields((current) => {
      const updated = updateAtPath(current, path, value);
      return isFields(updated) ? updated : current;
    });
  }

  function handleSave() {
    if (!dirty) return;
    setSavedSnapshot(JSON.stringify(fields));
    setMessage("Draft captured locally. File writes and commits are intentionally not connected yet.");
  }

  return (
    <>
      <div className="editor-fields">
        {Object.entries(fields).map(([key, value]) => (
          <Field key={key} label={key} value={value} path={[key]} onChange={handleChange} />
        ))}
      </div>
      <div className="editor-actions">
        <div>{message && <p role="status">✓ {message}</p>}</div>
        <button className="button button-dark" disabled={!dirty} onClick={handleSave}>Save changes</button>
      </div>
    </>
  );
}
