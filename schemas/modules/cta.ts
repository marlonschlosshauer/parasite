import { z } from "zod";
import { LinkSchema } from "@/schemas/shared/link";

export const CtaModuleSchema = z.object({
  _type: z.literal("cta"),
  heading: z.string().min(1),
  body: z.string().min(1),
  link: LinkSchema,
}).strict();

export type CtaModuleContent = z.infer<typeof CtaModuleSchema>;
