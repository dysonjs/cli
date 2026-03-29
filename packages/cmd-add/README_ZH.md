# @dysonic/dy-cli-cmd-add

`@dysonic/dy-cli-cmd-add` 是 `dy-cli add` 命令的实现包。

它的职责是在 monorepo 项目里快速创建子包。

## 包定位

这个包只服务 monorepo 场景，不用于 single 项目。

它目前已经内聚了原本项目内脚本的能力，包括：

- 子包目录创建
- 模板渲染
- 基础交互补全
- 格式化收尾

## 主要内容

- `src/commands/add.ts`
  `add` 命令入口
- `src/tasks/add-package-task.ts`
  子包创建任务
- `src/templates/package`
  子包模板

## 当前命令语义

示例：

```bash
dy-cli add button
dy-cli add --package-name card --description "Card component"
```

新建出的子包会默认带上这些脚本入口：

- `dy-cli build`
- `dy-cli test`
- `dy-cli publish`

## 设计说明

这个包的目标是让 monorepo 子包创建不再依赖项目内部额外脚本，而是统一走 `dy-cli add`。
