# irish-ufo-game

A comedic top-down arcade game built with Phaser 3, TypeScript and Vite, shipped as a PWA on GitHub Pages. Read [DESIGN.md](DESIGN.md) before doing anything.

## Scope of these rules

These rules apply to this repository only. Rules written for other projects, including any FaginFinance rules in a global AGENTS.md, do not apply here.

## Git

- The owner has authorised commits and pushes to `main` in this repository. A push to `main` deploys the game.
- Parallel agents work in their own `git worktree` on a branch named `agent/<role>/<task>` and merge to `main` only after the creative director approves.
- Never force-push. Never rewrite history on `main`.
- `main` must always build. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before merging.

## Who does what

| Agent | Model | Owns |
|---|---|---|
| creative-director | fable | `DESIGN.md`, `docs/`, `src/content/`, `src/art/`, review of every merge |
| systems-dev | opus | `src/core/`, `src/systems/`, integration and merge conflicts |
| level-builder | sonnet | `src/chapters/`, `src/ui/`, `src/audio/` |
| planner | sonnet | Config, `public/`, `.github/`, scaffolding |
| qa | sonnet | `tests/` |
| triage | haiku | Lint, type and build triage, reference audits |

- Stay inside the directories you own. If you need a change elsewhere, ask the owner.
- Set `model` explicitly on every agent spawn.
- Story, jokes, dialogue, art and balance come from the creative director. Other agents implement them and do not invent or rewrite them.
- When a review fails, the work goes back to the agent that wrote it.

## Hard rules

- No network calls at runtime, no analytics, no telemetry.
- No external assets. Sprites, tiles, fonts and audio are generated in code.
- No real people, brands, company names or song lyrics.
- All player-visible text lives in `src/content/dialogue/`. All balance numbers live in `src/content/tuning.ts`.
- TypeScript strict mode. No `any` without a comment that says why.
- Follow the tone rules in section 2 of DESIGN.md.

## Commands

```
pnpm dev         # local server at localhost:5173
pnpm build       # production build
pnpm test        # unit tests
pnpm test:e2e    # Playwright playthroughs
pnpm lint
pnpm typecheck
```
