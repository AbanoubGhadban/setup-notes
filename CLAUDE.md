# Claude Code instructions for this repo

This file is read automatically by [Claude Code](https://www.anthropic.com/claude-code)
when a session is started inside this repo and shapes how Claude behaves here.

## Opening files or directories in VS Code

When asked to open a file or directory in VS Code, use the `vsopen` wrapper
(source: `bin/vsopen`).

```bash
vsopen <path>
```

`vsopen` auto-detects whether the current shell is local or inside an SSH
session (via `$SSH_CONNECTION`, which `sshd` sets automatically) and routes
the open to:

- `code <path>` — when running on the machine where VS Code is installed
- `rcode <path>` — when inside an SSH session; opens the path on the SSH
  client's VS Code via Remote-SSH, through the reverse tunnel described in
  `rcode-over-ssh.md`

Prefer `vsopen` over calling `code` or `rcode` directly — the same instruction
then works whether the shell is local or over SSH.

## Adopting these rules in your own Claude config

The rule above only applies inside this repo. To get the same behavior in all
your projects, copy this block into your personal Claude config at
`~/.claude/CLAUDE.md`:

```md
When asked to open a file or directory in VS Code, use `vsopen <path>`.
It auto-routes between `code` (local) and `rcode` (SSH, via Remote-SSH).
If `vsopen` is not installed, check `$SSH_CONNECTION` directly — if set,
use `rcode <path>`; otherwise use `code <path>`.
```

`~/.claude/CLAUDE.md` is read on every Claude Code session regardless of the
working directory, so the rule becomes global.

### Prerequisites

- `rcode` installed and configured (see `rcode-over-ssh.md` in this repo).
- `vsopen` on `PATH`. The repo ships it in `bin/vsopen`; symlink it into
  `~/bin` or `/usr/local/bin`:

  ```bash
  ln -sf "$PWD/bin/vsopen" ~/bin/vsopen      # or /usr/local/bin/vsopen via sudo
  ```
