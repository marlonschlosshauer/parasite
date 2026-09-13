import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntry } from "@/lib/entries";
import { EntryEditor } from "../_components/EntryEditor";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  const entry = await getEntry(entryId);
  if (!entry) notFound();

  return (
    <div className="admin-page detail-page">
      <header className="admin-topbar detail-topbar">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link
            className="breadcrumb-back"
            href="/admin"
            aria-label="Back to entries"
          >
            ←
          </Link>
          <Link className="breadcrumb-link" href="/admin">
            / entries
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{entry.name.toLowerCase()}</span>
          <span className={`type-badge badge-${entry.kind}`}>
            {entry.kind} · {entry.schema}
          </span>
        </nav>
      </header>
      <section className="admin-content detail-content">
        <div className="editor-card">
          <EntryEditor
            initialFields={entry.fields}
            entry={{
              id: entry.id,
              name: entry.name,
              kind: entry.kind,
              schema: entry.schema,
              version: entry.version,
            }}
          />
        </div>
      </section>
    </div>
  );
}
