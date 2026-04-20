import { exec } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'

import { Command } from 'commander'
import { render } from 'ink'
import inquirer from 'inquirer'
import React from 'react'

import { uninstallSkill } from '../../skills/installer'
import { readLock, removeLockEntry, getSkillsDir } from '../../skills/lock'
import { renderSuccess, renderError } from '../../skills/prompts'
import { removeOptionsSchema } from '../../skills/schema'

const execAsync = promisify(exec)

export function createRemoveCommand(): Command {
  const cmd = new Command('remove')
    .description('Remove installed skills')
    .alias('rm')
    .argument('[skills...]', 'Skills to remove')
    .option('-g, --global', 'Remove from global directory')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--all', 'Remove all installed skills')

  cmd.action(async (skills: string[], opts: Record<string, unknown>) => {
    const parsed = removeOptionsSchema.safeParse({ skills, ...opts })
    if (!parsed.success) {
      const error = parsed.error.issues[0]
      console.error(`Validation error: ${error.path.join('.')} - ${error.message}`)
      process.exit(1)
    }

    const options = parsed.data

    try {
      const lock = await readLock(options.global)

      if (!lock || Object.keys(lock.skills).length === 0) {
        render(renderError('No skills installed.'))
        return
      }

      const installedSkills = Object.keys(lock.skills)

      // Determine which skills to remove
      let toRemove: string[]
      if (options.all) {
        toRemove = installedSkills
      } else if (options.skills && options.skills.length > 0) {
        toRemove = options.skills.filter((s) => installedSkills.includes(s))
        if (toRemove.length === 0) {
          render(renderError('None of the specified skills are installed.'))
          process.exit(1)
        }
      } else {
        // Interactive selection
        if (!options.yes) {
          const answer = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'selected',
              message: 'Select skills to remove',
              choices: installedSkills,
            },
          ])
          toRemove = answer.selected
          if (toRemove.length === 0) {
            render(renderSuccess('No skills selected.'))
            return
          }
        } else {
          render(renderError('No skills specified. Use --all or specify skills to remove.'))
          process.exit(1)
        }
      }

      // Confirm if not --yes
      if (!options.yes) {
        const answer = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Remove ${toRemove.length} skill(s)?`,
            default: true,
          },
        ])
        if (!answer.confirm) {
          render(renderSuccess('Cancelled.'))
          return
        }
      }

      // Remove each skill
      for (const skillName of toRemove) {
        await uninstallSkill(skillName, { global: options.global })
        await removeLockEntry(skillName, options.global)
      }

      render(renderSuccess(`Removed ${toRemove.length} skill(s)`))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      render(renderError(message))
      process.exit(1)
    }
  })

  return cmd
}
