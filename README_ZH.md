# dy-cli

`dy-cli` 是一套面向 npm 包项目的命令行工具，目标是把项目初始化、子包创建、构建、测试、发布这些高频动作收口成统一命令。

当前已经内置的命令有：

- `create`
- `add`
- `build`
- `test`
- `publish`

它主要服务两类项目：

- `monorepo` 工作区项目
- `single` 单包项目

## 安装

```bash
pnpm add -D @dysonic/dy-cli @dysonic/dy-cli-core
```

安装完成后，项目内就可以直接使用 `dy-cli`。

## 快速开始

创建一个 monorepo 项目：

```bash
dy-cli create --project monorepo --dest-dir ./
```

创建一个单包项目：

```bash
dy-cli create --project single --dest-dir ./
```

在 monorepo 中创建子包：

```bash
dy-cli add button
```

在包目录中执行构建、测试、发布：

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

## 命令说明

### `create`

用于初始化项目骨架。

创建 monorepo：

```bash
dy-cli create --project monorepo --dest-dir ./demo
```

创建 single 项目：

```bash
dy-cli create --project single --dest-dir ./demo
```

参数：

- `--project <project>`：项目类型，当前支持 `monorepo` 和 `single`
- `--dest-dir <destDir>`：目标目录，相对于 `cwd`
- `--project-name <projectName>`：显式指定项目名
- `--force`：目标目录非空时强制覆盖

说明：

- `create` 会生成 `dy.config.ts`
- `monorepo` 模板会内置 changesets、workspace 配置、子包模板
- `single` 模板会直接生成单个 npm 包骨架

### `add`

用于在 monorepo 项目里快速创建子包。

示例：

```bash
dy-cli add button
dy-cli add --package-name card --description "Card component"
```

参数：

- `[packageName]`：位置参数形式的包名
- `--package-name <packageName>`：显式指定包名
- `--dest-dir <destDir>`：子包目录，默认是 `packages`
- `--description <description>`：包描述
- `--private`：将子包标记为私有包
- `--side-effects`：将子包标记为有副作用

说明：

- `add` 只适用于 monorepo 项目
- 新建出的子包默认会带上 `build / test / publish` 的 `dy-cli` 脚本入口

### `build`

用于构建当前包，不再依赖项目内部自定义 build 脚本。

示例：

```bash
dy-cli build
dy-cli build --types
dy-cli build --umd
```

参数：

- `--mode <mode>`：构建模式
- `--types`：只构建类型产物
- `--umd`：只构建 UMD 产物
- `--name <name>`：UMD 全局变量名
- `--externals <externals>`：UMD external 包名，逗号分隔
- `--globals <globals>`：UMD external 对应的全局变量映射，逗号分隔

说明：

- `dy-cli build` 默认构建当前包的 ESM / CJS 产物
- `dy-cli build --types` 构建 `d.ts`
- `dy-cli build --umd` 构建 UMD 包
- 在 monorepo 子包目录里执行时，会自动向上查找最近的 `dy.config.ts`

### `test`

用于运行当前包的 Jest 单测。

示例：

```bash
dy-cli test
dy-cli test --coverage
dy-cli test --watch
dy-cli test --update-snapshot
```

参数：

- `--config <config>`：显式指定 Jest 配置文件
- `--coverage`：输出覆盖率
- `--watch`：watch 模式
- `--update-snapshot`：更新 snapshot

说明：

- `test` 当前基于 Jest
- 在 monorepo 子包目录里执行时，会自动向上查找最近的 `dy.config.ts` 和 Jest 配置

### `publish`

用于手动发布当前 npm 包，本质上内聚的是 `npm publish` 能力。

示例：

```bash
dy-cli publish
dy-cli publish --dry-run
dy-cli publish --tag beta
```

参数：

- `--dry-run`：仅演练，不真正上传
- `--tag <tag>`：npm dist-tag
- `--access <access>`：发布权限，支持 `public` / `restricted`
- `--otp <otp>`：npm 二次校验口令
- `--registry <registry>`：npm registry 地址

说明：

- `publish` 只发布当前包
- `private: true` 的包会被直接拒绝发布
- 在 monorepo 场景下，应该进入具体子包目录执行

## `dy.config.ts`

`dy-cli` 通过 `dy.config.ts` 读取项目配置。

示例：

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

当前配置结构说明：

- `commands.create`：项目初始化默认模板和模板描述
- `commands.add`：monorepo 子包创建配置
- `commands.build`：构建模式和 UMD 配置
- `commands.test`：Jest 配置和测试开关默认值
- `commands.publish`：发布默认参数

## 工作区结构

当前仓库按职责拆成这些包：

- `packages/core`
  提供核心接口、配置契约、公共 helper、基础抽象
- `packages/cli`
  对外统一暴露 `dy-cli` 命令行入口
- `packages/cmd-create`
  负责项目初始化
- `packages/cmd-add`
  负责 monorepo 子包创建
- `packages/cmd-build`
  负责包构建能力
- `packages/cmd-test`
  负责包测试能力
- `packages/cmd-publish`
  负责包发布能力

## 开发

安装依赖：

```bash
pnpm install
```

运行测试：

```bash
pnpm test
```

构建所有包：

```bash
pnpm -r build
```

如果你要本地验证 CLI，可先构建后再运行：

```bash
pnpm -r build
node packages/cli/dist/cli.js --help
```
