'use strict';
import { UK_SPELLINGS, SLOP, GENERIC_TERMS, STOPWORDS } from './rules.js';
import { extractJdTerms, analyseCoverage, guessTitleCompany, extractCredentials, tokenize, stem, stemKey, phraseRe } from './nlp.js';
import { inflectionsOf, inflectPhrase, VERBS, voiceProfile } from './voice.js';

/* Dictionary regexes are static: compile once. */
const UK_RES = Object.entries(UK_SPELLINGS).map(([k, v]) => [phraseRe(k), v]);
const SLOP_RES = Object.entries(SLOP).map(([k, v]) => [phraseRe(k), v, k]);

/* Everything the engine writes into a CV is UK English, even when the
   listing itself spells a term the American way. */
function ukify(phrase) {
  for (const [re, uk] of UK_RES) {
    phrase = phrase.replace(re, uk);
    re.lastIndex = 0;
  }
  return phrase;
}

/* Seniority nouns say what the role is called, not what it needs; a craft
   role word (barista, chef, driver) is a real requirement. Only the former
   are noise in a gap report. */
const SENIORITY_RE = /\b(manager|assistant|supervisor|coordinator|administrator|executive|officer|advisor|adviser|analyst|specialist|consultant|associate|apprentice|leader|lead|director|head|operative|steward|colleague|member|developer|engineer|designer|technician|programmer)\b/i;

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

/* The owner's own punctuation habits travel with the swap: if they write
   "front-of-house", the listing's "front of house" arrives hyphenated. */
function matchStyle(found, replacement) {
  const hyphenated = /[A-Za-z0-9]-[A-Za-z0-9]/.test(found);
  const spaced = /[A-Za-z0-9] [A-Za-z0-9]/.test(found);
  if (hyphenated && !spaced) return replacement.replace(/ /g, '-');
  if (spaced && !hyphenated) return replacement.replace(/-/g, ' ');
  return replacement;
}

/* An all-capitals line is a section heading: structure, not prose. The
   engine rewords what the person wrote, never the shape of their CV. */
const isHeadingLine = (text) => {
  const words = text.trim().split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  return words.length > 0 && words.length <= 5 && !/[a-z]/.test(text);
};

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
  jdText = String(jdText || '').replace(/\r\n?/g, '\n');
  const cvText = lines.map((l) => l.text).join('\n');
  const jdTerms = extractJdTerms(jdText);
  const { covered, viaSynonym, gaps } = analyseCoverage(jdTerms, cvText);
  const profile = voiceProfile(lines);
  const proposals = [];
  let seq = 0;
  const dupRe = /\b([A-Za-z]+) \1\b/i;
  const add = (line, kind, find, replace, why, opts = {}) => {
    if (isHeadingLine(line.text)) return;
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
    const replaced = line.text.replace(find, (f) => matchCase(f, matchStyle(f, replace)));
    if (replaced === line.text) return;
    if (dupRe.test(replaced) && !dupRe.test(line.text)) return;   /* "service service" */
    proposals.push({ id: `p${++seq}`, lineId: line.id, kind, findSrc: find.source, replace, why, before: line.text, after: replaced, ...opts });
  };

  /* Mirror the listing's terminology where the CV shows the same thing, in
     the grammatical form the CV already uses. Each swap also carries ranked
     alternatives from the same group - the owner's own vocabulary first - so
     a sentence can be regenerated without ever inventing a claim. */
  const altRank = (a) => profile.phraseCount(a) * 10 + profile.count(a.split(' ')[0]);
  const cvLower = cvText.toLowerCase();
  const mirrored = new Set();
  for (const t of viaSynonym) {
    const jdVariant = t.group.variants.find((v) => stemKey(v) === t.key) || t.display;
    const groupKey = `${t.group.index}|${jdVariant}`;
    if (mirrored.has(groupKey)) continue;
    mirrored.add(groupKey);
    for (const variant of t.group.variants) {
      if (variant === jdVariant) continue;
      const jdIsVerb = VERBS.has(jdVariant.split(' ')[0]);
      for (const [surface, info] of inflectionsOf(variant)) {
        let replace;
        if (jdIsVerb) replace = inflectPhrase(jdVariant, info.form);   /* match the CV's own form */
        else if (info.form === 'base') replace = t.display;            /* nouns keep the listing's surface */
        else continue;                     /* cannot inflect the listing's term to match */
        replace = ukify(replace);
        if (replace.toLowerCase() === surface.toLowerCase()) continue;
        const re = phraseRe(surface);
        if (!re.test(cvLower)) { re.lastIndex = 0; continue; }
        re.lastIndex = 0;
        const alts = [...new Set(t.group.variants
          .filter((gv) => gv !== jdVariant && gv !== variant)
          .map((gv) => ukify(jdIsVerb ? inflectPhrase(gv, info.form) : gv)))]
          .filter((a) => a.toLowerCase() !== surface.toLowerCase() && a.toLowerCase() !== replace.toLowerCase())
          .sort((a, b) => altRank(b) - altRank(a))
          .slice(0, 4);
        for (const line of lines) add(line, 'mirror', re, replace, `the listing says "${t.display}"`, alts.length ? { alts } : {});
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
    t.words.every((w) => !STOPWORDS.has(w) && !COMMON.has(w) && !GENERIC_TERMS.has(w) && !adverbLike(w)) &&
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

/*
 * Sentence-level tailoring: apply the engine's own defaults and report the
 * result per sentence. Each edited sentence carries every honest rendering of
 * itself - variant 0 is the listing-aligned default, the rest swap in other
 * members of the same synonym groups, the owner's own vocabulary first - so
 * the app can offer edit / regenerate / put-it-back on each highlighted line.
 * Proposals the voice guard turned off are not applied: they are the owner's
 * voice until the owner says otherwise.
 */
export function tailorSentences(lines, jdText, jobUrl) {
  const { proposals, report, title, company } = buildProposals(lines, jdText, jobUrl);
  const order = { mirror: 0, plain: 1, uk: 2 };
  const auto = proposals.filter((p) => !p.defaultOff).sort((a, b) => order[a.kind] - order[b.kind]);
  const byLine = new Map();
  for (const p of auto) {
    if (!byLine.has(p.lineId)) byLine.set(p.lineId, []);
    byLine.get(p.lineId).push(p);
  }
  const edits = [];
  for (const line of lines) {
    const ps = byLine.get(line.id);
    if (!ps) continue;
    const options = ps.map((p) => [p.replace, ...(p.alts || [])]);
    const total = Math.min(options.reduce((n, o) => n * o.length, 1), 24);
    const variants = [], seen = new Set([line.text]);
    for (let k = 0; k < total && variants.length < 6; k++) {
      /* mixed-radix combo: the first change cycles fastest, so regenerate
         visibly reworks the sentence on every press */
      let idx = k, text = line.text;
      const changes = [];
      ps.forEach((p, i) => {
        const choice = options[i][idx % options[i].length];
        idx = Math.floor(idx / options[i].length);
        const re = new RegExp(p.findSrc, 'gi');
        const m = re.exec(text);
        if (!m) return;
        re.lastIndex = 0;
        changes.push({ from: m[0], to: matchCase(m[0], matchStyle(m[0], choice)), why: p.why, kind: p.kind });
        text = text.replace(re, (f) => matchCase(f, matchStyle(f, choice)));
      });
      if (seen.has(text)) continue;
      seen.add(text);
      variants.push({ text, changes });
    }
    if (variants.length) edits.push({ lineId: line.id, original: line.text, variants });
  }
  return { edits, report, title, company };
}

/*
 * Resolve the texts a set of edits produces under the user's decisions.
 * state: Map lineId -> {mode:'variant', v} | {mode:'custom', text} | {mode:'original'}.
 * No entry means the engine's default (variant 0).
 */
export function sentenceTexts(lines, edits, state) {
  const texts = new Map(lines.map((l) => [l.id, l.text]));
  const changed = new Set();
  for (const e of edits) {
    const st = state.get(e.lineId) || { mode: 'variant', v: 0 };
    if (st.mode === 'original') continue;
    const text = st.mode === 'custom' ? st.text : e.variants[(st.v || 0) % e.variants.length].text;
    if (text !== e.original) { texts.set(e.lineId, text); changed.add(e.lineId); }
  }
  return { texts, changed };
}

/* Apply the ticked proposals. Returns Map lineId -> new text. */
export function applyProposals(lines, proposals, tickedIds) {
  const texts = new Map(lines.map((l) => [l.id, l.text]));
  const order = { mirror: 0, plain: 1, uk: 2 };
  const picked = proposals.filter((p) => tickedIds.has(p.id)).sort((a, b) => order[a.kind] - order[b.kind]);
  for (const p of picked) {
    const re = new RegExp(p.findSrc, 'gi');
    texts.set(p.lineId, texts.get(p.lineId).replace(re, (f) => matchCase(f, matchStyle(f, p.replace))));
  }
  return texts;
}
