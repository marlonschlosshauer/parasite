import type { HeroModuleContent } from "@/types/modules";

type ModuleHeroProps = Omit<HeroModuleContent, "_type">;

export function ModuleHero({ eyebrow, heading, body }: ModuleHeroProps) {
  return (
    <section className="product-hero">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{heading}</h1>
      <p>{body}</p>
    </section>
  );
}
