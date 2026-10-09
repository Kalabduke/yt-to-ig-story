"use strict";
(() => {
  // yt-to-ig/src/core/card.ts
  var ACCENT_SWATCHES = ["#ff0033", "#feda75", "#d62976", "#962fbf", "#4f5bd5"];
  var DEFAULT_OPTIONS = {
    theme: "dark",
    accent: ACCENT_SWATCHES[0],
    showLink: true,
    showChannel: true,
    showHandle: true
  };
  var THEMES = {
    dark: {
      backdrop: "#0a0b0f",
      scrim: "rgba(8,9,13,0.74)",
      glow: "rgba(255,255,255,0.10)",
      title: "#ffffff",
      channel: "rgba(255,255,255,0.92)",
      muted: "rgba(255,255,255,0.62)",
      artBorder: "rgba(255,255,255,0.16)",
      artShadow: "rgba(0,0,0,0.55)",
      pillBg: "#ffffff",
      pillLabel: "rgba(11,12,16,0.55)",
      pillText: "#0b0c10",
      brandText: "rgba(255,255,255,0.78)"
    },
    light: {
      backdrop: "#f4f5f8",
      scrim: "rgba(244,245,248,0.82)",
      glow: "rgba(255,255,255,0.55)",
      title: "#0b0c10",
      channel: "rgba(11,12,16,0.88)",
      muted: "rgba(11,12,16,0.55)",
      artBorder: "rgba(11,12,16,0.10)",
      artShadow: "rgba(11,12,16,0.22)",
      pillBg: "#0b0c10",
      pillLabel: "rgba(255,255,255,0.60)",
      pillText: "#ffffff",
      brandText: "rgba(11,12,16,0.72)"
    }
  };
  var CARD_WIDTH = 1080;
  var CARD_HEIGHT = 1920;
  var CARD_ASPECT = CARD_WIDTH / CARD_HEIGHT;
  function isThemeName(value) {
    return value === "dark" || value === "light";
  }
  function normalizeHex(value, fallback = ACCENT_SWATCHES[0]) {
    const raw = (value ?? "").trim().toLowerCase();
    const short = /^#?([0-9a-f]{3})$/.exec(raw);
    if (short) {
      const [r, g, b] = short[1];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    const long = /^#?([0-9a-f]{6})$/.exec(raw);
    return long ? `#${long[1]}` : fallback;
  }
  function hexToRgb(hex) {
    const safe = normalizeHex(hex);
    return [
      Number.parseInt(safe.slice(1, 3), 16),
      Number.parseInt(safe.slice(3, 5), 16),
      Number.parseInt(safe.slice(5, 7), 16)
    ];
  }
  function rgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  function truncateWithEllipsis(line, maxWidth, measure) {
    const ellipsis = "\u2026";
    let text = line.trimEnd();
    while (text.length > 1 && measure(`${text}${ellipsis}`) > maxWidth) {
      text = text.slice(0, -1);
    }
    return `${text}${ellipsis}`;
  }
  function wrapLines(text, maxWidth, measure, maxLines = Number.POSITIVE_INFINITY) {
    const words = (text ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (words.length === 0) return [];
    const all = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (measure(next) <= maxWidth) {
        line = next;
        continue;
      }
      if (line) {
        all.push(line);
        line = "";
      }
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = "";
      for (const ch of word) {
        if (chunk && measure(`${chunk}${ch}`) > maxWidth) {
          all.push(chunk);
          chunk = "";
        }
        chunk += ch;
      }
      line = chunk;
    }
    if (line) all.push(line);
    if (all.length === 0) return [];
    if (all.length <= maxLines) return all;
    const kept = all.slice(0, maxLines);
    kept[maxLines - 1] = truncateWithEllipsis(kept[maxLines - 1], maxWidth, measure);
    return kept;
  }
  function computeLayout(options) {
    const bottomPad = 200;
    const pillH = 136;
    const pillW = CARD_WIDTH - 200 * 2;
    const artSize = 660;
    const artY = 320;
    const artBottom = artY + artSize;
    const pillY = CARD_HEIGHT - bottomPad - pillH;
    const handleTop = options.showLink ? pillY - 92 : CARD_HEIGHT - bottomPad - 40 - 52;
    const channelTop = handleTop - 84;
    const iconSize = 84;
    const iconX = CARD_WIDTH / 2 - pillW / 2 + 28;
    const iconY = pillY + (pillH - iconSize) / 2;
    return {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      brand: { y: 168, size: 44 },
      art: { x: (CARD_WIDTH - artSize) / 2, y: artY, size: artSize, radius: 48 },
      title: {
        top: artBottom + 56,
        bottom: channelTop - 56,
        size: 68,
        lineHeight: 86,
        maxWidth: CARD_WIDTH - 220,
        maxLines: 3
      },
      channel: { top: channelTop, size: 50 },
      handle: { top: handleTop, size: 42 },
      pill: {
        rect: { x: (CARD_WIDTH - pillW) / 2, y: pillY, w: pillW, h: pillH },
        radius: pillH / 2,
        icon: { x: iconX, y: iconY, w: iconSize, h: iconSize },
        labelX: iconX + iconSize + 28,
        labelSize: 26,
        textSize: 44
      }
    };
  }
  function storyFilename(title, id) {
    const slug = (title ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/g, "");
    return `${slug || "youtube"}-${id}-story.png`;
  }

  // yt-to-ig/src/core/youtube.ts
  var VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
  function isVideoId(value) {
    return VIDEO_ID_PATTERN.test(value);
  }
  function hostOf(url) {
    return url.hostname.toLowerCase().replace(/^www\./, "");
  }
  function parseVideoId(input) {
    const raw = (input ?? "").trim();
    if (!raw) return null;
    if (isVideoId(raw)) return raw;
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    let url;
    try {
      url = new URL(candidate);
    } catch {
      return null;
    }
    const host = hostOf(url);
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return isVideoId(id) ? id : null;
    }
    if (host !== "youtube.com" && host !== "youtube-nocookie.com" && !host.endsWith(".youtube.com")) {
      return null;
    }
    const segments = url.pathname.split("/").filter(Boolean);
    const first = (segments[0] ?? "").toLowerCase();
    if (first === "shorts" || first === "embed" || first === "live" || first === "v") {
      const id = segments[1] ?? "";
      if (isVideoId(id)) return id;
    }
    const v = url.searchParams.get("v") ?? "";
    return isVideoId(v) ? v : null;
  }
  function findVideoId(input) {
    const raw = (input ?? "").trim();
    if (!raw) return null;
    const direct = parseVideoId(raw);
    if (direct && !/^[a-z]+$/.test(raw)) return direct;
    const pattern = /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/[^\s<>"']+/gi;
    for (const candidate of raw.match(pattern) ?? []) {
      const id = parseVideoId(candidate.replace(/[\)\].,;:!?'"`]+$/, ""));
      if (id) return id;
    }
    const v = /[?&]v=([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/.exec(raw);
    return v && v[1] ? v[1] : null;
  }
  var THUMB_QUALITIES = [
    "maxresdefault",
    "sddefault",
    "hqdefault",
    "mqdefault"
  ];
  function thumbUrl(id, quality = "hqdefault") {
    return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
  }
  function thumbnailCandidates(id) {
    return THUMB_QUALITIES.map((quality) => thumbUrl(id, quality));
  }
  function watchUrl(id) {
    return `https://www.youtube.com/watch?v=${id}`;
  }
  function shortUrl(id) {
    return `https://youtu.be/${id}`;
  }
  function fallbackMeta(id) {
    return {
      id,
      title: "",
      channel: "",
      channelUrl: "",
      thumbnail: thumbUrl(id, "hqdefault"),
      url: watchUrl(id),
      shortUrl: shortUrl(id)
    };
  }
  function handleFromUrl(channelUrl, channel = "") {
    const match = /\/@([^/?#]+)/.exec(channelUrl ?? "");
    if (match && match[1]) return `@${decodeURIComponent(match[1])}`;
    const name = (channel ?? "").trim();
    return name ? `@${name.replace(/\s+/g, "")}` : "";
  }
  async function fetchVideoMeta(id, fetchImpl = fetch) {
    const meta = fallbackMeta(id);
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      watchUrl(id)
    )}&format=json`;
    try {
      const res = await fetchImpl(endpoint, { headers: { accept: "application/json" } });
      if (!res.ok) return { meta, error: `YouTube oembed returned ${res.status}` };
      const data = await res.json();
      return {
        meta: {
          ...meta,
          title: (data.title ?? "").trim(),
          channel: (data.author_name ?? "").trim(),
          channelUrl: data.author_url ?? "",
          thumbnail: data.thumbnail_url || meta.thumbnail
        }
      };
    } catch (err) {
      return { meta, error: err instanceof Error ? err.message : "network error" };
    }
  }

  // yt-to-ig/src/core/share.ts
  function errorName(err) {
    if (err && typeof err === "object" && "name" in err) {
      return String(err.name);
    }
    return "";
  }
  function readShareApi(navigatorLike) {
    const nav = navigatorLike ?? {};
    const api2 = {};
    if (typeof nav.share === "function") api2.share = nav.share.bind(nav);
    if (typeof nav.canShare === "function") api2.canShare = nav.canShare.bind(nav);
    return api2;
  }
  function canShareImages(api2, makeProbe) {
    if (!api2.share) return false;
    if (!api2.canShare) return true;
    try {
      return api2.canShare({ files: [makeProbe()] });
    } catch {
      return false;
    }
  }
  async function shareImages(api2, payload) {
    if (!api2.share) return "unsupported";
    if (api2.canShare) {
      try {
        if (!api2.canShare(payload)) return "unsupported";
      } catch {
        return "unsupported";
      }
    }
    try {
      await api2.share(payload);
      return "shared";
    } catch (err) {
      const name = errorName(err);
      if (name === "AbortError") return "cancelled";
      if (name === "NotAllowedError" || name === "SecurityError") return "blocked";
      return "unsupported";
    }
  }

  // yt-to-ig/src/core/render.ts
  var TITLE_FONT = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  function font(weight, size) {
    return `${weight} ${size}px ${TITLE_FONT}`;
  }
  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, radius);
      return;
    }
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  function drawCover(ctx, image, x, y, w, h) {
    const iw = image.width || 1;
    const ih = image.height || 1;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function supportsCanvasFilter(ctx) {
    try {
      ctx.filter = "blur(1px)";
      const ok = ctx.filter !== "none" && ctx.filter !== "";
      ctx.filter = "none";
      return ok;
    } catch {
      return false;
    }
  }
  function drawBlurredCover(ctx, image, scrim) {
    const bleed = 1.18;
    const w = CARD_WIDTH * bleed;
    const h = CARD_HEIGHT * bleed;
    const x = -(w - CARD_WIDTH) / 2;
    const y = -(h - CARD_HEIGHT) / 2;
    ctx.save();
    if (supportsCanvasFilter(ctx)) {
      ctx.filter = "blur(64px)";
      drawCover(ctx, image, x, y, w, h);
      ctx.filter = "none";
    } else {
      const small = document.createElement("canvas");
      small.width = 64;
      small.height = 114;
      const smallCtx = small.getContext("2d");
      if (smallCtx) {
        drawCover(smallCtx, image, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(small, x, y, w, h);
      }
    }
    ctx.restore();
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  }
  function drawGlow(ctx, accent) {
    const glow = ctx.createRadialGradient(
      CARD_WIDTH / 2,
      CARD_HEIGHT * 0.42,
      40,
      CARD_WIDTH / 2,
      CARD_HEIGHT * 0.42,
      CARD_WIDTH * 0.95
    );
    glow.addColorStop(0, rgba(accent, 0.4));
    glow.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  }
  function drawPlayMark(ctx, cx, cy, size, color) {
    const r = size / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy - r * 0.72);
    ctx.lineTo(cx + r * 0.78, cy);
    ctx.lineTo(cx - r * 0.45, cy + r * 0.72);
    ctx.closePath();
    ctx.fill();
  }
  function renderCard(canvas, input) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas context unavailable");
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    const options = normalizeOptions(input.options);
    const theme = THEMES[options.theme];
    const accent = normalizeHex(options.accent);
    const layout = computeLayout(options);
    ctx.fillStyle = theme.backdrop;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    if (input.image) drawBlurredCover(ctx, input.image, theme.scrim);
    drawGlow(ctx, accent);
    const art = layout.art;
    ctx.save();
    ctx.shadowColor = theme.artShadow;
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 24;
    roundRect(ctx, art.x, art.y, art.size, art.size, art.radius);
    ctx.fillStyle = rgba(accent, 0.35);
    ctx.fill();
    ctx.restore();
    if (input.image) {
      ctx.save();
      roundRect(ctx, art.x, art.y, art.size, art.size, art.radius);
      ctx.clip();
      drawCover(ctx, input.image, art.x, art.y, art.size, art.size);
      ctx.restore();
    } else {
      ctx.save();
      roundRect(ctx, art.x, art.y, art.size, art.size, art.radius);
      ctx.clip();
      const placeholder = ctx.createLinearGradient(art.x, art.y, art.x, art.y + art.size);
      placeholder.addColorStop(0, rgba(accent, 0.85));
      placeholder.addColorStop(1, rgba(accent, 0.25));
      ctx.fillStyle = placeholder;
      ctx.fillRect(art.x, art.y, art.size, art.size);
      drawPlayMark(ctx, art.x + art.size / 2, art.y + art.size / 2, art.size * 0.24, "#ffffff");
      ctx.restore();
    }
    ctx.save();
    roundRect(ctx, art.x, art.y, art.size, art.size, art.radius);
    ctx.strokeStyle = theme.artBorder;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (input.meta.title) {
      ctx.font = font(800, layout.title.size);
      const lines = wrapLines(
        input.meta.title,
        layout.title.maxWidth,
        (text) => ctx.measureText(text).width,
        layout.title.maxLines
      );
      const blockHeight = lines.length * layout.title.lineHeight;
      const regionHeight = layout.title.bottom - layout.title.top;
      const startY = layout.title.top + Math.max(0, (regionHeight - blockHeight) / 2) + layout.title.lineHeight / 2;
      ctx.fillStyle = theme.title;
      lines.forEach((line, i) => {
        ctx.fillText(line, CARD_WIDTH / 2, startY + i * layout.title.lineHeight);
      });
    }
    if (options.showChannel && input.meta.channel) {
      ctx.font = font(600, layout.channel.size);
      ctx.fillStyle = theme.channel;
      ctx.fillText(input.meta.channel, CARD_WIDTH / 2, layout.channel.top + layout.channel.size / 2);
    }
    const handle = options.showHandle ? handleFromUrl(input.meta.channelUrl, input.meta.channel) : "";
    if (handle) {
      ctx.font = font(400, layout.handle.size);
      ctx.fillStyle = theme.muted;
      ctx.fillText(handle, CARD_WIDTH / 2, layout.handle.top + layout.handle.size / 2);
    }
    ctx.font = font(700, layout.brand.size);
    ctx.textAlign = "center";
    const brandText = "YouTube";
    const brandWidth = ctx.measureText(brandText).width;
    const markSize = layout.brand.size;
    const totalWidth = brandWidth + markSize * 1.1;
    const brandX = CARD_WIDTH / 2 - totalWidth / 2;
    drawPlayMark(
      ctx,
      brandX + markSize * 0.28,
      layout.brand.y + markSize * 0.5,
      markSize * 0.78,
      accent
    );
    ctx.fillStyle = theme.brandText;
    ctx.textAlign = "left";
    ctx.fillText(brandText, brandX + markSize * 0.95, layout.brand.y + markSize * 0.5);
    if (options.showLink) {
      const pill = layout.pill;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 14;
      roundRect(ctx, pill.rect.x, pill.rect.y, pill.rect.w, pill.rect.h, pill.radius);
      ctx.fillStyle = theme.pillBg;
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(
        pill.icon.x + pill.icon.w / 2,
        pill.icon.y + pill.icon.h / 2,
        pill.icon.w / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
      drawPlayMark(
        ctx,
        pill.icon.x + pill.icon.w / 2,
        pill.icon.y + pill.icon.h / 2,
        pill.icon.w * 0.5,
        "#ffffff"
      );
      const centerY = pill.rect.y + pill.rect.h / 2;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = theme.pillLabel;
      ctx.font = font(700, pill.labelSize);
      ctx.fillText("WATCH ON YOUTUBE", pill.labelX, centerY - 6);
      ctx.fillStyle = theme.pillText;
      ctx.font = font(700, pill.textSize);
      const link = input.meta.shortUrl.replace(/^https?:\/\//, "");
      const maxTextWidth = pill.rect.x + pill.rect.w - pill.labelX - 40;
      let textSize = pill.textSize;
      while (textSize > 26 && ctx.measureText(link).width > maxTextWidth) {
        textSize -= 2;
        ctx.font = font(700, textSize);
      }
      ctx.textBaseline = "top";
      ctx.fillText(link, pill.labelX, centerY + 8);
      ctx.textBaseline = "middle";
    }
  }
  function normalizeOptions(options) {
    const raw = options ?? {};
    return {
      theme: isThemeName(String(raw.theme)) ? raw.theme : DEFAULT_OPTIONS.theme,
      accent: normalizeHex(String(raw.accent ?? DEFAULT_OPTIONS.accent), DEFAULT_OPTIONS.accent),
      showLink: raw.showLink ?? DEFAULT_OPTIONS.showLink,
      showChannel: raw.showChannel ?? DEFAULT_OPTIONS.showChannel,
      showHandle: raw.showHandle ?? DEFAULT_OPTIONS.showHandle
    };
  }
  async function loadThumbnail(id, fetchImpl = fetch) {
    for (const url of thumbnailCandidates(id)) {
      try {
        const res = await fetchImpl(url, { mode: "cors", cache: "force-cache" });
        if (!res.ok) continue;
        const blob = await res.blob();
        if (!blob.size) continue;
        if (typeof createImageBitmap === "function") {
          return await createImageBitmap(blob);
        }
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("thumbnail decode failed"));
          img.src = objectUrl;
        });
        return img;
      } catch {
      }
    }
    return null;
  }
  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas export failed"));
      }, "image/png");
    });
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e4);
  }
  function toFile(blob, filename) {
    return new File([blob], filename, { type: "image/png" });
  }
  function api() {
    return readShareApi(typeof navigator === "undefined" ? void 0 : navigator);
  }
  function canShareImages2() {
    if (!navigatorAvailable()) return false;
    return canShareImages(
      api(),
      () => new File([new Uint8Array(8)], "probe.png", { type: "image/png" })
    );
  }
  function navigatorAvailable() {
    return typeof navigator !== "undefined" && typeof navigator.share === "function";
  }
  async function shareImage(blob, filename, meta) {
    if (!navigatorAvailable()) return "unsupported";
    return shareImages(api(), {
      files: [toFile(blob, filename)],
      text: `${meta.title}
${meta.shortUrl}`.trim()
    });
  }
  async function copyPng(blob) {
    var _a;
    try {
      const ClipboardItemCtor = globalThis.ClipboardItem;
      if (!ClipboardItemCtor || !((_a = navigator.clipboard) == null ? void 0 : _a.write)) return false;
      await navigator.clipboard.write([new ClipboardItemCtor({ "image/png": blob })]);
      return true;
    } catch {
      return false;
    }
  }

  // yt-to-ig/src/core/instagram.ts
  var IG_APP_SCHEME = {
    story: "instagram://story-camera",
    dm: "instagram://direct"
  };
  var IG_WEB_FALLBACK = {
    // The story camera has no web equivalent; the profile is the honest landing.
    story: "https://www.instagram.com/",
    dm: "https://www.instagram.com/direct/inbox/"
  };
  function instagramLinks(target) {
    return { app: IG_APP_SCHEME[target], web: IG_WEB_FALLBACK[target] };
  }
  function isLikelyPhone(userAgent, maxTouchPoints = 0) {
    const ua = userAgent ?? "";
    if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) return true;
    return maxTouchPoints > 1 && /Macintosh/.test(ua);
  }

  // yt-to-ig/src/shared/studio.ts
  var OPTIONS_KEY = "options";
  function byId(id) {
    const node = document.getElementById(id);
    if (!node) throw new Error(`studio markup is missing #${id}`);
    return node;
  }
  function readStored(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  function writeStored(key, options) {
    try {
      localStorage.setItem(key, JSON.stringify(options));
    } catch {
    }
  }
  function mountStudio(config = {}) {
    var _a, _b;
    const storageKey = `yt2ig:${config.storageKey ?? "studio"}:${OPTIONS_KEY}`;
    const form = byId("studio-form");
    const urlInput = byId("studio-url");
    const status = byId("studio-status");
    const canvas = byId("studio-canvas");
    const accents = byId("studio-accents");
    const themeDark = byId("studio-theme-dark");
    const themeLight = byId("studio-theme-light");
    const linkToggle = byId("studio-link");
    const channelToggle = byId("studio-channel");
    const handleToggle = byId("studio-handle");
    const shareButton = byId("studio-share");
    const downloadButton = byId("studio-download");
    const copyButton = byId("studio-copy");
    const hint = byId("studio-hint");
    let options = { ...DEFAULT_OPTIONS, ...readStored(storageKey) };
    options.accent = normalizeHex(options.accent, DEFAULT_OPTIONS.accent);
    let meta = null;
    let image = null;
    let ticket = 0;
    let warm = null;
    let warming = null;
    const shareSupported = canShareImages2();
    const insecure = typeof window !== "undefined" && window.isSecureContext === false;
    shareButton.hidden = !shareSupported;
    hint.textContent = insecure ? "iOS Safari refuses to open the share sheet on a plain http:// page. Use the https:// address (npm run yt2ig:serve -- --https), or add it from a real domain \u2014 Download still works anywhere." : shareSupported ? "Tap Share, then pick Instagram \u2192 Your story. Instagram keeps the cover, the title and the link." : config.hint ?? "This browser cannot hand pictures to other apps. Download the PNG, then add it to your story from the Instagram app.";
    function syncControls() {
      linkToggle.checked = options.showLink;
      channelToggle.checked = options.showChannel;
      handleToggle.checked = options.showHandle;
      themeDark.setAttribute("aria-pressed", String(options.theme === "dark"));
      themeLight.setAttribute("aria-pressed", String(options.theme === "light"));
      for (const button of accents.querySelectorAll("button[data-accent]")) {
        button.setAttribute("aria-pressed", String(button.dataset.accent === options.accent));
      }
      writeStored(storageKey, options);
    }
    function blobKey() {
      return JSON.stringify([meta ? meta.id : "", meta ? meta.title : "", Boolean(image), options]);
    }
    function invalidateBlob() {
      warm = null;
      warming = null;
    }
    async function currentBlob() {
      if (!meta) return null;
      const key = blobKey();
      if (warm && warm.key === key) return { blob: warm.blob, filename: warm.filename };
      if (!warming) {
        const snapshot = meta;
        warming = (async () => {
          renderCard(canvas, { meta: snapshot, image, options });
          const blob = await canvasToBlob(canvas);
          const ready = { blob, filename: storyFilename(snapshot.title, snapshot.id) };
          if (blobKey() === key) warm = { key, ...ready };
          return ready;
        })();
      }
      return warming;
    }
    function paint() {
      invalidateBlob();
      if (!meta) {
        renderCard(canvas, {
          meta: {
            id: "",
            title: "",
            channel: "",
            channelUrl: "",
            thumbnail: "",
            url: "",
            shortUrl: "youtu.be/\u2026"
          },
          image: null,
          options
        });
        return;
      }
      renderCard(canvas, { meta, image, options });
      canvas.style.cursor = "pointer";
      canvas.title = meta ? `${meta.title} \u2014 opens the video on YouTube` : "";
      void currentBlob();
    }
    function setStatus(text, tone = "info") {
      status.textContent = text;
      status.dataset.tone = tone;
    }
    function setStatusVideo(title, href) {
      status.dataset.tone = "info";
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = title;
      status.replaceChildren(link);
    }
    function openVideo() {
      if (!meta) return;
      window.open(meta.url, "_blank", "noopener,noreferrer");
    }
    async function load(url) {
      const id = findVideoId(url);
      if (!id) {
        meta = null;
        image = null;
        setStatus("That is not a YouTube video link.", "warn");
        paint();
        return;
      }
      const mine = ++ticket;
      setStatus("Fetching the video\u2026");
      try {
        const [metaResult, thumb] = await Promise.all([fetchVideoMeta(id), loadThumbnail(id)]);
        if (mine !== ticket) return;
        meta = metaResult.meta;
        image = thumb;
        urlInput.value = metaResult.meta.url;
        try {
          localStorage.setItem("yt2ig:lastUrl", metaResult.meta.url);
        } catch {
        }
        paint();
        if (metaResult.error) setStatus(`Could not read the video details (${metaResult.error}).`, "warn");
        else if (!thumb) setStatus("No cover image was available for this video.", "warn");
        else setStatusVideo(meta.title, meta.url);
      } catch (err) {
        if (mine !== ticket) return;
        setStatus(err instanceof Error ? err.message : "Something went wrong.", "warn");
      }
    }
    function currentOptions() {
      return { ...options };
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void load(urlInput.value);
    });
    const pasteButton = document.getElementById("studio-paste");
    const readText = (_a = navigator.clipboard) == null ? void 0 : _a.readText;
    if (pasteButton) {
      pasteButton.hidden = typeof readText !== "function";
      pasteButton.addEventListener("click", () => {
        void (async () => {
          if (!readText) return;
          try {
            const text = (await readText.call(navigator.clipboard)).trim();
            if (!text) {
              setStatus("Clipboard is empty.", "warn");
              return;
            }
            urlInput.value = text;
            void load(text);
          } catch {
            setStatus("Clipboard access was refused \u2014 paste into the box instead.", "warn");
          }
        })();
      });
    }
    for (const [name, color] of ACCENT_SWATCHES.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.dataset.accent = color;
      button.style.setProperty("--swatch", color);
      button.setAttribute("aria-label", `Accent colour ${name + 1}`);
      button.addEventListener("click", () => {
        options = { ...options, accent: color };
        syncControls();
        paint();
      });
      accents.append(button);
    }
    themeDark.addEventListener("click", () => {
      options = { ...options, theme: "dark" };
      syncControls();
      paint();
    });
    themeLight.addEventListener("click", () => {
      options = { ...options, theme: "light" };
      syncControls();
      paint();
    });
    linkToggle.addEventListener("change", () => {
      options = { ...options, showLink: linkToggle.checked };
      syncControls();
      paint();
    });
    channelToggle.addEventListener("change", () => {
      options = { ...options, showChannel: channelToggle.checked };
      syncControls();
      paint();
    });
    handleToggle.addEventListener("change", () => {
      options = { ...options, showHandle: handleToggle.checked };
      syncControls();
      paint();
    });
    shareButton.addEventListener("click", () => {
      void (async () => {
        const ready = await currentBlob();
        if (!ready || !meta) {
          setStatus("Load a video first.", "warn");
          return;
        }
        const outcome = await shareImage(ready.blob, ready.filename, meta);
        if (outcome === "shared") setStatus("Nice \u2014 pick Instagram \u2192 Your story in the sheet.");
        else if (outcome === "cancelled") setStatus("Sharing cancelled.");
        else if (outcome === "blocked") {
          setStatus("The share sheet was blocked \u2014 it needs a tap on an https:// page. Download the PNG instead.", "warn");
        } else setStatus("This browser cannot share pictures; download the PNG instead.", "warn");
      })();
    });
    downloadButton.addEventListener("click", () => {
      void (async () => {
        const ready = await currentBlob();
        if (!ready) {
          setStatus("Load a video first.", "warn");
          return;
        }
        downloadBlob(ready.blob, ready.filename);
        setStatus(`Saved ${ready.filename}`);
      })();
    });
    copyButton.addEventListener("click", () => {
      void (async () => {
        const ready = await currentBlob();
        if (!ready) {
          setStatus("Load a video first.", "warn");
          return;
        }
        setStatus(await copyPng(ready.blob) ? "Copied \u2014 paste it into your story." : "Copying images is not available here.", "warn");
      })();
    });
    document.addEventListener("dragover", (event) => event.preventDefault());
    document.addEventListener("drop", (event) => {
      var _a2, _b2;
      const text = ((_a2 = event.dataTransfer) == null ? void 0 : _a2.getData("text/uri-list")) || ((_b2 = event.dataTransfer) == null ? void 0 : _b2.getData("text/plain"));
      if (!text) return;
      event.preventDefault();
      urlInput.value = text.trim();
      void load(urlInput.value);
    });
    canvas.addEventListener("click", openVideo);
    const igPanel = document.getElementById("studio-ig-panel");
    const igStory = document.getElementById("studio-ig-story");
    const igDm = document.getElementById("studio-ig-dm");
    if (igPanel && isLikelyPhone(navigator.userAgent, navigator.maxTouchPoints || 0)) {
      igPanel.hidden = false;
    }
    function openInstagram(target) {
      const { app, web } = instagramLinks(target);
      let left = false;
      const onHide = () => {
        left = true;
      };
      document.addEventListener("visibilitychange", onHide, { once: true });
      try {
        window.location.href = app;
      } catch {
        left = false;
      }
      window.setTimeout(() => {
        document.removeEventListener("visibilitychange", onHide);
        if (!left && document.visibilityState === "visible") window.location.href = web;
      }, 1500);
    }
    function sendToInstagram(target) {
      void (async () => {
        const ready = await currentBlob();
        if (!ready || !meta) {
          setStatus("Load a video first.", "warn");
          return;
        }
        downloadBlob(ready.blob, ready.filename);
        setStatus(
          target === "story" ? "Card saved. Opening Stories \u2014 tap the gallery thumb, then share it." : "Card saved. Opening DMs \u2014 pick the newest image, then choose who it goes to."
        );
        openInstagram(target);
      })();
    }
    igStory == null ? void 0 : igStory.addEventListener("click", () => sendToInstagram("story"));
    igDm == null ? void 0 : igDm.addEventListener("click", () => sendToInstagram("dm"));
    syncControls();
    paint();
    const startUrl = (_b = config.initialUrl) == null ? void 0 : _b.trim();
    if (startUrl) {
      urlInput.value = startUrl;
      if (config.autoLoad) void load(startUrl);
    } else {
      try {
        const remembered = localStorage.getItem("yt2ig:lastUrl");
        if (remembered) urlInput.value = remembered;
      } catch {
      }
    }
    return { load, options: currentOptions };
  }

  // yt-to-ig/src/web/app.ts
  var params = new URLSearchParams(location.search);
  function sharedLink() {
    return params.get("url") || params.get("text") || params.get("title") || "";
  }
  var studio = mountStudio({
    initialUrl: sharedLink(),
    autoLoad: true,
    storageKey: "web",
    hint: "This browser will not hand a picture to another app. Tap Download PNG instead, then add it to your story from the Instagram app."
  });
  window.yt2ig = { load: studio.load };
  var isFullWebApp = Boolean(document.querySelector('link[rel="manifest"]'));
  if (isFullWebApp && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("./sw.js").catch(() => void 0);
    });
  }
  var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent);
  var iosNote = document.getElementById("studio-ios-note");
  if (iosNote && isIOS) iosNote.hidden = false;
  var installButton = document.getElementById("studio-install");
  var installEvent = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event;
    if (installButton) installButton.hidden = false;
  });
  installButton == null ? void 0 : installButton.addEventListener("click", () => {
    void (async () => {
      var _a;
      await ((_a = installEvent == null ? void 0 : installEvent.prompt) == null ? void 0 : _a.call(installEvent));
      installEvent = null;
      installButton.hidden = true;
    })();
  });
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) document.documentElement.dataset.installed = "1";
})();
