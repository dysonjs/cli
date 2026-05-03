# Contributing

This repository is a `pnpm` workspace for `dy-cli`.

The main contribution rule is to keep command boundaries explicit:

- `packages/cli` assembles the public executable.
- `packages/core` owns shared contracts, project resolution, package-manager adapters, and common
  helpers.
- `packages/cmd-*` packages own concrete command behavior and side effects.
- Scaffold templates live in `packages/cmd-create/src/templates`.

## Setup

Use Node `>=18.20.8` and the package manager declared in `package.json`.

```bash
pnpm install
```

## Common Checks

Run focused checks first, then broaden only when the change requires it.

```bash
pnpm lint
pnpm prettier
pnpm test
```

Focused test example:

```bash
pnpm test -- --runInBand packages/cmd-create/test/index.test.ts
```

## Change-Specific Verification

Use the narrowest command that proves the change.

| Change area                       | Recommended check                                                  |
| --------------------------------- | ------------------------------------------------------------------ |
| Scaffold templates or create flow | `pnpm run test:scaffold`                                           |
| Build behavior                    | `pnpm test -- --runInBand packages/cmd-build/test/index.test.ts`   |
| Test runner behavior              | `pnpm test -- --runInBand packages/cmd-test/test/index.test.ts`    |
| Versioning behavior               | `pnpm test -- --runInBand packages/cmd-version/test/index.test.ts` |
| Publish behavior                  | `pnpm test -- --runInBand packages/cmd-publish/test/index.test.ts` |
| Release package contents          | `pnpm run check:package-files`                                     |

When touching `cmd-build`, `cmd-create`, `cmd-version`, or `cmd-publish`, inspect the dry-run
package output before a real release.

## Release Boundaries

This repository uses fixed-version monorepo releases managed by `dy-cli`.

- Do not reintroduce user-facing `.changeset` files or `@changesets/*`.
- Use `dy-cli version --patch|--minor|--major` for monorepo releases.
- Use `dy-cli publish` or `dy-cli publish --dry-run` for workspace publishing.
- Keep published package versions aligned across `packages/*`.

## Pull Requests

Pull requests should include:

- user-visible behavior summary
- affected packages or workflows
- verification commands
- release impact when touching build, versioning, publishing, scaffolding, or CLI behavior
