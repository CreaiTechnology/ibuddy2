# 地理编码增强功能

本更新对地理编码功能进行了全面优化，主要包括精确度量化、更全面的错误处理以及UI上的精确度直观展示。

## 功能概述

1. **精确度量化**：现在系统会对每个地理编码结果进行精确度评分(0-1)，并将其归类为五个级别（非常高、高、中等、低、非常低）
2. **增强错误处理**：系统现在能更好地处理地理编码失败的情况，提供具体错误原因和建议的解决方案
3. **UI精确度指示器**：在地图上的标记和列表中都增加了直观的精确度指示器，使用不同颜色表示精确度等级
4. **地址规范化**：系统现在会存储规范化的地址格式，以提高一致性和可读性

## 数据库更新

需要向`appointments`表添加以下字段：

- `geocode_accuracy`: DOUBLE PRECISION - 存储地理编码精确度分数(0-1)
- `geocode_status`: TEXT - 存储地理编码状态 (success, failed, manual_review_required)
- `geocode_error`: TEXT - 存储地理编码错误信息（如果有）
- `formatted_address`: TEXT - 存储规范化后的地址格式

### 运行数据库迁移

系统已经添加了容错机制，即使数据库没有新字段，系统也能正常运行。但是，为了全面使用精确度功能，我们建议执行以下数据库迁移：

#### 方法1: 使用 Supabase Studio SQL 编辑器

1. 登录 [Supabase 管理控制台](https://app.supabase.io)
2. 选择您的项目
3. 点击左侧菜单中的 "SQL 编辑器"
4. 点击 "新建查询"
5. 复制粘贴 `server/src/db/migrations/add_appointment_geocode_columns.sql` 文件的内容到编辑器中
6. 点击 "运行" 按钮执行 SQL

#### 方法2: 使用数据库客户端工具

如果您有 PostgreSQL 的直接连接信息，可以使用 psql、pgAdmin 或 DBeaver 等工具执行 SQL 文件。

迁移脚本设计为幂等的（可重复执行），不会对已经存在的列进行修改。

## 地理编码API增强

`/api/map/geocode` 端点现在返回更丰富的信息：

```json
{
  "success": true,
  "result": {
    "longitude": 101.6942,
    "latitude": 3.1516,
    "placeName": "Kuala Lumpur, Malaysia",
    "formattedAddress": "Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia",
    "placeType": "place",
    "accuracy": {
      "relevance": 0.9833,
      "confidence": null,
      "score": 0.7866,
      "level": "high"
    },
    "provider": "mapbox"
  },
  "meta": {
    "query": "KL",
    "reliability": 79,
    "warnings": [
      {
        "type": "not_precise_address",
        "message": "结果类型为 place，而非精确地址"
      }
    ],
    "timestamp": "2023-10-20T07:15:23.000Z",
    "provider": "mapbox",
    "cacheStatus": "fresh"
  }
}
```

## UI增强

1. **地图标记精确度指示器**：每个标记现在包含一个小圆点，颜色表示精确度等级：
   - 绿色：非常高精确度 (≥0.9)
   - 浅绿色：高精确度 (≥0.75)
   - 黄色：中等精确度 (≥0.6)
   - 橙色：低精确度 (≥0.4)
   - 红色：非常低精确度 (<0.4)
   - 灰色：未知精确度

2. **精确度信息提示**：在弹出窗口和列表项中显示精确度等级和百分比

3. **直观列表指示**：预约列表中的项目根据精确度用边框颜色标记

## 启用容错机制

系统现在能够优雅地处理缺少新数据库字段的情况，当数据库未更新时，系统仍然可以运行，只是不会显示精确度信息。这确保了平滑的过渡和向后兼容性。

## 排障指南

如果你遇到问题：

1. **数据库错误**：确保正确运行了迁移脚本添加所需列
2. **地理编码失败**：检查 Mapbox API 密钥是否正确设置，以及是否有足够的 API 使用配额
3. **不准确的结果**：尝试提供更详细的地址，包括邮政编码和国家 