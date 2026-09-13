"use client";

import { useState } from "react";
import type { EntryKind } from "@/lib/entries";

export function AddEntry() {
  const [kind, setKind] = useState<EntryKind>("page");
  const [message, setMessage] = useState("");

  return (
    <div className="add-entry-wrap">
      <label className="sr-only" htmlFor="entry-kind">Entry type</label>
      <select id="entry-kind" value={kind} onChange={(event) => setKind(event.target.value as EntryKind)}>
        <option value="page">Page</option>
        <option value="module">Module</option>
        <option value="shared">Shared</option>
      </select>
      <button className="button button-dark" onClick={() => setMessage(`${kind} creation will be wired to code generation next.`)}>
        <span>＋</span> Add entry
      </button>
      {message && <div className="stub-toast" role="status">{message}<button onClick={() => setMessage("")} aria-label="Dismiss">×</button></div>}
    </div>
  );
}
