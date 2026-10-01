#!/usr/bin/env node
// The key for a room, from the relay's secret:
//
//   MM_RELAY_SECRET=… node cloudflare/relay/room-key.mjs claude
//   MM_RELAY_SECRET=… node cloudflare/relay/room-key.mjs '*'      # opens every room: yours, not an agent's
//
// Prints the key alone on stdout (so `MM_RELAY_KEY=$(…)` works) and, on stderr,
// what to hand an agent and the address a tab opens. The secret is read from the
// environment, never an argument, so it stays out of the shell's history and
// the process list.

import { keyForRoom, secretsOf } from './src/auth.mjs';

const room = process.argv[2];
const secret = secretsOf(process.env.MM_RELAY_SECRET)[0];
const relay = process.env.MM_RELAY || 'https://relay.dyna.ink';
if (!room || !secret) {
  process.stderr.write('usage: MM_RELAY_SECRET=… node cloudflare/relay/room-key.mjs <room|*>\n  (the secret is the one set on the Worker with `wrangler secret put MM_RELAY_SECRET`; with several listed, the first is used)\n');
  process.exit(2);
}
const key = await keyForRoom(secret, room);
process.stdout.write(key + '\n');
if (room !== '*') {
  process.stderr.write(`\nfor an agent:  MM_RELAY=${relay} MM_RELAY_KEY=<key> MM_ROOM=${room} node Demos/mcp.mjs\nfor a tab:     https://dyna.ink/app/?live=${encodeURIComponent(room)}&relay=${relay}&key=<key>\n`);
}
