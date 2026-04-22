import { Command } from 'commander'
import { Box, Text, Newline } from 'ink'
import { render } from 'ink'
import React from 'react'

import { readLock } from '../../skills/lock'
import {
  EXIT_CODES,
  isJsonMode,
  formatJsonSuccess,
  exitWithError,
  type OutputMode,
} from '../../skills/output'
import { renderError } from '../../skills/prompts'
import { listOptionsSchema } from '../../skills/schema'

function renderSkillListTable(skills: Record<string, unknown>): React.ReactElement {
  const entries = Object.entries(skills)
  if (entries.length === 0) {
    return (
      <Box flexDirection="column">
        <Text>No skills installed.</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text bold>Installed Skills:</Text>
      <Newline />
      {entries.map(([name, entry]) => (
        <Box key={name} flexDirection="column" marginLeft={2}>
          <Text bold>{name}</Text>
          <Text dimColor> Source: {(entry as { source: string }).source}</Text>
          <Text dimColor> Path: {(entry as { path: string }).path}</Text>
          <Text dimColor> Hash: {(entry as { commitHash: string }).commitHash}</Text>
          <Newline />
        </Box>
      ))}
    </Box>
  )
}

export function createListCommand(): Command {
  const cmd = new Command('list')
    .description('List installed skills')
    .alias('ls')
    .option('-g, --global', 'List global skills')
    .option('-o, --output <mode>', 'Output format: json or text', 'text')

  cmd.action(async (opts: Record<string, unknown>) => {
    const parsed = listOptionsSchema.safeParse(opts)
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

    try {
      const global = options.global
      const lock = await readLock(global)

      if (!lock || Object.keys(lock.skills).length === 0) {
        if (isJsonMode(output)) {
          console.log(formatJsonSuccess({ skills: [], message: 'No skills installed.' }))
        } else {
          render(
            <Box flexDirection="column">
              <Text>No skills installed.</Text>
            </Box>,
          )
        }
        return
      }

      if (isJsonMode(output)) {
        console.log(formatJsonSuccess({ skills: lock.skills }))
      } else {
        render(renderSkillListTable(lock.skills))
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
