"use server";

import { revalidatePath } from "next/cache";
import { saveEntry, type SaveEntryInput } from "@/lib/save-entry";

export type SaveEntryResult =
  | { ok: true; id: string; version?: string; commitUrl: string }
  | { ok: false; message: string };

export async function saveEntryAction(input: SaveEntryInput): Promise<SaveEntryResult> {
  try {
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
