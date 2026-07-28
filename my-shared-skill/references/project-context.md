# 项目上下文记忆（共享镜像）

> 这个文件是给 `my-shared-skill` 用的轻量镜像。
> **唯一主源** 仍然是 `.cursor/project_context.md`。

## 这里保留什么

- 当前仓库的入口模块与后端边界
- 已确认的核心接口
- 可复用的 service / security / dict 能力
- 权限、租户、数据权限、关键配置约定

## 这里不再重复什么

- 长篇说明
- 逐条历史变更
- 与 `.cursor/project_context.md` 完全一致的全文镜像

## 同步原则

- 先改 `.cursor/project_context.md`
- 这里只保留压缩后的共享摘要
- 如果新增了可复用接口或权限点，再把摘要补到这里
