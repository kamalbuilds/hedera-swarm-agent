import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { KnowledgeGraph } from '../../knowledge-graph/src/graph/KnowledgeGraph';
import { KnowledgeNode, KnowledgeEdge } from '../../knowledge-graph/src/types';
import * as tf from '@tensorflow/tfjs-node';

jest.mock('@hashgraph/sdk');
jest.mock('../../knowledge-graph/src/storage/IPFSStorage');
jest.mock('../../knowledge-graph/src/utils/embedding', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(512).fill(0).map(() => Math.random())),
  cosineSimilarity: jest.fn().mockReturnValue(0.85)
}));

describe('KnowledgeGraph Unit Tests', () => {
  let knowledgeGraph: KnowledgeGraph;
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = {
      execute: jest.fn()
    };
    
    knowledgeGraph = new KnowledgeGraph({
      client: mockClient,
      topicId: '0.0.123',
      agentId: 'test-agent'
    });
  });
  
  afterEach(() => {
    // Clean up TensorFlow tensors
    tf.engine().startScope();
    tf.engine().endScope();
  });
  
  describe('Node Management', () => {
    it('should add nodes to the graph', async () => {
      const nodeData = {
        type: 'concept' as const,
        content: {
          name: 'Blockchain',
          definition: 'A distributed ledger technology'
        },
        metadata: {
          createdBy: 'test-agent',
          createdAt: new Date(),
          lastModified: new Date(),
          confidence: 0.95,
          sources: ['wikipedia'],
          tags: ['technology', 'distributed']
        }
      };
      
      const node = await knowledgeGraph.addNode(nodeData);
      
      expect(node).toHaveProperty('id');
      expect(node.type).toBe('concept');
      expect(node.embedding).toBeDefined();
      expect(node.embedding?.length).toBe(512);
      
      const stats = knowledgeGraph.getStats();
      expect(stats.nodeCount).toBe(1);
      expect(stats.nodeTypes.concept).toBe(1);
    });
    
    it('should store large content in IPFS', async () => {
      const largeContent = {
        data: 'x'.repeat(2000) // Large content
      };
      
      const nodeData = {
        type: 'fact' as const,
        content: largeContent,
        metadata: {
          createdBy: 'test-agent',
          createdAt: new Date(),
          lastModified: new Date(),
          confidence: 0.9,
          sources: [],
          tags: []
        }
      };
      
      const node = await knowledgeGraph.addNode(nodeData);
      expect(node.ipfsHash).toBeDefined();
    });
  });
  
  describe('Edge Management', () => {
    it('should create edges between nodes', async () => {
      // Add two nodes
      const node1 = await knowledgeGraph.addNode({
        type: 'concept',
        content: { name: 'Node 1' },
        metadata: {
          createdBy: 'test-agent',
          createdAt: new Date(),
          lastModified: new Date(),
          confidence: 0.9,
          sources: [],
          tags: []
        }
      });
      
      const node2 = await knowledgeGraph.addNode({
        type: 'concept',
        content: { name: 'Node 2' },
        metadata: {
          createdBy: 'test-agent',
          createdAt: new Date(),
          lastModified: new Date(),
          confidence: 0.9,
          sources: [],
          tags: []
        }
      });
      
      // Create edge
      const edge = await knowledgeGraph.addEdge({
        from: node1.id,
        to: node2.id,
        type: 'relates_to',
        weight: 0.8,
        metadata: {
          evidence: ['test evidence'],
          confidence: 0.85
        }
      });
      
      expect(edge.id).toBe(`${node1.id}-relates_to-${node2.id}`);
      expect(edge.from).toBe(node1.id);
      expect(edge.to).toBe(node2.id);
      
      const stats = knowledgeGraph.getStats();
      expect(stats.edgeCount).toBe(1);
      expect(stats.edgeTypes.relates_to).toBe(1);
    });
  });
  
  describe('Semantic Search', () => {
    beforeEach(async () => {
      // Add test nodes
      const nodes = [
        {
          type: 'concept' as const,
          content: { name: 'Machine Learning', definition: 'AI subset' },
          metadata: {
            createdBy: 'test-agent',
            createdAt: new Date(),
            lastModified: new Date(),
            confidence: 0.95,
            sources: [],
            tags: ['ai', 'ml']
          }
        },
        {
          type: 'concept' as const,
          content: { name: 'Neural Networks', definition: 'ML architecture' },
          metadata: {
            createdBy: 'test-agent',
            createdAt: new Date(),
            lastModified: new Date(),
            confidence: 0.9,
            sources: [],
            tags: ['ai', 'ml', 'deep-learning']
          }
        },
        {
          type: 'fact' as const,
          content: { statement: 'Hedera uses hashgraph consensus' },
          metadata: {
            createdBy: 'test-agent',
            createdAt: new Date(),
            lastModified: new Date(),
            confidence: 0.85,
            sources: [],
            tags: ['hedera', 'blockchain']
          }
        }
      ];
      
      for (const nodeData of nodes) {
        await knowledgeGraph.addNode(nodeData);
      }
    });
    
    it('should perform semantic search', async () => {
      const results = await knowledgeGraph.semanticSearch('artificial intelligence', {
        limit: 2,
        minConfidence: 0.8
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].relevanceScore).toBeGreaterThan(0);
      expect(results[0].nodes.length).toBeGreaterThan(0);
    });
    
    it('should filter search results', async () => {
      const results = await knowledgeGraph.semanticSearch('technology', {
        nodeTypes: ['fact'],
        tags: ['hedera']
      });
      
      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        result.nodes.forEach(node => {
          if (node.type === 'fact') {
            expect(node.metadata.tags).toContain('hedera');
          }
        });
      });
    });
  });
  
  describe('Path Finding', () => {
    it('should find paths between nodes', async () => {
      // Create a small graph
      const nodes = [];
      for (let i = 0; i < 4; i++) {
        const node = await knowledgeGraph.addNode({
          type: 'concept',
          content: { name: `Node ${i}` },
          metadata: {
            createdBy: 'test-agent',
            createdAt: new Date(),
            lastModified: new Date(),
            confidence: 0.9,
            sources: [],
            tags: []
          }
        });
        nodes.push(node);
      }
      
      // Create edges: 0 -> 1 -> 2 -> 3
      for (let i = 0; i < 3; i++) {
        await knowledgeGraph.addEdge({
          from: nodes[i].id,
          to: nodes[i + 1].id,
          type: 'relates_to',
          weight: 0.8,
          metadata: {
            evidence: [],
            confidence: 0.85
          }
        });
      }
      
      const path = knowledgeGraph.findPath(nodes[0].id, nodes[3].id);
      expect(path).toEqual([nodes[0].id, nodes[1].id, nodes[2].id, nodes[3].id]);
    });
    
    it('should respect path constraints', async () => {
      // Create nodes
      const nodeA = await knowledgeGraph.addNode({
        type: 'concept',
        content: { name: 'A' },
        metadata: {
          createdBy: 'test-agent',
          createdAt: new Date(),
          lastModified: new Date(),
          confidence: 0.9,
          sources: [],
          tags: []
        }
      });
      
      const nodeB = await knowledgeGraph.addNode({
        type: 'concept',
        content: { name: 'B' },
        metadata: {
          createdBy: 'test-agent',
          createdAt: new Date(),
          lastModified: new Date(),
          confidence: 0.9,
          sources: [],
          tags: []
        }
      });
      
      // Create edge with low confidence
      await knowledgeGraph.addEdge({
        from: nodeA.id,
        to: nodeB.id,
        type: 'relates_to',
        weight: 0.5,
        metadata: {
          evidence: [],
          confidence: 0.3
        }
      });
      
      // Path should not be found with high confidence requirement
      const path = knowledgeGraph.findPath(nodeA.id, nodeB.id, {
        minConfidence: 0.8
      });
      
      expect(path).toBeNull();
    });
  });
  
  describe('Graph Statistics', () => {
    it('should calculate graph statistics', async () => {
      // Create a small graph
      const nodes = [];
      for (let i = 0; i < 5; i++) {
        const node = await knowledgeGraph.addNode({
          type: i % 2 === 0 ? 'concept' : 'fact',
          content: { name: `Node ${i}` },
          metadata: {
            createdBy: 'test-agent',
            createdAt: new Date(),
            lastModified: new Date(),
            confidence: 0.9,
            sources: [],
            tags: []
          }
        });
        nodes.push(node);
      }
      
      // Create some edges
      await knowledgeGraph.addEdge({
        from: nodes[0].id,
        to: nodes[1].id,
        type: 'relates_to',
        weight: 0.8,
        metadata: { evidence: [], confidence: 0.85 }
      });
      
      await knowledgeGraph.addEdge({
        from: nodes[1].id,
        to: nodes[2].id,
        type: 'causes',
        weight: 0.7,
        metadata: { evidence: [], confidence: 0.8 }
      });
      
      const stats = knowledgeGraph.getStats();
      
      expect(stats.nodeCount).toBe(5);
      expect(stats.edgeCount).toBe(2);
      expect(stats.nodeTypes.concept).toBe(3);
      expect(stats.nodeTypes.fact).toBe(2);
      expect(stats.edgeTypes.relates_to).toBe(1);
      expect(stats.edgeTypes.causes).toBe(1);
      expect(stats.avgDegree).toBeGreaterThan(0);
      expect(stats.connectedComponents).toBeGreaterThan(0);
    });
  });
  
  describe('Import/Export', () => {
    it('should export and import graph data', async () => {
      // Create some data
      const node = await knowledgeGraph.addNode({
        type: 'concept',
        content: { name: 'Test Node' },
        metadata: {
          createdBy: 'test-agent',
          createdAt: new Date(),
          lastModified: new Date(),
          confidence: 0.9,
          sources: [],
          tags: ['test']
        }
      });
      
      // Export
      const exported = knowledgeGraph.exportGraph();
      expect(exported.nodes).toHaveLength(1);
      expect(exported.edges).toHaveLength(0);
      
      // Create new graph and import
      const newGraph = new KnowledgeGraph({
        client: mockClient,
        topicId: '0.0.124',
        agentId: 'test-agent-2'
      });
      
      newGraph.importGraph(exported);
      
      const stats = newGraph.getStats();
      expect(stats.nodeCount).toBe(1);
      expect(stats.nodeTypes.concept).toBe(1);
    });
  });
});