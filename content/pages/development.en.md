## Requirements

- Windows 10/11 with the WebView2 runtime (preinstalled on current Windows)
- Rust with the MSVC toolchain (`x86_64-pc-windows-msvc`) and the Visual Studio C++ Build Tools workload
- Node.js `^20.19` or `>=22.12` (required by Vite 8), with npm

## Develop

```bash
npm install
npm run tauri dev
```

A debug build renders the page served by Vite at `localhost:1520`. If the context-menu entry
points at `target/debug/wrolp-editor.exe`, right-clicking a file only works while that dev
server is running — otherwise the window shows a connection-refused page. Point the entry at
the installed build for normal use (Settings → context menu shows which path is registered).

## Build an installer

```bash
npm run tauri build
# -> src-tauri/target/release/bundle/nsis/WROLP Editor_<version>_x64-setup.exe
```

Only the NSIS target is configured (`bundle.targets: ["nsis"]`).

## Publish a release

```bash
npm run release   # clean target/ and dist/, then build the installer; refuses unless the three
                  # version fields agree, the tree is clean, and v<version> is a local tag on HEAD
npm run upload    # publish v<version>: the same checks again, plus a version ahead of what is live
# or: npm run publish
```

A release has to be describable afterwards, so both scripts stop before they touch anything. The
working tree must be clean with untracked files included — they would be built into the installer
and belong to no commit — and `v<version>` must already be a local tag on HEAD, which is what makes
the tag, the sources and the binary the same release. `upload` reads the releases already on GitHub
and refuses a version that is not ahead of the newest one: clients compare versions, so an equal
number reads as "up to date" while the upload swaps the very file they would download. Tag the bump
once it is committed (`git tag -a v0.0.2 -m "0.0.2" && git push origin v0.0.2`), and note that a
plain `npm run tauri build` stays free of all of this — it is the unsigned, local build.

`upload` needs the `gh` CLI, authenticated with push access to the repository; the repository
comes from `git remote get-url origin` (override with `--repo owner/name`), and the command
accepts `--tag`, `--notes`, `--draft`, `--pre` and `--dry-run`. A release it has to create is
created with `--target` set to the tag's own commit, so it cannot land on whatever the default
branch happened to point at while the binary came from somewhere else.

The build is signed with `.tauri/priv.key` (untracked; generate it with
`npx tauri signer generate -w .tauri/priv.key` and keep it backed up — losing it means existing
installs can no longer accept updates). `release` writes `latest.json` beside the installer and
`upload` attaches both; the app reads it from
`https://github.com/wrolp/wrolp-editor/releases/latest/download/latest.json`.

The release notes are two hand-written files at the repository root, one per language:
`RELEASE_NOTES.md` (English) and `RELEASE_NOTES.zh.md` (简体中文). `release` reads them for
`latest.json`'s `notes` and `upload` for the GitHub release body, joined as one text with the
English above a rule and the Chinese under it; `--notes "..."` overrides both for a one-off
about a single build.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port 1520 (used by `tauri dev`) |
| `npm run build` | `tsc --noEmit`-style type check plus production bundle into `dist/` |
| `npm run tauri` | Tauri CLI passthrough (`dev`, `build`, `icon`, …) |
| `npm run release` | Gate (versions agree, clean tree, `v<version>` on HEAD), signed build, then `latest.json` |
| `npm run upload` | Gate again, then the installer and `latest.json` to the release at that commit |
| `npm run publish` | `release` followed by `upload` |
