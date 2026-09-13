import { notFound } from "next/navigation";
import { AdminOverview } from "../_components/AdminOverview";
import { repository, workspaceTarget } from "@/lib/github";
import { BranchRouteSegmentSchema } from "@/lib/workspace-target";

export default async function AdminPage({ params }: {
  params: Promise<{ branch: string }>;
}) {
  const { branch } = await params;
  const parsedBranch = BranchRouteSegmentSchema.safeParse(branch);
  if (!parsedBranch.success) notFound();
  return <AdminOverview target={workspaceTarget(parsedBranch.data)} defaultBranch={repository.branch} />;
}
