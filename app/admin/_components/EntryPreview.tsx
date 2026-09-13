"use client";

import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleGrid } from "@/components/modules/ModuleGrid";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { ModuleQuote } from "@/components/modules/ModuleQuote";
import { ModuleText } from "@/components/modules/ModuleText";
import { withoutType } from "@/lib/content";
import type { EntryKind, PreviewEntry } from "@/lib/entries.shared";
import { ModuleSchema } from "@/schemas/modules";
import { PageContentSchema } from "@/schemas/page";
import { PersonSchema } from "@/schemas/shared/person";

interface EntryPreviewProps {
  kind: EntryKind;
  fields: Record<string, unknown>;
  entries: PreviewEntry[];
}

function filenameLabel(filePath: string) {
  return filePath
    .split("/")
    .at(-1)
    ?.replace(/\.json$/, "")
    .replaceAll("-", " ") ?? filePath;
}

function InvalidPreview({ message }: { message: string }) {
  return (
    <div className="preview-state">
      <span>◇</span>
      <strong>Preview unavailable</strong>
      <p>{message}</p>
    </div>
  );
}

function resolvePerson(reference: string, entries: PreviewEntry[]) {
  const entry = entries.find((candidate) => candidate.path === reference);
  if (!entry) return undefined;
  const parsed = PersonSchema.safeParse(entry.fields);
  return parsed.success ? withoutType(parsed.data) : undefined;
}

function RenderModule({ fields, entries }: {
  fields: Record<string, unknown>;
  entries: PreviewEntry[];
}) {
  const parsed = ModuleSchema.safeParse(fields);
  if (!parsed.success) {
    return <InvalidPreview message={parsed.error.issues[0]?.message ?? "Complete the required fields."} />;
  }

  const content = parsed.data;
  if (content._type === "text") return <ModuleText {...withoutType(content)} />;
  if (content._type === "hero") return <ModuleHero {...withoutType(content)} />;
  if (content._type === "grid") return <ModuleGrid {...withoutType(content)} />;
  if (content._type === "cta") return <ModuleCta {...withoutType(content)} />;

  const person = resolvePerson(content.person, entries);
  if (!person) return <InvalidPreview message={`Referenced person “${filenameLabel(content.person)}” was not found.`} />;
  return <ModuleQuote quote={content.quote} person={person} />;
}

function PagePreview({ fields, entries }: {
  fields: Record<string, unknown>;
  entries: PreviewEntry[];
}) {
  const parsed = PageContentSchema.safeParse(fields);
  if (!parsed.success) {
    return <InvalidPreview message={parsed.error.issues[0]?.message ?? "Complete the required fields."} />;
  }

  return (
    <div className="preview-page">
      <div className="preview-browser-bar">
        <span></span><span></span><span></span>
        <small>{parsed.data.slug}</small>
        <strong>{parsed.data.title}</strong>
      </div>
      {parsed.data.modules.length === 0 && <InvalidPreview message="Add a module reference to compose this page." />}
      {parsed.data.modules.map((reference, index) => {
        const entry = entries.find((candidate) => candidate.path === reference);
        return entry
          ? <RenderModule key={`${reference}-${index}`} fields={entry.fields} entries={entries} />
          : <InvalidPreview key={`${reference}-${index}`} message={`Module “${filenameLabel(reference)}” was not found.`} />;
      })}
    </div>
  );
}

function PersonPreview({ fields }: { fields: Record<string, unknown> }) {
  const parsed = PersonSchema.safeParse(fields);
  if (!parsed.success) {
    return <InvalidPreview message={parsed.error.issues[0]?.message ?? "Complete the required fields."} />;
  }
  const person = parsed.data;
  return (
    <article className="person-preview">
      <span>{person.firstName.charAt(0)}{person.lastName.charAt(0)}</span>
      <p>Shared person</p>
      <h2>{person.firstName} {person.lastName}</h2>
      {person.title && <small>{person.title}</small>}
    </article>
  );
}

export function EntryPreview({ kind, fields, entries }: EntryPreviewProps) {
  return (
    <aside className="entry-live-preview">
      <header><span>Live preview</span><small>Draft</small></header>
      <div className="preview-stage">
        <div className="preview-canvas">
          {kind === "page" && <PagePreview fields={fields} entries={entries} />}
          {kind === "module" && <RenderModule fields={fields} entries={entries} />}
          {kind === "shared" && <PersonPreview fields={fields} />}
        </div>
      </div>
    </aside>
  );
}
