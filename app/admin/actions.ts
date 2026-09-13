"use server";

import { revalidatePath } from "next/cache";
import { saveEntry, type SaveEntryInput } from "@/lib/save-entry";
import { getGitHubAccessState } from "@/lib/github";

export type SaveEntryResult =
  | { ok: true; id: string; version?: string; commitUrl: string }
  | { ok: false; message: string };

export async function saveEntryAction(input: SaveEntryInput): Promise<SaveEntryResult> {
  try {
    const access = await getGitHubAccessState();
    if (access.status !== "authorized") {
      return { ok: false, message: "GitHub authorization is required before saving." };
    }
    const saved = await saveEntry(input);
    revalidatePath("/admin");
    revalidatePath(`/admin/${saved.id}`);
    return { ok: true, id: saved.id, version: saved.version, commitUrl: saved.commitUrl };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "The entry could not be saved.",
    };
  }
}
