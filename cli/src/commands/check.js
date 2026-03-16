import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import os from 'os';

const getApiBase = () =>
  process.env.SKILL_MARKETPLACE_API || 'https://skill-marketplace-umzq.onrender.com/api';

function compareVersions(a, b) {
  const pa = (a || '0').split('.').map(Number);
  const pb = (b || '0').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

function getLocalSkills(baseDir) {
  if (!fs.existsSync(baseDir)) return [];

  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const skillDir = path.join(baseDir, d.name);
      const metaPath = path.join(skillDir, '.skill-meta.json');
      let version = null;

      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          version = meta.version || null;
        } catch (_) {}
      }

      // Fallback: parse frontmatter from SKILL.md
      if (!version) {
        const skillPath = path.join(skillDir, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const content = fs.readFileSync(skillPath, 'utf8');
          const match = content.match(/^---[\s\S]*?^version:\s*(.+)$/m);
          if (match) version = match[1].trim();
        }
      }

      return { name: d.name, version, dir: skillDir };
    });
}

const check = new Command('check')
  .description('Compare local skills with marketplace versions')
  .option('-d, --dir <path>', 'Local skills directory (default: ~/.claude/skills/)')
  .action(async (opts) => {
    const baseDir = opts.dir
      ? path.resolve(opts.dir)
      : path.join(os.homedir(), '.claude', 'skills');

    const localSkills = getLocalSkills(baseDir);

    if (localSkills.length === 0) {
      console.log();
      console.log(chalk.gray(`  No local skills found in: ${baseDir}`));
      console.log();
      return;
    }

    const spinner = ora('Checking marketplace versions...').start();

    const results = [];

    await Promise.all(localSkills.map(async (local) => {
      try {
        const { data } = await axios.get(`${getApiBase()}/skills`, {
          params: { search: local.name, limit: 100 }
        });
        // Find exact name match
        const match = data.skills.find(s => s.name === local.name);

        if (!match) {
          results.push({ ...local, marketVersion: null, status: 'not-found' });
        } else if (!local.version) {
          results.push({ ...local, marketVersion: match.version, marketId: match.id, status: 'unknown' });
        } else {
          const cmp = compareVersions(match.version, local.version);
          const status = cmp > 0 ? 'outdated' : cmp === 0 ? 'up-to-date' : 'ahead';
          results.push({ ...local, marketVersion: match.version, marketId: match.id, status });
        }
      } catch (_) {
        results.push({ ...local, marketVersion: null, status: 'error' });
      }
    }));

    spinner.stop();

    // Sort: outdated first, then up-to-date, then others
    const order = { outdated: 0, unknown: 1, 'up-to-date': 2, ahead: 3, 'not-found': 4, error: 5 };
    results.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

    const statusLabel = {
      'outdated':   chalk.yellow('  outdated  '),
      'up-to-date': chalk.green(' up-to-date '),
      'unknown':    chalk.gray('   unknown  '),
      'ahead':      chalk.cyan('    ahead   '),
      'not-found':  chalk.gray(' not found  '),
      'error':      chalk.red('    error   '),
    };

    console.log();
    console.log(chalk.bold('  Local Skills vs Marketplace'));
    console.log(chalk.gray('  ' + '─'.repeat(70)));
    console.log(
      chalk.gray('  ') +
      chalk.bold('Name'.padEnd(25)) +
      chalk.bold('Local'.padEnd(12)) +
      chalk.bold('Marketplace'.padEnd(14)) +
      chalk.bold('Status')
    );
    console.log(chalk.gray('  ' + '─'.repeat(70)));

    results.forEach(r => {
      const localVer  = r.version       ? chalk.white(('v' + r.version).padEnd(12))       : chalk.gray('unknown'.padEnd(12));
      const marketVer = r.marketVersion ? chalk.white(('v' + r.marketVersion).padEnd(14)) : chalk.gray('N/A'.padEnd(14));
      console.log(
        chalk.gray('  ') +
        chalk.white(r.name.padEnd(25)) +
        localVer +
        marketVer +
        statusLabel[r.status]
      );
    });

    console.log(chalk.gray('  ' + '─'.repeat(70)));

    const outdated = results.filter(r => r.status === 'outdated');
    if (outdated.length > 0) {
      console.log();
      console.log(chalk.yellow(`  ${outdated.length} skill(s) can be updated:`));
      outdated.forEach(r => {
        console.log(chalk.dim(`    skill-marketplace install ${r.marketId}   # ${r.name}: v${r.version} → v${r.marketVersion}`));
      });
    }

    console.log();
  });

export default check;
