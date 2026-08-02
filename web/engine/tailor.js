'use strict';
import { UK_SPELLINGS, SLOP, GENERIC_TERMS, STOPWORDS } from './rules.js';
import { extractJdTerms, analyseCoverage, guessTitleCompany, extractCredentials, tokenize, stem } from './nlp.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRe = (phrase, flags = 'gi') =>
  new RegExp(`(?<![A-Za-z0-9])${escapeRe(phrase).replace(/\\?\s+/g, '[\\s-]+')}(?![A-Za-z0-9])`, flags);

/* Give the replacement the capitalisation of what it replaces. */
function matchCase(found, replacement) {
  if (found === found.toUpperCase() && found.length > 2) return replacement.toUpperCase();
  if (/^[A-Z]/.test(found)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

/*
 * Build the proposal list. Three kinds, all word-level, all opt-in:
 *   mirror - the CV says it in different words; swap to the listing's term
 *   uk     - American spelling -> British
 *   plain  - a known AI-tell word -> its plain equivalent (humanizer lists)
 * A proposal never touches facts: mirror swaps stay inside one synonym
 * group, and the other two are dictionary lookups.
 */
export function buildProposals(lines, jdText, jobUrl) {
  const cvText = lines.map((l) => l.text).join('\n');
  const jdTerms = extractJdTerms(jdText);
  const { covered, viaSynonym, gaps } = analyseCoverage(jdTerms, cvText);
  const proposals = [];
  let seq = 0;
  const add = (line, kind, find, replace, why) => {
    const m = find.exec(line.text);
    find.lastIndex = 0;
    if (!m) return;
    const replaced = line.text.replace(find, (f) => matchCase(f, replace));
    if (replaced === line.text) return;
    proposals.push({ id: `p${++seq}`, lineId: line.id, kind, findSrc: find.source, replace, why, before: line.text, after: replaced });
  };

  /* mirror the listing's terminology where the CV shows the same thing */
  for (const t of viaSynonym) {
    const jdKeyStems = new Set(t.key.split(' '));
    for (const variant of t.group.variants) {
      const vStems = tokenize(variant).map((w) => w).join(' ');
      if (variant.toLowerCase() === t.display.toLowerCase()) continue;
      const re = phraseRe(variant);
      for (const line of lines) {
        if (re.test(line.text)) {
          re.lastIndex = 0;
          add(line, 'mirror', re, t.display, `the listing says "${t.display}"`);
        }
        re.lastIndex = 0;
      }
    }
  }

  /* UK spellings and plain-wording, dictionary passes */
  for (const line of lines) {
    for (const [us, uk] of Object.entries(UK_SPELLINGS)) {
      const re = phraseRe(us);
      if (re.test(line.text)) { re.lastIndex = 0; add(line, 'uk', re, uk, 'UK English'); }
    }
    for (const [tell, plain] of Object.entries(SLOP)) {
      const re = phraseRe(tell);
      if (re.test(line.text)) { re.lastIndex = 0; add(line, 'plain', re, plain, 'plainer wording'); }
    }
  }

  /* one proposal per (line, exact change); drop duplicates */
  const seenKeys = new Set();
  const unique = proposals.filter((p) => {
    const k = `${p.lineId}|${p.findSrc}|${p.replace}`;
    if (seenKeys.has(k)) return false;
    seenKeys.add(k);
    return true;
  });

  /*
   * Report assembly. n-gram extraction is deliberately greedy, so the
   * shortlist is built by exclusion:
   *  - a gap phrase is only real when NO content word of it appears
   *    anywhere in the CV (else it is partial-match noise)
   *  - overlapping phrases collapse onto the strongest one
   *  - credentials the listing names are always kept
   */
  const cvStems = new Set(tokenize(cvText).map(stem));
  const dedupeByStems = (terms) => {
    const kept = [], used = new Set();
    for (const t of terms) {
      const ss = t.key.split(' ').filter((s) => !used.has(s));
      if (ss.length < t.key.split(' ').length) continue;
      kept.push(t);
      t.key.split(' ').forEach((s) => used.add(s));
    }
    return kept;
  };
  const COMMON = new Set(('plan keep run running work help use make take give own deliver report weekly daily monthly busy provide ensure maintain manage lead time times peak store shop floor').split(' '));
  const adverbLike = (w) => /ly$/.test(w) && !['family', 'assembly', 'supply'].includes(w);
  const matched = dedupeByStems([...covered, ...viaSynonym].sort((a, b) => b.score - a.score))
    .filter((t) => t.words.length > 1 || (!COMMON.has(t.display) && !GENERIC_TERMS.has(t.display)));
  const creds = extractCredentials(jdText);
  const credStems = new Set(creds.flatMap((c) => tokenize(c).map(stem)));
  const cleanGaps = dedupeByStems(gaps.filter((t) =>
    !GENERIC_TERMS.has(t.display) &&
    t.words.every((w) => !STOPWORDS.has(w) && !COMMON.has(w) && !adverbLike(w)) &&
    t.key.split(' ').every((s) => !cvStems.has(s) && !credStems.has(s)) &&
    (t.words.length > 1 ? t.score >= 4.4 : t.score >= 6)));
  const gapList = [...new Set([...creds, ...cleanGaps.slice(0, 5).map((t) => t.display)])].slice(0, 7);

  const { title, company } = guessTitleCompany(jdText, jobUrl);
  return {
    proposals: unique,
    report: {
      matched: matched.length,
      mirrored: viaSynonym.length,
      gaps: gapList,
      topCovered: matched.slice(0, 8).map((t) => t.display),
    },
    title, company,
  };
}

/* Apply the ticked proposals. Returns Map lineId -> new text. */
export function applyProposals(lines, proposals, tickedIds) {
  const texts = new Map(lines.map((l) => [l.id, l.text]));
  const order = { mirror: 0, plain: 1, uk: 2 };
  const picked = proposals.filter((p) => tickedIds.has(p.id)).sort((a, b) => order[a.kind] - order[b.kind]);
  for (const p of picked) {
    const re = new RegExp(p.findSrc, 'gi');
    texts.set(p.lineId, texts.get(p.lineId).replace(re, (f) => matchCase(f, p.replace)));
  }
  return texts;
}
