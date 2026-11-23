(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const STILL_FRAME_TIME = 14;

  /* ---------- Small helpers ---------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(paths) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    paths.forEach((d) => {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
    return svg;
  }

  const ICONS = {
    copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"],
    check: ["M5 12.5l4.5 4.5L19 7.5"],
    lock: ["M6 11h12v9H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
    arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  };

  function hash(a, b) {
    const value = Math.sin(a * 127.1 + (b || 0) * 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgba(rgb, alpha) {
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha + ")";
  }

  function pill(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  /* Runs a canvas drawing only while it is on screen. */
  function stage(canvas, draw, animated) {
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    let dpr = 1;
    let frame = 0;
    let visible = false;

    function paint(now) {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, reducedMotion.matches ? STILL_FRAME_TIME : now / 1000, dpr);
    }
    function loop(now) {
      paint(now);
      frame = requestAnimationFrame(loop);
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (animated && visible && !document.hidden && !reducedMotion.matches) {
        frame = requestAnimationFrame(loop);
      } else {
        paint(performance.now());
      }
    }
    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(performance.now());
    }

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      sync();
    }).observe(canvas);
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
  }

  /* ---------- Background dot field ---------- */

  function startField(canvas) {
    const blue = hexToRgb(document.body.dataset.accent || "#6aa8ff");
    const green = hexToRgb(document.body.dataset.accent2 || "#58d68d");
    const pointer = { x: -999, y: -999, tx: -999, ty: -999, power: 0, target: 0 };

    window.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      if (pointer.target === 0) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      }
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
      pointer.target = 1;
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => {
      pointer.target = 0;
    });

    stage(canvas, (ctx, w, h, t) => {
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      pointer.power += (pointer.target - pointer.power) * 0.08;

      const gap = w < 640 ? 24 : 30;
      const offsetX = ((w % gap) + gap) / 2;
      for (let x = offsetX; x < w; x += gap) {
        const mix = x / w;
        const color = [
          Math.round(blue[0] + (green[0] - blue[0]) * mix),
          Math.round(blue[1] + (green[1] - blue[1]) * mix),
          Math.round(blue[2] + (green[2] - blue[2]) * mix),
        ];
        ctx.fillStyle = rgba(color, 1);
        for (let y = gap / 2; y < h; y += gap) {
          const wave =
            Math.sin(x * 0.009 + t * 0.55) +
            Math.sin(y * 0.013 - t * 0.42) +
            Math.sin((x + y) * 0.006 + t * 0.3);
          const level = (wave + 3) / 6;
          const distance = Math.hypot(x - pointer.x, y - pointer.y);
          const near = Math.max(0, 1 - distance / 210) * pointer.power;
          const fade = Math.max(0, 1 - y / (h * 0.92));
          ctx.globalAlpha = Math.min(1, (0.05 + level * level * 0.42 + near * 0.8) * fade);
          const size = 1.1 + level * 0.8 + near * 1.9;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
      ctx.globalAlpha = 1;
    }, true);
  }

  /* ---------- Card artwork ---------- */

  function drawWaveform(site) {
    const a = hexToRgb(site.accent);
    const b = hexToRgb(site.accent2);

    return (ctx, w, h, t) => {
      const pad = Math.max(20, w * 0.05);
      const usable = w - pad * 2;
      const bars = Math.max(30, Math.floor(usable / 8));
      const step = usable / bars;
      const barWidth = Math.max(2.5, step * 0.56);
      const mid = h * 0.54;
      const maxHeight = h * 0.62;
      const head = (0.58 + t * 0.022) % 1;

      const gradient = ctx.createLinearGradient(pad, 0, w - pad, 0);
      gradient.addColorStop(0, rgba(a, 1));
      gradient.addColorStop(1, rgba(b, 1));

      for (let i = 0; i < bars; i++) {
        const p = i / (bars - 1);
        const envelope = 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * p), 0.65);
        const shape =
          0.46 * Math.abs(Math.sin(i * 0.37 + 1.2)) +
          0.3 * Math.abs(Math.sin(i * 0.113 + 0.4)) +
          0.24 * hash(i, 3);
        const closeness = Math.max(0, 1 - Math.abs(p - head) * 11);
        const pulse = 0.86 + 0.14 * Math.sin(t * 2.1 + i * 0.34);
        const height = Math.max(4, shape * envelope * pulse * (1 + closeness * 0.28) * maxHeight);
        const x = pad + i * step + (step - barWidth) / 2;

        ctx.fillStyle = gradient;
        ctx.globalAlpha = p <= head ? 0.78 + closeness * 0.22 : 0.2 + closeness * 0.35;
        pill(ctx, x, mid - height / 2, barWidth, height, barWidth / 2);
      }
      ctx.globalAlpha = 1;

      const headX = pad + head * usable;
      const line = ctx.createLinearGradient(0, mid - maxHeight / 2, 0, mid + maxHeight / 2);
      line.addColorStop(0, "rgba(255,255,255,0)");
      line.addColorStop(0.5, "rgba(255,255,255,0.9)");
      line.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = line;
      ctx.fillRect(headX - 0.75, mid - maxHeight / 2, 1.5, maxHeight);

      const glow = ctx.createRadialGradient(headX, mid, 0, headX, mid, 46);
      glow.addColorStop(0, rgba(b, 0.42));
      glow.addColorStop(1, rgba(b, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(headX - 46, mid - 46, 92, 92);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(headX, mid, 3.5, 0, Math.PI * 2);
      ctx.fill();
    };
  }

  function buildIsland() {
    const voxels = new Map();
    const key = (x, y, z) => x + "," + y + "," + z;
    const put = (x, y, z, color) => voxels.set(key(x, y, z), { x, y, z, color });
    const tops = new Map();
    const radius = 7.1;

    const smooth = (x, y) =>
      (Math.sin(x * 0.62 + 1.1) + Math.cos(y * 0.54 - 0.6) + Math.sin((x + y) * 0.33)) / 3;

    for (let x = -8; x <= 8; x++) {
      for (let y = -8; y <= 8; y++) {
        const edge = Math.hypot(x, y) / radius + (hash(x, y) - 0.5) * 0.16 + smooth(y, x) * 0.08;
        if (edge > 1) continue;

        const inPond = Math.hypot(x + 2.4, y - 2.1) < 2.15;
        let top = Math.round(1 + (1 - edge * edge) * 2.3 + smooth(x, y) * 1.25);
        if (inPond) top = 1;
        top = Math.max(1, top);
        const bottom = -Math.round((1 - edge) * 6.5 + hash(y, x) * 1.4);

        for (let z = bottom; z <= top; z++) {
          let color;
          if (z === top) {
            if (inPond) color = hash(x, y) > 0.5 ? [72, 171, 240] : [86, 186, 248];
            else if (edge > 0.87) color = [226, 203, 140];
            else if (top >= 4) color = [124, 214, 118];
            else color = hash(x + 9, y) > 0.5 ? [84, 193, 104] : [98, 203, 112];
          } else if (z >= top - 2) {
            color = hash(x, z) > 0.5 ? [132, 93, 63] : [120, 84, 57];
          } else {
            color = hash(z, y) > 0.5 ? [86, 92, 110] : [72, 78, 96];
          }
          put(x, y, z, color);
        }
        tops.set(x + "," + y, { top, inPond, edge });
      }
    }

    [[3, -3, 3], [-3, -4, 2], [5, 1, 2]].forEach((tree) => {
      const spot = tops.get(tree[0] + "," + tree[1]);
      if (!spot || spot.inPond || spot.edge > 0.82) return;
      const trunkTop = spot.top + tree[2];
      for (let z = spot.top + 1; z <= trunkTop; z++) put(tree[0], tree[1], z, [106, 74, 50]);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const leaf = hash(tree[0] + dx, tree[1] + dy) > 0.5 ? [46, 150, 88] : [56, 166, 96];
          put(tree[0] + dx, tree[1] + dy, trunkTop, leaf);
          if (Math.abs(dx) + Math.abs(dy) < 2) put(tree[0] + dx, tree[1] + dy, trunkTop + 1, [68, 182, 106]);
        }
      }
    });

    const list = Array.from(voxels.values());
    list.sort((p, q) => p.x + p.y + p.z - (q.x + q.y + q.z));
    return { list, has: (x, y, z) => voxels.has(key(x, y, z)) };
  }

  function drawVoxels(site) {
    const island = buildIsland();
    const accent2 = hexToRgb(site.accent2);
    const accent = hexToRgb(site.accent);
    const COS = 0.866;
    const SIN = 0.5;
    let cache = null;
    let cacheKey = "";

    const project = (x, y, z) => [(x - y) * COS, (x + y) * SIN - z];

    function shade(color, amount) {
      return "rgb(" + color.map((c) => Math.round(c * amount)).join(",") + ")";
    }

    function renderIsland(w, h, dpr) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      island.list.forEach((v) => {
        [[v.x, v.y, v.z + 1], [v.x + 1, v.y, v.z], [v.x, v.y + 1, v.z], [v.x + 1, v.y + 1, v.z]].forEach((c) => {
          const p = project(c[0], c[1], c[2]);
          minX = Math.min(minX, p[0]);
          maxX = Math.max(maxX, p[0]);
          minY = Math.min(minY, p[1]);
          maxY = Math.max(maxY, p[1]);
        });
      });

      const scale = Math.min((w * 0.8) / (maxX - minX), (h * 0.76) / (maxY - minY));
      const originX = w / 2 - ((minX + maxX) / 2) * scale;
      const originY = h * 0.56 - ((minY + maxY) / 2) * scale;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 0.6;
      ctx.lineJoin = "round";

      const face = (points, fill) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = fill;
        ctx.beginPath();
        points.forEach((c, i) => {
          const p = project(c[0], c[1], c[2]);
          const sx = originX + p[0] * scale;
          const sy = originY + p[1] * scale;
          if (i) ctx.lineTo(sx, sy);
          else ctx.moveTo(sx, sy);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };

      island.list.forEach((v) => {
        const { x, y, z, color } = v;
        if (!island.has(x, y + 1, z)) {
          face([[x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x, y + 1, z]], shade(color, 0.74));
        }
        if (!island.has(x + 1, y, z)) {
          face([[x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x + 1, y, z]], shade(color, 0.54));
        }
        if (!island.has(x, y, z + 1)) {
          face([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]], shade(color, 1));
        }
      });
      return canvas;
    }

    return (ctx, w, h, t, dpr) => {
      const nextKey = w + "x" + h + "@" + dpr;
      if (nextKey !== cacheKey) {
        cache = renderIsland(w, h, dpr);
        cacheKey = nextKey;
      }

      const bob = Math.sin(t * 0.8) * Math.min(6, h * 0.022);

      const glow = ctx.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, Math.max(w, h) * 0.46);
      glow.addColorStop(0, rgba(accent, 0.2));
      glow.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.drawImage(cache, 0, bob, w, h);

      ctx.fillStyle = rgba(accent2, 1);
      for (let i = 0; i < 16; i++) {
        const seed = hash(i, 7);
        const life = (t * (0.05 + seed * 0.05) + seed) % 1;
        const px = w * (0.16 + hash(i, 2) * 0.68) + Math.sin(t * 0.7 + i) * 7;
        const py = h * (0.88 - life * 0.72);
        ctx.globalAlpha = Math.sin(life * Math.PI) * 0.8;
        const size = 1.5 + hash(i, 5) * 1.6;
        ctx.fillRect(px, py, size, size);
      }
      ctx.globalAlpha = 1;
    };
  }

  function drawRings(site) {
    const a = hexToRgb(site.accent);
    const b = hexToRgb(site.accent2 || site.accent);
    const letter = site.name.charAt(0).toUpperCase();

    return (ctx, w, h, t) => {
      const cx = w / 2;
      const cy = h / 2;
      const max = Math.min(w, h) * 0.46;
      ctx.lineWidth = 1.25;
      for (let i = 0; i < 6; i++) {
        const phase = (t * 0.09 + i / 6) % 1;
        ctx.strokeStyle = rgba(i % 2 ? a : b, (1 - phase) * 0.62);
        ctx.beginPath();
        ctx.arc(cx, cy, 24 + phase * max, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(a, 0.16);
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "650 30px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(letter, cx, cy + 1);
    };
  }

  const VISUALS = { waveform: drawWaveform, voxels: drawVoxels, rings: drawRings };

  /* ---------- Copy to clipboard ---------- */

  function legacyCopy(text) {
    return new Promise((resolve, reject) => {
      const area = el("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      area.remove();
      if (ok) resolve();
      else reject(new Error("Copy failed"));
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    }
    return legacyCopy(text);
  }

  /* ---------- Page wiring ---------- */

  document.querySelectorAll("canvas[data-visual]").forEach((canvas) => {
    const data = canvas.dataset;
    const makeVisual = VISUALS[data.visual] || VISUALS.rings;
    stage(canvas, makeVisual({ name: data.name, accent: data.accent, accent2: data.accent2 }), true);
  });

  document.querySelectorAll("[data-copy]").forEach((button) => {
    const iconBox = button.querySelector(".copy-icon");
    const label = button.querySelector(".copy-text");
    const status = button.closest(".panel").querySelector(".copy-status");
    let timer;
    let announceTimer;

    function show(text, state, announcement) {
      clearTimeout(timer);
      clearTimeout(announceTimer);
      label.textContent = text;
      iconBox.replaceChildren(icon(state === "ok" ? ICONS.check : ICONS.copy));
      button.dataset.state = state;
      /* Clearing first lets a repeated message be announced again. */
      status.textContent = "";
      announceTimer = setTimeout(() => {
        status.textContent = announcement;
      }, 60);
      timer = setTimeout(() => {
        label.textContent = "Copy";
        iconBox.replaceChildren(icon(ICONS.copy));
        delete button.dataset.state;
        status.textContent = "";
      }, 2000);
    }

    button.addEventListener("click", () => {
      copyText(button.dataset.copy).then(
        () => show("Copied", "ok", "Server address copied."),
        () => show("Failed", "error", "Could not copy the server address.")
      );
    });
  });

  document.querySelectorAll(".spot").forEach((area) => {
    area.addEventListener("pointermove", (event) => {
      const rect = area.getBoundingClientRect();
      area.style.setProperty("--mx", event.clientX - rect.left + "px");
      area.style.setProperty("--my", event.clientY - rect.top + "px");
    }, { passive: true });
  });

  startField(document.getElementById("field"));
})();
