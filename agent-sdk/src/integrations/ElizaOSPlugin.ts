import { 
    Action, 
    Plugin, 
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    Evaluator,
    Provider
} from '@elizaos/core';
import { SwarmAgent, SwarmAgentConfig } from '../core/SwarmAgent';

/**
 * ElizaOS plugin for HederaSwarm integration
 */
export class HederaSwarmPlugin implements Plugin {
    name = 'hedera-swarm';
    private swarmAgent: SwarmAgent | null = null;
    
    actions: Action[] = [
        {
            name: 'JOIN_SWARM',
            description: 'Join a HederaSwarm network as an AI agent',
            examples: [
                [
                    {
                        user: "{{user}}",
                        content: {
                            text: "Join the HederaSwarm network"
                        }
                    },
                    {
                        user: "{{assistant}}",
                        content: {
                            text: "I'll join the HederaSwarm network now."
                        }
                    }
                ]
            ],
            validate: async (runtime: IAgentRuntime) => {
                const accountId = runtime.getSetting('HEDERA_ACCOUNT_ID');
                const privateKey = runtime.getSetting('HEDERA_PRIVATE_KEY');
                const orchestratorAddress = runtime.getSetting('SWARM_ORCHESTRATOR_ADDRESS');
                
                return !!(accountId && privateKey && orchestratorAddress);
            },
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State,
                options: any,
                callback?: HandlerCallback
            ) => {
                try {
                    const config: SwarmAgentConfig = {
                        accountId: runtime.getSetting('HEDERA_ACCOUNT_ID'),
                        privateKey: runtime.getSetting('HEDERA_PRIVATE_KEY'),
                        network: (runtime.getSetting('HEDERA_NETWORK') || 'testnet') as any,
                        capabilities: this.extractCapabilities(runtime),
                        aiModel: 'gpt-4',
                        aiApiKey: runtime.getSetting('OPENAI_API_KEY'),
                        swarmTopics: {
                            tasks: runtime.getSetting('SWARM_TASK_TOPIC') || '0.0.tasks',
                            consensus: runtime.getSetting('SWARM_CONSENSUS_TOPIC') || '0.0.consensus',
                            knowledge: runtime.getSetting('SWARM_KNOWLEDGE_TOPIC') || '0.0.knowledge'
                        },
                        orchestratorAddress: runtime.getSetting('SWARM_ORCHESTRATOR_ADDRESS')
                    };
                    
                    this.swarmAgent = new SwarmAgent(config);
                    await this.swarmAgent.initialize();
                    await this.swarmAgent.joinSwarm();
                    
                    // Set up event listeners
                    this.setupEventListeners(runtime, this.swarmAgent);
                    
                    await callback?.({
                        text: `Successfully joined HederaSwarm! I'm now ready to collaborate with other agents.`,
                        content: {
                            status: 'success',
                            accountId: config.accountId,
                            capabilities: config.capabilities
                        }
                    });
                    
                    return true;
                } catch (error) {
                    console.error('Error joining swarm:', error);
                    await callback?.({
                        text: `Failed to join swarm: ${error.message}`,
                        content: { error: error.message }
                    });
                    return false;
                }
            }
        },
        {
            name: 'EXECUTE_SWARM_TASK',
            description: 'Execute a task assigned by the swarm',
            examples: [
                [
                    {
                        user: "{{user}}",
                        content: {
                            text: "Execute swarm task TASK-123"
                        }
                    },
                    {
                        user: "{{assistant}}",
                        content: {
                            text: "I'll execute the assigned swarm task now."
                        }
                    }
                ]
            ],
            validate: async (runtime: IAgentRuntime) => {
                return this.swarmAgent !== null;
            },
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State,
                options: any,
                callback?: HandlerCallback
            ) => {
                if (!this.swarmAgent) {
                    await callback?.({
                        text: "I need to join the swarm first before executing tasks.",
                        content: { error: "Not connected to swarm" }
                    });
                    return false;
                }
                
                try {
                    // Extract task ID from message
                    const taskId = this.extractTaskId(message.content);
                    if (!taskId) {
                        await callback?.({
                            text: "Please specify a task ID to execute.",
                            content: { error: "No task ID provided" }
                        });
                        return false;
                    }
                    
                    // Get task details (this would be from the swarm)
                    const task = {
                        id: taskId,
                        description: "Analyze market sentiment for DeFi protocols",
                        requiredCapabilities: ['data_analysis', 'nlp'],
                        bounty: 100,
                        deadline: Date.now() + 3600000
                    };
                    
                    const solution = await this.swarmAgent.executeTask(task);
                    
                    await callback?.({
                        text: `Task ${taskId} completed successfully! Solution submitted to the swarm.`,
                        content: {
                            taskId,
                            solution: solution.content,
                            confidence: solution.confidence
                        }
                    });
                    
                    return true;
                } catch (error) {
                    console.error('Error executing task:', error);
                    await callback?.({
                        text: `Failed to execute task: ${error.message}`,
                        content: { error: error.message }
                    });
                    return false;
                }
            }
        },
        {
            name: 'SHARE_SWARM_KNOWLEDGE',
            description: 'Share knowledge with the HederaSwarm network',
            examples: [
                [
                    {
                        user: "{{user}}",
                        content: {
                            text: "Share this market analysis with the swarm"
                        }
                    },
                    {
                        user: "{{assistant}}",
                        content: {
                            text: "I'll share this knowledge with the swarm network."
                        }
                    }
                ]
            ],
            validate: async (runtime: IAgentRuntime) => {
                return this.swarmAgent !== null;
            },
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State,
                options: any,
                callback?: HandlerCallback
            ) => {
                if (!this.swarmAgent) {
                    await callback?.({
                        text: "I need to join the swarm first before sharing knowledge.",
                        content: { error: "Not connected to swarm" }
                    });
                    return false;
                }
                
                try {
                    // Extract knowledge from conversation context
                    const knowledge = {
                        category: 'market_analysis',
                        content: message.content,
                        timestamp: Date.now(),
                        source: runtime.getSetting('AGENT_ID'),
                        tags: ['defi', 'sentiment', 'analysis']
                    };
                    
                    await this.swarmAgent.shareKnowledge(knowledge);
                    
                    await callback?.({
                        text: "Knowledge successfully shared with the swarm network!",
                        content: {
                            status: 'success',
                            category: knowledge.category,
                            tags: knowledge.tags
                        }
                    });
                    
                    return true;
                } catch (error) {
                    console.error('Error sharing knowledge:', error);
                    await callback?.({
                        text: `Failed to share knowledge: ${error.message}`,
                        content: { error: error.message }
                    });
                    return false;
                }
            }
        },
        {
            name: 'QUERY_SWARM_KNOWLEDGE',
            description: 'Query the collective knowledge of the swarm',
            examples: [
                [
                    {
                        user: "{{user}}",
                        content: {
                            text: "What does the swarm know about DeFi yield strategies?"
                        }
                    },
                    {
                        user: "{{assistant}}",
                        content: {
                            text: "Let me query the swarm's collective knowledge about DeFi yield strategies."
                        }
                    }
                ]
            ],
            validate: async (runtime: IAgentRuntime) => {
                return this.swarmAgent !== null;
            },
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State,
                options: any,
                callback?: HandlerCallback
            ) => {
                if (!this.swarmAgent) {
                    await callback?.({
                        text: "I need to join the swarm first before querying knowledge.",
                        content: { error: "Not connected to swarm" }
                    });
                    return false;
                }
                
                try {
                    const query = message.content?.text || '';
                    const results = await this.swarmAgent.queryKnowledge(query);
                    
                    if (results.length === 0) {
                        await callback?.({
                            text: "No relevant knowledge found in the swarm for your query.",
                            content: { results: [] }
                        });
                    } else {
                        await callback?.({
                            text: `Found ${results.length} relevant knowledge entries from the swarm.`,
                            content: { 
                                query,
                                results,
                                count: results.length
                            }
                        });
                    }
                    
                    return true;
                } catch (error) {
                    console.error('Error querying knowledge:', error);
                    await callback?.({
                        text: `Failed to query knowledge: ${error.message}`,
                        content: { error: error.message }
                    });
                    return false;
                }
            }
        },
        {
            name: 'CHECK_SWARM_REPUTATION',
            description: 'Check current reputation in the swarm',
            examples: [
                [
                    {
                        user: "{{user}}",
                        content: {
                            text: "What's my reputation in the swarm?"
                        }
                    },
                    {
                        user: "{{assistant}}",
                        content: {
                            text: "Let me check your current reputation score in the swarm."
                        }
                    }
                ]
            ],
            validate: async (runtime: IAgentRuntime) => {
                return this.swarmAgent !== null;
            },
            handler: async (
                runtime: IAgentRuntime,
                message: Memory,
                state: State,
                options: any,
                callback?: HandlerCallback
            ) => {
                if (!this.swarmAgent) {
                    await callback?.({
                        text: "I need to join the swarm first before checking reputation.",
                        content: { error: "Not connected to swarm" }
                    });
                    return false;
                }
                
                try {
                    const reputation = await this.swarmAgent.getReputation();
                    
                    await callback?.({
                        text: `Your current reputation in the swarm is ${reputation}/100.`,
                        content: {
                            reputation,
                            level: this.getReputationLevel(reputation)
                        }
                    });
                    
                    return true;
                } catch (error) {
                    console.error('Error checking reputation:', error);
                    await callback?.({
                        text: `Failed to check reputation: ${error.message}`,
                        content: { error: error.message }
                    });
                    return false;
                }
            }
        }
    ];
    
    evaluators: Evaluator[] = [
        {
            name: 'swarm_task_evaluator',
            description: 'Evaluates if a message is about swarm tasks',
            handler: async (runtime: IAgentRuntime, message: Memory) => {
                const text = message.content?.text?.toLowerCase() || '';
                const keywords = ['swarm', 'task', 'collaborate', 'collective', 'consensus'];
                
                const score = keywords.reduce((acc, keyword) => {
                    return acc + (text.includes(keyword) ? 0.2 : 0);
                }, 0);
                
                return Math.min(score, 1.0);
            }
        }
    ];
    
    providers: Provider[] = [
        {
            name: 'swarm_state_provider',
            description: 'Provides current swarm state information',
            get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
                if (!this.swarmAgent) {
                    return 'Not connected to swarm';
                }
                
                try {
                    const reputation = await this.swarmAgent.getReputation();
                    
                    return {
                        connected: true,
                        accountId: runtime.getSetting('HEDERA_ACCOUNT_ID'),
                        reputation,
                        capabilities: this.extractCapabilities(runtime)
                    };
                } catch (error) {
                    return {
                        connected: false,
                        error: error.message
                    };
                }
            }
        }
    ];
    
    // Helper methods
    
    private extractCapabilities(runtime: IAgentRuntime): string[] {
        const capabilities = runtime.getSetting('AGENT_CAPABILITIES');
        if (capabilities) {
            return capabilities.split(',').map(c => c.trim());
        }
        
        // Default capabilities based on agent character
        return ['reasoning', 'data_analysis', 'natural_language_processing'];
    }
    
    private extractTaskId(content: any): string | null {
        if (typeof content === 'string') {
            const match = content.match(/TASK-(\d+)/);
            return match ? match[0] : null;
        }
        
        if (content?.text) {
            const match = content.text.match(/TASK-(\d+)/);
            return match ? match[0] : null;
        }
        
        return null;
    }
    
    private getReputationLevel(reputation: number): string {
        if (reputation >= 90) return 'Elite';
        if (reputation >= 70) return 'Trusted';
        if (reputation >= 50) return 'Standard';
        if (reputation >= 30) return 'Novice';
        return 'Untested';
    }
    
    private setupEventListeners(runtime: IAgentRuntime, agent: SwarmAgent): void {
        agent.on('taskAnnounced', (task) => {
            console.log(`[HederaSwarm] New task announced: ${task.id}`);
            // Could trigger automatic bidding based on agent's strategy
        });
        
        agent.on('taskAssigned', (assignment) => {
            console.log(`[HederaSwarm] Task assigned: ${assignment.taskId}`);
            // Could notify the runtime about new assignment
        });
        
        agent.on('consensusProposal', (proposal) => {
            console.log(`[HederaSwarm] Consensus proposal received`);
            // Could participate in voting based on agent's evaluation
        });
        
        agent.on('knowledgeShared', (knowledge) => {
            console.log(`[HederaSwarm] Knowledge shared: ${knowledge.ipfsHash}`);
        });
    }
}

// Export the plugin instance
export const hederaSwarmPlugin = new HederaSwarmPlugin();