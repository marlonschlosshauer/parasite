import "server-only";

import { z } from "zod";
import { getRepositoryFile, putRepositoryFile } from "@/lib/github";
import { EntryKindSchema } from "@/lib/entries.shared";
import { generatePageSource, pagePathFromSlug } from "@/lib/page-codegen";
import { ModuleSchema } from "@/schemas/modules";
import { PageContentSchema } from "@/schemas/page";
import { PersonSchema } from "@/schemas/shared/person";

export const SaveEntryInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  kind: EntryKindSchema,
  schema: z.string().min(1),
  fields: z.record(z.string(), z.unknown()),
  version: z.string().min(1).optional(),
}).strict();

export type SaveEntryInput = z.infer<typeof SaveEntryInputSchema>;

function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("Enter a file name containing letters or numbers.");
  return slug;
}

function idFromPageSlug(slug: string) {
  return slug === "/" ? "page-home" : `page-${slug.slice(1).replaceAll("/", "-")}`;
}

export async function saveEntry(untrustedInput: unknown) {
  const input = SaveEntryInputSchema.parse(untrustedInput);
  let filePath: string;
  let content: string;
  let id: string;

  if (input.kind === "page") {
    const page = PageContentSchema.parse(input.fields);
    filePath = pagePathFromSlug(page.slug);
    content = await generatePageSource(page);
    id = idFromPageSlug(page.slug);
    if (input.id && input.id !== id) {
      throw new Error("Changing a page slug is not supported yet because it requires moving the page file.");
    }
  } else {
    const parsed = input.kind === "module"
      ? ModuleSchema.parse(input.fields)
      : PersonSchema.parse(input.fields);
    if (parsed._type !== input.schema) {
      throw new Error(`Entry schema must remain ${input.schema}.`);
    }
    const slug = input.id ? input.id.replace(`${input.kind}-`, "") : slugify(input.name);
    filePath = `content/${input.kind === "module" ? "modules" : "shared"}/${slug}.json`;
    content = `${JSON.stringify(parsed, null, 2)}\n`;
    id = `${input.kind}-${slug}`;
  }

  let version = input.version;
  if (input.id && !version) {
    version = (await getRepositoryFile(filePath)).sha;
  }
  const action = input.id ? "Update" : "Create";
  const result = await putRepositoryFile({
    path: filePath,
    content,
    message: `${action.toLowerCase()} ${input.kind}: ${input.name}`,
    sha: version,
  });

  return {
    id,
    path: result.content?.path ?? filePath,
    version: result.content?.sha,
    commitSha: result.commit.sha,
    commitUrl: result.commit.html_url,
  };
}
