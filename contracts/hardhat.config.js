require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    testnet: {
      url: "https://testnet.hashio.io/api",
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 296,
      timeout: 60000,
      gas: 15000000,
      gasPrice: 400000000000 // 400 Gwei
    },
    mainnet: {
      url: "https://mainnet.hashio.io/api",
      accounts: [process.env.PRIVATE_KEY || ""],
      chainId: 295,
      timeout: 60000,
      gas: 15000000,
      gasPrice: 100000000000
    }
  },
  etherscan: {
    apiKey: {
      testnet: "no-api-key-needed",
      mainnet: "no-api-key-needed"
    },
    customChains: [
      {
        network: "testnet",
        chainId: 296,
        urls: {
          apiURL: "https://server.testnet.hashscan.io/api/v1/sourcify",
          browserURL: "https://hashscan.io/testnet"
        }
      },
      {
        network: "mainnet",
        chainId: 295,
        urls: {
          apiURL: "https://server.hashscan.io/api/v1/sourcify",
          browserURL: "https://hashscan.io/mainnet"
        }
      }
    ]
  }
};