/*
  Builds the static site into dist/ from the list in sites.js.
  Every site gets an area on the homepage and a page at /<slug>/.
*/
const fs = require("node:fs");
const path = require("node:path");
const sites = require("./sites.js");

const SITE_URL = "https://cedlabs.net";
const SRC = path.join(__dirname, "src");
const DIST = path.join(__dirname, "dist");
const OG_DIR = path.join(SRC, "og");
const HOME_OG = "_home.png";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/* These would clash with a page id or a folder in dist/. */
const RESERVED_SLUGS = new Set(["404", "field", "mark", "og", "projects"]);

const ICONS = {
  copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"],
  lock: ["M6 11h12v9H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  back: ["M19 12H5", "M11 6l-6 6 6 6"],
  external: ["M7 17 17 7", "M8 7h9v9"],
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Allows **bold** and [text](https://link) in step text. */
function inline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.+?)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

function icon(name) {
  const paths = ICONS[name].map((d) => `<path d="${d}"/>`).join("");
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function validate() {
  const seen = new Set();
  sites.forEach((site) => {
    if (!/^[a-z0-9-]+$/.test(site.slug || "")) {
      throw new Error(`"${site.name}" needs a slug using only a-z, 0-9 and hyphens.`);
    }
    if (RESERVED_SLUGS.has(site.slug) || site.slug.startsWith("area-")) {
      throw new Error(`The slug "${site.slug}" is reserved. Pick another one.`);
    }
    if (seen.has(site.slug)) throw new Error(`Duplicate slug: ${site.slug}`);
    seen.add(site.slug);
    ["name", "url", "summary", "accent"].forEach((field) => {
      if (!site[field]) throw new Error(`"${site.name || site.slug}" is missing ${field}.`);
    });
    ["accent", "accent2"].forEach((field) => {
      if (site[field] !== undefined && !HEX_COLOR.test(site[field])) {
        throw new Error(`"${site.name}" needs ${field} as a 6-digit hex colour such as #6aa8ff.`);
      }
    });
    if (!fs.existsSync(path.join(OG_DIR, `${site.slug}.png`))) {
      console.warn(`Warning: ${site.name} has no preview image, so it will use the homepage one. Run npm run og.`);
    }
  });
  if (!fs.existsSync(path.join(OG_DIR, HOME_OG))) {
    throw new Error("The homepage preview image is missing. Run npm run og.");
  }
}

const pad = (index) => String(index + 1).padStart(2, "0");
const accentStyle = (site) => `--accent:${site.accent};--accent2:${site.accent2 || site.accent}`;
const pageHref = (site) => `/${site.slug}/`;
const linkLabel = (site) => site.linkLabel || `Open ${site.name}`;

function art(site) {
  return `<canvas data-visual="${escapeHtml(site.visual || "rings")}" data-name="${escapeHtml(site.name)}" data-accent="${escapeHtml(site.accent)}" data-accent2="${escapeHtml(site.accent2 || site.accent)}" aria-hidden="true"></canvas>`;
}

function notePanel(note) {
  return `<div class="panel">
    <div class="panel-label">${icon("lock")}${escapeHtml(note.label)}</div>
    <p class="panel-text">${escapeHtml(note.text)}</p>
  </div>`;
}

function joinPanel(site) {
  const join = site.join;
  const details = (join.details || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<div class="panel">
    <div class="panel-label">${escapeHtml(join.label || "Server address")}</div>
    <div class="join-row">
      <code class="join-address">${escapeHtml(join.address)}</code>
      <button class="copy-button" type="button" data-copy="${escapeHtml(join.address)}" aria-label="Copy ${escapeHtml(site.name)} server address"><span class="copy-icon">${icon("copy")}</span><span class="copy-text">Copy</span></button>
    </div>
    <span class="copy-status sr-only" role="status" aria-live="polite"></span>
    ${details ? `<ul class="join-details">${details}</ul>` : ""}
  </div>`;
}

function panels(site) {
  return (site.note ? notePanel(site.note) : "") + (site.join ? joinPanel(site) : "");
}

function section(item) {
  const heading = `<h2>${escapeHtml(item.title)}</h2>`;
  if (item.kind === "tiles") {
    const tiles = item.items
      .map((tile) => `<article class="tile"><h3>${escapeHtml(tile.title)}</h3><p>${inline(tile.text)}</p></article>`)
      .join("");
    return `<section class="section">${heading}<div class="tiles">${tiles}</div></section>`;
  }
  if (item.kind === "steps") {
    const guides = item.groups
      .map((group) => {
        const steps = group.steps.map((step) => `<li><span>${inline(step)}</span></li>`).join("");
        const title = group.title ? `<h3>${escapeHtml(group.title)}</h3>` : "";
        const note = group.note ? `<p class="guide-note">${inline(group.note)}</p>` : "";
        return `<article class="guide">${title}<ol class="steps">${steps}</ol>${note}</article>`;
      })
      .join("");
    return `<section class="section">${heading}<div class="guides">${guides}</div></section>`;
  }
  throw new Error(`Unknown section kind: ${item.kind}`);
}

function footer() {
  const links = sites
    .map((site) => `<li><a href="${pageHref(site)}">${escapeHtml(site.name)}</a></li>`)
    .join("");
  return `<footer class="footer">
      <a href="/">cedlabs.net</a>
      <nav aria-label="All projects"><ul>${links}</ul></nav>
    </footer>`;
}

function socialTags(title, description, site) {
  const hasOwnImage = site && fs.existsSync(path.join(OG_DIR, `${site.slug}.png`));
  const image = `${SITE_URL}/og/${hasOwnImage ? `${site.slug}.png` : HOME_OG}`;
  const alt = site
    ? `${site.name}${site.tag ? `, ${site.tag}` : ""}, on cedlabs`
    : "cedlabs: a small lab, open to the public";
  return `<meta property="og:image" content="${image}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${escapeHtml(alt)}">`;
}

function layout({ title, description, urlPath, navLink, body, bodyClass, site, noindex }) {
  const style = site ? ` style="${accentStyle(site)}"` : "";
  const data = site
    ? ` data-accent="${escapeHtml(site.accent)}" data-accent2="${escapeHtml(site.accent2 || site.accent)}"`
    : "";
  const canonical = noindex
    ? '<meta name="robots" content="noindex">'
    : `<link rel="canonical" href="${SITE_URL}${urlPath}">
  <meta property="og:url" content="${SITE_URL}${urlPath}">`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${canonical}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="cedlabs">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${noindex ? "" : socialTags(title, description, site)}
  <meta name="theme-color" content="#07090e">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClass}"${style}${data}>
  <div class="backdrop" aria-hidden="true">
    <div class="glow glow-a"></div>
    <div class="glow glow-b"></div>
    <div class="glow glow-c"></div>
    <canvas id="field"></canvas>
  </div>

  <div class="page">
    <header class="nav">
      <a class="brand" href="/" aria-label="cedlabs home">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <defs><linearGradient id="mark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#79b2ff"/><stop offset=".55" stop-color="#a98cff"/><stop offset="1" stop-color="#58d68d"/></linearGradient></defs>
          <rect width="32" height="32" rx="9" fill="url(#mark)"/>
          <path d="M21.2 11.4a7 7 0 1 0 0 9.2" fill="none" stroke="#07090e" stroke-width="3.6" stroke-linecap="round"/>
          <circle cx="23.2" cy="16" r="2" fill="#07090e"/>
        </svg>
        cedlabs
      </a>
      ${navLink}
    </header>

    ${body}

    ${footer()}
  </div>

  <script src="/app.js"></script>
</body>
</html>
`;
}

function homePage() {
  const jump = sites
    .map((site, i) => `<a href="#${site.slug}" style="${accentStyle(site)}"><span>${pad(i)}</span>${escapeHtml(site.name)}</a>`)
    .join("");

  const areas = sites
    .map((site, i) => `<section class="area spot rise" id="${site.slug}" style="${accentStyle(site)};--delay:${180 + i * 110}ms" aria-labelledby="area-${site.slug}">
        <div class="area-art">
          ${art(site)}
          <span class="area-index">${pad(i)}</span>
        </div>
        <div class="area-body">
          ${site.tag ? `<p class="eyebrow">${escapeHtml(site.tag)}</p>` : ""}
          <h2 id="area-${site.slug}">${escapeHtml(site.name)}</h2>
          <p class="area-summary">${escapeHtml(site.summary)}</p>
          ${panels(site)}
          <div class="actions">
            <a class="button button-primary" href="${escapeHtml(site.url)}">${escapeHtml(linkLabel(site))}${icon("external")}</a>
            <a class="button button-ghost" href="${pageHref(site)}">About ${escapeHtml(site.name)}${icon("arrow")}</a>
          </div>
        </div>
      </section>`)
    .join("\n      ");

  const body = `<main>
      <section class="hero">
        <h1 class="rise">A small lab, <span>open to the public.</span></h1>
        <p class="rise" style="--delay: 90ms">Apps and game servers, built and run at cedlabs.net. Pick one and jump in.</p>
      </section>
      <nav class="jump rise" id="projects" style="--delay: 140ms" aria-label="Jump to a project">${jump}</nav>
      <div class="areas">
      ${areas}
      </div>
    </main>`;

  const names = sites.map((site) => site.name).join(", ");
  return layout({
    title: "cedlabs",
    description: `Apps and game servers at cedlabs.net: ${names}.`,
    urlPath: "/",
    bodyClass: "home",
    navLink: `<a class="nav-link" href="#projects">Projects <span>${String(sites.length).padStart(2, "0")}</span></a>`,
    body,
  });
}

function sitePage(site) {
  const page = site.page || {};
  const extraLinks = (site.links || [])
    .map((link) => `<a class="button button-ghost" href="${escapeHtml(link.url)}" rel="noopener">${escapeHtml(link.label)}${icon("external")}</a>`)
    .join("");
  const others = sites.filter((other) => other !== site);
  const more = others.length
    ? `<section class="section">
        <h2>More from cedlabs</h2>
        <div class="more">${others
          .map((other) => `<a class="more-card" href="${pageHref(other)}" style="${accentStyle(other)}"><span><strong>${escapeHtml(other.name)}</strong>${other.tag ? `<small>${escapeHtml(other.tag)}</small>` : ""}</span>${icon("arrow")}</a>`)
          .join("")}</div>
      </section>`
    : "";

  const body = `<main>
      <section class="site-hero">
        <div class="site-intro rise">
          <p class="crumbs"><a href="/">cedlabs</a> / ${escapeHtml(site.slug)}</p>
          ${site.tag ? `<p class="eyebrow">${escapeHtml(site.tag)}</p>` : ""}
          <h1>${escapeHtml(site.name)}</h1>
          <p class="lead">${escapeHtml(page.lead || site.summary)}</p>
          ${panels(site)}
          <div class="actions">
            <a class="button button-primary" href="${escapeHtml(site.url)}">${escapeHtml(linkLabel(site))}${icon("external")}</a>
            ${extraLinks}
          </div>
        </div>
        <div class="site-art rise" style="--delay: 120ms">${art(site)}</div>
      </section>
      ${(page.sections || []).map(section).join("\n      ")}
      ${page.notice ? `<p class="notice">${escapeHtml(page.notice)}</p>` : ""}
      ${more}
    </main>`;

  return layout({
    title: `${site.name} - cedlabs`,
    description: page.lead || site.summary,
    urlPath: pageHref(site),
    bodyClass: "subpage",
    site,
    navLink: `<a class="nav-link" href="/#${site.slug}">${icon("back")}All projects</a>`,
    body,
  });
}

function notFoundPage() {
  return layout({
    title: "Page not found - cedlabs",
    description: "This page does not exist on cedlabs.net.",
    urlPath: "/404.html",
    bodyClass: "home",
    noindex: true,
    navLink: '<a class="nav-link" href="/#projects">All projects</a>',
    body: `<main>
      <section class="hero">
        <h1 class="rise">Nothing here, <span>but plenty next door.</span></h1>
        <p class="rise" style="--delay: 90ms">That page does not exist.</p>
        <div class="actions rise" style="--delay: 140ms"><a class="button button-primary" href="/">Back to the homepage${icon("arrow")}</a></div>
      </section>
    </main>`,
  });
}

function write(relativePath, content) {
  const target = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

validate();
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
["styles.css", "app.js", "favicon.svg", "_headers"].forEach((file) => {
  fs.copyFileSync(path.join(SRC, file), path.join(DIST, file));
});
fs.cpSync(OG_DIR, path.join(DIST, "og"), { recursive: true });
write("index.html", homePage());
write("404.html", notFoundPage());
sites.forEach((site) => write(path.join(site.slug, "index.html"), sitePage(site)));

console.log(`Built ${sites.length + 2} pages: /, ${sites.map(pageHref).join(", ")}, /404.html`);
