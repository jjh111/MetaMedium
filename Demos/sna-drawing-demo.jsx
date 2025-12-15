import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- CORE GRAPH STATE ---
const useGraph = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  const addNode = useCallback((node) => {
    setNodes(prev => [...prev, { id: Date.now(), label: '', x: node.x, y: node.y, ...node }]);
  }, []);
  
  const updateNode = useCallback((id, updates) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);
  
  const removeNode = useCallback((id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
  }, []);
  
  const addEdge = useCallback((source, target) => {
    if (source === target) return;
    setEdges(prev => {
      const exists = prev.some(e => 
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source)
      );
      if (exists) return prev;
      return [...prev, { id: Date.now(), source, target }];
    });
  }, []);
  
  const removeEdge = useCallback((source, target) => {
    setEdges(prev => prev.filter(e => 
      !((e.source === source && e.target === target) ||
        (e.source === target && e.target === source))
    ));
  }, []);
  
  return { nodes, edges, setNodes, setEdges, addNode, updateNode, removeNode, addEdge, removeEdge };
};

// --- GESTURE RECOGNITION ---
const analyzeStroke = (points, nodes, nodeRadius) => {
  if (points.length < 8) return { type: 'none' };
  
  const first = points[0];
  const last = points[points.length - 1];
  const dist = Math.hypot(last.x - first.x, last.y - first.y);
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const avgRadius = ((maxX - minX) + (maxY - minY)) / 4;
  
  const isClosed = dist < avgRadius * 0.9;
  
  const radii = points.map(p => Math.hypot(p.x - centerX, p.y - centerY));
  const avgR = radii.reduce((a, b) => a + b, 0) / radii.length;
  const variance = radii.reduce((a, r) => a + Math.pow(r - avgR, 2), 0) / radii.length;
  const circularity = 1 - Math.min(1, Math.sqrt(variance) / avgR);
  
  if (isClosed && circularity > 0.45 && avgRadius > 12) {
    return { type: 'circle', x: centerX, y: centerY, radius: Math.max(25, Math.min(40, avgRadius)) };
  }
  
  const hitRadius = nodeRadius + 20;
  const startNode = nodes.find(n => Math.hypot(n.x - first.x, n.y - first.y) < hitRadius);
  const endNode = nodes.find(n => Math.hypot(n.x - last.x, n.y - last.y) < hitRadius);
  
  if (startNode && endNode && startNode.id !== endNode.id) {
    return { type: 'edge', source: startNode.id, target: endNode.id };
  }
  
  return { type: 'none' };
};

// --- CANVAS COMPONENT ---
const NetworkCanvas = ({ nodes, edges, onAddNode, onUpdateNode, onRemoveNode, onAddEdge }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 320 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [editingNode, setEditingNode] = useState(null);
  const [inputPos, setInputPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef(null);
  
  const nodeRadius = 28;
  
  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        setCanvasSize({ width, height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }, []);
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Subtle dot grid
    ctx.fillStyle = '#ddd8d2';
    for (let x = 20; x < canvas.width; x += 25) {
      for (let y = 20; y < canvas.height; y += 25) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (source && target) {
        ctx.beginPath();
        ctx.strokeStyle = '#5a7d6d';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        
        // Connection dots
        [source, target].forEach(node => {
          const other = node === source ? target : source;
          const angle = Math.atan2(other.y - node.y, other.x - node.x);
          const px = node.x + Math.cos(angle) * nodeRadius;
          const py = node.y + Math.sin(angle) * nodeRadius;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#5a7d6d';
          ctx.fill();
        });
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x + 2, node.y + 2, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = editingNode === node.id ? '#fff' : '#faf8f5';
      ctx.fill();
      ctx.strokeStyle = editingNode === node.id ? '#c97856' : '#2d3a35';
      ctx.lineWidth = editingNode === node.id ? 2.5 : 1.5;
      ctx.stroke();
      
      if (node.label && editingNode !== node.id) {
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = '#2d3a35';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = node.label.length > 6 ? node.label.slice(0, 5) + '…' : node.label;
        ctx.fillText(text, node.x, node.y);
      }
    });
    
    // Current stroke
    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#c97856';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      currentStroke.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }, [nodes, edges, currentStroke, editingNode, nodeRadius]);
  
  useEffect(() => { draw(); }, [draw, canvasSize]);
  
  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    const clickedNode = nodes.find(n => Math.hypot(n.x - point.x, n.y - point.y) < nodeRadius);
    
    if (clickedNode && e.detail === 2) {
      setEditingNode(clickedNode.id);
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      setInputPos({
        x: (clickedNode.x / canvas.width) * rect.width + rect.left - 35,
        y: (clickedNode.y / canvas.height) * rect.height + rect.top - 10
      });
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    
    setIsDrawing(true);
    setCurrentStroke([point]);
  }, [getCanvasPoint, nodes, nodeRadius]);
  
  const continueDrawing = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    setCurrentStroke(prev => [...prev, point]);
  }, [isDrawing, getCanvasPoint]);
  
  const endDrawing = useCallback((e) => {
    if (!isDrawing) return;
    e?.preventDefault();
    setIsDrawing(false);
    
    const result = analyzeStroke(currentStroke, nodes, nodeRadius);
    
    if (result.type === 'circle') {
      const newId = Date.now();
      onAddNode({ id: newId, x: result.x, y: result.y, label: '' });
      setEditingNode(newId);
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      setInputPos({
        x: (result.x / canvas.width) * rect.width + rect.left - 35,
        y: (result.y / canvas.height) * rect.height + rect.top - 10
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (result.type === 'edge') {
      onAddEdge(result.source, result.target);
    }
    
    setCurrentStroke([]);
  }, [isDrawing, currentStroke, nodes, nodeRadius, onAddNode, onAddEdge]);
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        flex: 1, 
        minWidth: 0, 
        minHeight: '280px',
        position: 'relative',
        background: '#f0ede8',
        borderRadius: '6px',
        border: '1.5px solid #2d3a35',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          touchAction: 'none'
        }}
        onMouseDown={startDrawing}
        onMouseMove={continueDrawing}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={continueDrawing}
        onTouchEnd={endDrawing}
        onTouchCancel={endDrawing}
      />
      {editingNode && (
        <input
          ref={inputRef}
          type="text"
          value={nodes.find(n => n.id === editingNode)?.label || ''}
          onChange={(e) => onUpdateNode(editingNode, { label: e.target.value })}
          onBlur={() => setEditingNode(null)}
          onKeyDown={(e) => e.key === 'Enter' && setEditingNode(null)}
          style={{
            position: 'fixed',
            left: inputPos.x,
            top: inputPos.y,
            width: '70px',
            padding: '3px 5px',
            fontSize: '11px',
            fontFamily: 'ui-monospace, monospace',
            border: '2px solid #c97856',
            borderRadius: '3px',
            background: '#fff',
            textAlign: 'center',
            outline: 'none'
          }}
        />
      )}
    </div>
  );
};

// --- TABLE COMPONENT ---
const NetworkTable = ({ nodes, edges, onAddNode, onUpdateNode, onRemoveNode, onAddEdge, onRemoveEdge }) => {
  const [newLabel, setNewLabel] = useState('');
  const [edgeSrc, setEdgeSrc] = useState('');
  const [edgeTgt, setEdgeTgt] = useState('');
  
  const getConnections = (nodeId) => edges
    .filter(e => e.source === nodeId || e.target === nodeId)
    .map(e => e.source === nodeId ? e.target : e.source);
  
  const handleAddNode = () => {
    if (newLabel.trim()) {
      onAddNode({ label: newLabel.trim(), x: 60 + Math.random() * 200, y: 60 + Math.random() * 150 });
      setNewLabel('');
    }
  };
  
  const handleAddEdge = () => {
    if (edgeSrc && edgeTgt && edgeSrc !== edgeTgt) {
      onAddEdge(parseInt(edgeSrc), parseInt(edgeTgt));
      setEdgeSrc(''); setEdgeTgt('');
    }
  };
  
  const inputStyle = {
    flex: 1, minWidth: 0, padding: '5px 7px', fontSize: '11px',
    fontFamily: 'ui-monospace, monospace', border: '1px solid #ccc', borderRadius: '3px'
  };
  
  const btnStyle = {
    padding: '5px 10px', background: '#5a7d6d', color: '#fff', border: 'none',
    borderRadius: '3px', cursor: 'pointer', fontFamily: 'ui-monospace, monospace', fontSize: '10px', flexShrink: 0
  };
  
  return (
    <div style={{
      width: '220px', flexShrink: 0, background: '#faf8f5', borderRadius: '6px',
      border: '1.5px solid #2d3a35', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden'
    }}>
      {/* Add Node */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={newLabel} onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddNode()}
          placeholder="+ Node name" style={inputStyle}
        />
        <button onClick={handleAddNode} style={btnStyle}>Add</button>
      </div>
      
      {/* Add Edge */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={edgeSrc} onChange={e => setEdgeSrc(e.target.value)} style={{ ...inputStyle, padding: '4px' }}>
          <option value="">From…</option>
          {nodes.map(n => <option key={n.id} value={n.id}>{n.label || '○'}</option>)}
        </select>
        <span style={{ color: '#999', fontSize: '10px' }}>→</span>
        <select value={edgeTgt} onChange={e => setEdgeTgt(e.target.value)} style={{ ...inputStyle, padding: '4px' }}>
          <option value="">To…</option>
          {nodes.map(n => <option key={n.id} value={n.id}>{n.label || '○'}</option>)}
        </select>
        <button onClick={handleAddEdge} style={btnStyle}>Link</button>
      </div>
      
      {/* Node List */}
      <div style={{ flex: 1, overflow: 'auto', borderTop: '1px solid #e5e2dc', paddingTop: '8px' }}>
        {nodes.length === 0 ? (
          <p style={{ fontSize: '10px', color: '#999', margin: 0, fontStyle: 'italic' }}>Draw circles on canvas…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {nodes.map(node => {
              const conns = getConnections(node.id);
              return (
                <div key={node.id} style={{ background: '#f0ede8', padding: '7px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input
                      value={node.label} onChange={e => onUpdateNode(node.id, { label: e.target.value })}
                      placeholder="…" style={{ flex: 1, minWidth: 0, padding: '2px 4px', fontSize: '11px',
                        fontFamily: 'ui-monospace, monospace', fontWeight: 600, border: 'none', background: 'transparent' }}
                    />
                    <button onClick={() => onRemoveNode(node.id)} style={{
                      padding: '1px 5px', background: '#c97856', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '10px'
                    }}>×</button>
                  </div>
                  {conns.length > 0 && (
                    <div style={{ marginTop: '3px', color: '#666', fontFamily: 'ui-monospace, monospace', fontSize: '10px' }}>
                      → {conns.map((cId, i) => {
                        const c = nodes.find(n => n.id === cId);
                        return (
                          <span key={cId}>
                            <span onClick={() => onRemoveEdge(node.id, cId)} 
                              style={{ color: '#5a7d6d', cursor: 'pointer', textDecoration: 'underline dotted' }}
                              title="Click to disconnect">
                              {c?.label || '○'}
                            </span>{i < conns.length - 1 ? ', ' : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Stats */}
      <div style={{ fontSize: '9px', color: '#999', fontFamily: 'ui-monospace, monospace', borderTop: '1px solid #e5e2dc', paddingTop: '6px' }}>
        {nodes.length} nodes · {edges.length} edges
      </div>
    </div>
  );
};

// --- MAIN APP ---
export default function SocialNetworkDemo() {
  const graph = useGraph();
  
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '12px', height: '100%', minHeight: '320px', maxWidth: '720px',
      margin: '0 auto', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box'
    }}>
      <div style={{ fontSize: '10px', color: '#777', fontFamily: 'ui-monospace, monospace' }}>
        Draw ◯ to add nodes · Draw lines between nodes to connect · Double-click to edit label
      </div>
      <div style={{ display: 'flex', gap: '10px', flex: 1, minHeight: 0 }}>
        <NetworkCanvas
          nodes={graph.nodes} edges={graph.edges}
          onAddNode={graph.addNode} onUpdateNode={graph.updateNode}
          onRemoveNode={graph.removeNode} onAddEdge={graph.addEdge}
        />
        <NetworkTable
          nodes={graph.nodes} edges={graph.edges}
          onAddNode={graph.addNode} onUpdateNode={graph.updateNode}
          onRemoveNode={graph.removeNode} onAddEdge={graph.addEdge} onRemoveEdge={graph.removeEdge}
        />
      </div>
    </div>
  );
}
