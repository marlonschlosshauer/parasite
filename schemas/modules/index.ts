import { z } from "zod";
import { CtaModuleSchema } from "./cta";
import { GridModuleSchema } from "./grid";
import { QuoteModuleSchema } from "./quote";
import { TextModuleSchema } from "./text";

export const ModuleSchema = z.discriminatedUnion("_type", [
  TextModuleSchema,
  QuoteModuleSchema,
  GridModuleSchema,
  CtaModuleSchema,
]);

export { CtaModuleSchema, GridModuleSchema, QuoteModuleSchema, TextModuleSchema };
export type { CtaModuleContent } from "./cta";
export type { GridModuleContent } from "./grid";
export type { QuoteModuleContent } from "./quote";
export type { TextModuleContent } from "./text";
