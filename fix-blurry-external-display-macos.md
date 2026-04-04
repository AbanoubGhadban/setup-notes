# Fix Blurry/Pixelated External Display on macOS

When connecting a Mac to a 1080p external monitor, text and UI often appear blurry or pixelated. This happens because macOS is optimized for Retina (HiDPI) displays and doesn't enable HiDPI rendering for standard monitors.

## Solution 1: BetterDisplay (Recommended)

BetterDisplay creates a virtual Retina display that mirrors to your external monitor, forcing macOS to render at 2x and downscale — giving you sharp, Retina-quality text.

### Install

```bash
brew install --cask betterdisplay
```

### Setup

1. Open BetterDisplay from the menu bar
2. Click on your external display (e.g., "Generic Display")
3. Create a **Dummy Display** at 3840x2160 (2x of 1080p)
4. Set it to mirror your external display
5. Select the **1920x1080 (HiDPI)** resolution option

## Solution 2: Enable Font Smoothing

macOS disables font smoothing for non-Retina displays by default. Re-enabling it can improve text clarity.

```bash
defaults write -g CGFontRenderingFontSmoothingDisabled -bool NO
```

Log out and back in for the change to take effect.

To revert:

```bash
defaults write -g CGFontRenderingFontSmoothingDisabled -bool YES
```

## Solution 3: Use DisplayPort Instead of HDMI

When connected via HDMI, macOS may detect the monitor as a TV and use YCbCr color encoding instead of RGB. This degrades text rendering.

- Use **USB-C to DisplayPort** or **Thunderbolt to DisplayPort** cable instead
- If HDMI is the only option, BetterDisplay can override the TV detection in its display settings

## Solution 4: Adjust Display Resolution in System Settings

Sometimes selecting a different scaled resolution can help:

1. Go to **System Settings → Displays**
2. Select your external display
3. Try different resolution options — look for ones that better match your monitor's native resolution
4. Avoid non-native resolutions as they can cause additional blurriness
