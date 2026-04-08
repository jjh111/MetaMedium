// HTTP API handler for LLM interaction
// Injected as Vite dev server middleware
// JSON-RPC style: POST /api/canvas with { method, params }

import type { ViteDevServer } from 'vite';

// The graph module is imported dynamically since this runs in Node, not browser
// We'll use a shared state bridge via WebSocket instead
// For PoC: the API works through the browser's window.__canvas via a simple relay

export function canvasApiPlugin() {
  return {
    name: 'canvas-api',
    configureServer(server: ViteDevServer) {
      // Inject a script that exposes a simple fetch-based API endpoint
      // This uses Vite's WebSocket to relay commands to the browser
      server.middlewares.use('/api/canvas', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'POST only' }));
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          const { method, params } = JSON.parse(body);
          
          // Relay to browser via Vite's HMR WebSocket
          const id = `api_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          
          // Send command to all connected clients
          server.ws.send({
            type: 'custom',
            event: 'canvas-api-call',
            data: { id, method, params },
          });

          // Wait for response (with timeout)
          const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              cleanup();
              reject(new Error('Timeout waiting for browser response'));
            }, 5000);

            function handler(data: any) {
              if (data.id === id) {
                cleanup();
                if (data.error) reject(new Error(data.error));
                else resolve(data.result);
              }
            }

            function cleanup() {
              clearTimeout(timeout);
              server.ws.off('canvas-api-response', handler);
            }

            server.ws.on('canvas-api-response', handler);
          });

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ result }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}
