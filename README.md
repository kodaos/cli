# Kodaos CLI

`@kodaos/cli` is a command-line tool for managing AI ecosystem capabilities.

Phase 1 focuses on `skills` management. The goal is to establish a command
system that is extensible, testable, and maintainable, forming the foundation
for future modules such as `agents`, `workflows`, and `integrations`.

## Phase 1 Scope (Skills Management)

Phase 1 covers the full `skills` lifecycle. Available commands:

- `skills list` (`ls`): List installed skills
- `skills add <source>`: Add skills from a GitHub repository
- `skills remove` (`rm`) `[skills...]`: Remove installed skills
- `skills update` `[skills...]`: Update installed skills to latest versions
- `skills migrate <platform>`: Migrate skills from external platforms

## Tech Stack

- `commander`: command definitions, argument parsing, `--help` output
- `ink`: terminal UI rendering and interaction feedback
- `zod`: command argument and input validation
- `vitest`: baseline command-level testing

## CLI Design Principles

### 1) Every Command Must Have Clear Feedback

Each command must provide clear, actionable feedback:

- Success feedback: clearly states the result
- Failure feedback: clearly states the reason
- Guidance feedback: clearly states the next action

Avoid generic messages like "unknown error" or "invalid parameter". Feedback
must point to a specific parameter and/or a concrete recovery action whenever
possible.

### 2) Every Parameter Must Be Validated with Zod

All command inputs must be defined in a `zod` schema and validated (for example,
via `safeParse`). Validation failures should include:

- The failing parameter name or field path
- A clear human-readable error explanation
- An actionable fix suggestion (example value or valid range)

### 3) Every Command Must Have Baseline Vitest Tests

Each command must include at least one baseline test set, covering:

- Success path (valid input -> expected behavior)
- Critical failure path (invalid input -> clear validation error)

## Docs and Conventions

- Project overview and collaboration entry point: `README.md`
- Implementation rules for agents and developers: `AGENTS.md`

When adding new commands, update implementation, tests, and documentation
together to keep them consistent.
