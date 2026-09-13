import type { HeroModuleContent } from "@/types/modules";

export function ModuleHero({ eyebrow, heading, body }: HeroModuleContent) {
  return (
    <section className="product-hero">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{heading}</h1>
      <p>{body}</p>
    </section>
  );
}
