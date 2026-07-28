# Source Map

这个目录是给 Claude Code 和 Codex 共用的入口。原始来源仍然是仓库里的这些文件：

- `.cursor/project_context.md` -> 当前项目记忆和可复用接口
- `.cursor/rules/core-java-standards-rules.mdc` -> 包结构、命名、分层、注释
- `.cursor/rules/controller-layer-rules.mdc` -> Controller / HTTP / 权限
- `.cursor/rules/service-layer-rules.mdc` -> Service / 事务 / 业务边界
- `.cursor/rules/database-sql-rules.mdc` -> Mapper / XML / SQL / DDL
- `.cursor/rules/concurrency-performance-rules.mdc` -> 线程池、异步、缓存、热点路径
- `.cursor/rules/project-memory-rules.mdc` -> 项目记忆的更新方式
- `CLAUDE.md` -> 仓库级 Claude 说明
- `.claude/skills/react-solo-architect/SKILL.md` -> 前端相关技能

如果原始规则发生变化，优先更新原文件，再同步这里的摘要。
