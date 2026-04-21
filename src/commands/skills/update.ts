import { exec } from 'child_process'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import { Command } from 'commander'
import { render } from 'ink'
import inquirer from 'inquirer'

import { readLock, updateLockEntry, getSkillsDir, computeFileHash } from '../../skills/lock'
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

  cmd.action(async (skills: string[], opts: Record<string, unknown>) => {
    const parsed = updateOptionsSchema.safeParse({ skills, ...opts })
    if (!parsed.success) {
      const error = parsed.error.issues[0]
      console.error(`Validation error: ${error.path.join('.')} - ${error.message}`)
      process.exit(1)
    }

    const options = parsed.data

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
        render(renderError(`No ${global ? 'global' : 'project'} skills installed.`))
        return
      }

      // Determine which skills to update
      let toUpdate: string[]
      if (options.skills && options.skills.length > 0) {
        toUpdate = options.skills.filter((s) => s in lock.skills)
        if (toUpdate.length === 0) {
          render(renderError('None of the specified skills are installed.'))
          process.exit(1)
        }
      } else {
        toUpdate = Object.keys(lock.skills)
      }

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
          render(renderSuccess('Cancelled.'))
          return
        }
      }

      // Update each skill
      let updated = 0
      for (const skillName of toUpdate) {
        const entry = lock.skills[skillName]
        try {
          await updateSingleSkill(skillName, entry, global)
          updated++
        } catch (error) {
          console.error(`Failed to update ${skillName}: ${error}`)
        }
      }

      render(renderSuccess(`Updated ${updated}/${toUpdate.length} skill(s)`))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      render(renderError(message))
      process.exit(1)
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
    // Clone latest
    const cloneUrl = `https://github.com/${owner}/${repo}`
    await execAsync(`git clone --depth 1 "${cloneUrl}" "${tempDir}"`)

    // Copy new files
    const sourceSkillDir = join(tempDir, entry.path)
    await execAsync(`rm -rf "${skillPath}" && cp -r "${sourceSkillDir}" "${skillsDir}"`)

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
