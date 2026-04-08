// Client-side API relay
// Listens for Vite HMR custom events, executes against window.__canvas,
// sends results back via HMR

export function initApiRelay() {
  if (!import.meta.hot) return;

  import.meta.hot.on('canvas-api-call', (data: { id: string; method: string; params: any }) => {
    const { id, method, params } = data;
    const api = (window as any).__canvas;

    if (!api) {
      import.meta.hot!.send('canvas-api-response', { id, error: 'Canvas API not ready' });
      return;
    }

    try {
      const fn = api[method];
      if (typeof fn !== 'function') {
        import.meta.hot!.send('canvas-api-response', { id, error: `Unknown method: ${method}` });
        return;
      }

      // Call the API method
      const result = fn(params);
      
      // Serialize (handle Maps, etc.)
      const serialized = JSON.parse(JSON.stringify(result ?? null));
      import.meta.hot!.send('canvas-api-response', { id, result: serialized });
    } catch (err: any) {
      import.meta.hot!.send('canvas-api-response', { id, error: err.message });
    }
  });

  console.log('%c🔌 LLM API relay active', 'color: #8B5CF6');
  console.log('  POST http://localhost:PORT/api/canvas');
  console.log('  Body: { "method": "getGraph", "params": {} }');
}
