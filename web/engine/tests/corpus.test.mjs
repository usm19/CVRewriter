import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProposals } from '../tailor.js';

/* Breadth corpus: different professions, listing styles, and line endings. */

test('a CRLF-pasted listing parses identically to LF', () => {
  const lf = `Office Administrator, Leeds\n\nKey responsibilities\n- Diary management for two directors\n- Minute taking at weekly meetings`;
  const crlf = lf.replace(/\n/g, '\r\n');
  const lines = [{ id: 'L1', text: 'Managed calendar management and note taking for the sales team.' }];
  const a = buildProposals(lines, lf, '');
  const b = buildProposals(lines, crlf, '');
  assert.equal(b.proposals.length, a.proposals.length);
  assert.ok(a.proposals.some((p) => /diary management/i.test(p.replace)));
});

test('office admin CV mirrors the listing vocabulary', () => {
  const jd = `Team Administrator, NHS Trust\n\nEssential criteria\n- Diary management and minute taking\n- Processing expense claims\n- Audio typing`;
  const lines = [
    { id: 'L1', text: 'Calendar management for three consultants.' },
    { id: 'L2', text: 'Note taking at board meetings and typing up dictation.' },
    { id: 'L3', text: 'Processed staff expenses monthly.' },
  ];
  const { proposals, report } = buildProposals(lines, jd, '');
  const replaces = proposals.filter((p) => p.kind === 'mirror').map((p) => p.replace.toLowerCase());
  assert.ok(replaces.includes('diary management'), `mirrors were: ${replaces.join(', ')}`);
  assert.ok(replaces.includes('minute taking'), `mirrors were: ${replaces.join(', ')}`);
  assert.ok(report.matched >= 2);
});

test('developer CV: tech names are matched, absent tech is a gap', () => {
  const jd = `Software Developer, Sky Leeds\n\nWhat you'll bring\n- Solid TypeScript and React experience\n- PostgreSQL in production\n- Docker and Kubernetes exposure`;
  const lines = [
    { id: 'L1', text: 'Built customer dashboards in React and TypeScript.' },
    { id: 'L2', text: 'Ran Postgres migrations for the billing service.' },
  ];
  const { report } = buildProposals(lines, jd, '');
  assert.ok(report.gaps.some((g) => /docker|kubernetes/i.test(g)), `gaps were: ${report.gaps.join(' | ')}`);
  assert.ok(!report.gaps.some((g) => /react|typescript|postgres/i.test(g)), `gaps were: ${report.gaps.join(' | ')}`);
});

test('care worker CV: credential gaps surface, wording mirrors', () => {
  const jd = `Care Assistant, Anchor Care Home\n\nWho you are\n- Experienced in personal care and medication administration\n- A valid DBS check\n- Manual handling training`;
  const lines = [
    { id: 'L1', text: 'Supported residents with intimate care and daily routines.' },
    { id: 'L2', text: 'Completed meds rounds under supervision.' },
  ];
  const { proposals, report } = buildProposals(lines, jd, '');
  const replaces = proposals.filter((p) => p.kind === 'mirror').map((p) => p.replace.toLowerCase());
  assert.ok(replaces.includes('personal care'), `mirrors were: ${replaces.join(', ')}`);
  assert.ok(report.gaps.some((g) => /dbs/i.test(g)), `gaps were: ${report.gaps.join(' | ')}`);
});
