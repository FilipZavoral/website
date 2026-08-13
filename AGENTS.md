# Developer Instructions

## General Guidelines

1. **Read project context before changing code** - Read the repository-root `README.md`, then select and read the task-relevant maps from the repository-root `.planning/codebase/` directory. The available maps are `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STACK.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md`, and `.planning/codebase/CONCERNS.md`. `.gsd/codebase/` is a compatibility symlink to the same canonical files.

2. **Follow the binding UI decision order** - First inspect `app/components/` and reuse a suitable existing project component. Second, use a suitable Nuxt UI component from https://ui.nuxt.com. Only if neither fits, create minimal accessible semantic markup without bespoke or complex Tailwind styling, stop before custom visual design, and consult the user about the intended design.

3. **Use existing patterns** - Before writing new code, inspect the codebase for established conventions, naming patterns, and libraries.

4. **Check package.json** - Always verify available dependencies before importing or using external libraries.

5. **Run relevant verification** - After changes, run the relevant checks, including `npm run typecheck`. Run the production build when changing build configuration, integrations, or server code.

## Working Tree and Git Safety

- Inspect the working tree before editing. Treat existing dirty paths as unrelated user work unless the task explicitly assigns them.
- Never revert, overwrite, stage, or include unrelated existing changes. Preserve every unrelated dirty-worktree path.
- Do not create incremental or automatic commits. A complete phase becomes eligible for a commit only after all relevant checks pass, UAT is complete, the changes are summarized, and the user gives explicit approval for that commit.
- Approval is never implied by successful automated checks or UAT; explicit commit approval is a separate requirement.

## Project-Specific Knowledge

- Dependencies are managed by npm (do not use pnpm or another package manager).
- This is a Nuxt 4 application with `@nuxt/content` for content management
- Blog articles are stored in `content/blog-articles/` with date prefixes in filenames (e.g., `20230816.bolt-karta-s-lnbits.md`)
- The collection is defined in `content.config.ts`, check it when working with content files and keep correct frontmatter fields structure.
- When querying blog articles, use `id` for ordering (contains date in filename)
- Production environment is hosted on the Cloudflare Workers
- Treat content as actionable work only when it has a syntactic TODO marker or an unambiguous product placeholder. Ordinary editorial prose, including future-looking prose, is not an implementation task.
