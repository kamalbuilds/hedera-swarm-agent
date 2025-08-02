import { ContractFunctionParameters } from '@hashgraph/sdk';
import SwarmOrchestratorABI from '@hedera-swarm/contracts/artifacts/contracts/SwarmOrchestrator.sol/SwarmOrchestrator.json';
import EvolutionEngineABI from '@hedera-swarm/contracts/artifacts/contracts/EvolutionEngine.sol/EvolutionEngine.json';

// Contract addresses (update these with your deployed contract IDs)
export const CONTRACT_ADDRESSES = {
  testnet: {
    swarmOrchestrator: '0xA6e2aD1BCfE737a21eeBb7eb1aaE893d902e88Fe',
    evolutionEngine: '0x3428974Dee00fEb88fc60F2A74B0762bac2daDD6',
  },
  mainnet: {
    swarmOrchestrator: '', // To be deployed
    evolutionEngine: '', // To be deployed
  }
};

export class SwarmContracts {
  private network: 'testnet' | 'mainnet';

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
  }

  getSwarmOrchestratorAddress(): string {
    return CONTRACT_ADDRESSES[this.network].swarmOrchestrator;
  }

  getEvolutionEngineAddress(): string {
    return CONTRACT_ADDRESSES[this.network].evolutionEngine;
  }

  // SwarmOrchestrator Functions

  /**
   * Register as an agent in the swarm
   */
  registerAgent(
    capabilities: string[],
    stake: number
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addStringArray(capabilities)
      .addUint256(stake);

    return {
      functionName: 'registerAgent',
      parameters: params
    };
  }

  /**
   * Submit a new task to the swarm
   */
  submitTask(
    taskId: string,
    description: string,
    requiredCapabilities: string[],
    bounty: number,
    deadline: number
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addString(taskId)
      .addString(description)
      .addStringArray(requiredCapabilities)
      .addUint256(bounty)
      .addUint256(deadline);

    return {
      functionName: 'submitTask',
      parameters: params
    };
  }

  /**
   * Assign agents to a task
   */
  assignTask(
    taskId: string,
    agentAddresses: string[]
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addString(taskId)
      .addAddressArray(agentAddresses);

    return {
      functionName: 'assignTask',
      parameters: params
    };
  }

  /**
   * Submit a solution for consensus
   */
  submitSolution(
    taskId: string,
    solution: string,
    confidence: number
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addString(taskId)
      .addString(solution)
      .addUint256(confidence);

    return {
      functionName: 'submitSolution',
      parameters: params
    };
  }

  /**
   * Vote on a solution
   */
  voteOnSolution(
    taskId: string,
    support: boolean
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addString(taskId)
      .addBool(support);

    return {
      functionName: 'voteOnSolution',
      parameters: params
    };
  }

  /**
   * Finalize consensus for a task
   */
  finalizeConsensus(
    taskId: string
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addString(taskId);

    return {
      functionName: 'finalizeConsensus',
      parameters: params
    };
  }

  /**
   * Withdraw agent stake
   */
  withdrawStake(
    amount: number
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addUint256(amount);

    return {
      functionName: 'withdrawStake',
      parameters: params
    };
  }

  /**
   * Update agent capabilities
   */
  updateCapabilities(
    capabilities: string[]
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addStringArray(capabilities);

    return {
      functionName: 'updateCapabilities',
      parameters: params
    };
  }

  // EvolutionEngine Functions

  /**
   * Propose an evolution for an agent
   */
  proposeEvolution(
    agentAddress: string,
    newCapabilities: string[],
    justification: string
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addAddress(agentAddress)
      .addStringArray(newCapabilities)
      .addString(justification);

    return {
      functionName: 'proposeEvolution',
      parameters: params
    };
  }

  /**
   * Vote on an evolution proposal
   */
  voteOnEvolution(
    proposalId: number,
    support: boolean
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addUint256(proposalId)
      .addBool(support);

    return {
      functionName: 'voteOnEvolution',
      parameters: params
    };
  }

  /**
   * Execute an approved evolution
   */
  executeEvolution(
    proposalId: number
  ): { functionName: string; parameters: ContractFunctionParameters } {
    const params = new ContractFunctionParameters()
      .addUint256(proposalId);

    return {
      functionName: 'executeEvolution',
      parameters: params
    };
  }

  // Utility function to get ABI
  getSwarmOrchestratorABI() {
    return SwarmOrchestratorABI.abi;
  }

  getEvolutionEngineABI() {
    return EvolutionEngineABI.abi;
  }
}

// Export singleton instance
export const swarmContracts = new SwarmContracts();