import { z } from "zod";
import { CtaModuleSchema } from "./cta";
import { GridModuleSchema } from "./grid";
import { HeroModuleSchema } from "./hero";
import { QuoteModuleSchema } from "./quote";
import { TextModuleSchema } from "./text";

export const ModuleSchema = z.discriminatedUnion("_type", [
  TextModuleSchema,
  HeroModuleSchema,
  QuoteModuleSchema,
  GridModuleSchema,
  CtaModuleSchema,
]);

export { CtaModuleSchema, GridModuleSchema, HeroModuleSchema, QuoteModuleSchema, TextModuleSchema };
export type { CtaModuleContent } from "./cta";
export type { GridModuleContent } from "./grid";
export type { HeroModuleContent } from "./hero";
export type { QuoteModuleContent } from "./quote";
export type { TextModuleContent } from "./text";
