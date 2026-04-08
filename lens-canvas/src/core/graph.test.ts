import { describe, it, expect, beforeEach } from 'vitest';
import { addNode, removeNode, updateNode, getNode, getAllNodes, addEdge, removeEdge, getAllEdges, getEdgesFor, clearGraph, inferDataType, generateDescriptor, getGraph } from './graph';

beforeEach(() => {
  clearGraph();
});

describe('graph store', () => {
  describe('addNode', () => {
    it('creates a node with defaults', () => {
      const node = addNode({ data: { hello: 'world' } });
      expect(node.id).toBeTruthy();
      expect(node.dataType).toBe('json');
      expect(node.lens).toBeUndefined(); // undefined = MoE decides
      expect(node.source).toBe('human');
      expect(node.abstractionLevel).toBe('descriptor');
      expect(node.position.width).toBe(240);
    });

    it('respects provided fields', () => {
      const node = addNode({
        data: 'test',
        dataType: 'text',
        source: 'llm',
        position: { x: 50, y: 50, width: 300, height: 200 },
      });
      expect(node.dataType).toBe('text');
      expect(node.source).toBe('llm');
      expect(node.position.x).toBe(50);
    });
  });

  describe('getNode / getAllNodes', () => {
    it('retrieves by id', () => {
      const n = addNode({ data: 42 });
      expect(getNode(n.id)).toBe(n);
    });

    it('returns all nodes', () => {
      addNode({ data: 1 });
      addNode({ data: 2 });
      expect(getAllNodes()).toHaveLength(2);
    });
  });

  describe('updateNode', () => {
    it('merges fields and updates timestamp', () => {
      const n = addNode({ data: 'hello' });
      const original = n.updated;
      const updated = updateNode(n.id, { meaning: 'greeting' });
      expect(updated!.meaning).toBe('greeting');
      expect(updated!.data).toBe('hello');
      expect(updated!.updated).toBeGreaterThanOrEqual(original);
    });

    it('returns undefined for missing node', () => {
      expect(updateNode('nonexistent', {})).toBeUndefined();
    });
  });

  describe('removeNode', () => {
    it('removes node and connected edges', () => {
      const a = addNode({ data: 'a' });
      const b = addNode({ data: 'b' });
      addEdge({ from: a.id, to: b.id });
      
      expect(removeNode(a.id)).toBe(true);
      expect(getNode(a.id)).toBeUndefined();
      expect(getAllEdges()).toHaveLength(0);
    });

    it('returns false for missing node', () => {
      expect(removeNode('nonexistent')).toBe(false);
    });
  });

  describe('edges', () => {
    it('creates and queries edges', () => {
      const a = addNode({ data: 'a' });
      const b = addNode({ data: 'b' });
      const edge = addEdge({ from: a.id, to: b.id, type: 'dependency', label: 'fallback' });
      
      expect(edge.from).toBe(a.id);
      expect(edge.type).toBe('dependency');
      expect(getEdgesFor(a.id)).toHaveLength(1);
      expect(getEdgesFor(b.id)).toHaveLength(1);
    });

    it('removes edges', () => {
      const a = addNode({ data: 'a' });
      const b = addNode({ data: 'b' });
      const e = addEdge({ from: a.id, to: b.id });
      expect(removeEdge(e.id)).toBe(true);
      expect(getAllEdges()).toHaveLength(0);
    });
  });

  describe('getGraph', () => {
    it('returns full state', () => {
      addNode({ data: 'x' });
      addNode({ data: 'y' });
      const g = getGraph();
      expect(g.nodes).toHaveLength(2);
      expect(g.edges).toHaveLength(0);
    });
  });
});

describe('inferDataType', () => {
  it('detects JSON strings', () => {
    expect(inferDataType('{"a":1}')).toBe('json');
    expect(inferDataType('[1,2,3]')).toBe('json');
  });
  it('detects code', () => {
    expect(inferDataType('const x = 1;')).toBe('code');
    expect(inferDataType('import foo from "bar"')).toBe('code');
  });
  it('detects plain text', () => {
    expect(inferDataType('hello world')).toBe('text');
  });
  it('detects objects', () => {
    expect(inferDataType({ a: 1 })).toBe('json');
  });
  it('detects number arrays', () => {
    expect(inferDataType([1, 2, 3])).toBe('number-array');
  });
});

describe('generateDescriptor', () => {
  it('describes JSON objects', () => {
    const desc = generateDescriptor({ name: 'test', value: 42 }, 'json');
    expect(desc).toContain('2 keys');
    expect(desc).toContain('name');
  });
  it('describes text', () => {
    const desc = generateDescriptor('hello world foo', 'text');
    expect(desc).toContain('3 words');
  });
  it('describes number arrays', () => {
    const desc = generateDescriptor([1, 5, 3], 'number-array');
    expect(desc).toContain('3 values');
    expect(desc).toContain('[1..5]');
  });
});
