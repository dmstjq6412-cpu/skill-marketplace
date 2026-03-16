import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';

const getApiBase = () =>
  process.env.SKILL_MARKETPLACE_API || 'https://skill-marketplace-umzq.onrender.com/api';

const detail = new Command('detail')
  .description('Show full details of a skill')
  .argument('<id>', 'Skill ID')
  .action(async (id) => {
    try {
      const { data: skill } = await axios.get(`${getApiBase()}/skills/${id}`);

      console.log();
      console.log(chalk.bold(`  ${skill.name}`) + '  ' + chalk.cyan(`v${skill.version}`));
      console.log(chalk.gray('  ' + '─'.repeat(50)));
      console.log(`  ${chalk.gray('Author:')}     ${skill.author}`);
      console.log(`  ${chalk.gray('Downloads:')}  ${skill.downloads.toLocaleString()}`);
      console.log(`  ${chalk.gray('Registered:')} ${skill.created_at.slice(0, 10)}`);
      if (skill.description) {
        console.log(`  ${chalk.gray('Description:')} ${skill.description}`);
      }
      console.log();

      if (skill.versions && skill.versions.length > 1) {
        console.log(chalk.bold('  Version History'));
        console.log(chalk.gray('  ' + '─'.repeat(50)));
        skill.versions.forEach((v, i) => {
          const tag = i === 0 ? chalk.green(' (latest)') : '';
          const date = v.created_at.slice(0, 10);
          const dl = v.downloads.toLocaleString() + ' dl';
          console.log(
            chalk.cyan(`  [${v.id}]`) + '  ' +
            chalk.white(('v' + v.version).padEnd(12)) +
            chalk.dim(date.padEnd(14)) +
            chalk.gray(dl) +
            tag
          );
        });
        console.log();
      }

      if (skill.readme) {
        console.log(chalk.bold('  README'));
        console.log(chalk.gray('  ' + '─'.repeat(50)));
        const lines = skill.readme.split('\n');
        lines.forEach(line => console.log('  ' + line));
      } else {
        console.log(chalk.gray('  No README provided.'));
      }

      console.log();
      console.log(chalk.dim(`  Install: skill-marketplace install ${skill.id}`));
      console.log();
    } catch (err) {
      if (err.response?.status === 404) {
        console.error(chalk.red(`Skill #${id} not found.`));
      } else if (err.code === 'ECONNREFUSED') {
        console.error(chalk.red('Error: Cannot connect to the marketplace server.'));
      } else {
        console.error(chalk.red('Error: ' + (err.message || 'Unknown error')));
      }
      process.exit(1);
    }
  });

export default detail;
