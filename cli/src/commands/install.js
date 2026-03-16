import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

const getApiBase = () =>
  process.env.SKILL_MARKETPLACE_API || 'https://skill-marketplace-umzq.onrender.com/api';

const install = new Command('install')
  .description('Download and install a skill into ~/.claude/skills/')
  .argument('<id>', 'Skill ID to install')
  .option('-d, --dir <path>', 'Custom install directory (default: ~/.claude/skills/)')
  .action(async (id, opts) => {
    const spinner = ora(`Fetching skill #${id}...`).start();

    try {
      // Step 1: get metadata
      const { data: skill } = await axios.get(`${getApiBase()}/skills/${id}`);
      spinner.text = `Installing "${skill.name}" v${skill.version}...`;

      // Step 2: download raw .md file
      const response = await axios.get(`${getApiBase()}/skills/${id}/download`, {
        responseType: 'arraybuffer'
      });

      // Step 3: write to target directory
      const baseDir = opts.dir
        ? path.resolve(opts.dir)
        : path.join(os.homedir(), '.claude', 'skills');

      const targetDir = path.join(baseDir, skill.name);
      fs.mkdirSync(targetDir, { recursive: true });

      const isZip = (skill.file_type || 'md') === 'zip';

      if (isZip) {
        const zip = new AdmZip(Buffer.from(response.data));
        zip.extractAllTo(targetDir, true);
      } else {
        const targetFile = path.join(targetDir, 'SKILL.md');
        fs.writeFileSync(targetFile, response.data);
      }

      // Save metadata for version tracking
      const metaFile = path.join(targetDir, '.skill-meta.json');
      fs.writeFileSync(metaFile, JSON.stringify({
        id: skill.id,
        name: skill.name,
        version: skill.version,
        file_type: skill.file_type || 'md',
        installed_at: new Date().toISOString(),
      }, null, 2));

      spinner.succeed(
        chalk.green(`Installed "${skill.name}" v${skill.version}`) +
        chalk.gray(`\n  → ${targetDir}`) +
        (isZip ? chalk.dim('  [directory]') : '')
      );

      console.log();
      console.log(chalk.dim(`  Use in Claude Code: /${skill.name}`));
      console.log();
    } catch (err) {
      spinner.fail();
      if (err.response?.status === 404) {
        console.error(chalk.red(`Skill #${id} not found.`));
      } else if (err.code === 'ECONNREFUSED') {
        console.error(chalk.red('Error: Cannot connect to the marketplace server.'));
        console.error(chalk.gray(`  Expected: ${getApiBase()}`));
        console.error(chalk.gray('  Set SKILL_MARKETPLACE_API env var if using a remote server.'));
      } else {
        console.error(chalk.red('Error: ' + (err.message || 'Unknown error')));
      }
      process.exit(1);
    }
  });

export default install;
