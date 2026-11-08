import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(root, '..', 'wrolp-editor');

const files = [
  ['README.zh.md', 'content/README.zh.md'],
  ['README.md', 'content/README.en.md'],
  ['RELEASE_NOTES.zh.md', 'content/RELEASE_NOTES.zh.md'],
  ['RELEASE_NOTES.md', 'content/RELEASE_NOTES.en.md'],
  ['LICENSE', 'content/LICENSE'],
  ['branding/logo.svg', 'assets/img/logo.svg'],
  ['src-tauri/icons/icon.ico', 'assets/icons/favicon.ico'],
  ['src-tauri/icons/32x32.png', 'assets/icons/favicon-32.png'],
  ['src-tauri/icons/128x128@2x.png', 'assets/icons/icon-256.png'],
];

for (const [from, to] of files) {
  const target = join(root, to);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(source, from), target);
  console.log(`${from} -> ${to}`);
}

// Screenshots the READMEs embed as branding/shots/*.png land under assets/img/shots/.
const shotsSource = join(source, 'branding', 'shots');
const shotsTarget = join(root, 'assets', 'img', 'shots');
await mkdir(shotsTarget, { recursive: true });
for (const file of await readdir(shotsSource)) {
  if (!file.endsWith('.png')) continue;
  await copyFile(join(shotsSource, file), join(shotsTarget, file));
  console.log(`branding/shots/${file} -> assets/img/shots/${file}`);
}

console.log(`\nSynced from ${source}`);