import { notFound } from "next/navigation";
import { AdminEntryDetail } from "../../_components/AdminEntryDetail";
import { repository, workspaceTarget } from "@/lib/github";
import { BranchRouteSegmentSchema } from "@/lib/workspace-target";

export default async function EntryDetailPage({ params }: {
  params: Promise<{ branch: string; entryId: string }>;
}) {
  const { branch, entryId } = await params;
  const parsedBranch = BranchRouteSegmentSchema.safeParse(branch);
  if (!parsedBranch.success) notFound();
  return (
    <AdminEntryDetail
      target={workspaceTarget(parsedBranch.data)}
      defaultBranch={repository.branch}
      entryId={entryId}
    />
  );
}
