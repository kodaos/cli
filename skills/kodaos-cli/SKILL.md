---
name: kodaos-cli
description: CLI for managing AI agent skills in the Kodaos ecosystem
license: MIT
compatibility: Requires kodaos cli
metadata:
  author: kodaos
  version: 0.0.0
---

# kodaos CLI

CLI for managing the AI ecosystem with Kodaos. Provides skill management commands for installing, removing, listing, updating, and migrating skills from GitHub repositories.

## Commands

### `kodaos skills add <source>`

Add skills from a GitHub repository.

```
kodaos skills add owner/repo
kodaos skills add https://github.com/owner/repo
```

**Arguments:**

- `<source>` — GitHub shorthand (`owner/repo`) or full GitHub URL

**Options:**

- `-s, --skill <names...>` — Specific skills to install (default: all)
- `-l, --list` — List available skills without installing
- `-y, --yes` — Skip confirmation prompts
- `--copy` — Copy files instead of symlinking
- `-g, --global` — Install to global directory (`~/.kodaos`) instead of project

### `kodaos skills remove [skills...]`

Remove installed skills.

```
kodaos skills remove my-skill
kodaos skills remove --all
```

**Arguments:**

- `[skills...]` — Skills to remove

**Options:**

- `-g, --global` — Remove from global directory
- `-y, --yes` — Skip confirmation prompts
- `--all` — Remove all installed skills

### `kodaos skills list`

List all installed skills.

```
kodaos skills list
kodaos skills list --global
```

**Options:**

- `-g, --global` — List global skills

Displays a table of skill name, source, path, and commit hash.

### `kodaos skills update [skills...]`

Update installed skills to the latest version from GitHub.

```
kodaos skills update
kodaos skills update my-skill --yes
```

**Arguments:**

- `[skills...]` — Skills to update (default: all)

**Options:**

- `-g, --global` — Update global skills
- `-p, --project` — Update project skills
- `-y, --yes` — Skip confirmation prompts

### `kodaos skills migrate <platform>`

Migrate skills from external platforms.

```
kodaos skills migrate vercel
kodaos skills migrate vercel ./skills-lock.json --global
```

**Arguments:**

- `<platform>` — Platform to migrate from (currently supports `vercel`)
- `[file]` — Source lock file path (defaults to `skills-lock.json`)

**Options:**

- `-g, --global` — Write to global lock file
- `-y, --yes` — Skip confirmation prompts

## Architecture

- **Lock-driven design** — `kodaos-lock.json` tracks installed skills with source repository and SHA256 commit hash
- **Two-tier storage** — Skills are stored in `.agents/skills/` with symlinks created in `.claude/skills/`
- **Git sparse checkout** — Uses `git clone --depth 1 --filter=blob:none --sparse` for efficient cloning
- **Skill discovery** — Skills are discovered via `skills/index.json` (explicit list) or by scanning `skills/*/` directories containing `SKILL.md`
