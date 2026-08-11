import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTexts, flowGroups, runSpacing } from '../runs.js';

/*
 * The layout guarantee: a tailored CV is the original PDF with words
 * swapped inside the runs that hold them. Every other run keeps its own
 * position, size and font, so nothing on the page can move.
 */

/* "Boots, Manchester      Supervisor, 2021 to now" - two runs, two fonts,
   a real gap between them, exactly as a CV header row is built. */
const headerLine = () => ({
  id: 'L1',
  text: 'Boots, Manchester Supervisor, 2021 to now',
  items: [
    { str: 'Boots, Manchester', left: 40, top: 100, w: 100, size: 12, fontName: 'Bold', fallback: 'serif' },
    { str: 'Supervisor, 2021 to now', left: 240, top: 101, w: 110, size: 10.5, fontName: 'Italic', fallback: 'serif' },
  ],
});

const bulletLine = () => ({
  id: 'L2',
  text: 'Handle customer care questions and complaints face to face.',
  items: [{ str: 'Handle customer care questions and complaints face to face.', left: 40, top: 200, size: 11.5, fontName: 'Body', fallback: 'serif' }],
});

test('an edit inside one run rewrites only that run', () => {
  const out = runTexts(bulletLine(), 'Handle customer service questions and complaints face to face.');
  assert.deepEqual(out, ['Handle customer service questions and complaints face to face.']);
});

test('editing one run of a multi-run line leaves the other run untouched', () => {
  const line = headerLine();
  const out = runTexts(line, 'Boots, Salford Supervisor, 2021 to now');
  assert.equal(out.length, 2);
  assert.equal(out[0], 'Boots, Salford');
  assert.equal(out[1], 'Supervisor, 2021 to now', 'the dates run must be byte-identical');
});

test('an edit in the second run leaves the first run untouched', () => {
  const out = runTexts(headerLine(), 'Boots, Manchester Team Leader, 2021 to now');
  assert.equal(out[0], 'Boots, Manchester');
  assert.equal(out[1], 'Team Leader, 2021 to now');
});

test('words added in the gap between two runs are refused, not guessed', () => {
  /* which side of the gap do the new words belong to? Unanswerable, so the
     line is drawn the safe way instead */
  assert.equal(runTexts(headerLine(), 'Boots, Manchester Ltd Senior Supervisor, 2021 to now'), null);
});

test('rewriting a line that has two boxes keeps both boxes where they are', () => {
  /* the words are shared out between the boxes the document already had:
     the line reads correctly and neither box moves */
  const out = runTexts(headerLine(), 'Shift lead across the north west region');
  assert.ok(out, 'the line is still drawable');
  assert.equal(out.length, 2);
  assert.equal(out.join(' '), 'Shift lead across the north west region');
});

test('a swap either side of the gap keeps each box in place', () => {
  const out = runTexts(headerLine(), 'Boots, Salford Manager, 2021 to now');
  assert.deepEqual(out, ['Boots, Salford', 'Manager, 2021 to now']);
});

test('runs that touch reflow together; a pinned run is never dragged along', () => {
  const line = {
    id: 'L9',
    text: 'Ran tills daily 2021 to now',
    items: [
      { str: 'Ran tills', left: 40, top: 10, w: 52, size: 12, fontName: 'Body', fallback: 'serif' },
      { str: 'daily', left: 96, top: 10, w: 28, size: 12, fontName: 'Bold', fallback: 'serif' },
      { str: '2021 to now', left: 300, top: 10, w: 60, size: 12, fontName: 'Italic', fallback: 'serif' },
    ],
  };
  assert.deepEqual(flowGroups(line), [[0, 1], [2]], 'the dates are their own box');
  const out = runTexts(line, 'Ran checkouts daily 2021 to now');
  assert.equal(out[0], 'Ran checkouts', 'reflows inside its own group');
  assert.equal(out[2], '2021 to now', 'the pinned run is untouched');
});

test('an edit spanning runs of the same font is allowed and keeps the rest', () => {
  const line = {
    id: 'L3',
    text: 'Ran weekly stock counts every Monday',
    items: [
      { str: 'Ran weekly stock', left: 40, top: 300, size: 11, fontName: 'Body', fallback: 'serif' },
      { str: 'counts every', left: 130, top: 300, size: 11, fontName: 'Body', fallback: 'serif' },
      { str: 'Monday', left: 200, top: 300, size: 11, fontName: 'Body', fallback: 'serif' },
    ],
  };
  const out = runTexts(line, 'Ran weekly stocktakes every Monday');
  assert.equal(out.length, 3);
  assert.equal(out[2], 'Monday', 'the untouched trailing run stays exactly as it was');
  assert.equal(out.join(' ').replace(/\s+/g, ' ').trim(), 'Ran weekly stocktakes every Monday');
});

test('two separate changes on one line each stay inside their own run', () => {
  /* a bolded phrase and a plain word both change: neither edit crosses a
     font boundary, so both are applied and the bold survives */
  const line = {
    id: 'L4',
    text: 'Handled customer care escalations and utilized daily reports.',
    items: [
      { str: 'Handled', left: 40, top: 200, size: 11.5, fontName: 'Body', fallback: 'serif' },
      { str: 'customer care', left: 92, top: 200, size: 11.5, fontName: 'Bold', fallback: 'serif' },
      { str: 'escalations and utilized daily reports.', left: 170, top: 200, size: 11.5, fontName: 'Body', fallback: 'serif' },
    ],
  };
  const out = runTexts(line, 'Handled customer service escalations and used daily reports.');
  assert.ok(out, 'both edits are drawable without moving anything');
  assert.equal(out[0], 'Handled', 'the untouched run is byte-identical');
  assert.equal(out[1], 'customer service', 'the bold run keeps being the bold run');
  assert.equal(out[2], 'escalations and used daily reports.');
});

test('a group is never grown into the box pinned beside it', () => {
  const line = {
    id: 'L8',
    text: 'Ran tills 2021 to now',
    items: [
      { str: 'Ran tills', left: 40, top: 10, w: 52, size: 12, fontName: 'Body', fallback: 'serif' },
      { str: '2021 to now', left: 110, top: 10, w: 60, size: 12, fontName: 'Italic', fallback: 'serif' },
    ],
  };
  /* only 70px before the dates start: this rewrite needs far more */
  assert.equal(runTexts(line, 'Ran the tills and self-service checkouts 2021 to now'), null);
});

test('the spaces between runs are known, so inline runs never glue together', () => {
  const line = {
    id: 'L7',
    text: 'Managing shift planning for a team',
    items: [
      { str: 'Managing', left: 40, top: 10, w: 46, size: 11.5, fontName: 'Body', fallback: 'serif' },
      { str: 'shift planning', left: 89, top: 10, w: 70, size: 11.5, fontName: 'Bold', fallback: 'serif' },
      { str: 'for a team', left: 162, top: 10, w: 52, size: 11.5, fontName: 'Body', fallback: 'serif' },
    ],
  };
  assert.deepEqual(runSpacing(line), [false, true, true]);
});

test('an unchanged line returns its runs verbatim', () => {
  const line = headerLine();
  assert.deepEqual(runTexts(line, line.text), ['Boots, Manchester', 'Supervisor, 2021 to now']);
});
