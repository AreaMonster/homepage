/*
  Renders the 1200x630 social preview images into src/og/.
  Run `npm run og` after changing a site's name, tag, ogText, colours or artwork.
  It needs Chrome or Edge on this computer. Set CHROME_PATH to use another copy.
  The normal build only copies the finished images, so hosts do not need a browser.
*/
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const sites = require("./sites.js");

const SRC = path.join(__dirname, "src");
const OUT = path.join(SRC, "og");
const WIDTH = 1200;
const HEIGHT = 630;
const HOME_FILE = "_home.png";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findBrowser() {
  const programs = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean);
  const candidates = [
    process.env.CHROME_PATH,
    ...programs.map((dir) => path.join(dir, "Google", "Chrome", "Application", "chrome.exe")),
    ...programs.map((dir) => path.join(dir, "Microsoft", "Edge", "Application", "msedge.exe")),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Chrome or Edge was not found. Set CHROME_PATH to its location.");
  return found;
}

/* Talks to the browser over a private pipe, so no network port is opened. */
function connect(child) {
  const input = child.stdio[3];
  const output = child.stdio[4];
  const pending = new Map();
  const waiting = new Map();
  let nextId = 1;
  let buffer = "";

  output.setEncoding("utf8");
  output.on("data", (chunk) => {
    buffer += chunk;
    let end = buffer.indexOf("\0");
    while (end >= 0) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      end = buffer.indexOf("\0");
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      } else if (message.method) {
        const key = `${message.sessionId || ""}:${message.method}`;
        const done = waiting.get(key);
        if (done) {
          waiting.delete(key);
          done(message.params);
        }
      }
    }
  });

  return {
    send(method, params = {}, sessionId) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        input.write(JSON.stringify({ id, method, params, sessionId }) + "\0");
      });
    },
    once(method, sessionId) {
      return new Promise((resolve) => waiting.set(`${sessionId || ""}:${method}`, resolve));
    },
  };
}

function canvas(site) {
  return `<canvas data-visual="${escapeHtml(site.visual || "rings")}" data-name="${escapeHtml(site.name)}" data-accent="${escapeHtml(site.accent)}" data-accent2="${escapeHtml(site.accent2 || site.accent)}"></canvas>`;
}

function shell({ bodyClass, bodyAttributes = "", ogClass = "", text, art }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="styles.css">
<style>
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; min-height: 0; overflow: hidden; }
  .og { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr) 470px; gap: 44px; width: ${WIDTH}px; height: ${HEIGHT}px; padding: 48px 54px; }
  .og-home { grid-template-columns: minmax(0, 1fr) 380px; }
  .og-text { display: flex; flex-direction: column; min-width: 0; }
  .og-brand { display: flex; align-items: center; gap: 14px; font-family: var(--display); font-size: 34px; font-weight: 650; letter-spacing: -0.02em; }
  .og-brand svg { width: 46px; height: 46px; }
  .og-main { margin: auto 0; }
  .og-tag { margin: 0 0 12px; color: color-mix(in srgb, var(--accent) 80%, #fff); font-family: var(--mono); font-size: 25px; font-weight: 600; }
  .og h1 { margin: 0; font-family: var(--display); font-weight: 650; letter-spacing: -0.048em; line-height: 1; }
  .og h1 span { display: block; padding-bottom: 0.08em; background: linear-gradient(95deg, #79b2ff 0%, #b79bff 42%, #62dc98 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .og-lead { margin: 20px 0 0; color: #ccd4de; font-size: 33px; line-height: 1.24; }
  .og-foot { color: var(--text); font-family: var(--mono); font-size: 27px; font-weight: 600; }
  .og-art { display: grid; gap: 16px; min-height: 0; }
  .og-panel { position: relative; overflow: hidden; background: radial-gradient(85% 90% at 50% 42%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 72%), var(--surface); border: 1px solid var(--line-strong); border-radius: 28px; }
  .og-panel canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; }
</style>
</head>
<body class="${bodyClass}"${bodyAttributes}>
  <div class="backdrop"><div class="glow glow-a"></div><div class="glow glow-b"></div><div class="glow glow-c"></div><canvas id="field"></canvas></div>
  <div class="og ${ogClass}">
    <div class="og-text">
      <div class="og-brand">
        <svg viewBox="0 0 32 32"><defs><linearGradient id="mark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#79b2ff"/><stop offset=".55" stop-color="#a98cff"/><stop offset="1" stop-color="#58d68d"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#mark)"/><path d="M21.2 11.4a7 7 0 1 0 0 9.2" fill="none" stroke="#07090e" stroke-width="3.6" stroke-linecap="round"/><circle cx="23.2" cy="16" r="2" fill="#07090e"/></svg>
        cedlabs
      </div>
      ${text}
    </div>
    <div class="og-art">${art}</div>
  </div>
  <script src="app.js"></script>
</body>
</html>`;
}

function homeHtml() {
  const art = sites
    .slice(0, 2)
    .map((site) => `<div class="og-panel" style="--accent:${site.accent};--accent2:${site.accent2 || site.accent}">${canvas(site)}</div>`)
    .join("");
  return shell({
    bodyClass: "home",
    ogClass: "og-home",
    text: `<div class="og-main">
        <h1 style="font-size:70px">A small lab, <span>open to the public.</span></h1>
        <p class="og-lead">Apps and game servers at cedlabs.net.</p>
      </div>
      <div class="og-foot">cedlabs.net</div>`,
    art,
  });
}

function siteHtml(site) {
  const accent2 = site.accent2 || site.accent;
  const fontSize = Math.min(92, Math.floor(1090 / site.name.length));
  const foot = site.join ? site.join.address : `cedlabs.net/${site.slug}`;
  return shell({
    bodyClass: "subpage",
    bodyAttributes: ` style="--accent:${site.accent};--accent2:${accent2}" data-accent="${site.accent}" data-accent2="${accent2}"`,
    text: `<div class="og-main">
        ${site.tag ? `<p class="og-tag">${escapeHtml(site.tag)}</p>` : ""}
        <h1 style="font-size:${fontSize}px">${escapeHtml(site.name)}</h1>
        <p class="og-lead">${escapeHtml(site.ogText || site.summary)}</p>
      </div>
      <div class="og-foot">${escapeHtml(foot)}</div>`,
    art: `<div class="og-panel">${canvas(site)}</div>`,
  });
}

async function capture(cdp, htmlFile, outFile) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

  const loaded = cdp.once("Page.loadEventFired", sessionId);
  await send("Page.navigate", { url: pathToFileURL(htmlFile).href });
  await loaded;
  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: "document.fonts.ready.then(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 250)))))",
  });

  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
  });
  fs.writeFileSync(outFile, Buffer.from(data, "base64"));
  await cdp.send("Target.closeTarget", { targetId });
}

async function main() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cedlabs-og-"));
  const profile = path.join(work, "profile");
  ["styles.css", "app.js"].forEach((file) => fs.copyFileSync(path.join(SRC, file), path.join(work, file)));
  fs.mkdirSync(OUT, { recursive: true });

  const child = spawn(findBrowser(), [
    "--headless=new",
    "--remote-debugging-pipe",
    `--user-data-dir=${profile}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-component-update",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

  const guard = setTimeout(() => {
    console.error("Timed out rendering preview images.");
    child.kill();
    process.exitCode = 1;
  }, 60000);

  const exited = new Promise((resolve) => child.once("exit", resolve));

  try {
    const cdp = connect(child);
    const pages = [
      { file: HOME_FILE, html: homeHtml() },
      ...sites.map((site) => ({ file: `${site.slug}.png`, html: siteHtml(site) })),
    ];
    for (const page of pages) {
      const htmlFile = path.join(work, page.file.replace(".png", ".html"));
      fs.writeFileSync(htmlFile, page.html);
      await capture(cdp, htmlFile, path.join(OUT, page.file));
      console.log(`Rendered src/og/${page.file}`);
    }
    await cdp.send("Browser.close").catch(() => {});
  } finally {
    clearTimeout(guard);
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
    if (child.exitCode === null) child.kill();
    await exited;
    fs.rmSync(work, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
