"use client";

import Link from "next/link";
import { useWorkspaceSnapshot } from "@/app/admin/_data/workspace-db";
import type { EntryKind, PreviewEntry } from "@/lib/entries.shared";
import type { WorkspaceTarget } from "@/lib/workspace-target";
import { BranchControl } from "./BranchControl";
import { CreateEntryForm } from "./CreateEntryForm";
import { WorkspaceError, WorkspaceLoading } from "./WorkspaceLoading";

export function AdminCreateEntry({ target, defaultBranch, kind }: {
  target: WorkspaceTarget;
  defaultBranch: string;
  kind: EntryKind;
}) {
  const { entries, isLoading, isError, error, refresh } = useWorkspaceSnapshot(target);
  const overviewHref = `/admin/${encodeURIComponent(target.branch)}`;
  const previewEntries: PreviewEntry[] = entries
    .filter((entry) => entry.kind !== "page")
    .map((entry) => ({ path: entry.path, kind: entry.kind, schema: entry.schema, fields: entry.fields }));

  return (
    <div className="admin-page detail-page">
      <header className="admin-topbar detail-topbar">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link className="breadcrumb-back" href={overviewHref} aria-label="Back to entries">←</Link>
          <Link className="breadcrumb-link" href={overviewHref}>entries</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">new {kind}</span>
          <span className={`type-badge badge-${kind}`}>{kind}</span>
        </nav>
        <BranchControl target={target} defaultBranch={defaultBranch} />
      </header>
      <section className="admin-content detail-content">
        <div className="editor-card">
          {isLoading ? <WorkspaceLoading detail /> : isError ? (
            <WorkspaceError error={error} retry={() => void refresh()} />
          ) : (
            <><div className="editor-card-head"><div><h2>Create {kind}</h2><p>No repository changes are made until you save.</p></div></div><CreateEntryForm target={target} kind={kind} previewEntries={previewEntries} /></>
          )}
        </div>
      </section>
    </div>
  );
}
