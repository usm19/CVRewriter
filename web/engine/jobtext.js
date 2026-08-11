'use strict';

/*
 * Getting the listing itself out of a job page.
 *
 * Job boards publish the same page three ways: a schema.org JobPosting block
 * (the listing as data - by far the best source), the readable article body,
 * and the whole page with its navigation, cookie banner and footer. This
 * module prefers them in that order and knows what a bot-check page looks
 * like, so a challenge page is never mistaken for a job description.
 */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#160': ' ' };

/* Strip HTML from a JobPosting description, which is markup by convention. */
export function stripHtml(html) {
  return String(html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|ul|ol|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const typeOf = (node) => [].concat(node?.['@type'] || []).map(String);

function findPosting(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findPosting(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeOf(node).includes('JobPosting')) return node;
  for (const key of ['@graph', 'itemListElement', 'mainEntity', 'item']) {
    const hit = findPosting(node[key], depth + 1);
    if (hit) return hit;
  }
  return null;
}

/* Parse one <script type="application/ld+json"> body. Returns null unless it
   really carries a JobPosting. */
export function jobFromJsonLd(jsonText) {
  let data;
  try { data = JSON.parse(String(jsonText)); } catch { return null; }
  const p = findPosting(data);
  if (!p) return null;
  const company = typeof p.hiringOrganization === 'string' ? p.hiringOrganization : p.hiringOrganization?.name || '';
  const body = stripHtml(p.description || '');
  const head = [p.title, p.employmentType, p.jobLocation?.address?.addressLocality].filter(Boolean).join(', ');
  const text = [head, body].filter(Boolean).join('\n\n');
  if (!text.trim()) return null;
  return { title: String(p.title || '').trim(), company: String(company).trim(), text };
}

/* Page furniture: lines that are never part of a job description. */
const FURNITURE = [
  /^skip to (main )?(content|navigation)/i,
  /cookies? (on this|policy|settings|preferences)/i,
  /we use cookies/i,
  /^(?=.*\b(accept|reject|allow|manage)\b)((accept|reject|allow|manage|all|only|necessary|essential|optional|analytics|cookies?|settings|preferences)\b[\s,·|\/-]*)+$/i,
  /^(menu|search|sign in|sign out|log in|register|home|back|next|previous|share|print|save|apply now|skip)$/i,
  /^(privacy|terms|accessibility|contact us|sitemap|feedback)( (policy|statement|and conditions))?$/i,
  /crown copyright|all rights reserved|^copyright/i,
  /^follow us|^connect with us/i,
  /javascript (is )?(disabled|required)/i,
  /^\s*$/,
];

export function cleanJobText(raw) {
  const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
  const kept = [];
  for (const line of lines) {
    const t = line.replace(/[ \t]+/g, ' ').trim();
    if (FURNITURE.some((re) => re.test(t))) {
      if (kept.length && kept[kept.length - 1] !== '') kept.push('');
      continue;
    }
    kept.push(t);
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* A challenge or error page, not a listing. */
const BLOCK_SIGNS = [
  /enable javascript and cookies/i,
  /checking your browser/i,
  /ddos protection|cloudflare/i,
  /access denied|permission to access/i,
  /are you a (human|robot)|prove you are human/i,
  /request (blocked|unsuccessful)|unusual traffic/i,
  /captcha/i,
  /(403|429) (forbidden|too many requests)/i,
];
export const looksLikeBlock = (text) => {
  const t = String(text || '');
  return BLOCK_SIGNS.some((re) => re.test(t)) && t.length < 4000;
};
