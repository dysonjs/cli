# @dysonic/dy-cli

`@dysonic/dy-cli` is the public CLI entry package for the project.

Its responsibility is intentionally narrow:

- expose the `dy-cli` executable
- register built-in command packages
- provide a unified CLI entrypoint

The built-in commands currently mounted are:

- `create`
- `install`
- `add`
- `build`
- `test`
- `version`
- `publish`

For the Chinese version, see `README_ZH.md`.

## Role

If the repository is viewed as a command platform:

- `core` provides shared contracts and helpers
- `cmd-*` packages implement concrete commands
- `cli` assembles them into the executable `dy-cli`

This package is therefore an assembly layer, not a business implementation layer.

## Main Contents

- `src/index.ts`
  creates the commander program and mounts built-in commands
- `src/cli.ts`
  executable CLI entry

## Dependencies

This package depends on:

- `@dysonic/dy-cli-core`
- `@dysonic/dy-cli-cmd-create`
- `@dysonic/dy-cli-cmd-install`
- `@dysonic/dy-cli-cmd-add`
- `@dysonic/dy-cli-cmd-build`
- `@dysonic/dy-cli-cmd-test`
- `@dysonic/dy-cli-cmd-version`
- `@dysonic/dy-cli-cmd-publish`

It should not be depended on by `cmd-*` packages or `core`.
