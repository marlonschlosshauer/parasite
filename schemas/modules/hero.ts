import { z } from "zod";

export const HeroModuleSchema = z.object({
  _type: z.literal("hero"),
  eyebrow: z.string().optional(),
  heading: z.string().min(1),
  body: z.string().min(1),
}).strict();

export type HeroModuleContent = z.infer<typeof HeroModuleSchema>;
