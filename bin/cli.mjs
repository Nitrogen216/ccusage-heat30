#!/usr/bin/env node
/**
 * ccheat30 - Last-30-days GitHub-style heatmap for Claude Code usage.
 * Default metric: totalTokens; Data source: ccusage daily --json
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// ---- config
const DAYS = 30;                 // Only look at the past 30 days (including today)
const DEFAULT_METRIC = 'tokens'; // tokens | cost | input | output
const WEEK_START = 'mon';        // 'sun' | 'mon' (GitHub uses Monday)
const PALETTE = ['#ebedf0','#9be9a8','#40c463','#30a14e','#216e39']; // GitHub green

// ---- small helpers
const dayMs = 86400000;
const pad = (n)=>String(n).padStart(2,'0');
const iso = (d)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const ymd = (d)=>`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
const quantile = (arr, q)=>{
  if(!arr.length) return 0;
  const a=[...arr].sort((x,y)=>x-y);
  const pos=(a.length-1)*q, lo=Math.floor(pos), hi=Math.ceil(pos);
  return lo===hi ? a[lo] : a[lo] + (pos-lo)*(a[hi]-a[lo]);
};
const hex2rgb = (hex)=>{
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : {r:0,g:0,b:0};
};
const bg = (hex, s='  ')=>{
  if (noColor || !supportsColor) return s; // Respect no-color flag
  const {r,g,b}=hex2rgb(hex);
  return `\x1b[48;2;${r};${g};${b}m${s}\x1b[0m`;
};

// ---- arg parsing (minimal)
const args = process.argv.slice(2);
const flags = {};
for (let i=0;i<args.length;i++){
  let a=args[i];
  if(a.startsWith('--')){
    let [k,v]=a.slice(2).split('=');
    if(v===undefined && args[i+1] && !args[i+1].startsWith('-')) v=args[++i];
    flags[k]=v ?? true;
  }
}

// metric & output options
const metric = (flags.metric ?? DEFAULT_METRIC).toLowerCase(); // tokens | cost | input | output
const weekStart = (flags['week-start'] ?? WEEK_START).toLowerCase(); // sun | mon
const svgOut = flags.svg;           // e.g. --svg assets/cc-heatmap.svg
const noColor = !!flags['no-color'];
const timezone = flags.timezone;    // Pass through to ccusage (optional)

// Color support detection
let supportsColor = false;
try {
  supportsColor = process.stdout.isTTY && (
    process.env.FORCE_COLOR || 
    process.env.COLORTERM || 
    (process.env.TERM && process.env.TERM !== 'dumb')
  );
} catch (e) {}

// ---- compute date range
const today = new Date(); 
today.setHours(0,0,0,0); // Set to the start of today
const since = new Date(today); 
since.setDate(since.getDate()-(DAYS-1)); // Go back 29 days, including today for a total of 30 days

// ---- get ccusage binary or fallback to npx
function getCcusageJSON() {
  // 1) Try local dependency
  try {
    const pkgPath = require.resolve('ccusage/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const dir = path.dirname(pkgPath);
    const binRel = typeof pkg.bin==='string' ? pkg.bin : (pkg.bin && Object.values(pkg.bin)[0]);
    const bin = binRel ? path.resolve(dir, binRel) : null;
    if (bin && fs.existsSync(bin)) {
      const argv = ['daily','--json', '--by-model', '--since', ymd(since), '--until', ymd(today)];
      if (timezone) argv.push('--timezone', String(timezone));
      const out = execFileSync(bin, argv, { encoding: 'utf-8' });
      return JSON.parse(out);
    }
  } catch (e) { /* ignore */ }

  // 2) Fall back to latest npx version
  const cmd = `npx --yes ccusage@latest daily --json --by-model --since ${ymd(since)} --until ${ymd(today)}${timezone?` --timezone ${timezone}`:''}`;
  return JSON.parse(execSync(cmd, { encoding: 'utf-8' }));
}

// ---- fetch daily data
let raw;
try {
  raw = getCcusageJSON();
} catch (e) {
  console.error('[ccheat30] Failed to read ccusage data:', e.message);
  process.exit(1);
}
const daily = raw.daily ?? raw.data ?? [];
const map = new Map(daily.map(d => [d.date, d]));

// ---- pick value per day
function pickValue(row){
  if(!row) return 0;
  if (metric==='cost') return row.totalCost ?? 0;
  if (metric==='input') return row.inputTokens ?? 0;
  if (metric==='output') return row.outputTokens ?? 0;
  return row.totalTokens ?? ((row.inputTokens??0)+(row.outputTokens??0));
}

// ---- build grid (7 rows x N weeks, GitHub style)
function startOfWeek(d, ws){ // ws: 0=Sun,1=Mon
  const dd=new Date(d);
  dd.setHours(0,0,0,0);
  const day=(dd.getDay()+7-ws)%7;
  dd.setDate(dd.getDate()-day);
  return dd;
}
const ws = weekStart==='mon' ? 1 : 0;

// collect values & thresholds
const values = [];
const dateValues = new Map(); // Store dates and corresponding values

// Only process the date range we care about (since -> today)
for (let i=0; i<DAYS; i++){
  const d = new Date(since.getTime() + i*dayMs);
  const dateStr = iso(d);
  const row = map.get(dateStr);
  const val = pickValue(row);
  values.push(val);
  dateValues.set(dateStr, val);
}

const nonZero = values.filter(v=>v>0);
let th;
if (nonZero.length === 0) {
  // If no data, use default thresholds
  th = [1, 10, 100, 1000];
} else {
  // Use more reasonable quantile calculation
  th = [
    quantile(nonZero, 0.25),
    quantile(nonZero, 0.50),
    quantile(nonZero, 0.75),
    quantile(nonZero, 1.0)
  ].map(v => Math.max(1, Math.ceil(v)));
  // Ensure thresholds are unique and sorted
  th = [...new Set(th)].sort((a,b)=>a-b);
  while(th.length < 4) th.push(th[th.length-1] * 2 || 1);
  th = th.slice(0, 4);
}

const colorOf = (v) => {
    if (!v) return PALETTE[0];
    if (v <= th[0]) return PALETTE[1];
    if (v <= th[1]) return PALETTE[2];
    if (v <= th[2]) return PALETTE[3];
    return PALETTE[4];
};

// ---- render terminal heatmap (GitHub style)
const gridStart = startOfWeek(since, ws);
const gridEnd = startOfWeek(today, ws);
const weeks = Math.round((gridEnd - gridStart) / dayMs / 7) + 1;

const grid = Array.from({length: 7}, () => Array(weeks).fill(null));

for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(gridStart.getTime() + i * dayMs);
    if (date > today) continue;

    const weekIndex = Math.floor((date - gridStart) / (7 * dayMs));
    const dayIndex = (date.getDay() + 7 - ws) % 7;
    
    const dateStr = iso(date);
    const inRange = date >= since && date <= today;
    const v = inRange ? (dateValues.get(dateStr) || 0) : null; // Use null for out-of-range
    
    if (weekIndex < weeks && dayIndex < 7) {
        grid[dayIndex][weekIndex] = { v, hex: v === null ? PALETTE[0] : colorOf(v), date: dateStr, inRange };
    }
}


// Month labels (top row, properly aligned to data range)
let monthLine = '     ';
const monthLabelsSvg = [];
const monthLabelsPlaced = new Set(); // Prevent duplicate labels

for (let w = 0; w < weeks; w++) {
  const weekStartDate = new Date(gridStart.getTime() + w * 7 * dayMs);
  const month = weekStartDate.getMonth();
  const year = weekStartDate.getFullYear();
  const monthKey = `${year}-${month}`;
  
  // Check if this week contains days within our target date range
  let hasValidDataInWeek = false;
  for (let d = 0; d < 7; d++) {
    const checkDate = new Date(weekStartDate.getTime() + d * dayMs);
    if (checkDate >= since && checkDate <= today) {
      hasValidDataInWeek = true;
      break;
    }
  }
  
  // If this week has valid data and this month doesn't have a label yet, show month label
  if (hasValidDataInWeek && !monthLabelsPlaced.has(monthKey)) {
    const label = weekStartDate.toLocaleString('en-US', { month: 'short' });
    monthLine += label.padEnd(4, ' ');
    monthLabelsSvg.push({ col: w, label });
    monthLabelsPlaced.add(monthKey);
  } else {
    monthLine += '    ';
  }
}

// Day labels (Mon/Wed/Fri)
const dayLabels = ws === 1 
  ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] 
  : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

console.log(`\nClaude Code usage — last ${DAYS} days (${metric})\n`);
console.log(monthLine);

for (let r = 0; r < 7; r++) {
  let line = (dayLabels[r] || '   ') + ' ';
  for (let w = 0; w < weeks; w++) {
    const cell = grid[r][w];
    if (cell === null || !cell.inRange) {
      if (noColor || !supportsColor) {
        line += '·  '; // Use bullet point for empty cells in no-color mode
      } else {
        line += bg(PALETTE[0], '  ') + ' ';
      }
    } else {
      if (noColor || !supportsColor) {
        // Use different characters for different intensities in no-color mode
        const chars = ['·', '▪', '▪', '■', '■'];
        const colorIndex = PALETTE.indexOf(cell.hex);
        const char = chars[colorIndex] || '■';
        line += char + ' ';
      } else {
        line += bg(cell.hex, '  ') + ' ';
      }
    }
  }
  console.log(line);
}

// ---- Top 5 Days Table
const sortedDaysData = [...map.values()]
  .filter(d => pickValue(d) > 0)
  .sort((a, b) => pickValue(b) - pickValue(a))
  .slice(0, 5);

if (sortedDaysData.length > 0) {
  console.log(`\nTop 5 Days by ${metric}:`);

  const headers = ['Date', 'Models', 'Input', 'Output', 'Total', 'Cost (USD)'];
  const rows = sortedDaysData.map(day => {
    const models = (day.modelsUsed && day.modelsUsed.length > 0)
      ? day.modelsUsed.join(', ')
      : 'N/A';
    const input = (day.inputTokens ?? 0).toLocaleString();
    const output = (day.outputTokens ?? 0).toLocaleString();
    const total = (day.totalTokens ?? ((day.inputTokens ?? 0) + (day.outputTokens ?? 0))).toLocaleString();
    const cost = `$${(day.totalCost ?? 0).toFixed(4)}`;
    return [day.date, models, input, output, total, cost];
  });

  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));

  const printLine = (type = 'body', content = []) => {
    const [start, sep, end] = {
      top: ['┌', '┬', '┐'],
      mid: ['├', '┼', '┤'],
      bot: ['└', '┴', '┘'],
      body:['│', '│', '│'],
    }[type];
    const parts = content.map((cell, i) => {
      const isNumeric = i >= 2; // Input, Output, Total, Cost
      return isNumeric ? cell.padStart(colWidths[i]) : cell.padEnd(colWidths[i]);
    });
    const inner = type === 'body' ? ` ${parts.join(' │ ')} ` : parts.map(p => '─'.repeat(p.length)).join(sep);
    const line = type === 'body' ? `${start}${inner}${end}` : `${start}─${inner.replace(/┬|┼|┴/g, (m) => `─${m}─`)}─${end}`;
    console.log(line);
  };
  
  printLine('top', headers);
  printLine('body', headers);
  printLine('mid', headers);

  for (const row of rows) {
    printLine('body', row);
  }
  printLine('bot', headers);
}


// Legend
const legend = [0,...th].map((_,i)=>bg(PALETTE[i],'  ')).join(' ');
const thresholdText = `Less · ${th.map(t=>t.toLocaleString()).join(' · ')} · More`;
console.log(`\nLegend: ${legend}\n        ${thresholdText}\n`);

// Calculate monthly billing total
let monthlyTotal = 0;
[...map.values()].forEach(day => {
  monthlyTotal += day.totalCost ?? 0;
});

// Display billing summary with decorative box
const billingText = `You have cumulatively used $${monthlyTotal.toFixed(4)} USD of Claude Code in this billing cycle.`;
const boxWidth = Math.max(billingText.length + 10, 90); // Add more padding for centering
const topBorder = '┌' + '─'.repeat(boxWidth - 2) + '┐';
const bottomBorder = '└' + '─'.repeat(boxWidth - 2) + '┘';
// Center the text within the box
const availableSpace = boxWidth - 4; // Space inside the box (excluding borders and spaces)
const padding = Math.floor((availableSpace - billingText.length) / 2);
const leftPadding = ' '.repeat(padding);
const rightPadding = ' '.repeat(availableSpace - billingText.length - padding);
const paddedText = '│ ' + leftPadding + billingText + rightPadding + ' │';

console.log(topBorder);
console.log(paddedText);
console.log(bottomBorder);
console.log();

// ---- optional SVG output
if (svgOut) {
  const cell=12, gap=3, top=60;
  // Calculate heatmap dimensions
  const gridWidth = weeks * (cell + gap) - gap;
  const gridHeight = 7 * (cell + gap) - gap;
  
  // Prepare table data
  const tableData = [...map.values()]
    .filter(d => pickValue(d) > 0)
    .sort((a, b) => pickValue(b) - pickValue(a))
    .slice(0, 5);
  
  // Calculate table dimensions
  const tableHeaders = ['Date', 'Models', 'Input', 'Output', 'Total', 'Cost'];
  const tableRows = tableData.map(day => {
    const models = (day.modelsUsed && day.modelsUsed.length > 0)
      ? (day.modelsUsed.join(', ').length > 25 ? day.modelsUsed.join(', ').substring(0, 22) + '...' : day.modelsUsed.join(', '))
      : 'N/A';
    const input = (day.inputTokens ?? 0).toLocaleString();
    const output = (day.outputTokens ?? 0).toLocaleString();
    const total = (day.totalTokens ?? ((day.inputTokens ?? 0) + (day.outputTokens ?? 0))).toLocaleString();
    const cost = `$${(day.totalCost ?? 0).toFixed(4)}`;
    return [day.date, models, input, output, total, cost];
  });
  
  const tableWidth = 450; // Increased to accommodate wider models column
  const tableHeight = Math.max(tableRows.length * 25 + 60, 200);
  
  // Layout calculations - center the combined heatmap + table
  const combinedContentWidth = gridWidth + 60 + tableWidth; // heatmap + gap + table
  const totalWidth = Math.max(combinedContentWidth + 120, 900); // content + margins
  const totalHeight = Math.max(top + gridHeight + 200, top + tableHeight + 120);
  
  // Center the combined content
  const contentStartX = (totalWidth - combinedContentWidth) / 2;
  const heatmapLeft = contentStartX;
  const tableLeft = heatmapLeft + gridWidth + 60;
  
  // Calculate billing summary
  let monthlyTotal = 0;
  [...map.values()].forEach(day => {
    monthlyTotal += day.totalCost ?? 0;
  });
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-label="ccusage-heat - Claude Code usage heatmap">\n`;
  
  // Add white background
  svg += `<rect width="100%" height="100%" fill="#ffffff"/>\n`;
  
  // Style definitions
  svg += `<style>
.title{font:16px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;fill:#24292f}
.small{font:10px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;fill:#656d76}
.label{font:9px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;fill:#656d76}
.legend-label{font:11px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;fill:#656d76}
.table-header{font:11px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;fill:#24292f}
.table-cell{font:10px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;fill:#24292f}
.billing{font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:600;fill:#0969da}
</style>\n`;

  // Add title
  svg += `<text x="${totalWidth/2}" y="25" class="title" text-anchor="middle">ccusage-heat - Claude Code Usage (Last ${DAYS} Days)</text>\n`;
  
  // Heatmap section
  // Month labels
  for (const {col, label} of monthLabelsSvg) {
    const x = heatmapLeft + col*(cell+gap);
    svg += `<text x="${x}" y="${top-10}" class="small">${label}</text>\n`;
  }
  
  // Grid
  for (let r=0;r<7;r++){
    for (let c=0;c<weeks;c++){
      const x = heatmapLeft + c*(cell+gap);
      const y = top + r*(cell+gap);
      const cellData = grid[r][c];
      if (cellData) {
        const { v, hex, date, inRange } = cellData;
        const title = inRange ? `${date}: ${v.toLocaleString()} ${metric}` : date;
        svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" ry="2" fill="${hex}" data-date="${date}" data-value="${v}"><title>${title}</title></rect>\n`;
      } else {
         svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" ry="2" fill="${PALETTE[0]}"></rect>\n`;
      }
    }
  }
  
  // Day labels
  const dayLabelsSvg = ws === 1 
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] 
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < dayLabelsSvg.length; i++) {
      // Only show Mon, Wed, Fri to keep it clean
      if (i % 2 === 0) {
        svg += `<text x="${heatmapLeft-10}" y="${top + i * (cell + gap) + cell / 1.5}" class="label" text-anchor="end">${dayLabelsSvg[i]}</text>\n`;
      }
  }
  
  // Heatmap Legend (below heatmap)
  const legendY = top + gridHeight + 20;
  const legendCenterX = heatmapLeft + gridWidth / 2;
  const legendWidth = 35 + 5 * (cell + 2) + 30; // Less text + squares + More text
  const legendStartX = legendCenterX - legendWidth / 2;
  
  // Legend title
  svg += `<text x="${legendCenterX}" y="${legendY}" class="legend-label" text-anchor="middle">Contributions</text>\n`;
  
  // Less label
  svg += `<text x="${legendStartX}" y="${legendY + 25}" class="label">Less</text>\n`;
  
  // Color squares
  for (let i = 0; i < 5; i++) {
    const x = legendStartX + 35 + i * (cell + 2);
    svg += `<rect x="${x}" y="${legendY + 13}" width="${cell}" height="${cell}" rx="2" ry="2" fill="${PALETTE[i]}"></rect>\n`;
  }
  
  // More label
  svg += `<text x="${legendStartX + 35 + 5 * (cell + 2) + 8}" y="${legendY + 25}" class="label">More</text>\n`;

  // Table section (right side)
  const tableStartY = top;
  svg += `<text x="${tableLeft}" y="${tableStartY - 10}" class="legend-label">Top 5 Days by ${metric}</text>\n`;
  
  // Table header
  const colWidths = [70, 160, 50, 50, 60, 60]; // Adjust column widths - made models column wider
  const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0);
  let currentX = tableLeft;
  
  // Header background
  svg += `<rect x="${tableLeft-5}" y="${tableStartY}" width="${totalTableWidth+10}" height="20" fill="#f6f8fa" stroke="#d1d9e0" stroke-width="1" rx="3"/>\n`;
  
  // Header text
  for (let i = 0; i < tableHeaders.length; i++) {
    svg += `<text x="${currentX + colWidths[i]/2}" y="${tableStartY + 14}" class="table-header" text-anchor="middle">${tableHeaders[i]}</text>\n`;
    currentX += colWidths[i];
  }
  
  // Table rows
  for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
    const row = tableRows[rowIndex];
    const rowY = tableStartY + 20 + (rowIndex + 1) * 22;
    
    // Row background (alternating)
    if (rowIndex % 2 === 0) {
      svg += `<rect x="${tableLeft-5}" y="${rowY-11}" width="${totalTableWidth+10}" height="22" fill="#fafbfc"/>\n`;
    }
    
    // Row border
    svg += `<rect x="${tableLeft-5}" y="${rowY-11}" width="${totalTableWidth+10}" height="22" fill="none" stroke="#e1e4e8" stroke-width="1"/>\n`;
    
    currentX = tableLeft;
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const isNumeric = colIndex >= 2; // Input, Output, Total, Cost columns
      const textAnchor = isNumeric ? 'end' : 'start';
      const textX = isNumeric ? currentX + colWidths[colIndex] - 5 : currentX + 5;
      
      svg += `<text x="${textX}" y="${rowY + 3}" class="table-cell" text-anchor="${textAnchor}">${row[colIndex]}</text>\n`;
      currentX += colWidths[colIndex];
    }
  }
  
  // Billing summary (bottom center)
  const billingY = Math.max(legendY + 60, tableStartY + 20 + tableRows.length * 22 + 40);
  const billingText = `You have cumulatively used $${monthlyTotal.toFixed(4)} USD of Claude Code in this billing cycle.`;
  
  // Billing box
  const billingBoxWidth = Math.max(billingText.length * 7 + 20, 400);
  const billingBoxX = totalWidth / 2 - billingBoxWidth / 2;
  
  svg += `<rect x="${billingBoxX}" y="${billingY-15}" width="${billingBoxWidth}" height="40" fill="#fff3cd" stroke="#ffeaa7" stroke-width="2" rx="8"/>\n`;
  svg += `<text x="${totalWidth/2}" y="${billingY + 5}" class="billing" text-anchor="middle">${billingText}</text>\n`;
  
  // Info footer
  const footerY = billingY + 60;
  svg += `<text x="${totalWidth/2}" y="${footerY}" class="label" text-anchor="middle">Date range: ${iso(since)} to ${iso(today)} | Metric: ${metric} | Thresholds: ${th.map(t => t.toLocaleString()).join(', ')}</text>\n`;
  
  svg += `</svg>\n`;
  fs.mkdirSync(path.dirname(svgOut), { recursive: true });
  fs.writeFileSync(svgOut, svg, 'utf-8');
  console.log(`SVG written to ${svgOut}`);
}