# Opening VS Code on Your Mac from a Remote Linux Machine over SSH

Open any file or folder on a remote Linux host in your Mac's VS Code — with
full Remote-SSH support (LSP, extensions, integrated terminal on the remote) —
by typing `rcode <path>` in the SSH session.

---

## TL;DR

```bash
# On the remote Linux box, inside an SSH session from the Mac:
rcode ~/projects/myapp         # opens folder in Mac's VS Code via Remote-SSH
rcode ~/.bashrc                # opens a single file
rcode new-file.md              # works for files that don't exist yet
rcode path1 path2              # multiple paths
```

---

## How It Works

```
┌──────────────┐                         ┌──────────────────────┐
│ Mac          │ ─── ssh myubuntu ──────▶ │ Linux                │
│              │                         │                      │
│ sshd (:22)   │ ◀── reverse tunnel ──── │ localhost:52698      │
│              │                         │                      │
│ VS Code      │   code --remote ...     │ $ rcode ~/project    │
│ + Remote-SSH │ ◀── opens via ext ─────▶│   (VS Code Server)   │
└──────────────┘                         └──────────────────────┘
```

1. When you `ssh myubuntu` from the Mac, SSH also opens a **reverse port
   forward**: Linux's `localhost:52698` tunnels back to the Mac's SSH server
   on port 22. (Configured via `RemoteForward` in the Mac's `~/.ssh/config`.)
2. On Linux, `rcode <path>` uses that tunnel to SSH back into the Mac and run
   `code --remote ssh-remote+myubuntu <path>`.
3. The Mac's VS Code opens, connects to Linux via its own Remote-SSH extension,
   and serves the path — full LSP, extensions, terminal, Git, all running on
   Linux.

Linux never needs the Mac's IP, password, or anything about its network. All
traffic piggy-backs on the existing SSH connection.

---

## Why This Approach

| Approach | Opens folders with Remote-SSH? | Notes |
|---|---|---|
| **Reverse SSH tunnel + `rcode`** | **Yes** | One-time setup; full IDE experience |
| `rmate` / Remote VSCode extension | No — single files as ephemeral buffers | No LSP, no extensions, no terminal |
| VS Code `code tunnel` (Remote Tunnels) | Inverted direction; requires MS account | Heavier; designed for a different use case |
| X11-forwarded `code` on Linux | Technically yes, but terrible UX | Requires XQuartz; not Mac-native VS Code |
| `sshfs` mount + `code /mnt/...` | No remote LSP/extensions | Acceptable for quick file browsing only |

---

## Prerequisites

| Machine | What you need |
|---|---|
| **Mac** | VS Code + [Remote-SSH extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh), `code` CLI on PATH, SSH server enabled (Remote Login) |
| **Linux** | `rcode` script (shipped in this repo at `bin/rcode`), bash, `realpath` |

---

## Mac Setup

### 1. Install VS Code prerequisites

1. Open VS Code.
2. Install the **Remote - SSH** extension (`ms-vscode-remote.remote-ssh`)
   from the Extensions panel (`Cmd+Shift+X`).
3. Install the `code` CLI: open the Command Palette (`Cmd+Shift+P`) →
   **"Shell Command: Install 'code' command in PATH"**. Approve the admin
   prompt.

Verify:

```bash
code --version
# Should print a version number
```

### 2. Enable Remote Login (macOS SSH server)

1. **System Settings → General → Sharing → Remote Login** — toggle **on**.
2. Under "Allow access for," select your user or "All users."

This starts Apple's built-in `sshd` on port 22. Without it, the reverse
tunnel has nothing to connect to.

Verify from Linux (will prompt for Mac password this one time):

```bash
ssh <mac-user>@<mac-ip> 'hostname'
# Should print the Mac's hostname
```

### 3. Set up passwordless SSH from Linux to Mac

`rcode` runs SSH non-interactively through the reverse tunnel. Password
prompts would block silently, so key-based auth is required.

On Linux:

```bash
# Generate an ed25519 key if you don't have one
[ -f ~/.ssh/id_ed25519 ] || ssh-keygen -t ed25519 -C "linux-to-mac"

# Push the public key to the Mac (prompts for Mac password once)
ssh-copy-id <mac-user>@<mac-ip>
```

Verify (should succeed with **no password prompt**):

```bash
ssh <mac-user>@<mac-ip> 'hostname'
```

### 4. Configure `~/.ssh/config` on the Mac

Open (or create) `~/.ssh/config`:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
touch ~/.ssh/config && chmod 600 ~/.ssh/config
```

Add a Host entry for your Linux machine:

```ssh-config
Host myubuntu
  HostName 192.168.100.2
  User abanoub
  RemoteForward 52698 localhost:22
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

**What each line does:**

| Line | Meaning |
|---|---|
| `Host myubuntu` | Alias — `ssh myubuntu` uses this block. Must match `RCODE_SSH_HOST` on Linux and VS Code's Remote-SSH host list. |
| `HostName 192.168.100.2` | Actual address of the Linux box. Replace with your IP, Tailscale address, or DNS name. |
| `User abanoub` | Linux username. |
| `RemoteForward 52698 localhost:22` | On Linux, bind port 52698; tunnel it back to the Mac's sshd (port 22). This is the backchannel `rcode` uses. |
| `ServerAliveInterval 30` | Send a keepalive every 30 s to prevent idle disconnects. |
| `ServerAliveCountMax 3` | Tear down after 3 missed keepalives (~90 s of silence). |

**Optional hardening** — add after everything works:

```ssh-config
  ExitOnForwardFailure yes
```

Makes `ssh myubuntu` refuse to connect if port 52698 is already in use on
Linux. Without it, SSH silently proceeds with a broken tunnel.

Verify:

```bash
ssh myubuntu
# Should land in a Linux shell with no password prompt
```

### 5. Verify the reverse tunnel

From inside the SSH session on Linux:

```bash
# (a) Listener exists
ss -tln | grep 52698
# Expected: LISTEN ... 127.0.0.1:52698

# (b) Tunnel reaches the Mac's sshd
ssh -o BatchMode=yes -p 52698 <mac-user>@localhost 'hostname'
# Expected: prints the Mac's hostname, no password prompt
```

---

## Linux Setup

### 1. Install `rcode`

The script is at `bin/rcode` in this repo. Symlink it onto your `PATH`:

```bash
# Option A: user-local (no sudo)
ln -sf /path/to/setup-notes/bin/rcode ~/bin/rcode

# Option B: system-wide
sudo ln -sf /path/to/setup-notes/bin/rcode /usr/local/bin/rcode
```

Verify:

```bash
which rcode       # prints the symlink path
rcode             # prints usage
```

### 2. Set environment variables

Append to `~/.bashrc` (or `~/.zshrc` if using zsh):

```bash
# rcode: open remote paths in the SSH client's VS Code
export RCODE_MAC_USER=abanoub            # your macOS username
export RCODE_SSH_HOST=myubuntu           # must match `Host <name>` in Mac's ~/.ssh/config
# export RCODE_MAC_PORT=52698            # only override if you changed the port
```

Apply without restarting:

```bash
source ~/.bashrc
```

Verify:

```bash
echo "user=$RCODE_MAC_USER host=$RCODE_SSH_HOST port=${RCODE_MAC_PORT:-52698}"
# Should print: user=abanoub host=myubuntu port=52698
```

### 3. End-to-end test

From inside an SSH session opened from the Mac (`ssh myubuntu`):

```bash
rcode ~/
```

A VS Code window should appear on the Mac with the bottom-left indicator
showing **SSH: myubuntu** and the Explorer panel showing your Linux home
directory.

---

## Smart Wrapper: `vsopen`

This repo also ships `bin/vsopen`, a dispatcher that auto-detects whether
you're local or over SSH:

```bash
vsopen <path>
```

- **Local shell** → `code <path>`
- **SSH session** → `rcode <path>`

Detection uses `$SSH_CONNECTION`, which `sshd` sets in every SSH session
(including tunneled connections like Claude Code Desktop).

Install it the same way as `rcode`:

```bash
ln -sf /path/to/setup-notes/bin/vsopen ~/bin/vsopen
```

### Claude Code integration

This repo includes a `CLAUDE.md` that instructs Claude Code to use `vsopen`
when asked to open files or directories in VS Code. It works automatically
for anyone using Claude Code inside this repo.

To apply the same behavior globally (all projects), copy this block into
`~/.claude/CLAUDE.md`:

```
When asked to open a file or directory in VS Code, use `vsopen <path>`.
It auto-routes between `code` (local) and `rcode` (SSH, via Remote-SSH).
If `vsopen` is not installed, check `$SSH_CONNECTION` directly — if set,
use `rcode <path>`; otherwise use `code <path>`.
```

---

## Troubleshooting

### Port 52698 already in use on Linux

```bash
ss -tlnp | grep 52698
```

If another process or a previous SSH session holds the port, either kill it
or choose a different port in both the Mac's `RemoteForward` line and
`RCODE_MAC_PORT` on Linux.

Adding `ExitOnForwardFailure yes` to the Mac's SSH config makes this visible
at connect time instead of failing silently later.

### Mac is asleep

The Mac's sshd stops answering when asleep. Options:

- **Per-session:** run `caffeinate -di` in a Mac terminal while working
  remotely.
- **Persistent:** System Settings → Battery → Options → "Prevent automatic
  sleeping on power adapter."

### `code: command not found` on the Mac

Non-interactive SSH on macOS doesn't always load `/usr/local/bin` into PATH.
The `rcode` script wraps the remote command in `bash -lc` to source the
Mac's login profile, which normally includes `/usr/local/bin`. If it still
fails, verify that `code` exists:

```bash
ssh -p 52698 <mac-user>@localhost 'bash -lc "which code"'
# Should print: /usr/local/bin/code
```

If not, re-run "Shell Command: Install 'code' command in PATH" inside VS Code
on the Mac.

### SSH alias mismatch

`RCODE_SSH_HOST` on Linux **must** match the `Host` alias in the Mac's
`~/.ssh/config`. If they differ, VS Code will try to resolve the alias as a
DNS hostname and fail with "could not resolve hostname."

### `ControlMaster auto` interaction

If you use SSH multiplexing on the Mac, only the **master** session owns the
`RemoteForward` listener. If the master dies, child sessions lose the tunnel
even though they're still connected. Not usually a problem — just be aware
that `rcode` depends on the tunnel-bearing session staying alive.

### Other SSH sessions can use the tunnel

The reverse-forwarded port is a regular TCP listener on `localhost:52698`.
**Any** process on the Linux box can connect to it — not just the SSH session
that created it. So if you have `ssh myubuntu` open in one terminal and
Claude Code Desktop in another, both shells can use `rcode`.

The listener is bound to `127.0.0.1` by default, so only local processes can
reach it — not machines on the LAN.

---

## Sources

- [VS Code — Remote Development using SSH](https://code.visualstudio.com/docs/remote/ssh)
- [VS Code — Remote Development Tips and Tricks](https://code.visualstudio.com/docs/remote/troubleshooting)
- [VS Code — Developing with Remote Tunnels](https://code.visualstudio.com/docs/remote/tunnels)
- [microsoft/vscode#100222 — Support reverse tunnel](https://github.com/microsoft/vscode/issues/100222)
- [OpenSSH `ssh_config` manual — RemoteForward](https://man.openbsd.org/ssh_config#RemoteForward)
