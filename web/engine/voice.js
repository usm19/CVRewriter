'use strict';

/*
 * Morphology and voice reading for the tailoring engine.
 *
 * Inflections are generated from known base forms, never guessed from free
 * text, so a match always knows its base and form by construction. Only
 * verbs in VERBS may be conjugated, and only words of four letters or more
 * take a plural s: an acronym like "pos" or a preposition-collider like
 * "till" can never be matched or produced in a colliding form.
 */

const IRREGULAR = {
  oversee: { past: 'oversaw', ing: 'overseeing', s: 'oversees' },
  run: { past: 'ran', ing: 'running', s: 'runs' },
  lead: { past: 'led' },
  keep: { past: 'kept' },
  build: { past: 'built' },
  bring: { past: 'brought' },
  sell: { past: 'sold' },
  teach: { past: 'taught' },
  deal: { past: 'dealt' },
  win: { past: 'won' },
  write: { past: 'wrote' },
  drive: { past: 'drove' },
  set: { past: 'set', ing: 'setting' },
  hold: { past: 'held' },
  meet: { past: 'met' },
  make: { past: 'made' },
  give: { past: 'gave' },
  take: { past: 'took' },
  cut: { past: 'cut', ing: 'cutting' },
};

export const VERBS = new Set(('manage supervise oversee run head lead train coach mentor onboard induct upskill recruit hire delegate assign allocate liaise coordinate partner collaborate present pitch brief negotiate secure improve raise lift strengthen boost reduce cut lower bring deliver achieve complete create build set establish introduce launch maintain keep uphold sustain serve plan organise handle resolve support prepare order').split(' '));

const CVC = /[^aeiou][aeiou][^aeiouwxy]$/;

export function inflect(word, form) {
  if (form === 'base') return word;
  const irr = IRREGULAR[word]?.[form];
  if (irr) return irr;
  if (form === 'past') {
    if (word.endsWith('e')) return word + 'd';
    if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ied';
    if (CVC.test(word)) return word + word.at(-1) + 'ed';
    return word + 'ed';
  }
  if (form === 'ing') {
    if (word.endsWith('e') && !word.endsWith('ee')) return word.slice(0, -1) + 'ing';
    if (CVC.test(word)) return word + word.at(-1) + 'ing';
    return word + 'ing';
  }
  if (/(s|x|z|ch|sh)$/.test(word)) return word + 'es';
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  return word + 's';
}

/* surface -> {base, form} for one synonym-group variant. The head word
   inflects; the rest of the phrase travels literally. */
const INFLECTION_CACHE = new Map();
export function inflectionsOf(variant) {
  const hit = INFLECTION_CACHE.get(variant);
  if (hit) return hit;
  const m = new Map([[variant, { base: variant, form: 'base' }]]);
  const [head, ...rest] = variant.split(' ');
  const tail = rest.length ? ' ' + rest.join(' ') : '';
  const forms = VERBS.has(head) ? ['past', 'ing', 's'] : head.length >= 4 ? ['s'] : [];
  for (const form of forms) m.set(inflect(head, form) + tail, { base: variant, form });
  INFLECTION_CACHE.set(variant, m);
  return m;
}

/* Inflect the head word of a controlled phrase to a given form. */
export const inflectPhrase = (phrase, form) => {
  const [head, ...rest] = phrase.split(' ');
  return [inflect(head, form), ...rest].join(' ');
};

/* How the CV's owner writes: word frequencies and spelling lean. */
export function voiceProfile(lines) {
  const counts = new Map();
  let uk = 0, us = 0;
  const words = lines.map((l) => l.text).join('\n').toLowerCase().match(/[a-z][a-z'-]+/g) || [];
  for (const w of words) {
    counts.set(w, (counts.get(w) || 0) + 1);
    if (/(ise|ised|ising|isation)$/.test(w)) uk++;
    if (/(ize|ized|izing|ization)$/.test(w)) us++;
  }
  const text = ' ' + words.join(' ') + ' ';
  return {
    count: (w) => counts.get(w.toLowerCase()) || 0,
    phraseCount: (p) => text.split(' ' + p.toLowerCase().trim() + ' ').length - 1,
    spellingLean: uk > us ? 'uk' : us > uk ? 'us' : us ? 'mixed' : 'none',
  };
}
