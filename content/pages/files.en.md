## Batch rename

Rename many entries at once from the Explorer: `Ctrl+click` rows (or `Shift+click` for a run of them), then **Rename N items…** in the row menu. A folder can be renamed whole without selecting anything — **Rename everything in this folder…** is on the folder's own menu and on a file's menu (for the folder holding it), and the blank area's menu offers the same command for the folder the Explorer is showing.

Every name is worked out and checked before anything on disk changes, so a refused name leaves the folder as it was. The dialog shows the new name of every row as it is typed, and marks a row that would collide with another row of the same batch.

Two rules are offered:

- **Pattern** — tokens for the parts of a name: `{name}` is the old name without its extension, `{ext}` the extension including its dot, and `{n}` a counter. `{name}{ext}` changes nothing, `photo-{n}{ext}` numbers a folder, and `{name}-backup{ext}` appends to every name. The counter starts at *Start at* and is padded to *Digits*, so `01`, `02`, … rather than `1`, `2`, ….
- **Regex** — a regular expression matched against the whole name, extension included, plus a replacement. `$1` refers to a capture group, *Ignore case* adds the `i` flag, and rows the expression does not match keep their name. The replacement takes `{name}`, `{ext}` and `{n}` as well, so a group and a counter can be combined: `^(.+)\.jpe?g$` → `photo-{n}-$1.jpg`.

The counter counts rows in the list, not matches: under a regular expression, a row that does not match still takes its number, which keeps a sequence stable when only some of the files are affected.

Before applying, the list can be ordered — *As given*, *Name* (numbers read as numbers, so `photo-9` comes before `photo-10`), *Extension*, *Modified*, or *Manual* — and flipped between ascending and descending. Dragging a row, or the arrows that appear on hover, fine-tunes the order, and `{n}` follows whatever is on screen, so the numbering can be nudged until it reads the way it should. A name already taken by an entry outside the batch is refused by the backend with a message rather than overwriting it; a folder and something inside it cannot move in one batch.

A renamed file keeps its text, its caret and any unsaved edits in the tab that is showing it. The undo stack of that document starts over, because Monaco has no way to move a buffer to another path. A name in the preview that is too long to fit keeps its full text as a tooltip.

## Configuration backups

Settings → Backups keeps timestamped copies of the configuration, because losing the group store
takes the tab session with it and there is no undo for that. The default folder is
`%APPDATA%\com.wrolp.editor\wrolp\backups`; *Change…* picks another one and *Use the default
folder* returns to it. The folder and the retention count are stored in `settings.json`
(`backupDir`, `backupRetain`).

- **One file per snapshot.** Each is named `wrolp-backup-<YYYYMMDD-HHMMSS-mmm>-<kind>.json`, with
  kind `auto`, `manual` or `pre-restore`. The files are bundled into one record rather than copied
  one by one, because a group and its folder menu are tied together by the group id: restoring one
  without the other can leave the menu pointing at a group that is no longer there.
- **What is inside:** `settings.json`, `groups.json`, `file-settings.json`, `history.json` and
  `folder-history.json`, each kept as the exact text it had. **Drafts and version history are not
  included** — those are user data rather than configuration, and copying them would let a snapshot
  grow to the size of the work it protects. A snapshot is plain JSON, like the files it copies.
- **Automatic and manual.** The day's automatic snapshot is refreshed when the app opens and when
  it closes, so it holds the configuration as it stood at that transition. Each refresh replaces
  the earlier automatic one from the same day, while manual snapshots stay; a window left open
  past midnight gets one from the hourly check. *Back up now* takes a manual snapshot at any time.
  *Snapshots to keep* (1–100, default 20) is enforced when the next snapshot is written, so
  lowering it does not delete anything until then.
- **Restoring.** The list is newest first and shows when each snapshot was taken, its kind, the
  group and tab counts it holds, and its size. Picking one asks once, then flushes drafts and
  groups, takes a `pre-restore` safety snapshot of the current state, replaces the five files and
  reloads the window. Drafts are not part of a snapshot, so they survive the restore and the
  reload. `window.json` is not touched, and the window stays where it is.
- **Only this folder, only these names.** A restore is refused for a path outside the configured
  backup folder, a file not named `wrolp-backup-*.json`, a snapshot newer than the format this
  build knows, and a damaged bundle — the list leaves those out rather than offering them.

## File comparison

A read-only side-by-side diff of any two contents, in a tab of its own (titled `a.txt ↔ b.txt`).

- **Either side may be unsaved.** A tab's buffer — an untitled one included — is a side like any other:
  unsaved vs saved and unsaved vs unsaved both work. The left side is the tab you started from, comparing
  its **current** text rather than what is on disk; the right side is picked from what is already open, or
  browsed from a file that is not.
- **A file against its own unsaved text** is the tab menu's *Compare with saved version*: the disk side is
  read fresh on the left, the buffer on the right, the sides labelled "· on disk" / "· unsaved" — the same
  orientation the conflict prompt uses when another program has written the file.
- **Snapshot.** Both texts are frozen into the tab when it opens; later edits to either source do not
  change it. **Re-running the same comparison** (same pair of sources, same order) refreshes it. The tab's
  context menu can swap the two sides. By default there is one comparison tab: a new comparison replaces
  the one on screen (re-running the same pair still refreshes in place); turn off *Reuse one comparison
  tab* in Settings → General to give every comparison a tab of its own.
- **Show only the changes.** The fold button in the header keeps the changed lines and a few lines
  of context around each, hiding the stretches that did not change, and says how many lines it
  dropped. The tab's snapshot is not touched, so unfolding gives the whole text back — but while
  folded the line numbers are those of the folded text, and find and copy reach only what is shown.
- **Read-only.** Open either file to edit it.
- **Picker badges:** "unsaved" means the tab holds edits that were never saved; "untitled" means there is
  no file behind it. Pictures, the settings panel and other comparisons are never offered as a side, and a
  source is never both sides at once — disk vs disk and buffer vs buffer are refused, while buffer vs disk
  is allowed (that is the same-file case above).
- A comparison tab is temporary: it is not part of the group store and does not come back on the next
  start. Closing a source tab leaves an open comparison alone (it holds its own snapshot) — it just cannot
  be refreshed, and re-running it then says the tab was closed.
