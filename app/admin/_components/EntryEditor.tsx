"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useWorkspaceCollections } from "@/app/admin/_data/workspace-db";
import { EntryPreview } from "./EntryPreview";
import type { EntryDetail, PreviewEntry } from "@/lib/entries.shared";
import type { SaveEntryInput } from "@/lib/save-entry";
import type { WorkspaceTarget } from "@/lib/workspace-target";
import { PageContentSchema } from "@/schemas/page";

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

function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("Enter a file name containing letters or numbers.");
  return slug;
}

function newEntry(target: WorkspaceTarget, entry: EntryEditorProps["entry"], fields: Fields): EntryDetail {
  if (entry.kind === "page") {
    const page = PageContentSchema.parse(fields);
    return {
      id: page.slug === "/" ? "page-home" : `page-${page.slug.slice(1).replaceAll("/", "-")}`,
      name: page.title,
      kind: "page",
      schema: "page",
      path: page.slug === "/" ? "app/(app)/page.tsx" : `app/(app)${page.slug}/page.tsx`,
      route: page.slug,
      updated: `Git · ${target.branch}`,
      fields,
    };
  }
  const slug = slugify(entry.name);
  return {
    id: `${entry.kind}-${slug}`,
    name: entry.name,
    kind: entry.kind,
    schema: entry.schema,
    path: `content/${entry.kind === "module" ? "modules" : "shared"}/${slug}.json`,
    updated: `Git · ${target.branch}`,
    fields,
  };
}

export function EntryEditor({ target, initialFields, entry, previewEntries, isNew = false }: EntryEditorProps) {
  const router = useRouter();
  const { entries: entriesCollection } = useWorkspaceCollections(target);
  const serializedInitial = useMemo(() => JSON.stringify(initialFields), [initialFields]);
  const [fields, setFields] = useState(initialFields);
  const [savedSnapshot, setSavedSnapshot] = useState(serializedInitial);
  const [version, setVersion] = useState(entry.version);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const dirty = isNew || JSON.stringify(fields) !== savedSnapshot;

  function handleChange(path: (string | number)[], value: unknown) {
    setMessage("");
    setFields((current) => {
      const updated = updateAtPath(current, path, value);
      return isFields(updated) ? updated : current;
    });
  }

  async function handleSave() {
    if (!dirty) return;
    setMessage("");
    setIsPending(true);
    try {
      const optimistic = isNew ? newEntry(target, entry, fields) : undefined;
      if (!optimistic && !entry.id) throw new Error("The entry ID is missing.");
      const transaction = optimistic
        ? entriesCollection.insert(optimistic)
        : entriesCollection.update(entry.id, (draft) => {
            draft.fields = structuredClone(fields);
            draft.updated = `Git · ${target.branch}`;
            if (entry.kind === "page" && typeof fields.title === "string") draft.name = fields.title;
          });
      await transaction.isPersisted.promise;
      setSavedSnapshot(JSON.stringify(fields));
      const id = optimistic?.id ?? entry.id;
      if (!id) throw new Error("The saved entry ID is missing.");
      setVersion(entriesCollection.get(id)?.version ?? version);
      setMessage(`Saved and committed to ${target.branch}.`);
      if (isNew) router.replace(`/admin/${encodeURIComponent(target.branch)}/${id}`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : "The entry could not be saved."}`);
    } finally {
      setIsPending(false);
    }
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
        <button className="button button-dark" disabled={!dirty || isPending || (isNew && entry.kind !== "page" && !entry.name.trim())} onClick={() => void handleSave()}>
          {isPending ? "Saving…" : isNew ? "Create entry" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
