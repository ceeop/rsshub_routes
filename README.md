# 我的自定义 RSSHub 专属镜像

这套极简仓库利用 **外挂模式（Overlay Repo）** 和 **GitHub Actions**，能够零维护成本地保持与官方 DIYgod/RSSHub 的同步，并自动打包你的私有抓取路由。

## 如何使用

### 1. 添加你的自定义路由
将你需要自己开发的 `namespace.ts`、`route.js`/`route.ts` 等文件按照 RSSHub 官方格式放到 `my-routes` 文件夹中。

例如：
- `my-routes/mrdx/namespace.ts`
- `my-routes/mrdx/daily.ts`

### 2. 上传到 GitHub
如果你才刚刚拿到这个文件夹，将它推送到你的个人 GitHub (设为 Public / Private 均可)：

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
# 注意：用你在 Github 创建的纯净空仓库地址替换下面这行
git remote add origin https://github.com/你的名字/你的仓库名.git
git push -u origin main
```

### 3. 开启自动编译
当你推送到 GitHub 后：
1. 点击仓库的 `Actions` 选项卡。
2. 你可能会看到提示要求开启 Workflows 权限，允许即可。
3. 以后只要你的 `my-routes` 发布更新，或者到了每天早晨，GitHub Actions 都会自动去执行 `auto-update.yml`，为你拉取最新版并生成你的镜像。

> 你的专属 Docker 镜像地址：`ghcr.io/你的GitHub用户名/你的仓库名:latest`（所有的字母**强制变为全小写**）。

---

## 🚀 在服务器部署
将本仓库内附赠的 `docker-compose.yml` 发送到你的服务器上，将里面的 `ghcr.io/你的用户名/rsshub-custom-repo:latest` 改成你实际生成的地址，然后直接运行：

```bash
# 如果你的镜像仓库是私有的，服务器端请先登录：
# docker login ghcr.io -u 你的用户名 -p 你的Github-PAT

# 启动！
docker-compose pull && docker-compose up -d
```
