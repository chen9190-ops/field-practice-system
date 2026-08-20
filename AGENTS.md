# AGENTS.md

## 项目概览

这是一个野外实习系统全栈 Web 项目，包含 FastAPI 后端、React/Vite 学生端和教师端前端。

- `backend/`：FastAPI、SQLAlchemy、PostgreSQL/Neon 业务接口与静态托管
- `frontend/`：学生端 React/Vite，生产构建产物为 `frontend/dist`
- `teacher-frontend/`：教师端 React/Vite，保持现有结构
- `scripts/`：开发与部署构建、运行脚本

## 构建与运行

生产构建优先使用：

```bash
bash scripts/deploy_build.sh
```

生产运行使用平台分配端口：

```bash
bash scripts/deploy_run.sh
```

`deploy_run.sh` 会从 `DEPLOY_RUN_PORT` 读取端口；没有注入时才回退到 5000。

服务必须监听 `0.0.0.0`。部署配置位于 `.coze`，不要将平台端口改成固定值。

## 配置与安全

生产环境变量由部署平台注入：

- `DATABASE_URL`
- `JWT_SECRET`
- `DIFY_API_KEY1`
- `DIFY_API_KEY2`
- `STUDENT_FRONTEND_URL`
- `TEACHER_FRONTEND_URL`

禁止提交 `.env`、密钥或令牌。数据库连接必须来自 `DATABASE_URL`，不得硬编码本地 PostgreSQL。

## API 与前端托管约束

- 保持现有 API 路径，不统一添加 `/api` 前缀。
- 保留 JWT 鉴权代码和现有数据库模型。
- 学生端入口为 `/student/`，FastAPI 继续托管 `frontend/dist` 及 `/student/assets/*`。
- 根路径 `/` 保持跳转到 `/student/`。
- 修改前端或后端时优先采用最小改动，不重写现有页面和业务流程。

## 代码风格

- Python 遵循现有 FastAPI/SQLAlchemy 结构，避免无关重构。
- 前端继续使用现有 React/Vite 配置和 pnpm 锁文件。
- Node.js 依赖只使用 `pnpm` 管理。
- CORS 生产来源通过 `STUDENT_FRONTEND_URL` 和 `TEACHER_FRONTEND_URL` 配置。

## 验证要求

修改后至少验证：

1. 学生端生产构建成功。
2. FastAPI 可启动并监听平台端口。
3. `/student/` 返回学生端 HTML。
4. `/openapi.json` 返回 FastAPI OpenAPI 文档。
5. `/health` 返回健康状态。
