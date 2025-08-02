import { 
  Client, 
  PrivateKey, 
  AccountId,
  TopicCreateTransaction,
  Hbar
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface TopicConfig {
  name: string;
  memo: string;
  submitKeyRequired: boolean;
  adminKeyRequired: boolean;
}

const topics: TopicConfig[] = [
  {
    name: 'swarm-tasks',
    memo: 'HederaSwarm Task Announcements',
    submitKeyRequired: false,
    adminKeyRequired: true
  },
  {
    name: 'swarm-consensus',
    memo: 'HederaSwarm Consensus Messages',
    submitKeyRequired: false,
    adminKeyRequired: true
  },
  {
    name: 'swarm-knowledge',
    memo: 'HederaSwarm Knowledge Sharing',
    submitKeyRequired: false,
    adminKeyRequired: true
  },
  {
    name: 'swarm-reputation',
    memo: 'HederaSwarm Reputation Updates',
    submitKeyRequired: true,
    adminKeyRequired: true
  }
];

async function main() {
  console.log('🚀 Initializing HederaSwarm topics...\n');

  // Initialize Hedera client
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!);
  
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);
  
  console.log(`Using account: ${accountId.toString()}`);
  
  const createdTopics: Record<string, string> = {};
  
  for (const topicConfig of topics) {
    console.log(`\n📝 Creating topic: ${topicConfig.name}`);
    
    try {
      const topicCreateTx = new TopicCreateTransaction()
        .setTopicMemo(topicConfig.memo)
        .setMaxTransactionFee(new Hbar(5));
      
      if (topicConfig.submitKeyRequired) {
        topicCreateTx.setSubmitKey(privateKey.publicKey);
        console.log('  ✓ Submit key set');
      }
      
      if (topicConfig.adminKeyRequired) {
        topicCreateTx.setAdminKey(privateKey.publicKey);
        console.log('  ✓ Admin key set');
      }
      
      const txResponse = await topicCreateTx.execute(client);
      const receipt = await txResponse.getReceipt(client);
      
      if (receipt.topicId) {
        createdTopics[topicConfig.name] = receipt.topicId.toString();
        console.log(`  ✅ Topic created: ${receipt.topicId.toString()}`);
      } else {
        throw new Error('Failed to get topic ID from receipt');
      }
      
    } catch (error) {
      console.error(`  ❌ Failed to create topic ${topicConfig.name}:`, error);
    }
  }
  
  // Save topic IDs to file
  const topicsFile = path.join(process.cwd(), 'deployments', 'topics.json');
  const topicsDir = path.dirname(topicsFile);
  
  if (!fs.existsSync(topicsDir)) {
    fs.mkdirSync(topicsDir, { recursive: true });
  }
  
  const topicsData = {
    network: 'testnet',
    timestamp: new Date().toISOString(),
    topics: createdTopics,
    operator: accountId.toString()
  };
  
  fs.writeFileSync(topicsFile, JSON.stringify(topicsData, null, 2));
  console.log(`\n💾 Topics saved to: ${topicsFile}`);
  
  // Generate environment variables
  console.log('\n📋 Add these to your .env files:');
  console.log('```');
  console.log(`SWARM_TASK_TOPIC=${createdTopics['swarm-tasks'] || 'NOT_CREATED'}`);
  console.log(`SWARM_CONSENSUS_TOPIC=${createdTopics['swarm-consensus'] || 'NOT_CREATED'}`);
  console.log(`SWARM_KNOWLEDGE_TOPIC=${createdTopics['swarm-knowledge'] || 'NOT_CREATED'}`);
  console.log(`SWARM_REPUTATION_TOPIC=${createdTopics['swarm-reputation'] || 'NOT_CREATED'}`);
  console.log('```');
  
  console.log('\n✅ Topic initialization complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });