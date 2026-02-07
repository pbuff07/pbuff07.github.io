---
title: "UTF-16LE编码解析 AI-Generate"
date: 2025-02-08T14:00:00+08:00
categories: ["AI-Generate", "编码"]
tags: ["编码", "utf16", "AI-Generate"]
toc: false
numberedSubtitles: false
---

## UTF-16编码概述

UTF-16（Unicode Transformation Format - 16-bit）是Unicode字符集的一种编码方式，使用16位（2字节）或32位（4字节）来表示一个Unicode字符。

## 字节序说明

字节序（Endianness）是指多字节在内存中的存储顺序。

### 大端序（Big Endian，BE）

高位字节存储在低地址，低位字节存储在高地址。

### 小端序（Little Endian，LE）

低位字节存储在低地址，高位字节存储在高地址。

## UTF-16LE编码特点

UTF-16LE采用小端序存储，即低位字节在前。

以汉字"中"为例，其Unicode码点为U+4E2D：

| 编码方式 | 字节序列 |
|---------|---------|
| UTF-16BE | `4E 2D` |
| UTF-16LE | `2D 4E` |

## 实际应用场景

### Windows系统

Windows API和内部大量使用UTF-16LE编码，例如：

- 注册表键值
- 文件路径
- API函数参数

### Python代码示例

处理Windows导出文件时需要指定正确的编码：

```python
# 正确的读取方式
with open("export.reg", "r", encoding="utf-16-le") as f:
    content = f.read()

# 处理BOM（如果存在）
if content.startswith("\ufeff"):
    content = content[1:]
```

### 内存分析

在逆向工程或内存分析中，Windows进程的字符串通常是UTF-16LE编码，需要正确解析才能获取可读内容。

## BOM（Byte Order Mark）

UTF-16文件通常以BOM开头，用于标识字节序：

| 编码 | BOM |
|------|-----|
| UTF-16LE | `FF FE` |
| UTF-16BE | `FE FF` |

## 注意事项

1. **编码识别错误**：文件读取时需明确指定编码，否则会出现乱码
2. **BOM处理**：某些编程语言读取UTF-16文件时会保留BOM，需手动去除
3. **跨平台兼容**：UTF-16LE主要用于Windows环境，Linux环境更常用UTF-8

## 总结

UTF-16LE是Unicode的一种编码实现，采用小端字节序。在Windows系统开发和逆向分析中经常遇到，处理时需要注意字节序和BOM问题，以确保正确解析字符内容。
