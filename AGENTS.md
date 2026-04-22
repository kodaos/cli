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

## Agent Interaction Rules

All commands must support machine-to-machine interaction patterns.

### Output Modes

- Every command must support `--output` / `-o` option with values `json` or `text`.
- JSON output is the primary format for programmatic consumption.
- Text output is for human readability; it may use ANSI colors and interactive elements.
- JSON output schema must be documented in the command's inline help.

### Exit Codes

Commands must return standardized exit codes for machine parsing:

| Code | Meaning                      |
| ---- | ---------------------------- |
| 0    | Success                      |
| 1    | General error                |
| 2    | Validation / parameter error |
| 3    | Network error                |
| 4    | File system error            |
| 5    | Configuration error          |

### Dry-run Mode

- Commands that modify state must support `--dry-run` option.
- In dry-run mode: command validates inputs and returns expected changes without applying them.
- Dry-run output is always JSON, describing what would happen.

### Idempotency

State-modifying commands must be idempotent:

- `kodaos skills add <skill>`: if skill already installed, return success without error.
- `kodaos skills remove <skill>`: if skill not installed, return success without error.
- `kodaos skills update [skill]`: if skill is already at latest version, return success.

### Agent Error Format

Errors must follow this schema when output is JSON:

```typescript
interface AgentError {
  code: string // Error code, e.g. "VALIDATION_ERROR"
  message: string // Human-readable description
  details?: unknown // Additional context
  suggestion?: string // How to fix the error
}
```

In text mode, errors should still be informative but may use freeform formatting.

## Acceptance Criteria

Before submitting, confirm all conditions below:

- `--help` output is complete and understandable
- Validation errors are pinpointed and actionable
- Baseline tests exist and are runnable
- Documentation is consistent with implementation and not stale

### Agent Interaction Criteria

- All commands support `--output json` mode with documented schema
- All commands return standardized exit codes
- All state-modifying commands support `--dry-run`
- All state-modifying commands are idempotent
- Error responses follow AgentError schema in JSON mode
