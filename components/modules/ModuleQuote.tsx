import type { QuoteModuleContent } from "@/types/modules";
import type { Person } from "@/types/shared/person";

interface ModuleQuoteProps
  extends Omit<QuoteModuleContent, "_type" | "person"> {
  person: Omit<Person, "_type">;
}

export function ModuleQuote({ quote, person }: ModuleQuoteProps) {
  return (
    <figure className="module quote-module">
      <div className="quote-mark" aria-hidden="true">
        “
      </div>
      <blockquote>{quote}</blockquote>
      <figcaption>
        <span>
          {person.firstName} {person.lastName}
        </span>
        {person.title && <small>{person.title}</small>}
      </figcaption>
    </figure>
  );
}
