import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import os from 'os';
import FormData from 'form-data';
import AdmZip from 'adm-zip';

const getApiBase = () =>
  process.env.SKILL_MARKETPLACE_API || 'https://skill-marketplace-umzq.onrender.com/api';

const upload = new Command('upload')
  .description('Upload a skill .md file or directory to the marketplace')
  .argument('<path>', 'Path to a .md file or a skill directory (must contain SKILL.md)')
  .requiredOption('-n, --name <name>', 'Skill name')
  .requiredOption('-a, --author <author>', 'Author name')
  .option('-v, --version <version>', 'Version', '1.0.0')
  .option('-d, --description <desc>', 'Short description', '')
  .action(async (target, opts) => {
    const targetPath = path.resolve(target);

    if (!fs.existsSync(targetPath)) {
      console.error(chalk.red(`Path not found: ${targetPath}`));
      process.exit(1);
    }

    const isDir = fs.statSync(targetPath).isDirectory();
    let uploadPath = targetPath;
    let uploadName = path.basename(targetPath);
    let tmpZip = null;

    if (isDir) {
      // 디렉토리: SKILL.md 존재 확인 후 zip 생성
      const skillMd = path.join(targetPath, 'SKILL.md');
      if (!fs.existsSync(skillMd)) {
        console.error(chalk.red('Directory must contain SKILL.md'));
        process.exit(1);
      }
      tmpZip = path.join(os.tmpdir(), `${Date.now()}_${path.basename(targetPath)}.zip`);
      const zip = new AdmZip();
      const EXCLUDE = new Set(['node_modules', '.git']);
      const addDir = (dirPath, zipPath) => {
        for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
          if (EXCLUDE.has(entry.name)) continue;
          const full = path.join(dirPath, entry.name);
          const zp = zipPath ? `${zipPath}/${entry.name}` : entry.name;
          if (entry.isDirectory()) addDir(full, zp);
          else zip.addFile(zp, fs.readFileSync(full));
        }
      };
      addDir(targetPath, '');
      zip.writeZip(tmpZip);
      uploadPath = tmpZip;
      uploadName = `${path.basename(targetPath)}.zip`;
    } else if (!targetPath.endsWith('.md') && !targetPath.endsWith('.zip')) {
      console.error(chalk.red('Only .md files, .zip files, or directories are accepted'));
      process.exit(1);
    }

    const spinner = ora(`Uploading "${opts.name}" v${opts.version}...`).start();

    try {
      const form = new FormData();
      form.append('name', opts.name);
      form.append('version', opts.version);
      form.append('author', opts.author);
      form.append('description', opts.description);
      form.append('skill_file', fs.createReadStream(uploadPath), uploadName);

      const { data } = await axios.post(`${getApiBase()}/skills`, form, {
        headers: form.getHeaders(),
      });

      if (tmpZip) fs.unlinkSync(tmpZip);

      spinner.succeed(
        chalk.green(`Uploaded "${opts.name}" v${opts.version}`) +
        chalk.gray(`  id: ${data.id}`) +
        (isDir ? chalk.dim('  [directory]') : '')
      );
      console.log();
      console.log(chalk.dim(`  Detail:  skill-marketplace detail ${data.id}`));
      console.log(chalk.dim(`  Install: skill-marketplace install ${data.id}`));
      console.log();
    } catch (err) {
      if (tmpZip && fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip);
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
