import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleGrid } from "@/components/modules/ModuleGrid";
import { ModuleQuote } from "@/components/modules/ModuleQuote";
import grid from "@/content/modules/approach-grid.json";
import cta from "@/content/modules/product-cta.json";
import quote from "@/content/modules/triumph-washington-quote.json";
import george from "@/content/shared/george-washington.json";
import type { CtaModuleContent, GridModuleContent } from "@/types/modules";
import type { Person } from "@/types/shared/person";

export default function ProductPage() {
  return (
    <>
      <section className="product-hero">
        <p className="eyebrow">Prototype / 001</p>
        <h1>Pages are files.<br />Content is portable.</h1>
        <p>Built for teams who want editorial workflows without surrendering the architecture of their Next.js application.</p>
      </section>
      <ModuleGrid {...(grid as GridModuleContent)} />
      <ModuleQuote _type="quote" quote={quote.quote} person={george as Person} />
      <ModuleCta {...(cta as CtaModuleContent)} />
    </>
  );
}
