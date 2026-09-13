import "server-only";

import { getRepositoryFile } from "@/lib/github";
import { ModuleSchema } from "@/schemas/modules";
import type { PageContent } from "@/schemas/page";
import { PersonSchema } from "@/schemas/shared/person";

const moduleNames = {
  text: { component: "ModuleText", schema: "TextModuleSchema" },
  hero: { component: "ModuleHero", schema: "HeroModuleSchema" },
  grid: { component: "ModuleGrid", schema: "GridModuleSchema" },
  cta: { component: "ModuleCta", schema: "CtaModuleSchema" },
};

export function pagePathFromSlug(slug: string) {
  return slug === "/" ? "app/(app)/page.tsx" : `app/(app)${slug}/page.tsx`;
}

export async function generatePageSource(page: PageContent) {
  const componentImports = new Set<string>();
  const schemaImports = new Set<string>();
  const jsonImports: string[] = [];
  const declarations: string[] = [];
  const invocations: string[] = [];
  let usesWithoutType = false;
  let usesPersonSchema = false;

  for (const [index, modulePath] of page.modules.entries()) {
    const file = await getRepositoryFile(modulePath);
    const parsedModule = ModuleSchema.parse(JSON.parse(file.content));
    const jsonName = `module${index}Json`;
    const contentName = `module${index}Content`;
    jsonImports.push(`import ${jsonName} from ${JSON.stringify(`@/${modulePath.replace(/\.json$/, ".json")}`)};`);

    if (parsedModule._type === "quote") {
      componentImports.add("ModuleQuote");
      schemaImports.add("QuoteModuleSchema");
      usesWithoutType = true;
      usesPersonSchema = true;
      const personFile = await getRepositoryFile(parsedModule.person);
      PersonSchema.parse(JSON.parse(personFile.content));
      const personJsonName = `person${index}Json`;
      const personName = `person${index}Content`;
      jsonImports.push(`import ${personJsonName} from ${JSON.stringify(`@/${parsedModule.person}`)};`);
      declarations.push(`const ${contentName} = QuoteModuleSchema.parse(${jsonName});`);
      declarations.push(`const ${personName} = withoutType(PersonSchema.parse(${personJsonName}));`);
      invocations.push(`      <ModuleQuote quote={${contentName}.quote} person={${personName}} />`);
      continue;
    }

    const names = moduleNames[parsedModule._type];
    componentImports.add(names.component);
    schemaImports.add(names.schema);
    usesWithoutType = true;
    declarations.push(`const ${contentName} = withoutType(${names.schema}.parse(${jsonName}));`);
    invocations.push(`      <${names.component} {...${contentName}} />`);
  }

  const imports = [
    ...Array.from(componentImports).sort().map((name) => `import { ${name} } from "@/components/modules/${name}";`),
    ...jsonImports,
    ...(usesWithoutType ? ["import { withoutType } from \"@/lib/content\";"] : []),
    ...(schemaImports.size ? [`import { ${Array.from(schemaImports).sort().join(", ")} } from "@/schemas/modules";`] : []),
    ...(usesPersonSchema ? ["import { PersonSchema } from \"@/schemas/shared/person\";"] : []),
  ];
  const marker = Buffer.from(JSON.stringify(page)).toString("base64");
  const body = invocations.length ? `    <>\n${invocations.join("\n")}\n    </>` : "    null";

  return `// @parasite-page ${marker}\n${imports.join("\n")}\n\n${declarations.join("\n")}\n\nexport default function Page() {\n  return (\n${body}\n  );\n}\n`;
}
