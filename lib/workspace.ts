import "server-only";

import { createHash } from "node:crypto";
import path from "node:path";
import { APIError, Sandbox } from "@vercel/sandbox";
import {
  assertConfiguredRepository,
  getGitHubSubjectId,
  getGitHubToken,
  GitHubSessionRequiredError,
} from "@/lib/github";
import { WorkspaceTargetSchema, type WorkspaceTarget } from "@/lib/workspace-target";

const askPassScript = `#!/bin/sh
case "$1" in
  *Username*) printf '%s\\n' 'x-access-token' ;;
  *) printf '%s\\n' "$PARASITE_GITHUB_TOKEN" ;;
esac
`;

export class WorkspaceConflictError extends Error {}

const workspaceOpenings = new Map<string, Promise<RepositoryWorkspace>>();

function assertRepositoryPath(filePath: string) {
  const normalized = path.posix.normalize(filePath);
  if (
    normalized !== filePath ||
    normalized.startsWith("../") ||
    normalized.startsWith("/") ||
    normalized === "."
  ) {
    throw new Error(`Invalid repository path: ${filePath}`);
  }
  return normalized;
}

function sandboxName(subjectId: string, target: WorkspaceTarget) {
  const identity = `v2:${subjectId}:${target.repository.owner}/${target.repository.name}:${target.branch}`;
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 20);
  return `parasite-${digest}`;
}

function gitEnvironment(token: string, askPassPath: string) {
  return {
    GIT_ASKPASS: askPassPath,
    GIT_TERMINAL_PROMPT: "0",
    PARASITE_GITHUB_TOKEN: token,
  };
}

export class RepositoryWorkspace {
  constructor(
    private readonly sandbox: Sandbox,
    readonly target: WorkspaceTarget,
    private readonly token: string,
    readonly root: string,
    private readonly askPassPath: string,
  ) {}

  private async git(args: string[], options: { allowFailure?: boolean; authenticated?: boolean } = {}) {
    const result = await this.sandbox.runCommand({
      cmd: "git",
      args,
      cwd: this.root,
      env: options.authenticated ? gitEnvironment(this.token, this.askPassPath) : undefined,
    });
    const stdout = await result.stdout();
    const stderr = await result.stderr();
    if (result.exitCode !== 0 && !options.allowFailure) {
      throw new Error(stderr.trim() || `Git command failed with exit code ${result.exitCode}.`);
    }
    return { exitCode: result.exitCode, stdout, stderr };
  }

  private absolutePath(filePath: string) {
    return `${this.root}/${assertRepositoryPath(filePath)}`;
  }

  async sync() {
    await this.git(["fetch", "--prune", "origin", this.target.branch], { authenticated: true });
    await this.git(["switch", this.target.branch]);
    const merge = await this.git(
      ["merge", "--ff-only", `refs/remotes/origin/${this.target.branch}`],
      { allowFailure: true },
    );
    if (merge.exitCode !== 0) {
      throw new WorkspaceConflictError(
        "The workspace and remote branch have diverged. Refresh the workspace before continuing.",
      );
    }
  }

  async listTrackedFiles() {
    const { stdout } = await this.git(["ls-files", "-z"]);
    return stdout.split("\0").filter(Boolean);
  }

  async listTrackedFileVersions() {
    const { stdout } = await this.git(["ls-tree", "-r", "-z", "HEAD"]);
    const versions = new Map<string, string>();
    for (const record of stdout.split("\0")) {
      if (!record) continue;
      const [metadata, filePath] = record.split("\t");
      const version = metadata?.split(" ")[2];
      if (filePath && version) versions.set(filePath, version);
    }
    return versions;
  }

  async readFile(filePath: string) {
    return this.sandbox.fs.readFile(this.absolutePath(filePath), "utf8");
  }

  async writeFile(filePath: string, content: string) {
    const absolutePath = this.absolutePath(filePath);
    await this.sandbox.fs.mkdir(path.posix.dirname(absolutePath), { recursive: true });
    await this.sandbox.fs.writeFile(absolutePath, content, "utf8");
  }

  async fileExists(filePath: string) {
    return this.sandbox.fs.exists(this.absolutePath(filePath));
  }

  async fileVersion(filePath: string) {
    const result = await this.git(["rev-parse", `HEAD:${assertRepositoryPath(filePath)}`], {
      allowFailure: true,
    });
    return result.exitCode === 0 ? result.stdout.trim() : undefined;
  }

  async listBranches() {
    await this.git([
      "fetch",
      "--prune",
      "origin",
      "+refs/heads/*:refs/remotes/origin/*",
    ], { authenticated: true });
    const { stdout } = await this.git([
      "for-each-ref",
      "--format=%(refname:strip=3)",
      "refs/remotes/origin",
    ]);
    return Array.from(new Set(stdout.split("\n")
      .map((branch) => branch.trim())
      .filter((branch) => branch && branch !== "HEAD")))
      .sort((left, right) => left.localeCompare(right));
  }

  async createBranch(branch: string) {
    const remote = await this.git(
      ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${branch}`],
      { allowFailure: true, authenticated: true },
    );
    if (remote.exitCode === 0) throw new Error(`Branch ${branch} already exists.`);
    if (remote.exitCode !== 2) throw new Error(remote.stderr.trim() || "Could not check the branch.");

    const { stdout } = await this.git(["rev-parse", "HEAD"]);
    await this.git(["push", "origin", `${stdout.trim()}:refs/heads/${branch}`], {
      authenticated: true,
    });
  }

  async commitAndPush(filePath: string, message: string) {
    const safePath = assertRepositoryPath(filePath);
    const previousSha = (await this.git(["rev-parse", "HEAD"])).stdout.trim();
    await this.git(["add", "--", safePath]);
    const diff = await this.git(["diff", "--cached", "--quiet", "--", safePath], {
      allowFailure: true,
    });
    if (diff.exitCode === 0) {
      const sha = (await this.git(["rev-parse", "HEAD"])).stdout.trim();
      return { sha, changed: false };
    }
    if (diff.exitCode !== 1) throw new Error(diff.stderr.trim() || "Could not inspect workspace changes.");

    await this.git(["commit", "-m", message, "--", safePath]);
    const sha = (await this.git(["rev-parse", "HEAD"])).stdout.trim();
    const push = await this.git(
      ["push", "origin", `HEAD:refs/heads/${this.target.branch}`],
      { allowFailure: true, authenticated: true },
    );
    if (push.exitCode !== 0) {
      await this.git(["update-ref", "HEAD", previousSha, sha]);
      await this.git(["restore", "--source", previousSha, "--staged", "--worktree", "--", safePath]);
      throw new WorkspaceConflictError(
        "The branch changed while you were editing. Reload the entry and try again.",
      );
    }
    return { sha, changed: true };
  }
}

async function prepareRepository(
  sandbox: Sandbox,
  target: WorkspaceTarget,
  token: string,
) {
  const root = `${sandbox.cwd}/repository`;
  const askPassPath = `${sandbox.cwd}/.parasite-git-askpass.sh`;
  await sandbox.fs.writeFile(askPassPath, askPassScript, "utf8");
  await sandbox.runCommand("chmod", ["700", askPassPath]);

  const checkout = await sandbox.runCommand("test", ["-d", `${root}/.git`]);
  if (checkout.exitCode !== 0) {
    await sandbox.fs.rm(root, { recursive: true, force: true });
    const clone = await sandbox.runCommand({
      cmd: "git",
      args: [
        "clone",
        "--branch",
        target.branch,
        "--single-branch",
        `https://github.com/${target.repository.owner}/${target.repository.name}.git`,
        root,
      ],
      cwd: sandbox.cwd,
      env: gitEnvironment(token, askPassPath),
    });
    if (clone.exitCode !== 0) {
      throw new Error((await clone.stderr()).trim() || "The repository could not be cloned.");
    }
  }

  for (const [key, value] of [
    ["user.name", "Parasite CMS"],
    ["user.email", "parasite-cms@users.noreply.github.com"],
  ]) {
    const configured = await sandbox.runCommand({
      cmd: "git",
      args: ["config", key, value],
      cwd: root,
    });
    if (configured.exitCode !== 0) {
      throw new Error((await configured.stderr()).trim() || "The Git workspace could not be configured.");
    }
  }

  return { root, askPassPath };
}

function isAlreadyExistsError(error: unknown) {
  return error instanceof APIError &&
    error.response.status === 400 &&
    (error.message.includes("already exists") || error.text?.includes("already exists"));
}

async function getExistingSandbox(name: string, originalError: unknown) {
  const retryDelays = [0, 50, 150, 300];
  for (const [index, retryDelay] of retryDelays.entries()) {
    if (retryDelay) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
    try {
      return await Sandbox.get({ name, resume: true });
    } catch {
      if (index === retryDelays.length - 1) throw originalError;
    }
  }
  throw originalError;
}

async function getOrCreateSandbox(name: string) {
  try {
    return await Sandbox.getOrCreate({
      name,
      persistent: true,
      keepLastSnapshots: { count: 1, expiration: 5 * 24 * 60 * 60 * 1000 },
      timeout: 10 * 60 * 1000,
    });
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
    return getExistingSandbox(name, error);
  }
}

export async function openWorkspace(untrustedTarget: WorkspaceTarget) {
  const target = WorkspaceTargetSchema.parse(untrustedTarget);
  assertConfiguredRepository(target);
  const subjectId = await getGitHubSubjectId();
  if (!subjectId) throw new GitHubSessionRequiredError("GitHub authorization is required.");
  const name = sandboxName(subjectId, target);
  const pending = workspaceOpenings.get(name);
  if (pending) return pending;

  const opening = (async () => {
    const token = await getGitHubToken(subjectId);
    const sandbox = await getOrCreateSandbox(name);
    const { root, askPassPath } = await prepareRepository(sandbox, target, token);
    const workspace = new RepositoryWorkspace(sandbox, target, token, root, askPassPath);
    await workspace.sync();
    return workspace;
  })();
  workspaceOpenings.set(name, opening);

  try {
    return await opening;
  } finally {
    if (workspaceOpenings.get(name) === opening) workspaceOpenings.delete(name);
  }
}
