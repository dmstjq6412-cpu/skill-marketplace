import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const getApiBase = () =>
  process.env.SKILL_MARKETPLACE_API || 'http://localhost:3001/api';

const upload = new Command('upload')
  .description('Upload a skill .md file to the marketplace')
  .argument('<file>', 'Path to the .md skill file')
  .requiredOption('-n, --name <name>', 'Skill name')
  .requiredOption('-a, --author <author>', 'Author name')
  .option('-v, --version <version>', 'Version', '1.0.0')
  .option('-d, --description <desc>', 'Short description', '')
  .action(async (file, opts) => {
    const filePath = path.resolve(file);

    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`File not found: ${filePath}`));
      process.exit(1);
    }

    if (!filePath.endsWith('.md')) {
      console.error(chalk.red('Only .md files are accepted'));
      process.exit(1);
    }

    const spinner = ora(`Uploading "${opts.name}" v${opts.version}...`).start();

    try {
      const form = new FormData();
      form.append('name', opts.name);
      form.append('version', opts.version);
      form.append('author', opts.author);
      form.append('description', opts.description);
      form.append('skill_file', fs.createReadStream(filePath), path.basename(filePath));

      const { data } = await axios.post(`${getApiBase()}/skills`, form, {
        headers: form.getHeaders(),
      });

      spinner.succeed(
        chalk.green(`Uploaded "${opts.name}" v${opts.version}`) +
        chalk.gray(`  id: ${data.id}`)
      );
      console.log();
      console.log(chalk.dim(`  Detail:  skill-marketplace detail ${data.id}`));
      console.log(chalk.dim(`  Install: skill-marketplace install ${data.id}`));
      console.log();
    } catch (err) {
      spinner.fail();
      if (err.response?.status === 400) {
        console.error(chalk.red('Error: ' + err.response.data.error));
      } else if (err.response?.status === 409) {
        console.error(chalk.red('Error: ' + err.response.data.error));
      } else if (err.code === 'ECONNREFUSED') {
        console.error(chalk.red('Error: Cannot connect to the marketplace server.'));
        console.error(chalk.gray(`  Expected: ${getApiBase()}`));
      } else {
        console.error(chalk.red('Error: ' + (err.message || 'Unknown error')));
      }
      process.exit(1);
    }
  });

export default upload;
