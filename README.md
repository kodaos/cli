# Kodaos CLI

A command-line tool for managing AI ecosystem capabilities.

## What is this?

Kodaos CLI helps you manage AI agents, skills, and workflows from your terminal. It provides a modular command system for discovering, installing, and managing AI capabilities.

## Installation

```bash
# Install globally via npm
npm install -g @kodaos/cli

# Or via pnpm
pnpm add -g @kodaos/cli

# Or via yarn
yarn global add @kodaos/cli
```

After installation, run:

```bash
kodaos --help
```

## Capabilities

### Skills Management

The CLI currently focuses on **skills** management — reusable AI capabilities that can be installed and shared.

| Command                            | Alias | Description                            |
| ---------------------------------- | ----- | -------------------------------------- |
| `kodaos skills list`               | `ls`  | List installed skills                  |
| `kodaos skills add <source>`       | -     | Add skills from a GitHub repository    |
| `kodaos skills install`            | -     | Install skills from `kodaos-lock.json` |
| `kodaos skills remove <skills...>` | `rm`  | Remove installed skills                |
| `kodaos skills update [skills...]` | -     | Update skills to latest versions       |
| `kodaos skills migrate [platform]` | -     | Migrate skills from external platforms |

### Sessions Management

The CLI also provides **sessions** management for supported AI agents.

| Command                       | Alias | Description                                         |
| ----------------------------- | ----- | --------------------------------------------------- |
| `kodaos sessions list`        | `ls`  | List Claude/Codex sessions with source/date filters |
| `kodaos sessions resume <id>` | -     | Resume a Claude or Codex session by id              |

### Examples

```bash
# List all installed skills
kodaos skills ls

# Add a skill from a GitHub repo
kodaos skills add username/repo

# Install skills declared in lock file
kodaos skills install

# Remove a skill
kodaos skills rm my-skill

# Update all skills
kodaos skills update

# Update specific skills
kodaos skills update skill-a skill-b

# Migrate skills from another platform
kodaos skills migrate vercel

# List sessions from all sources
kodaos sessions list

# List only Claude sessions from date range
kodaos sessions list --source claude --from 2026-05-01 --to 2026-05-10

# Resume a session by id
kodaos sessions resume <session-id>

# Preview resume command without executing
kodaos sessions resume <session-id> --dry-run
```

## Quick Start

1. Install the CLI (see Installation above)
2. Run `kodaos skills ls` to see installed skills
3. Run `kodaos skills add <source>` to add new capabilities

## Agent Interaction

All commands support machine-to-machine interaction through structured output and standardized exit codes.

### Output Modes

Use `--output` (or `-o`) to control output format:

- `text` (default) — Human-readable output with ANSI colors
- `json` — Machine-readable structured output

```bash
# Human-readable output (default)
kodaos skills list

# JSON output for scripting/AI agents
kodaos skills list -o json
```

### Dry-run Mode

State-modifying commands support `--dry-run` to preview changes without applying them:

```bash
kodaos skills add username/repo --dry-run
kodaos skills install --dry-run
kodaos skills remove my-skill --dry-run
kodaos skills update --dry-run
```

### Exit Codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| 0    | Success                      |
| 1    | General error                |
| 2    | Validation / parameter error |
| 3    | Network error                |
| 4    | File system error            |
| 5    | Configuration error          |

### JSON Output Schema

When using `--output json`, errors follow this schema:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human-readable error message",
  "details": {},
  "suggestion": "How to fix the error"
}
```

### Idempotency

All state-modifying commands are idempotent:

- `kodaos skills add <skill>` — If already installed, returns success
- `kodaos skills install` — If already installed locally, skips and returns success
- `kodaos skills remove <skill>` — If not installed, returns success
- `kodaos skills update [skill]` — If already at latest, returns success

### Lock File Version Pinning

`kodaos-lock.json` uses `skills.<name>.commitHash` as a **git commit SHA** to pin a
skill version. `kodaos skills install` resolves each skill to the exact commit
recorded in the lock file.
