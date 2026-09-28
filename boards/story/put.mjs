// node put.mjs <file> <name> <x> <y> <w> <h> [artifactId]
// Writes a file onto the board as an artifact of its kind (svg / text / html / md),
// or as a new version of an existing artifact.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const [file, name, x, y, w, h, artifactId] = process.argv.slice(2);
const ext = path.extname(file).slice(1);
const kind = { svg: 'svg', txt: 'text', html: 'html', md: 'md', mmd: 'text' }[ext] || ext;
const args = { kind, code: fs.readFileSync(path.resolve(DIR, file), 'utf8'), name };
if (artifactId) args.artifactId = artifactId;
else args.bounds = { x: Number(x), y: Number(y), w: Number(w), h: Number(h) };
const argsFile = path.join(DIR, '.args-' + path.basename(file) + '.json');
fs.writeFileSync(argsFile, JSON.stringify(args));
process.stdout.write(execFileSync('node', [path.join(DIR, 'hand.mjs'), 'call', 'canvas_write', argsFile], { encoding: 'utf8' }));
