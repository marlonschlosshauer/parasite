import "server-only";

import { getToken, startAuthorization, UserAuthorizationRequiredError } from "@vercel/connect";
import type { ConnectTokenParams } from "@vercel/connect";
import { cookies } from "next/headers";
import { z } from "zod";
import type { WorkspaceTarget } from "@/lib/workspace-target";

export const repository = {
  owner: process.env.GITHUB_REPOSITORY_OWNER ?? "marlonschlosshauer",
  name: process.env.GITHUB_REPOSITORY_NAME ?? "parasite",
  branch: process.env.GITHUB_REPOSITORY_BRANCH ?? "main",
};

const GitHubErrorSchema = z.object({ message: z.string().optional() }).passthrough();
const RepositorySchema = z.object({ full_name: z.string() }).passthrough();

export const githubSubjectCookie = "parasite-github-subject";

export class GitHubSessionRequiredError extends Error {}

export class GitHubRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function tokenParams(subjectId: string): ConnectTokenParams {
  return {
    subject: { type: "user", id: subjectId },
    authorizationDetails: [{
      type: "github_app_installation",
      repositories: [`${repository.owner}/${repository.name}`],
      permissions: ["contents:write", "pull_requests:write"],
    }],
  };
}

export async function getGitHubSubjectId() {
  return (await cookies()).get(githubSubjectCookie)?.value;
}

export async function getGitHubToken(explicitSubjectId?: string) {
  const subjectId = explicitSubjectId ?? await getGitHubSubjectId();
  if (!subjectId) throw new GitHubSessionRequiredError("GitHub authorization is required.");
  return getToken("github/parasite", tokenParams(subjectId));
}

export function workspaceTarget(branch = repository.branch): WorkspaceTarget {
  return {
    repository: { owner: repository.owner, name: repository.name },
    branch,
  };
}

export function assertConfiguredRepository(target: WorkspaceTarget) {
  if (
    target.repository.owner !== repository.owner ||
    target.repository.name !== repository.name
  ) {
    throw new Error("The requested workspace does not match the configured repository.");
  }
}

export async function createGitHubAuthorizationUrl(subjectId: string, callbackUrl: string) {
  const authorization = await startAuthorization(
    "github/parasite",
    tokenParams(subjectId),
    { callbackUrl },
  );
  return authorization.url;
}

export async function githubRequest(pathname: string, init?: RequestInit): Promise<unknown> {
  const token = await getGitHubToken();
  const response = await fetch(`https://api.github.com${pathname}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "parasite-cms",
      "X-GitHub-Api-Version": "2026-03-10",
      ...init?.headers,
    },
  });

  const body: unknown = await response.json();
  if (!response.ok) {
    const parsedError = GitHubErrorSchema.safeParse(body);
    const message = parsedError.success && parsedError.data.message
      ? parsedError.data.message
      : `GitHub request failed with status ${response.status}`;
    throw new GitHubRequestError(message, response.status);
  }

  return body;
}

export type GitHubAccessState =
  | { status: "authorized"; repository: string }
  | { status: "authorization-required" }
  | { status: "forbidden" }
  | { status: "configuration-error"; message: string };

export async function getGitHubAccessState(): Promise<GitHubAccessState> {
  try {
    const data = await githubRequest(`/repos/${repository.owner}/${repository.name}`);
    const repo = RepositorySchema.parse(data);
    return { status: "authorized", repository: repo.full_name };
  } catch (error) {
    if (error instanceof GitHubSessionRequiredError || error instanceof UserAuthorizationRequiredError) {
      return { status: "authorization-required" };
    }
    if (error instanceof GitHubRequestError && (error.status === 403 || error.status === 404)) {
      return { status: "forbidden" };
    }
    return {
      status: "configuration-error",
      message: error instanceof Error ? error.message : "GitHub authorization could not be checked.",
    };
  }
}

const PullRequestSchema = z.object({
  number: z.number().int().positive(),
  html_url: z.string().url(),
  title: z.string(),
}).passthrough();

export async function createRepositoryPullRequest(input: {
  head: string;
  base: string;
  title: string;
}) {
  const existingData = await githubRequest(
    `/repos/${repository.owner}/${repository.name}/pulls?state=open&head=${encodeURIComponent(`${repository.owner}:${input.head}`)}&base=${encodeURIComponent(input.base)}`,
  );
  const existing = z.array(PullRequestSchema).parse(existingData)[0];
  if (existing) return existing;

  const data = await githubRequest(`/repos/${repository.owner}/${repository.name}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      head: input.head,
      base: input.base,
    }),
  });
  return PullRequestSchema.parse(data);
}
