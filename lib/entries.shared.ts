import { z } from "zod";

export const EntryKindSchema = z.enum(["page", "module", "shared"]);
export type EntryKind = z.infer<typeof EntryKindSchema>;

export const EntryDetailSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: EntryKindSchema,
  schema: z.string().min(1),
  path: z.string().min(1),
  route: z.string().optional(),
  updated: z.string(),
  version: z.string().optional(),
  fields: z.record(z.string(), z.unknown()),
}).strict();

export type EntryDetail = z.infer<typeof EntryDetailSchema>;

export const WorkspaceMetadataSchema = z.object({
  id: z.string().min(1),
  branch: z.string().min(1),
  branches: z.array(z.string().min(1)),
  syncedAt: z.string().datetime(),
}).strict();

export type WorkspaceMetadata = z.infer<typeof WorkspaceMetadataSchema>;

export const WorkspaceSnapshotSchema = z.object({
  entries: z.array(EntryDetailSchema),
  metadata: WorkspaceMetadataSchema,
}).strict();

export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshotSchema>;

export interface PreviewEntry {
  path: string;
  kind: EntryKind;
  schema: string;
  fields: Record<string, unknown>;
}

export function fuzzyScore(value: string, query: string) {
  const haystack = value.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (!needle) return 0;
  const exactIndex = haystack.indexOf(needle);
  if (exactIndex >= 0) return 1000 - exactIndex;

  let queryIndex = 0;
  let score = 0;
  let previousMatch = -2;
  for (let index = 0; index < haystack.length && queryIndex < needle.length; index += 1) {
    if (haystack[index] === needle[queryIndex]) {
      score += previousMatch === index - 1 ? 3 : 1;
      previousMatch = index;
      queryIndex += 1;
    }
  }
  return queryIndex === needle.length ? score : -1;
}
