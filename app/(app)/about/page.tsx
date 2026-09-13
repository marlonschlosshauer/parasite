import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleQuote } from "@/components/modules/ModuleQuote";
import { ModuleText } from "@/components/modules/ModuleText";
import intro from "@/content/modules/about-intro.json";
import cta from "@/content/modules/product-cta.json";
import quote from "@/content/modules/good-one-lincoln-quote.json";
import abe from "@/content/shared/abe-lincoln.json";
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
const abeContent = withoutType(PersonSchema.parse(abe));

export default function AboutPage() {
  return (
    <>
      <ModuleText {...introContent} />
      <ModuleQuote quote={quoteContent.quote} person={abeContent} />
      <ModuleCta {...ctaContent} />
    </>
  );
}
