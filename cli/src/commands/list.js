import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';

const getApiBase = () =>
  process.env.SKILL_MARKETPLACE_API || 'http://localhost:3001/api';

const list = new Command('list')
  .description('Browse skills in the marketplace')
  .option('-s, --search <query>', 'Filter by skill name', '')
  .option('-p, --page <number>', 'Page number', '1')
  .action(async (opts) => {
    try {
      const { data } = await axios.get(`${getApiBase()}/skills`, {
        params: { search: opts.search, page: opts.page, limit: 20 }
      });

      console.log();
      console.log(chalk.bold(`Skill Marketplace`) + chalk.gray(` — ${data.total} skill(s) found`));
      if (opts.search) {
        console.log(chalk.gray(`  Search: "${opts.search}"`));
      }
      console.log();

      if (data.skills.length === 0) {
        console.log(chalk.gray('  No skills found.'));
      } else {
        // Header
        console.log(
          chalk.gray('  ID  ') +
          chalk.bold('Name'.padEnd(25)) +
          chalk.bold('Version'.padEnd(12)) +
          chalk.bold('Author'.padEnd(20)) +
          chalk.bold('Registered')
        );
        console.log(chalk.gray('  ' + '─'.repeat(75)));

        data.skills.forEach(s => {
          const date = s.created_at.slice(0, 10);
          console.log(
            chalk.cyan(`  ${String(s.id).padEnd(4)}`) +
            chalk.white(s.name.padEnd(25)) +
            chalk.gray(('v' + s.version).padEnd(12)) +
            s.author.padEnd(20) +
            chalk.dim(date)
          );
        });
      }

      // Pagination hint
      const totalPages = Math.ceil(data.total / 20);
      if (totalPages > 1) {
        console.log();
        console.log(chalk.gray(`  Page ${data.page}/${totalPages}  |  Use --page to navigate`));
      }
      console.log();
      console.log(chalk.dim('  skill-marketplace detail <id>    View skill details'));
      console.log(chalk.dim('  skill-marketplace install <id>   Install skill to ~/.claude/skills/'));
      console.log();
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error(chalk.red('Error: Cannot connect to the marketplace server.'));
        console.error(chalk.gray(`  Expected: ${getApiBase()}`));
        console.error(chalk.gray('  Set SKILL_MARKETPLACE_API env var if using a remote server.'));
      } else {
        console.error(chalk.red('Error: ' + (err.message || 'Unknown error')));
      }
      process.exit(1);
    }
  });

export default list;
