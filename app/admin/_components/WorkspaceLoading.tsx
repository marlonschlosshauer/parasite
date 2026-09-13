"use client";

import Link from "next/link";

export function WorkspaceLoading({ detail = false }: { detail?: boolean }) {
  return (
    <div className={`workspace-loading ${detail ? "workspace-loading-detail" : ""}`} role="status">
      <span className="workspace-spinner" />
      <strong>Syncing workspace</strong>
      <p>Starting the Sandbox and loading this branch. Following navigation will use the local collection.</p>
    </div>
  );
}

export function WorkspaceError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="workspace-error" role="alert">
      <span>!</span>
      <strong>Workspace could not be synced</strong>
      <p>{error instanceof Error ? error.message : "Check your GitHub authorization and try again."}</p>
      <div>
        <button className="button button-dark" onClick={retry} type="button">Try again</button>
        <Link className="button button-outline" href="/admin/authorize">Reconnect GitHub</Link>
      </div>
    </div>
  );
}
