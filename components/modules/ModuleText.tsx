import type { TextModuleContent } from "@/types/modules";

type ModuleTextProps = Omit<TextModuleContent, "_type">;

export function ModuleText({ eyebrow, heading, body, align = "left" }: ModuleTextProps) {
  return (
    <section className={`module text-module text-${align}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{heading}</h1>
      <p className="lede">{body}</p>
    </section>
  );
}
