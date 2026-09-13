"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBranchAction, cutReleaseAction } from "@/app/admin/actions";
import type { WorkspaceTarget } from "@/lib/workspace-target";
import { AgentChat } from "./AgentChat";

export function BranchControl({
  target,
  branches,
  defaultBranch,
}: {
  target: WorkspaceTarget;
  branches: string[];
  defaultBranch: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [releaseUrl, setReleaseUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const isDefault = target.branch === defaultBranch;
  const options = branches.includes(target.branch) ? branches : [target.branch, ...branches];

  function visitBranch(branch: string) {
    router.push(`/admin/${encodeURIComponent(branch)}`);
  }

  function handleCreate() {
    setMessage("");
    startTransition(async () => {
      const result = await createBranchAction(target, name);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      visitBranch(result.branch);
    });
  }

  function handleRelease() {
    setMessage("");
    setReleaseUrl("");
    startTransition(async () => {
      const result = await cutReleaseAction(target);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setReleaseUrl(result.url);
      setMessage(`PR #${result.number} is ready.`);
    });
  }

  return (
    <div className="branch-control">
      <label className="branch-select">
        <span>Branch</span>
        <select
          value={target.branch}
          onChange={(event) => visitBranch(event.target.value)}
          disabled={isPending}
        >
          {options.map((branch) => (
            <option key={branch} value={branch}>
              {branch}{branch === defaultBranch ? " · default" : ""}
            </option>
          ))}
        </select>
      </label>
      <button
        className="button button-outline"
        type="button"
        onClick={() => {
          setCreating((current) => !current);
          setMessage("");
        }}
      >
        New branch
      </button>
      {!isDefault && (
        <button className="button button-dark" type="button" disabled={isPending} onClick={handleRelease}>
          {isPending && !creating ? "Cutting…" : "Cut release"}
        </button>
      )}
      <AgentChat target={target} defaultBranch={defaultBranch} />

      {creating && (
        <div className="branch-popover">
          <label htmlFor="feature-branch-name">Feature branch</label>
          <div>
            <span>parasite/</span>
            <input
              id="feature-branch-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="homepage-redesign"
              autoFocus
            />
          </div>
          <button className="button button-dark" type="button" disabled={!name || isPending} onClick={handleCreate}>
            {isPending ? "Creating…" : "Create and switch"}
          </button>
          {message && <p className="branch-error" role="status">{message}</p>}
        </div>
      )}

      {!creating && message && (
        <p className={releaseUrl ? "branch-success" : "branch-error"} role="status">
          {releaseUrl ? <a href={releaseUrl} target="_blank" rel="noreferrer">{message} Open on GitHub ↗</a> : message}
        </p>
      )}
    </div>
  );
}
