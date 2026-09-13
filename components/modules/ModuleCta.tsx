import Link from "next/link";
import type { CtaModuleContent } from "@/types/modules";

export function ModuleCta({ heading, body, link }: CtaModuleContent) {
  return (
    <section className="module cta-module">
      <div>
        <p className="eyebrow">Next step</p>
        <h2>{heading}</h2>
        <p>{body}</p>
      </div>
      <Link className="button button-light" href={link.href}>{link.label}<span>↗</span></Link>
    </section>
  );
}
