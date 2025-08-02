import * as tf from '@tensorflow/tfjs-node';
import { UniversalSentenceEncoder } from '@tensorflow-models/universal-sentence-encoder';
import * as use from '@tensorflow-models/universal-sentence-encoder';

let encoder: UniversalSentenceEncoder | null = null;

async function getEncoder(): Promise<UniversalSentenceEncoder> {
  if (!encoder) {
    encoder = await use.load();
  }
  return encoder;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = await getEncoder();
  const embeddings = await model.embed([text]);
  const embedding = await embeddings.array();
  embeddings.dispose();
  return embedding[0];
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const model = await getEncoder();
  const embeddings = await model.embed(texts);
  const embeddingArray = await embeddings.array();
  embeddings.dispose();
  return embeddingArray;
}

export function cosineSimilarity(a: tf.Tensor1D, b: tf.Tensor1D): number {
  const dotProduct = tf.sum(tf.mul(a, b));
  const normA = tf.sqrt(tf.sum(tf.square(a)));
  const normB = tf.sqrt(tf.sum(tf.square(b)));
  const similarity = tf.div(dotProduct, tf.mul(normA, normB));
  
  const result = similarity.dataSync()[0];
  
  dotProduct.dispose();
  normA.dispose();
  normB.dispose();
  similarity.dispose();
  
  return result;
}

export function euclideanDistance(a: tf.Tensor1D, b: tf.Tensor1D): number {
  const diff = tf.sub(a, b);
  const squaredDiff = tf.square(diff);
  const sumSquared = tf.sum(squaredDiff);
  const distance = tf.sqrt(sumSquared);
  
  const result = distance.dataSync()[0];
  
  diff.dispose();
  squaredDiff.dispose();
  sumSquared.dispose();
  distance.dispose();
  
  return result;
}

export function findKNearestNeighbors(
  query: tf.Tensor1D,
  embeddings: Map<string, tf.Tensor1D>,
  k: number,
  metric: 'cosine' | 'euclidean' = 'cosine'
): Array<{ id: string; distance: number }> {
  const distances: Array<{ id: string; distance: number }> = [];
  
  for (const [id, embedding] of embeddings) {
    const distance = metric === 'cosine' 
      ? 1 - cosineSimilarity(query, embedding)
      : euclideanDistance(query, embedding);
    
    distances.push({ id, distance });
  }
  
  distances.sort((a, b) => a.distance - b.distance);
  return distances.slice(0, k);
}

export class EmbeddingCache {
  private cache: Map<string, tf.Tensor1D> = new Map();
  private maxSize: number;
  
  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }
  
  async get(text: string): Promise<tf.Tensor1D> {
    const key = this.hash(text);
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!.clone();
    }
    
    const embedding = await generateEmbedding(text);
    const tensor = tf.tensor1d(embedding);
    
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      const firstTensor = this.cache.get(firstKey);
      firstTensor?.dispose();
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, tensor);
    return tensor.clone();
  }
  
  private hash(text: string): string {
    return require('crypto').createHash('md5').update(text).digest('hex');
  }
  
  clear() {
    for (const tensor of this.cache.values()) {
      tensor.dispose();
    }
    this.cache.clear();
  }
}