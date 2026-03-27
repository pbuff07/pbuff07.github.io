---
title: "Learn-Claude-Code(Tools)"
date: 2026-03-27T17:46:00+08:00
categories: ["编程"]
tags: ["ai", "agent", "python", "anthropic"]
toc: true
numberedSubtitles: false
---

接上一篇 Agent 循环的实现，s01 搞清楚了 Agent 循环的本质就是一个 `while True` 不断问 LLM、执行工具、再问 LLM。但那时候只有一个 bash 工具，啥都走 shell，多少有点暴力。

s02 解决了一个很实际的问题：**工具怎么扩展？**

## 一个 handler 对应一个工具

核心思路特别简单：把工具调用从硬编码改成字典查找。

流程是这样的：用户输入 → LLM 决定调用哪个工具 → Tool Dispatch 字典查找对应 handler → 执行返回结果 → LLM 继续处理。

s01 的时候，循环里直接写死了 `run_bash(block.input["command"])`。现在改成这样：

```
TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"],
                                        kw["new_text"]),
}
```

循环体里就变成了一行查找：

```
handler = TOOL_HANDLERS.get(block.name)
output = handler(**block.input) if handler \
    else f"Unknown tool: {block.name}"
```

加工具 = 加 handler + 加 schema，循环永远不用动。这个设计很干净。

## 为什么要搞专用工具

只有 bash 的时候，读文件用 `cat`，写文件用 `echo >`，改文件用 `sed`。问题来了：

- `cat` 截断不可预测，大文件直接爆
- `sed` 遇到特殊字符就崩，转义是个坑
- 每次 bash 调用都是不受约束的安全面

专用工具可以在工具层面做路径沙箱，而不是把安全责任全丢给 shell。

## 路径沙箱

```
def safe_path(p: str) -> Path:
    path = (WORKDIR / p).resolve()
    if not path.is_relative_to(WORKDIR):
        raise ValueError(f"Path escapes workspace: {p}")
    return path
```

思路是：先把相对路径转成绝对路径，然后检查这个路径是不是还在工作目录下面。如果不在，直接报错。

这样就算 LLM 想读 `/etc/passwd` 或者写 `../../../tmp/evil.sh`，也会被拦住。

## 四个工具的实现

### read_file

读文件，支持 limit 参数截断行数，输出也有 50000 字符上限：

```
def run_read(path: str, limit: int = None) -> str:
    try:
        text = safe_path(path).read_text()
        lines = text.splitlines()
        if limit and limit < len(lines):
            lines = lines[:limit] + [f"... ({len(lines) - limit} more lines)"]
        return "\n".join(lines)[:50000]
    except Exception as e:
        return f"Error: {e}"
```

### write_file

创建或覆写文件，自动创建父目录：

```
def run_write(path: str, content: str) -> str:
    try:
        fp = safe_path(path)
        fp.parent.mkdir(parents=True, exist_ok=True)
        fp.write_text(content)
        return f"Wrote {len(content)} bytes to {path}"
    except Exception as e:
        return f"Error: {e}"
```

### edit_file

精确替换，只替换第一个匹配：

```
def run_edit(path: str, old_text: str, new_text: str) -> str:
    try:
        fp = safe_path(path)
        content = fp.read_text()
        if old_text not in content:
            return f"Error: Text not found in {path}"
        fp.write_text(content.replace(old_text, new_text, 1))
        return f"Edited {path}"
    except Exception as e:
        return f"Error: {e}"
```

### bash

沿用 s01 的实现，加了危险命令黑名单。

## Tool Schema 的写法

每个工具需要告诉 LLM 怎么用，这就是 schema。比如 bash 的定义：

```
{
    "name": "bash",
    "description": "Run a shell command.",
    "input_schema": {
        "type": "object",
        "properties": {"command": {"type": "string"}},
        "required": ["command"]
    }
}
```

description 写得好不好，直接影响 LLM 用得对不对。s02 的描述都很简洁，够用。

## 相对 s01 的变化

| 组件 | s01 | s02 |
|-----|-----|-----|
| 工具数量 | 1 (bash) | 4 (bash/read/write/edit) |
| 调用方式 | 硬编码 | TOOL_HANDLERS 字典 |
| 路径安全 | 无 | safe_path() 沙箱 |
| Agent 循环 | 不变 | 不变 |

最后这点最重要：**循环逻辑一行都没改**。这就是 dispatch map 的好处，扩展工具不需要动核心流程。

## 试一下

启动命令：

```
cd learn-claude-code
python agents/s02_tool_use.py
```

然后试试这些提示词：

- Read the file requirements.txt
- Create a file called greet.py with a greet(name) function
- Edit greet.py to add a docstring to the function
- Read greet.py to verify the edit worked

## 小结

> 想到一个事：edit_file 用的是字符串精确匹配，如果文件里有重复内容，只会替换第一个。这和 sed 的行为不一样，但对于代码修改来说反而更安全——不会误伤。

s02 的核心收获是 dispatch map 的设计模式。后面加再多工具，也就是往字典里塞键值对的事，Agent 循环本身完全不用动。

---

## 参考资料

- [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)
