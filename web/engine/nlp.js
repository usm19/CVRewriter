'use strict';
import { STOPWORDS, GENERIC_TERMS, SYNONYMS, TECH, TECH_ALIASES, REQUIREMENT_HEADER_RE, NON_REQUIREMENT_HEADER_RE, ROLE_WORDS } from './rules.js';
import { inflectionsOf } from './voice.js';

/* ---------- tokenising ---------- */
export function tokenize(text) {
  return (String(text || '').toLowerCase().match(/[a-z][a-z0-9+#&'./-]*/g) || [])
    .map((t) => t.replace(/^['./-]+|['./-]+$/g, ''))
    .filter((t) => t.length > 1);
}

/* Porter stemmer, standard implementation, enough for matching. */
export function stem(w) {
  if (w.length < 3) return w;
  const v = '[aeiouy]', c = '[^aeiouy]';
  const mgr0 = new RegExp(`^(${c}+)?${v}[a-z]*${c}`);
  const meq1 = new RegExp(`^(${c}+)?${v}[a-z]*${c}(${v}[a-z]*)?$`);
  const mgr1 = new RegExp(`^(${c}+)?(${v}[a-z]*${c}){2}`);
  const hasV = new RegExp(`^(${c}+)?${v}`);
  let w2 = w.replace(/^y/, 'Y');
  /* step 1a */
  if (/sses$/.test(w2)) w2 = w2.replace(/sses$/, 'ss');
  else if (/ies$/.test(w2)) w2 = w2.replace(/ies$/, 'i');
  else if (/ss$/.test(w2)) { /* keep */ }
  else if (/s$/.test(w2) && w2.length > 2) w2 = w2.slice(0, -1);
  /* step 1b */
  if (/eed$/.test(w2)) { if (mgr0.test(w2.replace(/eed$/, ''))) w2 = w2.replace(/eed$/, 'ee'); }
  else {
    const m = /^(.*?)(ed|ing)$/.exec(w2);
    if (m && hasV.test(m[1])) {
      w2 = m[1];
      if (/(at|bl|iz|is)$/.test(w2)) w2 += 'e';
      else if (/([^aeiouylsz])\1$/.test(w2)) w2 = w2.slice(0, -1);
      else if (new RegExp(`^${c}+${v}[^aeiouwxy]$`).test(w2)) w2 += 'e';
    }
  }
  /* step 1c */
  if (/y$/.test(w2) && hasV.test(w2.slice(0, -1))) w2 = w2.slice(0, -1) + 'i';
  /* step 2/3 light: common suffixes */
  const pairs = [[/ational$/, 'ate'], [/tional$/, 'tion'], [/iser$/, 'ise'], [/izer$/, 'ize'], [/isation$/, 'ise'], [/ization$/, 'ize'], [/ation$/, 'ate'], [/ator$/, 'ate'], [/alism$/, 'al'], [/iveness$/, 'ive'], [/fulness$/, 'ful'], [/ousness$/, 'ous'], [/aliti$/, 'al'], [/iviti$/, 'ive'], [/biliti$/, 'ble'], [/alli$/, 'al'], [/entli$/, 'ent'], [/ousli$/, 'ous'], [/fulli$/, 'ful'], [/lessli$/, 'less'], [/icate$/, 'ic'], [/ative$/, ''], [/alize$/, 'al'], [/alise$/, 'al'], [/ical$/, 'ic'], [/ful$/, ''], [/ness$/, '']];
  for (const [re, rep] of pairs) { if (re.test(w2)) { const s = w2.replace(re, rep); if (mgr0.test(s)) w2 = s; break; } }
  /* step 4 */
  const s4 = /^(.*?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize|ise)$/.exec(w2);
  if (s4 && mgr1.test(s4[1])) w2 = s4[1];
  else { const s4b = /^(.*?[st])(ion)$/.exec(w2); if (s4b && mgr1.test(s4b[1])) w2 = s4b[1]; }
  /* step 5 */
  if (/e$/.test(w2)) { const s = w2.slice(0, -1); if (mgr1.test(s) || (meq1.test(s) && !new RegExp(`^${c}+${v}[^aeiouwxy]$`).test(s))) w2 = s; }
  if (/ll$/.test(w2) && mgr1.test(w2)) w2 = w2.slice(0, -1);
  return w2.replace(/^Y/, 'y');
}

const stemKey = (phrase) => tokenize(phrase).map(stem).join(' ');

/* ---------- synonym lattice ---------- */
/* Indexed over every generated inflection surface, so an irregular form in
   a listing ("oversaw") still finds its group. */
const GROUP_OF = new Map();   /* stemKey(surface) -> group index */
SYNONYMS.forEach((group, gi) => group.forEach((v) => {
  for (const surface of inflectionsOf(v).keys()) GROUP_OF.set(stemKey(surface), gi);
}));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const surfaceRe = (s) => new RegExp(`(?<![a-z0-9])${escapeRe(s).replace(/\\?\s+/g, '[\\s-]+')}(?![a-z0-9])`);

/* Does the CV show this group in any of its variants' inflections? */
export function groupInText(group, textLower) {
  return group.variants.some((v) =>
    [...inflectionsOf(v).keys()].some((s) => surfaceRe(s).test(textLower)));
}

const TECH_CANON = new Map(); /* lowercase -> display */
TECH.forEach((t) => TECH_CANON.set(t.toLowerCase(), t));
Object.entries(TECH_ALIASES).forEach(([a, d]) => TECH_CANON.set(a, d));

export function synonymGroup(phrase) {
  const g = GROUP_OF.get(stemKey(phrase));
  return g === undefined ? null : { index: g, variants: SYNONYMS[g] };
}

/* ---------- job listing analysis ---------- */
const INLINE_REQ_RE = /^\s*(essential|desirable|must[- ]haves?|required|preferred)\b\s*[:\-]/i;

function sectionWeights(lines) {
  const weights = [];
  let inReq = false;
  for (const line of lines) {
    if (REQUIREMENT_HEADER_RE.test(line)) inReq = true;
    else if (NON_REQUIREMENT_HEADER_RE.test(line)) inReq = false;
    weights.push(INLINE_REQ_RE.test(line) ? 4 : inReq ? 3 : 1);
  }
  return weights;
}

export function guessTitleCompany(jdText, jobUrl) {
  const lines = jdText.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 25);
  let title = '', company = '';
  for (const l of lines) {
    if (l.length < 80 && ROLE_WORDS.test(l) && !/apply|salary|location|posted|ago\b/i.test(l)) { title = l.replace(/^[#>*\s-]+/, ''); break; }
  }
  /* "Team Leader, Fenwick" or "Team Leader at Fenwick" or "Team Leader - Fenwick" */
  const split = title.match(/^(.{3,50}?)(?:,| at | @ | \| | [-–] )\s*(.{2,40})$/);
  if (split && ROLE_WORDS.test(split[1])) { title = split[1].trim(); company = split[2].trim(); }
  if (!company) {
    const at = jdText.slice(0, 400).match(/(?:\bat|\bjoin)\s+([A-Z][A-Za-z0-9&'. ]{2,30}?)(?=[,.\n]| as | in | to |$)/m);
    if (at) company = at[1].trim();
  }
  if (!company && jobUrl) {
    try {
      const host = new URL(jobUrl).hostname.replace(/^(www|careers|jobs|apply|recruit|talent|vacancies)\./, '');
      if (!/indeed|linkedin|reed|totaljobs|glassdoor|monster|cv-library|jobsite|gov\.uk|google|lever|greenhouse|workable|smartrecruiters/i.test(host)) {
        company = host.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
      }
    } catch { /* not a url */ }
  }
  return { title: title || 'Tailored CV', company };
}

/* Credentials the listing asks for: never dropped from the gap report. */
const CRED_RE = /\b(?:(?:level|grade)\s+\d\s+)?(?:current\s+|valid\s+|full\s+)?((?:first\s+aid|food\s+hygiene|food\s+safety|safeguarding|manual\s+handling|health\s+and\s+safety|coshh|haccp|dbs|cscs|nvq|btec|city\s*&\s*guilds|driving\s+licence|driver'?s?\s+licence|forklift|flt|personal\s+licence|sia)\b(?:\s+(?:certificate|certification|qualification|licence|license|check|card|badge|training))?|[a-z]+\s+(?:certificate|qualification)\b)/gi;
export function extractCredentials(jdText) {
  const out = new Set();
  let m;
  while ((m = CRED_RE.exec(jdText)) !== null) out.add(m[1].toLowerCase().replace(/\s+/g, ' ').trim());
  return [...out];
}

/*
 * Extract the listing's key terms with weights. Unigrams, bigrams and
 * trigrams; requirement sections and repeats score higher; stopwords,
 * generic filler and pure numbers are dropped.
 */
export function extractJdTerms(jdText) {
  const lines = jdText.split(/\n/);
  const weights = sectionWeights(lines);
  const scores = new Map();     /* stemKey -> {score, display} */
  const bump = (phrase, w) => {
    const words = tokenize(phrase);
    if (!words.length || words.every((t) => STOPWORDS.has(t))) return;
    if (words.length === 1 && (STOPWORDS.has(words[0]) || GENERIC_TERMS.has(words[0]))) return;
    const key = words.map(stem).join(' ');
    if (!key) return;
    const cur = scores.get(key) || { score: 0, display: phrase.toLowerCase(), words };
    cur.score += w;
    scores.set(key, cur);
  };

  /* the job title's own words are what the listing is most about */
  const titleLine = lines.slice(0, 8).find((l) => l.trim() && l.trim().length < 80 && ROLE_WORDS.test(l));
  if (titleLine) {
    for (const tok of tokenize(titleLine.split(/,| at | \| /)[0])) {
      if (!STOPWORDS.has(tok)) bump(tok, 6);
    }
  }

  lines.forEach((line, i) => {
    if (REQUIREMENT_HEADER_RE.test(line) || NON_REQUIREMENT_HEADER_RE.test(line)) return;
    if (line === titleLine) return;
    const w = weights[i];
    const toks = tokenize(line).filter((t) => !/^\d+$/.test(t));
    for (let j = 0; j < toks.length; j++) {
      if (!STOPWORDS.has(toks[j])) bump(toks[j], w);
      if (j + 1 < toks.length) {
        const bi = `${toks[j]} ${toks[j + 1]}`;
        if (!STOPWORDS.has(toks[j]) && !STOPWORDS.has(toks[j + 1])) bump(bi, w * 2.2);
      }
      if (j + 2 < toks.length) {
        const tri = `${toks[j]} ${toks[j + 1]} ${toks[j + 2]}`;
        if (!STOPWORDS.has(toks[j]) && !STOPWORDS.has(toks[j + 2])) bump(tri, w * 2.6);
      }
    }
    /* named technologies get canonical display and a solid score */
    for (const [lower, display] of TECH_CANON) {
      if (new RegExp(`(?<![\\w.])${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.])`, 'i').test(line)) bump(display, w * 2.5);
    }
  });

  /* keep phrases that recur or sit in requirement sections; drop weak noise */
  return [...scores.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .filter((t) => t.score >= 3 || (t.words.length > 1 && t.score >= 2.2))
    .sort((a, b) => b.score - a.score)
    .slice(0, 80);
}

/* ---------- CV coverage ---------- */
export function analyseCoverage(jdTerms, cvText) {
  const cvStems = new Set(tokenize(cvText).map(stem));
  const cvKey = ' ' + tokenize(cvText).map(stem).join(' ') + ' ';
  const cvLower = cvText.toLowerCase();
  const covered = [], viaSynonym = [], gaps = [];
  for (const t of jdTerms) {
    if (cvKey.includes(' ' + t.key + ' ') || (t.words.length === 1 && cvStems.has(t.key))) { covered.push(t); continue; }
    const g = synonymGroup(t.display);
    if (g && groupInText(g, cvLower)) { viaSynonym.push({ ...t, group: g }); continue; }
    gaps.push(t);
  }
  return { covered, viaSynonym, gaps };
}
