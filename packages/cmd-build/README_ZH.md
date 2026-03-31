# @dysonic/dy-cli-cmd-build

`@dysonic/dy-cli-cmd-build` 是 `dy-cli build` 命令的实现包。

它负责构建项目包，支持：

- 默认包构建
- 类型产物构建
- UMD 产物构建

## 包定位

这个包已经不再是“package.json script 包装器”，而是内聚了真正的构建逻辑。

也就是说：

- `dy-cli build` 直接完成构建
- 不再依赖项目内额外的 build 脚本文件

## 主要内容

- `src/commands/build.ts`
  构建命令入口
- `src/tasks`
  按目标拆分的构建任务
- `src/builders`
  具体构建器实现

## 当前命令语义

```bash
dy-cli build
dy-cli build --types
dy-cli build --umd
```

## 支持能力

- 默认构建 ESM / CJS 产物
- 如果包声明了 `bin`，默认也会一起产出可执行文件
- `--types` 构建声明文件
- `--umd` 构建 UMD 包
- 从 `dy.config.ts` 读取 UMD 相关配置
- 在 monorepo 根目录执行时默认构建所有子包
- 在 monorepo 子包目录中向上查找最近的 `dy.config.ts`

## 设计说明

这个包采用了 `Command -> Task -> Builder` 的分层：

- `Command` 负责解析参数与配置
- `Task` 负责构建目标编排
- `Builder` 负责具体 Rollup 构建细节
