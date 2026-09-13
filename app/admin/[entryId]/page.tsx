import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntry } from "@/lib/entries";
import { EntryEditor } from "../_components/EntryEditor";

export default async function EntryDetailPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const entry = await getEntry(entryId);
  if (!entry) notFound();

  return (
    <div className="admin-page detail-page">
      <header className="admin-topbar detail-topbar">
        <div>
          <Link className="back-link" href="/admin">← All entries</Link>
          <div className="detail-heading">
            <span className={`type-icon type-${entry.kind}`}>{entry.kind === "page" ? "□" : entry.kind === "module" ? "◫" : "◇"}</span>
            <div><h1>{entry.name}</h1><p>{entry.path}</p></div>
          </div>
        </div>
        {entry.route && <Link className="button button-outline" href={entry.route} target="_blank">View page ↗</Link>}
      </header>
      <section className="admin-content detail-content">
        <div className="editor-card">
          <div className="editor-card-head">
            <div><h2>Fields</h2><p>Changes are kept in the browser for this prototype.</p></div>
            <span className={`type-badge badge-${entry.kind}`}>{entry.kind} · {entry.schema}</span>
          </div>
          <EntryEditor initialFields={entry.fields} />
        </div>
      </section>
    </div>
  );
}
