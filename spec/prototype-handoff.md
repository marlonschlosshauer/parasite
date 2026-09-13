# Parasite prototype: current state and direction

Last reviewed: 2026-09-13

## Product idea

Parasite is a file-native CMS prototype for Next.js marketing sites. The central idea is that the repository remains the source of truth:

- Pages are real `page.tsx` files under `app/(app)`.
- Modules and shared content are JSON files under `content/`.
- The admin UI reads and changes a checked-out repository in a persistent Vercel Sandbox.
- Editors should get a CMS-like experience without moving page composition into an external CMS or a catch-all runtime route.

The editorial lifecycle is save = commit, release = pull request, and publish = merge. Saving and cutting a release are implemented; publishing is not.

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

`/admin/[branch]` obtains entries through `getEntries` and provides:

- Counts for pages, modules, and shared entries.
- Filtering by entry kind.
- Fuzzy matching over entry name and repository path.
- Pagination with a maximum page size of 100.
- An entry-type selector and Add entry button.
- An explicit Git branch selector, feature-branch creation, and release creation on non-default branches.

The Add entry interaction only navigates to `/admin/[branch]/new?type=...`; it performs no GitHub mutation.

The selected branch is a dynamic URL segment and is converted into an explicit `WorkspaceTarget`. The default route is `/admin/main`; `/admin` temporarily redirects there. Branches containing `/` use one URL-encoded segment so the captured value remains the exact Git ref. Repository functions never infer the branch from a cookie or other ambient state. Switching branches returns to the overview and opens the branch-specific workspace.

### Create and edit

`/admin/[branch]/new` builds a local template for the selected kind/schema. Creation happens only when Create entry is pressed, using the same save path as editing.

`/admin/[branch]/[entryId]` loads the entry and all non-page entries needed to resolve preview references. Its header is intentionally compact: back navigation, entries breadcrumb, lowercase entry name, and kind/schema badge on one line. The redundant sidebar/meta panel was removed.

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
2. `startAuthorization` requests a GitHub App installation authorization for the configured repository with `contents:write` and `pull_requests:write`.
3. The user follows the Vercel authorization flow and returns through `/admin/authorize/callback`.
4. Subsequent `getToken` calls use that user subject.
5. Admin routes verify that the token can read the configured repository before rendering.

This provides the desired repository-level gate: a user who cannot authorize access to the repository cannot use the admin. The Connect token remains server-side and is never intentionally returned to the browser.

The subject cookie is an opaque correlation identifier, not a complete application login system. Before treating the prototype as production-ready, add the organization's actual authentication/session layer and bind the Connect subject to a verified application user. Also add explicit authorization/audit policy as appropriate; possession of the current cookie alone should not become the long-term identity model.

Repository defaults can be overridden with:

- `GITHUB_REPOSITORY_OWNER`
- `GITHUB_REPOSITORY_NAME`
- `GITHUB_REPOSITORY_BRANCH`

## Sandbox workspace and repository behavior

The public server functions are:

- `getEntries(target, options)` for kind filtering, fuzzy query, and pagination.
- `getEntry(target, id)` for one entry.
- `getEntryEditorData(target, id)` for an entry plus preview dependencies.
- `saveEntry(target, input)` for both create and update.
- `createFeatureBranch(target, name)` for a `parasite/<name>` branch.
- `cutRelease(target)` for a pull request into the configured default branch.

`WorkspaceTarget` contains the configured repository owner/name and an explicit branch. The server validates that the client-supplied repository matches the configured repository before opening anything. Branch names are validated independently, and newly created branch names use lowercase letters, numbers, and single hyphens beneath the `parasite/` prefix.

The UI has a separate persistent Sandbox for each Connect subject, repository, and branch. The sandbox name is a server-derived hash and is never an authorization credential. `Sandbox.getOrCreate` creates or resumes the VM, after which the workspace bootstrap explicitly clones the requested branch into `<sandbox.cwd>/repository`. Bootstrap verifies that `.git` exists on every open and repairs an incomplete checkout before use. One recent snapshot is retained for five days.

Every workspace open obtains a fresh user-scoped GitHub token from Vercel Connect. Private cloning, fetches, and pushes use a static `GIT_ASKPASS` helper with the token supplied only in the individual command environment; the credential is not embedded in the remote URL or saved in the workspace.

Reads fetch and fast-forward the selected branch, enumerate tracked files locally, and read page/content sources through the Sandbox filesystem. File versions remain Git blob SHAs, retaining optimistic concurrency checks without the previous GitHub API N+1 pattern.

Saving performs server-side access verification and Zod validation, then works in the selected Sandbox checkout:

- Existing files include their blob SHA, providing optimistic concurrency protection.
- New modules/shared entries derive a safe filename from the entered name.
- Page paths derive from the page slug.
- Existing page slug changes are rejected because moving/deleting the old file is not implemented.
- Content is formatted JSON with a trailing newline.
- Page content is regenerated as TypeScript source.
- A successful write creates and pushes a commit to the explicitly selected branch.

Branch creation pushes the current workspace HEAD to a new `parasite/<name>` remote branch without changing the source workspace. Branches are shared Git refs rather than per-user refs, while physical UI sandboxes remain isolated per Connect subject. Feature branches can cut a release through the GitHub pull-request API; an existing open PR is reused.

## Eve agent

The admin top bar now includes a **Summon Eve** control. It opens a branch-aware chat drawer backed by the same-origin Eve HTTP channel mounted through `withEve`. Browser requests are authenticated with the existing HTTP-only Vercel Connect subject; a small `/admin/agent-session` bridge promotes older `/admin`-scoped cookies to the root path before the drawer connects.

Each durable conversation owns a separate Eve/Vercel Sandbox and binds itself to one explicit repository branch through `open_workspace`. The repository is cloned into `/workspace/repository`. The GitHub token is supplied only to the clone process and is not stored in the remote URL, so ordinary sandbox shell commands cannot push.

Default-branch conversations are lookup-only. The agent may read and explain files, but the trusted `publish_changes` tool rejects the configured default branch. On a feature branch the agent can edit with its normal sandbox tools, inspect/test the result, and propose publishing. Publishing always requires human approval, obtains a fresh user-scoped Connect token, commits the sandbox diff, and pushes only to the conversation's validated feature branch. The existing UI release control remains responsible for opening a pull request.

Eve route auth verifies the same Connect grant used by the admin. Its opaque subject cookie is not a GitHub credential, remains HTTP-only/SameSite, and is accepted only on same-origin requests. Eve's public health endpoint remains available, while agent inspection and session routes fail closed without repository authorization.

## Important limitations

- There is no publish, merge, delete, rename, branch cleanup, or full conflict-resolution flow yet.
- Saving on the default branch intentionally commits directly to it. Editors who want a review/release flow must create or select a feature branch first.
- Only five module schemas and one editable shared schema are registered.
- Page discovery has hardcoded fallbacks for the three demo pages; the marker is the scalable mechanism, but migration/discovery needs a deliberate design.
- Page generation supports only the known module registry and overwrites the complete page file.
- The field editor is value-shape-driven rather than schema-driven. It has no rich text, reference picker, media picker, field descriptions, validation UI, or reliable way to infer an item template for a genuinely empty array.
- References are plain strings and referential integrity is checked only where resolution happens.
- The entry list reads and parses all tracked content before filtering/pagination.
- There is no automated test suite beyond lint, TypeScript, and production builds.
- Non-fast-forward updates are rejected with a reload/retry message; merging divergent work is intentionally outside the prototype.
- Sandboxes are not deleted automatically when branches are removed or releases are merged.

## Pending navigation feedback

The most recent intended UI improvement is a custom editor breadcrumb link using Next.js `useLinkStatus`, with its spinner rendered into `document.body` through a React portal. The status component must remain a React descendant of `Link` for the hook to work. Disabling prefetch on that custom link makes pending feedback observable more reliably, and a short CSS delay avoids flashing on fast transitions.

This component is **not present in the repository state reviewed for this document**: `app/admin/[branch]/[entryId]/page.tsx` still imports `Link` directly from `next/link`. Treat the custom link/portal spinner as the immediate pending implementation rather than completed behavior.

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
4. Add richer release state, publish = merge, and branch/sandbox cleanup.
5. Add conflict/status handling beyond rejecting non-fast-forward writes.
6. Add tests around schemas, path generation, marker parsing, code generation, authorization boundaries, and optimistic concurrency.

## Local verification

Use pnpm for this project:

```bash
pnpm lint
pnpm build
```

The project currently targets Next.js 16.3.5, React 19.2.8, Zod 4.6.2, and `@vercel/connect` 2.0.4. Because this Next.js version includes breaking and evolving APIs, read the relevant local documentation under `node_modules/next/dist/docs/` before changing framework behavior.
