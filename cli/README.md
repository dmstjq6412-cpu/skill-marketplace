# skill-marketplace CLI

Claude Code Skill Marketplace CLI

## Install

```bash
cd cli
npm install
npm link
```

## Commands

### List skills
```bash
skill-marketplace list
skill-marketplace list --search deploy
skill-marketplace list --page 2
```

### View skill detail
```bash
skill-marketplace detail <id>
```

### Install a skill
```bash
skill-marketplace install <id>
# Installs to ~/.claude/skills/<name>/SKILL.md

skill-marketplace install <id> --dir /custom/path
```

## Configuration

Set `SKILL_MARKETPLACE_API` to point to a remote server:
```bash
export SKILL_MARKETPLACE_API=https://your-server.com/api
```

Default: `http://localhost:3001/api`
