# @dysonic/dy-cli-cmd-publish

`@dysonic/dy-cli-cmd-publish` 是 `dy-cli publish` 命令的实现包。

它负责手动发布当前 npm 包。

## 包定位

这个包当前只处理“当前包发布”场景，不负责：

- monorepo 根目录批量发布
- changesets 版本管理流程
- release orchestration

也就是说，它聚焦的是包级别 `npm publish`。

## 主要内容

- `src/commands/publish.ts`
  发布命令入口
- `src/tasks/publish-project-task.ts`
  发布执行任务

## 当前命令语义

```bash
dy-cli publish
dy-cli publish --dry-run
dy-cli publish --tag beta
```

## 支持能力

- `--dry-run`
- `--tag`
- `--access`
- `--otp`
- `--registry`

## 行为约束

- 进入当前包目录后执行
- 在 monorepo 子包里会向上查找最近的 `dy.config.ts`
- `private: true` 的包会被拒绝发布

## 设计说明

这个包已经从“执行某个 publish 脚本”重构成了真正的发布命令实现，命令内部直接调用 `npm publish`。
