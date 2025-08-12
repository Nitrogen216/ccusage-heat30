# ccusage-heat30

A Node.js CLI tool that generates GitHub-style heatmaps showing the last 30 days of Claude Code token usage with comprehensive analytics.


## Features

- 📊 **GitHub-style heatmap** - Visual representation of your Claude Code usage over the last 30 days
- 💰 **Multiple metrics** - Track tokens, cost, input tokens, or output tokens
- 🎨 **Terminal display** - Beautiful colored output with ANSI colors and centered billing summary
- 📁 **Professional SVG export** - Dashboard-style layout with heatmap, statistics table, and billing summary
- 📈 **Top usage days** - Shows your top 5 usage days with detailed statistics including models used
- 💵 **Billing summary** - Prominently displays cumulative usage costs for the billing cycle
- 🎯 **Centered layout** - Both terminal and SVG outputs feature properly centered content
- ⚙️ **Customizable** - Configure week start day, timezone, and output options

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

| Option | Description | Values | Default |
|--------|-------------|--------|---------|
| `--metric` | Choose what metric to visualize | `tokens`, `cost`, `input`, `output` | `tokens` |
| `--week-start` | Set the first day of the week | `sun`, `mon` | `mon` |
| `--svg <path>` | Export heatmap as SVG file | File path | - |
| `--no-color` | Disable terminal colors | - | - |
| `--timezone <tz>` | Timezone for usage data | Timezone string | System default |

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
When using `--svg`, you get a comprehensive dashboard featuring:
- **Left side**: GitHub-style heatmap with month/day labels and color legend
- **Right side**: Professional table showing top 5 usage days with model details
- **Bottom**: Highlighted billing summary with total cost
- **Centered layout**: All elements properly aligned and centered
- **Professional styling**: Clean typography and GitHub-inspired color scheme

## Requirements

- Node.js 18 or higher
- [ccusage](https://github.com/ryoppippi/ccusage) - Available as npm dependency or via npx

## How It Works

1. **Data Collection**: Fetches usage data using the `ccusage` tool for the last 30 days
2. **Grid Generation**: Creates a GitHub-style 7×N grid representing days of the week
3. **Color Mapping**: Applies color intensity based on usage quantiles
4. **Analytics Processing**: Calculates top usage days and billing totals
5. **Terminal Rendering**: Displays heatmap with ANSI colors and centered billing summary
6. **SVG Export**: Generates comprehensive dashboard with heatmap, table, and billing info
7. **Layout Optimization**: Centers all content for professional presentation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

Special thanks to these amazing open source projects that made this tool possible:

- **[ccusage](https://github.com/ryoppippi/ccusage)** by [@ryoppippi](https://github.com/ryoppippi) - The core library for Claude Code usage data collection and analysis
- **[ccstat](https://github.com/ktny/ccstat)** by [@ktny](https://github.com/ktny) - Inspiration and reference for Claude Code usage visualization

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

*Built for the Claude Code community* 🤖✨

Made with ❤️ in Edmonton.