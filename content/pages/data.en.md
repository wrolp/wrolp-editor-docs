Everything is under the app config directory — `%APPDATA%\com.wrolp.editor` on Windows — and
Settings → About prints the folders' full paths and opens any one of them in Explorer; the
Backups page does the same for its folder:

```
wrolp/
├── backups/wrolp-backup-<time>-<kind>.json   settings, groups, recent files and folder history
├── drafts/<name>-<sha256>.draft   one draft per file, named after the file it belongs to
├── kept/<name>               rescue copies of deleted files (plaintext; see "Encrypted files")
├── shadow/<name>-<sha256>.git/   one version history per file, once versioning is on
└── state/
    ├── history.json          recently opened files, newest first, capped at 50
    ├── settings.json         fontSize, minimap, sidebarVisible, sidebarView, sidebarWidth, sidebarFont,
    │                         language, restoreSession, draftRestore, lineEnding,
    │                         trimTrailingWhitespace, insertFinalNewline, autoSave, autoSaveInterval,
    │                         versioningEnabled, versioningShowLimit, versioningMaxFileSize, autoSaveVersions,
    │                         askNoteOnSave, backupDir, backupRetain,
    │                         encryptIdleMinutes
    ├── file-settings.json    per-file overrides: encoding, line ending, view settings, versioning
    ├── groups.json           the tab groups: name, tabs, caret positions and the Explorer folder
    ├── git.json              git credentials, commit identity fallback, trusted SSH host keys
    │                         (plain text; deliberately not part of configuration backups)
    └── window.json           x, y, width, height in physical pixels, plus the maximized flag
```

`<sha256>` is the hash of the **normalized** path: absolute, `\\?\` verbatim prefix removed, separators unified, lowercased on Windows. It, not the readable `<name>` in front of it, is what a draft is keyed by — two `notes.md` files in two folders never share one. The name is there because a folder of bare digests is a folder of anonymous files; a draft written under the older `<sha256>.draft` name is read and renamed on the first load, and cleared under both names. A draft looks like:

```json
{
  "path": "d:\\notes\\a.txt",
  "content": "unsaved text",
  "cursor": 12,
  "updatedAt": "2026-10-04T01:13:36Z"
}
```

`cursor` is a Monaco model offset, so restoring puts the caret exactly where it was. The draft of
an encrypted file is not this shape but an envelope sealed with that file's own key (see
"Encrypted files"). Remembered passwords are **not here**: they live in the Windows credential store.

## Tauri commands

The whitelist is the `invoke_handler` list in `src-tauri/src/lib.rs`, and those are the only
commands the frontend can call. By purpose: open/save/drafts (`open_file`, `save_file`,
`stat_file`, `get_draft`, `save_draft`, `clear_draft`), tree and file operations (`list_dir`,
`create_file`, `create_dir`, `rename_path`, `copy_entry`, `remove_entry`, `keep_file`), groups and
session (`get_groups`, `save_groups`, `transfer_tabs`, `get_window_state`, `save_window_state`,
`plan_window_placement`), settings, backups and the context menu (`get_settings`, `save_settings`,
`get_store_dirs`, `create_config_backup`, `list_config_backups`, `restore_config_backup`,
`maybe_auto_backup`, `context_menu_target`, `install_context_menu`, `uninstall_context_menu`), PDF
reading (`read_file_range`, `get_pdf_position`, `save_pdf_position`), version
history (`versioning_state`, `set_version_override`, `add_version`, `get_versions`,
`get_version_content`, `list_versions`, `clear_versions`), and encryption
(`unlock_file`, `lock_file`, `lock_all`, `save_file_as_encrypted`, `create_encrypted`,
`change_password`, `remove_encryption`, `remember_password`, `forget_password`, `recall_password`,
`remembered_password_count`, `clear_remembered_passwords`), and git (`git_status`, `git_repo_info`,
`git_init`, `git_diff`, `git_stage`, `git_unstage`, `git_discard`, `git_commit`, `git_log`,
`git_commit_files`, `git_branches`, `git_create_branch`, `git_switch_branch`, `git_delete_branch`,
`git_remotes`, `git_remote_save`, `git_remote_remove`, `git_fetch`, `git_pull`, `git_push`, `git_cancel`, `git_conflict_sides`,
`git_resolve_conflict`, `git_write_resolution`, `git_delete_resolution`, `git_merge_abort`, plus
`git_auth_*` for the credential and host-key store).

File IO is deliberately **not** the `fs` plugin: the WebView only ever calls these fixed
commands, so no broad disk scope is exposed to the frontend. Passwords cross IPC in one direction
only, and never back: `recall_password` answers whether a path has a password remembered, a single
boolean, because a value in a JavaScript heap is a value in a devtools console.
