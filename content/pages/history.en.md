![The Versions sidebar view listing the saves of the active file](branding/shots/versions.png)

Off by default. Settings → Versions turns it on, and from then on every save you ask for — `Ctrl+S`,
or the tab menu's *Create version* — records what the file said. The word "version" is deliberate:
this is not a repository you branch or push, and nothing about it reaches the folder you are editing.

- **What gets recorded.** A file that already exists on disk, saved by hand, under a rule that says
  yes. The first save of a file records two rows: the text the file held when it was opened — dated
  when the file last changed on disk, not when the editor saw it — and then what you just saved. That
  first row is why a version can be diffed against "how this file started" rather than only against
  an earlier save.
- **What does not.** The automatic save writes the file and records nothing — unless Settings →
  Versions says otherwise, in which case its writes are recorded like any other. Off by default
  because a pause in typing is not somebody answering "keep this", and history is never trimmed, so
  recording every pause fills the list faster with moments nobody chose. An **encrypted** file is never versioned, unlocked or not: a
  version is that text stored in the clear in the app's own folder, beside a document you chose to
  encrypt — drafts are sealed with the file's key to avoid exactly that, and a version has no key at
  write time to seal itself with. A file bigger than the configured limit is saved normally and left
  out, with one notice per session. Pictures are never offered. And a save whose text is identical to
  the last recorded version adds nothing, so pressing `Ctrl+S` four times leaves one row — unless a
  note was written for it, which is the one thing that makes a save of unchanged text worth keeping.
- **Two switches, one rule.** Settings → Versions is the default for every file; a single file can
  override it from its tab menu (*Record versions for this file* / *Stop recording this file*) or in
  that file's Settings. `Create version` works whatever the switches say, and taking one turns that
  file on — asking for a version once is a decision about that file. It asks for a word about the
  version first: a line for the list, and as many lines under it as the reason needs. Both are
  optional, both are kept with the version, and neither can be edited afterwards, because the note
  lives inside the record it describes rather than beside it — which is why the question is asked
  once, there, and not offered later. The body is shown when the version is opened for comparison,
  and in the row's tooltip. Since a version is of the file as it stands on disk, asking for one while
  the tab has unsaved text writes the text first, and the note goes on the version that save
  produces rather than on a second row for the same thing.
- **A save that asks first.** *Ask for a note when I save* (Settings → Versions, off) puts the same
  box in front of a save you make by hand — `Ctrl+S`, or the mark on a tab — so the note is written
  while the version still has no message to be added to. Leaving it empty is the ordinary answer: it
  saves without a note. `Escape` saves nothing, which is what `Escape` means everywhere else in this
  app. Nothing is asked when a save cannot hold a version — a picture, an encrypted file, a new
  untitled tab, a file with nothing to write — nor by the automatic save, which has nobody at the
  keyboard to answer. Typing a note there does the same thing *Create version* does to the switches:
  it takes that file into history.
- **Comparing and restoring.** The Versions view lists the open file's history newest first. Each row
  opens the comparison popup, which shows any **two** sides of that history side by side: either side
  can be a recorded version or the text in the editor, with the clicked row on the left to start.
  Its controls are icons with the words in their tooltips — swap the two sides and *Restore* in the
  toolbar under the dropdowns, and show only the changes / fill the window / close at the right end
  of the title bar — because that bar is where the two texts get their width back, and a label in
  three languages would be the widest thing in it.
  The bar can be dragged, and the dialog resized from its right edge, bottom edge or corner; the size
  it had is kept across maximising, and both are forgotten when it closes, because a comparison is a
  look, not a layout. *Show only the changes* folds the view down to the hunks and a few lines around
  them, and the thin row under the diff says how many lines
  each side dropped, since a comparison that hides most of a file and says nothing about it can be
  argued into a wrong answer. Restoring puts a version's text into the editor and marks the tab
  unsaved; it never writes the file. Close without saving and nothing has changed on disk. Restoring
  does not record a version.
- **Not a cleanup.** Recorded history is never trimmed, and one version cannot be deleted on its own:
  history is stored as a chain, and taking a link out of the middle means rewriting everything after
  it. Settings → Versions → *Versions to list* bounds what is read, not what is kept; the only way to
  reclaim the disk is *Clear all versions*, which asks twice. If the growth ever matters more than the
  history, that is the switch to turn off.
- **Where it lives.** `<app data>\wrolp\shadow\`, one folder per file, named after the file the way
  drafts are. Each is a git repository with a single branch, and its content is your text — the same
  privacy level as the drafts folder, and deleted with it on uninstall. Nothing is written to the
  folders you edit, and a repository is never created for a file that was only opened.
- **Path is the identity.** Rename a file **inside the editor** and its history follows: the folder
  moves and the recorded name inside it stays as it was, which is what lets the timeline survive a
  rename without rewriting it. Rename it outside — Explorer, a sync client, `git mv` — and the new
  path finds nothing, so the list starts over. The old history is not lost, it is just no longer
  connected. Renaming onto a name that already has history keeps that name's own timeline and leaves
  the other one where it is; two histories are never merged.
- **Messages keep the language they were written in.** The label on a version is stored with it, so a
  history recorded in 中文 still says 初始版本 after you switch the interface to English.
