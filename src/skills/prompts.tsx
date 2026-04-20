import { Text, Box, Newline } from 'ink'
import React from 'react'

import type { DiscoveredSkill } from './types'

export interface SelectOption<T> {
  label: string
  value: T
}

export function renderSkillList(skills: DiscoveredSkill[]): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>Available Skills:</Text>
      <Newline />
      {skills.map((skill, i) => (
        <Box key={skill.name} flexDirection="column" marginLeft={2}>
          <Text>
            <Text bold>
              {i + 1}. {skill.name}
            </Text>
          </Text>
          <Text dimColor> {skill.description}</Text>
          <Text dimColor> Path: {skill.path}</Text>
          <Newline />
        </Box>
      ))}
    </Box>
  )
}

export function renderConfirm(message: string): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>Confirm:</Text>
      <Text>{message}</Text>
    </Box>
  )
}

export function renderSuccess(message: string): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>Success:</Text>
      <Text>{message}</Text>
    </Box>
  )
}

export function renderError(message: string): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>Error:</Text>
      <Text>{message}</Text>
    </Box>
  )
}
