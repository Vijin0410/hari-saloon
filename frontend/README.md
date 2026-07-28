# Hari Salon Frontend

理发店管理系统前端，覆盖当前后端已有的登录认证、用户管理、角色管理、菜单管理能力。

## 技术栈

- React + Vite + TypeScript strict
- React Router `createBrowserRouter`
- Zustand + persist
- Axios 统一请求层
- Tailwind CSS v4 + `@tailwindcss/vite`
- react-hook-form + zod
- ESLint Flat Config + Prettier

## 启动

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

默认后端地址：`http://localhost:8080`

默认账号：`admin / admin123`

## 常用命令

```bash
npm run dev      # 开发服务器
npm run build    # TypeScript + 生产构建
npm run lint     # ESLint 检查
npm run preview  # 预览 dist
```

## 目录结构

```text
src/
├─ app/
│  ├─ layouts/                 # 登录布局、主后台布局
│  ├─ providers/               # 401、全局 loading、启动用户同步
│  └─ ErrorBoundary.tsx
├─ features/
│  ├─ auth/
│  │  ├─ model/                # 登录类型和 zod schema
│  │  └─ ui/                   # LoginForm
│  └─ system/
│     ├─ model/                # 用户/角色/菜单类型、枚举、表单 schema
│     └─ ui/                   # UserManagement / RoleManagement / MenuManagement
├─ pages/                      # 路由页面薄层
├─ router/                     # createBrowserRouter、登录守卫、权限守卫
├─ shared/
│  ├─ api/                     # Axios client + auth/system API 模块
│  ├─ config/                  # env 配置读取
│  ├─ hooks/                   # useDebounce
│  ├─ lib/                     # token、className、格式化工具
│  └─ ui/                      # Button / Modal / Field / EmptyState 等通用组件
├─ store/                      # useAuthStore / useAppStore
├─ types/                      # 通用 ApiResponse、PageData、OptionNode
├─ App.tsx
├─ main.tsx
└─ index.css                   # Tailwind v4 入口和主题 token
```

## API 配置

`.env.example`

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
```

开发环境使用 `/api` 作为前端统一 baseURL：

- `/api/v1/users` 代理到后端 `/api/v1/users`
- `/api/v1/roles` 代理到后端 `/api/v1/roles`
- `/api/v1/menus` 代理到后端 `/api/v1/menus`
- `/api/auth/login` 由 Vite rewrite 到后端 `/auth/login`
- `/api/auth/me` 由 Vite rewrite 到后端 `/auth/me`

如果生产环境也使用 `/api`，网关或 Nginx 需要保持同样规则；或者让后端统一挂到 `/api` 前缀后再调整 `authApi.ts`。

## 后端字段映射

- 统一响应：`{ code, msg, data }`
- 成功码：`00000`
- 分页响应：`data.list` 和 `data.total`
- 分页参数：`pageNum`、`pageSize`
- Token Header：`Authorization: Bearer <token>`
- 后端 Long 已配置为字符串序列化，前端 ID 统一按 `string` 接收和传递
- 用户状态：`1=启用`，`0=禁用`
- 性别：`0=未知`，`1=男`，`2=女`
- 角色数据范围：`1=全部数据`，`2=部门及子部门`，`3=本部门`，`4=仅本人`，`5=自定义部门`
- 菜单类型：前端发送 `CATALOG / MENU / EXTLINK / BUTTON`，并兼容后端返回 `1 / 2 / 3 / 4`
- 角色菜单授权：当前只使用 `type=1`，即 web 权限

## 已实现页面

- `/login` 登录认证
- `/` 工作台
- `/system/users` 用户管理
- `/system/roles` 角色管理 + 菜单权限分配
- `/system/menus` 菜单树管理
- `/forbidden` 权限不足

## 还需要完善

- 部门管理接口已经存在，但本次需求未展开；用户表单里的 `deptId` 目前是手填。
- 字典接口已存在，当前性别/状态先用前端常量；后续可切到 `/api/v1/dict/options`。
- 租户、部门、字典页面可按当前 `features/system/ui` 模式继续补齐。
- 用户重置密码后端已有接口，前端暂未放进主流程。
- 生产环境建议补充 OpenAPI 类型生成，减少手写字段映射。
