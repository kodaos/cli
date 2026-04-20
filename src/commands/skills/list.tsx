import { Command } from 'commander'
import { Box, Text, Newline } from 'ink'
import { render } from 'ink'
import React from 'react'

import { readLock } from '../../skills/lock'
import { renderError } from '../../skills/prompts'

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
          <Text dimColor> Hash: {(entry as { computedHash: string }).computedHash}</Text>
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

  cmd.action(async (opts: Record<string, unknown>) => {
    try {
      const global = opts.global === true
      const lock = await readLock(global)

      if (!lock || Object.keys(lock.skills).length === 0) {
        render(
          <Box flexDirection="column">
            <Text>No skills installed.</Text>
          </Box>,
        )
        return
      }

      render(renderSkillListTable(lock.skills))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      render(renderError(message))
      process.exit(1)
    }
  })

  return cmd
}
