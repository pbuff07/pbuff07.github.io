# 嘴强黑客 / pbuff07

基于 [Material for MkDocs](https://github.com/squidfunk/mkdocs-material) 的个人博客，部署在 [pbuff.cc](https://pbuff.cc/)。

## 本地预览

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdocs serve
```

浏览器访问 http://127.0.0.1:8000

## 新增文章

在 `docs/posts/` 下创建 `YYYY-MM-DD-标题.md`，参考已有文章填写 front matter 即可。

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages。

## 说明

GitHub Pages 若配置为从 `main` 分支部署，必须发布 `mkdocs build` 后的静态文件（仓库根目录需有 `index.html` 与 `.nojekyll`）。
仅提交源码时，GitHub 会用 Jekyll 把 `README.md` 当成首页，自定义域名 `pbuff.cc` 也会看到 README。

