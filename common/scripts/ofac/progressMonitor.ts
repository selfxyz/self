/**
 * Progress Monitor for Parallel Tree Building
 *
 * Displays a clean, real-time dashboard showing all 7 trees building simultaneously
 */

export interface TreeProgress {
  id: number;
  name: string;
  status: 'pending' | 'building' | 'completed' | 'failed';
  totalEntries?: number;
  entriesAdded?: number;
  entriesProcessed?: number; // Track entries processed (i), not just added
  startTime?: number;
  endTime?: number;
}

export class ProgressMonitor {
  private trees: Map<number, TreeProgress> = new Map();
  private startTime: number = Date.now();
  private updateInterval?: NodeJS.Timeout;
  private lastOutput: string = '';
  private static readonly COL_TIME_WIDTH = 10;

  constructor(treeNames: string[]) {
    treeNames.forEach((name, index) => {
      this.trees.set(index + 1, {
        id: index + 1,
        name,
        status: 'pending',
      });
    });
  }

  start() {
    // Hide cursor (but don't clear screen - preserve previous output)
    process.stdout.write('\x1B[?25l');

    // Add some spacing before dashboard
    console.log('\n');

    // Update display every 33ms (~30 FPS) for smooth progress updates
    // This ensures we see updates even when processing is fast
    this.updateInterval = setInterval(() => this.render(), 33);
    this.render();
  }

  updateTree(id: number, updates: Partial<TreeProgress>) {
    const tree = this.trees.get(id);
    if (tree) {
      Object.assign(tree, updates);
      if (updates.status === 'building' && !tree.startTime) {
        tree.startTime = Date.now();
      }
      if (updates.status === 'completed' && !tree.endTime) {
        tree.endTime = Date.now();
      }
    }
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    // Show cursor again
    process.stdout.write('\x1B[?25h\n');
  }

  private render() {
    const lines: string[] = [];
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

    // Header
    lines.push('┌────────────────────────────────────────────────────────────────────────┐');
    lines.push('│              🚀 PARALLEL TREE BUILDING - LIVE PROGRESS                │');
    lines.push('├────────────────────────────────────────────────────────────────────────┤');
    lines.push(`│ Elapsed: ${elapsed}s`.padEnd(73) + '│');
    lines.push('└────────────────────────────────────────────────────────────────────────┘');
    lines.push('');

    const COL_ID_WIDTH = 2;
    const COL_NAME_WIDTH = 28;
    const COL_PROGRESS_WIDTH = 27;
    const COL_TIME_WIDTH = 10;

    lines.push('┌────┬──────────────────────────────┬─────────────────────────────┬────────────┐');
    lines.push('│ #  │ Tree Name                    │ Progress                    │ Time       │');
    lines.push('├────┼──────────────────────────────┼─────────────────────────────┼────────────┤');

    const trees = Array.from(this.trees.values()).sort((a, b) => a.id - b.id);

    for (const tree of trees) {
      const status = this.getProgressDisplay(tree);
      const time = this.getTimeDisplay(tree);
      const idStr = String(tree.id).padStart(COL_ID_WIDTH);
      const nameStr = tree.name.padEnd(COL_NAME_WIDTH);
      const statusStr = status.padEnd(COL_PROGRESS_WIDTH);
      const timeStr = time.padEnd(COL_TIME_WIDTH);

      lines.push(`│ ${idStr} │ ${nameStr} │ ${statusStr} │ ${timeStr} │`);
    }

    lines.push('└────┴──────────────────────────────┴─────────────────────────────┴────────────┘');

    // Summary
    const completed = trees.filter(t => t.status === 'completed').length;
    const building = trees.filter(t => t.status === 'building').length;
    const failed = trees.filter(t => t.status === 'failed').length;
    const totalEntriesProcessed = trees
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.entriesAdded || 0), 0);

    lines.push('');
    lines.push(`Status: ${completed}/${trees.length} completed  •  ${building} building  •  ${failed} failed`);
    if (totalEntriesProcessed > 0) {
      lines.push(`Total entries added to trees: ${totalEntriesProcessed.toLocaleString()}`);
    }

    // Always render to show smooth progress updates
    // Even if output looks similar, numbers are changing
    const output = lines.join('\n');
    const numLines = lines.length;
    // Move cursor up to overwrite previous output (but only after first render)
    if (this.lastOutput) {
      const prevLines = this.lastOutput.split('\n').length;
      process.stdout.write(`\x1B[${prevLines}A`); // Move up
    }
    process.stdout.write('\x1B[J' + output); // Clear from cursor and write
    this.lastOutput = output;
  }

  private getProgressDisplay(tree: TreeProgress): string {
    switch (tree.status) {
      case 'pending':
        return tree.totalEntries
          ? `⏳ ${tree.totalEntries.toLocaleString()} entries`
          : '⏳ Waiting...';
      case 'building':
        // Show entries processed if available, otherwise entries added
        const processed = tree.entriesProcessed ?? tree.entriesAdded ?? 0;
        if (tree.totalEntries && processed > 0) {
          // Show live progress: "15,234 / 18,455 (83%)"
          const percent = Math.floor((processed / tree.totalEntries) * 100);
          const added = tree.entriesAdded ?? 0;
          // Show both processed and added for clarity
          return `🔄 ${processed.toLocaleString()}/${tree.totalEntries.toLocaleString()} (${percent}%)`;
        } else if (tree.totalEntries) {
          return `🔄 0/${tree.totalEntries.toLocaleString()}`;
        }
        return '🔄 Building...';
      case 'completed':
        if (tree.totalEntries !== undefined) {
          return `✅ ${tree.totalEntries.toLocaleString()}/${tree.totalEntries.toLocaleString()} (100%)`;
        } else if (tree.entriesAdded !== undefined) {
          return `✅ ${tree.entriesAdded.toLocaleString()} added`;
        }
        return '✅ Done';
      case 'failed':
        return '❌ Failed';
    }
  }

  private getTimeDisplay(tree: TreeProgress): string {
    const COL_TIME_WIDTH = ProgressMonitor.COL_TIME_WIDTH;
    if (tree.status === 'completed' && tree.startTime && tree.endTime) {
      const duration = ((tree.endTime - tree.startTime) / 1000).toFixed(1);
      return `${duration}s`.padEnd(COL_TIME_WIDTH);
    }
    if (tree.status === 'building' && tree.startTime) {
      const duration = ((Date.now() - tree.startTime) / 1000).toFixed(1);
      return `${duration}s...`.padEnd(COL_TIME_WIDTH);
    }
    return '-'.padEnd(COL_TIME_WIDTH);
  }

  // Method to suppress console.log during tree building
  static suppressLogs() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalWrite = process.stdout.write;
    const originalErrorWrite = process.stderr.write;

    const logBuffer: string[] = [];
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('ERROR') || message.includes('FATAL')) {
        originalLog.apply(console, args);
      }
      logBuffer.push(message);
      return;
    };

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('dob is null') ||
          message.includes('year is null') ||
          message.includes('arr.length') ||
          message.includes('Processing') ||
          message.includes('name_and')) {
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('arr') || message.includes('arr.length')) {
        return;
      }
      originalWarn.apply(console, args);
    };

    process.stdout.write = (chunk: any, ...args: any[]): boolean => {
      const message = chunk.toString();
      if (message.includes('Processing') ||
          message.includes('name_and') ||
          message.includes('number') && message.includes('out of') ||
          message.includes('year is null') ||
          message.includes('dob is null') ||
          message.includes('arr WARN') ||
          message.includes('arr.length') ||
          message.includes('This entry already exists') ||
          message.includes('skipping')) {
        return true;
      }
      return originalWrite.call(process.stdout, chunk, ...args);
    };

    process.stderr.write = (chunk: any, ...args: any[]): boolean => {
      const message = chunk.toString();
      if (message.includes('arr WARN') ||
          message.includes('arr.length') ||
          message.includes('dob is null') ||
          message.includes('year is null')) {
        return true;
      }
      return originalErrorWrite.call(process.stderr, chunk, ...args);
    };

    return {
      restore: () => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        process.stdout.write = originalWrite;
        process.stderr.write = originalErrorWrite;
      }
    };
  }
}
