# Parasite prototype: current state and direction

Last reviewed: 2026-09-13

## Product idea

Parasite is a file-native CMS prototype for Next.js marketing sites. The central idea is that the repository remains the source of truth:

- Pages are real `page.tsx` files under `app/(app)`.
- Modules and shared content are JSON files under `content/`.
- The admin UI reads and changes those repository files through GitHub.
- Editors should get a CMS-like experience without moving page composition into an external CMS or a catch-all runtime route.

The eventual editorial lifecycle is intended to be save = commit, release = pull request, and publish = merge. The prototype currently implements only saving, and saves commit directly to the configured branch.

## Current content model

There are three entry kinds:

### Pages

Pages live beneath `app/(app)` and map directly to their public route. For example, `/product/foo/bar` is `app/(app)/product/foo/bar/page.tsx`.

The editable page model currently contains:

```ts
{
  _type: "page";
  title: string;
  slug: string;
  modules: string[];
}
```

Module references are repository-relative paths such as `content/modules/product-hero.json`. `_type` is retained in stored data as a discriminator but deliberately hidden from the editor.

Generated pages contain a `// @parasite-page <base64>` marker. `lib/entries.ts` decodes this marker to recover the editable page definition. The three original pages also have hardcoded fallback definitions for files without a marker.

### Modules

Modules have JSON content in `content/modules` and React implementations in `components/modules`. The supported module schemas are:

- `text`
- `hero`
- `grid`
- `quote`
- `cta`

They are modeled as a Zod discriminated union. Marketing pages parse imported JSON before rendering it, then remove `_type` with `withoutType` so discriminator metadata is never passed as a React prop.

Quote is the current example of a module referencing shared content: its `person` field points to a shared JSON file, which is parsed separately and passed to `ModuleQuote`.

### Shared content

Shared content lives in `content/shared` and has no React implementation of its own. Person is the only shared entry type wired into repository loading and saving today. Schemas/types for links, cards, and images exist, but the generic entry system does not yet recognize them as independently editable shared entries.

Using stable repository-relative paths for references is preferable to bare filenames. It avoids ambiguity as the content tree grows and makes reference resolution explicit.

## Type safety and validation

JSON is intentionally retained as the storage format because it is easy for an editor, code generator, GitHub integration, or agent to create and modify. Zod is the runtime trust boundary:

- JSON imported by marketing pages is parsed before rendering.
- GitHub responses are parsed before use.
- Remote content entries are parsed when listed or opened.
- Draft editor values use `safeParse` for previews.
- Save input and final serialized content are parsed again on the server.

Types should preferably be inferred from the Zod schemas so the runtime contract and TypeScript contract cannot drift. Avoid restoring `as SomeContent` casts around JSON imports.

## Marketing application

The route group `app/(app)` contains the actual site and a shared marketing layout. Current public routes are:

- `/`
- `/about`
- `/product/foo/bar`

These pages compose content-backed modules using ordinary imports and React components. The product hero was moved out of the page and into the `hero` module so all visible page content can be edited.

`lib/page-codegen.ts` can regenerate a complete page file from a page entry. It reads and validates each referenced module, emits the required imports and component invocations, and handles quote/person resolution specially. This is deliberately simple prototype code: saving a page replaces the whole generated file and does not preserve arbitrary hand-authored code inside it.

## Admin application

The admin lives under `/admin` and has no sidebar.

### Overview

`/admin` obtains entries through `getEntries` and provides:

- Counts for pages, modules, and shared entries.
- Filtering by entry kind.
- Fuzzy matching over entry name and repository path.
- Pagination with a maximum page size of 100.
- An entry-type selector and Add entry button.

The Add entry interaction only navigates to `/admin/new?type=...`; it performs no GitHub mutation.

### Create and edit

`/admin/new` builds a local template for the selected kind/schema. Creation happens only when Create entry is pressed, using the same save path as editing.

`/admin/[entryId]` loads the entry and all non-page entries needed to resolve preview references. Its header is intentionally compact: back navigation, entries breadcrumb, lowercase entry name, and kind/schema badge on one line. The redundant sidebar/meta panel was removed.

`EntryEditor` recursively renders strings, numbers, booleans, arrays, and nested objects. It:

- Hides `_type` at every object depth.
- Tracks a serialized saved snapshot to determine dirty state.
- Enables Save only after a change; new entries begin dirty.
- Uses a server action for save and reports success/errors inline.
- Refreshes data after save and replaces the URL after creation.

The editor owns an `.entry-editor` wrapper and fills the available viewport height on wide screens. Fields and preview scroll independently while the action bar stays at the bottom. Below 1100px it returns to normal document flow and stacks the preview below the fields.

### Live preview

The preview uses the actual marketing module components with the current unsaved field state:

- Module drafts are parsed through the module union and rendered by discriminator.
- Shared persons have a dedicated presentation.
- Page drafts render their referenced modules in order.
- Quote references resolve against the entries loaded with the editor.
- Invalid/incomplete data shows a preview error rather than throwing.

The preview is representative, not a complete isolated browser. It reuses scaled styles in the admin stylesheet and does not execute a separately rendered public route.

## GitHub and Vercel Connect

All repository operations are server-only. The configured Vercel Connect integration is `github/parasite`.

Access is user-scoped rather than app-scoped:

1. `/admin/authorize` creates or reuses a random subject ID stored in the `parasite-github-subject` HTTP-only cookie.
2. `startAuthorization` requests a GitHub App installation authorization for the configured repository and `contents:write`.
3. The user follows the Vercel authorization flow and returns through `/admin/authorize/callback`.
4. Subsequent `getToken` calls use that user subject.
5. Admin routes verify that the token can read the configured repository before rendering.

This provides the desired repository-level gate: a user who cannot authorize access to the repository cannot use the admin. The Connect token remains server-side and is never intentionally returned to the browser.

The subject cookie is an opaque correlation identifier, not a complete application login system. Before treating the prototype as production-ready, add the organization's actual authentication/session layer and bind the Connect subject to a verified application user. Also add explicit authorization/audit policy as appropriate; possession of the current cookie alone should not become the long-term identity model.

Repository defaults can be overridden with:

- `GITHUB_REPOSITORY_OWNER`
- `GITHUB_REPOSITORY_NAME`
- `GITHUB_REPOSITORY_BRANCH`

## Repository read and save behavior

The public server functions are:

- `getEntries(options)` for kind filtering, fuzzy query, and pagination.
- `getEntry(id)` for one entry.
- `getEntryEditorData(id)` for an entry plus preview dependencies.
- `saveEntry(input)` for both create and update.

Reads fetch the recursive Git tree and then fetch every relevant file from GitHub. This keeps GitHub authoritative, but it is currently an N+1 request pattern and will need caching, batching, or an indexed manifest as the repository grows.

Saving performs server-side access verification and Zod validation, then uses GitHub's Contents API:

- Existing files include their blob SHA, providing optimistic concurrency protection.
- New modules/shared entries derive a safe filename from the entered name.
- Page paths derive from the page slug.
- Existing page slug changes are rejected because moving/deleting the old file is not implemented.
- Content is formatted JSON with a trailing newline.
- Page content is regenerated as TypeScript source.
- A successful write creates a commit directly on the configured branch.

## Important limitations

- There is no branch, pull request, release, publish, merge, delete, rename, rollback, or draft persistence flow yet.
- Saves currently commit directly to `main` by default. This must change before implementing the intended release workflow.
- Only five module schemas and one editable shared schema are registered.
- Page discovery has hardcoded fallbacks for the three demo pages; the marker is the scalable mechanism, but migration/discovery needs a deliberate design.
- Page generation supports only the known module registry and overwrites the complete page file.
- The field editor is value-shape-driven rather than schema-driven. It has no rich text, reference picker, media picker, field descriptions, validation UI, or reliable way to infer an item template for a genuinely empty array.
- References are plain strings and referential integrity is checked only where resolution happens.
- The entry list downloads and parses all content before filtering/pagination.
- There is no automated test suite beyond lint, TypeScript, and production builds.
- GitHub API errors are surfaced as text, but conflict-specific recovery UX is not implemented.

## Pending navigation feedback

The most recent intended UI improvement is a custom editor breadcrumb link using Next.js `useLinkStatus`, with its spinner rendered into `document.body` through a React portal. The status component must remain a React descendant of `Link` for the hook to work. Disabling prefetch on that custom link makes pending feedback observable more reliably, and a short CSS delay avoids flashing on fast transitions.

This component is **not present in the repository state reviewed for this document**: `app/admin/[entryId]/page.tsx` still imports `Link` directly from `next/link`. Treat the custom link/portal spinner as the immediate pending implementation rather than completed behavior.

## Direction and design intentions

The UI workflow and an agent workflow do not need to share the same low-level file-editing mechanism. They should share contracts and invariants:

- Schemas and entry identifiers.
- Repository/path rules.
- Validation and reference checks.
- Commit/branch/release conventions.
- Authorization policy.

The admin can continue to use explicit domain functions such as `getEntries` and `saveEntry`. A sandboxed agent can use ordinary filesystem tools and validate/build before proposing changes. Trying to force an agent's flexible editing behavior through a form-oriented `saveEntry` API would constrain the agent, while exposing raw file tools to the UI would make routine editing unnecessarily unsafe and complex.

A useful next architectural step is to separate repository transport from content operations. For example, a repository adapter could support GitHub Contents today and a checked-out Vercel Sandbox later, while schema validation and page generation remain shared. This should be introduced when a second backend is real, not as speculative abstraction first.

Likely next milestones:

1. Restore the pending custom link/loading indicator.
2. Introduce a schema registry that drives creation templates, editor fields, preview dispatch, and page code generation from one definition.
3. Add field-level Zod issue display and purpose-built reference inputs.
4. Move saves onto per-release branches and model release state explicitly.
5. Implement release = PR and publish = merge with conflict/status handling.
6. Add tests around schemas, path generation, marker parsing, code generation, authorization boundaries, and optimistic concurrency.
7. Add an agent workflow in Vercel Sandbox that edits a checkout, runs validation/build, and produces changes under the same release conventions.

## Local verification

Use pnpm for this project:

```bash
pnpm lint
pnpm build
```

The project currently targets Next.js 16.3.5, React 19.2.8, Zod 4.6.2, and `@vercel/connect` 2.0.4. Because this Next.js version includes breaking and evolving APIs, read the relevant local documentation under `node_modules/next/dist/docs/` before changing framework behavior.
