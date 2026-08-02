# CVRewriter

Project scaffold with a full agent-skills setup for Claude Code. The skills below load automatically from `.claude/skills/` when you open this repo in Claude Code — no extra install step needed.

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
