// A board's settings (MATHS-SPEC §8 Lane A, M18; John, 8 Oct 2026).
//
// A setting is a fact about the BOARD, kept in its log by a `setting` event, like `use`: whichever hand set it,
// every merged board has it, and it is undone per hand. The set is closed — two keys, each with its values — so a
// board can be read and replayed by any build that knows them, and a key or value it does not know is refused at
// the door and ignored on replay (DATA-1: read, not trusted).
//
//   - `answers`: 'show' (a derived value shows when it is asked for, as ever) or 'wait' (the board is set to teach:
//     each answer a fill-in would give stands as a ? in its colour; the first tap shows it, the second writes it —
//     the reveal is the page's, never logged).
//   - `colour`: 'pointed' (a quantity's colour shows while its marks are held or pointed at) or 'always' (the
//     board is set to colour the maths: it shows on every figure at rest).
//
// What a device prefers is not here — a device's preference is the device's. This is what the board says.

export type SettingKey = 'answers' | 'colour';

/** The closed set: every key, and the values it takes. The first value is the default. */
export const SETTING_VALUES = {
  answers: ['show', 'wait'],
  colour: ['pointed', 'always'],
} as const;

export interface BoardSettings {
  answers: (typeof SETTING_VALUES.answers)[number];
  colour: (typeof SETTING_VALUES.colour)[number];
}

/** What a board says before its log says otherwise. */
export const DEFAULT_SETTINGS: Readonly<BoardSettings> = Object.freeze({ answers: 'show', colour: 'pointed' });

export const SETTING_KEYS = Object.keys(SETTING_VALUES) as SettingKey[];

/** Whether a key is one of the closed set. */
export function isSettingKey(key: unknown): key is SettingKey {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(SETTING_VALUES, key);
}

/** Whether a value is one the key takes. */
export function isSettingValue(key: SettingKey, value: unknown): boolean {
  return typeof value === 'string' && (SETTING_VALUES[key] as readonly string[]).includes(value);
}

/**
 * The sentence that says why a key and value cannot be set, or null when they can. Read, not trusted: whatever
 * stands where a key or a value should, a log from elsewhere included.
 */
export function settingRefusal(key: unknown, value: unknown): string | null {
  if (!isSettingKey(key)) return `“${String(key)}” is not a setting a board has — it has ${SETTING_KEYS.join(' and ')}`;
  if (!isSettingValue(key, value)) return `“${String(value)}” is not a way to set ${key} — it is ${(SETTING_VALUES[key] as readonly string[]).join(' or ')}`;
  return null;
}
