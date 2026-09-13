import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleGrid } from "@/components/modules/ModuleGrid";
import { ModuleQuote } from "@/components/modules/ModuleQuote";
import grid from "@/content/modules/approach-grid.json";
import cta from "@/content/modules/product-cta.json";
import quote from "@/content/modules/triumph-washington-quote.json";
import george from "@/content/shared/george-washington.json";
import { CtaModuleSchema, GridModuleSchema, QuoteModuleSchema } from "@/schemas/modules";
import { PersonSchema } from "@/schemas/shared/person";

const gridContent = GridModuleSchema.parse(grid);
const quoteContent = QuoteModuleSchema.parse(quote);
const ctaContent = CtaModuleSchema.parse(cta);
const georgeContent = PersonSchema.parse(george);

export default function ProductPage() {
  return (
    <>
      <section className="product-hero">
        <p className="eyebrow">Prototype / 001</p>
        <h1>Pages are files.<br />Content is portable.</h1>
        <p>Built for teams who want editorial workflows without surrendering the architecture of their Next.js application.</p>
      </section>
      <ModuleGrid {...gridContent} />
      <ModuleQuote _type={quoteContent._type} quote={quoteContent.quote} person={georgeContent} />
      <ModuleCta {...ctaContent} />
    </>
  );
}
