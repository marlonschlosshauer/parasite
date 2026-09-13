import Link from "next/link";
import { CreateEntryForm } from "../_components/CreateEntryForm";
import { BranchControl } from "../_components/BranchControl";
import { EntryKindSchema } from "@/lib/entries.shared";
import { requireGitHubAccess } from "@/lib/admin-auth";
import { getBranches, getEntries } from "@/lib/entries";
import { repository, workspaceTarget } from "@/lib/github";
import { BranchNameSchema } from "@/lib/workspace-target";

export default async function CreateEntryPage({ searchParams }: {
  searchParams: Promise<{ type?: string; branch?: string }>;
}) {
  await requireGitHubAccess();
  const { type, branch } = await searchParams;
  const parsedBranch = BranchNameSchema.safeParse(branch);
  const target = workspaceTarget(parsedBranch.success ? parsedBranch.data : repository.branch);
  const parsedKind = EntryKindSchema.safeParse(type);
  const kind = parsedKind.success ? parsedKind.data : "module";
  const entries = await getEntries(target, { pageSize: 100 });
  const branches = await getBranches(target);
  const previewEntries = entries.items
    .filter((entry) => entry.kind !== "page")
    .map((entry) => ({ path: entry.path, kind: entry.kind, schema: entry.schema, fields: entry.fields }));

  return (
    <div className="admin-page detail-page">
      <header className="admin-topbar detail-topbar">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link className="breadcrumb-back" href={`/admin?branch=${encodeURIComponent(target.branch)}`} aria-label="Back to entries">←</Link>
          <Link className="breadcrumb-link" href={`/admin?branch=${encodeURIComponent(target.branch)}`}>entries</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">new {kind}</span>
          <span className={`type-badge badge-${kind}`}>{kind}</span>
        </nav>
        <BranchControl target={target} branches={branches} defaultBranch={repository.branch} />
      </header>
      <section className="admin-content detail-content">
        <div className="editor-card">
          <div className="editor-card-head">
            <div><h2>Create {kind}</h2><p>No repository changes are made until you save.</p></div>
          </div>
          <CreateEntryForm target={target} kind={kind} previewEntries={previewEntries} />
        </div>
      </section>
    </div>
  );
}
