# 数据库迁移指南

本目录包含用于更新数据库结构的迁移脚本。

## 如何执行迁移

由于系统使用 Supabase 作为数据库服务，您有以下几种方式来执行迁移：

### 方法 1: 使用 Supabase Studio SQL 编辑器

1. 登录 [Supabase 管理控制台](https://app.supabase.io)
2. 选择您的项目
3. 点击左侧菜单中的 "SQL 编辑器"
4. 点击 "新建查询"
5. 将迁移 SQL 文件的内容复制粘贴到编辑器中
6. 点击 "运行" 按钮执行 SQL

### 方法 2: 使用 psql 命令行工具

如果您有 PostgreSQL 的直接连接信息，可以使用 psql 工具：

```bash
psql -h <host> -p <port> -U <username> -d <database> -f add_appointment_geocode_columns.sql
```

### 方法 3: 使用数据库管理工具

您可以使用 pgAdmin、DBeaver 或其它 PostgreSQL 兼容的数据库管理工具，连接到您的 Supabase 数据库后执行 SQL 文件。

## 迁移文件说明

- `add_appointment_geocode_columns.sql`: 为 appointments 表添加地理编码相关列
  - `geocode_accuracy`: 存储地理编码精确度分数 (0-1)
  - `geocode_status`: 存储地理编码状态 (success, failed, manual_review_required)
  - `geocode_error`: 存储地理编码错误信息（如果有）
  - `formatted_address`: 存储规范化后的地址格式

## 注意事项

1. 所有迁移脚本都设计为幂等的（可重复执行），不会对已经存在的列进行修改。
2. 执行迁移后，请重启服务器以确保应用程序能正确识别新的数据库结构。
3. 如果您使用的是 Supabase，请确保您有足够的权限执行 ALTER TABLE 操作。
4. 迁移脚本包含了对新列的注释，这有助于理解每个字段的用途。 