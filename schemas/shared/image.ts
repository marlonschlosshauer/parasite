import { z } from "zod";

export const ContentImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict();

export type ContentImage = z.infer<typeof ContentImageSchema>;
