"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveEntryAction } from "@/app/admin/actions";
import { EntryPreview } from "./EntryPreview";
import type { PreviewEntry } from "@/lib/entries.shared";
import type { SaveEntryInput } from "@/lib/save-entry";
import type { WorkspaceTarget } from "@/lib/workspace-target";

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
            <div className="array-item" key={index}>
              <Field label={`${label} ${index + 1}`} value={item} path={[...path, index]} onChange={onChange} />
              <button type="button" className="array-remove" onClick={() => onChange(path, value.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
            </div>
          ))}
          <button type="button" className="array-add" onClick={() => onChange(path, [...value, value.length ? structuredClone(value[0]) : ""])}>＋ Add item</button>
        </div>
      </fieldset>
    );
  }

  if (isFields(value)) {
    return (
      <fieldset className="field-group nested-group">
        <legend>{label}</legend>
        {Object.entries(value).filter(([key]) => key !== "_type").map(([key, child]) => (
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

interface EntryEditorProps {
  target: WorkspaceTarget;
  initialFields: Fields;
  entry: Omit<SaveEntryInput, "fields" | "version"> & { version?: string };
  previewEntries: PreviewEntry[];
  isNew?: boolean;
}

export function EntryEditor({ target, initialFields, entry, previewEntries, isNew = false }: EntryEditorProps) {
  const router = useRouter();
  const serializedInitial = useMemo(() => JSON.stringify(initialFields), [initialFields]);
  const [fields, setFields] = useState(initialFields);
  const [savedSnapshot, setSavedSnapshot] = useState(serializedInitial);
  const [version, setVersion] = useState(entry.version);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const dirty = isNew || JSON.stringify(fields) !== savedSnapshot;

  function handleChange(path: (string | number)[], value: unknown) {
    setMessage("");
    setFields((current) => {
      const updated = updateAtPath(current, path, value);
      return isFields(updated) ? updated : current;
    });
  }

  function handleSave() {
    if (!dirty) return;
    setMessage("");
    startTransition(async () => {
      const result = await saveEntryAction(target, { ...entry, fields, version });
      if (!result.ok) {
        setMessage(`Error: ${result.message}`);
        return;
      }
      setSavedSnapshot(JSON.stringify(fields));
      setVersion(result.version);
      setMessage(`Saved and committed to ${target.branch}.`);
      if (isNew) router.replace(`/admin/${encodeURIComponent(target.branch)}/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="entry-editor">
      <div className="editor-workspace">
        <div className="editor-fields">
          {Object.entries(fields).filter(([key]) => key !== "_type").map(([key, value]) => (
            <Field key={key} label={key} value={value} path={[key]} onChange={handleChange} />
          ))}
        </div>
        <EntryPreview kind={entry.kind} fields={fields} entries={previewEntries} />
      </div>
      <div className="editor-actions">
        <div>{message && <p className={message.startsWith("Error:") ? "save-error" : ""} role="status">{message.startsWith("Error:") ? "!" : "✓"} {message}</p>}</div>
        <button className="button button-dark" disabled={!dirty || isPending || (isNew && entry.kind !== "page" && !entry.name.trim())} onClick={handleSave}>
          {isPending ? "Saving…" : isNew ? "Create entry" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
