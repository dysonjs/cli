# @dysonic/dy-cli

## 1.0.9

### Patch Changes

- Merge pull request #5 from dysonjs/refactor/workspace-self-invocation

- Updated dependencies
  - @dysonic/dy-cli-core@1.0.9
  - @dysonic/dy-cli-cmd-add@1.0.9
  - @dysonic/dy-cli-cmd-build@1.0.9
  - @dysonic/dy-cli-cmd-create@1.0.9
  - @dysonic/dy-cli-cmd-install@1.0.9
  - @dysonic/dy-cli-cmd-publish@1.0.9
  - @dysonic/dy-cli-cmd-test@1.0.9
  - @dysonic/dy-cli-cmd-version@1.0.9

## 1.0.8

### Patch Changes

- ci: disable provenance for private release workflow
- ci: use package manager pnpm version
- Merge branch 'dev' into main for 1.0.7 release
- ci: publish packages from github actions
- chore: remove project npm auth token
- fix(create): resolve package manifest from dist
- Merge pull request #4 from dysonjs/dev
- chore: type generated dy config
- feat: harden scaffold release workflow
- docs: refresh repository guidelines
- feat: hide changesets behind dy-cli release flow
- chore: remove unused rollup-plugin-typescript2
- chore: remove obsolete local tooling
- chore: upgrade self-hosted dy-cli to 1.0.4

- Updated dependencies
  - @dysonic/dy-cli-core@1.0.8
  - @dysonic/dy-cli-cmd-add@1.0.8
  - @dysonic/dy-cli-cmd-build@1.0.8
  - @dysonic/dy-cli-cmd-create@1.0.8
  - @dysonic/dy-cli-cmd-install@1.0.8
  - @dysonic/dy-cli-cmd-publish@1.0.8
  - @dysonic/dy-cli-cmd-test@1.0.8
  - @dysonic/dy-cli-cmd-version@1.0.8

## 1.0.7

### Patch Changes

- chore: remove project npm auth token
- fix(create): resolve package manifest from dist
- chore: type generated dy config
- feat: harden scaffold release workflow
- docs: refresh repository guidelines
- feat: hide changesets behind dy-cli release flow
- chore: remove unused rollup-plugin-typescript2
- chore: remove obsolete local tooling
- chore: upgrade self-hosted dy-cli to 1.0.4

- Updated dependencies
  - @dysonic/dy-cli-core@1.0.7
  - @dysonic/dy-cli-cmd-add@1.0.7
  - @dysonic/dy-cli-cmd-build@1.0.7
  - @dysonic/dy-cli-cmd-create@1.0.7
  - @dysonic/dy-cli-cmd-install@1.0.7
  - @dysonic/dy-cli-cmd-publish@1.0.7
  - @dysonic/dy-cli-cmd-test@1.0.7
  - @dysonic/dy-cli-cmd-version@1.0.7

## 1.0.6

### Patch Changes

- docs: refresh repository guidelines
- feat: hide changesets behind dy-cli release flow
- chore: remove unused rollup-plugin-typescript2
- chore: remove obsolete local tooling
- chore: upgrade self-hosted dy-cli to 1.0.4

- Updated dependencies
  - @dysonic/dy-cli-core@1.0.6
  - @dysonic/dy-cli-cmd-add@1.0.6
  - @dysonic/dy-cli-cmd-build@1.0.6
  - @dysonic/dy-cli-cmd-create@1.0.6
  - @dysonic/dy-cli-cmd-install@1.0.6
  - @dysonic/dy-cli-cmd-publish@1.0.6
  - @dysonic/dy-cli-cmd-test@1.0.6
  - @dysonic/dy-cli-cmd-version@1.0.6

## 1.0.5

### Patch Changes

- chore: remove unused rollup-plugin-typescript2
- chore: remove obsolete local tooling
- chore: upgrade self-hosted dy-cli to 1.0.4

- Updated dependencies
  - @dysonic/dy-cli-core@1.0.5
  - @dysonic/dy-cli-cmd-add@1.0.5
  - @dysonic/dy-cli-cmd-build@1.0.5
  - @dysonic/dy-cli-cmd-create@1.0.5
  - @dysonic/dy-cli-cmd-install@1.0.5
  - @dysonic/dy-cli-cmd-publish@1.0.5
  - @dysonic/dy-cli-cmd-test@1.0.5
  - @dysonic/dy-cli-cmd-version@1.0.5

## 1.0.4

### Patch Changes

- ec70e4f: Fix package builds invoked from outside the target package directory by passing the package cwd into the Rollup TypeScript plugin.

  This release also keeps fixed monorepo package versions aligned after `changeset version`, and republishes the current core logger behavior so `debug` output only appears in explicit development mode instead of leaking into normal CLI runs through older internal package versions.

- Updated dependencies [ec70e4f]
  - @dysonic/dy-cli-cmd-build@1.0.4
  - @dysonic/dy-cli-cmd-version@1.0.4
  - @dysonic/dy-cli-core@1.0.4
  - @dysonic/dy-cli-cmd-add@1.0.4
  - @dysonic/dy-cli-cmd-create@1.0.4
  - @dysonic/dy-cli-cmd-install@1.0.4
  - @dysonic/dy-cli-cmd-publish@1.0.4
  - @dysonic/dy-cli-cmd-test@1.0.4

## 1.0.3

### Patch Changes

- Updated dependencies
  - @dysonic/dy-cli-cmd-add@1.0.3
  - @dysonic/dy-cli-cmd-create@1.0.3

## 1.0.2

### Patch Changes

- Harden the dy-cli release flow, align generated templates with the unified command model, and add scaffold snapshot coverage for create and add workflows.
- Updated dependencies
  - @dysonic/dy-cli-cmd-add@1.0.2
  - @dysonic/dy-cli-cmd-build@1.0.2
  - @dysonic/dy-cli-cmd-create@1.0.2
  - @dysonic/dy-cli-cmd-install@1.0.2
  - @dysonic/dy-cli-cmd-publish@1.0.2
  - @dysonic/dy-cli-cmd-test@1.0.2
  - @dysonic/dy-cli-cmd-version@1.0.2
  - @dysonic/dy-cli-core@1.0.2

## 1.0.1

### Patch Changes

- Prevent prerelease publishing from assigning `latest` to packages that do not already have a stable release.
- Updated dependencies
  - @dysonic/dy-cli-cmd-add@1.0.1
  - @dysonic/dy-cli-cmd-build@1.0.1
  - @dysonic/dy-cli-cmd-create@1.0.1
  - @dysonic/dy-cli-cmd-install@1.0.1
  - @dysonic/dy-cli-cmd-publish@1.0.1
  - @dysonic/dy-cli-cmd-test@1.0.1
  - @dysonic/dy-cli-cmd-version@1.0.1
  - @dysonic/dy-cli-core@1.0.1

## 1.0.0

### Major Changes

- e9820a8: Unify the public dy-cli mental model around create, install, add, build, test, version, and publish.

### Patch Changes

- Updated dependencies [e9820a8]
  - @dysonic/dy-cli-cmd-add@1.0.0
  - @dysonic/dy-cli-cmd-build@1.0.0
  - @dysonic/dy-cli-cmd-create@1.0.0
  - @dysonic/dy-cli-cmd-install@1.0.0
  - @dysonic/dy-cli-cmd-publish@1.0.0
  - @dysonic/dy-cli-cmd-test@1.0.0
  - @dysonic/dy-cli-cmd-version@1.0.0
  - @dysonic/dy-cli-core@1.0.0

## 1.0.0-beta.0

### Major Changes

- Unify the public dy-cli mental model around create, install, add, build, test, version, and publish.

### Patch Changes

- Updated dependencies
  - @dysonic/dy-cli-cmd-add@1.0.0-beta.0
  - @dysonic/dy-cli-cmd-build@1.0.0-beta.0
  - @dysonic/dy-cli-cmd-create@1.0.0-beta.0
  - @dysonic/dy-cli-cmd-install@1.0.0-beta.0
  - @dysonic/dy-cli-cmd-publish@1.0.0-beta.0
  - @dysonic/dy-cli-cmd-test@1.0.0-beta.0
  - @dysonic/dy-cli-cmd-version@1.0.0-beta.0
  - @dysonic/dy-cli-core@1.0.0-beta.0

## 0.0.5

### Patch Changes

- Run workspace build and test orchestration through package scripts so composed package build flows stay in sync with published dist output.
- Updated dependencies
  - @dysonic/dy-cli-core@0.0.5
  - @dysonic/dy-cli-cmd-build@0.0.5
  - @dysonic/dy-cli-cmd-test@0.0.5
  - @dysonic/dy-cli-cmd-publish@0.0.5
  - @dysonic/dy-cli-cmd-add@0.0.5
  - @dysonic/dy-cli-cmd-create@0.0.5

## 0.0.4

### Patch Changes

- Unify workspace release and version orchestration into the publish command and align monorepo templates with the new publish-based scripts.
- Updated dependencies
  - @dysonic/dy-cli-core@0.0.4
  - @dysonic/dy-cli-cmd-publish@0.0.4
  - @dysonic/dy-cli-cmd-create@0.0.4
  - @dysonic/dy-cli-cmd-add@0.0.4
  - @dysonic/dy-cli-cmd-build@0.0.4
  - @dysonic/dy-cli-cmd-test@0.0.4

## 0.0.3

### Patch Changes

- Add workspace orchestration support for build and test, and continue the npm-based self-hosting refactor.
- Updated dependencies
  - @dysonic/dy-cli-core@0.0.3
  - @dysonic/dy-cli-cmd-add@0.0.3
  - @dysonic/dy-cli-cmd-build@0.0.3
  - @dysonic/dy-cli-cmd-create@0.0.3
  - @dysonic/dy-cli-cmd-publish@0.0.3
  - @dysonic/dy-cli-cmd-test@0.0.3

## 0.0.2

### Patch Changes

- Fix published build compatibility for npm consumers and prepare the next self-hosting bootstrap release.
- Updated dependencies
  - @dysonic/dy-cli-core@0.0.2
  - @dysonic/dy-cli-cmd-add@0.0.2
  - @dysonic/dy-cli-cmd-build@0.0.2
  - @dysonic/dy-cli-cmd-create@0.0.2
  - @dysonic/dy-cli-cmd-publish@0.0.2
  - @dysonic/dy-cli-cmd-test@0.0.2
