---
title: "DeepAgent学习一"
date: 2026-03-11T10:00:00+08:00
categories: ["编程"]
tags: ["deepagent", "langchain", "ai", "python"]
toc: true
numberedSubtitles: false
---

AI时代学习知识还得回归古法，自己动手写代码去验证和实践，AI产出的东西始终都是AI的。

要会用AI工具但也要懂如何设计AI工具。

---

## 参考文章

- [DeepAgents 技术深度解析：Skills 与 FilesystemBackend](https://mp.weixin.qq.com/s/YBL6DWk_QXDcNUo7q_gISA)
- [LangChain官方文档](https://docs.langchain.com/oss/python/deepagents/overview)

---

## DeepAgent是什么？

DeepAgent是LangChain公司在LangChain、LangGraph基础上推出的一种用于复杂任务规划、长时间执行的新的框架。简而言之就是一个新的框架，但是这个框架和LangChain、LangGraph有啥区别呢？

根据官方文档，主要介绍了以下几个方面，其中我认为**后端、次级代理、长期记忆、Skills和沙箱**是比较有特点的几个新特性。

> - 模型 Models
> - 后端 Backends
> - 次级代理 SubAgent
> - 人机交互 Human-in-the-loop
> - 长期记忆 Long-time-memory
> - 渐进式技能 Skills
> - 沙箱 Sandbox

下面针对这些特性做一下我的简单理解和学习。

---

## 模型 Models

没有特别说明的，配置特定参数的话使用`init_chat_model`函数即可。

```python
from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel

def _get_model() -> BaseChatModel | None:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None
    model_name = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    return init_chat_model(
        f"openai:{model_name}",
        base_url="https://api.deepseek.com/v1",
        api_key=api_key,
    )
```

---

## 后端 Backends

DeepAgent提供了一个后端接口可以实现文件/命令级别的操作与访问，原来LangGraph执行系统命令可能只有通过tool调用，现在可以直接配置后端类型然后LLM根据提示词自己决策直接执行，灵活性更高。

后端类型：默认类型、本地文件系统类型、本地shell类型、沙箱、复合类型和StoreBackend类型。

默认类型临时状态吧，当前代码结束了也就结束了；复合类型和StoreBackend我有点不太明白，等需要用到了再说吧（[官方文档](https://docs.langchain.com/oss/python/deepagents/backends)）。

### 本地文件系统类型

若提供这个后端，则这个agent就有了读写本机文件的权限，当然可以通过`root_dir`参数设置具体的目录，`virtual_mode`表示沙盒模式（看起来和sandboxs沙箱不是同一个东西，开启这个防止root_dir存在路径遍历漏洞，还需要在实践中看看具体用法？）

```python
from deepagents.backends import FilesystemBackend

agent = create_deep_agent(
    model=model,
    name="learn-agent",
    system_prompt=(
        "你是总协调者。收到用户的数学问题后，把整个运算任务交给 math-coordinator，"
        "等它返回后把结果告诉用户。"
    ),
    skills=["./skills/"],
    tools=[],
    backend=FilesystemBackend(root_dir="./", virtual_mode=True)
)
```

### 本地Shell后端

开启后可能除了可以读写本地文件还可以在本机执行系统命令？

两个比较重要的参数，`root_dir`和`env`。`root_dir`作为工作目录，但是可以访问root_dir以外的文件（比较危险），`env`是配置环境变量的。

```python
from deepagents.backends import FilesystemBackend, LocalShellBackend

agent = create_deep_agent(
    model=model,
    name="learn-agent",
    system_prompt=(
        "你是总协调者。收到用户的数学问题后，把整个运算任务交给 math-coordinator，"
        "等它返回后把结果告诉用户。"
    ),
    skills=["./skills/"],
    tools=[],
    backend=LocalShellBackend(root_dir="./", env={"PATH": "/usr/bin:/bin"})
)
```

### 复合型后端

就是`CompositeBackend`，可以根据实际情况配置多个后端，根据业务的需要进行选择。

下面这个例子是官方例子，用来演示持久化记忆的。对于一些有用的信息可以选择`FilesystemBackend`存储到本地文件，而一些不重要的记忆信息可以直接存储在当前会话中，下一次会话的时候直接丢弃就可以了。

```python
from deepagents.backends import CompositeBackend, StateBackend, FilesystemBackend

composite_backend = lambda rt: CompositeBackend(
    default=StateBackend(rt),
    routes={
        "/memories/": FilesystemBackend(root_dir="/deepagents/myagent", virtual_mode=True),
    },
)

agent = create_deep_agent(backend=composite_backend)
```

本小节说到最后，理论上按照官方文档，只要实现了`BackendProtocol`里面的接口，你可以使用任何方式实现一个backend，此处仅学习DeepAgent的应用，对于深度定制化以后有时间再来研究。

---

## 次级代理 SubAgent

主代理可以拆分任务分给不同的子代理去完成，自己负责最终汇总和输出即可。

在之前使用LangGraph构建智能渗透测试智能体的时候似乎并没有subagent概念，对于LangGraph只有子图。

> 题外话：LangGraph的子图是相对于主图的，但是在实际使用过程中我认为不论主图还是子图，都是一个LLM节点而且数据通信不好控制，子图的处理是完全和主图隔离的，导致在一些输出和同步执行进度的时候遇到了一些困难（也有可能是我没用对或者还没有新特性）

子代理有两种，一种是简单的（dict配置字段直接使用），一种是复杂的（使用预构建的LangGraph图编译子代理）

> 因为我认为这部分是重点，所以会多花点内容记录学习过程。

### 直接配置使用

创建一个主agent用来协调与数学计算有关的任务，并分配给`math_coordinator`子agent来处理。

`math_coordinator`子agent可以配置的参数包括：
- `name` - agent名称
- `description` - 描述职责与行动
- `system_prompt` - 系统提示词：工具使用与输出格式要求
- `tools` - 可用工具，选择子代理可以使用的工具，不继承主代理
- `model` - 模型，默认继承主代理
- `middleware` - 中间件，理论上沙箱、文件系统等都能配置
- `interrupt_on` - 人机交互确认，有点复杂
- `skills` - 可用的技能，从哪些地方加载skills，不继承主代理

```python
import os
import asyncio
from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel
from deepagents.backends import FilesystemBackend, LocalShellBackend

def _get_model() -> BaseChatModel | None:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None
    model_name = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    return init_chat_model(
        f"openai:{model_name}",
        base_url="https://api.deepseek.com/v1",
        api_key=api_key,
    )

if __name__ == "__main__":
    model = _get_model()

    math_coordinator = {
        "name": "math-coordinator",
        "description": "你是加减乘除计算专家，主要解决用户提出的数学问题",
        "system_prompt": "你是加减乘除计算专家。收到用户的数学问题后，计算数学结果并返回结果。直接返回执行的最终结果即可",
        "tools": [],
        "middleware": [],
        "interrupt_on": [],
        "skills": [],
    }

    agent = create_deep_agent(
        model=model,
        name="learn-agent",
        system_prompt=(
            "你是总协调者。收到用户的数学问题后，把整个运算任务交给 math-coordinator，"
            "等它返回后把结果告诉用户。"
        ),
        subagents=[
            math_coordinator
        ]
    )

    async def main():
        async for chunk in agent.astream(
            {"messages": [("user", "计算1+10等于多少？")]},
            config={"configurable": {"thread_id": "nested-demo"}},
            stream_mode="values",
        ):
            messages = chunk.get("messages", [])
            if messages:
                print(messages[-1].content)

    asyncio.run(main())
```

### 编译使用子代理

我的理解就是主代理通过`create_deep_agent`创建，子代理用`subagents=[]`传递进去，如果要让子代理也拥有一些子代理该如何实现呢？

> 显然是没法在子代理中通过`subagents=[]`创建的，因为subagent格式已经是一个dict了，唯一的办法就是编译子代理

编译子代理的含义就是子代理如果还想继续向下拓展，可以新增LangGraph图来实现新增"孙agent"。

首先创建一个`child_agent`（名字叫做math-coordinator），里面的subagent就是新增的孙agent（创建方式可以是`create_deep_agent`也可以是LangGraph里面的`create_agent`）

然后在主agent中配置子agent，通过编译子代理的方式新增名为math-coordinator的子代理

最后编译子代理的参数中`runnable`参数设置为之前创建的`child_agent`即可

```python
import os
import asyncio
from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel
from deepagents.backends import FilesystemBackend, LocalShellBackend
from deepagents.middleware.subagents import CompiledSubAgent

def _get_model() -> BaseChatModel | None:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None
    model_name = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    return init_chat_model(
        f"openai:{model_name}",
        base_url="https://api.deepseek.com/v1",
        api_key=api_key,
    )

if __name__ == "__main__":
    model = _get_model()

    child_agent = create_deep_agent(
        model=model,
        name="math-coordinator",
        system_prompt=(
            "你是加减计算分配者，主要根据计算需要分配给合适的加法专家或者减法专家。"
            "收到计算请求后，把加法任务派给 adder，把乘法任务派给 multiplier，可以并发调用。"
            "收集结果后返回一份简洁的汇总。"
        ),
        subagents=[
            {
                "name": "adder",
                "description": "专门做整数加法。给它一个加法表达式，它返回结果。",
                "system_prompt": (
                    "你是加法专家。只做加法，不做其他运算。"
                    "收到加法任务后直接计算并返回结果，不需要使用任何工具，直接回答数字即可。"
                ),
            },
            {
                "name": "multiplier",
                "description": "专门做整数乘法。给它一个乘法表达式，它返回结果。",
                "system_prompt": (
                    "你是乘法专家。只做乘法，不做其他运算。"
                    "收到乘法任务后直接计算并返回结果，不需要使用任何工具，直接回答数字即可。"
                ),
            },
        ],
    )

    agent = create_deep_agent(
        model=model,
        name="learn-agent",
        system_prompt=(
            "你是总协调者。收到用户的数学问题后，把运算任务交给 math-coordinator，"
            "等它返回后把结果告诉用户。"
        ),
        subagents=[
            CompiledSubAgent(
                name="math-coordinator",
                description="你是加减计算分配者，主要根据计算需要分配给合适的加法专家或者减法专家",
                runnable=child_agent,
            ),
        ]
    )

    async def main():
        async for chunk in agent.astream(
            {"messages": [("user", "计算2乘以3等于多少？")]},
            config={"configurable": {"thread_id": "nested-demo"}},
            stream_mode="values",
        ):
            messages = chunk.get("messages", [])
            if messages:
                print(messages[-1].content)

    asyncio.run(main())
```

> **编译子代理小节的疑问**：我有个疑问，DeepAgent中，通过编译子代理的方式创建更复杂的图，子代理的创建方式可以是`create_deep_agent`，也可以是`create_agent`，二者有什么区别或者相同点呢？

**AI解答**：`create_agent`是LangChain的底层组图API，只按model/tools/middleware建图；`create_deep_agent`在它之上封装了DeepAgents的默认栈（memory、skills、filesystem、subagents等），两者返回的runnable都带messages状态。

所以都可以作为子代理的runnable使用——要轻量用`create_agent`，要"和主agent同款能力"用`create_deep_agent`。

### create_agent vs create_deep_agent 对比

#### 1. create_agent（LangChain）

**作用**：用你提供的model、system_prompt、tools、middleware等组一个agent图。

**特点**：
- 不自动加memory、skills、backend、子代理等
- 完全由你决定middleware和tools，适合做轻量、叶子节点的子代理（例如只要一个model + 少量tools）

```python
from langchain.agents import create_agent

leaf = create_agent(
    model=model,
    system_prompt="你是加法专家，只做加法。",
    tools=[],
    name="adder",
)

# 作为 CompiledSubAgent 的 runnable 传入
CompiledSubAgent(name="adder", description="...", runnable=leaf)
```

#### 2. create_deep_agent（DeepAgents）

**作用**：在"DeepAgents默认约定"下组一个agent，内部最终也是调用`create_agent`，只是先帮你把一整套middleware和子代理都配好。

**默认会加上的能力**（见graph.py）：
- 默认model（未传则用Claude）、backend（未传则StateBackend）
- 主agent：TodoList、Memory（若memory=）、Skills（若skills=）、Filesystem、SubAgent（含general-purpose + 你给的subagents）、Summarization、PromptCaching、PatchToolCalls、HumanInTheLoop（若interrupt_on=）
- 对每个SubAgent字典：自动补model/tools，并加上TodoList、Filesystem、Summarization、PatchToolCalls等"子代理默认栈"
- 对CompiledSubAgent：只把runnable原样交给SubAgentMiddleware，不再加工

**特点**：
- 自带文件、todo、可选的memory/skills/子代理
- 适合做和主agent能力对齐的嵌套代理（例如"再一层带子代理的协调者"）

```python
from deepagents import create_deep_agent, CompiledSubAgent

child = create_deep_agent(
    model=model,
    name="math-coordinator",
    system_prompt="你是数学协调者，把加法交给adder、乘法交给multiplier。",
    subagents=[{"name": "adder", ...}, {"name": "multiplier", ...}],
    backend=fs_backend,  # 可选：和主agent共用/同风格backend
)

# 作为 CompiledSubAgent 的 runnable 传入
CompiledSubAgent(name="math-coordinator", description="...", runnable=child)
```

#### 3. 作子代理时的约束（二者相同）

`CompiledSubAgent`的文档里写明（subagents.py）：

- runnable的状态里必须包含messages，子代理执行完后会用messages的最后一条作为ToolMessage回传给父agent
- 可以用两种方式构造这个runnable：
  - LangChain的`create_agent()` → 轻量、完全手控
  - 任意自定义图（如LangGraph）→ 只要state里有messages即可

**所以**：区别不在"能不能当子代理"，而在"默认带了哪些能力"。

#### 4. 实际选用建议

| 场景 | 推荐方式 |
|------|----------|
| 子代理只是简单专家（如加法/乘法、单一工具） | 用`create_agent`：只传model + system_prompt + 少量tools，结构清晰、依赖少 |
| 子代理需要和主agent类似的能力（文件、todo、再往下派子代理、或要用memory/skills/backend） | 用`create_deep_agent`：参数和主agent一致，便于做多层、能力一致的嵌套 |

典型示例：主agent用`create_deep_agent`，子代理math-coordinator也用`create_deep_agent`，其下adder/multiplier用SubAgent字典（内部仍由`create_agent`编译）即可——顶层和中间层用`create_deep_agent`保持能力一致，最底层用声明式SubAgent即可。

---

## 小结

本文主要学习了DeepAgent的基本概念和以下核心特性：

1. **后端Backends** - 提供文件系统和Shell级别的操作能力
2. **次级代理SubAgent** - 支持多层嵌套的子代理架构

后续文章将继续学习人机交互、长期记忆、Skills和沙箱等特性。

---

*（未完待续...）*
