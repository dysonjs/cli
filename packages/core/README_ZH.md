# @dysonic/dy-cli-core

`@dysonic/dy-cli-core` 是 `dy-cli` 的核心能力包。

它负责提供：

- 命令抽象规范
- 外部配置契约
- 公共 helper
- 错误模型
- 基础 `AbstractCommand` / `AbstractTask`

## 包定位

这个包不实现具体业务命令，而是提供所有命令共享的基础设施。

目前 `create / add / build / test / publish` 都依赖这个包。

## 主要内容

- `src/commands`
  命令基类，例如 `AbstractCommand`
- `src/tasks`
  任务基类，例如 `AbstractTask`
- `src/interfaces`
  `dy.config.ts` 的配置接口和各命令配置类型
- `src/helpers`
  配置加载、路径解析、日志等公共工具
- `src/errors`
  `DyCliError` 和统一错误码

## 对外暴露

这个包主要对外暴露两类内容：

1. 运行时基础能力
   例如 `AbstractCommand`、`AbstractTask`

2. 项目配置定义能力
   例如 `defineConfig(...)`

## 使用场景

当上层项目需要编写 `dy.config.ts` 时，会直接依赖这个包提供类型提示：

```ts
import { defineConfig } from '@dysonic/dy-cli-core';

export default defineConfig({
  commands: {},
});
```
