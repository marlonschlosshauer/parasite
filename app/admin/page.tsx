import Link from "next/link";
import { AddEntry } from "./_components/AddEntry";
import { BranchControl } from "./_components/BranchControl";
import { getBranches, getEntries, type EntryKind } from "@/lib/entries";
import { EntryKindSchema } from "@/lib/entries.shared";
import { requireGitHubAccess } from "@/lib/admin-auth";
import { repository, workspaceTarget } from "@/lib/github";
import { BranchNameSchema } from "@/lib/workspace-target";

const kindLabels: Record<EntryKind, string> = {
  page: "Page",
  module: "Module",
  shared: "Shared",
};

function paginationHref(branch: string, query: string, kind: EntryKind | undefined, page: number) {
  const params = new URLSearchParams();
  if (branch !== repository.branch) params.set("branch", branch);
  if (query) params.set("query", query);
  if (kind) params.set("kind", kind);
  if (page > 1) params.set("page", String(page));
  const serialized = params.toString();
  return serialized ? `/admin?${serialized}` : "/admin";
}

export default async function AdminPage({ searchParams }: {
  searchParams: Promise<{ branch?: string; query?: string; kind?: string; page?: string }>;
}) {
  await requireGitHubAccess();
  const params = await searchParams;
  const parsedBranch = BranchNameSchema.safeParse(params.branch);
  const target = workspaceTarget(parsedBranch.success ? parsedBranch.data : repository.branch);
  const parsedKind = EntryKindSchema.safeParse(params.kind);
  const kind = parsedKind.success ? parsedKind.data : undefined;
  const query = params.query?.trim() ?? "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const entries = await getEntries(target, { kind, query, page: Number.isNaN(requestedPage) ? 1 : requestedPage });
  const branches = await getBranches(target);
  const entryKinds: EntryKind[] = ["page", "module", "shared"];

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div><p>Workspace</p><h1>Entries</h1></div>
        <div className="admin-topbar-actions">
          <BranchControl target={target} branches={branches} defaultBranch={repository.branch} />
          <AddEntry branch={target.branch} />
        </div>
      </header>

      <section className="admin-content">
        <div className="metric-row">
          {entryKinds.map((kind) => (
            <div className="metric" key={kind}>
              <span className={`type-icon type-${kind}`}>{kind === "page" ? "□" : kind === "module" ? "◫" : "◇"}</span>
              <div><strong>{entries.counts[kind]}</strong><small>{kindLabels[kind]} entries</small></div>
            </div>
          ))}
        </div>

        <div className="entry-panel">
          <div className="entry-panel-head">
            <div><h2>All entries</h2><p>{entries.total} matching files</p></div>
            <form className="entry-filters">
              {target.branch !== repository.branch && <input type="hidden" name="branch" value={target.branch} />}
              <label className="entry-search"><span>⌕</span><input name="query" defaultValue={query} placeholder="Search file names…" /></label>
              <select name="kind" defaultValue={kind ?? ""} aria-label="Filter by type">
                <option value="">All types</option>
                {entryKinds.map((option) => <option key={option} value={option}>{kindLabels[option]}</option>)}
              </select>
              <button className="button button-outline" type="submit">Filter</button>
            </form>
          </div>
          <div className="entry-table" role="table" aria-label="Content entries">
            <div className="entry-table-row entry-table-labels" role="row">
              <span>Name</span><span>Type</span><span>Schema</span><span>Location</span><span></span>
            </div>
            {entries.items.map((entry) => (
              <Link className="entry-table-row" href={`/admin/${entry.id}?branch=${encodeURIComponent(target.branch)}`} key={entry.id} role="row">
                <span className="entry-name"><span className={`type-icon type-${entry.kind}`}>{entry.kind === "page" ? "□" : entry.kind === "module" ? "◫" : "◇"}</span><strong>{entry.name}</strong></span>
                <span><span className={`type-badge badge-${entry.kind}`}>{kindLabels[entry.kind]}</span></span>
                <span className="mono">{entry.schema}</span>
                <span className="mono path-cell">{entry.route ?? entry.path}</span>
                <span className="row-arrow">›</span>
              </Link>
            ))}
            {entries.items.length === 0 && <div className="entry-empty">No entries match this search.</div>}
          </div>
          {entries.pageCount > 1 && (
            <nav className="pagination" aria-label="Pagination">
              {entries.page > 1 ? <Link href={paginationHref(target.branch, query, kind, entries.page - 1)}>← Previous</Link> : <span>← Previous</span>}
              <small>Page {entries.page} of {entries.pageCount}</small>
              {entries.page < entries.pageCount ? <Link href={paginationHref(target.branch, query, kind, entries.page + 1)}>Next →</Link> : <span>Next →</span>}
            </nav>
          )}
        </div>
      </section>
    </div>
  );
}
