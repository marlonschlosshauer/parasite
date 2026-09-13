import { z } from "zod";

export const EntryKindSchema = z.enum(["page", "module", "shared"]);
export type EntryKind = z.infer<typeof EntryKindSchema>;

export interface PreviewEntry {
  path: string;
  kind: EntryKind;
  schema: string;
  fields: Record<string, unknown>;
}
