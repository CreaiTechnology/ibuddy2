# 团队功能配置指南

本文档解释如何设置团队功能所需的数据库表和API。

## 数据库设置

团队功能需要在Supabase中创建`teams`表。

### 步骤 1: 访问Supabase控制台

登录到Supabase管理控制台，进入项目的SQL编辑器。

### 步骤 2: 运行迁移脚本

在SQL编辑器中执行`server/src/migrations/create_teams_table.sql`脚本来创建团队表和测试数据。

```sql
-- 此处是create_teams_table.sql文件的内容
```

## API接口说明

团队API通过以下端点提供服务：

- `GET /api/teams` - 获取所有团队
- `GET /api/teams/:id` - 获取单个团队
- `POST /api/teams` - 创建新团队
- `PUT /api/teams/:id` - 更新团队
- `DELETE /api/teams/:id` - 删除团队

### 请求/响应示例

#### 获取所有团队
```
GET /api/teams
```

响应:
```json
[
  {
    "id": "a1",
    "name": "Team A1",
    "colour": "#e91e63",
    "max_overlap": 2,
    "members": ["Alex", "Bob", "Charlie"],
    "status": "active"
  },
  {
    "id": "a2",
    "name": "Team A2",
    "colour": "#009688",
    "max_overlap": 3,
    "members": ["David", "Emma", "Frank", "Grace"],
    "status": "active"
  }
]
```

#### 创建团队
```
POST /api/teams
Content-Type: application/json

{
  "name": "新团队",
  "colour": "#ff5722",
  "max_overlap": 2,
  "members": ["成员1", "成员2"]
}
```

响应:
```json
{
  "id": "新生成的UUID",
  "name": "新团队",
  "colour": "#ff5722",
  "max_overlap": 2,
  "members": ["成员1", "成员2"],
  "status": "active",
  "created_at": "2023-06-15T10:00:00.000Z",
  "updated_at": "2023-06-15T10:00:00.000Z"
}
```

## 环境配置

确保`.env`文件中包含以下Supabase配置：

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 启动服务器

```bash
cd server
npm install
npm run dev
```

现在服务器应该在`http://localhost:3001`运行，并提供团队API端点。

## 客户端集成

客户端已通过`teamService.js`集成了团队功能。确保：

1. 路由设置正确指向服务器API
2. 测试`/teams` API端点是否正常工作 