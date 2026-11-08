import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['zh', 'en'];
const README_FILE = { zh: 'README.zh.md', en: 'README.en.md' };
const NOTES_FILE = { zh: 'RELEASE_NOTES.zh.md', en: 'RELEASE_NOTES.en.md' };
const SOURCE_FILE = { zh: 'README.zh.md', en: 'README.md' };

const read = (p) => readFile(join(root, p), 'utf8');
const config = JSON.parse(await read('content/site.json'));
const project = config.project;
const pages = config.docs.pages;

marked.setOptions({ gfm: true, breaks: false });

/* Helpers ------------------------------------------------------------------------ */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, entity) => {
    if (entity[0] === '#') {
      const code = /^[xX]/.test(entity.slice(1))
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return named[entity] ?? whole;
  });
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, ''));
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s+/g, '-');
}

function makeSlugger() {
  const seen = new Map();
  return (text) => {
    const base = slugify(text) || 'section';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

function rel(from, to) {
  const fromDirs = from.split('/').slice(0, -1);
  const toParts = to.split('/');
  let i = 0;
  while (i < fromDirs.length && i < toParts.length - 1 && fromDirs[i] === toParts[i]) i++;
  const up = fromDirs.slice(i).map(() => '..');
  return [...up, ...toParts.slice(i)].join('/');
}

const homePath = (lang) => (lang === 'en' ? 'index.html' : 'zh/index.html');
const pagePath = (slug, lang) => (lang === 'en' ? `docs/${slug}.html` : `zh/docs/${slug}.html`);

function render(template, context) {
  const missing = new Set();
  const out = template
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, key) => {
      if (!(key in context)) { missing.add(key); return ''; }
      return String(context[key]);
    })
    .replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!(key in context)) { missing.add(key); return ''; }
      return escapeHtml(context[key]);
    });
  if (missing.size) throw new Error(`Template keys missing: ${[...missing].join(', ')}`);
  return out;
}

/* Markdown structure ------------------------------------------------------------- */

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

function toggleFence(state, line) {
  const m = FENCE.exec(line);
  if (!m) return false;
  if (state.char === null) state.char = m[1][0];
  else if (m[1][0] === state.char && m[2].trim() === '') state.char = null;
  return true;
}

function splitSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const state = { char: null };
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (toggleFence(state, lines[i]) || state.char !== null) continue;
    const h = /^##[ \t]+(.+?)[ \t]*$/.exec(lines[i]);
    if (h) starts.push({ index: i, title: h[1] });
  }
  const cut = starts.length ? starts[0].index : lines.length;
  return {
    preamble: lines.slice(0, cut).join('\n'),
    sections: starts.map((s, i) => ({
      title: s.title,
      body: lines.slice(s.index, i + 1 < starts.length ? starts[i + 1].index : lines.length)
        .join('\n').trimEnd(),
    })),
  };
}

function cleanPreamble(preamble) {
  const out = [];
  let inHtml = false;
  for (const line of preamble.split(/\r?\n/)) {
    if (/^<p\s/i.test(line)) { inHtml = true; }
    if (inHtml) { if (/<\/p>/i.test(line)) inHtml = false; continue; }
    if (/^#\s+/.test(line)) continue;
    if (/^(\[[^\]]+\]\([^)]*\)|English|简体中文|[|·•\-—\s])+$/.test(line) && /\]\(/.test(line)) continue;
    if (/^\s*---\s*$/.test(line)) continue;
    out.push(line);
  }
  return out.join('\n').trim();
}

function dropLeadingHeadingAndPromote(body) {
  const lines = body.split(/\r?\n/);
  if (/^##[ \t]/.test(lines[0])) lines.shift();
  const state = { char: null };
  const out = [];
  for (const line of lines) {
    if (toggleFence(state, line) || state.char !== null) { out.push(line); continue; }
    out.push(line.replace(/^(#{3,6})([ \t])/, (_, hashes, space) => hashes.slice(1) + space));
  }
  return out.join('\n').trim();
}

/* Load and assemble -------------------------------------------------------------- */

const docs = {};
for (const lang of LANGS) {
  const readme = splitSections(await read(`content/${README_FILE[lang]}`));
  const notes = splitSections(await read(`content/${NOTES_FILE[lang]}`));
  if (readme.sections.length !== 16) {
    throw new Error(`${README_FILE[lang]}: expected 16 H2 sections, found ${readme.sections.length}`);
  }
  docs[lang] = { readme, notes, license: await read('content/LICENSE') };
}

const assigned = pages.flatMap((page) => page.sections ?? []).sort((a, b) => a - b);
const expected = Array.from({ length: 16 }, (_, i) => i);
if (assigned.join() !== expected.join()) {
  throw new Error(`content/site.json: page sections must cover 0–15 exactly once, got [${assigned}]`);
}

const pageMarkdown = {};
const pageSourceTitles = {};
for (const lang of LANGS) {
  pageMarkdown[lang] = new Map();
  pageSourceTitles[lang] = new Map();
  for (const page of pages) {
    let md;
    let titles = [];
    if (page.source === 'releaseNotes') {
      titles = docs[lang].notes.sections.map((s) => s.title);
      md = [cleanPreamble(docs[lang].notes.preamble), ...docs[lang].notes.sections.map((s) => s.body)]
        .filter(Boolean).join('\n\n');
    } else {
      const bodies = (page.sections ?? []).map((i) => docs[lang].readme.sections[i]?.body);
      if (bodies.some((b) => !b)) throw new Error(`${lang}/${page.slug}: missing section`);
      titles = (page.sections ?? []).map((i) => docs[lang].readme.sections[i].title);
      md = bodies.join('\n\n');
      if (bodies.length === 1 && page.slug !== 'index') md = dropLeadingHeadingAndPromote(md);
      if (page.slug === 'index') md = `${cleanPreamble(docs[lang].readme.preamble)}\n\n${md}`;
    }
    pageMarkdown[lang].set(page.slug, md.trim());
    pageSourceTitles[lang].set(page.slug, titles);
  }
}

const rawHtml = {};
const pageHeadings = {};
const anchorMap = {};
for (const lang of LANGS) {
  rawHtml[lang] = new Map();
  pageHeadings[lang] = new Map();
  anchorMap[lang] = new Map();
  for (const page of pages) {
    const html = marked.parse(pageMarkdown[lang].get(page.slug));
    rawHtml[lang].set(page.slug, html);
    const slugger = makeSlugger();
    const headings = [];
    for (const m of html.matchAll(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/g)) {
      const text = stripTags(m[2]).trim();
      const id = slugger(text);
      headings.push({ depth: Number(m[1]), text, id });
      if (!anchorMap[lang].has(id)) anchorMap[lang].set(id, { page: page.slug, id });
    }
    pageHeadings[lang].set(page.slug, headings);
  }
  // A single-section page drops its own H2, so links aimed at that section from
  // elsewhere in the README must resolve to the page itself rather than a dead fragment.
  for (const page of pages) {
    const headings = pageHeadings[lang].get(page.slug);
    for (const title of pageSourceTitles[lang].get(page.slug)) {
      const key = slugify(title);
      if (!key || anchorMap[lang].has(key)) continue;
      const surviving = headings.find((h) => h.text === title);
      anchorMap[lang].set(key, { page: page.slug, id: surviving ? surviving.id : null });
    }
  }
}

/* HTML post-processing ----------------------------------------------------------- */

function rewriteLinks(html, { lang, slug, from, assets }) {
  const link = (target) => rel(from, target);
  return html.replace(/<a\s([^>]*?)href="([^"]*)"([^>]*)>/g, (whole, pre, href, post) => {
    let target = href;
    let external = /^https?:\/\//i.test(href);
    let rest = `${pre}${post}`.replace(/\s*(target|rel)="[^"]*"/g, '').trim();

    if (href.startsWith('#')) {
      let decoded = href.slice(1);
      try { decoded = decodeURIComponent(decoded); } catch {}
      const hit = anchorMap[lang].get(decoded);
      if (hit) {
        if (hit.id === null) target = link(pagePath(hit.page, lang));
        else if (hit.page === slug) target = `#${encodeURIComponent(hit.id)}`;
        else target = `${link(pagePath(hit.page, lang))}#${encodeURIComponent(hit.id)}`;
      }
    } else if (!external && !/^(mailto:|tel:)/i.test(href)) {
      const base = href.replace(/^\.\//, '');
      if (/^LICENSE$/i.test(base)) { target = project.licenseUrl; external = true; }
      else if (/^README(\.zh)?\.md$/i.test(base)) target = link(pagePath('index', lang));
      else if (/^RELEASE_NOTES(\.zh)?\.md$/i.test(base)) target = link(pagePath('changelog', lang));
      else if (/^branding\//i.test(base)) target = assets + base.slice('branding/'.length).replace(/^logo\./, 'img/logo.');
      else { target = `${project.github}/blob/main/${base}`; external = true; }
    }

    const attrs = external ? `${rest ? `${rest} ` : ''}target="_blank" rel="noopener noreferrer"` : rest;
    return `<a ${attrs ? `${attrs} ` : ''}href="${target}">`;
  });
}

function injectHeadingIds(html, headings) {
  let i = 0;
  return html.replace(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/g, (whole, depth, inner) => {
    const heading = headings[i++];
    if (!heading) return whole;
    const anchor = `<a class="anchor-link" href="#${encodeURIComponent(heading.id)}">#</a>`;
    return `<h${depth} id="${escapeHtml(heading.id)}">${inner}${anchor}</h${depth}>`;
  });
}

function decorate(html) {
  return html
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/<pre><code class="language-([^"]+)">/g, '<pre data-lang="$1"><code class="language-$1">');
}

/* Blocks ------------------------------------------------------------------------- */

function sidebarNav(lang, from, current) {
  return config.docs.groups.map((group) => {
    const items = pages.filter((p) => p.group === group.id).map((p) => {
      const active = p.slug === current ? ' aria-current="page"' : '';
      return `<li><a href="${escapeHtml(rel(from, pagePath(p.slug, lang)))}"${active}>${escapeHtml(p.title[lang])}</a></li>`;
    }).join('');
    return `<div class="docs-nav-group"><p class="docs-nav-heading">${escapeHtml(group.title[lang])}</p><ul class="docs-nav-list">${items}</ul></div>`;
  }).join('');
}

function tocHtml(headings) {
  const items = headings.filter((h) => h.depth === 2 || h.depth === 3);
  if (!items.length) return '';
  const rows = items.map((h) =>
    `<li class="${h.depth === 3 ? 'toc-h3' : 'toc-h2'}"><a href="#${encodeURIComponent(h.id)}">${escapeHtml(h.text)}</a></li>`
  ).join('');
  return `<ul class="toc-list">${rows}</ul>`;
}

function pagerHtml(lang, from, slug) {
  const index = pages.findIndex((p) => p.slug === slug);
  const cell = (page, direction, label) => {
    if (!page) return '<span class="pager-spacer"></span>';
    return `<a class="pager-link is-${direction}" href="${escapeHtml(rel(from, pagePath(page.slug, lang)))}">
      <span class="pager-dir"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>${escapeHtml(label)}</span>
      <span class="pager-name">${escapeHtml(page.title[lang])}</span>
    </a>`;
  };
  const ui = config.ui[lang];
  return cell(pages[index - 1], 'prev', ui.prevPage) + cell(pages[index + 1], 'next', ui.nextPage);
}

function hubHtml(lang, from) {
  const ui = config.ui[lang];
  const cards = pages.filter((p) => p.slug !== 'index').map((p) =>
    `<a class="hub-card" href="${escapeHtml(rel(from, pagePath(p.slug, lang)))}">
      <span class="hub-card-title">${escapeHtml(p.title[lang])}<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span>
      <p>${escapeHtml(p.description[lang])}</p>
    </a>`
  ).join('');
  return `<p class="hub-lead">${escapeHtml(ui.docsHubLead)}</p><div class="hub-grid">${cards}</div>`;
}

function landingBlocks(lang, from) {
  const t = config.landing[lang];
  const href = (target) => escapeHtml(rel(from, target));

  const featureCards = t.features.map((f) =>
    `<article class="feature-card">
      <span class="feature-icon"><svg class="icon" aria-hidden="true"><use href="#i-${escapeHtml(f.icon)}"/></svg></span>
      <h3>${escapeHtml(f.title)}</h3>
      <p>${escapeHtml(f.body)}</p>
      <a class="feature-link" href="${href(f.href)}" aria-label="${escapeHtml(`${config.ui[lang].nav_docs} — ${f.title}`)}">${escapeHtml(config.ui[lang].nav_docs)}<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>
    </article>`
  ).join('');

  const moreItems = t.more.map((m) =>
    `<li><a href="${href(m.href)}">${escapeHtml(m.text)}</a></li>`
  ).join('');

  const facts = t.local_facts.map((f) =>
    `<div class="fact"><dt>${escapeHtml(f.k)}</dt><dd>${escapeHtml(f.v)}</dd></div>`
  ).join('');

  const shortcutRows = t.shortcuts.map((s) =>
    `<li><span class="shortcut-keys">${s.keys.map((k, i) =>
      `${i ? '<span class="plus">+</span>' : ''}<kbd>${escapeHtml(k)}</kbd>`
    ).join('')}</span><span class="shortcut-action">${escapeHtml(s.action)}</span></li>`
  ).join('');

  const stackItems = t.stack.map((s) =>
    `<li><span class="stack-name">${escapeHtml(s.name)}</span><span class="stack-note">${escapeHtml(s.note)}</span></li>`
  ).join('');

  const steps = t.download_steps.map((s) =>
    `<li class="step"><span class="step-n">${escapeHtml(s.n)}</span><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></li>`
  ).join('');

  return { featureCards, moreItems, facts, shortcutRows, stackItems, steps };
}

/* Page assembly ------------------------------------------------------------------ */

const layout = await read('src/layout.html');
const landingTemplate = await read('src/landing.html');
const docsTemplate = await read('src/docs.html');
const output = new Map();

function baseContext(lang, from, title, description) {
  const ui = config.ui[lang];
  const t = config.landing[lang];
  const depth = from.split('/').length - 1;
  const assets = '../'.repeat(depth) + 'assets/';
  const home = homePath(lang);
  const other = lang === 'zh' ? 'en' : 'zh';
  const counterpart = from.startsWith('zh/') ? from.slice(3) : `zh/${from}`;
  const isHome = from === home;

  return {
    ...ui,
    ...t,
    lang: ui.lang,
    title,
    description,
    assets,
    bodyClass: isHome ? 'is-home' : 'is-docs',
    homeHref: rel(from, home),
    featuresHref: isHome ? '#features' : `${rel(from, home)}#features`,
    downloadSectionHref: isHome ? '#download' : `${rel(from, home)}#download`,
    docsHref: rel(from, pagePath('index', lang)),
    changelogHref: rel(from, pagePath('changelog', lang)),
    editorHref: rel(from, pagePath('editor', lang)),
    developmentHref: rel(from, pagePath('development', lang)),
    licenseHref: rel(from, pagePath('license', lang)),
    githubHref: project.github,
    releasesHref: project.releases,
    latestHref: project.latest,
    downloadHref: project.download,
    issuesHref: project.issues,
    siteRepoHref: ui.footerSiteRepo,
    copyright: project.copyright,
    langSwitchHref: rel(from, counterpart),
    langSwitchLabel: ui.langSwitch,
    langSwitchCode: config.ui[other].lang,
    docsActive: '',
    changelogActive: '',
  };
}

for (const lang of LANGS) {
  const from = homePath(lang);
  const t = config.landing[lang];
  const context = {
    ...baseContext(lang, from, t.pageTitle, t.pageDescription),
    ...landingBlocks(lang, from),
  };
  const body = render(landingTemplate, context);
  output.set(from, render(layout, { ...context, body }));
}

for (const lang of LANGS) {
  for (const page of pages) {
    const from = pagePath(page.slug, lang);
    const headings = pageHeadings[lang].get(page.slug);
    const ui = config.ui[lang];
    const depth = from.split('/').length - 1;
    const assets = '../'.repeat(depth) + 'assets/';

    let content = rawHtml[lang].get(page.slug);
    content = rewriteLinks(content, { lang, slug: page.slug, from, assets });
    content = injectHeadingIds(content, headings);
    content = decorate(content);

    if (page.source === 'license') {
      content += `<div class="license-text">${escapeHtml(docs[lang].license.trim())}</div>`;
    }

    const context = {
      ...baseContext(lang, from, `${page.title[lang]} · WROLP Editor`, page.description[lang]),
      docsActive: page.slug === 'changelog' ? '' : ' aria-current="page"',
      changelogActive: page.slug === 'changelog' ? ' aria-current="page"' : '',
      docTitle: page.title[lang],
      docDescription: page.description[lang],
      sourceHref: `${project.github}/blob/main/${SOURCE_FILE[lang]}`,
      sidebarNav: sidebarNav(lang, from, page.slug),
      toc: tocHtml(headings),
      tocHead: headings.length ? `<p class="toc-title">${escapeHtml(config.ui[lang].tocTitle)}</p>` : '',
      pager: pagerHtml(lang, from, page.slug),
      hub: page.slug === 'index' ? hubHtml(lang, from) : '',
      content,
    };
    const body = render(docsTemplate, context);
    output.set(from, render(layout, { ...context, body }));
  }
}

/* Write -------------------------------------------------------------------------- */

const generatedDirs = ['docs', 'zh'];
const stale = [];
for (const dir of generatedDirs) {
  const walk = async (prefix) => {
    let entries;
    try { entries = await readdir(join(root, prefix), { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.html') && !output.has(path)) stale.push(path);
    }
  };
  await walk(dir);
}

for (const [path, html] of output) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
}
for (const path of stale) await rm(join(root, path), { force: true });

const byLang = LANGS.map((lang) => `${lang}: 1 home + ${pages.length} docs`).join(', ');
console.log(`Built ${output.size} pages (${byLang})`);
if (stale.length) console.log(`Removed ${stale.length} stale page(s): ${stale.join(', ')}`);

/* Link audit --------------------------------------------------------------------- */

const broken = [];
for (const [path, html] of output) {
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
    if (url.startsWith('#')) {
      const id = decodeURIComponent(url.slice(1));
      if (id && !html.includes(`id="${escapeHtml(id)}"`)) broken.push(`${path} -> ${url} (missing anchor)`);
      continue;
    }
    const [file, fragment] = url.split('#');
    const resolved = resolve(dirname(join(root, path)), file);
    const relative = resolved.slice(root.length + 1).replace(/\\/g, '/');
    if (!output.has(relative)) {
      try { await readFile(resolved); }
      catch { broken.push(`${path} -> ${url}`); continue; }
    }
    if (fragment && output.has(relative)) {
      const target = output.get(relative);
      const id = decodeURIComponent(fragment);
      if (!target.includes(`id="${escapeHtml(id)}"`)) broken.push(`${path} -> ${url} (missing anchor)`);
    }
  }
}
if (broken.length) {
  console.error(`\nBroken links (${broken.length}):\n${broken.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Link audit: all internal links and anchors resolve.');
}