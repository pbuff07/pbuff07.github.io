---
title: "Google/Firefox禁用某些端口"
date: 2025-02-14T14:00:00+08:00
categories: ["杂文"]
tags: ["google", "firefox"]
---





因为浏览器内核和操作系统的不同，Google和Firefox都预设了一些端口禁止外部使用。比如访问 `http://IP:6666` 端口会提示端口不安全，不允许使用。

解决办法：

1. 浏览器输入 `about:config`
2. 搜索 `network.security.ports.banned.override`
3. 点击右侧新建字符串
4. 填写禁止访问的端口，比如 `6666,6667` 即可

