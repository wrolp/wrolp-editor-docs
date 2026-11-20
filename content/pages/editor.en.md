## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Ctrl+S` | Save (Save As for untitled tabs) |
| `Ctrl+O` | Open file(s) |
| `Ctrl+N` | New untitled tab |
| `Ctrl+W` | Close the current tab (its draft is kept) |
| `Ctrl+B` | Toggle the sidebar |

Scrolling the mouse wheel over the tab strip scrolls it sideways.

## Tab groups

![The main window: tab strip, Explorer tree with git markers and the status bar](branding/shots/tab-groups.png)

A group is a **named set of open tabs** plus the **folder the Explorer shows** while it is on
screen. The chip in the title bar shows the current name and switches between groups inside the
same window; the tree switches with it. A group may still hold files from several folders — the
folder is where the next file is picked from, not where the open ones came from.

- **There is always a group.** A window with no groups starts with one called *Default*, so tabs are
  persisted from the first moment without the user having to create anything. *New group…* asks for a
  name and refuses an empty one or a name already in use — two rows reading the same thing could not be
  told apart. Renaming the default group is allowed; if you remove every group, the next start creates
  a fresh default.
- **Files join the group on screen.** Opening a file from the Explorer context menu adds it to the
  current group; a right-click never changes your context under you. *Open folder…* and *Show folder
  in sidebar* move the Explorer and record the folder in that group — they do not create or switch
  a group. A new group starts where the window already is, and can move on its own after that.
- **What is remembered:** the tab order, which tab was selected, the caret position per tab
  (`Settings → Reopen tabs from last time` turns this off), and the Explorer folder, plus the text
  of untitled tabs, which have no draft file so the group is their only copy. Capped at 32 groups,
  200 tabs each, 64 KB of
  scratch text per tab.
- **Content is never duplicated.** File-backed tabs store only path + caret; unsaved text stays in
  the draft file, keyed by path. That is why a tab can be moved to another group without touching
  its draft, and why the draft follows the file there.
- **Move / copy tab** (tab context menu) re-homes a tab between groups. It never renames or moves
  the file on disk — that would orphan the draft keyed to its path.
- **Deleted files** are skipped on restore with one aggregated notice and dropped from the group.
  *Remove from list* deletes only the record: files and drafts are left alone.

`groups.json` is whole-store, single-writer (the app is single instance) and written through a temp
file + rename. Tab paths use the same normalized form the drafts hash, so one file cannot appear
twice inside a group. A build that still has the older `workspaces.json` and no `groups.json` migrates
on **read**: the legacy file is parsed, written out under the new name, and only then deleted — so a
corrupt or unreadable legacy file is never destroyed by a later save. Unknown fields in old records
(`root`, `autoName`, `sidebarView`) are ignored, which is why the rename needed no migration step.

## Window state

The window reopens where you left it: same size, same spot, same maximized-or-not.

- **Physical pixels.** `window.json` stores `outerPosition`/`outerSize`, which are physical, not
  DIPs. On a 200 % display a 1193×748 window is recorded as 2386×1495.
- **Maximized keeps two facts.** While maximized only the flag is written; the last un-maximized
  rectangle is kept from before the maximize. Unmaximizing therefore returns to the size you chose,
  and a window that was maximized comes back maximized.
- **A moved/connected monitor is handled.** The saved rectangle is checked against the monitors that
  exist *now* before it is applied: only the top strip needs to be reachable, because the frameless
  window is dragged by that strip. A rectangle that no longer intersects any monitor is clamped back
  onto the primary at its saved size and a notice says why. Junk or absurdly large sizes fall back to
  the size a first run gets (1180×740, the same value as `tauri.conf.json`, duplicated as a Rust
  constant — change one, change the other), clamped to fit the screen.
- **Applied before the window is shown.** The window is created hidden, placed in Rust during
  setup, and only then shown, so the saved size is the first frame painted. Restoring from the page
  instead showed the configured 1180×740 window for as long as the webview took to boot and then
  resized it — a maximized window flashed up small before filling the screen.
- **When it is written:** a ~600 ms debounce after moving or resizing, and a synchronous flush in the
  close sequence alongside drafts and groups.
- **First run** keeps the size from `tauri.conf.json` and centers the window — no saved file, no
  surprise position.

## Interface language

English is the default and the fallback; Settings → General → *UI language* is a dropdown, so
adding a language does not change any layout.

Strings never live in components. `src/lib/i18n.ts` holds one flat key table per language and
exposes `t(key, params)` with `{placeholder}` substitution:

```ts
{ "status.cursor": "Ln {line} · Col {column}" }        // en
{ "status.cursor": "第 {line} 行 · 第 {column} 列" }    // zh
```

The Rust side does not translate. Commands fail with a stable **code**, optionally followed by
the raw detail after the first `:`, e.g. `file_too_large:8`, `file_read:os error 5`,
`path_empty`. `translateError()` splits on that first `:`, looks up `err.<code>` and injects the
detail as `{detail}`, so an unknown code still shows something readable instead of nothing.

To add a language:

1. Add a table in `src/lib/i18n.ts` and register it in `TABLES` plus `LANGUAGES` (native name as
   its own label). Key sets must stay identical — `t()` falls back to English for missing keys.
2. Nothing else. `Settings.language` is an opaque string stored as-is, and the dropdown,
   the fallback and the error mapping pick the new entry up automatically.
3. Localize the app description if you ship it (`tauri.conf.json` → `bundle.shortDescription`);
   the Windows context-menu entry stays English on purpose, since it is registered once and
   shared by every language.
