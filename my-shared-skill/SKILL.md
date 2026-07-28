---
name: my-shared-skill
description: Shared repo context for the hair-salon workspace. Use when working in this repository and you need the same rules, memory, and reusable guidance for Claude Code and Codex, especially for backend Java changes, controller/service/mapper layers, permissions, SQL, or project context updates.
---

# My Shared Skill

先读这三份材料：

1. `references/source-map.md`
2. `references/project-context.md`
3. `references/rules-summary.md`

## 使用原则

- 业务后端修改前，先对照项目记忆和规则摘要。
- Controller -> Service -> Mapper，不要跳层。
- HTTP 出参用 `VO` / `Result` / `PageResult`，`Form` 只做入参。
- 默认补 `@PreAuthorize`，公开接口和三方回调除外。
- 字典、租户、数据权限按现有规则走，不要手写绕开。
- 新增可复用接口、权限点、配置约定后，回写 `references/project-context.md`。

## 共享材料

- `references/source-map.md` 记录原始来源。
- `references/project-context.md` 保存当前项目记忆。
- `references/rules-summary.md` 汇总可复用规则。
- `scripts/check-shared-skill.ps1` 做最小一致性检查。
