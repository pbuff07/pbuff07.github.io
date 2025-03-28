---
title: Clickhouse查询字段内容均匀分布
date: 2024-12-14 14:00:00 +/-TTTT
categories: [Clickhouse]
tags: ['clickhouse', 'udf', 'rand']     # TAG names should always be lowercase
---



需求：Clickhouse查询结果中要求某个字段的数据较为均匀的分布，比如rule_id in (10000, 10001, 10002, 10003)，需要保证每个id都有数据

实现：

```sql
SELECT *
FROM table_name
WHERE rule_id IN (10000, 10001, 10002, 10003)
-- 按rule_id分组并随机排序，确保均匀性。
ORDER BY rule_id, rand()
-- rule_id限制导出500条
LIMIT 500 BY rule_id  
```

