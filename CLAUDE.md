# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`dy-cli` is a command-first toolkit for TypeScript package projects: one stable CLI surface for
creating, installing, building, testing, versioning, and publishing `single` and `monorepo`
packages. It is a `pnpm` workspace monorepo and it is **self-hosted** — the repo uses `dy-cli` to
build, test, version, and publish itself.

`AGENTS.md` and `CONTRIBUTING.md` are authoritative for release rules and contribution boundaries;
read them before doing anything release-related.

## Self-hosting: the most important gotcha

This repo depends on a *published* `dy-cli` (pinned in root `devDependencies` as
`dy-cli: npm:@dysonic/dy-cli@<version>`), and `pnpm test` / `pnpm exec dy-cli ...` run that
**installed binary**, not the source in `packages/`.

When you change CLI behavior itself (build, version, publish, test runner, scaffolding), validate
against the **source entry** so you exercise the unpublished code, not the old npm binary:

```bash
TS_NODE_PROJECT=tsconfig.json node \
  -r ./node_modules/ts-node/register \
  -r ./node_modules/tsconfig-paths/register \
  ./packages/cli/src/cli.ts <command> [...args]
```

CI uses the same entry via `DY_CLI_SOURCE_ENTRY=./packages/cli/src/cli.ts`.

## Commands

- `pnpm install` — install workspace deps (Node `>=18.20.8`, pnpm `10.8.0`).
- `pnpm lint` — ESLint over JS/TS.
- `pnpm prettier` — format with Prettier.
- `pnpm test` — full test flow (runs the self-hosted `dy-cli test`).
- `pnpm test -- --runInBand packages/<pkg>/test/index.test.ts` — focused suite. To pass a Jest
  name filter, append `-t "name"`.
- `pnpm run test:scaffold` — smoke test for the `create` scaffold flow.
- `pnpm run check:package-files` — `dy-cli publish --dry-run`; validates declared package files.
- `pnpm exec dy-cli build` — build outputs (`--types`, `--umd`, `--bin`, `--workspace`).

Match the change to its narrowest check (see the table in `CONTRIBUTING.md`); the single-package
focused test is usually `packages/cmd-<area>/test/index.test.ts`.

## Architecture

Dependency direction is one-way and must stay that way:

```
dy-cli binary → packages/cli → packages/cmd-* → packages/core
```

`packages/core` is shared infrastructure and **must not depend on any command package**.

- **`packages/cli`** — assembles the public executable. `src/index.ts` builds a Commander
  `program` and `.addCommand()`s each command; `src/cli.ts` is the bin entry that calls
  `runCLI().catch(reportCliFailure)`.
- **`packages/cmd-*`** — one built-in command per package (`create`, `install`, `add`, `build`,
  `test`, `version`, `publish`). Each exports a singleton command instance (e.g.
  `export const build = new BuildCommand()`) that `cli` imports.
- **`packages/core`** — `AbstractCommand`/`AbstractTask` base classes, config loading, project &
  package-manager resolution, release state, `DyCliError`, logger, and all interfaces. Re-exported
  flat from `src/index.ts`.

### The Command → Task pattern (the key abstraction)

Read these together to understand how a command runs: `core/src/commands/abstract-command.ts`,
`core/src/tasks/abstract-task.ts`, and any `cmd-*/src/commands/<cmd>.ts`.

- A command extends `AbstractCommand<Config, Args>`. Its constructor calls `super(name)` →
  `init()`, which registers positional args, a global `--cwd`, and the flags from `getOptions()`,
  then wires the Commander action. The action: collects merged args → resolves `cwd` → loads the
  external `dy.config.ts` → calls `mergeConfigWithArgs()` to produce the typed `Config` → calls
  `execute()`.
- Subclasses implement three things: `getOptions()`, `mergeConfigWithArgs()` (**CLI args win over
  `dy.config.ts`**), and `execute()` (instantiate and `run()` Tasks).
- **Commands** own arg parsing/validation and config merging. **Tasks** (`src/tasks/*`, extend
  `AbstractTask<Config, Result>`) own orchestration and side effects. `cmd-build` additionally has
  **builders** (`src/builders/*`) for output-format-specific logic (package/types/umd/bin).

Place command surfaces in `src/commands`, side-effecting orchestration in `src/tasks`, builders in
`src/builders`. New command packages follow the `packages/cmd-foo` naming pattern.

### Config & scope resolution

- `dy.config.ts` (project root) is the project metadata + per-command defaults entry
  (`project.type`, `versionStrategy`, `commands.*`). Commands read it via
  `loadExternalRunCommandsConfig` / `loadNearestExternalRunCommandsConfig` from core.
- Command scope is derived from the nearest `dy.config.ts` + package location: `single` root or a
  monorepo child → current package; `monorepo` root → all `packages/*` for workspace-aware flows.
- Package-manager intent (`detectPackageManager` in
  `core/src/helpers/package-manager.ts`) is resolved from `packageManager` / lockfiles, walking up
  to the workspace root. Recursive internal calls go through `pnpm exec` / `npm exec`, not PATH.

## Testing

Jest + `ts-jest` + `jsdom`. Tests live in `packages/*/test/**/*.test.ts` (default file
`index.test.ts`). `jest.config.js` `moduleNameMapper` maps every `@dysonic/dy-cli*` import to that
package's `src/` — **tests run against source, not built `dist/`**. Coverage threshold is 90%
lines/statements.

## Conventions

- Prettier/`.editorconfig`: 2-space indent, LF, semicolons, single quotes, trailing commas,
  100-char width. TypeScript throughout; `src/index.ts` is each package's public entry.
- Inline comments in this codebase are written in **Chinese** — match the surrounding language when
  editing nearby code. Docs are bilingual (`README.md` / `README_ZH.md`).
- Conventional Commits, scoped to packages when useful (`feat:`, `fix:`, `chore:`,
  `chore(release):`, `refactor(core):`). Keep each message to a **single concise subject line** —
  no body and no trailers (including no `Co-Authored-By`).

## Releases (fixed-version monorepo)

Managed by `dy-cli` itself; **do not** reintroduce `.changeset` files or `@changesets/*` anywhere
(including generated templates).

- Version with `dy-cli version --patch|--minor|--major` (never hand-edit versions); keep all
  `packages/*` versions aligned. `--beta` / `--beta-exit` toggle prerelease mode.
- Publish via `dy-cli publish` (`--dry-run` to rehearse). `publish` rejects `private: true` and
  verifies declared entry files (`main`, `module`, `types`, `browser`, `bin`) exist first.
- A bare "publish"/"release" request means the **GitHub Actions release workflow**
  (`.github/workflows/release.yml`, `action=publish` on the default branch) — not local
  `npm publish`. Confirm the bump kind first. If CI publish fails, diagnose the root cause; do not
  fall back to local publish or add dummy files to force success.
- `packages/cmd-create` is the highest-risk package for stale template artifacts — inspect
  `publish --dry-run` tarball output when touching `cmd-build`/`cmd-create`/`cmd-version`/`cmd-publish`.
