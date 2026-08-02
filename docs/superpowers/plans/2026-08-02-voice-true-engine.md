# Voice-true engine (v2) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline execution). Steps use checkbox syntax.

**Goal:** Proposals that read as if the CV's owner wrote them: morphological agreement, owner-voice protection, guards, expanded knowledge, all test-driven.

**Architecture:** New `voice.js` (inflection maps + voice profile) consumed by `tailor.js`; dictionary/taxonomy growth in `rules.js`; JD weighting in `nlp.js`. Node:test suite drives every behaviour red-green.

**Tech stack:** Vanilla ES modules, node:test (zero deps), GitHub Actions.

## Global constraints

- No new runtime dependencies; engine stays browser-safe (no Node APIs in engine files).
- Truth lock: no component may generate new sentences; swaps stay inside synonym groups and dictionaries.
- No em or en dashes, no contractions in any dictionary value or generated string.
- All user-facing strings UK English.

---

### Task 1: voice.js inflection engine

**Files:** Create `web/engine/voice.js`, `web/engine/tests/engine.test.mjs`

- [ ] Write failing tests: `inflect('manage','past')==='managed'`, `inflect('oversee','past')==='oversaw'`, `inflect('run','ing')==='running'`, `inflect('supply','past')==='supplied'`, `inflect('coach','s')==='coaches'`, `inflectionsOf('oversee')` maps `oversaw→{base:'oversee',form:'past'}`, head-word handling `inflectionsOf('liaise with')` maps `liaised with`.
- [ ] Run `npm test`, verify failures are "module not found / not a function".
- [ ] Implement minimal `voice.js` (irregular table + regular rules + `inflectionsOf`).
- [ ] Verify green. Commit.

### Task 2: voiceProfile

- [ ] Failing tests: `voiceProfile(lines).count('spearheaded')===2`; `.spellingLean==='us'` for organized/utilized lines, `'uk'` for organised lines.
- [ ] Implement `voiceProfile`. Green. Commit.

### Task 3: tailor integration (agreement + guards + owner lock)

**Files:** Modify `web/engine/tailor.js`, `web/engine/rules.js` (verb groups to base forms)

- [ ] Failing tests:
  - mirror "Oversaw the stockroom team" + JD "manage a small team" → proposal after text "Managed the stockroom team"
  - "overseeing deliveries" → "managing deliveries"
  - Title Case line "Stock Management" + JD "stock control" → "Stock Control"
  - "Worked at Stock Management Ltd" → no proposal on the employer name
  - "customer care service desk" + JD "customer service" → no adjacent-duplicate proposal
  - CV using "spearheaded" twice → proposal `defaultOff===true`, why mentions voice; once → no defaultOff
  - no dictionary value or proposal replacement contains "'"
- [ ] Implement. Green. Commit.

### Task 4: rules + nlp growth

- [ ] Failing tests: 'driving license'→'driving licence'; 'best practise'→'best practice'; 'training program'→'training programme'; JD line "Essential: SIA licence" puts the credential in gaps; JD title token absent from CV appears in gaps ("Warehouse Team Leader" title, no warehouse in CV).
- [ ] Implement phrase dictionary entries, ~35 new synonym groups, Essential/Desirable inline weighting, title token boost. Green. Commit.

### Task 5: regression locks + wiring

**Files:** Create `package.json`, `.github/workflows/test.yml`; modify `web/app.js`

- [ ] Port the Fenwick fixture scenario to tests as regression locks (title/company, 5 mirrors, gaps exactly the two credentials, applied text strings).
- [ ] `app.js`: initial ticked set excludes `defaultOff` proposals.
- [ ] `npm test` script; CI workflow running tests on push.
- [ ] Full browser E2E re-run; all green. Commit.
