'use strict';
import { runTexts, flowGroups, runSpacing } from './runs.js';

/*
 * Turns the decomposed template into printable HTML. Geometry is the PDF's
 * own: the background raster carries everything that is not text, and every
 * line of text is absolutely positioned at its original coordinates in the
 * original (re-embedded) fonts. Lines are reproduced run by run, exactly as
 * the PDF spaced them - including edited lines, where only the run holding
 * the changed words is re-set and every other run stays where it was.
 */

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (v) => Math.round(v * 100) / 100;

export function buildTemplateHtml(model, texts = null, changed = new Set()) {
  const fontCss = model.fonts.map((f) =>
    `@font-face{font-family:"${f.name}";src:url(data:${f.mime};base64,${f.b64});font-weight:${f.weight};font-style:${f.style}}`).join('\n');

  const spans = model.lines.map((line) => {
    const text = texts ? texts.get(line.id) : line.text;
    const family = `"${line.fontName}",${line.fallback}`;
    const box = `position:absolute;left:${n(line.left)}px;top:${n(line.top)}px;height:${n(line.height)}px;color:${line.color};line-height:1;white-space:pre;`;
    /* Unchanged, and edited lines whose change sits inside its runs, are
       drawn run by run at the PDF's own coordinates: every word the engine
       did not touch is reproduced exactly where the PDF put it. */
    const strs = changed.has(line.id) ? runTexts(line, text) : line.items.map((r) => r.str);
    if (strs) {
      /* Runs that touch are one box that flows; runs across a real gap are
         separate boxes at their own coordinates. A longer word pushes the
         rest of its own sentence along, and nothing else on the page moves. */
      const spaced = runSpacing(line);
      const boxes = flowGroups(line).map((g) => {
        const head = line.items[g[0]];
        const inner = g.map((i, k) => {
          const r = line.items[i];
          if (!strs[i]) return '';
          const sep = k > 0 && spaced[i] && !/^\s/.test(strs[i]) ? ' ' : '';
          return `<span style="font:${n(r.size)}px ${esc(`"${r.fontName}",${r.fallback}`)};">${esc(sep + strs[i])}</span>`;
        }).join('');
        return inner
          ? `<span style="position:absolute;left:${n(head.left - line.left)}px;top:${n(head.top - line.top)}px;">${inner}</span>`
          : '';
      }).join('');
      return `<div data-f="${line.id}" style="${box}width:${n(line.width)}px;">${boxes}</div>`;
    }
    /* the change straddles differently-set runs: draw the line as one piece */
    return `<div data-f="${line.id}" style="${box}font:${n(line.size)}px ${esc(family)};">${esc(text)}</div>`;
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
let meas;
const ctx2d = () => (meas ||= document.createElement('canvas').getContext('2d'));
export function lineFits(model, line, newText) {
  const f = model.fonts.find((x) => x.name === line.fontName);
  const m = ctx2d();
  m.font = `${f?.style === 'italic' ? 'italic ' : ''}${f?.weight === '700' ? '700 ' : ''}${line.size}px "${line.fontName}", ${line.fallback}`;
  const newW = m.measureText(newText).width;
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
