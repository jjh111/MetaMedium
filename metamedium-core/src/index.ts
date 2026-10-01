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
  standingPointsOf,
  standsClosed,
  unplaced,
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
  arcThrough,
  arrowPoints,
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
// Figures of several strokes (V1-PLAN E3): ruled strokes whose ends meet — a
// magnet tied them, or they touch within the hand's reach — read as one
// figure: a triangle, a quadrilateral (a diamond, turned about 45°; a
// rectangle, its corners right), a polygon. Each side keeps the marks it was
// drawn with, and each figure is the maths lane's own, so
// `solveBoard(state, { figures: figuresOf(state) })` solves it. Derived.
export { figuresOf, figuresAmong, describeFigure, STRAIGHT_TURN, STRAIGHT_RUN, ONE_BEND, DIAMOND_SLACK, SLIVER, MAX_FIGURE_STROKES } from './diagram/figures';
export type { InkFigure, FigureShape, FigureCorner } from './diagram/figures';
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
// The maths on the board (M5): what is said beside a figure and a page — a chip
// on each derived side, on a label that cannot hold, on each step's check — as
// data a surface draws; the panel's words; and `=` typed in the field as a sum
// read against the page. `boardMathsOf` keeps the board's maths while its log
// stands. Derived: nothing enters the log.
export { boardMaths, boardMathsOf, mathsChips, mathsSaid, evaluateTyped, CHIP_OFFSET, STEP_GAP } from './maths/board';
export type { MathsChip, MathsChipKind, MathsSaid, TypedMaths } from './maths/board';
// What a pattern piece's marks come to in numbers, and what true size prints of them (M6).
export { garmentMaths, garmentDecor, offsetPolygon, affineFit, applyAffine, INK_AGREES as GARMENT_INK_AGREES } from './maths/garment';
export type { GarmentPieceMaths, GarmentSeam, GarmentFold, GarmentDims, GarmentNotchMaths, GarmentDartMaths, GarmentDrawn, GarmentDecor } from './maths/garment';

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
// Handles (V1-PLAN E1, CONTROL-POINTS-PLAN P2) — the same sites made
// draggable: one mark with a clean form shows its own, and dragging one writes
// one `reshape` event that reshapes the clean form and never the ink.
export { handlesOf, reshapePreview, reshapedClean, reshapeClean, cleanFormOf, MIN_EXTENT_PX } from './session/handles';
export type { Handle, HandleKind, ReshapePreview } from './session/handles';
// Bindings follow (V1-PLAN E2, CONTROL-POINTS-PLAN P3): a connector bound to a
// site re-derives its end when the mark moves or is reshaped — a `'follow'`
// rep the engine derives in the apply path, never logged. A connector's ends
// and where they stand, the end a handle drags, the ends a hand's move walks
// off their sites, and what would follow a drag before the log has it.
export {
  connectorEnds,
  endOfHandle,
  movesWhole,
  holdReach,
  sitsOn,
  releasedBy,
  reshapeDecision,
  lettingGo,
  followOf,
  followed,
  followPreview,
  boundByIndex,
  SITS_EXACTLY,
  FOLLOW_VISITS,
} from './session/follow';
export type { ConnectorEnds, FollowRep, Tie } from './session/follow';
export {
  ROUTE_MAX_TURNS, STUB_PX, STUB_SHARE, MIN_OBSTACLE_PX, WINDOW_SHARE, MAX_BLOCKS, HEAD_SPREAD, RANK_BAND, RANK_SPREAD,
  outwardOf, routeBetween, deriveRoute, routeRepOf, routeStands, routable, routeAffectedBy, tidyPlanOf,
} from './diagram/route';
export type { Dir, RouteEnd, RouteBlock, RoutePath, RouteRep, TidyPlan } from './diagram/route';
export { boundSiteOf, ownSitesOf } from './session/magnets';
export { followMapOf, placementOf } from './session/nodes';
// A move, a scale or a turn as a pure function of a mark: what the reducer
// does to each mark a manipulation moves, and what a preview of a drag asks.
export { manipulableOf, manipulatedReps, manipulationMap, markFrameOf } from './session/manipulate';
export type { Manipulation } from './session/manipulate';
export {
  REGION_HOLDS, regionRepOf, regionMembers, regionCarries, regionsOfBoard, describeRegion, regionSaid, holdsSaid,
  shareInside, standingBoxOf, thingKindOf, regionOutline,
} from './session/board-regions';
export type { RegionRep, RegionBoard, RegionDescription, OutlineEntry } from './session/board-regions';
export type { Affine } from './session/affine';

// Words from letters — printed letters gathered into one held mark (words.ts).
export { isLetterLike, joinsRun, wordConfidence, LETTER_MAX_HEIGHT_PX, WORD_GAP_RATIO, WORD_WINDOW_MS } from './session/words';

// One log per participant; the canvas is the merge (BUILD-PLAN-v8 §1.5).
export { mergeLogs, describeAuthorshipCollision } from './store/merge';
export type { MergeOptions, AuthorshipCollision } from './store/merge';
// Live logs — multiplayer as a transport over the per-participant logs (v9 S6).
export { LiveStore, LocalHub, ownLog, SEND_WAIT_MS, COVER_WAIT_MS, COVER_STAGGER_MS } from './store/live';
export type { LiveLine, LiveTransport, LiveStoreOptions, Presence, RelayNotice, RelayRefusal } from './store/live';
export { LiveMerge } from './store/livemerge';
export type { MergeReport } from './store/livemerge';
// How a hand is named in a room: one sitting, one log (DIRECTOR-PLAN-W2 L1).
export { sittingName, sittingToken, handLabel } from './session/hands';

// The storage seam: the canvas is a folder; per-participant logs; backends (WP-11).
export { MemoryStore, ReadOnlyError, logPathFor, participantOfLog, encodeLog, decodeLog, isCanvasFile, toBytes, toText, META_DIR, LOG_DIR, LOG_EXT } from './store/seam';
export type { Store, Entry, Capabilities } from './store/seam';
// The log format (V1-PLAN R2): a header line, version 0 and 1 read, a newer version refused in a sentence.
export { LOG_FORMAT, LOG_VERSION, LogFormatError, logHeader, encodeLogTail, appendToLogText } from './store/format';
export type { LogHeader, LogWriteOptions, DecodedLog } from './store/format';
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
export { blessedBehaviourOf, behavioursOf, isFrame, frameOfNode, packDefinitionOf, isPackDefinition } from './session/nodes';
export type { PackDefinitionRep } from './session/nodes';

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
export { isPictureKind, isAssetRef, pictureOf, ASSET_REF } from './kinds/picture';
export type { Picture } from './kinds/picture';
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
  mayCross,
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
  ENGAGING_KINDS,
  withinReach,
  nearLimitOf,
  reachAround,
} from './relate/relations';
export type { Relation, RelationKind, Mark, RelateConfig } from './relate/relations';
// Where marks are (V1-PLAN §9 R4b): a grid whose cells are sized from the
// marks, asked which boxes meet a box — what the session finds the marks
// within a mark's reach with, and what a surface can cull to the viewport by.
export { MarkGrid, finiteBounds } from './relate/grid';

// The diagram rung — what a mark PLAYS: container, node, edge, label,
// annotation, unclassified. A closed vocabulary, placed by a table
// (KEYFRAMES.md §3), and the genre that decides how a drawing compiles.
export { assignRoles, genreOf, describeRoles, ROLES } from './diagram/roles';
export type { Role, RoleReading, RoleScope, Wire, Genre, GenreReading } from './diagram/roles';
// Connector heads (V1-PLAN E3): what sits at each end of a line, an arrow or
// an arc — the arrow's own barb, a small triangle, diamond or circle touching
// the end, a separate chevron — hollow or filled, filled measured as ink
// coverage relative to the head's own area. Writing at an end is a label, not
// a head. Plural, with reasons; derived, never in the log.
export {
  headsOf,
  connectorHeads,
  describeHeads,
  HEAD_MAX_SHARE,
  HEAD_AXIS_SHARE,
  FILL_CORE,
  FILL_REACH,
  FILLED_AT,
  FILL_UNSURE,
  BARB_ROUND,
  BARB_CLOSED,
  OUTLINE_PATH,
  HEAD_COMPACT,
} from './diagram/heads';
export type { HeadKind, HeadReading, ConnectorEnd, ConnectorHeads } from './diagram/heads';
// Notations (V1-PLAN §3, D1) — what a drawing is in a notation's own terms,
// read over the diagram rung: symbols by their shape and their corners' angle
// (a decision is a box turned 45°, which the shape rung is blind to), each
// playing one of the six roles and adding none; connectors read past their
// heads; labels inside a symbol or beside a flow. Every notation reads,
// plural and ranked; derived, never in the log. A notation's ports reach the
// pen through E3's hook only when offered — while a board uses the notation's
// pack (B3, `followPacks`). The flowchart ships; its content is
// FLOWCHART_TABLE, its single home, which the flowchart@1 pack names.
export {
  registerNotation,
  unregisterNotation,
  registeredNotations,
  notationById,
  notationsOf,
  offerPorts,
  describeNotation,
  NOTATION_FLOOR,
} from './notations/notation';
export type {
  Notation,
  NotationReading,
  NotationSymbol,
  NotationSymbolDef,
  NotationConnector,
  NotationConnectorDef,
  NotationEnd,
  NotationLabel,
  SymbolReading,
} from './notations/notation';
export { FLOWCHART, FLOWCHART_TABLE, readFlowchart, flowchartPortsOf } from './notations/flowchart';
// The UML class notation (V1-PLAN §3, D4): a class is a box with one or two
// lines across it — its compartments, read in the box's own frame, a turned
// box included — the name in the top one, its members below (a method only
// when read words say so); relations by the head at a line's end — a hollow
// triangle inheritance, a filled diamond composition, a hollow one
// aggregation, an open arrow association, none a link; multiplicities are
// short writing near an end. Its content is UML_CLASS_TABLE, which the
// uml-class@1 pack names; its classDiagram writer and reader are
// uml-class-mermaid.ts, registered with D2's writers and D3's readers.
export {
  UML_CLASS,
  UML_CLASS_TABLE,
  readUmlClass,
  umlClassPortsOf,
  memberKind,
  METHOD_WORDS,
  COMPARTMENT_LEVEL,
  COMPARTMENT_STRAIGHT,
  COMPARTMENT_CROSSINGS,
  zigzagOf,
  COMPARTMENT_SHORT,
  COMPARTMENT_SHORT_PX,
  COMPARTMENT_PAST,
  COMPARTMENT_PAST_PX,
  COMPARTMENT_INSET,
  COMPARTMENT_FLOOR,
  MAX_COMPARTMENT_LINES,
  PLAIN_CLASS,
  BOX_FLOOR,
  WRITING_SPAN,
  LETTER_SHARE,
  END_SHARE,
} from './notations/uml-class';
export type { UmlClassReading, UmlClassSymbol, UmlCompartment, UmlMember, UmlRelation, UmlRelationEnd, UmlMarker } from './notations/uml-class';
// The sequence notation (V1-PLAN §3, D5): participants — a box, or a stick
// figure (a circle over a body and a few short lines), at the top of its
// lifeline, one long line or dashed — read from the geometry, never the
// relation table; messages are roughly level connectors whose ends, past
// their heads, land on two lifelines (a call solid, a return dashed; a loop
// out and back is a self-message), in order down the page, each labelled by
// the writing just above it. Its content is SEQUENCE_TABLE, which the
// sequence@1 pack names; each lifeline is a continuous port.
export {
  SEQUENCE,
  SEQUENCE_TABLE,
  readSequence,
  sequencePortsOf,
  LIFELINE_PLUMB,
  LIFELINE_PX,
  LIFELINE_OF_BOX,
  LIFELINE_MIDDLE,
  LIFELINE_BELOW,
  LIFELINE_GAP,
  LIFELINE_GAP_PX,
  MESSAGE_LEVEL,
  LAND_SHARE,
  LOOP_PX,
  LOOP_SPAN_PX,
  LABEL_ABOVE,
  LABEL_DIP,
  WRITING_ZIGZAG,
  HELD_ARROW,
} from './notations/sequence';
export type { SequenceReading, SequenceParticipant, SequenceMessage, MessageKind } from './notations/sequence';
// The state notation (V1-PLAN §3, D5's state half): a state is a round-cornered
// box, the initial state a small dot scribbled solid, the final a ring with a
// mark inside it, a transition an arrow between them — or a loop out of a state
// and back, its barb measured — each end read past its head. What makes it a
// state diagram rather than the flowchart's boxes and arrows is what a
// flowchart has no symbol for: the reading's confidence is its structure
// scaled by that evidence. Its content is STATE_TABLE, which the state@1 pack
// names; its stateDiagram-v2 writer and reader are state-mermaid.ts,
// registered with D2's writers and D3's readers.
export {
  STATE,
  STATE_TABLE,
  readState,
  statePortsOf,
  FILLED_PATH,
  BLOB_ASPECT,
  DOT_FILLED,
  SMALL_BESIDE,
  INNER_SHARE,
  INNER_CENTRED,
  LOOP_OUT,
  LOOP_OUT_PX,
  LOOP_STANDS_OUT,
  BARB_SHARE,
  BARB_PX,
  ROUNDED_BY,
  ROUND_ENOUGH,
  ROUNDED_EXTENT,
  ROUNDED_UPRIGHT,
  EVIDENCE,
  PLAIN_SHARE,
  FOREIGN_PENALTY,
} from './notations/state';
export type { StateReading, StateSymbol, StateTransition } from './notations/state';
export { stanceOf, cornersOf, tightBox } from './notations/shape';
// Dashed lines (V1-PLAN §3, D5) — short straight strokes in a row read as one
// line, derived like figures: each dash's ends in the row's corridor, each a
// gap from the next, and nothing a letter's size touching a dash but at the
// row's ends nor standing in a gap — so printed capitals, whose bars join
// their stems, never read as one. `dashedHeads` asks heads.ts what sits at
// each end, on a scratch board where the row is one stroke.
export { dashedLines, dashedHeads, DASH_PX, DASH_BOW, DASH_PATH, DASH_OFF, DASH_OFF_PX, DASH_ALONG, DASH_GAP, DASH_GAP_PX, DASH_OVERLAP, DASH_SPREAD, MIN_DASHES, SMALL_MARK, DASH_TOUCH, DASH_TOUCH_PX, CROSSING_DEG, HEAD_OF } from './notations/dashes';
export type { DashedLine } from './notations/dashes';
export type { QuadStance } from './notations/shape';
// Mermaid out (V1-PLAN §3, D2) — a notation reading said as Mermaid text at
// tier 1, by the writer its notation registered (the flowchart's ships; D4–D6
// add theirs); null for a notation with none. Ids are the marks' own said
// safely and never alike; every label quoted and escaped; writing nobody has
// read written "(unread writing)" and named in `unread` and the notes; the
// order the drawing's, so any merge order says the same text. `ids` and
// `marks` map each Mermaid id back to the marks, `links` each link (in
// Mermaid's own numbering) to its connector.
export { toMermaid, registerMermaidWriter, mermaidWriters, mermaidIds, mermaidString, unescapeMermaid, UNREAD_WRITING } from './notations/mermaid';
export type { MermaidText, MermaidOptions, MermaidLink, MermaidWriter, MermaidDirection } from './notations/mermaid';
// Mermaid in (V1-PLAN §3, D3) — a Mermaid text drawn as ink the engine reads
// as a hand's: a reader per diagram keyword (the flowchart's reads
// `flowchart` and `graph`; D4–D6 add theirs), what it cannot read refused
// with its line and never thrown; a deterministic layered layout that keeps
// the text's order as its reading order; each symbol a clean form the
// notation reads, each link port to port and bound at both ends, each word a
// label on its own ink — so `toMermaid` of the reading says the text again.
// Tier 1; the events are strokes, binds and labels. Wrap the call in
// `session.withTool` to make it one act.
export { drawMermaid, readMermaid, registerMermaidReader, mermaidReaders, readFlowchartText, FLOWCHART_READER, MERMAID_TEXT_PX, MERMAID_MAX_NODES, MERMAID_MAX_LINKS } from './notations/mermaid-in';
export type { DrawMermaidOptions, DrawnMermaid, DrawnLink, DrawnEnd, MermaidRead, MermaidNodeRead, MermaidLinkRead, MermaidRefusal, MermaidReader, MermaidFlow } from './notations/mermaid-in';
export { layoutLayered, keepApart, LAYERED_PASSES, KEEP_DIRECTION } from './notations/layered';
// The class diagram in Mermaid, both ways (D4): `classDiagram` written from a
// reading — classes in reading order with their members (an attribute's
// parentheses as entities, so Mermaid never takes one for a method),
// relations from the marked end, multiplicities as quoted cardinalities — and
// read back and drawn as ink the notation reads, so the round trip holds.
export { writeUmlClass, readClassDiagramText, CLASS_DIAGRAM_READER, memberLine } from './notations/uml-class-mermaid';
// The sequence diagram in Mermaid, both ways (D5): `sequenceDiagram` written
// from a reading — participants left to right, messages down the page, each
// arrow as its line and head say, words as raw text with Mermaid's entities —
// and read back and drawn as ink the notation reads, so the round trip holds.
export { writeSequence, readSequenceText, SEQUENCE_READER, sequenceText, BLANK_WORDS } from './notations/sequence-mermaid';
export type { SequenceDiagramRead, SequenceNodeRead, SequenceLinkRead, DrawnSequenceLink } from './notations/sequence-mermaid';
export type { LayeredNode, LayeredLink, LayeredOptions, LayeredLayout, LayeredBack, LayeredDirection } from './notations/layered';
// The state diagram in Mermaid, both ways (D5): `stateDiagram-v2` written from
// a reading — states in reading order with their names, transitions by what
// they join, the initial dot and the final ring both `[*]` — and read back and
// drawn as ink the notation reads: rounded boxes, a dot scribbled solid, a ring
// round a second, arrows bound at both ends, a loop out of a state and back.
export { writeState, readStateText, STATE_READER, stateText, INITIAL_ID, FINAL_ID } from './notations/state-mermaid';
export type { StateDiagramRead, StateNodeRead, StateLinkRead, DrawnStateLink } from './notations/state-mermaid';


// Concepts — the meaning-mappings, as a library rather than as code paths.
export { matchConcepts, BUILTIN_CONCEPTS, writingLines } from './concepts/concept';
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
  RebaseReport,
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
  isShapeRungReading,
  isHeardReading,
} from './session/interpretations';
export type { Interpretation, InterpretationGroup, Disagreement } from './session/interpretations';

// LLM transport (tier 2 — every model; local or hosted is a cost, not a tier).
// One client covers Ollama / LM Studio / OpenRouter; Anthropic has its own.
// Failures are returned, never thrown.
export {
  complete, listModels, providerLabel, providerTier, providerLocality, stripThink, textOf, PRESETS, DEFAULT_TIMEOUT_MS, LOCAL_TIMEOUT_MS,
  // What a provider says a model can do, how a reply is budgeted, and a model's name in words (V1-PLAN J5).
  readModels, parseModelList, modelFacts, nearestModelIds, guessVision, whereOf, isOpenRouter, modelWords, maxTokensFor,
  DEFAULT_MAX_TOKENS, MIN_REPLY_TOKENS, OPENROUTER_REASONING, OPENROUTER_APP, MODEL_LIST_TIMEOUT_MS,
} from './llm/provider';
export type { ProviderConfig, ProviderKind, ChatMessage, ContentPart, CompletionResult, ModelList, Locality, FailureReason, ModelInfo, ModelCatalog, ModelFacts } from './llm/provider';
// The decision seat's transport over a chat completion (V1-PLAN I7): the wire is the seam a native shape swaps in.
export { createChatDecideTransport, CHAT_DECIDE_WIRE, DEFAULT_DECIDER_MODEL, wireQuestion } from './llm/decide-openrouter';
export type { DecideWire, ChatDecideOptions, WireOption, WireQuestion } from './llm/decide-openrouter';

// Tier 1 — the engine's instant library: what answers with no model and no
// wait, as a registry a surface and the router read; and the structure of a
// drawing built from it, with no words.
export { TIER1_LIBRARY, describeTier1, buildStructure, buildGraph3D, GRAPH3D_MARK } from './tier1/library';
export type { InstantModule, InstantAbility, StructureResult, Graph3DResult } from './tier1/library';
export { planFor, connectionsOf } from './parse/plan';
export type { Plan } from './parse/plan';

// Tools (V1-PLAN §2.1, B1) — one contract for what the canvas can do with a
// scope: what it reads, what it offers (each with a base likelihood and a
// reason), what taking an offer writes (stamped with the tool's id). The
// field's affordances are `offersFor(scope)` ranked by `rankOffers`; what is
// typed completes through `completionsFor`. A new tool is one file and one
// registration line; importing core registers the built-ins, in the order
// the field always offered them.
export {
  registerTool,
  unregisterTool,
  getTool,
  registeredTools,
  toolsVersion,
  onToolsChange,
  offersFor,
  completionsFor,
  toolsFor,
  readingsFor,
  takeOffer,
  describeTools,
  defaultHost,
  toolScope,
} from './tools/registry';
export { baseOn, likelihoodOf, rankOffers, isSpecific, useLift, MODEL_DISCOUNT, USE_LIFT_MAX, USE_LIFT_RATE, SPECIFIC_GROUNDS } from './tools/rank';
export type { Rankable, Uses } from './tools/rank';
export { NO_CONTEXT } from './tools/tool';
export type { Tool, Offer, Grounds, ToolScope, ToolHost, ToolReading, Taken, Context, ScopeReading, SessionReader } from './tools/tool';
export { BUILTIN_TOOLS } from './tools/builtin';
export { NAMING_IS, nameMarks } from './tools/name';
export { LABELLING_IS, labelInk, theirMarks, madeThese, makersOf, whoseInk } from './tools/label';
export type { LabelRefusal } from './tools/label';
export { REGION, makeRegion, regionFrameOf, regionRound, nextRegionName, REGION_MIN_HELD, REGION_MARGIN_SHARE, REGION_MARGIN_MIN } from './tools/region';
export type { RegionMade } from './tools/region';
export { LIKE } from './tools/like';
export { standStructure } from './tools/structure';
export { shapesSummary } from './tools/clean';
export { isWritingMark, definitionOf, definitionsIn, artifactsIn, writingLine } from './tools/board';
export type { WritingLine } from './tools/board';
export { bestWiring, frameTemplatesFor } from './tools/frames';
export { mermaidFor } from './tools/mermaid';
export { tiedMatches, TIE_MARGIN } from './tools/which';
export type { TiedMatch } from './tools/which';

// Context (V1-PLAN §2.2, B2) — what stands beside the hand: the notations and
// concepts read over what a scope sits beside, weighted by nearness relative to
// the marks' own size, and what this hand just took there, read from the log.
// `rank` is B1's order with the context applied — a lift, never a filter, each
// with its reason — and `steadyTop` holds the top offer in one context until
// another beats it by a margin. Far from any context the order is B1's exactly.
export {
  contextAt,
  nearnessOf,
  pointNearnessOf,
  isEmptyContext,
  describeContext,
  conceptNoun,
  CONTEXT_FADE,
  RECENT_MS,
  NEIGHBOURHOOD_MAX,
  RECENT_EVENTS_MAX,
} from './context/context';
export type { ContextSource, ContextOptions, ContextNotation, ContextConcept, ContextAct, ReadContext } from './context/context';
export {
  rank,
  liftOf,
  liftTargets,
  standsOn,
  canLift,
  steadyTop,
  topOf,
  CONTEXT_LIFT_MAX,
  RECENT_SAME_TOOL,
  STEADY_MARGIN,
  STEADY_MS,
} from './context/rank';
export type { RankItem, Ranked, RankOptions, HeldTop, SteadyOptions } from './context/rank';

// Library packs (V1-PLAN §2.3, B3) — premade content shipped pre-taught, the
// way the command mark is: a board uses a pack by one `use` event in its log
// (`session.use`, `unuse`), and from it on the pack's definitions are matched
// exactly as taught ones — structural signatures read from its own drawings,
// drawn through `strokeFor` with seeded jitter — attributed to the pack
// (`library:<id>@<version>`), below this board's own on a tie, correctable,
// never on the board. A pack naming a notation puts its ports on the pen while
// in use (`followPacks`); its affinities lift what stands beside the hand
// (`ctx.affinity`). Content is code-bundled and immutable per `id@version`,
// read through `validatePack` (DATA-1); `packBench` measures a pack against
// its own drawings and a corpus of others.
export { packRef, parsePackRef, isTestPack, libraryId, definitionId, packOfId, describePackNotice, describePackRefusal, PACK_HEADS, PACK_ID } from './packs/pack';
export type { Pack, PackDefinition, PackConnector, PackHead, PackNotice } from './packs/pack';
export { validatePack, PACK_LIMITS } from './packs/validate';
export type { PackCheck, PackFault } from './packs/validate';
export { shippedPack, shippedPacks, listedPacks, packRefusals, affinityOf } from './packs/registry';
export type { PackSource } from './packs/registry';
export { libraryDefinitions, readDrawing, drawingSeed, MARK_GAP_MS } from './packs/definitions';
export type { LibraryDefinition, ScratchBoard } from './packs/definitions';
export { handLike, seedOf, drawingsOf, drawingStrokes, HAND_TREMOR, TREMOR_OF_SIZE } from './packs/synthesize';
export type { Placement } from './packs/synthesize';
export { followPacks, notationsInUse } from './packs/follow';
export type { PackBoard } from './packs/follow';
export { packBench, benchCorpus, BENCH_SEEDS, BENCH_PLACES } from './packs/bench';
export type { BenchDrawing, BenchCorpus, BenchMiss, BenchRead, PackBenchOptions, PackBenchResult } from './packs/bench';

// Agent participants — a model joins through the same channel a human uses.
export { HERE, createAgentParticipant, parseReadings, parseCode, parseFill, parseTranscripts, parseBehaviourReply, parseProgram, readingsToEdges, MAX_READINGS } from './participants/agent';
export type { BehaveResult, ProgramResult } from './participants/agent';
export type { AgentParticipant, AgentReading, InterpretResult, AskResult, GenerateResult, ReadResult, ReadLineResult, ReadLinesResult, ReadPictureResult, TranscriptReading, DrawResult, RegionFill } from './participants/agent';
export { writingLinesIn, lineIsRead, batchesOf, sheetOf, linesBrief, parseLineReadings, parsePictureLines, LINES_PER_CALL, LINE_PX, SHEET_MAX_PX, READ_LINES_PROMPT, READ_PICTURE_PROMPT } from './participants/readlines';
export type { ReadLine, LinesSheet, LinesSheetRow } from './participants/readlines';
export { seatOn, heldParticipant } from './participants/seated';
export type { Seating } from './participants/seated';
export { describeSession, describeSignature, describeRegions, describeAddressed, describeReading } from './participants/serialize';
export type { ReadingLike, DescribeReadingOptions } from './participants/serialize';
export type { Transport, AgentOptions } from './participants/agent';

// A participant answered by hand — any model, including one with no HTTP API,
// takes part through the same channel as one behind a URL.
export { createBridgeParticipant } from './participants/bridge';
export type { BridgeParticipant, BridgeRequest, BridgeOptions } from './participants/bridge';

// The seat (V1-PLAN J4): Claude Code, over MCP, as a model — every question
// parked in the room as a brief, answered by the hand, paired by the brief's
// own node id.
export {
  createSeatParticipant,
  seatBriefs,
  pendingBriefs,
  isSeatTraffic,
  refusalOf,
  seatReplyText,
  briefText,
  readBriefText,
  askedLine,
  askOf,
  SEAT_QUESTION,
  SEAT_NAME,
  SEAT_WAIT_MS,
  SEAT_RULE,
  SEAT_PICTURE,
} from './participants/seat';
export type { SeatParticipant, SeatOptions, SeatBrief, SeatReply, SeatAsk, SeatChange, ParkedSeatBrief } from './participants/seat';

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
  DECIDER_TAKE_AT,
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

// The ER diagram (V1-PLAN §3, D6): an entity is a box with its name written in
// it, a relationship a plain line between two of them, its verb beside the
// middle and a multiplicity at each end — the writing that says how many, read
// as one of four cardinalities. What makes it an ER diagram rather than the
// flowchart's or the class diagram's boxes and lines is what they lack: lines
// with no head, boxes with nothing in them but a name, a multiplicity at the
// ends. Its content is ER_TABLE, which the er@1 pack names; its erDiagram
// writer and reader are er-mermaid.ts, registered with D2's writers and D3's
// readers.
export {
  ER,
  ER_TABLE,
  readEr,
  erPortsOf,
  cardinalityOf,
  saysOf,
  END_SHARE as ER_END_SHARE,
  MULTIPLICITY_SHARE,
  MIDDLE_SHARE,
  LETTER_PX as ER_LETTER_PX,
  EVIDENCE as ER_EVIDENCE,
  PLAIN_SHARE as ER_PLAIN_SHARE,
  CLASSLIKE_PENALTY,
  HEADED_PENALTY,
} from './notations/er';
export type { ErReading, ErEntity, ErRelationship, ErEnd, ErWriting, Cardinality } from './notations/er';
// The ER diagram in Mermaid, both ways (D6): `erDiagram` written from a reading
// — entities in reading order with their names, relationships by what they
// join with the crow's-foot token each end says — and read back and drawn as
// ink the notation reads: boxes, plain lines bound at both ends, a dash beside
// each end carrying its multiplicity, the verb on the line.
export { writeEr, readErText, ER_READER, cardinalityOfToken } from './notations/er-mermaid';
export type { ErDiagramRead, ErNodeRead, ErLinkRead, DrawnErLink } from './notations/er-mermaid';

// The mind map (V1-PLAN §3, D6): a node is a circle or a box with its word
// written in it, a branch a plain line between two of them, the root the most
// central node of the tree. What makes it a mind map rather than an ER
// diagram's boxes or a molecule's bubbles is a word in every node, a hub with
// branches that go on past it, and lines with nothing beside them. Its content
// is MINDMAP_TABLE, which the mindmap@1 pack names; its `mindmap` writer and
// reader are mindmap-mermaid.ts, registered with D2's writers and D3's readers.
export {
  MINDMAP,
  MINDMAP_TABLE,
  readMindMap,
  mindMapPortsOf,
  clockwiseFromTop,
  shapeTokens,
  EVIDENCE as MINDMAP_EVIDENCE,
  PLAIN_SHARE as MINDMAP_PLAIN_SHARE,
  WRITTEN_PENALTY,
  HEADED_PENALTY as MINDMAP_HEADED_PENALTY,
  CLASSLIKE_PENALTY as MINDMAP_CLASSLIKE_PENALTY,
  LOOP_PENALTY,
  LETTER_PX as MINDMAP_LETTER_PX,
} from './notations/mindmap';
export type { MindMapReading, MindMapNode, MindMapBranch, MindMapWriting, MindMapShape } from './notations/mindmap';
// The mind map in Mermaid, both ways (D6): `mindmap` written from a reading —
// the tree as indentation, each node its id and its words in its shape's
// brackets — and read back and drawn as ink the notation reads: the root at the
// middle and the tree fanned round it, nodes with their words on their own ink,
// plain branches bound at both ends.
export { writeMindMap, readMindMapText, MINDMAP_READER } from './notations/mindmap-mermaid';
export type { MindMapDiagramRead, MindMapNodeRead, MindMapLinkRead, DrawnMindMapLink } from './notations/mindmap-mermaid';

// The garment pattern piece (M6): a piece with its grain line, fold, notches, darts and seam
// allowance, read from the geometry of ink. Its content is GARMENT_TABLE, which the garment@1
// pack names; what it means in numbers — the cutting size against the sewing size, a fold's
// half, what true size prints — is maths/garment.ts.
export {
  GARMENT,
  GARMENT_TABLE,
  readGarment,
  simplify as garmentSimplify,
  cornersOfRing as garmentCorners,
  onEdge as garmentOnEdge,
  EVIDENCE as GARMENT_EVIDENCE,
  PLAIN_SHARE as GARMENT_PLAIN_SHARE,
  PIECE_MIN_PX as GARMENT_PIECE_MIN_PX,
} from './notations/garment';
export type { GarmentReading, GarmentMark, GarmentSymbolName, OnEdge as GarmentOnEdge } from './notations/garment';

// Find (I6, PLAN-IPAD-NOTES): words across every board — folded and cut into words, what a board says
// extracted from its state with the place it stands, a query ranked across boards (a hook for the meaning
// seat to join), which boards to index again, and a thumbnail's fit. Derived; never in a log.
export {
  tokenize as searchTokenize,
  normalise as searchNormalise,
  searchEntriesOf,
  registerSearchSource,
  unregisterSearchSource,
  searchBoards,
  describeHit,
  excerptOf,
  searchKeyOf,
  stalePlan,
  thumbFit,
  SEARCH_VERSION,
  SEMANTIC_FLOOR,
  MAX_ENTRIES as SEARCH_MAX_ENTRIES,
} from './search';
export type { SearchEntry, SearchKind, SearchSource, SearchBoard, SearchHit, SearchGroup, SearchOptions } from './search';

// The semantic seat (I9, PLAN-IPAD-NOTES): an injectable transport from texts to vectors, the score function Find
// takes, *notes like this*, and a static-embedding model (Model2Vec's format) read from its own two files. Pure;
// the surface loads the files, lazily, behind the seat's own control. Derived, never in a log.
export {
  cosine as semanticCosine,
  unit as semanticUnit,
  createEmbedCache,
  createStubEmbedTransport,
  embedAll,
  EmbedError,
  EMBED_BATCH,
  semanticScorer,
  notesLike,
  groupLikes,
  wordsOfMarks,
  LIKE_MAX_CHARS,
  createStaticTransport,
  buildStaticModel,
  parseSafetensors,
  safetensorsNames,
  wordPieceOf,
  StaticModelError,
  MAX_TOKENS as STATIC_MAX_TOKENS,
} from './semantic';
export type { EmbedTransport, EmbedOptions, EmbedCache, StubEmbedOptions, SemanticFn, NoteLike, NotesSource, NotesOptions, StaticModelFiles, BuildOptions as StaticBuildOptions } from './semantic';
