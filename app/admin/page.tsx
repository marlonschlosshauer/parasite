import Link from "next/link";
import { AddEntry } from "./_components/AddEntry";
import { getEntries, type EntryKind } from "@/lib/entries";

const kindLabels: Record<EntryKind, string> = {
  page: "Page",
  module: "Module",
  shared: "Shared",
};

export default async function AdminPage() {
  const entries = await getEntries();
  const entryKinds: EntryKind[] = ["page", "module", "shared"];
  const counts = entries.reduce<Record<EntryKind, number>>((result, entry) => {
    result[entry.kind] += 1;
    return result;
  }, { page: 0, module: 0, shared: 0 });

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div><p>Workspace</p><h1>Entries</h1></div>
        <AddEntry />
      </header>

      <section className="admin-content">
        <div className="metric-row">
          {entryKinds.map((kind) => (
            <div className="metric" key={kind}>
              <span className={`type-icon type-${kind}`}>{kind === "page" ? "□" : kind === "module" ? "◫" : "◇"}</span>
              <div><strong>{counts[kind]}</strong><small>{kindLabels[kind]} entries</small></div>
            </div>
          ))}
        </div>

        <div className="entry-panel">
          <div className="entry-panel-head">
            <div><h2>All entries</h2><p>{entries.length} files in this repository</p></div>
            <div className="search-faux"><span>⌕</span> Search entries… <kbd>⌘ K</kbd></div>
          </div>
          <div className="entry-table" role="table" aria-label="Content entries">
            <div className="entry-table-row entry-table-labels" role="row">
              <span>Name</span><span>Type</span><span>Schema</span><span>Location</span><span></span>
            </div>
            {entries.map((entry) => (
              <Link className="entry-table-row" href={`/admin/${entry.id}`} key={entry.id} role="row">
                <span className="entry-name"><span className={`type-icon type-${entry.kind}`}>{entry.kind === "page" ? "□" : entry.kind === "module" ? "◫" : "◇"}</span><strong>{entry.name}</strong></span>
                <span><span className={`type-badge badge-${entry.kind}`}>{kindLabels[entry.kind]}</span></span>
                <span className="mono">{entry.schema}</span>
                <span className="mono path-cell">{entry.route ?? entry.path}</span>
                <span className="row-arrow">›</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
