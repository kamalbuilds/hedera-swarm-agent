import { SwarmAgent, CAPABILITIES } from '../agent-sdk/src';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface AgentTemplate {
  name: string;
  capabilities: string[];
  aiModel: 'gpt-4' | 'gpt-3.5-turbo';
  description: string;
}

const agentTemplates: AgentTemplate[] = [
  {
    name: 'ResearchAnalyst-001',
    capabilities: [
      CAPABILITIES.DATA_ANALYSIS,
      CAPABILITIES.LITERATURE_REVIEW,
      CAPABILITIES.STATISTICAL_MODELING,
      CAPABILITIES.HYPOTHESIS_GENERATION
    ],
    aiModel: 'gpt-4',
    description: 'Specialized in research and data analysis'
  },
  {
    name: 'SecurityGuardian-001',
    capabilities: [
      CAPABILITIES.SMART_CONTRACT_ANALYSIS,
      CAPABILITIES.SECURITY_ANALYSIS,
      CAPABILITIES.TRANSACTION_ANALYSIS
    ],
    aiModel: 'gpt-4',
    description: 'Expert in smart contract security auditing'
  },
  {
    name: 'MarketPredictor-001',
    capabilities: [
      CAPABILITIES.FINANCIAL_ANALYSIS,
      CAPABILITIES.MARKET_PREDICTION,
      CAPABILITIES.DATA_ANALYSIS,
      CAPABILITIES.MACHINE_LEARNING
    ],
    aiModel: 'gpt-4',
    description: 'Financial market analysis and prediction'
  },
  {
    name: 'ContentCreator-001',
    capabilities: [
      CAPABILITIES.NATURAL_LANGUAGE_PROCESSING,
      CAPABILITIES.CREATIVITY,
      CAPABILITIES.REASONING
    ],
    aiModel: 'gpt-3.5-turbo',
    description: 'Content generation and creative tasks'
  },
  {
    name: 'ConsensusBuilder-001',
    capabilities: [
      CAPABILITIES.CONSENSUS_PARTICIPATION,
      CAPABILITIES.REASONING,
      CAPABILITIES.PLANNING
    ],
    aiModel: 'gpt-3.5-turbo',
    description: 'Facilitates consensus and coordination'
  }
];

async function deployAgent(template: AgentTemplate, index: number) {
  console.log(`\n🤖 Deploying agent ${index + 1}/${agentTemplates.length}: ${template.name}`);
  
  try {
    // Load deployment info
    const deploymentFile = path.join(__dirname, '..', 'deployments', 'testnet-deployment.json');
    const topicsFile = path.join(__dirname, '..', 'deployments', 'topics.json');
    
    if (!fs.existsSync(deploymentFile)) {
      throw new Error('Contract deployment not found. Run deployment first.');
    }
    
    if (!fs.existsSync(topicsFile)) {
      throw new Error('Topics not found. Run topic initialization first.');
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
    const topics = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'));
    
    // Create agent instance
    const agent = new SwarmAgent({
      accountId: process.env[`AGENT_${index}_ACCOUNT_ID`] || process.env.HEDERA_ACCOUNT_ID!,
      privateKey: process.env[`AGENT_${index}_PRIVATE_KEY`] || process.env.HEDERA_PRIVATE_KEY!,
      network: 'testnet',
      capabilities: template.capabilities,
      aiModel: template.aiModel,
      aiApiKey: process.env.OPENAI_API_KEY,
      swarmTopics: {
        tasks: topics.topics['swarm-tasks'],
        consensus: topics.topics['swarm-consensus'],
        knowledge: topics.topics['swarm-knowledge']
      },
      orchestratorAddress: deployment.contracts.SwarmOrchestrator
    });
    
    // Initialize agent
    console.log('  📡 Initializing agent...');
    await agent.initialize();
    
    // Join swarm
    console.log('  🐝 Joining swarm...');
    await agent.joinSwarm();
    
    console.log(`  ✅ ${template.name} deployed successfully!`);
    
    // Store agent info
    return {
      name: template.name,
      accountId: agent.config.accountId,
      capabilities: template.capabilities,
      description: template.description,
      deployedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`  ❌ Failed to deploy ${template.name}:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Deploying HederaSwarm agent population...\n');
  
  const deployedAgents = [];
  
  // Deploy agents sequentially to avoid rate limits
  for (let i = 0; i < agentTemplates.length; i++) {
    const result = await deployAgent(agentTemplates[i], i);
    if (result) {
      deployedAgents.push(result);
    }
    
    // Wait between deployments
    if (i < agentTemplates.length - 1) {
      console.log('\n⏳ Waiting 5 seconds before next deployment...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Save deployed agents info
  const agentsFile = path.join(__dirname, '..', 'deployments', 'agents.json');
  const agentsData = {
    network: 'testnet',
    timestamp: new Date().toISOString(),
    agents: deployedAgents,
    totalDeployed: deployedAgents.length,
    totalFailed: agentTemplates.length - deployedAgents.length
  };
  
  fs.writeFileSync(agentsFile, JSON.stringify(agentsData, null, 2));
  console.log(`\n💾 Agent deployment info saved to: ${agentsFile}`);
  
  console.log(`\n✅ Deployment complete!`);
  console.log(`   Deployed: ${deployedAgents.length}/${agentTemplates.length} agents`);
  
  if (deployedAgents.length > 0) {
    console.log('\n📋 Deployed agents:');
    deployedAgents.forEach(agent => {
      console.log(`   - ${agent.name}: ${agent.accountId}`);
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });