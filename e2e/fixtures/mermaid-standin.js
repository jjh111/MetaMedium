// A stand-in for mermaid.js, for the gate's `62c` (V1-PLAN D2's surface): the
// plumbing between the library and the board — the frame loads a library from a
// URL it is told, renders a text, reports each node as a part, says when it
// cannot read — tested with no network. It is NOT mermaid and draws no
// diagram worth looking at; `62d` runs the real library when it loads, and is
// skipped by name when it cannot.
//
// What it copies is the contract the surface reads, as recorded from
// mermaid 11: `mermaid.initialize(config)`, `mermaid.render(id, text)` giving
// `{ svg }`, a flowchart's node as `<g class="node" id="flowchart-<id>-<n>">`,
// a syntax error as a rejection whose message opens with what went wrong.
(function () {
  var known = /^\s*(flowchart|graph|classDiagram|sequenceDiagram)\b/;
  window.mermaid = {
    initialize: function () {},
    render: function (id, text) {
      var lines = String(text).split('\n');
      if (!known.test(lines[0] || '')) return Promise.reject(new Error('Parse error on line 1: not a diagram the stand-in knows'));
      var nodes = [], seen = {};
      lines.slice(1).forEach(function (l) {
        var m = /^\s*([A-Za-z_]\w*)\s*(?:\(|\[|\{|>)/.exec(l);
        if (m && !seen[m[1]]) { seen[m[1]] = 1; nodes.push(m[1]); }
      });
      var h = 60 * Math.max(1, nodes.length) + 20;
      var body = nodes.map(function (n, i) {
        return '<g class="node default" id="flowchart-' + n + '-' + i + '" transform="translate(100,' + (40 + i * 60) + ')"><rect x="-80" y="-20" width="160" height="40"></rect><text>' + n + '</text></g>';
      }).join('');
      return Promise.resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg" id="' + id + '" width="100%" style="max-width: 200px;" viewBox="0 0 200 ' + h + '">' + body + '</svg>' });
    },
  };
})();
