# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Validation

Documentation changes are validated in CI before a pull request can merge. Run the same checks locally with:

```bash
npm run typecheck    # TypeScript check
npm run lint:md      # Markdown formatting, including structure rules like a single H1 per page
npm run check:links  # External links in docs/ are reachable
npm run build        # Also fails on broken internal links
```

Or run everything at once:

```bash
npm run validate:docs
```

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
