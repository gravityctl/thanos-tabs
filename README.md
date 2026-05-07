# thanos-tabs

A Chrome extension that snaps half of your tabs away at a configurable interval.

## Features

- Automatically closes half of your open tabs at a set interval (default: 5 minutes)
- Ignores pinned tabs
- Configurable interval via popup UI
- Badge indicator shows when next snap is scheduled
- Works in the background via Chrome's alarm API

## Setup

1. Clone the repo
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `thanos-tabs` folder
5. Click the extension icon to configure the interval

## Permissions

- `tabs` — to query and close tabs
- `alarms` — to schedule the periodic snap
- `storage` — to persist user settings
