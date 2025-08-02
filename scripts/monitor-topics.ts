import { 
  Client, 
  PrivateKey, 
  AccountId,
  TopicMessageQuery,
  TopicId
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';

dotenv.config();

interface MessageHandler {
  topicName: string;
  color: typeof chalk;
  parseMessage: (message: string) => any;
}

const handlers: Record<string, MessageHandler> = {
  'swarm-tasks': {
    topicName: 'Task Announcements',
    color: chalk.blue,
    parseMessage: (msg) => {
      try {
        const data = JSON.parse(msg);
        return {
          type: data.type,
          taskId: data.taskId,
          title: data.metadata?.title || 'Unknown',
          reward: data.reward ? `${data.reward / 100000000} HBAR` : 'N/A',
          capabilities: data.capabilities?.join(', ') || 'N/A'
        };
      } catch {
        return { raw: msg };
      }
    }
  },
  'swarm-consensus': {
    topicName: 'Consensus Messages',
    color: chalk.green,
    parseMessage: (msg) => {
      try {
        const data = JSON.parse(msg);
        return {
          type: data.type,
          proposalId: data.proposalId,
          vote: data.vote,
          agent: data.agentId,
          weight: data.weight
        };
      } catch {
        return { raw: msg };
      }
    }
  },
  'swarm-knowledge': {
    topicName: 'Knowledge Sharing',
    color: chalk.yellow,
    parseMessage: (msg) => {
      try {
        const data = JSON.parse(msg);
        return {
          type: data.type,
          nodeId: data.nodeId,
          agent: data.agentId,
          dataType: data.dataType,
          size: data.size
        };
      } catch {
        return { raw: msg };
      }
    }
  },
  'swarm-reputation': {
    topicName: 'Reputation Updates',
    color: chalk.magenta,
    parseMessage: (msg) => {
      try {
        const data = JSON.parse(msg);
        return {
          type: data.type,
          agent: data.agentId,
          change: data.change,
          reason: data.reason,
          newScore: data.newScore
        };
      } catch {
        return { raw: msg };
      }
    }
  }
};

async function monitorTopic(
  client: Client, 
  topicId: string, 
  topicName: string,
  handler: MessageHandler
) {
  console.log(handler.color(`\n📡 Monitoring ${handler.topicName} (${topicId})...`));
  
  try {
    new TopicMessageQuery()
      .setTopicId(TopicId.fromString(topicId))
      .setStartTime(0)
      .subscribe(client, null, (message) => {
        const contents = Buffer.from(message.contents).toString();
        const timestamp = new Date(message.consensusTimestamp.toDate()).toLocaleTimeString();
        
        console.log(handler.color('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(handler.color(`📨 ${handler.topicName} | ${timestamp}`));
        console.log(handler.color(`🔢 Sequence: ${message.sequenceNumber}`));
        
        const parsed = handler.parseMessage(contents);
        
        if (parsed.raw) {
          console.log(handler.color(`📄 Raw: ${parsed.raw}`));
        } else {
          Object.entries(parsed).forEach(([key, value]) => {
            console.log(handler.color(`   ${key}: ${value}`));
          });
        }
      });
  } catch (error) {
    console.error(chalk.red(`❌ Failed to monitor ${topicName}:`, error));
  }
}

async function main() {
  console.log(chalk.bold('\n🔍 HederaSwarm Topic Monitor\n'));
  
  // Initialize Hedera client
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  const privateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY!);
  
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);
  
  // Load topics
  const topicsFile = path.join(__dirname, '..', 'deployments', 'topics.json');
  
  if (!fs.existsSync(topicsFile)) {
    console.error(chalk.red('❌ Topics not found. Please run topic initialization first.'));
    process.exit(1);
  }
  
  const topicsData = JSON.parse(fs.readFileSync(topicsFile, 'utf-8'));
  const topics = topicsData.topics;
  
  console.log(chalk.cyan('📊 Loaded topics:'));
  Object.entries(topics).forEach(([name, id]) => {
    console.log(chalk.cyan(`   • ${name}: ${id}`));
  });
  
  // Start monitoring all topics
  for (const [topicName, topicId] of Object.entries(topics)) {
    const handler = handlers[topicName];
    if (handler && topicId) {
      await monitorTopic(client, topicId as string, topicName, handler);
    }
  }
  
  console.log(chalk.bold.green('\n✅ Monitoring all topics. Press Ctrl+C to stop.\n'));
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Stopping topic monitor...'));
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});