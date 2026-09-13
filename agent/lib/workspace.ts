import { defineState } from "eve/context";
import type { RuntimeSandboxSession } from "eve/sandbox";
import {
  assertConfiguredWorkspace,
  getAgentGitHubToken,
  shellQuote,
  type AgentWorkspace,
} from "./github";

export const agentWorkspace = defineState<AgentWorkspace | null>(
  "parasite.workspace.v1",
  () => null,
);

const repositoryPath = "/workspace/repository";
const askPassPath = "/workspace/.parasite-git-askpass.sh";

const askPassScript = `#!/bin/sh
case "$1" in
  *Username*) printf '%s\\n' 'x-access-token' ;;
  *) printf '%s\\n' "$PARASITE_GITHUB_TOKEN" ;;
esac
`;

function authenticatedCommand(command: string, token: string) {
  return {
    command,
    workingDirectory: repositoryPath,
    env: {
      GIT_ASKPASS: askPassPath,
      GIT_TERMINAL_PROMPT: "0",
      PARASITE_GITHUB_TOKEN: token,
    },
  };
}

async function runOrThrow(
  sandbox: RuntimeSandboxSession,
  options: Parameters<RuntimeSandboxSession["run"]>[0],
) {
  const result = await sandbox.run(options);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "Sandbox command failed.");
  }
  return result;
}

export async function initializeWorkspace(
  sandbox: RuntimeSandboxSession,
  input: unknown,
  subjectId: string,
) {
  const requested = assertConfiguredWorkspace(input);
  const current = agentWorkspace.get();
  if (current) {
    if (
      current.branch !== requested.branch ||
      current.repository.owner !== requested.repository.owner ||
      current.repository.name !== requested.repository.name
    ) {
      throw new Error("This conversation is already bound to another branch. Open a new agent chat after switching branches.");
    }
    const checkout = await sandbox.run({
      command: `test -d ${shellQuote(`${repositoryPath}/.git`)}`,
    });
    if (checkout.exitCode === 0) {
      return { workspace: current, path: repositoryPath, initialized: false };
    }
  }

  const token = await getAgentGitHubToken(subjectId);
  await sandbox.writeTextFile({ path: askPassPath, content: askPassScript });
  await runOrThrow(sandbox, { command: `chmod 700 ${shellQuote(askPassPath)}` });
  const existingCheckout = await sandbox.run({
    command: `test -d ${shellQuote(`${repositoryPath}/.git`)}`,
  });
  if (existingCheckout.exitCode !== 0) {
    await sandbox.removePath({ path: repositoryPath, force: true, recursive: true });
  }
  await runOrThrow(sandbox, {
    command: existingCheckout.exitCode === 0
      ? `git fetch origin ${shellQuote(requested.branch)} && git switch ${shellQuote(requested.branch)}`
      : [
          "git clone --single-branch",
          `--branch ${shellQuote(requested.branch)}`,
          shellQuote(`https://github.com/${requested.repository.owner}/${requested.repository.name}.git`),
          shellQuote(repositoryPath),
        ].join(" "),
    workingDirectory: existingCheckout.exitCode === 0 ? repositoryPath : "/workspace",
    env: authenticatedCommand("", token).env,
  });
  await runOrThrow(sandbox, {
    command: "git config user.name 'Parasite Eve' && git config user.email 'parasite-eve@users.noreply.github.com'",
    workingDirectory: repositoryPath,
  });

  agentWorkspace.update(() => requested);
  return { workspace: requested, path: repositoryPath, initialized: true };
}

export async function publishWorkspace(
  sandbox: RuntimeSandboxSession,
  subjectId: string,
  message: string,
) {
  const workspace = agentWorkspace.get();
  if (!workspace) throw new Error("Open the repository workspace first.");
  const configured = assertConfiguredWorkspace(workspace);
  const defaultBranch = process.env.GITHUB_REPOSITORY_BRANCH ?? "main";
  if (configured.branch === defaultBranch) {
    throw new Error(`Persistent agent changes are disabled on ${defaultBranch}. Select a feature branch first.`);
  }

  const status = await runOrThrow(sandbox, {
    command: "git status --short",
    workingDirectory: repositoryPath,
  });
  if (status.stdout.trim()) {
    await runOrThrow(sandbox, {
      command: `git -c core.hooksPath=/dev/null add -A && git -c core.hooksPath=/dev/null commit -m ${shellQuote(message)}`,
      workingDirectory: repositoryPath,
    });
  }
  const ahead = await runOrThrow(sandbox, {
    command: `git rev-list --count ${shellQuote(`origin/${configured.branch}..HEAD`)}`,
    workingDirectory: repositoryPath,
  });
  if (Number.parseInt(ahead.stdout.trim(), 10) === 0) {
    return { changed: false, branch: configured.branch, message: "There are no changes to publish." };
  }
  const token = await getAgentGitHubToken(subjectId);
  const remote = `https://github.com/${configured.repository.owner}/${configured.repository.name}.git`;
  await runOrThrow(sandbox, authenticatedCommand(
    `git -c core.hooksPath=/dev/null -c credential.helper= push ${shellQuote(remote)} HEAD:${shellQuote(`refs/heads/${configured.branch}`)}`,
    token,
  ));
  const revision = await runOrThrow(sandbox, {
    command: "git rev-parse HEAD",
    workingDirectory: repositoryPath,
  });
  return { changed: true, branch: configured.branch, commit: revision.stdout.trim() };
}
