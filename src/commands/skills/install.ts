import { Command } from 'commander'
import { render } from 'ink'

import {
  installSkillFromLockEntry,
  isSkillInstalled,
  readInstalledSkillCommitHash,
} from '../../skills/installer'
import { readLock } from '../../skills/lock'
import {
  EXIT_CODES,
  isJsonMode,
  formatJsonSuccess,
  exitWithError,
  type OutputMode,
} from '../../skills/output'
import { renderSuccess, renderError } from '../../skills/prompts'
import { installOptionsSchema } from '../../skills/schema'

export function createInstallCommand(): Command {
  const cmd = new Command('install')
    .summary('Install skills from lock file')
    .description('Install skills declared in kodaos-lock.json')
    .option('-g, --global', 'Install from global lock file')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('-o, --output <mode>', 'Output format: json or text', 'text')
    .option('--dry-run', 'Preview what would be installed without making changes')
    .addHelpText(
      'after',
      `
Examples:
  $ kodaos skills install
  $ kodaos skills install --dry-run
  $ kodaos skills install --output json`,
    )

  cmd.action(async (opts: Record<string, unknown>) => {
    const parsed = installOptionsSchema.safeParse(opts)
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
    const dryRun = options['dry-run'] || opts.dryRun === true

    try {
      const lock = await readLock(options.global)
      if (!lock || Object.keys(lock.skills).length === 0) {
        exitWithError(
          output,
          EXIT_CODES.FILE_SYSTEM_ERROR,
          'No lock file entries found.',
          { lockFile: options.global ? '~/.kodaos/kodaos-lock.json' : './kodaos-lock.json' },
          'Run `kodaos skills add <source>` first to create lock entries.',
        )
      }

      const lockEntries = Object.entries(lock.skills)
      const alreadyInstalled: string[] = []
      const toInstall: Array<{ name: string; commitHash: string }> = []

      for (const [skillName, entry] of lockEntries) {
        const installed = await isSkillInstalled(skillName, options.global)
        if (installed) {
          const installedCommitHash = await readInstalledSkillCommitHash(skillName, options.global)
          if (installedCommitHash === entry.commitHash) {
            alreadyInstalled.push(skillName)
            continue
          }
        }
        toInstall.push({ name: skillName, commitHash: entry.commitHash })
      }

      if (dryRun) {
        console.log(
          formatJsonSuccess({
            action: 'install',
            source: options.global ? 'global-lock' : 'project-lock',
            wouldInstall: toInstall,
            alreadyInstalled,
            total: lockEntries.length,
          }),
        )
        return
      }

      const installed: Array<{ name: string; commitHash: string }> = []
      for (const [skillName, entry] of lockEntries) {
        if (alreadyInstalled.includes(skillName)) continue
        await installSkillFromLockEntry(skillName, entry, { global: options.global, copy: false })
        installed.push({ name: skillName, commitHash: entry.commitHash })
      }

      const result = {
        success: true,
        installed,
        alreadyInstalled,
        total: lockEntries.length,
      }

      if (isJsonMode(output)) {
        console.log(formatJsonSuccess(result))
      } else {
        const message =
          alreadyInstalled.length > 0
            ? `Installed ${installed.length} skill(s) (${alreadyInstalled.length} already installed)`
            : `Installed ${installed.length} skill(s) from lock file`
        render(renderSuccess(message))
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
