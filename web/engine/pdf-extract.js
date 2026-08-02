'use strict';

/*
 * PDF decomposition. Parses page one of the CV entirely in the browser:
 *   - every text run with its exact position, size and font (pdf.js)
 *   - the embedded fonts themselves, re-exported as @font-face data
 *   - each line's ink colour, sampled from the rendered page
 *   - a background image of everything that is not text (sidebars, rules,
 *     photos), made by painting the text out with the sampled local
 *     background colour
 * The result is a template whose geometry is the original document's own.
 */

import * as pdfjs from '../vendor/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.min.mjs', import.meta.url).href;

const CSS_SCALE = 96 / 72;      /* PDF points -> CSS pixels */
const RASTER = 3;               /* background render factor on top of that */

function b64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s);
}

function quant(r, g, b) { return `${r >> 4},${g >> 4},${b >> 4}`; }

/* Modal colour of a set of sample points in ImageData. */
function modalColour(img, points) {
  const counts = new Map();
  for (const [x, y] of points) {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
    const i = (y * img.width + x) * 4;
    const key = quant(img.data[i], img.data[i + 1], img.data[i + 2]);
    const cur = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    cur.n++; cur.r += img.data[i]; cur.g += img.data[i + 1]; cur.b += img.data[i + 2];
    counts.set(key, cur);
  }
  let best = null;
  for (const v of counts.values()) if (!best || v.n > best.n) best = v;
  return best ? [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)] : [255, 255, 255];
}

/* Colour in the box most distant from the background: the ink. */
function inkColour(img, x0, y0, x1, y1, bg) {
  let best = bg, bestD = 900;      /* require a real difference before trusting */
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const i = (y * img.width + x) * 4;
      const d = (img.data[i] - bg[0]) ** 2 + (img.data[i + 1] - bg[1]) ** 2 + (img.data[i + 2] - bg[2]) ** 2;
      if (d > bestD) { bestD = d; best = [img.data[i], img.data[i + 1], img.data[i + 2]]; }
    }
  }
  return best;
}

const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;

export async function decomposePdf(bytes) {
  const task = pdfjs.getDocument({ data: bytes });
  try {
    return await decompose(await task.promise);
  } finally {
    try { await task.destroy(); } catch { /* already gone */ }
  }
}

async function decompose(doc) {
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: CSS_SCALE });
  const pageW = vp.width, pageH = vp.height;

  /* ---- text geometry ---- */
  const content = await page.getTextContent();
  const runs = [];
  for (const item of content.items) {
    if (!item.str || !item.str.trim()) continue;
    const tx = pdfjs.Util.transform(vp.transform, item.transform);
    const size = Math.hypot(tx[2], tx[3]);
    const style = content.styles[item.fontName] || {};
    const ascent = style.ascent || 0.8;
    runs.push({
      str: item.str,
      left: tx[4],
      baseline: tx[5],
      top: tx[5] - size * ascent,
      width: item.width * CSS_SCALE,
      size,
      fontName: item.fontName,
      fallback: style.fontFamily || 'sans-serif',
    });
  }
  if (!runs.length) throw new Error('no-text');

  /* ---- group runs into lines ---- */
  runs.sort((a, b) => a.baseline - b.baseline || a.left - b.left);
  const lines = [];
  for (const r of runs) {
    const line = lines.length ? lines[lines.length - 1] : null;
    if (line && Math.abs(r.baseline - line.baseline) < Math.max(line.size, r.size) * 0.45) {
      line.items.push(r);
      line.baseline = (line.baseline * (line.items.length - 1) + r.baseline) / line.items.length;
    } else {
      lines.push({ items: [r], baseline: r.baseline });
    }
  }
  lines.forEach((line, i) => {
    line.items.sort((a, b) => a.left - b.left);
    line.id = `L${String(i + 1).padStart(3, '0')}`;
    line.left = line.items[0].left;
    line.size = Math.max(...line.items.map((r) => r.size));
    line.top = Math.min(...line.items.map((r) => r.top));
    const right = Math.max(...line.items.map((r) => r.left + r.width));
    line.width = right - line.left;
    line.height = line.size * 1.25;
    line.fontName = line.items[0].fontName;
    line.fallback = line.items[0].fallback;
    /* reconstruct readable text, inserting spaces at real gaps */
    let text = '', prevRight = null;
    for (const r of line.items) {
      if (prevRight !== null && r.left - prevRight > r.size * 0.16 && !text.endsWith(' ') && !r.str.startsWith(' ')) text += ' ';
      text += r.str;
      prevRight = r.left + r.width;
    }
    line.text = text.replace(/\s+/g, ' ').trim();
  });

  /* ---- render, sample colours, paint the text out ---- */
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pageW * RASTER);
  canvas.height = Math.round(pageH * RASTER);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  await page.render({ canvasContext: ctx, viewport: page.getViewport({ scale: CSS_SCALE * RASTER }) }).promise;

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (const line of lines) {
    const padX = Math.ceil(line.size * 0.35 * RASTER), padY = Math.ceil(line.size * 0.42 * RASTER);
    const x0 = Math.max(0, Math.floor(line.left * RASTER) - padX);
    const y0 = Math.max(0, Math.floor(line.top * RASTER) - padY);
    const x1 = Math.min(canvas.width, Math.ceil((line.left + line.width) * RASTER) + padX);
    const y1 = Math.min(canvas.height, Math.ceil((line.top + line.height) * RASTER) + padY);
    /* ring samples just outside the box give the local background */
    const ring = [];
    for (let y = y0; y < y1; y += 3) ring.push([x0 - 6, y], [x1 + 6, y]);
    for (let x = x0; x < x1; x += 3) ring.push([x, y0 - 6], [x, y1 + 6]);
    const bg = modalColour(img, ring);
    line.color = rgb(inkColour(img, Math.floor(line.left * RASTER), Math.floor(line.top * RASTER),
      Math.ceil((line.left + line.width) * RASTER), Math.ceil((line.top + line.height) * RASTER), bg));
    line.bg = bg;
  }
  /* paint out after all sampling, so neighbouring boxes sample true pixels */
  for (const line of lines) {
    const padX = Math.ceil(line.size * 0.35 * RASTER), padY = Math.ceil(line.size * 0.42 * RASTER);
    ctx.fillStyle = rgb(line.bg);
    ctx.fillRect(Math.floor(line.left * RASTER) - padX, Math.floor(line.top * RASTER) - padY,
      Math.ceil(line.width * RASTER) + padX * 2, Math.ceil(line.height * RASTER) + padY * 2);
  }
  const bgDataUrl = canvas.toDataURL('image/png');

  /* ---- embedded fonts ---- */
  const fonts = [];
  const seen = new Set();
  for (const line of lines) for (const r of line.items) {
    if (seen.has(r.fontName)) continue;
    seen.add(r.fontName);
    try {
      const obj = await new Promise((res) => page.commonObjs.get(r.fontName, res));
      if (obj?.data) {
        fonts.push({
          name: r.fontName,
          b64: b64(obj.data),
          mime: obj.mimetype || 'font/opentype',
          fallback: r.fallback,
          weight: /bold|black|heavy|semibold|demi/i.test(obj.name || '') ? '700' : '400',
          style: /italic|oblique/i.test(obj.name || '') ? 'italic' : 'normal',
        });
      }
    } catch { /* standard font with no embedded data; fallback family is enough */ }
  }

  const meta = { pages: doc.numPages };
  return {
    pageW, pageH, bgDataUrl, fonts, meta,
    lines: lines.map(({ id, left, top, width, height, size, fontName, fallback, color, text, items }) => ({
      id, left, top, width, height, size, fontName, fallback, color, text,
      items: items.map(({ str, left: l, top: t, size: s, fontName: f, fallback: fb }) => ({ str, left: l, top: t, size: s, fontName: f, fallback: fb })),
    })),
  };
}

/* Register the template's fonts in a document so previews and measurements
 * use the CV's real glyphs. */
export async function registerFonts(fonts, doc = document) {
  for (const f of fonts) {
    try {
      const face = new FontFace(f.name, Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0)),
        { weight: f.weight, style: f.style });
      await face.load();
      doc.fonts.add(face);
    } catch { /* fall back to the family class */ }
  }
}
