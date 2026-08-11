import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tailorSentences } from '../tailor.js';

/*
 * Sounding like the person who wrote the CV. A swap that is technically
 * correct but written in a different hand reads as machine text, so the
 * engine copies the owner's own habits: their hyphens, their ampersands,
 * their abbreviations - and it leaves their headings alone.
 */

const jd = (body) => `Team Leader, Fenwick\n\nWhat we're looking for\n${body}`;

test('the owner’s hyphen habit is kept when the listing spells it open', () => {
  const lines = [{ id: 'L1', text: 'Ran front-of-house during the lunch rush.' }];
  const { edits } = tailorSentences(lines, jd('- front of house experience\n- front of house leadership'), '');
  const e = edits.find((x) => x.lineId === 'L1');
  if (e) for (const v of e.variants) assert.doesNotMatch(v.text, /front of house/i, 'kept the owner’s hyphens');
});

test('the owner’s open spelling is kept when the listing hyphenates', () => {
  const lines = [{ id: 'L1', text: 'Led the front of house team on weekends.' }];
  const { edits } = tailorSentences(lines, jd('- front-of-house experience\n- front-of-house cover'), '');
  const e = edits.find((x) => x.lineId === 'L1');
  if (e) for (const v of e.variants) assert.doesNotMatch(v.text, /front-of-house/i, 'kept the owner’s spacing');
});

test('an ampersand in the CV is not turned into the word “and”', () => {
  const lines = [{ id: 'L1', text: 'Handled health & safety checks each shift.' }];
  const { edits } = tailorSentences(lines, jd('- health and safety knowledge\n- health and safety checks'), '');
  const e = edits.find((x) => x.lineId === 'L1');
  if (e) for (const v of e.variants) assert.doesNotMatch(v.text, /health and safety/i, 'the owner writes “&”');
});

test('section headings are never reworded', () => {
  const lines = [
    { id: 'L1', text: 'CUSTOMER CARE' },
    { id: 'L2', text: 'Handled customer care questions all day.' },
  ];
  const { edits } = tailorSentences(lines, jd('- customer service experience\n- customer service in a busy store'), '');
  assert.ok(!edits.some((e) => e.lineId === 'L1'), 'the heading is structure, not prose');
  assert.ok(edits.some((e) => e.lineId === 'L2'), 'the sentence below it is still tailored');
});

test('a swap never leaves a sentence longer than the words it replaced by much', () => {
  /* the page has finite room: a much longer phrase is a layout risk and
     reads like padding, so it is not the default wording */
  const lines = [{ id: 'L1', text: 'Ran the tills at peak times.' }];
  const { edits } = tailorSentences(lines, jd('- responsible for overseeing the tills\n- overseeing tills at peak times'), '');
  const e = edits.find((x) => x.lineId === 'L1');
  if (e) assert.ok(e.variants[0].text.length <= lines[0].text.length + 12, `default stayed close in length: "${e.variants[0].text}"`);
});
