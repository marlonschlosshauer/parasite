import { ModuleCta } from "@/components/modules/ModuleCta";
import { ModuleGrid } from "@/components/modules/ModuleGrid";
import { ModuleText } from "@/components/modules/ModuleText";
import grid from "@/content/modules/approach-grid.json";
import intro from "@/content/modules/home-intro.json";
import cta from "@/content/modules/product-cta.json";
import { CtaModuleSchema, GridModuleSchema, TextModuleSchema } from "@/schemas/modules";

const introContent = TextModuleSchema.parse(intro);
const gridContent = GridModuleSchema.parse(grid);
const ctaContent = CtaModuleSchema.parse(cta);

export default function HomePage() {
  return (
    <>
      <ModuleText {...introContent} />
      <ModuleGrid {...gridContent} />
      <ModuleCta {...ctaContent} />
    </>
  );
}
