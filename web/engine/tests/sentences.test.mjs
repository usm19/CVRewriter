import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tailorSentences, sentenceTexts } from '../tailor.js';
import { SYNONYMS } from '../rules.js';

/*
 * Sentence-level tailoring: the engine applies its honest changes itself and
 * reports them per sentence, each with ranked alternative wordings drawn from
 * the same synonym group (never invented), so the app can offer
 * edit / regenerate / put-it-back on each highlighted sentence.
 */

const jdService = `Customer Service Assistant, Fenwick

What we're looking for
- Deliver excellent customer service every day
- Customer service experience in a busy store`;

const cvLines = () => [
  { id: 'L1', text: 'Priya Shah' },
  { id: 'L2', text: 'Customer care on the shop floor at busy times.' },
  { id: 'L3', text: 'Weekly stock checks and deliveries.' },
];

test('tailorSentences returns each changed sentence with its original and tailored text', () => {
  const { edits, report, title } = tailorSentences(cvLines(), jdService, '');
  assert.equal(title, 'Customer Service Assistant');
  assert.ok(report && typeof report.matched === 'number');
  const e = edits.find((x) => x.lineId === 'L2');
  assert.ok(e, 'expected an edit for the customer-care line');
  assert.equal(e.original, 'Customer care on the shop floor at busy times.');
  assert.match(e.variants[0].text, /^Customer service on the shop floor/);
  const c = e.variants[0].changes[0];
  assert.equal(c.from, 'Customer care');
  assert.equal(c.to, 'Customer service');
  assert.match(c.why, /listing/);
});

test('sentences the engine does not touch never appear in the edits list', () => {
  const { edits } = tailorSentences(cvLines(), jdService, '');
  assert.ok(!edits.some((e) => e.lineId === 'L1'));
  assert.ok(edits.every((e) => e.variants.every((v) => v.text !== e.original)));
});

test('regenerating offers a different wording from the same synonym group, never invented', () => {
  const { edits } = tailorSentences(cvLines(), jdService, '');
  const e = edits.find((x) => x.lineId === 'L2');
  assert.ok(e.variants.length >= 2, 'expected alternative wordings to cycle through');
  const texts = e.variants.map((v) => v.text);
  assert.equal(new Set(texts).size, texts.length, 'variants must all differ');
  const group = SYNONYMS.find((g) => g[0] === 'customer service');
  for (const v of e.variants) {
    assert.ok(group.some((m) => v.text.toLowerCase().includes(m)),
      `"${v.text}" must use a member of the customer-service group`);
  }
});

test('a verb swap keeps the CV’s grammatical form in every variant', () => {
  const jd = `Team Leader, Fenwick

What we're looking for
- Lead the team from the front
- Lead daily briefings and handovers`;
  const lines = [{ id: 'L1', text: 'Running the tills at peak times.' }];
  const { edits } = tailorSentences(lines, jd, '');
  const e = edits.find((x) => x.lineId === 'L1');
  assert.ok(e, 'expected the running line to be tailored');
  for (const v of e.variants) {
    assert.match(v.text, /^(Leading|Managing|Supervising|Overseeing|Heading) the tills at peak times\.$/);
  }
});

test('words the owner uses often stay untouched in the automatic rewrite', () => {
  const lines = [
    { id: 'L1', text: 'Leveraged supplier deals to cut costs.' },
    { id: 'L2', text: 'Leveraged seasonal trends in weekly plans.' },
  ];
  const { edits } = tailorSentences(lines, 'Buying Assistant\n\nRequirements\n- negotiation with suppliers', '');
  assert.ok(edits.every((e) => e.variants.every((v) => !/\bused\b/i.test(v.text))),
    'the owner’s repeated word is their voice, not slop to strip');
});

test('a US-spelled listing term is mirrored in its UK spelling', () => {
  const jd = `Call Center Advisor, Acme

Requirements
- call center experience with inbound calls
- call center systems knowledge`;
  const lines = [{ id: 'L1', text: 'Ran a busy contact centre floor.' }];
  const { edits } = tailorSentences(lines, jd, '');
  const e = edits.find((x) => x.lineId === 'L1');
  assert.ok(e, 'expected the contact-centre line to be tailored');
  assert.match(e.variants[0].text, /call centre/);
  for (const v of e.variants) assert.doesNotMatch(v.text, /center\b/);
});

test('sentenceTexts resolves variant, custom and put-it-back states', () => {
  const lines = cvLines();
  const { edits } = tailorSentences(lines, jdService, '');
  const e = edits.find((x) => x.lineId === 'L2');

  const auto = sentenceTexts(lines, edits, new Map());
  assert.equal(auto.texts.get('L2'), e.variants[0].text);
  assert.ok(auto.changed.has('L2'));

  const custom = sentenceTexts(lines, edits, new Map([['L2', { mode: 'custom', text: 'My own words.' }]]));
  assert.equal(custom.texts.get('L2'), 'My own words.');
  assert.ok(custom.changed.has('L2'));

  const back = sentenceTexts(lines, edits, new Map([['L2', { mode: 'original' }]]));
  assert.equal(back.texts.get('L2'), 'Customer care on the shop floor at busy times.');
  assert.ok(!back.changed.has('L2'));
});
