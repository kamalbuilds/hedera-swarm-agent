import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { SwarmAgent } from '../../agent-sdk/src';
import { ConsensusEngine } from '../../swarm-protocol/src';
import { KnowledgeGraph } from '../../knowledge-graph/src';
import { 
  Client, 
  PrivateKey, 
  AccountId,
  TopicId,
  TopicCreateTransaction,
  Hbar
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

describe('HederaSwarm Integration Tests', () => {
  let client: Client;
  let testTopics: Record<string, string> = {};
  let agents: SwarmAgent[] = [];
  
  beforeAll(async () => {
    // Initialize Hedera client
    const accountId = AccountId.fromString(process.env.TEST_HEDERA_ACCOUNT_ID!);
    const privateKey = PrivateKey.fromString(process.env.TEST_HEDERA_PRIVATE_KEY!);
    
    client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    
    // Create test topics
    const topicNames = ['test-tasks', 'test-consensus', 'test-knowledge'];
    for (const name of topicNames) {
      const topicCreateTx = new TopicCreateTransaction()
        .setTopicMemo(`HederaSwarm Test: ${name}`)
        .setMaxTransactionFee(new Hbar(5));
      
      const txResponse = await topicCreateTx.execute(client);
      const receipt = await txResponse.getReceipt(client);
      testTopics[name] = receipt.topicId!.toString();
    }
    
    // Create test agents
    for (let i = 0; i < 3; i++) {
      const agent = new SwarmAgent({
        accountId: accountId.toString(),
        privateKey: privateKey.toString(),
        network: 'testnet',
        capabilities: ['DATA_ANALYSIS', 'REASONING'],
        aiModel: 'gpt-3.5-turbo',
        aiApiKey: process.env.TEST_OPENAI_API_KEY,
        swarmTopics: {
          tasks: testTopics['test-tasks'],
          consensus: testTopics['test-consensus'],
          knowledge: testTopics['test-knowledge']
        }
      });
      
      await agent.initialize();
      agents.push(agent);
    }
  }, 60000);
  
  afterAll(async () => {
    for (const agent of agents) {
      await agent.shutdown();
    }
  });
  
  describe('Agent Communication', () => {
    it('should allow agents to communicate via HCS', async () => {
      const messageReceived = new Promise((resolve) => {
        agents[1].on('taskAnnouncement', (task) => {
          resolve(task);
        });
      });
      
      // Agent 0 announces a task
      await agents[0].announceTask({
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Analyze test data',
        reward: 10,
        capabilities: ['DATA_ANALYSIS'],
        timeLimit: 3600,
        metadata: {}
      });
      
      const receivedTask = await messageReceived;
      expect(receivedTask).toBeDefined();
      expect(receivedTask).toHaveProperty('id', 'test-task-1');
    }, 30000);
  });
  
  describe('Consensus Protocol', () => {
    it('should reach consensus on task solutions', async () => {
      const consensus = new ConsensusEngine({
        client,
        topicId: testTopics['test-consensus'],
        agentId: 'test-agent-1',
        reputation: 100
      });
      
      // Create a proposal
      const proposalId = await consensus.createProposal({
        type: 'TASK_SOLUTION',
        data: {
          taskId: 'test-task-1',
          solution: { result: 'test solution' }
        }
      });
      
      // Agents vote
      await consensus.vote(proposalId, true, 100);
      
      // Simulate other agents voting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await consensus.getConsensusResult(proposalId);
      expect(result).toBeDefined();
      expect(result.reached).toBe(true);
    }, 30000);
  });
  
  describe('Knowledge Graph', () => {
    it('should store and retrieve knowledge', async () => {
      const kg = new KnowledgeGraph({
        client,
        topicId: testTopics['test-knowledge'],
        agentId: 'test-agent-1'
      });
      
      // Add knowledge node
      const node = await kg.addNode({
        type: 'fact',
        content: {
          statement: 'Hedera supports 10,000+ TPS',
          source: 'Official documentation'
        },
        metadata: {
          createdBy: 'test-agent-1',
          createdAt: new Date(),
          lastModified: new Date(),
          confidence: 0.95,
          sources: ['https://hedera.com/docs'],
          tags: ['hedera', 'performance']
        }
      });
      
      // Search for knowledge
      const results = await kg.semanticSearch('Hedera transaction speed', {
        limit: 5,
        minConfidence: 0.8
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].nodes).toContainEqual(expect.objectContaining({
        id: node.id
      }));
    }, 30000);
  });
  
  describe('Task Execution', () => {
    it('should execute a complete task workflow', async () => {
      // Create a task
      const task = {
        id: 'integration-test-task',
        title: 'Calculate Fibonacci',
        description: 'Calculate the 10th Fibonacci number',
        reward: 5,
        capabilities: ['DATA_ANALYSIS', 'REASONING'],
        timeLimit: 300,
        metadata: { n: 10 }
      };
      
      // Agent 0 creates the task
      await agents[0].announceTask(task);
      
      // Wait for agents to bid
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if any agent won the task
      const executingAgent = agents.find(agent => 
        agent.getActiveTasks().some(t => t.id === task.id)
      );
      
      expect(executingAgent).toBeDefined();
      
      // Wait for solution
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verify solution was submitted
      const solutions = await executingAgent!.getTaskSolutions(task.id);
      expect(solutions.length).toBeGreaterThan(0);
      expect(solutions[0]).toHaveProperty('result');
    }, 30000);
  });
});