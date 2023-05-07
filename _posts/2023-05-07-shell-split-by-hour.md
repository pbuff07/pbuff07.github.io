---
layout: default
title: "shell按小时切割文件"
tags: linux
---

## 背景

6666

## 实践

```
awk  'split($2,arr,":") {print >> arr[1]}' filename
```

awk中的split函数解释如下：将字符串s按照r进行切割并作为数组存储在A中，可以直接按数组使用。

> split(s,A,r)  split(s,A)
> String s is split into fields by regular expression r and the fields are loaded into array A.  The number of fields is returned.

awk中的> 和>>解释如下：可以将匹配行通过> 或者 >> 重定向到指定的位置，区别在于是否追加。

> The output of print and printf can be redirected to a file or command by appending > file, >> file or | command to the end of the print statement.
