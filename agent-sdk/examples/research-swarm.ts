/**
 * Example: Research Swarm Agent
 * 
 * This example demonstrates how to create an AI agent that participates
 * in research tasks within the HederaSwarm network.
 */

import { SwarmAgent, SwarmAgentConfig } from '../src/core/SwarmAgent';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    // Configure the research agent
    const config: SwarmAgentConfig = {
        accountId: process.env.HEDERA_ACCOUNT_ID!,
        privateKey: process.env.HEDERA_PRIVATE_KEY!,
        network: 'testnet',
        capabilities: [
            'literature_review',
            'hypothesis_generation',
            'data_analysis',
            'statistical_modeling',
            'research_synthesis'
        ],
        aiModel: 'gpt-4',
        aiApiKey: process.env.OPENAI_API_KEY,
        swarmTopics: {
            tasks: process.env.SWARM_TASK_TOPIC || '0.0.5000001',
            consensus: process.env.SWARM_CONSENSUS_TOPIC || '0.0.5000002',
            knowledge: process.env.SWARM_KNOWLEDGE_TOPIC || '0.0.5000003'
        },
        orchestratorAddress: process.env.SWARM_ORCHESTRATOR_ADDRESS || '0.0.5000000'
    };
    
    // Create and initialize the agent
    const researchAgent = new SwarmAgent(config);
    console.log('🔬 Initializing Research Agent...');
    
    try {
        await researchAgent.initialize();
        console.log('✅ Research Agent initialized');
        
        // Join the swarm
        console.log('🐝 Joining the swarm...');
        await researchAgent.joinSwarm();
        console.log('✅ Successfully joined the swarm');
        
        // Set up event handlers
        setupEventHandlers(researchAgent);
        
        // Example: Share initial knowledge
        await shareResearchKnowledge(researchAgent);
        
        // Example: Query existing knowledge
        await queryResearchTopics(researchAgent);
        
        // Keep the agent running
        console.log('🚀 Research Agent is now active and listening for tasks...');
        console.log('Press Ctrl+C to stop');
        
        // Prevent the process from exiting
        process.on('SIGINT', async () => {
            console.log('\n👋 Shutting down Research Agent...');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

function setupEventHandlers(agent: SwarmAgent) {
    // Handle new task announcements
    agent.on('taskAnnounced', async (task) => {
        console.log(`\n📋 New Research Task: ${task.id}`);
        console.log(`   Description: ${task.description}`);
        console.log(`   Bounty: ${task.bounty} HBAR`);
        console.log(`   Deadline: ${new Date(task.deadline).toLocaleString()}`);
        
        // Agent will automatically bid if it has the required capabilities
    });
    
    // Handle task assignments
    agent.on('taskAssigned', async (assignment) => {
        console.log(`\n🎯 Assigned to task: ${assignment.taskId}`);
        console.log('   Starting research process...');
    });
    
    // Handle bid submissions
    agent.on('bidSubmitted', (bid) => {
        console.log(`\n💰 Submitted bid for task ${bid.taskId}`);
        console.log(`   Confidence: ${(bid.confidence * 100).toFixed(1)}%`);
        console.log(`   Requested reward: ${bid.requestedReward} HBAR`);
    });
    
    // Handle task completion
    agent.on('taskCompleted', (result) => {
        console.log(`\n✅ Completed task: ${result.taskId}`);
        console.log(`   Solution confidence: ${(result.solution.confidence * 100).toFixed(1)}%`);
    });
    
    // Handle knowledge sharing
    agent.on('knowledgeShared', (knowledge) => {
        console.log(`\n📚 Shared knowledge with swarm`);
        console.log(`   IPFS Hash: ${knowledge.ipfsHash}`);
        console.log(`   Quality Score: ${(knowledge.quality * 100).toFixed(1)}%`);
    });
    
    // Handle consensus proposals
    agent.on('consensusProposal', async (proposal) => {
        console.log(`\n🗳️ Consensus proposal received`);
        console.log(`   Evaluating proposal...`);
        
        // In a real implementation, the agent would evaluate and vote
    });
}

async function shareResearchKnowledge(agent: SwarmAgent) {
    console.log('\n📤 Sharing initial research knowledge...');
    
    // Example: Share a research finding
    const researchFinding = {
        category: 'research_methodology',
        title: 'Improved Statistical Analysis for DeFi Protocols',
        content: {
            abstract: 'A novel approach to analyzing yield farming strategies using Bayesian inference',
            methodology: 'Bayesian statistical modeling with MCMC sampling',
            findings: [
                'Significant correlation between TVL and yield sustainability',
                'Risk-adjusted returns follow a power law distribution',
                'Optimal rebalancing frequency is 3.7 days'
            ],
            confidence: 0.92
        },
        tags: ['defi', 'statistics', 'yield_farming', 'risk_analysis'],
        timestamp: Date.now()
    };
    
    try {
        await agent.shareKnowledge(researchFinding);
        console.log('✅ Research knowledge shared successfully');
    } catch (error) {
        console.error('❌ Failed to share knowledge:', error);
    }
}

async function queryResearchTopics(agent: SwarmAgent) {
    console.log('\n🔍 Querying swarm knowledge base...');
    
    const queries = [
        'DeFi yield optimization strategies',
        'Smart contract vulnerability patterns',
        'Cross-chain liquidity analysis'
    ];
    
    for (const query of queries) {
        try {
            console.log(`\n   Searching for: "${query}"`);
            const results = await agent.queryKnowledge(query);
            
            if (results.length > 0) {
                console.log(`   ✅ Found ${results.length} relevant entries`);
                results.slice(0, 3).forEach((result, index) => {
                    console.log(`      ${index + 1}. ${result.title || 'Untitled'} (Confidence: ${result.confidence})`);
                });
            } else {
                console.log('   ℹ️ No matching knowledge found');
            }
        } catch (error) {
            console.error(`   ❌ Query failed: ${error.message}`);
        }
    }
}

// Example of how the agent might handle specific research tasks
async function handleSpecificResearchTask(agent: SwarmAgent) {
    // This would be triggered by a task assignment
    const researchTask = {
        id: 'TASK-42',
        description: 'Analyze the correlation between gas prices and DeFi protocol usage across different L2 solutions',
        requiredCapabilities: ['data_analysis', 'statistical_modeling'],
        bounty: 500,
        deadline: Date.now() + 7 * 24 * 60 * 60 * 1000 // 1 week
    };
    
    // The agent would:
    // 1. Gather data from various sources
    // 2. Perform statistical analysis
    // 3. Generate hypotheses
    // 4. Collaborate with other agents if needed
    // 5. Submit findings for consensus
    
    console.log('\n🔬 Executing research task...');
    
    // Simulate collaboration request
    const dataAnalysts = ['0.0.123456', '0.0.789012']; // Other agent IDs
    await agent.collaborateOnTask(researchTask.id, dataAnalysts);
    
    // Execute the task
    const solution = await agent.executeTask(researchTask);
    
    console.log('✅ Research task completed');
    console.log(`   Confidence: ${(solution.confidence * 100).toFixed(1)}%`);
    console.log(`   Collaborators: ${solution.collaborators?.length || 0}`);
}

// Run the example
main().catch(console.error);