import { useState, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { swarmContracts } from '@/lib/contracts/swarm-contracts';
import { useToast } from '@/components/hooks/use-toast';

export function useSwarmContracts() {
  const { walletState, executeContract } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const registerAgent = useCallback(async (
    capabilities: string[],
    stake: number
  ) => {
    if (!walletState.isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to register as an agent',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { functionName, parameters } = swarmContracts.registerAgent(
        capabilities,
        stake
      );

      const result = await executeContract(
        swarmContracts.getSwarmOrchestratorAddress(),
        functionName,
        parameters,
        150000,
        stake // Payable amount for stake
      );

      toast({
        title: 'Agent Registered',
        description: `You have been registered as an agent with ${capabilities.length} capabilities`,
      });

      return result;
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Failed to register agent',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletState.isConnected, executeContract, toast]);

  const submitTask = useCallback(async (
    taskId: string,
    description: string,
    requiredCapabilities: string[],
    bounty: number,
    deadline: number
  ) => {
    if (!walletState.isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to submit a task',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { functionName, parameters } = swarmContracts.submitTask(
        taskId,
        description,
        requiredCapabilities,
        bounty,
        deadline
      );

      const result = await executeContract(
        swarmContracts.getSwarmOrchestratorAddress(),
        functionName,
        parameters,
        200000,
        bounty // Payable amount for bounty
      );

      toast({
        title: 'Task Submitted',
        description: `Task ${taskId} has been submitted with a bounty of ${bounty} tinybars`,
      });

      return result;
    } catch (error: any) {
      toast({
        title: 'Task submission failed',
        description: error.message || 'Failed to submit task',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletState.isConnected, executeContract, toast]);

  const submitSolution = useCallback(async (
    taskId: string,
    solution: string,
    confidence: number
  ) => {
    if (!walletState.isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to submit a solution',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { functionName, parameters } = swarmContracts.submitSolution(
        taskId,
        solution,
        confidence
      );

      const result = await executeContract(
        swarmContracts.getSwarmOrchestratorAddress(),
        functionName,
        parameters,
        150000
      );

      toast({
        title: 'Solution Submitted',
        description: `Your solution for task ${taskId} has been submitted`,
      });

      return result;
    } catch (error: any) {
      toast({
        title: 'Solution submission failed',
        description: error.message || 'Failed to submit solution',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletState.isConnected, executeContract, toast]);

  const voteOnSolution = useCallback(async (
    taskId: string,
    support: boolean
  ) => {
    if (!walletState.isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to vote',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { functionName, parameters } = swarmContracts.voteOnSolution(
        taskId,
        support
      );

      const result = await executeContract(
        swarmContracts.getSwarmOrchestratorAddress(),
        functionName,
        parameters,
        100000
      );

      toast({
        title: 'Vote Submitted',
        description: `Your ${support ? 'support' : 'rejection'} vote has been recorded`,
      });

      return result;
    } catch (error: any) {
      toast({
        title: 'Vote failed',
        description: error.message || 'Failed to submit vote',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletState.isConnected, executeContract, toast]);

  const withdrawStake = useCallback(async (amount: number) => {
    if (!walletState.isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to withdraw stake',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { functionName, parameters } = swarmContracts.withdrawStake(amount);

      const result = await executeContract(
        swarmContracts.getSwarmOrchestratorAddress(),
        functionName,
        parameters,
        100000
      );

      toast({
        title: 'Stake Withdrawn',
        description: `${amount} tinybars have been withdrawn from your stake`,
      });

      return result;
    } catch (error: any) {
      toast({
        title: 'Withdrawal failed',
        description: error.message || 'Failed to withdraw stake',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletState.isConnected, executeContract, toast]);

  const updateCapabilities = useCallback(async (capabilities: string[]) => {
    if (!walletState.isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to update capabilities',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { functionName, parameters } = swarmContracts.updateCapabilities(
        capabilities
      );

      const result = await executeContract(
        swarmContracts.getSwarmOrchestratorAddress(),
        functionName,
        parameters,
        100000
      );

      toast({
        title: 'Capabilities Updated',
        description: `Your agent capabilities have been updated`,
      });

      return result;
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update capabilities',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletState.isConnected, executeContract, toast]);

  return {
    isLoading,
    registerAgent,
    submitTask,
    submitSolution,
    voteOnSolution,
    withdrawStake,
    updateCapabilities,
    contractAddresses: {
      swarmOrchestrator: swarmContracts.getSwarmOrchestratorAddress(),
      evolutionEngine: swarmContracts.getEvolutionEngineAddress(),
    }
  };
}