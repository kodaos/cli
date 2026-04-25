import { Command } from 'commander'
import { render } from 'ink'
import inquirer from 'inquirer'

import { parseGitHubSource, fetchGitHubSkills } from '../../skills/github'
import { installSkill } from '../../skills/installer'
import { readLock } from '../../skills/lock'
import {
  EXIT_CODES,
  isJsonMode,
  formatJsonSuccess,
  exitWithError,
  type OutputMode,
} from '../../skills/output'
import { renderSuccess, renderError } from '../../skills/prompts'
import { addOptionsSchema } from '../../skills/schema'

export function createAddCommand(): Command {
  const cmd = new Command('add')
    .description('Add skills from a GitHub repository')
    .argument('<source>', 'GitHub shorthand (owner/repo) or full GitHub URL')
    .option('--path <path>', 'Source path to skill directory in the repo')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--copy', 'Copy files instead of symlinking')
    .option('-g, --global', 'Install to global directory instead of project')
    .option('-o, --output <mode>', 'Output format: json or text', 'text')
    .option('--dry-run', 'Preview what would be installed without making changes')

  cmd.action(async (source: string, opts: Record<string, unknown>) => {
    const parsed = addOptionsSchema.safeParse({ source, ...opts })
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
      const fullSource = options.path ? `${source} --path=${options.path}` : source
      const skillSource = parseGitHubSource(fullSource)
      const skills = await fetchGitHubSkills(skillSource)

      if (skills.length === 0) {
        exitWithError(output, EXIT_CODES.VALIDATION_ERROR, 'No skills found in the repository.')
      }

      const toInstall = skills

      // Idempotency: check which skills are already installed
      const lock = await readLock(options.global)
      const alreadyInstalled = toInstall.filter((s) => lock?.skills[s.name])
      const newInstalls = toInstall.filter((s) => !lock?.skills[s.name])

      // Dry-run mode
      if (options['dry-run']) {
        const dryRunResult = {
          action: 'install',
          source,
          wouldInstall: newInstalls.map((s) => s.name),
          alreadyInstalled: alreadyInstalled.map((s) => s.name),
          skipped: alreadyInstalled.length > 0,
          message:
            alreadyInstalled.length > 0
              ? `${alreadyInstalled.length} skill(s) already installed`
              : `Would install ${newInstalls.length} skill(s)`,
        }
        console.log(formatJsonSuccess(dryRunResult))
        return
      }

      // Idempotent: skip already installed skills
      if (alreadyInstalled.length > 0 && newInstalls.length === 0) {
        // All skills already installed - return success
        if (isJsonMode(output)) {
          console.log(
            formatJsonSuccess({
              success: true,
              message: 'All specified skills are already installed',
              skills: alreadyInstalled.map((s) => s.name),
            }),
          )
        } else {
          render(renderSuccess(`All specified skills are already installed.`))
        }
        return
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

      // Install new skills (skip already installed)
      const installed: string[] = []
      for (const skill of newInstalls) {
        await installSkill(skill, installOptions)
        installed.push(skill.name)
      }

      const result = {
        success: true,
        installed,
        alreadyInstalled: alreadyInstalled.map((s) => s.name),
        total: toInstall.length,
      }

      if (isJsonMode(output)) {
        console.log(formatJsonSuccess(result))
      } else {
        const msg =
          alreadyInstalled.length > 0
            ? `Installed ${installed.length} skill(s) (${alreadyInstalled.length} already installed)`
            : `Installed ${installed.length} skill(s)`
        render(renderSuccess(msg))
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
