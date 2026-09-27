// metamedium-core public API.
// Headless: no rendering, no framework, no LLM calls. Surfaces feed events in
// and render state out. See ARCHITECTURE-v6-SESSION-ENGINE.md.

// Geometry
export {
  getBounds,
  getBoundsFromStroke,
  calculateDistance,
  calculateStraightness,
  isStrokeClosed,
  convexHull,
  findCorners,
  findCornersWithSeparation,
  countCorners,
  resampleByArcLength,
  shapeExtent,
  denoise,
  DEFAULT_CORNER_OPTIONS,
  analyzeCornerAngles,
  checkOvershoot,
  getFingerprint,
  smoothStroke,
  simplifyStroke,
  normalizeStroke,
  boundingBoxDistance,
  boundsOverlap,
  boundsContain,
} from './geometry';

// Recognition (Tier 0 heuristics)
export { analyzeStroke, matchPrimitiveFromLibrary, MIN_CONFIDENCE, MAX_TIER0_CONFIDENCE, HAND_RESOLUTION_PX } from './recognition';
export type { CornerOptions } from './geometry';


// Node model
export {
  createBootstrapNodes,
  createParticipantNode,
  typeNodeId,
  getRep,
  fingerprintOf,
  strokePointsOf,
  placed,
  wordOf,
  isGesture,
  isParticipant,
  isExplanation,
  explanationOf,
  aboutIdsOf,
  createExplanationNode,
  resemblances,
  transcriptsOf,
  transcriptOf,
  labelsOf,
  labelOf,
  isWord,
  lettersOf,
  topInterpretation,
  boundsOf,
  BUILTIN_TYPES,
  LOCAL_PARTICIPANT,
  TIER0_PARTICIPANT,
  ENGINE_PARTICIPANT,
  ENGINE_NAME,
  localityOf,
  authorOf,
} from './session/nodes';
export type { MMNode, Rep, Edge, Capability, ParticipantKind, ExplanationData, Transcript, Label } from './session/nodes';

// Clean forms — a confident reading, redrawn. Held beside the ink as a
// `'clean'` rep, like tidy's `'transform'`; never a replacement of the stroke.
export {
  idealize,
  snapReading,
  cleanOf,
  cleanPointsOf,
  describeSnap,
  SNAP_CONFIDENCE,
  SNAP_MARGIN,
  SNAPPABLE,
} from './session/clean';
export type { CleanShape, SnapReading } from './session/clean';

// A participant's marks made without a hand — the shape rung as a drawing
// vocabulary for models (the conversation benchmark's other half).
export { strokeFor, parseShapes, MAX_DRAWN } from './session/synthesize';
export type { DrawnShape } from './session/synthesize';

// The maths of a mark — what follows from a reading, measured from the ink;
// in the drawing's units when numbers are written on it (M4: pass the board's
// maths, `solveBoard(state)`). A measured corner is right within
// RIGHT_ANGLE_TOLERANCE — a reading of the ink, never a fact.
export { measure, describeMaths, angleClass, RIGHT_ANGLE_TOLERANCE } from './session/measure';
export type { Maths, Measure } from './session/measure';

// Maths on a page — quantities as the hand writes them (a value or a range, a
// unit, exact or approximate) and a small grammar of formulas whose `=` chains
// are running totals, read plurally with reasons (MATHS-PLAN.md §4;
// DIRECTOR-PLAN-W2 M1). Tier 1: pure, no model, no eval.
export {
  quantity,
  rangeOf,
  isRange,
  isBare,
  holds,
  parseQuantity,
  formatQuantity,
  formatNumber,
  convertQuantity,
  arithmetic,
  negateQuantity,
  compareQuantities,
  LENGTH_UNITS,
} from './maths/quantity';
export type { Quantity, LengthUnit, QuantityParse, Converted, Arith, ArithOp, CheckStatus, Comparison } from './maths/quantity';
export {
  parseExpression,
  parseChain,
  parseLine,
  evaluateExpr,
  evaluateChain,
  formatExpr,
  describeExpr,
  sameExpr,
  normName,
  scopeOf,
} from './maths/expr';
export type {
  Expr,
  ExprOp,
  ExprReading,
  ReadingChoice,
  ExprChain,
  ChainSegment,
  SegmentJoin,
  LineLabel,
  LineShape,
  LineParse,
  NameResolution,
  MathsScope,
  EvalOptions,
  Resolved as ResolvedName,
  ExprEvaluation,
  WrittenCheck,
  WorkedBinding,
  ChainReading,
} from './maths/expr';
// The sheet (M2): lines of writing or text become definitions, steps, checks
// and headings; a heading that says to add something is an allowance, read
// both ways; a pure function of its lines, so a changed measurement
// re-derives exactly what depends on it. `sheetLines` gathers the lines from
// a session's state and changes nothing in it.
export { readSheet, sheetEntry, sheetValue, dependentsOf, checkWritten, diffSheets, describeSheet } from './maths/sheet';
export type {
  Sheet,
  SheetEntry,
  SheetLineInput,
  SheetOptions,
  DefinitionEntry,
  StepEntry,
  HeadingEntry,
  CheckEntry,
  WorkedEntry,
  LabelEntry,
  ValueEntry,
  NoteEntry,
  Allowance,
  StepCheck,
  StepCheckStatus,
} from './maths/sheet';
export { sheetLines } from './maths/gather';
export type { GatheredLine, SheetLinesOptions } from './maths/gather';
// Dimensions (M3a): a number beside a mark offered as one of its measures —
// ranked by its distance to a side's middle relative to the side's length and
// by its alignment, with the reason and the runner-up; a number inside a
// closed mark is a piece label; a square in a corner declares it right; an
// underline belongs to its number; each drawing gets a unit and a scale, and
// says how consistently its labels agree with the ink. `sheetLines` leaves
// the numbers on marks out of the page.
export {
  dimensionsOf,
  figureOfMark,
  polygonFigure,
  readNumber,
  numbersOf,
  attachNumber,
  attachedNumberIds,
  insideFigure,
  inkMeasure,
  describeDimensions,
  TO_SCALE_WITHIN,
} from './maths/dimension';
export type {
  Figure,
  FigureKind,
  FigureSide,
  FigurePart,
  MeasureName,
  NumberReading,
  BoardNumber,
  Attachment,
  AttachmentCandidate,
  AttachmentKind,
  FigureLabel,
  RightAngleMark,
  Underline,
  Drawing,
  DrawingScale,
  DimensionOptions,
  BoardDimensions,
} from './maths/dimension';
// Solving (M4): figure by figure, in closed form — a triangle from three
// facts, a rectangle from two, a circle from one, an arc from two, a line,
// parts along one edge summing to their whole. Every derived value carries
// its formula; an over-determined figure keeps every consistent reading and
// says what cannot hold and by how much; a declared square rules, a measured
// right angle is only a reading; what the labels leave open is the ink's.
export { solveFigure, solveBoard, describeSolution } from './maths/solve';
export type {
  SolvedFrom,
  SolvedValue,
  Conflict as MathsConflict,
  SolveReading,
  Solution,
  SolveOptions,
  FigureMaths,
  BoardMaths,
  SolveBoardOptions,
} from './maths/solve';
// True size and print (M7): solved figures drawn at their real size as a new
// SVG document — by the solver's first reading, never by the ink, the root in
// paper units and the viewBox in the drawing's — and that document tiled onto
// Letter or A4 at 100%, with overlap, alignment marks, grid labels, a map and a
// measured test square on every page. Pure and deterministic.
export { trueSize, COORD_PLACES } from './maths/truesize';
export type { TrueSize, TrueSizeOptions, TrueSizeFigure, TrueSizeSide, TrueSizeOmission, SolvedFigures } from './maths/truesize';
export { printTiled, PAPERS } from './maths/print';
export type { Paper, Orientation, PaperSize, PrintOptions, PrintPage, PrintJob } from './maths/print';

// Magnets — the places a mark offers attachment, derived from its clean form.
export { magnetSites, nearestMagnet, magnetsNear, magnetRadius, describeMagnet, siteOf, MAGNET_SCREEN_PX, MAGNET_SIZE_FRACTION } from './session/magnets';
export type { MagnetSite, MagnetKind, MagnetHit } from './session/magnets';
// Ports by notation (V1-PLAN E3) — the one hook beside magnetSites: a notation
// that reads a mark as its symbol offers that symbol's ports, points and places
// along a segment or an outline, through the same queries the pen asks. None
// registered, nothing changes.
export { registerPorts, unregisterPorts, registeredPorts, alongIndex, alongOf, ALONG_STEPS } from './session/ports';
export type { NotationPort, NotationPorts } from './session/ports';
export { bindingsOf, boundRepsOf, activeBindingsOf, boundToMark, describeBinding } from './session/magnets';
export type { Binding, BoundRep } from './session/magnets';

// Words from letters — printed letters gathered into one held mark (words.ts).
export { isLetterLike, joinsRun, wordConfidence, LETTER_MAX_HEIGHT_PX, WORD_GAP_RATIO, WORD_WINDOW_MS } from './session/words';

// One log per participant; the canvas is the merge (BUILD-PLAN-v8 §1.5).
export { mergeLogs } from './store/merge';
export type { MergeOptions } from './store/merge';
// Live logs — multiplayer as a transport over the per-participant logs (v9 S6).
export { LiveStore, LocalHub } from './store/live';
export type { LiveLine, LiveTransport, LiveStoreOptions, Presence, RelayNotice } from './store/live';
// How a hand is named in a room: one sitting, one log (DIRECTOR-PLAN-W2 L1).
export { sittingName, sittingToken, handLabel } from './session/hands';

// The storage seam: the canvas is a folder; per-participant logs; backends (WP-11).
export { MemoryStore, ReadOnlyError, logPathFor, participantOfLog, encodeLog, decodeLog, isCanvasFile, toBytes, toText, META_DIR, LOG_DIR, LOG_EXT } from './store/seam';
export type { Store, Entry, Capabilities } from './store/seam';
export { StaticStore, MANIFEST_PATH } from './store/static';
export type { Fetcher, Manifest } from './store/static';
export { FolderStore, SKIP_DIRS, DEFAULT_FILE_LIMIT } from './store/folder';
export { GitStore, parseGitSpec, GITHUB_API } from './store/git';
export type { GitFetcher, GitSpec } from './store/git';
export type { DirHandleLike, FileHandleLike, FileLike, WritableLike } from './store/folder';

// Structural signatures: what a group IS as shapes and the links between them,
// compared with reasoning, corrected by example (WP-12).
export { structuralSignature, compareSignatures, matchDefinition, addExample, describeStructure, MATCH_FLOOR, DIRECTED_LINKS, SYMMETRIC_LINKS } from './session/signature';
export type { StructuralSignature, Examples, SignatureMatch } from './session/signature';
export type { Clock } from './session/session';
export { blessedBehaviourOf, behavioursOf, isFrame, frameOfNode } from './session/nodes';

// Frames: artifacts wired together by reference; the drawn slider (WP-10).
export { sliderOf, controlOf, alongSegment, paramsOf, withParams, interfacesOf, connectionsFor, resolveFrame, describeFrame, exportFrame, slotsIn } from './frames/frame';
export type { Port, Interface, Connection as FrameConnection, FrameRep, Resolved, ControlData } from './frames/frame';

// The fourth rung — what a mark DOES: steering verbs, walls, and the fit that
// turns an acted-out path into a behaviour (ARCHITECTURE-v8 §3, §21).
export { force, intents, VERBS, TARGETED, sizeOf, DEFAULT_SPEED, DEFAULT_MAX_FORCE } from './behave/verbs';
export type { Verb, Term, Behaviour, Body, Wall, World, Force, Intent } from './behave/verbs';
export { steer, step, seeded, worldOf } from './behave/steer';
export type { Steering, TermResult } from './behave/steer';
export { applyWalls, wallBoxes } from './behave/walls';
export type { WallBox, WallState } from './behave/walls';
export { fit } from './behave/fit';
export { parseBehaviour, parseClause, clausesOf, singular, describeBehaviour, behaviourSource, PHRASES } from './behave/words';
export type { ParsedBehaviour } from './behave/words';
export type { Sample, FitResult } from './behave/fit';

// Kinds of code — the closed table — and what ink lands on, per kind.
export { KINDS, kindOf, rowOf } from './kinds/kinds';
export type { Kind, KindRow, Renderer, Addressing } from './kinds/kinds';
export { addressablesOf, functionsOf, keysOf, headingsOf, elementsOf, runsOf, matchBrace } from './kinds/address';

// Image tracing: a bitmap of a sketch becomes strokes the rungs can read (WP-9a).
export { trace, binarize, thin, otsu, luminance, tracePaths, DEFAULT_SIMPLIFY_PX, DEFAULT_MIN_LENGTH_PX } from './image/trace';
export type { Bitmap, TraceOptions, TraceResult, TracedStroke } from './image/trace';
export type { Addressable } from './kinds/address';

// Gesture grammar
export {
  isLassoLike,
  isCheckLike,
  resolvesLasso,
  enclosedBy,
  strokesIntersect,
  whyNotResolved,
  DEFAULT_GESTURE_CONFIG,
} from './session/gesture';
export type { GestureConfig, MarkMiss, MissReason } from './session/gesture';
// A late result and the board it was about (STATE-1).
export type { StaleResult, StaleReason, Expectation } from './session/stale';
export { describeStale } from './session/stale';

// The command mark — a gesture the user teaches the system (MVP.md §5.2).
export {
  learnCommandMark,
  matchesCommandMark,
  commandMarkFeatures,
  collidesWith,
  canonicalCheckSamples,
  BUILTIN_COMMAND_MARK,
  COMMAND_MARK_SAMPLES,
} from './session/commandmark';
export type { CommandMark, CommandMatch } from './session/commandmark';

// Scratch-out erase — relational, not gestural (MVP.md, erase.ts).
export {
  segmentsIntersect,
  countCrossings,
  outlineOf,
  scratchedOut,
  DEFAULT_ERASE_CROSSINGS,
} from './session/erase';
export type { ScratchTarget } from './session/erase';

// Regions — the drawn boxes as a layout frame, and the address space for ink
// drawn over a live artifact (MVP.md §5.4, §6.2).
export { regionsOf, frameOf, regionAt, regionsOverlapping } from './session/regions';
export type { Region, Rect } from './session/regions';

// Relations — what Tier 0 can SEE between marks: insideness, nearness,
// alignment, direction, peerhood. Measured, scale-free, and the substrate that
// concepts match against.
export {
  relate,
  relationsOf,
  between,
  has,
  clusters,
  describeRelations,
  DEFAULT_RELATE_CONFIG,
} from './relate/relations';
export type { Relation, RelationKind, Mark, RelateConfig } from './relate/relations';

// The diagram rung — what a mark PLAYS: container, node, edge, label,
// annotation, unclassified. A closed vocabulary, placed by a table
// (KEYFRAMES.md §3), and the genre that decides how a drawing compiles.
export { assignRoles, genreOf, describeRoles, ROLES } from './diagram/roles';
export type { Role, RoleReading, RoleScope, Wire, Genre, GenreReading } from './diagram/roles';

// Concepts — the meaning-mappings, as a library rather than as code paths.
export { matchConcepts, BUILTIN_CONCEPTS } from './concepts/concept';
export type { Concept, ConceptMatch, ConceptScope, Conversion } from './concepts/concept';

// Parsing — the drawing read as a LAYOUT, and the page built from that reading.
// The engine owns structure because it measured it; the model owns content.
export { parseLayout, describeLayout, regionIdsIn } from './parse/layout';
export type { Layout, LayoutNode, Flow, Connection } from './parse/layout';
export { buildScaffold, validateRegions, prepare } from './parse/scaffold';
export type { RegionContent, Theme } from './parse/scaffold';
// …and read as a GRAPH when its genre says so: nodes keep their drawn
// positions, edges follow the drawn ink.
export { parseGraph, buildGraphScaffold, describeGraph, nodeIdsIn } from './parse/graph';
export type { Graph, GraphNode, GraphEdge, ParseGraphOptions } from './parse/graph';

// Session engine
export { createSession, DEFAULT_SESSION_CONFIG } from './session/session';
export type {
  Session,
  SessionState,
  SessionConfig,
  SessionEvent,
  Summon,
  Suggestion,
  ClusterCandidate,
  ProposedEdge,
  ProposedRep,
} from './session/session';

// Interpretations — the NON-COLLAPSING read path (ARCHITECTURE-v7 §4.1).
// `topInterpretation` above returns one reading for surfaces that need a
// headline; these keep every reading from every source and tier.
export {
  interpretationsOf,
  byTier,
  bySource,
  disagreement,
  sourcesOf,
  hasMultipleSources,
} from './session/interpretations';
export type { Interpretation, InterpretationGroup, Disagreement } from './session/interpretations';

// LLM transport (tier 2 — every model; local or hosted is a cost, not a tier).
// One client covers Ollama / LM Studio / OpenRouter; Anthropic has its own.
// Failures are returned, never thrown.
export { complete, listModels, providerLabel, providerTier, providerLocality, stripThink, textOf, PRESETS, DEFAULT_TIMEOUT_MS, LOCAL_TIMEOUT_MS } from './llm/provider';
export type { ProviderConfig, ProviderKind, ChatMessage, ContentPart, CompletionResult, ModelList, Locality } from './llm/provider';

// Tier 1 — the engine's instant library: what answers with no model and no
// wait, as a registry a surface and the router read; and the structure of a
// drawing built from it, with no words.
export { TIER1_LIBRARY, describeTier1, buildStructure, buildGraph3D, GRAPH3D_MARK } from './tier1/library';
export type { InstantModule, InstantAbility, StructureResult, Graph3DResult } from './tier1/library';
export { planFor, connectionsOf } from './parse/plan';
export type { Plan } from './parse/plan';

// Agent participants — a model joins through the same channel a human uses.
export { HERE, createAgentParticipant, parseReadings, parseCode, parseFill, parseTranscripts, parseBehaviourReply, parseProgram, readingsToEdges, MAX_READINGS } from './participants/agent';
export type { BehaveResult, ProgramResult } from './participants/agent';
export type { AgentParticipant, AgentReading, InterpretResult, AskResult, GenerateResult, ReadResult, TranscriptReading, DrawResult, RegionFill } from './participants/agent';
export { describeSession, describeSignature, describeRegions, describeAddressed, describeReading } from './participants/serialize';
export type { ReadingLike, DescribeReadingOptions } from './participants/serialize';
export type { Transport, AgentOptions } from './participants/agent';

// A participant answered by hand — any model, including one with no HTTP API,
// takes part through the same channel as one behind a URL.
export { createBridgeParticipant } from './participants/bridge';
export type { BridgeParticipant, BridgeRequest, BridgeOptions } from './participants/bridge';

// The decision seat (tier 1.5) — typed questions in, a typed value out, behind
// an injected transport. No vendor, no network: a seat, not a dependency.
export {
  createDecideParticipant,
  createStubDecideTransport,
  choice,
  score,
  noul,
  isFlat,
  reasonOf,
  ranked,
  leadOf,
  levelOf,
  NO_MATCH,
  FLAT_MARGIN,
} from './participants/decide';
export type {
  DecideSeat,
  DecideOptions,
  DecideTransport,
  DecideResult,
  DecideRun,
  DecisionRow,
  DecisionQuestion,
  DecisionAnswer,
  DecisionCandidate,
  ChoiceQuestion,
  ScoreQuestion,
  NoulQuestion,
  ChoiceAnswer,
  ScoreAnswer,
  NoulAnswer,
  Probability,
  StubAnswer,
  StubOptions,
} from './participants/decide';

// Routing — the canvas (tiers 0 and 1) answers first, and a model is asked only for what it cannot.
export { route, describeRoute, instantFor, SETTLED_CONFIDENCE } from './participants/router';
export type { Ability, Route, Candidate, RouteOptions } from './participants/router';
export type { SerializeOptions } from './participants/serialize';

// Types
export type * from './types';
