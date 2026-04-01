# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` workspace monorepo. Core code lives in `packages/`: `cli` exposes the `dy-cli` binary, `core` holds shared abstractions and helpers, and each `cmd-*` package implements one command such as `build`, `test`, or `publish`. Keep runtime code in `packages/*/src` and tests in `packages/*/test`. Scaffolding assets for `dy-cli create` live under `packages/cmd-create/src/templates`. Root-level behavior is defined in `dy.config.ts`, `jest.config.js`, and `package.json`.

## Build, Test, and Development Commands
- `pnpm install`: install all workspace dependencies. Use Node `>=18.20.8`.
- `pnpm lint`: run ESLint across all JS/TS files.
- `pnpm prettier`: apply Prettier formatting across the repo.
- `pnpm test`: run the workspace test flow through `dy-cli test`.
- `pnpm exec dy-cli build`: build packages; add `--types` or `--umd` when needed.
- `pnpm exec dy-cli test --coverage`: run Jest with coverage reporting.
- `pnpm exec dy-cli publish --dry-run`: verify the release path without publishing.

## Coding Style & Naming Conventions
Follow `.editorconfig` and Prettier defaults: 2-space indentation, LF endings, UTF-8, semicolons, single quotes, trailing commas, and a 100-character print width. Prefer TypeScript in all package code. Keep package entry points in `src/index.ts`, place CLI surface code in `src/commands`, and put orchestration in `src/tasks`. Name new workspace packages with the existing pattern, for example `packages/cmd-foo`.

## Testing Guidelines
Jest uses `ts-jest` with `jsdom` and matches `packages/*/test/**/*.test.ts`. Keep tests close to the package they cover and follow the existing `index.test.ts` naming pattern unless a more specific file name improves clarity. The repo enforces global coverage thresholds of 90% for lines and statements, so run `pnpm exec dy-cli test --coverage` before opening a PR.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits, for example `feat:`, `docs:`, and `chore(release):`. Continue that format and scope packages when useful. PRs should summarize user-visible changes, list affected packages, and include test evidence. If a change affects versioned behavior or published packages, add a Changeset in `.changeset/` so the release workflow on `main` can version and publish correctly.
