import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

async function main() {
  console.log('🧪 Testing HederaSwarm contracts...\n');
  
  // Connect to Hedera testnet
  const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
  
  // Create wallet from private key
  const privateKey = process.env.HEDERA_PRIVATE_KEY!;
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('Using account:', wallet.address);
  
  // Get contract addresses
  const orchestratorAddress = process.env.SWARM_ORCHESTRATOR_ADDRESS!;
  const evolutionEngineAddress = process.env.EVOLUTION_ENGINE_ADDRESS!;
  
  console.log('SwarmOrchestrator:', orchestratorAddress);
  console.log('EvolutionEngine:', evolutionEngineAddress);
  
  // Load contract ABIs
  const orchestratorABI = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'contracts/artifacts/contracts/SwarmOrchestrator.sol/SwarmOrchestrator.json'),
      'utf-8'
    )
  ).abi;
  
  const evolutionEngineABI = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'contracts/artifacts/contracts/EvolutionEngine.sol/EvolutionEngine.json'),
      'utf-8'
    )
  ).abi;
  
  // Create contract instances
  const orchestrator = new ethers.Contract(orchestratorAddress, orchestratorABI, wallet);
  const evolutionEngine = new ethers.Contract(evolutionEngineAddress, evolutionEngineABI, wallet);
  
  console.log('\n📝 Testing contract functions...\n');
  
  // Test 1: Check evolution engine address
  console.log('1. Checking evolution engine configuration...');
  const configuredEvolutionEngine = await orchestrator.evolutionEngine();
  console.log('   Evolution Engine:', configuredEvolutionEngine);
  console.log('   ✅ Correctly configured:', configuredEvolutionEngine.toLowerCase() === evolutionEngineAddress.toLowerCase());
  
  // Test 2: Register as an agent (this will fail if already registered)
  console.log('\n2. Attempting to register as an agent...');
  try {
    const capabilities = ['DATA_ANALYSIS', 'REASONING'];
    const minStake = await orchestrator.MIN_STAKE();
    console.log('   Min stake required:', ethers.formatUnits(minStake, 8), 'HBAR');
    
    const tx = await orchestrator.registerAgent(capabilities, { value: minStake });
    console.log('   Transaction sent:', tx.hash);
    await tx.wait();
    console.log('   ✅ Successfully registered as agent!');
  } catch (error: any) {
    if (error.message.includes('Already registered')) {
      console.log('   ℹ️  Agent already registered');
    } else {
      console.log('   ❌ Registration failed:', error.message);
    }
  }
  
  // Test 3: Check agent info
  console.log('\n3. Checking agent information...');
  const agentInfo = await orchestrator.agents(wallet.address);
  console.log('   Is Active:', agentInfo.isActive);
  console.log('   Registration Time:', new Date(Number(agentInfo.registrationTime) * 1000).toLocaleString());
  console.log('   Reputation:', agentInfo.reputation.toString());
  console.log('   Completed Tasks:', agentInfo.completedTasks.toString());
  
  // Test 4: Create a test task
  console.log('\n4. Creating a test task...');
  try {
    const taskReward = ethers.parseUnits('5', 8); // 5 HBAR
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const requiredCapabilities = ['DATA_ANALYSIS'];
    const description = 'Test task: Analyze sample data';
    const metadata = JSON.stringify({ type: 'test', data: 'sample' });
    
    const tx = await orchestrator.createTask(
      requiredCapabilities,
      deadline,
      description,
      metadata,
      { value: taskReward }
    );
    console.log('   Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('   ✅ Task created successfully!');
    
    // Get task ID from events
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = orchestrator.interface.parseLog(log);
        return parsed?.name === 'TaskCreated';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = orchestrator.interface.parseLog(event);
      console.log('   Task ID:', parsed?.args[0]);
    }
  } catch (error: any) {
    console.log('   ❌ Task creation failed:', error.message);
  }
  
  // Test 5: Check EvolutionEngine
  console.log('\n5. Testing EvolutionEngine...');
  const engineName = await evolutionEngine.name();
  const engineSymbol = await evolutionEngine.symbol();
  console.log('   NFT Name:', engineName);
  console.log('   NFT Symbol:', engineSymbol);
  
  console.log('\n✅ Contract testing complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });