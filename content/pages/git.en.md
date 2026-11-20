![The Source Control panel: changes, commit box and history](branding/shots/source-panel.png)

The fourth sidebar view is the set of real git repositories behind the group's folder: the one
the folder sits in (possibly above it), the ones found in its subdirectories, and any added by
hand. A compact list at the top switches between them; the panel below is the single-repository
panel described here. This is the opposite of [Version history](#version-history), which is a
private store per file and never touches the folders you edit.

![The working tree of a changed file diffed against its index](branding/shots/source-diff.png)

- **Repositories.** Settings → Git → *Subdirectory depth* bounds the scan (0–5, default 2). The
  scan does not enter a repository it has found, skips `node_modules`, `target`, `dist`, bare
  repositories and links/junctions, and leaves submodules and linked worktrees to *Add
  repository*. A row shows the branch, ahead/behind and changed-file count; picking it switches
  the panel and is remembered per group. Manual entries, including repositories outside the
  folder, are stored in `groups.json` (so they come back with a configuration backup) and
  removing one only forgets the listing. One scan returns at most 50 repositories from 5,000
  directories. A parent repository is shown whole: its own changes list can include paths outside
  the group folder and untracked content of nested repositories, exactly as git reports them.
- **Changes.** Two lists, `Staged` and `Changes`, with the same one-letter badges `git status
  --short` uses. A path can be in both (staged text and further working-tree edits); each row acts
  on its own half. Clicking a row opens a read-only comparison tab — index against working tree, or
  HEAD against index — using the same diff viewer as every other comparison. A row with unsaved
  editor text says so; staging and committing always use the file on disk.
- **Actions.** Stage, unstage, discard one file or all of them. Discarding a tracked file checks the
  index version back out; discarding an untracked file deletes it, after a confirmation that names
  the count. A conflicted path is never discarded here — it is resolved through the merge flow.
- **Commit.** Only what is staged is committed, so the two lists mean what they say. The identity is
  the repository's own `user.name`/`user.email`; when those are missing, Settings → Git can supply a
  fallback, and with neither the commit is refused rather than signed by an invented person. The
  History section lists commits and the paths each one changed, and a changed path opens the same
  comparison against its first parent. A merge in progress takes no extra staging and commits with
  two parents.
- **Local-only state.** An untracked path can be *ignored locally*, which appends an anchored
  pattern to `.git/info/exclude`; a tracked one can be *assumed unchanged*, which sets the index's
  assume-unchanged bit so working-tree edits stop being reported. Both are reachable from the
  Explorer's context menu, a changed row's context menu, and *Local Git Settings* in the panel
  header; the dialog lists every entry, removes them one by one, and opens the exclude file. Assume
  unchanged is a promise: a checkout can overwrite those files.
- **Commit diff tabs.** Hover a history row for the full commit message; right-click it and choose
  *Open commit diff tab* to see every file the commit changed stacked vertically, each showing its
  diff against the first parent, and each foldable down to the changed lines. Binary, submodule,
  encrypted and oversized files say why instead of showing an empty diff; opening the same commit
  in the same repository again reuses its tab, while the same oid in another repository gets its
  own.
- **Branches.** The branch button lists local and remote-tracking branches, creates one from the
  current commit, switches and deletes with confirmation — a branch whose commits are not merged
  anywhere asks a second, explicit question before it is deleted. Picking a remote-tracking branch
  makes the local branch of the same name and sets it to track that remote one. Switching is refused while the index or
  the working tree has changes: a branch switch that half-succeeds is worse than one that asks you
  to commit or discard first.
- **Remotes.** Fetch, pull and push use libgit2 over the system's WinHTTP stack for HTTPS and
  libssh2 for SSH. Progress is shown while it runs and can be cancelled. The panel's *Remote
  addresses* dialog adds, edits and removes remotes — it writes the git config and nothing else;
  an address's user name and token are never shown. Pull fast-forwards when it
  can; otherwise it merges, and a conflict opens a `Conflicts` list where each path can be taken as
  ours, as theirs, or opened in a three-pane merge editor: ours on the left, theirs on the right,
  and the result in the middle. Each marked block can take ours, theirs, or both, with undo; Apply
  writes the result back in the file's own encoding, BOM and line endings and marks the path
  resolved. Committing the result records
  the merge, and *Abort merge* puts the files back as they were before it started. Push sets the
  upstream on the first push and reports a rejected non-fast-forward in words rather than as a
  transport error.
- **Credentials.** HTTPS takes a username and a personal access token; SSH takes a private key and
  an optional passphrase. They are kept in `state/git.json` in plain text, like the rest of this
  app's state, and are **not** included in configuration backups, so a token is not copied into
  every safety snapshot. The credential dialog masks the secret with a reveal button, and the Rust
  side never hands a stored secret back to the frontend. The first connection to an SSH host asks
  you to trust its SHA-256 fingerprint; later connections compare against what you approved and
  refuse a changed key. Settings → Git lists stored hosts and lets you forget them.
- **Explorer marks and the status bar.** The Explorer collects marks from every listed
  repository under the folder; when a path is reported by two of them, the nearest repository
  owns it. Above 12 repositories only the selected one and the folder's own repository are
  decorated, and the list says so. The status bar follows the selected repository, with its
  folder name in front when more than one is listed.
- **What it deliberately does not do.** No stash, tags, rebase, cherry-pick, blame or clone wizard;
  no diff3 auto-merge, character-level or binary merge — the editor works on line-level two-way
  markers, and a repository configured for diff3 markers is refused with the three quick actions
  as the fallback; nested repositories and
  submodules are shown as single paths rather than aggregated; libgit2 does not run hooks, so
  `pre-commit`/`post-checkout` scripts and git-lfs are not applied. Status stops at 5,000 paths and
  a diff side over 2 MB is reported rather than rendered. The panel refreshes every five seconds
  while it is visible, after a save, and when the window regains focus.
