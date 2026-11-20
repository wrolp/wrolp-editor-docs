An encrypted file is a **self-describing container**, not a "txt that happens to be encrypted":
it is recognised by its magic bytes, never by its extension.

![The dialog that sets the password of a new encrypted file](branding/shots/encrypt-dialog.png)

> **Lose the password, lose the file.** There is no master password, no recovery code and no
> back door. The key is derived from the password plus a per-file random salt with Argon2id, and
> nothing that could lead back to the password is stored anywhere.

## Container format

```text
off   len   contents
0     8     magic "WROLPENC"
8     1     format version (1 today)
9     1     KDF id (1 = argon2id)
10    4     m_cost, KiB (u32 LE)
14    4     t_cost (u32 LE)
18    4     p_cost (u32 LE)
22    16    salt, random per file
38    12    nonce, re-randomised on every write
50    ...   AES-256-GCM(plaintext) || 16-byte tag
```

- **The whole 50-byte header is the AEAD associated data.** Changing any byte of it — including
  lowering `m_cost` to make a brute force cheaper — fails authentication instead of being honoured.
- The default KDF parameters are Argon2id with m=65536 KiB, t=3, p=1, measured at roughly 70 ms per
  derivation in a release build on this machine. They live in the header, so changing the defaults
  never locks an older file out, and **a save reuses the file's own salt and parameters**: no new
  salt, no quiet change of cost. Changing the password is the one operation that picks a fresh salt.
- Every write is atomic — a temporary file plus a rename. A truncated ciphertext is not damaged, it
  is gone, so there is no alternative here.
- The size cap is applied to the **ciphertext** and is still 8 MiB. A 7.9 MiB plaintext crosses the
  line once encrypted and reports `file_too_large`; that is not the editor misbehaving.
- `age` is the one foreign format named explicitly (`age-encryption.org/` header) and refused with
  `encrypted_foreign_format`: it is not opened as text and not written back. Any other foreign
  binary stays the ordinary undecodable error. **No foreign encryption format is read or written.**

## The three ways in

| Entry | Behaviour |
| --- | --- |
| Tab menu → "Save as encrypted…" | Path first, password second; the buffer is written out as a new container and the tab becomes encrypted and unlocked |
| Explorer menu → "New encrypted file" | Asks for a password, writes an empty container, opens it; a name that is taken is refused |
| Tab menu → "Change password…" / "Remove encryption…" | The first checks the current password and re-encrypts the whole file; the second checks it and writes the text back as plain UTF-8 |

A new file typed without an extension gets `.wrolpenc`. Naming it after the container rather than
after a text format matters here: nothing else can read the file, and an extension that promised
text would invite the user to open it in a tool that shows them noise. Recognition does not depend
on the extension, so a container under any name is still recognised. Removing encryption writes
UTF-8, so a file that was GBK becomes UTF-8.

Changing a password **requires the current one** and will not accept a cached key instead: the user
is asserting what the old password is, and acting on a wrong assertion is how somebody gets locked
out of their own file.

## Unlocking, the key cache and the idle lock

- A password is used once. The key derived from it is kept in process memory, indexed by normalized
  path; the password itself is dropped, never written to disk and never sent back to the frontend.
- The **idle lock** is Settings → Encryption → *Lock encrypted files after*, 10 minutes by default,
  `0` for never, capped at 1440. When it fires, drafts are flushed first — the key still exists at
  that point, so a draft can still be sealed — and then every key in memory is dropped. Any keypress
  or click counts as presence, not only typing.
- **The lock does not clear the screen**, which is a deliberate trade: the text on display was
  decrypted with a password the user typed, and what the lock means is that nothing more can be
  written or drafted from here, not that the document is taken back from somebody reading it. What
  that buys is an intact undo stack and an intact dirty flag; what it costs is that a locked window
  can still be screenshotted or read over a shoulder. A locked tab's editor is read-only, and saving
  it fails loudly and asks for the password — nothing is dropped silently.
- A tab that was never decrypted shows a locked overlay instead, and clicking it asks again. It does
  **not** pass placeholder text off as content, so it stays out of undo, out of comparisons and out
  of the dirty flag; a reload from disk cannot wipe it either.
- On session restore, encrypted tabs queue for their passwords and one dialog asks them in turn. A
  wrong password is retried in place rather than dropping the question.

![The unlock dialog shown for an encrypted tab on session restore](branding/shots/unlock-dialog.png)

## Remembering passwords (opt-in, off by default)

- Only ticking "Remember this password on this computer" stores anything, and it goes into the
  **Windows credential store** as service `com.wrolp.editor`, account `enc-<sha256 of the path in
  hex>`. What is stored is a digest of the path, not the path, so the store does not show your file
  names.
- The cap is 64 entries and a further one is refused. That is not a security limit — the store is
  encrypted per user either way — but an abandoned file should not leave an entry behind forever
  without anybody noticing how many have piled up.
- A remembered password that does not open the file (usually because it was re-encrypted elsewhere)
  counts as **no key**, not as a wrong password: you are asked, and the useless entry is deleted.
  Reporting "wrong password" to somebody who typed nothing is telling them they did something they
  did not do.
- Settings → Encryption shows how many are kept and forgets them all.
- **Renaming forgets.** The remembered entry for a renamed file is dropped and the password has to
  be typed again. A credential's account is a digest of the path and cannot be reversed, so when a
  *directory* is renamed there is no way to tell which entries should move; forgetting is the only
  honest answer. The key in the session cache **does** move with the path: renaming does not touch
  the file's contents, and locking a document somebody is editing because they renamed it is not
  defensible.
- **Uninstalling does not clear the credential store.** Unlike the context-menu registry entry, the
  `enc-*` entries are system-level residue and survive. Use "Forget all" before uninstalling, or
  delete them under `com.wrolp.editor` yourself.

## Drafts and deletion

- The draft of an encrypted file is sealed with **that file's own key** and stored as
  `{"v":2,"path":"<plaintext path>","nonce":"<hex>","data":"<hex>"}`, where `data` is the ciphertext
  of the ordinary draft JSON. Keeping the path outside the envelope is deliberate: a path is not a
  secret (it is a file name in a directory listing), and having it in the clear is what lets a
  rename move a sealed draft to its new key **without** the key. The older unwrapped JSON is still
  readable, so there is no migration step.
- Whether a file is encrypted is decided by **the disk** — the first 50 bytes of the header, never a
  whole read — and not by a flag from the frontend: another window may have removed the encryption,
  or the file may have been replaced outright.
- With no key a draft cannot be written and is **dropped silently**: drafting is background
  behaviour and an error there is an interruption, while the save path fails loudly and asks for the
  password, so nothing is lost without the user hearing about it. With no key a draft is read as
  "no draft" but the file is **not deleted** — unlocking and opening the same path decrypts it again.
- A draft shares the file's key, and so shares one nonce birthday bound with it (about 2^32 writes).
  That is unreachable at text-editor scale; it is recorded rather than fixed.
- Deleting an encrypted file parks a **plaintext** rescue copy under `kept/`, on purpose: a rescue
  copy that cannot be opened is not a rescue. The dialog says so.
