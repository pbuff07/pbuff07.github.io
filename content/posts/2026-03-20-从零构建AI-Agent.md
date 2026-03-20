---
title: "从零构建 AI Agent"
date: 2026-03-20T17:00:00+08:00
categories: ["编程"]
tags: ["ai", "agent", "python", "anthropic", "deepseek"]
toc: true
numberedSubtitles: false
---

最近跟着 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 学习 Agent 的构建，这是一个很好的教程，帮助我更清晰地了解 AI Agent 到底是如何工作的。

## Agent 循环的本质

Agent 循环其实就是 `while True` 的过程：LLM 根据用户问题不断**分析问题 → 调用工具 → 分析结果**，直到不需要再调用工具就退出。

![Agent循环流程图](https://pbuff-blogs-1257793641.cos.ap-chengdu.myqcloud.com//blogsimage-20260320163706719.png)

## 动手实现一个最简单的 Agent

通过一段示例代码来构建一个最简单的 Agent。

### 1. 初始化配置

首先初始化客户端，配置好系统提示词和工具（参数参考接口实现）。

```
from anthropic import Anthropic
import os

client = Anthropic(
    api_key="your-api-key-here",
    base_url="https://api.deepseek.com/anthropic/",
)

system_prompt = "You are a coding agent at {os.getcwd()}. Use bash to solve tasks. Act, don't explain."

tools = [{
    "name": "bash",
    "description": "Run a shell command.",
    "input_schema": {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
            }
        },
        "required": ["command"],
    }
}]
```

### 2. 主循环入口

`main()` 函数负责持续接收用户输入，若有问题则传递给 `agent_loop` 开始调用模型完成任务。

```
if __name__ == "__main__":
    history = []
    while True:
        try:
            query = input("请输入你的问题：")
        except (EOFError, KeyboardInterrupt):
            print("\nExiting...")
            break
        if query.lower() in ["exit", "quit", "q"]:
            break

        history.append({"role": "user", "content": query})
        agent_loop(history)
```

### 3. Agent 核心循环

`agent_loop` 根据需求请求 LLM，然后判断响应中是否包含 `tool_use`（工具调用）。如果不包含则退出（说明没有需要继续处理的任务），如果包含则执行工具命令并继续循环。

```
def agent_loop(messages: list[dict]):
    while True:
        response = client.messages.create(
            system=system_prompt,
            tools=tools,
            max_tokens=8000,
            model="deepseek-chat",
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            print("block is: ", block)
            if block.type == "tool_use":
                print(block.input["command"])
                output = run_bash(block.input["command"])
                print(output)
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})

        messages.append({"role": "user", "content": results})
```

### 4. 工具执行函数

执行工具直接通过 `subprocess.run` 执行系统命令。

```
import subprocess

def run_bash(command: str) -> str:
    dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]
    if any(d in command for d in dangerous):
        return "Error: Dangerous command blocked"
    try:
        r = subprocess.run(command, shell=True, cwd=os.getcwd(),
                           capture_output=True, text=True, timeout=120)
        out = (r.stdout + r.stderr).strip()
        return out[:50000] if out else "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: Timeout (120s)"
```

整个过程很简单，就是 `while True` 循环请求 LLM 并判断有没有工具执行，没有就退出了。

## 一个重要的认知纠正

> **有个问题：tool_use 是如何得出来的？**

我一直以为是 anthropic 库在拿到模型响应之后根据内容去判断的，比如"执行工具"、"调用xx"、"启动xx脚本"之类的关键字然后给出 `stop_reason` 为 `tool_use`。

经过查找和学习我才发现，**是否调用工具是模型返回的**，而不是 SDK 判断的。

模型根据当前的需求判断是否需要调用工具（当然需要模型支持工具调用），然后 Anthropic 的 SDK 做个代理将不同模型的工具调用名称接口统一即可。

比如 **DeepSeek-V3.2-Speciale** 明显不支持工具调用，你就是提示词、SKILL.md 写出花了他也没法调用起工具：

![不支持工具调用的模型](https://pbuff-blogs-1257793641.cos.ap-chengdu.myqcloud.com//blogsimage-20260320165317179.png)

而 **DeepSeek-V3.2** 就支持工具调用：

![支持工具调用的模型](https://pbuff-blogs-1257793641.cos.ap-chengdu.myqcloud.com//blogsimage-20260320165435897.png)

## 小结

通过这次学习，我对 AI Agent 的工作原理有了更清晰的认识：

1. **Agent 循环本质**：`while True` + 工具调用判断
2. **工具调用来源**：是模型自身的判断能力，而非 SDK 的解析
3. **模型选择**：需要选择支持工具调用（Function Calling）的模型

又学到知识的一天，原来之前理解的都是错误的。

---

## 参考资料

- [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)
