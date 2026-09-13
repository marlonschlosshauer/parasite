import type { GridModuleContent } from "@/types/modules";

export function ModuleGrid({ eyebrow, heading, cards }: GridModuleContent) {
  return (
    <section className="module grid-module">
      <header>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{heading}</h2>
      </header>
      <div className="card-grid">
        {cards.map((card) => (
          <article className="content-card" key={card.title}>
            {card.eyebrow && <p className="card-number">{card.eyebrow}</p>}
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
