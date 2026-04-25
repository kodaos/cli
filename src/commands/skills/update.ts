import { exec } from 'child_process'
import { readFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import { Command } from 'commander'
import { render } from 'ink'
import inquirer from 'inquirer'

import {
  readLock,
  updateLockEntry,
  getSkillsDir,
  getClaudeSkillsDir,
  createSymlink,
  computeFileHash,
} from '../../skills/lock'
import {
  EXIT_CODES,
  isJsonMode,
  formatJsonSuccess,
  exitWithError,
  type OutputMode,
} from '../../skills/output'
import { renderSuccess, renderError } from '../../skills/prompts'
import { updateOptionsSchema } from '../../skills/schema'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))

export function createUpdateCommand(): Command {
  const cmd = new Command('update')
    .description('Update installed skills to latest versions')
    .argument('[skills...]', 'Skills to update (default: all)')
    .option('-g, --global', 'Update global skills')
    .option('-p, --project', 'Update project skills')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('-o, --output <mode>', 'Output format: json or text', 'text')
    .option('--dry-run', 'Preview what would be updated without making changes')

  cmd.action(async (skills: string[], opts: Record<string, unknown>) => {
    const parsed = updateOptionsSchema.safeParse({ skills, ...opts })
    if (!parsed.success) {
      const error = parsed.error.issues[0]
      exitWithError(
        (opts.output as OutputMode) ?? 'text',
        EXIT_CODES.VALIDATION_ERROR,
        `Validation error: ${error.path.join('.')} - ${error.message}`,
        { field: error.path.join('.') },
        `Provide a valid ${error.path.join('.') || 'value'}`,
      )
    }

    const options = parsed.data
    const output: OutputMode = options.output

    try {
      // Determine scope
      let global = options.global
      if (!options.global && !options.project) {
        // Auto-detect: project if in a project dir with lock
        const lock = await readLock(false)
        global = !lock || Object.keys(lock.skills).length === 0
        if (!global) {
          // Ask user
          const answer = await inquirer.prompt([
            {
              type: 'list',
              name: 'scope',
              message: 'Which scope to update?',
              choices: ['Project skills', 'Global skills'],
            },
          ])
          global = answer.scope === 'Global skills'
        }
      }

      const lock = await readLock(global)
      if (!lock || Object.keys(lock.skills).length === 0) {
        // Idempotent: no skills installed = success
        if (isJsonMode(output)) {
          console.log(
            formatJsonSuccess({
              success: true,
              message: `No ${global ? 'global' : 'project'} skills installed.`,
            }),
          )
        } else {
          render(renderError(`No ${global ? 'global' : 'project'} skills installed.`))
        }
        return
      }

      // Determine which skills to update
      let toUpdate: string[]
      if (options.skills && options.skills.length > 0) {
        toUpdate = options.skills.filter((s) => s in lock.skills)
        if (toUpdate.length === 0) {
          exitWithError(
            output,
            EXIT_CODES.VALIDATION_ERROR,
            'None of the specified skills are installed.',
          )
        }
      } else {
        toUpdate = Object.keys(lock.skills)
      }

      // Dry-run mode - report what would be updated
      if (options['dry-run']) {
        const dryRunResult = {
          action: 'update',
          wouldUpdate: toUpdate,
          total: toUpdate.length,
          message: `Would update ${toUpdate.length} skill(s)`,
        }
        console.log(formatJsonSuccess(dryRunResult))
        return
      }

      // Idempotent: all skills at latest = success (would need network check)
      // For now, we just proceed and let the update happen

      // Confirm if not --yes
      if (!options.yes) {
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Update ${toUpdate.length} skill(s)?`,
            default: true,
          },
        ])
        if (!answer.confirm) {
          if (isJsonMode(output)) {
            console.log(formatJsonSuccess({ success: true, message: 'Cancelled.' }))
          } else {
            render(renderSuccess('Cancelled.'))
          }
          return
        }
      }

      // Update each skill
      let updated = 0
      const failed: string[] = []
      for (const skillName of toUpdate) {
        const entry = lock.skills[skillName]
        try {
          await updateSingleSkill(skillName, entry, global)
          updated++
        } catch (error) {
          failed.push(skillName)
        }
      }

      const result = {
        success: true,
        updated,
        failed,
        total: toUpdate.length,
        message: `Updated ${updated}/${toUpdate.length} skill(s)`,
      }

      if (isJsonMode(output)) {
        console.log(formatJsonSuccess(result))
      } else {
        render(renderSuccess(result.message))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (isJsonMode(output)) {
        exitWithError(output, EXIT_CODES.GENERAL_ERROR, message)
      } else {
        render(renderError(message))
        process.exit(EXIT_CODES.GENERAL_ERROR)
      }
    }
  })

  return cmd
}

async function updateSingleSkill(
  skillName: string,
  entry: { sourceType: string; source: string; path: string; commitHash: string },
  global: boolean,
): Promise<void> {
  const skillsDir = getSkillsDir(global)
  const skillPath = join(skillsDir, skillName)

  // Fetch latest version
  const [owner, repo] = entry.source.split('/')
  const tempDir = join(__dirname, `../../.temp/update-${Date.now()}`)

  try {
    console.log(`Updating ${skillName}...`)
    const cloneUrl = `https://github.com/${owner}/${repo}`

    // Use sparse-checkout to only fetch the skill directory
    await execAsync(`git init "${tempDir}"`)
    await execAsync(`git -C "${tempDir}" remote add origin "${cloneUrl}"`)
    await execAsync(`git -C "${tempDir}" sparse-checkout init --cone`)
    await execAsync(`git -C "${tempDir}" sparse-checkout set "${entry.path}"`)
    await execAsync(`git -C "${tempDir}" pull origin HEAD --depth 1`)

    // Ensure target directory exists
    await mkdir(skillsDir, { recursive: true })
    await mkdir(getClaudeSkillsDir(global), { recursive: true })

    // Copy new files
    const sourceSkillDir = join(tempDir, entry.path)
    await execAsync(`rm -rf "${skillPath}" && cp -r "${sourceSkillDir}" "${skillsDir}"`)

    // Recreate symlink in .claude/skills
    const symlinkPath = join(getClaudeSkillsDir(global), skillName)
    await createSymlink(skillPath, symlinkPath)

    // Update lock with new hash
    const skillFile = join(skillPath, 'SKILL.md')
    const content = await readFile(skillFile, 'utf-8')
    const newHash = await computeFileHash(content)

    await updateLockEntry(
      skillName,
      {
        sourceType: 'github',
        source: entry.source,
        path: entry.path,
        commitHash: newHash,
      },
      global,
    )
  } finally {
    await execAsync(`rm -rf "${tempDir}"`)
  }
}
