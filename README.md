# CVRewriter

Paste a job listing's link, get your own CV reworded for it. Same layout, same voice, one page, as a downloadable PDF. Free end to end.

The app lives in [`web/`](web/) and deploys to **https://usm19.github.io/CVRewriter/** via GitHub Pages.

## How it works

There is no AI service behind this and nothing to sign up for: the tailoring engine is real code that ships with the page and runs entirely in your browser.

1. **Upload your CV, once.** The engine takes the PDF apart on your device (`web/engine/pdf-extract.js`, built on Mozilla's pdf.js, vendored): every line of text with its exact position and size, the PDF's own embedded fonts re-exported for reuse, each line's ink colour sampled from the rendered page, and a background image of everything that is not text (sidebars, rules, photos), made by painting the text out with its local background colour. Tailored versions are rebuilt from those pieces, so the layout cannot drift. You compare the replica with the original and approve it.
2. **Paste a job link.** The listing text is fetched (with a paste-the-text fallback for job boards that block robots) and analysed by a deterministic matching engine (`web/engine/nlp.js`): tokeniser, Porter stemmer, weighted term extraction that scores requirement sections higher (section detection adapted from the career-ops skill), and a curated synonym taxonomy of same-meaning professional terms.
3. **Review the proposed word changes.** Where your CV already says what the listing asks for, in different words, the engine proposes swapping to the listing's own term ("shift planning" to "rotas" when the listing says rotas). Two dictionary passes add UK English corrections and plainer alternatives to known AI-tell words (word lists from the humanizer skill, i.e. Wikipedia's "Signs of AI writing"). Every change is a tickbox showing before and after; nothing is applied without you.
4. **Save as PDF.** The page is reassembled at the original coordinates in the original fonts and printed by the browser itself, so the result is one A4 page of real, selectable text, which is what recruiters' applicant tracking systems need.

### Why it cannot slop up your CV

- **Truth by construction.** The engine is not generative. A swap can only happen inside one synonym group of same-meaning terms, or via a fixed dictionary entry. It cannot invent an employer, a metric or a skill, because no component of it can produce new sentences.
- **Your voice survives by default.** Sentences are never restructured; only individual words you approve are exchanged. If your CV uses a word the dictionaries frown on, that is your voice: the suggestion appears and you untick it.
- **Honest gaps.** Requirements the listing names that your CV does not evidence (certificates, qualifications) are reported to you instead of being written in.
- **Privacy.** Your CV never leaves the device. The only network use is fetching the listing text from the link you paste.

## Getting it on your iPhone

1. Open https://usm19.github.io/CVRewriter/ in Safari.
2. Tap Share, then "Add to Home Screen". It installs with its own icon and works like an app.
3. When you save a PDF, the print sheet opens: choose Save as PDF, or pinch out on the preview and share it to Files.

## One-time setup for the owner

GitHub Pages is free for public repositories, so two switches once:

1. **Make the repo public**: Settings, General, Danger Zone, "Change visibility". Nothing personal lives in this repo; your CV and key stay on your devices.
2. **Enable Pages via Actions**: the included workflow (`.github/workflows/deploy-pages.yml`) attempts to enable Pages itself on the next push; if the first run complains, set Settings, Pages, Source to "GitHub Actions" and re-run it.

---

# Agent skills setup

This repo also carries a full agent-skills setup for Claude Code (used to build the app above). The skills below load automatically from `.claude/skills/` when you open this repo in Claude Code — no extra install step needed.

## Installed skills

316 skills from 21 packs, vendored (copied, not symlinked) into `.claude/skills/` so the whole setup is versioned with the repo.

| # | Pack | Source repository | Installed |
|---|------|-------------------|-----------|
| 1 | superpowers | [obra/superpowers](https://github.com/obra/superpowers) | 14 skills (brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, …) |
| 2 | gstack | [garrytan/gstack](https://github.com/garrytan/gstack) | full suite at `gstack/` (router + 58 sub-skills; test fixtures pruned) |
| 3 | caveman | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | 7 skills (caveman, caveman-lite modes, cavecrew, stats, review, …) |
| 4 | ponytail | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | 6 skills (ponytail, -review, -audit, -debt, -gain, -help) |
| 5 | codex | [skills-directory/skill-codex](https://github.com/skills-directory/skill-codex) | 1 skill (`codex` — drives the OpenAI Codex CLI; requires `codex` installed) |
| 6 | i-have-adhd | [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) | 1 skill |
| 7 | ui-ux-pro-max | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 7 skills (ui-ux-pro-max, design, design-system, ui-styling, brand, banner-design, slides) |
| 8 | taste-skill | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 13 skills (taste-skill, soft/brutalist/minimalist variants, brandkit, redesign, …) |
| 9 | impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 1 skill (23 commands under `/impeccable …`) |
| 10 | hyperframes | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 19 skills (hyperframes, -cli, -animation, motion-graphics, slideshow, …) |
| 11 | emil | [emilkowalski/skills](https://github.com/emilkowalski/skills) | 8 skills (emil-design-eng, apple-design, review/improve-animations, …) |
| 12 | gsap | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | 8 skills (gsap-core, -timeline, -scrolltrigger, -react, …) — official |
| 13 | skill-creator | [anthropics/skills](https://github.com/anthropics/skills) | 1 skill (skill-creator only, from Anthropic's public skills repo) |
| 14 | graphify | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | 1 skill (runs the `graphify` CLI via `uvx`/`pipx` at use time) |
| 15 | last30days | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | 1 skill (Reddit/X/YouTube/HN research; optional API keys improve sources) |
| 16 | agent-browser | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | 1 skill (browser automation via `npx agent-browser`) |
| 17 | find-skills | [vercel-labs/skills](https://github.com/vercel-labs/skills) | 1 skill |
| 18 | claude-hud | [jarrodwatts/claude-hud](https://github.com/jarrodwatts/claude-hud) | **not a skill — plugin, manual step below** |
| 19 | remotion | [remotion-dev/skills](https://github.com/remotion-dev/skills) | 11 skills (remotion-create, -render, -captions, -best-practices, …) — official |
| 20 | marketingskills | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | 49 skills (copywriting, cro, seo-audit, ads, pricing, launch, …) |
| 21 | humanizer | [blader/humanizer](https://github.com/blader/humanizer) | 1 skill |
| 22 | social-media-skills | [social-media-skills/skills](https://github.com/social-media-skills/skills) | 106 skills (per-platform growth, captions, calendars, analytics, …) |
| 23 | career-ops | [santifer/career-ops](https://github.com/santifer/career-ops) | full system vendored at `career-ops/` (see below) |

### career-ops (vendored as a subdirectory, not under `.claude/skills/`)

career-ops is a complete job-search command center — JD evaluation, CV/PDF generation, portal scanning, application tracking, interview prep — where the `career-ops` skill is a thin router driving ~150 Node scripts in its repo root. Its documented install is "clone the repo and run your AI CLI inside it", so it lives here at `career-ops/` with its own `.claude/skills/career-ops`, which Claude Code picks up as a directory-scoped skill when working in that folder.

First use: `cd career-ops && npm install` (deps: playwright for portal scanning, js-yaml, dotenv, @google/generative-ai for optional Gemini eval). Large marketing media in its `docs/` was pruned; everything functional is intact.

### claude-hud (manual, one command)

claude-hud is a Claude Code **plugin** (statusline HUD), not an agent skill, so it isn't vendored here. Enabling a plugin runs its code in your sessions, so it's left as an opt-in step:

```
/plugin marketplace add jarrodwatts/claude-hud
/plugin install claude-hud@claude-hud
```

## Notes

- **Sources**: the original share used `lnkd.in` shortlinks, which are not reachable from this environment. Each pack was resolved to the canonical/original public repo by name and description; the table above is the exact source of truth for what was installed.
- **Vendored, not symlinked**: files were copied from shallow clones (equivalent of `npx skills add <repo> --copy`), so teammates get the identical setup on clone.
- **Third-party content**: these packs are community-authored instructions and scripts. They were scanned for obvious red flags (pipe-to-shell, encoded payloads, injection phrasing) — nothing suspicious found — but they have not been line-by-line audited. `last30days` calls external data APIs (Reddit/X/scrapecreators) by design; `gstack` expects to run its bundled helper scripts from `.claude/skills/gstack/bin/`.
- **Name collisions**: none — all 258 top-level skill folders are unique.

## Updating

Re-pull any pack by cloning its repo and re-copying its skill folders, or use `npx skills add <owner>/<repo>` locally.
