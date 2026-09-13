import { z } from "zod";

export const LinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  external: z.boolean().optional(),
}).strict();

export type Link = z.infer<typeof LinkSchema>;
