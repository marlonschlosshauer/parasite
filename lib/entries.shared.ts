import { z } from "zod";

export const EntryKindSchema = z.enum(["page", "module", "shared"]);
export type EntryKind = z.infer<typeof EntryKindSchema>;
