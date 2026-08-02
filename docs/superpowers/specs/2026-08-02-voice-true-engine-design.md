# Voice-true tailoring engine (v2) design

Goal: every proposal the engine makes reads as if the CV's owner wrote it. The engine
interprets the language already on the CV and tailors in that language, with grammar
that agrees with the sentence around each change.

## Approaches considered

- **A. Deterministic voice engine (chosen).** A voice profile of the CV plus
  morphological agreement and safety guards, layered on the existing synonym-group
  mirroring. Fully unit-testable, zero dependencies, truth-lock preserved by
  construction (nothing generative exists).
- B. Statistical language model of the CV scoring candidate replacements. Opaque,
  hard to test precisely, overkill for word-level swaps. Rejected.
- C. Dictionary expansion only. Does not interpret the CV's language. Rejected.

## Domain rules adopted

From career-ops Voice DNA (`career-ops/modes/_writing.md`, `career-ops/voice-dna.md`)
and the humanizer skill's voice calibration:

1. Words the owner reaches for repeatedly are their voice: never auto-change them.
2. Accuracy always wins over style: a swap shapes wording, never content.
3. CV text keeps the formal register: the engine must never introduce contractions
   or conversational tone.
4. The anti-slop banned lists apply only as suggestions, and the owner's own usage
   outranks them.

## Components

1. **`web/engine/voice.js` (new)**
   - `inflect(base, form)` and per-group inflection maps: for every single-word
     synonym variant (and the head word of verb-particle variants), generate
     base / past / -ing / -s forms with an irregular-verb table, so a match knows
     its base and form by construction. No free-text morphology guessing.
   - `voiceProfile(lines)`: owner word frequencies and UK/US spelling lean.
2. **`web/engine/tailor.js` upgrades**
   - Inflection agreement: a mirror replacement is produced in the same
     morphological form as the text it replaces ("Oversaw" + listing "manage" →
     "Managed"; "overseeing" → "managing"; "rota" stays singular).
   - Case agreement: Title Case lines get Title Case replacements; ALL CAPS kept.
   - Proper-noun guard: no swap inside a capitalised name run in a mixed-case line
     ("Stock Management Ltd" is untouchable; a title-case skill entry is not).
   - Repetition guard: no swap that creates an adjacent duplicate word
     ("customer service service").
   - Owner-voice lock: a plain-wording suggestion for a word the owner uses twice
     or more is created `defaultOff` with a "may be your voice" note.
   - Register lock: no dictionary value or replacement contains a contraction.
3. **`web/engine/rules.js` expansion**: phrase-level UK entries (driving licence,
   best practice, training programme), further humanizer/Voice DNA slop entries with
   safe plain equivalents, ~35 new synonym groups (warehouse, IT support, call
   centre, construction, security, cleaning, driving, events, charity, beauty).
4. **`web/engine/nlp.js`**: inline Essential/Desirable weighting; job-title token
   boost.
5. **Tests**: `web/engine/tests/engine.test.mjs` on `node:test`, zero dependencies;
   red-green per behaviour; regression locks for existing behaviour; `npm test`;
   GitHub Actions workflow running the suite on push.

## Acceptance

- Every proposal is grammatical in context (inflection and case tests pass).
- No proposal touches a proper-noun run or creates a duplicated word.
- Owner-frequent vocabulary is never changed by default.
- All previous engine behaviour is regression-locked and green.
- Suite runs in CI on every push.
