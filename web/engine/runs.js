'use strict';

/*
 * Run-level editing: the layout guarantee.
 *
 * A line of a CV is not one piece of text. It is a row of runs, each drawn
 * at its own x, in its own font and size - a job title on the left and its
 * dates on the right are two runs with a real gap between them. So an edit
 * is applied to the run that holds the words, and every other run on that
 * line is reproduced byte for byte at its own coordinates. Nothing on the
 * page can move because nothing else is re-drawn.
 *
 * Runs that touch each other are one flow of text that the PDF happened to
 * split - "Managing" + bold "shift planning" + "for a team of twelve" - so
 * they are drawn as one positioned box with the runs inline inside it, each
 * keeping its own font. A longer word reflows the rest of that sentence
 * exactly as the document would have, and nothing outside the box moves.
 *
 * Runs separated by a real gap - a job title on the left, its dates on the
 * right - are separate boxes at their own coordinates. An edit is never
 * allowed to cross that gap, because that would move the pinned element.
 */

const norm = (s) => s.replace(/\s+/g, ' ').trim();

/* Map every character of the line's text to the run that drew it (-1 for
   the spaces the extractor inserted at gaps between runs). The runs are
   aligned against the line's own text rather than re-measured, so this
   holds for a working copy loaded from storage, where run widths are not
   kept. Returns null if a run cannot be found, and the caller then leaves
   the line alone. */
function align(line) {
  const text = line.text;
  const owner = new Array(text.length).fill(-1);
  let cursor = 0;
  for (let i = 0; i < line.items.length; i++) {
    const needle = norm(line.items[i].str);
    if (!needle) continue;
    const at = text.indexOf(needle, cursor);
    if (at < 0) return null;
    for (let k = at; k < at + needle.length; k++) owner[k] = i;
    cursor = at + needle.length;
  }
  return owner;
}

/* Width of a run: measured at extraction, estimated for working copies saved
   before widths were kept. */
const runWidth = (r) => (typeof r.w === 'number' ? r.w : r.str.length * r.size * 0.5);

/*
 * Split a line's runs into flow groups. A gap wider than a word space means
 * the next run is placed deliberately, not flowing on from this one.
 */
/* Whether the extractor saw a space before each run: inside a flow group the
   runs sit inline, so that space has to be written back in or words would
   run together. */
export function runSpacing(line) {
  const owner = align(line);
  const text = line.text;
  return line.items.map((r, i) => {
    if (i === 0 || !owner) return false;
    const start = owner.indexOf(i);
    return start > 0 && /\s/.test(text[start - 1]);
  });
}

export function flowGroups(line) {
  const groups = [];
  line.items.forEach((r, i) => {
    const prev = line.items[i - 1];
    const gap = prev ? r.left - (prev.left + runWidth(prev)) : 0;
    if (!prev || gap > Math.max(prev.size, r.size) * 0.6) groups.push([i]);
    else groups[groups.length - 1].push(i);
  });
  return groups;
}

/*
 * Given a line and the new text for it, return the new string for each run,
 * or null when the change cannot be drawn without moving something.
 */
/* Word-level differences between the two versions of a line, as a list of
   {from, to, text} regions over the old text. A line usually carries more
   than one change - a mirrored phrase here, a UK spelling there - and each
   one has to be judged against the runs on its own. */
function regions(oldText, newText) {
  const A = oldText.split(/(\s+)/), B = newText.split(/(\s+)/);
  /* longest common subsequence over words: these strings are one CV line */
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0, pos = 0, open = null;
  const closeAt = (end, text) => { if (open !== null) { out.push({ from: open, to: end, text: text.trim() }); open = null; } };
  let buffer = '';
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) {
      closeAt(pos, buffer);
      buffer = '';
      pos += A[i].length;
      i++; j++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      if (open === null) open = pos;
      buffer += B[j];
      j++;
    } else {
      if (open === null) open = pos;
      pos += A[i].length;
      i++;
    }
  }
  closeAt(pos, buffer);
  return out.filter((r) => r.from !== r.to || r.text);
}

export function runTexts(line, newText) {
  const runs = line.items.map((r) => r.str);
  const oldText = line.text;
  if (newText === oldText) return runs;
  if (line.items.length === 1) return [newText];
  const owner = align(line);
  if (!owner) return null;

  const groups = flowGroups(line);
  const groupOf = new Map();
  groups.forEach((g, gi) => g.forEach((i) => groupOf.set(i, gi)));

  /* Trim each change to the characters a run actually drew: the spaces the
     extractor inserted at gaps belong to no run and are written back at
     render time. */
  const edits = [];
  for (const r of regions(oldText, newText)) {
    let from = r.from, to = r.to;
    while (from < to && owner[from] < 0) from++;
    while (to > from && owner[to - 1] < 0) to--;
    if (from === to) return null;                     /* words added in a gap */
    if (groupOf.get(owner[from]) !== groupOf.get(owner[to - 1])) return null;  /* crosses a pinned gap */
    edits.push({ from, to, text: r.text });
  }
  if (!edits.length) return runs;
  edits.sort((a, b) => a.from - b.from);

  /* Walk the line once, sending each character - or each replacement - to the
     run that drew it. Several changes on one line therefore compose. */
  const out = runs.map(() => '');
  let e = 0;
  for (let i = 0; i < oldText.length; i++) {
    if (e < edits.length && i === edits[e].from) {
      out[owner[i]] += edits[e].text;
      i = edits[e].to - 1;
      e++;
      continue;
    }
    if (owner[i] >= 0) out[owner[i]] += oldText[i];
  }
  for (let i = 0; i < out.length; i++) out[i] = out[i].replace(/\s+/g, ' ').trim();

  /* A group may reflow inside itself, but never into the box pinned next to
     it: check the group's new width against the space it actually has. */
  for (const g of groups) {
    const next = line.items[g[g.length - 1] + 1];
    if (!next) continue;
    const first = line.items[g[0]];
    const room = next.left - first.left;
    const grew = g.reduce((n, i) => n + out[i].length, 0) - g.reduce((n, i) => n + runs[i].length, 0);
    if (grew <= 0) continue;
    const width = g.reduce((n, i) => n + runWidth(line.items[i]), 0) + grew * first.size * 0.5;
    if (width > room) return null;
  }

  /* The invariant: these runs, read across the line, must say exactly what
     the tailored sentence says. If they do not, the change cannot be drawn
     this way and the caller falls back rather than showing something else. */
  const rebuilt = norm(out.filter(Boolean).join(' '));
  return rebuilt === norm(newText) ? out : null;
}
