import { exec } from 'child_process'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import { Command } from 'commander'
import { render } from 'ink'
import React from 'react'

import { writeLock } from '../../skills/lock'
import { renderSuccess, renderError } from '../../skills/prompts'
import { migrateOptionsSchema } from '../../skills/schema'
import type { SkillLock, SkillLockEntry } from '../../skills/types'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMP_DIR = join(__dirname, '../../.temp/migrate')

interface VercelLockEntry {
  source: string
  sourceType: string
  computedHash: string
}

interface VercelLock {
  version: number
  skills: Record<string, VercelLockEntry>
}

async function cloneSkillSource(source: string): Promise<string> {
  const destDir = join(TEMP_DIR, `skill-${source.replace('/', '-')}-${Date.now()}`)
  await mkdir(destDir, { recursive: true })
  await execAsync(`git clone --depth 1 https://github.com/${source} "${destDir}"`)
  return destDir
}

async function skillPathExists(repoPath: string, skillName: string): Promise<boolean> {
  const skillPath = join(repoPath, 'skills', skillName, 'SKILL.md')
  try {
    await readFile(skillPath, 'utf-8')
    return true
  } catch {
    return false
  }
}

async function cleanupTemp(path: string): Promise<void> {
  try {
    await execAsync(`rm -rf "${path}"`)
  } catch {
    // Cleanup failed, ignore
  }
}

export function createMigrateCommand(): Command {
  const cmd = new Command('migrate')
    .description('Migrate skills from external platforms')
    .argument('<platform>', 'Platform to migrate from (vercel)')
    .argument('[file]', 'Source lock file path (defaults to skills-lock.json in current directory)')
    .option('-g, --global', 'Write to global lock file')
    .option('-y, --yes', 'Skip confirmation prompts')

  cmd.action(async (platform: string, file: string | undefined, opts: Record<string, unknown>) => {
    const parsed = migrateOptionsSchema.safeParse({ platform, file, ...opts })
    if (!parsed.success) {
      const error = parsed.error.issues[0]
      console.error(`Validation error: ${error.path.join('.')} - ${error.message}`)
      process.exit(1)
    }

    const options = parsed.data

    if (options.platform !== 'vercel') {
      render(renderError(`Unsupported platform: ${options.platform}`))
      process.exit(1)
    }

    const sourceFile = options.file || 'skills-lock.json'

    // Read vercel format lock
    let vercelLock: VercelLock
    try {
      const content = await readFile(sourceFile, 'utf-8')
      vercelLock = JSON.parse(content) as VercelLock
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        render(renderError(`File not found: ${sourceFile}`))
      } else {
        render(renderError(`Failed to read file: ${sourceFile}`))
      }
      process.exit(1)
    }

    // Migrate each skill from its own source repository
    const skillNames = Object.keys(vercelLock.skills)
    const migrated: Record<string, SkillLockEntry> = {}
    const failed: string[] = []

    for (const skillName of skillNames) {
      const entry = vercelLock.skills[skillName]
      const source = entry.source // e.g., "rolldown/tsdown"

      try {
        const repoPath = await cloneSkillSource(source)
        const exists = await skillPathExists(repoPath, skillName)
        await cleanupTemp(repoPath)

        if (exists) {
          migrated[skillName] = {
            sourceType: 'github',
            source: entry.source,
            path: `skills/${skillName}`,
            computedHash: entry.computedHash,
          }
        } else {
          failed.push(skillName)
        }
      } catch {
        failed.push(skillName)
      }
    }

    // Build the new lock (even if empty, write it)
    const newLock: SkillLock = {
      version: '1.0',
      skills: migrated,
    }

    // Write to project's kodaos-lock.json
    await writeLock(newLock, options.global)

    // Output results
    render(<MigrateView migrated={migrated} global={options.global} />)

    // Also output failed skills via console to ensure visibility
    if (failed.length > 0) {
      console.error(`Manual install required for: ${failed.join(', ')}`)
    }
  })

  return cmd
}

function MigrateView({
  migrated,
  global,
}: {
  migrated: Record<string, SkillLockEntry>
  global: boolean
}): React.ReactElement {
  const scope = global ? 'global' : 'project'
  return renderSuccess(
    `Migrated ${Object.keys(migrated).length} skill(s) to ${scope} kodaos-lock.json`,
  )
}
