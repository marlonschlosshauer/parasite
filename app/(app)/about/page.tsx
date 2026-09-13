import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleQuote } from "@/components/modules/ModuleQuote";
import { ModuleText } from "@/components/modules/ModuleText";
import intro from "@/content/modules/about-intro.json";
import cta from "@/content/modules/product-cta.json";
import quote from "@/content/modules/triumph-washington-quote.json";
import george from "@/content/shared/george-washington.json";
import type { CtaModuleContent, TextModuleContent } from "@/types/modules";
import type { Person } from "@/types/shared/person";

export default function AboutPage() {
  return (
    <>
      <ModuleText {...(intro as TextModuleContent)} />
      <ModuleQuote _type="quote" quote={quote.quote} person={george as Person} />
      <ModuleCta {...(cta as CtaModuleContent)} />
    </>
  );
}
