import { exec } from 'child_process'
import { join } from 'path'
import { promisify } from 'util'

import { Command } from 'commander'
import { render } from 'ink'
import inquirer from 'inquirer'
import React from 'react'

import { uninstallSkill } from '../../skills/installer'
import { readLock, removeLockEntry, getSkillsDir } from '../../skills/lock'
import {
  EXIT_CODES,
  isJsonMode,
  formatJsonSuccess,
  exitWithError,
  type OutputMode,
} from '../../skills/output'
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
    .option('-o, --output <mode>', 'Output format: json or text', 'text')
    .option('--dry-run', 'Preview what would be removed without making changes')

  cmd.action(async (skills: string[], opts: Record<string, unknown>) => {
    const parsed = removeOptionsSchema.safeParse({ skills, ...opts })
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
      const lock = await readLock(options.global)

      if (!lock || Object.keys(lock.skills).length === 0) {
        // Idempotent: no skills installed = success
        if (isJsonMode(output)) {
          console.log(formatJsonSuccess({ success: true, message: 'No skills installed.' }))
        } else {
          render(renderSuccess('No skills installed.'))
        }
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
          exitWithError(
            output,
            EXIT_CODES.VALIDATION_ERROR,
            'None of the specified skills are installed.',
          )
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
            if (isJsonMode(output)) {
              console.log(formatJsonSuccess({ success: true, message: 'No skills selected.' }))
            } else {
              render(renderSuccess('No skills selected.'))
            }
            return
          }
        } else {
          exitWithError(
            output,
            EXIT_CODES.VALIDATION_ERROR,
            'No skills specified. Use --all or specify skills to remove.',
          )
        }
      }

      // Dry-run mode
      if (options['dry-run']) {
        const dryRunResult = {
          action: 'remove',
          wouldRemove: toRemove,
          total: toRemove.length,
        }
        console.log(formatJsonSuccess(dryRunResult))
        return
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
          if (isJsonMode(output)) {
            console.log(formatJsonSuccess({ success: true, message: 'Cancelled.' }))
          } else {
            render(renderSuccess('Cancelled.'))
          }
          return
        }
      }

      // Remove each skill
      const removed: string[] = []
      for (const skillName of toRemove) {
        await uninstallSkill(skillName, { global: options.global })
        await removeLockEntry(skillName, options.global)
        removed.push(skillName)
      }

      const result = { success: true, removed, total: toRemove.length }
      if (isJsonMode(output)) {
        console.log(formatJsonSuccess(result))
      } else {
        render(renderSuccess(`Removed ${removed.length} skill(s)`))
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
