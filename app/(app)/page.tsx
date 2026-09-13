import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleGrid } from "@/components/modules/ModuleGrid";
import { ModuleText } from "@/components/modules/ModuleText";
import grid from "@/content/modules/approach-grid.json";
import intro from "@/content/modules/home-intro.json";
import cta from "@/content/modules/product-cta.json";
import type { CtaModuleContent, GridModuleContent, TextModuleContent } from "@/types/modules";

export default function HomePage() {
  return (
    <>
      <ModuleText {...(intro as TextModuleContent)} />
      <ModuleGrid {...(grid as GridModuleContent)} />
      <ModuleCta {...(cta as CtaModuleContent)} />
    </>
  );
}
