# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` workspace monorepo for `dy-cli`.

Published packages live under `packages/`:
- `packages/cli`: the `dy-cli` binary entry package
- `packages/core`: shared command abstractions, config loading, helpers, release state, and error types
- `packages/cmd-*`: one built-in command per package, such as `build`, `create`, `install`, `publish`, `test`, and `version`

Keep runtime code in `packages/*/src` and tests in `packages/*/test`. Scaffolding assets for `dy-cli create` live in `packages/cmd-create/src/templates`. Root-level defaults come from `dy.config.ts`, `jest.config.js`, and `package.json`.

## Build, Test, and Development Commands
- `pnpm install`: install all workspace dependencies. Use Node `>=18.20.8`.
- `pnpm lint`: run ESLint across JS/TS files.
- `pnpm prettier`: format the repository with Prettier.
- `pnpm test`: run the workspace test flow through the self-hosted `dy-cli test`.
- `pnpm test -- --runInBand packages/<pkg>/test/index.test.ts`: run a focused Jest suite through the same CLI path.
- `pnpm exec dy-cli build`: build package outputs; add `--types`, `--umd`, or `--bin` when needed.
- `pnpm exec dy-cli publish --dry-run`: run the release path without publishing.
- `pnpm exec dy-cli version --patch`: cut the next fixed-monorepo patch release.

The repo is self-hosted and currently pins `dy-cli` to `1.0.5` in root `devDependencies`. When changing release behavior itself, prefer validating through the current source entry instead of only the installed npm binary.

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

When changing build, version, publish, or scaffolding behavior, prefer focused regression coverage in the affected package before broad runs. Good examples in the current repo include:
- `packages/cmd-build/test/outside-cwd.test.ts`
- `packages/cmd-version/test/index.test.ts`
- `packages/cmd-publish/test/index.test.ts`
- `packages/cmd-create/test/index.test.ts`

Before closing work, run the narrowest command that proves the change and include that evidence in your summary.

## Release & Versioning Notes
This repo uses a fixed-version monorepo strategy managed by `dy-cli` itself.

Keep these rules in mind:
- do not reintroduce user-facing `.changeset` files or `@changesets/*`
- use `dy-cli version --patch|--minor|--major`, not ad hoc manual version edits, when preparing a monorepo release
- use `dy-cli publish` or `dy-cli publish --dry-run` for workspace publishing
- keep package versions aligned across all published `packages/*`
- generated `single` and `monorepo` projects must not expose `.changeset`

If release code itself changed, validate with the source entry so you exercise the unpublished implementation:
- `TS_NODE_PROJECT=tsconfig.json node -r ./node_modules/ts-node/register -r ./node_modules/tsconfig-paths/register ./packages/cli/src/cli.ts version --patch`

When touching `cmd-build`, `cmd-create`, `cmd-version`, or `cmd-publish`, inspect the `publish --dry-run` tarball output before a real release. `packages/cmd-create` is the highest-risk package for stale template artifacts.

Default release behavior for agents:
- treat a bare user request such as "publish", "release", or "发" as a request to use the GitHub Actions release workflow, not local `npm publish`
- confirm the intended release kind first when it is not explicit: `patch`, `minor`, `major`, or prerelease/beta
- perform release readiness checks before changing versions: `git status`, current branch, package versions, lockfile state, focused tests, build output, `publish --dry-run`, and declared package files such as `main`, `module`, `types`, `browser`, and `bin`
- when release, build, publish, version, scaffold, or CLI behavior changed, run the source CLI entry for the relevant verification instead of relying only on the installed `dy-cli` binary
- prepare version changes with `dy-cli version --patch|--minor|--major`, update `pnpm-lock.yaml` when package versions or internal dependency specs changed, then commit and push intentionally
- publish from CI on the default branch through `.github/workflows/release.yml` with `action=publish`; do not publish from the developer machine unless the user explicitly asks to bypass CI and accepts the OTP/token boundary
- if CI publish fails, stop and diagnose the root cause. Do not switch to local publish, add dummy files, change npm auth strategy, or skip checks just to make the release appear successful
- after CI succeeds, verify npm state: all published workspace packages should report the same version and expected dist-tag, and at least the CLI package plus any changed high-risk package should be checked with `npm pack --dry-run --json` for `dist/index.d.ts` and declared entry files

Recent work removed old local scripts and obsolete template tooling. Do not reintroduce `tools/scripts`, `tools/__template__`, `jest-runner.config.js`, or `jest-tsconfig.json` unless there is a very explicit reason and updated coverage for that path.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits such as `feat:`, `fix:`, `chore:`, and `chore(release):`. Continue that format and scope packages when useful.

PRs should:
- summarize user-visible changes
- list affected packages or workflows
- include the verification commands you ran
- mention release impact when touching build, versioning, publish, scaffolding, or self-hosted CLI behavior
