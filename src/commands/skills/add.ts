import { Command } from 'commander'
import { render } from 'ink'
import inquirer from 'inquirer'
import React from 'react'

import { parseGitHubSource, fetchGitHubSkills } from '../../skills/github'
import { installSkill } from '../../skills/installer'
import { renderSkillList, renderSuccess, renderError } from '../../skills/prompts'
import { addOptionsSchema } from '../../skills/schema'

export function createAddCommand(): Command {
  const cmd = new Command('add')
    .description('Add skills from a GitHub repository')
    .argument('<source>', 'GitHub shorthand (owner/repo) or full GitHub URL')
    .option('-s, --skill <names...>', 'Specific skills to install (default: all)')
    .option('-l, --list', 'List available skills without installing')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--copy', 'Copy files instead of symlinking')
    .option('-g, --global', 'Install to global directory instead of project')

  cmd.action(async (source: string, opts: Record<string, unknown>) => {
    const parsed = addOptionsSchema.safeParse({ source, ...opts })
    if (!parsed.success) {
      const error = parsed.error.issues[0]
      console.error(`Validation error: ${error.path.join('.')} - ${error.message}`)
      process.exit(1)
    }

    const options = parsed.data

    try {
      const skillSource = parseGitHubSource(source)
      const skills = await fetchGitHubSkills(skillSource)

      if (skills.length === 0) {
        console.error('No skills found in the repository.')
        process.exit(1)
      }

      if (options.list) {
        render(renderSkillList(skills))
        return
      }

      // Filter skills if specified
      const toInstall = options.skill?.length
        ? skills.filter((s) => options.skill!.includes(s.name))
        : skills

      if (toInstall.length === 0) {
        console.error('No matching skills found.')
        process.exit(1)
      }

      // Interactive prompts if not using --yes
      let installOptions = { global: options.global, copy: options.copy }

      if (!options.yes) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'global',
            message: 'Install to global directory (~/.kodaos)?',
            default: false,
          },
          {
            type: 'confirm',
            name: 'copy',
            message: 'Copy files instead of symlinking?',
            default: false,
          },
        ])
        installOptions = { ...installOptions, ...answers }
      }

      // Install each skill
      for (const skill of toInstall) {
        await installSkill(skill, installOptions)
      }

      render(renderSuccess(`Installed ${toInstall.length} skill(s)`))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      render(renderError(message))
      process.exit(1)
    }
  })

  return cmd
}
