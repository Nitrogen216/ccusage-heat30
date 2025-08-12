# ccusage-heat30

A Node.js CLI tool built on top of [ccusage](https://github.com/ryoppippi/ccusage) that generates GitHub-style heatmaps displaying the last 30 days of Claude Code token usage with extended visualization features and comprehensive analytics.

## Features

- 📊 **GitHub-style heatmap** – Visual representation of your Claude Code usage over the last 30 days, leveraging the `ccusage` library.
- 💰 **Multiple metrics** – Track tokens, cost, input tokens, or output tokens.
- 🎨 **Terminal display** – Beautiful colored output with ANSI colors and a centered billing summary.
- 📁 **Professional SVG export** – Dashboard-style layout combining heatmap, statistics table, and billing summary.
- 📈 **Top usage days** – Displays your top 5 usage days with detailed statistics including models used.
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
Claude Code usage — last 30 days (tokens)

    Nov Dec Jan 
Mon ▪ ▪ ■ ■ ▪ 
Tue   ▪ ■ ▪ ▪ ▪ 
Wed ▪ ▪ ■ ■ ■ ▪ 
Thu   ▪ ■ ▪ ■ ▪ 
Fri ▪ ▪ ■ ■ ▪   
Sat     ▪ ▪ ▪   
Sun   ▪ ■ ▪     

Top 5 Days by tokens:
┌────────────┬─────────────────────────────────────────┬─────────┬────────┬─────────┬──────────────┐
│ Date       │ Models                                  │ Input   │ Output │ Total   │ Cost (USD)   │
├────────────┼─────────────────────────────────────────┼─────────┼────────┼─────────┼──────────────┤
│ 2024-01-15 │ claude-3-sonnet-20241022                │ 45,231  │ 3,421  │ 48,652  │ $0.2433      │
│ 2024-01-14 │ claude-3-sonnet-20241022                │ 38,109  │ 2,891  │ 41,000  │ $0.2050      │
│ 2024-01-13 │ claude-3-sonnet-20241022                │ 32,445  │ 2,334  │ 34,779  │ $0.1739      │
│ 2024-01-12 │ claude-3-sonnet-20241022                │ 28,667  │ 1,998  │ 30,665  │ $0.1533      │
│ 2024-01-11 │ claude-3-sonnet-20241022                │ 25,334  │ 1,776  │ 27,110  │ $0.1356      │
└────────────┴─────────────────────────────────────────┴─────────┴────────┴─────────┴──────────────┘

Legend: ▫ ▪ ▪ ■ ■
        Less · 1,234 · 5,678 · 12,345 · 25,000 · More

┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│         You have cumulatively used $2.5847 USD of Claude Code in this billing cycle.        │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### SVG Export Features

When exporting with `--svg`, you receive a comprehensive dashboard with the following characteristics:

- Default save location is the Desktop with filename `cc-heatmap-YYYYMMDD.svg` if no path is specified.
- Supports custom output paths to save SVG files in any directory.
- Left side features a GitHub-style heatmap with month/day labels and a color legend.
- Right side contains a professional table showing the top 5 usage days with detailed model information.
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