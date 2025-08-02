import { 
  Client, 
  PrivateKey, 
  AccountId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface TestTask {
  title: string;
  description: string;
  capabilities: string[];
  reward: number; // in HBAR
  timeLimit: number; // in seconds
}

const testTasks: TestTask[] = [
  {
    title: 'Market Analysis Report',
    description: 'Analyze HBAR price trends and provide a comprehensive market report with predictions',
    capabilities: ['FINANCIAL_ANALYSIS', 'DATA_ANALYSIS', 'MARKET_PREDICTION'],
    reward: 10,
    timeLimit: 3600 // 1 hour
  },
  {
    title: 'Smart Contract Security Audit',
    description: 'Audit the provided DeFi smart contract for vulnerabilities and suggest improvements',
    capabilities: ['SMART_CONTRACT_ANALYSIS', 'SECURITY_ANALYSIS'],
    reward: 20,
    timeLimit: 7200 // 2 hours
  },
  {
    title: 'Research Paper Summary',
    description: 'Summarize the latest research on quantum-resistant cryptography for blockchain systems',
    capabilities: ['LITERATURE_REVIEW', 'DATA_ANALYSIS', 'NATURAL_LANGUAGE_PROCESSING'],
    reward: 15,
    timeLimit: 5400 // 1.5 hours
  },
  {
    title: 'Consensus Algorithm Optimization',
    description: 'Propose optimizations for the swarm consensus algorithm to improve throughput',
    capabilities: ['CONSENSUS_PARTICIPATION', 'REASONING', 'PLANNING'],
    reward: 25,
    timeLimit: 10800 // 3 hours
  }
];

async function createTask(client: Client, orchestratorAddress: string, task: TestTask) {
  console.log(`\n📝 Creating task: ${task.title}`);
  
  try {
    // Generate task ID
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create task metadata
    const metadata = JSON.stringify({
      title: task.title,
      description: task.description,
      capabilities: task.capabilities,
      createdAt: new Date().toISOString()
    });
    
    // Execute createTask function on SwarmOrchestrator
    const contractExecuteTx = new ContractExecuteTransaction()
      .setContractId(orchestratorAddress)
      .setGas(1000000)
      .setFunction('createTask', new ContractFunctionParameters()
        .addString(taskId)
        .addUint256(task.reward * 100000000) // Convert HBAR to tinybar
        .addStringArray(task.capabilities)
        .addUint256(task.timeLimit)
        .addString(metadata)
      )
      .setMaxTransactionFee(new Hbar(5));
    
    const txResponse = await contractExecuteTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    console.log(`  ✅ Task created successfully!`);
    console.log(`  📋 Task ID: ${taskId}`);
    console.log(`  💰 Reward: ${task.reward} HBAR`);
    console.log(`  ⏱️  Time limit: ${task.timeLimit / 60} minutes`);
    console.log(`  🔧 Required capabilities: ${task.capabilities.join(', ')}`);
    
    return {
      taskId,
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString()
    };
    
  } catch (error) {
    console.error(`  ❌ Failed to create task:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Creating test tasks for HederaSwarm...\n');
  
  // Initialize Hedera client
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  const privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY!);
  
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);
  
  // Load deployment info
  const deploymentFile = path.join(__dirname, '..', 'deployments', 'testnet-deployment.json');
  
  if (!fs.existsSync(deploymentFile)) {
    console.error('❌ Deployment not found. Please deploy contracts first.');
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  const orchestratorAddress = deployment.contracts.SwarmOrchestrator;
  
  console.log(`Using SwarmOrchestrator at: ${orchestratorAddress}`);
  console.log(`Creating ${testTasks.length} test tasks...`);
  
  const createdTasks = [];
  
  // Create tasks
  for (const task of testTasks) {
    const result = await createTask(client, orchestratorAddress, task);
    if (result) {
      createdTasks.push({
        ...task,
        ...result
      });
    }
    
    // Wait between tasks to avoid rate limits
    if (testTasks.indexOf(task) < testTasks.length - 1) {
      console.log('\n⏳ Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Save created tasks
  const tasksFile = path.join(__dirname, '..', 'deployments', 'test-tasks.json');
  const tasksData = {
    network: 'testnet',
    timestamp: new Date().toISOString(),
    tasks: createdTasks,
    totalCreated: createdTasks.length,
    totalReward: createdTasks.reduce((sum, task) => sum + task.reward, 0)
  };
  
  fs.writeFileSync(tasksFile, JSON.stringify(tasksData, null, 2));
  console.log(`\n💾 Tasks saved to: ${tasksFile}`);
  
  console.log(`\n✅ Test task creation complete!`);
  console.log(`   Created: ${createdTasks.length}/${testTasks.length} tasks`);
  console.log(`   Total rewards: ${tasksData.totalReward} HBAR`);
  
  console.log('\n📋 Next steps:');
  console.log('1. Monitor agent bidding in the web dashboard');
  console.log('2. Check HCS topics for task announcements');
  console.log('3. View task solutions as they are submitted');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });