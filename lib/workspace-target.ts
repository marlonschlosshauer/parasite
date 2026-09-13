import { z } from "zod";

const RepositoryNameSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/);

function isValidBranchName(value: string) {
  return value.length <= 200 &&
    !value.startsWith("-") &&
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.endsWith(".") &&
    !value.endsWith(".lock") &&
    !value.includes("..") &&
    !value.includes("@{") &&
    !value.includes("//") &&
    !/[\x00-\x20~^:?*[\\]/.test(value);
}

export const BranchNameSchema = z.string().min(1).refine(isValidBranchName, {
  message: "Invalid Git branch name.",
});

export const FeatureBranchNameSchema = z.string()
  .min(1, "Enter a branch name.")
  .max(60, "Branch names must be 60 characters or fewer.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens.",
  );

export const WorkspaceTargetSchema = z.object({
  repository: z.object({
    owner: RepositoryNameSchema,
    name: RepositoryNameSchema,
  }).strict(),
  branch: BranchNameSchema,
}).strict();

export type WorkspaceTarget = z.infer<typeof WorkspaceTargetSchema>;

export function featureBranchName(name: string) {
  return `parasite/${FeatureBranchNameSchema.parse(name)}`;
}

export function releaseTitleFromBranch(branch: string) {
  const name = branch.startsWith("parasite/") ? branch.slice("parasite/".length) : branch;
  const title = name.replaceAll("-", " ");
  return title.charAt(0).toUpperCase() + title.slice(1);
}
