// Find (PLAN-IPAD-NOTES I6): words across every board, derived and never in a log.
export { tokenize, normalise, foldChar } from './tokens';
export type { Token } from './tokens';
export { searchEntriesOf, registerSearchSource, unregisterSearchSource, sourceIds, pageWords, svgWords, chunksOf, MAX_ENTRIES, CHUNK_CHARS } from './extract';
export type { SearchEntry, SearchKind, SearchSource } from './extract';
export { searchBoards, describeHit, excerptOf, EXACT, PREFIX, SEMANTIC_FLOOR, EXCERPT_CHARS } from './query';
export type { SearchBoard, SearchHit, SearchGroup, SearchOptions } from './query';
export { SEARCH_VERSION, searchKeyOf, stalePlan, thumbFit } from './plan';
