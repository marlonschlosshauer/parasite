import { z } from "zod";
import { ContentImageSchema } from "./image";
import { LinkSchema } from "./link";

export const CardSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  text: z.string().min(1),
  image: ContentImageSchema.optional(),
  link: LinkSchema.optional(),
}).strict();

export type Card = z.infer<typeof CardSchema>;
