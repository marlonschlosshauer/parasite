"use server";

import { revalidatePath } from "next/cache";
import { createFeatureBranch, cutRelease } from "@/lib/branches";
import { saveEntry, type SaveEntryInput } from "@/lib/save-entry";
import { requireGitHubAccess } from "@/lib/admin-auth";
import type { WorkspaceTarget } from "@/lib/workspace-target";

export type SaveEntryResult =
  | { ok: true; id: string; version?: string; commitUrl: string }
  | { ok: false; message: string };

export async function saveEntryAction(
  target: WorkspaceTarget,
  input: SaveEntryInput,
): Promise<SaveEntryResult> {
  await requireGitHubAccess();
  try {
    const saved = await saveEntry(target, input);
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

export type CreateBranchResult =
  | { ok: true; branch: string }
  | { ok: false; message: string };

export async function createBranchAction(
  target: WorkspaceTarget,
  name: string,
): Promise<CreateBranchResult> {
  await requireGitHubAccess();
  try {
    const branch = await createFeatureBranch(target, name);
    revalidatePath("/admin");
    return { ok: true, branch };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "The branch could not be created.",
    };
  }
}

export type CutReleaseResult =
  | { ok: true; number: number; title: string; url: string }
  | { ok: false; message: string };

export async function cutReleaseAction(target: WorkspaceTarget): Promise<CutReleaseResult> {
  await requireGitHubAccess();
  try {
    const release = await cutRelease(target);
    return { ok: true, ...release };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "The release could not be created.",
    };
  }
}
