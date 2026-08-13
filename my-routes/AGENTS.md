# 自定义 RSSHub 路由工作规则

## 强制工作目录

- 新建、修改、修复或完善 RSSHub 路由时，所有路由源文件的修改必须发生在：
  `/Users/lhteen/Downloads/rsshub/rsshub-custom-repo/my-routes`
- 开始工作前，必须确认当前操作目录（`cwd`）是上述目录。
- 每个路由应按 RSSHub 命名空间结构存放在该目录的对应子目录中，例如：
  `my-routes/36kr/index.ts` 和 `my-routes/36kr/namespace.ts`。
- `/Users/lhteen/Downloads/rsshub/RSSHub-master` 仅可用于只读参考、对照官方实现或验证兼容性；不得把它作为新路由或路由修改的交付位置。
- 不得在其他 RSSHub 副本、临时目录或无关仓库中提交路由修改。

## Git 提交要求

- 路由修改完成并通过必要验证后，必须创建本地 Git 提交，不得只留下未提交的工作区改动。
- 所有 Git 命令必须在以下目录中执行：
  `/Users/lhteen/Downloads/rsshub/rsshub-custom-repo/my-routes`
- 提交前必须检查 `git status` 和暂存区差异，只暂存本次任务相关的路由文件。
- 不得把 `.DS_Store`、临时测试文件或其他无关改动加入提交。
- 提交信息应简洁说明所新增或修改的路由，例如：
  `feat(routes): add 36kr latest news route`
- 除非用户明确要求推送，否则完成本地提交后不得自动执行 `git push`。

## 完成标准

一次新建或修改路由的任务只有同时满足以下条件才算完成：

1. 路由文件位于 `my-routes` 下正确的命名空间目录中。
2. 已完成与风险相称的格式、静态检查或真实路由验证。
3. 已核对本次差异，未包含无关文件。
4. 已在指定目录中创建本地 Git 提交。
