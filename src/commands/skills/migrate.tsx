import { exec } from 'child_process'
import { readFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import { Command } from 'commander'
import { render } from 'ink'
import React from 'react'

import { writeLock } from '../../skills/lock'
import {
  EXIT_CODES,
  isJsonMode,
  formatJsonSuccess,
  exitWithError,
  type OutputMode,
} from '../../skills/output'
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
  console.log(`Cloning ${source}...`)
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
    .argument('[platform]', 'Platform to migrate from (vercel)')
    .argument('[file]', 'Source lock file path (defaults to skills-lock.json in current directory)')
    .option('-g, --global', 'Write to global lock file')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('-o, --output <mode>', 'Output format: json or text', 'text')
    .option('--dry-run', 'Preview what would be migrated without making changes')

  cmd.action(
    async (
      platform: string | undefined,
      file: string | undefined,
      opts: Record<string, unknown>,
    ) => {
      if (!platform) {
        exitWithError(
          (opts.output as OutputMode) ?? 'text',
          EXIT_CODES.VALIDATION_ERROR,
          'Available platforms: vercel',
          { availablePlatforms: ['vercel'] },
          'Specify a platform: kodaos skills migrate vercel',
        )
      }

      const parsed = migrateOptionsSchema.safeParse({ platform, file, ...opts })
      if (!parsed.success) {
        const error = parsed.error.issues[0]
        exitWithError(
          (opts.output as OutputMode) ?? 'text',
          EXIT_CODES.VALIDATION_ERROR,
          `Validation error: ${error.path.join('.')} - ${error.message}`,
        )
      }

      const options = parsed.data
      const output: OutputMode = options.output

      if (options.platform !== 'vercel') {
        exitWithError(
          output,
          EXIT_CODES.VALIDATION_ERROR,
          `Unsupported platform: ${options.platform}`,
        )
      }

      const sourceFile = options.file || 'skills-lock.json'

      // Read vercel format lock
      let vercelLock: VercelLock
      try {
        const content = await readFile(sourceFile, 'utf-8')
        vercelLock = JSON.parse(content) as VercelLock
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          exitWithError(output, EXIT_CODES.FILE_SYSTEM_ERROR, `File not found: ${sourceFile}`)
        } else {
          exitWithError(output, EXIT_CODES.FILE_SYSTEM_ERROR, `Failed to read file: ${sourceFile}`)
        }
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
              commitHash: entry.computedHash,
            }
          } else {
            failed.push(skillName)
          }
        } catch {
          failed.push(skillName)
        }
      }

      // Dry-run mode
      if (options['dry-run']) {
        const dryRunResult = {
          action: 'migrate',
          platform: options.platform,
          sourceFile,
          wouldMigrate: Object.keys(migrated),
          failed,
          total: Object.keys(migrated).length,
        }
        console.log(formatJsonSuccess(dryRunResult))
        return
      }

      // Build the new lock (even if empty, write it)
      const newLock: SkillLock = {
        version: '0.1.0',
        agents: {
          default: { skillsDir: '.agents/skills' },
          'claude-code': { skillsDir: '.claude/skills' },
        },
        skills: migrated,
      }

      // Write to project's kodaos-lock.json
      await writeLock(newLock, options.global)

      // Output results
      const result = {
        success: true,
        migrated: Object.keys(migrated),
        failed,
        total: skillNames.length,
        message: `Migrated ${Object.keys(migrated).length}/${skillNames.length} skill(s)`,
      }

      if (isJsonMode(output)) {
        console.log(formatJsonSuccess(result))
      } else {
        render(<MigrateView migrated={migrated} global={options.global} />)
      }

      // Also output failed skills via console to ensure visibility
      if (failed.length > 0 && !isJsonMode(output)) {
        console.error(`Manual install required for: ${failed.join(', ')}`)
      }
    },
  )

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
