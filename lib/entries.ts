import "server-only";

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ModuleSchema } from "@/schemas/modules";
import { PersonSchema } from "@/schemas/shared/person";

export type EntryKind = "page" | "module" | "shared";

export interface EntrySummary {
  id: string;
  name: string;
  kind: EntryKind;
  schema: string;
  path: string;
  route?: string;
  updated: string;
}

export interface EntryDetail extends EntrySummary {
  fields: Record<string, unknown>;
}

const pageEntries: EntryDetail[] = [
  {
    id: "page-home",
    name: "Home",
    kind: "page",
    schema: "page",
    path: "app/(app)/page.tsx",
    route: "/",
    updated: "In repository",
    fields: {
      _type: "page",
      title: "Home",
      slug: "/",
      modules: [
        "content/modules/home-intro.json",
        "content/modules/approach-grid.json",
        "content/modules/product-cta.json"
      ]
    }
  },
  {
    id: "page-about",
    name: "About",
    kind: "page",
    schema: "page",
    path: "app/(app)/about/page.tsx",
    route: "/about",
    updated: "In repository",
    fields: {
      _type: "page",
      title: "About",
      slug: "/about",
      modules: [
        "content/modules/about-intro.json",
        "content/modules/triumph-washington-quote.json",
        "content/modules/product-cta.json"
      ]
    }
  },
  {
    id: "page-product-foo-bar",
    name: "Product / Foo / Bar",
    kind: "page",
    schema: "page",
    path: "app/(app)/product/foo/bar/page.tsx",
    route: "/product/foo/bar",
    updated: "In repository",
    fields: {
      _type: "page",
      title: "Product / Foo / Bar",
      slug: "/product/foo/bar",
      modules: [
        "content/modules/approach-grid.json",
        "content/modules/triumph-washington-quote.json",
        "content/modules/product-cta.json"
      ]
    }
  }
];

function titleFromFile(file: string) {
  return file
    .replace(/\.json$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function readJsonEntries(kind: Exclude<EntryKind, "page">): Promise<EntryDetail[]> {
  const directory = path.join(process.cwd(), "content", kind === "module" ? "modules" : "shared");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();

  return Promise.all(files.map(async (file) => {
    const repoPath = path.posix.join("content", kind === "module" ? "modules" : "shared", file);
    const rawFields: unknown = JSON.parse(await readFile(path.join(directory, file), "utf8"));
    const parsedFields = kind === "module"
      ? ModuleSchema.parse(rawFields)
      : PersonSchema.parse(rawFields);
    const fields: Record<string, unknown> = { ...parsedFields };

    return {
      id: `${kind}-${file.replace(/\.json$/, "")}`,
      name: titleFromFile(file),
      kind,
      schema: typeof fields._type === "string" ? fields._type : kind,
      path: repoPath,
      updated: "In repository",
      fields,
    };
  }));
}

export async function getEntries(): Promise<EntryDetail[]> {
  const [modules, shared] = await Promise.all([
    readJsonEntries("module"),
    readJsonEntries("shared"),
  ]);

  return [...pageEntries, ...modules, ...shared];
}

export async function getEntry(id: string) {
  const entries = await getEntries();
  return entries.find((entry) => entry.id === id);
}
