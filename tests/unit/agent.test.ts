import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SwarmAgent } from '../../agent-sdk/src/core/SwarmAgent';
import { Task, Solution } from '../../agent-sdk/src/types';

jest.mock('@hashgraph/sdk');
jest.mock('openai');

describe('SwarmAgent Unit Tests', () => {
  let agent: SwarmAgent;
  
  beforeEach(() => {
    agent = new SwarmAgent({
      accountId: '0.0.12345',
      privateKey: 'mock-private-key',
      network: 'testnet',
      capabilities: ['DATA_ANALYSIS', 'REASONING'],
      aiModel: 'gpt-3.5-turbo',
      aiApiKey: 'mock-api-key',
      swarmTopics: {
        tasks: '0.0.123',
        consensus: '0.0.124',
        knowledge: '0.0.125'
      }
    });
  });
  
  describe('Task Evaluation', () => {
    it('should correctly evaluate task compatibility', () => {
      const compatibleTask: Task = {
        id: 'task-1',
        title: 'Data Analysis Task',
        description: 'Analyze dataset',
        reward: 10,
        capabilities: ['DATA_ANALYSIS'],
        timeLimit: 3600,
        metadata: {}
      };
      
      const incompatibleTask: Task = {
        id: 'task-2',
        title: 'Security Audit',
        description: 'Audit smart contract',
        reward: 20,
        capabilities: ['SECURITY_ANALYSIS'],
        timeLimit: 7200,
        metadata: {}
      };
      
      expect(agent.canExecuteTask(compatibleTask)).toBe(true);
      expect(agent.canExecuteTask(incompatibleTask)).toBe(false);
    });
    
    it('should calculate bid amount based on task complexity', () => {
      const simpleTask: Task = {
        id: 'simple-task',
        title: 'Simple Analysis',
        description: 'Basic data analysis',
        reward: 10,
        capabilities: ['DATA_ANALYSIS'],
        timeLimit: 1800,
        metadata: {}
      };
      
      const complexTask: Task = {
        id: 'complex-task',
        title: 'Complex Analysis',
        description: 'Advanced machine learning analysis with multiple datasets',
        reward: 50,
        capabilities: ['DATA_ANALYSIS', 'MACHINE_LEARNING'],
        timeLimit: 10800,
        metadata: { datasets: 5, models: 3 }
      };
      
      const simpleBid = agent.calculateBid(simpleTask);
      const complexBid = agent.calculateBid(complexTask);
      
      expect(complexBid).toBeGreaterThan(simpleBid);
      expect(simpleBid).toBeGreaterThan(0);
      expect(simpleBid).toBeLessThanOrEqual(simpleTask.reward);
    });
  });
  
  describe('Solution Generation', () => {
    it('should generate solution structure', async () => {
      const task: Task = {
        id: 'test-task',
        title: 'Test Task',
        description: 'Generate test solution',
        reward: 10,
        capabilities: ['REASONING'],
        timeLimit: 300,
        metadata: { type: 'test' }
      };
      
      const mockSolution = {
        result: 'test result',
        confidence: 0.85,
        methodology: 'test methodology'
      };
      
      // Mock AI response
      jest.spyOn(agent as any, 'callAI').mockResolvedValue(mockSolution);
      
      const solution = await agent.generateSolution(task);
      
      expect(solution).toHaveProperty('taskId', task.id);
      expect(solution).toHaveProperty('agentId');
      expect(solution).toHaveProperty('result');
      expect(solution).toHaveProperty('confidence');
      expect(solution).toHaveProperty('timestamp');
    });
  });
  
  describe('Reputation Management', () => {
    it('should update reputation based on task outcomes', () => {
      const initialReputation = agent.getReputation();
      
      // Successful task
      agent.updateReputation(10);
      expect(agent.getReputation()).toBe(initialReputation + 10);
      
      // Failed task
      agent.updateReputation(-5);
      expect(agent.getReputation()).toBe(initialReputation + 5);
      
      // Reputation should not go below 0
      agent.updateReputation(-1000);
      expect(agent.getReputation()).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Task Queue Management', () => {
    it('should properly manage task queue', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'First task',
          reward: 10,
          capabilities: ['DATA_ANALYSIS'],
          timeLimit: 3600,
          metadata: {}
        },
        {
          id: 'task-2',
          title: 'Task 2',
          description: 'Second task',
          reward: 20,
          capabilities: ['DATA_ANALYSIS'],
          timeLimit: 3600,
          metadata: {}
        }
      ];
      
      // Add tasks to queue
      tasks.forEach(task => agent.queueTask(task));
      
      const queuedTasks = agent.getQueuedTasks();
      expect(queuedTasks).toHaveLength(2);
      expect(queuedTasks[0].id).toBe('task-2'); // Higher reward first
      
      // Process task
      const nextTask = agent.getNextTask();
      expect(nextTask?.id).toBe('task-2');
      expect(agent.getQueuedTasks()).toHaveLength(1);
    });
  });
  
  describe('Collaboration', () => {
    it('should identify potential collaborators', () => {
      const task: Task = {
        id: 'collab-task',
        title: 'Collaborative Task',
        description: 'Requires multiple capabilities',
        reward: 50,
        capabilities: ['DATA_ANALYSIS', 'SECURITY_ANALYSIS', 'MACHINE_LEARNING'],
        timeLimit: 7200,
        metadata: {}
      };
      
      const missingCapabilities = agent.getMissingCapabilities(task);
      expect(missingCapabilities).toContain('SECURITY_ANALYSIS');
      expect(missingCapabilities).toContain('MACHINE_LEARNING');
      expect(missingCapabilities).not.toContain('DATA_ANALYSIS');
    });
  });
});