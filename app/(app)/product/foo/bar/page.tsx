import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleGrid } from "@/components/modules/ModuleGrid";
import { ModuleHero } from "@/components/modules/ModuleHero";
import { ModuleQuote } from "@/components/modules/ModuleQuote";
import grid from "@/content/modules/approach-grid.json";
import cta from "@/content/modules/product-cta.json";
import hero from "@/content/modules/product-hero.json";
import quote from "@/content/modules/triumph-washington-quote.json";
import george from "@/content/shared/george-washington.json";
import { CtaModuleSchema, GridModuleSchema, HeroModuleSchema, QuoteModuleSchema } from "@/schemas/modules";
import { PersonSchema } from "@/schemas/shared/person";

const gridContent = GridModuleSchema.parse(grid);
const quoteContent = QuoteModuleSchema.parse(quote);
const ctaContent = CtaModuleSchema.parse(cta);
const heroContent = HeroModuleSchema.parse(hero);
const georgeContent = PersonSchema.parse(george);

export default function ProductPage() {
  return (
    <>
      <ModuleHero {...heroContent} />
      <ModuleGrid {...gridContent} />
      <ModuleQuote _type={quoteContent._type} quote={quoteContent.quote} person={georgeContent} />
      <ModuleCta {...ctaContent} />
    </>
  );
}
