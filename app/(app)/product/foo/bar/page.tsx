import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleGrid } from "@/components/modules/ModuleGrid";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { ModuleQuote } from "@/components/modules/ModuleQuote";
import grid from "@/content/modules/approach-grid.json";
import cta from "@/content/modules/product-cta.json";
import hero from "@/content/modules/product-hero.json";
import quote from "@/content/modules/good-one-lincoln-quote.json";
import abe from "@/content/shared/abe-lincoln.json";
import { withoutType } from "@/lib/content";
import {
  CtaModuleSchema,
  GridModuleSchema,
  HeroModuleSchema,
  QuoteModuleSchema,
} from "@/schemas/modules";
import { PersonSchema } from "@/schemas/shared/person";

const gridContent = withoutType(GridModuleSchema.parse(grid));
const quoteContent = QuoteModuleSchema.parse(quote);
const ctaContent = withoutType(CtaModuleSchema.parse(cta));
const heroContent = withoutType(HeroModuleSchema.parse(hero));
const abeContent = withoutType(PersonSchema.parse(abe));

export default function ProductPage() {
  return (
    <>
      <ModuleHero {...heroContent} />
      <ModuleGrid {...gridContent} />
      <ModuleQuote quote={quoteContent.quote} person={abeContent} />
      <ModuleCta {...ctaContent} />
    </>
  );
}
