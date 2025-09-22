# ccusage-heat30

A Node.js CLI tool built on top of [`ccusage`](https://www.npmjs.com/package/ccusage) with optional [`@ccusage/codex`](https://www.npmjs.com/package/@ccusage/codex) integration that generates GitHub-style heatmaps displaying the last 30 days of Claude Code token usage with extended visualization features and comprehensive analytics.

## 🚀 What's New in v0.5.0

#### 🆕 New Features
- **Desktop-ready SVG exports**: `--svg` now defaults to your Desktop with a polished dashboard layout, interactive cell tooltips, and a dedicated billing summary banner.
- **Adaptive color output**: Detects 24-bit, 256-color, and monochrome terminals automatically, falling back to readable ASCII glyphs when colors are unavailable or `--no-color` is set.
- **Top-five leaderboards**: Cost tables now focus on the five spendiest days, always including today when usage exists, with model-level context and token breakdowns.
- **Unified Claude + Codex heatmap**: Codex usage is merged into the main grid, accompanied by matching Codex leaderboards and billing totals.

#### 🔧 Improvements
- Month labels stay aligned with the heatmap grid even on narrow terminals.
- Numeric columns in tables get wider padding so large token counts remain legible.
- Billing summary box centers inside the outer frame and reflects the cumulative Claude Code spend for the current billing cycle.

---

## Features

- 📊 **GitHub-style heatmap** – Shows combined Claude + Codex activity over the last 30 days, powered by `ccusage` and enhanced with `@ccusage/codex` when present.
- 💰 **Multiple metrics** – Track tokens, cost, input tokens, or output tokens.
- 🎨 **Terminal display** – Beautiful colored output with ANSI colors and a centered billing summary.
- 📁 **Professional SVG export** – Dashboard-style layout combining heatmap, statistics table, and billing summary.
- 📈 **Top-five usage tables** – Highlights the five costliest days for Claude (always) and Codex (when data exists), with per-model stats and today-aware inclusion.
- 🤖 **Codex usage mirror** – Adds a Codex top-five table (via `@ccusage/codex`) beneath the Claude leaderboard whenever Codex logs are detected.
- 💵 **Billing summary** – Prominently shows cumulative usage costs for the billing cycle.
- 🎯 **Centered layout** – Both terminal and SVG outputs feature properly centered content for professional presentation.
- ⚙️ **Customizable** – Configure week start day, timezone, and output options.

## Prerequisites

- Node.js version 20.19.4 or higher is required.
- The `ccusage` CLI (and optional `@ccusage/codex` companion) install automatically when using `npx`. Ensure both are accessible for dual Claude/Codex reporting.
- Permission to run CLI tools on your system.

## Installation

### Using npx (Recommended)

```bash
npx ccusage-heat30
```

### Global Installation

```bash
npm install -g ccusage-heat30
ccusage-heat30
```

### Local Development

```bash
git clone <repository-url>
cd ccusage-heat30
npm install
node bin/cli.mjs
```

## Usage

### Basic Usage

```bash
# Display combined Claude + Codex heatmap
ccusage-heat30

# Only Claude usage
ccusage-heat30 --source claude

# Only Codex usage
ccusage-heat30 --source codex

# Display cost usage heatmap  
ccusage-heat30 --metric cost

# Display input tokens only
ccusage-heat30 --metric input

# Display output tokens only
ccusage-heat30 --metric output
```

### Export Options

```bash
# Save as SVG file
ccusage-heat30 --svg heatmap.svg

# Save to specific directory
ccusage-heat30 --svg ./assets/usage-heatmap.svg

# Combine with different metrics
ccusage-heat30 --metric cost --svg cost-analysis.svg
```

When using the `--svg` option without specifying a file path, the SVG file is saved to your Desktop with the filename pattern `cc-heatmap-YYYYMMDD.svg`, where `YYYYMMDD` is the current date. The exported SVG includes interactive tooltips that display the date and corresponding usage value when hovering over heatmap cells in most SVG viewers.

### Advanced Options

```bash
# Start week on Sunday (default: Monday)
ccusage-heat30 --week-start sun

# Disable colors (for terminal compatibility)
ccusage-heat30 --no-color

# Specify timezone (defaults to your system zone, passed through to the ccusage/@ccusage tools)
ccusage-heat30 --timezone "America/New_York"

# Claude-only (hide Codex)
ccusage-heat30 --source claude

# Codex-only (hide Claude)
ccusage-heat30 --source codex

# Combine multiple options
ccusage-heat30 --metric cost --source claude --svg output.svg --week-start sun
```

### Codex Companion

When `@ccusage/codex` is available (either locally installed or resolved via `npx`), the CLI automatically mirrors the Claude leaderboard with a Codex top-5 table using the same styling. It also stacks Codex metrics into the main heatmap so the cells reflect total cross-platform activity. The CLI now defaults to your system timezone when calling both analyzers, so same-day usage appears under the expected local date. Use `npx @ccusage/codex@latest daily --json --by-model` to verify Codex data collection and ensure your Codex logs live under `~/.codex/`. You can toggle sources via `--source`, e.g. `--source codex` for Codex-only reports or `--source claude` to hide Codex rows while keeping combined heatmap available when set back to `both`.

#### Tips for Codex reporting

- `@ccusage/codex` reads session JSONL files from `~/.codex/projects/**/sessions/`. Set `CODEX_HOME` if your logs live elsewhere.
- Codex CLI keeps appending to the session file that was opened first (Pacific Time). End or rotate sessions if you want a fresh date in your local timezone.
- Re-run `npx @ccusage/codex@latest daily --timezone <Your/Zone>` to see where the latest spend landed. Once Codex emits a new daily file, the combined heatmap and Codex top-five table update automatically.
- `ccusage-heat30` auto-detects your system timezone; supply `--timezone` to override for both analyzers.

#### Quick check for Codex data

1. `npx @ccusage/codex@latest daily --json --by-model --since $(date +%Y%m%d) --until $(date +%Y%m%d)` to confirm today's records.
2. If the entry still shows yesterday, finish the active Codex session (or wait for Codex CLI to rotate the session file).
3. Run `ccusage-heat30 --metric cost --source codex` (append `--timezone` if you need to override the auto-detected zone).


## Command Line Options

| Option         | Description                    | Values                      | Default  |
|----------------|-------------------------------|-----------------------------|----------|
| `--metric`     | Choose what metric to visualize | `tokens`, `cost`, `input`, `output` | `tokens` |
| `--week-start` | Set the first day of the week  | `sun`, `mon`                | `mon`    |
| `--svg <path>` | Export heatmap as SVG file     | File path                   | -        |
| `--no-color`   | Disable terminal colors        | -                           | -        |
| `--timezone <tz>` | Timezone for usage data      | Timezone string             | System default |
| `--source <mode>` | Select data source             | `both`, `claude`, `codex`     | `both`         |

## Sample Output

### Terminal Display

```text
╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║ Claude + Codex usage                                                                             ║
║                                                                                                  ║
║     Aug   Sep                                                                                    ║
║ ██████╗  ██████╗ ██╗   ██╗  ██████╗    █████╗    ██████╗  ███████╗                               ║
║██╔═══██╗ ██╔═══██╗ ██║   ██║ ██╔════╝   ██╔══██╗  ██╔════╝  ██╔════╝                            ║
║██║   ██║ ██║   ██║ ██║   ██║ ██║  ███╗  ███████║  ██║  ███╗ █████╗                               ║
║██║   ██║ ██║   ██║ ██║   ██║ ██║   ██║  ██╔══██║  ██║   ██║ ██╔══╝                               ║
║╚██████╔╝ ╚██████╔╝ ╚██████╔╝ ╚██████╔╝  ██║  ██║  ╚██████║  ███████╗                             ║
║ ╚═════╝  ╚═════╝  ╚═════╝  ╚═════╝  ╚═╝  ╚═╝   ╚═════╝  ╚══════╝                               ║
║                                                                                                  ║
║ Top 5 Claude Code Days by cost:                                                                  ║
║ ┌────────────┬──────────────────────────┬────────┬─────────┬────────────┬────────────┐           ║
║ │ Date       │ Models                   │  Input │  Output │      Total │ Cost (USD) │           ║
║ ├────────────┼──────────────────────────┼────────┼─────────┼────────────┼────────────┤           ║
║ │ 2025-09-17 │ claude-sonnet-4-20250514 │  6,674 │  56,496 │ 35,186,889 │   $16.6065 │           ║
║ │ 2025-09-16 │ claude-sonnet-4-20250514 │  7,815 │  54,873 │ 25,298,427 │   $14.3129 │           ║
║ │ 2025-09-18 │ claude-sonnet-4-20250514 │ 30,766 │  35,870 │ 26,803,313 │   $14.6155 │           ║
║ │ 2025-09-11 │ claude-sonnet-4-20250514 │ 15,930 │ 105,669 │ 19,455,740 │   $13.5066 │           ║
║ │ 2025-09-15 │ claude-sonnet-4-20250514 │ 17,568 │  12,420 │  8,060,668 │    $5.0742 │           ║
║ └────────────┴──────────────────────────┴────────┴─────────┴────────────┴────────────┘           ║
║                                                                                                  ║
║ Top 5 Codex Days by cost:                                                                        ║
║ ┌──────────────┬────────────────────┬─────────────┬─────────┬────────────┬────────────┐          ║
║ │ Date         │ Models             │       Input │  Output │      Total │ Cost (USD) │          ║
║ ├──────────────┼────────────────────┼─────────────┼─────────┼────────────┼────────────┤          ║
║ │ Sep 14, 2025 │ gpt-5-codex, gpt-5 │ 111,098,122 │ 228,068 │ 56,558,190 │   $10.6148 │          ║
║ │ Sep 15, 2025 │ gpt-5-codex, gpt-5 │  41,326,259 │ 238,451 │ 21,720,550 │    $6.3410 │          ║
║ │ Sep 21, 2025 │ gpt-5-codex        │  16,867,099 │ 115,362 │  8,835,581 │    $2.5427 │          ║
║ │ Sep 18, 2025 │ gpt-5              │   9,081,428 │  41,812 │  4,663,912 │    $1.0790 │          ║
║ │ Sep 19, 2025 │ gpt-5              │   1,091,427 │   8,784 │    584,563 │    $0.2055 │          ║
║ └──────────────┴────────────────────┴─────────────┴─────────┴────────────┴────────────┘          ║
║                                                                                                  ║
║ Legend:                                                                                          ║
║         Less - 2,901,706 - 8,399,564 - 13,441,088 - 25,298,427 - More                          ║
║                                                                                                  ║
║ ┌────────────────────────────────────────────────────────────────────────────────────┐          ║
║ │    You have cumulatively used $97.0136 USD of Claude Code in this billing cycle.    │          ║
║ │      You have cumulatively used $21.9594 USD of Codex in this billing cycle.        │          ║
║ └────────────────────────────────────────────────────────────────────────────────────┘          ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
```

### SVG Export Features

When exporting with `--svg`, you receive a comprehensive dashboard with the following characteristics:

- Default save location is the Desktop with filename `cc-heatmap-YYYYMMDD.svg` if no path is specified.
- Supports custom output paths to save SVG files in any directory.
- Left side features a GitHub-style heatmap with month/day labels and a color legend.
- Right side contains a professional table showing the top 5 usage days with detailed model information, sorted by cost.
- Bottom section highlights the billing summary with total cost.
- All elements are properly aligned and centered for a clean, professional look.
- Interactive tooltips appear when hovering over heatmap cells in most SVG viewers, showing the date and usage value.
- The SVG output is responsive and displays correctly across various viewers.

## Requirements

- Node.js 20.19.4 or higher
- [ccusage](https://github.com/ryoppippi/ccusage) (Claude) / [`@ccusage/codex`](https://www.npmjs.com/package/@ccusage/codex) (Codex optional) - Available as npm dependencies or via npx

## How It Works

1. **Data Collection**: Fetches usage data using the `ccusage` CLI (and `@ccusage/codex` when available) for the last 30 days.
2. **Grid Generation**: Creates a GitHub-style 7×N grid representing days of the week.
3. **Color Mapping**: Applies color intensity based on usage quantiles.
4. **Analytics Processing**: Calculates top usage days and billing totals.
5. **Terminal Rendering**: Displays heatmap with ANSI colors and centered billing summary.
6. **SVG Export**: Generates a comprehensive dashboard with heatmap, table, and billing info.
7. **Layout Optimization**: Centers all content for professional presentation.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

This project is built upon and extends the [ccusage](https://github.com/ryoppippi/ccusage) project and consumes its scoped npm release [`@ccusage/codex`](https://www.npmjs.com/package/@ccusage/codex) for Codex metrics, all licensed under the MIT License. Modifications and enhancements in this tool are also provided under the MIT License.

Special thanks to these amazing open source projects that made this tool possible:

- **[ccusage](https://github.com/ryoppippi/ccusage)** by [@ryoppippi](https://github.com/ryoppippi) – The core project powering the [`@ccusage/codex`](https://www.npmjs.com/package/@ccusage/codex) CLI used for Claude Code usage data collection and analysis (MIT License).
- **[ccstat](https://github.com/ktny/ccstat)** by [@ktny](https://github.com/ktny) – Inspiration and reference for Claude Code usage visualization.

## License

MIT License – see [LICENSE](LICENSE) file for details.

---

*Built for the Claude Code community* 🤖✨

Made by Nitro with ❤️ in Edmonton.
