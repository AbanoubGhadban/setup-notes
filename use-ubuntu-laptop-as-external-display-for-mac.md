# Use Ubuntu Laptop as External Display for Mac (Sunshine + Moonlight)

This guide documents how to use an Ubuntu laptop as an **extended display** (not mirroring) for a Mac, with minimum latency.

## Solutions Tried

### UXPlay
- Attempted using UXPlay to stream via AirPlay.
- **Result:** Very high latency, not suitable for desktop use.

### Deskreen
- Attempted using Deskreen with WebRTC streaming.
- **Result:** Very high latency, not suitable for interactive work.

### USB-C Direct Connection
- Investigated connecting the two laptops directly via USB-C cable to use one as a display.
- **Result:** No proper way to do this. Laptop display ports are output-only and cannot accept video input over USB-C. A network-based solution is required.

### Sunshine + Moonlight (Chosen Solution)
- Game-streaming stack repurposed for desktop extension.
- Uses hardware-accelerated H.265 encoding (VideoToolbox on Mac) and hardware-accelerated decoding (VAAPI/NVDEC on Linux).
- **Result:** Low latency (~10-20ms on LAN), suitable for desktop productivity work.

## Network Connection

- **Ethernet cable** provides the best performance with the lowest latency.
- **Wi-Fi (5GHz)** also works and provides acceptable performance for general desktop use.
- Avoid 2.4GHz Wi-Fi as it adds significant latency and jitter.

## Setup Instructions

### Step 1: Install BetterDisplay on Mac (Virtual Display)

Most solutions require a virtual display on the Mac side — macOS needs to think it has an extra monitor.

```bash
brew install --cask betterdisplay
```

1. Launch BetterDisplay — it appears as a menu bar icon.
2. Click the icon > **Create New Virtual Screen...**
3. Choose a resolution matching your Ubuntu laptop's native resolution (e.g., 1920x1080).
4. Go to **System Settings > Displays > Arrange** and position the virtual display to the side of your main screen.

> **Note:** Virtual display creation is a BetterDisplay Pro feature (14-day free trial). An alternative is a ~$8 HDMI dummy plug.

### Step 2: Install Sunshine on Mac

```bash
brew tap LizardByte/homebrew
brew install sunshine
```

Alternative: Download the DMG from [GitHub Releases](https://github.com/LizardByte/Sunshine/releases) — pick the `arm64` build for Apple Silicon.

#### Grant macOS Permissions

Go to **System Settings > Privacy & Security > Screen & System Audio Recording** and enable the toggle for Sunshine.

Also grant **Accessibility** permission if prompted.

#### Start Sunshine

```bash
sunshine
```

Then open `https://localhost:47990` in your browser (accept the self-signed certificate warning) and create a username and password.

#### Configure Sunshine for Virtual Display

Check the Sunshine startup logs to find the display IDs:
```
Detected display: Built-in Retina Display (id: 1) connected: true
Detected display: Virtual 16:9 (id: 3) connected: true
```

Edit `~/.config/sunshine/sunshine.conf` to stream the virtual display and optimize quality:

```
output_name = 3
qp = 20
fec_percentage = 5
hevc_mode = 2
```

- `output_name` — ID of the virtual display (check logs for the correct number)
- `qp = 20` — lower quantization parameter for sharper text (default 28 is too low quality for desktop use)
- `fec_percentage = 5` — reduced error correction overhead for LAN (use 20 for Wi-Fi)
- `hevc_mode = 2` — force HEVC Main profile for better compression quality

Restart Sunshine after changing the config.

### Step 3: Install Moonlight on Ubuntu

**Flatpak (recommended):**
```bash
sudo apt install flatpak
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install flathub com.moonlight_stream.Moonlight
```

**Or PPA:**
```bash
sudo add-apt-repository ppa:moonlight-game-streaming/moonlight-stable
sudo apt update
sudo apt install moonlight-qt
```

#### Install Hardware Decoding Drivers

```bash
sudo apt install va-driver-all vdpau-driver-all

# For Intel GPUs (Broadwell+):
sudo apt install intel-media-va-driver-non-free

# Verify hardware decoding works:
vainfo
```

NVIDIA users: the proprietary driver includes NVDEC automatically.

### Step 4: Pair the Devices

1. Ensure both machines are on the same network.
2. Launch Moonlight on Ubuntu — your Mac should appear automatically.
3. Click the Mac host — Moonlight shows a 4-digit PIN.
4. On your Mac, go to `https://localhost:47990/pin` and enter the PIN.

### Step 5: Configure Moonlight for Desktop Use

In Moonlight settings:

| Setting | Recommended Value |
|---|---|
| Resolution | Match your Ubuntu laptop's native resolution |
| FPS | 60 |
| Video codec | HEVC (H.265) |
| Bitrate | 60-80 Mbps (1080p) or 100-150 Mbps (1440p) |
| V-Sync | Off |
| Window mode | Fullscreen |

Click **Desktop** to start streaming.

### Step 6: Verify Performance

While streaming, press **Ctrl+Alt+Shift+S** to show the performance overlay. Check:
- Network latency: should be <5ms on Ethernet
- Decode time: should be <5ms with hardware decoding
- Total latency: aim for <20ms

## Useful Keyboard Shortcuts (While Streaming)

| Shortcut | Action |
|---|---|
| Ctrl+Alt+Shift+Q | Quit streaming |
| Ctrl+Alt+Shift+Z | Toggle mouse/keyboard capture |
| Ctrl+Alt+Shift+X | Toggle fullscreen |
| Ctrl+Alt+Shift+S | Performance stats overlay |

## Problems Encountered and Solutions

### 1. Sunshine Failed to Start — "No screen capture permission"

**Error:**
```
Error: No screen capture permission!
Please activate it in 'System Preferences' -> 'Privacy' -> 'Screen Recording'
```

**Fix:** Enable Sunshine in **System Settings > Privacy & Security > Screen & System Audio Recording**.

### 2. Sunshine Failed to Start — "Address already in use"

**Error:**
```
Fatal: Couldn't bind RTSP server to port [48010], Address already in use
```

**Fix:** A previous Sunshine instance was still running. Kill it first:
```bash
kill $(pgrep sunshine)
```

### 3. Pairing Failed — "Check if the PIN is typed correctly"

**Error:** After entering the PIN from Moonlight into the Sunshine web UI, pairing fails.

**Cause:** Corrupted TLS certificates and state from the initial setup.

**Fix:** Delete Sunshine's credentials and state, then restart and re-pair from scratch:
```bash
rm -f ~/.config/sunshine/sunshine_state.json
rm -rf ~/.config/sunshine/credentials/
```
Then restart Sunshine, create new web UI credentials, and pair again.

### 4. Pairing Failed — Hostname Contains Hyphens

**Known bug:** If the Moonlight client's hostname contains hyphens (e.g., `my-laptop`), Sunshine silently fails during the pairing handshake.

**Fix:** Rename the Linux hostname to remove hyphens:
```bash
sudo hostnamectl set-hostname mylaptop
```

### 5. Streamed Screen Looks Pixelated

**Cause:** Default bitrate and quantization settings are optimized for gaming, not desktop text.

**Fix (Sunshine side):** Set `qp = 20` in `~/.config/sunshine/sunshine.conf` (default is 28).

**Fix (Moonlight side):** Increase bitrate to 60-80 Mbps for 1080p, use HEVC codec, and ensure the resolution matches your display's native resolution exactly.

## Known Limitations

- Sunshine on macOS is **experimental** — expect occasional quirks.
- BetterDisplay virtual display IDs may change on reboot, requiring you to update `output_name` in sunshine.conf.
- No gamepad support on macOS.
- macOS Sequoia may periodically re-prompt for Screen Recording permission.
- The `output_name` setting may be ignored on some macOS versions (known bug) — workaround is to set the virtual display as primary.
