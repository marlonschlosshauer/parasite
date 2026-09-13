import { z } from "zod";

export const TextModuleSchema = z.object({
  _type: z.literal("text"),
  eyebrow: z.string().optional(),
  heading: z.string().min(1),
  body: z.string().min(1),
  align: z.enum(["left", "center"]).optional(),
}).strict();

export type TextModuleContent = z.infer<typeof TextModuleSchema>;
