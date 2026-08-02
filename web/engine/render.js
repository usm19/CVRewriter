'use strict';

/*
 * Turns the decomposed template into printable HTML. Geometry is the PDF's
 * own: the background raster carries everything that is not text, and every
 * line of text is absolutely positioned at its original coordinates in the
 * original (re-embedded) fonts. Unchanged lines are reproduced run by run,
 * exactly as the PDF spaced them; edited lines are set as one run at the
 * line's position.
 */

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => Math.round(v * 100) / 100;

export function buildTemplateHtml(model, texts = null, changed = new Set()) {
  const fontCss = model.fonts.map((f) =>
    `@font-face{font-family:"${f.name}";src:url(data:${f.mime};base64,${f.b64});font-weight:${f.weight};font-style:${f.style}}`).join('\n');

  const spans = model.lines.map((line) => {
    const text = texts ? texts.get(line.id) : line.text;
    const family = `"${line.fontName}",${line.fallback}`;
    if (!changed.has(line.id)) {
      const runs = line.items.map((r) =>
        `<span style="position:absolute;left:${n(r.left - line.left)}px;top:${n(r.top - line.top)}px;font:${n(r.size)}px ${esc(`"${r.fontName}",${r.fallback}`)};">${esc(r.str)}</span>`).join('');
      return `<div data-f="${line.id}" style="position:absolute;left:${n(line.left)}px;top:${n(line.top)}px;width:${n(line.width)}px;height:${n(line.height)}px;color:${line.color};line-height:1;white-space:pre;">${runs}</div>`;
    }
    return `<div data-f="${line.id}" style="position:absolute;left:${n(line.left)}px;top:${n(line.top)}px;height:${n(line.height)}px;color:${line.color};font:${n(line.size)}px ${esc(family)};line-height:1;white-space:pre;">${esc(text)}</div>`;
  }).join('\n');

  return `<div class="page"><style>
${fontCss}
.page{position:relative;width:${n(model.pageW)}px;height:${n(model.pageH)}px;overflow:hidden;background:#fff url(${model.bgDataUrl}) no-repeat;background-size:100% 100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page div{margin:0;padding:0}
</style>
${spans}
</div>`;
}

/* Width guard: measure an edited line in its own font; warn when it would
 * run wider than the room the page actually has for it. */
const meas = document.createElement('canvas').getContext('2d');
export function lineFits(model, line, newText) {
  const f = model.fonts.find((x) => x.name === line.fontName);
  meas.font = `${f?.style === 'italic' ? 'italic ' : ''}${f?.weight === '700' ? '700 ' : ''}${line.size}px "${line.fontName}", ${line.fallback}`;
  const newW = meas.measureText(newText).width;
  /* room: to the next line box on the same row, else to the page edge */
  const rowNeighbours = model.lines.filter((o) => o.id !== line.id &&
    Math.abs(o.top - line.top) < line.height * 0.6 && o.left > line.left + line.width * 0.5);
  const limit = rowNeighbours.length
    ? Math.min(...rowNeighbours.map((o) => o.left)) - line.left - 4
    : model.pageW - line.left - 8;
  return { fits: newW <= Math.max(limit, line.width * 1.02), newW, limit };
}

/* The largest line in the top third of the page is almost always the name. */
export function guessOwnerName(model) {
  const top = model.lines.filter((l) => l.top < model.pageH / 3 && l.text.length > 2 && l.text.length < 40);
  if (!top.length) return 'CV';
  return top.sort((a, b) => b.size - a.size)[0].text;
}
