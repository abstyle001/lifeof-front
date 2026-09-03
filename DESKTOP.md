# LifeOS Desktop

LifeOS Desktop 是基于 Tauri 2 的 Windows x64 客户端。桌面端复用同一套 React 页面，生产构建连接 `https://lifeos-back.vercel.app/api`，不会在本地打包 Python、PostgreSQL 或 SQLite。

## 架构

- Web：`BrowserRouter` + 浏览器 `fetch` + `localStorage` token。
- Desktop：`HashRouter` + Tauri HTTP Client + Windows Credential Manager。
- 前后端账号和数据完全共享；桌面程序可以离线启动，但当前版本不缓存业务数据，也不支持离线写入。
- 只有 API 返回 `401` 才删除 token。断网、超时和 `5xx` 会保留凭据并显示重试界面。

## 本地环境

1. 安装 Node.js 24 与 pnpm 11。
2. 安装 Rust stable MSVC toolchain 和 `rustfmt`。
3. 安装 Microsoft C++ Build Tools（Desktop development with C++）。
4. 确认 Microsoft Edge WebView2 Runtime 可用。
5. 在本目录运行 `pnpm install`。

## 开发与检查

先启动本地 FastAPI（`127.0.0.1:8000`），再运行：

```powershell
pnpm desktop:dev
```

桌面开发模式固定使用 `127.0.0.1:5173`；若端口被占用会直接报错，不会自动切换端口。

完整检查：

```powershell
pnpm desktop:check
pnpm run desktop:web:build
```

- `.env.desktop-dev`：本地 API。
- `.env.desktop-prod`：生产 API。
- `tauri.dev.conf.json` 仅在开发模式叠加本地 API capability；生产 capability 只能访问生产 API。

## Windows 构建

```powershell
pnpm desktop:build
```

构建目标是 Windows x64、current-user NSIS 安装包。WebView2 缺失时安装器使用 download bootstrapper 引导安装。

正式发布构建必须先将 updater 公钥写入 `src-tauri/tauri.conf.json`。GitHub Actions 会通过 `scripts/configure-updater.mjs` 自动完成；本地发布验证可先设置 `TAURI_UPDATER_PUBLIC_KEY`，再运行该脚本。

## 自动更新密钥

在可信环境生成 Tauri updater 密钥对：

```powershell
pnpm exec tauri signer generate -w ~/.tauri/lifeos.key
```

在 `abstyle001/lifeof-front` 仓库设置 GitHub Actions Secrets：

- `TAURI_SIGNING_PRIVATE_KEY`：私钥文件内容。
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：私钥密码。
- `TAURI_UPDATER_PUBLIC_KEY`：对应公钥。

私钥不得提交到仓库。Updater 签名不等同于 Windows Authenticode；公开分发前仍需另行配置 Windows 代码签名证书。

## 发布

1. 同步修改 `package.json` 与 `src-tauri/tauri.conf.json` 的版本。
2. 推送格式为 `desktop-vX.Y.Z` 的 tag。
3. GitHub Actions 执行前端检查/构建、Rust 检查，生成 NSIS、更新包、签名和 `latest.json`。
4. 工作流创建 Draft Release；在干净的 Windows 10/11 x64 环境完成安装、卸载和 N → N+1 更新验收后再发布。

## 安全边界

- JWT 通过三个最小 Tauri command 保存在 Windows Credential Manager。
- HTTP Client 生产环境只允许 `lifeos-back.vercel.app`；开发环境额外允许 `127.0.0.1:8000`。
- opener 只允许实际 GitHub 仓库 URL；其他外链会被前端和 capability 双重拒绝。
- Rust 导航守卫禁止 WebView 跳转到远程页面。
- CSP 仅允许本地脚本/字体、生产 API、Tauri IPC 和 Vercel Blob 图片。
- 未启用 shell、任意文件系统、托盘、通知、全局快捷键或开机启动权限。
- single-instance 插件保证第二次启动只聚焦已有主窗口；window-state 插件记忆窗口位置和大小。
