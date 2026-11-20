全部在应用配置目录下 —— Windows 上是 `%APPDATA%\com.wrolp.editor`；设置 → 关于 会列出这些目录的完整路径，并能直接在资源管理器里打开；备份目录在「设置 → 备份」里同样可以打开：

```
wrolp/
├── backups/wrolp-backup-<时间>-<类型>.json   设置、分组、最近文件与文件夹历史
├── drafts/<文件名>-<sha256>.draft  每个文件一份草稿，用所属文件的名字命名
├── kept/<原名>               被删文件的救援副本（明文，见「加密文件」）
├── shadow/<文件名>-<sha256>.git/   每个被跟踪文件一份版本记录，开启版本后才会出现
└── state/
    ├── history.json          最近打开，新的在前，最多 50 条
    ├── settings.json         fontSize、minimap、sidebarVisible、sidebarView、sidebarWidth、sidebarFont、
    │                         language、restoreSession、draftRestore、lineEnding、
    │                         trimTrailingWhitespace、insertFinalNewline、autoSave、autoSaveInterval、
    │                         versioningEnabled、versioningShowLimit、versioningMaxFileSize、autoSaveVersions、
    │                         askNoteOnSave、backupDir、backupRetain、
    │                         encryptIdleMinutes
    ├── file-settings.json    每文件覆盖：编码、换行符、视图设置、版本记录
    ├── groups.json           标签分组：名字、标签、光标位置与资源管理器的目录
    ├── git.json              git 凭据、提交身份回退、已信任的 SSH 主机密钥
    │                         （明文；刻意不进入配置备份）
    └── window.json           x、y、width、height（物理像素）与是否最大化
```

`<sha256>` 是**规范化**路径的哈希：绝对路径、去掉 `\\?\` 前缀、分隔符统一、Windows 下再转小写。草稿是按它而不是按前面那段可读的 `<文件名>` 对应的——两个不同目录里的 `notes.md` 不会共用一份草稿。文件名写进名字只是因为一目录纯哈希等于一目录无名文件；旧名 `<sha256>.draft` 的草稿会在首次读到时就地改名，清除时两个名字一起清。草稿内容形如：

```json
{
  "path": "d:\\notes\\a.txt",
  "content": "unsaved text",
  "cursor": 12,
  "updatedAt": "2026-10-04T01:13:36Z"
}
```

`cursor` 存的是 Monaco 的 model 偏移量，所以恢复时光标会落回原处。加密文件的草稿不是这个形状，而是用同一把
文件密钥密封过的信封（见「加密文件」）。记住的口令**不在这里**：它们在 Windows 凭据管理器里。

## Tauri 命令

白名单就是 `src-tauri/src/lib.rs` 里 `invoke_handler` 那一份，前端只能调它列出来的命令。按用途大致是：
打开/保存/草稿（`open_file`、`save_file`、`stat_file`、`get_draft`、`save_draft`、`clear_draft`），
目录树与文件操作（`list_dir`、`create_file`、`create_dir`、`rename_path`、`copy_entry`、`remove_entry`、
`keep_file`），分组与会话（`get_groups`、`save_groups`、`transfer_tabs`、`get_window_state`、
`save_window_state`、`plan_window_placement`），设置、备份与右键菜单（`get_settings`、`save_settings`、
`get_store_dirs`、`create_config_backup`、`list_config_backups`、`restore_config_backup`、
`maybe_auto_backup`、`context_menu_target`、`install_context_menu`、`uninstall_context_menu`），PDF 阅读
（`read_file_range`、`get_pdf_position`、`save_pdf_position`），版本记录
（`versioning_state`、`set_version_override`、`add_version`、`get_versions`、`get_version_content`、
`list_versions`、`clear_versions`），以及加密（`unlock_file`、
`lock_file`、`lock_all`、`save_file_as_encrypted`、`create_encrypted`、`change_password`、
`remove_encryption`、`remember_password`、`forget_password`、`recall_password`、
`remembered_password_count`、`clear_remembered_passwords`），以及 git（`git_status`、`git_repo_info`、
`git_init`、`git_diff`、`git_stage`、`git_unstage`、`git_discard`、`git_commit`、`git_log`、
`git_commit_files`、`git_branches`、`git_create_branch`、`git_switch_branch`、`git_delete_branch`、
`git_remotes`、`git_remote_save`、`git_remote_remove`、`git_fetch`、`git_pull`、`git_push`、`git_cancel`、`git_conflict_sides`、
`git_resolve_conflict`、`git_write_resolution`、`git_delete_resolution`、`git_merge_abort`，
以及凭据与主机密钥存储用的 `git_auth_*`）。

文件读写**故意不用** `fs` 插件：WebView 只能调用上面这些固定命令，不把大范围磁盘 scope 暴露给前端。
口令同理**从不跨 IPC 回到前端**：`recall_password` 只回答「这个路径记没记住口令」这一个布尔值，
口令本身留在 Rust 侧，因为进了 JavaScript 堆的值就等于进了 devtools 控制台。
