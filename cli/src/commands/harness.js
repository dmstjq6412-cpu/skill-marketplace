import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const HARNESS_LAB_DIR = process.env.HARNESS_LAB_DIR
  ? path.resolve(process.env.HARNESS_LAB_DIR)
  : path.resolve(process.cwd(), '.harness-lab');

const LOGS_DIR = path.join(HARNESS_LAB_DIR, 'logs');
const BLUEPRINTS_DIR = path.join(HARNESS_LAB_DIR, 'blueprints');

const harness = new Command('harness')
  .description('Harness Lab — 개발 일지 및 블루프린트 관리');

// harness list
harness
  .command('list')
  .description('저장된 개발 일지 목록 조회')
  .option('-b, --blueprints', '블루프린트 목록 조회')
  .action((opts) => {
    const dir = opts.blueprints ? BLUEPRINTS_DIR : LOGS_DIR;
    const ext = opts.blueprints ? '.json' : '.md';
    const label = opts.blueprints ? '블루프린트' : '개발 일지';

    if (!fs.existsSync(dir)) {
      console.log();
      console.log(chalk.gray(`  아직 ${label}가 없습니다.`));
      console.log(chalk.dim('  /harness-log 스킬을 실행하면 자동으로 저장됩니다.'));
      console.log();
      return;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort().reverse();

    if (files.length === 0) {
      console.log();
      console.log(chalk.gray(`  아직 ${label}가 없습니다.`));
      console.log();
      return;
    }

    console.log();
    console.log(chalk.bold(`Harness Lab`) + chalk.gray(` — ${label} ${files.length}개`));
    console.log();

    files.forEach(f => {
      const date = f.replace(ext, '');
      if (opts.blueprints) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          const coverage = data.coverage?.current ?? '?';
          const summary = data.session_summary || '';
          console.log(
            chalk.cyan(`  ${date}`) +
            chalk.gray(`  커버리지 ${coverage}%`) +
            (summary ? chalk.dim(`  ${summary.slice(0, 50)}`) : '')
          );
        } catch {
          console.log(chalk.cyan(`  ${date}`) + chalk.red('  (파싱 오류)'));
        }
      } else {
        try {
          const content = fs.readFileSync(path.join(dir, f), 'utf8');
          const match = content.match(/## 작업 요약\n([\s\S]*?)(?=\n##|$)/);
          const summary = match ? match[1].trim().slice(0, 60) : '';
          console.log(
            chalk.cyan(`  ${date}`) +
            (summary ? chalk.dim(`  ${summary}`) : '')
          );
        } catch {
          console.log(chalk.cyan(`  ${date}`));
        }
      }
    });

    console.log();
    console.log(chalk.dim(`  skill-marketplace harness view <date>    일지 상세 보기`));
    console.log();
  });

// harness view <date>
harness
  .command('view <date>')
  .description('특정 날짜의 개발 일지 조회 (예: 2026-04-08)')
  .option('-b, --blueprint', '블루프린트 조회')
  .action((date, opts) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error(chalk.red('Error: 날짜 형식이 잘못됐습니다. YYYY-MM-DD 형식으로 입력하세요.'));
      process.exit(1);
    }

    if (opts.blueprint) {
      const filePath = path.join(BLUEPRINTS_DIR, `${date}.json`);
      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`Error: ${date} 블루프린트를 찾을 수 없습니다.`));
        process.exit(1);
      }
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log();
        console.log(chalk.bold(`블루프린트 — ${date}`));
        if (data.session_summary) console.log(chalk.gray(`  ${data.session_summary}`));
        console.log();

        if (data.coverage) {
          const bar = '█'.repeat(Math.round((data.coverage.current || 0) / 5));
          const empty = '░'.repeat(20 - bar.length);
          console.log(chalk.gray('  커버리지') + '  ' + chalk.violet(bar) + chalk.gray(empty) + ` ${data.coverage.current}%`);
          console.log();
        }

        if (data.pipeline) {
          console.log(chalk.gray('  파이프라인'));
          console.log(chalk.dim(`    ${data.pipeline}`));
          console.log();
        }

        if (data.skills?.length) {
          console.log(chalk.gray('  스킬 상태'));
          data.skills.forEach(s => {
            const statusColor = s.status === 'DONE' ? chalk.green : s.status === 'IN_PROGRESS' ? chalk.blue : chalk.yellow;
            console.log(
              `    ${statusColor(`[${s.status}]`.padEnd(14))}` +
              chalk.white(s.name.padEnd(30)) +
              chalk.dim(s.version || '')
            );
          });
          console.log();
        }
      } catch {
        console.error(chalk.red('Error: 블루프린트 파싱 오류'));
        process.exit(1);
      }
    } else {
      const filePath = path.join(LOGS_DIR, `${date}.md`);
      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`Error: ${date} 일지를 찾을 수 없습니다.`));
        process.exit(1);
      }
      const content = fs.readFileSync(filePath, 'utf8');
      console.log();
      // 간단한 마크다운 → 터미널 렌더링
      content.split('\n').forEach(line => {
        if (line.startsWith('# ')) {
          console.log(chalk.bold.white('  ' + line.slice(2)));
        } else if (line.startsWith('## ')) {
          console.log(chalk.bold.cyan('\n  ' + line.slice(3)));
        } else if (line.startsWith('### ')) {
          console.log(chalk.bold.gray('  ' + line.slice(4)));
        } else if (line.startsWith('- ')) {
          console.log(chalk.gray('  •') + ' ' + line.slice(2));
        } else if (line.trim()) {
          console.log(chalk.white('  ' + line));
        } else {
          console.log();
        }
      });
      console.log();
    }
  });

// harness diff <from> <to>
harness
  .command('diff <from> <to>')
  .description('두 날짜 블루프린트 비교 (예: 2026-04-07 2026-04-08)')
  .action((from, to) => {
    for (const date of [from, to]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.error(chalk.red(`Error: 날짜 형식 오류 — ${date}`));
        process.exit(1);
      }
    }

    const fromPath = path.join(BLUEPRINTS_DIR, `${from}.json`);
    const toPath = path.join(BLUEPRINTS_DIR, `${to}.json`);

    if (!fs.existsSync(fromPath)) { console.error(chalk.red(`${from} 블루프린트 없음`)); process.exit(1); }
    if (!fs.existsSync(toPath)) { console.error(chalk.red(`${to} 블루프린트 없음`)); process.exit(1); }

    const fromData = JSON.parse(fs.readFileSync(fromPath, 'utf8'));
    const toData = JSON.parse(fs.readFileSync(toPath, 'utf8'));

    const fromSkills = Object.fromEntries((fromData.skills || []).map(s => [s.name, s]));
    const toSkills = Object.fromEntries((toData.skills || []).map(s => [s.name, s]));
    const allNames = new Set([...Object.keys(fromSkills), ...Object.keys(toSkills)]);

    console.log();
    console.log(chalk.bold(`블루프린트 비교`) + chalk.gray(`  ${from} → ${to}`));
    console.log();

    if (fromData.coverage && toData.coverage) {
      const diff = (toData.coverage.current || 0) - (fromData.coverage.current || 0);
      const arrow = diff > 0 ? chalk.green(`▲ +${diff}%`) : diff < 0 ? chalk.red(`▼ ${diff}%`) : chalk.gray('━ 변화없음');
      console.log(`  커버리지  ${fromData.coverage.current}% → ${toData.coverage.current}%  ${arrow}`);
      console.log();
    }

    let hasChanges = false;
    allNames.forEach(name => {
      const before = fromSkills[name];
      const after = toSkills[name];
      if (!before) {
        console.log(chalk.green(`  + ${name}`) + chalk.gray(' (추가됨)'));
        hasChanges = true;
      } else if (!after) {
        console.log(chalk.red(`  - ${name}`) + chalk.gray(' (제거됨)'));
        hasChanges = true;
      } else if (before.status !== after.status || before.version !== after.version) {
        const statusChange = before.status !== after.status ? ` ${chalk.gray(before.status)} → ${chalk.cyan(after.status)}` : '';
        const verChange = before.version !== after.version ? ` ${chalk.gray(before.version)} → ${chalk.cyan(after.version)}` : '';
        console.log(chalk.blue(`  ~ ${name}`) + statusChange + verChange);
        hasChanges = true;
      }
    });

    if (!hasChanges) console.log(chalk.gray('  변화 없음'));
    console.log();
  });

export default harness;
