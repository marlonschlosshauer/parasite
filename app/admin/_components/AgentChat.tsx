"use client";

import {
  useEveAgent,
  type EveMessageData,
  type EveMessagePart,
  type UseEveAgentSnapshot,
} from "eve/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceCollections } from "@/app/admin/_data/workspace-db";
import type { WorkspaceTarget } from "@/lib/workspace-target";

function publishedChanges(snapshot: UseEveAgentSnapshot<EveMessageData>) {
  return snapshot.data.messages.some((message) =>
    message.parts.some((part) =>
      part.type === "dynamic-tool"
      && part.toolName === "publish_changes"
      && part.state === "output-available"
      && !part.partial,
    ),
  );
}

function partLabel(part: EveMessagePart) {
  if (part.type !== "dynamic-tool") return "";
  const name = part.toolName.replaceAll("_", " ");
  if (part.state === "output-error") return `${name} failed`;
  if (part.state === "output-available") return `${name} complete`;
  if (part.state === "approval-requested") return `${name} needs approval`;
  if (part.state === "output-denied") return `${name} denied`;
  return `Running ${name}…`;
}

function ChatPart({
  part,
  respond,
}: {
  part: EveMessagePart;
  respond: ReturnType<typeof useEveAgent>["respond"];
}) {
  if (part.type === "text") return <p className="agent-message-text">{part.text}</p>;
  if (part.type === "dynamic-tool") {
    const request = part.toolMetadata?.eve?.inputRequest;
    return (
      <div className={`agent-tool agent-tool-${part.state}`}>
        <span>{partLabel(part)}</span>
        {part.state === "output-error" && <small>{part.errorText}</small>}
        {part.state === "approval-requested" && request && (
          <div className="agent-approval">
            <p>{request.prompt}</p>
            {request.options?.map((option) => (
              <button
                className={option.style === "primary" ? "button button-dark" : "button button-outline"}
                key={option.id}
                onClick={() => void respond([{ requestId: request.requestId, optionId: option.id }])}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (part.type === "authorization" && part.state === "required") {
    return (
      <div className="agent-tool">
        <span>{part.description}</span>
        {part.authorization?.url && <a href={part.authorization.url}>Authorize {part.displayName} ↗</a>}
      </div>
    );
  }
  return null;
}

function AgentChatSession({
  target,
  defaultBranch,
  onClose,
}: {
  target: WorkspaceTarget;
  defaultBranch: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const transcript = useRef<HTMLDivElement>(null);
  const isReadOnly = target.branch === defaultBranch;
  const { entries } = useWorkspaceCollections(target);
  const agent = useEveAgent({
    prepareSend: (input) => ({
      ...input,
      clientContext: {
        workspace: target,
        defaultBranch,
        persistentChangesAllowed: !isReadOnly,
      },
    }),
    onFinish: (snapshot) => {
      if (publishedChanges(snapshot)) void entries.utils.refetch();
    },
  });
  const busy = agent.status === "submitted" || agent.status === "streaming";

  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" });
  }, [agent.data.messages]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = message.trim();
    if (!value || agent.status === "resuming") return;
    setMessage("");
    void agent.send(value, busy ? { turnPolicy: "steer" } : undefined);
  }

  return (
    <aside className="agent-drawer" aria-label="Eve agent" aria-modal="true" role="dialog">
      <header className="agent-drawer-head">
        <div>
          <span className="agent-status-dot" />
          <div><strong>Eve</strong><small>{target.branch}</small></div>
        </div>
        <button onClick={onClose} type="button" aria-label="Close agent">×</button>
      </header>
      <div className={`agent-branch-notice ${isReadOnly ? "is-readonly" : ""}`}>
        <strong>{isReadOnly ? "Lookup mode" : "Feature branch"}</strong>
        <span>{isReadOnly ? `Eve can inspect ${defaultBranch}, but cannot publish changes.` : `Approved changes publish only to ${target.branch}.`}</span>
      </div>
      <div className="agent-transcript" ref={transcript} aria-live="polite">
        {agent.data.messages.length === 0 && (
          <div className="agent-empty">
            <span>✦</span>
            <h2>What should we work on?</h2>
            <p>Ask about the content model or repository{isReadOnly ? ". Switch to a feature branch when you want Eve to make changes." : ", or describe a change for this branch."}</p>
          </div>
        )}
        {agent.data.messages.map((item) => (
          <article className={`agent-message agent-message-${item.role}`} key={item.id}>
            <small>{item.role === "assistant" ? "Eve" : "You"}</small>
            <div>{item.parts.map((part, index) => <ChatPart key={index} part={part} respond={agent.respond} />)}</div>
          </article>
        ))}
        {agent.error && <p className="agent-error" role="alert">{agent.error.message}</p>}
      </div>
      <form className="agent-composer" onSubmit={submit}>
        <textarea
          aria-label="Message Eve"
          autoFocus
          disabled={agent.status === "resuming"}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask Eve…"
          rows={3}
          value={message}
        />
        <div>
          <small>{busy ? "Eve is working…" : "Enter to send · Shift + Enter for a new line"}</small>
          {busy ? (
            <button className="agent-send" onClick={() => void agent.cancel()} type="button" aria-label="Stop Eve">■</button>
          ) : (
            <button className="agent-send" disabled={!message.trim()} type="submit" aria-label="Send message">↑</button>
          )}
        </div>
      </form>
    </aside>
  );
}

export function AgentChat({ target, defaultBranch }: { target: WorkspaceTarget; defaultBranch: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  async function summon() {
    setError("");
    const response = await fetch("/admin/agent-session", { method: "POST" });
    if (!response.ok) {
      setError("GitHub access is required before Eve can join.");
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button className="button agent-summon" onClick={() => void summon()} type="button">
        <span>✦</span> Summon Eve
      </button>
      {error && <p className="agent-summon-error" role="alert">{error}</p>}
      {mounted && open && createPortal(
        <>
          <button className="agent-backdrop" onClick={() => setOpen(false)} type="button" aria-label="Close agent" />
          <AgentChatSession key={target.branch} target={target} defaultBranch={defaultBranch} onClose={() => setOpen(false)} />
        </>,
        document.body,
      )}
    </>
  );
}
