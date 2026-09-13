import type { QuoteModuleContent } from "@/types/modules";
import type { Person } from "@/types/shared/person";

interface ModuleQuoteProps extends Omit<QuoteModuleContent, "person"> {
  person: Person;
}

export function ModuleQuote({ quote, person }: ModuleQuoteProps) {
  return (
    <figure className="module quote-module">
      <div className="quote-mark" aria-hidden="true">“</div>
      <blockquote>{quote}</blockquote>
      <figcaption>
        <span>{person.firstName} {person.lastName}</span>
        {person.title && <small>{person.title}</small>}
      </figcaption>
    </figure>
  );
}
