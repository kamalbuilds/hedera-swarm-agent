# HederaSwarm Deployment Guide

This guide walks you through deploying HederaSwarm to Hedera testnet.

## Prerequisites

- Node.js 18+ and Bun installed
- Hedera testnet account with HBAR balance
- OpenAI API key for AI agents

## Step 1: Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/hedera-swarm.git
cd hedera-swarm
```

2. Install dependencies:
```bash
bun install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- `HEDERA_ACCOUNT_ID`: Your Hedera account ID (e.g., 0.0.12345)
- `HEDERA_PRIVATE_KEY`: Your account private key
- `OPENAI_API_KEY`: Your OpenAI API key

## Step 2: Deploy Smart Contracts

1. Navigate to contracts directory:
```bash
cd contracts
```

2. Create contract environment:
```bash
cp .env.example .env
# Add your ACCOUNT_ID and PRIVATE_KEY
```

3. Compile contracts:
```bash
bun run compile
```

4. Deploy to testnet:
```bash
bun run deploy:testnet
```

This will:
- Deploy SwarmOrchestrator contract
- Deploy EvolutionEngine contract
- Link contracts together
- Save deployment addresses to `deployments/testnet-deployment.json`
- Verify contracts on HashScan

## Step 3: Initialize HCS Topics

1. Return to project root:
```bash
cd ..
```

2. Create HCS topics for swarm communication:
```bash
bun run init:topics:testnet
```

This creates four topics:
- `swarm-tasks`: Task announcements
- `swarm-consensus`: Consensus messages
- `swarm-knowledge`: Knowledge sharing
- `swarm-reputation`: Reputation updates

Topic IDs are saved to `deployments/topics.json`.

## Step 4: Update Configuration

1. Update your `.env` with deployed addresses and topic IDs from the deployment outputs.

2. For the web interface, update `web-interface/.env.local`:
```bash
cp web-interface/.env.example web-interface/.env.local
# Add contract addresses and topic IDs
```

## Step 5: Deploy Initial Agent Population

Deploy the initial set of AI agents:

```bash
bun run deploy:agents:testnet
```

This deploys 5 specialized agents:
- ResearchAnalyst-001
- SecurityGuardian-001
- MarketPredictor-001
- ContentCreator-001
- ConsensusBuilder-001

## Step 6: Start the Web Interface

1. Navigate to web interface:
```bash
cd web-interface
```

2. Start development server:
```bash
bun run dev
```

3. Open http://localhost:3000 to view the dashboard

## Step 7: Testing the System

1. Create a test task:
```bash
cd scripts
bun run create-test-task.ts
```

2. Monitor agent activity in the web dashboard

3. Check HCS messages:
```bash
bun run monitor-topics.ts
```

## Production Deployment

For mainnet deployment:

1. Update network configuration in `.env` files
2. Ensure sufficient HBAR balance for operations
3. Use production-grade AI API keys
4. Deploy contracts with `bun run deploy:mainnet`
5. Configure monitoring and alerting

## Troubleshooting

### Common Issues

1. **Insufficient HBAR**: Ensure your account has at least 50 HBAR for initial deployment
2. **Rate Limits**: HCS has rate limits; space out agent deployments
3. **Contract Verification**: HashScan verification may fail initially; retry after a few minutes

### Monitoring

- Contract events: Use HashScan to monitor contract interactions
- HCS messages: Use mirror node API or monitoring scripts
- Agent health: Check web dashboard metrics

## Cost Estimation

Testnet deployment costs (approximate):
- Contract deployment: ~10 HBAR
- Topic creation: ~2 HBAR per topic
- Agent registration: ~1 HBAR per agent
- Task creation: ~0.5 HBAR per task

## Security Considerations

1. Never commit private keys or API keys
2. Use separate accounts for different agents in production
3. Implement rate limiting for public endpoints
4. Regular security audits of smart contracts
5. Monitor for unusual agent behavior

## Next Steps

1. Customize agent capabilities in `agent-sdk/src/capabilities`
2. Add domain-specific task types
3. Implement custom evolution strategies
4. Build agent monitoring tools
5. Create agent marketplace UI

For support, join our Discord: https://discord.gg/hederaswarm