"use client";

import Link from "next/link";
import { useWorkspaceSnapshot } from "@/app/admin/_data/workspace-db";
import type { PreviewEntry } from "@/lib/entries.shared";
import type { WorkspaceTarget } from "@/lib/workspace-target";
import { BranchControl } from "./BranchControl";
import { EntryEditor } from "./EntryEditor";
import { WorkspaceError, WorkspaceLoading } from "./WorkspaceLoading";

export function AdminEntryDetail({ target, defaultBranch, entryId }: {
  target: WorkspaceTarget;
  defaultBranch: string;
  entryId: string;
}) {
  const { entries, isLoading, isError, error, refresh } = useWorkspaceSnapshot(target);
  const entry = entries.find((candidate) => candidate.id === entryId);
  const overviewHref = `/admin/${encodeURIComponent(target.branch)}`;
  const previewEntries: PreviewEntry[] = entries
    .filter((candidate) => candidate.kind !== "page")
    .map((candidate) => ({ path: candidate.path, kind: candidate.kind, schema: candidate.schema, fields: candidate.fields }));

  return (
    <div className="admin-page detail-page">
      <header className="admin-topbar detail-topbar">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link className="breadcrumb-back" href={overviewHref} aria-label="Back to entries">←</Link>
          <span className="breadcrumb-separator">/</span>
          <Link className="breadcrumb-link" href={overviewHref}>entries</Link>
          {entry && <><span className="breadcrumb-separator">/</span><span className="breadcrumb-current">{entry.name.toLowerCase()}</span><span className={`type-badge badge-${entry.kind}`}>{entry.kind} · {entry.schema}</span></>}
        </nav>
        <BranchControl target={target} defaultBranch={defaultBranch} />
      </header>
      <section className="admin-content detail-content">
        <div className="editor-card">
          {isLoading ? <WorkspaceLoading detail /> : isError ? (
            <WorkspaceError error={error} retry={() => void refresh()} />
          ) : entry ? (
            <EntryEditor
              target={target}
              initialFields={entry.fields}
              previewEntries={previewEntries}
              entry={{ id: entry.id, name: entry.name, kind: entry.kind, schema: entry.schema, version: entry.version }}
            />
          ) : (
            <div className="workspace-error"><span>?</span><strong>Entry not found</strong><p>This entry is not present in the synced branch.</p><Link className="button button-outline" href={overviewHref}>Back to entries</Link></div>
          )}
        </div>
      </section>
    </div>
  );
}
