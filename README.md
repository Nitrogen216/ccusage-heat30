# ccusage-heat30

A Node.js CLI tool built on top of [ccusage](https://github.com/ryoppippi/ccusage) that generates GitHub-style heatmaps displaying the last 30 days of Claude Code token usage with extended visualization features and comprehensive analytics.

## 🚀 What's New in v0.1.0

#### 🆕 New Features
- **Enhanced Analytics**: Expanded usage statistics table to show top 10 days (increased from 5)
- **Cost-First Sorting**: Changed sorting criteria from tokens to cost for better financial insights
- **Improved Cost Visibility**: All tables and analytics now prioritize cost metrics for better budget tracking

#### 🔧 Improvements
- Better cost analysis workflow for users tracking Claude Code expenses
- More comprehensive historical data display in both terminal and SVG outputs
- Enhanced billing cycle awareness with cost-focused排序

---

## Features

- 📊 **GitHub-style heatmap** – Visual representation of your Claude Code usage over the last 30 days, leveraging the `ccusage` library.
- 💰 **Multiple metrics** – Track tokens, cost, input tokens, or output tokens.
- 🎨 **Terminal display** – Beautiful colored output with ANSI colors and a centered billing summary.
- 📁 **Professional SVG export** – Dashboard-style layout combining heatmap, statistics table, and billing summary.
- 📈 **Top usage days** – Displays your top 10 usage days with detailed statistics including models used, sorted by cost.
- 💵 **Billing summary** – Prominently shows cumulative usage costs for the billing cycle.
- 🎯 **Centered layout** – Both terminal and SVG outputs feature properly centered content for professional presentation.
- ⚙️ **Customizable** – Configure week start day, timezone, and output options.

## Prerequisites

- Node.js version 18 or higher is required.
- The `ccusage` tool is installed automatically when using `npx`. For global or local installations, ensure `ccusage` is accessible.
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
# Display token usage heatmap
ccusage-heat30

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

# Specify timezone (passed to ccusage)
ccusage-heat30 --timezone "America/New_York"

# Combine multiple options
ccusage-heat30 --metric cost --svg output.svg --week-start sun
```

## Command Line Options

| Option         | Description                    | Values                      | Default  |
|----------------|-------------------------------|-----------------------------|----------|
| `--metric`     | Choose what metric to visualize | `tokens`, `cost`, `input`, `output` | `tokens` |
| `--week-start` | Set the first day of the week  | `sun`, `mon`                | `mon`    |
| `--svg <path>` | Export heatmap as SVG file     | File path                   | -        |
| `--no-color`   | Disable terminal colors        | -                           | -        |
| `--timezone <tz>` | Timezone for usage data      | Timezone string             | System default |

## Sample Output

### Terminal Display

```text
╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║ Claude Code usage                                                                                ║
║                                                                                                  ║
║     Aug   Sep                                                                                    ║
║ Mon :  .  .  +  -        ██████╗ ██████╗██╗   ██╗███████╗ █████╗  ██████╗ ███████╗               ║
║ Tue -  :  .  .  #       ██╔════╝██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝ ██╔════╝               ║
║ Wed +  .  .  +  .       ██║     ██║     ██║   ██║███████╗███████║██║  ███╗█████╗                 ║
║ Thu -  :  +  #  .       ╚██████╗╚██████╗╚██████╔╝███████║██║  ██║╚██████╔╝███████╗               ║
║ Fri .  #  :  #  .        ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝               ║
║ Sat .  :  .  #  .        ██╗  ██╗███████╗ █████╗ ████████╗██████╗  ██████╗                       ║
║ Sun .  .  .  -  .        ██║  ██║██╔════╝██╔══██╗╚══██╔══╝╚════██╗██╔═████╗                      ║
║                          ███████║█████╗  ███████║   ██║    █████╔╝██║██╔██║                      ║
║                          ██╔══██║██╔══╝  ██╔══██║   ██║    ╚═══██╗████╔╝██║                      ║
║                          ██║  ██║███████╗██║  ██║   ██║   ██████╔╝╚██████╔╝                      ║
║                          ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═════╝  ╚═════╝                       ║
║                                                                                                  ║
║ Top 10 Days by cost:                                                                             ║
║ ┌────────────┬──────────────────────────┬────────┬─────────┬────────────┬────────────┐           ║
║ │ Date       │ Models                   │  Input │  Output │      Total │ Cost (USD) │           ║
║ ├────────────┼──────────────────────────┼────────┼─────────┼────────────┼────────────┤           ║
║ │ 2025-09-16 │ claude-sonnet-4-20250514 │  7,815 │  54,873 │ 25,298,427 │   $14.3129 │           ║
║ │ 2025-09-11 │ claude-sonnet-4-20250514 │ 15,930 │ 105,669 │ 19,455,740 │   $13.5066 │           ║
║ │ 2025-09-12 │ claude-sonnet-4-20250514 │    804 │  29,589 │ 24,747,006 │   $11.6230 │           ║
║ │ 2025-09-13 │ claude-sonnet-4-20250514 │ 11,181 │  32,785 │ 15,835,853 │    $8.3557 │           ║
║ │ 2025-08-29 │ claude-sonnet-4-20250514 │  3,187 │  16,382 │ 13,560,232 │    $7.6612 │           ║
║ │ 2025-09-04 │ claude-sonnet-4-20250514 │ 36,943 │  12,923 │ 10,098,638 │    $7.0381 │           ║
║ │ 2025-09-10 │ claude-sonnet-4-20250514 │  1,691 │  23,729 │ 13,083,653 │    $6.7004 │           ║
║ │ 2025-09-15 │ claude-sonnet-4-20250514 │ 17,568 │  12,420 │  8,060,668 │    $5.0742 │           ║
║ │ 2025-08-20 │ claude-sonnet-4-20250514 │    400 │   7,477 │  8,738,460 │    $4.7622 │           ║
║ │ 2025-09-14 │ claude-sonnet-4-20250514 │  2,536 │  18,157 │  7,192,406 │    $4.6024 │           ║
║ └────────────┴──────────────────────────┴────────┴─────────┴────────────┴────────────┘           ║
║                                                                                                  ║
║ Legend:                                                                                          ║
║         Less - 2,901,706 - 8,399,564 - 13,441,088 - 25,298,427 - More                          ║
║                                                                                                  ║
║ ┌────────────────────────────────────────────────────────────────────────────────────┐           ║
║ │   You have cumulatively used $97.0136 USD of Claude Code in this billing cycle.    │           ║
║ └────────────────────────────────────────────────────────────────────────────────────┘           ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
```

### SVG Export Features

When exporting with `--svg`, you receive a comprehensive dashboard with the following characteristics:

- Default save location is the Desktop with filename `cc-heatmap-YYYYMMDD.svg` if no path is specified.
- Supports custom output paths to save SVG files in any directory.
- Left side features a GitHub-style heatmap with month/day labels and a color legend.
- Right side contains a professional table showing the top 10 usage days with detailed model information, sorted by cost.
- Bottom section highlights the billing summary with total cost.
- All elements are properly aligned and centered for a clean, professional look.
- Interactive tooltips appear when hovering over heatmap cells in most SVG viewers, showing the date and usage value.
- The SVG output is responsive and displays correctly across various viewers.

## Requirements

- Node.js 18 or higher
- [ccusage](https://github.com/ryoppippi/ccusage) - Available as an npm dependency or via npx

## How It Works

1. **Data Collection**: Fetches usage data using the `ccusage` tool for the last 30 days.
2. **Grid Generation**: Creates a GitHub-style 7×N grid representing days of the week.
3. **Color Mapping**: Applies color intensity based on usage quantiles.
4. **Analytics Processing**: Calculates top usage days and billing totals.
5. **Terminal Rendering**: Displays heatmap with ANSI colors and centered billing summary.
6. **SVG Export**: Generates a comprehensive dashboard with heatmap, table, and billing info.
7. **Layout Optimization**: Centers all content for professional presentation.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

This project is built upon and extends the [ccusage](https://github.com/ryoppippi/ccusage) library, which is licensed under the MIT License. Modifications and enhancements in this tool are also provided under the MIT License.

Special thanks to these amazing open source projects that made this tool possible:

- **[ccusage](https://github.com/ryoppippi/ccusage)** by [@ryoppippi](https://github.com/ryoppippi) – The core library for Claude Code usage data collection and analysis (MIT License).
- **[ccstat](https://github.com/ktny/ccstat)** by [@ktny](https://github.com/ktny) – Inspiration and reference for Claude Code usage visualization.

## License

MIT License – see [LICENSE](LICENSE) file for details.

---

*Built for the Claude Code community* 🤖✨

Made by Nitro with ❤️ in Edmonton.