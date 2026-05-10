#!/usr/bin/env node

import { Command } from 'commander'

import packageJson from '../package.json' with { type: 'json' }
import { createAddCommand } from './commands/skills/add.js'
import { createInstallCommand } from './commands/skills/install.js'
import { createListCommand } from './commands/skills/list.js'
import { createMigrateCommand } from './commands/skills/migrate.js'
import { createRemoveCommand } from './commands/skills/remove.js'
import { createUpdateCommand } from './commands/skills/update.js'

const program = new Command()

program
  .name('kodaos')
  .description('CLI for managing the AI ecosystem with Kodaos')
  .version(packageJson.version)

program.action(() => {
  program.help()
})

const skillsCommand = program
  .command('skills')
  .description('Manage skills')
  .addCommand(createAddCommand())
  .addCommand(createInstallCommand())
  .addCommand(createRemoveCommand())
  .addCommand(createListCommand())
  .addCommand(createUpdateCommand())
  .addCommand(createMigrateCommand())

skillsCommand.action(() => {
  skillsCommand.help()
})

program.parse()
