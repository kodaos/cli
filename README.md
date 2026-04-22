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
| `kodaos skills remove <skills...>` | `rm`  | Remove installed skills                |
| `kodaos skills update [skills...]` | -     | Update skills to latest versions       |
| `kodaos skills migrate <platform>` | -     | Migrate skills from external platforms |

### Examples

```bash
# List all installed skills
kodaos skills ls

# Add a skill from a GitHub repo
kodaos skills add username/repo

# Remove a skill
kodaos skills rm my-skill

# Update all skills
kodaos skills update

# Update specific skills
kodaos skills update skill-a skill-b

# Migrate skills from another platform
kodaos skills migrate cursor
```

## Quick Start

1. Install the CLI (see Installation above)
2. Run `kodaos skills ls` to see installed skills
3. Run `kodaos skills add <source>` to add new capabilities

## Tech Stack

- **commander** — Command definitions and argument parsing
- **ink** — Terminal UI rendering
- **zod** — Input validation
- **vitest** — Testing framework
