const root = document.documentElement;
const THEME_KEY = 'wrolp-theme';

function applyTheme(theme) {
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#fbfaff' : '#0d0e13';
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    const label = theme === 'light' ? toggle.dataset.labelDark : toggle.dataset.labelLight;
    if (label) { toggle.setAttribute('aria-label', label); toggle.title = label; }
  }
}

const themeToggle = document.querySelector('[data-theme-toggle]');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  });
}

applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark');

const media = window.matchMedia('(prefers-color-scheme: light)');
media.addEventListener('change', (event) => {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch {}
  if (!stored) applyTheme(event.matches ? 'light' : 'dark');
});

function closeAll() {
  const nav = document.getElementById('site-nav');
  const navBtn = document.querySelector('[data-nav-toggle]');
  if (nav && navBtn) {
    nav.classList.remove('is-open');
    navBtn.setAttribute('aria-expanded', 'false');
  }
  const sidebar = document.querySelector('[data-docs-sidebar]');
  const docsBtn = document.querySelector('[data-docs-toggle]');
  const backdrop = document.querySelector('[data-docs-backdrop]');
  if (sidebar && docsBtn) {
    sidebar.classList.remove('is-open');
    docsBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('docs-nav-open');
    if (backdrop) backdrop.hidden = true;
  }
}

const navToggle = document.querySelector('[data-nav-toggle]');
const siteNav = document.getElementById('site-nav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  siteNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeAll();
  });
}

const docsToggle = document.querySelector('[data-docs-toggle]');
const docsSidebar = document.querySelector('[data-docs-sidebar]');
const docsBackdrop = document.querySelector('[data-docs-backdrop]');
if (docsToggle && docsSidebar) {
  docsToggle.addEventListener('click', () => {
    const open = !docsSidebar.classList.contains('is-open');
    docsSidebar.classList.toggle('is-open', open);
    docsToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('docs-nav-open', open);
    if (docsBackdrop) docsBackdrop.hidden = !open;
    if (open) {
      const current = docsSidebar.querySelector('[aria-current="page"]');
      if (current) current.scrollIntoView({ block: 'nearest' });
    }
  });
  docsSidebar.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeAll();
  });
  if (docsBackdrop) docsBackdrop.addEventListener('click', closeAll);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeAll();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 960) closeAll();
});

const tocLinks = Array.from(document.querySelectorAll('.toc-list a[href^="#"]'));
if (tocLinks.length) {
  const targets = tocLinks
    .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
    .filter(Boolean);

  const mark = (id) => {
    for (const link of tocLinks) {
      link.classList.toggle('is-active', decodeURIComponent(link.hash.slice(1)) === id);
    }
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const line = window.scrollY + 96;
    let active = targets[0];
    for (const target of targets) {
      if (target.offsetTop <= line) active = target;
      else break;
    }
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      active = targets[targets.length - 1];
    }
    if (active) mark(active.id);
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}