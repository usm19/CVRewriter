'use strict';
import { UK_SPELLINGS, SLOP, GENERIC_TERMS, STOPWORDS } from './rules.js';
import { extractJdTerms, analyseCoverage, guessTitleCompany, extractCredentials, tokenize, stem, stemKey, phraseRe } from './nlp.js';
import { inflectionsOf, inflectPhrase, VERBS, voiceProfile } from './voice.js';

/* Dictionary regexes are static: compile once. */
const UK_RES = Object.entries(UK_SPELLINGS).map(([k, v]) => [phraseRe(k), v]);
const SLOP_RES = Object.entries(SLOP).map(([k, v]) => [phraseRe(k), v, k]);

/* Seniority nouns say what the role is called, not what it needs; a craft
   role word (barista, chef, driver) is a real requirement. Only the former
   are noise in a gap report. */
const SENIORITY_RE = /\b(manager|assistant|supervisor|coordinator|administrator|executive|officer|advisor|adviser|analyst|specialist|consultant|associate|apprentice|leader|lead|director|head|operative|steward|colleague|member)\b/i;

/* Give the replacement the capitalisation of what it replaces, including the
   owner's Title Case habit on skill lists. */
function matchCase(found, replacement) {
  if (found === found.toUpperCase() && found.length > 2) return replacement.toUpperCase();
  const words = found.split(/[\s-]+/);
  if (words.length > 1 && words.every((w) => /^[A-Z0-9]/.test(w))) {
    return replacement.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  if (/^[A-Z]/.test(found)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

/* A short line whose every word is capitalised is a heading or a skill-list
   entry, not a proper-noun run. */
const isTitleLine = (text) => {
  const words = text.trim().split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  return words.length > 0 && words.length <= 6 && words.every((w) => /^[A-Z0-9("']/.test(w));
};

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
  const profile = voiceProfile(lines);
  const proposals = [];
  let seq = 0;
  const dupRe = /\b([A-Za-z]+) \1\b/i;
  const add = (line, kind, find, replace, why, opts = {}) => {
    const m = find.exec(line.text);
    find.lastIndex = 0;
    if (!m) return;
    /* proper-noun guard: a capitalised match mid-sentence beside another
       capitalised word is a name, not vocabulary */
    if (/^[A-Z]/.test(m[0]) && m.index > 0 && !isTitleLine(line.text)) {
      const before = line.text.slice(0, m.index).trimEnd();
      const nextWord = line.text.slice(m.index + m[0].length).trimStart().split(/\s+/)[0] || '';
      const prevWord = before.split(/\s+/).pop() || '';
      if (!/[.!?:]$/.test(before) && (/^[A-Z][a-z]/.test(nextWord) || /^[A-Z][a-z]/.test(prevWord))) return;
    }
    const replaced = line.text.replace(find, (f) => matchCase(f, replace));
    if (replaced === line.text) return;
    if (dupRe.test(replaced) && !dupRe.test(line.text)) return;   /* "service service" */
    proposals.push({ id: `p${++seq}`, lineId: line.id, kind, findSrc: find.source, replace, why, before: line.text, after: replaced, ...opts });
  };

  /* Mirror the listing's terminology where the CV shows the same thing, in
     the grammatical form the CV already uses. */
  const cvLower = cvText.toLowerCase();
  const mirrored = new Set();
  for (const t of viaSynonym) {
    const jdVariant = t.group.variants.find((v) => stemKey(v) === t.key) || t.display;
    const groupKey = `${t.group.index}|${jdVariant}`;
    if (mirrored.has(groupKey)) continue;
    mirrored.add(groupKey);
    for (const variant of t.group.variants) {
      if (variant === jdVariant) continue;
      for (const [surface, info] of inflectionsOf(variant)) {
        let replace;
        if (info.form === 'base') replace = t.display;
        else if (VERBS.has(jdVariant.split(' ')[0])) replace = inflectPhrase(jdVariant, info.form);
        else continue;                     /* cannot inflect the listing's term to match */
        if (replace.toLowerCase() === surface.toLowerCase()) continue;
        const re = phraseRe(surface);
        if (!re.test(cvLower)) { re.lastIndex = 0; continue; }
        re.lastIndex = 0;
        for (const line of lines) add(line, 'mirror', re, replace, `the listing says "${t.display}"`);
      }
    }
  }

  /* UK spellings and plain-wording, dictionary passes. A word the owner uses
     repeatedly is their voice (career-ops Voice DNA): still offered, but off
     by default. */
  const often = new Map();
  const usesOften = (phrase) => {
    if (!often.has(phrase)) often.set(phrase, profile.phraseCount(phrase) >= 2);
    return often.get(phrase);
  };
  for (const line of lines) {
    for (const [re, uk] of UK_RES) add(line, 'uk', re, uk, 'UK English');
    for (const [re, plain, tell] of SLOP_RES) {
      const off = usesOften(tell);
      add(line, 'plain', re, plain, off ? 'appears often in your CV, so it may be your voice' : 'plainer wording', off ? { defaultOff: true } : {});
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
    (t.words.length > 1 || !SENIORITY_RE.test(t.display)) &&
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
