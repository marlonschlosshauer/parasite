import { z } from "zod";

export const PersonSchema = z.object({
  _type: z.literal("person"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  title: z.string().optional(),
  portrait: z.string().min(1).optional(),
}).strict();

export type Person = z.infer<typeof PersonSchema>;
