"use client";

import { useMemo, useState } from "react";
import { EntryEditor } from "./EntryEditor";
import type { EntryKind, PreviewEntry } from "@/lib/entries.shared";

const moduleSchemas = ["text", "hero", "grid", "quote", "cta"];

function moduleTemplate(schema: string): Record<string, unknown> {
  if (schema === "hero") return { _type: "hero", eyebrow: "", heading: "New hero", body: "" };
  if (schema === "grid") return { _type: "grid", eyebrow: "", heading: "New grid", cards: [{ eyebrow: "01", title: "New card", text: "" }] };
  if (schema === "quote") return { _type: "quote", quote: "", person: "content/shared/george-washington.json" };
  if (schema === "cta") return { _type: "cta", heading: "New call to action", body: "", link: { label: "Learn more", href: "/" } };
  return { _type: "text", eyebrow: "", heading: "New text section", body: "", align: "left" };
}

function templateFor(kind: EntryKind, schema: string): Record<string, unknown> {
  if (kind === "page") return { _type: "page", title: "New page", slug: "/new-page", modules: [] };
  if (kind === "shared") return { _type: "person", firstName: "", lastName: "", title: "" };
  return moduleTemplate(schema);
}

export function CreateEntryForm({ kind, previewEntries }: { kind: EntryKind; previewEntries: PreviewEntry[] }) {
  const [schema, setSchema] = useState(kind === "module" ? "text" : kind === "shared" ? "person" : "page");
  const [name, setName] = useState("");
  const fields = useMemo(() => templateFor(kind, schema), [kind, schema]);

  return (
    <>
      <div className="create-settings">
        {kind !== "page" && (
          <label className="field-row">
            <span>File name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. summer-campaign" autoFocus />
          </label>
        )}
        {kind === "module" && (
          <label className="field-row">
            <span>Module type</span>
            <select value={schema} onChange={(event) => setSchema(event.target.value)}>
              {moduleSchemas.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        )}
      </div>
      <EntryEditor
        key={`${kind}-${schema}`}
        initialFields={fields}
        previewEntries={previewEntries}
        isNew
        entry={{ name: kind === "page" ? "New page" : name, kind, schema }}
      />
    </>
  );
}
