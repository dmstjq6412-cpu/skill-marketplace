import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

const getApiBase = () =>
  process.env.SKILL_MARKETPLACE_API || 'https://skill-marketplace-umzq.onrender.com/api';

const install = new Command('install')
  .description('Download and install a skill into ~/.claude/skills/')
  .argument('[id]', 'Skill ID to install')
  .option('-d, --dir <path>', 'Custom install directory (default: ~/.claude/skills/)')
  .option('--name <name>', 'Install skill by exact name')
  .action(async (id, opts) => {
    if (!id && !opts.name) {
      console.error(chalk.red('Error: provide a skill <id> or --name <name>'));
      process.exit(1);
    }

    const spinner = ora(opts.name ? `Fetching skill "${opts.name}"...` : `Fetching skill #${id}...`).start();

    try {
      // Step 1: get metadata
      let skill;
      if (opts.name) {
        const { data } = await axios.get(`${getApiBase()}/skills/by-name/${encodeURIComponent(opts.name)}`);
        skill = data;
      } else {
        const { data } = await axios.get(`${getApiBase()}/skills/${id}`);
        skill = data;
      }
      spinner.text = `Installing "${skill.name}" v${skill.version}...`;

      // Step 2: download raw .md file
      const response = await axios.get(`${getApiBase()}/skills/${skill.id}/download`, {
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
        // package.json 있으면 npm install 자동 실행
        if (fs.existsSync(path.join(targetDir, 'package.json'))) {
          spinner.text = `Installing dependencies for "${skill.name}"...`;
          execSync('npm install --silent', { cwd: targetDir, stdio: 'ignore' });
        }
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
        const label = opts.name ? `"${opts.name}"` : `#${id}`;
        console.error(chalk.red(`Skill ${label} not found.`));
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
