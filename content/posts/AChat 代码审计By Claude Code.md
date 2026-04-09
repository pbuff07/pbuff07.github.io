---
title: "AChat 代码审计By Claude Code"
date: 2026-04-09T10:30:00+08:00
categories: ["安全"]
tags: ["代码审计", "NestJS", "API安全"]
---

对 AChat（一个 ChatGPT 管理后台）进行了一次完整的安全审计，记录已确认的漏洞。

项目技术栈是 NestJS + Fastify + Prisma，用的是 JWT 认证，结构比较清晰。

项目地址：[AprilNEA/AChat](https://github.com/AprilNEA/AChat)

## 公告接口未授权访问

审计过程中，首先梳理了全局的路由配置和认证标记。

```typescript
// auth.guard.ts - 全局认证 Guard
@Public()
@Controller()
export class AppController {
  @Get('/health')
  health() { ... }

  @Post('/announcement')
  async newAnnouncement(@Body() data: any) {
    return { success: true, data: await this.appService.upsertAnnouncement({ ...data }) };
  }

  @Delete('/announcement/:id')
  async deleteAnnouncement(@Param('id') id: number) {
    await this.appService.deleteAnnouncement(id);
    return { success: true };
  }
}
```

`/announcement` 的 POST 和 DELETE 方法均未添加 `@Public()` 或 `@Roles(Role.Admin)` 装饰器，理论上需要 JWT 认证且要求管理员权限。

实测验证：

```bash
curl -X POST 'http://localhost:3001/api/announcement' \
  -H 'Content-Type: application/json' \
  -d '{"title": "test", "content": "hacked"}'

# HTTP 200
# { "success": true, "data": { "id": 1, ... } }
```

无需任何认证即可创建公告。删除接口同样可被未授权访问。

问题根因在于：AppController 本身没有任何认证相关装饰器，而 NestJS 的全局 AuthGuard 对该 Controller 的部分路由保护失效，导致认证检查被绕过。

攻击者可利用此漏洞发布钓鱼公告诱骗用户，造成实际财产损失。

![image-20260409184055353](https://pbuff-blogs-1257793641.cos.ap-chengdu.myqcloud.com//blogsimage-20260409184055353.png)

修复方案：

```typescript
import { Role, Roles } from '@/common/guards/auth.guard';

@Roles(Role.Admin)
@Post('/announcement')
async newAnnouncement(@Body() data: any) { ... }

@Roles(Role.Admin)
@Delete('/announcement/:id')
async deleteAnnouncement(@Param('id') id: number) { ... }
```

## 其他发现

审计过程中还发现以下问题:

1. `/api/auth/admin/setup` 标记了 `@Public()`，全新部署时可被用于创建首个管理员账户
2. `/api/order/callback/xunhu` 支付回调的签名验证被注释，仅验证 appid，攻击者可伪造支付成功
3. JWT 默认密钥为 "secret"，若未修改，攻击者可伪造任意用户 Token
