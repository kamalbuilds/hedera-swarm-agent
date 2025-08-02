export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'fact' | 'procedure' | 'entity' | 'relationship';
  content: any;
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastModified: Date;
    confidence: number;
    sources: string[];
    tags: string[];
  };
  embedding?: number[];
  ipfsHash?: string;
}

export interface KnowledgeEdge {
  id: string;
  from: string;
  to: string;
  type: 'relates_to' | 'causes' | 'requires' | 'contradicts' | 'supports' | 'implements';
  weight: number;
  metadata: {
    evidence: string[];
    confidence: number;
  };
}

export interface QueryResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  relevanceScore: number;
  path?: string[];
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
  avgDegree: number;
  connectedComponents: number;
}

export interface SearchOptions {
  limit?: number;
  minConfidence?: number;
  nodeTypes?: KnowledgeNode['type'][];
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface PathFindingOptions {
  maxDepth?: number;
  minConfidence?: number;
  allowedEdgeTypes?: KnowledgeEdge['type'][];
}