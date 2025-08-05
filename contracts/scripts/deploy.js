const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting HederaSwarm deployment...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "HBAR");
  
  // Deploy SwarmOrchestrator
  console.log("\n📋 Deploying SwarmOrchestrator...");
  const SwarmOrchestrator = await hre.ethers.getContractFactory("SwarmOrchestrator");
  const orchestrator = await SwarmOrchestrator.deploy();
  await orchestrator.waitForDeployment();
  const orchestratorAddress = await orchestrator.getAddress();
  console.log("✅ SwarmOrchestrator deployed to:", orchestratorAddress);
  
  // Deploy EvolutionEngine
  console.log("\n🧬 Deploying EvolutionEngine...");
  const EvolutionEngine = await hre.ethers.getContractFactory("EvolutionEngine");
  const evolutionEngine = await EvolutionEngine.deploy(orchestratorAddress);
  await evolutionEngine.waitForDeployment();
  const evolutionEngineAddress = await evolutionEngine.getAddress();
  console.log("✅ EvolutionEngine deployed to:", evolutionEngineAddress);
  
  // Set EvolutionEngine in SwarmOrchestrator
  console.log("\n🔗 Linking contracts...");
  await orchestrator.setEvolutionEngine(evolutionEngineAddress);
  console.log("✅ EvolutionEngine linked to SwarmOrchestrator");
  
  // Save deployment addresses
  const deployment = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      SwarmOrchestrator: orchestratorAddress,
      EvolutionEngine: evolutionEngineAddress
    },
    deployer: deployer.address
  };
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentPath = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);
  
  // Verify contracts on HashScan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Verifying contracts on HashScan...");
    
    try {
      await hre.run("verify:verify", {
        address: orchestratorAddress,
        constructorArguments: [],
      });
      console.log("✅ SwarmOrchestrator verified");
    } catch (error) {
      console.log("❌ SwarmOrchestrator verification failed:", error.message);
    }
    
    try {
      await hre.run("verify:verify", {
        address: evolutionEngineAddress,
        constructorArguments: [orchestratorAddress],
      });
      console.log("✅ EvolutionEngine verified");
    } catch (error) {
      console.log("❌ EvolutionEngine verification failed:", error.message);
    }
  }
  
  console.log("\n🎉 Deployment complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Update .env files with contract addresses");
  console.log("2. Run 'npm run init:topics:testnet' to create HCS topics");
  console.log("3. Deploy initial agent population");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });