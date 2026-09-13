import Link from "next/link";
import { CreateEntryForm } from "../_components/CreateEntryForm";
import { EntryKindSchema } from "@/lib/entries.shared";
import { requireGitHubAccess } from "@/lib/admin-auth";

export default async function CreateEntryPage({ searchParams }: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireGitHubAccess();
  const { type } = await searchParams;
  const parsedKind = EntryKindSchema.safeParse(type);
  const kind = parsedKind.success ? parsedKind.data : "module";

  return (
    <div className="admin-page detail-page">
      <header className="admin-topbar detail-topbar">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link className="breadcrumb-back" href="/admin" aria-label="Back to entries">←</Link>
          <Link className="breadcrumb-link" href="/admin">entries</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">new {kind}</span>
          <span className={`type-badge badge-${kind}`}>{kind}</span>
        </nav>
      </header>
      <section className="admin-content detail-content">
        <div className="editor-card">
          <div className="editor-card-head">
            <div><h2>Create {kind}</h2><p>No repository changes are made until you save.</p></div>
          </div>
          <CreateEntryForm kind={kind} />
        </div>
      </section>
    </div>
  );
}
