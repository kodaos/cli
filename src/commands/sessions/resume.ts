import { spawn } from 'child_process'
import { access } from 'fs/promises'

import { Command } from 'commander'
import { render } from 'ink'

import { sessionsResumeOptionsSchema } from '../../sessions/schema'
import { resolveSessionRecord } from '../../sessions/service'
import type { SessionSource } from '../../sessions/types'
import {
  EXIT_CODES,
  exitWithError,
  formatJsonSuccess,
  isJsonMode,
  type OutputMode,
} from '../../skills/output'
import { renderError } from '../../skills/prompts'

export function createSessionsResumeCommand(): Command {
  const cmd = new Command('resume')
    .description('Resume a session by id')
    .argument('<id>', 'Session id to resume')
    .option('-s, --source <source>', 'Session source: claude, codex, or auto', 'auto')
    .option('--dry-run', 'Print resume command without executing')
    .option('-o, --output <mode>', 'Output format: json or text', 'text')
    .addHelpText(
      'after',
      `
Examples:
  $ kodaos sessions resume 019cfc4f-a27e-7590-9149-d6ea7d0b8450
  $ kodaos sessions resume be1256b0-23ba-4c8f-9a9e-081dbf4a10e8 --source claude
  $ kodaos sessions resume 019cfc4f-a27e-7590-9149-d6ea7d0b8450 --dry-run`,
    )

  cmd.action(async (id: string, opts: Record<string, unknown>) => {
    const parsed = sessionsResumeOptionsSchema.safeParse({
      id,
      ...opts,
      'dry-run': opts.dryRun === true || opts['dry-run'] === true,
    })
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
    const session = await resolveSessionRecord(options.id, options.source)
    if (!session) {
      exitWithError(
        output,
        EXIT_CODES.CONFIG_ERROR,
        `Could not resolve a unique source for session id: ${options.id}`,
        { id: options.id, source: options.source },
        'Pass --source claude or --source codex explicitly.',
      )
    }

    const command = buildResumeCommand(session.source, options.id)
    if (options['dry-run']) {
      console.log(
        formatJsonSuccess({
          action: 'resume',
          source: session.source,
          id: options.id,
          command: command.join(' '),
          cwd: session.projectPath ?? process.cwd(),
          wouldPerform: false,
        }),
      )
      return
    }

    const workingDirectory = await resolveWorkingDirectory(session.projectPath, output)

    try {
      const child = spawn(command[0], command.slice(1), {
        stdio: 'inherit',
        cwd: workingDirectory,
      })
      child.on('exit', (code) => {
        process.exit(code ?? EXIT_CODES.GENERAL_ERROR)
      })
      child.on('error', (error) => {
        if (isJsonMode(output)) {
          exitWithError(output, EXIT_CODES.GENERAL_ERROR, error.message)
        } else {
          render(renderError(error.message))
          process.exit(EXIT_CODES.GENERAL_ERROR)
        }
      })
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

function buildResumeCommand(source: SessionSource, id: string): string[] {
  if (source === 'claude') {
    return ['claude', '--resume', id]
  }
  return ['codex', 'resume', id]
}

async function resolveWorkingDirectory(
  projectPath: string | null,
  output: OutputMode,
): Promise<string | undefined> {
  if (!projectPath) {
    return undefined
  }
  try {
    await access(projectPath)
    return projectPath
  } catch {
    exitWithError(
      output,
      EXIT_CODES.FILE_SYSTEM_ERROR,
      `Session project path does not exist: ${projectPath}`,
      { projectPath },
      'Open the original project directory or use a valid session id.',
    )
  }
}
