import "server-only";

import path from "node:path";
import type { EntryKind, PreviewEntry } from "@/lib/entries.shared";
import { openWorkspace } from "@/lib/workspace";
import type { WorkspaceTarget } from "@/lib/workspace-target";
import { ModuleSchema } from "@/schemas/modules";
import { PageContentSchema } from "@/schemas/page";
import { PersonSchema } from "@/schemas/shared/person";

export type { EntryKind } from "@/lib/entries.shared";

export interface EntrySummary {
  id: string;
  name: string;
  kind: EntryKind;
  schema: string;
  path: string;
  route?: string;
  updated: string;
  version?: string;
}

export interface EntryDetail extends EntrySummary {
  fields: Record<string, unknown>;
}

export interface GetEntriesOptions {
  kind?: EntryKind;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface EntryPage {
  items: EntryDetail[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: Record<EntryKind, number>;
}

const pageDefinitions = [
  {
    name: "Home",
    path: "app/(app)/page.tsx",
    fields: {
      _type: "page",
      title: "Home",
      slug: "/",
      modules: [
        "content/modules/home-intro.json",
        "content/modules/approach-grid.json",
        "content/modules/product-cta.json",
      ],
    },
  },
  {
    name: "About",
    path: "app/(app)/about/page.tsx",
    fields: {
      _type: "page",
      title: "About",
      slug: "/about",
      modules: [
        "content/modules/about-intro.json",
        "content/modules/triumph-washington-quote.json",
        "content/modules/product-cta.json",
      ],
    },
  },
  {
    name: "Product / Foo / Bar",
    path: "app/(app)/product/foo/bar/page.tsx",
    fields: {
      _type: "page",
      title: "Product / Foo / Bar",
      slug: "/product/foo/bar",
      modules: [
        "content/modules/product-hero.json",
        "content/modules/approach-grid.json",
        "content/modules/triumph-washington-quote.json",
        "content/modules/product-cta.json",
      ],
    },
  },
];

function pageId(slug: string) {
  return slug === "/" ? "page-home" : `page-${slug.slice(1).replaceAll("/", "-")}`;
}

function routeFromPagePath(pagePath: string) {
  if (pagePath === "app/(app)/page.tsx") return "/";
  return pagePath.replace(/^app\/\(app\)/, "").replace(/\/page\.tsx$/, "");
}

function pageFromSource(source: string) {
  const encoded = source.match(/^\/\/ @parasite-page ([A-Za-z0-9+/=]+)$/m)?.[1];
  if (!encoded) return undefined;
  try {
    const raw: unknown = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    return PageContentSchema.parse(raw);
  } catch {
    return undefined;
  }
}

function titleFromFile(file: string) {
  return file
    .replace(/\.json$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseContent(kind: Exclude<EntryKind, "page">, rawFields: unknown) {
  const parsed = kind === "module" ? ModuleSchema.parse(rawFields) : PersonSchema.parse(rawFields);
  const fields: Record<string, unknown> = { ...parsed };
  return fields;
}

async function getWorkspaceEntries(target: WorkspaceTarget): Promise<EntryDetail[]> {
  const workspace = await openWorkspace(target);
  const files = await workspace.listTrackedFiles();
  const pageFiles = files.filter((filePath) =>
    filePath === "app/(app)/page.tsx" || /^app\/\(app\)\/.+\/page\.tsx$/.test(filePath),
  );
  const pages = await Promise.all(pageFiles.map(async (filePath): Promise<EntryDetail> => {
    const source = await workspace.readFile(filePath);
    const definition = pageDefinitions.find((candidate) => candidate.path === filePath);
    const fallbackFields = definition?.fields ?? {
      _type: "page",
      title: routeFromPagePath(filePath).split("/").filter(Boolean).join(" / ") || "Home",
      slug: routeFromPagePath(filePath),
      modules: [],
    };
    const fields = pageFromSource(source) ?? PageContentSchema.parse(fallbackFields);
    return {
      id: pageId(fields.slug),
      name: fields.title,
      kind: "page",
      schema: "page",
      path: filePath,
      route: fields.slug,
      updated: `Git · ${target.branch}`,
      version: await workspace.fileVersion(filePath),
      fields: { ...fields },
    };
  }));

  const contentFiles = files.filter((filePath) =>
    (filePath.startsWith("content/modules/") || filePath.startsWith("content/shared/")) &&
    filePath.endsWith(".json"),
  );
  const content = await Promise.all(contentFiles.map(async (filePath): Promise<EntryDetail> => {
    const kind: Exclude<EntryKind, "page"> = filePath.startsWith("content/modules/") ? "module" : "shared";
    const source = await workspace.readFile(filePath);
    const fields = parseContent(kind, JSON.parse(source));
    const filename = path.posix.basename(filePath);
    return {
      id: `${kind}-${filename.replace(/\.json$/, "")}`,
      name: titleFromFile(filename),
      kind,
      schema: typeof fields._type === "string" ? fields._type : kind,
      path: filePath,
      updated: `Git · ${target.branch}`,
      version: await workspace.fileVersion(filePath),
      fields,
    };
  }));

  return [...pages, ...content];
}

function fuzzyScore(value: string, query: string) {
  const haystack = value.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (!needle) return 0;
  const exactIndex = haystack.indexOf(needle);
  if (exactIndex >= 0) return 1000 - exactIndex;

  let queryIndex = 0;
  let score = 0;
  let previousMatch = -2;
  for (let index = 0; index < haystack.length && queryIndex < needle.length; index += 1) {
    if (haystack[index] === needle[queryIndex]) {
      score += previousMatch === index - 1 ? 3 : 1;
      previousMatch = index;
      queryIndex += 1;
    }
  }
  return queryIndex === needle.length ? score : -1;
}

export async function getEntries(
  target: WorkspaceTarget,
  options: GetEntriesOptions = {},
): Promise<EntryPage> {
  const pageSize = Math.min(Math.max(Math.floor(options.pageSize ?? 10), 1), 100);
  const requestedPage = Math.max(Math.floor(options.page ?? 1), 1);
  const allEntries = await getWorkspaceEntries(target);
  const counts = allEntries.reduce<Record<EntryKind, number>>((result, entry) => {
    result[entry.kind] += 1;
    return result;
  }, { page: 0, module: 0, shared: 0 });

  const scored = allEntries
    .filter((entry) => !options.kind || entry.kind === options.kind)
    .map((entry) => ({ entry, score: options.query ? fuzzyScore(`${entry.name} ${entry.path}`, options.query) : 0 }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name));
  const total = scored.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * pageSize;

  return {
    items: scored.slice(offset, offset + pageSize).map(({ entry }) => entry),
    total,
    page,
    pageSize,
    pageCount,
    counts,
  };
}

export async function getEntry(target: WorkspaceTarget, id: string) {
  return (await getEntryEditorData(target, id)).entry;
}

export async function getEntryEditorData(target: WorkspaceTarget, id: string) {
  const result = await getEntries(target, { pageSize: 100 });
  const entry = result.items.find((candidate) => candidate.id === id);
  const previewEntries: PreviewEntry[] = result.items
    .filter((candidate) => candidate.kind !== "page")
    .map((candidate) => ({
      path: candidate.path,
      kind: candidate.kind,
      schema: candidate.schema,
      fields: candidate.fields,
    }));
  return { entry, previewEntries };
}

export async function getBranches(target: WorkspaceTarget) {
  const workspace = await openWorkspace(target);
  return workspace.listBranches();
}
