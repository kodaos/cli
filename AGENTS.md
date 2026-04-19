# AGENTS Guide

This document defines the mandatory rules for AI agents and developers when
implementing CLI commands in this repository.

## Project Goal and Phase Boundaries

- Project goal: build an AI ecosystem management CLI.
- Current phase: only `skills`-related command capabilities.
- Out-of-scope capabilities for this phase (for example, advanced workflow
  orchestration) must be deferred.

## Tech Stack Constraints

- Command framework: `commander`
- Interaction rendering: `ink`
- Input validation: `zod`
- Testing framework: `vitest`

New commands must not bypass the stack above. If extra dependencies are needed,
document the necessity and alternatives first.

## Command Design Rules (Commander)

- Use readable, stable verb-object command names (for example, `skills create`).
- Every command must provide a `description`; complex commands should also
  provide a `summary`.
- Keep argument and option naming semantically consistent.
- Every command must have readable `--help` output with at least one minimal
  runnable example.

## Feedback Message Rules (Ink)

- Success feedback: state what was done and what result was produced.
- Failure feedback: state where and why it failed.
- Guidance feedback: state the next action, optionally with a suggested command.

Do not use low-information messages (for example, "execution failed" or
"invalid parameter") as final output.

## Parameter Validation Rules (Zod)

- Every command entrypoint must define and use a `zod` schema.
- Validation must run before business logic; do not replace schema validation
  with ad hoc runtime guards.
- Prefer `safeParse` to aggregate results and unify error rendering.
- Validation failure output must include:
  - Parameter name or field path
  - Clear failure reason
  - Actionable fix suggestion (example value, valid range, or format guidance)

## Test Rules (Vitest)

Each command must include baseline tests covering at least:

- Success path: valid input triggers expected behavior
- Critical failure path: invalid input returns clear validation errors

If a command has side effects (file writes, network requests), tests must
isolate those side effects and remain repeatable.

## Minimum Delivery Checklist for New Commands

When adding any CLI command, all of the following are required:

- Commander command definition (name, description, arguments, examples)
- Ink feedback messages (success/failure/guidance)
- Zod parameter schema and error mapping
- Baseline Vitest tests (success + critical failure)
- Relevant documentation update (at least README or command docs)

## Acceptance Criteria

Before submitting, confirm all conditions below:

- `--help` output is complete and understandable
- Validation errors are pinpointed and actionable
- Baseline tests exist and are runnable
- Documentation is consistent with implementation and not stale
