import { EventEmitter } from 'events';
import { 
  TopicId, 
  TopicMessageSubmitTransaction, 
  Client,
  PrivateKey,
  AccountId
} from '@hashgraph/sdk';
import { 
  KnowledgeNode, 
  KnowledgeEdge, 
  QueryResult, 
  GraphStats,
  SearchOptions,
  PathFindingOptions
} from '../types';
import { IPFSStorage } from '../storage/IPFSStorage';
import { generateEmbedding, cosineSimilarity } from '../utils/embedding';
import * as tf from '@tensorflow/tfjs-node';

export class KnowledgeGraph extends EventEmitter {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();
  private embeddings: Map<string, tf.Tensor1D> = new Map();
  
  private client: Client;
  private topicId: TopicId;
  private ipfsStorage: IPFSStorage;
  private agentId: string;

  constructor(config: {
    client: Client;
    topicId: string;
    ipfsEndpoint?: string;
    agentId: string;
  }) {
    super();
    this.client = config.client;
    this.topicId = TopicId.fromString(config.topicId);
    this.ipfsStorage = new IPFSStorage(config.ipfsEndpoint);
    this.agentId = config.agentId;
  }

  async addNode(node: Omit<KnowledgeNode, 'id' | 'embedding'>): Promise<KnowledgeNode> {
    const id = this.generateNodeId(node);
    
    // Generate embedding for semantic search
    const embedding = await generateEmbedding(JSON.stringify(node.content));
    
    // Store large content in IPFS
    let ipfsHash: string | undefined;
    if (JSON.stringify(node.content).length > 1024) {
      ipfsHash = await this.ipfsStorage.store(node.content);
    }
    
    const fullNode: KnowledgeNode = {
      id,
      ...node,
      embedding: Array.from(embedding),
      ipfsHash
    };
    
    this.nodes.set(id, fullNode);
    this.embeddings.set(id, tf.tensor1d(embedding));
    
    // Publish to HCS
    await this.publishToHCS({
      type: 'ADD_NODE',
      node: fullNode,
      agentId: this.agentId
    });
    
    this.emit('nodeAdded', fullNode);
    return fullNode;
  }

  async addEdge(edge: Omit<KnowledgeEdge, 'id'>): Promise<KnowledgeEdge> {
    const id = `${edge.from}-${edge.type}-${edge.to}`;
    
    const fullEdge: KnowledgeEdge = {
      id,
      ...edge
    };
    
    this.edges.set(id, fullEdge);
    
    // Update adjacency lists
    if (!this.adjacencyList.has(edge.from)) {
      this.adjacencyList.set(edge.from, new Set());
    }
    this.adjacencyList.get(edge.from)!.add(edge.to);
    
    if (!this.reverseAdjacencyList.has(edge.to)) {
      this.reverseAdjacencyList.set(edge.to, new Set());
    }
    this.reverseAdjacencyList.get(edge.to)!.add(edge.from);
    
    // Publish to HCS
    await this.publishToHCS({
      type: 'ADD_EDGE',
      edge: fullEdge,
      agentId: this.agentId
    });
    
    this.emit('edgeAdded', fullEdge);
    return fullEdge;
  }

  async semanticSearch(query: string, options: SearchOptions = {}): Promise<QueryResult[]> {
    const queryEmbedding = await generateEmbedding(query);
    const queryTensor = tf.tensor1d(queryEmbedding);
    
    const results: Array<{ node: KnowledgeNode; score: number }> = [];
    
    for (const [nodeId, nodeTensor] of this.embeddings) {
      const node = this.nodes.get(nodeId)!;
      
      // Apply filters
      if (options.minConfidence && node.metadata.confidence < options.minConfidence) continue;
      if (options.nodeTypes && !options.nodeTypes.includes(node.type)) continue;
      if (options.tags && !options.tags.some(tag => node.metadata.tags.includes(tag))) continue;
      if (options.startDate && node.metadata.createdAt < options.startDate) continue;
      if (options.endDate && node.metadata.createdAt > options.endDate) continue;
      
      const similarity = cosineSimilarity(queryTensor, nodeTensor);
      results.push({ node, score: similarity });
    }
    
    // Sort by relevance and limit
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, options.limit || 10);
    
    // Build subgraphs around results
    const queryResults: QueryResult[] = [];
    for (const { node, score } of limitedResults) {
      const subgraph = this.getSubgraph(node.id, 2);
      queryResults.push({
        nodes: Array.from(subgraph.nodes.values()),
        edges: Array.from(subgraph.edges.values()),
        relevanceScore: score
      });
    }
    
    queryTensor.dispose();
    return queryResults;
  }

  findPath(fromId: string, toId: string, options: PathFindingOptions = {}): string[] | null {
    const maxDepth = options.maxDepth || 6;
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[] }> = [{ nodeId: fromId, path: [fromId] }];
    
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (path.length > maxDepth) continue;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      if (nodeId === toId) {
        return path;
      }
      
      const neighbors = this.adjacencyList.get(nodeId) || new Set();
      for (const neighborId of neighbors) {
        // Check edge constraints
        const edgeId = `${nodeId}-*-${neighborId}`;
        const edges = Array.from(this.edges.values()).filter(e => 
          e.from === nodeId && e.to === neighborId
        );
        
        const validEdge = edges.find(edge => {
          if (options.minConfidence && edge.metadata.confidence < options.minConfidence) return false;
          if (options.allowedEdgeTypes && !options.allowedEdgeTypes.includes(edge.type)) return false;
          return true;
        });
        
        if (validEdge) {
          queue.push({ nodeId: neighborId, path: [...path, neighborId] });
        }
      }
    }
    
    return null;
  }

  getSubgraph(centerNodeId: string, depth: number): { nodes: Map<string, KnowledgeNode>; edges: Map<string, KnowledgeEdge> } {
    const subgraphNodes = new Map<string, KnowledgeNode>();
    const subgraphEdges = new Map<string, KnowledgeEdge>();
    const visited = new Set<string>();
    
    const explore = (nodeId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (!node) return;
      
      subgraphNodes.set(nodeId, node);
      
      // Explore outgoing edges
      const outgoing = this.adjacencyList.get(nodeId) || new Set();
      for (const targetId of outgoing) {
        const edges = Array.from(this.edges.values()).filter(e => 
          e.from === nodeId && e.to === targetId
        );
        edges.forEach(edge => subgraphEdges.set(edge.id, edge));
        explore(targetId, currentDepth + 1);
      }
      
      // Explore incoming edges
      const incoming = this.reverseAdjacencyList.get(nodeId) || new Set();
      for (const sourceId of incoming) {
        const edges = Array.from(this.edges.values()).filter(e => 
          e.from === sourceId && e.to === nodeId
        );
        edges.forEach(edge => subgraphEdges.set(edge.id, edge));
        explore(sourceId, currentDepth + 1);
      }
    };
    
    explore(centerNodeId, 0);
    return { nodes: subgraphNodes, edges: subgraphEdges };
  }

  getStats(): GraphStats {
    const nodeTypes: Record<string, number> = {};
    const edgeTypes: Record<string, number> = {};
    let totalDegree = 0;
    
    for (const node of this.nodes.values()) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    }
    
    for (const edge of this.edges.values()) {
      edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
    }
    
    for (const neighbors of this.adjacencyList.values()) {
      totalDegree += neighbors.size;
    }
    
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodeTypes,
      edgeTypes,
      avgDegree: this.nodes.size > 0 ? totalDegree / this.nodes.size : 0,
      connectedComponents: this.countConnectedComponents()
    };
  }

  private countConnectedComponents(): number {
    const visited = new Set<string>();
    let components = 0;
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        components++;
        this.dfs(nodeId, visited);
      }
    }
    
    return components;
  }

  private dfs(nodeId: string, visited: Set<string>) {
    visited.add(nodeId);
    
    const neighbors = this.adjacencyList.get(nodeId) || new Set();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        this.dfs(neighborId, visited);
      }
    }
    
    const reverseNeighbors = this.reverseAdjacencyList.get(nodeId) || new Set();
    for (const neighborId of reverseNeighbors) {
      if (!visited.has(neighborId)) {
        this.dfs(neighborId, visited);
      }
    }
  }

  private generateNodeId(node: Omit<KnowledgeNode, 'id' | 'embedding'>): string {
    const content = JSON.stringify(node.content);
    const hash = require('crypto').createHash('sha256').update(content).digest('hex');
    return `node-${node.type}-${hash.substring(0, 12)}`;
  }

  private async publishToHCS(message: any) {
    const messageString = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(this.topicId)
      .setMessage(messageString)
      .setMaxChunks(10);
    
    await transaction.execute(this.client);
  }

  async loadFromIPFS(ipfsHash: string): Promise<any> {
    return await this.ipfsStorage.retrieve(ipfsHash);
  }

  exportGraph(): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    };
  }

  importGraph(data: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }) {
    for (const node of data.nodes) {
      this.nodes.set(node.id, node);
      if (node.embedding) {
        this.embeddings.set(node.id, tf.tensor1d(node.embedding));
      }
    }
    
    for (const edge of data.edges) {
      this.edges.set(edge.id, edge);
      
      if (!this.adjacencyList.has(edge.from)) {
        this.adjacencyList.set(edge.from, new Set());
      }
      this.adjacencyList.get(edge.from)!.add(edge.to);
      
      if (!this.reverseAdjacencyList.has(edge.to)) {
        this.reverseAdjacencyList.set(edge.to, new Set());
      }
      this.reverseAdjacencyList.get(edge.to)!.add(edge.from);
    }
  }
}