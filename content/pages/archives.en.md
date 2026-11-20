## Looking inside an archive

Right-click a zip, tar, tar.gz or 7z file in the Explorer and choose **Browse the archive**. The archive opens as a folder in the tree: the listing is read first, then the contents are unpacked into a cache directory the app owns, and from that point every viewer in the app works on them exactly as it does on any other file — text, Markdown, PDF, pictures and Office documents included.

The format is read from the file's bytes, not its name, so a zip renamed to `.bin` still opens. zip (including zip64), tar, tar.gz and 7z are read; rar is not supported and says so. Office files are also zip containers, but they open in the Office viewer rather than as an archive.

The unpacked folder is read-only: nothing in it can be renamed, deleted, pasted into or saved over, and its rows carry a badge saying so. **Export to…** copies a file or a folder out to where you want it, and **Close and clean** closes the folder and deletes its copy.

## Passwords

An encrypted archive is asked for a password in a fixed order, and only when every earlier step has failed is the prompt shown:

1. the password already used for this archive in this session,
2. the rules configured in Settings → Archives, matched against the archive's file name from top to bottom, first match wins,
3. the default password set on that page,
4. a prompt, which appears immediately once the archive has failed three times automatically.

A Chinese password is tried as UTF-8 first and, if that does not open an entry, as GBK — the two encodings actual archives are written with. Neither the default password nor the rules are written to the Windows Credential Manager; they are sealed with DPAPI in `archive-passwords.json` inside the app data directory. A password typed into the prompt lives in memory for this session only, so closing the app forgets it.

## Pictures without unpacking

Pictures inside an archive open in the gallery straight from the archive, without being unpacked first: the gallery reads the entry out of the zip or 7z on demand. In a zip or a 7z the entry is decoded only when it is shown, so a folder of photographs can be browsed without writing a copy to disk. tar.gz is a stream with no index to seek in, so its pictures are read from the unpacked copy instead — the gallery says so if one is asked for before the archive has been unpacked.

## The cache, and how it goes away

Unpacked archives live under `%APPDATA%\com.wrolp.editor\archive-cache\<digest>\`, one directory per archive, keyed by its path, size and modification time; opening the same archive again reuses the copy rather than unpacking it twice.

Settings → General → **Archive cache** decides what happens afterwards. By default the whole cache is deleted when the app exits. The other choice keeps it for a number of days and sweeps directories older than that the next time an archive is unpacked. **Close and clean** in the folder's banner deletes one archive's copy at once, and a crash leaves the lazy sweep to tidy up.

Unpacking is treated as writing somebody else's bytes to disk, so the limits are part of the feature rather than an option: entries that would escape the target directory, use a Windows device name or end in a dot or a space are refused, links inside a tar are not created, case-only name collisions are renamed rather than overwritten, and entry count, single-entry size, total size and compression ratio all have ceilings — 2 GiB of unpacked data by default.
