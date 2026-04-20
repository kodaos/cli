#!/usr/bin/env node

import { Command } from 'commander'

import { createAddCommand } from './commands/skills/add'
import { createListCommand } from './commands/skills/list'
import { createRemoveCommand } from './commands/skills/remove'
import { createUpdateCommand } from './commands/skills/update'

const program = new Command()

program.name('kodaos').description('CLI for managing the AI ecosystem with Kodaos').version('0.0.0')

program
  .command('skills')
  .description('Manage skills')
  .addCommand(createAddCommand())
  .addCommand(createRemoveCommand())
  .addCommand(createListCommand())
  .addCommand(createUpdateCommand())

program.parse()
