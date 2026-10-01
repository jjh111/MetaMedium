// What reading a held group costs when the group is a picture traced into ink
// (V1-PLAN I2): press and hold on a traced picture holds its thousand strokes,
// and the panel and the field read them — `session.read` (relations, roles,
// concepts) and `notationsOf` (every notation, with the heads at every
// connector's ends). Measured on `bench/board.mjs`'s `importedBoard`.
//
//     node metamedium-core/bench/scope.mjs --strokes=1000                       # src/ built now
//     MM_CORE_BUNDLE=/path/to/older.node.mjs node metamedium-core/bench/scope.mjs --core=bundle --strokes=1000

import { loadCore, ms, args } from './lib.mjs';
import { importedBoard } from './board.mjs';

const a = args();
const strokes = Number(a.strokes ?? 1000);
const { core } = await loadCore(a.core || 'source');
const board = importedBoard(core, { pictures: 3, strokesEach: strokes, svgs: 2 });
const s = core.createSession();
s.load(board.events);
const st = s.getState();
const ids = st.contentIds.filter((id) => !st.artifacts.includes(id)).slice(0, strokes);
const time = (fn) => { const t = performance.now(); fn(); return performance.now() - t; };
console.log(`a held group of ${ids.length} strokes (one picture's, on a board of ${board.marks} traced strokes and ${st.artifacts.length} artifacts)`);
console.log(`  session.read  ${ms(time(() => s.read(ids)))}`);
console.log(`  notationsOf   ${ms(time(() => core.notationsOf(st, ids)))}`);
