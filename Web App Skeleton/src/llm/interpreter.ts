// Interpreter Orchestrator
// Manages tiered interpretation with automatic escalation

import type {
  InterpretationContext,
  InterpretationResult,
  LLMSettings,
} from './types';
import { getHeuristicInterpreter } from './heuristicInterpreter';
import { createClaudeInterpreter, ClaudeInterpreter } from './claudeInterpreter';

// Default settings
const DEFAULT_SETTINGS: LLMSettings = {
  tier1ApiKey: null,
  tier2ApiKey: null,
  preferredTier: 0,
  autoEscalate: true,
  autoEscalateThreshold: 0.7,
};

// Settings storage key
const SETTINGS_KEY = 'metamedium_llm_settings_v1';

// Load settings from localStorage
function loadSettings(): LLMSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('[Interpreter] Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings: LLMSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[Interpreter] Failed to save settings:', e);
  }
}

// Current settings
let currentSettings = loadSettings();

// Interpreter instances
let tier1Interpreter: ClaudeInterpreter | null = null;
let tier2Interpreter: ClaudeInterpreter | null = null;

// Initialize interpreters based on settings
function initializeInterpreters(): void {
  if (currentSettings.tier1ApiKey) {
    tier1Interpreter = createClaudeInterpreter(currentSettings.tier1ApiKey, 1);
  } else {
    tier1Interpreter = null;
  }

  if (currentSettings.tier2ApiKey) {
    tier2Interpreter = createClaudeInterpreter(currentSettings.tier2ApiKey, 2);
  } else {
    tier2Interpreter = null;
  }
}

// Initialize on load
initializeInterpreters();

// ===== PUBLIC API =====

export function getSettings(): LLMSettings {
  return { ...currentSettings };
}

export function updateSettings(updates: Partial<LLMSettings>): void {
  currentSettings = { ...currentSettings, ...updates };
  saveSettings(currentSettings);
  initializeInterpreters();
}

export function setApiKey(tier: 1 | 2, key: string | null): void {
  if (tier === 1) {
    updateSettings({ tier1ApiKey: key });
  } else {
    updateSettings({ tier2ApiKey: key });
  }
}

export function getAvailableTiers(): number[] {
  const tiers = [0]; // Heuristic always available
  if (tier1Interpreter?.isAvailable()) tiers.push(1);
  if (tier2Interpreter?.isAvailable()) tiers.push(2);
  return tiers;
}

export function hasApiKey(): boolean {
  return !!(currentSettings.tier1ApiKey || currentSettings.tier2ApiKey);
}

// Main interpretation function with tiered escalation
export async function interpret(
  context: InterpretationContext,
  forceTier?: 0 | 1 | 2
): Promise<InterpretationResult> {
  const startTier = forceTier ?? currentSettings.preferredTier;

  console.log(`[Interpreter] Starting interpretation at tier ${startTier}`);

  // Try the requested tier
  let result = await interpretAtTier(context, startTier);

  // Auto-escalate if enabled and confidence is low
  if (
    currentSettings.autoEscalate &&
    result.candidates.length > 0 &&
    result.candidates[0].confidence < currentSettings.autoEscalateThreshold
  ) {
    const nextTier = getNextTier(result.tier);
    if (nextTier !== null) {
      console.log(
        `[Interpreter] Auto-escalating from tier ${result.tier} to tier ${nextTier} ` +
        `(confidence ${result.candidates[0].confidence.toFixed(2)} < ${currentSettings.autoEscalateThreshold})`
      );
      result = await interpretAtTier(context, nextTier);
    }
  }

  return result;
}

async function interpretAtTier(
  context: InterpretationContext,
  tier: 0 | 1 | 2
): Promise<InterpretationResult> {
  // Try tiers in order, falling back to lower tiers if unavailable
  if (tier >= 2 && tier2Interpreter?.isAvailable()) {
    return tier2Interpreter.interpret(context);
  }

  if (tier >= 1 && tier1Interpreter?.isAvailable()) {
    if (tier === 2) {
      console.log('[Interpreter] Tier 2 not available, falling back to tier 1');
    }
    return tier1Interpreter.interpret(context);
  }

  if (tier >= 1) {
    console.log('[Interpreter] Tier 1 not available, falling back to tier 0');
  }

  // Tier 0 (heuristics) is always available
  return getHeuristicInterpreter().interpret(context);
}

function getNextTier(currentTier: 0 | 1 | 2): 0 | 1 | 2 | null {
  switch (currentTier) {
    case 0:
      if (tier1Interpreter?.isAvailable()) return 1;
      if (tier2Interpreter?.isAvailable()) return 2;
      return null;
    case 1:
      if (tier2Interpreter?.isAvailable()) return 2;
      return null;
    case 2:
      return null;
    default:
      return null;
  }
}

// Export for debugging
export function getInterpreterStatus(): {
  tier0: boolean;
  tier1: boolean;
  tier2: boolean;
  preferredTier: number;
  autoEscalate: boolean;
} {
  return {
    tier0: true,
    tier1: tier1Interpreter?.isAvailable() ?? false,
    tier2: tier2Interpreter?.isAvailable() ?? false,
    preferredTier: currentSettings.preferredTier,
    autoEscalate: currentSettings.autoEscalate,
  };
}
