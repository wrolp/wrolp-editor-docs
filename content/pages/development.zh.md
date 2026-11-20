## 环境要求

- Windows 10/11，带 WebView2 运行时（近年的 Windows 已内置）
- Rust 的 MSVC 工具链（`x86_64-pc-windows-msvc`）+ Visual Studio 的 C++ 生成工具工作负载
- Node.js `^20.19` 或 `>=22.12`（Vite 8 的要求）与 npm

## 开发

```bash
npm install
npm run tauri dev
```

debug 构建加载的是 Vite 在 `localhost:1520` 提供的页面。若右键菜单那条注册表指向 `target/debug/wrolp-editor.exe`，只有在 dev server 运行时右键才能打开文件，否则窗口会显示「拒绝连接」页面。日常使用请把菜单指向安装版（设置页会显示当前注册的实际命令）。

## 打安装包

```bash
npm run tauri build
# -> src-tauri/target/release/bundle/nsis/WROLP Editor_<version>_x64-setup.exe
```

只配置了 NSIS 目标（`bundle.targets: ["nsis"]`）。

## 发布

```bash
npm run release   # 先清理 target/ 与 dist/，再打安装包；三个版本号不一致、工作树不干净、或 v<version> 不是指向 HEAD 的本地 tag，就直接退出
npm run upload    # 发布 v<version>：同样再查一遍，还要求版本号高于线上已发布的最新一个
# 或：npm run publish
```

发布出去的东西事后必须说得清楚，所以两个脚本在做任何事之前就先停下。工作树要干净，连未跟踪的文件也算——它们会被编进安装包却不属于任何提交；`v<version>` 必须已是指向 HEAD 的本地 tag，这样 tag、源码和二进制才是同一个发布。`upload` 还会读 GitHub 上已有的 release，版本号不高于最新的一个就拒绝：客户端是比版本号的，同号即"已最新"，而上传会把它们正要下载的那份文件换掉。改好版本号并提交之后打 tag（`git tag -a v0.0.2 -m "0.0.2" && git push origin v0.0.2`）。本地自己构建不用受这些约束，走 `npm run tauri build` 就行——它既不签名也不发布。

`upload` 需要 `gh` CLI，并用对仓库有写权限的账号登录；仓库地址取自 `git remote get-url origin`（可用 `--repo owner/name` 覆盖），还接受 `--tag`、`--notes`、`--draft`、`--pre` 和 `--dry-run`。需要新建 release 时带上 `--target` 指向 tag 自己的提交，免得二进制来自某处、release 却落在默认分支当时的那个提交上。

构建用 `.tauri/priv.key` 签名（该文件不入库；用 `npx tauri signer generate -w .tauri/priv.key` 生成并务必备份——丢了它，已安装的版本就无法再接受更新）。`release` 会在安装包旁写出 `latest.json`，`upload` 把两者一起上传；应用从 `https://github.com/wrolp/wrolp-editor/releases/latest/download/latest.json` 读取。

发布说明按语言分成两份手写文件，放在仓库根目录：`RELEASE_NOTES.md`（English）和 `RELEASE_NOTES.zh.md`（简体中文）。`release` 写 `latest.json` 的 `notes`、`upload` 写 GitHub release 的正文时，会先读这两份、英文在上中文在下合并成一段；某个版本只想补一句时，用 `--notes "..."` 临时覆盖。

## 脚本

| 脚本 | 用途 |
| --- | --- |
| `npm run dev` | 在 1520 端口起 Vite dev server（供 `tauri dev` 使用） |
| `npm run build` | 先做类型检查，再产出 `dist/` 生产包 |
| `npm run tauri` | Tauri CLI 透传（`dev`、`build`、`icon` 等） |
| `npm run release` | 过闸门（三处版本号一致、工作树干净、`v<version>` 在 HEAD 上），签名构建并写出 `latest.json` |
| `npm run upload` | 再过一遍闸门并核对线上版本，然后把安装包与 `latest.json` 传到该提交对应的 release |
| `npm run publish` | 依次执行 `release` 与 `upload` |
