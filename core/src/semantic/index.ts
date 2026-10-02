// The semantic seat (PLAN-IPAD-NOTES I9): a seam for meaning, pure and injectable.
export { cosine, unit, createEmbedCache, createStubEmbedTransport, embedAll, EmbedError, EMBED_BATCH } from './embed';
export type { EmbedTransport, EmbedOptions, EmbedCache, StubEmbedOptions } from './embed';
export { semanticScorer, notesLike, groupLikes } from './scorer';
export type { SemanticFn, NoteLike, NotesSource, NotesOptions } from './scorer';
export { wordsOfMarks, LIKE_MAX_CHARS } from './words';
export { createStaticTransport, buildStaticModel, parseSafetensors, safetensorsNames, wordPieceOf, StaticModelError, MAX_TOKENS } from './static';
export type { StaticModelFiles, BuildOptions, Tensor, WordPiece } from './static';
