#!/usr/bin/env node
import { Command } from 'commander';
import listCommand from './commands/list.js';
import detailCommand from './commands/detail.js';
import installCommand from './commands/install.js';
import uploadCommand from './commands/upload.js';
import checkCommand from './commands/check.js';

const program = new Command();

program
  .name('skill-marketplace')
  .description('CLI for the Claude Code Skill Marketplace')
  .version('1.0.0', '-V, --app-version', 'Output the CLI version');

program.addCommand(listCommand);
program.addCommand(detailCommand);
program.addCommand(installCommand);
program.addCommand(uploadCommand);
program.addCommand(checkCommand);

program.parse();
