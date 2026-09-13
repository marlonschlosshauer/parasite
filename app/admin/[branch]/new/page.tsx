import { notFound } from "next/navigation";
import { AdminCreateEntry } from "../../_components/AdminCreateEntry";
import { EntryKindSchema } from "@/lib/entries.shared";
import { repository, workspaceTarget } from "@/lib/github";
import { BranchRouteSegmentSchema } from "@/lib/workspace-target";

export default async function CreateEntryPage({ params, searchParams }: {
  params: Promise<{ branch: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { branch } = await params;
  const parsedBranch = BranchRouteSegmentSchema.safeParse(branch);
  if (!parsedBranch.success) notFound();
  const { type } = await searchParams;
  const parsedKind = EntryKindSchema.safeParse(type);
  return (
    <AdminCreateEntry
      target={workspaceTarget(parsedBranch.data)}
      defaultBranch={repository.branch}
      kind={parsedKind.success ? parsedKind.data : "module"}
    />
  );
}
