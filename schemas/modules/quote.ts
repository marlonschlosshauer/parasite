import { z } from "zod";

export const QuoteModuleSchema = z.object({
  _type: z.literal("quote"),
  quote: z.string().min(1),
  person: z.string().regex(/^content\/shared\/.+\.json$/, "Expected a shared content reference"),
}).strict();

export type QuoteModuleContent = z.infer<typeof QuoteModuleSchema>;
