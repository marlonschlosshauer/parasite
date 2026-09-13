import { z } from "zod";

export const PageContentSchema = z.object({
  _type: z.literal("page"),
  title: z.string().min(1),
  slug: z.string().regex(/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/, "Use a lowercase URL path without a trailing slash"),
  modules: z.array(
    z.string().regex(/^content\/modules\/[a-z0-9-]+\.json$/, "Expected a module content reference"),
  ),
}).strict();

export type PageContent = z.infer<typeof PageContentSchema>;
