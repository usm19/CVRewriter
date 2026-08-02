import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProposals, applyProposals } from '../tailor.js';

/* Locks the engine behaviour verified in the browser E2E on 2 Aug 2026.
   If one of these breaks, a change altered something a user already relies on. */

const LINES = [
  { id: 'L001', text: 'Priya Shah' },
  { id: 'L002', text: 'Retail supervisor, Manchester' },
  { id: 'L003', text: 'Supervisor with six years on busy shop floors. I organized shift planning' },
  { id: 'L004', text: 'for a team of eight and utilized daily reports to keep checkouts moving.' },
  { id: 'L005', text: 'Ran stock management across two storerooms with weekly stock counts.' },
  { id: 'L006', text: 'Trained new starters in customer care and complaint handling.' },
  { id: 'L007', text: 'Skills: Microsoft Excel, cash handling, visual merchandising' },
];

const JD = `Team Leader, Fenwick Newcastle

The role
We are looking for a Team Leader for our busy food hall.

Key responsibilities
- Plan weekly rotas for a team of ten
- Keep tills and self-service checkouts running smoothly at peak times
- Deliver excellent customer service and resolve complaints on the spot
- Own stock control and weekly stocktakes
- Report performance to the store manager using Excel

What we're looking for
- Experience leading a team in retail or hospitality
- A current first aid certificate
- Level 2 food hygiene qualification
- Confident with Excel and daily reporting

Benefits
- Staff discount, pension, 28 days holiday`;

const run = () => buildProposals(LINES, JD, 'https://careers.fenwick.co.uk/jobs/123');

test('job title and company come from the listing heading', () => {
  const { title, company } = run();
  assert.equal(title, 'Team Leader');
  assert.equal(company, 'Fenwick Newcastle');
});

test('the five known mirrors are all proposed', () => {
  const { proposals } = run();
  const pairs = proposals.filter((p) => p.kind === 'mirror').map((p) => p.replace.toLowerCase());
  for (const expected of ['customer service', 'stock control', 'rotas', 'tills', 'stocktakes']) {
    assert.ok(pairs.includes(expected), `expected a mirror to "${expected}"`);
  }
});

test('gaps are exactly the two credentials the CV lacks', () => {
  const { report } = run();
  assert.deepEqual([...report.gaps].sort(), ['first aid certificate', 'food hygiene qualification']);
});

test('applying every proposal produces the known tailored lines', () => {
  const { proposals } = run();
  const texts = applyProposals(LINES, proposals, new Set(proposals.map((p) => p.id)));
  assert.match(texts.get('L003'), /organised rotas/);
  assert.match(texts.get('L004'), /used daily reports to keep tills moving/);
  assert.match(texts.get('L005'), /stock control .*stocktakes/i);
  assert.match(texts.get('L006'), /customer service/);
});

test('unticked proposals leave their lines untouched', () => {
  const { proposals } = run();
  const texts = applyProposals(LINES, proposals, new Set());
  for (const l of LINES) assert.equal(texts.get(l.id), l.text);
});
