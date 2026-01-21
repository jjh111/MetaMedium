// MetaMedium Day 6 - Logger Utility
// Verbose mode logging

let verboseMode = false;

export function setVerboseMode(enabled: boolean): void {
  verboseMode = enabled;
  console.log(`🔊 Verbose mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

export function vlog(...args: any[]): void {
  if (verboseMode) {
    console.log(...args);
  }
}

// Always log (for important messages)
export function log(...args: any[]): void {
  console.log(...args);
}
