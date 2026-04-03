# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` workspace monorepo for `dy-cli`. Published packages live in `packages/`:
- `packages/cli`: the `dy-cli` binary entry package
- `packages/core`: shared command abstractions, config loading, helpers, and error types
- `packages/cmd-*`: one built-in command per package, such as `build`, `create`, `publish`, `test`, and `version`

Keep runtime code in `packages/*/src` and tests in `packages/*/test`. Scaffolding assets for `dy-cli create` live in `packages/cmd-create/src/templates`. Root-level command and project defaults are defined by `dy.config.ts`, `jest.config.js`, and `package.json`.

## Build, Test, and Development Commands
- `pnpm install`: install all workspace dependencies. Use Node `>=18.20.8`.
- `pnpm lint`: run ESLint across JS/TS files.
- `pnpm prettier`: format the repository with Prettier.
- `pnpm test`: run the workspace test flow through the self-hosted `dy-cli test`.
- `pnpm test -- --runInBand packages/<pkg>/test/index.test.ts`: run focused Jest suites through the same CLI path.
- `pnpm exec dy-cli build`: build package outputs; add `--types` or `--umd` when needed.
- `pnpm exec dy-cli publish --dry-run`: run the release path without publishing.
- `pnpm exec dy-cli version`: apply Changesets versioning for the fixed-version monorepo.

The repo is self-hosted and currently pins `dy-cli` to `1.0.4` in root `devDependencies`. Prefer validating behavior through that installed CLI rather than resurrecting removed legacy tooling.

## Coding Style & Naming Conventions
Follow `.editorconfig` and Prettier defaults: 2-space indentation, LF endings, UTF-8, semicolons, single quotes, trailing commas, and a 100-character print width. Prefer TypeScript throughout the repo.

Package conventions:
- use `src/index.ts` as the public package entry
- place command surfaces in `src/commands`
- place orchestration and side effects in `src/tasks`
- place builder-specific logic under `src/builders` when applicable
- name new workspace packages with the existing pattern, for example `packages/cmd-foo`

## Testing Guidelines
Jest uses `ts-jest` with `jsdom`. Tests live in `packages/*/test/**/*.test.ts`. Keep tests close to the package they cover, and use `index.test.ts` unless a more specific file name materially improves clarity.

When changing release, build, or workspace behavior, prefer focused regression coverage in the affected package before broad runs. Good examples in the current repo include:
- `packages/cmd-build/test/outside-cwd.test.ts`
- `packages/cmd-version/test/index.test.ts`
- `packages/cmd-publish/test/index.test.ts`

Before closing work, run the narrowest command that proves the change and include that evidence in your summary.

## Release & Versioning Notes
This repo uses a fixed-version monorepo strategy. Keep these rules in mind:
- add a Changeset under `.changeset/` for user-visible or published-package changes
- use `dy-cli version`, not ad hoc manual version edits, when preparing a release
- use `dy-cli publish` or `dy-cli publish --dry-run` for workspace publishing
- keep package versions aligned across all published `packages/*`
- keep `.changeset/config.json` consistent with the fixed release set

Recent work removed old local scripts and obsolete template tooling. Do not reintroduce `tools/scripts`, `tools/__template__`, `jest-runner.config.js`, or `jest-tsconfig.json` unless there is a very explicit reason and updated coverage for that path.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits such as `feat:`, `fix:`, `chore:`, and `chore(release):`. Continue that format and scope packages when useful.

PRs should:
- summarize user-visible changes
- list affected packages or workflows
- include the verification commands you ran
- mention release impact when touching build, versioning, publish, or self-hosted CLI behavior
