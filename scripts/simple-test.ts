import { 
  Client, 
  PrivateKey, 
  AccountId,
  ContractCallQuery,
  ContractId,
  AccountBalanceQuery,
  Hbar
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🧪 Simple contract test...\n');
  
  // Initialize Hedera client
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!);
  
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);
  
  console.log('Account:', accountId.toString());
  
  // Check account balance
  const balanceQuery = new AccountBalanceQuery().setAccountId(accountId);
  const balance = await balanceQuery.execute(client);
  console.log('Balance:', balance.hbars.toString());
  
  // Contract addresses
  const orchestratorAddress = process.env.SWARM_ORCHESTRATOR_ADDRESS!;
  console.log('\nSwarmOrchestrator:', orchestratorAddress);
  
  // Convert EVM address to Hedera ContractId
  const contractId = ContractId.fromEvmAddress(0, 0, orchestratorAddress);
  console.log('Contract ID:', contractId.toString());
  
  console.log('\n✅ Basic connectivity test passed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });