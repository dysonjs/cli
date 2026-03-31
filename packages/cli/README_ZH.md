# @dysonic/dy-cli

`@dysonic/dy-cli` 是整个项目对外发布的 CLI 入口包。

它的职责很单一：

- 暴露 `dy-cli` 可执行命令
- 挂载内置命令包
- 统一命令行入口体验

当前默认挂载的命令有：

- `create`
- `install`
- `add`
- `build`
- `test`
- `version`
- `publish`

## 包定位

如果把整个仓库理解成一套命令平台：

- `core` 提供规范和公共能力
- `cmd-*` 提供具体命令实现
- `cli` 负责把这些命令组装成真正可执行的 `dy-cli`

因此这个包更像一个“装配层”，而不是业务实现层。

## 主要内容

- `src/index.ts`
  创建 commander program，并注册内置命令
- `src/cli.ts`
  CLI 可执行入口

## 依赖关系

这个包依赖：

- `@dysonic/dy-cli-core`
- `@dysonic/dy-cli-cmd-create`
- `@dysonic/dy-cli-cmd-install`
- `@dysonic/dy-cli-cmd-add`
- `@dysonic/dy-cli-cmd-build`
- `@dysonic/dy-cli-cmd-test`
- `@dysonic/dy-cli-cmd-version`
- `@dysonic/dy-cli-cmd-publish`

它本身不应该反向被 `cmd-*` 或 `core` 依赖。
