import { 
  Client, 
  PrivateKey, 
  AccountId,
  TopicMessageQuery,
  TopicId
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('📡 Monitoring HederaSwarm topics...\n');
  
  // Initialize Hedera client
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!);
  
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);
  
  const topics = {
    tasks: process.env.SWARM_TASK_TOPIC!,
    consensus: process.env.SWARM_CONSENSUS_TOPIC!,
    knowledge: process.env.SWARM_KNOWLEDGE_TOPIC!,
    reputation: process.env.SWARM_REPUTATION_TOPIC!
  };
  
  console.log('Monitoring topics:');
  Object.entries(topics).forEach(([name, id]) => {
    console.log(`  ${name}: ${id}`);
  });
  console.log('\nWaiting for messages...\n');
  
  // Monitor task topic
  new TopicMessageQuery()
    .setTopicId(TopicId.fromString(topics.tasks))
    .setStartTime(0)
    .subscribe(client, null, (message) => {
      const contents = Buffer.from(message.contents).toString();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📨 TASK MESSAGE');
      console.log(`Time: ${new Date(message.consensusTimestamp.toDate()).toLocaleString()}`);
      console.log(`Sequence: ${message.sequenceNumber}`);
      try {
        const data = JSON.parse(contents);
        console.log('Content:', JSON.stringify(data, null, 2));
      } catch {
        console.log('Raw:', contents);
      }
    });
  
  // Monitor consensus topic
  new TopicMessageQuery()
    .setTopicId(TopicId.fromString(topics.consensus))
    .setStartTime(0)
    .subscribe(client, null, (message) => {
      const contents = Buffer.from(message.contents).toString();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🤝 CONSENSUS MESSAGE');
      console.log(`Time: ${new Date(message.consensusTimestamp.toDate()).toLocaleString()}`);
      console.log(`Sequence: ${message.sequenceNumber}`);
      try {
        const data = JSON.parse(contents);
        console.log('Content:', JSON.stringify(data, null, 2));
      } catch {
        console.log('Raw:', contents);
      }
    });
  
  // Keep running
  console.log('Press Ctrl+C to stop\n');
}

main().catch(console.error);