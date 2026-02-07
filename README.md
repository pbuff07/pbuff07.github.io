# pbuff07.github.io

pbuff07的个人博客，使用 [Hugo](https://gohugo.io) + [hugo-texify3](https://github.com/michaelneuper/hugo-texify3) 主题搭建。

## 本地运行

```bash
# 安装 Hugo
brew install hugo

# 克隆仓库（含子模块）
git clone --recurse-submodules https://github.com/pbuff07/pbuff07.github.io.git

# 启动服务器
cd pbuff07.github.io
hugo server -D
```

访问 http://localhost:1313

## 新增文章

在 `content/posts/` 目录下创建 `YYYY-MM-DD-标题.md` 文件：

```yaml
---
title: "文章标题"
date: 2025-02-08T14:00:00+08:00
categories: ["分类"]
tags: ["标签"]
toc: false
numberedSubtitles: false
---

文章内容...
```

## 部署

推送到 main 分支后，GitHub Actions 自动构建部署到 GitHub Pages。
