import { getToken } from "@vercel/connect";
import type { ConnectTokenParams } from "@vercel/connect";
import { z } from "zod";

export const githubSubjectCookie = "parasite-github-subject";
export const connector = "github/parasite";

export const configuredRepository = {
  owner: process.env.GITHUB_REPOSITORY_OWNER ?? "marlonschlosshauer",
  name: process.env.GITHUB_REPOSITORY_NAME ?? "parasite",
  defaultBranch: process.env.GITHUB_REPOSITORY_BRANCH ?? "main",
};

export const BranchNameSchema = z.string().min(1).max(200).refine((value) =>
  !value.startsWith("-") &&
  !value.startsWith("/") &&
  !value.endsWith("/") &&
  !value.endsWith(".") &&
  !value.endsWith(".lock") &&
  !value.includes("..") &&
  !value.includes("@{") &&
  !value.includes("//") &&
  !/[\x00-\x20~^:?*[\\]/.test(value), {
  message: "Invalid Git branch name.",
});

export const WorkspaceSchema = z.object({
  repository: z.object({
    owner: z.string().min(1),
    name: z.string().min(1),
  }).strict(),
  branch: BranchNameSchema,
}).strict();

export type AgentWorkspace = z.infer<typeof WorkspaceSchema>;

function tokenParams(subjectId: string): ConnectTokenParams {
  return {
    subject: { type: "user", id: subjectId },
    authorizationDetails: [{
      type: "github_app_installation",
      repositories: [`${configuredRepository.owner}/${configuredRepository.name}`],
      permissions: ["contents:write", "pull_requests:write"],
    }],
  };
}

export function getAgentGitHubToken(subjectId: string) {
  return getToken(connector, tokenParams(subjectId));
}

export function assertConfiguredWorkspace(input: unknown) {
  const workspace = WorkspaceSchema.parse(input);
  if (
    workspace.repository.owner !== configuredRepository.owner ||
    workspace.repository.name !== configuredRepository.name
  ) {
    throw new Error("The requested repository is not configured for this agent.");
  }
  return workspace;
}

export function subjectFromCookie(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) =>
    part.startsWith(`${githubSubjectCookie}=`)
  )?.slice(githubSubjectCookie.length + 1);
  if (!value) return undefined;
  try {
    const subject = decodeURIComponent(value);
    return z.uuid().safeParse(subject).success ? subject : undefined;
  } catch {
    return undefined;
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (!host || new URL(origin).host !== host) {
    throw new Error("Cross-origin agent requests are not allowed.");
  }
}

export function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}
