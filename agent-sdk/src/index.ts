/**
 * HederaSwarm Agent SDK
 * 
 * A comprehensive toolkit for building AI agents that participate
 * in the HederaSwarm decentralized multi-agent orchestration platform.
 */

// Core exports
export { SwarmAgent } from './core/SwarmAgent';
export type { 
    SwarmAgentConfig, 
    Task, 
    Solution, 
    SwarmMessage 
} from './core/SwarmAgent';

// Integration exports
export { hederaSwarmPlugin } from './integrations/ElizaOSPlugin';

// Re-export useful Hedera SDK types
export {
    Client,
    AccountId,
    PrivateKey,
    TopicId,
    Hbar,
    TransactionReceipt
} from '@hashgraph/sdk';

// Re-export Hedera Agent Kit utilities
export {
    HederaAgentKit,
    HederaLangchainToolkit,
    AgentMode
} from 'hedera-agent-kit';

// Version
export const VERSION = '1.0.0';

// Default configuration helper
export function getDefaultConfig(): Partial<SwarmAgentConfig> {
    return {
        network: 'testnet',
        capabilities: ['reasoning', 'data_analysis'],
        aiModel: 'gpt-4',
        ipfsGateway: 'https://ipfs.infura.io:5001'
    };
}

// Utility to validate Hedera account ID format
export function isValidAccountId(accountId: string): boolean {
    const pattern = /^\d+\.\d+\.\d+$/;
    return pattern.test(accountId);
}

// Utility to validate Hedera private key format
export function isValidPrivateKey(privateKey: string): boolean {
    // Check for DER encoded format (302e...) or raw hex format
    return privateKey.startsWith('302') || /^[0-9a-fA-F]{64}$/.test(privateKey);
}

// Helper to create swarm topics configuration
export interface SwarmTopicsConfig {
    taskPrefix?: string;
    consensusPrefix?: string;
    knowledgePrefix?: string;
}

export async function createSwarmTopics(
    client: Client,
    config?: SwarmTopicsConfig
): Promise<{
    tasks: string;
    consensus: string;
    knowledge: string;
}> {
    // Implementation would create actual HCS topics
    // This is a placeholder that returns example topic IDs
    return {
        tasks: '0.0.5000001',
        consensus: '0.0.5000002',
        knowledge: '0.0.5000003'
    };
}

// Export capability definitions
export const CAPABILITIES = {
    // Cognitive capabilities
    REASONING: 'reasoning',
    LEARNING: 'learning',
    PLANNING: 'planning',
    CREATIVITY: 'creativity',
    
    // Technical capabilities
    DATA_ANALYSIS: 'data_analysis',
    MACHINE_LEARNING: 'machine_learning',
    NATURAL_LANGUAGE_PROCESSING: 'natural_language_processing',
    COMPUTER_VISION: 'computer_vision',
    
    // Domain capabilities
    FINANCIAL_ANALYSIS: 'financial_analysis',
    SMART_CONTRACT_ANALYSIS: 'smart_contract_analysis',
    SECURITY_ANALYSIS: 'security_analysis',
    MARKET_PREDICTION: 'market_prediction',
    
    // Blockchain capabilities
    TRANSACTION_ANALYSIS: 'transaction_analysis',
    CONSENSUS_PARTICIPATION: 'consensus_participation',
    CROSS_CHAIN_ANALYSIS: 'cross_chain_analysis',
    
    // Research capabilities
    LITERATURE_REVIEW: 'literature_review',
    HYPOTHESIS_GENERATION: 'hypothesis_generation',
    EXPERIMENT_DESIGN: 'experiment_design',
    STATISTICAL_MODELING: 'statistical_modeling'
} as const;

// Export task types
export const TASK_TYPES = {
    RESEARCH: 'research',
    ANALYSIS: 'analysis',
    PREDICTION: 'prediction',
    OPTIMIZATION: 'optimization',
    SECURITY_AUDIT: 'security_audit',
    CONTENT_GENERATION: 'content_generation',
    CONSENSUS_BUILDING: 'consensus_building'
} as const;

// Logging utilities
export const logger = {
    info: (message: string, ...args: any[]) => {
        console.log(`[HederaSwarm] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
        console.error(`[HederaSwarm ERROR] ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
        if (process.env.DEBUG === 'true') {
            console.debug(`[HederaSwarm DEBUG] ${message}`, ...args);
        }
    }
};