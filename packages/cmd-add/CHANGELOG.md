# @dysonic/dy-cli-cmd-add

## 1.0.3

### Patch Changes

- Fix published template resolution for the `add` and `create` commands, and restore the package-local `cmd-add` TypeScript config so release builds run against the package itself instead of the workspace root.

## 1.0.2

### Patch Changes

- Harden the dy-cli release flow, align generated templates with the unified command model, and add scaffold snapshot coverage for create and add workflows.
- Updated dependencies
  - @dysonic/dy-cli-core@1.0.2

## 1.0.1

### Patch Changes

- Prevent prerelease publishing from assigning `latest` to packages that do not already have a stable release.
- Updated dependencies
  - @dysonic/dy-cli-core@1.0.1

## 1.0.0

### Major Changes

- e9820a8: Unify the public dy-cli mental model around create, install, add, build, test, version, and publish.

### Patch Changes

- Updated dependencies [e9820a8]
  - @dysonic/dy-cli-core@1.0.0

## 1.0.0-beta.0

### Major Changes

- Unify the public dy-cli mental model around create, install, add, build, test, version, and publish.

### Patch Changes

- Updated dependencies
  - @dysonic/dy-cli-core@1.0.0-beta.0

## 0.0.5

### Patch Changes

- Updated dependencies
  - @dysonic/dy-cli-core@0.0.5

## 0.0.4

### Patch Changes

- Updated dependencies
  - @dysonic/dy-cli-core@0.0.4

## 0.0.3

### Patch Changes

- Add workspace orchestration support for build and test, and continue the npm-based self-hosting refactor.
- Updated dependencies
  - @dysonic/dy-cli-core@0.0.3

## 0.0.2

### Patch Changes

- Fix published build compatibility for npm consumers and prepare the next self-hosting bootstrap release.
- Updated dependencies
  - @dysonic/dy-cli-core@0.0.2
