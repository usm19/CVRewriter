import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflect, inflectionsOf, voiceProfile } from '../voice.js';
import { buildProposals } from '../tailor.js';
import { UK_SPELLINGS, SLOP } from '../rules.js';

/* ---------- voice.js: inflection engine ---------- */

test('inflect handles regular and irregular verb forms', () => {
  assert.equal(inflect('manage', 'past'), 'managed');
  assert.equal(inflect('manage', 'ing'), 'managing');
  assert.equal(inflect('oversee', 'past'), 'oversaw');
  assert.equal(inflect('run', 'ing'), 'running');
  assert.equal(inflect('run', 'past'), 'ran');
  assert.equal(inflect('supply', 'past'), 'supplied');
  assert.equal(inflect('coach', 's'), 'coaches');
  assert.equal(inflect('lead', 'past'), 'led');
});

test('inflectionsOf maps every surface form back to base and form', () => {
  const m = inflectionsOf('oversee');
  assert.deepEqual(m.get('oversaw'), { base: 'oversee', form: 'past' });
  assert.deepEqual(m.get('overseeing'), { base: 'oversee', form: 'ing' });
});

test('inflectionsOf inflects only the head word of a verb phrase', () => {
  const m = inflectionsOf('liaise with');
  assert.deepEqual(m.get('liaised with'), { base: 'liaise with', form: 'past' });
});

test('short non-verb tokens are never inflected', () => {
  const m = inflectionsOf('pos');
  assert.equal(m.size, 1);           /* only the base itself */
  assert.ok(m.has('pos'));
  assert.ok(!m.has('posed'));
  assert.ok(!m.has('poses'));
});

test('voiceProfile counts the owner’s words and reads the spelling lean', () => {
  const us = [{ text: 'I organized the rota and utilized reports.' }, { text: 'Organized weekly stock checks.' }];
  const uk = [{ text: 'Organised the rota.' }, { text: 'Recognised for customer care.' }];
  assert.equal(voiceProfile(us).count('organized'), 2);
  assert.equal(voiceProfile(us).spellingLean, 'us');
  assert.equal(voiceProfile(uk).spellingLean, 'uk');
});

/* ---------- tailor: agreement, guards, owner voice ---------- */

const jdManage = `Store Supervisor, Halfords Leeds

Key responsibilities
- Manage a small team across the week
- Manage the stockroom and deliveries`;

test('a mirror replacement agrees with the tense of the text it replaces', () => {
  const lines = [{ id: 'L1', text: 'Oversaw the stockroom team on weekends.' }];
  const { proposals } = buildProposals(lines, jdManage, '');
  const p = proposals.find((x) => x.kind === 'mirror' && /Oversaw/.test(x.before));
  assert.ok(p, 'expected a mirror proposal on "Oversaw"');
  assert.match(p.after, /^Managed the stockroom team/);
});

test('a mirror replacement agrees with an -ing form', () => {
  const lines = [{ id: 'L1', text: 'Spent weekends overseeing deliveries and post.' }];
  const { proposals } = buildProposals(lines, jdManage, '');
  const p = proposals.find((x) => x.kind === 'mirror' && /overseeing/.test(x.before));
  assert.ok(p, 'expected a mirror proposal on "overseeing"');
  assert.match(p.after, /managing deliveries/);
});

test('a Title Case skill entry keeps Title Case in the replacement', () => {
  const jd = `Retail Assistant, Currys\n\nKey responsibilities\n- Own stock control and replenishment`;
  const lines = [{ id: 'L1', text: 'Stock Management' }];
  const { proposals } = buildProposals(lines, jd, '');
  const p = proposals.find((x) => x.kind === 'mirror');
  assert.ok(p, 'expected a mirror proposal on the skill entry');
  assert.equal(p.after, 'Stock Control');
});

test('a proper-noun run is never touched', () => {
  const jd = `Retail Assistant, Currys\n\nKey responsibilities\n- Own stock control and replenishment`;
  const lines = [{ id: 'L1', text: 'Supervisor at Stock Management Ltd since 2021.' }];
  const { proposals } = buildProposals(lines, jd, '');
  assert.equal(proposals.filter((p) => p.kind === 'mirror').length, 0);
});

test('a swap that would double a word is dropped', () => {
  const jd = `Shop Assistant, Boots\n\nKey responsibilities\n- Deliver excellent customer service every day`;
  const lines = [{ id: 'L1', text: 'Ran the customer care service desk each morning.' }];
  const { proposals } = buildProposals(lines, jd, '');
  for (const p of proposals) assert.ok(!/\b(\w+) \1\b/i.test(p.after), `duplicated word in "${p.after}"`);
});

test('a slop word the owner uses repeatedly is offered but off by default', () => {
  const jd = `Shop Assistant, Boots\n\nKey responsibilities\n- Keep the shop floor tidy`;
  const twice = [
    { id: 'L1', text: 'Spearheaded the refit of the beauty aisle.' },
    { id: 'L2', text: 'Spearheaded weekly deep cleans.' },
  ];
  const once = [{ id: 'L1', text: 'Spearheaded the refit of the beauty aisle.' }];
  const twiceP = buildProposals(twice, jd, '').proposals.filter((p) => p.kind === 'plain');
  assert.ok(twiceP.length >= 2);
  for (const p of twiceP) {
    assert.equal(p.defaultOff, true);
    assert.match(p.why, /voice/i);
  }
  const onceP = buildProposals(once, jd, '').proposals.filter((p) => p.kind === 'plain');
  assert.equal(onceP.length, 1);
  assert.ok(!onceP[0].defaultOff);
});

test('no dictionary value smuggles in a contraction', () => {
  const contraction = /\b\w+n't\b|\b(it|that|he|she|we|they|you|i)'(s|re|ll|ve|m|d)\b/i;
  for (const v of [...Object.values(UK_SPELLINGS), ...Object.values(SLOP)]) {
    assert.ok(!contraction.test(v), `contraction in dictionary value "${v}"`);
  }
});

/* ---------- rules + nlp growth ---------- */

test('phrase-level UK fixes fire', () => {
  const jd = `Delivery Driver, DPD Leeds\n\nKey responsibilities\n- Complete multi-drop routes on time`;
  const lines = [
    { id: 'L1', text: 'Full clean driving license held since 2018.' },
    { id: 'L2', text: 'Follow best practise for manual handling.' },
    { id: 'L3', text: 'Completed the graduate training program in 2020.' },
  ];
  const { proposals } = buildProposals(lines, jd, '');
  const uk = proposals.filter((p) => p.kind === 'uk').map((p) => p.replace.toLowerCase());
  assert.ok(uk.includes('driving licence'));
  assert.ok(uk.includes('best practice'));
  assert.ok(uk.includes('training programme'));
});

test('an inline Essential credential lands in the gaps', () => {
  const jd = `Security Officer, Meadowhall\n\nAbout the role\nPatrolling the centre and helping visitors.\nEssential: SIA licence and weekend availability.`;
  const lines = [{ id: 'L1', text: 'Kept visitors safe and logged incident reports nightly.' }];
  const { report } = buildProposals(lines, jd, '');
  assert.ok(report.gaps.some((g) => /sia/i.test(g)), `gaps were: ${report.gaps.join(' | ')}`);
});

test('a job-title word the CV cannot evidence lands in the gaps', () => {
  const jd = `Barista Team Leader, Caffe Nero Leeds\n\nKey responsibilities\n- Lead the morning shift\n- Keep the counter moving`;
  const lines = [{ id: 'L1', text: 'Led a team of six on the morning shift.' }];
  const { report } = buildProposals(lines, jd, '');
  assert.ok(report.gaps.some((g) => /barista/i.test(g)), `gaps were: ${report.gaps.join(' | ')}`);
  assert.ok(!report.gaps.some((g) => /leader|nero|leeds/i.test(g)), `role or place words leaked: ${report.gaps.join(' | ')}`);
});
