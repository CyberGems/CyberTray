# Privacy — CyberTray

CyberTray runs on your PC and keeps your data on your PC. It has **no account, no telemetry, no analytics SDK and no ads**. It never sends your shortcuts, notifications or vault files to its author or to anyone else.

Everything it knows (shortcuts, notifications or vault files) stays in `%APPDATA%\CyberTray\` (configuration, backups, cached icons, notifications and `CyberTray_files\`). Portable builds use a `data` folder next to the executable. The installer does not remove app data; the data folder is kept.

## When CyberTray goes online

These are all the connections CyberTray makes by itself. None of them sends your shortcuts, notifications or vault files. Like any request on the internet, the server sees your IP address.

| When | Where | What for | How to turn it off |
|---|---|---|---|
| 8 seconds after launch | GitHub Releases, with release notes from `api.github.com` | Check for a newer version | `autoUpdate`; portable builds disable the updater |

A link you click inside the app, or a web page you open in your browser, is your own action and is not a connection the app makes by itself.

## What CyberTray reads on your PC

CyberTray reads Desktop and Start Menu shortcuts, your Steam library, GPU memory and disk information. That information stays on your screen. Anything that changes the system asks for confirmation first and, where possible, is backed up so it can be undone.

## Questions

Open an issue: https://github.com/CyberGems/CyberTray/issues

For a privacy-specific question, use the [contact page](https://cybergems.org/contact). The suite-wide statement is at [cybergems.org/privacy](https://cybergems.org/privacy).
