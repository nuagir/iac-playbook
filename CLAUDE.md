# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Prerequisites

- **Node.js** ≥ 20, **npm** ≥ 10

## Commands

```bash
npm run start        # Start local dev server (http://localhost:3000)
npm run build        # Production build (output: build/)
npm run serve        # Serve the production build locally
npm run deploy       # Deploy to GitHub Pages
npm run clear        # Clear Docusaurus cache (.docusaurus/, build/)
npm run typecheck    # TypeScript check (no emit)
```

## Architecture

**IaC Playbook** is an opinionated Infrastructure-as-Code documentation site built with Docusaurus 3.10.1, TypeScript, and React 19.

### Structure

- `docs/`: MDX documentation files; sidebar is auto-generated from the filesystem via `sidebars.ts`
- `src/pages/`: standalone pages (e.g. homepage)
- `src/components/`: shared React components
- `src/css/custom.css`: global CSS overrides and Docusaurus theme variables
- `static/`: static assets served at the root (images, favicon)
- `docusaurus.config.ts`: site-wide configuration (title, URL, navbar, footer, plugins)
- `sidebars.ts`: sidebar layout configuration

### Configuration

Site URL is `https://iac-playbook.com`. The GitHub repo is `nuagir/iac-playbook`.

### Content

All documentation lives as MDX files under `docs/`. New docs are automatically picked up by the auto-generated sidebar. Use frontmatter (`title`, `sidebar_position`, `description`) to control ordering and metadata.

## Writing Conventions

- Never use em dashes (—) in documentation. Replace them with commas, periods, or rewrite the sentence as needed.

## Testing Conventions

There are no automated tests in this project. Run `npm run typecheck` to catch TypeScript errors before committing.

# Git Conventions

## Branch Naming

Always use the structure `<TASK-ID>-short-description` for branch names (e.g. `IAC-01-add-terraform-guide`, `IAC-42-update-navbar`).

## Pull Request Format

Always use the following structure when creating pull requests. Do not add any extra references, links, or metadata beyond what is shown. Always assign the PR to the authenticated user who is creating it and always use periods at the end of each items in the bullet list:

```
## Description

This PR contains ...

## Changes

- Added this functionality.

## Additional Notes

- Any additional notes that is useful to know in this PR.
```

## Commit Message

Always use the conventional commit structure for commit messages: `<type>(<scope>): <subject>`. Never add a body or description, only the title line. Keep the full commit message title under 72 characters.

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

Examples:

- `feat(docs): add Terraform module structure guide`
- `fix(config): correct GitHub Pages base URL`
- `chore(deps): update docusaurus to v3.10.1`

## Commit Author

Always commit using the authenticated user's own name and email. Look up the current user's identity (e.g. from the GitHub account or environment) and set it before committing:

```
git config user.name "<your name>"
git config user.email "<your email>"
```

Never commit as Claude or use a co-author trailer (e.g. `Co-authored-by: Claude`). All commits must be attributed solely to the authenticated human user.

## Additional Recommendations

- **Run `npm run typecheck` before committing** to catch TypeScript errors early without waiting for CI.
- **Do not introduce new npm dependencies without good reason**; Docusaurus provides most utilities needed for a documentation site.
- **Keep `docusaurus.config.ts` and `sidebars.ts` in sync**; if you add a new sidebar, reference it in the config.
- **When in doubt about scope**, prefer smaller, focused commits over large sweeping changes so diffs remain reviewable.
