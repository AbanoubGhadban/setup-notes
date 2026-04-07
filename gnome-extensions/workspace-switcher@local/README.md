# Workspace Switcher (D-Bus) — GNOME Shell Extension

Switch workspaces from the command line over SSH on GNOME/Wayland.

## Why

On Wayland, external tools (`xdotool`, `wmctrl`) can't control the compositor, and `org.gnome.Shell.Eval` is locked down on Ubuntu 22.04. This extension exposes D-Bus methods that work from any terminal, including SSH sessions.

## Install

```bash
# Symlink into GNOME's extensions directory
mkdir -p ~/.local/share/gnome-shell/extensions
ln -s /path/to/workspace-switcher@local \
  ~/.local/share/gnome-shell/extensions/workspace-switcher@local

# Enable the extension
gnome-extensions enable workspace-switcher@local
```

If the state stays `INITIALIZED` after enabling, log out and log back in, then enable again.

## Usage

Over SSH, you need to set the D-Bus session address first:

```bash
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
```

Then:

```bash
# Switch to workspace (0-based index)
gdbus call --session --dest com.workspace.Switcher \
  --object-path /com/workspace/Switcher \
  --method com.workspace.Switcher.SwitchToWorkspace 1

# Get current workspace index
gdbus call --session --dest com.workspace.Switcher \
  --object-path /com/workspace/Switcher \
  --method com.workspace.Switcher.GetActiveWorkspace

# Get total workspace count
gdbus call --session --dest com.workspace.Switcher \
  --object-path /com/workspace/Switcher \
  --method com.workspace.Switcher.GetWorkspaceCount
```

### Shell alias

Add to `~/.bashrc` for convenience:

```bash
ws() {
  DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus \
  gdbus call --session --dest com.workspace.Switcher \
    --object-path /com/workspace/Switcher \
    --method com.workspace.Switcher.SwitchToWorkspace "$1"
}
```

Then just: `ws 0`, `ws 1`, `ws 2`, etc.

## Troubleshooting

### Extension stays in INITIALIZED state and never loads

Check if user extensions are globally disabled:

```bash
gsettings get org.gnome.shell disable-user-extensions
```

If it returns `true`, enable them:

```bash
gsettings set org.gnome.shell disable-user-extensions false
```

This takes effect immediately — no restart needed.

### D-Bus error: "The name com.workspace.Switcher was not provided by any .service files"

The extension isn't running. Check its state:

```bash
gnome-extensions info workspace-switcher@local
```

If it shows `INITIALIZED`, see the fix above. If it doesn't show up at all, verify the symlink:

```bash
ls -la ~/.local/share/gnome-shell/extensions/workspace-switcher@local
```

## Environment

- Works on both **Wayland and X11** GNOME sessions
- On X11 you could also use `wmctrl -s N` or `xdotool set_desktop N`, but this extension works there too
- Uses the legacy `imports` system (not ESM), compatible with GNOME 42-44
- Tested on Ubuntu 22.04, GNOME 42.9
