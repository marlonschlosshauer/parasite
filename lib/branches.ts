import "server-only";

import {
  assertConfiguredRepository,
  createRepositoryPullRequest,
  repository,
} from "@/lib/github";
import { openWorkspace } from "@/lib/workspace";
import {
  featureBranchName,
  releaseTitleFromBranch,
  WorkspaceTargetSchema,
  type WorkspaceTarget,
} from "@/lib/workspace-target";

export async function createFeatureBranch(target: WorkspaceTarget, name: string) {
  const parsedTarget = WorkspaceTargetSchema.parse(target);
  assertConfiguredRepository(parsedTarget);
  const branch = featureBranchName(name);
  const workspace = await openWorkspace(parsedTarget);
  await workspace.createBranch(branch);
  return branch;
}

export async function cutRelease(target: WorkspaceTarget) {
  const parsedTarget = WorkspaceTargetSchema.parse(target);
  assertConfiguredRepository(parsedTarget);
  if (parsedTarget.branch === repository.branch) {
    throw new Error("Create or select a feature branch before cutting a release.");
  }

  const pullRequest = await createRepositoryPullRequest({
    head: parsedTarget.branch,
    base: repository.branch,
    title: releaseTitleFromBranch(parsedTarget.branch),
  });
  return {
    number: pullRequest.number,
    title: pullRequest.title,
    url: pullRequest.html_url,
  };
}
