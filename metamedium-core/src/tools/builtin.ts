// The tools the canvas ships with, registered in the order the field offers
// them — which is the tie-break between two equally likely offers, and the
// order the field always built its pills in (V1-PLAN B1). A new tool is one
// file beside these and one line here.

import { registerTool } from './registry';
import { CORRECT } from './correct';
import { TEXT } from './text';
import { NAME } from './name';
import { LABEL } from './label';
import { TIDY } from './tidy';
import { CONTROL } from './control';
import { CLEAN } from './clean';
import { GRAPH3D } from './graph3d';
import { FRAMES } from './frames';
import { TEXT_EDIT } from './text-edit';
import { VERBS } from './verbs';
import { CLOCKS } from './clocks';
import { READ } from './read';
import { WHAT } from './what';
import { DUPLICATE } from './duplicate';
import { KEEP } from './keep';
import { STRUCTURE } from './structure';
import { MATHS } from './maths';
import { MERMAID } from './mermaid';
import { MERMAID_DRAW } from './mermaid-draw';
import { ROUTE } from './route';
import { WHICH } from './which';

export const BUILTIN_TOOLS = [CORRECT, TEXT, NAME, LABEL, TIDY, CONTROL, CLEAN, GRAPH3D, FRAMES, TEXT_EDIT, VERBS, CLOCKS, READ, WHAT, DUPLICATE, KEEP, STRUCTURE, MATHS, MERMAID, MERMAID_DRAW, ROUTE, WHICH] as const;

registerTool(CORRECT);
registerTool(TEXT);
registerTool(NAME);
registerTool(LABEL);
registerTool(TIDY);
registerTool(CONTROL);
registerTool(CLEAN);
registerTool(GRAPH3D);
registerTool(FRAMES);
registerTool(TEXT_EDIT);
registerTool(VERBS);
registerTool(CLOCKS);
registerTool(READ);
registerTool(WHAT);
registerTool(DUPLICATE);
registerTool(KEEP);
registerTool(STRUCTURE);
registerTool(MATHS);
registerTool(MERMAID);
registerTool(MERMAID_DRAW);
registerTool(ROUTE);
registerTool(WHICH);
