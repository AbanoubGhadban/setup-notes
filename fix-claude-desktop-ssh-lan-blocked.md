# Fix: Claude Code Desktop App SSH to LAN Hosts Fails (Send Button Disabled)

## Problem

The Claude Code desktop app (Electron) cannot SSH to hosts on the local network (e.g. `192.168.x.x`). The SSH connection appears to succeed (you can browse folders), but the **send button stays permanently disabled** and no messages can be sent.

System `ssh` and `ping` to the same host work fine.

## Root Cause

The Claude Code Electron app sets an internal environment variable `OPERON_SANDBOXED_NETWORK=1` that blocks LAN/local network access. The built-in Node.js `ssh2` library inherits this sandbox, so connections to local IPs (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) are rejected at the app level before they reach the OS network stack.

This means:
- The request never reaches macOS networking, so the Local Network permission prompt is never triggered
- Claude does not appear in System Settings > Privacy & Security > Local Network
- Granting permissions at the OS level would not help anyway since the block is internal

## How to Diagnose

Check the SSH log on macOS:

```bash
tail -50 ~/Library/Logs/Claude/ssh.log
```

You will see something like:

```
[error] [SSH2Connection] Connection error: connect EHOSTUNREACH 192.168.x.x:22 - Local (192.168.x.x:xxxxx)
[error] [RemoteServerController] Connection failed (12ms, trigger: send_message): connect EHOSTUNREACH 192.168.x.x:22
```

The 12ms failure time confirms it is an instant block, not a network timeout.

## Fixes

### Fix 1: SSH Tunnel via localhost (No Extra Tools)

Create an SSH tunnel that forwards a local port to the remote host, making the connection appear as `localhost` which bypasses the LAN sandbox.

**Step 1:** Open a terminal and start the tunnel (keep it running):

```bash
ssh -N -L 2222:localhost:22 youruser@your-lan-host
```

**Step 2:** Update `~/.ssh/config` so Claude Code uses the tunnel:

```
Host your-lan-host
  HostName 127.0.0.1
  Port 2222
  User youruser
```

**Step 3:** In Claude Code desktop app, connect to `your-lan-host` as usual. It will now route through `127.0.0.1:2222` which is not blocked.

### Fix 2: Tailscale (Best — Persistent and Zero Config)

Tailscale creates a WireGuard VPN mesh that assigns each device a `100.x.x.x` Tailscale IP. Connections through Tailscale IPs bypass the LAN sandbox because they go through the `utun` Tailscale interface, not the local network interface.

**Step 1:** Install Tailscale on both your Mac and the remote machine:

- Mac: https://tailscale.com/download/mac
- Linux: `curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up`

**Step 2:** Get the Tailscale IP of the remote machine:

```bash
tailscale ip -4    # run on the remote machine
```

**Step 3:** Update `~/.ssh/config` to use the Tailscale IP:

```
Host your-lan-host
  HostName 100.x.x.x    # Tailscale IP
  User youruser
```

**Step 4:** Connect in Claude Code desktop app as usual. No tunnel needed, works persistently.

### Fix 3: Use Claude Code CLI Instead of Desktop App

The CLI does not have the Electron sandbox:

```bash
claude ssh your-lan-host
```

This connects directly without any LAN restrictions.

## Upstream Issue

This is tracked at [anthropics/claude-code#37994](https://github.com/anthropics/claude-code/issues/37994).
