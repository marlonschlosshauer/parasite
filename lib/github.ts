import "server-only";

import { getToken, startAuthorization, UserAuthorizationRequiredError } from "@vercel/connect";
import type { ConnectTokenParams } from "@vercel/connect";
import { cookies } from "next/headers";
import { z } from "zod";

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
      permissions: ["contents:write"],
    }],
  };
}

export async function getGitHubSubjectId() {
  return (await cookies()).get(githubSubjectCookie)?.value;
}

async function getGitHubToken() {
  const subjectId = await getGitHubSubjectId();
  if (!subjectId) throw new GitHubSessionRequiredError("GitHub authorization is required.");
  return getToken("github/parasite", tokenParams(subjectId));
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

const TreeSchema = z.object({
  tree: z.array(z.object({
    path: z.string(),
    type: z.string(),
    sha: z.string(),
  }).passthrough()),
}).passthrough();

export async function getRepositoryTree() {
  const data = await githubRequest(
    `/repos/${repository.owner}/${repository.name}/git/trees/${repository.branch}?recursive=1`,
  );
  return TreeSchema.parse(data).tree;
}

const FileSchema = z.object({
  path: z.string(),
  sha: z.string(),
  encoding: z.literal("base64"),
  content: z.string(),
}).passthrough();

export async function getRepositoryFile(filePath: string) {
  const data = await githubRequest(
    `/repos/${repository.owner}/${repository.name}/contents/${encodeURIComponent(filePath).replaceAll("%2F", "/")}?ref=${encodeURIComponent(repository.branch)}`,
  );
  const file = FileSchema.parse(data);
  return {
    path: file.path,
    sha: file.sha,
    content: Buffer.from(file.content.replaceAll("\n", ""), "base64").toString("utf8"),
  };
}

const SaveResponseSchema = z.object({
  content: z.object({ path: z.string(), sha: z.string() }).nullable(),
  commit: z.object({ sha: z.string(), html_url: z.string().url() }),
}).passthrough();

export async function putRepositoryFile(input: {
  path: string;
  content: string;
  message: string;
  sha?: string;
}) {
  const data = await githubRequest(
    `/repos/${repository.owner}/${repository.name}/contents/${encodeURIComponent(input.path).replaceAll("%2F", "/")}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: input.message,
        content: Buffer.from(input.content).toString("base64"),
        branch: repository.branch,
        ...(input.sha ? { sha: input.sha } : {}),
      }),
    },
  );
  return SaveResponseSchema.parse(data);
}
