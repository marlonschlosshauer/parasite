import Link from "next/link";
import { notFound } from "next/navigation";
import { getBranches, getEntryEditorData } from "@/lib/entries";
import { EntryEditor } from "../../_components/EntryEditor";
import { BranchControl } from "../../_components/BranchControl";
import { requireGitHubAccess } from "@/lib/admin-auth";
import { repository, workspaceTarget } from "@/lib/github";
import { BranchNameSchema } from "@/lib/workspace-target";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ branch: string; entryId: string }>;
}) {
  await requireGitHubAccess();
  const { branch, entryId } = await params;
  const parsedBranch = BranchNameSchema.safeParse(branch);
  if (!parsedBranch.success) notFound();
  const target = workspaceTarget(parsedBranch.data);
  const { entry, previewEntries } = await getEntryEditorData(target, entryId);
  if (!entry) notFound();
  const branches = await getBranches(target);
  const overviewHref = `/admin/${encodeURIComponent(target.branch)}`;

  return (
    <div className="admin-page detail-page">
      <header className="admin-topbar detail-topbar">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link
            className="breadcrumb-back"
            href={overviewHref}
            aria-label="Back to entries"
          >
            ←
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link className="breadcrumb-link" href={overviewHref}>
            entries
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{entry.name.toLowerCase()}</span>
          <span className={`type-badge badge-${entry.kind}`}>
            {entry.kind} · {entry.schema}
          </span>
        </nav>
        <BranchControl target={target} branches={branches} defaultBranch={repository.branch} />
      </header>
      <section className="admin-content detail-content">
        <div className="editor-card">
          <EntryEditor
            target={target}
            initialFields={entry.fields}
            previewEntries={previewEntries}
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
