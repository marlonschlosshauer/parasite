"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWorkspaceSnapshot } from "@/app/admin/_data/workspace-db";
import { fuzzyScore, type EntryKind } from "@/lib/entries.shared";
import type { WorkspaceTarget } from "@/lib/workspace-target";
import { AddEntry } from "./AddEntry";
import { BranchControl } from "./BranchControl";
import { WorkspaceError, WorkspaceLoading } from "./WorkspaceLoading";

const kindLabels: Record<EntryKind, string> = {
  page: "Page",
  module: "Module",
  shared: "Shared",
};
const entryKinds: EntryKind[] = ["page", "module", "shared"];
const pageSize = 10;

export function AdminOverview({ target, defaultBranch }: { target: WorkspaceTarget; defaultBranch: string }) {
  const { entries, isLoading, isError, isFetching, error, refresh } = useWorkspaceSnapshot(target);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<EntryKind | "">("");
  const [page, setPage] = useState(1);
  const counts = useMemo(() => entries.reduce<Record<EntryKind, number>>((result, entry) => {
    result[entry.kind] += 1;
    return result;
  }, { page: 0, module: 0, shared: 0 }), [entries]);
  const matches = useMemo(() => entries
    .filter((entry) => !kind || entry.kind === kind)
    .map((entry) => ({ entry, score: query ? fuzzyScore(`${entry.name} ${entry.path}`, query) : 0 }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name))
    .map(({ entry }) => entry), [entries, kind, query]);
  const pageCount = Math.max(Math.ceil(matches.length / pageSize), 1);
  const currentPage = Math.min(page, pageCount);
  const visibleEntries = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div>
          <p>Workspace {isFetching && !isLoading ? <span className="sync-inline">· Syncing</span> : null}</p>
          <h1>Entries</h1>
        </div>
        <div className="admin-topbar-actions">
          <BranchControl target={target} defaultBranch={defaultBranch} />
          <AddEntry branch={target.branch} />
        </div>
      </header>

      <section className="admin-content">
        {isLoading ? <WorkspaceLoading /> : isError ? (
          <WorkspaceError error={error} retry={() => void refresh()} />
        ) : (
          <>
            <div className="metric-row">
              {entryKinds.map((entryKind) => (
                <div className="metric" key={entryKind}>
                  <span className={`type-icon type-${entryKind}`}>{entryKind === "page" ? "□" : entryKind === "module" ? "◫" : "◇"}</span>
                  <div><strong>{counts[entryKind]}</strong><small>{kindLabels[entryKind]} entries</small></div>
                </div>
              ))}
            </div>

            <div className="entry-panel">
              <div className="entry-panel-head">
                <div><h2>All entries</h2><p>{matches.length} matching files</p></div>
                <div className="entry-filters">
                  <label className="entry-search"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search file names…" /></label>
                  <select value={kind} onChange={(event) => { setKind(event.target.value as EntryKind | ""); setPage(1); }} aria-label="Filter by type">
                    <option value="">All types</option>
                    {entryKinds.map((option) => <option key={option} value={option}>{kindLabels[option]}</option>)}
                  </select>
                </div>
              </div>
              <div className="entry-table" role="table" aria-label="Content entries">
                <div className="entry-table-row entry-table-labels" role="row">
                  <span>Name</span><span>Type</span><span>Schema</span><span>Location</span><span></span>
                </div>
                {visibleEntries.map((entry) => (
                  <Link className="entry-table-row" href={`/admin/${encodeURIComponent(target.branch)}/${entry.id}`} key={entry.id} role="row">
                    <span className="entry-name"><span className={`type-icon type-${entry.kind}`}>{entry.kind === "page" ? "□" : entry.kind === "module" ? "◫" : "◇"}</span><strong>{entry.name}</strong></span>
                    <span><span className={`type-badge badge-${entry.kind}`}>{kindLabels[entry.kind]}</span></span>
                    <span className="mono">{entry.schema}</span>
                    <span className="mono path-cell">{entry.route ?? entry.path}</span>
                    <span className="row-arrow">›</span>
                  </Link>
                ))}
                {visibleEntries.length === 0 && <div className="entry-empty">No entries match this search.</div>}
              </div>
              {pageCount > 1 && (
                <nav className="pagination" aria-label="Pagination">
                  <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(value - 1, 1))} type="button">← Previous</button>
                  <small>Page {currentPage} of {pageCount}</small>
                  <button disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(value + 1, pageCount))} type="button">Next →</button>
                </nav>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
