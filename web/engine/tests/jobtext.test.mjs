import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobFromJsonLd, cleanJobText, looksLikeBlock } from '../jobtext.js';

/*
 * Reading a job listing off a page. Most boards publish a schema.org
 * JobPosting block, which is the listing itself rather than the page around
 * it; where they do not, the text still has to be stripped of navigation,
 * cookie banners and the rest of the furniture.
 */

const posting = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: 'Team Leader',
  hiringOrganization: { '@type': 'Organization', name: 'Fenwick' },
  description: '<p>Plan weekly <b>rotas</b>.</p><ul><li>Deliver customer service</li><li>Own stock control</li></ul>',
});

test('a JobPosting block gives the listing’s own title, company and text', () => {
  const got = jobFromJsonLd(posting);
  assert.equal(got.title, 'Team Leader');
  assert.equal(got.company, 'Fenwick');
  assert.match(got.text, /Plan weekly rotas\./);
  assert.match(got.text, /Deliver customer service/);
  assert.doesNotMatch(got.text, /<p>|<li>/, 'the description’s markup is stripped');
});

test('a JobPosting inside a @graph array is still found', () => {
  const graph = JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage' }, JSON.parse(posting)] });
  assert.equal(jobFromJsonLd(graph).title, 'Team Leader');
});

test('a page with no JobPosting returns nothing rather than guessing', () => {
  assert.equal(jobFromJsonLd(JSON.stringify({ '@type': 'Organization', name: 'Fenwick' })), null);
  assert.equal(jobFromJsonLd('not json at all'), null);
});

test('cleanJobText drops furniture and keeps the listing', () => {
  const raw = `Skip to main content
Cookies on this service
We use cookies to make this service work.
Accept all cookies    Reject
Menu   Sign in   Search

Team Leader, Fenwick Newcastle

Key responsibilities
- Plan weekly rotas for a team of ten
- Deliver excellent customer service

Cookie settings
Copyright 2026 Crown copyright`;
  const out = cleanJobText(raw);
  assert.match(out, /Plan weekly rotas/);
  assert.match(out, /Team Leader, Fenwick/);
  assert.doesNotMatch(out, /Accept all cookies/i);
  assert.doesNotMatch(out, /Skip to main content/i);
  assert.doesNotMatch(out, /Crown copyright/i);
});

test('cleanJobText collapses runaway blank lines and spacing', () => {
  assert.equal(cleanJobText('A\n\n\n\n\nB   C'), 'A\n\nB C');
});

test('requirement headings survive the furniture filter', () => {
  /* Civil Service listings hang their criteria under bare headings; losing
     one would cost the engine the weighting for everything beneath it */
  const out = cleanJobText('Essential\nExperience of leading a team\n\nEssential criteria\nDesirable\nFull driving licence');
  assert.match(out, /^Essential$/m);
  assert.match(out, /Essential criteria/);
  assert.match(out, /^Desirable$/m);
});

test('a bot-check page is recognised instead of being fed to the engine', () => {
  assert.ok(looksLikeBlock('Please enable JavaScript and cookies to continue'));
  assert.ok(looksLikeBlock('Checking your browser before accessing the site. DDoS protection by Cloudflare'));
  assert.ok(looksLikeBlock('Access denied. You do not have permission to access this server.'));
  assert.ok(!looksLikeBlock('Team Leader, Fenwick. Plan weekly rotas and deliver customer service every day in a busy food hall.'));
});
