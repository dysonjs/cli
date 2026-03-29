# dy-cli

`dy-cli` is a CLI toolkit for scaffolding and maintaining npm packages, with first-class support for:

- monorepo workspaces
- single-package libraries
- package-level build, test, and publish workflows

The current built-in commands are:

- `create`
- `add`
- `build`
- `test`
- `publish`

For the Chinese guide, see `README_ZH.md`.

## Install

```bash
pnpm add -D @dysonic/dy-cli @dysonic/dy-cli-core
```

After installation, use the `dy-cli` binary directly in your project.

## Quick Start

Create a monorepo project:

```bash
dy-cli create --project monorepo --dest-dir ./
```

Create a single-package project:

```bash
dy-cli create --project single --dest-dir ./
```

Add a child package in a monorepo:

```bash
dy-cli add button
```

Run package-level tasks:

```bash
dy-cli build
dy-cli build --types
dy-cli build --umd

dy-cli test
dy-cli test --coverage

dy-cli publish
dy-cli publish --dry-run
dy-cli publish --tag beta
```

## Commands

### `create`

Create a new project scaffold.

```bash
dy-cli create --project monorepo --dest-dir ./demo
dy-cli create --project single --dest-dir ./demo
```

Options:

- `--project <project>`: `monorepo` or `single`
- `--dest-dir <destDir>`: target directory relative to `cwd`
- `--project-name <projectName>`: override the inferred project name
- `--force`: overwrite a non-empty target directory

### `add`

Create a child package inside a monorepo workspace.

```bash
dy-cli add button
dy-cli add --package-name card --description "Card component"
```

Options:

- `[packageName]`: positional package name
- `--package-name <packageName>`: explicit package name
- `--dest-dir <destDir>`: package container directory, default is `packages`
- `--description <description>`: package description
- `--private`: generate a private package
- `--side-effects`: mark the package as having side effects

### `build`

Build the current package without delegating to project-local build scripts.

```bash
dy-cli build
dy-cli build --types
dy-cli build --umd
```

Options:

- `--mode <mode>`: build mode
- `--types`: build declaration files
- `--umd`: build UMD output
- `--name <name>`: UMD global name
- `--externals <externals>`: comma-separated UMD externals
- `--globals <globals>`: comma-separated UMD globals, such as `react:React,react-dom:ReactDOM`

### `test`

Run Jest tests for the current package.

```bash
dy-cli test
dy-cli test --coverage
dy-cli test --watch
dy-cli test --update-snapshot
```

Options:

- `--config <config>`: explicit Jest config path
- `--coverage`: collect coverage
- `--watch`: watch mode
- `--update-snapshot`: update snapshots

### `publish`

Publish the current package manually with `npm publish`.

```bash
dy-cli publish
dy-cli publish --dry-run
dy-cli publish --tag beta
```

Options:

- `--dry-run`: run publish without uploading
- `--tag <tag>`: npm dist-tag
- `--access <access>`: `public` or `restricted`
- `--otp <otp>`: npm one-time password
- `--registry <registry>`: npm registry URL

`publish` refuses to publish `private: true` packages.

## `dy.config.ts`

`dy-cli` reads project configuration from `dy.config.ts`.

Example:

```ts
import { defineConfig } from '@dysonic/dy-cli-core';

export default defineConfig({
  commands: {
    create: {
      defaultTemplateType: 'monorepo',
      templates: {
        monorepo: {
          label: 'Monorepo',
          description: 'Create a workspace-based project scaffold.',
        },
        single: {
          label: 'Single repo',
          description: 'Create a single-package project scaffold.',
        },
      },
    },
    add: {
      destDir: 'packages',
    },
    build: {
      mode: 'production',
      umd: {
        name: 'DemoLibrary',
        externals: ['react', 'react-dom'],
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    test: {
      config: './jest.config.js',
    },
    publish: {
      access: 'public',
      tag: 'latest',
    },
  },
});
```

## Package Layout

The workspace is split into focused packages:

- `packages/core`: shared interfaces, config contracts, helpers, and base abstractions
- `packages/cli`: the public `dy-cli` entrypoint
- `packages/cmd-create`: project scaffolding
- `packages/cmd-add`: monorepo child package scaffolding
- `packages/cmd-build`: package build pipeline
- `packages/cmd-test`: package test runner
- `packages/cmd-publish`: package publish runner

## Development

Install dependencies:

```bash
pnpm install
```

Run tests:

```bash
pnpm test
```

Build all packages:

```bash
pnpm -r build
```
