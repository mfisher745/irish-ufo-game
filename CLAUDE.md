# irish-ufo-game

A comedic top-down arcade game built with Phaser 3, TypeScript and Vite, shipped as a PWA on GitHub Pages. Read [DESIGN.md](DESIGN.md) before doing anything.

## Scope of these rules

These rules apply to this repository only. Rules written for other projects do not apply here.

## Git

- The owner has authorised commits and pushes to `main` in this repository. A push to `main` deploys the game.
- Parallel agents work in their own `git worktree` on a branch named `agent/<role>/<task>` and merge to `main` only after the creative director approves.
- Never force-push. Never rewrite history on `main`.
- `main` must always build. Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before merging.

## Who does what

| Agent | Model | Owns |
|---|---|---|
| creative-director | fable | `DESIGN.md`, `docs/`, `src/content/`, `src/art/`, review of every merge |
| systems-dev | sonnet | `src/core/`, `src/systems/`, integration and merge conflicts |
| level-builder | sonnet | `src/chapters/`, `src/ui/`, `src/audio/` |
| planner | sonnet | Config, `public/`, `.github/`, scaffolding |
| qa | sonnet | `tests/` |
| triage | haiku | Lint, type and build triage, reference audits |

- Creative-director should stay high-level: design decisions, content ownership, and merge reviews. Avoid using fable for routine implementation or debugging.
- Stay inside the directories you own. If you need a change elsewhere, ask the owner.
- Set the model explicitly on every agent spawn. Never rely on the default. Always start with the cheapest model listed for the role; only escalate via creative-director approval.
- Story, jokes, dialogue, art and balance come from the creative director. Other agents implement them and do not invent or rewrite them.
- When a review fails, the work goes back to the agent that wrote it.
- If an agent fails a task twice, stop and escalate to creative-director instead of retrying with the same model/context.
- triage (haiku) may auto-fix simple lint and type errors when the fix is obvious and confined to the files it was given. All other changes still require the owning agent.

### Model escalation
Default to the model listed above.
Only the creative-director (fable) may authorize a stronger model (opus or fable) for a specific task.
When an agent believes a harder model is required, it must stop, state why, and wait for creative-director approval before respawning with the higher model.
Never self-escalate.

## Hard rules

- No network calls at runtime, no analytics, no telemetry.
- No external assets. Sprites, tiles, fonts and audio are generated in code.
- All player-visible text lives in `src/content/dialogue/`. All balance numbers live in `src/content/tuning.ts`.
- TypeScript strict mode. No `any` without a comment that says why.
- Follow the tone rules in section 2 of DESIGN.md.
- Model upgrades require creative-director approval. (See Model Escalation)

## Commands

```
pnpm dev         # local server at localhost:5173
pnpm build       # production build
pnpm test        # unit tests
pnpm test:e2e    # Playwright playthroughs
pnpm lint
pnpm typecheck
```
## Context rules (token efficiency)
- Every agent starts with only: this file + DESIGN.md + the files in the directories it owns + the specific task.
- Do not dump the entire conversation history or full repo state into every agent.
- Prefer reading files via tools over pasting large blobs.
- After finishing a task, write only the delta (changed files + short status) back to the shared state / PR.
- When the main cache is cold, prefer a short warm-up or `/compact` before launching multiple agents.

## Session hygiene
- When switching major tasks or after a merge, prefer `/clear` or a fresh session.
- Run `/compact` before stepping away for long periods.
- Keep the main conversation focused; spin heavy work into role-specific agents/worktrees.

## Agent spawn checklist
1. Confirm the task fits the agent’s owned directories.
2. Use the default model for the role.
3. Load only: this file + DESIGN.md + owned files + the specific task.
4. After finishing, return only the delta + status.