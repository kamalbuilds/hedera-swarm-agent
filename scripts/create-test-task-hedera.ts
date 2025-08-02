import { 
  Client, 
  PrivateKey, 
  AccountId,
  TopicMessageSubmitTransaction,
  TopicId
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Creating test task on HederaSwarm...\n');
  
  // Initialize Hedera client
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!);
  
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);
  
  // Create a test task announcement
  const taskTopicId = TopicId.fromString(process.env.SWARM_TASK_TOPIC!);
  
  const testTask = {
    type: 'TASK_ANNOUNCEMENT',
    taskId: `TEST-${Date.now()}`,
    title: 'Test Task: Data Analysis',
    description: 'Analyze sample dataset and provide insights',
    requester: accountId.toString(),
    reward: 10, // 10 HBAR
    capabilities: ['DATA_ANALYSIS', 'REASONING'],
    deadline: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    metadata: {
      dataset: 'sample-data-v1',
      format: 'CSV',
      size: '1MB'
    },
    timestamp: new Date().toISOString()
  };
  
  console.log('📋 Task Details:');
  console.log(`   ID: ${testTask.taskId}`);
  console.log(`   Title: ${testTask.title}`);
  console.log(`   Reward: ${testTask.reward} HBAR`);
  console.log(`   Capabilities: ${testTask.capabilities.join(', ')}`);
  
  // Submit task to HCS
  const message = JSON.stringify(testTask);
  const submitTx = new TopicMessageSubmitTransaction()
    .setTopicId(taskTopicId)
    .setMessage(message);
  
  console.log('\n📡 Submitting task to topic:', taskTopicId.toString());
  
  try {
    const txResponse = await submitTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    console.log('✅ Task announced successfully!');
    console.log('   Transaction ID:', txResponse.transactionId.toString());
    console.log('   Sequence number:', receipt.topicSequenceNumber?.toString());
    
    // Also submit to consensus topic for visibility
    const consensusTopicId = TopicId.fromString(process.env.SWARM_CONSENSUS_TOPIC!);
    const consensusMsg = {
      type: 'TASK_CREATED',
      taskId: testTask.taskId,
      requester: accountId.toString(),
      timestamp: new Date().toISOString()
    };
    
    const consensusTx = new TopicMessageSubmitTransaction()
      .setTopicId(consensusTopicId)
      .setMessage(JSON.stringify(consensusMsg));
    
    await consensusTx.execute(client);
    console.log('\n✅ Task also announced to consensus topic');
    
  } catch (error) {
    console.error('❌ Failed to create task:', error);
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Monitor the task topic for agent bids');
  console.log('2. Check consensus topic for task assignment');
  console.log('3. View agent solutions when submitted');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });