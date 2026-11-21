---
name: fix-tests
description: Run the project's checks and tests (type-check, lint, validation, Vitest with coverage; optionally build and e2e), then fix every failure until all pass. Use when the user asks to run all tests and fix them, or invokes /fix-tests.
argument-hint: "[full]  — also run test:build and test:e2e"
---

# Run all checks and fix failures

Arguments: `$ARGUMENTS` — if it contains `full`, also run the build and e2e stages.

## Stages (in order; stop at the first failing stage, fix it, re-run that stage, then continue)

1. `pnpm run type-check`
2. `pnpm run lint`
3. `pnpm run validation`
4. `pnpm run test:coverage` — unit tests plus coverage thresholds from `vitest.config.mts`
5. Only with `full`: `pnpm run test:build`, then `pnpm run test:e2e` (rebuilds are required after code changes; `test:build` does that)

If `source/books/` is missing, run `pnpm run install:post-fetch` first (or `install:fetch` if `./shared` is empty).

Pipe long output through `grep`/`tail` to keep context small, e.g.
`pnpm run test:coverage 2>&1 | grep -E "FAIL|Tests |ERROR|threshold" | head -40`.
Re-run a single failing file with `pnpm exec vitest run <file>` while fixing.

## How to fix

- Find the root cause before changing anything. Decide whether the **code** or the **test** is wrong:
  - If the branch diff (`git diff main`) changed behavior on purpose, update the test (and the matching `.github/instructions/*.md` doc if it describes that behavior).
  - If the test describes intended behavior, fix the code.
  - If the failure comes from songbook content changes (tests use real books in `source/books/`), make the test robust instead of hard-coding new content.
  - If unsure which side is right, ask the user instead of guessing.
- Never weaken a test to make it pass, never add `.skip`/`.only`, never lower coverage thresholds (they may only go up).
- Coverage threshold failures: compute which files miss branches/lines, e.g.
  ```sh
  pnpm exec vitest run --project node --project jsdom --coverage --coverage.reporter=json-summary >/dev/null 2>&1
  node -e 'const s=require("./.test-output/coverage/coverage-summary.json");for(const[k,v]of Object.entries(s)){const m=v.branches.total-v.branches.covered;if(m&&k.includes("/components/"))console.log(m,k.split("kirtan-next/")[1])}' | sort -rn | head
  ```
  Prefer covering files changed on the current branch. Write meaningful tests for real behavior, not tests that only touch lines. Leave a small margin above the threshold when cheap.
- Follow test rules from CLAUDE.md: tests in `tests/<layer>/` mirroring the source path, helpers only in `tests/helpers/`, inline snapshots only.

## Finish

Re-run every stage that was run, from the first, to confirm all pass together. Report:
- which stages ran and their final result (with counts, e.g. tests passed, coverage numbers that were close to thresholds),
- each failure found, its cause, and what was changed (file links),
- anything skipped or left for the user to decide.

Do not commit unless the user asks.
