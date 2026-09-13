import "server-only";

import { getToken } from "@vercel/connect";
import { z } from "zod";

export const repository = {
  owner: process.env.GITHUB_REPOSITORY_OWNER ?? "marlonschlosshauer",
  name: process.env.GITHUB_REPOSITORY_NAME ?? "parasite",
  branch: process.env.GITHUB_REPOSITORY_BRANCH ?? "main",
};

const GitHubErrorSchema = z.object({ message: z.string().optional() }).passthrough();

export function hasConnectCredentials() {
  return Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
}

async function getGitHubToken() {
  return getToken("github/parasite", {
    subject: { type: "app" },
  });
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
    throw new Error(message);
  }

  return body;
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
