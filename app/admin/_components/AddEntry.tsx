"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EntryKind } from "@/lib/entries";
import { EntryKindSchema } from "@/lib/entries.shared";

export function AddEntry({ branch }: { branch: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<EntryKind>("page");

  return (
    <div className="add-entry-wrap">
      <label className="sr-only" htmlFor="entry-kind">Entry type</label>
      <select id="entry-kind" value={kind} onChange={(event) => setKind(EntryKindSchema.parse(event.target.value))}>
        <option value="page">Page</option>
        <option value="module">Module</option>
        <option value="shared">Shared</option>
      </select>
      <button className="button button-dark" onClick={() => router.push(`/admin/new?type=${kind}&branch=${encodeURIComponent(branch)}`)}>
        <span>＋</span> Add entry
      </button>
    </div>
  );
}
