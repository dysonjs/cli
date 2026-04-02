'@dysonic/dy-cli': patch
'@dysonic/dy-cli-cmd-build': patch
'@dysonic/dy-cli-cmd-version': patch
'@dysonic/dy-cli-core': patch

Fix package builds invoked from outside the target package directory by passing the package cwd into the Rollup TypeScript plugin.

This release also keeps fixed monorepo package versions aligned after `changeset version`, and republishes the current core logger behavior so `debug` output only appears in explicit development mode instead of leaking into normal CLI runs through older internal package versions.
