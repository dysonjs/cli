# @dysonic/dy-cli-cmd-publish

`@dysonic/dy-cli-cmd-publish` implements the `dy-cli publish` command.

It is responsible for manually publishing the current npm package.

For the Chinese version, see `README_ZH.md`.

## Role

This package only handles the “publish the current package” scenario.
It does not handle:

- monorepo root batch publishing
- changesets version orchestration
- release workflows

So its scope is package-level `npm publish`.

## Main Contents

- `src/commands/publish.ts`
  publish command entry
- `src/tasks/publish-project-task.ts`
  publish execution task

## Command Semantics

```bash
dy-cli publish
dy-cli publish --dry-run
dy-cli publish --tag beta
```

## Supported Capabilities

- `--dry-run`
- `--tag`
- `--access`
- `--otp`
- `--registry`

## Behavior Constraints

- run it from the current package directory
- in monorepo child packages, it searches upward for the nearest `dy.config.ts`
- packages with `private: true` are rejected

## Design Notes

This package has been refactored from a publish-script wrapper into a real publish command implementation.
It calls `npm publish` directly inside the command flow.
