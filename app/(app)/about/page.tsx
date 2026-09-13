import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleQuote } from "@/components/modules/ModuleQuote";
import { ModuleText } from "@/components/modules/ModuleText";
import intro from "@/content/modules/about-intro.json";
import cta from "@/content/modules/product-cta.json";
import quote from "@/content/modules/triumph-washington-quote.json";
import george from "@/content/shared/george-washington.json";
import { withoutType } from "@/lib/content";
import {
  CtaModuleSchema,
  QuoteModuleSchema,
  TextModuleSchema,
} from "@/schemas/modules";
import { PersonSchema } from "@/schemas/shared/person";

const introContent = withoutType(TextModuleSchema.parse(intro));
const quoteContent = QuoteModuleSchema.parse(quote);
const ctaContent = withoutType(CtaModuleSchema.parse(cta));
const georgeContent = withoutType(PersonSchema.parse(george));

export default function AboutPage() {
  return (
    <>
      <ModuleText {...introContent} />
      <ModuleQuote quote={quoteContent.quote} person={georgeContent} />
      <ModuleCta {...ctaContent} />
    </>
  );
}
