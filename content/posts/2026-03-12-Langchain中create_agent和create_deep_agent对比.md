---
title: "Langchain中create_agent和create_deep_agent对比"
date: 2026-03-12T14:00:00+08:00
categories: ["AI-Generate", "编程"]
tags: ["langchain", "deepagent", "ai", "AI-Generate"]
toc: true
numberedSubtitles: false
---

对比分析Langchain中`create_agent`和`create_deep_agent`两个函数的实现原理与差异。

---

## 一、核心架构关系

`create_deep_agent`本质上是基于`create_agent`的高级封装：

```
┌─────────────────────────────────────────────────────────────────┐
│                    create_deep_agent                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  预配置层：                                                    │ │
│  │  • 内置中间件栈                                                │ │
│  │  • 子代理系统 (SubAgentMiddleware)                            │ │
│  │  • 技能系统 (SkillsMiddleware)                                │ │
│  │  • 记忆系统 (MemoryMiddleware)                                │ │
│  └──────────────────────────────┬──────────────────────────────┘ │
│                                 │                                 │
│                                 ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    create_agent                               │ │
│  │  核心引擎：                                                    │ │
│  │  • StateGraph 构建                                            │ │
│  │  • Model-Tool 循环                                            │ │
│  │  • 中间件钩子系统                                              │ │
│  │  • 结构化输出                                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、create_agent - 核心引擎

### 2.1 核心功能

`create_agent`是一个**通用的代理构建框架**，负责：

- 构建 StateGraph（状态图）
- 实现 Model-Tool 循环机制
- 提供中间件钩子系统
- 处理结构化输出

```python
# 核心流程：Model ↔ Tools 循环
def model_node(state, runtime):
    # 1. 构建请求
    request = ModelRequest(model=model, tools=default_tools, ...)

    # 2. 执行模型（可能被中间件包装）
    model_response = _execute_model_sync(request)

    # 3. 返回命令（消息更新 + 路由决策）
    return _build_commands(model_response)
```

### 2.2 图结构

```
START
  │
  ▼
┌─────────────────┐
│ before_agent    │  ← 运行一次（初始化）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ before_model    │  ← 循环入口
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     model       │  ← 核心节点：调用 LLM
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  after_model    │  ← 循环出口
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌─────────┐
│ tools │  │ END     │
└───┬───┘  └─────────┘
    │            (无 tool_calls 时结束)
    │
    └──────► 回到 before_model（循环）
```

### 2.3 中间件钩子系统

```python
class AgentMiddleware:
    # 生命周期钩子
    def before_agent(state, runtime)  # 可以跳转到 model/END
    def before_model(state, runtime)  # 可以修改请求
    def after_model(state, runtime)   # 可以修改响应
    def after_agent(state, runtime)   # 清理工作

    # 包装器钩子
    def wrap_model_call(request, handler)   # 包装模型调用
    def wrap_tool_call(tool_call, handler)  # 包装工具调用
```

---

## 三、create_deep_agent - 高级封装

### 3.1 预配置的中间件栈

`create_deep_agent`为主代理预配置了完整的中间件栈：

```python
def create_deep_agent(...):
    # 主代理的中间件栈
    deepagent_middleware = [
        TodoListMiddleware(),               # 任务列表管理
        MemoryMiddleware(...),              # 记忆系统（可选）
        SkillsMiddleware(...),              # 技能系统（可选）
        FilesystemMiddleware(...),          # 文件系统操作
        SubAgentMiddleware(...),            # 子代理调度 ← 核心！
        SummarizationMiddleware(...),       # 对话摘要
        AnthropicPromptCachingMiddleware(), # 提示缓存
        PatchToolCallsMiddleware(),         # 工具调用修复
    ]
```

### 3.2 子代理系统 - 最关键的差异

```python
# 1. 创建一个内置的"通用目的"子代理
general_purpose_spec = {
    "name": "general_purpose",
    "description": "Handle complex multi-step tasks...",
    "model": model,
    "tools": tools,
    "middleware": [
        TodoListMiddleware(),
        FilesystemMiddleware(backend=backend),
        SummarizationMiddleware(...),
        # ... 同样的中间件栈
    ],
}

# 2. 处理用户自定义子代理
processed_subagents = [...用户提供的子代理...]

# 3. 合并所有子代理
all_subagents = [general_purpose_spec, *processed_subagents]

# 4. 通过 SubAgentMiddleware 注入主代理
SubAgentMiddleware(backend=backend, subagents=all_subagents)
```

### 3.3 子代理工作原理

```
┌─────────────────────────────────────────────────────────────────┐
│                      Main Agent (主代理)                         │
│                                                                  │
│  User: "分析这个项目并写个报告"                                    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │ 主代理决定：调用 task 工具               │                    │
│  │ task(subagent="general_purpose", ...)   │                    │
│  └─────────────────────────────────────────┘                    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ SubAgentMiddleware                                           ││
│  │                                                              ││
│  │  ┌─────────────────┐  ┌─────────────────┐                   ││
│  │  │ 子代理1         │  │ 子代理2         │  ...              ││
│  │  │ (general_purp)  │  │ (user defined)  │                   ││
│  │  │                 │  │                 │                   ││
│  │  │ 完整的 agent    │  │ 完整的 agent    │                   ││
│  │  │ 独立的状态      │  │ 独立的状态      │                   ││
│  │  │ 独立的工具      │  │ 独立的工具      │                   ││
│  │  └─────────────────┘  └─────────────────┘                   ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                                                        │
│         ▼                                                        │
│  子代理结果返回给主代理                                           │
│         │                                                        │
│         ▼                                                        │
│  主代理继续处理...                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、关键差异对比

| 特性 | `create_agent` | `create_deep_agent` |
|------|----------------|---------------------|
| **定位** | 基础构建框架 | 高级封装，开箱即用 |
| **中间件** | 需要手动配置 | 预配置完整栈 |
| **子代理** | 不支持 | 支持动态子代理调度 |
| **文件操作** | 需要自己实现 | 内置 FilesystemMiddleware |
| **任务管理** | 无 | 内置 TodoListMiddleware |
| **记忆系统** | 需要自己实现 | 内置 MemoryMiddleware |
| **技能系统** | 无 | 内置 SkillsMiddleware |
| **递归限制** | 10,000 | 1,000（子代理有独立限制）|
| **使用场景** | 简单任务、自定义代理 | 复杂多步骤任务 |

---

## 五、设计模式分析

### 5.1 create_agent - 模板方法模式

```python
# 定义骨架，具体行为由中间件决定
graph.add_node("model", model_node)
graph.add_node("tools", tool_node)

# 中间件可以在各个环节插入自定义逻辑
for m in middleware:
    if has_before_model(m):
        graph.add_node(f"{m.name}.before_model", ...)
```

### 5.2 create_deep_agent - 工厂模式 + 组合模式

```python
# 工厂模式：预配置生产"深度代理"
def create_deep_agent(...):
    # 组合模式：主代理包含多个子代理
    all_subagents = [general_purpose, *user_subagents]

    # 通过中间件组合功能
    middleware = [TodoList, Memory, Skills, Filesystem, SubAgent, ...]

    return create_agent(model, middleware=middleware, ...)
```

---

## 六、为什么 create_deep_agent 要用 create_agent？

### 6.1 复用性

`create_agent`已经实现了：

- 完整的 Model-Tool 循环
- 中间件生命周期管理
- 结构化输出处理
- 状态图编译

### 6.2 关注点分离

```
create_agent      → 负责"如何运行一个代理"
create_deep_agent → 负责"配置什么样的代理"
```

---

## 七、实际使用建议

### 7.1 简单场景：直接用 create_agent

```python
agent = create_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=[my_tool],
    system_prompt="简单助手"
)
```

### 7.2 复杂场景：用 create_deep_agent

```python
agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    subagents=[
        {
            "name": "code_reviewer",
            "description": "专门做代码审查",
            "system_prompt": "你是一个严格的代码审查员...",
        },
        {
            "name": "test_writer",
            "description": "专门写测试",
            "system_prompt": "你擅长写全面的测试...",
        }
    ],
    memory=["/memory/AGENTS.md"],  # 记忆
    skills=["/skills/project/"],    # 技能
)
```

---

## 八、总结

```
create_agent      = 引擎（提供机制）
create_deep_agent = 汽车（提供产品）

create_deep_agent 通过组合 create_agent + 预配置中间件 + 子代理系统，
实现了从"简单对话代理"到"复杂任务执行系统"的跃升。
```

这种分层设计非常优雅：

1. **底层** (`create_agent`)：灵活、通用、可扩展
2. **上层** (`create_deep_agent`)：强大、开箱即用、面向复杂任务
