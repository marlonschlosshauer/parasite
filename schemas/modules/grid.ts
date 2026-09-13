import { z } from "zod";
import { CardSchema } from "@/schemas/shared/card";

export const GridModuleSchema = z.object({
  _type: z.literal("grid"),
  eyebrow: z.string().optional(),
  heading: z.string().min(1),
  cards: z.array(CardSchema).min(1),
}).strict();

export type GridModuleContent = z.infer<typeof GridModuleSchema>;
