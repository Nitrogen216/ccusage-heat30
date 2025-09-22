#!/usr/bin/env node
/**
 * ccheat30 - Last-30-days GitHub-style heatmap for Claude Code usage.
 * Default metric: totalTokens; Data source: ccusage/@ccusage/codex daily --json
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import os from 'node:os';
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
const svgFlag = flags.svg;          // --svg (to Desktop by default) or --svg <path>
const noColor = !!flags['no-color'];
let showSources = (flags.source || 'both').toLowerCase(); // both | claude | codex
if (!['both','claude','codex'].includes(showSources)) showSources = 'both';
const timezone = (() => {
  if (flags.timezone) return String(flags.timezone);
  try {
    const guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return guess || undefined;
  } catch {
    return undefined;
  }
})();    // Pass through to usage CLI (optional)

// ---- color capability detection (replace the old block)
const isTTY = !!process.stdout.isTTY;
const depth = isTTY && typeof process.stdout.getColorDepth === 'function'
  ? process.stdout.getColorDepth()
  : 1; // 1/4/8/24
const hasTrueColor = depth >= 24 || /\b(truecolor|24bit)\b/i.test(process.env.COLORTERM || '');
const has256 = depth >= 8;
const supportsColor = !flags['no-color'] && isTTY && (hasTrueColor || has256);

// Map RGB -> xterm-256 color code
function rgbToAnsi256(r, g, b) {
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const rr = Math.round((r / 255) * 5);
  const gg = Math.round((g / 255) * 5);
  const bb = Math.round((b / 255) * 5);
  return 16 + 36 * rr + 6 * gg + bb;
}

// ---- bg() (replace the old one)
const bg = (hex, s='  ') => {
  if (!supportsColor) return s; // respect --no-color or no color support
  const {r,g,b} = hex2rgb(hex);
  if (hasTrueColor) {
    return `\x1b[48;2;${r};${g};${b}m${s}\x1b[0m`;
  }
  // 256-color fallback
  const code = rgbToAnsi256(r,g,b);
  return `\x1b[48;5;${code}m${s}\x1b[0m`;
};

// ---- compute date range
const today = new Date(); 
today.setHours(0,0,0,0); // Set to the start of today
const since = new Date(today); 
since.setDate(since.getDate()-(DAYS-1)); // Go back 29 days, including today for a total of 30 days

// ---- ccusage CLI resolution helpers
function resolveCliPackage(candidates) {
  for (const name of candidates) {
    try {
      const pkgPath = require.resolve(`${name}/package.json`);
      return { name, pkgPath };
    } catch (e) { /* try next candidate */ }
  }
  return null;
}

function buildUsageArgs() {
  const argv = ['daily', '--json', '--by-model', '--since', ymd(since), '--until', ymd(today)];
  if (timezone) argv.push('--timezone', String(timezone));
  return argv;
}

function readUsageJSON({ label, packageCandidates, npxTargets }) {
  const argv = buildUsageArgs();
  const resolved = resolveCliPackage(packageCandidates);
  if (resolved) {
    try {
      const pkg = JSON.parse(fs.readFileSync(resolved.pkgPath, 'utf-8'));
      const dir = path.dirname(resolved.pkgPath);
      const binRel = typeof pkg.bin === 'string' ? pkg.bin : (pkg.bin && Object.values(pkg.bin)[0]);
      const bin = binRel ? path.resolve(dir, binRel) : null;
      if (bin && fs.existsSync(bin)) {
        const out = execFileSync(bin, argv, { encoding: 'utf-8' });
        return JSON.parse(out);
      }
    } catch (e) { /* fall through to npx */ }
  }

  let lastError;
  for (const target of npxTargets) {
    try {
      const out = execFileSync('npx', ['--yes', target, ...argv], { encoding: 'utf-8' });
      return JSON.parse(out);
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) throw lastError;
  throw new Error(`Unable to resolve ${label} usage CLI`);
}

function getClaudeUsageJSON() {
  return readUsageJSON({
    label: 'Claude Code',
    packageCandidates: ['ccusage', '@ccusage/codex'],
    npxTargets: ['ccusage@latest', '@ccusage/codex@latest'],
  });
}

function getCodexUsageJSON() {
  return readUsageJSON({
    label: 'Codex',
    packageCandidates: ['@ccusage/codex'],
    npxTargets: ['@ccusage/codex@latest'],
  });
}

// ---- fetch daily data
let claudeRaw;
if (showSources !== 'codex') {
  try {
    claudeRaw = getClaudeUsageJSON();
  } catch (e) {
    console.error('[ccheat30] Failed to read Claude usage data:', e.message);
    process.exit(1);
  }
} else {
  claudeRaw = { daily: [] };
}

let codexRaw;
let codexError;
if (showSources !== 'claude') {
  try {
    codexRaw = getCodexUsageJSON();
  } catch (e) {
    codexError = e;
    codexRaw = null;
  }
} else {
  codexRaw = null;
}

const claudeDaily = claudeRaw.daily ?? claudeRaw.data ?? [];
const claudeMap = new Map(claudeDaily.map(d => [d.date, d]));
const codexDaily = codexRaw ? (codexRaw.daily ?? codexRaw.data ?? []) : [];
const normalizeCodexRow = (row) => {
  if (!row) return row;
  const modelEntries = row.models && typeof row.models === 'object' ? Object.entries(row.models) : [];
  const modelsUsed = modelEntries.length > 0
    ? modelEntries.map(([name, usage]) => usage && usage.isFallback ? `${name} (fallback)` : name)
    : (Array.isArray(row.modelsUsed) ? row.modelsUsed : []);
  const inputTokens = (row.inputTokens ?? 0) + (row.cachedInputTokens ?? 0);
  const outputTokens = (row.outputTokens ?? 0) + (row.reasoningOutputTokens ?? 0);
  const totalTokens = row.totalTokens ?? (inputTokens + outputTokens);
  const totalCost = row.totalCost ?? row.costUSD ?? 0;
  let isoDate = row.isoDate ?? row.date;
  if (isoDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      // already ISO
    } else {
      const parsed = new Date(`${row.date} UTC`);
      if (!Number.isNaN(parsed.getTime())) {
        const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getUTCDate()).padStart(2, '0');
        isoDate = `${parsed.getUTCFullYear()}-${mm}-${dd}`;
      }
    }
  }
  return {
    ...row,
    modelsUsed,
    inputTokens,
    outputTokens,
    totalTokens,
    totalCost,
    isoDate,
  };
};
const codexNormalizedDaily = codexDaily.map(normalizeCodexRow);
const codexMap = new Map(codexNormalizedDaily.map(d => [d.isoDate || d.date, d]));

const summarizeCost = (entries) => {
  let total = 0;
  for (const day of entries) total += day.totalCost ?? 0;
  return total;
};

const hasClaude = showSources !== 'codex';
const codexRequested = showSources !== 'claude';

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
  const claudeRow = hasClaude ? claudeMap.get(dateStr) : null;
  const codexRow = (showSources !== 'claude') ? codexMap.get(dateStr) : null;
  const val = (hasClaude ? pickValue(claudeRow) : 0) + (codexRow ? pickValue(codexRow) : 0);
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

// Use a consistent visual cell width across all modes to avoid misalignment
const CELL_W = 3; // two-character cell + one space (or one char + two spaces in no-color)

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
let monthLine = '';
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
    // Fit month label to CELL_W characters
    monthLine += label.slice(0, CELL_W).padEnd(CELL_W, ' ');
    monthLabelsSvg.push({ col: w, label });
    monthLabelsPlaced.add(monthKey);
  } else {
    monthLine += ' '.repeat(CELL_W);
  }
}

// Do not center; monthLine is already column-aligned. Keep trailing spaces for full width.

// Day labels (Mon/Wed/Fri)
const dayLabels = ws === 1 
  ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] 
  : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Collect all output content first
let outputLines = [];
const headerTitle = showSources === 'both' ? 'Claude + Codex usage' : (showSources === 'codex' ? 'Codex usage' : 'Claude Code usage');
outputLines.push(headerTitle);
outputLines.push('');

// Add month labels as a separate row, aligned to the heatmap grid (no centering)
outputLines.push('    ' + monthLine);

// Create logo lines - complete CCUSAGE-HEAT30 design
const logoLines = [
  "  ██████╗ ██████╗██╗   ██╗███████╗ █████╗  ██████╗ ███████╗ ",
  " ██╔════╝██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝ ██╔════╝ ",
  " ██║     ██║     ██║   ██║███████╗███████║██║  ███╗█████╗   ",
  " ╚██████╗╚██████╗╚██████╔╝███████║██║  ██║╚██████╔╝███████╗ ",
  "  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ",
  "  ██╗  ██╗███████╗ █████╗ ████████╗██████╗  ██████╗        ",
  "  ██║  ██║██╔════╝██╔══██╗╚══██╔══╝╚════██╗██╔═████╗       ",
  "  ███████║█████╗  ███████║   ██║    █████╔╝██║██╔██║       ",
  "  ██╔══██║██╔══╝  ██╔══██║   ██║    ╚═══██╗████╔╝██║       ",
  "  ██║  ██║███████╗██║  ██║   ██║   ██████╔╝╚██████╔╝       ",
  "  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═════╝  ╚═════╝        "
];

// Use logo height to determine how many heatmap rows to show
const logoHeight = logoLines.length;

for (let r = 0; r < logoHeight; r++) {
  let line = '';

  if (r < 7) {
    // Show heatmap data for first 7 rows
    line = (dayLabels[r] || '   ') + ' ';
    for (let w = 0; w < weeks; w++) {
      const cell = grid[r][w];
      if (cell === null || !cell.inRange) {
        if (noColor || !supportsColor) {
          line += '.  '; // ASCII dot to avoid ambiguous width
        } else {
          line += bg(PALETTE[0], '  ') + ' ';
        }
      } else {
        if (noColor || !supportsColor) {
          // Use ASCII-safe characters to avoid ambiguous-width glyphs
          const chars = ['.', ':', '-', '+', '#'];
          const colorIndex = PALETTE.indexOf(cell.hex);
          const char = chars[colorIndex] || '■';
          line += char + '  '; // data cell: 1 char + 2 spaces => 3 cols
        } else {
          line += bg(cell.hex, '  ') + ' ';
        }
      }
    }
  } else {
    // For extra logo rows, add spaces to match heatmap width
    line = '    '; // day label space
    for (let w = 0; w < weeks; w++) {
      line += ' '.repeat(CELL_W);
    }
  }
  
  // Add logo to the right side
  const logoLine = logoLines[r] || '';
  line += '    ' + logoLine; // Add some spacing between heatmap and logo
  
  outputLines.push(line);
}

// ---- Usage leaderboards (Claude + Codex)
const tableHeaders = ['Date', 'Models', 'Input', 'Output', 'Total', 'Cost (USD)'];
const formatTopDaysRow = (day) => {
  const modelsArray = (() => {
    if (Array.isArray(day.modelsUsed) && day.modelsUsed.length > 0) return day.modelsUsed;
    if (Array.isArray(day.models) && day.models.length > 0) return day.models;
    if (day.models && typeof day.models === 'object') return Object.keys(day.models);
    return [];
  })();
  const models = modelsArray.length > 0 ? modelsArray.join(', ') : 'N/A';
  const input = (day.inputTokens ?? 0).toLocaleString();
  const output = (day.outputTokens ?? 0).toLocaleString();
  const total = (day.totalTokens ?? ((day.inputTokens ?? 0) + (day.outputTokens ?? 0))).toLocaleString();
  const cost = `$${(day.totalCost ?? 0).toFixed(4)}`;
  return [day.date, models, input, output, total, cost];
};

function buildTopDaysTable(headers, rows) {
  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  const lines = [];
  let width = 0;

  const partsFor = (cells) => cells.map((cell, i) => {
    const isNumeric = i >= 2;
    return isNumeric ? cell.padStart(colWidths[i]) : cell.padEnd(colWidths[i]);
  });

  const draw = (type, content) => {
    const mapping = {
      top: ['┌', '┬', '┐'],
      mid: ['├', '┼', '┤'],
      bot: ['└', '┴', '┘'],
      body: ['│', '│', '│'],
    };
    const [startChar, separator, endChar] = mapping[type];
    const padded = partsFor(content);
    let line;
    if (type === 'body') {
      line = `${startChar} ${padded.join(' │ ')} ${endChar}`;
    } else {
      const filler = padded.map(part => '─'.repeat(part.length)).join(separator);
      line = `${startChar}─${filler.replace(/┬|┼|┴/g, (m) => `─${m}─`)}─${endChar}`;
    }
    lines.push(line);
    width = Math.max(width, line.length);
  };

  draw('top', headers);
  draw('body', headers);
  draw('mid', headers);
  for (const row of rows) {
    draw('body', row);
  }
  draw('bot', headers);

  return { lines, width };
}

let maxTableWidth = 0;
const MAX_LEADERBOARD_ROWS = 5;

function ensureCurrentDayIncluded(map, rows) {
  const todayKey = iso(today);
  const todayEntry = map.get(todayKey);
  if (!todayEntry) return rows;
  const todayCost = todayEntry.totalCost ?? todayEntry.costUSD ?? 0;
  if (todayCost <= 0) return rows;
  const exists = rows.some(d => (d.isoDate ?? d.date) === (todayEntry.isoDate ?? todayEntry.date));
  if (exists) return rows;
  return [...rows, todayEntry]
    .sort((a, b) => (b.totalCost ?? b.costUSD ?? 0) - (a.totalCost ?? a.costUSD ?? 0))
    .slice(0, MAX_LEADERBOARD_ROWS);
}

const sortedClaudeDaysDataInitial = hasClaude
  ? [...claudeMap.values()]
      .filter(d => (d.totalCost ?? 0) > 0)
      .sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0))
      .slice(0, MAX_LEADERBOARD_ROWS)
  : [];
const sortedClaudeDaysData = hasClaude
  ? ensureCurrentDayIncluded(claudeMap, sortedClaudeDaysDataInitial)
  : [];

const sortedCodexDaysDataInitial = codexRequested
  ? [...codexMap.values()]
      .filter(d => (d.totalCost ?? 0) > 0)
      .sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0))
      .slice(0, MAX_LEADERBOARD_ROWS)
  : [];
const sortedCodexDaysData = codexRequested
  ? ensureCurrentDayIncluded(codexMap, sortedCodexDaysDataInitial)
  : [];

function appendTopDaysSection(title, days, { error, emptyMessage }) {
  outputLines.push('');
  outputLines.push(`${title}:`);
  if (error) {
    const msg = error.message || String(error);
    outputLines.push(`(Failed to load data: ${msg})`);
    return;
  }
  if (days.length === 0) {
    outputLines.push(emptyMessage);
    return;
  }
  const rows = days.map(formatTopDaysRow);
  const { lines, width } = buildTopDaysTable(tableHeaders, rows);
  maxTableWidth = Math.max(maxTableWidth, width);
  outputLines.push(...lines);
}

if (hasClaude) {
  appendTopDaysSection('Top 5 Claude Code Days by cost', sortedClaudeDaysData, {
    emptyMessage: 'No Claude Code usage data recorded.',
  });
}

if (codexRequested) {
  appendTopDaysSection('Top 5 Codex Days by cost', sortedCodexDaysData, {
    error: codexError,
    emptyMessage: 'No Codex usage data recorded.',
  });
}


// Legend
const legend = [0,...th].map((_,i)=>bg(PALETTE[i],'  ')).join(' ');
const thresholdText = `Less - ${th.map(t=>t.toLocaleString()).join(' - ')} - More`;
outputLines.push('');
outputLines.push(`Legend: ${legend}`);
outputLines.push(`        ${thresholdText}`);
outputLines.push('');

// Calculate monthly billing totals
const claudeMonthlyTotal = hasClaude ? summarizeCost(claudeMap.values()) : 0;
const codexMonthlyTotal = codexRequested ? summarizeCost(codexMap.values()) : 0;

// Display billing summary with decorative box
const billingLines = [];
if (hasClaude) {
  billingLines.push(`You have cumulatively used $${claudeMonthlyTotal.toFixed(4)} USD of Claude Code in this billing cycle.`);
}
if (codexRequested) {
  billingLines.push(`You have cumulatively used $${codexMonthlyTotal.toFixed(4)} USD of Codex in this billing cycle.`);
}
const minBoxWidth = billingLines.length ? Math.max(...billingLines.map(line => line.length + 4)) : 40;
const boxWidth = maxTableWidth > 0
  ? Math.max(maxTableWidth, minBoxWidth)
  : Math.max(minBoxWidth, 90);
const topBorder = '┌' + '─'.repeat(boxWidth - 2) + '┐';
const bottomBorder = '└' + '─'.repeat(boxWidth - 2) + '┘';
const innerWidth = boxWidth - 4;
const centerLine = (text) => {
  const padding = Math.max(0, Math.floor((innerWidth - text.length) / 2));
  const leftPadding = ' '.repeat(padding);
  const rightPadding = ' '.repeat(Math.max(0, innerWidth - text.length - padding));
  return `│ ${leftPadding}${text}${rightPadding} │`;
};

outputLines.push(topBorder);
if (billingLines.length === 0) {
  outputLines.push(centerLine('No usage detected.'));
} else {
  for (const line of billingLines) {
    outputLines.push(centerLine(line));
  }
}
outputLines.push(bottomBorder);

// Now output everything with a big border
const maxLineLength = Math.max(...outputLines.map(line => {
  // Remove ANSI color codes for length calculation
  const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
  return cleanLine.length;
}));

// Compute outer box width; if terminal width is available, try to fit into (cols - 1)
const minOuterWidth = maxLineLength + 4;
let outerBoxWidth = Math.max(minOuterWidth, 100);
const cols = (process.stdout && process.stdout.isTTY && typeof process.stdout.columns === 'number')
  ? process.stdout.columns
  : undefined;
if (cols && cols >= 40) {
  const safe = Math.max(40, cols - 1); // leave one column margin to avoid autowrap quirks
  if (safe >= minOuterWidth) {
    outerBoxWidth = safe;
  }
}
const outerTopBorder = '╔' + '═'.repeat(outerBoxWidth - 2) + '╗';
const outerBottomBorder = '╚' + '═'.repeat(outerBoxWidth - 2) + '╝';

console.log('\n' + outerTopBorder);
// Left align content with a single space on the left; compute right padding exactly
const contentWidth = outerBoxWidth - 4;
for (const line of outputLines) {
  const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
  const leftPad = ' ';
  const rightSpaceCount = Math.max(0, contentWidth - 1 - cleanLine.length);
  const rightPad = ' '.repeat(rightSpaceCount);
  let rendered = '║' + leftPad + line + rightPad + '║';
  const renderedCleanLen = rendered.replace(/\x1b\[[0-9;]*m/g, '').length;
  const diff = outerBoxWidth - renderedCleanLen;
  if (diff > 0) {
    // Add compensation spaces before right border to keep it flush
    rendered = rendered.slice(0, -1) + ' '.repeat(diff) + '║';
  }
  console.log(rendered);
}
console.log(outerBottomBorder);
console.log();

// ---- optional SVG output
if (svgFlag) {
  // Resolve output path: if --svg is passed without a value, default to Desktop
  let svgOutPath;
  if (svgFlag === true) {
    const home = (os.homedir && os.homedir()) || process.env.HOME || process.env.USERPROFILE || process.cwd();
    const desktop = path.join(home, 'Desktop');
    const defaultName = `cc-heatmap-${ymd(today)}.svg`;
    svgOutPath = path.join(desktop, defaultName);
  } else {
    svgOutPath = String(svgFlag);
  }
  const cell=12, gap=3, top=60;
  // Calculate heatmap dimensions
  const gridWidth = weeks * (cell + gap) - gap;
  const gridHeight = 7 * (cell + gap) - gap;
  
  // Prepare table data
  const tableData = [...claudeMap.values()]
    .filter(d => (d.totalCost ?? 0) > 0)
    .sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0))
    .slice(0, 10);
  
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
  [...claudeMap.values()].forEach(day => {
    monthlyTotal += day.totalCost ?? 0;
  });
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-label="ccusage-heat - Claude Code usage heatmap">
`;
  
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
  svg += `<text x="${tableLeft}" y="${tableStartY - 10}" class="legend-label">Top 5 Days by cost</text>\n`;
  
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
  fs.mkdirSync(path.dirname(svgOutPath), { recursive: true });
  fs.writeFileSync(svgOutPath, svg, 'utf-8');
  console.log(`SVG written to ${svgOutPath}`);
}
