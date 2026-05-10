import { Command } from 'commander'
import { Box, Newline, Text } from 'ink'
import { render } from 'ink'
import React from 'react'

import { sessionsListOptionsSchema } from '../../sessions/schema'
import { listSessions } from '../../sessions/service'
import type { SessionRecord } from '../../sessions/types'
import {
  EXIT_CODES,
  exitWithError,
  formatJsonSuccess,
  isJsonMode,
  type OutputMode,
} from '../../skills/output'
import { renderError } from '../../skills/prompts'

export function createSessionsListCommand(): Command {
  const cmd = new Command('list')
    .description('List sessions across supported agents')
    .alias('ls')
    .option('-s, --source <source>', 'Session source: claude, codex, or all', 'all')
    .option('--from <date>', 'Filter by start date (YYYY-MM-DD)')
    .option('--to <date>', 'Filter by end date (YYYY-MM-DD)')
    .option('--limit <number>', 'Limit number of returned sessions')
    .option('-o, --output <mode>', 'Output format: json or text', 'text')
    .addHelpText(
      'after',
      `
Examples:
  $ kodaos sessions list
  $ kodaos sessions list --source claude --limit 20
  $ kodaos sessions list --from 2026-05-01 --to 2026-05-10 -o json`,
    )

  cmd.action(async (opts: Record<string, unknown>) => {
    const parsed = sessionsListOptionsSchema.safeParse(opts)
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
      const sessions = await listSessions({
        source: options.source,
        from: options.from,
        to: options.to,
        limit: options.limit,
      })
      if (isJsonMode(output)) {
        console.log(
          formatJsonSuccess({
            sessions,
            total: sessions.length,
          }),
        )
        return
      }
      render(renderSessionList(sessions))
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

function renderSessionList(sessions: SessionRecord[]): React.ReactElement {
  if (sessions.length === 0) {
    return (
      <Box flexDirection="column">
        <Text>No sessions found.</Text>
      </Box>
    )
  }

  const grouped = sessions.reduce<Record<string, SessionRecord[]>>((acc, session) => {
    if (!acc[session.source]) {
      acc[session.source] = []
    }
    acc[session.source].push(session)
    return acc
  }, {})

  return (
    <Box flexDirection="column" rowGap={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1} paddingY={0}>
        <Text bold>Sessions ({sessions.length})</Text>
      </Box>

      {Object.entries(grouped).map(([source, sourceSessions]) => (
        <Box
          key={source}
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <Box columnGap={1}>
            <Text bold color="green">
              {source.toUpperCase()}
            </Text>
            <Text dimColor>{sourceSessions.length} session(s)</Text>
          </Box>
          <Newline />
          <Box>
            <Box width={48}>
              <Text dimColor>Title</Text>
            </Box>
            <Box width={20}>
              <Text dimColor>Updated</Text>
            </Box>
            <Box flexGrow={1}>
              <Text dimColor>Id</Text>
            </Box>
          </Box>
          <Text dimColor>{'-'.repeat(100)}</Text>
          {sourceSessions.map((session) => (
            <Box key={`${source}-${session.id}`} flexDirection="column">
              <Box>
                <Box width={48} paddingRight={1}>
                  <Text wrap="truncate-end">{session.title}</Text>
                </Box>
                <Box width={20} paddingRight={1}>
                  <Text>{formatUpdatedAt(session.updatedAt)}</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text wrap="truncate-end">{session.id}</Text>
                </Box>
              </Box>
              {session.projectPath ? (
                <Text dimColor wrap="truncate-end">{`  project: ${session.projectPath}`}</Text>
              ) : null}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}

function formatUpdatedAt(value: string): string {
  const normalized = value.replace('T', ' ')
  if (normalized.length >= 16) {
    return normalized.slice(0, 16)
  }
  return normalized
}
